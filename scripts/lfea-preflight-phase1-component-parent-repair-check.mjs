#!/usr/bin/env node

import assert from 'node:assert/strict';
import { buildEnrichmentUiFixture } from './enrichment-ui-phase0-fixtures.mjs';
import {
  LFEA_PREFLIGHT_PHASE1_SNAPSHOT_SCHEMA,
  buildLfeaPreflightPhase1Index,
} from '../src/workspace/lfea-preflight-phase1-index.js';
import {
  buildLfeaPreflightPhase1ComponentIndex,
  getLfeaPreflightPhase1ComponentParentLineTargetId,
  getLfeaPreflightPhase1ComponentsForLine,
} from '../src/workspace/lfea-preflight-phase1-component-index.js';

for (const fixtureName of ['small', 'large']) {
  const fixture = buildEnrichmentUiFixture(fixtureName);
  const lineIndex = buildLfeaPreflightPhase1Index(snapshotFromFixture(fixture));
  const componentInput = componentInputFromFixture(fixture);
  const componentIndex = buildLfeaPreflightPhase1ComponentIndex(lineIndex, componentInput);

  assert.equal(componentIndex.componentCount, fixture.components.count);
  assert.equal(componentIndex.lineCount, fixture.manifest.lineCount);

  const probes = [
    0,
    Math.floor(fixture.components.count / 2),
    fixture.components.count - 1,
  ];
  for (const componentOrdinal of probes) {
    const targetId = componentTargetId(fixture, componentOrdinal);
    const expectedLineId = fixture.lines.targetIdByOrdinal[
      fixture.components.parentLineOrdinal[componentOrdinal]
    ];
    assert.equal(
      getLfeaPreflightPhase1ComponentParentLineTargetId(componentIndex, lineIndex, targetId),
      expectedLineId,
      `Parent identity mismatch for ${targetId}`,
    );
  }

  const firstLineId = lineIndex.targetIds[0];
  const viewport = getLfeaPreflightPhase1ComponentsForLine(componentIndex, lineIndex, firstLineId, 0, 8);
  assert(viewport.count <= 8);
  assert.equal(viewport.lineTargetId, firstLineId);
  for (const targetId of viewport.targetIds) {
    assert.equal(
      getLfeaPreflightPhase1ComponentParentLineTargetId(componentIndex, lineIndex, targetId),
      firstLineId,
    );
  }

  if (fixtureName === 'small') {
    const reversed = buildLfeaPreflightPhase1ComponentIndex(lineIndex, {
      targetIdByOrdinal: [...componentInput.targetIdByOrdinal].reverse(),
      parentLineTargetIdByOrdinal: [...componentInput.parentLineTargetIdByOrdinal].reverse(),
    });
    assert.equal(reversed.structuralHash, componentIndex.structuralHash,
      'Component structural identity must be invariant to input order.');

    const duplicate = {
      targetIdByOrdinal: [...componentInput.targetIdByOrdinal],
      parentLineTargetIdByOrdinal: [...componentInput.parentLineTargetIdByOrdinal],
    };
    duplicate.targetIdByOrdinal[1] = duplicate.targetIdByOrdinal[0];
    assert.throws(
      () => buildLfeaPreflightPhase1ComponentIndex(lineIndex, duplicate),
      (error) => error?.code === 'E_P06_DUPLICATE_COMPONENT_TARGET_ID',
    );
  }

  console.log(JSON.stringify({
    check: 'lfea-preflight-phase1-component-parent-repair',
    fixture: fixtureName,
    status: 'PASS',
    lineCount: lineIndex.targetCount,
    componentCount: componentIndex.componentCount,
    structuralHash: componentIndex.structuralHash,
    parentLookup: 'COMPRESSED_OFFSETS_BINARY_SEARCH',
    retainedParentStringArray: false,
  }));
}

function componentInputFromFixture(fixture) {
  const targetIdByOrdinal = new Array(fixture.components.count);
  const parentLineTargetIdByOrdinal = new Array(fixture.components.count);
  for (let ordinal = 0; ordinal < fixture.components.count; ordinal += 1) {
    targetIdByOrdinal[ordinal] = componentTargetId(fixture, ordinal);
    parentLineTargetIdByOrdinal[ordinal] = fixture.lines.targetIdByOrdinal[
      fixture.components.parentLineOrdinal[ordinal]
    ];
  }
  return { targetIdByOrdinal, parentLineTargetIdByOrdinal };
}

function componentTargetId(fixture, ordinal) {
  return `COMP:${fixture.seedTag}:${ordinal.toString(36).padStart(8, '0')}`;
}

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
      engineeringStatusByField: Object.fromEntries(Object.entries(fixture.lines.engineeringColumns)
        .map(([fieldId, column]) => [fieldId, column.statuses])),
    },
    components: {
      count: fixture.components.count,
      parentLineOrdinal: fixture.components.parentLineOrdinal,
    },
    deferredTargetIds: [],
  };
}
