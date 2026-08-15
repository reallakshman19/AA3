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

/**
 * Applies each initially selected high-confidence gap through the existing
 * preview -> certification -> journal acceptance boundary. No workspace commit
 * occurs here; accepted commands remain undoable draft edits.
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

  for (const issueId of plan.exactGapIssueIds) {
    const currentIssues = checkCanonicalTopology(session.currentTopology(), options);
    const currentIssue = currentIssues.find((issue) => issue.id === issueId);
    if (!currentIssue) {
      skipped.push(Object.freeze({ issueId, reason: 'RESOLVED_BY_PRIOR_AUTOFIX' }));
      continue;
    }
    const currentPlan = buildHighConfidenceGapAutofixPlan([currentIssue], exactToleranceMm);
    if (!currentPlan.exactGapIssueIds.includes(issueId)) {
      rejected.push(Object.freeze({ issueId, reason: 'NO_LONGER_HIGH_CONFIDENCE' }));
      continue;
    }
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
  return Object.freeze({
    plan,
    applied: Object.freeze(applied),
    rejected: Object.freeze(rejected),
    skipped: Object.freeze(skipped),
    remainingHighConfidenceGapIssueIds: remaining.exactGapIssueIds,
  });
}
