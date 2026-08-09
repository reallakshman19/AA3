#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { inspectCaesarAccdbLinearCaseMechanics } from '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const CASE_ID = 'L19';
const ROTATION_RESOLUTION_DEG = 1e-4;
const ROTATION_RESOLUTION_RAD = ROTATION_RESOLUTION_DEG * Math.PI / 180;
const PRODUCTION_PARITY_LIMIT = 1e-3;
const COMPONENT_LIMIT = 0.1;
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const FORCE_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ']);
const MOMENT_COMPONENTS = Object.freeze(['MX', 'MY', 'MZ']);

const args = parseArgs(process.argv.slice(2));
if (!args.package || (!args['source-element'] && !args['source-elements'])) {
  throw new TypeError('Usage: node scripts/lfea-issue947-bend-descendant-condensation-audit.mjs --package <canonical-package.json> (--source-element <id> | --source-elements <id,id,...>) [--out <json>]');
}
const sourceElementIds = args['source-elements']
  ? String(args['source-elements']).split(',').map((value) => value.trim()).filter(Boolean)
  : [String(args['source-element'])];
if (sourceElementIds.length === 0 || new Set(sourceElementIds).size !== sourceElementIds.length) {
  throw new TypeError('Source-element chain must contain one or more unique source element ids.');
}
const sourceLabel = sourceElementIds.map((id) => `E${id}`).join('_');
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
requirePinnedPackage(pkg);
assert.equal(pkg.profile.conventions.restraintReaction, 'CAESAR_FORCE_ON_SUPPORT');
const caseRecord = pkg.cases.find((entry) => String(entry.caseId) === CASE_ID);
if (!caseRecord) throw new TypeError(`Pinned package lacks physical case ${CASE_ID}.`);
const caseHasNodalForcePrimitive = /(^|[+\-])F\d+/u.test(String(caseRecord.formula).replace(/\s+/gu, ''));
const sourceRows = sourceElementIds.map((id) => requireSourceRow(pkg, id));
for (const row of sourceRows) {
  if (!(Number(row.BEND_PTR) > 0)) throw new TypeError(`Source E${row.ELEMENTID} is not a bend.`);
}
for (let index = 0; index < sourceRows.length - 1; index += 1) {
  if (String(sourceRows[index].TO_NODE) !== String(sourceRows[index + 1].FROM_NODE)) {
    throw new TypeError(`Source bend chain is not contiguous between E${sourceRows[index].ELEMENTID} and E${sourceRows[index + 1].ELEMENTID}.`);
  }
}
const boundaryNodeIds = [String(sourceRows[0].FROM_NODE), String(sourceRows.at(-1).TO_NODE)];
const boundaryCustody = boundaryReferenceCustody(pkg, sourceElementIds, boundaryNodeIds);

const inspection = inspectCaesarAccdbLinearCaseMechanics(pkg, CASE_ID);
assert.equal(inspection.schema, 'lfea-accdb-linear-case-mechanics-inspection/v1');
assert.equal(inspection.sourceAccdbSha256, EXPECTED_SOURCE_SHA256);
assert.equal(inspection.executionStatus, 'QUALIFIED');
const sourceElementIdSet = new Set(sourceElementIds);
const descendants = inspection.elements.filter((entry) => sourceElementIdSet.has(String(entry.sourceElementId)));
if (descendants.length === 0) throw new TypeError(`Production inspection has no descendants for source chain ${sourceLabel}.`);
const chain = requireOrderedChain(descendants, boundaryNodeIds[0], boundaryNodeIds[1]);
for (const sourceElementId of sourceElementIds) {
  const sourceDescendants = chain.filter((entry) => String(entry.sourceElementId) === sourceElementId);
  if (sourceDescendants.filter((entry) => entry.kind === 'BEND_INCOMING_STRAIGHT').length > 1) {
    throw new TypeError(`Source E${sourceElementId} has multiple incoming-straight descendants.`);
  }
  if (!sourceDescendants.some((entry) => entry.kind === 'BEND_ARC')) {
    throw new TypeError(`Source E${sourceElementId} lacks bend-arc descendants.`);
  }
}
if (!chain.every((entry) => ['BEND_INCOMING_STRAIGHT', 'BEND_ARC'].includes(entry.kind))) {
  throw new TypeError(`Source chain ${sourceLabel} contains an unexpected descendant kind.`);
}

