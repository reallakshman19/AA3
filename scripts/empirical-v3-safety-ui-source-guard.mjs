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

const main=sourceAt('src/main.js');
for(const pattern of[/mountEmpiricalV3SafetyWorkbench/,/prepareEmpiricalV3SourceBoundExecution/,/buildEmpiricalV3SourceBoundExecutionDependency/,/applyEmpiricalV3LiveResultReview/,/applyEmpiricalV3LiveAuditReadiness/,/reconcileEmpiricalV3LiveAuthorization/,/onRunRequested/,/isRunReady/,/EMPIRICAL_V3_ANALYSIS_CAPABILITY_ID/,/WORKSPACE_ANALYSIS_TARGET_ID/,/ANALYSIS_SESSION_OPEN_REQUESTED/,/ANALYSIS_REQUESTED/,/ANALYSIS_COMPLETED/,/ANALYSIS_FAILED/,/runPreparedEmpiricalV3ThroughAnalysisCoordinator/,/authorizationSemanticHash:\s*packageValue\.calculationAuthorization\.semanticHash/,/Prepared source-bound execution request is not in the sealed calculation authorization/,/WORKSPACE_SNAPSHOT_CHANGED/,/project-data-changed/,/master-data-changed/,/invalidateEmpiricalV3ForGoverningChange/,/empiricalV3Safety\.clear\(\)/,/requireExecutionDependencyMatchesActiveWorkspace\(dependency\)/,/requestDataset\.datasetId === active\[0\]/,/requestDataset\.sourceSemanticHash === active\[3\]/,/requestDataset\.sharedModelSemanticHash === activeSharedModelSemanticHash/,/getSharedModel\(\)\?\.semanticHash/])assert.match(main,pattern);
assert.doesNotMatch(main,/executeEmpiricalV3LiveSourceBoundRun/,'Browser shell must not execute V3 directly; AnalysisCoordinator owns Run lifecycle.');
assert.doesNotMatch(main,/empirical-v3-(?:authorized-mixed-component-execution|live-mixed-run-orchestration)|source-bound-mixed-(?:component-producer|restraint-binding)|rooted-tree-component-flexibility|restraint-compatibility|calculateCircularElbow|solveRootedTree/i,'Mixed execution remains outside browser runtime until separately authorized for UI enablement.');

const capability=sourceAt('src/workspace/engineering-loads/adapters/empirical-v3-analysis-capability.js');
for(const pattern of[/EMPIRICAL_V3_ANALYSIS_CAPABILITY_ID/,/QUALIFIED_ANALYTICAL/,/WORKSPACE_ANALYSIS_TARGET_ID/,/executeEmpiricalV3LiveSourceBoundRun/,/createSolverResultContract/,/calculationAuthorizationSemanticHash/,/executionRequestSemanticHash/,/workspaceVersion/])assert.match(capability,pattern);
assert.doesNotMatch(capability,/rooted-tree-component-flexibility|restraint-compatibility|calculatePrismatic|calculateCircularElbow|solveRootedTree/i,'Governed capability may call only the existing V3 live execution bridge, not mechanics directly.');

const capabilities=sourceAt('src/workspace/analysis-capabilities.js');assert.match(capabilities,/register\(empiricalV3AnalysisCapability\)/);
const coordinator=sourceAt('src/workspace/analysis-coordinator.js');assert.match(coordinator,/WORKSPACE_ANALYSIS_TARGET_ID/);assert.match(coordinator,/assertSessionMatchesContext/);assert.match(coordinator,/registry\.readiness/);assert.match(coordinator,/registry\.execute/);assert.match(coordinator,/validateSolverResultContract/);
const sessionController=sourceAt('src/workspace/analysis-session-controller.js');assert.match(sessionController,/session\.targetId !== WORKSPACE_ANALYSIS_TARGET_ID/);
const analysisContext=sourceAt('src/workspace/analysis-context.js');assert.match(analysisContext,/WORKSPACE_ANALYSIS_TARGET_ID/);assert.match(analysisContext,/analysisScope: 'WORKSPACE'/);

function sourceAt(path){return readFileSync(new URL(`../${path}`,import.meta.url),'utf8');}
console.log('PASS empirical v3 safety / Explain / governed analysis UI source guard');
