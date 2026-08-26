#!/usr/bin/env node

import assert from 'node:assert/strict';
import { buildAccdbFixtureTables } from './accdb-to-canonical-geometry-fixture.mjs';
import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
} from '../src/core/linear-piping-analysis-consumer/inputxml-model-health-profile.js';
import {
  sealInputXmlProductionBendFactorAuthority,
} from '../src/core/linear-piping-analysis-consumer/inputxml-production-bend-factor-authority.js';
import {
  sealInputXmlProductionBranchFactorAuthority,
} from '../src/core/linear-piping-analysis-consumer/inputxml-production-branch-factor-authority.js';
import {
  buildLfeaErrorCheckPresentation,
} from '../src/workspace/lfea-diagnostics/lfea-error-check-presentation.js';
import {
  hasPlainLanguage,
} from '../src/workspace/lfea-finding-plain-language.js';
import {
  lfeaFindingSuggestedAction,
} from '../src/workspace/lfea-finding-suggested-action.js';
import {
  buildLfeaGeometryReview,
} from '../src/workspace/lfea-model-review/lfea-geometry-review.js';
import {
  createLinearPipingAccdbSession,
  prepareLinearPipingAccdbPreFlight,
} from '../src/workspace/linear-piping-accdb-intake.js';

const profileId = DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE;
const branchAuthority = sealInputXmlProductionBranchFactorAuthority({
  authorityId: 'S7-TEE-B31-3-2022-B31J-2017',
  editionProfileId: 'B31_3_2022_B31J_2017',
  sourceId: 'S7-GOVERNED-UI-CHECK',
  sourceRevision: '01',
});
const bendAuthority = sealInputXmlProductionBendFactorAuthority({
  authorityId: 'S7-BEND-B31-3-2022-B31J-2017',
  editionProfileId: 'B31_3_2022_B31J_2017',
  smooth90FlexibilityCorrection: false,
  sourceId: 'S7-GOVERNED-UI-CHECK',
  sourceRevision: '01',
});

const exactTee = prepare(cleanTeeFixture(3), 'S7_EXACT_TEE.ACCDB', {
  branchFactorAuthority: branchAuthority,
});
const exactTeePresentation = buildLfeaErrorCheckPresentation(exactTee, {
  sourceKind: 'ACCDB',
  sourceIdentityKey: 'ACCDB:S7_EXACT_TEE',
  fileName: 'S7_EXACT_TEE.ACCDB',
});
assert.equal(
  groupsByCode(exactTeePresentation, 'MODEL_TEE_EXACT_MECHANICS_UNAVAILABLE').length,
  0,
  'A source-qualified TYPE=3 welding tee must not retain the generic no-flexibility finding.',
);

const weldolet = prepare(cleanTeeFixture(5), 'S7_TYPE5_WELDOLET.ACCDB');
const weldoletPresentation = buildLfeaErrorCheckPresentation(weldolet, {
  sourceKind: 'ACCDB',
  sourceIdentityKey: 'ACCDB:S7_TYPE5_WELDOLET',
  fileName: 'S7_TYPE5_WELDOLET.ACCDB',
});
const weldoletGroups = groupsByCode(
  weldoletPresentation,
  'MODEL_TEE_EXACT_MECHANICS_UNAVAILABLE',
);
assert.equal(weldoletGroups.length, 1,
  'TYPE=5 remains outside S6 and must continue to disclose the tee approximation in Error Check.');
assert.equal(weldoletGroups[0].disposition, 'CONDITIONAL');
assert.ok(weldoletGroups[0].occurrences >= 1);

for (const code of [
  'MODEL_BEND_EXACT_MECHANICS_UNAVAILABLE',
  'MODEL_TEE_EXACT_MECHANICS_UNAVAILABLE',
]) {
  assert.equal(hasPlainLanguage(code), true,
    `${code} plain-language help must remain registered for unresolved sources.`);
  assert.equal(typeof lfeaFindingSuggestedAction(code), 'string',
    `${code} suggested action must remain registered for unresolved sources.`);
  assert.ok(lfeaFindingSuggestedAction(code).length > 0);
}

