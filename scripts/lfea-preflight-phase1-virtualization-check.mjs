#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ENGINEERING_FIELDS as PHASE0_ENGINEERING_FIELDS,
  buildEnrichmentUiFixture,
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
assert.equal(smallComponentIndex.structuralHash, reversedSmallComponentIndex.structuralHash,
  'Stable component index must be invariant to source component order.');
const duplicateComponents = {
  targetIdByOrdinal: [...smallComponents.targetIdByOrdinal],
  parentLineTargetIdByOrdinal: [...smallComponents.parentLineTargetIdByOrdinal],
};
duplicateComponents.targetIdByOrdinal[1] = duplicateComponents.targetIdByOrdinal[0];
assert.throws(
  () => buildLfeaPreflightPhase1ComponentIndex(smallLineIndex, duplicateComponents),
  (error) => error?.code === 'E_P06_DUPLICATE_COMPONENT_TARGET_ID',
);
const firstSmallLine = smallLineIndex.targetIds[0];
const firstSmallComponents = getLfeaPreflightPhase1ComponentsForLine(
  smallComponentIndex,
  smallLineIndex,
  firstSmallLine,
  0,
  4,
);
assert.equal(firstSmallComponents.totalComponentCount, 10);
assert.equal(firstSmallComponents.count, 4);
console.log(`P06B-01 PASS stable component index ${smallComponentIndex.structuralHash}`);

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
largeComponents.targetIdByOrdinal.length = 0;
largeComponents.parentLineTargetIdByOrdinal.length = 0;
console.log(`P06B-02 PASS 100k-line / 1m-component stable indexes ${largeComponentIndex.structuralHash}`);

