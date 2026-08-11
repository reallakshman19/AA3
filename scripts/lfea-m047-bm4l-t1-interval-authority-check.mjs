import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const profilePath = path.join(root, 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json');
const authorityPath = path.join(root, 'benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-t1-interval-authority.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(`M047_T1_INTERVAL_AUTHORITY_CHECK_FAILED: ${message}`);
}

function close(actual, expected, tolerance, message) {
  assert(Number.isFinite(actual), `${message}: actual is not finite`);
  assert(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} != ${expected}`);
}

const profile = readJson(profilePath);
const authority = readJson(authorityPath);

assert(authority.schema === 'm047-bm4l-t1-interval-authority/v1', 'authority schema');
assert(authority.benchmarkId === 'BM4_L', 'authority benchmark');
assert(profile.benchmarkId === 'BM4_L', 'profile benchmark');

const interval = authority.interval;
const reconstructedDelta = interval.operatingTemperatureC - interval.installationTemperatureC;
assert(reconstructedDelta === interval.temperatureDifferenceK, 'temperature interval');
close(
  interval.meanAlphaPerK * interval.temperatureDifferenceK,
  interval.epsilonT1,
  5e-16,
  'alpha * DeltaT must reproduce epsilon_T1',
);
assert(
  Number(interval.epsilonT1.toFixed(authority.caesar.miscReport.printedDecimals))
    === authority.caesar.miscReport.reportedT1ExpansionStrainMmPerMm,
  'resolved strain must round to the pinned Misc report value',
);

assert(authority.reconstruction.robustSpanCount === 54, '54-span overdetermined reconstruction');
assert(authority.reconstruction.minimumSpanLengthM === 0.1, 'robust span length floor');
assert(authority.reconstruction.robustScatterUpperBound <= 1e-9, 'robust scatter bound');

const thermal = profile.linearSolve.thermalExpansion;
close(thermal.coefficientPerKelvin, interval.meanAlphaPerK, 1e-18, 'profile interval alpha');
assert(thermal.authorityStatus === 'RESOLVED', 'profile thermal authority must be RESOLVED');
assert(
  String(thermal.source).includes('54_NON_TEE_STRAIGHT'),
  'profile source must identify the 54-span reconstruction',
);

const unresolved = profile.configurationAuthority.unresolvedSettings ?? [];
assert(
  !unresolved.some((entry) => entry.setting === 'THERMAL_EXPANSION_STRAIN'),
  'THERMAL_EXPANSION_STRAIN must no longer be unresolved',
);

assert(profile.tolerances.ROTATION.zeroReferenceAbsolute === 1e-7, 'rotation zero gate unchanged');
assert(profile.tolerances.DISPLACEMENT.zeroReferenceAbsolute === 1e-7, 'displacement zero gate unchanged');
assert(profile.tolerances.FORCE.zeroReferenceAbsolute === 5, 'force zero gate unchanged');
assert(profile.tolerances.MOMENT.zeroReferenceAbsolute === 0.5, 'moment zero gate unchanged');

const selected = new Set(profile.caseSelection.cases.map((entry) => entry.caseId));
for (const caseId of ['L2', 'L3', 'L4', 'L5', 'L6', 'L14']) {
  assert(selected.has(caseId), `governed case ${caseId} missing`);
}

const resolved = authority.exactEquationReplay.teeAtResolvedIntervalStrain;
assert(
  [resolved.L2, resolved.L3, resolved.L4, resolved.L5, resolved.L6, resolved.L14, resolved.total]
    .join('/') === '31/22/40/13/22/22/150',
  'resolved exact-equation signature',
);

console.log(JSON.stringify({
  status: 'PASS',
  benchmarkId: authority.benchmarkId,
  epsilonT1: interval.epsilonT1,
  meanAlphaPerK: interval.meanAlphaPerK,
  robustSpanCount: authority.reconstruction.robustSpanCount,
  exactEquationSignature: resolved,
}));
