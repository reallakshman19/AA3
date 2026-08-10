import { LFEA_SOURCE_KINDS, sealLfeaSource } from './lfea-source-intake.js';

/**
 * Capture one coherent staged 3D Edit source for LFEA without committing it.
 * The editor remains the mutation authority; this function only consumes its
 * public lifecycle snapshot methods. A version move during capture fails closed.
 */
export function captureTopologyEditLfeaSource(lifecycle) {
  requireLifecycle(lifecycle);
  const session = lifecycle.session();
  const sourceVersion = requireSessionVersion(session?.journal?.sessionVersion);
  const draftPackage = lifecycle.createDraftPackage(session);
  const preparedExport = lifecycle.prepareExport(draftPackage);
  const finalVersion = requireSessionVersion(session?.journal?.sessionVersion);
  if (finalVersion !== sourceVersion) {
    throw captureError(
      'LFEA_SOURCE_CAPTURE_VERSION_MOVED',
      `3D Edit changed during LFEA source capture (${sourceVersion} -> ${finalVersion}).`,
    );
  }
  const currentCanonicalHash = session.currentTopology?.().canonicalTopologyHash;
  if (typeof currentCanonicalHash !== 'string'
    || preparedExport.draftCanonicalTopologyHash !== currentCanonicalHash) {
    throw captureError(
      'LFEA_SOURCE_CAPTURE_TOPOLOGY_MOVED',
      '3D Edit topology changed during LFEA source capture.',
    );
  }
  return sealLfeaSource(
    LFEA_SOURCE_KINDS.TOPOLOGY_EDIT_SNAPSHOT,
    preparedExport,
    { modelVersion: sourceVersion },
  );
}

function requireLifecycle(value) {
  for (const method of ['session', 'createDraftPackage', 'prepareExport']) {
    if (typeof value?.[method] !== 'function') {
      throw captureError('LFEA_SOURCE_CAPTURE_AUTHORITY_REQUIRED', `3D Edit lifecycle.${method} is required.`);
    }
  }
}

function requireSessionVersion(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw captureError('LFEA_SOURCE_CAPTURE_VERSION_INVALID', '3D Edit sessionVersion must be a non-negative safe integer.');
  }
  return value;
}

function captureError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  return error;
}
