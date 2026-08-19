#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  EMP1_C_PRESSURE_THRUST_MODES,
  deriveEmp1CRuntimeContractQualification,
  runtimeContractReady,
} from './emp1-c-runtime-contract-lib.mjs';

const blockedLedger = {
  rawPdfSha256: null,
  custodyState: 'UNRESOLVED_RAW_BYTES',
  qualificationState: 'BLOCKED',
};
const absent = deriveEmp1CRuntimeContractQualification(blockedLedger, null);
assert.equal(absent.status, 'NOT_RUN');
assert.equal(absent.loadAxisMappingStatus, 'BLOCKED');
assert.equal(absent.pressureThrustStatus, 'BLOCKED');
assert.equal(absent.stressIntensityDefinitionStatus, 'BLOCKED');
assert.equal(runtimeContractReady(absent), false);

const qualifiedLedger = {
  rawPdfSha256: 'a'.repeat(64),
  custodyState: 'VERIFIED',
  qualificationState: 'PASS',
};
const passArtifact = readyArtifact(qualifiedLedger.rawPdfSha256);
const pass = deriveEmp1CRuntimeContractQualification(qualifiedLedger, passArtifact);
assert.equal(pass.status, 'PASS');
assert.equal(pass.loadAxisMappingStatus, 'PASS');
assert.equal(pass.pressureThrustStatus, 'PASS');
assert.equal(pass.pressureThrustMode, 'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID');
assert.equal(pass.pressureThrustDoubleCountGuardQualified, true);
assert.equal(pass.pressureThrustIndependentCheckStatus, 'PASS');
assert.equal(pass.stressIntensityDefinitionStatus, 'PASS');
assert.equal(pass.stressIntensityOutputDimension, 'STRESS');
assert.equal(pass.stressIntensityIndependentCheckStatus, 'PASS');
assert.equal(runtimeContractReady(pass), true);

for (const mode of EMP1_C_PRESSURE_THRUST_MODES) {
  const artifact = readyArtifact(qualifiedLedger.rawPdfSha256);
  artifact.pressureThrust.mode = mode;
  const result = deriveEmp1CRuntimeContractQualification(qualifiedLedger, artifact);
  assert.equal(result.status, 'PASS');
  assert.equal(result.pressureThrustMode, mode);
  assert.equal(runtimeContractReady(result), true);
}

const noSourceCustody = readyArtifact('a'.repeat(64));
assert.throws(
  () => deriveEmp1CRuntimeContractQualification(blockedLedger, noSourceCustody),
  /EMP1_C_RUNTIME_CONTRACT_WITHOUT_WRC_SOURCE_CUSTODY/u,
);

const wrongSourceHash = readyArtifact('b'.repeat(64));
assert.throws(
  () => deriveEmp1CRuntimeContractQualification(qualifiedLedger, wrongSourceHash),
  /EMP1_C_RUNTIME_CONTRACT_WRC_SHA256_MISMATCH/u,
);

const contaminated = readyArtifact(qualifiedLedger.rawPdfSha256);
contaminated.productionObservationUsedToSetContract = true;
assert.throws(
  () => deriveEmp1CRuntimeContractQualification(qualifiedLedger, contaminated),
  /EMP1_C_RUNTIME_CONTRACT_PRODUCTION_CONTAMINATED/u,
);

const guessedMode = readyArtifact(qualifiedLedger.rawPdfSha256);
guessedMode.pressureThrust.mode = 'INFER_FROM_FORCE_SIGN';
assert.throws(
  () => deriveEmp1CRuntimeContractQualification(qualifiedLedger, guessedMode),
  /EMP1_C_PRESSURE_THRUST_MODE_INVALID/u,
);

const mappingWithoutLocator = readyArtifact(qualifiedLedger.rawPdfSha256);
mappingWithoutLocator.loadAxisMapping.sourceLocator = '';
assert.throws(
  () => deriveEmp1CRuntimeContractQualification(qualifiedLedger, mappingWithoutLocator),
  /EMP1_C_RUNTIME_CONTRACT_FALSE_PASS/u,
);

const thrustWithoutDoubleCountGuard = readyArtifact(qualifiedLedger.rawPdfSha256);
thrustWithoutDoubleCountGuard.pressureThrust.doubleCountGuardQualified = false;
assert.throws(
  () => deriveEmp1CRuntimeContractQualification(qualifiedLedger, thrustWithoutDoubleCountGuard),
  /EMP1_C_RUNTIME_CONTRACT_FALSE_PASS/u,
);

const stressWithWrongDimension = readyArtifact(qualifiedLedger.rawPdfSha256);
stressWithWrongDimension.stressIntensity.outputDimension = 'SQRT_STRESS';
assert.throws(
  () => deriveEmp1CRuntimeContractQualification(qualifiedLedger, stressWithWrongDimension),
  /EMP1_C_RUNTIME_CONTRACT_FALSE_PASS/u,
);

const blockedArtifact = readyArtifact(qualifiedLedger.rawPdfSha256);
blockedArtifact.status = 'BLOCKED';
blockedArtifact.pressureThrust.status = 'BLOCKED';
const blocked = deriveEmp1CRuntimeContractQualification(qualifiedLedger, blockedArtifact);
assert.equal(blocked.status, 'BLOCKED');
assert.equal(blocked.pressureThrustStatus, 'BLOCKED');
assert.equal(runtimeContractReady(blocked), false);

console.log(JSON.stringify({
  schema: 'emp1-c-runtime-contract-self-test/v1',
  status: 'PASS',
  oracleClassification: 'SOFTWARE_CONTRACT_ONLY_NOT_WRC_ENGINEERING_EVIDENCE',
  allowedPressureThrustModes: EMP1_C_PRESSURE_THRUST_MODES,
  guardrails: [
    'load-axis mapping requires source locator plus canonical-frame and mapping hashes',
    'pressure-thrust handling requires explicit allowed mode, independent check, and double-count guard',
    'stress-intensity output must be source-qualified as a stress dimension',
    'runtime-contract evidence cannot be frozen from production observation',
    'method runtime contract is bound to the source-qualified WRC raw PDF SHA-256',
  ],
}, null, 2));

function readyArtifact(sourceSha) {
  return {
    schema: 'emp1-c-runtime-contract-qualification/v1',
    status: 'PASS',
    wrcSourceRawPdfSha256: sourceSha,
    productionObservationUsedToSetContract: false,
    qualificationRecordHash: 'sha256:synthetic-runtime-contract',
    loadAxisMapping: {
      status: 'PASS',
      mappingContractHash: 'sha256:synthetic-load-axis-map',
      canonicalFrameContractHash: 'sha256:synthetic-canonical-frame',
      sourceLocator: 'SYNTHETIC_TEST_ONLY',
    },
    pressureThrust: {
      status: 'PASS',
      mode: 'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID',
      doubleCountGuardQualified: true,
      independentCheckStatus: 'PASS',
      policyRecordHash: 'sha256:synthetic-pressure-thrust-policy',
    },
    stressIntensity: {
      status: 'PASS',
      definitionContractHash: 'sha256:synthetic-stress-intensity-definition',
      sourceLocator: 'SYNTHETIC_TEST_ONLY',
      outputDimension: 'STRESS',
      independentCheckStatus: 'PASS',
    },
  };
}
