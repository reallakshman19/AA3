#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'validation/lafea-b02-definitions');
const manifest = read('frozen-definition-manifest.json');
const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, manifest.methodApplicabilitySource), 'utf8'));
const definitions = Object.fromEntries(Object.entries(manifest.definitionFiles).map(([id, relative]) => [
  id,
  JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8')),
]));

proveCustodyCheckerIndependence();
assert.equal(manifest.schema, 'lafea-b02-frozen-definition-manifest/v2');
assert.equal(manifest.stageId, 'LAFEA.3');
assert.equal(manifest.originalFreeze.adoptedG4ParentExactHead, 'c3fb24b5fc354763e5fd8f86161da14ac228e80b');
assert.equal(manifest.originalFreeze.definitionFreezeExactHead, 'aada7ae6bcf3943b0d02eb11e74b48705a2648e9');
assert.equal(manifest.originalFreeze.g4ParentGate, 'PASS');
assert.equal(manifest.originalFreeze.frozenBeforeAnyB02ProductionObservation, true);
assert.equal(manifest.originalFreeze.productionOutputUsedToGenerateTargetsTolerancesProbesOrMeshes, false);
assert.equal(manifest.integration.postAuditMainBaseline, '793f359c0bcb59296cf4541430855f79357c4329');
assert.equal(manifest.integration.integratedG4ExactHead, '28ba56a5452166b2791656cedd0d0fd9ccd4b121');
assert.equal(manifest.integration.definitionsCopiedByteIdenticallyFromOriginalFreeze, true);
assert.equal(manifest.integration.integratedG4RuntimeQualification, 'NOT_RUN');
assert.equal(manifest.integration.releaseAuthorityGranted, false);
assert.equal(manifest.authority.b02Qualified, false);
assert.equal(manifest.authority.releaseAuthorityGranted, false);
assert.equal(manifest.authority.temperatureAuthorityGranted, false);

const definitionBlobCustody = {};
for (const [id, relative] of Object.entries(manifest.definitionFiles)) {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  const blobSha = gitBlobSha1(bytes);
  assert.equal(blobSha, manifest.originalFrozenDefinitionGitBlobs[id], `${id} frozen definition bytes changed`);
  definitionBlobCustody[id] = blobSha;
}
// Amended frozen definitions: registered after the original freeze, so they are
// held under their own byte custody rather than backdated into it. Registration
// pins the bytes; it does not adopt the amendment into the production sequence.
const amendedBlobCustody = {};
for (const [id, relative] of Object.entries(manifest.amendedDefinitionFiles ?? {})) {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  const blobSha = gitBlobSha1(bytes);
  assert.equal(blobSha, manifest.amendedFrozenDefinitionGitBlobs?.[id],
    `${id} amended frozen definition bytes changed`);
  const amendment = manifest.amendments?.[id];
  assert.ok(amendment, `${id} amended definition must record an amendment entry`);
  assert.equal(amendment.frozenAfterOriginalFreeze, true);
  assert.equal(amendment.productionOutputUsedToChooseDefinition, false);
  assert.equal(amendment.hardQualityThresholdsChanged, false);
  assert.equal(amendment.methodApplicabilityUnchanged, true);

  const definition = JSON.parse(bytes.toString('utf8'));
  assert.ok(
    ['lafea-b02-frozen-benchmark-definition/v1',
      'lafea-b02-frozen-benchmark-definition/v2'].includes(definition.schema),
    `${id} unexpected frozen definition schema ${definition.schema}`,
  );
  assert.equal(definition.caseId, id);
  assert.equal(definition.stageId, 'LAFEA.3');
  assert.equal(definition.definitionState, 'FROZEN_BEFORE_PRODUCTION_OBSERVATION');
  assert.equal(definition.productionOutputUsedToChooseDefinition, false);
  assert.equal(definition.authority.benchmarkQualified, false);
  assert.equal(definition.authority.releaseAuthorityGranted, false);
  assert.equal(definition.authority.temperatureAuthorityGranted, false);

  // An amendment may not silently redefine which methods the benchmark requires.
  const superseded = definitions[amendment.supersedes];
  assert.ok(superseded, `${id} must supersede a registered frozen definition`);
  assert.deepEqual(
    definition.globalResponseLadder.methods,
    superseded.globalResponseLadder.methods,
    `${id} may not change method applicability of ${amendment.supersedes}`,
  );
  amendedBlobCustody[id] = blobSha;
}

const integratedG4CustodyMode = verifyIntegratedG4Custody();

const matrixById = new Map(matrix.matrix.map((row) => [row.benchmarkId, row]));
for (const [id, definition] of Object.entries(definitions)) {
  assert.equal(definition.schema, 'lafea-b02-frozen-benchmark-definition/v1');
  assert.equal(definition.caseId, id);
  assert.equal(definition.stageId, 'LAFEA.3');
  assert.equal(definition.definitionState, 'FROZEN_BEFORE_PRODUCTION_OBSERVATION');
  assert.equal(definition.productionOutputUsedToChooseDefinition, false);
  assert.equal(definition.authority.benchmarkQualified, false);
  assert.equal(definition.authority.releaseAuthorityGranted, false);
  assert.equal(definition.authority.temperatureAuthorityGranted, false);
  assert.ok(matrixById.has(id));
}

