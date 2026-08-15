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
  'presentation-package.js',
];

const ADAPTER_FILES = [
  'empirical-v3-source-authority-adapter.js',
  'empirical-v3-resolution-reference-adapter.js',
  'empirical-v3-branch-component-authority-builder.js',
  'empirical-v3-stagedjson-process-basis-adapter.js',
  'empirical-v3-branch-process-resolution-adapter.js',
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

const forbiddenAdapterImports = [
  /from\s+['"][^'"]*fallbackResolver\.js['"]/i,
  /from\s+['"][^'"]*chainageDistribution\.js['"]/i,
  /from\s+['"][^'"]*topology-edit-high-confidence-autofix/i,
  /from\s+['"][^'"]*topology-edit-checker/i,
  /from\s+['"][^'"]*linear-piping-results-workbench/i,
  /from\s+['"][^'"]*restraint-compatibility/i,
  /from\s+['"][^'"]*rooted-tree-component-flexibility/i,
];

for (const fileName of CORE_FILES) {
  const source = sourceAt(`../src/core/empirical-v3-safety/${fileName}`);
  assertBelowOwnerLineLimit(fileName, source);
  for (const pattern of forbiddenCorePatterns) {
    assert.doesNotMatch(source, pattern, `${fileName} violates the Empirical V3 core authority boundary.`);
  }
}

for (const fileName of ADAPTER_FILES) {
  const source = sourceAt(`../src/workspace/engineering-loads/adapters/${fileName}`);
  assertBelowOwnerLineLimit(fileName, source);
  for (const pattern of forbiddenAdapterImports) {
    assert.doesNotMatch(source, pattern, `${fileName} imports a prohibited legacy/UI/mechanics authority path.`);
  }
}

const indexSource = sourceAt('../src/core/empirical-v3-safety/index.js');
for (const fileName of CORE_FILES) {
  assert.match(indexSource, new RegExp(`export \\* from './${fileName.replace('.', '\\.')}';`));
}

const authorizationSource = sourceAt('../src/core/empirical-v3-safety/calculation-authorization.js');
assert.match(authorizationSource, /HIGH_BLOCK/);
assert.match(authorizationSource, /pending HIGH_CONFIRM/);
assert.match(authorizationSource, /RISK_POLICY_CHANGED/);
assert.match(authorizationSource, /DEPENDENCY_IDENTITY_CHANGED/);

const branchSource = sourceAt('../src/core/empirical-v3-safety/branch-authority.js');
assert.match(branchSource, /requires exact topology/);
assert.match(branchSource, /Tolerance-inferred topology cannot define/);

const presentationSource = sourceAt('../src/core/empirical-v3-safety/presentation-package.js');
assert.match(presentationSource, /not classify risks, resolve authorities, project workflow, or authorize a run/);
assert.match(presentationSource, /requireEngineeringRiskSet/);
assert.match(presentationSource, /requireEmpiricalV3CalculationAuthorization/);

const sourceAdapter = sourceAt('../src/workspace/engineering-loads/adapters/empirical-v3-source-authority-adapter.js');
assert.match(sourceAdapter, /_deducedWallThickness/);
assert.match(sourceAdapter, /_missingComponentWeight/);
assert.match(sourceAdapter, /DEFAULT_ZERO_NOT_ENGINEERING_AUTHORITY/);
assert.match(sourceAdapter, /INFERRED_REVIEW_REQUIRED/);

const branchBuilder = sourceAt('../src/workspace/engineering-loads/adapters/empirical-v3-branch-component-authority-builder.js');
assert.match(branchBuilder, /observedSourceBranchLabel/);
assert.match(branchBuilder, /requireAllowedKeys/);
assert.doesNotMatch(branchBuilder, /chainageDistribution|TopoFix|topologyEditConfidence/);

const stagedProcessAdapter = sourceAt('../src/workspace/engineering-loads/adapters/empirical-v3-stagedjson-process-basis-adapter.js');
assert.match(stagedProcessAdapter, /requireStagedJsonProcessAuthority/);
assert.match(stagedProcessAdapter, /observedSourceBranchId/);
assert.doesNotMatch(stagedProcessAdapter, /fallbackResolver|chainageDistribution|TopoFix/);

const branchProcessAdapter = sourceAt('../src/workspace/engineering-loads/adapters/empirical-v3-branch-process-resolution-adapter.js');
assert.match(branchProcessAdapter, /pipingClassNeedsReview/);
assert.match(branchProcessAdapter, /pipingClassMatchMethod/);
assert.match(branchProcessAdapter, /piping-class-master/);
assert.doesNotMatch(branchProcessAdapter, /resolveBranchProcessData|findBestPipingClassRow/);

function sourceAt(path) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}
function assertBelowOwnerLineLimit(fileName, source) {
  const physicalLines = source.split(/\r?\n/).length;
  assert.ok(
    physicalLines < 300,
    `${fileName} has ${physicalLines} physical lines; owner approval is required at >=300.`,
  );
}

console.log('PASS empirical v3 source guards / anti-drift');
