/**
 * Lightweight handoff for the latest immutable topology-check snapshot.
 * The heavy canonical checker is loaded only by Load Calc or 3D Edit. Missing
 * or dataset-mismatched evidence is returned as null so calculation fails closed.
 */
import {
  TOPOLOGY_EDIT_CHECK_SNAPSHOT_SCHEMA,
} from './topology-edit-check-runtime-contract.js';

class TopologyEditCheckSnapshotStore {
  #snapshot = null;

  setSnapshot(snapshot) {
    if (snapshot?.schema !== TOPOLOGY_EDIT_CHECK_SNAPSHOT_SCHEMA) {
      throw new TypeError('Topology check snapshot uses an unsupported schema.');
    }
    if (!Object.isFrozen(snapshot)) {
      throw new TypeError('Topology check snapshot must be immutable.');
    }
    this.#snapshot = snapshot;
    return this.#snapshot;
  }

  getSnapshot(datasetId) {
    if (!datasetId || this.#snapshot?.basis?.datasetId !== datasetId) return null;
    return this.#snapshot;
  }

  invalidate() {
    this.#snapshot = null;
  }
}

export const topologyEditCheckSnapshotStore = Object.freeze(
  new TopologyEditCheckSnapshotStore(),
);