assert.deepEqual(definitions.B02A.meshLadder.methods, pickMethods(matrixById.get('B02A')));
assert.deepEqual(definitions.B02B.meshLadder.methods, pickMethods(matrixById.get('B02B')));
assert.deepEqual(definitions.B02C.meshLadder.methods, pickMethods(matrixById.get('B02C')));
assert.deepEqual(definitions.B02D.globalResponseLadder.methods, pickMethods(matrixById.get('B02D')));
assert.deepEqual(definitions.B02E.methods, pickMethods(matrixById.get('B02E')));

for (const id of ['B02A', 'B02B', 'B02C']) {
  assertFrozenLadder(definitions[id].meshLadder);
}
assertFrozenLadder(definitions.B02D.globalResponseLadder);
validateFrozenCantileverAttachmentSemantics(definitions.B02A);
validateFrozenCantileverAttachmentSemantics(definitions.B02B);
assert.deepEqual(definitions.B02D.globalResponseLadder.levels.map((row) => row.historicalT6ControlElementCount), [64, 256, 1024, 4096]);
assert.deepEqual(definitions.B02D.globalResponseLadder.evaluatedConvergenceLevels, ['L2', 'L3', 'L4']);
assert.equal(definitions.B02D.globalResponseLadder.historicalCountsAreControlsNotProducerGuarantees, true);
assert.deepEqual(definitions.B02C.meshLadder.levels.map((row) => row.historicalT6ControlElementCount), [64, 256, 1024]);
assert.equal(definitions.B02C.meshLadder.historicalCountsAreControlsNotProducerGuarantees, true);
assert.equal(definitions.B02D.fixedProbeMeshPolicy.anchorCellWidthContraction, 'EXACT_FACTOR_TWO_PER_LEVEL');
assert.equal(definitions.B02D.fixedProbeMeshPolicy.minimumParametricDiagonalSeparation, 0.3);

for (const id of ['B02A', 'B02B', 'B02C']) validateProbeSet(definitions[id].fixedProbes);
validateProbeSet(definitions.B02D.fixedProbes);
for (const station of definitions.B02D.fixedPath.stations) {
  assert.ok(['HIGH_GRADIENT_CONVERGENCE', 'NON_SINGULAR_CONVERGENCE'].includes(station.singularityClassification));
}
assert.equal(definitions.B02C.acceptance.finiteDomainErrorMustBeReportedSeparately, true);
assert.equal(definitions.B02C.acceptance.movingMaximumAllowed, false);
assert.equal(definitions.B02D.acceptance.movingMaximumAllowed, false);

const e = definitions.B02E;
assert.equal(e.definitionObservationSeparationRequired, true);
assert.equal(e.minimumUsefulLevels, 3);
assert.equal(e.frozenRules.refinementRatio, 2);
assert.equal(e.frozenRules.gciSafetyFactor, 1.25);
assert.equal(e.frozenRules.fixedPhysicalQuantityIdentityRequired, true);
assert.equal(e.frozenRules.singularPointwisePeaksExcluded, true);
assert.equal(e.frozenRules.movingMaximumForbidden, true);
assert.deepEqual(e.subBucketBindings.B02A.h, definitions.B02A.meshLadder.levels.map((row) => row.h));
assert.deepEqual(e.subBucketBindings.B02B.h, definitions.B02B.meshLadder.levels.map((row) => row.h));
assert.deepEqual(e.subBucketBindings.B02C.h, definitions.B02C.meshLadder.levels.map((row) => row.h));
assert.deepEqual(e.subBucketBindings.B02D.h, definitions.B02D.globalResponseLadder.levels.slice(1).map((row) => row.h));
for (const binding of Object.values(e.subBucketBindings)) {
  assertRatio2(binding.h.map((h, index) => ({ levelId: binding.levelIds[index], h })));
}

assert.equal(definitions.B02B.independentOracle.authority, 'TIMOSHENKO_CANTILEVER_PLUS_JOURAWSKI_RECTANGULAR_SHEAR_ENGINEERING_THEORY');
assert.ok(definitions.B02B.independentOracle.shearEnergyFraction > 0.70);
assert.equal(definitions.B02B.title.toUpperCase().includes('PURE SHEAR PATCH'), false);
for (const definition of Object.values(definitions)) {
  for (const source of definition.independentOracle?.sourceRefs ?? definition.historicalDefinitionSources ?? []) {
    assert.ok(fs.existsSync(path.join(ROOT, source)), `missing frozen source ${source}`);
  }
}

