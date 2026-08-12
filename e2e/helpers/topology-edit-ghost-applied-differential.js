import { expect } from '@playwright/test';

const COLLECTIONS = Object.freeze([
  'nodes', 'edges', 'junctions', 'supports', 'boundaries', 'rigids', 'bends',
]);

export const A3D004_RENDERER_POLICY = Object.freeze({
  semanticProjection: 'EXACT',
  canonicalPickIdentityExcludesModelRole: true,
  nodeMarkerShape: 'PRESENTATION_ONLY',
  threeGeometryType: 'EXACT_FOR_ENGINEERING_OBJECTS',
  threeLocalShapeToleranceMm: 0.5,
});

export async function captureA3d004Authority(page) {
  const state = await captureViewportState(page, { mode: 'authority' });
  return {
    ...state.authority,
    topologyRecords: state.topologyRecords,
    ghostChildCount: state.ghostChildCount,
  };
}

export async function captureA3d004Preview(page, surface = 'authoring') {
  return captureViewportState(page, { mode: 'preview', surface });
}

export async function captureA3d004Applied(page, preview) {
  const state = await captureViewportState(page, {
    mode: 'applied',
    changedCanonicalIds: preview.changedCanonicalIds,
  });
  return {
    ...state.authority,
    projectionSignature: state.projectionSignature,
    renderedSignature: state.renderedSignature,
    topologyRecords: state.topologyRecords,
    ghostChildCount: state.ghostChildCount,
  };
}

