#!/usr/bin/env node
import assert from 'node:assert/strict';
import { sourceFixture } from './lafea.1-fixtures.mjs';
import { triangleSource } from './lafea.3-fixtures.mjs';
import {
  LAFEA_ANALYSIS_SETTINGS_VIEW_SCHEMA,
  buildLafeaAnalysisSettingsViewModel,
} from '../src/workspace/lafea-analysis-settings-view.js';

const analyticalDocument = sourceFixture();
const analytical = buildLafeaAnalysisSettingsViewModel(stage(
  'LAFEA.1',
  analyticalDocument,
  'ANALYTICAL_FOUNDATION_V1',
));
assert.equal(analytical.schema, LAFEA_ANALYSIS_SETTINGS_VIEW_SCHEMA);
assert.equal(analytical.readOnly, false);
assert.equal(analytical.sourcePresent, true);
assert.equal(value(analytical, 'Lifecycle profile'), 'ANALYTICAL_FOUNDATION_V1');
assert.equal(value(analytical, 'Lifecycle source binding'), 'CURRENT');
assert.equal(value(analytical, 'Model identity'), analyticalDocument.modelIdentity);
assert.equal(value(analytical, 'Qualification profile'), analyticalDocument.qualificationProfile.identity);
assert.equal(value(analytical, 'Thickness policy'), analyticalDocument.thicknessBasis.policy);
assert.match(value(analytical, 'Requested analyses / cases'), /LOAD_TRANSFER/u);
assert.match(value(analytical, 'Unit basis'), /length: mm/u);
assert.equal(hasRow(analytical, 'Code / allowable basis'), false);
assert.ok(analytical.qualificationDetails.length > 0);

const continuumDocument = triangleSource();
const continuum = buildLafeaAnalysisSettingsViewModel(stage(
  'LAFEA.3',
  continuumDocument,
  'FEA_MESH_RECOVERY_V1',
));
assert.equal(value(continuum, 'Formulation'), 'Plane stress');
assert.equal(continuum.formulationControl.current, continuumDocument.formulation);
assert.equal(continuum.formulationControl.sourcePresent, true);
assert.match(value(continuum, 'Requested analyses / cases'), /L1/u);
assert.match(value(continuum, 'Unit basis'), /stress: MPa/u);
assert.equal(hasRow(continuum, 'Code / allowable basis'), false);

const empty = buildLafeaAnalysisSettingsViewModel({
  stageId: 'LAFEA.3',
  document: null,
});
assert.equal(empty.sourcePresent, false);
assert.deepEqual(empty.modelRows, []);
assert.deepEqual(empty.solverRows, []);
assert.deepEqual(empty.solverSummaryRows, []);
assert.equal(empty.formulationControl.current, null);
assert.equal(empty.formulationControl.sourcePresent, false);
assert.equal(empty.formulationControl.editable, false);
assert.equal(empty.formulationControl.status, 'SOURCE_REQUIRED');
assert.match(empty.formulationControl.message, /Load a governed LAFEA\.3 source model/u);
assert.equal(empty.recoveryDisclosure, null);

const incompleteSource = buildLafeaAnalysisSettingsViewModel({
  stageId: 'LAFEA.3',
  document: { materials: [], loadCases: [] },
});
assert.equal(incompleteSource.sourcePresent, true);
assert.equal(incompleteSource.formulationControl.current, null);
assert.equal(incompleteSource.formulationControl.editable, true);
assert.equal(incompleteSource.formulationControl.status, 'SOURCE_FORMULATION_REQUIRED');
assert.match(incompleteSource.formulationControl.message, /does not declare a continuum formulation/u);
assert.equal(hasRow(incompleteSource, 'Formulation'), false);

const serialized = JSON.stringify({
  modelRows: empty.modelRows,
  solverRows: empty.solverRows,
  solverSummaryRows: empty.solverSummaryRows,
});
assert.doesNotMatch(serialized, /Provided by workbench registry/u);
assert.doesNotMatch(serialized, /Not initialized/u);
assert.doesNotMatch(serialized, /Not declared/u);

console.log(JSON.stringify({
  check: 'lafea-ui-analysis-settings',
  status: 'PASS',
  sourceSettingsEditable: true,
  governedSolverSettingsLocked: true,
  humanReadableFormulationProjection: true,
  governedFormulationIdentityPreserved: true,
  missingOptionalMetadataOmitted: true,
  sourceAbsentDoesNotImplyPlaneStress: true,
  githubActionsWorkflowAdded: false,
}));

function stage(stageId, document, profileId) {
  return {
    stageId,
    document,
    lifecycle: profileId ? { profileId } : null,
    lifecycleBinding: profileId ? { status: 'CURRENT' } : null,
  };
}
function value(model, label) {
  return model.rows.find((row) => row.label === label)?.value;
}
function hasRow(model, label) {
  return model.rows.some((row) => row.label === label);
}
