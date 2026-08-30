import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ACTION_SENSES,
  COORDINATE_SYSTEMS,
  END_CONDITIONS,
  REQUEST_TYPES,
  calculateLocalAttachmentFoundation,
  createCanonicalLocalAttachmentFoundationModel,
} from '../src/core/local-stress/index.js';
import {
  AXIAL_PRESSURE_THRUST_BASES,
  ENVELOPE_QUANTITIES,
  QUALIFICATION_PROFILE,
  RADIUS_BASES,
  REQUEST_SCHEMA,
  SECTION_BASIS,
  SOURCE_SCHEMA,
  calculateLocalAttachmentScreening,
  createLocalAttachmentScreeningRequest,
} from '../src/core/local-attachment-screening/index.js';
import { sourceFixture } from './lafea.1-fixtures.mjs';

const oracleUrl = new URL(
  '../agents/qualifications/ADV-LAFEA12-ANALYTICAL-QUALIFICATION/ORACLE_BENCHMARKS.json',
  import.meta.url,
);
const oracle = JSON.parse(await readFile(oracleUrl, 'utf8'));
const benchmarkMap = new Map(oracle.benchmarks.map((row) => [row.benchmarkId, row]));
const requiredBenchmarkIds = [
  'LAFEA1-RLT-01',
  'LAFEA1-LAME-01',
  'LAFEA1-END-01',
  'LAFEA2-SEC-01',
  'LAFEA2-COMB-01',
  'LAFEA2-ENV-01',
  'LAFEA1-LAFEA2-HANDOFF-NEG',
];

assert.equal(oracle.schema, 'lafea12-independent-oracle-benchmarks/v1');
assert.equal(benchmarkMap.size, oracle.benchmarks.length, 'Oracle benchmark IDs must be unique.');
assert.deepEqual([...benchmarkMap.keys()].sort(), [...requiredBenchmarkIds].sort());
assert.match(
  oracle.expectedValueRule,
  /production result values must never populate this file/iu,
  'Oracle ledger must retain its one-way custody rule.',
);

const tolerance = oracle.defaultTolerance;
const rlt = benchmark('LAFEA1-RLT-01');
const rltResult = calculateLocalAttachmentFoundation(buildRltFoundation(rlt.input));
assertAccepted(rltResult, 'LAFEA1-RLT-01');
const rltLoad = requireBy(rltResult.transformedLoadCases, 'identity', 'LC-ORACLE-RLT');
nearVector(rltLoad.sourceForceGlobal, rlt.expected.forceGlobal, 'RLT source force global');
nearVector(rltLoad.sourceMomentGlobal, rlt.expected.momentSourceGlobal, 'RLT source moment global');
nearVector(rltLoad.leverArmGlobal, rlt.expected.leverSourceMinusTarget, 'RLT source-target lever');
nearVector(rltLoad.transformedMomentGlobal, rlt.expected.momentTargetGlobal, 'RLT target moment global');
nearVector(rltLoad.commonOriginMomentResidualGlobal, [0, 0, 0], 'RLT common-origin residual');

const falsifier = rlt.expected.signFalsifier;
const falsifierResult = calculateLocalAttachmentFoundation(buildSignFalsifierFoundation(falsifier));
assertAccepted(falsifierResult, 'LAFEA1-RLT-01 sign falsifier');
const falsifierLoad = requireBy(falsifierResult.transformedLoadCases, 'identity', 'LC-RLT-SIGN');
nearVector(falsifierLoad.transformedMomentGlobal, falsifier.correctTargetMoment, 'RLT sign falsifier');
assert.notDeepEqual(
  falsifierLoad.transformedMomentGlobal,
  falsifier.wrongSignTargetMoment,
  'Sign-sensitive transfer case must reject F×r / wrong lever sign.',
);

