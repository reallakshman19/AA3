/**
 * Shared, currentness-bound topology checker used by 3D Edit and Load Calc.
 * Inputs are the committed workspace dataset and topology authority; outputs
 * are immutable findings, dispositions, source scope, and certified-fix counts.
 * Failures publish an explicit blocked snapshot and never imply readiness.
 */
import {
  deepFreeze,
  semanticHash,
  stringValue,
} from '../../core/shared-piping-model/index.js';
import { SupportRestraintStore } from '../support-restraint-store.js';
import { TopologyStore } from '../topology-store.js';
import { WorkspaceState } from '../workspace-state.js';
import {
  TOPOLOGY_EDIT_NEAR_MATCH_GAP_MM,
  buildHighConfidenceGapAutofixPlan,
} from './topology-edit-high-confidence-autofix.js';
import {
  topologyEditFindingReviewStore,
} from './topology-edit-finding-review-store.js';
import {
  buildCanonicalTopologyFromWorkspaceDataset,
} from './topology-edit-source-adapter-dispatch.js';
import {
  TOPOLOGY_EDIT_CHECK_SNAPSHOT_SCHEMA,
} from './topology-edit-check-runtime-contract.js';
import {
  topologyEditCheckSnapshotStore,
} from './topology-edit-check-snapshot-store.js';
import { checkCanonicalTopology } from './topology-edit-checker.js';

export { TOPOLOGY_EDIT_CHECK_SNAPSHOT_SCHEMA };

let cachedBasisKey = '';
let cachedSnapshot = null;

/** Evaluates the currently committed workspace topology or returns a blocker. */
export function evaluateCurrentTopologyCheck() {
  const exactToleranceMm = topologyEditFindingReviewStore.getGapAutofixToleranceMm();
  const workspace = WorkspaceState.getSnapshot();
  const dataset = workspace?.status === 'ready' ? workspace.dataset : null;
  const topologyGraph = TopologyStore.getGraph();
  if (!dataset) {
    return publishSnapshot(unavailableSnapshot(
      'TOPOLOGY_DATASET_UNAVAILABLE',
      'Import a dataset before checking topology.',
      exactToleranceMm,
    ));
  }
  if (!topologyGraph) {
    return publishSnapshot(unavailableSnapshot(
      'TOPOLOGY_GRAPH_UNAVAILABLE',
      'The committed topology graph is not available.',
      exactToleranceMm,
    ));
  }

  const attachmentModel = SupportRestraintStore.getAttachmentModel();
  const restraintModel = SupportRestraintStore.getRestraintModel();
  const basisKey = semanticHash({
    datasetId: dataset.datasetId,
    datasetVersion: dataset.version ?? null,
    sourceSha256: dataset.sourceSha256 ?? null,
    topologyGraphSemanticHash: topologyGraph.semanticHash ?? null,
    attachmentModelSemanticHash: attachmentModel?.semanticHash ?? null,
    restraintModelSemanticHash: restraintModel?.semanticHash ?? null,
    exactToleranceMm,
  });
  if (cachedSnapshot && cachedBasisKey === basisKey) return publishSnapshot(cachedSnapshot);

  try {
    const canonicalTopology = buildCanonicalTopologyFromWorkspaceDataset(
      dataset,
      topologyGraph,
      attachmentModel,
      restraintModel,
    );
    return evaluateCanonicalTopologyCheck({
      dataset,
      topologyGraph,
      canonicalTopology,
      basisKey,
      exactToleranceMm,
    });
  } catch (error) {
    return publishSnapshot(failedSnapshot(
      dataset,
      topologyGraph,
      error,
      exactToleranceMm,
    ));
  }
}

/**
 * Records the checker result for an already-built canonical topology. 3D Edit
 * uses this seam so its panel and Load Calc share identical canonical findings.
 */
