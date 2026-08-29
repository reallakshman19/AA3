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
  QUALIFICATION_PROFILE,
  RADIUS_BASES,
  REQUEST_SCHEMA,
  SECTION_BASIS,
  SOURCE_SCHEMA,
  calculateLocalAttachmentScreening,
  createLocalAttachmentScreeningRequest,
} from '../src/core/local-attachment-screening/index.js';
import { sourceFixture } from './lafea.1-fixtures.mjs';

const oracle = JSON.parse(await readFile(new URL(
  '../agents/qualifications/ADV-LAFEA12-ANALYTICAL-QUALIFICATION/ORACLE_BENCHMARKS.json',
  import.meta.url,
), 'utf8'));
const benchmarks = new Map(oracle.benchmarks.map((row) => [row.benchmarkId, row]));
const tolerance = oracle.defaultTolerance;

const rlt = benchmark('LAFEA1-RLT-01');
checkRltCovariance(rlt);

const lame = benchmark('LAFEA1-LAME-01');
const end = benchmark('LAFEA1-END-01');
checkPressureVariants(lame, end);

const sectionOracle = benchmark('LAFEA2-SEC-01');
const combinedOracle = benchmark('LAFEA2-COMB-01');
const envelopeOracle = benchmark('LAFEA2-ENV-01');
checkSectionAndIndependentSubcases(sectionOracle, combinedOracle);
checkCombinedRadialAndPrincipal(combinedOracle, envelopeOracle);
checkEnvelopeMetamorphics(combinedOracle, envelopeOracle);

console.log('LAFEA.1/.2 expanded independent-oracle variants passed.');

function checkRltCovariance(row) {
  const translated = row.expected.covarianceVariants.translated;
  const translatedResult = calculateLocalAttachmentFoundation(buildRltFoundation({
    ...row.input,
    sourcePointGlobal: translated.sourcePointGlobal,
    targetPointGlobal: translated.targetPointGlobal,
  }, 1, 'LC-RLT-TRANSLATED'));
  assertAccepted(translatedResult, 'RLT translated');
  const translatedLoad = requireBy(translatedResult.transformedLoadCases, 'identity', 'LC-RLT-TRANSLATED');
  nearVector(translatedLoad.sourceForceGlobal, translated.expectedForceGlobal, 'RLT translated force');
  nearVector(translatedLoad.transformedMomentGlobal, translated.expectedMomentTargetGlobal, 'RLT translated moment');
  nearVector(translatedLoad.commonOriginMomentResidualGlobal, [0, 0, 0], 'RLT translated common-origin residual');

  const rotated = row.expected.covarianceVariants.rotated;
  const rotatedResult = calculateLocalAttachmentFoundation(buildRltFoundation({
    ...row.input,
    rotationAboutGlobalZDeg: rotated.rotationAboutGlobalZDeg,
    sourcePointGlobal: rotated.sourcePointGlobal,
    targetPointGlobal: rotated.targetPointGlobal,
  }, 1, 'LC-RLT-ROTATED'));
  assertAccepted(rotatedResult, 'RLT rotated');
  const rotatedLoad = requireBy(rotatedResult.transformedLoadCases, 'identity', 'LC-RLT-ROTATED');
  nearVector(rotatedLoad.sourceForceGlobal, rotated.expectedForceGlobal, 'RLT rotated force');
  nearVector(rotatedLoad.sourceMomentGlobal, rotated.expectedMomentSourceGlobal, 'RLT rotated source moment');
  nearVector(rotatedLoad.leverArmGlobal, rotated.expectedLeverSourceMinusTarget, 'RLT rotated lever');
  nearVector(rotatedLoad.transformedMomentGlobal, rotated.expectedMomentTargetGlobal, 'RLT rotated target moment');

  const scaled = row.expected.covarianceVariants.loadScaled;
  const scaledResult = calculateLocalAttachmentFoundation(buildRltFoundation(row.input, scaled.factor, 'LC-RLT-SCALED'));
  assertAccepted(scaledResult, 'RLT load-scaled');
  const scaledLoad = requireBy(scaledResult.transformedLoadCases, 'identity', 'LC-RLT-SCALED');
  nearVector(scaledLoad.sourceForceGlobal, scaled.expectedForceGlobal, 'RLT scaled force');
  nearVector(scaledLoad.sourceMomentGlobal, scaled.expectedMomentSourceGlobal, 'RLT scaled source moment');
  nearVector(scaledLoad.leverArmGlobal, scaled.expectedLeverSourceMinusTarget, 'RLT scaled lever');
  nearVector(scaledLoad.transformedMomentGlobal, scaled.expectedMomentTargetGlobal, 'RLT scaled target moment');
}

