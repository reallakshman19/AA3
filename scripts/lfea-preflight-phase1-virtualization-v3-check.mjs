#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ENGINEERING_FIELDS as PHASE0_ENGINEERING_FIELDS,
  buildEnrichmentUiFixture,
  componentTargetId,
} from './enrichment-ui-phase0-fixtures.mjs';
import {
  LFEA_PREFLIGHT_ENGINEERING_FIELDS,
  LFEA_PREFLIGHT_EXCEPTION_QUEUE,
  LFEA_PREFLIGHT_FIELD_STATUS,
} from '../src/workspace/lfea-preflight-phase1-schema.js';
import {
  LFEA_PREFLIGHT_PHASE1_SNAPSHOT_SCHEMA,
  buildLfeaPreflightPhase1Index,
  getLfeaPreflightPhase1LineOrdinal,
} from '../src/workspace/lfea-preflight-phase1-index.js';
import {
  buildLfeaPreflightPhase1ComponentIndex,
  getLfeaPreflightPhase1ComponentParentLineTargetId,
  getLfeaPreflightPhase1ComponentsForLine,
} from '../src/workspace/lfea-preflight-phase1-component-index.js';
import {
  createLfeaPreflightPhase1Viewport,
  expandLfeaPreflightPhase1Line,
  getLfeaPreflightPhase1ViewportModel,
  moveLfeaPreflightPhase1Selection,
  selectLfeaPreflightPhase1Cell,
  setLfeaPreflightPhase1ColumnPreset,
  setLfeaPreflightPhase1Filter,
  setLfeaPreflightPhase1Queue,
  setLfeaPreflightPhase1Scroll,
  setLfeaPreflightPhase1Sort,
} from '../src/workspace/lfea-preflight-phase1-viewport.js';

assert.deepEqual(LFEA_PREFLIGHT_ENGINEERING_FIELDS, PHASE0_ENGINEERING_FIELDS);

const smallFixture = buildEnrichmentUiFixture('small');
const smallLineIndex = buildLfeaPreflightPhase1Index(snapshotFromFixture(smallFixture));
const smallComponents = componentInputFromFixture(smallFixture);
const smallComponentIndex = buildLfeaPreflightPhase1ComponentIndex(smallLineIndex, smallComponents);
const reversedSmallComponentIndex = buildLfeaPreflightPhase1ComponentIndex(smallLineIndex, {
  targetIdByOrdinal: [...smallComponents.targetIdByOrdinal].reverse(),
  parentLineTargetIdByOrdinal: [...smallComponents.parentLineTargetIdByOrdinal].reverse(),
});
assert.equal(smallComponentIndex.structuralHash, reversedSmallComponentIndex.structuralHash);
const duplicate = {
  targetIdByOrdinal: [...smallComponents.targetIdByOrdinal],
  parentLineTargetIdByOrdinal: [...smallComponents.parentLineTargetIdByOrdinal],
};
duplicate.targetIdByOrdinal[1] = duplicate.targetIdByOrdinal[0];
assert.throws(
  () => buildLfeaPreflightPhase1ComponentIndex(smallLineIndex, duplicate),
  (error) => error?.code === 'E_P06_DUPLICATE_COMPONENT_TARGET_ID',
);
const firstLine = smallLineIndex.targetIds[0];
const firstComponents = getLfeaPreflightPhase1ComponentsForLine(
  smallComponentIndex,
  smallLineIndex,
  firstLine,
  0,
  4,
);
assert.equal(firstComponents.totalComponentCount, smallFixture.lines.componentCountByLineOrdinal[0]);
assert.equal(firstComponents.count, Math.min(4, firstComponents.totalComponentCount));
for (const targetId of firstComponents.targetIds) {
  assert.equal(
    getLfeaPreflightPhase1ComponentParentLineTargetId(smallComponentIndex, smallLineIndex, targetId),
    firstLine,
  );
}
console.log(`P06B3-01 PASS stable component identity/parent index ${smallComponentIndex.structuralHash}`);

