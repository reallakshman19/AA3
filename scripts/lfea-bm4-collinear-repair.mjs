#!/usr/bin/env node
/**
 * Build `InputXML_BM4.repaired.xml` from the vendored, unmodified
 * `InputXML_BM4.xml` by correcting short backtracking elements.
 *
 * WHY THIS EXISTS
 * ---------------
 * The real BM4 model raises 7 `TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP` findings.
 * The detector is correct and is deliberately NOT relaxed: three 1 mm
 * elements (IX-S90/S91/S92, source elements 90/91/92) declare
 * `DELTA_X="1.000000"` while the entire run they sit in travels in -X
 * (IX-S89 is -850 mm, IX-S93 is -2700 mm). Those 1 mm elements therefore
 * walk *backwards* along centreline the run has already covered, so their
 * spans genuinely lie on top of IX-S89, and IX-S93 then re-covers the 3 mm
 * they walked back over. That is a source-model sign error, not a false
 * positive, so the fix belongs in the model, not in the detector.
 *
 * THE RULE, AND ITS BOUND
 * -----------------------
 * Flip the sign of a short element's delta when, and only when:
 *   - the element's declared length is <= REPAIR_LENGTH_LIMIT_MM (25 mm), and
 *   - it is axis-parallel to BOTH its nearest preceding and nearest following
 *     LONG element (> 25 mm), and
 *   - it opposes both of them (negative dot product with each).
 *
 * The +-25 mm bound is the Owner's explicit instruction and is what keeps
 * this from being a general "fix whatever looks wrong" pass: a real
 * direction change in a piping run is never expressed as a sub-25 mm
 * element sandwiched between two long collinear runs pointing the other
 * way. Anything longer than that is left exactly as the source declares it.
 *
 * Nearest-LONG-neighbour (rather than immediately-previous-element) is
 * required, not stylistic: a naive "opposes the previous element" test
 * catches only the first of the three, because elements 91 and 92 are
 * parallel to the already-wrong element 90.
 *
 * Every other byte of the source file is preserved: only the numeric text
 * inside the matched DELTA_* attribute is rewritten, in place, by byte range.
 *
 * Usage: node scripts/lfea-bm4-collinear-repair.mjs [--check]
 *   --check  verify the committed repaired file matches what this script
 *            would produce, and exit non-zero if it does not.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BM4_DIR = path.join(HERE, '..', 'benchmarks', 'LFEA', 'BM4');
const SOURCE_FILE = path.join(BM4_DIR, 'InputXML_BM4.xml');
const REPAIRED_FILE = path.join(BM4_DIR, 'InputXML_BM4.repaired.xml');

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

function magnitude(vector) {
  return Math.hypot(...vector);
}

function dot(left, right) {
  return left.reduce((sum, value, axis) => sum + value * right[axis], 0);
}

/** Parallel means the cross product vanishes; both vectors are non-zero here. */
function isParallel(left, right) {
  const cross = [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
  return magnitude(cross) <= 1e-9 * magnitude(left) * magnitude(right);
}

function nearestLong(elements, from, step) {
  for (let i = from + step; i >= 0 && i < elements.length; i += step) {
    const vector = vectorOf(elements[i]);
    if (magnitude(vector) > REPAIR_LENGTH_LIMIT_MM) return vector;
  }
  return null;
}

/** Elements the rule fires on, with the evidence that made it fire. */
export function findBacktrackingElements(xml) {
  const elements = readElements(xml);
  const repairs = [];
  for (const element of elements) {
    const vector = vectorOf(element);
    const length = magnitude(vector);
    if (length === 0 || length > REPAIR_LENGTH_LIMIT_MM) continue;
    const before = nearestLong(elements, element.index, -1);
    const after = nearestLong(elements, element.index, 1);
    if (before === null || after === null) continue;
    if (!isParallel(vector, before) || !isParallel(vector, after)) continue;
    if (dot(vector, before) >= 0 || dot(vector, after) >= 0) continue;
    repairs.push({ element, vector, length, before, after });
  }
  return repairs;
}

/** Rewrite only the matched numeric text, preserving its declared precision. */
function negatedText(originalText) {
  const value = Number(originalText);
  const decimals = originalText.includes('.') ? originalText.split('.')[1].length : 0;
  return (-value).toFixed(decimals);
}

export function repairBm4CollinearBacktracks(xml) {
  const repairs = findBacktrackingElements(xml);
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

function main() {
  const source = readFileSync(SOURCE_FILE, 'utf8');
  const { xml, repairs, edits } = repairBm4CollinearBacktracks(source);
  for (const repair of repairs) {
    process.stdout.write(
      `element ${repair.element.index + 1}: delta=(${repair.vector.join(', ')}) `
      + `length=${repair.length} mm, opposes preceding run (${repair.before.join(', ')}) `
      + `and following run (${repair.after.join(', ')}) -> sign flipped\n`,
    );
  }
  process.stdout.write(`${repairs.length} element(s) repaired, ${edits.length} attribute edit(s).\n`);

  if (process.argv.includes('--check')) {
    const committed = readFileSync(REPAIRED_FILE, 'utf8');
    if (committed !== xml) {
      process.stderr.write(
        `${REPAIRED_FILE} does not match what this script produces from ${SOURCE_FILE}.\n`,
      );
      process.exitCode = 1;
      return;
    }
    process.stdout.write('Committed repaired file matches this script\'s output.\n');
    return;
  }
  writeFileSync(REPAIRED_FILE, xml);
  process.stdout.write(`Wrote ${REPAIRED_FILE}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
