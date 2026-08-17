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
const CONTRACTOR_BRACING_BRANCH = '/ASIM-1885-10"-S8810101-91261M7-HC-01/B3';

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
  const restraintModel = buildRestraintCapabilityModel(attachments);
  const canonical = finalizeCanonicalTopology(buildCanonicalTopologyFromWorkspaceDataset(
    dataset,
    graph,
    attachments,
    restraintModel,
  ));
  return { dataset, canonical, restraintModel };
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
      restraintRole: support?.restraintRole || null,
      restraintRoleAuthority: support?.restraintRoleAuthority || null,
      supportType: support?.restraint?.supportType || null,
      source: Object.fromEntries([
        'SUPPORT_KIND', 'SUPPORT_MAPPER_KIND', 'SUPPORT_TYPE', 'CMPSUPTYPE',
        'MDSSUPPTYPE', 'CMPSTRESSN', 'NODETYPE', 'NODESTIFF', 'DTXR', 'ISONOTE',
        'NAME', 'SUPPORT_TAG', 'CMPSUPREFN', 'SPRE', 'MTOC', 'SPKBRK', 'FSTAT',
      ].filter((key) => attributes[key] !== undefined).map((key) => [key, attributes[key]])),
    };
  });
}

function canonicalSupportBySourceName(dataset, canonical, sourceName) {
  const entity = dataset.entities.find((candidate) => (
    candidate.properties?.attributes?.NAME === sourceName
  ));
  return canonical.supports.find((support) => support.entityId === entity?.entityId) || null;
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
  assert.equal(collect({ DTXR: 'PIPE SUPPORT TYPE-103' }).values.supportTypes, undefined);
  assert.equal(collect({ DTXR: 'WEAR PLATE TYPE-421 PAD L 700mm' }).values.supportTypes, undefined);
  assert.equal(collect({ CMPSUPTYPE: 'W.PAD THK 6mm' }).values.supportTypes, undefined);
  assert.equal(collect({ MDSSUPPTYPE: 'SH-150' }).values.supportTypes, undefined);
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

  const hardware = classifySjsonSupportProjection({
    NAME: '=1006657924/39571',
    SUPPORT_TAG: '=1006657924/39571',
    CMPSUPREFN: '=1006657924/39571',
    CMPSUPTYPE: '',
    SUPPORT_TYPE: '',
    SPRE: '/MDF/FT17-10.6-PMP',
    DTXR: 'PIPE SUPPORT TYPE-103',
    MTOC: 'OFF',
    SPKBRK: 'true',
  });
  assert.equal(hardware.disposition, 'DEFER_SUPPORT');
  assert.equal(hardware.attachmentClassification, 'REFERENCE_POINT');
  assert.equal(hardware.authority, 'SOURCE_SUPPORT_HARDWARE_MEMBER');

  const placeholder = classifySjsonSupportProjection({
    NAME: '=1006649732/51254',
    SUPPORT_TAG: '=1006649732/51254',
    CMPSUPREFN: '=1006649732/51254',
    SUPPORT_TYPE: '',
    CMPSUPTYPE: '',
    SPRE: '/91261M7r01-AMF1/ATTA-150',
    DTXR: '---',
    MTOC: 'OFF',
    SPKBRK: 'false',
    FSTAT: 'IGN',
  });
  assert.equal(placeholder.disposition, 'DEFER_SUPPORT');
  assert.equal(placeholder.attachmentClassification, 'REFERENCE_POINT');
  assert.equal(placeholder.authority, 'SOURCE_GENERIC_ATTACHMENT_PLACEHOLDER');

  const bracing = classifySjsonSupportProjection({
    NAME: '=1006649732/51465',
    SUPPORT_TAG: '=1006649732/51465',
    CMPSUPREFN: '=1006649732/51465',
    SUPPORT_TYPE: '',
    CMPSUPTYPE: '',
    SPRE: '/91261M7r01-AMF1/ATTA-20',
    DTXR: '---',
    ISONOTE: 'BRACING SUPPORT BY CONTRACTOR',
    MTOC: 'OFF',
    SPKBRK: 'false',
  });
  assert.equal(bracing.disposition, 'EMIT_SUPPORT_ATTACHMENT');
  assert.equal(bracing.family, undefined);

  const unknown = classifySjsonSupportProjection({
    NAME: '/PS-UNKNOWN',
    CMPSTRESSN: 'PS-UNKNOWN',
    NODETYPE: '14',
    DTXR: 'Generic support attachment',
  });
  assert.equal(unknown.disposition, 'EMIT_SUPPORT_ATTACHMENT');
  assert.equal(unknown.family, undefined);
});

test('production Sjson removes false support-family findings but keeps contractor bracing fail closed', async () => {
  const { dataset, canonical, restraintModel } = await loadProductionSjsonCanonical();

  for (const sourceName of [
    '=1006649732/51254',
    '=1006657924/39571',
    '=1006649732/51422',
  ]) {
    const support = canonicalSupportBySourceName(dataset, canonical, sourceName);
    assert.ok(support, `Expected canonical source support ${sourceName}.`);
    assert.equal(support.restraintRole, 'REFERENCE_POINT', sourceName);
  }

  const lineStopEntity = dataset.entities.find((entity) => (
    entity.category === 'support'
    && entity.properties?.attributes?.SUPPORT_TYPE === 'LINESTOP'
  ));
  assert.ok(lineStopEntity, 'Production Sjson must retain at least one LINESTOP source support.');
  const lineStopRestraint = restraintModel.restraints.find((row) => (
    row.supportKey === lineStopEntity.entityId
  ));
  assert.ok(lineStopRestraint);
  assert.equal(lineStopRestraint.supportType, 'LINE_STOP');
  assert.equal(lineStopRestraint.longitudinal.state, 'RESTRAINED');
  assert.equal(lineStopRestraint.longitudinal.basis, 'INFERRED_FROM_SUPPORT_TYPE');

  const unknown = checkCanonicalTopology(canonical)
    .filter((issue) => issue.kind === 'UNKNOWN_RESTRAINT_FAMILY');
  const details = unknownDetails(dataset, canonical, unknown);
  assert.equal(
    unknown.length,
    1,
    `Unexpected unresolved production restraint families:\n${JSON.stringify(details, null, 2)}`,
  );
  assert.equal(details[0].branchId, CONTRACTOR_BRACING_BRANCH);
  assert.equal(details[0].source.NAME, '=1006649732/51465');
  assert.equal(details[0].source.ISONOTE, 'BRACING SUPPORT BY CONTRACTOR');
});
