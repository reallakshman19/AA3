#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateLocalAttachmentFoundation } from '../src/core/local-stress/index.js';
import { canonicalFixture } from './lafea.1-fixtures.mjs';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
  evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
import { deriveEmp1Wrc537CylindricalAxisAuthority } from '../src/core/emp1/emp1-wrc537-cylindrical-axis-authority.js';
import {
  EMP1_WRC537_ATTACHMENT_STATION_BASIS,
  EMP1_WRC537_CYLINDER_LENGTH_BASIS,
  createEmp1Wrc537ApplicabilitySourceAuthority,
} from '../src/core/emp1/emp1-wrc537-applicability-source-authority.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
const expectedHead = options.expectedHead ?? process.env.EMP1_EXPECTED_HEAD_SHA ?? null;
if (!/^[0-9a-f]{40}$/u.test(expectedHead ?? '')) {
  throw qualificationError('EMP1_EXACT_HEAD_SHA_REQUIRED');
}
const actualHead = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
assert.equal(actualHead, expectedHead, `EMP1_EXACT_HEAD_MISMATCH:${actualHead}:${expectedHead}`);

const [oracleRecord, candidateRecord] = await Promise.all([
  readJson('validation/emp1/wrc537-2013/gamma5-post-authority-physical-oracle-v1.json'),
  readJson('validation/emp1/wrc537-2013/gamma5-zero-dp-route-qualification-v2.json'),
]);
assert.equal(oracleRecord.schema, 'emp1-wrc537-gamma5-post-authority-physical-oracle/v1');
assert.equal(oracleRecord.productionAuthority, false);
assert.equal(oracleRecord.productionObservationUsed, false);
assert.equal(candidateRecord.status, 'CANDIDATE_PENDING_EXECUTABLE_PRODUCTION_REOBSERVATION');
assert.equal(candidateRecord.engineeringAuthority, false);
assert.equal(candidateRecord.productionRouteAuthority, false);
assert.equal(candidateRecord.authorization.boundedRouteRegistrationAllowed, false);
assert.equal(candidateRecord.reobservation.currentProductionCandidateObserved, false);
assert.equal(sha256Canonical(candidateRecord.semanticPayload), candidateRecord.qualificationRecordSha256);

const independentRun = runScript('scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs');
const independentDecoupling = requireRecord(
  independentRun.records,
  'emp1-wrc537-independent-oracle-decoupling/v2',
);
const independentRefreeze = requireRecord(
  independentRun.records,
  'emp1-wrc537-gamma5-post-authority-independent-refreeze/v1',
);
assert.equal(independentDecoupling.status, 'PASS_INDEPENDENT_ORACLE_INTERPRETATION_DECOUPLED');
assert.deepEqual(independentDecoupling.productionImports, []);
assert.equal(independentDecoupling.productionObservationUsedToSetAuthority, false);
assert.equal(independentRefreeze.status, 'PASS_FROZEN_POST_AUTHORITY_PHYSICAL_TABLE5_ORACLE');
assert.deepEqual(independentRefreeze.productionImports, []);
assert.equal(independentRefreeze.productionObservationUsed, false);
assert.equal(independentRefreeze.productionAuthority, false);
assert.equal(independentRefreeze.semanticHash, oracleRecord.semanticHash);

const independentFalsifierRun = runScript(
  'scripts/emp1-wrc-gamma5-post-authority-refreeze-falsifiers.mjs',
);
const independentFalsifiers = requireRecord(
  independentFalsifierRun.records,
  'emp1-wrc537-gamma5-post-authority-refreeze-falsifiers/v1',
);
assert.equal(independentFalsifiers.status, 'PASS_POST_AUTHORITY_PHYSICAL_ORACLE_FALSIFIERS');
assert.deepEqual(independentFalsifiers.productionImports, []);
assert.equal(independentFalsifiers.productionObservationUsed, false);

const candidateBindingRun = runScript(
  'scripts/emp1-wrc-gamma5-route-requalification-candidate-check.mjs',
);
const candidateBinding = requireRecord(
  candidateBindingRun.records,
  'emp1-wrc537-gamma5-route-requalification-candidate-check/v1',
);
assert.equal(candidateBinding.candidateQualificationSha256, candidateRecord.qualificationRecordSha256);
assert.equal(candidateBinding.oracleHash, oracleRecord.semanticHash);
assert.equal(candidateBinding.productionRouteAuthorized, false);

