#!/usr/bin/env node
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = parseArgs(process.argv.slice(2));
if (!args.package || !args.qualification) {
  throw new TypeError('Usage: node scripts/lfea-issue947-resolution-aware-plain-frame-scan.mjs --package <canonical-package.json> --qualification <qualification-or-report.json> [--out <json>]');
}

const here = dirname(fileURLToPath(import.meta.url));
const basePath = join(here, 'lfea-issue947-plain-frame-failure-scan.mjs');
const tempPath = join(here, '.issue947-resolution-aware-plain-frame-scan.tmp.mjs');
let source = readFileSync(basePath, 'utf8');

source = source.replace(
  "const qualification = JSON.parse(readFileSync(args.qualification, 'utf8'));",
  "const qualificationDocument = JSON.parse(readFileSync(args.qualification, 'utf8'));\nconst qualification = qualificationDocument.qualification ?? qualificationDocument;",
);

const coordinateAnchor = "const coordinates = sourceCoordinateIndex(benchmarkPackage.model.tables.INPUT_NODAL_COORDINATES.rows);";
if (!source.includes(coordinateAnchor)) throw new Error('Plain-frame scan coordinate anchor not found.');
source = source.replace(coordinateAnchor, `const rawCoordinates = sourceCoordinateIndex(benchmarkPackage.model.tables.INPUT_NODAL_COORDINATES.rows);\nconst { coordinates, bendFarAdjustments } = analysisCoordinatesWithBendFarNodes(\n  rawCoordinates,\n  [...sourceRows.values()],\n  benchmarkPackage.model.tables.INPUT_BENDS.rows,\n);`);

const gravityPhiAnchor = `    phiXY: stiffness.phiXY,\n    phiXZ: stiffness.phiXZ,`;
if (!source.includes(gravityPhiAnchor)) throw new Error('Plain-frame gravity load-vector anchor not found.');
source = source.replace(gravityPhiAnchor, `    phiXY: 0,\n    phiXZ: 0,`);

const constantAnchor = "const KG_PER_CM3_TO_KG_PER_M3 = 1e6;";
if (!source.includes(constantAnchor)) throw new Error('Plain-frame constant anchor not found.');
source = source.replace(constantAnchor, `${constantAnchor}\nconst PINNED_ACCDB_ROTATION_RESOLUTION_DEG = 1e-4;\nconst PINNED_ACCDB_ROTATION_RESOLUTION_RAD = PINNED_ACCDB_ROTATION_RESOLUTION_DEG * Math.PI / 180;`);

const maxAnchor = `  const maxIndex = abs.indexOf(Math.max(...abs));`;
if (!source.includes(maxAnchor)) throw new Error('Plain-frame residual max anchor not found.');
source = source.replace(maxAnchor, `${maxAnchor}\n  const rotationResolutionAssessment = assessRotationOutputResolution({\n    displacementGlobal,\n    actionGlobal,\n    normalizedResidual,\n    stiffnessMatrix: stiffness.matrix,\n    transformation,\n    equivalentLocal,\n    initialLocal,\n    referenceGlobal,\n    toleranceProfile: input.toleranceProfile,\n  });`);

const returnAnchor = `    governingResidualDof: globalActionDofLabel(maxIndex),\n    constitutiveStatusAtTenPercent: abs[maxIndex] <= 0.1 ? 'PASS' : 'FAIL',`;
if (!source.includes(returnAnchor)) throw new Error('Plain-frame return anchor not found.');
source = source.replace(returnAnchor, `    governingResidualDof: globalActionDofLabel(maxIndex),\n    constitutiveStatusAtTenPercent: abs[maxIndex] <= 0.1 ? 'PASS' : 'FAIL',\n    rotationResolutionAssessment,`);

