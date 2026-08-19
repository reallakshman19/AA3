#!/usr/bin/env node

/**
 * Real-code check for the ACCDB panel's profile scoping, finding grouping,
 * and engineer field overrides, driven through the deterministic fixture in
 * accdb-to-canonical-geometry-fixture.mjs and a minimal DOM stub.
 *
 * Regression-guards the three defects this slice fixed:
 *   1. the panel read a profile-agnostic model-health record raw, so an
 *      approximation-profile request saw the strict profile's BLOCK severity
 *      on every declared-approximation finding;
 *   2. per-element findings were printed one line each, burying the findings
 *      that differ behind dozens that do not;
 *   3. an imported value the engineer knew to be wrong could not be corrected
 *      without editing the .ACCDB and re-importing.
 */
import assert from 'node:assert/strict';
import {
  ACCDB_OVERRIDABLE_FIELD_NAMES,
  applyAccdbFieldOverrides,
  requireAccdbFieldOverrideSet,
} from '../src/core/linear-piping-analysis-consumer/accdb-field-overrides.js';
import { parseAccdbModelHealthSource } from '../src/core/linear-piping-analysis-consumer/accdb-source-binding.js';
import { diagnoseInputXmlLinearModelHealth } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-model-health.js';
import { diagnoseInputXmlTopologyGraph } from '../src/core/geometry/model-health/topology-graph-diagnostics.js';
import {
  LFEA_PIPELINE_ACCDB_DEFAULT_PROFILE_ID,
  LFEA_PIPELINE_ACCDB_PROFILE_IDS,
  buildAccdbElementPropertyRows,
  buildAccdbModelHealthViewModel,
} from '../src/workspace/lfea-pipeline-accdb-view-model.js';
import { LfeaPipelineAccdbInputPanelController } from '../src/workspace/lfea-pipeline-accdb-input-panel.js';
import { buildAccdbFixtureTables } from './accdb-to-canonical-geometry-fixture.mjs';

const STRICT = 'STRICT_INPUTXML_LINEAR_STATIC_V1';
const APPROXIMATE = 'DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_V1';

const tables = buildAccdbFixtureTables();
const bundle = parseAccdbModelHealthSource(tables, { source: 'accdb-panel-check', fileName: 'FIXTURE.ACCDB' });
const modelHealth = diagnoseInputXmlLinearModelHealth(bundle, {});

// --- 1. Profile scoping -------------------------------------------------
const strictView = buildAccdbModelHealthViewModel(modelHealth, STRICT);
const approximateView = buildAccdbModelHealthViewModel(modelHealth, APPROXIMATE);

assert.equal(strictView.findingCount, modelHealth.findings.length, 'Scoping must not drop findings.');
assert.equal(approximateView.findingCount, modelHealth.findings.length, 'Scoping must not drop findings.');

// A declared-approximation finding (BEND component mechanics, and the same
// shape for PRESSURE1) is STRICT=BLOCK / APPROXIMATE=CONDITIONAL. The strict
// reading must stay an error; the approximate reading must not.
const relaxed = approximateView.findingGroups.flatMap((group) => group.occurrences)
  .filter((finding) => finding.scopedByProfile);
assert.ok(relaxed.length > 0, 'Expected at least one finding relaxed by the approximation profile.');
for (const finding of relaxed) {
  assert.equal(finding.authoritySeverity, 'error', 'A relaxed finding should have been an authority error.');
  assert.notEqual(finding.severity, 'error', 'A relaxed finding must not still read as blocking.');
}
assert.ok(
  approximateView.blockingCount < strictView.blockingCount,
  `The approximation profile must block on fewer findings (strict ${strictView.blockingCount}, approximate ${approximateView.blockingCount}).`,
);

