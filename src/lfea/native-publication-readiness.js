import { deepFreeze } from '../core/shared-piping-model/immutable.js';

export const LFEA_PUBLICATION_READINESS_SCHEMA = 'lfea-native-publication-readiness/v1';
export const LFEA_PUBLICATION_STATUS = Object.freeze({
  READY: 'READY',
  BLOCKED: 'BLOCKED',
});

const SUPPORT_CHAIN = Object.freeze([
  'compileLinearPipingInterfaceSet',
  'recoverLinearPipingInterfaceLoads',
  'createLinearPipingSupportActionsPublication',
]);
const B31_CHAIN = Object.freeze(['compileLinearPipingB31Application']);

/** Report whether existing governed publication producers can lawfully run. */
export function createLfeaNativePublicationReadiness({
  preFlight,
  resultsState,
  supportAuthority = null,
  b31Authority = null,
} = {}) {
  return deepFreeze({
    schema: LFEA_PUBLICATION_READINESS_SCHEMA,
    supportActions: supportReadiness(preFlight, resultsState, supportAuthority),
    b31Code: b31Readiness(preFlight, resultsState, b31Authority),
  });
}

function supportReadiness(preFlight, resultsState, authority) {
  const reasons = [];
  if (!preFlight?.preparation?.structural?.compilation) reasons.push('CURRENT_MECHANICAL_COMPILATION_REQUIRED');
  if (!currentRecovery(resultsState)) reasons.push('CURRENT_B3_4_RECOVERY_REQUIRED');
  if (!authority?.interfaceSet) reasons.push('GOVERNED_INTERFACE_SET_REQUIRED');
  if (!authority?.analysisResultByCase) reasons.push('GOVERNED_LINEAR_PIPING_ANALYSIS_RESULT_REQUIRED');
  if (!explicitVector(authority?.upGlobal)) reasons.push('EXPLICIT_UP_GLOBAL_REQUIRED');
  if (!positiveFinite(authority?.parallelTolerance)) reasons.push('EXPLICIT_PARALLEL_TOLERANCE_REQUIRED');
  return publicationStage('SUPPORT_ACTIONS', SUPPORT_CHAIN, reasons);
}

function b31Readiness(preFlight, resultsState, authority) {
  const reasons = [];
  const recovery = currentRecovery(resultsState);
  if (!preFlight?.preparation?.structural?.compilation) reasons.push('CURRENT_MECHANICAL_COMPILATION_REQUIRED');
  if (!recovery) reasons.push('CURRENT_B3_4_RECOVERY_REQUIRED');
  if (recovery && !hasComponentCodePoints(recovery)) reasons.push('COMPONENT_CODE_POINT_RECOVERY_REQUIRED');
  if (!authority?.codeProfile) reasons.push('GOVERNED_CODE_PROFILE_REQUIRED');
  if (!authority?.editionDataset) reasons.push('GOVERNED_EDITION_DATASET_REQUIRED');
  if (!Array.isArray(authority?.checks) || authority.checks.length === 0) reasons.push('GOVERNED_B31_CHECK_SET_REQUIRED');
  return publicationStage('B31_CODE', B31_CHAIN, reasons);
}

function publicationStage(stage, producerChain, reasons) {
  const uniqueReasons = Object.freeze([...new Set(reasons)].sort(compareAscii));
  return deepFreeze({
    stage,
    status: uniqueReasons.length === 0 ? LFEA_PUBLICATION_STATUS.READY : LFEA_PUBLICATION_STATUS.BLOCKED,
    reasonCodes: uniqueReasons,
    producerChain,
  });
}

function currentRecovery(resultsState) {
  if (resultsState?.currentness !== 'CURRENT') return null;
  const results = resultsState.results;
  return results?.schema === 'fea-inputxml-linear-recovery-batch/v1' ? results : null;
}

function hasComponentCodePoints(batch) {
  if (!batch.caseRecoveries?.length) return false;
  return batch.caseRecoveries.every((caseRow) => {
    const components = caseRow.recovery?.componentResultants;
    return Array.isArray(components)
      && components.length > 0
      && components.every((component) => Array.isArray(component.codePoints) && component.codePoints.length > 0);
  });
}

function explicitVector(value) {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}
function positiveFinite(value) { return Number.isFinite(value) && value > 0; }
function compareAscii(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
