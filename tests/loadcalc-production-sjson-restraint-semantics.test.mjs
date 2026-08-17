import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { createEvidenceIndex } from '../src/core/shared-piping-model/evidence-index.js';
import { SUPPORT_EVIDENCE_SPECS } from '../src/core/shared-piping-model/property-specs.js';
import { collectSupportEvidence } from '../src/core/shared-piping-model/support-evidence.js';
import { buildPipingPortTopologyGraph } from '../src/core/piping-topology/index.js';
import {
  buildRestraintCapabilityModel,
  buildSupportAttachmentModel,
} from '../src/core/support-restraints/index.js';
import { normalizeWorkspaceDataset } from '../src/workspace/dataset-adapter.js';
import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import { checkCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-checker.js';
import {
  classifySjsonSupportProjection,
} from '../src/workspace/topology-edit/topology-edit-sjson-support-classification.js';
import {
  buildCanonicalTopologyFromWorkspaceDataset,
} from '../src/workspace/topology-edit/topology-edit-source-adapter-dispatch.js';

const SJSON_URL = new URL('../public/Sjson.json', import.meta.url);

function collect(attributes) {
  const roots = [['attributes', attributes]];
  return collectSupportEvidence(
    SUPPORT_EVIDENCE_SPECS,
    roots,
    'fixture-support',
    createEvidenceIndex(roots),
  );
}

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
  const canonical = finalizeCanonicalTopology(buildCanonicalTopologyFromWorkspaceDataset(
    dataset,
    graph,
    attachments,
    restraints,
  ));
  return { dataset, canonical };
}

function unknownDetails(dataset, canonical, issues) {
  const supports = new Map(canonical.supports.map((support) => [support.id, support]));
  const entities = new Map(dataset.entities.map((entity) => [entity.entityId, entity]));
  return issues.map((issue) => {
    const support = supports.get(issue.supportId);
    const entity = entities.get(support?.entityId);
    const attributes = entity?.properties?.attributes || {};
    return {
      branchId: entity?.branchId || null,
      supportId: issue.supportId,
      restraintId: issue.restraintId,
      entityId: support?.entityId || null,
      name: entity?.name || null,
      supportType: support?.restraint?.supportType || null,
      source: Object.fromEntries([
        'SUPPORT_KIND', 'SUPPORT_MAPPER_KIND', 'SUPPORT_TYPE', 'CMPSUPTYPE',
        'MDSSUPPTYPE', 'CMPSTRESSN', 'NODETYPE', 'DTXR', 'ISONOTE', 'NAME',
        'SUPPORT_TAG', 'CMPSUPREFN',
      ].filter((key) => attributes[key] !== undefined).map((key) => [key, attributes[key]])),
    };
  });
}

test('fallback support-family evidence is priority ordered and fail closed', () => {
  assert.equal(collect({ SUPPORT_KIND: 'REST' }).values.supportTypes?.[0]?.value, 'REST');
  assert.equal(collect({ MDSSUPPTYPE: 'GT01' }).values.supportTypes?.[0]?.value, 'GUIDE');
  assert.equal(collect({ MDSSUPPTYPE: 'ST06' }).values.supportTypes?.[0]?.value, 'LINE_STOP');
  assert.equal(
    collect({ DTXR: 'Directional Anchor On Shoe for Hot Insulated Pipe 6-XST06-40' })
      .values.supportTypes?.[0]?.value,
    'LINE_STOP',
  );
  assert.equal(collect({ DTXR: 'Pipe Rest XRT01' }).values.supportTypes?.[0]?.value, 'REST');
  assert.equal(collect({ DTXR: 'Generic support attachment' }).values.supportTypes, undefined);
});

test('SJSON non-restraint semantics outrank weak support-object signals', () => {
  const penetration = classifySjsonSupportProjection({
    DTXR: 'ATTA FOR FLOOR OPENING',
    ISONOTE: 'FENCE PENETRATION',
    CMPSTRESSN: 'PENE-001',
    NODETYPE: '14',
    NODESTIFF: '1751270031350',
  });
  assert.equal(penetration.disposition, 'DEFER_SUPPORT');
  assert.equal(penetration.attachmentClassification, 'PENETRATION_ATTACHMENT');

  const reference = classifySjsonSupportProjection({
    NAME: '/PS-100/SREF',
    CMPSTRESSN: 'PS-100/SREF',
    NODETYPE: '14',
  });
  assert.equal(reference.disposition, 'DEFER_SUPPORT');
  assert.equal(reference.attachmentClassification, 'REFERENCE_POINT');

  const unknown = classifySjsonSupportProjection({
    NAME: '/PS-UNKNOWN',
    CMPSTRESSN: 'PS-UNKNOWN',
    NODETYPE: '14',
    DTXR: 'Generic support attachment',
  });
  assert.equal(unknown.disposition, 'EMIT_SUPPORT_ATTACHMENT');
  assert.equal(unknown.family, undefined);
});

test('production Sjson has no false UNKNOWN_RESTRAINT_FAMILY findings', async () => {
  const { dataset, canonical } = await loadProductionSjsonCanonical();
  const unknown = checkCanonicalTopology(canonical)
    .filter((issue) => issue.kind === 'UNKNOWN_RESTRAINT_FAMILY');
  assert.equal(
    unknown.length,
    0,
    `Unexpected unresolved production restraint families:\n${JSON.stringify(
      unknownDetails(dataset, canonical, unknown),
      null,
      2,
    )}`,
  );
});
