#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateLocalAttachmentFoundation } from '../src/core/local-stress/index.js';
import { canonicalFixture } from './lafea.1-fixtures.mjs';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION,
  EMP1_WRC537_GAMMA5_ZERO_DP_BENCHMARK_QUALIFICATION,
  runEmp1Wrc537Gamma5ZeroDpRoute,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
import {
  EMP1_C_BOUNDED_PRODUCTION_ROUTES,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';
import { evaluateEmp1CQualificationState } from '../src/core/emp1/emp1-c-qualification-state.js';
import { deriveEmp1Wrc537CylindricalAxisAuthority } from '../src/core/emp1/emp1-wrc537-cylindrical-axis-authority.js';
import {
  EMP1_WRC537_ATTACHMENT_STATION_BASIS,
  EMP1_WRC537_CYLINDER_LENGTH_BASIS,
  createEmp1Wrc537ApplicabilitySourceAuthority,
} from '../src/core/emp1/emp1-wrc537-applicability-source-authority.js';
import {
  EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS,
  EMP1_WRC537_ATTACHMENT_PHYSICAL_LOCATION,
  createEmp1Wrc537AttachmentSourceAuthority,
} from '../src/core/emp1/emp1-wrc537-attachment-source-authority.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
const CANDIDATE_QUALIFICATION = '9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7';
const POST_AUTHORITY_ORACLE = '60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18';
const HISTORICAL_QUALIFICATION = '3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e';
const HISTORICAL_ORACLE = '5daeb3a84828cf19017e6d1d0a70bd3478929713973948f875f21cec463a80aa';
const ROUTE_PATH = 'src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
const REGISTRY_PATH = 'src/core/emp1/emp1-c-bounded-route-registry.js';
const AUTHORIZATION_RECORD_PATH = 'validation/emp1/wrc537-2013/gamma5-zero-dp-route-authorization-v1.json';
const ENGINEERING_ALLOWLIST = Object.freeze([ROUTE_PATH, REGISTRY_PATH, AUTHORIZATION_RECORD_PATH]);
const PROCESS_METADATA_RE = /^agents\/PR[0-9]+_workreport\.md$/u;
const EVIDENCE_FILES = Object.freeze([
  '01-observation.json',
  '02-replay-receipt.json',
  '03-falsifier-receipt.json',
  '04-evidence-manifest.json',
  '05-local-execution-receipt.json',
  '06-independent-review-receipt.json',
  '07-independent-review-falsifier-receipt.json',
  '08-bounded-authorization-proposal.json',
  '09-bounded-authorization-proposal-check-receipt.json',
  '10-bounded-authorization-proposal-falsifier-receipt.json',
]);

for (const [value, code] of [
  [options.expectedHead, 'EMP1_POST_PROMOTION_EXPECTED_HEAD_REQUIRED'],
  [options.authorizationBase, 'EMP1_POST_PROMOTION_AUTHORIZATION_BASE_REQUIRED'],
]) {
  if (!/^[0-9a-f]{40}$/u.test(value ?? '')) throw gateError(code);
}
if (!options.evidenceDir) throw gateError('EMP1_POST_PROMOTION_EVIDENCE_DIR_REQUIRED');
const actualHead = gitText(['rev-parse', 'HEAD']);
assert.equal(actualHead, options.expectedHead,
  `EMP1_POST_PROMOTION_HEAD_MISMATCH:${actualHead}:${options.expectedHead}`);
assert.notEqual(options.authorizationBase, options.expectedHead,
  'EMP1_POST_PROMOTION_AUTHORIZATION_BASE_MUST_DIFFER_FROM_HEAD');
assert.equal(spawnSync('git', ['merge-base', '--is-ancestor', options.authorizationBase, options.expectedHead], {
  cwd: root,
}).status, 0, 'EMP1_POST_PROMOTION_AUTHORIZATION_BASE_MUST_BE_ANCESTOR');

const evidenceDir = resolve(root, options.evidenceDir);
const evidence = await readEvidence(evidenceDir);
verifyProposalChain(evidence);
const proposal = evidence['08-bounded-authorization-proposal.json'].json;
const baseTreeSha = gitText(['rev-parse', `${options.authorizationBase}^{tree}`]);
assert.equal(baseTreeSha, proposal.observedSuspendedTreeSha,
  'EMP1_POST_PROMOTION_BASE_TREE_MUST_EQUAL_QUALIFIED_SUSPENDED_TREE');
assert.equal(proposal.observedSuspendedHeadSha,
  evidence['09-bounded-authorization-proposal-check-receipt.json'].json.observedSuspendedHeadSha);
assert.equal(proposal.observedSuspendedHeadSha,
  evidence['10-bounded-authorization-proposal-falsifier-receipt.json'].json.observedSuspendedHeadSha);

const changedFiles = gitText(['diff', '--name-only', `${options.authorizationBase}..${options.expectedHead}`])
  .split(/\r?\n/u).filter(Boolean).sort();
const engineeringChangedFiles = changedFiles.filter((path) => ENGINEERING_ALLOWLIST.includes(path));
const processMetadataChangedFiles = changedFiles.filter((path) => PROCESS_METADATA_RE.test(path));
const unexpectedChangedFiles = changedFiles.filter((path) =>
  !ENGINEERING_ALLOWLIST.includes(path) && !PROCESS_METADATA_RE.test(path));
assert.deepEqual(engineeringChangedFiles.sort(), [...ENGINEERING_ALLOWLIST].sort(),
  'EMP1_POST_PROMOTION_EXACT_THREE_ENGINEERING_FILES_REQUIRED');
assert.ok(processMetadataChangedFiles.length <= 1,
  'EMP1_POST_PROMOTION_AT_MOST_ONE_WORKREPORT_METADATA_FILE');
assert.deepEqual(unexpectedChangedFiles, [],
  `EMP1_POST_PROMOTION_UNEXPECTED_CHANGED_FILES:${unexpectedChangedFiles.join(',')}`);

const baseRouteBuffer = gitBuffer(['show', `${options.authorizationBase}:${ROUTE_PATH}`]);
const baseRegistryBuffer = gitBuffer(['show', `${options.authorizationBase}:${REGISTRY_PATH}`]);
verifyBasePreimage(baseRouteBuffer, proposal.currentProductionPreimage.routeSource, ROUTE_PATH);
verifyBasePreimage(baseRegistryBuffer, proposal.currentProductionPreimage.registrySource, REGISTRY_PATH);
const expectedRoute = promoteRouteSource(baseRouteBuffer.toString('utf8'));
const expectedRegistry = promoteRegistrySource(baseRegistryBuffer.toString('utf8'));
const currentRoute = await readCurrentSource(ROUTE_PATH, options.routeSourceOverride);
const currentRegistry = await readCurrentSource(REGISTRY_PATH, options.registrySourceOverride);
assert.equal(currentRoute.toString('utf8'), expectedRoute,
  'EMP1_POST_PROMOTION_ROUTE_SOURCE_NOT_EXACT_12_MUTATION_RESULT');
assert.equal(currentRegistry.toString('utf8'), expectedRegistry,
  'EMP1_POST_PROMOTION_REGISTRY_SOURCE_NOT_EXACT_12_MUTATION_RESULT');

verifyAuthorizedRuntimeState();
const globalQualification = evaluateEmp1CQualificationState();
assert.equal(globalQualification.engineeringUseAuthorized, false,
  'EMP1_POST_PROMOTION_GLOBAL_C_ENGINEERING_AUTHORITY_MUST_REMAIN_FALSE');
assert.equal(globalQualification.runAuthorized, false,
  'EMP1_POST_PROMOTION_GLOBAL_C_RUN_AUTHORITY_MUST_REMAIN_FALSE');

const authorizationRecordPath = authorizationRecordPathFromOptions();
const authorizationRecord = JSON.parse(await readFile(authorizationRecordPath, 'utf8'));
verifyAuthorizationRecord(authorizationRecord, evidence, proposal, baseTreeSha);

const independentDecouplingRun = runScript('scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs');
const independentDecoupling = requireRecord(
  independentDecouplingRun.records,
  'emp1-wrc537-independent-oracle-decoupling/v2',
);
assert.equal(independentDecoupling.status, 'PASS_INDEPENDENT_ORACLE_INTERPRETATION_DECOUPLED');
const independentRefreeze = requireRecord(
  independentDecouplingRun.records,
  'emp1-wrc537-gamma5-post-authority-independent-refreeze/v1',
);
assert.equal(independentRefreeze.status, 'PASS_FROZEN_POST_AUTHORITY_PHYSICAL_TABLE5_ORACLE');
assert.equal(independentRefreeze.semanticHash, POST_AUTHORITY_ORACLE);
const independentFalsifierRun = runScript('scripts/emp1-wrc-gamma5-post-authority-refreeze-falsifiers.mjs');
const independentFalsifiers = requireRecord(
  independentFalsifierRun.records,
  'emp1-wrc537-gamma5-post-authority-refreeze-falsifiers/v1',
);
assert.equal(independentFalsifiers.status, 'PASS_POST_AUTHORITY_PHYSICAL_ORACLE_FALSIFIERS');

const oracleRecord = JSON.parse(await readFile(resolve(root,
  'validation/emp1/wrc537-2013/gamma5-post-authority-physical-oracle-v1.json'), 'utf8'));
assert.equal(oracleRecord.semanticHash, POST_AUTHORITY_ORACLE);
const oracle = oracleRecord.semanticPayload;
const model = routeFixture();
const foundationResult = calculateLocalAttachmentFoundation(model);
assert.equal(foundationResult.qualification.state, 'ACCEPTED');
const axisAuthority = deriveEmp1Wrc537CylindricalAxisAuthority({
  foundationResult,
  foundationModel: model,
  loadCaseIdentity: 'LC-1',
});
const applicabilitySourceAuthority = createEmp1Wrc537ApplicabilitySourceAuthority({
  geometryIdentity: 'EMP1-POST-PROMOTION-EXACT-HEAD-CYLINDER',
  cylinderLengthBasis: EMP1_WRC537_CYLINDER_LENGTH_BASIS,
  cylinderLength: oracle.case.applicability.cylinderLength,
  attachmentStationBasis: EMP1_WRC537_ATTACHMENT_STATION_BASIS,
  attachmentStationFromCylinderStart: oracle.case.applicability.attachmentStationFromCylinderStart,
  unit: 'mm',
  cylinderLengthSourceReference: 'EMP1-POST-PROMOTION/CYLINDER-LENGTH',
  attachmentStationSourceReference: 'EMP1-POST-PROMOTION/WRC-STATION',
  productionObservationUsedToSetAuthority: false,
});
const attachmentSourceAuthority = createEmp1Wrc537AttachmentSourceAuthority({
  geometryIdentity: 'EMP1-POST-PROMOTION-EXACT-HEAD-CYLINDER',
  outsideDiameter: oracle.case.geometry.attachmentRadius * 2,
  diameterBasis: EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS,
  physicalLocation: EMP1_WRC537_ATTACHMENT_PHYSICAL_LOCATION,
  unit: 'mm',
  sourceReference: 'EMP1-POST-PROMOTION/ATTACHMENT-OD',
  productionObservationUsedToSetAuthority: false,
});
const production = runEmp1Wrc537Gamma5ZeroDpRoute({
  loadTransferResult: foundationResult,
  loadCaseIdentity: 'LC-1',
  pressureResultIdentity: 'PR-1',
  wrcReferencePointGlobal: oracle.physicalBenchmark.targetPointGlobal,
  geometry: {
    meanRadius: oracle.case.geometry.meanRadius,
    shellThickness: oracle.case.geometry.shellThickness,
    attachmentOutsideRadius: oracle.case.geometry.attachmentRadius,
    gamma: oracle.case.gamma,
    beta: oracle.case.beta,
  },
  axisAuthority,
  attachmentSourceAuthority,
  applicabilitySourceAuthority,
  stressConcentration: structuredClone(oracle.case.stressConcentration),
});
assert.equal(production.state, 'EVALUATED_AUTHORIZED_BOUNDED_GAMMA5_ZERO_DP_ROUTE');
assert.equal(production.productionRouteAuthority, true);
assert.equal(production.globalEmp1CRouteAuthority, false);
assert.deepEqual(production.numerics.wrcLoads, oracle.expectedPhysical.wrcLoads);
assert.deepEqual(production.numerics.curveFigureMap, oracle.figureMap);
const tolerancePolicy = Object.freeze({ absolute: 1e-12, relative: 1e-11 });
const stressComparisons = compareStressFamilies(production.stresses, oracle.expected, tolerancePolicy);
const physicalWrcLoadComparisons = Object.keys(oracle.expectedPhysical.wrcLoads).map((component) => ({
  component,
  actual: production.numerics.wrcLoads[component],
  expected: oracle.expectedPhysical.wrcLoads[component],
  absoluteDelta: Math.abs(production.numerics.wrcLoads[component] - oracle.expectedPhysical.wrcLoads[component]),
}));
assert.equal(physicalWrcLoadComparisons.length, 6);
assert.ok(physicalWrcLoadComparisons.every((row) => row.absoluteDelta === 0));
assert.equal(stressComparisons.length, 32);
assert.ok(stressComparisons.every((row) => row.toleranceRatio <= 1));
const governing = stressComparisons.reduce((a, b) =>
  b.toleranceRatio > a.toleranceRatio ? b : a, stressComparisons[0]);

const receiptPayload = {
  schema: 'emp1-wrc537-gamma5-post-promotion-exact-head-gate/v1',
  observedAuthorizationHeadSha: options.expectedHead,
  authorizationBaseHeadSha: options.authorizationBase,
  authorizationBaseTreeSha: baseTreeSha,
  qualifiedSuspendedHeadSha: proposal.observedSuspendedHeadSha,
  qualifiedSuspendedTreeSha: proposal.observedSuspendedTreeSha,
  proposalSemanticHash: proposal.proposalSemanticHash,
  proposalCheckSemanticHash: evidence['09-bounded-authorization-proposal-check-receipt.json'].json.checkSemanticHash,
  proposalFalsifierSemanticHash: evidence['10-bounded-authorization-proposal-falsifier-receipt.json'].json.falsifierSemanticHash,
  authorizationRecordSemanticHash: authorizationRecord.authorizationRecordSemanticHash,
  changedFiles: {
    engineeringAuthority: engineeringChangedFiles,
    processMetadataNonAuthority: processMetadataChangedFiles,
    unexpected: unexpectedChangedFiles,
  },
  sourceReconstruction: {
    baseTreeEqualsQualifiedSuspendedTree: true,
    routeBasePreimageMatched: true,
    registryBasePreimageMatched: true,
    routeAuthorizedSourceByteExact: true,
    registryAuthorizedSourceByteExact: true,
    approvedSemanticMutationCount: 12,
  },
  independentOracle: {
    decouplingStatus: independentDecoupling.status,
    refreezeStatus: independentRefreeze.status,
    refreezeSemanticHash: independentRefreeze.semanticHash,
    falsifierStatus: independentFalsifiers.status,
    decouplingStdoutSha256: independentDecouplingRun.stdoutSha256,
    falsifierStdoutSha256: independentFalsifierRun.stdoutSha256,
  },
  productionRuntime: {
    state: production.state,
    physicalWrcLoadComparisons,
    stressComparisons,
    stressComparisonsPassed: stressComparisons.length,
    maxToleranceRatio: governing.toleranceRatio,
    governingComparison: governing,
  },
  authority: {
    productionRouteAuthorizedOnObservedHead: true,
    boundedEngineeringUseAuthorizedOnObservedHead: true,
    authorizationChangeAppliedByThisGate: false,
    globalEmp1CRouteAuthority: false,
    codeComplianceAuthorized: false,
    releaseQualified: false,
  },
};
const receipt = {
  ...receiptPayload,
  gateSemanticHash: sha256Canonical(receiptPayload),
  status: 'PASS_POST_PROMOTION_EXACT_HEAD_BOUNDED_ROUTE_AUTHORIZATION_QUALIFIED_GLOBAL_C_STILL_BLOCKED',
};
if (options.writeReceipt) {
  const expectedPath = join(evidenceDir, '11-post-promotion-exact-head-receipt.json');
  assert.equal(resolve(root, options.writeReceipt), expectedPath,
    'EMP1_POST_PROMOTION_RECEIPT_MUST_BE_11_IN_EVIDENCE_DIRECTORY');
  await writeFile(expectedPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(receipt, null, 2));

function verifyProposalChain(set) {
  const proposal = set['08-bounded-authorization-proposal.json'].json;
  const check = set['09-bounded-authorization-proposal-check-receipt.json'].json;
  const falsifiers = set['10-bounded-authorization-proposal-falsifier-receipt.json'].json;
  assert.equal(proposal.schema, 'emp1-wrc537-gamma5-bounded-authorization-proposal/v1');
  assert.equal(proposal.status, 'READY_TO_DRAFT_SEPARATE_BOUNDED_AUTHORIZATION_CHANGE_NOT_AUTHORIZED');
  assert.equal(proposal.proposalIsAuthorization, false);
  assert.equal(proposal.proposalSemanticHash, semanticHash(proposal, 'proposalSemanticHash'));
  assert.equal(proposal.qualifiedSuccessor.candidateQualificationSha256, CANDIDATE_QUALIFICATION);
  assert.equal(proposal.qualifiedSuccessor.postAuthorityOracleSemanticHash, POST_AUTHORITY_ORACLE);
  assert.deepEqual(proposal.futureChangeFileAllowlist, ENGINEERING_ALLOWLIST);
  assert.equal(proposal.exactAllowedFutureMutations.length, 12);
  assert.equal(proposal.postPromotionGate.exactHeadRequalificationRequired, true);
  assert.equal(proposal.authorityBoundary.globalEmp1CRouteAuthority, false);
  assert.equal(proposal.authorityBoundary.codeComplianceAuthorized, false);
  assert.equal(proposal.authorityBoundary.releaseQualified, false);
  assert.equal(check.schema, 'emp1-wrc537-gamma5-bounded-authorization-proposal-check/v1');
  assert.equal(check.status, 'PASS_BOUNDED_AUTHORIZATION_PROPOSAL_INTEGRITY_NOT_AUTHORIZED');
  assert.equal(check.proposalSemanticHash, proposal.proposalSemanticHash);
  assert.equal(check.checkSemanticHash, semanticHash(check, 'checkSemanticHash'));
  assert.equal(falsifiers.schema, 'emp1-wrc537-gamma5-bounded-authorization-proposal-falsifiers/v1');
  assert.equal(falsifiers.status, 'PASS_BOUNDED_AUTHORIZATION_PROPOSAL_ANTI_FORGERY_FALSIFIERS_NOT_AUTHORIZED');
  assert.equal(falsifiers.proposalSemanticHash, proposal.proposalSemanticHash);
  assert.equal(falsifiers.falsifierSemanticHash, semanticHash(falsifiers, 'falsifierSemanticHash'));
  assert.equal(falsifiers.mutationCount, 10);
  assert.ok(falsifiers.detections.every((item) => item.detected === true));
}

function verifyAuthorizedRuntimeState() {
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256, CANDIDATE_QUALIFICATION);
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED, true);
  assert.deepEqual([...EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS], []);
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.engineeringUseAuthorized, true);
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.productionUseAuthorized, true);
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.qualificationRecordHash, CANDIDATE_QUALIFICATION);
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.scopeContract.scopeContractHash, CANDIDATE_QUALIFICATION);
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_BENCHMARK_QUALIFICATION.benchmarkHash, POST_AUTHORITY_ORACLE);
  assert.equal(EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256, CANDIDATE_QUALIFICATION);
  const route = EMP1_C_BOUNDED_PRODUCTION_ROUTES.find((item) => item.routeId === EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
  assert.ok(route, 'EMP1_POST_PROMOTION_BOUNDED_REGISTRY_ROUTE_REQUIRED');
  assert.equal(route.registered, true);
  assert.equal(route.engineeringUseAuthorized, true);
  assert.deepEqual([...route.suspensionReasons], []);
  assert.equal(route.globalEmp1CRouteAuthority, false);
  assert.equal(route.releaseQualified, false);
  assert.equal(route.method.qualificationRecordSha256, CANDIDATE_QUALIFICATION);
  assert.equal(route.method.qualificationRecordRole, 'POST_SOURCE_AUTHORITY_EXACT_HEAD_BOUNDED_REQUALIFICATION');
  assert.equal(route.method.routeRequalificationRequired, false);
  assert.equal(route.scope.differentialPressure, 0);
  assert.equal(route.scope.gamma, 5);
  assert.equal(route.scope.Kn, 1);
  assert.equal(route.scope.Kb, 1);
  assert.equal(route.scope.offAxisLongitudinalMomentMaximumAuthorized, false);
  assert.deepEqual([...route.remainingBlocked], [
    'NONZERO_DIFFERENTIAL_PRESSURE',
    'NONUNITY_STRESS_CONCENTRATION',
    'WRC_APPENDIX_B_GENERAL_SCF_NOT_SOURCE_QUALIFIED',
    'OFF_AXIS_LONGITUDINAL_MOMENT_MAXIMUM',
    'GAMMA_OTHER_THAN_5',
    'BETA_OUTSIDE_0P05_TO_0P5',
    'NON_TABULATED_GAMMA',
    'GLOBAL_EMP1_C_ROUTE',
  ]);
}

