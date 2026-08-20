export const EMP1_C_RUNTIME_CONTRACT_SCHEMA = 'emp1-c-runtime-contract-qualification/v1';

export const EMP1_C_PRESSURE_THRUST_MODES = Object.freeze([
  'SOURCE_LOAD_ALREADY_INCLUDES_THRUST',
  'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID',
  'NOT_APPLICABLE_BY_QUALIFIED_METHOD',
]);

const SHA256_HEX = /^[a-f0-9]{64}$/u;
const SOURCE_CUSTODY_QUALIFICATION_STATE = 'PASS_SOURCE_CUSTODY';

/**
 * Qualify the runtime contracts that cannot be inferred safely from the retained
 * WRC extraction: canonical LAFEA->WRC load-axis mapping, pressure-thrust
 * inclusion/double-count policy, and the source semantics of stress intensity.
 *
 * An absent artifact intentionally yields NOT_RUN/BLOCKED evidence. A future
 * PASS artifact must be tied to the source-qualified WRC PDF and an independent
 * qualification record. No mapping, sign, thrust direction, or stress-intensity
 * formula is invented here.
 */
export function deriveEmp1CRuntimeContractQualification(wrcSourceLedger, qualification) {
  const sourceQualified = sourceCustodyQualified(wrcSourceLedger);
  const base = {
    status: 'NOT_RUN',
    sourceCustodyQualified: sourceQualified,
    sourceRawPdfSha256: nullableText(wrcSourceLedger?.rawPdfSha256),
    loadAxisMappingStatus: 'BLOCKED',
    loadAxisMappingContractHash: null,
    canonicalFrameContractHash: null,
    loadAxisSourceLocator: null,
    pressureThrustStatus: 'BLOCKED',
    pressureThrustMode: null,
    pressureThrustDoubleCountGuardQualified: false,
    pressureThrustIndependentCheckStatus: 'NOT_RUN',
    pressureThrustPolicyRecordHash: null,
    stressIntensityDefinitionStatus: 'BLOCKED',
    stressIntensityDefinitionContractHash: null,
    stressIntensitySourceLocator: null,
    stressIntensityOutputDimension: null,
    stressIntensityIndependentCheckStatus: 'NOT_RUN',
    qualificationRecordHash: null,
  };

  if (!qualification) return base;
  assertSchema(qualification);
  if (!sourceQualified) {
    throw new TypeError('EMP1_C_RUNTIME_CONTRACT_WITHOUT_WRC_SOURCE_CUSTODY');
  }
  if (qualification.wrcSourceRawPdfSha256 !== wrcSourceLedger.rawPdfSha256) {
    throw new TypeError('EMP1_C_RUNTIME_CONTRACT_WRC_SHA256_MISMATCH');
  }
  if (qualification.productionObservationUsedToSetContract !== false) {
    throw new TypeError('EMP1_C_RUNTIME_CONTRACT_PRODUCTION_CONTAMINATED');
  }

  const mapping = qualification.loadAxisMapping ?? {};
  const pressure = qualification.pressureThrust ?? {};
  const stress = qualification.stressIntensity ?? {};

  const loadAxisReady = mapping.status === 'PASS'
    && nonEmpty(mapping.mappingContractHash)
    && nonEmpty(mapping.canonicalFrameContractHash)
    && nonEmpty(mapping.sourceLocator);

  const pressureMode = nullableText(pressure.mode);
  if (pressureMode && !EMP1_C_PRESSURE_THRUST_MODES.includes(pressureMode)) {
    throw new TypeError('EMP1_C_PRESSURE_THRUST_MODE_INVALID');
  }
  const pressureReady = pressure.status === 'PASS'
    && EMP1_C_PRESSURE_THRUST_MODES.includes(pressureMode)
    && pressure.doubleCountGuardQualified === true
    && pressure.independentCheckStatus === 'PASS'
    && nonEmpty(pressure.policyRecordHash);

  const stressReady = stress.status === 'PASS'
    && nonEmpty(stress.definitionContractHash)
    && nonEmpty(stress.sourceLocator)
    && stress.outputDimension === 'STRESS'
    && stress.independentCheckStatus === 'PASS';

  const qualificationRecordHash = nullableText(qualification.qualificationRecordHash);
  const complete = loadAxisReady && pressureReady && stressReady && nonEmpty(qualificationRecordHash);
  if (qualification.status === 'PASS' && !complete) {
    throw new TypeError('EMP1_C_RUNTIME_CONTRACT_FALSE_PASS');
  }

  return {
    ...base,
    status: qualification.status === 'PASS' && complete ? 'PASS' : 'BLOCKED',
    loadAxisMappingStatus: loadAxisReady ? 'PASS' : 'BLOCKED',
    loadAxisMappingContractHash: nullableText(mapping.mappingContractHash),
    canonicalFrameContractHash: nullableText(mapping.canonicalFrameContractHash),
    loadAxisSourceLocator: nullableText(mapping.sourceLocator),
    pressureThrustStatus: pressureReady ? 'PASS' : 'BLOCKED',
    pressureThrustMode: pressureMode,
    pressureThrustDoubleCountGuardQualified: pressure.doubleCountGuardQualified === true,
    pressureThrustIndependentCheckStatus: text(pressure.independentCheckStatus, 'NOT_RUN'),
    pressureThrustPolicyRecordHash: nullableText(pressure.policyRecordHash),
    stressIntensityDefinitionStatus: stressReady ? 'PASS' : 'BLOCKED',
    stressIntensityDefinitionContractHash: nullableText(stress.definitionContractHash),
    stressIntensitySourceLocator: nullableText(stress.sourceLocator),
    stressIntensityOutputDimension: nullableText(stress.outputDimension),
    stressIntensityIndependentCheckStatus: text(stress.independentCheckStatus, 'NOT_RUN'),
    qualificationRecordHash,
  };
}

export function runtimeContractReady(value) {
  return value?.status === 'PASS'
    && value.sourceCustodyQualified === true
    && SHA256_HEX.test(value.sourceRawPdfSha256 ?? '')
    && value.loadAxisMappingStatus === 'PASS'
    && nonEmpty(value.loadAxisMappingContractHash)
    && nonEmpty(value.canonicalFrameContractHash)
    && nonEmpty(value.loadAxisSourceLocator)
    && value.pressureThrustStatus === 'PASS'
    && EMP1_C_PRESSURE_THRUST_MODES.includes(value.pressureThrustMode)
    && value.pressureThrustDoubleCountGuardQualified === true
    && value.pressureThrustIndependentCheckStatus === 'PASS'
    && nonEmpty(value.pressureThrustPolicyRecordHash)
    && value.stressIntensityDefinitionStatus === 'PASS'
    && nonEmpty(value.stressIntensityDefinitionContractHash)
    && nonEmpty(value.stressIntensitySourceLocator)
    && value.stressIntensityOutputDimension === 'STRESS'
    && value.stressIntensityIndependentCheckStatus === 'PASS'
    && nonEmpty(value.qualificationRecordHash);
}

function sourceCustodyQualified(ledger) {
  return ledger?.custodyState === 'VERIFIED'
    && ledger?.qualificationState === SOURCE_CUSTODY_QUALIFICATION_STATE
    && SHA256_HEX.test(ledger?.rawPdfSha256 ?? '');
}

function assertSchema(value) {
  if (!value || typeof value !== 'object' || value.schema !== EMP1_C_RUNTIME_CONTRACT_SCHEMA) {
    throw new TypeError('EMP1_C_RUNTIME_CONTRACT_SCHEMA_INVALID');
  }
}

function text(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function nullableText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
