#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  FRAME_LOCAL_AXIS_PROFILE,
  discretiseBend,
  resolveFrameLocalAxes,
} from '../src/core/centerline-beam-fea/index.js';
import {
  COMPONENT_GEOMETRY_SCHEMA,
  FACTOR_CALCULATION_REQUEST_SCHEMA,
  calculateB31Factors,
} from '../src/core/linear-fea-b31-factor-calculator/index.js';
import {
  compileFrameElement,
  condenseEndConditions,
  distributedLoadLocalVector,
  frameOffsetMatrix,
  sealFrameElementProfile,
  thermalInitialStrainVector,
  transformDisplacementToLocal,
  transformLoadToGlobal,
  transformStiffnessToGlobal,
} from '../src/core/linear-fea-frame-element/index.js';
import {
  LINEAR_FEA_MATERIAL_RESOLUTION_PROFILE,
  resolveLinearFeaMaterialState,
  sealMaterialTable,
} from '../src/core/linear-fea-material/index.js';
import {
  compilePipingComponent,
  deriveMec21BendPressureFreeState,
  sealPipingComponentProfile,
} from '../src/core/linear-fea-piping-components/index.js';
import {
  PIPE_SECTION_FORMULATION_ID,
  PIPE_SECTION_PROFILE,
  PIPE_SECTION_REQUEST_SCHEMA,
  computePipeSectionRequestSemanticHash,
  resolvePipeSection,
} from '../src/core/linear-fea-section/index.js';
import { solveCaesarAccdbLinearBenchmark } from '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const PROFILE_SOURCE = 'ISSUE_947_E36_PRODUCTION_CONDENSATION_AUDIT';
const FACTOR_PROFILE_ID = 'B31_3_2022_B31J_2017';
const MM_TO_M = 0.001;
const KPA_TO_PA = 1000;
const KG_PER_CM3_TO_KG_PER_M3 = 1e6;
const POSITION_TOLERANCE_M = 1e-7;
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const FORCE_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ']);
const MOMENT_COMPONENTS = Object.freeze(['MX', 'MY', 'MZ']);

const args = parseArgs(process.argv.slice(2));
if (!args.package) {
  throw new TypeError('Usage: node scripts/lfea-issue947-e36-production-condensation-audit.mjs --package <canonical-package.json> [--out <json>]');
}
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
requirePinnedPackage(pkg);
const solveProfile = pkg.profile.linearSolve;
assert.equal(solveProfile.bourdonPressureEffects.mode, 'TRANSLATION_AND_ROTATION');
assert.equal(solveProfile.directionalB31JTeeFlexibility, true);
assert.equal(solveProfile.b31jSmooth90FlexibilityCorrection.enabled, false);

const sourceRows = new Map(pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows.map((row) => [String(row.ELEMENTID), row]));
const bendRows = new Map(pkg.model.tables.INPUT_BENDS.rows.map((row) => [Number(row.BEND_PTR), row]));
const coordinateIndex = sourceCoordinateIndex(pkg.model.tables.INPUT_NODAL_COORDINATES.rows);
const runIn = requireSourceRow(sourceRows, '17');
const runOut = requireSourceRow(sourceRows, '18');
const branch = requireSourceRow(sourceRows, '36');
const nextBranch = requireSourceRow(sourceRows, '37');
assert.equal(String(branch.FROM_NODE), '20295');
assert.equal(String(branch.TO_NODE), '21430');
assert.equal(Number(branch.BEND_PTR), 7);
assert.equal(String(nextBranch.FROM_NODE), '21430');

const material = buildMaterial([...sourceRows.values()], pkg);
const sectionRegistry = createSectionRegistry(pkg);
const runSection = sectionRegistry.resolve(Number(runIn.DIAMETER) * MM_TO_M, Number(runIn.WALL_THICK) * MM_TO_M);
const branchSection = sectionRegistry.resolve(Number(branch.DIAMETER) * MM_TO_M, Number(branch.WALL_THICK) * MM_TO_M);
const geometry = buildE36Geometry({ branch, nextBranch, bend: bendRows.get(7), coordinateIndex, runSection });
const tee = buildTeeAuthority({ pkg, runIn, runOut, branch, coordinateIndex, runSection, branchSection, material, geometry });
const chain = buildProductionFaithfulChain({ pkg, branch, material, branchSection, geometry, tee });
const condensed = condenseChain(chain, ['20295', '21430']);

const production = solveCaesarAccdbLinearBenchmark(pkg);
const actualRows = production.cases.L19.rows;
const referenceRows = pkg.references.L19.rows;
const sourceEntityId = sourceResultElementId(branch);
const productionSourceAction = actionVector(actualRows, sourceEntityId);
const inferredCaesarSourceAction = inferCaesarE36Action(referenceRows, runIn, runOut, nextBranch);
const lfeaBoundaryDof = boundaryDofVector(actualRows, ['20295', '21430']);
const caesarBoundaryDof = boundaryDofVector(referenceRows, ['20295', '21430']);

const lfeaParity = evaluate(condensed, lfeaBoundaryDof, productionSourceAction, pkg.profile.tolerances);
const caesar = evaluate(condensed, caesarBoundaryDof, inferredCaesarSourceAction, pkg.profile.tolerances);

const productionLedger = production.mechanics.cases.L19.elementLedger
  .filter((entry) => String(entry.sourceElementId) === '36');
const reconstructedLedger = chain.elements.map((entry) => ({
  elementId: entry.elementId,
  nodeI: entry.nodeI,
  nodeJ: entry.nodeJ,
  kind: entry.kind,
  gravityWeightN: entry.gravityWeightN,
  pressureAxialStrain: entry.pressureAxialStrain,
  bourdonRotationRadians: entry.bourdonRotationRadians,
}));
const ledgerParity = compareLedger(productionLedger, reconstructedLedger);

