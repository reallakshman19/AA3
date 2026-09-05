#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B02 = path.join(ROOT, 'validation/lafea-benchmark-data/B02');
const manifest = read('bucket-manifest.json');
const sources = read('sources/source-registry.json');
const cases = read('oracle/cases.json');
const expected = read('oracle/expected-values.json');
const ladders = read('convergence/mesh-ladders.json');
const probes = read('convergence/fixed-probes.json');
const negatives = read('governance/negative-cases.json');
const semantics = read('governance/fem-semantics.json');

assert.equal(manifest.schema, 'lafea-b02-solver-benchmark-manifest/v1');
assert.deepEqual(manifest.stageOrder, ['S0', 'S1', 'S2', 'S3', 'S4', 'S5']);
assert.equal(manifest.authority.productionOutputMayGenerateExpectedValues, false);
assert.equal(manifest.authority.performanceIsInformational, true);
assert.equal(manifest.authority.releaseAuthorityGranted, false);
assert.equal(manifest.scopeBoundary.productionMeshQualification, false);
assert.equal(expected.authority.productionOutputUsed, false);
assert.equal(expected.authority.productionOutputMayModifyExpectedValues, false);
assert.equal(semantics.invariants.movingMeshMaximumMayNotQualifyRichardsonGci, true);
assert.equal(semantics.invariants.releaseAuthorityGranted, false);

for (const stage of manifest.stages) {
  assert.ok(manifest.stageOrder.includes(stage.benchmarkStage));
  assert.ok(['READY', 'PLANNED'].includes(stage.definitionState));
  if (stage.definitionState !== 'READY') continue;
  assert.ok(stage.methods.length > 0, `${stage.benchmarkStage} READY stage requires methods`);
  for (const method of stage.methods) {
    assert.ok(method.command.length >= 2, `${method.methodId} command missing`);
    for (const sourceRef of method.sourceRefs) {
      assert.ok(fs.existsSync(path.join(ROOT, sourceRef)), `${method.methodId} missing sourceRef ${sourceRef}`);
    }
  }
}

assert.deepEqual(
  cases.cases.map((row) => row.caseId).sort(),
  expected.cases.map((row) => row.caseId).sort(),
);
for (const row of expected.cases) {
  requireCitation(row.caseId, row.citation);
  assert.equal(typeof row.acceptance.policyOrigin, 'string');
}

for (const probe of probes.probes) {
  assert.equal('nodeId' in probe, false, `${probe.probeId} may not use node identity`);
  assert.ok(Number.isFinite(probe.physicalCoordinateMm.x));
  assert.ok(Number.isFinite(probe.physicalCoordinateMm.y));
  assert.ok(expected.cases.some((row) => row.caseId === probe.caseId));
}
assert.ok(ladders.ladders.every((row) => row.primaryConvergenceQuantity === 'FIXED_PHYSICAL_PROBE'));
assert.equal(
  ladders.qualificationRule,
  'MOVING_PEAKS_AND_MESH_WIDE_MAXIMA_MAY_BE_RETAINED_AS_DIAGNOSTICS_BUT_NOT_USED_AS_RICHARDSON_GCI_QUANTITIES',
);

const requiredNegativeCodes = new Set([
  'UNDER_CONSTRAINED_OR_SINGULAR_SYSTEM',
  'DEGENERATE_ELEMENT',
  'Q8_NONPOSITIVE_JACOBIAN',
  'DUPLICATE_CONSTRAINT',
  'CONFLICTING_CONSTRAINT',
  'TRACTION_EDGE_NOT_BOUNDARY',
  'DISCONNECTED_UNREFERENCED_NODE',
  'DUPLICATE_ELEMENT_NODE_SET',
]);
for (const row of negatives.cases) requiredNegativeCodes.delete(row.expectedErrorCode);
assert.deepEqual([...requiredNegativeCodes], [], 'required S4 exact error codes must be frozen');

for (const source of sources.sources) {
  assert.match(source.blobSha, /^[0-9a-f]{40}$/u);
  const filePath = path.join(ROOT, source.path);
  assert.ok(fs.existsSync(filePath), `source registry path missing: ${source.path}`);
  assert.equal(git('hash-object', source.path).trim(), source.blobSha, `source custody drift: ${source.path}`);
}

const oracleCheck = spawnSync(
  'python3',
  [path.join(B02, 'oracle/independent-oracle.py'), '--check'],
  { cwd: ROOT, encoding: 'utf8' },
);
assert.equal(oracleCheck.status, 0, oracleCheck.stderr || oracleCheck.stdout);
const oraclePayload = JSON.parse(oracleCheck.stdout);
assert.equal(oraclePayload.productionOutputUsed, false);
assert.equal(oraclePayload.expectedValuesCheck, 'PASS');

console.log('LAFEA.3 BM-S B02 definition, source custody, cited oracle and exact-negative contract passed.');

function read(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(B02, relativePath), 'utf8'));
}

function requireCitation(caseId, citation) {
  for (const field of ['publisher', 'author', 'title', 'edition', 'year']) {
    assert.ok(citation[field], `${caseId} citation.${field} missing`);
  }
  assert.ok(Array.isArray(citation.pages) && citation.pages.length > 0, `${caseId} pages missing`);
  assert.ok(
    Array.isArray(citation.equationIdentifiers) && citation.equationIdentifiers.length > 0,
    `${caseId} equation identifiers missing`,
  );
}

function git(...args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}
