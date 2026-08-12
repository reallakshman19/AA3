import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { verifyFrictionRestraintCustody } from '../scripts/lfea-m047-bm4l-friction.mjs';

const AUTHORITY_PATH = new URL(
  '../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-restraint-authority.json',
  import.meta.url,
);
const authority = JSON.parse(fs.readFileSync(AUTHORITY_PATH, 'utf8'));
const sentinel = -1.01010000705719;

function defaultRows() {
  return [
    {
      NODE_NUM: 10,
      RES_TYPEID: 3,
      FRIC_COEF: 0.3,
      XCOSINE: 0,
      YCOSINE: 1,
      ZCOSINE: 0,
    },
    {
      NODE_NUM: 10,
      RES_TYPEID: 8,
      FRIC_COEF: sentinel,
      XCOSINE: 1,
      YCOSINE: 0,
      ZCOSINE: 0,
    },
  ];
}

function benchmarkPackage(sourceOverrides = {}, rows = defaultRows()) {
  return {
    benchmarkId: 'BM4_L',
    source: {
      fileName: authority.pinnedSourceAuthority.accdbMemberName,
      byteLength: authority.pinnedSourceAuthority.accdbByteLength,
      sha256: authority.pinnedSourceAuthority.accdbSha256,
      ...sourceOverrides,
    },
    model: { tables: { INPUT_RESTRAINTS: { rows } } },
  };
}

test('production custody gates the issue-pinned ACCDB identity but does not hard-code historical friction nodes', () => {
  const result = verifyFrictionRestraintCustody(benchmarkPackage(), authority);
  assert.equal(result.status, 'PASS');
  assert.deepEqual(result.failedChecks, []);
  assert.equal(result.selectedRows.length, 1);
  assert.equal(result.selectedRows[0].nodeId, '10');
  assert.equal(result.selectedRows[0].sourceRestraintTypeId, 3);
  assert.equal(result.historicalDiagnostic.historicalNodeListUsedBySolver, false);
  assert.equal(result.historicalDiagnostic.historicalRestraintTypeUsedBySolver, false);
  assert.equal(result.historicalDiagnostic.historicalDirectionUsedBySolver, false);
  assert.equal(result.historicalDiagnostic.topologyComparisonStatus, 'NOT_APPLICABLE_DIFFERENT_ACCDB_SHA');
});

test('production custody accepts a non-historical restraint type when the pinned ACCDB row declares friction', () => {
  const result = verifyFrictionRestraintCustody(benchmarkPackage({}, [{
    NODE_NUM: 77,
    RES_TYPEID: 8,
    FRIC_COEF: 0.3,
    XCOSINE: 0,
    YCOSINE: 0,
    ZCOSINE: -1,
  }]), authority);
  assert.equal(result.status, 'PASS');
  assert.deepEqual(result.failedChecks, []);
  assert.equal(result.selectedRows[0].sourceRestraintTypeId, 8);
  assert.deepEqual(result.selectedRows[0].normalDirection, [0, 0, -1]);
  assert.deepEqual(result.checks.selectedRowsAreNonAnchor.observedSelectedRestraintTypeIds, [8]);
});

test('historical diagnostic ACCDB SHA cannot satisfy the production source gate', () => {
  const result = verifyFrictionRestraintCustody(benchmarkPackage({
    sha256: authority.historicalDiagnosticCorroboration.accdbSha256,
  }), authority);
  assert.equal(result.status, 'BLOCKED_SOURCE_CUSTODY');
  assert.ok(result.failedChecks.includes('sourceAccdbSha256'));
  assert.equal(result.historicalDiagnostic.qualificationAuthority, false);
  assert.equal(result.historicalDiagnostic.sourceRelationship, 'UNEXPECTEDLY_SAME_AS_NONAUTHORITATIVE_HISTORICAL_SOURCE');
});

test('wrong ACCDB member name or byte length blocks production custody', () => {
  const wrongName = verifyFrictionRestraintCustody(benchmarkPackage({ fileName: 'other.ACCDB' }), authority);
  assert.equal(wrongName.status, 'BLOCKED_SOURCE_CUSTODY');
  assert.ok(wrongName.failedChecks.includes('sourceAccdbFileName'));

  const wrongLength = verifyFrictionRestraintCustody(benchmarkPackage({ byteLength: 123 }), authority);
  assert.equal(wrongLength.status, 'BLOCKED_SOURCE_CUSTODY');
  assert.ok(wrongLength.failedChecks.includes('sourceAccdbByteLength'));
});
