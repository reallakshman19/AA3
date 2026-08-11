import { sealRecoveryProfile } from '../linear-fea-result-recovery/index.js';

export const INPUTXML_PRODUCTION_RECOVERY_PROFILE_SOURCE =
  'LFEA-B3.4-QUALIFIED-RECOVERY-BASELINE-V1';

/**
 * Production recovery policy promoted explicitly from the existing B-3.4
 * qualified baseline. Values are declared here rather than hidden behind a
 * fallback so the profile identity can be surfaced and retained as evidence.
 */
export function inputXmlProductionRecoveryProfile() {
  return sealRecoveryProfile({
    schema: 'fea-linear-recovery-profile/v1',
    profileId: 'LINEAR-RESULT-RECOVERY-R1',
    elementForceStationsPerSpan: {
      value: 5,
      source: INPUTXML_PRODUCTION_RECOVERY_PROFILE_SOURCE,
    },
    codePointConsistencyTolerance: {
      value: 1e-6,
      source: INPUTXML_PRODUCTION_RECOVERY_PROFILE_SOURCE,
    },
    retainLocalAndGlobalActions: true,
    semanticHash: '',
  });
}
