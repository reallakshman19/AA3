#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMP1_BENCHMARK_EVIDENCE_WORKSPACE_SCHEMA,
  projectEmp1BenchmarkEvidenceWorkspace,
} from '../src/workspace/emp1-benchmark-evidence-workspace.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspace = projectEmp1BenchmarkEvidenceWorkspace();

assert.equal(workspace.schema, EMP1_BENCHMARK_EVIDENCE_WORKSPACE_SCHEMA);
assert.ok(Object.isFrozen(workspace));
assert.equal(workspace.comparators.length, 2);
for (const value of Object.values(workspace.authorityBoundary)) {
  if (typeof value === 'boolean' && value !== workspace.authorityBoundary.presentationOnly) {
    assert.equal(value, false);
  }
}
assert.equal(workspace.authorityBoundary.presentationOnly, true);

const caux = workspace.comparators.find((entry) => entry.comparatorId === 'CAUX');
assert.ok(caux, 'CAUx benchmark evidence required');
assert.equal(caux.evidence.schema, 'emp1-benchmark-evidence/v1');
assert.equal(caux.evidence.comparator.id, 'CAUX');
assert.equal(caux.evidence.comparator.name, 'CAUx');
assert.equal(caux.evidence.comparator.version, '2017');
assert.equal(caux.evidence.comparison.state, 'COMPARISON_QUALIFIED');
assert.deepEqual(
  caux.evidence.comparison.quantities.map((quantity) => quantity.location),
  ['Au', 'Al', 'Bu', 'Bl', 'Cu', 'Cl', 'Du', 'Dl'],
);
assert.equal(caux.evidence.comparison.quantities.length, 8);
assert.ok(caux.evidence.comparison.quantities.every((quantity) => quantity.withinTolerance));
assert.ok(caux.evidence.comparison.quantities.every(
  (quantity) => quantity.tolerance.kind === 'RELATIVE_PERCENT' && quantity.tolerance.value === 3,
));

const byLocation = Object.fromEntries(
  caux.evidence.comparison.quantities.map((quantity) => [quantity.location, quantity]),
);
assert.equal(byLocation.Au.referenceValue, 511);
assert.equal(byLocation.Au.emp1Value, 511.04512083504795);
assert.equal(byLocation.Cu.referenceValue, 975);
assert.equal(byLocation.Cu.emp1Value, 994.8469658700849);
assert.equal(byLocation.Cu.relativeDifferencePercent, 2.0355862430856293);
assert.equal(byLocation.Du.referenceValue, 1754);
assert.equal(byLocation.Du.emp1Value, 1780.786740343134);
assert.equal(byLocation.Du.absoluteDifference, 26.786740343133943);

const summary = caux.evidence.comparison.summary;
assert.equal(summary.comparedQuantities, 8);
assert.equal(summary.withinToleranceCount, 8);
assert.equal(summary.worstRelativeDifferencePercent, 2.0355862430856293);
assert.equal(summary.worstRelativeDifferenceQuantityId, 'P29_SUS_STRESS_INTENSITY:Cu');
assert.equal(summary.worstAbsoluteDifference, 26.786740343133943);
assert.equal(summary.worstAbsoluteDifferenceQuantityId, 'P29_SUS_STRESS_INTENSITY:Du');
assert.equal(summary.governingReferenceLocation, 'Du');
assert.equal(summary.governingEmp1Location, 'Du');
assert.equal(summary.governingLocationAgreement, true);

assert.equal(caux.evidence.routeRelationship.registered, true);
assert.equal(caux.evidence.routeRelationship.comparisonQualificationAvailable, true);
assert.equal(caux.evidence.routeRelationship.engineeringUseAuthorized, false);
assert.equal(caux.evidence.routeRelationship.state, 'OUTSIDE_AUTHORIZED_ENGINEERING_ROUTE');
assert.equal(caux.currentRoute.registered, true);
assert.equal(caux.currentRoute.comparisonQualificationAvailable, true);
assert.equal(caux.currentRoute.engineeringUseAuthorized, false);
assert.equal(
  caux.currentRoute.routeId,
  'EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.INTERPOLATED_GAMMA.ZERO_DP',
);

