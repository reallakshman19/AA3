#!/usr/bin/env node
import assert from 'node:assert/strict';
import { calculateLocalAttachmentFoundation } from '../src/core/local-stress/index.js';
import {
  EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_ID,
  EMP1_WRC537_CYLINDRICAL_AXIS_QUALIFIED,
  EMP1_WRC537_CYLINDRICAL_AXIS_SOURCE_SHA256,
  EMP1_WRC537_CYLINDRICAL_AXIS_UNRESOLVED,
  deriveEmp1Wrc537CylindricalAxisAuthority,
  requireEmp1Wrc537QualifiedCylindricalAxisAuthority,
} from '../src/core/emp1/emp1-wrc537-cylindrical-axis-authority.js';
import {
  buildEmp1Wrc537CylindricalFrame,
  emp1GlobalLoadsToWrc537,
  emp1Wrc537LoadsToGlobal,
} from '../src/core/emp1/emp1-wrc537-cylindrical-frame.js';
import { canonicalFixture } from './lafea.1-fixtures.mjs';

// Independent physical oracle for the standard fixture.
// Vessel +X; remote load reference at +Z; attachment target at origin.
// Therefore WRC +P is source->target = -Z, not the generic foundation +eZ hint.
const EXPECTED_BASIS = Object.freeze({
  P: Object.freeze([0, 0, -1]),
  Vc: Object.freeze([0, 1, 0]),
  Vl: Object.freeze([1, 0, 0]),
  Mc: Object.freeze([-1, 0, 0]),
  Ml: Object.freeze([0, 1, 0]),
  Mt: Object.freeze([0, 0, 1]),
});
const COMPONENTS = Object.freeze(['P', 'Vc', 'Vl', 'Mc', 'Ml', 'Mt']);

const standardModel = axisFixture();
const standardResult = calculateLocalAttachmentFoundation(standardModel);
assert.equal(standardResult.qualification.state, 'ACCEPTED');
assert.deepEqual(standardResult.coordinateSystemEvidence.axesGlobal.eZ, [0, 0, 1],
  'fixture deliberately retains +eZ so WRC +P polarity cannot be copied from raw eZ');
const authority = deriveEmp1Wrc537CylindricalAxisAuthority({
  foundationResult: standardResult,
  foundationModel: standardModel,
  loadCaseIdentity: 'LC-1',
});
assert.equal(authority.authorityId, EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_ID);
assert.equal(authority.sourceDocumentSha256, EMP1_WRC537_CYLINDRICAL_AXIS_SOURCE_SHA256);
assert.equal(authority.state, EMP1_WRC537_CYLINDRICAL_AXIS_QUALIFIED);
assert.equal(authority.engineeringUseAuthorized, true);
assert.equal(authority.productionObservationUsedToSetAuthority, false);
assert.equal(authority.foundationModelHash, standardModel.semanticHash);
assert.equal(authority.foundationResultHash,
  standardResult.semanticHashes.resultPayloadSemanticHash);
assert.deepEqual(authority.frameInput.nozzleCenterlineGlobal, EXPECTED_BASIS.P);
for (const name of COMPONENTS) {
  assert.deepEqual(authority.basisGlobal[name], EXPECTED_BASIS[name], `${name} basis`);
}
assert.equal(authority.sourceToTargetRadialAlignment, -1,
  'raw +eZ is an unoriented line; WRC +P is the opposite polarity in this fixture');

const frame = buildEmp1Wrc537CylindricalFrame(authority.frameInput);
const probes = [];
for (const name of COMPONENTS) {
  const isForce = ['P', 'Vc', 'Vl'].includes(name);
  const magnitude = isForce ? 100 : 1000;
  const vector = scale(EXPECTED_BASIS[name], magnitude);
  const positiveInput = isForce
    ? { forceGlobal: vector, momentGlobal: [0, 0, 0] }
    : { forceGlobal: [0, 0, 0], momentGlobal: vector };
  const negativeInput = isForce
    ? { forceGlobal: scale(vector, -1), momentGlobal: [0, 0, 0] }
    : { forceGlobal: [0, 0, 0], momentGlobal: scale(vector, -1) };
  assertOneHot(emp1GlobalLoadsToWrc537(frame, positiveInput), name, magnitude, `${name}+`);
  assertOneHot(emp1GlobalLoadsToWrc537(frame, negativeInput), name, -magnitude, `${name}-`);

  const wrc = zeroLoads();
  wrc[name] = magnitude;
  const global = emp1Wrc537LoadsToGlobal(frame, wrc);
  assert.deepEqual(emp1GlobalLoadsToWrc537(frame, global), wrc, `${name} roundtrip`);
  probes.push(`${name}+`, `${name}-`, `${name}-roundtrip`);
}

