#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
if (!options.recordPath) throw observationError('EMP1_REQUALIFICATION_OBSERVATION_RECORD_REQUIRED');
const [record, candidateRecord, oracleRecord] = await Promise.all([
  readJson(options.recordPath),
  readJson('validation/emp1/wrc537-2013/gamma5-zero-dp-route-qualification-v2.json'),
  readJson('validation/emp1/wrc537-2013/gamma5-post-authority-physical-oracle-v1.json'),
]);

assert.equal(record.schema, 'emp1-wrc537-gamma5-exact-head-requalification-observation/v1');
assert.equal(record.status,
  'PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED');
assert.match(record.observedHeadSha, /^[0-9a-f]{40}$/u);
if (options.expectedObservedHead) {
  assert.equal(record.observedHeadSha, options.expectedObservedHead,
    'EMP1_REQUALIFICATION_OBSERVED_HEAD_MISMATCH');
}
assertCommitExists(record.observedHeadSha);
if (options.requireObservedHeadParent) {
  const parent = execFileSync('git', ['rev-parse', 'HEAD^'], { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(parent, record.observedHeadSha,
    `EMP1_REQUALIFICATION_RECORD_COMMIT_PARENT_MISMATCH:${parent}:${record.observedHeadSha}`);
}

const { observationSemanticHash, status, ...payload } = record;
assert.equal(sha256Canonical(payload), observationSemanticHash,
  'EMP1_REQUALIFICATION_OBSERVATION_SEMANTIC_HASH_DRIFT');
assert.equal(record.candidateQualificationSha256, candidateRecord.qualificationRecordSha256);
assert.equal(record.activeHistoricalQualificationSha256,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256);
assert.equal(record.oracleSemanticHash, oracleRecord.semanticHash);
assert.deepEqual(record.independentAuthorityHashes,
  candidateRecord.semanticPayload.independentAuthority);
assert.equal(record.sourceDocumentSha256, candidateRecord.semanticPayload.sourceDocumentSha256);
assert.equal(record.datasetHash, candidateRecord.semanticPayload.datasetHash);
assert.equal(record.loadProducerQualificationSha256,
  candidateRecord.semanticPayload.loadProducerQualificationSha256);

const tolerancePolicy = {
  absolute: 1e-12,
  relative: 1e-11,
  formula: 'max(abs, max(1, |expected|) * rel)',
};
assert.deepEqual(record.tolerancePolicy, tolerancePolicy);

const oracle = oracleRecord.semanticPayload;
const loadComponents = ['P', 'Vc', 'Vl', 'Mc', 'Ml', 'Mt'];
assert.equal(record.physicalWrcLoadComparisons.length, loadComponents.length);
record.physicalWrcLoadComparisons.forEach((row, index) => {
  const component = loadComponents[index];
  assert.equal(row.component, component,
    `EMP1_REQUALIFICATION_WRC_LOAD_COMPONENT_ORDER:${index}`);
  assert.ok(Number.isFinite(row.actual), `EMP1_REQUALIFICATION_WRC_LOAD_ACTUAL:${component}`);
  assert.ok(Number.isFinite(row.expected), `EMP1_REQUALIFICATION_WRC_LOAD_EXPECTED:${component}`);
  assert.equal(row.expected, oracle.expectedPhysical.wrcLoads[component],
    `EMP1_REQUALIFICATION_WRC_LOAD_ORACLE_DRIFT:${component}`);
  const absoluteDelta = Math.abs(row.actual - row.expected);
  assert.equal(row.absoluteDelta, absoluteDelta,
    `EMP1_REQUALIFICATION_WRC_LOAD_DELTA_DRIFT:${component}`);
  assert.equal(absoluteDelta, 0,
    `EMP1_REQUALIFICATION_WRC_LOAD_NONZERO_DRIFT:${component}`);
});

const families = ['circumferential', 'longitudinal', 'shear', 'stressIntensity'];
const locations = oracle.expected.locations;
assert.deepEqual(locations, ['Au', 'Al', 'Bu', 'Bl', 'Cu', 'Cl', 'Du', 'Dl']);
assert.equal(record.stressComparisonsRequired, 32);
assert.equal(record.stressComparisonsPassed, 32);
assert.ok(Array.isArray(record.stressComparisons),
  'EMP1_REQUALIFICATION_STRESS_COMPARISON_MATRIX_REQUIRED');
assert.equal(record.stressComparisons.length, 32,
  'EMP1_REQUALIFICATION_STRESS_COMPARISON_MATRIX_INCOMPLETE');

const recomputed = [];
let rowIndex = 0;
for (const family of families) {
  const expectedFamily = oracle.expected[family];
  assert.equal(expectedFamily.length, locations.length,
    `EMP1_REQUALIFICATION_ORACLE_FAMILY_LENGTH:${family}`);
  for (let locationIndex = 0; locationIndex < locations.length; locationIndex += 1) {
    const row = record.stressComparisons[rowIndex];
    const location = locations[locationIndex];
    const expected = expectedFamily[locationIndex];
    assert.equal(row.family, family,
      `EMP1_REQUALIFICATION_STRESS_FAMILY_ORDER:${rowIndex}`);
    assert.equal(row.location, location,
      `EMP1_REQUALIFICATION_STRESS_LOCATION_ORDER:${rowIndex}`);
    assert.ok(Number.isFinite(row.actual),
      `EMP1_REQUALIFICATION_STRESS_ACTUAL:${family}:${location}`);
    assert.ok(Number.isFinite(row.expected),
      `EMP1_REQUALIFICATION_STRESS_EXPECTED:${family}:${location}`);
    assert.equal(row.expected, expected,
      `EMP1_REQUALIFICATION_STRESS_ORACLE_DRIFT:${family}:${location}`);
    const tolerance = Math.max(
      tolerancePolicy.absolute,
      Math.max(1, Math.abs(expected)) * tolerancePolicy.relative,
    );
    const absoluteDelta = Math.abs(row.actual - expected);
    const relativeDelta = absoluteDelta / Math.max(1, Math.abs(expected));
    const toleranceRatio = absoluteDelta / tolerance;
    assert.equal(row.tolerance, tolerance,
      `EMP1_REQUALIFICATION_STRESS_TOLERANCE_DRIFT:${family}:${location}`);
    assert.equal(row.absoluteDelta, absoluteDelta,
      `EMP1_REQUALIFICATION_STRESS_ABSOLUTE_DELTA_DRIFT:${family}:${location}`);
    assert.equal(row.relativeDelta, relativeDelta,
      `EMP1_REQUALIFICATION_STRESS_RELATIVE_DELTA_DRIFT:${family}:${location}`);
    assert.equal(row.toleranceRatio, toleranceRatio,
      `EMP1_REQUALIFICATION_STRESS_TOLERANCE_RATIO_DRIFT:${family}:${location}`);
    assert.ok(toleranceRatio <= 1,
      `EMP1_REQUALIFICATION_STRESS_OUTSIDE_TOLERANCE:${family}:${location}`);
    recomputed.push({
      family,
      location,
      actual: row.actual,
      expected,
      absoluteDelta,
      relativeDelta,
      tolerance,
      toleranceRatio,
    });
    rowIndex += 1;
  }
}
assert.equal(rowIndex, 32);

const maxAbsoluteDelta = Math.max(...recomputed.map((row) => row.absoluteDelta));
const maxRelativeDelta = Math.max(...recomputed.map((row) => row.relativeDelta));
const governing = recomputed.reduce((current, row) =>
  row.toleranceRatio > current.toleranceRatio ? row : current, recomputed[0]);
assert.equal(record.maxAbsoluteDelta, maxAbsoluteDelta,
  'EMP1_REQUALIFICATION_MAX_ABSOLUTE_DELTA_DRIFT');
assert.equal(record.maxRelativeDelta, maxRelativeDelta,
  'EMP1_REQUALIFICATION_MAX_RELATIVE_DELTA_DRIFT');
assert.equal(record.maxToleranceRatio, governing.toleranceRatio,
  'EMP1_REQUALIFICATION_MAX_TOLERANCE_RATIO_DRIFT');
assert.deepEqual(record.governingComparison, governing,
  'EMP1_REQUALIFICATION_GOVERNING_COMPARISON_DRIFT');
assert.ok(record.maxToleranceRatio >= 0 && record.maxToleranceRatio <= 1);

const stressIntensityRows = recomputed
  .filter((row) => row.family === 'stressIntensity')
  .map((row) => row.actual);
assert.deepEqual(record.stressIntensity, stressIntensityRows,
  'EMP1_REQUALIFICATION_STRESS_INTENSITY_VECTOR_DRIFT');

assertSubordinate(record.subordinateEvidence.independentDecoupling,
  'scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs',
  'PASS_INDEPENDENT_ORACLE_INTERPRETATION_DECOUPLED');
assertSubordinate(record.subordinateEvidence.independentRefreeze,
  'scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs',
  'PASS_FROZEN_POST_AUTHORITY_PHYSICAL_TABLE5_ORACLE');
assertSubordinate(record.subordinateEvidence.independentFalsifiers,
  'scripts/emp1-wrc-gamma5-post-authority-refreeze-falsifiers.mjs',
  'PASS_POST_AUTHORITY_PHYSICAL_ORACLE_FALSIFIERS');
assertSubordinate(record.subordinateEvidence.candidateBinding,
  'scripts/emp1-wrc-gamma5-route-requalification-candidate-check.mjs');
assertSubordinate(record.subordinateEvidence.routeAuthorityCurrentness,
  'scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs', 'PASS');
assertSubordinate(record.subordinateEvidence.productQualification,
  'scripts/emp1-workbench-product-run-qualification.mjs');
assert.match(record.subordinateEvidence.completeSample.stdoutSha256, /^[0-9a-f]{64}$/u);
assert.equal(record.subordinateEvidence.completeSample.cProductionCount, 0);
assert.equal(record.subordinateEvidence.completeSample.cReportable, false);
assert.equal(typeof record.subordinateEvidence.completeSample.routeAuthorityHash, 'string');

assert.equal(record.authorization.productionRouteAuthorizedBeforeObservation, false);
assert.equal(record.authorization.authorizationChangeAppliedByThisObservation, false);
assert.equal(record.authorization.boundedRoutePromotionReadyForEngineeringReview, true);
assert.equal(record.authorization.globalEmp1CRouteAuthority, false);
assert.equal(record.authorization.codeComplianceAuthorized, false);
assert.equal(record.authorization.releaseQualified, false);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED, false,
  'observation verification must occur while production route remains suspended');
assert.deepEqual(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS, [
  'WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE',
]);

console.log(JSON.stringify({
  schema: 'emp1-wrc537-gamma5-requalification-observation-check/v2',
  status: 'PASS_REQUALIFICATION_OBSERVATION_FULL_MATRIX_INTEGRITY_ROUTE_STILL_SUSPENDED',
  observedHeadSha: record.observedHeadSha,
  observationSemanticHash,
  candidateQualificationSha256: record.candidateQualificationSha256,
  oracleSemanticHash: record.oracleSemanticHash,
  physicalWrcLoadsPassed: loadComponents.length,
  stressComparisonsPassed: record.stressComparisons.length,
  maxToleranceRatio: record.maxToleranceRatio,
  productionRouteAuthorized: false,
  authorizationChangeApplied: false,
}, null, 2));

function assertSubordinate(value, script, status = null) {
  assert.ok(value && typeof value === 'object', `EMP1_SUBORDINATE_EVIDENCE_REQUIRED:${script}`);
  assert.equal(value.script, script);
  assert.match(value.stdoutSha256, /^[0-9a-f]{64}$/u);
  assert.equal(typeof value.schema, 'string');
  if (status) assert.equal(value.status, status);
  else assert.match(value.status ?? '', /^PASS/u);
}
function assertCommitExists(sha) {
  try {
    execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, stdio: 'ignore' });
  } catch {
    throw observationError(`EMP1_REQUALIFICATION_OBSERVED_HEAD_NOT_IN_REPOSITORY:${sha}`);
  }
}
async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}
function parseArgs(args) {
  const out = { recordPath: null, expectedObservedHead: null, requireObservedHeadParent: false };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--record') out.recordPath = args[++index] ?? null;
    else if (args[index] === '--expected-observed-head') out.expectedObservedHead = args[++index] ?? null;
    else if (args[index] === '--require-observed-head-parent') out.requireObservedHeadParent = true;
    else throw observationError(`EMP1_REQUALIFICATION_OBSERVATION_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  if (out.expectedObservedHead != null && !/^[0-9a-f]{40}$/u.test(out.expectedObservedHead)) {
    throw observationError('EMP1_REQUALIFICATION_EXPECTED_OBSERVED_HEAD_INVALID');
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
function observationError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
