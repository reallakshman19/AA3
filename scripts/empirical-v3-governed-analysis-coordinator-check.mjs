import assert from 'node:assert/strict';
import {
  createSolverResultContract,
  ENGINEERING_LEVEL,
} from '../src/core/solvers/certification/solverResultContract.js';
import { AnalysisCapabilityRegistry } from '../src/workspace/analysis-capability-registry.js';
import { AnalysisCoordinator } from '../src/workspace/analysis-coordinator.js';
import {
  createAnalysisContext,
  WORKSPACE_ANALYSIS_TARGET_ID,
} from '../src/workspace/analysis-context.js';
import { AnalysisSessionStore } from '../src/workspace/analysis-session-store.js';

const state = {
  version: 7,
  engineeringVersion: 3,
  selectedEntityId: 'PIPE-1',
  dataset: Object.freeze({
    datasetId: 'DATASET-V3',
    entities: [Object.freeze({ entityId: 'PIPE-1', category: 'pipe' })],
  }),
};
const workspaceState = {
  getSnapshot() {
    return {
      status: 'ready',
      dataset: state.dataset,
      selectedEntityId: state.selectedEntityId,
      version: state.version,
      engineeringVersion: state.engineeringVersion,
    };
  },
  getEntity(id) {
    return state.dataset.entities.find((row) => row.entityId === id) ?? null;
  },
};

const lifecycle = [];
const bus = createBus(lifecycle);
let releaseExecution;
const executionGate = new Promise((resolve) => { releaseExecution = resolve; });
const registry = new AnalysisCapabilityRegistry().register({
  id: 'test-workspace-v3',
  label: 'Test workspace V3',
  description: 'Contract test only',
  engineeringLevel: ENGINEERING_LEVEL.QUALIFIED_ANALYTICAL,
  manifest: {
    solverId: 'test-v3',
    solverVersion: '1',
    methodId: 'TEST_V3',
    methodVersion: '1',
    codeBasis: ['contract-test'],
    assumptions: ['contract-test'],
    limitations: ['contract-test'],
  },
  applicability(context) {
    return { applicable: context.targetId === WORKSPACE_ANALYSIS_TARGET_ID, reason: '' };
  },
  evaluate(context) {
    return context.targetId === WORKSPACE_ANALYSIS_TARGET_ID
      ? { enabled: true, reason: '', missing: [] }
      : { enabled: false, reason: 'workspace only', missing: ['workspaceTarget'] };
  },
  inspect(context) {
    return { fields: [], readiness: this.evaluate(context) };
  },
  async execute(context) {
    await executionGate;
    return createSolverResultContract({
      moduleId: 'test-v3',
      methodId: 'TEST_V3',
      formulaIds: ['TEST_V3'],
      engineeringLevel: ENGINEERING_LEVEL.QUALIFIED_ANALYTICAL,
      status: 'CALCULATED',
      results: { targetId: context.targetId, sessionId: context.analysisSession.sessionId },
    });
  },
});

const workspaceContext = createAnalysisContext(workspaceState, WORKSPACE_ANALYSIS_TARGET_ID);
assert.equal(workspaceContext.analysisScope, 'WORKSPACE');
assert.equal(workspaceContext.entity, null);
assert.equal(workspaceContext.dataset.datasetId, 'DATASET-V3');
assert.equal(workspaceContext.version, state.engineeringVersion);

const sessionStore = new AnalysisSessionStore();
const inspection = registry.inspect('test-workspace-v3', workspaceContext);
const session = sessionStore.open({
  targetId: WORKSPACE_ANALYSIS_TARGET_ID,
  analysisType: 'test-workspace-v3',
  datasetId: 'DATASET-V3',
  workspaceVersion: workspaceContext.version,
  inspection,
});
assert.equal(session.status, 'ready');

const coordinator = new AnalysisCoordinator(bus, workspaceState, registry, sessionStore);
const runPromise = coordinator.run({
  analysisType: 'test-workspace-v3',
  targetId: WORKSPACE_ANALYSIS_TARGET_ID,
  sessionId: session.sessionId,
});

// Real viewport selection increments presentation version, but not engineering version.
state.selectedEntityId = 'OTHER-VIEWPORT-SELECTION';
state.version += 1;
assert.equal(createAnalysisContext(workspaceState, WORKSPACE_ANALYSIS_TARGET_ID).version, session.workspaceVersion);
releaseExecution();
await runPromise;
const completed = lifecycle.find((row) => row.topic === 'analysis:completed');
assert.ok(completed, 'Workspace-scoped run should complete despite a display-only selection/version change.');
assert.equal(completed.payload.result.results.targetId, WORKSPACE_ANALYSIS_TARGET_ID);

// Governing engineering-version custody remains fail-closed through the reviewed session.
const currentContext = createAnalysisContext(workspaceState, WORKSPACE_ANALYSIS_TARGET_ID);
const staleInspection = registry.inspect('test-workspace-v3', currentContext);
const staleSession = sessionStore.open({
  targetId: WORKSPACE_ANALYSIS_TARGET_ID,
  analysisType: 'test-workspace-v3',
  datasetId: 'DATASET-V3',
  workspaceVersion: currentContext.version,
  inspection: staleInspection,
});
state.version += 1;
state.engineeringVersion += 1;
lifecycle.length = 0;
await coordinator.run({
  analysisType: 'test-workspace-v3',
  targetId: WORKSPACE_ANALYSIS_TARGET_ID,
  sessionId: staleSession.sessionId,
});
const failed = lifecycle.find((row) => row.topic === 'analysis:failed');
assert.ok(failed, 'Changed engineering version must fail before capability execution.');
assert.equal(failed.payload.code, 'ANALYSIS_SESSION_STALE');

console.log('PASS empirical-v3 governed AnalysisCoordinator workspace-scope contract');

function createBus(log) {
  const listeners = new Map();
  return {
    subscribe(topic, callback) {
      const rows = listeners.get(topic) ?? new Set();
      rows.add(callback);
      listeners.set(topic, rows);
      return () => rows.delete(callback);
    },
    publish(topic, payload) {
      log.push({ topic, payload });
      for (const callback of [...(listeners.get(topic) ?? [])]) callback(payload);
    },
  };
}
