import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APPLICATION_NAVIGATION_ORDER_V12,
  APPLICATION_VIEW_STATE_V12_SCHEMA,
  CONSUMER_IDS,
  createApplicationViewStateV12,
  createWorkspaceConsumerContext,
  createWorkspaceConsumerReadinessRegistry,
  createWorkspaceConsumerRegistryV12,
  validateApplicationViewStateV12,
  validateWorkspaceConsumerRegistryV12,
} from '../src/core/workspace-consumers/index.js';
import {
  createAdvancedTabBenchmarkRegistry,
  reconcileNavigationAndBenchmarkRegistry,
} from '../src/core/tab-benchmarks/index.js';
import { renderLoadCalcConsumer } from '../src/workspace/load-calc-consumer-view.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = createWorkspaceConsumerRegistryV12();
const benchmarkRegistry = createAdvancedTabBenchmarkRegistry();

assert.deepEqual(APPLICATION_NAVIGATION_ORDER_V12, ['WORKSPACE', 'LOAD_CALC', 'LAFEA', 'LFEA', 'EMPIRICAL']);
assert.deepEqual(registry.consumers.map((row) => row.consumerId), ['EMPIRICAL', 'LAFEA', 'LFEA', 'LOAD_CALC', 'WORKSPACE']);
assert.equal(validateWorkspaceConsumerRegistryV12(registry).ok, true);
assert.equal(reconcileNavigationAndBenchmarkRegistry(APPLICATION_NAVIGATION_ORDER_V12, benchmarkRegistry).ok, true);

const context = createWorkspaceConsumerContext({
  datasetId: null,
  workspaceVersion: 0,
  selectedEntityId: null,
  contracts: {},
});
const readiness = createWorkspaceConsumerReadinessRegistry(registry, context, { workspaceBooted: true });
const state = createApplicationViewStateV12(readiness, { activeViewId: CONSUMER_IDS.WORKSPACE, version: 0 });
assert.equal(state.schema, APPLICATION_VIEW_STATE_V12_SCHEMA);
assert.equal(state.activeViewId, CONSUMER_IDS.WORKSPACE);
assert.equal(validateApplicationViewStateV12(state).ok, true);

const layoutSource = await readFile(path.join(root, 'src/workspace/workspace-layout.js'), 'utf8');
const viewIds = [...layoutSource.matchAll(/data-application-view="([A-Z_]+)"/g)].map((match) => match[1]);
assert.deepEqual(viewIds, APPLICATION_NAVIGATION_ORDER_V12);
for (const forbidden of ['HOME', 'PCF', 'SKETCHER', 'THREE_D_CALC', 'PIPE_SOLVER', 'LOCAL_FEA', 'REPORTS', 'QA', 'SETTINGS', 'DEBUG']) {
  assert.equal(viewIds.includes(forbidden), false, `${forbidden} must not be mounted by the Advanced shell.`);
}

const shellSource = await readFile(path.join(root, 'src/workspace/application-shell-controller.js'), 'utf8');
for (const forbidden of [
  'home-consumer-controller',
  'pcf-consumer-controller',
  'sketcher-controller',
  'three-d-calc-consumer-controller',
  'pipe-solver-consumer-controller',
  'qa-evidence-controller',
]) {
  assert.equal(shellSource.includes(forbidden), false, `${forbidden} must not be bundled by the Advanced shell.`);
}

const loadCalcViewSource = await readFile(path.join(root, 'src/workspace/load-calc-consumer-view.js'), 'utf8');
const loadCalcTabGroups = [...loadCalcViewSource.matchAll(/tabGroup\('([^']+)', \[([\s\S]*?)\], state\.activeTab\)/g)]
  .map((match) => ({
    label: match[1],
    tabs: [...match[2].matchAll(/\['([^']+)',\s*'[^']+'\]/g)].map((tabMatch) => tabMatch[1]),
  }));
// The Advanced nav (tile 8) no longer repeats project-data, masters, loads
// or preflight -- those five entries pointed at tabs already reachable from
// the seven numbered workflow tiles (same tab id, second button, no second
// view), which read as duplicated navigation rather than governance. Every
// governed tab must still be reachable from exactly one place in the header:
// either the numbered row or the Advanced nav, never neither.
assert.deepEqual(loadCalcTabGroups, [
  { label: 'Setup', tabs: ['overview', 'enrichment'] },
  { label: 'Scenario', tabs: ['restraints', 'load-cases', 'methods'] },
  { label: 'Output', tabs: ['results', 'evidence'] },
  { label: 'Diagnostics', tabs: ['method-basis', 'seal-export', 'json-trace'] },
  { label: 'Model', tabs: ['3d'] },
]);
const loadCalcTabs = loadCalcTabGroups.flatMap((group) => group.tabs);
assert.equal(new Set(loadCalcTabs).size, 11,
  'Load Calc must retain exactly eleven unique tabs in the Advanced nav (five duplicates of numbered workflow steps were deliberately removed).');