async function captureViewportState(page, options) {
  return page.evaluate(({ input, collections }) => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const topology = controller?.session?.currentTopology?.();
    const journal = controller?.session?.journal;
    if (!controller || !topology || !journal) {
      throw new Error('A3D-004: mounted production authority is unavailable.');
    }

    const authority = {
      canonicalHash: topology.canonicalTopologyHash,
      sourceHash: controller.workspaceDataset?.sourceSnapshot?.sourceSemanticHash ?? null,
      sourceByteHash: controller.workspaceDataset?.sourceSnapshot?.sourceByteHash ?? null,
      journalHash: journal.journalHash,
      activeLedgerHash: journal.activeLedgerHash,
      activeCommandIds: [...journal.activeCommandIds],
      activeCommandCount: journal.activeCommandIds.length,
      sessionVersion: journal.sessionVersion,
    };
    const topologyRecords = recordSnapshot(topology, collections);
    const ghostChildCount = controller.viewportBackend?.groups?.ghostGroup?.children?.length ?? 0;
    if (input.mode === 'authority') {
      return { authority, topologyRecords, ghostChildCount };
    }

    if (input.mode === 'preview') {
      const candidate = input.surface === 'table'
        ? controller.tableAdapter?.runtime?.preview?.candidate
        : controller.authoringRuntime?.candidate;
      if (!candidate?.canonicalTopology) {
        throw new Error(`A3D-004: ${input.surface} candidate is unavailable after visible Preview.`);
      }
      const changedCanonicalIds = [...new Set(candidate.changedCanonicalIds ?? [])].sort();
      const changed = new Set(changedCanonicalIds);
      const projection = controller.deriveVisual(candidate.canonicalTopology, 'DRAFT').projection;
      return {
        surface: input.surface,
        authority,
        candidateHash: candidate.candidateHash ?? candidate.candidateDraftHash ?? '',
        planHash: candidate.planHash ?? '',
        priorCanonicalHash: candidate.priorCanonicalHash
          ?? candidate.priorCanonicalTopologyHash
          ?? '',
        resultingCanonicalHash: candidate.resultingCanonicalHash
          ?? candidate.canonicalTopologyHash
          ?? candidate.canonicalTopology.canonicalTopologyHash,
        changedCanonicalIds,
        commandTypes: (candidate.materializedCommandIntents ?? [])
          .map((row) => row.commandType)
          .filter(Boolean),
        projectionSignature: normalizedProjection(
          projection,
          (row) => changed.has(row?.pickTarget?.objectId ?? row?.entityId ?? row?.id),
        ),
        ghostSignature: normalizedRenderedGroups([
          controller.viewportBackend?.groups?.ghostGroup,
        ]),
        candidateRecords: recordSnapshot(candidate.canonicalTopology, collections),
      };
    }

    const changed = new Set(input.changedCanonicalIds ?? []);
    const projection = controller.deriveVisual(topology, 'DRAFT').projection;
    const renderedSignature = normalizedRenderedGroups([
      controller.viewportBackend?.groups?.draftGroup,
      controller.viewportBackend?.groups?.supportGroup,
    ]).filter((row) => pickOwnedByChanged(row.pick, changed));
    return {
      authority,
      projectionSignature: normalizedProjection(
        projection,
        (row) => changed.has(row?.pickTarget?.objectId ?? row?.entityId ?? row?.id),
      ),
      renderedSignature,
      topologyRecords,
      ghostChildCount,
    };

    function pickOwnedByChanged(pick, changedIds) {
      return [pick.objectId, pick.supportId, pick.nodeId]
        .filter(Boolean)
        .some((id) => changedIds.has(id));
    }

    function recordSnapshot(value, names) {
      const records = {};
      for (const collection of names) {
        for (const record of value[collection] ?? []) {
          records[`${collection}:${record.id}`] = JSON.stringify(record);
        }
      }
      return records;
    }

    function normalizedProjection(value, filter) {
      const rows = [];
      for (const row of projectionRows(value, 'elements', 'compactElements')) {
        if (!filter(row)) continue;
        rows.push({
          kind: 'ELEMENT',
          id: String(row.entityId ?? row.id ?? ''),
          type: String(row.type ?? ''),
          position: [round(row.x), round(row.y), round(row.z)],
          sizeMm: round(row.sizeMm),
          pick: canonicalPick(row.pickTarget),
        });
      }
      for (const row of projectionRows(value, 'segments', 'compactSegments')) {
        if (!filter(row)) continue;
        rows.push({
          kind: 'SEGMENT',
          id: String(row.entityId ?? row.id ?? ''),
          type: String(row.type ?? ''),
          start: point(row.start),
          end: point(row.end),
          points: Array.isArray(row.points) ? row.points.map(point) : [],
          radiusMm: round(row.radiusMm),
          endRadiusMm: round(row.endRadiusMm),
          pick: canonicalPick(row.pickTarget),
        });
      }
      return rows.sort(byJson);
    }

    function normalizedRenderedGroups(groups) {
      const rows = [];
      for (const group of groups.filter(Boolean)) {
        group.updateMatrixWorld?.(true);
        const inverseGroupMatrix = group.matrixWorld.clone().invert();
        group.traverse((object) => {
          if (object === group || !object.geometry) return;
          const direct = object.userData?.pickTarget ?? null;
          const table = Array.isArray(object.userData?.pickTable) ? object.userData.pickTable : [];
          const partRoleTable = Array.isArray(object.userData?.partRoleTable)
            ? object.userData.partRoleTable : [];
          if (!direct && !table.length) return;
          object.geometry.computeBoundingBox?.();
          const bounds = object.geometry.boundingBox;
          const geometryType = String(object.geometry?.type ?? '');
          const geometryBounds = geometryType === 'SphereGeometry' || !bounds
            ? null
            : { min: point(bounds.min), max: point(bounds.max) };
          const fallbackPartRole = object.userData?.partRole ?? '';

          if (object.isInstancedMesh && table.length) {
            for (let index = 0; index < table.length; index += 1) {
              const instanceMatrix = object.matrixWorld.clone().identity();
              object.getMatrixAt(index, instanceMatrix);
              const groupLocalMatrix = inverseGroupMatrix.clone()
                .multiply(object.matrixWorld)
                .multiply(instanceMatrix);
              rows.push({
                pick: canonicalPick(table[index], partRoleTable[index] ?? fallbackPartRole),
                shape: shapeFromMatrix(object, groupLocalMatrix, geometryType, geometryBounds),
              });
            }
            return;
          }

          const groupLocalMatrix = inverseGroupMatrix.clone().multiply(object.matrixWorld);
          const shape = shapeFromMatrix(object, groupLocalMatrix, geometryType, geometryBounds);
          if (direct) rows.push({ pick: canonicalPick(direct, fallbackPartRole), shape });
          for (let index = 0; index < table.length; index += 1) {
            rows.push({
              pick: canonicalPick(table[index], partRoleTable[index] ?? fallbackPartRole),
              shape,
            });
          }
        });
      }
      return rows.sort(byJson);
    }

    function shapeFromMatrix(object, matrix, geometryType, geometryBounds) {
      const position = object.position.clone();
      const quaternion = object.quaternion.clone();
      const scale = object.scale.clone();
      matrix.decompose(position, quaternion, scale);
      return {
        geometryType,
        position: point(position),
        quaternion: [
          round(quaternion.x), round(quaternion.y),
          round(quaternion.z), round(quaternion.w),
        ],
        scale: point(scale),
        geometryBounds,
      };
    }

    function canonicalPick(value = {}, fallbackPartRole = '') {
      return {
        objectKind: String(value.objectKind ?? ''),
        objectId: String(value.objectId ?? ''),
        nodeId: String(value.nodeId ?? ''),
        partRole: String(value.partRole || fallbackPartRole || ''),
        supportId: String(value.supportId ?? ''),
        restraintId: String(value.restraintId ?? ''),
        restraintFamily: String(value.restraintFamily ?? ''),
      };
    }

    function projectionRows(value, plural, compactPlural) {
      const compact = value?.[compactPlural];
      return Array.isArray(compact) ? compact : (value?.[plural] ?? []);
    }
    function round(value) {
      return Number.isFinite(Number(value)) ? Number(Number(value).toFixed(9)) : null;
    }
    function point(value) {
      return value && [value.x, value.y, value.z].every(Number.isFinite)
        ? [round(value.x), round(value.y), round(value.z)]
        : null;
    }
    function byJson(left, right) {
      return JSON.stringify(left).localeCompare(JSON.stringify(right));
    }
  }, { input: options, collections: COLLECTIONS });
}

