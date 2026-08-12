import assert from 'node:assert/strict';
import fs from 'node:fs';

const p = JSON.parse(fs.readFileSync(
  new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-l13-friction-public-doc-state-history.json', import.meta.url),
  'utf8',
));

assert.equal(p.schema, 'm047-bm4l-l13-friction-public-doc-state-history-diagnostic/v1');
assert.equal(p.benchmarkId, 'BM4_L');
assert.equal(p.caseId, 'L13');
assert.equal(p.parent.baselineGovernedRows, 1914);
assert.equal(p.parent.baselinePassRatePercent, 89.81191222570533);
assert.equal(p.fixedMechanics.coefficientOfFriction, 0.3);
assert.equal(p.fixedMechanics.frictionStiffnessNPerM, 175126835.24647635);
assert.equal(p.fixedMechanics.responseFittingUsed, false);
assert.equal(p.publicDocumentationRulesAppliedLiterally.normalForceVariationThreshold, 0.15);
assert.equal(p.publicDocumentationRulesAppliedLiterally.slideMultiplier, 'UNRESOLVED_NOT_ASSIGNED_AS_CAESAR_AUTHORITY');

assert.equal(p.run150.maximumIterations, 150);
assert.equal(p.run150.converged, false);
assert.equal(p.run150.finalStickCount, 5);
assert.equal(p.run150.finalSlidingCount, 21);
assert.equal(p.run150.normalBasisUpdatesLast50, 261);
assert.equal(p.run150.directionUpdatesLast50, 1050);
assert.ok(p.run150.minimumMaxDofChangeLast50 > 1e-3);
assert.ok(p.run150.maximumMaxDofChangeLast50 > p.run150.minimumMaxDofChangeLast50);
assert.equal(p.run150.tailIterations.length, 10);

const byNode = new Map(p.run80SiteDiagnostics.map((row) => [row.node, row]));
assert.equal(byNode.get('21610').normalBasisUpdateCountThrough80, 79);
assert.equal(byNode.get('20170').normalBasisUpdateCountThrough80, 77);
assert.equal(byNode.get('20250').firstSlideIteration, 6);
assert.ok(byNode.get('20250').maximumSingleIterationDirectionChangeDeg > 179.99);
assert.deepEqual(p.observations.persistentNormalUpdateSites, ['20090','20170','20250','20350','21470','21610']);
assert.equal(p.observations.noAccuracyScorePublishedForRun150, true);

assert.equal(p.configurationCustody.caesarCfgPresentInArtifact, false);
assert.equal(p.configurationCustody.repositorySearchCaesarCfgFound, false);
assert.equal(p.configurationCustody.accdbStringScanFoundFrictionControlNames, false);
assert.equal(p.authorityAssessment.publicDocsSufficientForQualitativeLaw, true);
assert.equal(p.authorityAssessment.publicDocsSufficientForUniqueStableIterationAlgorithm, false);
assert.equal(p.authorityAssessment.numericSlideMultiplierResolved, false);
assert.equal(p.decision.l13QualifiedAccuracyAuthorized, false);
assert.equal(p.decision.l7ExecutionAuthorized, false);
assert.ok(p.prohibitions.includes('DO_NOT_SCORE_NONCONVERGED_ITERATE_AS_ACCURACY'));
assert.ok(p.prohibitions.includes('DO_NOT_ADD_RELAXATION_AND_CALL_IT_CAESAR_EQUIVALENT_WITHOUT_AUTHORITY'));

console.log('PASS M047 BM4_L L13 public-doc friction state-history diagnostic F2.2');