export function evaluateCanonicalTopologyCheck(input) {
  assertEvaluationInput(input);
  const exactToleranceMm = input.exactToleranceMm
    ?? topologyEditFindingReviewStore.getGapAutofixToleranceMm();
  const issues = checkCanonicalTopology(input.canonicalTopology, {});
  const findings = issues.map((issue) => issueRecord(
    issue,
    input.dataset,
    input.canonicalTopology,
  ));
  const blockingFindings = findings.filter((finding) => finding.disposition === 'BLOCK');
  const reviewFindings = findings.filter((finding) => finding.disposition === 'REVIEW');
  const autoFixPlan = buildHighConfidenceGapAutofixPlan(
    issues,
    exactToleranceMm,
    TOPOLOGY_EDIT_NEAR_MATCH_GAP_MM,
  );
  const basis = {
    datasetId: stringValue(input.dataset.datasetId),
    datasetVersion: input.dataset.version ?? null,
    sourceSha256: stringValue(input.dataset.sourceSha256) || null,
    topologyGraphSemanticHash: stringValue(input.topologyGraph.semanticHash) || null,
    canonicalSourceHash: stringValue(input.canonicalTopology.sourceHash) || null,
    canonicalTopologyHash: stringValue(input.canonicalTopology.canonicalTopologyHash) || null,
  };
  const material = {
    schema: TOPOLOGY_EDIT_CHECK_SNAPSHOT_SCHEMA,
    state: blockingFindings.length > 0
      ? 'BLOCKED'
      : reviewFindings.length > 0
        ? 'REVIEW_REQUIRED'
        : 'READY',
    basis,
    issueCount: findings.length,
    blockingIssueCount: blockingFindings.length,
    reviewIssueCount: reviewFindings.length,
    issues,
    findings,
    blockingFindings,
    reviewFindings,
    countsByKind: countBy(findings, 'kind'),
    countsBySeverity: countBy(findings, 'severity'),
    autoFix: {
      exactToleranceMm: autoFixPlan.exactToleranceMm,
      nearToleranceMm: autoFixPlan.nearToleranceMm,
      certifiedExactGapCount: autoFixPlan.exactGapIssueIds.length,
      reviewOnlyNearGapCount: autoFixPlan.nearGapIssueIds.length,
      exactGapIssueIds: [...autoFixPlan.exactGapIssueIds],
      nearGapIssueIds: [...autoFixPlan.nearGapIssueIds],
    },
  };
  const snapshot = deepFreeze({
    ...material,
    snapshotHash: semanticHash(material),
  });
  cachedBasisKey = input.basisKey || semanticHash({ basis, exactToleranceMm });
  cachedSnapshot = snapshot;
  return publishSnapshot(snapshot);
}

export function invalidateTopologyCheckSnapshot() {
  cachedBasisKey = '';
  cachedSnapshot = null;
}

function issueRecord(issue, dataset, canonicalTopology) {
  const sourceScope = issueSourceScope(issue, dataset, canonicalTopology);
  return {
    id: issue.id,
    kind: issue.kind,
    severity: issue.severity,
    disposition: issue.severity === 'HIGH' ? 'BLOCK' : 'REVIEW',
    message: issue.message,
    nodeIds: [...(issue.nodeIds || [])],
    edgeIds: [...(issue.edgeIds || (issue.edgeId ? [issue.edgeId] : []))],
    suggestedAutofix: issue.suggestedAutofix,
    distanceMm: issue.distanceMm,
    sourceScope,
  };
}

function issueSourceScope(issue, dataset, canonicalTopology) {
  const requestedNodes = new Set(issue.nodeIds || []);
  const requestedEdges = new Set(issue.edgeIds || (issue.edgeId ? [issue.edgeId] : []));
  const entities = new Map((dataset.entities || []).map((entity) => [entity.entityId, entity]));
  const affectedEdges = (canonicalTopology.edges || []).filter((edge) => (
    requestedEdges.has(edge.id)
    || requestedNodes.has(edge.fromNodeId)
    || requestedNodes.has(edge.toNodeId)
  ));
  const affectedSupport = issue.supportId
    ? (canonicalTopology.supports || []).find((support) => support.id === issue.supportId)
    : null;
  const affectedEntities = [
    ...affectedEdges
    .map((edge) => entities.get(edge.componentKey))
    .filter(Boolean),
    entities.get(affectedSupport?.entityId),
  ].filter(Boolean);
  return {
    entityIds: uniqueSorted(affectedEntities.map((entity) => entity.entityId)),
    branchIds: uniqueSorted(affectedEntities.map((entity) => entity.branchId)),
    lineKeys: uniqueSorted(affectedEntities.map((entity) => entity.lineKey)),
  };
}

