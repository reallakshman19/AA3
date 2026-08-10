/**
 * Bridge a canonical ACCDB package into the existing governed benchmark qualification pipeline.
 * Case IDs and reference values come from the package; this adapter contains no benchmark constants.
 */
import { deepFreeze } from '../../shared-piping-model/immutable.js';

export const CAESAR_ACCDB_ADAPTER_ID = 'CAESAR_ACCDB_DYNAMIC_ADAPTER_V1';

/** Create an adapter for an explicit, nonempty subset of ACCDB package cases. */
export function createCaesarAccdbQualificationAdapter(benchmarkPackage, selectedCaseIds) {
  if (!benchmarkPackage || benchmarkPackage.schema !== 'caesar-accdb-benchmark-package/v1') {
    throw new TypeError('A canonical CAESAR ACCDB benchmark package is required.');
  }
  const requestedCaseIds = selectedCaseIds ?? benchmarkPackage.cases.map((row) => row.caseId);
  if (!Array.isArray(requestedCaseIds) || requestedCaseIds.length === 0) {
    throw new TypeError('At least one ACCDB qualification case ID is required.');
  }
  const available = new Set(benchmarkPackage.cases.map((row) => row.caseId));
  const caseIds = Object.freeze([...new Set(requestedCaseIds.map(String))].sort(compareText));
  const unknown = caseIds.filter((caseId) => !available.has(caseId));
  if (unknown.length > 0) throw new TypeError(`Unknown ACCDB qualification cases: ${unknown.join(', ')}.`);
  return Object.freeze({
    adapterId: CAESAR_ACCDB_ADAPTER_ID,
    benchmarkId: benchmarkPackage.benchmarkId,
    caseIds,
    ingest(source) {
      if (source?.semanticHash !== benchmarkPackage.semanticHash) {
        throw new TypeError('CAESAR ACCDB package identity mismatch.');
      }
      return deepFreeze({
        benchmarkId: benchmarkPackage.benchmarkId,
        adapterId: CAESAR_ACCDB_ADAPTER_ID,
        caseIds,
        modelInput: benchmarkPackage.model,
        modelIdentity: benchmarkPackage.model.semanticHash,
        semanticHash: benchmarkPackage.semanticHash,
        benchmarkPackage,
      });
    },
    referenceRows({ caseId, ingestion }) {
      const reference = ingestion.benchmarkPackage.references[caseId];
      if (!reference) throw new TypeError(`Unknown ACCDB benchmark case ${caseId}.`);
      return reference.rows;
    },
  });
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}
