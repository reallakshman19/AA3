import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildInputXmlFrictionSiteMap } from '../src/core/nonlinear-restraint-friction/inputxml-friction-site-map.js';

const BM4L_MUTATION = Object.freeze({
  enabled: true,
  rows: Object.freeze([
    Object.freeze({ label: '+Y', from: '17', to: '14' }),
    Object.freeze({ label: 'LIM', from: '7', to: '8' }),
    Object.freeze({ label: 'GUI', from: '10', to: '9' }),
    Object.freeze({ label: 'X', from: '1', to: '2' }),
    Object.freeze({ label: 'Y', from: '2', to: '3' }),
    Object.freeze({ label: 'Z', from: '3', to: '5' }),
    Object.freeze({ label: '', from: '18', to: '15' }),
  ]),
});

const syntheticXml = `
<PIPINGMODEL>
  <RESTRAINT NUM="1" NODE="100.000000" TYPE="17.000000" STIFFNESS="-1.010100" GAP="-1.010100" FRIC_COEF="0.300000" CNODE="-1.010100" XCOSINE="0.000000" YCOSINE="1.000000" ZCOSINE="0.000000" TAG="HOLD" GUID=""/>
  <RESTRAINT NUM="2" NODE="100.000000" TYPE="7.000000" STIFFNESS="-1.010100" GAP="25.000000" FRIC_COEF="-1.010100" CNODE="-1.010100" XCOSINE="0.000000" YCOSINE="0.000000" ZCOSINE="-1.000000" TAG="" GUID=""/>
  <RESTRAINT NUM="3" NODE="100.000000" TYPE="10.000000" STIFFNESS="-1.010100" GAP="5.000000" FRIC_COEF="-1.010100" CNODE="-1.010100" XCOSINE="-1.000000" YCOSINE="0.000000" ZCOSINE="0.000000" TAG="" GUID=""/>
</PIPINGMODEL>`;

const sourceOnly = buildInputXmlFrictionSiteMap(syntheticXml);
assert.equal(sourceOnly.typeSemantics.classificationStatus, 'SOURCE_ONLY_RAW_TYPE_NOT_CLASSIFIED');
assert.equal(sourceOnly.typeSemantics.rawTypeUsedAsMechanicsSemantics, false);
assert.equal(sourceOnly.sites[0].sourceTypeCode, '17');
assert.equal(sourceOnly.sites[0].correctedTypeCode, null);
assert.equal(sourceOnly.sites[0].typeAbbreviation, null);

const governed = buildInputXmlFrictionSiteMap(syntheticXml, {
  restraintTypeMutationConfig: BM4L_MUTATION,
});
assert.equal(governed.typeSemantics.classificationStatus, 'CORRECTED_INPUTXML_TYPE_CLASSIFIED');
assert.equal(governed.typeSemantics.mutationAppliedByThisMap, true);
assert.equal(governed.sites[0].sourceTypeCode, '17');
assert.equal(governed.sites[0].correctedTypeCode, '14');
assert.equal(governed.sites[0].typeAbbreviation, '+Y');
assert.equal(governed.sites[0].typeFamily, 'TRANSLATIONAL_DIRECTIONAL');
assert.equal(governed.sites[0].mutationApplied, true);
assert.deepEqual(governed.sites[0].normalUnit, [0, 1, 0]);
assert.equal(governed.sites[0].positiveGapCompanions.length, 2);
assert.deepEqual(
  governed.sites[0].positiveGapCompanions.map((row) => [
    row.sourceTypeCode,
    row.correctedTypeCode,
    row.typeAbbreviation,
    row.gap,
  ]),
  [['7', '8', 'LIM', 25], ['10', '9', 'GUI', 5]],
);

assert.throws(
  () => buildInputXmlFrictionSiteMap(syntheticXml, {
    restraintTypeMutationConfig: { enabled: false, rows: BM4L_MUTATION.rows },
  }),
  (error) => error?.code === 'INPUTXML_FRICTION_RESTRAINT_TYPE_MUTATION_CONFIG_REQUIRED',
);

const f26 = readJson('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-f26-restraint-semantic-reconciliation.json');
const baseline = readJson('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-l13-friction-diagnostic-baseline.json');
const fix1 = readJson('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-fix1-friction-source-domain-consumption.json');

assert.equal(f26.status, 'PASS_WITH_GAP_MAGNITUDE_SOURCE_SPLIT');
assert.equal(f26.frictionReconciliation.positiveFrictionRowCount, 26);
assert.equal(f26.directionReconciliation.positiveGapRows.length, 6);
assert.equal(f26.directionReconciliation.positiveGapRows.filter((row) => row.frictionNode).length, 5);
assert.equal(f26.gapCustody.accdbAllGapFieldsUnsetSentinel, true);

const present = baseline.l13DiagnosticCandidate.canonicalComparison;
assert.equal(present.passed, 1719);
assert.equal(present.failed, 195);
assert.equal(present.total, 1914);
assert.equal(present.passRatePercent, 89.81191222570533);
assert.deepEqual(fix1.accuracySideBySide.present.byQuantity, present.byQuantity);
assert.deepEqual(fix1.accuracySideBySide.revised.byQuantity, present.byQuantity);
assert.equal(fix1.accuracySideBySide.revised.passed, present.passed);
assert.equal(fix1.accuracySideBySide.revised.failed, present.failed);
assert.equal(fix1.accuracySideBySide.revised.total, present.total);
assert.equal(fix1.accuracySideBySide.revised.passRatePercent, present.passRatePercent);
assert.equal(fix1.accuracySideBySide.deltaPercentagePoints, 0);
assert.equal(fix1.implementation.productionNonlinearMechanicsChanged, false);
assert.equal(fix1.remainingBoundary.f27StillRequired, true);
assert.equal(fix1.remainingBoundary.l13QualifiedAccuracyAuthorized, false);

console.log('PASS M047 BM4_L Fix 1 source-domain-correct friction-site consumption');
console.log(`accuracy present=${present.passed}/${present.total} ${present.passRatePercent}%`);
console.log(`accuracy revised=${fix1.accuracySideBySide.revised.passed}/${fix1.accuracySideBySide.revised.total} ${fix1.accuracySideBySide.revised.passRatePercent}%`);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}