const firstFailureAnchor = `const firstConstitutiveFailure = rows.find((row) => row.maxAbsNormalizedResidual > 0.1) ?? null;\nconst firstSolvedActionFailureWithQualifiedConstitutiveLaw = rows.find((row) => row.maxAbsNormalizedResidual <= 0.1) ?? null;`;
if (!source.includes(firstFailureAnchor)) throw new Error('Plain-frame first-failure anchor not found.');
source = source.replace(firstFailureAnchor, `const firstConstitutiveFailure = rows.find((row) => row.maxAbsNormalizedResidual > 0.1) ?? null;\nconst firstAdmissibleConstitutiveFailure = rows.find((row) => row.rotationResolutionAssessment.admissibleConstitutiveFailure) ?? null;\nconst firstNonResolvingRawFailure = rows.find((row) => row.maxAbsNormalizedResidual > 0.1 && !row.rotationResolutionAssessment.admissibleConstitutiveFailure) ?? null;\nconst firstSolvedActionFailureWithQualifiedConstitutiveLaw = rows.find((row) => row.maxAbsNormalizedResidual <= 0.1) ?? null;`);

const outputAnchor = `  method: 'CAESAR_NODAL_DISPLACEMENT_INJECTED_INTO_CURRENT_CAESAR_PIPE_FRAME_LAW_V1',`;
if (!source.includes(outputAnchor)) throw new Error('Plain-frame output method anchor not found.');
source = source.replace(outputAnchor, `  method: 'CAESAR_NODAL_DISPLACEMENT_INJECTED_INTO_PRODUCTION_PARITY_PIPE_FRAME_LAW_WITH_PINNED_EXPORT_ROTATION_RESOLUTION_V1',\n  analysisGeometryCorrection: { rule: 'BEND_SOURCE_TO_NODE_MOVED_FROM_RAW_INTERSECTION_TO_TANGENT_END_FAR_POINT', bendFarAdjustments },\n  gravityLoadVectorParity: { rule: 'ACCDB_PRODUCTION_GRAVITY_VECTOR_PHI_ZERO', phiXY: 0, phiXZ: 0 },\n  rotationOutputResolution: {\n    source: 'ISSUE947_PINNED_BM4_NL_ACCDB_OUTPUT_DISPLACEMENTS_AUDIT',\n    demonstratedNonzeroFloorDeg: PINNED_ACCDB_ROTATION_RESOLUTION_DEG,\n    rule: 'RAW_ZERO_ROTATION_IS_NOT_SUBSTITUTED; PROPAGATE_PLUS_OR_MINUS_EXPORT_RESOLUTION_AS_CONSERVATIVE_ACTION_UNCERTAINTY',\n  },`);

const outputFailureAnchor = `  firstSolvedActionFailureWithQualifiedConstitutiveLaw,\n  firstConstitutiveFailure,`;
if (!source.includes(outputFailureAnchor)) throw new Error('Plain-frame output failure anchor not found.');
source = source.replace(outputFailureAnchor, `  firstSolvedActionFailureWithQualifiedConstitutiveLaw,\n  firstConstitutiveFailure,\n  firstAdmissibleConstitutiveFailure,\n  firstNonResolvingRawFailure,\n  resolutionDispositionCounts: {\n    admissibleConstitutiveFailures: rows.filter((row) => row.rotationResolutionAssessment.admissibleConstitutiveFailure).length,\n    nonResolvingRawFailures: rows.filter((row) => row.maxAbsNormalizedResidual > 0.1 && !row.rotationResolutionAssessment.admissibleConstitutiveFailure).length,\n  },`);