const parityMaxAbs = Math.max(...lfeaParity.residual.map(Math.abs));
assert.ok(ledgerParity.pass, `Reconstructed E36 ledger diverges from production: ${JSON.stringify(ledgerParity)}`);
assert.ok(parityMaxAbs <= 2e-3, `E36 condensed parity against production source action failed: ${parityMaxAbs}`);

const output = {
  schema: 'lfea-issue947-e36-production-condensation-audit/v1',
  issue: 947,
  caseId: 'L19',
  sourceAccdbSha256: pkg.source.sha256,
  sourceElementId: '36',
  boundaryNodes: ['20295', '21430'],
  referenceUsage: 'DIAGNOSTIC_ONLY_NO_PARAMETER_FIT_NO_UPDATE_RULE',
  method: {
    equation: 'q_b=(K_bb-K_bi*K_ii^-1*K_ib)d_b-(f_g,b-K_bi*K_ii^-1*f_g,i)-(f_p,b-K_bi*K_ii^-1*f_p,i)-(f_B,b-K_bi*K_ii^-1*f_B,i)',
    internalEquilibrium: 'K_ib*d_b+K_ii*d_i-f_g,i-f_p,i-f_B,i=0',
    productionParityRule: 'The independently reconstructed chain must reproduce production E36 source actions under LFEA source boundary DOFs before CAESAR DOFs are evaluated.',
  },
  geometry: {
    bendPointer: 7,
    bendAngleDegrees: geometry.bendAngle * 180 / Math.PI,
    bendRadiusM: geometry.radius,
    tangentStartM: geometry.tangentStart,
    tangentEndM: geometry.tangentEnd,
    branchSurfaceOffsetM: tee.rigidOffset,
    branchSurfaceM: geometry.surface,
    incomingStraightLengthM: distance(geometry.surface, geometry.tangentStart),
    bendArcLengthM: geometry.radius * geometry.bendAngle,
    analysisElementCount: chain.elements.length,
    internalNodeCount: condensed.internalNodeIds.length,
  },
  authorities: {
    frameFormulation: frameProfile().straightPipeFormulation,
    shearCorrectionFactorY: frameProfile().shearCorrectionFactorY,
    shearCorrectionFactorZ: frameProfile().shearCorrectionFactorZ,
    b31jBranchInPlaneFlexibility: tee.branchFactor,
    b31jBranchSpringNmPerRad: tee.springStiffness,
    b31jBranchSurfaceOffsetM: tee.rigidOffset,
    bendElementCount: geometry.component.subdivision.elementCount,
    bendArcToChordLoadScale: geometry.arcToChord,
    bourdonMode: solveProfile.bourdonPressureEffects.mode,
  },
  parity: {
    ledger: ledgerParity,
    productionSourceAction,
    condensedActionAtLfeaBoundaryDof: lfeaParity.fullAction,
    residual: lfeaParity.residual,
    maxAbsResidual: parityMaxAbs,
    status: 'PASS',
  },
  caesarInjection: {
    boundaryDof: caesarBoundaryDof,
    inferredReferenceAction: inferredCaesarSourceAction,
    terms: caesar.terms,
    fullAction: caesar.fullAction,
    residual: caesar.residual,
    normalizedResidual: caesar.normalizedResidual,
    normalizedResidualL2: caesar.normalizedResidualL2,
    maxAbsNormalizedResidual: caesar.maxAbsNormalizedResidual,
    governingResidualDof: caesar.governingResidualDof,
    diagnosticBalances: caesar.diagnosticBalances,
  },
  falsificationRule: 'Do not modify production mechanics from this audit unless ledger parity and LFEA source-action parity both pass. A candidate mechanism must explain the signed CAESAR residual vector, not merely reduce a whole-model benchmark count.',
  nextGate: nextGate(caesar),
};
if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log('Issue 947 E36 production condensation audit PASS');

function buildProductionFaithfulChain(input) {
  const elements = [];
  const lineWeight = physicalLineWeight(input.branch, input.branchSection, input.pkg.profile.linearSolve.gravityAcceleration);
  const pressureStrain = closedEndPressureAxialStrain(input.branch, input.material.materialState.elasticModulus);
  const incomingAxes = resolveFrameLocalAxes({
    nodeI: input.geometry.surface,
    nodeJ: input.geometry.tangentStart,
    referenceVector: input.tee.referenceVector,
    profile: FRAME_LOCAL_AXIS_PROFILE,
  });
  const incomingFrame = compileFrameElement({
    elementId: 'ACCDB.E36.STRAIGHT',
    material: input.material,
    section: input.branchSection,
    localAxes: { result: incomingAxes, profile: FRAME_LOCAL_AXIS_PROFILE },
    profile: frameProfile(),
    distributedLoads: [],
    temperature: null,
    releases: [],
    endSprings: [],
    rigidOffsets: null,
  });
  const incomingGravityLocal = gravityVector(incomingFrame, lineWeight);
  const incomingPressureLocal = thermalInitialStrainVector({
    elasticModulus: incomingFrame.material.elasticModulus,
    area: incomingFrame.section.area,
    axialStrain: pressureStrain,
  });
  const incomingZero = zero12();
  const incomingCondensed = condenseEndConditions(
    incomingFrame.localStiffness,
    [incomingGravityLocal, incomingPressureLocal, incomingZero],
    [{ index: 4, stiffness: input.tee.springStiffness }],
    frameProfile().releaseSingularityTolerance.value,
  );
  const incomingT = incomingFrame.transformation.matrix;
  const incomingR = frameOffsetMatrix({ I: input.tee.rigidOffset, J: null });
  elements.push(finalizeElement({
    elementId: 'ACCDB.E36.STRAIGHT',
    nodeI: '20295',
    nodeJ: input.geometry.nodeIds[0],
    kind: 'BEND_INCOMING_STRAIGHT',
    K: transformStiffnessToGlobal(transformStiffnessToGlobal(incomingCondensed.matrix, incomingT), incomingR),
    gravity: transformLoadToGlobal(transformLoadToGlobal(incomingCondensed.vectors[0], incomingT), incomingR),
    pressure: transformLoadToGlobal(transformLoadToGlobal(incomingCondensed.vectors[1], incomingT), incomingR),
    bourdon: zero12(),
    gravityWeightN: lineWeight * incomingFrame.geometry.length,
    pressureAxialStrain: pressureStrain,
    bourdonRotationRadians: 0,
  }));

  for (let index = 0; index < input.geometry.component.elements.length; index += 1) {
    const componentEntry = input.geometry.component.elements[index];
    const frame = componentEntry.frameElement;
    const segment = input.geometry.bourdonSegments[index];
    const gravityLocal = gravityVector(frame, lineWeight * input.geometry.arcToChord);
    const bourdon = buildBourdonBendInitialLoad({
      row: input.branch,
      section: input.branchSection,
      frame,
      effectiveLocalStiffness: componentEntry.effectiveLocalStiffness,
      segment,
    });
    elements.push(finalizeElement({
      elementId: componentEntry.elementId,
      nodeI: input.geometry.nodeIds[index],
      nodeJ: input.geometry.nodeIds[index + 1],
      kind: 'BEND_ARC',
      K: componentEntry.effectiveGlobalStiffness,
      gravity: transformLoadToGlobal(gravityLocal, frame.transformation.matrix),
      pressure: zero12(),
      bourdon: transformLoadToGlobal(bourdon.initialLocal, frame.transformation.matrix),
      gravityWeightN: lineWeight * input.geometry.arcToChord * frame.geometry.length,
      pressureAxialStrain: 0,
      bourdonRotationRadians: bourdon.rotationRadians,
    }));
  }
  return { elements };
}