const largeFixture = buildEnrichmentUiFixture('large');
const largeLineIndex = buildLfeaPreflightPhase1Index(snapshotFromFixture(largeFixture));
assert.equal(largeLineIndex.targetCount, 100_000);
assert.equal(largeLineIndex.queueCounts[LFEA_PREFLIGHT_EXCEPTION_QUEUE.MISSING], 2_000);
assert.equal(largeLineIndex.queueCounts[LFEA_PREFLIGHT_EXCEPTION_QUEUE.AMBIGUOUS], 11_000);
assert.equal(largeLineIndex.queueCounts[LFEA_PREFLIGHT_EXCEPTION_QUEUE.CONFLICTING], 3_000);
assert.equal(largeLineIndex.queueCounts[LFEA_PREFLIGHT_EXCEPTION_QUEUE.STALE], 1_000);
assert.equal(largeLineIndex.queueCounts[LFEA_PREFLIGHT_EXCEPTION_QUEUE.PROPOSED], 100_000);
const largeComponents = componentInputFromFixture(largeFixture);
const largeComponentIndex = buildLfeaPreflightPhase1ComponentIndex(largeLineIndex, largeComponents);
assert.equal(largeComponentIndex.componentCount, 1_000_000);
console.log(`P06B3-02 PASS 100k-line / 1m-component indexes ${largeComponentIndex.structuralHash}`);

const source = Object.freeze({
  blocked: false,
  structuralHash: `P06B3-${largeLineIndex.structuralHash}-${largeComponentIndex.structuralHash}`,
  targetCount: largeLineIndex.targetCount,
  componentCount: largeComponentIndex.componentCount,
  lineIndex: largeLineIndex,
  componentIndex: largeComponentIndex,
});
const viewport = createLfeaPreflightPhase1Viewport(source, {
  providers: syntheticProviders(largeLineIndex, largeComponentIndex),
  viewportHeight: 320,
  viewportWidth: 400,
  rowHeight: 32,
  rowOverscan: 2,
  columnWidth: 160,
  columnOverscan: 1,
  componentViewportRows: 8,
  presetId: 'REVIEW',
});
let model = getLfeaPreflightPhase1ViewportModel(viewport);
assert.equal(model.filteredRowCount, 100_000);
assert(model.liveLineRowCount <= model.rowDomUpperBound);
assert(model.visibleColumns.length <= model.columnDomUpperBound);
assert(model.liveEngineeringCellCount <= model.rowDomUpperBound * model.columnDomUpperBound);
assert(model.liveLineRowCount < 32);
console.log(`P06B3-03 PASS bounded initial viewport rows=${model.liveLineRowCount} columns=${model.visibleColumns.length}`);

const initialTarget = model.visibleRows[0].targetId;
setLfeaPreflightPhase1Scroll(viewport, { top: 2_000_000, left: 0 });
model = getLfeaPreflightPhase1ViewportModel(viewport);
assert(model.rowWindow.start > 50_000);
assert.notEqual(model.visibleRows[0].targetId, initialTarget);
assert(model.liveLineRowCount <= model.rowDomUpperBound);
console.log(`P06B3-04 PASS deep vertical virtualization start=${model.rowWindow.start}`);

setLfeaPreflightPhase1ColumnPreset(viewport, 'ALL_40');
setLfeaPreflightPhase1Scroll(viewport, { top: 2_000_000, left: 40 * 160 });
model = getLfeaPreflightPhase1ViewportModel(viewport);
assert(model.visibleColumnOrdinals.includes(39));
assert.equal(model.visibleColumns.find((column) => column.ordinal === 39)?.fieldId, 'weight.totalOperatingKgPerM');
assert(model.visibleColumns.length <= model.columnDomUpperBound);
console.log(`P06B3-05 PASS horizontal virtualization reaches engineering field 40 with ${model.visibleColumns.length} live columns`);

setLfeaPreflightPhase1Queue(viewport, 'MISSING');
model = getLfeaPreflightPhase1ViewportModel(viewport);
assert.equal(model.filteredRowCount, 2_000);
assert.equal(model.queueCounts.MISSING, 2_000);
assert(model.liveLineRowCount <= model.rowDomUpperBound);
console.log('P06B3-06 PASS Missing queue filters complete indexed state without DOM growth');

setLfeaPreflightPhase1Queue(viewport, null);
setLfeaPreflightPhase1Filter(viewport, {
  combine: 'AND',
  clauses: [
    { facetId: 'service', mode: 'OR', values: ['0', '1'] },
    { facetId: 'rating', mode: 'OR', values: ['0'] },
  ],
});
model = getLfeaPreflightPhase1ViewportModel(viewport);
const expectedFiltered = countFixtureRows(largeFixture, (ordinal) => [0, 1]
  .includes(largeFixture.lines.serviceIdByOrdinal[ordinal])
  && largeFixture.lines.ratingIdByOrdinal[ordinal] === 0);
