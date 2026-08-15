import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import { checkCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-checker.js';
import { TopologyEditCertifiedSession } from '../src/workspace/topology-edit/topology-edit-certified-session.js';
import {
  applyHighConfidenceGapAutofix,
  buildHighConfidenceGapAutofixPlan,
} from '../src/workspace/topology-edit/topology-edit-high-confidence-autofix.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (relativePath) => readFile(path.join(ROOT, relativePath), 'utf8');

function threeRunTopology(secondStartMm = 3, thirdStartMm = 103) {
  return finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1',
    datasetId: 'TOPOFIX-HIGH-CONFIDENCE',
    datasetVersion: 0,
    sourceHash: 'source:topofix-high-confidence',
    topologyGraphHash: 'graph:topofix-high-confidence',
    nodes: [
      { id: 'node:a0', position: { x: -100, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:a1', position: { x: 0, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:b0', position: { x: secondStartMm, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:b1', position: { x: 100, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:c0', position: { x: thirdStartMm, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:c1', position: { x: 200, y: 0, z: 0 }, portKeys: [] },
    ],
    edges: [
      { id: 'edge:a', componentKey: 'P-A', fromNodeId: 'node:a0', toNodeId: 'node:a1', entityType: 'PIPE', sourcePath: '/a' },
      { id: 'edge:b', componentKey: 'P-B', fromNodeId: 'node:b0', toNodeId: 'node:b1', entityType: 'PIPE', sourcePath: '/b' },
      { id: 'edge:c', componentKey: 'P-C', fromNodeId: 'node:c0', toNodeId: 'node:c1', entityType: 'PIPE', sourcePath: '/c' },
    ],
    junctions: [], supports: [], boundaries: [], rigids: [],
  });
}

function snapGaps(topology) {
  return checkCanonicalTopology(topology).filter((issue) => issue.kind === 'SNAP_GAP');
}

test('TopoFix sequentially certifies and journals all independent 3 mm gaps', () => {
  const session = new TopologyEditCertifiedSession(threeRunTopology(3, 103));
  const issues = checkCanonicalTopology(session.currentTopology());
  const plan = buildHighConfidenceGapAutofixPlan(issues);

  assert.equal(plan.exactGapIssueIds.length, 2);
  assert.equal(plan.nearGapIssueIds.length, 0);
  assert.deepEqual(snapGaps(session.currentTopology()).map((issue) => issue.distanceMm), [3, 3]);

  const result = applyHighConfidenceGapAutofix(session, issues);
  assert.equal(result.applied.length, 2);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.remainingHighConfidenceGapIssueIds.length, 0);
  assert.equal(session.journal.activeCommandIds.length, 2);
  assert.equal(snapGaps(session.currentTopology()).length, 0);

  session.undo();
  session.undo();
  assert.deepEqual(snapGaps(session.currentTopology()).map((issue) => issue.distanceMm), [3, 3]);
});

test('TopoFix applies only <6 mm gaps and leaves 6-25 mm findings for review', () => {
  const session = new TopologyEditCertifiedSession(threeRunTopology(3, 120));
  const issues = checkCanonicalTopology(session.currentTopology());
  const plan = buildHighConfidenceGapAutofixPlan(issues);

  assert.equal(plan.exactGapIssueIds.length, 1);
  assert.equal(plan.nearGapIssueIds.length, 1);
  assert.deepEqual(snapGaps(session.currentTopology()).map((issue) => issue.distanceMm), [3, 20]);

  const result = applyHighConfidenceGapAutofix(session, issues);
  assert.equal(result.applied.length, 1);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.remainingHighConfidenceGapIssueIds.length, 0);
  assert.deepEqual(snapGaps(session.currentTopology()).map((issue) => issue.distanceMm), [20]);
});

test('6 mm boundary is not auto-applied', () => {
  const topology = threeRunTopology(6, 106);
  const plan = buildHighConfidenceGapAutofixPlan(checkCanonicalTopology(topology));
  assert.equal(plan.exactGapIssueIds.length, 0);
  assert.equal(plan.nearGapIssueIds.length, 2);

  const session = new TopologyEditCertifiedSession(topology);
  const result = applyHighConfidenceGapAutofix(session);
  assert.equal(result.applied.length, 0);
  assert.equal(session.journal.activeCommandIds.length, 0);
});

test('3D Edit issue surface exposes TopoFix without bypassing certified session', async () => {
  const issueController = await source('src/workspace/topology-edit-3d-issue-controller.js');
  const helper = await source('src/workspace/topology-edit/topology-edit-high-confidence-autofix.js');

  for (const token of [
    'autofix-high-confidence-gaps',
    'TopoFix — AutoFix &lt;6 mm gaps',
    'applyHighConfidenceGapFixes()',
    'applyCertifiedHighConfidenceGapAutofix(this.session, this.issues)',
  ]) assert.ok(issueController.includes(token), `missing ${token}`);

  for (const token of [
    'session.autofixSuggestions([currentIssue])',
    'session.previewAutofix(suggestion)',
    'session.acceptAutofix(preview)',
    'TopologyEditAutofixGrouper.groupIssues',
  ]) assert.ok(helper.includes(token), `missing ${token}`);

  for (const prohibited of [
    'WorkspaceState.update',
    'WorkspaceState.replace',
    'applyCanonicalTopologyToWorkspaceEntities',
    'TopologyEditAutofixController.accept',
  ]) assert.equal(helper.includes(prohibited), false, `helper must not use ${prohibited}`);
});
