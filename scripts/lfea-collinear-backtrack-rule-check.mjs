#!/usr/bin/env node

/**
 * The collinear-backtrack rule, and both paths that consume it.
 *
 * The rule fires on a short element whose translation opposes the long runs on
 * both sides of it. It was extracted from the InputXML repair so an ACCDB
 * import could be told the same thing about itself; this checks that the shared
 * rule still discriminates, that the InputXML path still finds and fixes what
 * it always did, and that the ACCDB path reports rather than rewrites.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findCollinearBacktracks } from '../src/core/geometry/adapters/collinear-backtrack-rule.js';
import {
  findInputXmlBacktrackingElements,
  repairInputXmlCollinearBacktracks,
} from '../src/core/geometry/adapters/inputxml-collinear-backtrack-repair.js';
import {
  ACCDB_BACKTRACK_SHORT_LENGTH_LIMIT_M,
  diagnoseAccdbCollinearBacktracks,
} from '../src/core/linear-piping-analysis-consumer/accdb-collinear-backtrack-diagnosis.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIMIT = 0.025;

// --- the rule discriminates -------------------------------------------------
// A short element opposing both neighbours is the whole condition. Each case
// below breaks exactly one part of it and must stop firing, so a rule that
// simply matched every short element would fail here.
const run = [1, 0, 0];
assert.equal(
  findCollinearBacktracks([run, [-0.01, 0, 0], run], LIMIT).length, 1,
  'a short element opposing both neighbours is a backtrack',
);
assert.equal(
  findCollinearBacktracks([run, [0.01, 0, 0], run], LIMIT).length, 0,
  'a short element agreeing with the run is not',
);
assert.equal(
  findCollinearBacktracks([run, [0, -0.01, 0], run], LIMIT).length, 0,
  'a short element perpendicular to the run is not',
);
assert.equal(
  findCollinearBacktracks([run, [-5, 0, 0], run], LIMIT).length, 0,
  'a long reversal is a modelling decision, not a backtrack',
);
assert.equal(
  findCollinearBacktracks([run, [-0.01, 0, 0]], LIMIT).length, 0,
  'without a long run on both sides there is nothing to retrace',
);
assert.equal(
  findCollinearBacktracks([[-1, 0, 0], [-0.01, 0, 0], run], LIMIT).length, 0,
  'opposing only one neighbour is a direction change, not a backtrack',
);

// --- the InputXML path is unchanged by the extraction -----------------------
const sampleXmlPath = path.join(ROOT, 'benchmarks/LFEA/BM4/InputXML_BM4.xml');
if (fs.existsSync(sampleXmlPath)) {
  const xml = fs.readFileSync(sampleXmlPath, 'utf8');
  const found = findInputXmlBacktrackingElements(xml);
  assert.equal(found.length, 3, 'BM4 InputXML carries exactly three known backtracks');
  assert.ok(found.every((entry) => entry.element !== undefined),
    'the InputXML path must still return its element records');
  const repaired = repairInputXmlCollinearBacktracks(xml);
  assert.equal(repaired.repairs.length, 3);
  assert.notEqual(repaired.xml, xml, 'the repair must actually rewrite the source');
  assert.equal(findInputXmlBacktrackingElements(repaired.xml).length, 0,
    'the repaired source must no longer trigger the rule');
}

// --- the ACCDB path reports and does not rewrite ----------------------------
const backtracking = diagnoseAccdbCollinearBacktracks([
  { ELEMENTID: 1, FROM_NODE: 10, TO_NODE: 20, DELTA_X: 1, DELTA_Y: 0, DELTA_Z: 0 },
  { ELEMENTID: 2, FROM_NODE: 20, TO_NODE: 30, DELTA_X: -0.01, DELTA_Y: 0, DELTA_Z: 0 },
  { ELEMENTID: 3, FROM_NODE: 30, TO_NODE: 40, DELTA_X: 1, DELTA_Y: 0, DELTA_Z: 0 },
]);
assert.equal(backtracking.findings.length, 1);
assert.equal(backtracking.findings[0].elementId, '2');
assert.deepEqual([...backtracking.findings[0].corrected], [0.01, -0, -0],
  'the correction is the negated translation');
assert.equal(backtracking.repairable, false,
  'ACCDB geometry is owned by the file and must never be rewritten here');
assert.ok(backtracking.repairBoundary.includes('owned by the source file'));
assert.equal(ACCDB_BACKTRACK_SHORT_LENGTH_LIMIT_M, 0.025,
  'the ACCDB limit is the same physical length as the InputXML one, in metres');

console.log(JSON.stringify({
  check: 'lfea-collinear-backtrack-rule',
  status: 'PASS',
  inputXmlSampleChecked: fs.existsSync(sampleXmlPath),
  accdbRepairable: backtracking.repairable,
}));
