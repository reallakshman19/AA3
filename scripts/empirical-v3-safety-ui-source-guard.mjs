import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const UI_FILES = [
  'src/workspace/empirical-v3-safety-workbench.js',
  'src/workspace/empirical-v3-safety-workbench-dom.js',
  'src/workspace/empirical-v3-branch-basis-view.js',
  'src/workspace/empirical-v3-safety-gate-view.js',
  'src/workspace/empirical-v3-evidence-view.js',
  'src/workspace/empirical-v3-explain-calculation-view.js',
  'src/workspace/empirical-v3-view-primitives.js',
];
const forbidden = [
  /from\s+['"][^'"]*empirical-piping-mechanics/i,
  /from\s+['"][^'"]*canonical-thermal-rom/i,
  /restraint-compatibility\.js/i,
  /rooted-tree-component-flexibility\.js/i,
  /runLinearPipingWorkbenchAnalysis/,
  /sealEmpiricalV3CalculationAuthorization/,
  /solveLinear|solveRooted|assembleUnit|calculatePrismatic|calculateCircular/i,
  /acceptAll|confirmAll|bulkAccept|bulkConfirm|Accept all High/i,
];

for (const path of UI_FILES) {
  const source = sourceAt(path);
  const physicalLines = source.split(/\r?\n/).length;
  assert.ok(physicalLines < 300, `${path} has ${physicalLines} physical lines; owner approval is required at >=300.`);
  for (const pattern of forbidden) assert.doesNotMatch(source, pattern, `${path} violates the V3 UI authority boundary.`);
}

const safety = sourceAt('src/workspace/empirical-v3-safety-gate-view.js');
assert.match(safety, /risk\.riskClass === 'HIGH_CONFIRM'/);
assert.match(safety, /BLOCKED — no confirmation path/);
assert.match(safety, /Create confirmation receipt/);
assert.match(safety, /packageValue\.riskSet\.risks/);
assert.match(safety, /workflow\.canRunCalculation/);
assert.doesNotMatch(safety, /HIGH_BLOCK[^\n]{0,120}reviewAssumptionControl/);

const branch = sourceAt('src/workspace/empirical-v3-branch-basis-view.js');
assert.match(branch, /packageValue\.riskSet\.risks/);
assert.match(branch, /commonAuthorityRefs/);
assert.match(branch, /localAuthorityRefs/);
assert.match(branch, /Open in Safety Gate/);

const explain = sourceAt('src/workspace/empirical-v3-explain-calculation-view.js');
assert.match(explain, /evidence\.equations/);
assert.match(explain, /evidence\.coupledSystem\.flexibilityMatrixMPerN/);
assert.match(explain, /coordinate\.pairEvidence/);
assert.match(explain, /componentContributions/);
assert.match(explain, /evidencePolicy\.uiOrReportMayResolveMechanics/);
assert.doesNotMatch(explain, /\.reduce\(|reactionN\s*[+*/-]|flexibilityRowMPerN\s*[+*/-]/);

const controller = sourceAt('src/workspace/empirical-v3-safety-workbench.js');
assert.match(controller, /createEngineeringConfirmationReceipt/);
assert.match(controller, /Safety Gate remains unchanged until a re-evaluated sealed package is supplied/);
assert.match(controller, /VIEWPORT_SELECTION_REQUESTED/);
assert.match(controller, /onRunRequested/);
assert.match(controller, /requireEmpiricalV3CoupledCalculationEvidence/);
assert.match(controller, /createEmpiricalV3AuditJsonExport/);
assert.match(controller, /evidence\.authorizationRef\.semanticHash === packageValue\.calculationAuthorization\.semanticHash/);

const main = sourceAt('src/main.js');
assert.match(main, /mountEmpiricalV3SafetyWorkbench/);
assert.match(main, /loadEmpiricalV3SafetyPresentationPackage/);
assert.match(main, /executeEmpiricalV3SourceBoundThermalRom/);
assert.match(main, /buildEmpiricalV3SourceBoundExecutionDependency/);
assert.match(main, /createEmpiricalV3AuditExportRecord/);
assert.doesNotMatch(main, /onRunRequested\s*:/, 'UI Run button must not guess or synthesize execution inputs.');

function sourceAt(path) { return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'); }

console.log('PASS empirical v3 safety / Explain UI source guard');