function buildE36Geometry(input) {
  if (!input.bend) throw new TypeError('BEND_PTR 7 declaration is missing.');
  const start = requireCoordinate(input.coordinateIndex, String(input.branch.FROM_NODE));
  const intersection = requireCoordinate(input.coordinateIndex, String(input.branch.TO_NODE));
  const outletEnd = requireCoordinate(input.coordinateIndex, String(input.nextBranch.TO_NODE));
  const incomingDirection = unit(subtract(intersection, start), 'E36 incoming');
  const outgoingDirection = unit(subtract(outletEnd, intersection), 'E36 outgoing');
  const bendAngle = Math.acos(clamp(dot(incomingDirection, outgoingDirection), -1, 1));
  const radius = Number(input.bend.RADIUS) * MM_TO_M;
  const tangentLength = radius * Math.tan(bendAngle / 2);
  const tangentStart = subtract(intersection, scale(incomingDirection, tangentLength));
  const tangentEnd = add(intersection, scale(outgoingDirection, tangentLength));
  const branchDirection = incomingDirection;
  const rigidOffset = scale(branchDirection, input.runSection.dimensions.outerDiameter / 2);
  const surface = add(start, rigidOffset);
  const factorResult = calculateB31Factors({
    schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
    calculationId: 'ISSUE947-E36-BEND7-FACTORS',
    componentId: 'ISSUE947-E36-BEND7',
    editionProfileId: FACTOR_PROFILE_ID,
    componentType: 'BEND',
    geometry: {
      schema: COMPONENT_GEOMETRY_SCHEMA,
      componentType: 'BEND',
      lengthUnit: 'm',
      outerDiameter: input.runSection.dimensions.outerDiameter,
      wallThickness: input.runSection.dimensions.wallThickness,
      bendRadius: radius,
      pressure: Number(input.branch.PRESSURE1) * KPA_TO_PA,
      elasticModulus: Number(input.branch.MODULUS) * KPA_TO_PA,
      bendAngleDegrees: bendAngle * 180 / Math.PI,
      smooth90FlexibilityCorrection: false,
      sourceEvidence: { sourceId: 'ACCDB:BEND:7', sourceRevision: EXPECTED_SOURCE_SHA256 },
    },
    momentDirectionMapping: { inPlaneField: 'my', outOfPlaneField: 'mz' },
    semanticHash: '',
  });
  assert.equal(factorResult.status, 'QUALIFIED');
  const material = buildMaterial([...sourceRows.values()], pkg);
  const sectionRegistry = createSectionRegistry(pkg);
  const section = sectionRegistry.resolve(Number(input.branch.DIAMETER) * MM_TO_M, Number(input.branch.WALL_THICK) * MM_TO_M);
  const component = compilePipingComponent({
    componentId: 'ACCDB-BEND-7',
    componentType: 'BEND',
    profile: componentProfile(),
    arc: { tangentStart, tangentEnd, incomingDirection, declaredRadius: radius },
    material,
    section,
    frameElementProfile: frameProfile(),
    localAxisProfile: FRAME_LOCAL_AXIS_PROFILE,
    referenceVector: null,
    factorSet: factorResult.componentFactorSet,
  });
  const chain = discretiseBend(
    asPoint(tangentStart),
    asPoint(tangentEnd),
    asPoint(component.geometry.centre),
    component.subdivision.elementCount,
  );
  const points = chain.points.map((point) => [point.x, point.y, point.z]);
  const nodeIds = chain.points.map((_point, index) => {
    const middleIndex = component.subdivision.elementCount / 2;
    if (index === middleIndex && validStationNode(input.bend.NODE1)) return String(input.bend.NODE1);
    if (index === component.subdivision.elementCount) return String(input.branch.TO_NODE);
    return `ACCDB.BEND7.N${index}`;
  });
  const bourdonSegments = buildBourdonSegments(points, component.geometry.centre, radius, incomingDirection, bendAngle);
  return {
    start,
    intersection,
    incomingDirection,
    outgoingDirection,
    bendAngle,
    radius,
    tangentStart,
    tangentEnd,
    rigidOffset,
    surface,
    component,
    points,
    nodeIds,
    bourdonSegments,
    arcToChord: component.geometry.arcLength / component.geometry.chordChainLength,
  };
}

