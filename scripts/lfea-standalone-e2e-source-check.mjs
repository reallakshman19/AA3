import assert from 'node:assert/strict';
import fs from 'node:fs';

const spec = fs.readFileSync('e2e/lfea-standalone.spec.js', 'utf8');
const fixture = fs.readFileSync('e2e/fixtures/lfea-standalone-inputxml-fixtures.js', 'utf8');
const layout = fs.readFileSync('src/lfea/standalone-layout.js', 'utf8');
const runner = fs.readFileSync('scripts/run-lfea-standalone-e2e.mjs', 'utf8');

assert.match(spec, /page\.goto\('\/lfea\.html'\)/u);
assert.match(spec, /lafea-consumer-root/u);
assert.match(spec, /lfea-consumer-root/u);
assert.match(spec, /Run native analysis/u);
assert.match(spec, /Create current evidence dossier/u);
assert.match(spec, /CURRENT_EVIDENCE_ONLY/u);
assert.match(spec, /GOVERNED_INTERFACE_SET_REQUIRED/u);
assert.match(spec, /COMPONENT_CODE_POINT_RECOVERY_REQUIRED/u);
assert.match(spec, /NOT_DIRECTLY_COMPARABLE/u);
assert.match(spec, /BASIS_MISMATCH/u);
assert.match(spec, /Recent source metadata only/u);
assert.match(spec, /Re-import is required/u);
assert.match(spec, /malformed source cannot become runnable engineering authority/u);
assert.doesNotMatch(spec, /LfeaApplication\.|AnalysisWorkspace\.|evaluate\([^)]*Lfea|window\.Lfea|globalThis\.Lfea/u);
assert.doesNotMatch(spec, /dispatchEvent|EventBus|localStorage|sessionStorage/u);
assert.doesNotMatch(spec, /controller|private|_store|_state/u);
assert.doesNotMatch(fixture, /support.?action|B31|utilization|allowable/iu);
assert.match(layout, /lfea-native-verification-root/u);
assert.match(runner, /e2e\/lfea-standalone\.spec\.js/u);

for (const [name, source] of [['spec', spec], ['fixture', fixture]]) {
  const lines = source.split(/\r?\n/u).length;
  assert.ok(lines < 300, `${name} exceeds CodingRules module budget: ${lines}`);
}

console.log(JSON.stringify({
  check: 'lfea-standalone-e2e-source',
  status: 'PASS',
  standaloneEntry: true,
  publicUiOnly: true,
  workflowChangesRequired: false,
}));