// Fail closed when source-to-target geometry cannot resolve inward polarity.
const coincidentModel = axisFixture((source) => {
  source.loadReferencePoints.find((row) => row.identity === 'SOURCE').point.value = [0, 0, 0];
});
const coincidentResult = calculateLocalAttachmentFoundation(coincidentModel);
const unresolved = deriveEmp1Wrc537CylindricalAxisAuthority({
  foundationResult: coincidentResult,
  foundationModel: coincidentModel,
  loadCaseIdentity: 'LC-1',
});
assert.equal(unresolved.state, EMP1_WRC537_CYLINDRICAL_AXIS_UNRESOLVED);
assert.equal(unresolved.engineeringUseAuthorized, false);
assert.equal(unresolved.frameInput, null);
expectCode('coincident-qualified-rejection',
  () => requireEmp1Wrc537QualifiedCylindricalAxisAuthority(unresolved),
  'EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_NOT_QUALIFIED');

const skewModel = axisFixture((source) => {
  source.loadReferencePoints.find((row) => row.identity === 'SOURCE').point.value = [100, 0, 1000];
});
const skewResult = calculateLocalAttachmentFoundation(skewModel);
expectCode('nonradial-source-target', () => deriveEmp1Wrc537CylindricalAxisAuthority({
  foundationResult: skewResult,
  foundationModel: skewModel,
  loadCaseIdentity: 'LC-1',
}), 'EMP1_WRC537_AXIS_SOURCE_TO_TARGET_NOT_RADIAL');

const tampered = structuredClone(authority);
tampered.basisGlobal.Mc = [1, 0, 0];
expectCode('basis-tamper', () => requireEmp1Wrc537QualifiedCylindricalAxisAuthority(tampered),
  'EMP1_WRC537_CYLINDRICAL_AXIS_BASIS_DRIFT:Mc');

// Independent secondary worked-convention cross-check (CAUx/CAESAR geometry):
// vessel +Y, nozzle +X toward vessel -> P=Fx, Vc=-Fz, Vl=Fy,
// Mc=-My, Ml=-Mz, Mt=-Mx.
const cauxModel = axisFixture((source) => {
  source.pipeCoordinateSystem.axialDirection.value = [0, 1, 0];
  source.pipeCoordinateSystem.radialHint.value = [1, 0, 0];
  source.pipeCoordinateSystem.circumferentialHint.value = [0, 0, 1];
  source.loadReferencePoints.find((row) => row.identity === 'SOURCE').point.value = [-1000, 0, 0];
});
const cauxResult = calculateLocalAttachmentFoundation(cauxModel);
const cauxAuthority = deriveEmp1Wrc537CylindricalAxisAuthority({
  foundationResult: cauxResult,
  foundationModel: cauxModel,
  loadCaseIdentity: 'LC-1',
});
const cauxFrame = buildEmp1Wrc537CylindricalFrame(cauxAuthority.frameInput);
const cauxObserved = emp1GlobalLoadsToWrc537(cauxFrame, {
  forceGlobal: [-161, -2109, 53],
  momentGlobal: [775, -121, -33],
});
const cauxExpected = { P: -161, Vc: -53, Vl: -2109, Mc: 121, Ml: 33, Mt: -775 };
assert.deepEqual(cauxObserved, cauxExpected);

console.log(JSON.stringify({
  schema: 'emp1-wrc537-cylindrical-axis-authority-check/v1',
  status: 'PASS_SOURCE_POLARITY_AND_SIX_COMPONENT_REVERSAL_FALSIFIERS',
  engineeringAuthority: true,
  productionObservationUsedToSetAuthority: false,
  authorityId: authority.authorityId,
  sourceDocumentSha256: authority.sourceDocumentSha256,
  sourceLocators: authority.sourceLocators,
  rawFoundationRadialHint: standardResult.coordinateSystemEvidence.axesGlobal.eZ,
  qualifiedWrcBasis: authority.basisGlobal,
  sourceToTargetRadialAlignment: authority.sourceToTargetRadialAlignment,
  componentProbesPassed: probes.length,
  componentProbes: probes,
  failClosedFalsifiers: [
    'coincident-source-target',
    'nonradial-source-target',
    'basis-tamper',
  ],
  secondaryCauxCrossCheck: { expected: cauxExpected, observed: cauxObserved },
}, null, 2));

function axisFixture(mutator = () => {}) {
  return canonicalFixture((source) => {
    source.pressureDefinitions.forEach((row) => {
      row.internalPressure.value = 0;
      row.externalPressure.value = 0;
    });
    mutator(source);
  });
}
function assertOneHot(actual, name, expected, label) {
  for (const component of COMPONENTS) {
    assert.equal(actual[component], component === name ? expected : 0,
      `${label} ${component}`);
  }
}
function zeroLoads() { return { P: 0, Vc: 0, Vl: 0, Mc: 0, Ml: 0, Mt: 0 }; }
function scale(vector, scalar) { return vector.map((value) => value * scalar); }
function expectCode(name, fn, prefix) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert.ok(caught, `${name}: expected failure`);
  assert.ok(String(caught.code ?? caught.message).startsWith(prefix),
    `${name}: actual=${caught.code ?? caught.message}`);
}