function buildTeeAuthority(input) {
  const junction = requireCoordinate(input.coordinateIndex, '20295');
  const far = input.geometry.tangentStart;
  const runOther = requireCoordinate(input.coordinateIndex, String(input.runIn.FROM_NODE));
  const branchDirection = unit(subtract(far, junction), 'tee branch');
  const runDirection = unit(subtract(runOther, junction), 'tee run');
  const planeNormal = unit(cross(runDirection, branchDirection), 'tee plane normal');
  const factorResult = calculateB31Factors({
    schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
    calculationId: 'ISSUE947-TEE-20295-FACTORS',
    componentId: 'ISSUE947-TEE-20295',
    editionProfileId: FACTOR_PROFILE_ID,
    componentType: 'WELDING_TEE',
    geometry: {
      schema: COMPONENT_GEOMETRY_SCHEMA,
      componentType: 'WELDING_TEE',
      lengthUnit: 'm',
      runOuterDiameter: input.runSection.dimensions.outerDiameter,
      runWallThickness: input.runSection.dimensions.wallThickness,
      branchOuterDiameter: input.runSection.dimensions.outerDiameter,
      branchWallThickness: input.branchSection.dimensions.wallThickness,
      fittingQuality: 'UNVERIFIED',
      sourceEvidence: { sourceId: 'ACCDB:INPUT_SIFTEES:TYPE3:NODE:20295', sourceRevision: input.pkg.source.sha256 },
    },
    momentDirectionMapping: { inPlaneField: 'my', outOfPlaneField: 'mz' },
    semanticHash: '',
  });
  assert.equal(factorResult.status, 'QUALIFIED');
  const branchFactor = factorResult.factors.flexibility.branch.inPlane;
  const springStiffness = input.material.materialState.elasticModulus
    * input.branchSection.sectionState.secondMomentY
    / (branchFactor * input.branchSection.dimensions.outerDiameter);
  const rigidOffset = input.geometry.rigidOffset;
  return { branchFactor, springStiffness, rigidOffset, referenceVector: planeNormal };
}

function buildBourdonSegments(points, centrePoint, bendRadius, incomingDirection, totalBendAngle) {
  const centre = [...centrePoint];
  const referenceAAxis = unit(incomingDirection, 'bend reference a-axis');
  const referenceCAxis = unit(subtract(centre, points[0]), 'bend reference c-axis');
  const referenceBAxis = unit(cross(referenceCAxis, referenceAAxis), 'bend reference b-axis');
  const referenceAxes = { aAxis: referenceAAxis, bAxis: referenceBAxis, cAxis: referenceCAxis };
  const segments = [];
  let cumulativeAngle = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const pointI = points[index];
    const pointJ = points[index + 1];
    const cAxis = unit(subtract(centre, pointI), `bend segment ${index} c-axis`);
    const nextCAxis = unit(subtract(centre, pointJ), `bend segment ${index} next c-axis`);
    const chordDirection = unit(subtract(pointJ, pointI), `bend segment ${index} chord`);
    const tangentProjection = subtract(chordDirection, scale(cAxis, dot(chordDirection, cAxis)));
    const aAxis = unit(tangentProjection, `bend segment ${index} a-axis`);
    const bAxis = unit(cross(cAxis, aAxis), `bend segment ${index} b-axis`);
    const bendAngle = Math.acos(clamp(dot(cAxis, nextCAxis), -1, 1));
    const startAngle = cumulativeAngle;
    const rawEndAngle = cumulativeAngle + bendAngle;
    const endAngle = index === points.length - 2 ? totalBendAngle : rawEndAngle;
    cumulativeAngle = endAngle;
    segments.push({ aAxis, bAxis, cAxis, bendAngle, bendRadius, startAngle, endAngle, referenceAxes });
  }
  assert.ok(Math.abs(cumulativeAngle - totalBendAngle) <= 1e-10 * Math.max(1, totalBendAngle));
  return segments;
}

function buildBourdonBendInitialLoad(input) {
  const stateInput = {
    pressure: Number(input.row.PRESSURE1) * KPA_TO_PA,
    innerRadius: input.section.dimensions.innerDiameter / 2,
    bendRadius: input.segment.bendRadius,
    elasticModulus: input.frame.material.elasticModulus,
    secondMoment: input.section.sectionState.secondMomentY,
    poissonRatio: Number(input.row.POISSONS),
  };
  const startState = deriveMec21BendPressureFreeState({ ...stateInput, bendAngle: input.segment.startAngle });
  const endState = deriveMec21BendPressureFreeState({ ...stateInput, bendAngle: input.segment.endAngle });
  const startTranslationGlobal = abcVectorToGlobal(input.segment.referenceAxes, startState.translationAbc);
  const startRotationGlobal = abcVectorToGlobal(input.segment.referenceAxes, startState.rotationAbc);
  const endTranslationGlobal = abcVectorToGlobal(input.segment.referenceAxes, endState.translationAbc);
  const endRotationGlobal = abcVectorToGlobal(input.segment.referenceAxes, endState.rotationAbc);
  const freeDofLocal = transformDisplacementToLocal([
    ...startTranslationGlobal,
    ...startRotationGlobal,
    ...endTranslationGlobal,
    ...endRotationGlobal,
  ], input.frame.transformation.matrix);
  return {
    initialLocal: matrixVector(input.effectiveLocalStiffness, freeDofLocal, 12),
    rotationRadians: endState.rotationAbc[1] - startState.rotationAbc[1],
  };
}

