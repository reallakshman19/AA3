import assert from 'node:assert/strict';
import fs from 'node:fs';

const p = JSON.parse(fs.readFileSync(
  new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-l13-friction-support-localization.json', import.meta.url),
  'utf8',
));
const csv = fs.readFileSync(
  new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-l13-friction-support-localization-sites.csv', import.meta.url),
  'utf8',
).trim().split(/\r?\n/);

assert.equal(p.schema, 'm047-bm4l-l13-friction-support-localization/v1');
assert.equal(p.benchmarkId, 'BM4_L');
assert.equal(p.caseId, 'L13');
assert.equal(p.baseline.governedRows, 1914);
assert.equal(p.baseline.passedRows, 1719);
assert.equal(p.baseline.failedRows, 195);
assert.equal(p.baseline.stateCounts.stick, 7);
assert.equal(p.baseline.stateCounts.sliding, 19);
assert.equal(p.baseline.frictionStiffnessNPerM, 175126835.24647635);
assert.equal(p.summary.failedRestraintForceComponents, 13);
assert.equal(p.summary.frictionSitesWithAtLeastOneFailedRestraintForceComponent, 12);
assert.equal(p.summary.gapSiteFailedRestraintForceComponents, 4);
assert.equal(p.summary.nonGapSiteFailedRestraintForceComponents, 9);
assert.equal(p.summary.nearestFailureBurdenAtGapSites, 12);
assert.equal(p.summary.nearestFailureBurdenAtNonGapSites, 183);
assert.equal(p.summary.nearestFailureBurdenSlidingSites, 154);
assert.equal(p.summary.nearestFailureBurdenStickSites, 41);

const header = csv[0].split(',');
const rows = csv.slice(1).map((line) => Object.fromEntries(
  line.split(',').map((value, index) => [header[index], value]),
));
assert.equal(rows.length, 26);
const gapNodes = rows.filter((row) => Number(row.gapCompanionCount) > 0).map((row) => row.node).sort();
assert.deepEqual(gapNodes, ['20030', '20390', '21480', '22310']);
const burden = rows.reduce((sum, row) => sum + Number(row.nearestFailureBurden), 0);
assert.equal(burden, 195);

assert.equal(p.decision.gapContactFirst, false);
assert.equal(p.decision.l13QualifiedAccuracyAuthorized, false);
assert.equal(p.decision.l7ExecutionAuthorized, false);
assert.ok(p.prohibitions.includes('DO_NOT_SELECT_STICK_SLIDE_OR_GAP_STATE_FROM_REFERENCE_ERROR'));
assert.ok(p.prohibitions.includes('DO_NOT_FIT_SLIDE_MULTIPLIER_FROM_SITE_RESIDUALS'));

console.log('PASS M047 BM4_L L13 friction support/state localization F2.1');