function verifyAuthorizationRecord(record, set, proposal, baseTreeSha) {
  assert.equal(record.schema, 'emp1-wrc537-gamma5-bounded-route-authorization/v1');
  assert.equal(record.status, 'BOUNDED_AUTHORIZATION_CHANGE_APPLIED_PENDING_POST_PROMOTION_EXACT_HEAD_QUALIFICATION');
  assert.equal(record.authorizationChangeApplied, true);
  assert.equal(record.authorizationRecordSemanticHash,
    semanticHash(record, 'authorizationRecordSemanticHash'));
  assert.equal(record.proposalSemanticHash, proposal.proposalSemanticHash);
  assert.equal(record.proposalCheckSemanticHash,
    set['09-bounded-authorization-proposal-check-receipt.json'].json.checkSemanticHash);
  assert.equal(record.proposalFalsifierSemanticHash,
    set['10-bounded-authorization-proposal-falsifier-receipt.json'].json.falsifierSemanticHash);
  assert.equal(record.qualifiedSuspendedHeadSha, proposal.observedSuspendedHeadSha);
  assert.equal(record.qualifiedSuspendedTreeSha, proposal.observedSuspendedTreeSha);
  assert.equal(record.authorizationBaseHeadSha, options.authorizationBase);
  assert.equal(record.authorizationBaseTreeSha, baseTreeSha);
  assert.equal(record.authorizedIdentity.qualificationRecordSha256, CANDIDATE_QUALIFICATION);
  assert.equal(record.authorizedIdentity.postAuthorityOracleSemanticHash, POST_AUTHORITY_ORACLE);
  assert.deepEqual(record.authorizedScope, {
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
  });
  assert.deepEqual(record.engineeringChangeFileAllowlist, ENGINEERING_ALLOWLIST);
  assert.equal(record.approvedSemanticMutationCount, 12);
  assert.equal(record.processMetadataPolicy?.engineeringAuthority, false);
  assert.equal(record.processMetadataPolicy?.workreportPattern, 'agents/PR[0-9]+_workreport.md');
  assert.equal(record.authorityBoundary.globalEmp1CRouteAuthority, false);
  assert.equal(record.authorityBoundary.codeComplianceAuthorized, false);
  assert.equal(record.authorityBoundary.releaseQualified, false);
  assert.equal(record.authorityBoundary.nonzeroDifferentialPressureAllowed, false);
  assert.equal(record.authorityBoundary.nonUnityStressConcentrationAllowed, false);
  assert.equal(record.authorityBoundary.offAxisLongitudinalMomentMaximumAllowed, false);
  assert.equal(record.postPromotionQualification.required, true);
  assert.equal(record.postPromotionQualification.completed, false);
  assert.equal(record.postPromotionQualification.observedHeadSha, null);
  assert.equal(record.postPromotionQualification.receiptSemanticHash, null);
  assert.equal(record.postPromotionQualification.expectedGateSchema,
    'emp1-wrc537-gamma5-post-promotion-exact-head-gate/v1');
  assert.equal(record.postPromotionQualification.expectedReceiptFile,
    '11-post-promotion-exact-head-receipt.json');
  const expectedEvidence = EVIDENCE_FILES.map((name) => ({ name, sha256: set[name].sha256 }));
  assert.deepEqual(record.suspendedEvidenceFiles, expectedEvidence,
    'EMP1_POST_PROMOTION_AUTHORIZATION_RECORD_EVIDENCE_HASH_SET_MISMATCH');
}

