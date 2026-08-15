/** Certified sequential TopoFix for high-confidence SNAP_GAP findings. */
import { checkCanonicalTopology } from './topology-edit-checker.js';
import { TopologyEditAutofixGrouper } from './topology-edit-autofix-grouper.js';

export const TOPOLOGY_EDIT_HIGH_CONFIDENCE_GAP_MM = 6;
export const TOPOLOGY_EDIT_NEAR_MATCH_GAP_MM = 25;

function checkerOptions(session) {
  const policy = session?.checkerPolicy;
  if (!policy || typeof policy !== 'object') return {};
  return {
    shortElementThresholdMm: policy.shortElementThresholdMm,
    snapGapToleranceMm: policy.snapGapToleranceMm,
  };
}

function isCertifiedGapIssue(issue) {
  return issue?.kind === 'SNAP_GAP'
    && issue?.suggestedAutofix === 'MERGE_NODES'
    && Number.isFinite(Number(issue.distanceMm));
}

export function buildHighConfidenceGapAutofixPlan(
  issues = [],
  exactToleranceMm = TOPOLOGY_EDIT_HIGH_CONFIDENCE_GAP_MM,
  nearToleranceMm = TOPOLOGY_EDIT_NEAR_MATCH_GAP_MM,
) {
  const grouped = TopologyEditAutofixGrouper.groupIssues(
    issues,
    exactToleranceMm,
    nearToleranceMm,
  );
  const exactGaps = grouped.buckets.exactMerges.filter(isCertifiedGapIssue);
  const nearGaps = grouped.buckets.nearMatches.filter(isCertifiedGapIssue);
  return Object.freeze({
    exactToleranceMm,
    nearToleranceMm,
    exactGapIssueIds: Object.freeze(exactGaps.map((issue) => issue.id)),
    nearGapIssueIds: Object.freeze(nearGaps.map((issue) => issue.id)),
  });
}

function currentHighConfidenceIssues(session, options, exactToleranceMm) {
  const issues = checkCanonicalTopology(session.currentTopology(), options);
  const plan = buildHighConfidenceGapAutofixPlan(issues, exactToleranceMm);
  const exactIds = new Set(plan.exactGapIssueIds);
  return {
    issues,
    plan,
    exactIssues: issues.filter((issue) => exactIds.has(issue.id)),
  };
}

/**
 * Repeatedly scans the current certified draft and applies one high-confidence
 * SNAP_GAP at a time through preview -> certification -> journal acceptance.
 * Re-scanning after every merge prevents stale issue identities from driving a
 * later command. Rejected issue identities are not retried in the same run.
 * No workspace commit occurs here; accepted commands remain undoable drafts.
 */
export function applyHighConfidenceGapAutofix(
  session,
  issues = null,
  exactToleranceMm = TOPOLOGY_EDIT_HIGH_CONFIDENCE_GAP_MM,
) {
  if (!session?.currentTopology || !session?.autofixSuggestions
      || !session?.previewAutofix || !session?.acceptAutofix) {
    throw new TypeError('High-confidence TopoFix requires a certified topology-edit session.');
  }
  const options = checkerOptions(session);
  const initialIssues = Array.isArray(issues)
    ? issues
    : checkCanonicalTopology(session.currentTopology(), options);
  const plan = buildHighConfidenceGapAutofixPlan(initialIssues, exactToleranceMm);
  const applied = [];
  const rejected = [];
  const skipped = [];
  const attemptedIssueIds = new Set();
  const nodeCount = session.currentTopology()?.nodes?.length ?? 0;
  // Accepted MERGE_NODES commands reduce node count, while several candidate
  // open-endpoint pairs may independently fail certification. A quadratic
  // bound covers every possible undirected endpoint pair without an unbounded
  // UI loop if a malformed checker/session repeatedly returns fresh identities.
  const maxAttempts = Math.max(1, nodeCount * nodeCount);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const current = currentHighConfidenceIssues(session, options, exactToleranceMm);
    const currentIssue = current.exactIssues.find((issue) => !attemptedIssueIds.has(issue.id));
    if (!currentIssue) break;
    const issueId = currentIssue.id;
    attemptedIssueIds.add(issueId);

    const suggestion = session.autofixSuggestions([currentIssue])[0];
    if (!suggestion) {
      rejected.push(Object.freeze({ issueId, reason: 'NO_CERTIFIED_SUGGESTION' }));
      continue;
    }
    const preview = session.previewAutofix(suggestion);
    if (preview.disposition !== 'ACCEPTED') {
      rejected.push(Object.freeze({
        issueId,
        reason: preview.guardReasons?.join(',') || preview.disposition,
      }));
      continue;
    }
    const transition = session.acceptAutofix(preview);
    if (transition.disposition !== 'ACCEPTED') {
      rejected.push(Object.freeze({
        issueId,
        reason: transition.reason || transition.disposition,
      }));
      continue;
    }
    applied.push(Object.freeze({
      issueId,
      commandType: suggestion.commandType,
      suggestionHash: suggestion.suggestionHash,
      certificationHash: preview.certificationHash,
      candidateDraftHash: preview.candidateDraftHash,
    }));
  }

  const finalIssues = checkCanonicalTopology(session.currentTopology(), options);
  const remaining = buildHighConfidenceGapAutofixPlan(finalIssues, exactToleranceMm);
  for (const issueId of plan.exactGapIssueIds) {
    if (!finalIssues.some((issue) => issue.id === issueId)) {
      const appliedDirectly = applied.some((row) => row.issueId === issueId);
      if (!appliedDirectly) {
        skipped.push(Object.freeze({ issueId, reason: 'RESOLVED_BY_PRIOR_AUTOFIX' }));
      }
    }
  }
  return Object.freeze({
    plan,
    applied: Object.freeze(applied),
    rejected: Object.freeze(rejected),
    skipped: Object.freeze(skipped),
    remainingHighConfidenceGapIssueIds: remaining.exactGapIssueIds,
  });
}
