import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';
import {
  requireEmpiricalV3CoupledCalculationEvidence,
} from './coupled-calculation-evidence.js';

export const EMPIRICAL_V3_AUDIT_EXPORT_SCHEMA = 'empirical-v3-audit-export/v1';

/** JSON audit is a serialization of the sealed evidence, never a re-calculation. */
export function createEmpiricalV3AuditJsonExport(evidenceValue) {
  const evidence = requireEmpiricalV3CoupledCalculationEvidence(evidenceValue);
  const payload = {
    schema: EMPIRICAL_V3_AUDIT_EXPORT_SCHEMA,
    runId: evidence.runId,
    evidenceId: evidence.evidenceId,
    evidenceSemanticHash: evidence.semanticHash,
    calculationEvidence: evidence,
  };
  const exportSemanticHash = semanticHash(payload);
  return deepFreeze({
    schema: EMPIRICAL_V3_AUDIT_EXPORT_SCHEMA,
    fileName: `empirical-v3-${safeName(evidence.runId)}-${safeName(evidence.evidenceId)}.json`,
    mimeType: 'application/json',
    exportSemanticHash,
    text: JSON.stringify({ ...payload, exportSemanticHash }, null, 2),
  });
}

function safeName(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '') || 'record';
}
