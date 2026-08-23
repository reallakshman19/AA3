#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
if (!/^[0-9a-f]{40}$/u.test(options.expectedHead ?? '')) {
  throw manifestError('EMP1_REQUALIFICATION_MANIFEST_EXPECTED_HEAD_REQUIRED');
}
if (!options.observationPath || !options.replayReceiptPath
    || !options.falsifierReceiptPath || !options.writeManifest) {
  throw manifestError('EMP1_REQUALIFICATION_MANIFEST_PATHS_REQUIRED');
}

const actualHead = git(['rev-parse', 'HEAD']);
assert.equal(actualHead, options.expectedHead,
  `EMP1_REQUALIFICATION_MANIFEST_HEAD_MISMATCH:${actualHead}:${options.expectedHead}`);
const observedTreeSha = git(['rev-parse', 'HEAD^{tree}']);
const parentText = git(['show', '-s', '--format=%P', 'HEAD']);
const observedParentShas = parentText ? parentText.split(/\s+/u) : [];
observedParentShas.forEach((sha) => assert.match(sha, /^[0-9a-f]{40}$/u));

const [observationFile, replayFile, falsifierFile] = await Promise.all([
  readEvidence(options.observationPath),
  readEvidence(options.replayReceiptPath),
  readEvidence(options.falsifierReceiptPath),
]);
const observation = observationFile.json;
const replay = replayFile.json;
const falsifiers = falsifierFile.json;

assert.equal(observation.schema, 'emp1-wrc537-gamma5-exact-head-requalification-observation/v1');
assert.equal(observation.status,
  'PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED');
assert.equal(observation.observedHeadSha, options.expectedHead);
assert.equal(observation.authorization.productionRouteAuthorizedBeforeObservation, false);
assert.equal(observation.authorization.authorizationChangeAppliedByThisObservation, false);
assert.equal(observation.authorization.globalEmp1CRouteAuthority, false);
assert.equal(observation.authorization.codeComplianceAuthorized, false);
assert.equal(observation.authorization.releaseQualified, false);

assert.equal(replay.schema,
  'emp1-wrc537-gamma5-requalification-observation-replay-check/v1');
assert.equal(replay.status,
  'PASS_REQUALIFICATION_OBSERVATION_SUBORDINATE_REPLAY_ROUTE_STILL_SUSPENDED');
assert.equal(replay.observedHeadSha, options.expectedHead);
assert.equal(replay.observationSemanticHash, observation.observationSemanticHash);
assert.equal(replay.productionRouteAuthorized, false);
assert.equal(replay.authorizationChangeApplied, false);

assert.equal(falsifiers.schema,
  'emp1-wrc537-gamma5-requalification-observation-falsifiers/v1');
assert.equal(falsifiers.status,
  'PASS_REQUALIFICATION_OBSERVATION_ANTI_FORGERY_FALSIFIERS');
assert.equal(falsifiers.observedHeadSha, options.expectedHead);
assert.equal(falsifiers.observationSemanticHash, observation.observationSemanticHash);
assert.equal(falsifiers.baselineReplayRequiredAndPassed, true);
assert.equal(falsifiers.mutationCount, 10);
assert.equal(falsifiers.detections.length, 10);
assert.ok(falsifiers.detections.every((value) => value.detected === true));
assert.equal(falsifiers.productionRouteAuthorized, false);
assert.equal(falsifiers.authorizationChangeApplied, false);

const githubActions = process.env.GITHUB_ACTIONS === 'true';
const payload = {
  schema: 'emp1-wrc537-gamma5-requalification-evidence-manifest/v1',
  observedHeadSha: options.expectedHead,
  observedTreeSha,
  observedParentShas,
  executionContext: {
    githubActions,
    githubEventName: githubActions ? process.env.GITHUB_EVENT_NAME ?? null : null,
    githubRef: githubActions ? process.env.GITHUB_REF ?? null : null,
    githubBaseRef: githubActions ? process.env.GITHUB_BASE_REF ?? null : null,
    githubHeadRef: githubActions ? process.env.GITHUB_HEAD_REF ?? null : null,
    githubRunId: githubActions ? process.env.GITHUB_RUN_ID ?? null : null,
    githubRunAttempt: githubActions ? process.env.GITHUB_RUN_ATTEMPT ?? null : null,
  },
  evidenceFiles: [
    evidenceDescriptor(options.observationPath, observationFile, observation.schema, observation.status),
    evidenceDescriptor(options.replayReceiptPath, replayFile, replay.schema, replay.status),
    evidenceDescriptor(options.falsifierReceiptPath, falsifierFile, falsifiers.schema, falsifiers.status),
  ],
  observationSemanticHash: observation.observationSemanticHash,
  candidateQualificationSha256: observation.candidateQualificationSha256,
  oracleSemanticHash: observation.oracleSemanticHash,
  sourceDocumentSha256: observation.sourceDocumentSha256,
  datasetHash: observation.datasetHash,
  loadProducerQualificationSha256: observation.loadProducerQualificationSha256,
  qualificationSummary: {
    physicalWrcLoadsPassed: observation.physicalWrcLoadComparisons.length,
    stressComparisonsPassed: observation.stressComparisons.length,
    maxToleranceRatio: observation.maxToleranceRatio,
    subordinateReplayPassed: true,
    antiForgeryFalsifiersPassed: falsifiers.mutationCount,
  },
  authorization: {
    productionRouteAuthorized: false,
    authorizationChangeAppliedByEvidenceBundle: false,
    globalEmp1CRouteAuthority: false,
    codeComplianceAuthorized: false,
    releaseQualified: false,
  },
};
assert.equal(payload.qualificationSummary.physicalWrcLoadsPassed, 6);
assert.equal(payload.qualificationSummary.stressComparisonsPassed, 32);
assert.ok(payload.qualificationSummary.maxToleranceRatio >= 0
  && payload.qualificationSummary.maxToleranceRatio <= 1);

const manifest = {
  ...payload,
  evidenceBundleSemanticHash: sha256Canonical(payload),
  status: 'PASS_EXACT_HEAD_EVIDENCE_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED',
};
await writeFile(resolve(root, options.writeManifest), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest, null, 2));

function evidenceDescriptor(path, file, schema, status) {
  return {
    path,
    sha256: file.sha256,
    schema,
    status,
  };
}
async function readEvidence(path) {
  const buffer = await readFile(resolve(root, path));
  return {
    json: JSON.parse(buffer.toString('utf8')),
    sha256: createHash('sha256').update(buffer).digest('hex'),
  };
}
function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}
function parseArgs(args) {
  const out = {
    expectedHead: null,
    observationPath: null,
    replayReceiptPath: null,
    falsifierReceiptPath: null,
    writeManifest: null,
  };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--expected-head') out.expectedHead = args[++index] ?? null;
    else if (args[index] === '--observation') out.observationPath = args[++index] ?? null;
    else if (args[index] === '--replay-receipt') out.replayReceiptPath = args[++index] ?? null;
    else if (args[index] === '--falsifier-receipt') out.falsifierReceiptPath = args[++index] ?? null;
    else if (args[index] === '--write-manifest') out.writeManifest = args[++index] ?? null;
    else throw manifestError(`EMP1_REQUALIFICATION_MANIFEST_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  return out;
}
function sha256Canonical(value) {
  return createHash('sha256').update(JSON.stringify(sortValue(value)), 'utf8').digest('hex');
}
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}
function manifestError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