const lame = benchmark('LAFEA1-LAME-01');
const end = benchmark('LAFEA1-END-01');
const pressureResult = calculateLocalAttachmentFoundation(buildPressureFoundation(lame.input));
assertAccepted(pressureResult, 'LAFEA1-LAME-01/LAFEA1-END-01');
const closed = requireBy(pressureResult.pressureStressResults, 'pressureDefinitionIdentity', 'P-CLOSED');
const open = requireBy(pressureResult.pressureStressResults, 'pressureDefinitionIdentity', 'P-OPEN');
near(closed.coefficientA, lame.expected.lameA, 'Lamé A');
near(closed.coefficientB, lame.expected.lameB, 'Lamé B');
const closedInner = requirePoint(closed.requestedPoints, lame.input.innerRadius);
const closedOuter = requirePoint(closed.requestedPoints, lame.input.outerRadius);
near(closedInner.radialStress, lame.expected.radialInner, 'Lamé radial inner');
near(closedOuter.radialStress, lame.expected.radialOuter, 'Lamé radial outer');
near(closedInner.hoopStress, lame.expected.hoopInner, 'Lamé hoop inner');
near(closedOuter.hoopStress, lame.expected.hoopOuter, 'Lamé hoop outer');
near(closed.axialPressureStress, end.expected.closedEndAxialPressureStress, 'closed-end axial pressure stress');
near(open.axialPressureStress, end.expected.openEndAxialPressureStress, 'open-end axial pressure stress');

const combinedOracle = benchmark('LAFEA2-COMB-01');
const sectionOracle = benchmark('LAFEA2-SEC-01');
const envelopeOracle = benchmark('LAFEA2-ENV-01');
const screening = calculateLocalAttachmentScreening(buildCombinedScreeningRequest(combinedOracle, envelopeOracle));
assertAccepted(screening, 'LAFEA2-SEC-01/LAFEA2-COMB-01/LAFEA2-ENV-01');
const section = screening.sectionProperties;
near(section.outerRadius, sectionOracle.expected.outerRadius, 'section outer radius');
near(section.innerRadius, sectionOracle.expected.innerRadius, 'section inner radius');
near(section.crossSectionArea, sectionOracle.expected.area, 'section area');
near(section.secondMomentY, sectionOracle.expected.Iy, 'section Iy');
near(section.secondMomentZ, sectionOracle.expected.Iz, 'section Iz');
near(section.polarMoment, sectionOracle.expected.J, 'section J');

const pointMax = requireBy(screening.pointStressStates, 'evaluationLocationId', 'ORACLE-BEND-MAX');
const pointOpposite = requireBy(screening.pointStressStates, 'evaluationLocationId', 'ORACLE-BEND-OPPOSITE');
const pointInteriorA = requireBy(screening.pointStressStates, 'evaluationLocationId', 'ORACLE-INTERIOR-A');
const pointInteriorB = requireBy(screening.pointStressStates, 'evaluationLocationId', 'ORACLE-INTERIOR-B');
compareStressState(pointMax, combinedOracle.expected.atBendingMaximum, 'combined bending maximum');
compareStressState(pointOpposite, combinedOracle.expected.atBendingOpposite, 'combined bending opposite');
near(pointMax.mechanicalStress.sigmaXAxialMembrane, combinedOracle.expected.mechanicalAxialStress, 'mechanical axial membrane');
near(pointMax.mechanicalStress.sigmaXBiaxialBending, combinedOracle.expected.bendingStressAmplitudeOuter, 'bending amplitude at maximum');
near(pointMax.mechanicalStress.tauXThetaTorsion, combinedOracle.expected.torsionalShearOuter, 'outer-wall torsion');
near(pointMax.pressureStress.sigmaXPressure, combinedOracle.expected.pressureAxialOuter, 'closed-end axial pressure');
near(pointMax.pressureStress.sigmaThetaPressure, combinedOracle.expected.pressureHoopOuter, 'outer hoop pressure');
near(pointMax.pressureStress.sigmaRPressure, combinedOracle.expected.pressureRadialOuter, 'outer radial pressure');
assert.equal(pointMax.pressureStress.axialPressureThrustBasis, AXIAL_PRESSURE_THRUST_BASES.EXCLUDES_PRESSURE_THRUST);
assert.equal(pointMax.pressureStress.axialPressureTreatment, 'ADDED_FROM_FOUNDATION_CLOSED_END_STRESS');
near(pointInteriorA.stressTensor.vonMises, envelopeOracle.expected.interiorCriticalVonMises, 'interior critical VM A');
near(pointInteriorB.stressTensor.vonMises, envelopeOracle.expected.interiorCriticalVonMises, 'interior critical VM B');
const vmEnvelope = screening.envelopes.find((row) => row.quantity === 'vonMisesMaximum');
assert.ok(vmEnvelope, 'vonMisesMaximum envelope must be retained.');
assert.equal(vmEnvelope.evaluationLocationId, 'ORACLE-BEND-OPPOSITE');
near(vmEnvelope.value, envelopeOracle.expected.governingVonMises, 'governing VM envelope');

