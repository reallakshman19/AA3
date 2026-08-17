#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const content = read('../src/workspace/lafea-workbench-content.js');
const styles = read('../src/workspace/lafea-guided-workbench-styles.js');

assert.match(content, /lafea-cae-workspace/u);
assert.match(content, /lafea-cae-workspace__viewport/u);
assert.match(content, /lafea-cae-workspace__inspector/u);
assert.match(content, /lafea-cae-workspace__context/u);
assert.match(content, /viewportPane\.append\(viewportCard\.section\)/u);
assert.match(content, /inspectorPane\.append\(discretizationCard\.section, preflightCard\.section\)/u);
assert.match(content, /main\.append\(nextActionBanner, engineeringOverview, caeWorkspace, context\)/u);

assert.match(styles, /grid-template-columns:minmax\(0,1fr\) minmax\(300px,340px\)/u);
assert.match(styles, /lafea-cae-workspace__viewport-card .*min-height:440px/u);
assert.match(styles, /@media\(max-width:1100px\).*lafea-cae-workspace\{grid-template-columns:1fr\}/su);
assert.match(styles, /@media\(max-width:900px\).*lafea-guided-shell\{grid-template-columns:1fr\}/su);
assert.doesNotMatch(styles, /lafea-guided-shell__main\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/u);

console.log(JSON.stringify({
  check: 'lafea-ui2-cae-workspace',
  status: 'PASS',
  viewportPrimary: true,
  inspectorWidth: '300-340px desktop',
  desktopViewportMinimumHeight: 440,
  stackedInspectorBreakpoint: 1100,
}, null, 2));

function read(relative) {
  return fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
}
