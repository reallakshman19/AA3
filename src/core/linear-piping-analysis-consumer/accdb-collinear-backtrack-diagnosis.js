import { findCollinearBacktracks } from '../geometry/adapters/collinear-backtrack-rule.js';

/**
 * Tell an ACCDB import which of its elements walk backwards over their own run.
 *
 * This is the same rule the InputXML path repairs, applied to the ACCDB
 * element table. What differs is what may be done about it.
 *
 * The InputXML path can rewrite its source, because that source is text this
 * tool parsed and can write back. An ACCDB model's geometry is not ours to
 * rewrite: accdb-field-overrides.js deliberately excludes DELTA_X/Y/Z and the
 * coordinate tables so that "an override can never silently move the model".
 * Widening that to let this correction through would trade a deliberate
 * guarantee for a convenience.
 *
 * So this diagnoses and stops. The engineer is told exactly which elements are
 * wrong, what they currently declare, and what the corrected translation would
 * be, and makes the edit in CAESAR where the model actually lives. That is
 * strictly better than the previous behaviour, which was to report the overlap
 * finding and offer nothing.
 */
export const ACCDB_BACKTRACK_DIAGNOSIS_SCHEMA = 'accdb-collinear-backtrack-diagnosis/v1';

/**
 * ACCDB deltas are metres; the InputXML rule's limit is expressed in
 * millimetres because that is the unit its source declares. The threshold is
 * the same physical length either way.
 */
export const ACCDB_BACKTRACK_SHORT_LENGTH_LIMIT_M = 0.025;

const DELTA_FIELDS = Object.freeze(['DELTA_X', 'DELTA_Y', 'DELTA_Z']);

/**
 * @param {Array<object>} elementRows `INPUT_BASIC_ELEMENT_DATA` rows, in file order.
 * @returns {object} `ACCDB_BACKTRACK_DIAGNOSIS_SCHEMA`
 */
export function diagnoseAccdbCollinearBacktracks(elementRows) {
  const rows = Array.isArray(elementRows) ? elementRows : [];
  const vectors = rows.map((row) => DELTA_FIELDS.map((field) => {
    const value = Number(row?.[field]);
    return Number.isFinite(value) ? value : 0;
  }));
  const findings = findCollinearBacktracks(vectors, ACCDB_BACKTRACK_SHORT_LENGTH_LIMIT_M)
    .map((match) => {
      const row = rows[match.index];
      return Object.freeze({
        elementId: String(row?.ELEMENTID ?? match.index + 1),
        fromNode: String(row?.FROM_NODE ?? ''),
        toNode: String(row?.TO_NODE ?? ''),
        lengthM: match.length,
        declared: Object.freeze([...match.vector]),
        corrected: Object.freeze(match.vector.map((value) => -value)),
      });
    });
  return Object.freeze({
    schema: ACCDB_BACKTRACK_DIAGNOSIS_SCHEMA,
    // Stated on the record so a reader does not have to know why no Apply
    // button appeared.
    repairable: false,
    repairBoundary: 'ACCDB geometry is owned by the source file; DELTA_X/Y/Z is not an '
      + 'overridable field, so this correction is reported for the engineer to make in '
      + 'CAESAR rather than applied here.',
    shortLengthLimitM: ACCDB_BACKTRACK_SHORT_LENGTH_LIMIT_M,
    findings: Object.freeze(findings),
  });
}