// Capabilities belonging to the other profile family are NOT_APPLICABLE, not
// a failure of a request that never takes that path.
const strictCapabilityById = Object.fromEntries(strictView.capabilities.map((row) => [row.capabilityId, row]));
const approximateCapabilityById = Object.fromEntries(approximateView.capabilities.map((row) => [row.capabilityId, row]));
assert.equal(approximateCapabilityById.STRICT_LINEAR_STATIC.status, 'NOT_APPLICABLE');
assert.equal(approximateCapabilityById.SUSTAINED_CASE_STRICT.status, 'NOT_APPLICABLE');
assert.equal(strictCapabilityById.APPROXIMATE_LINEAR_STATIC.status, 'NOT_APPLICABLE');
assert.notEqual(approximateCapabilityById.APPROXIMATE_LINEAR_STATIC.status, 'NOT_APPLICABLE');
assert.equal(approximateCapabilityById.SOURCE_ACCEPTANCE.appliesToProfile, true, 'SOURCE_ACCEPTANCE applies to every profile.');

// Code stress is inventoried but never gates a solve here.
assert.equal(approximateCapabilityById.CODE_STRESS_INPUT_READINESS.gatesSolve, false);
assert.equal(approximateCapabilityById.STRICT_LINEAR_STATIC.gatesSolve, true);

// --- 2. Finding grouping ------------------------------------------------
const groupedTotal = approximateView.findingGroups.reduce((total, group) => total + group.count, 0);
assert.equal(groupedTotal, approximateView.findingCount, 'Every occurrence must survive grouping.');
const codes = approximateView.findingGroups.map((group) => group.code);
assert.equal(new Set(codes).size, codes.length, 'Each code must appear as exactly one group.');
assert.ok(
  approximateView.findingGroups.length <= approximateView.findingCount,
  'Grouping must not invent rows.',
);
for (const [index, group] of approximateView.findingGroups.slice(1).entries()) {
  const previous = approximateView.findingGroups[index];
  const rank = { info: 0, warning: 1, error: 2 };
  assert.ok(rank[previous.severity] >= rank[group.severity], 'Groups must be ordered worst-severity first.');
}

// --- 2b. Segregated finding sections ------------------------------------
const sectioned = approximateView.findingSections;
assert.ok(sectioned.length > 0, 'Findings must be sorted into sections.');
assert.equal(
  sectioned.reduce((total, section) => total + section.occurrenceCount, 0),
  approximateView.findingCount,
  'Every occurrence must land in exactly one section.',
);
assert.equal(
  sectioned.reduce((total, section) => total + section.groups.length, 0),
  approximateView.findingGroups.length,
  'Every group must land in exactly one section.',
);
assert.ok(sectioned.every((section) => section.groups.length > 0), 'Empty sections must not be rendered.');
assert.ok(
  sectioned.some((section) => section.sectionId === 'SOURCE'),
  'The fixture has source errors, so a source-integrity section must exist.',
);
assert.ok(
  sectioned.every((section) => typeof section.description === 'string' && section.description.length > 0),
  'Each section must say what its findings mean.',
);
assert.equal(
  sectioned.find((section) => section.sectionId === 'OTHER'),
  undefined,
  'Every category the fixture produces should be sorted, not left to the catch-all.',
);

// --- 3. Element property rows ------------------------------------------
const propertyRows = buildAccdbElementPropertyRows(bundle);
assert.equal(propertyRows.length, bundle.elementRecords.length);
assert.deepEqual(propertyRows[0].fields.map((field) => field.name), [...ACCDB_OVERRIDABLE_FIELD_NAMES]);
const element2Diameter = propertyRows.find((row) => row.accdbElementId === '2')
  .fields.find((field) => field.name === 'DIAMETER');
assert.ok(
  element2Diameter.disposition.includes('INHERITED'),
  `Element 2 declares no DIAMETER, so it must read as inherited, got ${element2Diameter.disposition}.`,
);