function promoteRouteSource(text) {
  let out = text;
  out = replaceOnce(out,
    `export const EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256 =\n  '${HISTORICAL_QUALIFICATION}';`,
    `export const EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256 =\n  '${CANDIDATE_QUALIFICATION}';`,
    'ROUTE_QUALIFICATION');
  out = replaceOnce(out,
    'export const EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED = false;',
    'export const EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED = true;',
    'ROUTE_AUTHORIZED');
  out = replaceOnce(out,
    `export const EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS = Object.freeze([\n  'WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE',\n]);`,
    'export const EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS = Object.freeze([]);',
    'ROUTE_SUSPENSION');
  out = replaceOnce(out,
    `const FULL_TABLE5_ORACLE_HASH =\n  '${HISTORICAL_ORACLE}';`,
    `const FULL_TABLE5_ORACLE_HASH =\n  '${POST_AUTHORITY_ORACLE}';`,
    'ROUTE_ORACLE');
  out = replaceOnce(out,
    '  productionUseAuthorized: false,',
    '  productionUseAuthorized: true,',
    'ROUTE_PRODUCTION_USE');
  return out;
}

function promoteRegistrySource(text) {
  let out = text;
  out = replaceOnce(out,
    `export const EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256 =\n  '${HISTORICAL_QUALIFICATION}';`,
    `export const EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256 =\n  '${CANDIDATE_QUALIFICATION}';`,
    'REGISTRY_QUALIFICATION');
  out = replaceOnce(out, '  registered: false,', '  registered: true,', 'REGISTRY_REGISTERED');
  out = replaceOnce(out, '  engineeringUseAuthorized: false,', '  engineeringUseAuthorized: true,', 'REGISTRY_ENGINEERING_USE');
  out = replaceOnce(out,
    `  suspensionReasons: Object.freeze([\n    EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON,\n  ]),`,
    '  suspensionReasons: Object.freeze([]),',
    'REGISTRY_SUSPENSION');
  out = replaceOnce(out,
    "    qualificationRecordRole: 'HISTORICAL_PRE_EMP1_12_TO_15_BOUNDED_NUMERICAL_QUALIFICATION',",
    "    qualificationRecordRole: 'POST_SOURCE_AUTHORITY_EXACT_HEAD_BOUNDED_REQUALIFICATION',",
    'REGISTRY_ROLE');
  out = replaceOnce(out,
    '    routeRequalificationRequired: true,',
    '    routeRequalificationRequired: false,',
    'REGISTRY_REQUALIFICATION_REQUIRED');
  out = replaceOnce(out,
    `  remainingBlocked: Object.freeze([\n    EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON,\n    'NONZERO_DIFFERENTIAL_PRESSURE',`,
    `  remainingBlocked: Object.freeze([\n    'NONZERO_DIFFERENTIAL_PRESSURE',`,
    'REGISTRY_REMAINING_BLOCKED');
  return out;
}

