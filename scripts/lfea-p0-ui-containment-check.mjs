import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = process.env.LFEA_P0_CHECK_ROOT
  ? path.resolve(process.env.LFEA_P0_CHECK_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const source = (relativePath) => implementationText(
  fs.readFileSync(path.join(REPOSITORY_ROOT, relativePath), 'utf8'),
);

const layout = source('src/workspace/workspace-layout.js');
const bootstrap = source('src/workspace/bootstrap.js');
const client = source('src/workspace/lfea-worker-client.js');
const worker = source('src/workspace/lfea-worker.js');
const controller = source('src/workspace/lfea-workbench-controller.js');
const documentStore = source('src/workspace/lfea-workbench-document-store.js');
const styles = source('src/workspace/lfea-workbench-styles.js');
const store = [
  source('src/workspace/lfea-workbench-store.js'),
  source('src/workspace/lfea-workbench-run-store.js'),
].join('\n');
const view = source('src/workspace/lfea-workbench-view.js');
const panels = source('src/workspace/lfea-workbench-panels.js');

assert.equal(occurrences(layout, 'data-role="lafea-consumer-root"'), 1,
  'workspace layout must contain exactly one LAFEA consumer root');
assert.equal(occurrences(layout, 'data-role="lfea-consumer-root"'), 1,
  'workspace layout must contain exactly one LFEA consumer root');
assert.match(layout, /application-view application-view--lafea[^>]*data-application-view="LAFEA"/u);
assert.match(layout, /application-view application-view--lfea[^>]*data-application-view="LFEA"/u);

assert.match(bootstrap,
  /const lafeaRoot = requireUniqueRoot\(rootElement, '\[data-role="lafea-consumer-root"\]'\)/u);
assert.match(bootstrap,
  /const lfeaRoot = requireUniqueRoot\(rootElement, '\[data-role="lfea-consumer-root"\]'\)/u);
assert.match(bootstrap, /new LafeaWorkbenchController\(lafeaRoot,/u);
assert.match(bootstrap, /new LfeaWorkbenchController\(lfeaRoot,/u);
assert.match(bootstrap, /if \(lafeaRoot === lfeaRoot \|\| lafeaRoot === empiricalRoot \|\| lfeaRoot === empiricalRoot\)/u);

for (const field of ['runId', 'inputSemanticHash', 'inputModelVersion']) {
  assert.match(client, new RegExp(`\\.\\.\\.current\\.identity|${field}`, 'u'),
    `worker client request must contain ${field}`);
  assert.match(worker, new RegExp(field, 'u'),
    `worker events must contain ${field}`);
}
assert.match(worker, /type: 'PROGRESS'[\s\S]*?\.\.\.identity/u);
assert.match(worker, /type: 'COMPLETE'[\s\S]*?\.\.\.identity/u);
assert.match(worker, /type: 'FAILURE'[\s\S]*?\.\.\.identity/u);
assert.match(client, /type: 'CANCELLED'[\s\S]*?\.\.\.current\.identity/u);

assert.match(store, /message\?\.runId !== activeRun\.runId/u);
assert.match(store, /message\?\.inputSemanticHash !== activeRun\.inputSemanticHash/u);
assert.match(store, /message\?\.inputModelVersion !== activeRun\.inputModelVersion/u);
assert.match(store, /state\.packageValue\?\.semanticHash !== activeRun\.inputSemanticHash/u);
assert.match(store, /LFEA_STALE_RESULT_REJECTED/u);
assert.match(store, /LFEA_RUN_CANCELLED_MODEL_CHANGED/u);
assert.match(store, /beforeCommittedMutation\(activeRun\)/u);

assert.match(
  store,
  /function run\(optionsOverride = pipelineOptions\)[\s\S]*?const running = beginRun\(\);[\s\S]*?return executeActiveRun\(running\.activeRun, optionsOverride\)/u,
  'standalone synchronous run must delegate through the identity-safe started-run executor',
);
assert.match(
  store,
  /function executeActiveRun\(identity, optionsOverride = pipelineOptions\)[\s\S]*?!running\.activeRun \|\| !sameRunIdentity\(identity, running\.activeRun\)[\s\S]*?executeLfeaWorkbench\([\s\S]*?requirePackage\(running\),[\s\S]*?optionsOverride/u,
  'started synchronous execution must verify active run identity before consuming explicit/current options',
);
assert.doesNotMatch(
  controller,
  /if \(!this\.workerClient\) return this\.store\.run\(\)/u,
  'no-Worker controller path must not execute begin/solve/complete in one unpaintable task',
);
assert.match(
  controller,
  /if \(!this\.workerClient\) \{[\s\S]*?const running = this\.store\.beginRun\(\);[\s\S]*?const identity = running\.activeRun;[\s\S]*?await yieldRunFeedbackFrame\(this\.documentRef\);[\s\S]*?return this\.store\.executeActiveRun\(identity, this\.pipelineOptions\)/u,
  'no-Worker path must publish RUNNING, yield a real feedback boundary, then execute the same captured identity with current options',
);
assert.match(
  controller,
  /cancelRun\(\) \{[\s\S]*?if \(!this\.workerClient\) return this\.store\.cancelRun\(\)/u,
  'no-Worker queued run must be cancellable through store cancellation',
);
assert.match(
  controller,
  /function yieldRunFeedbackFrame\(documentRef\)[\s\S]*?requestAnimationFrame[\s\S]*?scheduleTask\(resolve, 0\)/u,
  'browser fallback must use a real frame/task opportunity rather than a microtask-only yield',
);

assert.match(
  documentStore,
  /function reportEditError\(path, index, error, fallbackCode = 'LFEA_RECORD_EDIT_REJECTED'\)[\s\S]*?typeof error\?\.code === 'string'[\s\S]*?reported\.code = error\.code[\s\S]*?reported,[\s\S]*?fallbackCode/u,
  'edit-error reporting must retain a supplied diagnostic code and allow operation-specific fallback classification',
);
assert.match(
  controller,
  /reportEditError\('document', null, error, 'LFEA_IMPORT_REJECTED'\)/u,
  'file-input parse/read failures must be classified as import failures',
);
assert.match(
  controller,
  /reportEditError\('document', null, error, 'LFEA_EDIT_REJECTED'\)/u,
  'document textarea parse failures must be classified as local document edits',
);

assert.match(
  documentStore,
  /!isCurrentExecution\(state\)[\s\S]*?state\.execution\?\.evidenceExport\?\.status !== 'QUALIFIED_EXPORT'[\s\S]*?throw new TypeError\('Qualified LFEA evidence export is unavailable\.'\)/u,
  'store must retain the independent current-qualified evidence export boundary',
);
assert.match(
  controller,
  /downloadEvidence\(\) \{[\s\S]*?try \{[\s\S]*?const value = this\.exportEvidence\(\);[\s\S]*?downloadLfeaJson\(this\.documentRef, value, 'lfea-evidence-export\.json'\);[\s\S]*?return value;[\s\S]*?\} catch \(error\) \{[\s\S]*?reportEditError\([\s\S]*?'evidenceExport',[\s\S]*?error,[\s\S]*?'LFEA_EVIDENCE_EXPORT_REJECTED'/u,
  'controller evidence download must catch qualification/downloader failures and publish a stable rejection diagnostic',
);

assert.match(view, /deformation:\s*\{[\s\S]*?enabled:[\s\S]*?scale: state\.display\.deformationScale/u);
assert.match(view, /state\.display\.resultMode/u);

assert.doesNotMatch(
  view,
  /errorMsg\.includes|\.includes\('lfea-mesh-package\/v1'\)|\.includes\('schema'\)/u,
  'failure guidance must not be selected by raw diagnostic-message substring matching',
);
assert.match(
  view,
  /header\.append\(this\.failureBanner\(state\.diagnostics\)\)/u,
  'FAILED header must route diagnostics through structured failure presentation',
);
assert.match(
  view,
  /errorBanner\.dataset\.code = presentation\.code[\s\S]*?errorBanner\.title = presentation\.codes\.join/u,
  'failure banner must retain primary and aggregate diagnostic-code traceability',
);
assert.match(
  view,
  /Diagnostic \$\{presentation\.code\}: \$\{presentation\.detail\}/u,
  'failure banner must retain original technical diagnostic detail',
);
assert.match(view, /code === 'LFEA_EVIDENCE_EXPORT_REJECTED'/u);
assert.match(view, /Only current QUALIFIED_EXPORT evidence may be downloaded/u);
assert.match(view, /failed path is not treated as a successful evidence export/u);
assert.match(view, /code === 'STALE_PACKAGE_SEMANTIC_HASH'/u);
assert.match(view, /PACKAGE_SHAPE_CODES\.has\(code\)/u);
assert.match(view, /code\.startsWith\('UNSUPPORTED_'\)/u);
assert.match(view, /ENGINEERING_VALUE_CODES\.has\(code\)/u);
assert.match(view, /LOCAL_EDIT_CODES\.has\(code\)/u);
assert.match(view, /Imported semantic hashes are intentionally not repaired/u);
assert.match(view, /will not silently coerce unsupported engineering authority/u);

assert.match(
  panels,
  /export function renderLfeaAnalysisSettings\(root, packageValue\)[\s\S]*?wrapper\.dataset\.role = 'lfea-analysis-settings'/u,
  'workbench must expose a dedicated read-only analysis settings/authority panel',
);
assert.match(
  panels,
  /new Set\(\(packageValue\.elements \?\? \[\]\)[\s\S]*?row\?\.elementType[\s\S]*?\.sort\(\)/u,
  'analysis settings must derive a deterministic set of actual element families, including mixed meshes',
);
for (const label of [
  'Package',
  'Units identity',
  'Coordinate system',
  'Element families',
  'Formulation',
  'Solver profile',
  'Profile version',
  'Solver backend',
  'Length unit',
  'Force unit',
  'Stress unit',
  'DOF order',
  'Constraint method',
]) {
  assert.match(panels, new RegExp(`appendSetting\\(root, list, '${label.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}'`, 'u'),
    `analysis settings must render ${label}`);
}
assert.match(panels, /return 'Not declared'/u);
assert.match(
  view,
  /card\(this\.rootElement, 'Analysis settings and authority'\)[\s\S]*?renderLfeaAnalysisSettings\(this\.rootElement, state\.packageValue\)[\s\S]*?settingsCard\.section/u,
  'view must mount the read-only analysis settings card from committed package state',
);

for (const code of [
  'AUTHORITATIVE_RAW_ELEMENT_OR_INTEGRATION_POINT_STRESS',
  'NON_AUTHORITATIVE_REVIEW_PROJECTION',
  'NOT_GENERATED',
  'PROHIBITED',
]) {
  assert.match(panels, new RegExp(code, 'u'), `authority label map must cover ${code}`);
}
assert.match(panels, /Raw element\/integration-point stress is the qualified stress authority/u);
assert.match(panels, /Projected nodal stress is a non-authoritative review projection/u);
assert.match(panels, /Projected stress is prohibited for convergence evidence/u);
assert.match(
  panels,
  /value\.dataset\.rawStressPolicy = rawCode[\s\S]*?value\.dataset\.projectedStressPolicy = projectedCode[\s\S]*?value\.dataset\.projectedStressConvergencePolicy = convergenceCode[\s\S]*?value\.title = `Raw=\$\{rawCode\}; Projected=\$\{projectedCode\}; ProjectedForConvergence=\$\{convergenceCode\}`/u,
  'human authority text must retain the raw policy codes for technical traceability',
);

for (const status of [
  'WITHIN_CAPACITY',
  'EXPORT_LIKELY_TO_EXCEED_BYTE_CAPACITY',
  'BLOCKED_BY_DECLARED_CAPACITY',
]) {
  assert.match(panels, new RegExp(status, 'u'), `preflight label map must cover ${status}`);
}
assert.match(panels, /WITHIN_CAPACITY: 'Within declared capacity'/u);
assert.match(panels, /EXPORT_LIKELY_TO_EXCEED_BYTE_CAPACITY: 'Capacity warning'/u);
assert.match(panels, /BLOCKED_BY_DECLARED_CAPACITY: 'Capacity blocked'/u);
assert.match(
  panels,
  /Preflight \$\{preflightStatusLabel\(status\)\}[\s\S]*?value\.dataset\.status = status;[\s\S]*?value\.title = `Preflight status: \$\{status\}`/u,
  'preflight must lead with a human label while retaining raw status metadata/title',
);

assert.match(
  view,
  /function recordJsonValidity\(text\)[\s\S]*?JSON\.parse\(text\)[\s\S]*?!value \|\| typeof value !== 'object' \|\| Array\.isArray\(value\)[\s\S]*?NOT_JSON_OBJECT[\s\S]*?INVALID_JSON/u,
  'record inline validity must mirror JSON-object syntax/shape screening without claiming schema validation',
);
assert.match(
  view,
  /const syncValidity = \(\) => \{[\s\S]*?recordJsonValidity\(textarea\.value\)[\s\S]*?textarea\.setAttribute\('aria-invalid', String\(!result\.valid\)\)[\s\S]*?add\.disabled = !result\.valid;[\s\S]*?update\.disabled = this\.selectedIndex < 0 \|\| !result\.valid/u,
  'record validity must drive aria-invalid and Add/Update availability',
);
assert.match(view, /textarea\.addEventListener\('input', syncValidity\);[\s\S]*?syncValidity\(\)/u);
assert.match(view, /validity\.dataset\.role = 'lfea-record-validation'/u);
assert.match(view, /Engineering fields are checked when the record is submitted/u);
assert.match(styles, /textarea\[aria-invalid="true"\]\{border-color:#f87171/u);
assert.match(styles, /lfea-workbench__record-validation\[data-valid="false"\]\{color:#fca5a5/u);

assert.match(
  controller,
  /undo\(\) \{[\s\S]*?const state = this\.store\.getState\(\);[\s\S]*?!confirmQualifiedEvidenceReset\(this\.documentRef, state, 'Undo'\)[\s\S]*?return state;[\s\S]*?return this\.store\.undo\(\)/u,
  'Undo must leave state untouched when a qualified-evidence reset warning is cancelled',
);
assert.match(
  controller,
  /redo\(\) \{[\s\S]*?const state = this\.store\.getState\(\);[\s\S]*?!confirmQualifiedEvidenceReset\(this\.documentRef, state, 'Redo'\)[\s\S]*?return state;[\s\S]*?return this\.store\.redo\(\)/u,
  'Redo must leave state untouched when a qualified-evidence reset warning is cancelled',
);
assert.match(
  controller,
  /function confirmQualifiedEvidenceReset\(documentRef, state, actionLabel\)[\s\S]*?state\.execution\?\.status !== 'QUALIFIED'[\s\S]*?documentRef\?\.defaultView\?\.confirm[\s\S]*?current qualified analysis execution, review, and evidence/u,
  'history warning must be scoped to qualified execution and state the evidence consequence',
);

assert.doesNotMatch(
  view,
  /lfea-collection-mock|Load Collection Mock Data|Reload Mock for/u,
  'records-card controls must not expose a collection-labelled whole-package mock action',
);
assert.match(
  panels,
  /workbenchButton\(root, '\[SIMULATED\] Load Mock Data', handlers\.onMock\)/u,
  'the explicit toolbar whole-package mock action must remain available',
);
assert.match(panels, /mock\.dataset\.role = 'lfea-mock'/u);

assert.match(
  view,
  /this\.captureEditorDrafts\(\);[\s\S]*?this\.syncDraftModelIdentity\(state\);[\s\S]*?this\.slots\.content\.replaceChildren/u,
  'editor drafts must be captured and identity-checked before content replacement',
);
assert.match(view, /this\.documentDraft = null;/u);
assert.match(view, /this\.recordDrafts = new Map\(\);/u);
assert.match(view, /state\.modelVersion \?\? 'NONE'/u);
assert.match(view, /state\.packageValue\?\.semanticHash \?\? 'NONE'/u);
assert.match(
  view,
  /nextIdentity !== this\.modelIdentity[\s\S]*?this\.documentDraft = null;[\s\S]*?this\.recordDrafts\.clear\(\)/u,
  'a committed model-identity change must invalidate package and record drafts',
);
assert.match(
  view,
  /textarea\.value = this\.documentDraft \?\? committedText/u,
  'package editor must restore an uncommitted draft when model identity is unchanged',
);
assert.match(
  view,
  /textarea\.dataset\.draftKey = draftKey[\s\S]*?this\.recordDrafts\.get\(draftKey\) \?\? committedText/u,
  'record editor must restore the draft for the active collection/selection context',
);

assert.match(
  view,
  /const deletedIndex = this\.selectedIndex;[\s\S]*?this\.selectedIndex = -1;[\s\S]*?this\.handlers\.onDeleteRecord\(this\.collectionPath, deletedIndex\)/u,
  'delete must clear local selection before invoking a synchronous model mutation',
);
assert.match(
  view,
  /this\.committedModelIdentity\(nextState\) === previousIdentity[\s\S]*?this\.selectedIndex = deletedIndex;[\s\S]*?this\.render\(nextState\)/u,
  'a rejected identity-preserving delete must restore the prior selection and draft context',
);

if (process.env.LFEA_P0_SOURCE_ONLY !== '1') await runStoreChecks();

console.log(JSON.stringify({
  check: 'lfea-p0-ui-containment',
  status: 'PASS',
  repositoryRoot: REPOSITORY_ROOT,
  uniqueRoots: true,
  distinctBootstrapSelectors: true,
  workerRunIdentity: true,
  staleCompletionGuard: true,
  editDuringRunCancellation: true,
  explicitDeformationScale: true,
  noWorkerRunFeedbackGuarded: true,
  noWorkerCurrentOptionsGuarded: true,
  noWorkerQueuedCancellationGuarded: true,
  structuredFailureGuidanceGuarded: true,
  diagnosticCodePreservationGuarded: true,
  evidenceExportFailClosedGuarded: true,
  analysisSettingsAuthorityGuarded: true,
  authorityPolicyHumanLabelsGuarded: true,
  preflightHumanLabelsGuarded: true,
  recordJsonInlineValidityGuarded: true,
  qualifiedEvidenceHistoryWarningGuarded: true,
  collectionMockScopeSafe: true,
  editorDraftPersistenceGuarded: true,
  deleteSelectionSequencingGuarded: true,
}));

function occurrences(text, needle) {
  return text.split(needle).length - 1;
}

function implementationText(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/(^|[^:])\/\/.*$/gmu, '$1');
}

async function runStoreChecks() {
  const { rectangularQ4Package } = await import('./lfea-005-fixtures.mjs');
  const {
    assertLfeaWorkbenchStateInvariants,
    createLfeaWorkbenchStore,
  } = await import('../src/workspace/lfea-workbench-store.js');
  const packageValue = rectangularQ4Package({});

  const editStore = createLfeaWorkbenchStore({ initialDocument: packageValue });
  const originalHash = editStore.getState().packageValue.semanticHash;
  editStore.beginRun();
  const nodeIndex = editStore.getState().packageValue.nodes.findIndex((row) => row.nodeId === 'N2');
  const node = editStore.getState().packageValue.nodes[nodeIndex];
  editStore.updateRecord('nodes', nodeIndex, { ...node, x: node.x + 0.01 });
  assert.equal(editStore.getState().status, 'READY');
  assert.equal(editStore.getState().activeRun, null);
  assert.equal(editStore.getState().execution, null);
  assert.notEqual(editStore.getState().packageValue.semanticHash, originalHash);
  assert.equal(editStore.getState().diagnostics[0].code, 'LFEA_RUN_CANCELLED_MODEL_CHANGED');

  const previewStore = createLfeaWorkbenchStore({ initialDocument: packageValue });
  const previewRun = previewStore.beginRun().activeRun;
  previewStore.previewNodeMove('N2', 2.01, 0);
  assert.equal(previewStore.getState().activeRun.runId, previewRun.runId);
  assert.equal(previewStore.getState().packageValue.semanticHash, originalHash);
  assert.equal(previewStore.getState().modelVersion, 1);

  const displayStore = createLfeaWorkbenchStore({ initialDocument: packageValue });
  displayStore.setResultMode('DEFORMED');
  assert.equal(displayStore.getState().display.resultMode, 'MODEL');
  assert.equal(displayStore.getState().diagnostics[0].code, 'LFEA_DEFORMED_UNAVAILABLE');
  assert.equal(displayStore.run().status, 'QUALIFIED');
  const beforeScale = displayStore.getState();
  displayStore.setDeformationScale(25);
  const afterScale = displayStore.getState();
  assert.equal(afterScale.packageValue.semanticHash, beforeScale.packageValue.semanticHash);
  assert.equal(afterScale.modelVersion, beforeScale.modelVersion);
  assert.equal(afterScale.past.length, beforeScale.past.length);
  assert.equal(afterScale.execution.runId, beforeScale.execution.runId);
  assert.equal(afterScale.display.deformationScale, 25);
  displayStore.setResultMode('DEFORMED');
  assert.equal(displayStore.getState().display.resultMode, 'DEFORMED');
  assert.equal(assertLfeaWorkbenchStateInvariants(displayStore.getState()), true);

  const staleStore = createLfeaWorkbenchStore({ initialDocument: packageValue });
  const active = staleStore.beginRun().activeRun;
  staleStore.completeRun({
    type: 'COMPLETE',
    runId: `${active.runId}-old`,
    inputSemanticHash: active.inputSemanticHash,
    inputModelVersion: active.inputModelVersion,
    execution: { status: 'QUALIFIED' },
  });
  assert.equal(staleStore.getState().execution, null);
  assert.equal(staleStore.getState().diagnostics[0].code, 'LFEA_RUN_ID_MISMATCH');

  const queuedStore = createLfeaWorkbenchStore({ initialDocument: packageValue });
  const cancelledIdentity = queuedStore.beginRun().activeRun;
  queuedStore.cancelRun();
  const cancelledState = queuedStore.executeActiveRun(cancelledIdentity, {});
  assert.equal(cancelledState.status, 'READY');
  assert.equal(cancelledState.activeRun, null);
  assert.equal(cancelledState.execution, null);
  assert.equal(cancelledState.diagnostics[0].code, 'LFEA_RUN_CANCELLED');

  const replacementIdentity = queuedStore.beginRun().activeRun;
  const staleDeferredState = queuedStore.executeActiveRun(cancelledIdentity, {});
  assert.equal(staleDeferredState.status, 'RUNNING');
  assert.equal(staleDeferredState.activeRun.runId, replacementIdentity.runId);
  assert.equal(staleDeferredState.execution, null);
  queuedStore.cancelRun();

  const codeStore = createLfeaWorkbenchStore({ initialDocument: packageValue });
  const codedError = new TypeError('node coordinate is not finite');
  codedError.code = 'NONFINITE_VALUE';
  const codedState = codeStore.reportEditError('nodes', 0, codedError);
  assert.equal(codedState.status, 'FAILED');
  assert.equal(codedState.diagnostics[0].code, 'NONFINITE_VALUE');
  assert.match(codedState.diagnostics[0].message, /^nodes\[0\]: /u);

  const importErrorStore = createLfeaWorkbenchStore({ initialDocument: packageValue });
  const importState = importErrorStore.reportEditError(
    'document',
    null,
    new SyntaxError('invalid JSON'),
    'LFEA_IMPORT_REJECTED',
  );
  assert.equal(importState.diagnostics[0].code, 'LFEA_IMPORT_REJECTED');

  const noEvidenceStore = createLfeaWorkbenchStore({ initialDocument: packageValue });
  assert.throws(
    () => noEvidenceStore.exportEvidence(),
    /Qualified LFEA evidence export is unavailable\./u,
  );
  assert.equal(noEvidenceStore.getState().status, 'READY');
  assert.equal(noEvidenceStore.getState().execution, null);
}