function condenseChain(chain, boundaryNodeIds) {
  const nodeIds = [];
  const seen = new Set();
  for (const element of chain.elements) {
    for (const nodeId of [element.nodeI, element.nodeJ]) {
      if (!seen.has(nodeId)) { seen.add(nodeId); nodeIds.push(nodeId); }
    }
  }
  for (const nodeId of boundaryNodeIds) assert.ok(seen.has(nodeId), `Missing boundary node ${nodeId}`);
  const internalNodeIds = nodeIds.filter((nodeId) => !boundaryNodeIds.includes(nodeId));
  const orderedNodes = [...boundaryNodeIds, ...internalNodeIds];
  const ndof = orderedNodes.length * 6;
  const K = new Array(ndof * ndof).fill(0);
  const gravity = new Array(ndof).fill(0);
  const pressure = new Array(ndof).fill(0);
  const bourdon = new Array(ndof).fill(0);
  const nodeOffset = new Map(orderedNodes.map((nodeId, index) => [nodeId, index * 6]));
  for (const element of chain.elements) {
    const map = [...range6(nodeOffset.get(element.nodeI)), ...range6(nodeOffset.get(element.nodeJ))];
    assembleMatrix(K, ndof, element.K, map);
    assembleVector(gravity, element.gravity, map);
    assembleVector(pressure, element.pressure, map);
    assembleVector(bourdon, element.bourdon, map);
  }
  const nb = boundaryNodeIds.length * 6;
  const ni = ndof - nb;
  const Kbb = subMatrix(K, ndof, 0, nb, 0, nb);
  if (ni === 0) return { K: Kbb, gravity: gravity.slice(0, nb), pressure: pressure.slice(0, nb), bourdon: bourdon.slice(0, nb), internalNodeIds };
  const Kbi = subMatrix(K, ndof, 0, nb, nb, ndof);
  const Kib = subMatrix(K, ndof, nb, ndof, 0, nb);
  const Kii = subMatrix(K, ndof, nb, ndof, nb, ndof);
  const lu = luFactor(Kii, ni);
  const X = solveColumns(lu, Kib, ni, nb);
  const Kc = subtractMatrix(Kbb, multiplyMatrix(Kbi, nb, ni, X, ni, nb));
  const gravityC = condenseVector(gravity, Kbi, lu, nb, ni);
  const pressureC = condenseVector(pressure, Kbi, lu, nb, ni);
  const bourdonC = condenseVector(bourdon, Kbi, lu, nb, ni);
  return { K: Kc, gravity: gravityC, pressure: pressureC, bourdon: bourdonC, internalNodeIds };
}

function evaluate(condensed, boundaryDof, referenceAction, tolerances) {
  const kd = matrixVector(condensed.K, boundaryDof, 12);
  const afterGravity = subtract(kd, condensed.gravity);
  const afterPressure = subtract(afterGravity, condensed.pressure);
  const fullAction = subtract(afterPressure, condensed.bourdon);
  const residual = subtract(fullAction, referenceAction);
  const normalizedResidual = normalizeResidual(residual, referenceAction, tolerances);
  const maxIndex = argmax(normalizedResidual.map(Math.abs));
  const requiredInitialTotal = subtract(afterGravity, referenceAction);
  const actualInitialTotal = add(condensed.pressure, condensed.bourdon);
  return {
    terms: {
      kd,
      gravityEquivalent: condensed.gravity,
      pressureInitial: condensed.pressure,
      bourdonInitial: condensed.bourdon,
      afterGravity,
      afterPressure,
      full: fullAction,
    },
    fullAction,
    residual,
    normalizedResidual,
    normalizedResidualL2: Math.hypot(...normalizedResidual),
    maxAbsNormalizedResidual: Math.abs(normalizedResidual[maxIndex]),
    governingResidualDof: actionDofLabel(maxIndex),
    diagnosticBalances: {
      requiredInitialTotalFromReference: requiredInitialTotal,
      actualInitialTotal,
      initialTotalResidual: subtract(actualInitialTotal, requiredInitialTotal),
      pressureOnlyAction: subtract(afterGravity, condensed.pressure),
      bourdonOnlyAction: subtract(afterGravity, condensed.bourdon),
      noInitialAction: afterGravity,
    },
  };
}

function compareLedger(productionLedger, reconstructedLedger) {
  const compactProduction = productionLedger.map((entry) => ({
    elementId: entry.elementId,
    nodeI: entry.nodeI,
    nodeJ: entry.nodeJ,
    kind: entry.kind,
    gravityWeightN: Number(entry.gravityWeightN),
    pressureAxialStrain: Number(entry.pressureAxialStrain),
    bourdonRotationRadians: Number(entry.bourdonRotationRadians),
  }));
  if (compactProduction.length !== reconstructedLedger.length) return { pass: false, reason: 'ELEMENT_COUNT', production: compactProduction, reconstructed: reconstructedLedger };
  const mismatches = [];
  for (let i = 0; i < compactProduction.length; i += 1) {
    const a = compactProduction[i];
    const b = reconstructedLedger[i];
    for (const key of ['elementId', 'nodeI', 'nodeJ', 'kind']) if (String(a[key]) !== String(b[key])) mismatches.push({ index: i, key, production: a[key], reconstructed: b[key] });
    for (const key of ['gravityWeightN', 'pressureAxialStrain', 'bourdonRotationRadians']) {
      const scaleValue = Math.max(1, Math.abs(a[key]), Math.abs(b[key]));
      if (Math.abs(a[key] - b[key]) > 1e-9 * scaleValue) mismatches.push({ index: i, key, production: a[key], reconstructed: b[key] });
    }
  }
  return { pass: mismatches.length === 0, mismatches, production: compactProduction, reconstructed: reconstructedLedger };
}

function inferCaesarE36Action(rows, runIn, runOut, nextBranch) {
  const from = negate(add(referenceActionEnd(rows, runIn, 'TO'), referenceActionEnd(rows, runOut, 'FROM')));
  const to = negate(referenceActionEnd(rows, nextBranch, 'FROM'));
  return [...from, ...to];
}