const assembled = assembleChain(chain);
const condensed = condenseSubstructure(assembled, boundaryNodeIds);
const splitResidual = maxAbs(condensed.initialTotal.map((value, index) =>
  value - condensed.initialPressure[index] - condensed.initialMec21[index]));

const productionDisplacement = boundaryDisplacement(inspection.rows, boundaryNodeIds);
const productionBoundaryAction = descendantBoundaryAction(inspection.rows, chain);
const productionCondensedAction = recoverBoundaryAction(condensed, productionDisplacement);
const productionParityResidual = subtract(productionCondensedAction, productionBoundaryAction);
const productionParityMaxAbs = maxAbs(productionParityResidual);

const referenceRows = pkg.references?.[CASE_ID]?.rows;
if (!Array.isArray(referenceRows)) throw new TypeError(`Pinned package lacks ${CASE_ID} reference rows.`);
const caesarDisplacement = boundaryDisplacement(referenceRows, boundaryNodeIds);
const caesarSourceAction = inferredReferenceSourceAction(referenceRows, pkg, boundaryCustody);
const caesarCondensedAction = recoverBoundaryAction(condensed, caesarDisplacement);
const caesarResidual = subtract(caesarCondensedAction, caesarSourceAction);
const scales = actionScaleVector(caesarSourceAction, pkg.profile.tolerances);
const normalizedResidual = caesarResidual.map((value, index) => value / scales[index]);
const resolution = rotationResolutionAssessment({ condensed, displacement: caesarDisplacement, normalizedResidual, scales });

const stiffnessAction = multiplyFlat12(condensed.stiffness, caesarDisplacement);
const gravityAction = condensed.equivalent.map((value) => -value);
const pressureAction = condensed.initialPressure.map((value) => -value);
const mec21Action = condensed.initialMec21.map((value) => -value);
const decomposedAction = addVectors(stiffnessAction, gravityAction, pressureAction, mec21Action);
const decompositionClosure = maxAbs(subtract(decomposedAction, caesarCondensedAction));
const absNormalized = normalizedResidual.map(Math.abs);
const governingIndex = absNormalized.indexOf(Math.max(...absNormalized));

const gates = {
  productionParity: productionParityMaxAbs <= PRODUCTION_PARITY_LIMIT ? 'PASS' : 'FAIL',
  initialLoadSplitClosure: splitResidual <= 1e-6 ? 'PASS' : 'FAIL',
  actionDecompositionClosure: decompositionClosure <= 1e-6 ? 'PASS' : 'FAIL',
  descendantTopology: chain[0].nodeI === boundaryNodeIds[0] && chain.at(-1).nodeJ === boundaryNodeIds[1] ? 'PASS' : 'FAIL',
  referenceBoundaryEquilibriumRecoverable: !caseHasNodalForcePrimitive
    && boundaryCustody.every((entry) => entry.restraintCount === 0 || entry.reportedReactionAvailable) ? 'PASS' : 'FAIL',
  referenceBoundaryOtherIncidentActionsComplete: boundaryCustody.every((entry) => entry.otherIncidentSourceElementIds.length > 0
    && entry.otherIncidentSourceElementIds.length === entry.directReferenceActionElementIds.length) ? 'PASS' : 'FAIL',
};
if (Object.values(gates).some((status) => status !== 'PASS')) {
  throw new Error(`${sourceLabel} condensation prerequisite failed: ${JSON.stringify(gates)}`);
}