assert.equal(caux.currentSourceQualification.directPdfPageReobservation, 'PASS');
assert.equal(caux.currentSourceQualification.directObservationRecordState, 'PASS');
assert.equal(caux.currentSourceQualification.sourceIdentityVerified, true);
assert.equal(caux.currentSourceQualification.sourceCustodyQualified, true);
assert.equal(caux.currentSourceQualification.gammaRadiusBasisForThisBenchmark, 'PASS_RECONCILED');
assert.equal(
  caux.currentSourceQualification.qualificationState,
  'PASS_FINAL_CAUX_SOURCE_QUALIFICATION_GAMMA_RADIUS_RECONCILED_REFERENCE_FREEZE_PRESERVED',
);
assert.equal(
  caux.currentSourceQualification.historicalComparisonObservationState,
  'NOT_RUN_EXECUTION_ENVIRONMENT',
  'comparison-time source observation must remain historical rather than being rewritten',
);
assert.equal(
  caux.evidence.limitations.includes('DIRECT_PDF_REOBSERVATION_PENDING'),
  false,
  'superseded historical pending-source limitation must not be projected as current',
);
assert.equal(caux.evidence.freezeEvidence.state, 'REFERENCE_FROZEN');
assert.equal(caux.evidence.freezeEvidence.expectedValuesFrozenBeforeEmpObservation, true);
assert.equal(caux.evidence.freezeEvidence.toleranceFrozenBeforeEmpObservation, true);
for (const value of Object.values(caux.evidence.authority)) assert.equal(value, false);
for (const [key, value] of Object.entries(caux.evidence.authorityBoundary)) {
  if (key === 'projectionOnly') assert.equal(value, true);
  else assert.equal(value, false);
}

const pvElite = workspace.comparators.find((entry) => entry.comparatorId === 'PV_ELITE');
assert.ok(pvElite, 'PV Elite benchmark slot required');
assert.equal(pvElite.evidence.comparator.id, 'PV_ELITE');
assert.equal(pvElite.evidence.comparison.state, 'REFERENCE_NOT_AVAILABLE');
assert.deepEqual(pvElite.evidence.comparison.quantities, []);
assert.equal(pvElite.evidence.comparison.summary, null);
assert.equal(pvElite.referenceProgramme.state, 'REFERENCE_NOT_AVAILABLE');
assert.equal(pvElite.referenceProgramme.sourceCustodyState, 'SOURCE_NOT_RETAINED');
assert.equal(pvElite.referenceProgramme.expectedValuesState, 'NOT_AVAILABLE');
assert.equal(pvElite.referenceProgramme.toleranceValue, null);
for (const value of Object.values(pvElite.evidence.authority)) assert.equal(value, false);

const workspaceSource = await read('src/workspace/emp1-benchmark-evidence-workspace.js');
const viewSource = await read('src/workspace/emp1-benchmark-view.js');
const workflowSource = await read('src/workspace/emp1-professional-workflow-view.js');
const analyticalSource = await read('src/workspace/lafea-analytical-calc-content.js');

for (const forbidden of [
  'calculateLocalAttachment',
  'runEmp1(',
  'planEmp1Wrc537GammaInterpolation',
  'semanticHash(',
]) {
  assert.equal(workspaceSource.includes(forbidden), false,
    `benchmark workspace must not contain ${forbidden}`);
}
assert.equal(viewSource.includes('../core/emp1/'), false,
  'benchmark DOM renderer must consume the workspace projection only');
assert.equal(viewSource.includes('Math.abs'), false,
  'benchmark DOM renderer must not reconstruct comparison magnitudes');
