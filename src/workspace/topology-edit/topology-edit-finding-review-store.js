/**
 * Persists bounded TopoFix policy and append-only topology review receipts.
 * Inputs are immutable checker snapshots and explicit operator dispositions;
 * outputs preserve raw findings while projecting current effective blockers.
 * Storage or integrity failures are raised and never treated as approval.
 */
import { deepFreeze, semanticHash, stringValue } from '../../core/shared-piping-model/index.js';
import {
  TOPOLOGY_EDIT_DEFAULT_AUTOFIX_GAP_MM,
  requireTopologyEditAutofixGapMm,
} from './topology-edit-gap-autofix-policy.js';

export const TOPOLOGY_EDIT_FINDING_REVIEW_STATE_SCHEMA = 'TopologyEditFindingReviewState.v1';
export const TOPOLOGY_EDIT_FINDING_REVIEW_RECEIPT_SCHEMA = 'TopologyEditFindingReviewReceipt.v1';
export const TOPOLOGY_EDIT_FINDING_REVIEW_REPORT_SCHEMA = 'TopologyEditFindingReviewReport.v1';

const STORAGE_KEY = 'advanced-analysis:topology-finding-review:v1';
const REVIEW_ACTIONS = new Set(['SKIP', 'RESTORE']);

class TopologyEditFindingReviewStore {
  #storage;

  constructor(storage) {
    this.#storage = storage;
  }

  getGapAutofixToleranceMm() {
    return readState(this.#requireStorage()).gapAutofixToleranceMm;
  }

  setGapAutofixToleranceMm(value) {
    const storage = this.#requireStorage();
    const state = readState(storage);
    const next = sealState({
      ...state,
      gapAutofixToleranceMm: requireTopologyEditAutofixGapMm(value),
    });
    writeState(storage, next);
    return next.gapAutofixToleranceMm;
  }

  skipFinding(snapshot, findingId, reason, reviewedAt) {
    return this.#recordDisposition('SKIP', snapshot, findingId, reason, reviewedAt);
  }

  restoreFinding(snapshot, findingId, reviewedAt) {
    return this.#recordDisposition(
      'RESTORE',
      snapshot,
      findingId,
      'REVIEW_REOPENED',
      reviewedAt,
    );
  }

  projectSnapshot(rawSnapshot) {
    assertRawSnapshot(rawSnapshot);
    const state = readState(this.#requireStorage());
    const findingBasisHash = topologyFindingBasisHash(rawSnapshot);
    const activeByFindingId = currentDispositionByFinding(
      state.receipts.filter((receipt) => receipt.findingBasisHash === findingBasisHash),
    );
    const activeSkipByFindingId = new Map(
      [...activeByFindingId].filter(([, receipt]) => receipt.action === 'SKIP'),
    );
    const findings = rawSnapshot.findings.map((finding) => {
      const receipt = activeSkipByFindingId.get(finding.id);
      return receipt
        ? { ...finding, reviewDisposition: 'SKIPPED', skipReceiptId: receipt.receiptId,
          skipReason: receipt.reason, skippedAt: receipt.reviewedAt }
        : { ...finding, reviewDisposition: 'OPEN', skipReceiptId: null,
          skipReason: null, skippedAt: null };
    });
    const blockingFindings = findings.filter((finding) => (
      finding.disposition === 'BLOCK' && finding.reviewDisposition !== 'SKIPPED'
    ));
    const skippedFindings = findings.filter((finding) => finding.reviewDisposition === 'SKIPPED');
    const reviewFindings = findings.filter((finding) => finding.disposition === 'REVIEW');
    const activeReceipts = skippedFindings.map((finding) => activeSkipByFindingId.get(finding.id));
    const material = {
      ...rawSnapshot,
      snapshotHash: undefined,
      rawSnapshotHash: rawSnapshot.snapshotHash,
      findingBasisHash,
      state: blockingFindings.length > 0
        ? 'BLOCKED'
        : reviewFindings.length > 0 || skippedFindings.length > 0
          ? 'REVIEW_REQUIRED'
          : 'READY',
      rawBlockingIssueCount: rawSnapshot.blockingIssueCount,
      blockingIssueCount: blockingFindings.length,
      skippedIssueCount: skippedFindings.length,
      findings,
      blockingFindings,
      reviewFindings,
      skippedFindings,
      review: {
        stateSchema: TOPOLOGY_EDIT_FINDING_REVIEW_STATE_SCHEMA,
        activeSkipReceiptIds: activeReceipts.map((receipt) => receipt.receiptId),
        activeDispositionHash: semanticHash(activeReceipts),
      },
    };
    delete material.snapshotHash;
    return deepFreeze({ ...material, snapshotHash: semanticHash(material) });
  }

  createReport(snapshot, generatedAt) {
    if (!snapshot?.findingBasisHash || !snapshot?.basis?.datasetId) {
      throw new TypeError('Topology review report requires a current projected checker snapshot.');
    }
    const state = readState(this.#requireStorage());
    const receipts = state.receipts.filter((receipt) => (
      receipt.datasetId === snapshot.basis.datasetId
    ));
    return deepFreeze({
      schema: TOPOLOGY_EDIT_FINDING_REVIEW_REPORT_SCHEMA,
      generatedAt: requireIsoTimestamp(generatedAt),
      datasetId: snapshot.basis.datasetId,
      datasetVersion: snapshot.basis.datasetVersion,
      sourceSha256: snapshot.basis.sourceSha256,
      canonicalTopologyHash: snapshot.basis.canonicalTopologyHash,
      findingBasisHash: snapshot.findingBasisHash,
      rawSnapshotHash: snapshot.rawSnapshotHash,
      currentSnapshotHash: snapshot.snapshotHash,
      configuredGapAutofixToleranceMm: state.gapAutofixToleranceMm,
      rawFindingCount: snapshot.issueCount,
      openBlockingFindingCount: snapshot.blockingIssueCount,
      skippedFindingCount: snapshot.skippedIssueCount,
      activeSkippedFindings: snapshot.skippedFindings,
      receipts,
      stateSemanticHash: state.semanticHash,
    });
  }

  #recordDisposition(action, snapshot, findingId, reason, reviewedAt) {
    if (!REVIEW_ACTIONS.has(action)) throw new RangeError(`Unsupported topology review action: ${action}.`);
    if (!snapshot?.basis?.datasetId || !snapshot?.findingBasisHash) {
      throw new TypeError('Topology review requires a current dataset-bound checker snapshot.');
    }
    const finding = snapshot.findings.find((row) => row.id === findingId);
    if (!finding || finding.disposition !== 'BLOCK' || finding.id.startsWith('system:')) {
      throw new RangeError('Only current canonical blocking findings can receive a review disposition.');
    }
    const reviewedReason = requiredText(reason, 'Topology review reason');
    const storage = this.#requireStorage();
    const state = readState(storage);
    const receiptMaterial = {
      schema: TOPOLOGY_EDIT_FINDING_REVIEW_RECEIPT_SCHEMA,
      sequence: state.receipts.length + 1,
      priorStateSemanticHash: state.semanticHash,
      action,
      reviewedAt: requireIsoTimestamp(reviewedAt),
      reviewedBy: 'CURRENT_LOCAL_OPERATOR',
      reason: reviewedReason,
      datasetId: snapshot.basis.datasetId,
      datasetVersion: snapshot.basis.datasetVersion,
      sourceSha256: snapshot.basis.sourceSha256,
      canonicalTopologyHash: snapshot.basis.canonicalTopologyHash,
      findingBasisHash: snapshot.findingBasisHash,
      finding: {
        id: finding.id,
        kind: finding.kind,
        severity: finding.severity,
        message: finding.message,
        nodeIds: finding.nodeIds,
        edgeIds: finding.edgeIds,
        sourceScope: finding.sourceScope,
      },
    };
    const receipt = deepFreeze({
      ...receiptMaterial,
      receiptId: semanticHash(receiptMaterial),
    });
    const next = sealState({ ...state, receipts: [...state.receipts, receipt] });
    writeState(storage, next);
    return receipt;
  }

  #requireStorage() {
    const storage = this.#storage || globalThis.localStorage;
    if (!storage?.getItem || !storage?.setItem) {
      throw new Error('Durable topology review storage is unavailable.');
    }
    return storage;
  }
}

