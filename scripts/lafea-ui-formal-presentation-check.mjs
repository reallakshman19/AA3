import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lafeaUiStatusPresentation } from '../src/workspace/lafea-ui-status.js';

const expectations = Object.freeze({
  NOT_STARTED: ['Not started', 'neutral'],
  READY: ['Ready', 'positive'],
  WARNING: ['Attention required', 'warning'],
  BLOCKED: ['Blocked', 'critical'],
  COMPLETE: ['Complete', 'positive'],
  CURRENT_PASS: ['Qualified', 'positive'],
  CURRENT_WARNING: ['Qualified with warnings', 'warning'],
  CURRENT_BLOCK: ['Blocked', 'critical'],
  STALE: ['Stale evidence', 'warning'],
  QUALIFIED_NOT_CURRENT: ['Previous result — stale', 'warning'],
  ENGINE_NOT_IMPLEMENTED: ['Unavailable', 'neutral'],
  QUALIFIED_ROUTE_REGISTERED: ['Engine available', 'positive'],
  EXACT_HEAD_QUALIFICATION_REQUIRED: ['External qualification required', 'warning'],
  NOT_GATED: ['Informational only', 'neutral'],
  NOT_RETAINED: ['Not generated', 'neutral'],
});

for (const [canonical, [label, tone]] of Object.entries(expectations)) {
  const presentation = lafeaUiStatusPresentation(canonical);
  assert.equal(presentation.canonical, canonical);
  assert.equal(presentation.label, label);
  assert.equal(presentation.tone, tone);
}

const unknown = lafeaUiStatusPresentation('FUTURE_INTERNAL_STATE');
assert.equal(unknown.label, 'Unknown state');
assert.equal(unknown.canonical, 'FUTURE_INTERNAL_STATE');

const rendererPath = fileURLToPath(new URL('../src/workspace/lafea-guided-workflow-view.js', import.meta.url));
const renderer = readFileSync(rendererPath, 'utf8');
const informalGlyphs = ['✓', '○', '⚠', '🚫', '⚡'];
for (const glyph of informalGlyphs) {
  assert.equal(renderer.includes(glyph), false, `informal workflow glyph remains: ${glyph}`);
}
assert.equal(renderer.includes('friendlyStatus'), false, 'renderer must not reinterpret canonical status');
assert.equal(renderer.includes("friendlyStatus = 'PENDING'"), false, 'BLOCKED must not be relabelled as PENDING');
assert.match(renderer, /item\.dataset\.status = step\.status/u);
assert.match(renderer, /button\.dataset\.status = step\.status/u);
assert.match(renderer, /if \(step\.reasons\.length\)/u);
assert.match(renderer, /lafea-guided-workflow__reasons/u);

console.log('LAFEA formal UI status presentation check: PASS');
