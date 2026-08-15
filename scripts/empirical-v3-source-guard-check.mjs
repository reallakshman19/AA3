import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CORE_FILES = [
  'workflow-state.js',
  'quantity-authority.js',
  'risk-finding.js',
  'confirmation-receipt.js',
  'calculation-authorization.js',
  'engineering-event.js',
  'branch-authority.js',
  'component-authority.js',
];

const forbiddenCorePatterns = [
  /fallbackResolver/i,
  /chainageDistribution/i,
  /linear-piping-results-workbench/i,
  /restraint-compatibility/i,
  /rooted-tree-component-flexibility/i,
  /react\b/i,
  /acceptAll|confirmAll|bulkAccept|bulkConfirm/i,
];

for (const fileName of CORE_FILES) {
  const url = new URL(`../src/core/empirical-v3-safety/${fileName}`, import.meta.url);
  const source = readFileSync(url, 'utf8');
  const physicalLines = source.split(/\r?\n/).length;
  assert.ok(
    physicalLines < 300,
    `${fileName} has ${physicalLines} physical lines; owner approval is required at >=300.`,
  );
  for (const pattern of forbiddenCorePatterns) {
    assert.doesNotMatch(source, pattern, `${fileName} violates the Empirical V3 core authority boundary.`);
  }
}

const indexSource = readFileSync(
  new URL('../src/core/empirical-v3-safety/index.js', import.meta.url),
  'utf8',
);
for (const fileName of CORE_FILES) {
  assert.match(indexSource, new RegExp(`export \\* from './${fileName.replace('.', '\\.')}';`));
}

// Guard representative owner-locked failure modes in source vocabulary.
const authorizationSource = readFileSync(
  new URL('../src/core/empirical-v3-safety/calculation-authorization.js', import.meta.url),
  'utf8',
);
assert.match(authorizationSource, /HIGH_BLOCK/);
assert.match(authorizationSource, /pending HIGH_CONFIRM/);
assert.match(authorizationSource, /RISK_POLICY_CHANGED/);
assert.match(authorizationSource, /DEPENDENCY_IDENTITY_CHANGED/);

const branchSource = readFileSync(
  new URL('../src/core/empirical-v3-safety/branch-authority.js', import.meta.url),
  'utf8',
);
assert.match(branchSource, /requires exact topology/);
assert.match(branchSource, /Tolerance-inferred topology cannot define/);

console.log('PASS empirical v3 source guards / anti-drift');