const workflowStepsBlock = loadCalcViewSource.match(/const WORKFLOW_STEPS = Object\.freeze\(\[([\s\S]*?)\n\]\);/u)?.[1] || '';
const primaryWorkflowTabs = [...workflowStepsBlock.matchAll(/tab: '([a-z0-9-]+)'/gu)].map((match) => match[1]);
assert.equal(primaryWorkflowTabs.length, 6,
  'Load Calc must retain exactly six tab-bearing numbered workflow steps (Import JSON has no tab of its own).');

const allLoadCalcTabs = new Set([...loadCalcTabs, ...primaryWorkflowTabs]);
for (const requiredTab of ['overview', '3d', 'restraints', 'load-cases', 'methods', 'results', 'evidence', 'loads', 'preflight', 'project-data', 'masters', 'json-trace']) {
  assert.equal(allLoadCalcTabs.has(requiredTab), true,
    `Load Calc must retain ${requiredTab}, reachable from the numbered row or the Advanced nav.`);
}
for (const governedTab of ['enrichment', 'method-basis', 'seal-export']) {
  assert.equal(loadCalcTabs.includes(governedTab), true, `Load Calc must mount governed Non-FEA tab ${governedTab}.`);
}
assert.match(loadCalcViewSource, /View Loads/u,
  'Load Calc must retain a single, unambiguous label for the loads view.');
assert.doesNotMatch(loadCalcViewSource, /Load Evaluation/u,
  'The loads view must not regain a second, differently-worded entry point.');
assert.match(loadCalcViewSource, /state\.empiricalScenarioState/u,
  'Load Calc must continue to consume the governed empirical scenario state.');
assert.match(loadCalcViewSource, /snap\?\.calculationEligible/u,
  'The single run action must honor empirical scenario eligibility.');
assert.match(loadCalcViewSource, /authState\?\.calculationEligible/u,
  'The single run action must retain the authorized gravity fallback.');
assert.match(loadCalcViewSource, /data-pill-status=/u,
  'Load Calc must retain visible governed status pills.');
assert.match(loadCalcViewSource, /id: 'verify', label: 'Run Calc', tab: 'verify'/u,
  'Load Calc must retain the pre-run verification entry point as the numbered Run Calc step.');
assert.doesNotMatch(loadCalcViewSource, /★ Verify &amp; Run/u,
  'The pre-run verification entry point must not regain a second, redundant button.');
assert.match(loadCalcViewSource, /data-load-calc-run/u,
  'Load Calc must expose one governed run control.');
assert.match(loadCalcViewSource, /Run Load Calc — Gravity/u,
  'The governed run control must identify the authorized gravity fallback.');

const runRenderDocument = {
  createElement(tagName) {
    assert.equal(tagName, 'section', 'Load Calc renderer must create the governed section root.');
    return { className: '', dataset: {}, innerHTML: '' };
  },
};
const baseRunState = {
  activeTab: 'verify',
  empiricalScenarioState: { calculationEligible: false },
  authorizationState: { state: 'NOT_CONFIGURED', calculationEligible: false },
  commonInputState: {},
  supportSiteModel: null,
  routePartitionModel: null,
  distribution: null,
  message: '',
};

const empiricalRun = governedRunButton({
  ...baseRunState,
  empiricalScenarioState: { calculationEligible: true },
});
assert.doesNotMatch(empiricalRun.button, /\bdisabled\b/u,
  'A calculation-eligible empirical scenario must enable the governed Run action.');
assert.match(empiricalRun.button, /Run Load Calc/u,
  'An eligible empirical scenario must render the generic governed Run label.');
assert.doesNotMatch(empiricalRun.button, /Gravity/u,
  'Empirical eligibility must take precedence over the gravity fallback.');

const gravityRun = governedRunButton({
  ...baseRunState,
  authorizationState: { state: 'AUTHORIZED_CURRENT', calculationEligible: true },
});
assert.doesNotMatch(gravityRun.button, /\bdisabled\b/u,
  'An eligible authorized gravity state must enable the governed Run action.');
assert.match(gravityRun.button, /Run Load Calc — Gravity/u,
  'Gravity eligibility must remain an explicit governed fallback.');

const blockedRun = governedRunButton({
  ...baseRunState,
  authorizationState: {
    state: 'AWAITING_AUTHORIZATION',
    calculationEligible: false,
    reasonCode: 'NO_ACTIVE_DATASET',
  },
});
assert.match(blockedRun.button, /\bdisabled\b/u,
  'The governed Run action must remain disabled when no execution path is eligible.');
assert.match(blockedRun.button, /No dataset loaded — import SJSON first/u,
  'A blocked Run action must expose the governing reason rather than silently disabling.');
assert.match(blockedRun.html, /No dataset loaded — import SJSON first/u,
  'The governing blocked reason must remain visible in the status output.');

const loadCalcControllerSource = await readFile(path.join(root, 'src/workspace/load-calc-consumer-controller.js'), 'utf8');
for (const requiredView of [
  'empirical-load-calc-scenario-view.js',
  'empirical-preflight-view.js',
  'project-data/project-data-view.js',
  'master-data-ui.js',
  'enrichment/non-fea-enrichment-view.js',
  'non-fea-method-basis-view.js',
  'non-fea-seal-export-view.js',
  'json-trace-ui.js',
  'topology-edit-3d-sjson-fidelity-controller.js',
]) {
  assert.equal(loadCalcControllerSource.includes(requiredView), true, `Load Calc must mount ${requiredView}.`);
}
for (const requiredAction of [
  'data-empirical-authorize',
  'data-empirical-calculate',
  'data-empirical-clone-profile',
]) {
  assert.equal(loadCalcControllerSource.includes(requiredAction), true, `Load Calc must govern ${requiredAction}.`);
}