export function assertA3d004PreviewNonMutating(baseline, preview) {
  expect(preview.authority.canonicalHash).toBe(baseline.canonicalHash);
  expect(preview.authority.sourceHash).toBe(baseline.sourceHash);
  expect(preview.authority.sourceByteHash).toBe(baseline.sourceByteHash);
  expect(preview.authority.journalHash).toBe(baseline.journalHash);
  expect(preview.authority.activeLedgerHash).toBe(baseline.activeLedgerHash);
  expect(preview.authority.activeCommandIds).toEqual(baseline.activeCommandIds);
  expect(preview.authority.activeCommandCount).toBe(baseline.activeCommandCount);
  expect(preview.authority.sessionVersion).toBe(baseline.sessionVersion);
  expect(preview.priorCanonicalHash).toBe(baseline.canonicalHash);
  expect(preview.resultingCanonicalHash).not.toBe(baseline.canonicalHash);
  expect(preview.candidateHash).not.toBe('');
  expect(preview.changedCanonicalIds.length).toBeGreaterThan(0);
  expect(preview.projectionSignature.length + preview.ghostSignature.length).toBeGreaterThan(0);
}

export function assertA3d004ValidationNonMutating(baseline, authority) {
  expect(authority.canonicalHash).toBe(baseline.canonicalHash);
  expect(authority.sourceHash).toBe(baseline.sourceHash);
  expect(authority.sourceByteHash).toBe(baseline.sourceByteHash);
  expect(authority.journalHash).toBe(baseline.journalHash);
  expect(authority.activeLedgerHash).toBe(baseline.activeLedgerHash);
  expect(authority.activeCommandIds).toEqual(baseline.activeCommandIds);
  expect(authority.activeCommandCount).toBe(baseline.activeCommandCount);
  expect(authority.sessionVersion).toBe(baseline.sessionVersion);
}

export function assertA3d004AppliedDifferential(baseline, preview, applied) {
  expect(applied.canonicalHash).toBe(preview.resultingCanonicalHash);
  expect(applied.sourceHash).toBe(baseline.sourceHash);
  expect(applied.sourceByteHash).toBe(baseline.sourceByteHash);
  expect(applied.activeCommandCount).toBe(
    baseline.activeCommandCount + preview.commandTypes.length,
  );
  expect(applied.projectionSignature).toEqual(preview.projectionSignature);
  expect(applied.ghostChildCount).toBe(0);

  const candidateChangedKeys = changedRecordKeys(
    baseline.topologyRecords,
    preview.candidateRecords,
  );
  const appliedChangedKeys = changedRecordKeys(
    baseline.topologyRecords,
    applied.topologyRecords,
  );
  expect(appliedChangedKeys).toEqual(candidateChangedKeys);

  const declaredChangedIds = new Set(preview.changedCanonicalIds);
  const candidateChangedIds = [...new Set(candidateChangedKeys.map(recordKeyId))].sort();
  expect(
    candidateChangedIds.filter((id) => !declaredChangedIds.has(id)),
    'Candidate record changes escaped declared changedCanonicalIds.',
  ).toEqual([]);

  const appliedByPick = groupByCanonicalPick(applied.renderedSignature);
  const engineeringGhostRows = preview.ghostSignature.filter((row) => (
    row.pick.objectId && row.pick.objectKind !== 'node'
  ));
  expect(engineeringGhostRows.length).toBeGreaterThan(0);
  for (const ghostRow of engineeringGhostRows) {
    const key = JSON.stringify(ghostRow.pick);
    const candidates = appliedByPick.get(key) ?? [];
    expect(candidates.length, `Applied renderer is missing ghost pick ${key}.`)
      .toBeGreaterThan(0);
    expect(
      candidates.some((row) => shapesEquivalent(
        ghostRow.shape,
        row.shape,
        A3D004_RENDERER_POLICY.threeLocalShapeToleranceMm,
      )),
      `Applied renderer geometry differs beyond declared policy for ghost pick ${key}.`,
    ).toBe(true);
  }
}

export function changedRecordKeys(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => before[key] !== after[key])
    .sort();
}

function groupByCanonicalPick(rows) {
  const result = new Map();
  for (const row of rows) {
    const key = JSON.stringify(row.pick);
    result.set(key, [...(result.get(key) ?? []), row]);
  }
  return result;
}

function shapesEquivalent(left, right, tolerance) {
  if (left.geometryType !== right.geometryType) return false;
  const leftValues = shapeNumbers(left);
  const rightValues = shapeNumbers(right);
  if (leftValues.length !== rightValues.length) return false;
  return leftValues.every((value, index) => (
    Math.abs(value - rightValues[index]) <= tolerance
  ));
}

function shapeNumbers(shape) {
  return [
    ...(shape.position ?? []),
    ...(shape.quaternion ?? []),
    ...(shape.scale ?? []),
    ...(shape.geometryBounds?.min ?? []),
    ...(shape.geometryBounds?.max ?? []),
  ].filter(Number.isFinite);
}

function recordKeyId(key) {
  return String(key).slice(String(key).indexOf(':') + 1);
}