function replaceOnce(text, before, after, label) {
  const first = text.indexOf(before);
  assert.notEqual(first, -1, `EMP1_POST_PROMOTION_EXPECTED_PREIMAGE_NOT_FOUND:${label}`);
  assert.equal(text.indexOf(before, first + before.length), -1,
    `EMP1_POST_PROMOTION_PREIMAGE_NOT_UNIQUE:${label}`);
  return `${text.slice(0, first)}${after}${text.slice(first + before.length)}`;
}

function verifyBasePreimage(buffer, descriptor, path) {
  assert.equal(descriptor.path, path);
  assert.equal(descriptor.sha256, sha256Buffer(buffer),
    `EMP1_POST_PROMOTION_BASE_SHA256_MISMATCH:${path}`);
  assert.equal(descriptor.gitBlobSha, gitHashObjectBuffer(buffer),
    `EMP1_POST_PROMOTION_BASE_GIT_BLOB_MISMATCH:${path}`);
  assert.equal(descriptor.bytes, buffer.byteLength,
    `EMP1_POST_PROMOTION_BASE_BYTE_COUNT_MISMATCH:${path}`);
}

async function readCurrentSource(path, override) {
  if (override) {
    if (process.env.EMP1_POST_PROMOTION_FALSIFIER_MODE !== 'true') {
      throw gateError('EMP1_POST_PROMOTION_SOURCE_OVERRIDE_ONLY_ALLOWED_IN_FALSIFIER_MODE');
    }
    return readFile(resolve(root, override));
  }
  return readFile(resolve(root, path));
}

