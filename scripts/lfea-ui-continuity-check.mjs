import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const registry = read('src/workspace/lfea-pipeline-step-registry.js');
const sprite = read('src/workspace/lfea-pipeline-icon-sprite.js');
const view = read('src/workspace/lfea-pipeline-shell-view.js');
const css = read('src/workspace/lfea-pipeline-shell.css');

const STEPS = [
  ['INPUT', 'icon-step-input'],
  ['ERROR_CHECK', 'icon-step-error-check'],
  ['LOAD_CASE', 'icon-step-load-case'],
  ['RUN', 'icon-step-run'],
  ['OUTPUT', 'icon-step-output'],
  ['EXPORT', 'icon-step-export'],
];

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

for (const [stepId, iconId] of STEPS) {
  assert(registry.includes(`stepId: '${stepId}'`), `registry missing ${stepId}`);
  assert(registry.includes(`iconId: '${iconId}'`), `registry missing ${stepId} icon ${iconId}`);
  assert(sprite.includes(`symbol('${iconId}'`), `sprite missing ${iconId}`);
}

for (const toolbarIcon of [
  'icon-load-sample', 'icon-authority-supplement', 'icon-code-checks', 'icon-verification', 'icon-status-complete',
]) {
  assert(sprite.includes(`symbol('${toolbarIcon}'`), `sprite missing ${toolbarIcon}`);
}

assert(!view.includes("innerHTML = '<svg"), 'shell view still embeds a hard-coded toolbar SVG');
assert(view.includes("dataset.role = 'lfea-pipeline-step-connector'"), 'step connector DOM contract missing');
assert(view.includes("dataset.role = 'lfea-pipeline-active-step-context'"), 'active-step context DOM contract missing');
assert(view.includes("host.dataset.activeStep = state.activeStepId"), 'all hosts do not retain active step identity');
assert(view.includes("completeIcon.hidden = !status.complete"), 'completion state does not preserve step identity');
assert(view.includes("indexCell.textContent = String(index + 1)"), 'step ordinal is not stable across completion');
assert(view.includes("aria-label', `${step.label} — ${stepStatus.toLowerCase()}"), 'step accessibility status label missing');
assert(css.includes('.lfea-pipeline-shell__connector[data-connector-status="COMPLETE"]'), 'complete connector styling missing');
assert(css.includes('.lfea-pipeline-shell__connector[data-connector-status="BLOCKED"]'), 'blocked connector styling missing');
assert(css.includes('.lfea-pipeline-shell__context[data-step-status="CURRENT"]'), 'active context state styling missing');

// Six steps must create five connectors. This is intentionally derived from
// the registry count rather than hard-coding five in production code.
assert(view.includes('index < LFEA_PIPELINE_STEPS.length - 1'), 'connector count is not tied to registry sequence');

if (failures.length > 0) {
  console.error('LFEA UI continuity check: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`LFEA UI continuity check: PASS (${STEPS.length} stable steps, ${STEPS.length - 1} connectors)`);
}