function unavailableSnapshot(code, message, exactToleranceMm) {
  const finding = systemFinding(code, message);
  const material = {
    schema: TOPOLOGY_EDIT_CHECK_SNAPSHOT_SCHEMA,
    state: 'NOT_AVAILABLE',
    basis: null,
    issueCount: 1,
    blockingIssueCount: 1,
    reviewIssueCount: 0,
    issues: [],
    findings: [finding],
    blockingFindings: [finding],
    reviewFindings: [],
    countsByKind: { [code]: 1 },
    countsBySeverity: { HIGH: 1 },
    autoFix: emptyAutoFix(exactToleranceMm),
  };
  return deepFreeze({ ...material, snapshotHash: semanticHash(material) });
}

function failedSnapshot(dataset, topologyGraph, error, exactToleranceMm) {
  const message = error instanceof Error ? error.message : String(error);
  const finding = systemFinding('TOPOLOGY_CHECK_FAILED', message);
  const material = {
    schema: TOPOLOGY_EDIT_CHECK_SNAPSHOT_SCHEMA,
    state: 'BLOCKED',
    basis: {
      datasetId: stringValue(dataset.datasetId),
      datasetVersion: dataset.version ?? null,
      sourceSha256: stringValue(dataset.sourceSha256) || null,
      topologyGraphSemanticHash: stringValue(topologyGraph.semanticHash) || null,
      canonicalSourceHash: null,
      canonicalTopologyHash: null,
    },
    issueCount: 1,
    blockingIssueCount: 1,
    reviewIssueCount: 0,
    issues: [],
    findings: [finding],
    blockingFindings: [finding],
    reviewFindings: [],
    countsByKind: { TOPOLOGY_CHECK_FAILED: 1 },
    countsBySeverity: { HIGH: 1 },
    autoFix: emptyAutoFix(exactToleranceMm),
  };
  return deepFreeze({ ...material, snapshotHash: semanticHash(material) });
}

function systemFinding(kind, message) {
  return deepFreeze({
    id: `system:${kind}`,
    kind,
    severity: 'HIGH',
    disposition: 'BLOCK',
    message,
    nodeIds: [],
    edgeIds: [],
    suggestedAutofix: null,
    distanceMm: null,
    sourceScope: { entityIds: [], branchIds: [], lineKeys: [] },
  });
}

function emptyAutoFix(exactToleranceMm) {
  return {
    exactToleranceMm,
    nearToleranceMm: TOPOLOGY_EDIT_NEAR_MATCH_GAP_MM,
    certifiedExactGapCount: 0,
    reviewOnlyNearGapCount: 0,
    exactGapIssueIds: [],
    nearGapIssueIds: [],
  };
}

function publishSnapshot(rawSnapshot) {
  const projected = topologyEditFindingReviewStore.projectSnapshot(rawSnapshot);
  topologyEditCheckSnapshotStore.setSnapshot(projected);
  return projected;
}

function countBy(rows, key) {
  return Object.fromEntries([...rows.reduce((counts, row) => {
    const value = stringValue(row[key]) || 'UNKNOWN';
    counts.set(value, (counts.get(value) || 0) + 1);
    return counts;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)));
}

function uniqueSorted(values) {
  return [...new Set(values.map(stringValue).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function assertEvaluationInput(input) {
  if (!input?.dataset?.datasetId) throw new TypeError('Topology check requires a dataset.');
  if (!input?.topologyGraph?.semanticHash) throw new TypeError('Topology check requires a current topology graph.');
  if (!input?.canonicalTopology?.canonicalTopologyHash) {
    throw new TypeError('Topology check requires finalized canonical topology.');
  }
}
