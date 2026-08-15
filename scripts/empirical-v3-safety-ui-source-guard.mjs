import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const UI_FILES = [
  'src/workspace/empirical-v3-safety-workbench.js',
  'src/workspace/empirical-v3-branch-basis-view.js',
  'src/workspace/empirical-v3-safety-gate-view.js',
  'src/workspace/empirical-v3-evidence-view.js',
  'src/workspace/empirical-v3-view-primitives.js',
];
const forbidden = [
  /restraint-compatibility/i,
  /rooted-tree-component-flexibility/i,
  /empirical-piping-mechanics\/formulas/i,
  /runLinearPipingWorkbenchAnalysis/,
  /sealEmpiricalV3CalculationAuthorization/,
  /acceptAll|confirmAll|bulkAccept|bulkConfirm|Accept all High/i,
];

for (const path of UI_FILES) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const physicalLines = source.split(/\r?\n/).length;
  assert.ok(physicalLines < 300, `${path} has ${physicalLines} physical lines; owner approval is required at >=300.`);
  for (const pattern of forbidden) assert.doesNotMatch(source, pattern, `${path} violates the V3 UI authority boundary.`);
}

const safety = readFileSync(
  new URL('../src/workspace/empirical-v3-safety-gate-view.js', import.meta.url),
  'utf8',
);
assert.match(safety, /risk\.riskClass === 'HIGH_CONFIRM'/);
assert.match(safety, /BLOCKED — no confirmation path/);
assert.match(safety, /Create confirmation receipt/);
assert.match(safety, /packageValue\.riskSet\.risks/);
assert.match(safety, /workflow\.canRunCalculation/);
assert.doesNotMatch(safety, /HIGH_BLOCK[^\n]{0,120}reviewAssumptionControl/);

const branch = readFileSync(
  new URL('../src/workspace/empirical-v3-branch-basis-view.js', import.meta.url),
  'utf8',
);
assert.match(branch, /packageValue\.riskSet\.risks/);
assert.match(branch, /commonAuthorityRefs/);
assert.match(branch, /localAuthorityRefs/);
assert.match(branch, /Open in Safety Gate/);

const controller = readFileSync(
  new URL('../src/workspace/empirical-v3-safety-workbench.js', import.meta.url),
  'utf8',
);
assert.match(controller, /createEngineeringConfirmationReceipt/);
assert.match(controller, /The current Safety Gate remains unchanged until the domain supplies a re-evaluated sealed package/);
assert.match(controller, /VIEWPORT_SELECTION_REQUESTED/);
assert.match(controller, /onRunRequested/);

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
assert.match(main, /mountEmpiricalV3SafetyWorkbench/);
assert.match(main, /loadEmpiricalV3SafetyPresentationPackage/);
assert.doesNotMatch(main, /onRunRequested\s*:/, 'execution bridge must remain unwired in this UI-only stage');

console.log('PASS empirical v3 safety UI source guard');
