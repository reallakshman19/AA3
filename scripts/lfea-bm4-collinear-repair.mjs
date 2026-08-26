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
import {
  repairInputXmlCollinearBacktracks,
} from '../src/core/geometry/adapters/inputxml-collinear-backtrack-repair.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BM4_DIR = path.join(HERE, '..', 'benchmarks', 'LFEA', 'BM4');
const SOURCE_FILE = path.join(BM4_DIR, 'InputXML_BM4.xml');
const REPAIRED_FILE = path.join(BM4_DIR, 'InputXML_BM4.repaired.xml');

// The rule itself lives in
// src/core/geometry/adapters/inputxml-collinear-backtrack-repair.js so the
// browser can offer the same correction on a real upload -- this script is the
// reproducible build/verify path for the committed benchmark variant, not a
// second implementation.

function main() {
  const source = readFileSync(SOURCE_FILE, 'utf8');
  const { xml, repairs, edits } = repairInputXmlCollinearBacktracks(source);
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