function checkPressureVariants(lameRow, endRow) {
  const result = calculateLocalAttachmentFoundation(buildPressureFoundation(lameRow.input, endRow.input));
  assertAccepted(result, 'Lamé/end variants');
  const closed = requireBy(result.pressureStressResults, 'pressureDefinitionIdentity', 'P-CLOSED');
  const open = requireBy(result.pressureStressResults, 'pressureDefinitionIdentity', 'P-OPEN');
  const explicit = requireBy(result.pressureStressResults, 'pressureDefinitionIdentity', 'P-EXPLICIT');
  const mid = requirePressurePoint(closed.requestedPoints, lameRow.input.midRadius);
  near(mid.radialStress, lameRow.expected.radialMid, 'Lamé radial mid-wall');
  near(mid.hoopStress, lameRow.expected.hoopMid, 'Lamé hoop mid-wall');
  near(closed.axialPressureStress, endRow.expected.closedEndAxialPressureStress, 'closed-end axial stress');
  near(open.axialPressureStress, endRow.expected.openEndAxialPressureStress, 'open-end axial stress');
  assert.equal(explicit.axialPressureStress, endRow.expected.explicitEndAxialPressureStress);
  near(explicit.explicitAxialResultant, endRow.expected.explicitAxialResultant, 'explicit axial resultant');
}

function checkSectionAndIndependentSubcases(sectionRow, combinedRow) {
  const result = calculateLocalAttachmentScreening(buildPureSubcaseRequest(combinedRow));
  assertAccepted(result, 'LAFEA2 independent subcases');
  const section = result.sectionProperties;
  near(section.crossSectionArea, sectionRow.expected.area, 'section area');
  near(section.secondMomentY / section.outerRadius, sectionRow.expected.elasticSectionModulusYOuter, 'section modulus Y outer');
  near(section.secondMomentZ / section.outerRadius, sectionRow.expected.elasticSectionModulusZOuter, 'section modulus Z outer');

  const sub = combinedRow.expected.independentSubcases;
  const axial = state(result, 'PURE-AXIAL', 'OUTER-0');
  near(axial.stressTensor.sigmaX, sub.pureAxial.sigmaX, 'pure axial sigmaX');
  near(axial.stressTensor.vonMises, sub.pureAxial.vonMises, 'pure axial von Mises');

  near(state(result, 'PURE-MY', 'OUTER-0').stressTensor.sigmaX,
    sub.pureBendingY.outerTheta0SigmaX, 'pure My theta0');
  near(state(result, 'PURE-MY', 'OUTER-180').stressTensor.sigmaX,
    sub.pureBendingY.outerTheta180SigmaX, 'pure My theta180');
  near(state(result, 'PURE-MZ', 'OUTER-90').stressTensor.sigmaX,
    sub.pureBendingZ.outerTheta90SigmaX, 'pure Mz theta90');
  near(state(result, 'PURE-MZ', 'OUTER-270').stressTensor.sigmaX,
    sub.pureBendingZ.outerTheta270SigmaX, 'pure Mz theta270');

  compareTorsion(state(result, 'PURE-TORSION', 'OUTER-0'), sub.pureTorsion.outerTau,
    sub.pureTorsion.outerVonMises, 'pure torsion outer');
  compareTorsion(state(result, 'PURE-TORSION', 'MID-0'), sub.pureTorsion.midTau,
    sub.pureTorsion.midVonMises, 'pure torsion mid');
  compareTorsion(state(result, 'PURE-TORSION', 'INNER-0'), sub.pureTorsion.innerTau,
    sub.pureTorsion.innerVonMises, 'pure torsion inner');
}

function checkCombinedRadialAndPrincipal(combinedRow, envelopeRow) {
  const result = calculateLocalAttachmentScreening(buildCombinedRequest(combinedRow, envelopeRow));
  assertAccepted(result, 'combined radial/principal');
  compareFullState(state(result, 'COMBINED', 'OUTER-MAX'), combinedRow.expected.atBendingMaximum,
    'combined outer bending maximum');
  compareFullState(state(result, 'COMBINED', 'OUTER-OPPOSITE'), combinedRow.expected.atBendingOpposite,
    'combined outer bending opposite');
  compareFullState(state(result, 'COMBINED', 'MID-MAX'), combinedRow.expected.radialLocationsAtBendingMaximum.mid,
    'combined mid-wall bending maximum');
  compareFullState(state(result, 'COMBINED', 'INNER-MAX'), combinedRow.expected.radialLocationsAtBendingMaximum.inner,
    'combined inner-wall bending maximum');
}