function authorizationRecordPathFromOptions() {
  if (!options.authorizationRecordOverride) return resolve(root, AUTHORIZATION_RECORD_PATH);
  if (process.env.EMP1_POST_PROMOTION_FALSIFIER_MODE !== 'true') {
    throw gateError('EMP1_POST_PROMOTION_RECORD_OVERRIDE_ONLY_ALLOWED_IN_FALSIFIER_MODE');
  }
  return resolve(root, options.authorizationRecordOverride);
}

async function readEvidence(dir) {
  const entries = await Promise.all(EVIDENCE_FILES.map(async (name) => {
    const buffer = await readFile(join(dir, name));
    return [name, { json: JSON.parse(buffer.toString('utf8')), sha256: sha256Buffer(buffer) }];
  }));
  return Object.fromEntries(entries);
}

function compareStressFamilies(actualStresses, expected, policy) {
  const rows = [];
  const locations = expected.locations;
  for (const family of ['circumferential', 'longitudinal', 'shear', 'stressIntensity']) {
    const actual = actualStresses[family];
    const target = expected[family];
    assert.equal(actual.length, 8, `EMP1_POST_PROMOTION_STRESS_LENGTH:${family}`);
    assert.equal(target.length, 8, `EMP1_POST_PROMOTION_ORACLE_LENGTH:${family}`);
    actual.forEach((value, index) => {
      const expectedValue = target[index];
      const tolerance = Math.max(policy.absolute,
        Math.max(1, Math.abs(expectedValue)) * policy.relative);
      const absoluteDelta = Math.abs(value - expectedValue);
      rows.push({
        family,
        location: locations[index],
        actual: value,
        expected: expectedValue,
        absoluteDelta,
        relativeDelta: absoluteDelta / Math.max(1, Math.abs(expectedValue)),
        tolerance,
        toleranceRatio: absoluteDelta / tolerance,
      });
    });
  }
  return rows;
}

