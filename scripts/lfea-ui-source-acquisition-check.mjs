#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LFEA_SOURCE_ACQUISITION_SCHEMA,
  buildLfeaSourceAcquisitionModel,
} from '../src/workspace/lfea-source-acquisition.js';
import { createLfeaEngineeringSession } from '../src/workspace/lfea-session/lfea-engineering-session.js';

const none = buildLfeaSourceAcquisitionModel(null);
assert.equal(none.schema, LFEA_SOURCE_ACQUISITION_SCHEMA);
assert.equal(none.active, false);
assert.equal(none.sourceKind, 'NONE');
assert.equal(none.rows.length, 0);

const inputXml = buildLfeaSourceAcquisitionModel({
  source: {
    kind: 'INPUTXML', fileName: 'native.xml', preparationOwner: 'INPUTXML',
    identityKey: 'sha-native', providerIdentityKey: 'sha-native', provenance: {},
  },
});
assert.equal(inputXml.sourceKind, 'INPUTXML');
assert.equal(inputXml.rows.find((row) => row.label === 'Original source').value, 'native.xml');
assert.match(inputXml.rows.find((row) => row.label === 'Preparation provider').value, /native source/u);

const staged = buildLfeaSourceAcquisitionModel({
  source: {
    kind: 'STAGED_JSON',
    fileName: 'plant.sjson',
    preparationOwner: 'INPUTXML',
    identityKey: 'STAGED_JSON:plant.sjson',
    providerIdentityKey: 'sha-derived-inputxml',
    provenance: {
      derivedInputXmlFileName: 'plant.input.xml',
      diagnosticsSummary: { warning: 2 },
    },
  },
});
assert.equal(staged.sourceKind, 'STAGED_JSON');
assert.equal(staged.fileName, 'plant.sjson');
assert.equal(staged.derivedInputXmlFileName, 'plant.input.xml');
assert.equal(staged.preparationOwner, 'INPUTXML');
assert.equal(staged.rows.find((row) => row.label === 'Original source').value, 'plant.sjson');
assert.equal(staged.rows.find((row) => row.label === 'Derived preparation artifact').value, 'plant.input.xml');
assert.equal(staged.rows.find((row) => row.label === 'Conversion warnings').value, '2');
assert.notEqual(staged.fileName, staged.derivedInputXmlFileName,
  'Derived InputXML must not replace the original StagedJSON source identity.');

const accdb = buildLfeaSourceAcquisitionModel({
  source: {
    kind: 'ACCDB', fileName: 'model.accdb', preparationOwner: 'ACCDB',
    identityKey: 'accdb-hash', providerIdentityKey: 'accdb-hash', provenance: { overrideCount: 3 },
  },
});
assert.equal(accdb.rows.find((row) => row.label === 'Engineer overrides').value, '3');

// Independent state falsifier: display projection is read-only, while real
// source replacement still invalidates the result through UI01 session rules.
const session = createLfeaEngineeringSession();
const preFlightA = {
  semanticHash: 'PF-A',
  authorization: { semanticHash: 'AUTH-A' },
  preparation: { requestedCaseIds: ['W'] },
};
session.setSource({
  kind: 'INPUTXML', identityKey: 'A', providerIdentityKey: 'A',
  preparationOwner: 'INPUTXML', fileName: 'A.xml', preFlight: preFlightA, requestedCaseIds: ['W'],
});
session.bindAnalysisResult({ caseId: 'W' });
const revisionBeforeProjection = session.getState().revision;
buildLfeaSourceAcquisitionModel(session.getState());
assert.equal(session.getState().revision, revisionBeforeProjection,
  'Display-only source projection must not mutate or invalidate the engineering session.');

session.setSource({
  kind: 'ACCDB', identityKey: 'B', providerIdentityKey: 'B',
  preparationOwner: 'ACCDB', fileName: 'B.accdb',
  preFlight: {
    semanticHash: 'PF-B', authorization: { semanticHash: 'AUTH-B' },
    preparation: { requestedCaseIds: ['W'] },
  },
  requestedCaseIds: ['W'],
});
assert.equal(session.getState().source.kind, 'ACCDB');
assert.equal(session.getState().analysis.result, null,
  'Replacing the source must invalidate the previously displayed analysis.');
session.clearSource('ACCDB');
assert.equal(buildLfeaSourceAcquisitionModel(session.getState()).sourceKind, 'NONE');

const controllerSource = fs.readFileSync('src/workspace/lfea-pipeline-shell-controller.js', 'utf8');
const acquisitionSource = fs.readFileSync('src/workspace/lfea-source-acquisition.js', 'utf8');
const acquisitionCss = fs.readFileSync('src/workspace/lfea-source-acquisition.css', 'utf8');

assert.match(controllerSource, /getLfeaEngineeringSessionState/u,
  'Shell must resolve actual source representation from the read-only engineering session.');
assert.match(controllerSource, /buildLfeaSourceAcquisitionModel/u);
assert.doesNotMatch(acquisitionSource, /solveAuthorized|runLfea|prepareInputXml|diagnoseInputXml/u,
  'Source acquisition must not own engineering preparation/solve authority.');
assert.match(acquisitionSource, /linear-piping-inputxml-source-file/u);
assert.match(acquisitionSource, /lfea-pipeline-stagedjson-source-file/u);
assert.match(acquisitionSource, /lfea-pipeline-accdb-source-file/u);
assert.match(acquisitionSource, /clear-lfea-pipeline-stagedjson-source/u);
assert.match(acquisitionSource, /derived preparation artifact/iu);

assert.match(acquisitionCss, /data-active-source="NONE"/u);
assert.match(acquisitionCss, /data-active-source="STAGED_JSON"/u);
assert.match(acquisitionCss, /data-active-step="ERROR_CHECK"[\s\S]*lfea-source-acquisition-actions/u);
assert.match(acquisitionCss, /linear-piping-inputxml-source-summary/u);

console.log(JSON.stringify({
  check: 'lfea-ui-source-acquisition',
  status: 'PASS',
  explicitChooser: true,
  oneActiveSourceProjection: true,
  stagedJsonOriginalRetained: true,
  derivedInputXmlDisclosed: true,
  displayProjectionMutatesSession: false,
  sourceReplacementInvalidatesResult: true,
}));
