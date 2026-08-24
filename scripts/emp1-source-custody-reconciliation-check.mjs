import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEmp1SourceLedger } from './emp1-source-custody-lib.mjs';
import { EMP1_C_RETAINED_QUALIFICATION_EVIDENCE } from '../src/core/emp1/emp1-c-qualification-evidence.generated.js';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const WRC_SHA256 = '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
const CAUX_SHA256 = 'c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e';
const DATASET_HASH = 'fb440a292f8794430977f60f5365a678a9aff62a4dae3397621902964a0db73c';
const ORACLE_HASH = '60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18';

const wrc = await readJson('validation/emp1/wrc537-2013/source-ledger.json');
const caux = await readJson('validation/emp1/caux2017-wrc01f/source-ledger.json');
const profile = await readJson('validation/emp1/release/emp1-wrc537-gamma5-bounded-release-profile-v1.json');
const manifest = await readJson('validation/emp1/release/emp1-wrc537-gamma5-benchmark-manifest-v1.json');

assert.equal(validateEmp1SourceLedger(wrc).status, 'PASS');
assert.equal(validateEmp1SourceLedger(caux).status, 'PASS');

assertCurrentLedger(wrc, {
  sourceId: 'WRC537_2013',
  authorityRole: 'METHOD_SOURCE',
  path: 'docs/emp.1/WRC537_2013.pdf',
  fileName: 'WRC537_2013.pdf',
  gitBlobSha1: 'ce861233928154145a9257efbbf8dbef3f5a17d1',
  expectedByteCount: 1443744,
  rawPdfSha256: WRC_SHA256,
  authorityBoundary: 'SOURCE_CUSTODY_ONLY_NOT_WRC_METHOD_OR_RELEASE_AUTHORITY',
});
assertCurrentLedger(caux, {
  sourceId: 'CAUX_2017_WRC01F_PP24_31',
  authorityRole: 'BENCHMARK_SOURCE',
  path: 'docs/emp.1/CAUx 2017 - WRC01f.pdf',
  fileName: 'CAUx 2017 - WRC01f.pdf',
  gitBlobSha1: '76573b41462943b2987e28b23ebbbf7e51ac0a02',
  expectedByteCount: 7260396,
  rawPdfSha256: CAUX_SHA256,
  authorityBoundary: 'BENCHMARK_SOURCE_CUSTODY_ONLY_NOT_WRC_METHOD_AUTHORITY',
});
assert.deepEqual(caux.benchmarkPdfPages, [24, 25, 26, 27, 28, 29, 30, 31]);

const generated = EMP1_C_RETAINED_QUALIFICATION_EVIDENCE;
assert.equal(generated.wrcDataset.sourceCustodyQualified, true);
assert.equal(generated.wrcDataset.sourceCustodyState, 'VERIFIED');
assert.equal(generated.wrcDataset.sourceQualificationState, 'PASS_SOURCE_CUSTODY');
assert.equal(generated.wrcDataset.sourceRawPdfSha256, WRC_SHA256);
assert.equal(generated.cauxBenchmark.sourceCustodyQualified, true);
assert.equal(generated.cauxBenchmark.sourceCustodyState, 'VERIFIED');
assert.equal(generated.cauxBenchmark.sourceQualificationState, 'PASS_SOURCE_CUSTODY');
assert.equal(generated.cauxBenchmark.sourceRawPdfSha256, CAUX_SHA256);
assert.equal(generated.cauxBenchmark.expectedValuesFrozen, false);
assert.equal(generated.cauxBenchmark.independentHandCalculationStatus, 'NOT_RUN');
assert.equal(generated.methodAuthorization.engineeringUseAuthorized, false);

assert.equal(profile.method.sourceSha256, WRC_SHA256);
assert.equal(profile.method.datasetHash, DATASET_HASH);
assert.equal(profile.requiredAuthorities.sourceCustody.state, 'PASS_SOURCE_CUSTODY');
assert.equal(profile.releaseAuthority.engineeringUseAuthorized, false);
assert.equal(profile.releaseAuthority.productionUseAuthorized, false);
assert.equal(profile.releaseAuthority.deploymentAuthorized, false);
assert.equal(profile.benchmark.physicalOracleHash, ORACLE_HASH);

assert.equal(manifest.method.sourceSha256, WRC_SHA256);
assert.equal(manifest.method.datasetHash, DATASET_HASH);
assert.equal(manifest.physicalOracle.semanticHash, ORACLE_HASH);
assert.equal(manifest.caux.rawPdfSha256, CAUX_SHA256);
assert.equal(manifest.caux.sourceIdentityFrozen, true);
assert.equal(manifest.caux.expectedValuesFrozen, false);
assert.equal(manifest.caux.productionOutputUsedToChooseDefinition, false);

console.log(JSON.stringify({
  schema: 'emp1-source-custody-reconciliation-check/v1',
  status: 'PASS_SOURCE_CUSTODY_RECONCILED',
  authorityBoundary: 'SOURCE_CUSTODY_ONLY_NOT_METHOD_RELEASE_OR_CODE_AUTHORITY',
  sources: {
    wrc537_2013: WRC_SHA256,
    caux2017_wrc01f: CAUX_SHA256,
  },
  downstreamAuthority: {
    methodEngineeringUseAuthorized: false,
    releaseEngineeringUseAuthorized: false,
    productionUseAuthorized: false,
    deploymentAuthorized: false,
  },
}, null, 2));

function assertCurrentLedger(actual, expected) {
  assert.equal(actual.sourceId, expected.sourceId);
  assert.equal(actual.authorityRole, expected.authorityRole);
  assert.equal(actual.repository, 'reallaksh19/XML_Compare_Utilities');
  assert.equal(actual.pinnedCommit, 'dc1371afcd44c12de86b2dad6eddf00f1f0b3c55');
  assert.equal(actual.path, expected.path);
  assert.equal(actual.fileName, expected.fileName);
  assert.equal(actual.gitBlobSha1, expected.gitBlobSha1);
  assert.equal(actual.expectedByteCount, expected.expectedByteCount);
  assert.equal(actual.rawPdfSha256, expected.rawPdfSha256);
  assert.equal(actual.custodyState, 'VERIFIED');
  assert.equal(actual.qualificationState, 'PASS_SOURCE_CUSTODY');
  assert.equal(actual.reconciliation?.issue, 1389);
  assert.equal(actual.reconciliation?.state, 'CURRENT_CUSTODY_RECONCILED');
  assert.deepEqual(actual.reconciliation?.previousState, {
    rawPdfSha256: null,
    custodyState: 'UNRESOLVED_RAW_BYTES',
    qualificationState: 'BLOCKED',
  });
  assert.equal(actual.reconciliation?.rawBytesReobservedByThisReconciliationPr, false);
  assert.equal(actual.reconciliation?.productionObservationUsedToSetAuthority, false);
  assert.equal(actual.reconciliation?.authorityBoundary, expected.authorityBoundary);
  assert.ok(actual.reconciliation?.retainedEvidence?.includes(
    'src/core/emp1/emp1-c-qualification-evidence.generated.js',
  ));
  assert.ok(actual.reconciliation?.retainedEvidence?.includes('agents/PR1264_workreport.md'));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(repoRoot, relativePath), 'utf8'));
}