// --- 3b. Single-precision coordinate closure ---------------------------
// CAESAR stores ACCDB coordinates as float32, so a closure residual carries
// quantization proportional to the endpoints' distance from the origin. On
// the real BM4_L.ACCDB (coordinates to 735 m, one ulp = 0.0625 mm) a fixed
// 1e-6 m tolerance failed 45 of 96 elements on residuals no model could
// avoid. The binding declares the precision; the closure check allows for it.
assert.equal(bundle.coordinatePrecision, 'FLOAT32', 'The ACCDB binding must declare its coordinate precision.');
const farTables = buildAccdbFixtureTables();
const FAR = 700000; // mm, i.e. 700 m from the origin -- BM4_L's real extent.
farTables.INPUT_NODAL_COORDINATES.rows = farTables.INPUT_NODAL_COORDINATES.rows.map((row) => ({
  ...row,
  FROM_NODE_X: Math.fround(row.FROM_NODE_X + FAR),
  TO_NODE_X: Math.fround(row.TO_NODE_X + FAR),
}));
const farBundle = parseAccdbModelHealthSource(farTables, { source: 'accdb-panel-check-far', fileName: 'FIXTURE.ACCDB' });
const farClosure = diagnoseInputXmlTopologyGraph(farBundle, {});
assert.equal(farClosure.tolerances.sourceCoordinatePrecision, 'FLOAT32');
assert.ok(farClosure.tolerances.coordinateMagnitudeRelative > 0, 'A float32 source must carry a magnitude-proportional allowance.');
const farRow = farClosure.coordinateClosure.find((row) => row.coordinateMagnitude > 1000);
assert.ok(farRow, 'Expected a closure row far from the origin.');
assert.ok(
  farRow.acceptanceTolerance > 1e-4,
  `At 700 m the tolerance must cover float32 quantization, got ${farRow.acceptanceTolerance}.`,
);
// A source that states coordinates exactly gets no allowance at all: the
// check is unchanged for InputXML and StagedJSON.
const exactClosure = diagnoseInputXmlTopologyGraph({ ...bundle, coordinatePrecision: undefined }, {});
assert.equal(exactClosure.tolerances.coordinateMagnitudeRelative, 0);
assert.ok(
  exactClosure.coordinateClosure[0].acceptanceTolerance < 1e-5,
  'Without a declared precision the tolerance must stay as tight as before.',
);
assert.throws(
  () => diagnoseInputXmlTopologyGraph({ ...bundle, coordinatePrecision: 'FLOAT17' }, {}),
  TypeError,
  'An unknown coordinate precision must fail closed rather than defaulting.',
);

// --- 4. Overrides -------------------------------------------------------
const applied = applyAccdbFieldOverrides(tables, {
  approver: 'A. Engineer',
  reason: 'Line list supersedes the exported wall thickness.',
  overrides: [{ accdbElementId: '1', field: 'WALL_THICK', rawValue: 9.5 }],
});
assert.equal(applied.disclosures.length, 1);
assert.equal(applied.disclosures[0].code, 'ACCDB_FIELD_OVERRIDDEN_BY_ENGINEER');
assert.equal(applied.disclosures[0].data.originalRawValue, 6);
assert.equal(applied.disclosures[0].data.overrideRawValue, 9.5);
assert.equal(applied.disclosures[0].data.approver, 'A. Engineer');
assert.equal(tables.INPUT_BASIC_ELEMENT_DATA.rows[0].WALL_THICK, 6, 'The as-imported tables must not be mutated.');

// The override runs the real import again: the canonical SI value changes,
// and so does every element that inherited the overridden field.
const overriddenBundle = parseAccdbModelHealthSource(applied.tables, { source: 'accdb-panel-check-override', fileName: 'FIXTURE.ACCDB' });
const overriddenRows = buildAccdbElementPropertyRows(overriddenBundle);
const thicknessOf = (rows, elementId) => rows.find((row) => row.accdbElementId === elementId)
  .fields.find((field) => field.name === 'WALL_THICK').canonicalValue;
assert.ok(Math.abs(thicknessOf(overriddenRows, '1') - 0.0095) < 1e-9, `Expected 9.5 mm -> 0.0095 m, got ${thicknessOf(overriddenRows, '1')}`);
assert.ok(Math.abs(thicknessOf(overriddenRows, '2') - 0.0095) < 1e-9, 'An element inheriting the field must inherit the overridden value.');
assert.ok(Math.abs(thicknessOf(propertyRows, '1') - 0.006) < 1e-9, 'The un-overridden bundle must be unchanged.');

