import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const UI_FILES = [
  'src/workspace/empirical-v3-safety-workbench.js','src/workspace/empirical-v3-safety-workbench-dom.js',
  'src/workspace/empirical-v3-branch-basis-view.js','src/workspace/empirical-v3-safety-gate-view.js',
  'src/workspace/empirical-v3-evidence-view.js','src/workspace/empirical-v3-explain-calculation-view.js',
  'src/workspace/empirical-v3-result-review-view.js','src/workspace/empirical-v3-review-audit-controller.js',
  'src/workspace/empirical-v3-view-primitives.js',
];
const forbidden = [
  /from\s+['"][^'"]*empirical-piping-mechanics/i,/from\s+['"][^'"]*canonical-thermal-rom/i,
  /restraint-compatibility\.js/i,/rooted-tree-component-flexibility\.js/i,/runLinearPipingWorkbenchAnalysis/,
  /sealEmpiricalV3CalculationAuthorization/,/solveLinear|solveRooted|assembleUnit|calculatePrismatic|calculateCircular/i,
  /acceptAll|confirmAll|bulkAccept|bulkConfirm|Accept all High/i,
];
for (const path of UI_FILES) {
  const source=sourceAt(path), lines=source.split(/\r?\n/).length;
  assert.ok(lines<300,`${path} has ${lines} physical lines; owner approval is required at >=300.`);
  for(const pattern of forbidden) assert.doesNotMatch(source,pattern,`${path} violates the V3 UI authority boundary.`);
}
const safety=sourceAt('src/workspace/empirical-v3-safety-gate-view.js');
assert.match(safety,/risk\.riskClass === 'HIGH_CONFIRM'/);assert.match(safety,/BLOCKED — no confirmation path/);assert.match(safety,/Create confirmation receipt/);assert.match(safety,/packageValue\.riskSet\.risks/);assert.match(safety,/workflow\.canRunCalculation/);assert.doesNotMatch(safety,/HIGH_BLOCK[^\n]{0,120}reviewAssumptionControl/);
const branch=sourceAt('src/workspace/empirical-v3-branch-basis-view.js');assert.match(branch,/packageValue\.riskSet\.risks/);assert.match(branch,/commonAuthorityRefs/);assert.match(branch,/localAuthorityRefs/);assert.match(branch,/Open in Safety Gate/);
const explain=sourceAt('src/workspace/empirical-v3-explain-calculation-view.js');assert.match(explain,/evidence\.equations/);assert.match(explain,/evidence\.coupledSystem\.flexibilityMatrixMPerN/);assert.match(explain,/coordinate\.pairEvidence/);assert.match(explain,/componentContributions/);assert.match(explain,/evidencePolicy\.uiOrReportMayResolveMechanics/);assert.doesNotMatch(explain,/\.reduce\(|reactionN\s*[+*/-]|flexibilityRowMPerN\s*[+*/-]/);
const reviewView=sourceAt('src/workspace/empirical-v3-result-review-view.js');assert.match(reviewView,/Record result review/);assert.match(reviewView,/Prepare audit/);assert.match(reviewView,/separate governed transition/);assert.match(reviewView,/does not change reactions, displacements, risks, or formulas/);
const reviewController=sourceAt('src/workspace/empirical-v3-review-audit-controller.js');assert.match(reviewController,/createEmpiricalV3ResultReviewReceipt/);assert.match(reviewController,/prepareAudit\(evidence\)/);assert.match(reviewController,/sealEmpiricalV3AuditReadiness/);assert.match(reviewController,/workflowState !== 'AUDIT_EXPORT_READY'/);assert.match(reviewController,/safetyPackage/);
const controller=sourceAt('src/workspace/empirical-v3-safety-workbench.js');assert.match(controller,/createEngineeringConfirmationReceipt/);assert.match(controller,/Safety Gate remains unchanged until a re-evaluated sealed package is supplied/);assert.match(controller,/VIEWPORT_SELECTION_REQUESTED/);assert.match(controller,/isRunReady\(\)/);assert.match(controller,/prepared execution custody/);assert.match(controller,/restoreDownstream/);assert.match(controller,/if\(!resultHash\)\{this\.calculationEvidence=null;this\.reviewAudit\.clear\(\);return;\}/);assert.match(controller,/CALCULATION_EVIDENCE/);assert.match(controller,/RESULT_REVIEW/);assert.match(controller,/AUDIT_READINESS/);assert.match(controller,/workflow\.state!=='RESULT_REVIEW_REQUIRED'/);assert.match(controller,/workflow\.state!=='RESULT_REVIEWED'/);assert.match(controller,/Audit readiness is a separate governed transition/);assert.match(controller,/onAuditExportRequested/);assert.match(controller,/evidence\.authorizationRef\.semanticHash===packageValue\.calculationAuthorization\.semanticHash/);
const main=sourceAt('src/main.js');assert.match(main,/mountEmpiricalV3SafetyWorkbench/);assert.match(main,/prepareEmpiricalV3SourceBoundExecution/);assert.match(main,/buildEmpiricalV3SourceBoundExecutionDependency/);assert.match(main,/executeEmpiricalV3LiveSourceBoundRun/);assert.match(main,/applyEmpiricalV3LiveResultReview/);assert.match(main,/applyEmpiricalV3LiveAuditReadiness/);assert.match(main,/reconcileEmpiricalV3LiveAuthorization/);assert.match(main,/onRunRequested/);assert.match(main,/isRunReady/);assert.match(main,/authorizationSemanticHash:\s*packageValue\.calculationAuthorization\.semanticHash/);assert.match(main,/prepared\.authorizationSemanticHash !== packageValue\.calculationAuthorization\.semanticHash/);assert.match(main,/Prepared source-bound execution request is not in the sealed calculation authorization/);assert.doesNotMatch(main,/source-bound-mixed-component-producer|rooted-tree-component-flexibility|restraint-compatibility|calculateCircularElbow|solveRootedTree/i);
function sourceAt(path){return readFileSync(new URL(`../${path}`,import.meta.url),'utf8');}
console.log('PASS empirical v3 safety / Explain / live review-audit UI source guard');