function emptyState() {
  return sealState({
    schema: TOPOLOGY_EDIT_FINDING_REVIEW_STATE_SCHEMA,
    gapAutofixToleranceMm: TOPOLOGY_EDIT_DEFAULT_AUTOFIX_GAP_MM,
    receipts: [],
  });
}

function sealState(input) {
  const material = {
    schema: TOPOLOGY_EDIT_FINDING_REVIEW_STATE_SCHEMA,
    gapAutofixToleranceMm: requireTopologyEditAutofixGapMm(input.gapAutofixToleranceMm),
    receipts: [...(input.receipts || [])],
  };
  return deepFreeze({ ...material, semanticHash: semanticHash(material) });
}

function readState(storage) {
  const serialized = storage.getItem(STORAGE_KEY);
  if (!serialized) return emptyState();
  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    throw new Error(`Stored topology review data is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (parsed?.schema !== TOPOLOGY_EDIT_FINDING_REVIEW_STATE_SCHEMA
      || !Array.isArray(parsed.receipts)) {
    throw new TypeError('Stored topology review data uses an unsupported schema.');
  }
  const sealed = sealState(parsed);
  if (sealed.semanticHash !== parsed.semanticHash) {
    throw new Error('Stored topology review data failed its integrity check.');
  }
  return sealed;
}

function writeState(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function topologyFindingBasisHash(snapshot) {
  return semanticHash({
    checkerSchema: snapshot.schema,
    basis: snapshot.basis,
    findings: snapshot.findings.map((finding) => ({
      id: finding.id,
      kind: finding.kind,
      severity: finding.severity,
      disposition: finding.disposition,
      message: finding.message,
      nodeIds: finding.nodeIds,
      edgeIds: finding.edgeIds,
      sourceScope: finding.sourceScope,
    })),
  });
}

function currentDispositionByFinding(receipts) {
  return receipts.reduce((current, receipt) => {
    current.set(receipt.finding.id, receipt);
    return current;
  }, new Map());
}

function assertRawSnapshot(snapshot) {
  if (!snapshot?.schema || !Array.isArray(snapshot.findings) || snapshot.rawSnapshotHash) {
    throw new TypeError('Topology finding review requires an unprojected checker snapshot.');
  }
}

function requiredText(value, field) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`${field} is required.`);
  return text;
}

function requireIsoTimestamp(value) {
  const text = requiredText(value, 'Topology review timestamp');
  if (Number.isNaN(Date.parse(text)) || new Date(text).toISOString() !== text) {
    throw new TypeError('Topology review timestamp must be an explicit UTC ISO-8601 value.');
  }
  return text;
}

export const topologyEditFindingReviewStore = Object.freeze(
  new TopologyEditFindingReviewStore(null),
);
