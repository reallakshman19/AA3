/**
 * Bridge a canonical ACCDB package into the existing governed benchmark qualification pipeline.
 * Case IDs and reference values come from the package; this adapter contains no benchmark constants.
 */
import { deepFreeze } from '../../shared-piping-model/immutable.js';

export const CAESAR_ACCDB_ADAPTER_ID = 'CAESAR_ACCDB_DYNAMIC_ADAPTER_V1';

/** Create a qualification adapter whose cases and references came from one ACCDB package. */
export function createCaesarAccdbQualificationAdapter(benchmarkPackage) {
  if (!benchmarkPackage || benchmarkPackage.schema !== 'caesar-accdb-benchmark-package/v1') {
    throw new TypeError('A canonical CAESAR ACCDB benchmark package is required.');
  }
  const caseIds = Object.freeze(benchmarkPackage.cases.map((row) => row.caseId));
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
