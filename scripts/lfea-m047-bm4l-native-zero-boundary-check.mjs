import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const authorityPath = path.join(root, 'benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-native-zero-boundary-authority.json');
const profilePath = path.join(root, 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json');
const reportPath = process.argv[2] ?? null;
const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

const rotationBoundary = 0.0001 * Math.PI / 180;
assert.equal(authority.schema, 'm047-bm4l-native-zero-boundary-authority/v1');
assert.equal(authority.source.accdbSha256, '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8');
assert.equal(authority.source.outputDisplacementsTableSha256, 'f23b9ddd34a076eb09e9759824cae48e0b0da628abc0b790d3491b33a7b88d05');
assert.ok(Math.abs(authority.interpretation.rotationBoundaryRadians - rotationBoundary) < 1e-20);
assert.equal(profile.tolerances.DISPLACEMENT.zeroReferenceAbsolute, 1e-7);
assert.ok(Math.abs(profile.tolerances.ROTATION.zeroReferenceAbsolute - rotationBoundary) < 1e-20);
assert.equal(profile.tolerances.ROTATION.relative, 0.1);
assert.equal(authority.expectedResolvedCandidate.withRotationZeroBoundary.total, 46);
assert.equal(authority.expectedResolvedCandidate.remainingNonzeroReferenceFailures, 45);
assert.equal(authority.expectedResolvedCandidate.exactZeroFailuresRemoved, 104);

if (reportPath) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const configs = [
    ['DISPLACEMENT', 1000, 1e-7],
    ['ROTATION', 180 / Math.PI, rotationBoundary],
  ];
  for (const [quantity, nativeScale, boundary] of configs) {
    const observed = [];
    let zeroCount = 0;
    const perCase = new Map();
    for (const caseRecord of report.cases) {
      const values = caseRecord.referenceRows
        .filter((row) => row.quantity === quantity)
        .map((row) => Number(row.value));
      const zeros = values.filter((value) => value === 0).length;
      const nonzero = values.filter((value) => value !== 0).map(Math.abs);
      zeroCount += zeros;
      observed.push(...nonzero);
      perCase.set(caseRecord.caseId, { zeros, nonzero });
    }
    const expected = authority.referenceSupport[quantity];
    assert.equal(zeroCount, expected.zeroReferenceCount, `${quantity} zero count`);
    assert.equal(observed.length, expected.nonzeroReferenceCount, `${quantity} nonzero count`);
    assert.equal(observed.filter((value) => value < boundary).length, 0, `${quantity} nonzero below boundary`);
    assert.ok(Math.abs(Math.min(...observed) - expected.minimumNonzeroSI) < 1e-20, `${quantity} minimum nonzero`);
    assert.ok(Math.abs(Math.min(...observed) * nativeScale - expected.minimumNonzeroNative) < 1e-15, `${quantity} native minimum`);
    for (const [caseId, row] of Object.entries(expected.cases)) {
      const actual = perCase.get(caseId);
      assert.ok(actual, `${quantity} missing ${caseId}`);
      assert.equal(actual.zeros, row.zeroReferenceCount, `${quantity} ${caseId} zero count`);
      assert.equal(actual.nonzero.length, row.nonzeroReferenceCount, `${quantity} ${caseId} nonzero count`);
      assert.equal(actual.nonzero.filter((value) => value < boundary).length, 0, `${quantity} ${caseId} nonzero below boundary`);
    }
  }
}

console.log('PASS m047 BM4_L native zero-boundary authority');
