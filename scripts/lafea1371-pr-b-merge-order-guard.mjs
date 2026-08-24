#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { createLafeaMockDocument } from '../src/workspace/lafea-simulated-source-provider.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';

const providerUrl = new URL('../src/workspace/lafea3-simulated-domain-provider.js', import.meta.url);
if (!fs.existsSync(providerUrl)) {
  console.log(JSON.stringify({
    schema: 'lafea1371-pr-b-merge-order-guard/v1',
    status: 'NOT_APPLICABLE',
    reason: 'PR_B_SOURCE_FAITHFUL_PROVIDER_NOT_PRESENT_ON_THIS_BRANCH',
    requiredMergeOrder: 'PR-A -> PR-B -> PR-C -> PR-D',
  }, null, 2));
  process.exit(0);
}

const {
  createLafea3SimulatedDomainAndGeometryEvidence,
} = await import(providerUrl.href);

const stageId = 'LAFEA.3';
const composition = requireLafeaStageComposition(stageId);
const baseline = composition.normalizeDocument(await createLafeaMockDocument(stageId));
const editedInput = structuredClone(baseline);
const material = editedInput.materials.find((row) => row.materialId === 'MAT');
assert.ok(material, 'LAFEA.3 Sample MAT material is required');
assert.equal(material.elasticModulus, 200000);
material.elasticModulus = 210000;
const edited = composition.normalizeDocument(editedInput);
const authority = issueLafeaSourceAuthority(
  stageId,
  edited,
  'ISSUE-1371/PR-D/MERGE-ORDER-E-EDIT',
);
const parents = createLafea3SimulatedDomainAndGeometryEvidence(
  authority.sourceHash,
  edited,
);

assert.equal(parents.domain.sourceHash, authority.sourceHash);
assert.equal(parents.geometryEvidence.sourceHash, authority.sourceHash);
assert.equal(parents.geometryEvidence.analysisDomainHash, parents.domain.semanticHash);
assertSourcePhysicalAttachments(edited, parents.domain);
assert.ok(
  parents.geometryEvidence.geometry.vertices.some((row) => row.vertexId === 'N02'),
  'PR-B source-faithful geometry must retain restraint feature N02',
);
assert.ok(
  parents.geometryEvidence.geometry.vertices.some((row) => row.vertexId === 'N03'),
  'PR-B source-faithful geometry must retain restraint feature N03',
);

console.log(JSON.stringify({
  schema: 'lafea1371-pr-b-merge-order-guard/v1',
  status: 'PASS',
  requiredMergeOrder: 'PR-A -> PR-B -> PR-C -> PR-D',
  editedSourceHash: authority.sourceHash,
  analysisDomainHash: parents.domain.semanticHash,
  analysisGeometryHash: parents.geometryEvidence.analysisGeometryHash,
  attachmentCount: parents.domain.attachments.length,
  physicalCaseIds: parents.domain.physicalCases.map((row) => row.caseId),
  guardedEdit: 'MAT.elasticModulus 200000 -> 210000 MPa',
  sourceDocumentUsedForParentRegeneration: true,
}, null, 2));

function assertSourcePhysicalAttachments(source, domain) {
  const actual = new Map(domain.attachments.map((row) => [row.attachmentId, row]));
  const caseIds = source.loadCases.map((row) => row.loadCaseId);
  const expectedCount = source.constraints.length + source.loadCases.reduce(
    (sum, loadCase) => sum + loadCase.nodalForces.length,
    0,
  );
  assert.equal(actual.size, expectedCount, 'Every source restraint/load must map exactly once');

  for (const restraint of source.constraints) {
    const row = actual.get(restraint.constraintId);
    assert.ok(row, `Missing restraint attachment ${restraint.constraintId}`);
    assert.equal(row.kind, 'RESTRAINT');
    assert.equal(row.targetType, 'VERTEX');
    assert.equal(row.targetId, restraint.nodeId);
    assert.deepEqual([...row.physicalCaseIds].sort(), [...caseIds].sort());
    assert.deepEqual(
      row.payload,
      restraint.dof === 'UX' ? { ux: true } : { uy: true },
    );
  }

  for (const loadCase of source.loadCases) {
    for (const load of loadCase.nodalForces) {
      const row = actual.get(load.loadId);
      assert.ok(row, `Missing load attachment ${load.loadId}`);
      assert.equal(row.kind, 'CONCENTRATED_LOAD');
      assert.equal(row.targetType, 'VERTEX');
      assert.equal(row.targetId, load.nodeId);
      assert.deepEqual(row.physicalCaseIds, [loadCase.loadCaseId]);
      assert.deepEqual(row.payload, {
        fx: load.fx,
        fy: load.fy,
        unit: source.units.force,
      });
    }
  }
}
