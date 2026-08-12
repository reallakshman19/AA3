import {
  createTopologyEditValidationIdentity,
  topologyEditValidationInteractionId,
  topologyEditValidationSessionId,
} from '../topology-edit/professional/topology-edit-validation-identity.js';

export function createTopologyEditRuntimeValidationIdentity({
  controller,
  operationPlan,
} = {}) {
  const session = controller?.session;
  if (!session) {
    throw new Error('TopologyEditValidationRuntimeIdentity: active certified session is required.');
  }
  const editorState = controller.editorStore?.getState?.();
  if (!editorState) {
    throw new Error('TopologyEditValidationRuntimeIdentity: canonical editor store is required.');
  }
  const sourceHash = editorState.dataset?.sourceHash ?? session.baseAuthority.sourceHash;
  const datasetSessionVersion = editorState.dataset?.sessionVersion;
  const selectionRevision = editorState.selection?.revision;
  const planHash = String(operationPlan?.planHash ?? '').trim();
  const basisHash = String(operationPlan?.basisHash ?? '').trim();
  if (!planHash || !basisHash) {
    throw new TypeError(
      'TopologyEditValidationRuntimeIdentity: governed operation plan identity is required.',
    );
  }
  const interactionId = editorState.interaction?.interactionId
    ?? topologyEditValidationInteractionId({ planHash, selectionRevision });
  return createTopologyEditValidationIdentity({
    sourceHash,
    basisHash,
    sessionId: topologyEditValidationSessionId({
      sourceHash,
      datasetSessionVersion,
    }),
    sessionVersion: session.journal.sessionVersion,
    selectionRevision,
    interactionId,
  });
}