// Fail-closed validation: nothing here may be silently dropped or coerced.
const rejects = [
  [{ approver: '', reason: 'r', overrides: [{ accdbElementId: '1', field: 'DIAMETER', rawValue: 1 }] }, 'missing approver'],
  [{ approver: 'a', reason: '', overrides: [{ accdbElementId: '1', field: 'DIAMETER', rawValue: 1 }] }, 'missing reason'],
  [{ approver: 'a', reason: 'r', overrides: [] }, 'empty override list'],
  [{ approver: 'a', reason: 'r', overrides: [{ accdbElementId: '1', field: 'FROM_NODE', rawValue: 1 }] }, 'non-overridable field'],
  [{ approver: 'a', reason: 'r', overrides: [{ accdbElementId: '1', field: 'DIAMETER', rawValue: 'abc' }] }, 'non-finite number'],
  [{ approver: 'a', reason: 'r', overrides: [
    { accdbElementId: '1', field: 'DIAMETER', rawValue: 1 },
    { accdbElementId: '1', field: 'DIAMETER', rawValue: 2 },
  ] }, 'duplicate field'],
];
for (const [candidate, label] of rejects) {
  assert.throws(() => requireAccdbFieldOverrideSet(candidate), TypeError, `Expected ${label} to be rejected.`);
}
assert.throws(
  () => applyAccdbFieldOverrides(tables, { approver: 'a', reason: 'r', overrides: [{ accdbElementId: '999', field: 'DIAMETER', rawValue: 1 }] }),
  TypeError,
  'Expected an unknown element id to be rejected.',
);

// --- 5. Panel controller end to end ------------------------------------
const controller = new LfeaPipelineAccdbInputPanelController(createStubElement('div'), createStubDocument(), {
  readTables: async () => buildAccdbFixtureTables(),
}).init();
await controller.loadFile({ name: 'FIXTURE.ACCDB', arrayBuffer: async () => new ArrayBuffer(8) });

let snapshot = controller.getSnapshot();
assert.equal(snapshot.error, null, `Panel load failed: ${snapshot.error}`);
assert.equal(snapshot.elementCount, bundle.elementRecords.length);
assert.equal(snapshot.requestedProfileId, LFEA_PIPELINE_ACCDB_DEFAULT_PROFILE_ID);
assert.equal(snapshot.requestedProfileId, APPROXIMATE, 'The panel must default to the disclosed approximation profile.');
assert.equal(snapshot.scopedCapabilityStatusById.STRICT_LINEAR_STATIC, 'NOT_APPLICABLE');
const approximateBlocking = snapshot.scopedBlockingFindingCount;

controller.setRequestedProfile(STRICT);
snapshot = controller.getSnapshot();
assert.equal(snapshot.requestedProfileId, STRICT);
assert.equal(snapshot.scopedCapabilityStatusById.APPROXIMATE_LINEAR_STATIC, 'NOT_APPLICABLE');
assert.ok(snapshot.scopedBlockingFindingCount > approximateBlocking, 'Strict must block on more findings than the approximation profile.');
assert.throws(() => controller.setRequestedProfile('NOT_A_PROFILE'), TypeError);
controller.setRequestedProfile(APPROXIMATE);

// Overrides through the panel: a draft with no custody is refused, and the
// refusal leaves the imported values in place.
controller.setOverrideDraft('1', 'WALL_THICK', '9.5');
controller.applyOverrides();
snapshot = controller.getSnapshot();
assert.ok(snapshot.error, 'An override without an approver must be refused.');
assert.equal(snapshot.overrideCount, 0);

controller.overrideApprover = 'A. Engineer';
controller.overrideReason = 'Line list supersedes the export.';
controller.applyOverrides();
snapshot = controller.getSnapshot();
assert.equal(snapshot.error, null, `Override apply failed: ${snapshot.error}`);
assert.equal(snapshot.overrideCount, 1);
assert.equal(snapshot.overrideApprover, 'A. Engineer');
assert.ok(Math.abs(thicknessOf(controller.propertyRows, '1') - 0.0095) < 1e-9, 'The panel must re-extract from the overridden tables.');

