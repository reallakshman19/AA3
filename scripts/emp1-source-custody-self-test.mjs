import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  aggregateCustodyStatus,
  gitBlobSha1File,
  inspectEmp1SourceFile,
  validateEmp1SourceLedger,
} from './emp1-source-custody-lib.mjs';

const fixture = Buffer.from('%PDF-1.4\nEMP1 SOURCE CUSTODY FIXTURE\n%%EOF\n', 'utf8');
const fixtureSha256 = '4d3a07202cdf6f54eab2661dd30f4c673cc651aff2f863258d2db02020dfb9f4';
const fixtureGitBlobSha1 = '69cbd1c41bcafeddd9ba48f5d01422496e4f615d';
const root = await mkdtemp(join(tmpdir(), 'emp1-custody-'));

try {
  const filePath = join(root, 'fixture.pdf');
  await writeFile(filePath, fixture);

  const baseLedger = {
    schema: 'emp1-source-ledger/v1',
    sourceId: 'SELF_TEST',
    authorityRole: 'METHOD_SOURCE',
    repository: 'reallaksh19/XML_Compare_Utilities',
    pinnedCommit: 'dc1371afcd44c12de86b2dad6eddf00f1f0b3c55',
    path: 'docs/emp.1/fixture.pdf',
    fileName: 'fixture.pdf',
    gitBlobSha1: fixtureGitBlobSha1,
    expectedByteCount: fixture.length,
    rawPdfSha256: fixtureSha256,
  };

  assert.deepEqual(validateEmp1SourceLedger(baseLedger), {
    status: 'PASS',
    code: 'PASS_LEDGER_METADATA',
  });

  assert.equal(await gitBlobSha1File(filePath, fixture.length), fixtureGitBlobSha1);

  const pass = await inspectEmp1SourceFile({ ledger: baseLedger, filePath });
  assert.equal(pass.status, 'PASS');
  assert.equal(pass.rawPdfSha256, fixtureSha256);
  assert.equal(pass.gitBlobSha1, fixtureGitBlobSha1);

  const pending = await inspectEmp1SourceFile({
    ledger: { ...baseLedger, rawPdfSha256: null },
    filePath,
  });
  assert.equal(pending.status, 'BLOCKED');
  assert.equal(pending.code, 'BLOCKED_RAW_SHA256_NOT_FROZEN');
  assert.equal(pending.candidateRawPdfSha256, fixtureSha256);
  assert.equal(pending.gitBlobSha1, fixtureGitBlobSha1);

  const wrongBlob = await inspectEmp1SourceFile({
    ledger: { ...baseLedger, gitBlobSha1: '0'.repeat(40) },
    filePath,
  });
  assert.equal(wrongBlob.status, 'FAIL');
  assert.equal(wrongBlob.code, 'FAIL_SOURCE_GIT_BLOB_MISMATCH');
  assert.equal(wrongBlob.actualGitBlobSha1, fixtureGitBlobSha1);

  const wrongHash = await inspectEmp1SourceFile({
    ledger: { ...baseLedger, rawPdfSha256: '0'.repeat(64) },
    filePath,
  });
  assert.equal(wrongHash.status, 'FAIL');
  assert.equal(wrongHash.code, 'FAIL_SOURCE_SHA256_MISMATCH');

  const wrongSize = await inspectEmp1SourceFile({
    ledger: { ...baseLedger, expectedByteCount: fixture.length + 1 },
    filePath,
  });
  assert.equal(wrongSize.status, 'FAIL');
  assert.equal(wrongSize.code, 'FAIL_SOURCE_BYTE_COUNT_MISMATCH');

  assert.equal(aggregateCustodyStatus([pass, pending]), 'BLOCKED');
  assert.equal(aggregateCustodyStatus([pass, wrongBlob]), 'FAIL');
  assert.equal(aggregateCustodyStatus([pass, wrongHash]), 'FAIL');
  assert.equal(aggregateCustodyStatus([pass]), 'PASS');

  console.log('EMP.1 source custody self-test: PASS');
} finally {
  await rm(root, { recursive: true, force: true });
}