const bend = prepare(cleanBendFixture(), 'S7_EXACT_BEND.ACCDB', {
  bendFactorAuthority: bendAuthority,
});
const bendPresentation = buildLfeaErrorCheckPresentation(bend, {
  sourceKind: 'ACCDB',
  sourceIdentityKey: 'ACCDB:S7_EXACT_BEND',
  fileName: 'S7_EXACT_BEND.ACCDB',
});
assert.equal(
  groupsByCode(bendPresentation, 'MODEL_BEND_EXACT_MECHANICS_UNAVAILABLE').length,
  0,
  'A source-qualified exact bend must not retain the generic straight-chord finding.',
);

const engineeringState = Object.freeze({ source: Object.freeze({ kind: 'ACCDB' }), revision: 7 });
const sourceReview = buildLfeaGeometryReview(bend, engineeringState, 'SOURCE');
const analysisReview = buildLfeaGeometryReview(bend, engineeringState, 'ANALYSIS');
const sourceGeometry = sourceReview.representations.SOURCE;
const analysisGeometry = analysisReview.representations.ANALYSIS;
assert.equal(sourceReview.selectedRepresentation, 'SOURCE');
assert.equal(analysisReview.selectedRepresentation, 'ANALYSIS');
assert.equal(sourceReview.selected, sourceGeometry);
assert.equal(analysisReview.selected, analysisGeometry);
assert.equal(sourceGeometry.available, true);
assert.equal(analysisGeometry.available, true);
assert.equal(
  sourceGeometry.nodes.length,
  bend.diagnostics.sourceBundle.geometry.nodes.length,
  'SOURCE review must retain the imported/source-derived node count.',
);
assert.equal(
  sourceGeometry.segments.length,
  bend.diagnostics.sourceBundle.geometry.segments.length,
  'SOURCE review must retain the imported/source-derived segment count.',
);
assert.ok(
  analysisGeometry.nodes.length > sourceGeometry.nodes.length,
  'Bend retopology must be visible as additional ANALYSIS nodes without rewriting SOURCE geometry.',
);
assert.ok(
  analysisGeometry.segments.length > sourceGeometry.segments.length,
  'Bend retopology must be visible as additional ANALYSIS spans without rewriting SOURCE geometry.',
);
assert.deepEqual(
  sourceGeometry.segments.map((row) => row.segmentId),
  bend.diagnostics.sourceBundle.geometry.segments.map((row) => String(row.id)),
  'Selecting ANALYSIS must not replace or renumber the retained SOURCE segment identities.',
);

const evidence = bendPresentation.evidenceSummary;
assert.equal(
  evidence.sourceNodeCount,
  bend.diagnostics.summary.sourceNodeCount,
  'Error Check evidence must report the source node count, not silently substitute conditioned analysis nodes.',
);
assert.ok(
  analysisGeometry.nodes.length !== evidence.sourceNodeCount,
  'S7 must tolerate source and analysis node counts differing after bend promotion.',
);

console.log(JSON.stringify({
  check: 'lfea-s7-component-ui-disclosure',
  status: 'PASS',
  exactTeeApproximationGroups: 0,
  type5ApproximationOccurrences: weldoletGroups[0].occurrences,
  exactBendApproximationGroups: 0,
  sourceNodeCount: sourceGeometry.nodes.length,
  analysisNodeCount: analysisGeometry.nodes.length,
  sourceSegmentCount: sourceGeometry.segments.length,
  analysisSegmentCount: analysisGeometry.segments.length,
}));

function prepare(tables, fileName, options) {
  const session = createLinearPipingAccdbSession(tables, {
    fileName,
    requestedProfileId: profileId,
  });
  return prepareLinearPipingAccdbPreFlight(
    session.intake,
    session.sourceBundle,
    options === undefined ? {} : options,
  );
}