const syntheticSource = Object.freeze({
  blocked: false,
  structuralHash: `P06B-${largeLineIndex.structuralHash}-${largeComponentIndex.structuralHash}`,
  targetCount: largeLineIndex.targetCount,
  componentCount: largeComponentIndex.componentCount,
  lineIndex: largeLineIndex,
  componentIndex: largeComponentIndex,
});
const providers = syntheticProviders(largeLineIndex);
const viewport = createLfeaPreflightPhase1Viewport(syntheticSource, {
  providers,
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
assert(model.liveLineRowCount < 32, 'Live line DOM must remain viewport-bounded, not dataset-sized.');
console.log(`P06B-03 PASS initial viewport bounds rows=${model.liveLineRowCount}/${model.rowDomUpperBound} columns=${model.visibleColumns.length}/${model.columnDomUpperBound}`);

const initialTarget = model.visibleRows[0].targetId;
setLfeaPreflightPhase1Scroll(viewport, { top: 2_000_000, left: 0 });
model = getLfeaPreflightPhase1ViewportModel(viewport);
assert(model.rowWindow.start > 50_000);
assert.notEqual(model.visibleRows[0].targetId, initialTarget);
assert(model.liveLineRowCount <= model.rowDomUpperBound);
console.log(`P06B-04 PASS deep vertical virtualization start=${model.rowWindow.start}`);

setLfeaPreflightPhase1ColumnPreset(viewport, 'ALL_40');
setLfeaPreflightPhase1Scroll(viewport, { top: 2_000_000, left: 40 * 160 });
model = getLfeaPreflightPhase1ViewportModel(viewport);
assert(model.visibleColumnOrdinals.includes(39), 'Horizontal virtualization must reach the 40th engineering field.');
assert(model.visibleColumns.length <= model.columnDomUpperBound);
assert.equal(model.visibleColumns.find((column) => column.ordinal === 39)?.fieldId, 'weight.totalOperatingKgPerM');
console.log(`P06B-05 PASS horizontal virtualization reaches field ordinal 39 with ${model.visibleColumns.length} live engineering columns`);

setLfeaPreflightPhase1Queue(viewport, 'MISSING');
model = getLfeaPreflightPhase1ViewportModel(viewport);
assert.equal(model.filteredRowCount, 2_000);
assert.equal(model.queueCounts.MISSING, 2_000);
assert(model.liveLineRowCount <= model.rowDomUpperBound);
assert.equal(model.facetCounts.service && typeof model.facetCounts.service === 'object', true);
console.log('P06B-06 PASS first-class Missing queue filters indexed 100k-line state without growing live rows');

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
console.log(`P06B-07 PASS explicit OR-within / AND-between viewport filter count=${expectedFiltered}`);

setLfeaPreflightPhase1Filter(viewport, { combine: 'AND', clauses: [] });
setLfeaPreflightPhase1Sort(viewport, 'TARGET_ID_ASC');
setLfeaPreflightPhase1ColumnPreset(viewport, 'REVIEW');
setLfeaPreflightPhase1Scroll(viewport, { top: 0, left: 0 });
model = getLfeaPreflightPhase1ViewportModel(viewport);
const selectedTarget = model.visibleRows[3].targetId;
const selectedField = model.visibleColumnOrdinals[1];
selectLfeaPreflightPhase1Cell(viewport, selectedTarget, selectedField);
model = getLfeaPreflightPhase1ViewportModel(viewport);
assert.equal(model.selection.targetId, selectedTarget);
assert.equal(model.selection.fieldOrdinal, selectedField);
assert.equal(model.selection.inViewport, true);
setLfeaPreflightPhase1Sort(viewport, 'LINE_KEY_ASC');
model = getLfeaPreflightPhase1ViewportModel(viewport);
assert.equal(model.selection.targetId, selectedTarget, 'Selection must remain stable by target ID across sort/reorder.');
moveLfeaPreflightPhase1Selection(viewport, 25, 2);
model = getLfeaPreflightPhase1ViewportModel(viewport);
assert.notEqual(model.selection.targetId, selectedTarget);
assert.equal(model.selection.inViewport, true, 'Keyboard-style movement must scroll the selected stable cell into the bounded viewport.');
console.log('P06B-08 PASS stable target/field selection survives sort and keyboard-style movement');

const expandedTarget = model.selection.targetId;
expandLfeaPreflightPhase1Line(viewport, expandedTarget);
model = getLfeaPreflightPhase1ViewportModel(viewport);
assert(model.componentViewport);
assert.equal(model.componentViewport.lineTargetId, expandedTarget);
assert.equal(model.componentViewport.totalComponentCount, 10);
assert.equal(model.componentViewport.liveComponentRowCount, 8);
assert(model.componentViewport.liveComponentRowCount <= model.componentViewport.viewportRowUpperBound);
assert(model.componentViewport.rows.every((row) => row.parentLineTargetId === expandedTarget));
console.log('P06B-09 PASS descendant components remain indexed and are materialized only for the expanded bounded component viewport');

const viewportSource = fs.readFileSync('src/workspace/lfea-preflight-phase1-viewport.js', 'utf8');
const componentIndexSource = fs.readFileSync('src/workspace/lfea-preflight-phase1-component-index.js', 'utf8');
for (const source of [viewportSource, componentIndexSource]) {
  assert.doesNotMatch(source, /enrichment-ui-phase0/u);
  assert.doesNotMatch(source, /Date\.now|Math\.random|randomUUID|localeCompare/u);
  assert.doesNotMatch(source, /document\.|createElement|innerHTML|insertAdjacentHTML/u);
}
assert.doesNotMatch(viewportSource, /\.slice\(0,\s*500\)|\.slice\(0,\s*200\)/u);
console.log('P06B-10 PASS production virtualization core is fixture-independent, DOM-independent, deterministic, and contains no legacy 500/200 cap');

console.log(JSON.stringify({
  check: 'lfea-preflight-phase1-virtualization',
  status: 'PASS',
  lineCount: largeLineIndex.targetCount,
  componentCount: largeComponentIndex.componentCount,
  liveLineRowUpperBound: model.rowDomUpperBound,
  liveColumnUpperBound: model.columnDomUpperBound,
  liveComponentRowUpperBound: model.componentViewport.viewportRowUpperBound,
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
    const sourceBase = fixture.components.targetBaseByOrdinal[ordinal];
    const typeId = fixture.components.componentTypeIdByOrdinal[ordinal];
    targetIdByOrdinal[ordinal] = `CMP-${sourceBase.toString(36).toUpperCase()}-T${typeId}`;
    parentLineTargetIdByOrdinal[ordinal] = fixture.lines.targetIdByOrdinal[
      fixture.components.parentLineOrdinal[ordinal]
    ];
  }
  return { targetIdByOrdinal, parentLineTargetIdByOrdinal };
}

function syntheticProviders(lineIndex) {
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
        sourceHash: blocked ? null : 'fnv1a64:p06b-provider',
        locator: `/qualification/${encodeURIComponent(String(targetId))}/${fieldOrdinal}`,
        method: blocked ? 'NO_AUTHORITY' : 'INDEXED_LAZY_PROVIDER',
        candidateCount: blocked ? 0 : 1,
      });
    },
    getComponent(source, targetId) {
      const viewport = getLfeaPreflightPhase1ComponentsForLine;
      void viewport;
      const text = String(targetId);
      const match = /^CMP-([A-Z0-9]+)-T(\d+)$/u.exec(text);
      if (!match) return null;
      const componentOrdinalBase = Number.parseInt(match[1], 36);
      const parentLineOrdinal = Math.floor((componentOrdinalBase - 0x50000000) / 10);
      const parentLineTargetId = source.lineIndex.targetIds[parentLineOrdinal] ?? null;
      if (parentLineTargetId === null) return null;
      return Object.freeze({
        targetId: text,
        parentLineTargetId,
        sourceEntityId: text,
        name: `Component ${text}`,
        type: `TYPE-${match[2]}`,
        bore: 50 + (componentOrdinalBase % 20),
        provenancePath: `/qualification/components/${text}`,
        sourceHash: 'fnv1a64:p06b-component',
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