const currentnessRun = runScript(
  'scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs',
);
const currentness = requireRecord(
  currentnessRun.records,
  'emp1-workbench-route-authority-currentness-falsifiers/v3',
);
assert.equal(currentness.status, 'PASS');
assert.equal(currentness.q1ToQ2OldResultReportable, false);
assert.equal(currentness.q1ToQ2RerunEnabled, true);
assert.equal(currentness.legacyAuthoritySnapshotFailsClosed, true);

const productRun = runScript('scripts/emp1-workbench-product-run-qualification.mjs');
const productQualification = requireRecord(
  productRun.records,
  'emp1-workbench-product-run-qualification/v8',
);
assert.equal(productQualification.productionRouteInvoked, false);
assert.equal(productQualification.globalEmp1CRouteAuthority, false);
assert.equal(productQualification.releaseQualified, false);

const completeSampleRun = runScript(
  'scripts/emp1-workbench-complete-sample-qualification.mjs',
);
const completeSample = completeSampleRun.records.find((record) =>
  record?.sampleSchema === 'emp1-workbench-qualification-sample/v1');
assert.ok(completeSample, 'EMP1_COMPLETE_SAMPLE_JSON_RECORD_REQUIRED');
assert.equal(completeSample.cProductionCount, 0);
assert.equal(completeSample.cReportable, false);

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
  geometryIdentity: 'EMP1-19-EXACT-HEAD-CYLINDER',
  cylinderLengthBasis: EMP1_WRC537_CYLINDER_LENGTH_BASIS,
  cylinderLength: oracle.case.applicability.cylinderLength,
  attachmentStationBasis: EMP1_WRC537_ATTACHMENT_STATION_BASIS,
  attachmentStationFromCylinderStart: oracle.case.applicability.attachmentStationFromCylinderStart,
  unit: 'mm',
  cylinderLengthSourceReference: 'EMP1-19/EXACT-HEAD/CYLINDER-LENGTH',
  attachmentStationSourceReference: 'EMP1-19/EXACT-HEAD/WRC-STATION',
  productionObservationUsedToSetAuthority: false,
});
const input = {
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
  applicabilitySourceAuthority,
  stressConcentration: structuredClone(oracle.case.stressConcentration),
};
const production = evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate(input);
assert.equal(production.state, 'PASS_BOUNDED_ROUTE_COMPARISON_CANDIDATE');
assert.equal(production.productionRouteAuthority, false);
assert.equal(production.globalEmp1CRouteAuthority, false);
assert.deepEqual(production.numerics.curveFigureMap, oracle.figureMap);
assert.deepEqual(production.numerics.wrcLoads, oracle.expectedPhysical.wrcLoads);
assert.equal(production.numerics.extremaScope.evaluatedLocationCount, 8);
assert.equal(production.numerics.extremaScope.continuousJunctureSearchPerformed, false);

const tolerancePolicy = Object.freeze({
  absolute: 1e-12,
  relative: 1e-11,
  formula: 'max(abs, max(1, |expected|) * rel)',
});
const locations = oracle.expected.locations;
const comparisons = [];
for (const family of ['circumferential', 'longitudinal', 'shear', 'stressIntensity']) {
  const actual = production.stresses[family];
  const expected = oracle.expected[family];
  assert.equal(actual.length, 8, `${family}: production length`);
  assert.equal(expected.length, 8, `${family}: oracle length`);
  actual.forEach((value, index) => {
    const target = expected[index];
    const tolerance = Math.max(
      tolerancePolicy.absolute,
      Math.max(1, Math.abs(target)) * tolerancePolicy.relative,
    );
    const absoluteDelta = Math.abs(value - target);
    const relativeDelta = absoluteDelta / Math.max(1, Math.abs(target));
    const toleranceRatio = absoluteDelta / tolerance;
    assert.ok(absoluteDelta <= tolerance,
      `EMP1_EXACT_HEAD_STRESS_DRIFT:${family}:${locations[index]}:actual=${value}:expected=${target}:tol=${tolerance}`);
    comparisons.push({
      family,
      location: locations[index],
      actual: value,
      expected: target,
      absoluteDelta,
      relativeDelta,
      tolerance,
      toleranceRatio,
    });
  });
}
assert.equal(comparisons.length, 32);
const governing = comparisons.reduce((current, row) =>
  row.toleranceRatio > current.toleranceRatio ? row : current, comparisons[0]);
const physicalLoadComparisons = Object.keys(oracle.expectedPhysical.wrcLoads).map((key) => ({
  component: key,
  actual: production.numerics.wrcLoads[key],
  expected: oracle.expectedPhysical.wrcLoads[key],
  absoluteDelta: Math.abs(
    production.numerics.wrcLoads[key] - oracle.expectedPhysical.wrcLoads[key],
  ),
}));
assert.equal(physicalLoadComparisons.length, 6);
assert.ok(physicalLoadComparisons.every((row) => row.absoluteDelta === 0));

assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED, false,
  'qualification observation must not auto-authorize production C');
assert.deepEqual(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS, [
  'WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE',
]);

const observationPayload = {
  schema: 'emp1-wrc537-gamma5-exact-head-requalification-observation/v1',
  observedHeadSha: actualHead,
  candidateQualificationSha256: candidateRecord.qualificationRecordSha256,
  activeHistoricalQualificationSha256: EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256,
  oracleSemanticHash: oracleRecord.semanticHash,
  independentAuthorityHashes: structuredClone(candidateRecord.semanticPayload.independentAuthority),
  sourceDocumentSha256: candidateRecord.semanticPayload.sourceDocumentSha256,
  datasetHash: candidateRecord.semanticPayload.datasetHash,
  loadProducerQualificationSha256: candidateRecord.semanticPayload.loadProducerQualificationSha256,
  tolerancePolicy,
  physicalWrcLoadComparisons,
  stressComparisonsRequired: 32,
  stressComparisonsPassed: comparisons.length,
  maxAbsoluteDelta: Math.max(...comparisons.map((row) => row.absoluteDelta)),
  maxRelativeDelta: Math.max(...comparisons.map((row) => row.relativeDelta)),
  maxToleranceRatio: governing.toleranceRatio,
  governingComparison: governing,
  stressIntensity: structuredClone(production.stresses.stressIntensity),
  subordinateEvidence: {
    independentDecoupling: evidenceRef(independentRun, independentDecoupling),
    independentRefreeze: evidenceRef(independentRun, independentRefreeze),
    independentFalsifiers: evidenceRef(independentFalsifierRun, independentFalsifiers),
    candidateBinding: evidenceRef(candidateBindingRun, candidateBinding),
    routeAuthorityCurrentness: evidenceRef(currentnessRun, currentness),
    productQualification: evidenceRef(productRun, productQualification),
    completeSample: {
      stdoutSha256: completeSampleRun.stdoutSha256,
      cProductionCount: completeSample.cProductionCount,
      cReportable: completeSample.cReportable,
      routeAuthorityHash: completeSample.routeAuthorityHash,
    },
  },
  authorization: {
    productionRouteAuthorizedBeforeObservation: EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
    authorizationChangeAppliedByThisObservation: false,
    boundedRoutePromotionReadyForEngineeringReview: true,
    globalEmp1CRouteAuthority: false,
    codeComplianceAuthorized: false,
    releaseQualified: false,
  },
};
const observationSemanticHash = sha256Canonical(observationPayload);
const record = {
  ...observationPayload,
  observationSemanticHash,
  status: 'PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED',
};
if (options.writeRecord) {
  await writeFile(resolve(root, options.writeRecord), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(record, null, 2));

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
    env: { ...process.env, EMP1_EXACT_HEAD_PARENT_SHA: expectedHead },
  });
  assert.equal(completed.status, 0,
    `EMP1_SUBORDINATE_QUALIFICATION_FAILED:${path}\nSTDOUT:\n${completed.stdout}\nSTDERR:\n${completed.stderr}`);
  const stdout = completed.stdout ?? '';
  return {
    path,
    records: extractJsonObjects(stdout),
    stdoutSha256: sha256(stdout),
  };
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
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const candidate = text.slice(start, index + 1);
        try { records.push(JSON.parse(candidate)); } catch { /* ignore non-JSON brace blocks */ }
        start = -1;
      }
    }
  }
  return records;
}
function requireRecord(records, schema) {
  const record = records.find((item) => item?.schema === schema);
  assert.ok(record, `EMP1_SUBORDINATE_JSON_RECORD_REQUIRED:${schema}`);
  return record;
}
function evidenceRef(run, record) {
  return {
    script: run.path,
    schema: record.schema ?? null,
    status: record.status ?? null,
    stdoutSha256: run.stdoutSha256,
  };
}
async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}
function parseArgs(args) {
  const options = { expectedHead: null, writeRecord: null };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--expected-head') options.expectedHead = args[++index] ?? null;
    else if (args[index] === '--write-record') options.writeRecord = args[++index] ?? null;
    else throw qualificationError(`EMP1_EXACT_HEAD_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  return options;
}
function sha256Canonical(value) { return sha256(JSON.stringify(sortValue(value))); }
function sha256(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}
function qualificationError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