for (const forbidden of ['calculateLocalAttachment', 'runEmp1(', 'semanticHash(']) {
  assert.equal(viewSource.includes(forbidden), false,
    `benchmark DOM renderer must not contain ${forbidden}`);
}
assert.ok(viewSource.includes(
  'Independent reference evidence — not WRC method authority. Does not establish code compliance, production authorization, or release qualification.',
));
assert.ok(viewSource.includes("dataset.role = 'emp1-benchmark-evidence-panel'"));
assert.ok(viewSource.includes("dataset.role = 'emp1-benchmark-comparison-table'"));
assert.ok(viewSource.includes('PV Elite · Reference not available'));
assert.ok(viewSource.includes('CAUx 2017 · Comparison qualified · Engineering use not authorized'));
assert.ok(viewSource.includes('emp1PlainLanguageLabelRequired'));
assert.ok(viewSource.includes("details.dataset.emp1RawTechnical = 'true'"));
assert.equal(viewSource.includes('PV Elite · REFERENCE NOT AVAILABLE'), false);
assert.equal(viewSource.includes('CAUx 2017 · COMPARISON QUALIFIED · ENGINEERING USE NOT AUTHORIZED'), false);

assert.ok(workflowSource.includes('renderEmp1BenchmarkEvidencePanel'));
assert.ok(workflowSource.includes('const benchmarkEvidence = options.benchmarkEvidence ?? null'));
assert.ok(workflowSource.includes('renderEmp1BenchmarkEvidencePanel(root, benchmarkEvidence)'));
assert.ok(workflowSource.includes("scrollToRole(root, 'emp1-benchmark-evidence-panel')"));
assert.ok(analyticalSource.includes('projectEmp1BenchmarkEvidenceWorkspace'));
assert.ok(analyticalSource.includes('const benchmarkEvidence = projectEmp1BenchmarkEvidenceWorkspace()'));
assert.ok(analyticalSource.includes('benchmarkEvidence,'));
assert.ok(analyticalSource.includes('runFailure: options.emp1RunFailure'));
assert.ok(analyticalSource.includes('reviewWorkspace: engineeringReview'));
assert.ok(analyticalSource.includes('onReview: options.handlers.onEmp1EngineeringReview'));

const reviewWorkspaceSource = await read('src/workspace/emp1-engineering-review-workspace.js');
const reviewViewSource = await read('src/workspace/emp1-engineering-review-view.js');
assert.equal(reviewWorkspaceSource.includes('emp1-benchmark'), false,
  'benchmark UI must not be wired through engineering-review custody');
assert.equal(reviewViewSource.includes('emp1-benchmark'), false,
  'benchmark UI must remain a sibling of engineering review');

console.log(JSON.stringify({
  schema: 'emp1-benchmark-evidence-ui-check/v1',
  status: 'PASS_RETAINED_CAUX_AND_PENDING_PV_ELITE_PRESENTATION_CONTRACT',
  caux: {
    compared: summary.comparedQuantities,
    withinTolerance: summary.withinToleranceCount,
    worstRelativeDifferencePercent: summary.worstRelativeDifferencePercent,
    worstRelativeLocation: 'Cu',
    worstAbsoluteDifference_kPa: summary.worstAbsoluteDifference,
    worstAbsoluteLocation: 'Du',
    governingLocationAgreement: summary.governingLocationAgreement,
    currentSourceReobservation: caux.currentSourceQualification.directPdfPageReobservation,
    historicalComparisonSourceObservation:
      caux.currentSourceQualification.historicalComparisonObservationState,
    engineeringUseAuthorized: caux.evidence.routeRelationship.engineeringUseAuthorized,
  },
  pvElite: {
    state: pvElite.evidence.comparison.state,
    quantityCount: pvElite.evidence.comparison.quantities.length,
    toleranceValue: pvElite.referenceProgramme.toleranceValue,
  },
  uiAuthoredEngineeringHashes: false,
  uiExecutesWrc: false,
  authorityCreatedByBenchmarkEvidence: false,
}, null, 2));

async function read(path) {
  return readFile(resolve(root, path), 'utf8');
}