const classification = resolution.admissibleConstitutiveFailure
  ? `${sourceLabel}_ADMISSIBLE_PRODUCTION_DESCENDANT_CONSTITUTIVE_MISMATCH`
  : absNormalized[governingIndex] <= COMPONENT_LIMIT
    ? `${sourceLabel}_PRODUCTION_DESCENDANT_CONSTITUTIVE_RESPONSE_PASSES_CAESAR_INJECTION`
    : `${sourceLabel}_RAW_MISMATCH_NON_RESOLVING_DUE_TO_PINNED_ROTATION_OUTPUT_RESOLUTION`;

const output = {
  schema: 'lfea-issue947-bend-descendant-condensation-audit/v1',
  issue: 947,
  caseId: CASE_ID,
  sourceAccdbSha256: EXPECTED_SOURCE_SHA256,
  sourceElement: sourceRows.length === 1 ? {
    sourceElementId: sourceElementIds[0],
    fromNode: boundaryNodeIds[0],
    toNode: boundaryNodeIds[1],
    bendPtr: Number(sourceRows[0].BEND_PTR),
  } : null,
  sourceElements: sourceRows.map((row) => ({
    sourceElementId: String(row.ELEMENTID),
    fromNode: String(row.FROM_NODE),
    toNode: String(row.TO_NODE),
    bendPtr: Number(row.BEND_PTR),
  })),
  method: 'EXACT_PRODUCTION_DESCENDANT_K_F_EQ_F_0_ASSEMBLY_PLUS_SCHUR_CONDENSATION_TO_SOURCE_12_DOF_BOUNDARY',
  referenceActionCustody: {
    rule: 'At each source boundary, target end action equals reported CAESAR_FORCE_ON_SUPPORT reaction minus every other incident source-element end action. At an unrestrained boundary the reported reaction term is zero. Restrained-boundary recovery is allowed only when the pinned reaction is present and the physical case has no nodal-force primitive.',
    caseFormula: caseRecord.formula,
    caseHasNodalForcePrimitive,
    boundaries: boundaryCustody,
  },
  governingEquations: {
    elementRecovery: 'q_e = K_e d_e - f_eq,e - f_0,e',
    condensedStiffness: 'K_c = K_bb - K_bi K_ii^-1 K_ib',
    condensedLoad: 'f_c = f_b - K_bi K_ii^-1 f_i',
    sourceRecovery: 'q_c = K_c d_b - f_eq,c - f_0,c',
    junctionReferenceAction: 'q_target,end = Q_pipe_on_support - sum(q_other_incident,end)',
  },
  referenceUsage: 'DIAGNOSTIC_ONLY_NO_PARAMETER_FIT_NO_REFERENCE_MUTATION',
  descendantLedger: chain.map((entry) => ({
    elementId: entry.elementId,
    nodeI: entry.nodeI,
    nodeJ: entry.nodeJ,
    kind: entry.kind,
    teeJunctionNodeId: entry.teeJunctionNodeId,
    pressureAxialStrain: entry.pressureAxialStrain,
    bourdonRotationRadians: entry.bourdonRotationRadians,
    gravityWeightN: entry.gravityWeightN,
  })),
  dimensions: {
    descendantCount: chain.length,
    nodeCount: assembled.nodeIds.length,
    internalNodeCount: assembled.nodeIds.length - 2,
    fullDofCount: assembled.nodeIds.length * 6,
    boundaryDofCount: 12,
  },
  gates,
  productionParity: {
    limit: PRODUCTION_PARITY_LIMIT,
    boundaryDisplacement: productionDisplacement,
    descendantBoundaryAction: productionBoundaryAction,
    condensedAction: productionCondensedAction,
    residual: productionParityResidual,
    maxAbsResidual: productionParityMaxAbs,
  },
  caesarInjection: {
    boundaryDisplacement: caesarDisplacement,
    inferredSourceAction: caesarSourceAction,
    condensedAction: caesarCondensedAction,
    residual: caesarResidual,
    normalizedResidual,
    normalizedResidualL2: Math.hypot(...normalizedResidual),
    maxAbsNormalizedResidual: absNormalized[governingIndex],
    governingComponent: actionLabel(governingIndex),
    rawStatusAtTenPercent: absNormalized[governingIndex] <= COMPONENT_LIMIT ? 'PASS' : 'FAIL',
    rotationResolutionAssessment: resolution,
  },
  linearActionDecomposition: {
    stiffnessTimesBoundaryDisplacement: stiffnessAction,
    negativeCondensedGravityEquivalentLoad: gravityAction,
    negativeCondensedIncomingStraightPressureInitialLoad: pressureAction,
    negativeCondensedMec21BendInitialLoad: mec21Action,
    reconstructedAction: decomposedAction,
    reconstructionMaxAbsResidual: decompositionClosure,
    condensedInitialSplitMaxAbsResidual: splitResidual,
  },
  classification,
  falsificationRule: `No ${sourceLabel} constitutive conclusion is admissible unless exact production descendant condensation reproduces solved descendant boundary actions within 1e-3 N/Nm, both outer source boundaries are fully recoverable from direct neighboring source actions plus any pinned CAESAR_FORCE_ON_SUPPORT reaction, the physical case has no nodal-force primitive at a reaction-assisted boundary, and zero CAESAR rotations are propagated as +/-0.0001 degree uncertainty rather than replaced.`,
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 ${sourceLabel} bend descendant condensation audit: ${classification}`);

function boundaryReferenceCustody(pkg, targetElementIds, boundaryNodeIds) {
  const sourceRows = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
  const target = new Set(targetElementIds.map(String));
  const restraintRows = pkg.model.tables.INPUT_RESTRAINTS?.rows ?? [];
  return boundaryNodeIds.map((nodeId) => {
    const other = sourceRows.filter((row) => !target.has(String(row.ELEMENTID))
      && (String(row.FROM_NODE) === nodeId || String(row.TO_NODE) === nodeId));
    const directReferenceActionElementIds = other.filter((row) => hasDirectSourceAction(pkg.references[CASE_ID].rows, row))
      .map((row) => String(row.ELEMENTID));
    const restraintCount = restraintRows.filter((row) => String(row.NODE ?? row.NODE_NUM ?? '') === nodeId).length;
    const reportedReaction = restraintCount > 0
      ? directReferenceReaction(pkg.references[CASE_ID].rows, nodeId)
      : new Array(6).fill(0);
    return {
      nodeId,
      restraintCount,
      reportedReactionAvailable: reportedReaction !== null,
      reportedReaction,
      otherIncidentSourceElementIds: other.map((row) => String(row.ELEMENTID)),
      directReferenceActionElementIds,
    };
  });
}

function inferredReferenceSourceAction(rows, pkg, custody) {
  const ends = custody.map((boundary) => {
    const vectors = boundary.otherIncidentSourceElementIds.map((id) => {
      const row = requireSourceRow(pkg, id);
      const action = directSourceAction(rows, row);
      return String(row.FROM_NODE) === boundary.nodeId ? action.slice(0, 6) : action.slice(6, 12);
    });
    const sum = new Array(6).fill(0);
    for (const vector of vectors) for (let index = 0; index < 6; index += 1) sum[index] += vector[index];
    if (boundary.reportedReaction === null) {
      throw new TypeError(`Boundary node ${boundary.nodeId} is restrained but lacks a complete pinned reaction vector.`);
    }
    return boundary.reportedReaction.map((value, index) => value - sum[index]);
  });
  return [...ends[0], ...ends[1]];
}

function directReferenceReaction(rows, nodeId) {
  const candidates = rows.filter((entry) => entry.entityKind === 'NODE' && String(entry.entityId) === String(nodeId));
  const index = new Map(candidates.map((entry) => [`${entry.quantity}:${entry.component}`, Number(entry.value)]));
  const keys = [
    ['FORCE', 'UX'], ['FORCE', 'UY'], ['FORCE', 'UZ'],
    ['MOMENT', 'RX'], ['MOMENT', 'RY'], ['MOMENT', 'RZ'],
  ];
  const values = keys.map(([quantity, component]) => index.get(`${quantity}:${component}`));
  return values.every(Number.isFinite) ? values : null;
}

function hasDirectSourceAction(rows, row) {
  try { directSourceAction(rows, row); return true; } catch { return false; }
}

function directSourceAction(rows, row) {
  const prefix = `INPUT_ELEMENT:${String(row.ELEMENTID)}|`;
  const candidateIds = [...new Set(rows.filter((entry) => entry.entityKind === 'ELEMENT'
    && String(entry.entityId).startsWith(prefix)).map((entry) => String(entry.entityId)))];
  if (candidateIds.length !== 1) throw new TypeError(`Expected one direct source entity for E${row.ELEMENTID}; found ${JSON.stringify(candidateIds)}.`);
  const entityId = candidateIds[0];
  const candidates = rows.filter((entry) => entry.entityKind === 'ELEMENT' && String(entry.entityId) === entityId);
  const index = new Map(candidates.map((entry) => [`${entry.quantity}:${entry.component}`, Number(entry.value)]));
  const get = (quantity, component) => {
    const value = index.get(`${quantity}:${component}`);
    if (!Number.isFinite(value)) throw new TypeError(`${entityId} lacks ${quantity}:${component}.`);
    return value;
  };
  return [
    ...FORCE_COMPONENTS.map((component) => get('GLOBAL_END_FORCE_FROM', component)),
    ...MOMENT_COMPONENTS.map((component) => get('GLOBAL_END_MOMENT_FROM', component)),
    ...FORCE_COMPONENTS.map((component) => get('GLOBAL_END_FORCE_TO', component)),
    ...MOMENT_COMPONENTS.map((component) => get('GLOBAL_END_MOMENT_TO', component)),
  ];
}

function descendantBoundaryAction(rows, chain) {
  return [...analysisElementEndAction(rows, chain[0].elementId, 'FROM'), ...analysisElementEndAction(rows, chain.at(-1).elementId, 'TO')];
}

function analysisElementEndAction(rows, entityId, end) {
  const candidates = rows.filter((entry) => entry.entityKind === 'ELEMENT' && String(entry.entityId) === String(entityId));
  if (candidates.length === 0) throw new TypeError(`Production rows lack analysis descendant ${entityId}.`);
  const index = new Map(candidates.map((entry) => [`${entry.quantity}:${entry.component}`, Number(entry.value)]));
  const get = (kind, component) => {
    const value = index.get(`GLOBAL_END_${kind}_${end}:${component}`);
    if (!Number.isFinite(value)) throw new TypeError(`${entityId} lacks GLOBAL_END_${kind}_${end}:${component}.`);
    return value;
  };
  return [...FORCE_COMPONENTS.map((component) => get('FORCE', component)), ...MOMENT_COMPONENTS.map((component) => get('MOMENT', component))];
}

function requireOrderedChain(entries, fromNode, toNode) {
  const remaining = new Map(entries.map((entry) => [entry.elementId, entry]));
  const ordered = [];
  let node = fromNode;
  while (node !== toNode) {
    const candidates = [...remaining.values()].filter((entry) => entry.nodeI === node);
    if (candidates.length !== 1) throw new TypeError(`Descendant chain from ${node} expected one outgoing entry; found ${candidates.length}.`);
    const entry = candidates[0];
    ordered.push(entry);
    remaining.delete(entry.elementId);
    node = entry.nodeJ;
    if (ordered.length > entries.length) throw new TypeError('Descendant chain cycle detected.');
  }
  if (remaining.size !== 0) throw new TypeError(`Source bend has ${remaining.size} disconnected descendants.`);
  return ordered;
}

function assembleChain(chain) {
  const nodeIds = [chain[0].nodeI, ...chain.map((entry) => entry.nodeJ)];
  const nodeIndex = new Map(nodeIds.map((id, index) => [id, index]));
  const size = nodeIds.length * 6;
  const stiffness = matrix(size, size);
  const equivalent = new Array(size).fill(0);
  const initialTotal = new Array(size).fill(0);
  const initialPressure = new Array(size).fill(0);
  const initialMec21 = new Array(size).fill(0);
  for (const entry of chain) {
    const i = nodeIndex.get(entry.nodeI);
    const j = nodeIndex.get(entry.nodeJ);
    addElementMatrix(stiffness, entry.globalStiffness, i, j);
    addElementVector(equivalent, entry.equivalentLoadGlobal, i, j);
    addElementVector(initialTotal, entry.initialStrainLoadGlobal, i, j);
    if (entry.kind === 'BEND_INCOMING_STRAIGHT') addElementVector(initialPressure, entry.initialStrainLoadGlobal, i, j);
    else if (entry.kind === 'BEND_ARC') addElementVector(initialMec21, entry.initialStrainLoadGlobal, i, j);
  }
  return { nodeIds, stiffness, equivalent, initialTotal, initialPressure, initialMec21 };
}

function condenseSubstructure(full, boundaryNodeIds) {
  assert.equal(full.nodeIds[0], boundaryNodeIds[0]);
  assert.equal(full.nodeIds.at(-1), boundaryNodeIds[1]);
  const n = full.nodeIds.length;
  const boundary = [...Array.from({ length: 6 }, (_, i) => i), ...Array.from({ length: 6 }, (_, i) => (n - 1) * 6 + i)];
  const internal = Array.from({ length: Math.max(0, (n - 2) * 6) }, (_, i) => 6 + i);
  if (internal.length === 0) return {
    stiffness: flatten(submatrix(full.stiffness, boundary, boundary)),
    equivalent: subvector(full.equivalent, boundary),
    initialTotal: subvector(full.initialTotal, boundary),
    initialPressure: subvector(full.initialPressure, boundary),
    initialMec21: subvector(full.initialMec21, boundary),
  };
  const Kbb = submatrix(full.stiffness, boundary, boundary);
  const Kbi = submatrix(full.stiffness, boundary, internal);
  const Kib = submatrix(full.stiffness, internal, boundary);
  const Kii = submatrix(full.stiffness, internal, internal);
  const X = solveColumns(Kii, Kib);
  const condensedK = subtractMatrix(Kbb, multiplyMatrices(Kbi, X));
  const condenseLoad = (vector) => {
    const fb = subvector(vector, boundary);
    const fi = subvector(vector, internal);
    const yi = solveDense(Kii, fi);
    const correction = multiplyVector(Kbi, yi);
    return fb.map((value, index) => value - correction[index]);
  };
  return {
    stiffness: flatten(condensedK),
    equivalent: condenseLoad(full.equivalent),
    initialTotal: condenseLoad(full.initialTotal),
    initialPressure: condenseLoad(full.initialPressure),
    initialMec21: condenseLoad(full.initialMec21),
  };
}

function recoverBoundaryAction(condensed, displacement) {
  const elastic = multiplyFlat12(condensed.stiffness, displacement);
  return elastic.map((value, index) => value - condensed.equivalent[index] - condensed.initialTotal[index]);
}

function rotationResolutionAssessment({ condensed, displacement, normalizedResidual, scales }) {
  const uncertain = [3, 4, 5, 9, 10, 11].filter((index) => displacement[index] === 0);
  const uncertainty = new Array(12).fill(0);
  const sensitivities = [];
  for (const dofIndex of uncertain) {
    const deltaAction = new Array(12).fill(0).map((_unused, row) => condensed.stiffness[row * 12 + dofIndex] * ROTATION_RESOLUTION_RAD);
    for (let index = 0; index < 12; index += 1) uncertainty[index] += Math.abs(deltaAction[index]);
    sensitivities.push({ boundaryDof: dofIndex < 6 ? `FROM:${DOFS[dofIndex]}` : `TO:${DOFS[dofIndex - 6]}`, plusResolutionDeltaAction: deltaAction });
  }
  const normalizedUncertainty = uncertainty.map((value, index) => value / scales[index]);
  const robustLowerBound = normalizedResidual.map((value, index) => Math.max(0, Math.abs(value) - normalizedUncertainty[index]));
  const definitelyFailingComponents = robustLowerBound.map((value, index) => ({ component: actionLabel(index), lowerBound: value }))
    .filter((entry) => entry.lowerBound > COMPONENT_LIMIT);
  const rawFailure = normalizedResidual.some((value) => Math.abs(value) > COMPONENT_LIMIT);
  const admissibleConstitutiveFailure = rawFailure && definitelyFailingComponents.length > 0;
  return {
    demonstratedNonzeroFloorDeg: ROTATION_RESOLUTION_DEG,
    unresolvedZeroRotationDofs: sensitivities.map((entry) => entry.boundaryDof),
    componentActionUncertainty: uncertainty,
    normalizedComponentUncertainty: normalizedUncertainty,
    robustLowerBoundAbsNormalizedResidual: robustLowerBound,
    definitelyFailingComponents,
    sensitivityEvidence: sensitivities,
    admissibleConstitutiveFailure,
    classification: !rawFailure ? 'RAW_PASS' : admissibleConstitutiveFailure ? 'ADMISSIBLE_FAIL_DESPITE_PINNED_ROTATION_OUTPUT_RESOLUTION' : 'NON_RESOLVING_DUE_TO_PINNED_ROTATION_OUTPUT_RESOLUTION',
  };
}

function boundaryDisplacement(rows, nodeIds) {
  const index = new Map(rows.filter((row) => row.entityKind === 'NODE' && ['DISPLACEMENT', 'ROTATION'].includes(row.quantity))
    .map((row) => [`${row.entityId}:${row.component}`, Number(row.value)]));
  return nodeIds.flatMap((nodeId) => DOFS.map((dof) => {
    const value = index.get(`${nodeId}:${dof}`);
    if (!Number.isFinite(value)) throw new TypeError(`Missing boundary displacement ${nodeId}:${dof}.`);
    return value;
  }));
}

function actionScaleVector(reference, tolerances) {
  const floors = [
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_FORCE_FROM.scaleFloor)),
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_MOMENT_FROM.scaleFloor)),
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_FORCE_TO.scaleFloor)),
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_MOMENT_TO.scaleFloor)),
  ];
  return reference.map((value, index) => Math.max(Math.abs(value), floors[index]));
}

function requireSourceRow(pkg, id) {
  const matches = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows.filter((row) => String(row.ELEMENTID) === String(id));
  if (matches.length !== 1) throw new TypeError(`Expected one source E${id}; found ${matches.length}.`);
  return matches[0];
}

function requirePinnedPackage(value) {
  if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') throw new TypeError('Canonical ACCDB package required.');
  assert.equal(String(value.source?.sha256).toLowerCase(), EXPECTED_SOURCE_SHA256, 'ACCDB SHA drift.');
  const l19 = value.cases?.find((entry) => entry.caseId === CASE_ID);
  assert.equal(l19?.formula, 'W+P1', 'Bend audit requires L19=W+P1.');
}

function actionLabel(index) {
  const end = index < 6 ? 'FROM' : 'TO';
  const local = index % 6;
  const component = local < 3 ? FORCE_COMPONENTS[local] : MOMENT_COMPONENTS[local - 3];
  return `${end}:${component}`;
}
function addElementMatrix(global, local, nodeI, nodeJ) {
  if (!Array.isArray(local) || local.length !== 144) throw new TypeError('Element global stiffness must be 12x12 flattened.');
  const map = [...Array.from({ length: 6 }, (_, i) => nodeI * 6 + i), ...Array.from({ length: 6 }, (_, i) => nodeJ * 6 + i)];
  for (let row = 0; row < 12; row += 1) for (let col = 0; col < 12; col += 1) global[map[row]][map[col]] += local[row * 12 + col];
}
function addElementVector(global, local, nodeI, nodeJ) {
  if (!Array.isArray(local) || local.length !== 12) throw new TypeError('Element load vector must have 12 entries.');
  const map = [...Array.from({ length: 6 }, (_, i) => nodeI * 6 + i), ...Array.from({ length: 6 }, (_, i) => nodeJ * 6 + i)];
  for (let i = 0; i < 12; i += 1) global[map[i]] += local[i];
}
function matrix(rows, cols) { return Array.from({ length: rows }, () => new Array(cols).fill(0)); }
function submatrix(A, rows, cols) { return rows.map((r) => cols.map((c) => A[r][c])); }
function subvector(v, rows) { return rows.map((r) => v[r]); }
function flatten(A) { return A.flat(); }
function subtractMatrix(A, B) { return A.map((row, i) => row.map((value, j) => value - B[i][j])); }
function multiplyMatrices(A, B) {
  const out = matrix(A.length, B[0].length);
  for (let i = 0; i < A.length; i += 1) for (let k = 0; k < B.length; k += 1) {
    const aik = A[i][k];
    if (aik === 0) continue;
    for (let j = 0; j < B[0].length; j += 1) out[i][j] += aik * B[k][j];
  }
  return out;
}
function multiplyVector(A, x) { return A.map((row) => row.reduce((sum, value, index) => sum + value * x[index], 0)); }
function multiplyFlat12(A, x) {
  return new Array(12).fill(0).map((_unused, row) => {
    let sum = 0;
    for (let col = 0; col < 12; col += 1) sum += A[row * 12 + col] * x[col];
    return sum;
  });
}
function solveColumns(A, B) {
  const out = matrix(A.length, B[0].length);
  for (let col = 0; col < B[0].length; col += 1) {
    const x = solveDense(A, B.map((row) => row[col]));
    for (let row = 0; row < A.length; row += 1) out[row][col] = x[row];
  }
  return out;
}
function solveDense(A, rhs) {
  const n = A.length;
  const M = A.map((row, index) => [...row, rhs[index]]);
  for (let pivot = 0; pivot < n; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < n; row += 1) if (Math.abs(M[row][pivot]) > Math.abs(M[best][pivot])) best = row;
    if (!(Math.abs(M[best][pivot]) > 1e-18)) throw new Error(`BEND_CONDENSATION_INTERNAL_MATRIX_SINGULAR_AT_${pivot}`);
    [M[pivot], M[best]] = [M[best], M[pivot]];
    const divisor = M[pivot][pivot];
    for (let col = pivot; col <= n; col += 1) M[pivot][col] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === pivot) continue;
      const factor = M[row][pivot];
      if (factor === 0) continue;
      for (let col = pivot; col <= n; col += 1) M[row][col] -= factor * M[pivot][col];
    }
  }
  return M.map((row) => row[n]);
}
function addVectors(...vectors) { return vectors[0].map((_value, index) => vectors.reduce((sum, vector) => sum + vector[index], 0)); }
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function maxAbs(values) { return Math.max(...values.map(Math.abs)); }
function parseArgs(tokens) {
  const result = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) throw new TypeError(`Unexpected argument ${token}.`);
    const value = tokens[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`Missing value for ${token}.`);
    result[token.slice(2)] = value;
    index += 1;
  }
  return result;
}
