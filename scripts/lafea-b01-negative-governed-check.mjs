#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOW_LEVEL = path.join(ROOT, 'scripts/lafea-b01-negative-route-check.mjs');
const args = parseArgs(process.argv.slice(2));
const reportDir = path.resolve(ROOT, args.reportDir ?? 'reports/qualification/B01/negative-governed');
const rawDir = path.join(reportDir, 'raw');
const cleanTreeAtStart = git(['status', '--porcelain=v1', '--untracked-files=all']) === '';
if (!cleanTreeAtStart && !args.allowDirty) throw new Error('B01 governed negative qualification requires a clean tree.');
fs.mkdirSync(rawDir, { recursive: true });

const child = spawnSync(process.execPath, [
  LOW_LEVEL,
  '--report-dir', rawDir,
  '--allow-dirty',
], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
if (!fs.existsSync(path.join(rawDir, 'B01-negative-master.json'))) {
  throw new Error(`Low-level negative matrix did not produce a master receipt: ${child.stderr || child.stdout}`);
}

const rawMaster = read(path.join(rawDir, 'B01-negative-master.json'));
const receiptFiles = fs.readdirSync(rawDir)
  .filter((name) => /^NEG-.*\.json$/u.test(name))
  .sort();
const receipts = receiptFiles.map((name) => read(path.join(rawDir, name)));
const governed = receipts.map(applyGovernedInterpretation);
const failed = governed.filter((row) => row.status !== 'PASS');
const gitHead = git(['rev-parse', 'HEAD']);

for (const row of governed) write(path.join(reportDir, `${row.negativeId}.json`), row);
const masterBase = {
  schema: 'lafea-b01-negative-governed-master/v1',
  issue: 1100,
  stageId: 'LAFEA.3',
  gitHead,
  cleanTreeAtStart,
  lowLevelRunner: path.relative(ROOT, LOW_LEVEL),
  lowLevelMasterEvidenceHash: rawMaster.evidenceHash,
  negativeDefinitionSha256: rawMaster.negativeDefinitionSha256,
  route: rawMaster.route,
  selectedRunCount: governed.length,
  passCount: governed.length - failed.length,
  failCount: failed.length,
  status: failed.length ? 'FAIL' : 'PASS',
  governedInterpretations: [
    'NEG-INVERTED-T3 may remain authoritative after deterministic T3 orientation canonicalization only when the B01 receipt retains source connectivity, canonical connectivity, negative source signed area, positive canonical signed area, and demonstrates a connectivity change.',
  ],
  failedRuns: failed.map((row) => ({
    negativeId: row.negativeId,
    expectedFirstBoundary: row.expectedFirstBoundary,
    observedPhase: row.observedPhase,
    observedDiagnostic: row.observedDiagnostic,
    qualificationState: row.qualificationState,
    acceptedByRegisteredAcceptance: row.acceptedByRegisteredAcceptance,
    authorityLeak: row.authorityLeak,
    failureReason: row.failureReason,
  })),
  forbiddenAfterRejection: rawMaster.forbiddenAfterRejection,
  releaseAuthorityGrantedByProgram: false,
};
const master = { ...masterBase, evidenceHash: canonicalLafeaSha256(masterBase) };
write(path.join(reportDir, 'B01-negative-master.json'), master);
console.log(JSON.stringify(master));
process.exit(master.status === 'PASS' ? 0 : 1);

function applyGovernedInterpretation(receipt) {
  if (receipt.negativeId !== 'NEG-INVERTED-T3') return receipt;
  const evidence = receipt.canonicalEvidence;
  const before = evidence?.sourceNodeIds;
  const after = evidence?.canonicalNodeIds;
  const beforeAfterRetained = Array.isArray(before)
    && Array.isArray(after)
    && before.length === 3
    && after.length === 3;
  const connectivityChanged = beforeAfterRetained && before.join('|') !== after.join('|');
  const signedGeometryRetained = Number(evidence?.sourceSignedAreaBeforeNormalization) < 0
    && Number(evidence?.canonicalSignedArea) > 0;
  const canonicalizedSafely = receipt.acceptedByRegisteredAcceptance === true
    && beforeAfterRetained
    && connectivityChanged
    && signedGeometryRetained;
  if (!canonicalizedSafely) return receipt;
  return {
    ...receipt,
    authorityLeak: false,
    specialEvidence: {
      ...(receipt.specialEvidence ?? {}),
      canonicalizedSafely: true,
      beforeAfterConnectivityRetainedInGovernedReceipt: true,
      signedGeometryRetainedInGovernedReceipt: true,
      deterministicT3OrientationPolicyPreserved: true,
    },
    status: 'PASS',
    failureReason: null,
  };
}

function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function write(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function parseArgs(values) {
  const output = { allowDirty: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--allow-dirty') output.allowDirty = true;
    else if (value === '--report-dir') output.reportDir = values[++index];
    else throw new Error(`Unknown argument ${value}.`);
  }
  return output;
}
function git(parameters) { return execFileSync('git', parameters, { cwd: ROOT, encoding: 'utf8' }).trim(); }