function routeFixture() {
  return canonicalFixture((source) => {
    source.loadCases[0].force.value = [-400, 250, 1000];
    source.loadCases[0].moment.value = [-250000, -200000, 700000];
    source.pressureDefinitions.forEach((row) => {
      row.internalPressure.value = 0;
      row.externalPressure.value = 0;
    });
  });
}

function runScript(path) {
  const completed = spawnSync(process.execPath, [path], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, EMP1_EXACT_HEAD_PARENT_SHA: options.expectedHead },
  });
  assert.equal(completed.status, 0,
    `EMP1_POST_PROMOTION_SUBORDINATE_FAILED:${path}\nSTDOUT:\n${completed.stdout ?? ''}\nSTDERR:\n${completed.stderr ?? ''}`);
  const stdout = completed.stdout ?? '';
  return { records: extractJsonObjects(stdout), stdoutSha256: sha256Text(stdout) };
}

function extractJsonObjects(text) {
  const records = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === '{') { if (depth === 0) start = index; depth += 1; continue; }
    if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        try { records.push(JSON.parse(text.slice(start, index + 1))); } catch { /* ignore */ }
        start = -1;
      }
    }
  }
  return records;
}

function requireRecord(records, schema) {
  const record = records.find((item) => item?.schema === schema);
  assert.ok(record, `EMP1_POST_PROMOTION_SUBORDINATE_RECORD_REQUIRED:${schema}`);
  return record;
}

