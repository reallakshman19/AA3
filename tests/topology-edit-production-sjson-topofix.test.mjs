import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { buildPipingPortTopologyGraph } from '../src/core/piping-topology/index.js';
import {
  buildRestraintCapabilityModel,
  buildSupportAttachmentModel,
} from '../src/core/support-restraints/index.js';
import { normalizeWorkspaceDataset } from '../src/workspace/dataset-adapter.js';
import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import { checkCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-checker.js';
import { TopologyEditCertifiedSession } from '../src/workspace/topology-edit/topology-edit-certified-session.js';
import {
  applyHighConfidenceGapAutofix,
  buildHighConfidenceGapAutofixPlan,
} from '../src/workspace/topology-edit/topology-edit-high-confidence-autofix.js';
import {
  buildCanonicalTopologyFromWorkspaceDataset,
} from '../src/workspace/topology-edit/topology-edit-source-adapter-dispatch.js';

const SJSON_URL = new URL('../public/Sjson.json', import.meta.url);

async function loadProductionSjsonCanonical() {
  const bytes = new Uint8Array(await readFile(SJSON_URL));
  const raw = JSON.parse(new TextDecoder().decode(bytes).replace(/^\uFEFF/u, ''));
  const dataset = normalizeWorkspaceDataset(raw, 'Sjson.json', {
    sourceBytes: bytes,
    sourceSha256: createHash('sha256').update(bytes).digest('hex'),
  });
  const graph = buildPipingPortTopologyGraph(dataset.sharedModel);
  const attachments = buildSupportAttachmentModel(dataset.sharedModel, graph);
  const restraints = buildRestraintCapabilityModel(attachments);
  return finalizeCanonicalTopology(buildCanonicalTopologyFromWorkspaceDataset(
    dataset,
    graph,
    attachments,
    restraints,
  ));
}

function snapGaps(topology) {
  return checkCanonicalTopology(topology).filter((issue) => issue.kind === 'SNAP_GAP');
}

test('production Sjson exposes its ~3 mm discontinuities to certified 3D Edit TopoFix', async () => {
  const canonical = await loadProductionSjsonCanonical();
  const issues = checkCanonicalTopology(canonical);
  const plan = buildHighConfidenceGapAutofixPlan(issues);
  const highConfidence = issues.filter((issue) => plan.exactGapIssueIds.includes(issue.id));

  assert.ok(highConfidence.length > 0, 'Production Sjson must expose at least one <6 mm SNAP_GAP.');
  assert.ok(highConfidence.every((issue) => (
    issue.kind === 'SNAP_GAP'
    && issue.suggestedAutofix === 'MERGE_NODES'
    && issue.distanceMm > 0
    && issue.distanceMm < 6
  )));
  assert.ok(
    highConfidence.some((issue) => Math.abs(issue.distanceMm - 3) <= 0.1),
    'Production Sjson is expected to retain at least one approximately 3 mm topology gap.',
  );
});

test('production Sjson TopoFix removes every certifiable <6 mm gap through the draft journal', async () => {
  const canonical = await loadProductionSjsonCanonical();
  const initialIssues = checkCanonicalTopology(canonical);
  const initialPlan = buildHighConfidenceGapAutofixPlan(initialIssues);
  assert.ok(initialPlan.exactGapIssueIds.length > 0, 'Production Sjson requires high-confidence gap fixtures.');

  const session = new TopologyEditCertifiedSession(canonical);
  const result = applyHighConfidenceGapAutofix(session, initialIssues);

  assert.ok(result.applied.length > 0, 'At least one production Sjson gap must certify and merge.');
  assert.equal(result.rejected.length, 0, JSON.stringify(result.rejected));
  assert.equal(result.remainingHighConfidenceGapIssueIds.length, 0);
  assert.equal(
    snapGaps(session.currentTopology()).filter((issue) => issue.distanceMm < 6).length,
    0,
  );
  assert.equal(session.journal.activeCommandIds.length, result.applied.length);

  const repairedHash = session.currentTopology().canonicalTopologyHash;
  for (let index = 0; index < result.applied.length; index += 1) session.undo();
  assert.equal(session.journal.activeCommandIds.length, 0);
  assert.equal(session.currentTopology().canonicalTopologyHash, canonical.canonicalTopologyHash);
  assert.notEqual(repairedHash, canonical.canonicalTopologyHash);
});
