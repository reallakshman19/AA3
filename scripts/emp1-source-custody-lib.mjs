import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename } from 'node:path';

const SHA1_HEX = /^[a-f0-9]{40}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const PINNED_COMMIT = 'dc1371afcd44c12de86b2dad6eddf00f1f0b3c55';
const PINNED_REPOSITORY = 'reallaksh19/XML_Compare_Utilities';

export const EMP1_SOURCE_CUSTODY_SCHEMA = 'emp1-source-ledger/v1';

export async function sha256File(filePath) {
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

export function validateEmp1SourceLedger(ledger) {
  if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger)) {
    return invalid('FAIL_LEDGER_NOT_OBJECT');
  }
  if (ledger.schema !== EMP1_SOURCE_CUSTODY_SCHEMA) return invalid('FAIL_LEDGER_SCHEMA');
  if (ledger.repository !== PINNED_REPOSITORY) return invalid('FAIL_LEDGER_REPOSITORY');
  if (ledger.pinnedCommit !== PINNED_COMMIT) return invalid('FAIL_LEDGER_PINNED_COMMIT');
  if (typeof ledger.path !== 'string' || !ledger.path.startsWith('docs/emp.1/')) {
    return invalid('FAIL_LEDGER_PATH');
  }
  if (typeof ledger.fileName !== 'string' || basename(ledger.path) !== ledger.fileName) {
    return invalid('FAIL_LEDGER_FILENAME');
  }
  if (!SHA1_HEX.test(ledger.gitBlobSha1 ?? '')) return invalid('FAIL_LEDGER_GIT_BLOB_SHA1');
  if (!Number.isSafeInteger(ledger.expectedByteCount) || ledger.expectedByteCount <= 0) {
    return invalid('FAIL_LEDGER_BYTE_COUNT');
  }
  if (ledger.rawPdfSha256 != null && !SHA256_HEX.test(ledger.rawPdfSha256)) {
    return invalid('FAIL_LEDGER_RAW_SHA256');
  }
  if (!['METHOD_SOURCE', 'BENCHMARK_SOURCE'].includes(ledger.authorityRole)) {
    return invalid('FAIL_LEDGER_AUTHORITY_ROLE');
  }
  return { status: 'PASS', code: 'PASS_LEDGER_METADATA' };
}

export async function inspectEmp1SourceFile({ ledger, filePath }) {
  const ledgerCheck = validateEmp1SourceLedger(ledger);
  if (ledgerCheck.status !== 'PASS') return ledgerCheck;

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        status: 'BLOCKED',
        code: 'BLOCKED_SOURCE_FILE_NOT_PRESENT',
        sourceId: ledger.sourceId,
        filePath,
      };
    }
    throw error;
  }

  if (!fileStat.isFile()) {
    return { status: 'FAIL', code: 'FAIL_SOURCE_PATH_NOT_FILE', sourceId: ledger.sourceId, filePath };
  }
  if (fileStat.size !== ledger.expectedByteCount) {
    return {
      status: 'FAIL',
      code: 'FAIL_SOURCE_BYTE_COUNT_MISMATCH',
      sourceId: ledger.sourceId,
      expectedByteCount: ledger.expectedByteCount,
      actualByteCount: fileStat.size,
    };
  }

  const actualSha256 = await sha256File(filePath);
  if (ledger.rawPdfSha256 == null) {
    return {
      status: 'BLOCKED',
      code: 'BLOCKED_RAW_SHA256_NOT_FROZEN',
      sourceId: ledger.sourceId,
      actualByteCount: fileStat.size,
      candidateRawPdfSha256: actualSha256,
      note: 'Review this independently observed hash, then freeze it in a source-only commit before benchmark extraction.',
    };
  }
  if (actualSha256 !== ledger.rawPdfSha256) {
    return {
      status: 'FAIL',
      code: 'FAIL_SOURCE_SHA256_MISMATCH',
      sourceId: ledger.sourceId,
      expectedRawPdfSha256: ledger.rawPdfSha256,
      actualRawPdfSha256: actualSha256,
    };
  }

  return {
    status: 'PASS',
    code: 'PASS_SOURCE_CUSTODY',
    sourceId: ledger.sourceId,
    actualByteCount: fileStat.size,
    rawPdfSha256: actualSha256,
  };
}

export function aggregateCustodyStatus(results) {
  if (results.some((row) => row.status === 'FAIL')) return 'FAIL';
  if (results.some((row) => row.status === 'BLOCKED')) return 'BLOCKED';
  return 'PASS';
}

function invalid(code) {
  return { status: 'FAIL', code };
}