const handoff = benchmark('LAFEA1-LAFEA2-HANDOFF-NEG');
const rawUnknown = buildCombinedScreeningRaw(combinedOracle, envelopeOracle);
rawUnknown.screeningCases[0].axialPressureThrustBasis = AXIAL_PRESSURE_THRUST_BASES.UNKNOWN;
assert.throws(
  () => createLocalAttachmentScreeningRequest(rawUnknown),
  (error) => {
    assert.equal(error?.code, 'AXIAL_PRESSURE_THRUST_BASIS_REQUIRED');
    return true;
  },
  handoff.expected.unknownBasis,
);
const includesRaw = buildCombinedScreeningRaw(combinedOracle, envelopeOracle);
includesRaw.screeningCases[0].axialPressureThrustBasis = AXIAL_PRESSURE_THRUST_BASES.INCLUDES_PRESSURE_THRUST;
const includes = calculateLocalAttachmentScreening(createLocalAttachmentScreeningRequest(includesRaw));
assertAccepted(includes, 'LAFEA1-LAFEA2-HANDOFF-NEG includes');
const includesPoint = requireBy(includes.pointStressStates, 'evaluationLocationId', 'ORACLE-BEND-MAX');
assert.equal(includesPoint.pressureStress.axialPressureTreatment, 'SUPPRESSED_ALREADY_INCLUDED_IN_MECHANICAL_RESULTANT');
near(includesPoint.pressureStress.sigmaXPressure, 0, 'includes-basis duplicate axial pressure suppression');
near(
  pointMax.stressTensor.sigmaX - includesPoint.stressTensor.sigmaX,
  combinedOracle.expected.pressureAxialOuter,
  'EXCLUDES versus INCLUDES changes only the duplicate axial pressure component at the same point',
);
assert.equal(handoff.expected.outputOnlyDetectability, 'NON_IDENTIFIABLE');

console.log('LAFEA.1/.2 independent external-oracle comparator passed all seven #1533 benchmark families.');

function benchmark(id) {
  const row = benchmarkMap.get(id);
  assert.ok(row, `Missing oracle benchmark ${id}.`);
  assert.ok(Array.isArray(row.sourceIds) && row.sourceIds.length > 0, `${id} must retain independent source custody.`);
  return row;
}

function buildRltFoundation(input) {
  const angle = input.rotationAboutGlobalZDeg * Math.PI / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const raw = sourceFixture((model, ref) => {
    model.pipeCoordinateSystem.axialDirection.value = [c, s, 0];
    model.pipeCoordinateSystem.radialHint.value = [0, 0, 1];
    model.pipeCoordinateSystem.circumferentialHint.value = [-s, c, 0];
    setPoint(model, 'SOURCE', input.sourcePointGlobal);
    setPoint(model, 'TARGET', input.targetPointGlobal);
    model.loadCases = [{
      identity: 'LC-ORACLE-RLT',
      sourceCoordinateSystem: COORDINATE_SYSTEMS.PIPE_LOCAL,
      sourceReferencePointIdentity: 'SOURCE',
      targetReferencePointIdentity: 'TARGET',
      actionSense: ACTION_SENSES.SUPPORT_ON_PIPE,
      force: { value: [...input.forceLocal], sourceRef: ref('oracle.rlt.force') },
      moment: { value: [...input.momentLocal], sourceRef: ref('oracle.rlt.moment') },
    }];
    model.resultRequests.requestedAnalyses = [REQUEST_TYPES.LOAD_TRANSFER];
    model.resultRequests.transformedLoadCaseIdentities = ['LC-ORACLE-RLT'];
    model.resultRequests.pressure = [];
  });
  return createCanonicalLocalAttachmentFoundationModel(raw);
}