function checkEnvelopeMetamorphics(combinedRow, envelopeRow) {
  const base = calculateLocalAttachmentScreening(buildEnvelopeVariantRequest(combinedRow, envelopeRow, 'BASE'));
  const scaled = calculateLocalAttachmentScreening(buildEnvelopeVariantRequest(combinedRow, envelopeRow, 'SCALED'));
  const reversed = calculateLocalAttachmentScreening(buildEnvelopeVariantRequest(combinedRow, envelopeRow, 'REVERSED'));
  const superposed = calculateLocalAttachmentScreening(buildEnvelopeVariantRequest(combinedRow, envelopeRow, 'SUPERPOSED'));
  [base, scaled, reversed, superposed].forEach((result, index) => assertAccepted(result, `envelope variant ${index}`));

  const scaleExpected = envelopeRow.expected.loadScaling;
  const reverseExpected = envelopeRow.expected.completeReversal;
  const superExpected = envelopeRow.expected.superposition;
  compareVmEnvelope(scaled, scaleExpected.governingVonMises, 'OPPOSITE', 'scaled envelope');
  compareVmEnvelope(reversed, reverseExpected.governingVonMises, 'OPPOSITE', 'reversed envelope');
  compareVmEnvelope(superposed, superExpected.governingVonMises, 'OPPOSITE', 'superposed envelope');

  for (const locationId of ['MAX', 'OPPOSITE', 'INTERIOR-A', 'INTERIOR-B']) {
    const baseState = state(base, 'BASE', locationId);
    const scaledState = state(scaled, 'SCALED', locationId);
    const reversedState = state(reversed, 'REVERSED', locationId);
    const superState = state(superposed, 'SUPERPOSED', locationId);
    for (const key of ['sigmaX', 'sigmaTheta', 'sigmaR', 'tauXTheta']) {
      near(scaledState.stressTensor[key], 2 * baseState.stressTensor[key], `scaled tensor ${locationId} ${key}`);
      near(reversedState.stressTensor[key], -baseState.stressTensor[key], `reversed tensor ${locationId} ${key}`);
      near(superState.stressTensor[key], baseState.stressTensor[key], `superposed tensor ${locationId} ${key}`);
    }
    near(scaledState.stressTensor.vonMises, 2 * baseState.stressTensor.vonMises, `scaled VM ${locationId}`);
    near(reversedState.stressTensor.vonMises, baseState.stressTensor.vonMises, `reversed VM ${locationId}`);
    near(superState.stressTensor.vonMises, baseState.stressTensor.vonMises, `superposed VM ${locationId}`);
  }
}

function buildRltFoundation(input, factor, identity) {
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
      identity,
      sourceCoordinateSystem: COORDINATE_SYSTEMS.PIPE_LOCAL,
      sourceReferencePointIdentity: 'SOURCE',
      targetReferencePointIdentity: 'TARGET',
      actionSense: ACTION_SENSES.SUPPORT_ON_PIPE,
      force: { value: input.forceLocal.map((value) => value * factor), sourceRef: ref(`${identity}.force`) },
      moment: { value: input.momentLocal.map((value) => value * factor), sourceRef: ref(`${identity}.moment`) },
    }];
    model.resultRequests.requestedAnalyses = [REQUEST_TYPES.LOAD_TRANSFER];
    model.resultRequests.transformedLoadCaseIdentities = [identity];
    model.resultRequests.pressure = [];
  });
  return createCanonicalLocalAttachmentFoundationModel(raw);
}

function buildPressureFoundation(lameInput, endInput) {
  const raw = sourceFixture((model, ref) => {
    model.pipeGeometry.outsideDiameter.value = 2 * lameInput.outerRadius;
    setAssessmentThickness(model, lameInput.outerRadius - lameInput.innerRadius);
    for (const identity of ['P-CLOSED', 'P-OPEN', 'P-EXPLICIT']) {
      const pressure = requireBy(model.pressureDefinitions, 'identity', identity);
      pressure.internalPressure.value = lameInput.internalPressure;
      pressure.externalPressure.value = lameInput.externalPressure;
    }
    requireBy(model.pressureDefinitions, 'identity', 'P-EXPLICIT').explicitAxialResultant.value = endInput.explicitAxialResultant;
    model.resultRequests.requestedAnalyses = [REQUEST_TYPES.PRESSURE_STRESS];
    model.resultRequests.transformedLoadCaseIdentities = [];
    model.resultRequests.pressure = ['P-CLOSED', 'P-OPEN', 'P-EXPLICIT'].map((identity) => ({
      identity: `PR-${identity}`,
      pressureDefinitionIdentity: identity,
      requestedRadii: [lameInput.innerRadius, lameInput.midRadius, lameInput.outerRadius].map((value, index) => ({
        value,
        sourceRef: ref(`${identity}.radius.${index}`),
      })),
      includeAxialPressureStress: true,
      includeThinWallComparison: false,
    }));
  });
  return createCanonicalLocalAttachmentFoundationModel(raw);
}

