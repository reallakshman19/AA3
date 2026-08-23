#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION,
  EMP1_WRC537_GAMMA5_ZERO_DP_BENCHMARK_QUALIFICATION,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
import {
  EMP1_C_BOUNDED_PRODUCTION_ROUTES,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256,
  EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';
import {
  evaluateEmp1CQualificationState,
} from '../src/core/emp1/emp1-c-qualification-state.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
const HISTORICAL_QUALIFICATION = '3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e';
const CANDIDATE_QUALIFICATION = '9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7';
const HISTORICAL_ORACLE = '5daeb3a84828cf19017e6d1d0a70bd3478929713973948f875f21cec463a80aa';
const POST_AUTHORITY_ORACLE = '60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18';
const ROUTE_PATH = 'src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
const REGISTRY_PATH = 'src/core/emp1/emp1-c-bounded-route-registry.js';
const AUTHORIZATION_RECORD_PATH = 'validation/emp1/wrc537-2013/gamma5-zero-dp-route-authorization-v1.json';
const FORBIDDEN_GLOBAL_PATHS = Object.freeze([
  'src/core/emp1/emp1-c-qualification-evidence.generated.js',
  'src/core/emp1/emp1-c-qualification-state.js',
  'validation/emp1/wrc537-2013/emp1-c-method-authorization-v1.json',
]);
const REVIEW_FALSIFIER_NAMES = Object.freeze([
  'local-suite-semantic-hash-corruption',
  'local-suite-authorization-escalation-with-rehash',
  'local-manifest-github-context-pollution-with-coordinated-rehash',
  'producer-step-stdout-hash-substitution-with-local-rehash',
  'manifest-qualification-count-downgrade-with-coordinated-rehash',
  'stored-observation-authorization-escalation',
]);

if (!/^[0-9a-f]{40}$/u.test(options.expectedHead ?? '')) {
  throw proposalError('EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_EXPLICIT_EXPECTED_HEAD_REQUIRED');
}
if (!options.evidenceDir) {
  throw proposalError('EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_EVIDENCE_DIR_REQUIRED');
}
const actualHead = git(['rev-parse', 'HEAD']);
assert.equal(actualHead, options.expectedHead,
  `EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_HEAD_MISMATCH:${actualHead}:${options.expectedHead}`);

const evidenceDir = resolve(root, options.evidenceDir);
const evidence = await readEvidenceSet(evidenceDir);
verifyReviewEvidence(evidence);
await replayReviewEvidence(evidenceDir, evidence);
verifyCurrentSuspendedProductionState();
const candidate = await readJson(resolve(root,
  'validation/emp1/wrc537-2013/gamma5-zero-dp-route-qualification-v2.json'));
verifyCandidate(candidate);

const routeSource = await sourceDescriptor(ROUTE_PATH);
const registrySource = await sourceDescriptor(REGISTRY_PATH);
const globalQualificationState = evaluateEmp1CQualificationState();
assert.equal(globalQualificationState.runAuthorized, false,
  'EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_GLOBAL_C_MUST_REMAIN_BLOCKED');
assert.equal(globalQualificationState.engineeringUseAuthorized, false,
  'EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_GLOBAL_C_ENGINEERING_AUTHORITY_MUST_REMAIN_FALSE');

const mutations = canonicalMutations();
const payload = {
  schema: 'emp1-wrc537-gamma5-bounded-authorization-proposal/v1',
  proposalIsAuthorization: false,
  observedSuspendedHeadSha: options.expectedHead,
  observedSuspendedTreeSha: git(['rev-parse', 'HEAD^{tree}']),
  observedSuspendedParentShas: git(['show', '-s', '--format=%P', 'HEAD'])
    .split(/\s+/u).filter(Boolean),
  evidenceCustody: {
    evidenceDirectoryName: basename(evidenceDir),
    localSuiteSemanticHash: evidence.localReceipt.localSuiteSemanticHash,
    evidenceBundleSemanticHash: evidence.manifest.evidenceBundleSemanticHash,
    independentReviewSemanticHash: evidence.reviewReceipt.reviewSemanticHash,
    reviewFalsifierReceiptSha256: evidence.reviewFalsifier.bufferSha256,
    producerHeadSha: evidence.localReceipt.observedHeadSha,
    independentReviewHeadSha: evidence.reviewReceipt.observedHeadSha,
    reviewFalsifierHeadSha: evidence.reviewFalsifier.json.observedHeadSha,
    independentReviewReceiptReproducedByteIdentical: true,
    reviewFalsifierReceiptReproducedByteIdentical: true,
  },
  qualifiedSuccessor: {
    candidateQualificationSha256: CANDIDATE_QUALIFICATION,
    postAuthorityOracleSemanticHash: POST_AUTHORITY_ORACLE,
    supersedesQualificationSha256: HISTORICAL_QUALIFICATION,
    supersedesOracleHash: HISTORICAL_ORACLE,
    sourceDocumentSha256: candidate.semanticPayload.sourceDocumentSha256,
    datasetHash: candidate.semanticPayload.datasetHash,
    loadProducerQualificationSha256: candidate.semanticPayload.loadProducerQualificationSha256,
  },
  currentProductionPreimage: {
    routeSource,
    registrySource,
    routeQualificationSha256: EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256,
    routeAuthorized: EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
    routeSuspensionReasons: [...EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS],
    methodEngineeringUseAuthorized: EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.engineeringUseAuthorized,
    methodProductionUseAuthorized: EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.productionUseAuthorized,
    benchmarkHash: EMP1_WRC537_GAMMA5_ZERO_DP_BENCHMARK_QUALIFICATION.benchmarkHash,
    registryQualificationSha256: EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256,
  },
  proposedBoundedAuthorization: {
    routeId: EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
    shellFamily: 'CYLINDRICAL',
    attachmentShape: 'ROUND',
    variant: 'ORIGINAL',
    gamma: 5,
    betaMinimum: 0.05,
    betaMaximum: 0.5,
    differentialPressure: 0,
    Kn: 1,
    Kb: 1,
    productionRouteAuthorized: true,
    boundedEngineeringUseAuthorized: true,
    globalEmp1CRouteAuthority: false,
    codeComplianceAuthorized: false,
    releaseQualified: false,
  },
  exactAllowedFutureMutations: mutations,
  futureChangeFileAllowlist: [ROUTE_PATH, REGISTRY_PATH, AUTHORIZATION_RECORD_PATH],
  forbiddenGlobalAuthorityFiles: [...FORBIDDEN_GLOBAL_PATHS],
  retainedAuthorizationRecordRequirement: {
    required: true,
    path: AUTHORIZATION_RECORD_PATH,
    schema: 'emp1-wrc537-gamma5-bounded-route-authorization/v1',
    mustReferenceProposalSemanticHash: true,
    mustReferenceFiles01Through07: true,
    mustRetainPostPromotionExactHeadEvidence: true,
  },
  postPromotionGate: {
    exactHeadRequalificationRequired: true,
    authorizationHeadMustDifferFromSuspendedEvidenceHead: true,
    promotionMayNotBeDeclaredCompleteFromThisProposal: true,
    globalEmp1CQualificationStateMustRemainBlocked: true,
  },
  authorityBoundary: {
    globalEmp1CRouteAuthority: false,
    codeComplianceAuthorized: false,
    releaseQualified: false,
    nonzeroDifferentialPressureAllowed: false,
    nonUnityStressConcentrationAllowed: false,
    offAxisLongitudinalMomentMaximumAllowed: false,
    gammaOtherThan5Allowed: false,
    betaOutside0p05To0p5Allowed: false,
  },
};
const proposal = {
  ...payload,
  proposalSemanticHash: sha256Canonical(payload),
  status: 'READY_TO_DRAFT_SEPARATE_BOUNDED_AUTHORIZATION_CHANGE_NOT_AUTHORIZED',
};
if (options.writeProposal) {
  const expected = join(evidenceDir, '08-bounded-authorization-proposal.json');
  assert.equal(resolve(root, options.writeProposal), expected,
    'EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_MUST_BE_08_IN_EVIDENCE_DIRECTORY');
  await writeFile(expected, `${JSON.stringify(proposal, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(proposal, null, 2));

function verifyReviewEvidence(set) {
  const { localReceipt, manifest, reviewReceipt, reviewFalsifier } = set;
  assert.equal(localReceipt.status,
    'PASS_LOCAL_EXACT_HEAD_REQUALIFICATION_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED');
  assert.equal(localReceipt.observedHeadSha, options.expectedHead);
  assert.equal(localReceipt.localSuiteSemanticHash, semanticHash(localReceipt, 'localSuiteSemanticHash'));
  assert.equal(localReceipt.authorization.productionRouteAuthorized, false);
  assert.equal(localReceipt.authorization.globalEmp1CRouteAuthority, false);
  assert.equal(localReceipt.authorization.codeComplianceAuthorized, false);
  assert.equal(localReceipt.authorization.releaseQualified, false);
  assert.equal(manifest.status,
    'PASS_EXACT_HEAD_EVIDENCE_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED');
  assert.equal(manifest.observedHeadSha, options.expectedHead);
  assert.equal(manifest.evidenceBundleSemanticHash, semanticHash(manifest, 'evidenceBundleSemanticHash'));
  assert.equal(reviewReceipt.schema, 'emp1-wrc537-gamma5-independent-review-gate/v1');
  assert.equal(reviewReceipt.status,
    'PASS_INDEPENDENT_EXACT_HEAD_EVIDENCE_REPLAY_READY_FOR_SEPARATE_AUTHORIZATION_REVIEW_ROUTE_STILL_SUSPENDED');
  assert.equal(reviewReceipt.observedHeadSha, options.expectedHead);
  assert.equal(reviewReceipt.reviewSemanticHash, semanticHash(reviewReceipt, 'reviewSemanticHash'));
  assert.equal(reviewReceipt.authorizationReview.evidenceEligibleForSeparateAuthorizationReview, true);
  assert.equal(reviewReceipt.authorizationReview.productionRouteAuthorizedByThisReview, false);
  assert.equal(reviewReceipt.authorizationReview.authorizationChangeAppliedByThisReview, false);
  assert.equal(reviewReceipt.authorizationReview.globalEmp1CRouteAuthority, false);
  assert.equal(reviewReceipt.authorizationReview.codeComplianceAuthorized, false);
  assert.equal(reviewReceipt.authorizationReview.releaseQualified, false);
  assert.equal(reviewReceipt.independentReplay.exactStoredBundleVerified, true);
  assert.equal(reviewReceipt.independentReplay.all23ProducerStepsReexecuted, true);
  assert.equal(reviewReceipt.independentReplay.all23StdoutAndStderrHashesMatched, true);
  assert.equal(reviewReceipt.independentReplay.observationByteIdentical, true);
  assert.equal(reviewReceipt.independentReplay.replayReceiptByteIdentical, true);
  assert.equal(reviewReceipt.independentReplay.falsifierReceiptByteIdentical, true);
  assert.equal(reviewReceipt.independentReplay.manifestByteIdentical, true);
  assert.equal(reviewFalsifier.json.schema,
    'emp1-wrc537-gamma5-independent-review-gate-falsifiers/v1');
  assert.equal(reviewFalsifier.json.status,
    'PASS_INDEPENDENT_REVIEW_GATE_ANTI_FORGERY_FALSIFIERS');
  assert.equal(reviewFalsifier.json.observedHeadSha, options.expectedHead);
  assert.equal(reviewFalsifier.json.baselineIndependentReviewRequiredAndPassed, true);
  assert.equal(reviewFalsifier.json.mutationCount, REVIEW_FALSIFIER_NAMES.length);
  assert.deepEqual(reviewFalsifier.json.detections.map((item) => item.name), REVIEW_FALSIFIER_NAMES);
  assert.ok(reviewFalsifier.json.detections.every((item) => item.detected === true));
  assert.equal(reviewFalsifier.json.authorization.productionRouteAuthorized, false);
  assert.equal(reviewFalsifier.json.authorization.authorizationChangeAppliedByFalsifiers, false);
  assert.equal(reviewFalsifier.json.authorization.globalEmp1CRouteAuthority, false);
  assert.equal(reviewFalsifier.json.authorization.codeComplianceAuthorized, false);
  assert.equal(reviewFalsifier.json.authorization.releaseQualified, false);
}

async function replayReviewEvidence(sourceEvidenceDir, stored) {
  const tempRoot = await mkdtemp(join(tmpdir(), 'emp1-gamma5-authorization-proposal-review-replay-'));
  const tempEvidenceDir = join(tempRoot, 'evidence');
  try {
    await cp(sourceEvidenceDir, tempEvidenceDir, { recursive: true });
    for (const name of [
      '06-independent-review-receipt.json',
      '07-independent-review-falsifier-receipt.json',
      '08-bounded-authorization-proposal.json',
      '09-bounded-authorization-proposal-check-receipt.json',
      '10-bounded-authorization-proposal-falsifier-receipt.json',
    ]) {
      await rm(join(tempEvidenceDir, name), { force: true });
    }

    const reviewPath = join(tempEvidenceDir, '06-independent-review-receipt.json');
    const reviewRun = runNode('scripts/emp1-wrc-gamma5-requalification-review-gate.mjs', [
      '--expected-head', options.expectedHead,
      '--evidence-dir', tempEvidenceDir,
      '--write-receipt', reviewPath,
    ]);
    assert.equal(reviewRun.status, 0,
      `EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_INDEPENDENT_REVIEW_REPLAY_FAILED\nSTDOUT:\n${reviewRun.stdout}\nSTDERR:\n${reviewRun.stderr}`);
    await assertFileBytesEqual(reviewPath, join(sourceEvidenceDir, '06-independent-review-receipt.json'),
      'EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_REVIEW_RECEIPT_REPLAY_DRIFT');

    const falsifierPath = join(tempEvidenceDir, '07-independent-review-falsifier-receipt.json');
    const falsifierRun = runNode('scripts/emp1-wrc-gamma5-requalification-review-gate-falsifiers.mjs', [
      '--expected-head', options.expectedHead,
      '--evidence-dir', tempEvidenceDir,
      '--write-receipt', falsifierPath,
    ]);
    assert.equal(falsifierRun.status, 0,
      `EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_REVIEW_FALSIFIER_REPLAY_FAILED\nSTDOUT:\n${falsifierRun.stdout}\nSTDERR:\n${falsifierRun.stderr}`);
    await assertFileBytesEqual(falsifierPath,
      join(sourceEvidenceDir, '07-independent-review-falsifier-receipt.json'),
      'EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_REVIEW_FALSIFIER_RECEIPT_REPLAY_DRIFT');

    const replayedReview = await readJson(reviewPath);
    const replayedFalsifier = await readJson(falsifierPath);
    assert.equal(replayedReview.reviewSemanticHash, stored.reviewReceipt.reviewSemanticHash);
    assert.deepEqual(replayedFalsifier, stored.reviewFalsifier.json);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function verifyCurrentSuspendedProductionState() {
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256, HISTORICAL_QUALIFICATION);
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED, false);
  assert.deepEqual([...EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS],
    [EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON]);
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.engineeringUseAuthorized, true);
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.productionUseAuthorized, false);
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.qualificationRecordHash,
    HISTORICAL_QUALIFICATION);
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.scopeContract.scopeContractHash,
    HISTORICAL_QUALIFICATION);
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_BENCHMARK_QUALIFICATION.benchmarkHash,
    HISTORICAL_ORACLE);
  assert.equal(EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256, HISTORICAL_QUALIFICATION);
  const registry = EMP1_C_BOUNDED_PRODUCTION_ROUTES.find((route) =>
    route.routeId === EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
  assert.ok(registry, 'EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_REGISTRY_ROUTE_REQUIRED');
  assert.equal(registry.registered, false);
  assert.equal(registry.engineeringUseAuthorized, false);
  assert.deepEqual([...registry.suspensionReasons],
    [EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON]);
  assert.equal(registry.globalEmp1CRouteAuthority, false);
  assert.equal(registry.releaseQualified, false);
  assert.equal(registry.method.qualificationRecordSha256, HISTORICAL_QUALIFICATION);
  assert.equal(registry.method.routeRequalificationRequired, true);
  assert.equal(registry.remainingBlocked.includes(EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON), true);
}

function verifyCandidate(value) {
  assert.equal(value.schema, 'emp1-wrc537-gamma5-zero-dp-route-qualification/v2');
  assert.equal(value.status, 'CANDIDATE_PENDING_EXECUTABLE_PRODUCTION_REOBSERVATION');
  assert.equal(value.engineeringAuthority, false);
  assert.equal(value.productionRouteAuthority, false);
  assert.equal(value.globalEmp1CRouteAuthority, false);
  assert.equal(value.qualificationRecordSha256, CANDIDATE_QUALIFICATION);
  assert.equal(value.semanticPayload.benchmarkQualification.benchmarkHash, POST_AUTHORITY_ORACLE);
  assert.equal(value.semanticPayload.supersedesHistorical.routeQualificationSha256, HISTORICAL_QUALIFICATION);
  assert.equal(value.semanticPayload.supersedesHistorical.historicalOracleHash, HISTORICAL_ORACLE);
  assert.equal(value.semanticPayload.scope.globalEmp1CRouteAuthority, false);
  assert.equal(value.authorization.globalEmp1CRouteRegistrationAllowed, false);
  assert.equal(value.authorization.releaseQualified, false);
}

function canonicalMutations() {
  return [
    mutation(ROUTE_PATH, 'EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256', HISTORICAL_QUALIFICATION, CANDIDATE_QUALIFICATION),
    mutation(ROUTE_PATH, 'FULL_TABLE5_ORACLE_HASH', HISTORICAL_ORACLE, POST_AUTHORITY_ORACLE),
    mutation(ROUTE_PATH, 'EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED', false, true),
    mutation(ROUTE_PATH, 'EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS',
      [EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON], []),
    mutation(ROUTE_PATH, 'EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.productionUseAuthorized', false, true),
    mutation(REGISTRY_PATH, 'EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256', HISTORICAL_QUALIFICATION, CANDIDATE_QUALIFICATION),
    mutation(REGISTRY_PATH, 'EMP1_C_BOUNDED_PRODUCTION_ROUTES[0].registered', false, true),
    mutation(REGISTRY_PATH, 'EMP1_C_BOUNDED_PRODUCTION_ROUTES[0].engineeringUseAuthorized', false, true),
    mutation(REGISTRY_PATH, 'EMP1_C_BOUNDED_PRODUCTION_ROUTES[0].suspensionReasons',
      [EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON], []),
    mutation(REGISTRY_PATH, 'EMP1_C_BOUNDED_PRODUCTION_ROUTES[0].method.qualificationRecordRole',
      'HISTORICAL_PRE_EMP1_12_TO_15_BOUNDED_NUMERICAL_QUALIFICATION',
      'POST_SOURCE_AUTHORITY_EXACT_HEAD_BOUNDED_REQUALIFICATION'),
    mutation(REGISTRY_PATH, 'EMP1_C_BOUNDED_PRODUCTION_ROUTES[0].method.routeRequalificationRequired', true, false),
    mutation(REGISTRY_PATH, 'EMP1_C_BOUNDED_PRODUCTION_ROUTES[0].remainingBlocked',
      [
        EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON,
        'NONZERO_DIFFERENTIAL_PRESSURE',
        'NONUNITY_STRESS_CONCENTRATION',
        'WRC_APPENDIX_B_GENERAL_SCF_NOT_SOURCE_QUALIFIED',
        'OFF_AXIS_LONGITUDINAL_MOMENT_MAXIMUM',
        'GAMMA_OTHER_THAN_5',
        'BETA_OUTSIDE_0P05_TO_0P5',
        'NON_TABULATED_GAMMA',
        'GLOBAL_EMP1_C_ROUTE',
      ],
      [
        'NONZERO_DIFFERENTIAL_PRESSURE',
        'NONUNITY_STRESS_CONCENTRATION',
        'WRC_APPENDIX_B_GENERAL_SCF_NOT_SOURCE_QUALIFIED',
        'OFF_AXIS_LONGITUDINAL_MOMENT_MAXIMUM',
        'GAMMA_OTHER_THAN_5',
        'BETA_OUTSIDE_0P05_TO_0P5',
        'NON_TABULATED_GAMMA',
        'GLOBAL_EMP1_C_ROUTE',
      ]),
  ];
}
function mutation(path, field, before, after) { return { path, field, before, after }; }

async function readEvidenceSet(dir) {
  const localReceipt = await readJson(join(dir, '05-local-execution-receipt.json'));
  const manifest = await readJson(join(dir, '04-evidence-manifest.json'));
  const reviewReceipt = await readJson(join(dir, '06-independent-review-receipt.json'));
  const reviewFalsifierPath = join(dir, '07-independent-review-falsifier-receipt.json');
  const reviewFalsifierBuffer = await readFile(reviewFalsifierPath);
  return {
    localReceipt,
    manifest,
    reviewReceipt,
    reviewFalsifier: {
      json: JSON.parse(reviewFalsifierBuffer.toString('utf8')),
      bufferSha256: sha256Buffer(reviewFalsifierBuffer),
    },
  };
}
async function sourceDescriptor(path) {
  const buffer = await readFile(resolve(root, path));
  return {
    path,
    sha256: sha256Buffer(buffer),
    gitBlobSha: git(['hash-object', path]),
    bytes: buffer.byteLength,
  };
}
async function assertFileBytesEqual(actualPath, expectedPath, code) {
  const [actual, expected] = await Promise.all([readFile(actualPath), readFile(expectedPath)]);
  assert.equal(actual.equals(expected), true, code);
}
function runNode(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_ACTIONS: 'false' },
  });
}
async function readJson(path) { return JSON.parse(await readFile(path, 'utf8')); }
function semanticHash(value, hashField) {
  const { [hashField]: _hash, status: _status, ...payload } = value;
  return sha256Canonical(payload);
}
function sha256Buffer(buffer) { return createHash('sha256').update(buffer).digest('hex'); }
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
function git(args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); }
function parseArgs(args) {
  const out = { expectedHead: null, evidenceDir: null, writeProposal: null };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--expected-head') out.expectedHead = args[++index] ?? null;
    else if (args[index] === '--evidence-dir') out.evidenceDir = args[++index] ?? null;
    else if (args[index] === '--write-proposal') out.writeProposal = args[++index] ?? null;
    else throw proposalError(`EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  return out;
}
function proposalError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
