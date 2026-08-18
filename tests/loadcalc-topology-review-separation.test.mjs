import test from 'node:test';
import assert from 'node:assert/strict';

import { renderLoadCalcTopologyPane } from '../src/workspace/load-calc-consumer-view.js';

const SUPPORT_SITES = Object.freeze({
  status: 'READY',
  summary: Object.freeze({ physicalLocationCount: 2 }),
  blockers: Object.freeze([]),
});
const ROUTES = Object.freeze({
  status: 'READY',
  summary: Object.freeze({ routeCount: 1 }),
  blockers: Object.freeze([]),
});

function finding(overrides) {
  return {
    id: 'finding',
    kind: 'TOPOLOGY_REVIEW',
    severity: 'MEDIUM',
    disposition: 'REVIEW',
    message: 'Review required.',
    reviewCategory: 'TOPOLOGY',
    userAction: 'ENGINEERING_REVIEW',
    sourceLabel: null,
    nodeIds: [],
    edgeIds: [],
    sourceScope: { branchIds: ['/B1'], lineKeys: [] },
    suggestedAutofix: null,
    distanceMm: null,
    ...overrides,
  };
}

test('LoadCalc separates certified geometry repair from support-semantic review', () => {
  const gap = finding({
    id: 'gap-1',
    kind: 'SNAP_GAP',
    reviewCategory: 'GEOMETRY',
    userAction: 'REVIEW_CERTIFIED_GAP_FIX',
    message: 'Positive source-backed endpoint gap.',
    distanceMm: 0.5,
  });
  const bracing = finding({
    id: 'support-1',
    kind: 'UNKNOWN_RESTRAINT_FAMILY',
    reviewCategory: 'SUPPORT_SEMANTICS',
    userAction: 'CLASSIFY_RESTRAINT_FAMILY',
    sourceLabel: 'BRACING SUPPORT BY CONTRACTOR',
    message: 'A source-backed restraint family is required.',
    sourceScope: { branchIds: ['/B3'], lineKeys: [] },
  });
  const topologyCheck = {
    issueCount: 2,
    blockingIssueCount: 0,
    reviewIssueCount: 2,
    skippedIssueCount: 0,
    findings: [gap, bracing],
    blockingFindings: [],
    reviewFindings: [gap, bracing],
    countsByKind: { SNAP_GAP: 1, UNKNOWN_RESTRAINT_FAMILY: 1 },
    autoFix: {
      exactToleranceMm: 1,
      certifiedExactGapCount: 1,
      exactGapIssueIds: ['gap-1'],
      reviewOnlyNearGapCount: 0,
      nearGapIssueIds: [],
    },
  };
  const container = { innerHTML: '' };

  renderLoadCalcTopologyPane(container, SUPPORT_SITES, ROUTES, topologyCheck, '');

  const html = container.innerHTML;
  assert.match(html, /data-topology-review-section="geometry-autofix"/u);
  assert.match(html, /Geometry only\./u);
  assert.match(html, /Prepare auto-fix \(1\)/u);
  assert.match(html, /data-topology-review-section="geometry"/u);
  assert.match(html, /Geometry &amp; gap findings/u);
  assert.match(html, /Auto-fix candidate at 0\.500 mm/u);
  assert.match(html, /data-topology-review-section="support-semantics"/u);
  assert.match(html, /Support semantics — engineering review/u);
  assert.match(html, /Gap tolerance and AutoFix do not apply to this section/u);
  assert.match(html, /Source evidence: BRACING SUPPORT BY CONTRACTOR/u);
  assert.match(html, /Source or approved master classification required; the gap limit does not apply/u);
  assert.match(html, /Support semantic reviews<\/span><strong>1<\/strong>/u);
  assert.match(html, /Geometry findings<\/span><strong>1<\/strong>/u);
  assert.ok(
    html.indexOf('data-topology-review-section="geometry"')
      < html.indexOf('data-topology-review-section="support-semantics"'),
    'Geometry review must remain visually separate from support semantics.',
  );
});

test('support-semantic review never enables gap AutoFix by itself', () => {
  const bracing = finding({
    id: 'support-1',
    kind: 'UNKNOWN_RESTRAINT_FAMILY',
    reviewCategory: 'SUPPORT_SEMANTICS',
    userAction: 'CLASSIFY_RESTRAINT_FAMILY',
    sourceLabel: 'BRACING SUPPORT BY CONTRACTOR',
    message: 'A source-backed restraint family is required.',
  });
  const topologyCheck = {
    issueCount: 1,
    blockingIssueCount: 0,
    reviewIssueCount: 1,
    skippedIssueCount: 0,
    findings: [bracing],
    blockingFindings: [],
    reviewFindings: [bracing],
    countsByKind: { UNKNOWN_RESTRAINT_FAMILY: 1 },
    autoFix: {
      exactToleranceMm: 1,
      certifiedExactGapCount: 0,
      exactGapIssueIds: [],
      reviewOnlyNearGapCount: 0,
      nearGapIssueIds: [],
    },
  };
  const container = { innerHTML: '' };

  renderLoadCalcTopologyPane(container, SUPPORT_SITES, ROUTES, topologyCheck, '');

  assert.match(container.innerHTML, /Prepare auto-fix \(0\)/u);
  assert.match(container.innerHTML, /data-load-calc-topology-autofix\s+disabled/u);
  assert.doesNotMatch(container.innerHTML, /data-topology-review-section="geometry"/u);
  assert.match(container.innerHTML, /data-topology-review-section="support-semantics"/u);
});
