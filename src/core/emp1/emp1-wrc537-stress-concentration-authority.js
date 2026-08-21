export const EMP1_WRC537_STRESS_CONCENTRATION_AUTHORITY_SCHEMA =
  'emp1-wrc537-stress-concentration-authority/v1';

export const EMP1_WRC537_UNITY_SCF_AUTHORITY = Object.freeze({
  schema: EMP1_WRC537_STRESS_CONCENTRATION_AUTHORITY_SCHEMA,
  mode: 'UNITY_ONLY',
  Kn: 1,
  Kb: 1,
  authority: 'BOUNDED_ROUTE_UNITY_MULTIPLIER_ONLY',
  engineeringMeaning: 'NO_APPENDIX_B_STRESS_CONCENTRATION_AMPLIFICATION_APPLIED',
  generalAppendixBAuthority: false,
  nonUnityAuthorized: false,
  sourceQualification: Object.freeze({
    retainedMethodDefinition: 'docs/01_WRC537_METHOD_DEFINITION.md',
    retainedExtractionState: 'NOT_READY_FOR_IMPLEMENTATION',
    sourceSection: 'WRC537_APPENDIX_B',
    candidateEquationIds: Object.freeze(['B.3', 'B.4', 'B.5']),
    licensedPrimarySourceVerifiedForImplementation: false,
    equationSelectionPolicyQualified: false,
    implementationAuthority: 'BLOCKED_PENDING_PRIMARY_SOURCE_AND_SELECTION_POLICY_QUALIFICATION',
  }),
});

export function createEmp1Wrc537UnityStressConcentrationAuthority() {
  return deepFreeze(structuredClone(EMP1_WRC537_UNITY_SCF_AUTHORITY));
}

export function requireEmp1Wrc537UnityStressConcentrationAuthority(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || value.schema !== EMP1_WRC537_STRESS_CONCENTRATION_AUTHORITY_SCHEMA) {
    throw scfError('EMP1_WRC537_STRESS_CONCENTRATION_AUTHORITY_REQUIRED');
  }
  if (value.mode !== EMP1_WRC537_UNITY_SCF_AUTHORITY.mode
    || value.authority !== EMP1_WRC537_UNITY_SCF_AUTHORITY.authority
    || value.engineeringMeaning !== EMP1_WRC537_UNITY_SCF_AUTHORITY.engineeringMeaning) {
    throw scfError('EMP1_WRC537_UNITY_STRESS_CONCENTRATION_AUTHORITY_MISMATCH');
  }
  if (value.Kn !== 1 || value.Kb !== 1) {
    throw scfError('EMP1_WRC537_UNITY_STRESS_CONCENTRATION_REQUIRED');
  }
  if (value.generalAppendixBAuthority !== false || value.nonUnityAuthorized !== false) {
    throw scfError('EMP1_WRC537_GENERAL_STRESS_CONCENTRATION_AUTHORITY_NOT_ALLOWED');
  }
  const source = value.sourceQualification;
  if (!source || source.retainedExtractionState !== 'NOT_READY_FOR_IMPLEMENTATION'
    || source.licensedPrimarySourceVerifiedForImplementation !== false
    || source.equationSelectionPolicyQualified !== false
    || source.implementationAuthority
      !== 'BLOCKED_PENDING_PRIMARY_SOURCE_AND_SELECTION_POLICY_QUALIFICATION') {
    throw scfError('EMP1_WRC537_APPENDIX_B_SOURCE_QUALIFICATION_STATE_INVALID');
  }
  return deepFreeze(structuredClone(value));
}

function scfError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