const helperAnchor = 'function globalActionDofLabel(index) {';
if (!source.includes(helperAnchor)) throw new Error('Plain-frame helper anchor not found.');
const resolutionHelpers = `function assessRotationOutputResolution(input) {\n  const uncertainDofIndices = [3, 4, 5, 9, 10, 11].filter((index) => input.displacementGlobal[index] === 0);\n  const actionUncertainty = new Array(12).fill(0);\n  const sensitivities = [];\n  for (const dofIndex of uncertainDofIndices) {\n    const perturbed = [...input.displacementGlobal];\n    perturbed[dofIndex] += PINNED_ACCDB_ROTATION_RESOLUTION_RAD;\n    const perturbedLocal = transformDisplacementToLocal(perturbed, input.transformation);\n    const perturbedElastic = multiply12(input.stiffnessMatrix, perturbedLocal);\n    const perturbedLocalAction = perturbedElastic.map((value, index) => value - input.equivalentLocal[index] - input.initialLocal[index]);\n    const perturbedGlobalAction = transformLoadToGlobal(perturbedLocalAction, input.transformation);\n    const deltaAction = perturbedGlobalAction.map((value, index) => value - input.actionGlobal[index]);\n    for (let index = 0; index < 12; index += 1) actionUncertainty[index] += Math.abs(deltaAction[index]);\n    sensitivities.push({\n      endpointDof: dofIndex < 6 ? \`FROM:\${DOFS[dofIndex]}\` : \`TO:\${DOFS[dofIndex - 6]}\`,\n      plusResolutionDeltaAction: deltaAction,\n    });\n  }\n  const scales = actionScaleVector(input.referenceGlobal, input.toleranceProfile);\n  const normalizedUncertainty = actionUncertainty.map((value, index) => value / scales[index]);\n  const robustLowerBoundAbsNormalizedResidual = input.normalizedResidual.map((value, index) =>\n    Math.max(0, Math.abs(value) - normalizedUncertainty[index]));\n  const definitelyFailingComponents = robustLowerBoundAbsNormalizedResidual\n    .map((value, index) => ({ component: globalActionDofLabel(index), lowerBound: value }))\n    .filter((entry) => entry.lowerBound > 0.1);\n  const rawFailure = input.normalizedResidual.some((value) => Math.abs(value) > 0.1);\n  const admissibleConstitutiveFailure = rawFailure && definitelyFailingComponents.length > 0;\n  let classification = 'RAW_PASS';\n  if (rawFailure && uncertainDofIndices.length === 0) classification = 'ADMISSIBLE_FAIL_EXACT_EXPORTED_ROTATIONS';\n  else if (admissibleConstitutiveFailure) classification = 'ADMISSIBLE_FAIL_DESPITE_PINNED_ROTATION_OUTPUT_RESOLUTION';\n  else if (rawFailure) classification = 'NON_RESOLVING_DUE_TO_PINNED_ROTATION_OUTPUT_RESOLUTION';\n  return {\n    classification,\n    admissibleConstitutiveFailure,\n    unresolvedZeroRotationDofCount: uncertainDofIndices.length,\n    unresolvedZeroRotationDofs: sensitivities.map((entry) => entry.endpointDof),\n    sourceResolutionDeg: PINNED_ACCDB_ROTATION_RESOLUTION_DEG,\n    sourceResolutionRad: PINNED_ACCDB_ROTATION_RESOLUTION_RAD,\n    componentActionUncertainty: actionUncertainty,\n    normalizedComponentUncertainty: normalizedUncertainty,\n    robustLowerBoundAbsNormalizedResidual,\n    definitelyFailingComponents,\n    sensitivityEvidence: sensitivities,\n    conservativeRule: 'Sum absolute action changes from independent +/-0.0001 degree unresolved zero rotations. No inferred rotation is substituted into source data.',\n  };\n}\nfunction actionScaleVector(reference, toleranceProfile) {\n  const forceFromFloor = Number(toleranceProfile.GLOBAL_END_FORCE_FROM.scaleFloor);\n  const forceToFloor = Number(toleranceProfile.GLOBAL_END_FORCE_TO.scaleFloor);\n  const momentFromFloor = Number(toleranceProfile.GLOBAL_END_MOMENT_FROM.scaleFloor);\n  const momentToFloor = Number(toleranceProfile.GLOBAL_END_MOMENT_TO.scaleFloor);\n  const floors = [forceFromFloor, forceFromFloor, forceFromFloor, momentFromFloor, momentFromFloor, momentFromFloor,\n    forceToFloor, forceToFloor, forceToFloor, momentToFloor, momentToFloor, momentToFloor];\n  return reference.map((value, index) => Math.max(Math.abs(value), floors[index]));\n}\n`;
source = source.replace(helperAnchor, `${resolutionHelpers}${helperAnchor}`);

