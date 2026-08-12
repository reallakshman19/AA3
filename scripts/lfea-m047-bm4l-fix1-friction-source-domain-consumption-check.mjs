import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildInputXmlFrictionSiteMap } from '../src/core/nonlinear-restraint-friction/inputxml-friction-site-map.js';
import { decodeBm4lAccdbRestraintType } from '../src/core/nonlinear-restraint-friction/caesar-restraint-code-authority.js';

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

// Direct ACCDB authority remains a separate namespace and must not inherit the
// corrected InputXML class labels merely because the BM4_L row sets crosswalk.
assert.equal(decodeBm4lAccdbRestraintType(1).abbreviation, 'ANC');
assert.equal(decodeBm4lAccdbRestraintType(3).abbreviation, 'Y');
assert.equal(decodeBm4lAccdbRestraintType(8).abbreviation, 'GUI');
assert.equal(decodeBm4lAccdbRestraintType(9).abbreviation, 'LIM');

const f26 = readJson('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-f26-restraint-semantic-reconciliation.json');
const baseline = readJson('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-l13-friction-diagnostic-baseline.json');
const fix1 = readJson('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-fix1-friction-source-domain-consumption.json');

assert.equal(f26.schema, 'm047-bm4l-f26-restraint-semantic-reconciliation/v2');
assert.equal(f26.status, 'PASS_DIRECT_ACCDB_LOOKUP_WITH_SOURCE_DOMAIN_CROSSWALK');
assert.equal(f26.directAccdbLookupAuthority.bm4lAndBm4NlLookupIdenticalForActiveIds, true);
assert.deepEqual(
  f26.directAccdbLookupAuthority.activeMappings.map((row) => [
    row.accdbResTypeId,
    row.accdbType,
    row.rowCount,
  ]),
  [[1, 'ANC', 1], [3, 'Y', 29], [8, 'GUI', 6], [9, 'LIM', 10]],
);
assert.equal(f26.rowSetCrosswalk.allNodeSetsExact, true);
assert.equal(f26.rowSetCrosswalk.allLabelsEquivalent, false);
assert.equal(f26.frictionReconciliation.positiveFrictionRowCount, 26);
assert.equal(f26.directionAndGapCrosswalk.positiveGapRows.length, 6);
assert.equal(
  f26.directionAndGapCrosswalk.positiveGapRows.filter((row) => row.frictionNode).length,
  5,
);
assert.equal(f26.gapCustody.accdbAllGapFieldsUnsetSentinel, true);
assert.equal(f26.withdrawnInference.status, 'WITHDRAWN');

assert.equal(fix1.schema, 'm047-bm4l-fix1-friction-source-domain-consumption/v2');
assert.equal(fix1.stackBase.head, 'b03e0c1d7277b6b9738303de33f70ac9982da9ba');
assert.equal(fix1.authority.f26Status, f26.status);
assert.equal(fix1.authority.numericNamespaceEqualityAssumed, false);
assert.equal(fix1.authority.classLabelEqualityAssumed, false);
assert.equal(fix1.authority.withdrawnAccdbInferenceStatus, 'WITHDRAWN');
assert.deepEqual(
  fix1.authority.directAccdbTypes.map((row) => [row.resTypeId, row.type, row.rowCount]),
  [[1, 'ANC', 1], [3, 'Y', 29], [8, 'GUI', 6], [9, 'LIM', 10]],
);
assert.equal(fix1.implementation.accdbTypeLabelsConsumedOrRenamedByThisFix, false);
assert.equal(fix1.implementation.productionNonlinearMechanicsChanged, false);

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

assert.equal(
  fix1.f27Boundary.retainedSourceAuditStatus,
  'BLOCKED_NO_NONLINEAR_STATE_HISTORY_IN_RETAINED_PACKAGE',
);
assert.equal(fix1.f27Boundary.retainedSourceAuditPr, 1075);
assert.equal(fix1.f27Boundary.l13QualifiedAccuracyAuthorized, false);
assert.equal(fix1.f27Boundary.productionNonlinearMechanicsAuthorized, false);

console.log('PASS M047 BM4_L Fix 1 source-domain-correct friction-site consumption');
console.log('ACCDB direct authority: 1=ANC, 3=Y, 8=GUI, 9=LIM');
console.log('InputXML governed correction: 17->14 +Y, 7->8 LIM, 10->9 GUI');
console.log(`accuracy present=${present.passed}/${present.total} ${present.passRatePercent}%`);
console.log(`accuracy revised=${fix1.accuracySideBySide.revised.passed}/${fix1.accuracySideBySide.revised.total} ${fix1.accuracySideBySide.revised.passRatePercent}%`);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}
