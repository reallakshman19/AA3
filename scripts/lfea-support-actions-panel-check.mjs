import assert from 'node:assert/strict';
import { EVENT_TOPICS, assertEventPayload } from '../src/workspace/event-topics.js';
import {
  LFEA_SUPPORT_ACTIONS_PANEL_STATUS,
  projectLfeaSupportActionsForSelection,
} from '../src/workspace/lfea-support-actions-panel.js';
import { TopologyEditLifecycleController } from '../src/workspace/topology-edit/topology-edit-lifecycle-controller.js';

const sourceContext = Object.freeze({
  sourceSemanticHash: 'fnv1a64:1111111111111111',
  modelVersion: 7,
});
const publication = Object.freeze({
  schema: 'lfea-support-actions-published/v1',
  sourceSemanticHash: sourceContext.sourceSemanticHash,
  modelVersion: sourceContext.modelVersion,
  analysisResultSemanticHash: 'fnv1a64:2222222222222222',
  executionHash: 'fnv1a64:3333333333333333',
  loadCaseId: 'CASE-W',
  physicalLoadCaseHash: 'fnv1a64:4444444444444444',
  units: Object.freeze({ force: 'kN' }),
  actions: Object.freeze([
    Object.freeze({
      entityId: 'support:S1',
      nodeId: 'N1',
      interfaceId: 'IF-S1',
      loadCaseId: 'CASE-W',
      triadSemanticHash: 'fnv1a64:5555555555555555',
      recoverySemanticHash: 'fnv1a64:6666666666666666',
      triadStatus: 'RESOLVED',
      triadReason: null,
      fAxial: 12.5,
      fLateral: -2,
      fVertical: 8,
    }),
    Object.freeze({
      entityId: 'support:S2',
      nodeId: 'N2',
      interfaceId: 'IF-S2',
      loadCaseId: 'CASE-W',
      triadSemanticHash: 'fnv1a64:7777777777777777',
      recoverySemanticHash: 'fnv1a64:8888888888888888',
      triadStatus: 'BLOCKED_AXIS_DEGENERATE',
      triadReason: 'AXIAL_PARALLEL_TO_VERTICAL',
      fAxial: 14,
      fLateral: null,
      fVertical: null,
    }),
  ]),
});

assert.doesNotThrow(() => assertEventPayload(EVENT_TOPICS.TOPOLOGY_EDIT_LFEA_SOURCE_CHANGED, sourceContext));
assert.doesNotThrow(() => assertEventPayload(EVENT_TOPICS.LFEA_SUPPORT_ACTIONS_PUBLISHED, publication));

const mixedCase = structuredClone(publication);
mixedCase.actions[0].loadCaseId = 'CASE-T';
assert.throws(
  () => assertEventPayload(EVENT_TOPICS.LFEA_SUPPORT_ACTIONS_PUBLISHED, mixedCase),
  /must match the publication load case/u,
);

const falseZero = structuredClone(publication);
falseZero.actions[1].fLateral = 0;
assert.throws(
  () => assertEventPayload(EVENT_TOPICS.LFEA_SUPPORT_ACTIONS_PUBLISHED, falseZero),
  /blocked transverse actions must be null/u,
);

assert.throws(
  () => assertEventPayload(EVENT_TOPICS.TOPOLOGY_EDIT_LFEA_SOURCE_CHANGED, {
    sourceSemanticHash: sourceContext.sourceSemanticHash,
  }),
  /modelVersion/u,
);

const current = projectLfeaSupportActionsForSelection(
  { entityId: 'support:S1' },
  publication,
  sourceContext,
);
assert.equal(current.status, LFEA_SUPPORT_ACTIONS_PANEL_STATUS.CURRENT);
assert.deepEqual(current.rows.slice(0, 3), [
  { label: 'Faxial', value: '12.5 kN' },
  { label: 'Flateral', value: '-2 kN' },
  { label: 'Fvertical', value: '8 kN' },
]);

const staleHash = projectLfeaSupportActionsForSelection(
  { entityId: 'support:S1' },
  publication,
  { ...sourceContext, sourceSemanticHash: 'fnv1a64:9999999999999999' },
);
assert.equal(staleHash.status, LFEA_SUPPORT_ACTIONS_PANEL_STATUS.STALE);
assert.match(staleHash.message, /different 3D Edit model version/u);

const staleVersion = projectLfeaSupportActionsForSelection(
  { entityId: 'support:S1' },
  publication,
  { ...sourceContext, modelVersion: 8 },
);
assert.equal(staleVersion.status, LFEA_SUPPORT_ACTIONS_PANEL_STATUS.STALE);

const invalidated = projectLfeaSupportActionsForSelection(
  { entityId: 'support:S1' },
  publication,
  sourceContext,
  true,
);
assert.equal(invalidated.status, LFEA_SUPPORT_ACTIONS_PANEL_STATUS.STALE);
assert.match(invalidated.message, /model changed/u);

const noAction = projectLfeaSupportActionsForSelection(
  { entityId: 'support:UNKNOWN' },
  publication,
  sourceContext,
);
assert.equal(noAction.status, LFEA_SUPPORT_ACTIONS_PANEL_STATUS.NO_ACTION);
assert.equal(noAction.message, 'No recovered action for this selection.');
assert.equal(noAction.rows.length, 0);

const degenerate = projectLfeaSupportActionsForSelection(
  { entityId: 'support:S2' },
  publication,
  sourceContext,
);
assert.equal(degenerate.status, LFEA_SUPPORT_ACTIONS_PANEL_STATUS.AXIS_DEGENERATE);
assert.equal(degenerate.rows[0].value, '14 kN');
assert.equal(degenerate.rows[1].value, 'Blocked — axial parallel to vertical');
assert.equal(degenerate.rows[2].value, 'Blocked — axial parallel to vertical');
assert.ok(!degenerate.rows.slice(1, 3).some((row) => row.value === '0' || row.value.startsWith('0 ')));

const published = [];
const lifecycle = new TopologyEditLifecycleController({
  getSession: () => null,
  publishLfeaSourceContext: (payload) => published.push(payload),
});
const lifecycleSession = {
  currentTopology: () => ({ canonicalTopologyHash: sourceContext.sourceSemanticHash }),
  journal: { sessionVersion: sourceContext.modelVersion },
};
const emitted = lifecycle.publishLfeaSourceContext(lifecycleSession);
assert.deepEqual(emitted, sourceContext);
assert.deepEqual(published, [sourceContext]);
assert.doesNotThrow(() => assertEventPayload(EVENT_TOPICS.TOPOLOGY_EDIT_LFEA_SOURCE_CHANGED, published[0]));

console.log('lfea-support-actions-panel-check: PASS');
