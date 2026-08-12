import assert from 'node:assert/strict';
import test from 'node:test';

import {
  topologyEditValidationIdentityStaleFields,
  topologyEditValidationInteractionId,
  topologyEditValidationSessionId,
} from '../src/workspace/topology-edit/professional/topology-edit-validation-identity.js';
import {
  createTopologyEditRuntimeValidationIdentity,
} from '../src/workspace/viewport-productivity/topology-edit-validation-runtime-identity.js';

function harness() {
  let editorState = {
    dataset: {
      sourceHash: 'source:runtime-identity',
      canonicalHash: 'canonical:runtime-identity',
      sessionVersion: 4,
    },
    selection: { revision: 9 },
    interaction: { interactionId: null },
  };
  const session = {
    baseAuthority: { sourceHash: 'source:runtime-identity' },
    journal: { sessionVersion: 12 },
  };
  const controller = {
    session,
    editorStore: { getState: () => editorState },
  };
  const operationPlan = {
    planHash: 'plan:runtime-identity',
    basisHash: 'canonical:runtime-identity',
  };
  return {
    controller,
    operationPlan,
    session,
    state: () => editorState,
    replaceState: (next) => { editorState = next; },
  };
}

test('runtime validation identity binds source, dataset activation, journal, selection and plan', () => {
  const h = harness();
  const identity = createTopologyEditRuntimeValidationIdentity(h);

  assert.equal(identity.sourceHash, h.state().dataset.sourceHash);
  assert.equal(identity.basisHash, h.operationPlan.basisHash);
  assert.equal(identity.sessionVersion, h.session.journal.sessionVersion);
  assert.equal(identity.selectionRevision, h.state().selection.revision);
  assert.equal(identity.sessionId, topologyEditValidationSessionId({
    sourceHash: h.state().dataset.sourceHash,
    datasetSessionVersion: h.state().dataset.sessionVersion,
  }));
  assert.equal(identity.interactionId, topologyEditValidationInteractionId({
    planHash: h.operationPlan.planHash,
    selectionRevision: h.state().selection.revision,
  }));
});

test('active interaction identity is preserved instead of synthesized', () => {
  const h = harness();
  h.replaceState({
    ...h.state(),
    interaction: { interactionId: 'interaction:viewport-drag-42' },
  });
  const identity = createTopologyEditRuntimeValidationIdentity(h);
  assert.equal(identity.interactionId, 'interaction:viewport-drag-42');
});

test('selection, dataset activation and journal changes are independently stale', () => {
  const h = harness();
  const frozen = createTopologyEditRuntimeValidationIdentity(h);

  h.replaceState({
    ...h.state(),
    selection: { revision: h.state().selection.revision + 1 },
  });
  let current = createTopologyEditRuntimeValidationIdentity(h);
  assert.deepEqual(
    topologyEditValidationIdentityStaleFields(frozen, current),
    ['selectionRevision', 'interactionId'],
  );

  h.replaceState({
    ...h.state(),
    selection: { revision: frozen.selectionRevision },
    dataset: {
      ...h.state().dataset,
      sessionVersion: h.state().dataset.sessionVersion + 1,
    },
  });
  current = createTopologyEditRuntimeValidationIdentity(h);
  assert.deepEqual(
    topologyEditValidationIdentityStaleFields(frozen, current),
    ['sessionId'],
  );

  h.replaceState({
    ...h.state(),
    dataset: {
      ...h.state().dataset,
      sessionVersion: 4,
    },
  });
  h.session.journal.sessionVersion += 1;
  current = createTopologyEditRuntimeValidationIdentity(h);
  assert.deepEqual(
    topologyEditValidationIdentityStaleFields(frozen, current),
    ['sessionVersion'],
  );
});

test('runtime identity fails closed without canonical editor-store custody', () => {
  const h = harness();
  delete h.controller.editorStore;
  assert.throws(
    () => createTopologyEditRuntimeValidationIdentity(h),
    /canonical editor store is required/i,
  );
});
