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
import { WorkspaceStateStore } from '../src/workspace/workspace-state.js';

const workspaceState = new WorkspaceStateStore();
workspaceState.loadDataset(Object.freeze({
  schema: 'analysis-workspace-dataset/v1',
  datasetId: 'DATASET-V3',
  entities: [
    Object.freeze({ entityId: 'PIPE-1', category: 'pipe' }),
    Object.freeze({ entityId: 'PIPE-2', category: 'pipe' }),
  ],
  sharedModel: Object.freeze({ semanticHash: 'shared-model:initial' }),
}));
workspaceState.selectEntity('PIPE-1');

const lifecycle = [];
const bus = createBus(lifecycle);
let activeGate = deferred();
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
    const gate = activeGate;
    await gate.promise;
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
const initialSnapshot = workspaceState.getSnapshot();
assert.equal(workspaceContext.version, initialSnapshot.engineeringVersion);

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

// A real viewport selection changes presentation version but not engineering version.
const beforeSelection = workspaceState.getSnapshot();
workspaceState.selectEntity('PIPE-2');
const afterSelection = workspaceState.getSnapshot();
assert.ok(afterSelection.version > beforeSelection.version);
assert.equal(afterSelection.engineeringVersion, beforeSelection.engineeringVersion);
assert.equal(createAnalysisContext(workspaceState, WORKSPACE_ANALYSIS_TARGET_ID).version, session.workspaceVersion);
activeGate.resolve();
await runPromise;
let completed = lifecycle.find((row) => row.topic === 'analysis:completed');
assert.ok(completed, 'Workspace-scoped run should complete despite a display-only selection/version change.');
assert.equal(completed.payload.result.results.targetId, WORKSPACE_ANALYSIS_TARGET_ID);
assert.equal(lifecycle.some((row) => row.topic === 'analysis:failed'), false);

// Governing engineering authority changing while an async run is active must fail closed.
lifecycle.length = 0;
activeGate = deferred();
const currentContext = createAnalysisContext(workspaceState, WORKSPACE_ANALYSIS_TARGET_ID);
const currentInspection = registry.inspect('test-workspace-v3', currentContext);
const asyncStaleSession = sessionStore.open({
  targetId: WORKSPACE_ANALYSIS_TARGET_ID,
  analysisType: 'test-workspace-v3',
  datasetId: 'DATASET-V3',
  workspaceVersion: currentContext.version,
  inspection: currentInspection,
});
const staleRunPromise = coordinator.run({
  analysisType: 'test-workspace-v3',
  targetId: WORKSPACE_ANALYSIS_TARGET_ID,
  sessionId: asyncStaleSession.sessionId,
});
const beforeEngineeringChange = workspaceState.getSnapshot();
workspaceState.patchSharedModel(Object.freeze({ semanticHash: 'shared-model:changed-during-run' }));
const afterEngineeringChange = workspaceState.getSnapshot();
assert.ok(afterEngineeringChange.engineeringVersion > beforeEngineeringChange.engineeringVersion);
activeGate.resolve();
await staleRunPromise;
const staleFailure = lifecycle.find((row) => row.topic === 'analysis:failed');
assert.ok(staleFailure, 'Changed engineering authority during execution must emit a governed failure.');
assert.equal(staleFailure.payload.code, 'STALE_ANALYSIS_CONTEXT');
assert.equal(lifecycle.some((row) => row.topic === 'analysis:completed'), false);

// A session already stale before Run is also rejected before capability execution.
lifecycle.length = 0;
activeGate = deferred();
const preStaleContext = createAnalysisContext(workspaceState, WORKSPACE_ANALYSIS_TARGET_ID);
const preStaleInspection = registry.inspect('test-workspace-v3', preStaleContext);
const preStaleSession = sessionStore.open({
  targetId: WORKSPACE_ANALYSIS_TARGET_ID,
  analysisType: 'test-workspace-v3',
  datasetId: 'DATASET-V3',
  workspaceVersion: preStaleContext.version,
  inspection: preStaleInspection,
});
workspaceState.patchSharedModel(Object.freeze({ semanticHash: 'shared-model:changed-before-run' }));
await coordinator.run({
  analysisType: 'test-workspace-v3',
  targetId: WORKSPACE_ANALYSIS_TARGET_ID,
  sessionId: preStaleSession.sessionId,
});
const preRunFailure = lifecycle.find((row) => row.topic === 'analysis:failed');
assert.ok(preRunFailure, 'Stale reviewed session must fail before capability execution.');
assert.equal(preRunFailure.payload.code, 'ANALYSIS_SESSION_STALE');

console.log('PASS empirical-v3 governed AnalysisCoordinator workspace-scope contract');

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

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