function buildSignFalsifierFoundation(input) {
  const raw = sourceFixture((model, ref) => {
    setPoint(model, 'SOURCE', input.sourcePoint);
    setPoint(model, 'TARGET', input.targetPoint);
    model.loadCases = [{
      identity: 'LC-RLT-SIGN',
      sourceCoordinateSystem: COORDINATE_SYSTEMS.GLOBAL,
      sourceReferencePointIdentity: 'SOURCE',
      targetReferencePointIdentity: 'TARGET',
      actionSense: ACTION_SENSES.SUPPORT_ON_PIPE,
      force: { value: [...input.force], sourceRef: ref('oracle.rlt.sign.force') },
      moment: { value: [...input.sourceMoment], sourceRef: ref('oracle.rlt.sign.moment') },
    }];
    model.resultRequests.requestedAnalyses = [REQUEST_TYPES.LOAD_TRANSFER];
    model.resultRequests.transformedLoadCaseIdentities = ['LC-RLT-SIGN'];
    model.resultRequests.pressure = [];
  });
  return createCanonicalLocalAttachmentFoundationModel(raw);
}

function buildPressureFoundation(input) {
  const raw = sourceFixture((model, ref) => {
    model.pipeGeometry.outsideDiameter.value = 2 * input.outerRadius;
    setAssessmentThickness(model, input.outerRadius - input.innerRadius);
    for (const identity of ['P-CLOSED', 'P-OPEN']) {
      const row = requireBy(model.pressureDefinitions, 'identity', identity);
      row.internalPressure.value = input.internalPressure;
      row.externalPressure.value = input.externalPressure;
    }
    model.resultRequests.requestedAnalyses = [REQUEST_TYPES.PRESSURE_STRESS];
    model.resultRequests.transformedLoadCaseIdentities = [];
    model.resultRequests.pressure = ['P-CLOSED', 'P-OPEN'].map((identity) => ({
      identity: `PR-${identity}`,
      pressureDefinitionIdentity: identity,
      requestedRadii: [input.innerRadius, input.outerRadius].map((value, index) => ({
        value,
        sourceRef: ref(`oracle.pressure.${identity}.radius.${index}`),
      })),
      includeAxialPressureStress: true,
      includeThinWallComparison: false,
    }));
  });
  return createCanonicalLocalAttachmentFoundationModel(raw);
}

function buildCombinedScreeningRequest(combined, envelope) {
  return createLocalAttachmentScreeningRequest(buildCombinedScreeningRaw(combined, envelope));
}

function buildCombinedScreeningRaw(combined, envelope) {
  const foundationModel = buildCombinedFoundation(combined.input);
  const foundationResult = calculateLocalAttachmentFoundation(foundationModel);
  assertAccepted(foundationResult, 'combined screening foundation');
  const anglesDeg = [
    ['ORACLE-BEND-MAX', combined.expected.bendingMaximumAngleDeg],
    ['ORACLE-BEND-OPPOSITE', combined.expected.bendingOppositeAngleDeg],
    ['ORACLE-INTERIOR-A', envelope.expected.interiorCriticalAnglesDeg[0]],
    ['ORACLE-INTERIOR-B', envelope.expected.interiorCriticalAnglesDeg[1]],
  ];
  return {
    schema: REQUEST_SCHEMA,
    requestIdentity: 'ORACLE-LAFEA2-COMB',
    requestVersion: '1',
    sourceEvidence: {
      schema: SOURCE_SCHEMA,
      foundationModel: JSON.parse(JSON.stringify(foundationModel)),
      foundationResult: JSON.parse(JSON.stringify(foundationResult)),
    },
    sectionBasis: { basis: SECTION_BASIS },
    screeningCases: [{
      screeningCaseId: 'ORACLE-COMB',
      mechanicalTerms: [{ loadCaseId: 'LC-ORACLE-COMB', factor: 1 }],
      pressureDefinitionId: 'P-CLOSED',
      pressureFactor: 1,
      axialPressureThrustBasis: AXIAL_PRESSURE_THRUST_BASES.EXCLUDES_PRESSURE_THRUST,
      sourceReference: 'ORACLE#LAFEA2-COMB-01',
    }],
    evaluationLocations: anglesDeg.map(([evaluationLocationId, angleDeg]) => ({
      evaluationLocationId,
      radiusBasis: RADIUS_BASES.OUTER_SURFACE,
      explicitRadius: null,
      angle: angleDeg * Math.PI / 180,
      sourceReference: `ORACLE#${evaluationLocationId}`,
    })),
    resultRequests: { envelopeQuantities: [...ENVELOPE_QUANTITIES] },
    qualificationProfile: JSON.parse(JSON.stringify(QUALIFICATION_PROFILE)),
    limitations: [],
  };
}