assert.equal(model.filteredRowCount, expectedFiltered);
assert(model.liveLineRowCount <= model.rowDomUpperBound);
console.log(`P06B3-07 PASS OR-within / AND-between indexed facet filter count=${expectedFiltered}`);

setLfeaPreflightPhase1Filter(viewport, { combine: 'AND', clauses: [] });
setLfeaPreflightPhase1Sort(viewport, 'TARGET_ID_ASC');
setLfeaPreflightPhase1ColumnPreset(viewport, 'REVIEW');
setLfeaPreflightPhase1Scroll(viewport, { top: 0, left: 0 });
model = getLfeaPreflightPhase1ViewportModel(viewport);
const selectedTarget = model.visibleRows[3].targetId;
const selectedField = model.visibleColumnOrdinals[1];
selectLfeaPreflightPhase1Cell(viewport, selectedTarget, selectedField);
setLfeaPreflightPhase1Sort(viewport, 'LINE_KEY_ASC');
model = getLfeaPreflightPhase1ViewportModel(viewport);
assert.equal(model.selection.targetId, selectedTarget);
moveLfeaPreflightPhase1Selection(viewport, 25, 2);
model = getLfeaPreflightPhase1ViewportModel(viewport);
assert.notEqual(model.selection.targetId, selectedTarget);
assert.equal(model.selection.inViewport, true);
console.log('P06B3-08 PASS stable target/field selection survives sorting and viewport recycling');

const expandedTarget = model.selection.targetId;
const expandedLineOrdinal = getLfeaPreflightPhase1LineOrdinal(largeLineIndex, expandedTarget);
assert.notEqual(expandedLineOrdinal, null);
expandLfeaPreflightPhase1Line(viewport, expandedTarget);
model = getLfeaPreflightPhase1ViewportModel(viewport);
assert(model.componentViewport);
assert.equal(model.componentViewport.lineTargetId, expandedTarget);
assert.equal(
  model.componentViewport.totalComponentCount,
  largeFixture.lines.componentCountByLineOrdinal[expandedLineOrdinal],
);
assert(model.componentViewport.liveComponentRowCount <= 8);
assert(model.componentViewport.rows.every((row) => row.parentLineTargetId === expandedTarget));
console.log(`P06B3-09 PASS bounded component expansion rows=${model.componentViewport.liveComponentRowCount}`);

for (const path of [
  'src/workspace/lfea-preflight-phase1-component-index.js',
  'src/workspace/lfea-preflight-phase1-viewport.js',
]) {
  const sourceText = fs.readFileSync(path, 'utf8');
  assert.doesNotMatch(sourceText, /enrichment-ui-phase0/u);
  assert.doesNotMatch(sourceText, /Date\.now|Math\.random|randomUUID|localeCompare/u);
  assert.doesNotMatch(sourceText, /document\.|createElement|innerHTML|insertAdjacentHTML/u);
  assert.doesNotMatch(sourceText, /\.slice\(0,\s*500\)|\.slice\(0,\s*200\)/u);
}
console.log('P06B3-10 PASS production virtualization remains fixture-independent, DOM-independent and deterministic');

console.log(JSON.stringify({
  check: 'lfea-preflight-phase1-virtualization-v3',
  status: 'PASS',
  lineCount: largeLineIndex.targetCount,
  componentCount: largeComponentIndex.componentCount,
  rowDomUpperBound: model.rowDomUpperBound,
  columnDomUpperBound: model.columnDomUpperBound,
  componentViewportUpperBound: model.componentViewport.viewportRowUpperBound,
  reachesEngineeringFieldOrdinal: 39,
  stableComponentIndexHash: largeComponentIndex.structuralHash,
  queues: largeLineIndex.queueCounts,
}));

