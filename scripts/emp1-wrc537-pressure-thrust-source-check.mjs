#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  EMP1_WRC537_LOAD_REFERENCE,
  EMP1_WRC537_PRESSURE_DISPOSITION,
  EMP1_WRC537_PRESSURE_MODES,
} from '../src/core/emp1/emp1-wrc537-load-custody.js';
import {
  EMP1_A_WRC_ZERO_DP_PRODUCER_QUALIFICATION_SHA256,
  EMP1_A_WRC_ZERO_DP_PRODUCER_ROUTE_AUTHORIZED,
} from '../src/core/emp1/emp1-a-wrc-zero-dp-load-producer.js';

const ledgerPath = 'validation/emp1/wrc537-2013/nonzero-dp-pressure-thrust-source-qualification-v1.json';
const hexagonPath = 'validation/emp1/caux2017-wrc01f/hexagon-wrc107-independent-precheck-qualification-v1.json';
const zeroDpSourcePath = 'src/core/emp1/emp1-a-wrc-zero-dp-load-producer.js';
const pressureSourcePath = 'src/core/local-stress/pressure.js';

const [ledger, hexagon, zeroDpSource, pressureSource] = await Promise.all([
  readJson(ledgerPath),
  readJson(hexagonPath),
  readFile(zeroDpSourcePath, 'utf8'),
  readFile(pressureSourcePath, 'utf8'),
]);

assert.equal(ledger.schema, 'emp1-wrc537-nonzero-dp-pressure-thrust-source-qualification/v1');
assert.equal(ledger.status, 'BLOCKED_UNIVERSAL_NONZERO_DP_PRESSURE_THRUST_CUSTODY_UNRESOLVED');
assert.equal(ledger.engineeringAuthority, false);
assert.equal(ledger.productionRouteExpansionAuthority, false);
assert.equal(ledger.nonzeroDpProducerImplementationAuthorized, false);
assert.equal(ledger.globalEmp1CRouteAuthority, false);
assert.equal(ledger.releaseQualified, false);
assert.equal(ledger.pinnedWrcSource.gitBlobSha1, 'ce861233928154145a9257efbbf8dbef3f5a17d1');
assert.equal(ledger.pinnedWrcSource.rawPdfSha256, '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2');
assert.equal(ledger.pinnedWrcSource.primaryPageVerificationForThisQuestion, 'NOT_RUN_IN_CURRENT_CONNECTED_ENVIRONMENT');

assert.equal(hexagon.qualificationId, 'HEXAGON_WRC107_PRESSURE_THRUST_PRECHECK_Q1');
assert.equal(hexagon.subject.classification, 'SUPPLEMENTAL_REFERENCE_NOT_CAUX_BENCHMARK');
assert.equal(hexagon.verdict, 'QUALIFIED_FOR_BOUNDED_SANITY_CHECK_ONLY');
assert.equal(hexagon.mayAuthorizeEmp1CProduction, false);
assert.equal(hexagon.productionObservationUsedToSetExpectedValues, false);
assert.equal(hexagon.independentArithmetic.status, 'PASS');
assert.equal(hexagon.signAndReferenceAudit.status, 'PASS_FOR_THIS_HEXAGON_EXAMPLE_ONLY');
assert.equal(hexagon.independentArithmetic.values.nozzleInsideDiameter_in, 12);
assert.equal(hexagon.independentArithmetic.values.sourceDisplayedTotal_lbf, -31128);
assert.equal(hexagon.independentArithmetic.acceptance.result, 'PASS');

assert.equal(ledger.controlledSupplementalReference.sourceFacts.nozzleInsideDiameterIn, 12);
assert.equal(ledger.controlledSupplementalReference.sourceFacts.sourceDisplayedWrcRadialLoadLbf, -31128);
assert.equal(ledger.controlledSupplementalReference.mayAuthorizeEmp1CProduction, false);
assert.match(ledger.controlledSupplementalReference.authorityLimit, /cited Hexagon example/u);