function gitText(args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); }
function gitBuffer(args) { return execFileSync('git', args, { cwd: root }); }
function gitHashObjectBuffer(buffer) {
  const completed = spawnSync('git', ['hash-object', '--stdin'], { cwd: root, input: buffer });
  assert.equal(completed.status, 0, 'EMP1_POST_PROMOTION_GIT_HASH_OBJECT_FAILED');
  return completed.stdout.toString('utf8').trim();
}
function semanticHash(value, hashField) {
  const { [hashField]: _hash, status: _status, ...payload } = value;
  return sha256Canonical(payload);
}
function sha256Buffer(buffer) { return createHash('sha256').update(buffer).digest('hex'); }
function sha256Text(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }
function sha256Canonical(value) { return sha256Text(JSON.stringify(sortValue(value))); }
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}
function parseArgs(args) {
  const out = {
    expectedHead: null,
    authorizationBase: null,
    evidenceDir: null,
    writeReceipt: null,
    authorizationRecordOverride: null,
    routeSourceOverride: null,
    registrySourceOverride: null,
  };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--expected-head') out.expectedHead = args[++index] ?? null;
    else if (args[index] === '--authorization-base') out.authorizationBase = args[++index] ?? null;
    else if (args[index] === '--evidence-dir') out.evidenceDir = args[++index] ?? null;
    else if (args[index] === '--write-receipt') out.writeReceipt = args[++index] ?? null;
    else if (args[index] === '--authorization-record-override') out.authorizationRecordOverride = args[++index] ?? null;
    else if (args[index] === '--route-source-override') out.routeSourceOverride = args[++index] ?? null;
    else if (args[index] === '--registry-source-override') out.registrySourceOverride = args[++index] ?? null;
    else throw gateError(`EMP1_POST_PROMOTION_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  return out;
}
function gateError(code) { const error = new TypeError(code); error.code = code; return error; }