function actionVector(rows, entityId) {
  return [
    ...FORCE_COMPONENTS.map((component) => requireResult(rows, entityId, 'GLOBAL_END_FORCE_FROM', component)),
    ...MOMENT_COMPONENTS.map((component) => requireResult(rows, entityId, 'GLOBAL_END_MOMENT_FROM', component)),
    ...FORCE_COMPONENTS.map((component) => requireResult(rows, entityId, 'GLOBAL_END_FORCE_TO', component)),
    ...MOMENT_COMPONENTS.map((component) => requireResult(rows, entityId, 'GLOBAL_END_MOMENT_TO', component)),
  ];
}

function referenceActionEnd(rows, row, end) {
  const entityId = sourceResultElementId(row);
  return [
    ...FORCE_COMPONENTS.map((component) => requireResult(rows, entityId, `GLOBAL_END_FORCE_${end}`, component)),
    ...MOMENT_COMPONENTS.map((component) => requireResult(rows, entityId, `GLOBAL_END_MOMENT_${end}`, component)),
  ];
}

function boundaryDofVector(rows, nodeIds) {
  return nodeIds.flatMap((nodeId) => DOFS.map((dof) => {
    const quantity = dof.startsWith('U') ? 'DISPLACEMENT' : 'ROTATION';
    const row = rows.find((entry) => entry.entityKind === 'NODE' && String(entry.entityId) === String(nodeId) && entry.quantity === quantity && entry.component === dof);
    if (!row) throw new TypeError(`Missing ${quantity} ${nodeId}:${dof}`);
    return Number(row.value);
  }));
}

function requireResult(rows, entityId, quantity, component) {
  const row = rows.find((entry) => entry.entityKind === 'ELEMENT' && entry.entityId === entityId && entry.quantity === quantity && entry.component === component);
  if (!row) throw new TypeError(`Missing result ${entityId} ${quantity} ${component}`);
  return Number(row.value);
}

function sourceResultElementId(row) {
  return `INPUT_ELEMENT:${String(row.ELEMENTID)}|${String(row.FROM_NODE)}->${String(row.TO_NODE)}|${String(row.ELEMENT_NAME ?? '').trim()}`;
}

function finalizeElement(input) {
  for (const vector of [input.gravity, input.pressure, input.bourdon]) assert.equal(vector.length, 12);
  assert.equal(input.K.length, 144);
  return input;
}

function buildMaterial(rows, benchmarkPackage) {
  const elasticValues = uniqueNumbers(rows.map((row) => Number(row.MODULUS)));
  const poissonValues = uniqueNumbers(rows.map((row) => Number(row.POISSONS)));
  const densityValues = uniqueNumbers(rows.map((row) => density(row.PIPE_DENSITY)));
  assert.equal(elasticValues.length, 1);
  assert.equal(poissonValues.length, 1);
  assert.equal(densityValues.length, 1);
  const elasticModulus = elasticValues[0] * KPA_TO_PA;
  const poissonRatio = poissonValues[0];
  const point = {
    absoluteTemperature: benchmarkPackage.model.installationTemperatureK,
    elasticModulus,
    shearModulus: elasticModulus / (2 * (1 + poissonRatio)),
    poissonRatio,
    massDensity: densityValues[0],
    thermalExpansionCoefficient: benchmarkPackage.profile.linearSolve.thermalExpansionCoefficientPerKelvin,
  };
  const table = sealMaterialTable({
    schema: 'fea-linear-material-table/v1',
    materialId: `ACCDB-MATERIAL-${Number(rows[0].MATERIAL_NUM)}`,
    sourceEvidence: { sourceId: 'ACCDB:INPUT_BASIC_ELEMENT_DATA:MATERIAL', sourceRevision: benchmarkPackage.source.sha256, sourceSemanticHash: 'ISSUE947-DIAGNOSTIC' },
    points: [point],
    semanticHash: '',
  });
  return resolveLinearFeaMaterialState({
    table,
    request: { materialStateId: 'ACCDB-MAT-AMBIENT', materialId: table.materialId, evaluationTemperature: benchmarkPackage.model.installationTemperatureK },
    profile: LINEAR_FEA_MATERIAL_RESOLUTION_PROFILE,
  });
}

function createSectionRegistry(benchmarkPackage) {
  const byKey = new Map();
  return {
    resolve(outerDiameter, wallThickness) {
      const key = `${outerDiameter}:${wallThickness}`;
      if (!byKey.has(key)) {
        const base = {
          schema: PIPE_SECTION_REQUEST_SCHEMA,
          sectionStateId: `ISSUE947-E36-SEC-${byKey.size + 1}`,
          formulationId: PIPE_SECTION_FORMULATION_ID,
          outerDiameter,
          wallThickness,
          sourceEvidence: { sourceId: 'ACCDB:PIPE_SECTION', sourceRevision: `${benchmarkPackage.source.sha256}:${key}`, sourceSemanticHash: 'ISSUE947-DIAGNOSTIC' },
        };
        byKey.set(key, resolvePipeSection({ request: { ...base, semanticHash: computePipeSectionRequestSemanticHash(base) }, profile: PIPE_SECTION_PROFILE }));
      }
      return byKey.get(key);
    },
  };
}

function frameProfile() {
  return sealFrameElementProfile({
    schema: 'fea-linear-frame-element-profile/v1',
    profileId: 'LINEAR-FRAME-ELEMENT-R1',
    straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
    shearDeformation: true,
    shearCorrectionFactorY: { value: 0.5, source: 'INTERGRAPH-CAESAR-II-CAUX-2015-FKX-SHEAR-COEFFICIENT-2' },
    shearCorrectionFactorZ: { value: 0.5, source: 'INTERGRAPH-CAESAR-II-CAUX-2015-FKX-SHEAR-COEFFICIENT-2' },
    releaseRule: 'STATIC_CONDENSATION_V1',
    thermalStrainApproximation: 'UNIFORM_TEMPERATURE_ALPHA_DELTA_T_V1',
    releaseSingularityTolerance: { value: 1e-12, source: PROFILE_SOURCE },
    semanticHash: '',
  });
}

