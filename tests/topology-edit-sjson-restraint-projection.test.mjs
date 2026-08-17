import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildPipingPortTopologyGraph } from '../src/core/piping-topology/index.js';
import {
  buildRestraintCapabilityModel,
  buildSupportAttachmentModel,
} from '../src/core/support-restraints/index.js';
import { normalizeWorkspaceDataset } from '../src/workspace/dataset-adapter.js';
import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import { checkCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-checker.js';
import { buildCanonicalTopologyFromWorkspaceDataset } from '../src/workspace/topology-edit/topology-edit-source-adapter.js';
import {
  buildSjsonParentBranchDiameterIndex,
} from '../src/workspace/topology-edit/topology-edit-sjson-parent-branch-diameter.js';
import {
  deriveSjsonTopoValidatorSupportProjection,
} from '../src/workspace/topology-edit/topology-edit-sjson-restraint-projection.js';
import {
  applySjsonParentBranchDiametersToSupportTopology,
} from '../src/workspace/topology-edit/topology-edit-sjson-support-parent-branch-diameter.js';
import {
  enrichCanonicalSupportsWithExactOrigins,
  supportTopologyForExactOrigins,
} from '../src/workspace/topology-edit/topology-edit-sjson-visual-authority.js';

const SJSON_URL = new URL('../public/Sjson.json', import.meta.url);
const NON_RESTRAINT_SOURCE_NAMES = Object.freeze([
  '=1006649732/51254',
  '=1006657924/39571',
  '=1006649732/51422',
]);
const CONTRACTOR_BRACING_SOURCE_NAME = '=1006649732/51465';

test('production Sjson projects only source-backed restraint semantics', async () => {
  const bytes = new Uint8Array(await readFile(SJSON_URL));
  const raw = JSON.parse(new TextDecoder().decode(bytes).replace(/^\uFEFF/u, ''));
  const dataset = normalizeWorkspaceDataset(raw, 'Sjson.json', {
    sourceBytes: bytes,
    sourceSha256: createHash('sha256').update(bytes).digest('hex'),
  });
  const graph = buildPipingPortTopologyGraph(dataset.sharedModel);
  const attachments = buildSupportAttachmentModel(dataset.sharedModel, graph);
  const restraints = buildRestraintCapabilityModel(attachments);
  const baseCanonical = finalizeCanonicalTopology(
    buildCanonicalTopologyFromWorkspaceDataset(dataset, graph, attachments, restraints),
  );

  assert.equal(baseCanonical.supports.length, 139);
  const penetrationAttachments = baseCanonical.supports.filter((support) => (
    support.restraintRole === 'PENETRATION_ATTACHMENT'
  ));
  assert.equal(penetrationAttachments.length, 2);
  assert.ok(penetrationAttachments.every((support) => (
    support.restraintRoleAuthority === 'NON_RESTRAINT_ATTACHMENT_DESCRIPTION'
  )));
  const penetrationSupportIds = new Set(penetrationAttachments.map((support) => support.id));
  assert.ok(checkCanonicalTopology(baseCanonical).every((issue) => (
    issue.kind !== 'UNKNOWN_RESTRAINT_FAMILY' || !penetrationSupportIds.has(issue.supportId)
  )));

  const canonicalByEntityId = new Map(baseCanonical.supports.map((support) => [
    support.entityId,
    support,
  ]));
  const entityBySourceName = new Map(dataset.entities.flatMap((entity) => {
    const sourceName = entity.properties?.attributes?.NAME;
    return sourceName ? [[sourceName, entity]] : [];
  }));
  for (const sourceName of NON_RESTRAINT_SOURCE_NAMES) {
    const entity = entityBySourceName.get(sourceName);
    const support = canonicalByEntityId.get(entity?.entityId);
    assert.ok(support, `Expected canonical support for ${sourceName}.`);
    assert.equal(support.restraintRole, 'REFERENCE_POINT', sourceName);
    assert.match(
      support.restraintRoleAuthority,
      /^SOURCE_(?:SUPPORT_HARDWARE_MEMBER|GENERIC_ATTACHMENT_PLACEHOLDER)$/u,
      sourceName,
    );
  }

  const unresolvedIssues = checkCanonicalTopology(baseCanonical)
    .filter((issue) => issue.kind === 'UNKNOWN_RESTRAINT_FAMILY');
  assert.equal(unresolvedIssues.length, 1);
  const contractorEntity = entityBySourceName.get(CONTRACTOR_BRACING_SOURCE_NAME);
  const contractorSupport = canonicalByEntityId.get(contractorEntity?.entityId);
  assert.ok(contractorSupport);
  assert.equal(contractorSupport.restraintRole, 'RESTRAINT_CANDIDATE');
  assert.equal(unresolvedIssues[0].supportId, contractorSupport.id);

  const canonical = enrichCanonicalSupportsWithExactOrigins(
    baseCanonical,
    dataset,
    attachments,
  );
  const exactSupportTopology = supportTopologyForExactOrigins(canonical);
  const supportTopology = applySjsonParentBranchDiametersToSupportTopology(
    exactSupportTopology,
    dataset,
    buildSjsonParentBranchDiameterIndex(dataset),
  );

  const first = deriveSjsonTopoValidatorSupportProjection({
    canonicalTopology: supportTopology,
    dataset,
    markerSizeMm: 70,
    verticalAxis: 'Z',
  });
  const second = deriveSjsonTopoValidatorSupportProjection({
    canonicalTopology: structuredClone(supportTopology),
    dataset: structuredClone(dataset),
    markerSizeMm: 70,
    verticalAxis: 'Z',
  });

  assert.equal(first.authority, 'TOPO_VALIDATOR_SUPPORT_HIERARCHY_POSITION_RESTRAINT_ARRAY');
  assert.equal(
    first.groupingAuthority,
    'MDSSREF_MDSGUIDEREF_PREV_NAME_THEN_POSITION_0_001MM',
  );
  assert.equal(first.restraintAuthority, 'TOPO_VALIDATOR_SJ_RESTRAINT_RESOLVER');
  assert.equal(first.authorityHash, second.authorityHash);
  assert.deepEqual(first.projection, second.projection);

  // Avoid pinning incidental grouping counts. These invariants are the
  // engineering contract: every source support is either projected or
  // explicitly deferred, anchors and marker geometry are deterministic, and
  // only source-backed restraint records create direction glyphs.
  assert.equal(first.metrics.rawSupportCount, canonical.supports.length);
  assert.equal(
    first.metrics.projectedSourceSupportCount + first.metrics.deferredSourceSupportCount,
    first.metrics.rawSupportCount,
  );
  assert.equal(first.metrics.supportAnchorCount, first.anchors.length);
  assert.equal(first.metrics.projectedSupportMarkerCount, first.projection.elements.length);
  assert.equal(first.metrics.projectedSupportMarkerCount, first.projection.glyphOverlays.length);
  assert.equal(
    first.metrics.nativeRestraintRecordCount,
    first.anchors.reduce((sum, anchor) => sum + anchor.restraintCount, 0),
  );
  assert.equal(first.decisions.length, canonical.supports.length);
  assert.ok(first.metrics.deferredSourceSupportCount >= penetrationAttachments.length + 3);
  assert.ok(first.anchors.every((anchor) => anchor.representativeSupportId));
  assert.ok(first.anchors.every((anchor) => anchor.memberSupportIds.length >= 1));
  assert.ok(first.anchors.every((anchor) => (
    anchor.restraintCount === anchor.restraintTypes.length
  )));
  const canonicalSupportIds = new Set(canonical.supports.map((support) => support.id));
  assert.ok(first.anchors.every((anchor) => (
    anchor.memberSupportIds.every((supportId) => canonicalSupportIds.has(supportId))
  )));

  const decisionBySupportId = new Map(first.decisions.map((decision) => [
    decision.supportId,
    decision,
  ]));
  for (const sourceName of NON_RESTRAINT_SOURCE_NAMES) {
    const support = canonicalByEntityId.get(entityBySourceName.get(sourceName)?.entityId);
    assert.equal(
      decisionBySupportId.get(support.id)?.disposition,
      'DEFER_NON_RESTRAINT_ATTACHMENT',
      sourceName,
    );
  }

  const contractorAnchorId = decisionBySupportId.get(contractorSupport.id)?.anchorSupportId;
  const contractorAnchor = first.anchors.find((anchor) => (
    anchor.representativeSupportId === contractorAnchorId
    || anchor.memberSupportIds.includes(contractorSupport.id)
  ));
  assert.ok(contractorAnchor, 'Contractor bracing support should remain visible as a support marker.');
  assert.equal(
    contractorAnchor.restraintCount,
    0,
    'Unknown contractor bracing must not be rendered as an invented REST/GUIDE/LINE_STOP glyph.',
  );

  assert.equal(
    first.overlays.flatMap((row) => row.restraints || [])
      .flatMap((row) => row.diagnostics || [])
      .filter((row) => row.code === 'HOST_OUTSIDE_DIAMETER_MISSING').length,
    0,
  );
});
