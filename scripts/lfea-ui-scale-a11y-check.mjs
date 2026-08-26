#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
  createLfeaReviewRowWindow,
  LFEA_MODEL_REVIEW_PAGE_SIZE,
} from '../src/workspace/lfea-model-review/lfea-review-row-window.js';
import {
  lfeaGeometryReviewDisplayDensity,
  LFEA_GEOMETRY_SEGMENT_LABEL_LIMIT,
} from '../src/workspace/lfea-model-review/lfea-geometry-review-svg.js';

const rows = Object.freeze(Array.from({ length: 5000 }, (_, index) => Object.freeze({
  sourceIndex: index,
  sourceFeatureId: `PIPINGELEMENT[${index}]`,
  analysisElementId: `MODEL.E${index + 1}`,
})));
const before = JSON.stringify(rows);
const started = performance.now();
const visited = [];
let pageIndex = 0;
let maximumVisible = 0;
let pageCount = null;
while (true) {
  const window = createLfeaReviewRowWindow(rows, pageIndex);
  pageCount ??= window.pageCount;
  maximumVisible = Math.max(maximumVisible, window.rows.length);
  visited.push(...window.rows.map((row) => row.analysisElementId));
  if (pageIndex >= window.pageCount - 1) {
    assert.equal(window.endRow, 5000);
    break;
  }
  pageIndex += 1;
}
const elapsedMs = performance.now() - started;
assert.equal(pageCount, 20);
assert.equal(maximumVisible, LFEA_MODEL_REVIEW_PAGE_SIZE);
assert.equal(visited.length, rows.length);
assert.deepEqual(visited, rows.map((row) => row.analysisElementId),
  'Paging must preserve every engineering row in deterministic order.');
assert.equal(JSON.stringify(rows), before, '5k paging must not mutate engineering rows.');
assert.equal(createLfeaReviewRowWindow(rows, 999).pageIndex, pageCount - 1,
  'Out-of-range page state must clamp to the last real page after source/model changes.');
assert.equal(createLfeaReviewRowWindow([], 5).pageIndex, 0);
assert.throws(() => createLfeaReviewRowWindow(rows, 0, 0), /positive integer/u);

assert.equal(lfeaGeometryReviewDisplayDensity(LFEA_GEOMETRY_SEGMENT_LABEL_LIMIT).segmentLabelsVisible, true);
assert.equal(lfeaGeometryReviewDisplayDensity(LFEA_GEOMETRY_SEGMENT_LABEL_LIMIT + 1).segmentLabelsVisible, false);
assert.equal(lfeaGeometryReviewDisplayDensity(5000).segmentLabelsVisible, false);
assert.throws(() => lfeaGeometryReviewDisplayDensity(-1), /non-negative integer/u);

const panelSource = fs.readFileSync('src/workspace/lfea-model-review/lfea-model-review-panel.js', 'utf8');
const rendererSource = fs.readFileSync('src/workspace/lfea-model-review/lfea-geometry-review-svg.js', 'utf8');
const helperSource = fs.readFileSync('src/workspace/lfea-model-review/lfea-review-row-window.js', 'utf8');
const cssSource = fs.readFileSync('src/workspace/lfea-model-review/lfea-model-review.css', 'utf8');

for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) assert.match(panelSource, new RegExp(key));
assert.match(panelSource, /setAttribute\('role', 'tabpanel'\)/u);
assert.match(panelSource, /setAttribute\('aria-controls', `\$\{idPrefix\}-tabpanel`\)/u);
assert.match(panelSource, /setAttribute\('tabindex', active \? '0' : '-1'\)/u);
assert.match(panelSource, /setAttribute\('aria-pressed', active \? 'true' : 'false'\)/u);
assert.match(panelSource, /createLfeaReviewRowWindow/u);
assert.match(panelSource, /Rows \$\{window\.startRow\}–\$\{window\.endRow\} of \$\{window\.totalRows\}/u);
assert.match(cssSource, /:focus-visible/u);
assert.match(rendererSource, /all spans\/nodes retained/u,
  'High-density SVG must disclose label suppression without suppressing engineering topology.');
assert.match(rendererSource, /for \(const segment of descriptor\.segments\)/u);
assert.match(rendererSource, /for \(const node of projected\)/u);

for (const [name, text] of [['panel', panelSource], ['renderer', rendererSource], ['row-window', helperSource]]) {
  assert.doesNotMatch(text, /(?:\.\.\/)+core\//u, `${name} must not import engineering core authority.`);
  assert.doesNotMatch(text, /bindLfeaNodeEditor|onMoveNode|conditionGeometry|compileMechanicalModel|\.setSource\(|\.clearSource\(/u,
    `${name} must remain presentation-only.`);
}

console.log(JSON.stringify({
  check: 'lfea-ui-scale-a11y',
  status: 'PASS',
  scaleFixtureElements: rows.length,
  pageSize: LFEA_MODEL_REVIEW_PAGE_SIZE,
  pages: pageCount,
  maximumRowsRenderedPerTableView: maximumVisible,
  allRowsReachable: true,
  geometrySpanLabelsAt5000: 'SUPPRESSED_FOR_DENSITY_ALL_TOPOLOGY_RETAINED',
  keyboardTabPattern: 'ARROWS_HOME_END',
  sourceMutation: false,
  focusedProjectionElapsedMs: Number(elapsedMs.toFixed(3)),
}));