function buildCombinedFoundation(input) {
  const raw = sourceFixture((model, ref) => {
    model.pipeGeometry.outsideDiameter.value = input.outsideDiameter;
    setAssessmentThickness(model, input.thickness);
    setPoint(model, 'SOURCE', [0, 0, 0]);
    setPoint(model, 'TARGET', [0, 0, 0]);
    model.loadCases = [{
      identity: 'LC-ORACLE-COMB',
      sourceCoordinateSystem: COORDINATE_SYSTEMS.PIPE_LOCAL,
      sourceReferencePointIdentity: 'SOURCE',
      targetReferencePointIdentity: 'TARGET',
      actionSense: ACTION_SENSES.SUPPORT_ON_PIPE,
      force: { value: [input.Fx, 0, 0], sourceRef: ref('oracle.combined.force') },
      moment: { value: [input.Mx, input.My, input.Mz], sourceRef: ref('oracle.combined.moment') },
    }];
    const pressure = requireBy(model.pressureDefinitions, 'identity', 'P-CLOSED');
    pressure.internalPressure.value = input.internalPressure;
    pressure.externalPressure.value = input.externalPressure;
    pressure.endCondition = END_CONDITIONS.CLOSED_END;
    model.resultRequests.requestedAnalyses = [REQUEST_TYPES.LOAD_TRANSFER, REQUEST_TYPES.PRESSURE_STRESS];
    model.resultRequests.transformedLoadCaseIdentities = ['LC-ORACLE-COMB'];
    model.resultRequests.pressure = [{
      identity: 'PR-P-CLOSED',
      pressureDefinitionIdentity: 'P-CLOSED',
      requestedRadii: [{
        value: input.outsideDiameter / 2,
        sourceRef: ref('oracle.combined.pressure.outerRadius'),
      }],
      includeAxialPressureStress: true,
      includeThinWallComparison: false,
    }];
  });
  return createCanonicalLocalAttachmentFoundationModel(raw);
}

function setPoint(model, identity, value) {
  const row = requireBy(model.loadReferencePoints, 'identity', identity);
  row.coordinateSystem = COORDINATE_SYSTEMS.GLOBAL;
  row.point.value = [...value];
}

function setAssessmentThickness(model, thickness) {
  model.thicknessBasis.nominalPipeThickness.value = thickness;
  model.thicknessBasis.corrosionAllowance.value = 0;
  model.thicknessBasis.assessmentPipeThickness.value = thickness;
}

function compareStressState(point, expected, label) {
  near(point.stressTensor.sigmaX, expected.sigmaX, `${label} sigmaX`);
  near(point.stressTensor.sigmaTheta, expected.sigmaTheta, `${label} sigmaTheta`);
  near(point.stressTensor.sigmaR, expected.sigmaR, `${label} sigmaR`);
  near(point.stressTensor.tauXTheta, expected.tauXTheta, `${label} tauXTheta`);
  near(point.stressTensor.vonMises, expected.vonMises, `${label} vonMises`);
}

function assertAccepted(result, label) {
  assert.equal(result?.qualification?.state, 'ACCEPTED', `${label} must be accepted by the live calculator.`);
}

function requireBy(rows, key, value) {
  const row = rows?.find((candidate) => candidate?.[key] === value);
  assert.ok(row, `Missing ${key}=${value}.`);
  return row;
}

function requirePoint(rows, radius) {
  const row = rows?.find((candidate) => candidate?.radius === radius);
  assert.ok(row, `Missing pressure point at radius ${radius}.`);
  return row;
}

function near(actual, expected, label) {
  assert.equal(typeof actual, 'number', `${label}: live value must be numeric.`);
  assert.equal(typeof expected, 'number', `${label}: oracle value must be numeric.`);
  assert.ok(Number.isFinite(actual), `${label}: live value must be finite.`);
  assert.ok(Number.isFinite(expected), `${label}: oracle value must be finite.`);
  const allowed = tolerance.absolute + tolerance.relative * Math.max(Math.abs(actual), Math.abs(expected));
  const delta = Math.abs(actual - expected);
  assert.ok(delta <= allowed, `${label}: actual ${actual}, oracle ${expected}, delta ${delta}, allowed ${allowed}.`);
}

function nearVector(actual, expected, label) {
  assert.equal(actual?.length, expected.length, `${label}: vector length mismatch.`);
  actual.forEach((value, index) => near(value, expected[index], `${label}[${index}]`));
}