const definitionHashes = Object.fromEntries(Object.entries(manifest.definitionFiles).map(([id, relative]) => {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  return [id, `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`];
}));
console.log(JSON.stringify({
  schema: 'lafea-b02-definition-freeze-receipt/v3',
  status: 'PASS',
  authorityBoundary: 'IMMUTABLE_FROZEN_DEFINITION_CUSTODY_ONLY',
  originalFreezeHead: manifest.originalFreeze.definitionFreezeExactHead,
  integratedG4ExactHead: manifest.integration.integratedG4ExactHead,
  integratedG4CustodyMode,
  definitionBlobCustody,
  amendedBlobCustody,
  amendmentsAdoptedIntoProductionSequence: Object.values(manifest.amendments ?? {})
    .some((row) => row.adoptedIntoProductionSequence === true),
  definitionHashes,
  definitionsByteIdenticalToOriginalFreeze: true,
  methodsMatchGate0Matrix: true,
  registeredMeshIntentContractCheckedSeparately: true,
  productionRouteImportedByCustodyCheck: false,
  b02bIsGenuinelyNonUniformShear: true,
  historicalResultsPromotedToQualification: false,
  productionOutputUsedToChooseDefinitions: false,
  integratedG4RuntimeQualification: manifest.integration.integratedG4RuntimeQualification,
  releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false,
}));

function proveCustodyCheckerIndependence() {
  const source = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const staticImportSpecifiers = [...source.matchAll(
    /^\s*import\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"];?\s*$/gmu,
  )].map((match) => match[1]);
  assert.ok(staticImportSpecifiers.length >= 6, 'Frozen-custody checker import inventory is incomplete.');
  assert.equal(staticImportSpecifiers.every((specifier) => specifier.startsWith('node:')), true,
    `Frozen-custody checker may import Node built-ins only: ${staticImportSpecifiers.join(', ')}`);
}
function verifyIntegratedG4Custody() {
  try {
    execFileSync('git', ['cat-file', '-e', `${manifest.integration.integratedG4ExactHead}^{commit}`], { cwd: ROOT, stdio: 'ignore' });
    execFileSync('git', ['merge-base', '--is-ancestor', manifest.integration.integratedG4ExactHead, 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
    return 'LOCAL_GIT_ANCESTRY';
  } catch {
    assert.match(manifest.integration.integratedG4ExactHead, /^[0-9a-f]{40}$/u);
    return 'MANIFEST_BOUND_SHALLOW_CHECKOUT';
  }
}
function read(name) { return JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8')); }
function pickMethods(row) { return { T3: row.T3, T6: row.T6, Q8: row.Q8 }; }
function gitBlobSha1(bytes) {
  const prefix = Buffer.from(`blob ${bytes.length}\0`);
  return crypto.createHash('sha1').update(prefix).update(bytes).digest('hex');
}
function assertRatio2(levels) {
  assert.ok(levels.length >= 3);
  for (let i = 1; i < levels.length; i += 1) {
    assert.ok(Math.abs(levels[i - 1].h / levels[i].h - 2) < 1e-12, 'frozen h ratio must equal 2');
  }
}
function assertFrozenLadder(ladder) {
  assert.equal(ladder.requestSchema, 'REGISTERED_LAFEA_MESH_GENERATION_INTENT_V2');
  assertRatio2(ladder.levels);
  for (const level of ladder.levels) {
    assert.equal(level.h, level.targetElementLength);
  }
}
function validateFrozenCantileverAttachmentSemantics(definition) {
  const rows = definition.loadCase.routeAttachmentSemantics;
  assert.equal(rows.length, 2);
  const restraint = rows.find((row) => row.kind === 'RESTRAINT');
  const traction = rows.find((row) => row.kind === 'TRACTION');
  assert.equal(restraint.targetType, 'EDGE');
  assert.deepEqual(restraint.payload, { ux: true, uy: true });
  assert.equal(traction.targetType, 'EDGE');
  assert.deepEqual(Object.keys(traction.payload).sort(), ['tx', 'ty', 'unit']);
  assert.equal(traction.payload.tx, 0);
  assert.ok(Number.isFinite(traction.payload.ty));
  assert.equal(traction.payload.unit, 'MPa');
}
function validateProbeSet(probes) {
  assert.ok(Array.isArray(probes) && probes.length > 0);
  for (const probe of probes) {
    for (const key of ['probeId', 'physicalCoordinate', 'coordinateFrame', 'loadCaseId', 'quantityId', 'representation', 'recoveryMethod', 'units', 'singularityClassification']) {
      assert.ok(probe[key] !== undefined, `${probe.probeId} missing ${key}`);
    }
    assert.equal(probe.coordinateFrame, 'GLOBAL_XY');
    assert.equal(probe.representation, 'PHYSICAL_POINT_DIRECT');
    assert.ok(Number.isFinite(probe.physicalCoordinate.x) && Number.isFinite(probe.physicalCoordinate.y));
  }
}
