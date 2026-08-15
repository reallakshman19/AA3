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
  'coupled-calculation-evidence.js',
  'audit-export.js',
];
const ADAPTER_FILES = [
  'empirical-v3-source-authority-adapter.js',
  'empirical-v3-resolution-reference-adapter.js',
  'empirical-v3-branch-component-authority-builder.js',
  'empirical-v3-stagedjson-process-basis-adapter.js',
  'empirical-v3-branch-process-resolution-adapter.js',
  'empirical-v3-authorized-source-bound-execution.js',
];
const UI_FILES = [
  'empirical-v3-safety-workbench.js',
  'empirical-v3-safety-workbench-dom.js',
  'empirical-v3-branch-basis-view.js',
  'empirical-v3-safety-gate-view.js',
  'empirical-v3-evidence-view.js',
  'empirical-v3-explain-calculation-view.js',
  'empirical-v3-view-primitives.js',
];

const forbiddenCorePatterns = [
  /fallbackResolver/i,
  /chainageDistribution/i,
  /linear-piping-results-workbench/i,
  /react\b/i,
  /acceptAll|confirmAll|bulkAccept|bulkConfirm/i,
];
const forbiddenCoreMechanicsImports = [
  /from\s+['"][^'"]*restraint-compatibility\.js['"]/i,
  /from\s+['"][^'"]*rooted-tree-component-flexibility\.js['"]/i,
  /from\s+['"][^'"]*thermal-restraint-compatibility\.js['"]/i,
  /from\s+['"][^'"]*flexibility\.js['"]/i,
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
  for (const pattern of [...forbiddenCorePatterns, ...forbiddenCoreMechanicsImports]) {
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
for (const fileName of UI_FILES) {
  assertBelowOwnerLineLimit(fileName, sourceAt(`../src/workspace/${fileName}`));
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

const evidenceSource = sourceAt('../src/core/empirical-v3-safety/coupled-calculation-evidence.js');
assert.match(evidenceSource, /\(F\+S\) R = delta_target - delta_reference/);
assert.match(evidenceSource, /delta_pipe,i = delta_reference,i \+ sum_j\(F_ij R_j\)/);
assert.match(evidenceSource, /F_ij = sum_m\(f_ij\^\(m\)\)/);
assert.match(evidenceSource, /mechanicsRecomputed:\s*false/);
assert.match(evidenceSource, /reactionRecomputed:\s*false/);
assert.match(evidenceSource, /uiOrReportMayResolveMechanics:\s*false/);
assert.doesNotMatch(evidenceSource, /solveLinear|solveRooted|calculatePrismatic|calculateCircular|assembleUnit/i);

const auditSource = sourceAt('../src/core/empirical-v3-safety/audit-export.js');
assert.match(auditSource, /calculationEvidence:\s*evidence/);
assert.doesNotMatch(auditSource, /flexibilityMatrix|reactionN|thermalReference|solve|calculate/i);

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

const executionBridge = sourceAt('../src/workspace/engineering-loads/adapters/empirical-v3-authorized-source-bound-execution.js');
assert.match(executionBridge, /assessEmpiricalV3CalculationAuthorizationCurrent/);
assert.match(executionBridge, /ROM_EXECUTION_REQUEST/);
assert.match(executionBridge, /canonical-thermal-rom-source-bound-execution\.js/);
assert.doesNotMatch(executionBridge, /canonical-thermal-rom-authority-adapter\.js|rooted-tree-component-flexibility|restraint-compatibility|calculateCircularElbow/i);
const currentGate = executionBridge.indexOf('assessEmpiricalV3CalculationAuthorizationCurrent');
const requestGate = executionBridge.indexOf('EMP_V3_EXECUTION_REQUEST_NOT_AUTHORIZED');
const frozenCall = executionBridge.indexOf('executeCanonicalSourceBoundThermalRomCompatibility(input.romInput)');
assert.ok(currentGate >= 0 && requestGate > currentGate && frozenCall > requestGate,
  'V3 authorization/currentness/request gates must precede the frozen ROM call.');

function sourceAt(path) { return readFileSync(new URL(path, import.meta.url), 'utf8'); }
function assertBelowOwnerLineLimit(fileName, source) {
  const physicalLines = source.split(/\r?\n/).length;
  assert.ok(physicalLines < 300, `${fileName} has ${physicalLines} physical lines; owner approval is required at >=300.`);
}

console.log('PASS empirical v3 source guards / anti-drift');