const sourceCoordinateHelperAnchor = 'function sourceCoordinateIndex(rows) {';
if (!source.includes(sourceCoordinateHelperAnchor)) throw new Error('Plain-frame source coordinate helper anchor not found.');
const geometryHelpers = `function analysisCoordinatesWithBendFarNodes(rawCoordinates, sourceRows, bendRows) {\n  const coordinates = new Map([...rawCoordinates].map(([id, point]) => [id, [...point]]));\n  const bendByPointer = new Map(bendRows.map((row) => [Number(row.BEND_PTR), row]));\n  const adjustments = [];\n  for (const row of sourceRows) {\n    const pointer = Number(row.BEND_PTR);\n    if (!(pointer > 0)) continue;\n    const bend = bendByPointer.get(pointer);\n    if (!bend) throw new TypeError(\`BEND_PTR \${pointer} declaration missing.\`);\n    const outgoing = sourceRows.filter((candidate) => String(candidate.FROM_NODE) === String(row.TO_NODE));\n    if (outgoing.length !== 1) throw new TypeError(\`BEND_PTR \${pointer} requires one outgoing source element; found \${outgoing.length}.\`);\n    const start = requireCoordinate(rawCoordinates, String(row.FROM_NODE));\n    const intersection = requireCoordinate(rawCoordinates, String(row.TO_NODE));\n    const outletEnd = requireCoordinate(rawCoordinates, String(outgoing[0].TO_NODE));\n    const incomingDirection = vectorUnit(vectorSubtract(intersection, start), \`BEND_PTR \${pointer} incoming\`);\n    const outgoingDirection = vectorUnit(vectorSubtract(outletEnd, intersection), \`BEND_PTR \${pointer} outgoing\`);\n    const bendAngle = Math.acos(clampScalar(vectorDot(incomingDirection, outgoingDirection), -1, 1));\n    const radius = Number(bend.RADIUS) * MM_TO_M;\n    const tangentLength = radius * Math.tan(bendAngle / 2);\n    const tangentEnd = vectorAdd(intersection, vectorScale(outgoingDirection, tangentLength));\n    coordinates.set(String(row.TO_NODE), tangentEnd);\n    adjustments.push({\n      bendPointer: pointer,\n      bendSourceElementId: String(row.ELEMENTID),\n      sourceIntersectionNodeId: String(row.TO_NODE),\n      rawIntersectionM: intersection,\n      tangentEndFarM: tangentEnd,\n      shiftM: vectorSubtract(tangentEnd, intersection),\n      shiftMagnitudeM: distance(tangentEnd, intersection),\n      outgoingSourceElementId: String(outgoing[0].ELEMENTID),\n    });\n  }\n  return { coordinates, bendFarAdjustments: adjustments };\n}\nfunction vectorAdd(left, right) { return left.map((value, index) => value + right[index]); }\nfunction vectorSubtract(left, right) { return left.map((value, index) => value - right[index]); }\nfunction vectorScale(value, factor) { return value.map((entry) => entry * factor); }\nfunction vectorDot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }\nfunction vectorUnit(value, field) { const norm = Math.hypot(...value); if (!(norm > 0)) throw new TypeError(\`\${field} is degenerate.\`); return vectorScale(value, 1 / norm); }\nfunction clampScalar(value, min, max) { return Math.min(max, Math.max(min, value)); }\n`;
source = source.replace(sourceCoordinateHelperAnchor, `${geometryHelpers}${sourceCoordinateHelperAnchor}`);

writeFileSync(tempPath, source);
try {
  const childArgs = [tempPath, '--package', args.package, '--qualification', args.qualification];
  if (args.out) childArgs.push('--out', args.out);
  const run = spawnSync(process.execPath, childArgs, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  if (run.status !== 0) process.exit(run.status ?? 1);
} finally {
  rmSync(tempPath, { force: true });
}

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