function snapshotFromFixture(fixture) {
  return {
    schema: LFEA_PREFLIGHT_PHASE1_SNAPSHOT_SCHEMA,
    datasetIdentity: fixture.semanticHash,
    lines: {
      targetIdByOrdinal: [...fixture.lines.targetIdByOrdinal],
      normalizedKeyByOrdinal: [...fixture.lines.normalizedLineKeyByOrdinal],
      serviceByOrdinal: fixture.lines.serviceIdByOrdinal,
      ratingByOrdinal: fixture.lines.ratingIdByOrdinal,
      classByOrdinal: fixture.lines.classIdByOrdinal,
      engineeringStatusByField: Object.fromEntries(PHASE0_ENGINEERING_FIELDS.map((fieldId) => [
        fieldId,
        fixture.lines.engineeringColumns[fieldId].statuses,
      ])),
    },
    components: {
      count: fixture.components.count,
      parentLineOrdinal: fixture.components.parentLineOrdinal,
    },
    deferredTargetIds: [],
  };
}

function componentInputFromFixture(fixture) {
  const count = fixture.components.count;
  const targetIdByOrdinal = new Array(count);
  const parentLineTargetIdByOrdinal = new Array(count);
  for (let ordinal = 0; ordinal < count; ordinal += 1) {
    targetIdByOrdinal[ordinal] = componentTargetId(fixture, ordinal);
    parentLineTargetIdByOrdinal[ordinal] = fixture.lines.targetIdByOrdinal[
      fixture.components.parentLineOrdinal[ordinal]
    ];
  }
  return { targetIdByOrdinal, parentLineTargetIdByOrdinal };
}

function syntheticProviders(lineIndex, componentIndex) {
  return Object.freeze({
    getLine(_source, targetId) {
      const ordinal = getLfeaPreflightPhase1LineOrdinal(lineIndex, targetId);
      if (ordinal === null) return null;
      return Object.freeze({
        targetId: String(targetId),
        fullLineKeyName: `QUAL-LINE-${String(targetId)}`,
        isolatedLineKeyToken: `K-${String(targetId)}`,
        service: `S-${ordinal % 12}`,
        rating: `R-${ordinal % 8}`,
        pipingClass: `C-${ordinal % 24}`,
        bore: 50 + (ordinal % 20),
        itemCount: 10,
        readiness: ordinal % 13 === 0 ? 'BLOCKED_MISSING' : 'PROPOSED_REVIEW',
        resolutionStatus: ordinal % 13 === 0 ? 'BLOCKED_MISSING' : 'EXACT',
      });
    },
    getCell(_source, targetId, fieldOrdinal) {
      if (getLfeaPreflightPhase1LineOrdinal(lineIndex, targetId) === null) return null;
      const fieldId = LFEA_PREFLIGHT_ENGINEERING_FIELDS[fieldOrdinal];
      const blocked = fieldOrdinal % 11 === 0;
      return Object.freeze({
        fieldId,
        fieldOrdinal,
        value: blocked ? null : `${String(targetId)}:${fieldOrdinal}`,
        status: blocked ? LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING : LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
        statusText: blocked ? 'BLOCKED_MISSING' : 'RESOLVED_EXACT',
        sourceKind: blocked ? 'UNRESOLVED' : 'QUALIFICATION_PROVIDER',
        sourceHash: blocked ? null : 'fnv1a64:00000000000006b3',
        locator: `/qualification/${encodeURIComponent(String(targetId))}/${fieldOrdinal}`,
        method: blocked ? 'NO_AUTHORITY' : 'INDEXED_LAZY_PROVIDER',
        candidateCount: blocked ? 0 : 1,
      });
    },
    getComponent(sourceValue, targetId) {
      const parentLineTargetId = getLfeaPreflightPhase1ComponentParentLineTargetId(
        componentIndex,
        sourceValue.lineIndex,
        targetId,
      );
      if (parentLineTargetId === null) return null;
      return Object.freeze({
        targetId: String(targetId),
        parentLineTargetId,
        sourceEntityId: String(targetId),
        name: `Component ${String(targetId)}`,
        type: 'QUALIFICATION_COMPONENT',
        bore: null,
        provenancePath: `/qualification/components/${encodeURIComponent(String(targetId))}`,
        sourceHash: 'fnv1a64:00000000000006b3',
      });
    },
  });
}

function countFixtureRows(fixture, predicate) {
  let count = 0;
  for (let ordinal = 0; ordinal < fixture.manifest.lineCount; ordinal += 1) {
    if (predicate(ordinal)) count += 1;
  }
  return count;
}