function componentProfile() {
  return sealPipingComponentProfile({
    schema: 'fea-linear-piping-component-profile/v1',
    profileId: 'LINEAR-PIPING-COMPONENT-R1',
    bendFormulation: 'PIPE_BEND_CORRECTED_FRAME_V1',
    bendSubdivisionPurpose: 'STRESS_RECOVERY_V1',
    bendPressureStiffeningRule: 'BEND_PRESSURE_STIFFENING_DECLARED_FACTOR_V1',
    convergenceRequired: true,
    reducerRule: 'REDUCER_STEPPED_SECTION_V1',
    valveBodyRule: 'VALVE_RIGID_BODY_V1',
    weightLumpRule: 'FINITE_LENGTH_BODY_REQUIRED_V1',
    branchFlexibilityMethod: 'BRANCH_JUNCTION_ROTATIONAL_FLEXIBILITY_V1',
    branchClassificationRule: 'DIRECTION_VECTOR_TOPOLOGY_V1',
    supportOffsetRule: 'RIGID_OFFSET_KINEMATIC_V1',
    outsideApplicabilityRule: 'BLOCK',
    bendMaxAngleDegrees: { value: 5, source: PROFILE_SOURCE },
    bendMinimumElements: { value: 4, source: PROFILE_SOURCE },
    bendMinimumElementsBetweenStations: { value: 2, source: PROFILE_SOURCE },
    bendRadiusRelativeTolerance: { value: 1e-9, source: PROFILE_SOURCE },
    bendConvergenceRefinementFactor: { value: 4, source: PROFILE_SOURCE },
    convergenceRelativeTolerance: { value: 1e-2, source: PROFILE_SOURCE },
    flexibilityDoubleCountTolerance: { value: 1e-9, source: PROFILE_SOURCE },
    runCollinearityTolerance: { value: 1e-9, source: PROFILE_SOURCE },
    rigidBodyStiffnessMultiplier: { value: 1000, source: PROFILE_SOURCE },
    semanticHash: '',
  });
}

function gravityVector(frame, lineWeight) {
  return distributedLoadLocalVector({
    primitive: { kind: 'DISTRIBUTED_LOAD', basis: 'GLOBAL', startIntensity: { fx: 0, fy: -lineWeight, fz: 0 }, endIntensity: { fx: 0, fy: -lineWeight, fz: 0 } },
    axes: frame.localAxes.axes,
    length: frame.geometry.length,
    phiXY: 0,
    phiXZ: 0,
  });
}

function physicalLineWeight(row, section, g) {
  const pipe = density(row.PIPE_DENSITY) * section.sectionState.area * g;
  const fluidArea = Math.PI * section.dimensions.innerDiameter ** 2 / 4;
  const contents = density(row.FLUID_DENSITY) * fluidArea * g;
  const insulationThickness = Number(row.INSUL_THICK) * MM_TO_M;
  const insulatedOd = section.dimensions.outerDiameter + 2 * insulationThickness;
  const insulationArea = Math.PI * (insulatedOd ** 2 - section.dimensions.outerDiameter ** 2) / 4;
  const insulation = density(row.INSUL_DENSITY) * insulationArea * g;
  return pipe + contents + insulation;
}

function closedEndPressureAxialStrain(row, E) {
  const outerDiameter = Number(row.DIAMETER) * MM_TO_M;
  const wallThickness = Number(row.WALL_THICK) * MM_TO_M;
  const innerDiameter = outerDiameter - 2 * wallThickness;
  const pressure = Number(row.PRESSURE1) * KPA_TO_PA;
  const nu = Number(row.POISSONS);
  return (1 - 2 * nu) * pressure * innerDiameter ** 2 / (E * (outerDiameter ** 2 - innerDiameter ** 2));
}

function normalizeResidual(residual, reference, tolerances) {
  const floors = [
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_FORCE_FROM.scaleFloor)),
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_MOMENT_FROM.scaleFloor)),
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_FORCE_TO.scaleFloor)),
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_MOMENT_TO.scaleFloor)),
  ];
  return residual.map((value, index) => value / Math.max(Math.abs(reference[index]), floors[index]));
}

function nextGate(result) {
  const initialResidual = result.diagnosticBalances.initialTotalResidual;
  const initialNorm = Math.hypot(...initialResidual);
  const fullNorm = Math.hypot(...result.residual);
  return initialNorm >= 0.5 * fullNorm
    ? 'DECOMPOSE_PRESSURE_VS_MEC21_INITIAL_FIELD_AND_TEST_FREE_GROWTH_KINEMATICS_WITH_FIXED_PRODUCTION_K'
    : 'HOLD_LOAD_AUTHORITIES_FIXED_AND_DECOMPOSE_KD_BY_TEE_SPRING_BEND_FLEXIBILITY_AND_LOCAL_AXIS_TRANSFORMS';
}

function condenseVector(full, Kbi, lu, nb, ni) {
  const fb = full.slice(0, nb);
  const fi = full.slice(nb);
  const yi = luSolve(lu, fi);
  const correction = matrixVectorRect(Kbi, nb, ni, yi);
  return subtract(fb, correction);
}

function luFactor(matrix, n) {
  const a = [...matrix];
  const piv = Array.from({ length: n }, (_v, i) => i);
  for (let k = 0; k < n; k += 1) {
    let p = k;
    let max = Math.abs(a[k * n + k]);
    for (let i = k + 1; i < n; i += 1) {
      const value = Math.abs(a[i * n + k]);
      if (value > max) { max = value; p = i; }
    }
    if (!(max > 1e-14)) throw new Error(`Singular internal stiffness at pivot ${k}: ${max}`);
    if (p !== k) {
      for (let j = 0; j < n; j += 1) [a[k * n + j], a[p * n + j]] = [a[p * n + j], a[k * n + j]];
      [piv[k], piv[p]] = [piv[p], piv[k]];
    }
    for (let i = k + 1; i < n; i += 1) {
      a[i * n + k] /= a[k * n + k];
      for (let j = k + 1; j < n; j += 1) a[i * n + j] -= a[i * n + k] * a[k * n + j];
    }
  }
  return { a, piv, n };
}