function buildPureSubcaseRequest(combinedRow) {
  const input = combinedRow.input;
  const foundation = buildMechanicalFoundation(input, [
    load('LC-PURE-AXIAL', [combinedRow.expected.independentSubcases.pureAxial.Fx, 0, 0], [0, 0, 0]),
    load('LC-PURE-MY', [0, 0, 0], [0, combinedRow.expected.independentSubcases.pureBendingY.My, 0]),
    load('LC-PURE-MZ', [0, 0, 0], [0, 0, combinedRow.expected.independentSubcases.pureBendingZ.Mz]),
    load('LC-PURE-TORSION', [0, 0, 0], [combinedRow.expected.independentSubcases.pureTorsion.Mx, 0, 0]),
  ], 'P-OPEN');
  const foundationResult = calculateLocalAttachmentFoundation(foundation);
  assertAccepted(foundationResult, 'pure-subcase foundation');
  return createLocalAttachmentScreeningRequest(screeningRaw(foundation, foundationResult, [
    screeningCase('PURE-AXIAL', 'LC-PURE-AXIAL', 1, 'P-OPEN', 0),
    screeningCase('PURE-MY', 'LC-PURE-MY', 1, 'P-OPEN', 0),
    screeningCase('PURE-MZ', 'LC-PURE-MZ', 1, 'P-OPEN', 0),
    screeningCase('PURE-TORSION', 'LC-PURE-TORSION', 1, 'P-OPEN', 0),
  ], standardRadialLocations(), ['vonMisesMaximum']));
}

function buildCombinedRequest(combinedRow, envelopeRow) {
  const input = combinedRow.input;
  const foundation = buildMechanicalFoundation(input, [load('LC-COMB', [input.Fx, 0, 0], [input.Mx, input.My, input.Mz])], 'P-CLOSED');
  const foundationResult = calculateLocalAttachmentFoundation(foundation);
  assertAccepted(foundationResult, 'combined radial foundation');
  const locations = [
    location('OUTER-MAX', RADIUS_BASES.OUTER_SURFACE, combinedRow.expected.bendingMaximumAngleDeg),
    location('OUTER-OPPOSITE', RADIUS_BASES.OUTER_SURFACE, combinedRow.expected.bendingOppositeAngleDeg),
    location('OUTER-INTERIOR-A', RADIUS_BASES.OUTER_SURFACE, envelopeRow.expected.interiorCriticalAnglesDeg[0]),
    location('OUTER-INTERIOR-B', RADIUS_BASES.OUTER_SURFACE, envelopeRow.expected.interiorCriticalAnglesDeg[1]),
    location('MID-MAX', RADIUS_BASES.MID_SURFACE, combinedRow.expected.bendingMaximumAngleDeg),
    location('INNER-MAX', RADIUS_BASES.INNER_SURFACE, combinedRow.expected.bendingMaximumAngleDeg),
  ];
  return createLocalAttachmentScreeningRequest(screeningRaw(foundation, foundationResult, [
    screeningCase('COMBINED', 'LC-COMB', 1, 'P-CLOSED', 1),
  ], locations, ['vonMisesMaximum']));
}