const scenarioViewSource = await readFile(
  path.join(root, 'src/workspace/engineering-loads/empirical-load-calc-scenario-view.js'),
  'utf8',
);
for (const requiredLabel of [
  'Source and effective custody',
  'Explicit ownership',
  'Methods and profile authority',
  'Separate result family',
  'Immutable trace',
]) {
  assert.equal(scenarioViewSource.includes(requiredLabel), true, `Empirical Load Calc must render ${requiredLabel}.`);
}
assert.match(scenarioViewSource, /data-empirical-authorize/u);
assert.match(scenarioViewSource, /data-empirical-calculate/u);
assert.match(scenarioViewSource, /geometryChanged/u);

const scenarioStoreSource = await readFile(
  path.join(root, 'src/workspace/engineering-loads/empirical-load-calc-scenario-store.js'),
  'utf8',
);
assert.match(scenarioStoreSource, /explicitAuthorization: true/u);
assert.match(scenarioStoreSource, /autoExecution: false/u);
assert.match(scenarioStoreSource, /combinedOperatingReactionPermitted: false/u);
assert.match(scenarioStoreSource, /EXECUTED_STALE/u);

const sjsonFidelityControllerSource = await readFile(
  path.join(root, 'src/workspace/topology-edit-3d-sjson-fidelity-controller.js'),
  'utf8',
);
const productivityControllerSource = await readFile(
  path.join(root, 'src/workspace/topology-edit-3d-productivity-controller.js'),
  'utf8',
);
const authoringControllerSource = await readFile(
  path.join(root, 'src/workspace/topology-edit-3d-authoring-controller.js'),
  'utf8',
);
assert.equal(
  sjsonFidelityControllerSource.includes("from './topology-edit-3d-productivity-controller.js'"),
  true,
  'SJSON fidelity controller must inherit the governed productivity controller.',
);
assert.match(
  sjsonFidelityControllerSource,
  /export class TopologyEdit3DViewController extends ProfessionalController/u,
  'SJSON fidelity controller must preserve its imported controller ownership.',
);
assert.equal(
  productivityControllerSource.includes("from './topology-edit-3d-authoring-controller.js'"),
  true,
  'Productivity controller must inherit the certified authoring controller.',
);
assert.match(
  productivityControllerSource,
  /export class TopologyEdit3DViewController extends AuthoringController/u,
  'Productivity controller must preserve authoring controller ownership.',
);
assert.equal(
  authoringControllerSource.includes("from './topology-edit-3d-professional-controller.js'"),
  true,
  'Authoring controller must inherit the professional 3D controller.',
);
assert.match(
  authoringControllerSource,
  /export class TopologyEdit3DViewController extends ProfessionalController/u,
  'Authoring controller must preserve professional controller ownership.',
);
const jsonTraceSource = await readFile(path.join(root, 'src/workspace/json-trace-ui.js'), 'utf8');
assert.doesNotMatch(jsonTraceSource, /fixture|fetch\(/iu, 'JSON Trace must not load a fixture or external fallback.');

const removedLegacyPaths = [
  'src/3d-analysis',
  'src/calc-extended',
  'src/components',
  'src/pcf',
  'src/piperack',
  'src/reporting',
  'src/sketcher',
  'src/solvers',
  'src/workspace/pcf-consumer-view.js',
  'src/workspace/pipe-solver-consumer-view.js',
  'src/workspace/sketcher-view.js',
  'src/workspace/three-d-calc-consumer-view.js',
];
for (const relativePath of removedLegacyPaths) {
  assert.equal(await pathExists(path.join(root, relativePath)), false, `${relativePath} must remain absent from Advanced.`);
}

const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const declaredPackages = new Set([
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.devDependencies || {}),
]);
for (const packageName of ['react', 'react-dom', 'zustand', 'lucide-react', '@react-three/fiber', '@react-three/drei']) {
  assert.equal(declaredPackages.has(packageName), false, `${packageName} is a removed legacy UI dependency.`);
}

console.log('Advanced four-tab shell, grouped Load Calc navigation, certified authoring chain and benchmark registry reconciliation passed.');

function governedRunButton(runState) {
  const section = renderLoadCalcConsumer(runRenderDocument, runState);
  const runControlCount = [...section.innerHTML.matchAll(/data-load-calc-run/gu)].length;
  assert.equal(runControlCount, 1, 'Load Calc must render exactly one governed Run control.');
  const match = section.innerHTML.match(/<button[^>]*data-load-calc-run[^>]*>[\s\S]*?<\/button>/u);
  assert.ok(match, 'Load Calc must render the governed Run control as a button.');
  return { button: match[0], html: section.innerHTML };
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}
