import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import { LFEA_NATIVE_VERIFICATION_STATUS } from './native-verification.js';

export const LFEA_NATIVE_DOSSIER_SCHEMA = 'lfea-native-evidence-dossier/v1';
export const LFEA_NATIVE_DOSSIER_STATUS = Object.freeze({
  CURRENT_EVIDENCE_ONLY: 'CURRENT_EVIDENCE_ONLY',
});

/** Create deterministic current-run evidence. This is not engineering-release authority. */
export function createLfeaNativeEvidenceDossier(verification) {
  requireCurrentVerification(verification);
  const limitationCodes = dossierLimitations(
    verification.publicationReadiness,
    verification.supportPublication,
  );
  const evidence = deepFreeze({
    runId: verification.runId,
    source: verification.source,
    authority: verification.authority,
    application: verification.application,
    cases: verification.cases,
    publicationReadiness: verification.publicationReadiness,
    supportPublication: verification.supportPublication,
    limitationCodes,
  });
  const dossierSemanticHash = semanticHash({
    schema: LFEA_NATIVE_DOSSIER_SCHEMA,
    dossierStatus: LFEA_NATIVE_DOSSIER_STATUS.CURRENT_EVIDENCE_ONLY,
    engineeringIssueEligible: false,
    evidence,
  });
  return deepFreeze({
    schema: LFEA_NATIVE_DOSSIER_SCHEMA,
    dossierStatus: LFEA_NATIVE_DOSSIER_STATUS.CURRENT_EVIDENCE_ONLY,
    engineeringIssueEligible: false,
    limitationCodes,
    evidence,
    semanticHash: dossierSemanticHash,
  });
}

function requireCurrentVerification(verification) {
  if (!verification || verification.schema !== 'lfea-native-verification/v1') {
    throw dossierError('LFEA_DOSSIER_VERIFICATION_REQUIRED',
      'Native evidence dossier requires a validated verification projection.');
  }
  if (verification.status !== LFEA_NATIVE_VERIFICATION_STATUS.CURRENT) {
    throw dossierError('LFEA_DOSSIER_CURRENT_RUN_REQUIRED',
      'Native evidence dossier can be created only for the CURRENT governed run.');
  }
  if (!verification.runId || !verification.cases?.length) {
    throw dossierError('LFEA_DOSSIER_CURRENT_EVIDENCE_INCOMPLETE',
      'CURRENT native evidence is incomplete.');
  }
  if (!verification.cases.every((row) => (
    ['QUALIFIED', 'CONDITIONAL'].includes(row.execution.status)
  ))) {
    throw dossierError('LFEA_DOSSIER_QUALIFIED_EXECUTION_REQUIRED',
      'Native evidence dossier requires qualified or conditional solver execution for every retained case.');
  }
}

function dossierLimitations(readiness, supportPublication) {
  const limitations = ['ENGINEERING_ISSUE_NOT_AUTHORIZED_BY_EVIDENCE_DOSSIER'];
  if (!readiness) limitations.push('PUBLICATION_READINESS_UNAVAILABLE');
  for (const [stage, projection] of Object.entries({
    SUPPORT_ACTIONS: readiness?.supportActions,
    B31_CODE: readiness?.b31Code,
  })) {
    if (projection?.status === 'READY') continue;
    limitations.push(`${stage}_PUBLICATION_BLOCKED`);
    for (const reason of projection?.reasonCodes ?? []) {
      limitations.push(`${stage}:${reason}`);
    }
  }
  if (readiness?.supportActions?.status === 'READY'
    && supportPublication?.status !== 'CURRENT') {
    limitations.push('SUPPORT_ACTIONS_NOT_PUBLISHED');
  }
  return Object.freeze([...new Set(limitations)].sort(compareAscii));
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
function dossierError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_NATIVE_EVIDENCE_DOSSIER';
  return error;
}