function buildEnvelopeVariantRequest(combinedRow, envelopeRow, variant) {
  const input = combinedRow.input;
  const loads = variant === 'SUPERPOSED'
    ? [load('LC-A', [input.Fx, 0, 0], [input.Mx, input.My, input.Mz]), load('LC-B', [input.Fx, 0, 0], [input.Mx, input.My, input.Mz])]
    : [load('LC-A', [input.Fx, 0, 0], [input.Mx, input.My, input.Mz])];
  const foundation = buildMechanicalFoundation(input, loads, 'P-CLOSED');
  const foundationResult = calculateLocalAttachmentFoundation(foundation);
  assertAccepted(foundationResult, `${variant} foundation`);
  const factors = {
    BASE: { terms: [{ loadCaseId: 'LC-A', factor: 1 }], pressure: 1 },
    SCALED: { terms: [{ loadCaseId: 'LC-A', factor: 2 }], pressure: 2 },
    REVERSED: { terms: [{ loadCaseId: 'LC-A', factor: -1 }], pressure: -1 },
    SUPERPOSED: { terms: [{ loadCaseId: 'LC-A', factor: 0.4 }, { loadCaseId: 'LC-B', factor: 0.6 }], pressure: 1 },
  }[variant];
  const locations = [
    location('MAX', RADIUS_BASES.OUTER_SURFACE, combinedRow.expected.bendingMaximumAngleDeg),
    location('OPPOSITE', RADIUS_BASES.OUTER_SURFACE, combinedRow.expected.bendingOppositeAngleDeg),
    location('INTERIOR-A', RADIUS_BASES.OUTER_SURFACE, envelopeRow.expected.interiorCriticalAnglesDeg[0]),
    location('INTERIOR-B', RADIUS_BASES.OUTER_SURFACE, envelopeRow.expected.interiorCriticalAnglesDeg[1]),
  ];
  const caseRow = {
    screeningCaseId: variant,
    mechanicalTerms: factors.terms,
    pressureDefinitionId: 'P-CLOSED',
    pressureFactor: factors.pressure,
    axialPressureThrustBasis: AXIAL_PRESSURE_THRUST_BASES.EXCLUDES_PRESSURE_THRUST,
    sourceReference: `ORACLE#ENV-${variant}`,
  };
  return createLocalAttachmentScreeningRequest(screeningRaw(foundation, foundationResult, [caseRow], locations, ['vonMisesMaximum']));
}

function buildMechanicalFoundation(input, loadRows, pressureIdentity) {
  const raw = sourceFixture((model, ref) => {
    model.pipeGeometry.outsideDiameter.value = input.outsideDiameter;
    setAssessmentThickness(model, input.thickness);
    setPoint(model, 'SOURCE', [0, 0, 0]);
    setPoint(model, 'TARGET', [0, 0, 0]);
    model.loadCases = loadRows.map((row) => ({
      identity: row.identity,
      sourceCoordinateSystem: COORDINATE_SYSTEMS.PIPE_LOCAL,
      sourceReferencePointIdentity: 'SOURCE',
      targetReferencePointIdentity: 'TARGET',
      actionSense: ACTION_SENSES.SUPPORT_ON_PIPE,
      force: { value: row.force, sourceRef: ref(`${row.identity}.force`) },
      moment: { value: row.moment, sourceRef: ref(`${row.identity}.moment`) },
    }));
    const pressure = requireBy(model.pressureDefinitions, 'identity', pressureIdentity);
    pressure.internalPressure.value = input.internalPressure;
    pressure.externalPressure.value = input.externalPressure;
    pressure.endCondition = pressureIdentity === 'P-CLOSED' ? END_CONDITIONS.CLOSED_END : END_CONDITIONS.OPEN_END;
    model.resultRequests.requestedAnalyses = [REQUEST_TYPES.LOAD_TRANSFER, REQUEST_TYPES.PRESSURE_STRESS];
    model.resultRequests.transformedLoadCaseIdentities = loadRows.map((row) => row.identity);
    const ri = input.outsideDiameter / 2 - input.thickness;
    const ro = input.outsideDiameter / 2;
    model.resultRequests.pressure = [{
      identity: `PR-${pressureIdentity}`,
      pressureDefinitionIdentity: pressureIdentity,
      requestedRadii: [ri, (ri + ro) / 2, ro].map((value, index) => ({ value, sourceRef: ref(`${pressureIdentity}.radius.${index}`) })),
      includeAxialPressureStress: true,
      includeThinWallComparison: false,
    }];
  });
  return createCanonicalLocalAttachmentFoundationModel(raw);
}

function screeningRaw(foundationModel, foundationResult, screeningCases, evaluationLocations, envelopeQuantities) {
  return {
    schema: REQUEST_SCHEMA,
    requestIdentity: 'ORACLE-EXTENDED',
    requestVersion: '1',
    sourceEvidence: {
      schema: SOURCE_SCHEMA,
      foundationModel: JSON.parse(JSON.stringify(foundationModel)),
      foundationResult: JSON.parse(JSON.stringify(foundationResult)),
    },
    sectionBasis: { basis: SECTION_BASIS },
    screeningCases,
    evaluationLocations,
    resultRequests: { envelopeQuantities },
    qualificationProfile: JSON.parse(JSON.stringify(QUALIFICATION_PROFILE)),
    limitations: [],
  };
}

