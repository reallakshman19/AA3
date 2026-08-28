import { findCollinearBacktracks } from './collinear-backtrack-rule.js';
/**
 * Detect and correct short elements whose declared direction opposes the run
 * they sit in.
 *
 * A CAESAR InputXML element that declares, say, DELTA_X="1.000000" inside a run
 * travelling in -X walks BACKWARDS along centreline the run has already
 * covered. Its span then genuinely coincides with its neighbour's, which is
 * what TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP reports -- correctly. The detector is
 * right; the sign in the source model is wrong, so the correction belongs to
 * the model.
 *
 * The rule is bounded so it cannot become a general "fix whatever looks odd"
 * pass: it fires only on an element shorter than REPAIR_LENGTH_LIMIT_MM that is
 * axis-parallel to BOTH its nearest preceding and nearest following LONG
 * element and opposes both of them. A real direction change in a piping run is
 * never expressed as a sub-25 mm element sandwiched between two long collinear
 * runs pointing the other way.
 *
 * Nearest-LONG-neighbour rather than immediately-previous-element is required,
 * not stylistic: a naive "opposes the previous element" test catches only the
 * first of a consecutive group, because the ones after it are parallel to the
 * already-wrong one.
 *
 * Only the numeric text inside the matched DELTA_* attribute is rewritten, in
 * place, by byte range, at its declared precision. Every other byte of the
 * source is preserved.
 */
// CAESAR's "this field was left blank" sentinel, as it appears in InputXML.
const BLANK_SENTINEL = -1.0101;
const SENTINEL_TOLERANCE = 1e-6;
const REPAIR_LENGTH_LIMIT_MM = 25;
const DELTA_FIELDS = ['DELTA_X', 'DELTA_Y', 'DELTA_Z'];

function isBlank(value) {
  return value === null || Math.abs(value - BLANK_SENTINEL) < SENTINEL_TOLERANCE;
}

/** Locate every PIPINGELEMENT open tag and its DELTA_* attribute byte ranges. */
function readElements(xml) {
  const elements = [];
  for (const tagMatch of xml.matchAll(/<PIPINGELEMENT\b[^>]*>/gu)) {
    const tagStart = tagMatch.index;
    const tag = tagMatch[0];
    const deltas = {};
    for (const field of DELTA_FIELDS) {
      const attribute = new RegExp(`${field}="([^"]*)"`, 'u').exec(tag);
      if (attribute === null) {
        deltas[field] = { value: null, start: null, end: null };
        continue;
      }
      const valueStart = tagStart + attribute.index + attribute[0].indexOf('"') + 1;
      deltas[field] = {
        value: Number(attribute[1]),
        start: valueStart,
        end: valueStart + attribute[1].length,
      };
    }
    elements.push({ index: elements.length, deltas });
  }
  return elements;
}

/** Declared translation of an element, with blank slots read as zero. */
function vectorOf(element) {
  return DELTA_FIELDS.map((field) => {
    const slot = element.deltas[field];
    return isBlank(slot.value) ? 0 : slot.value;
  });
}

/** Elements the rule fires on, with the evidence that made it fire. */
export function findInputXmlBacktrackingElements(xml) {
  const elements = readElements(xml);
  // The rule itself lives in collinear-backtrack-rule.js so an ACCDB import can
  // be told the same thing about itself; only the vector source differs.
  return findCollinearBacktracks(elements.map(vectorOf), REPAIR_LENGTH_LIMIT_MM)
    .map((match) => ({ ...match, element: elements[match.index] }));
}

/** Rewrite only the matched numeric text, preserving its declared precision. */
function negatedText(originalText) {
  const value = Number(originalText);
  const decimals = originalText.includes('.') ? originalText.split('.')[1].length : 0;
  return (-value).toFixed(decimals);
}

export function repairInputXmlCollinearBacktracks(xml) {
  const repairs = findInputXmlBacktrackingElements(xml);
  const edits = [];
  for (const repair of repairs) {
    for (const field of DELTA_FIELDS) {
      const slot = repair.element.deltas[field];
      if (slot.start === null || isBlank(slot.value) || slot.value === 0) continue;
      const originalText = xml.slice(slot.start, slot.end);
      edits.push({ start: slot.start, end: slot.end, text: negatedText(originalText) });
    }
  }
  edits.sort((left, right) => left.start - right.start);
  let output = '';
  let cursor = 0;
  for (const edit of edits) {
    output += xml.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  output += xml.slice(cursor);
  return { xml: output, repairs, edits };
}


export const INPUTXML_BACKTRACK_REPAIR_LENGTH_LIMIT_MM = REPAIR_LENGTH_LIMIT_MM;