function luSolve(lu, rhs) {
  const { a, piv, n } = lu;
  const x = new Array(n);
  for (let i = 0; i < n; i += 1) x[i] = rhs[piv[i]];
  for (let i = 0; i < n; i += 1) for (let j = 0; j < i; j += 1) x[i] -= a[i * n + j] * x[j];
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = i + 1; j < n; j += 1) x[i] -= a[i * n + j] * x[j];
    x[i] /= a[i * n + i];
  }
  return x;
}

function solveColumns(lu, matrix, rows, columns) {
  const out = new Array(rows * columns).fill(0);
  for (let j = 0; j < columns; j += 1) {
    const rhs = new Array(rows);
    for (let i = 0; i < rows; i += 1) rhs[i] = matrix[i * columns + j];
    const x = luSolve(lu, rhs);
    for (let i = 0; i < rows; i += 1) out[i * columns + j] = x[i];
  }
  return out;
}

function assembleMatrix(global, n, local, map) {
  for (let i = 0; i < 12; i += 1) for (let j = 0; j < 12; j += 1) global[map[i] * n + map[j]] += local[i * 12 + j];
}
function assembleVector(global, local, map) { for (let i = 0; i < 12; i += 1) global[map[i]] += local[i]; }
function subMatrix(a, n, r0, r1, c0, c1) {
  const rows = r1 - r0; const cols = c1 - c0; const out = new Array(rows * cols);
  for (let i = 0; i < rows; i += 1) for (let j = 0; j < cols; j += 1) out[i * cols + j] = a[(r0 + i) * n + c0 + j];
  return out;
}
function multiplyMatrix(a, ar, ac, b, br, bc) {
  assert.equal(ac, br); const out = new Array(ar * bc).fill(0);
  for (let i = 0; i < ar; i += 1) for (let k = 0; k < ac; k += 1) { const aik = a[i * ac + k]; for (let j = 0; j < bc; j += 1) out[i * bc + j] += aik * b[k * bc + j]; }
  return out;
}
function subtractMatrix(a, b) { return a.map((value, index) => value - b[index]); }
function matrixVector(matrix, vector, n) { return new Array(n).fill(0).map((_v, i) => { let sum = 0; for (let j = 0; j < n; j += 1) sum += matrix[i * n + j] * vector[j]; return sum; }); }
function matrixVectorRect(matrix, rows, cols, vector) { return new Array(rows).fill(0).map((_v, i) => { let sum = 0; for (let j = 0; j < cols; j += 1) sum += matrix[i * cols + j] * vector[j]; return sum; }); }
function range6(offset) { return [0, 1, 2, 3, 4, 5].map((v) => offset + v); }
function abcVectorToGlobal(axes, vector) { return add(add(scale(axes.aAxis, vector[0]), scale(axes.bAxis, vector[1])), scale(axes.cAxis, vector[2])); }
function sourceCoordinateIndex(rows) { const out = new Map(); for (const row of rows) { setCoordinate(out, row.FROM_NODE, [row.FROM_NODE_X, row.FROM_NODE_Y, row.FROM_NODE_Z]); setCoordinate(out, row.TO_NODE, [row.TO_NODE_X, row.TO_NODE_Y, row.TO_NODE_Z]); } return out; }
function setCoordinate(index, nodeId, mm) { const point = mm.map((value) => Number(value) * MM_TO_M); const id = String(nodeId); const prior = index.get(id); if (prior && distance(prior, point) > POSITION_TOLERANCE_M) throw new TypeError(`Coordinate mismatch at ${id}`); index.set(id, point); }
function requireCoordinate(index, nodeId) { const value = index.get(String(nodeId)); if (!value) throw new TypeError(`Missing coordinate ${nodeId}`); return value; }
function requireSourceRow(index, id) { const row = index.get(String(id)); if (!row) throw new TypeError(`Missing source element ${id}`); return row; }
function requirePinnedPackage(value) { if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') throw new TypeError('Canonical package required.'); assert.equal(value.source.sha256, EXPECTED_SOURCE_SHA256); assert.equal(value.cases.find((entry) => entry.caseId === 'L19')?.formula, 'W+P1'); }
function parseArgs(argv) { const out = {}; for (let i = 0; i < argv.length; i += 1) { if (argv[i] === '--package') out.package = argv[++i]; else if (argv[i] === '--out') out.out = argv[++i]; } return out; }
function density(value) { return Number(value) * KG_PER_CM3_TO_KG_PER_M3; }
function validStationNode(value) { return Number.isFinite(Number(value)) && Number(value) > 0; }
function uniqueNumbers(values) { return [...new Set(values)]; }
function zero12() { return new Array(12).fill(0); }
function asPoint(value) { return { x: value[0], y: value[1], z: value[2] }; }
function add(left, right) { return left.map((value, index) => value + right[index]); }
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function negate(value) { return value.map((entry) => -entry); }
function scale(value, factor) { return value.map((entry) => entry * factor); }
function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function cross(left, right) { return [left[1] * right[2] - left[2] * right[1], left[2] * right[0] - left[0] * right[2], left[0] * right[1] - left[1] * right[0]]; }
function distance(left, right) { return Math.hypot(...subtract(left, right)); }
function unit(value, field) { const length = Math.hypot(...value); if (!(length > 0)) throw new TypeError(`${field} direction is degenerate.`); return scale(value, 1 / length); }
function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
function argmax(values) { let index = 0; for (let i = 1; i < values.length; i += 1) if (values[i] > values[index]) index = i; return index; }
function actionDofLabel(index) { const end = index < 6 ? 'FROM' : 'TO'; const local = index % 6; return `${end}:${local < 3 ? FORCE_COMPONENTS[local] : MOMENT_COMPONENTS[local - 3]}`; }