function groupsByCode(presentation, code) {
  return presentation.sections
    .flatMap((section) => section.groups)
    .filter((group) => group.code === code);
}

function cleanTeeFixture(sifType) {
  const tables = structuredClone(buildAccdbFixtureTables());
  const rows = tables.INPUT_BASIC_ELEMENT_DATA.rows.slice(0, 3).map((row) => ({
    ...row,
    BEND_PTR: 0,
    RIGID_PTR: 0,
    REDUCER_PTR: 0,
    EOFF_PTR: 0,
    FORCMNT_PTR: 0,
    PRESSURE1: 0,
    HYDRO_PRESSURE: 0,
  }));
  rows[0] = {
    ...rows[0], ELEMENTID: 1, FROM_NODE: 10, TO_NODE: 20,
    DELTA_X: 1000, DELTA_Y: 0, DELTA_Z: 0,
  };
  rows[1] = {
    ...rows[1], ELEMENTID: 2, FROM_NODE: 20, TO_NODE: 30,
    DELTA_X: 1000, DELTA_Y: 0, DELTA_Z: 0,
  };
  rows[2] = {
    ...rows[2], ELEMENTID: 3, FROM_NODE: 20, TO_NODE: 40,
    DELTA_X: 0, DELTA_Y: 1000, DELTA_Z: 0,
  };
  tables.INPUT_BASIC_ELEMENT_DATA.rows = rows;
  tables.INPUT_CONTROL.rows = [{ NUMELT: 3 }];
  tables.INPUT_NODAL_COORDINATES.rows = [
    coordinate(10, 20, [0, 0, 0], [1000, 0, 0]),
    coordinate(20, 30, [1000, 0, 0], [2000, 0, 0]),
    coordinate(20, 40, [1000, 0, 0], [1000, 1000, 0]),
  ];
  tables.INPUT_SIFTEES.rows = [{ NODE: 20, TYPE: sifType, SIF_IN: 1.5, SIF_OUT: 1.2 }];
  clearComponentTables(tables);
  tables.INPUT_RESTRAINTS.rows = tables.INPUT_RESTRAINTS.rows
    .filter((row) => Number(row.NODE_NUM) === 10);
  return tables;
}

function cleanBendFixture() {
  const tables = structuredClone(buildAccdbFixtureTables());
  tables.INPUT_BASIC_ELEMENT_DATA.rows = tables.INPUT_BASIC_ELEMENT_DATA.rows.slice(0, 2);
  tables.INPUT_CONTROL.rows = [{ NUMELT: 2 }];
  tables.INPUT_NODAL_COORDINATES.rows = tables.INPUT_NODAL_COORDINATES.rows.slice(0, 2);
  tables.INPUT_RIGIDS.rows = [];
  tables.INPUT_REDUCERS.rows = [];
  tables.INPUT_OFFSETS.rows = [];
  tables.INPUT_SIFTEES.rows = [];
  tables.INPUT_FORCMNT.rows = [];
  tables.INPUT_RESTRAINTS.rows = tables.INPUT_RESTRAINTS.rows
    .filter((row) => Number(row.NODE_NUM) === 10);
  return tables;
}

function clearComponentTables(tables) {
  tables.INPUT_BENDS.rows = [];
  tables.INPUT_RIGIDS.rows = [];
  tables.INPUT_REDUCERS.rows = [];
  tables.INPUT_OFFSETS.rows = [];
  tables.INPUT_FORCMNT.rows = [];
}

function coordinate(fromNode, toNode, from, to) {
  return {
    FROM_NODE: fromNode,
    TO_NODE: toNode,
    FROM_NODE_X: from[0],
    FROM_NODE_Y: from[1],
    FROM_NODE_Z: from[2],
    TO_NODE_X: to[0],
    TO_NODE_Y: to[1],
    TO_NODE_Z: to[2],
  };
}