assert.equal(EMP1_WRC537_LOAD_REFERENCE, 'WRC_ATTACHMENT_REFERENCE_POINT');
assert.equal(EMP1_WRC537_PRESSURE_DISPOSITION, 'PRESSURE_THRUST_RESOLVED_UPSTREAM');
assert.deepEqual(EMP1_WRC537_PRESSURE_MODES, [
  'SOURCE_LOAD_ALREADY_INCLUDES_THRUST',
  'SOURCE_LOAD_EXCLUDES_THRUST_NOT_REQUIRED',
  'SOURCE_LOAD_EXCLUDES_THRUST_ADDED_UPSTREAM',
]);
assert.deepEqual(ledger.currentRepositoryContracts.declaredPressureModes, [...EMP1_WRC537_PRESSURE_MODES]);
assert.equal(ledger.currentRepositoryContracts.doubleCountGuardRequired, true);
assert.equal(ledger.currentRepositoryContracts.addedUpstreamVerificationRequired, true);

assert.equal(EMP1_A_WRC_ZERO_DP_PRODUCER_ROUTE_AUTHORIZED, true);
assert.equal(EMP1_A_WRC_ZERO_DP_PRODUCER_QUALIFICATION_SHA256, '47a9157ba88a5646021fabd41cd803028e1880c8d6f712095afda429f2c2622b');
assert.match(zeroDpSource, /EMP1_A_WRC_ZERO_DP_NONZERO_DIFFERENTIAL_PRESSURE/u);
assert.match(zeroDpSource, /pressureThrust:0/u);
assert.match(zeroDpSource, /SOURCE_LOAD_EXCLUDES_THRUST_NOT_REQUIRED/u);

for (const endCondition of ['CLOSED_END', 'OPEN_END', 'EXPLICIT_AXIAL_RESULTANT']) assert.match(pressureSource, new RegExp(endCondition, 'u'));
assert.equal(ledger.currentRepositoryContracts.pipeWallPressureEvidenceIsAutomaticWrcLoadAuthority, false);

assert.ok(Array.isArray(ledger.unresolvedUniversalAuthority));
assert.ok(ledger.unresolvedUniversalAuthority.length >= 10);
for (const required of [
  'PRIMARY_WRC_537_PRESSURE_THRUST_PAGE_TEXT_AND_LOCATOR',
  'UNIVERSAL_EFFECTIVE_PRESSURE_AREA_DEFINITION',
  'UNIVERSAL_WRC_P_SIGN_AND_AXIS_MAPPING',
  'EVIDENCE_REQUIRED_TO_PROVE_SOURCE_LOAD_ALREADY_CONTAINS_THRUST',
  'QUALIFIED_NONZERO_DP_PRODUCER_AND_POLICY_RECORD_HASH',
]) assert.ok(ledger.unresolvedUniversalAuthority.includes(required));

for (const prohibition of [
  'DO_NOT_PROMOTE_HEXAGON_EXAMPLE_TO_UNIVERSAL_WRC_AUTHORITY',
  'DO_NOT_ASSUME_F_EQUALS_DP_TIMES_AREA_WITHOUT_QUALIFIED_AREA_AND_END_CONDITION',
  'DO_NOT_ADD_PRESSURE_THRUST_WHEN_SOURCE_LOAD_INCLUSION_IS_UNRESOLVED',
  'DO_NOT_TREAT_PIPE_WALL_AXIAL_PRESSURE_STRESS_AS_WRC_LOAD_AUTHORITY',
  'DO_NOT_MUTATE_HISTORICAL_ZERO_DP_PRODUCER_QUALIFICATION',
  'DO_NOT_ENABLE_NONZERO_DP_PRODUCTION_ROUTE',
]) assert.ok(ledger.prohibitions.includes(prohibition));

console.log(JSON.stringify({
  schema: 'emp1-wrc537-pressure-thrust-source-check/v1',
  status: 'PASS_EXPECTED_BLOCKED_NONZERO_DP_PRESSURE_THRUST_AUTHORITY',
  boundedHexagonReferenceQualified: true,
  universalPressureThrustPolicyQualified: false,
  nonzeroDpProducerAuthorized: false,
  zeroDpProducerQualificationPreserved: EMP1_A_WRC_ZERO_DP_PRODUCER_QUALIFICATION_SHA256,
  pressureModes: [...EMP1_WRC537_PRESSURE_MODES],
  unresolvedUniversalAuthorityCount: ledger.unresolvedUniversalAuthority.length,
  productionRouteExpansionAuthority: false,
}, null, 2));

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}