controller.resetOverrides();
snapshot = controller.getSnapshot();
assert.equal(snapshot.overrideCount, 0);
assert.ok(Math.abs(thicknessOf(controller.propertyRows, '1') - 0.006) < 1e-9, 'Withdrawing overrides must restore the imported values.');

// The rendered DOM itself: the property table is built only when opened
// (96 elements x 14 fields is not something to build on every render), and
// the section carries the dataset attributes the e2e spec asserts on.
assert.equal(controller.elements.section.dataset.requestedProfile, APPROXIMATE);
assert.equal(controller.elements.section.dataset.overrideCount, '0');
assert.equal(findByRole(controller.elements.summaryRoot, 'lfea-pipeline-accdb-element-properties'), null,
  'The property table must not be built while it is collapsed.');

controller.togglePropertyTable();
const propertyTable = findByRole(controller.elements.summaryRoot, 'lfea-pipeline-accdb-element-properties');
assert.ok(propertyTable, 'Opening the property table must build it.');
const expectedRows = 1 + (controller.propertyRows.length * ACCDB_OVERRIDABLE_FIELD_NAMES.length);
assert.equal(propertyTable.children.length, expectedRows, 'One header row plus one row per element field.');
const overrideInputs = collectByRole(controller.elements.summaryRoot, 'accdb-override-input');
assert.equal(overrideInputs.length, controller.propertyRows.length * ACCDB_OVERRIDABLE_FIELD_NAMES.length,
  'Every inventoried field must be overridable from the table.');
assert.ok(findByRole(controller.elements.summaryRoot, 'accdb-override-approver'), 'Override custody requires an approver field.');
assert.ok(findByRole(controller.elements.summaryRoot, 'accdb-override-reason'), 'Override custody requires a reason field.');
assert.ok(findByRole(controller.elements.summaryRoot, 'accdb-override-scope-disclosure'), 'The override scope must be disclosed.');

const renderedSections = collectByRole(controller.elements.summaryRoot, 'lfea-pipeline-accdb-finding-section');
assert.equal(renderedSections.length, approximateView.findingSections.length,
  'One rendered section per non-empty finding section.');
const renderedGroupRows = collectByRole(controller.elements.summaryRoot, 'lfea-pipeline-accdb-finding-groups')
  .reduce((total, list) => total + list.children.length, 0);
assert.equal(renderedGroupRows, approximateView.findingGroups.length,
  'One rendered row per finding group, not per occurrence.');

controller.clear();
snapshot = controller.getSnapshot();
assert.equal(snapshot.elementCount, null);
assert.equal(snapshot.overrideCount, 0);

console.log(JSON.stringify({
  check: 'accdb-panel-view-model',
  status: 'PASS',
  profileIds: LFEA_PIPELINE_ACCDB_PROFILE_IDS.length,
  findingOccurrences: approximateView.findingCount,
  findingGroups: approximateView.findingGroups.length,
  strictBlocking: strictView.blockingCount,
  approximateBlocking: approximateView.blockingCount,
}));

function findByRole(node, role) {
  return collectByRole(node, role)[0] ?? null;
}

function collectByRole(node, role) {
  const found = [];
  for (const child of node.children ?? []) {
    if (child.dataset?.role === role) found.push(child);
    found.push(...collectByRole(child, role));
  }
  return found;
}

/** Minimal DOM stub: only what this panel actually touches. */
function createStubDocument() {
  return { createElement: (tagName) => createStubElement(tagName) };
}

function createStubElement(tagName) {
  const element = {
    tagName,
    dataset: {},
    children: [],
    listeners: new Map(),
    textContent: '',
    value: '',
    hidden: false,
    disabled: false,
    files: null,
    ownerDocument: null,
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = [...nodes]; },
    remove() {},
    click() {},
    setAttribute() {},
    addEventListener(type, handler) { this.listeners.set(type, handler); },
  };
  element.ownerDocument = { createElement: (name) => createStubElement(name) };
  return element;
}