function screeningCase(screeningCaseId, loadCaseId, factor, pressureDefinitionId, pressureFactor) {
  return {
    screeningCaseId,
    mechanicalTerms: [{ loadCaseId, factor }],
    pressureDefinitionId,
    pressureFactor,
    axialPressureThrustBasis: AXIAL_PRESSURE_THRUST_BASES.EXCLUDES_PRESSURE_THRUST,
    sourceReference: `ORACLE#${screeningCaseId}`,
  };
}

function standardRadialLocations() {
  return [
    location('OUTER-0', RADIUS_BASES.OUTER_SURFACE, 0),
    location('OUTER-90', RADIUS_BASES.OUTER_SURFACE, 90),
    location('OUTER-180', RADIUS_BASES.OUTER_SURFACE, 180),
    location('OUTER-270', RADIUS_BASES.OUTER_SURFACE, 270),
    location('MID-0', RADIUS_BASES.MID_SURFACE, 0),
    location('INNER-0', RADIUS_BASES.INNER_SURFACE, 0),
  ];
}

function location(evaluationLocationId, radiusBasis, angleDeg) {
  return {
    evaluationLocationId,
    radiusBasis,
    explicitRadius: null,
    angle: angleDeg * Math.PI / 180,
    sourceReference: `ORACLE#${evaluationLocationId}`,
  };
}

function load(identity, force, moment) { return { identity, force, moment }; }

function compareTorsion(point, tau, vm, label) {
  near(point.stressTensor.tauXTheta, tau, `${label} tau`);
  near(point.stressTensor.vonMises, vm, `${label} von Mises`);
}

function compareFullState(point, expected, label) {
  for (const key of ['sigmaX', 'sigmaTheta', 'sigmaR', 'tauXTheta', 'principalMaximum', 'principalIntermediate', 'principalMinimum', 'vonMises']) {
    near(point.stressTensor[key], expected[key], `${label} ${key}`);
  }
}

function compareVmEnvelope(result, expectedValue, expectedLocationId, label) {
  const envelope = result.envelopes.find((row) => row.quantity === 'vonMisesMaximum');
  assert.ok(envelope, `${label}: missing vonMisesMaximum envelope.`);
  assert.equal(envelope.evaluationLocationId, expectedLocationId, `${label}: governing location.`);
  near(envelope.value, expectedValue, `${label}: value`);
}

function state(result, caseId, locationId) {
  const row = result.pointStressStates.find((candidate) => candidate.screeningCaseId === caseId && candidate.evaluationLocationId === locationId);
  assert.ok(row, `Missing stress state ${caseId}/${locationId}.`);
  return row;
}

function benchmark(id) {
  const row = benchmarks.get(id);
  assert.ok(row, `Missing oracle benchmark ${id}.`);
  assert.ok(Array.isArray(row.sourceIds) && row.sourceIds.length > 0, `${id} requires independent source custody.`);
  return row;
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

function requireBy(rows, key, value) {
  const row = rows?.find((candidate) => candidate?.[key] === value);
  assert.ok(row, `Missing ${key}=${value}.`);
  return row;
}

function requirePressurePoint(rows, radius) {
  const row = rows?.find((candidate) => candidate.radius === radius);
  assert.ok(row, `Missing pressure point radius ${radius}.`);
  return row;
}

function assertAccepted(result, label) {
  assert.equal(result?.qualification?.state, 'ACCEPTED', `${label} must be accepted.`);
}

function near(actual, expected, label) {
  assert.equal(typeof actual, 'number', `${label}: live value must be numeric.`);
  assert.equal(typeof expected, 'number', `${label}: oracle value must be numeric.`);
  assert.ok(Number.isFinite(actual) && Number.isFinite(expected), `${label}: values must be finite.`);
  const allowed = tolerance.absolute + tolerance.relative * Math.max(Math.abs(actual), Math.abs(expected));
  const delta = Math.abs(actual - expected);
  assert.ok(delta <= allowed, `${label}: actual ${actual}, expected ${expected}, delta ${delta}, allowed ${allowed}.`);
}

function nearVector(actual, expected, label) {
  assert.equal(actual?.length, expected.length, `${label}: vector length.`);
  actual.forEach((value, index) => near(value, expected[index], `${label}[${index}]`));
}
