import { expect } from '@playwright/test';

const COLLECTIONS = Object.freeze([
  'nodes', 'edges', 'junctions', 'supports', 'boundaries', 'rigids', 'bends',
]);

export async function captureA3d004Authority(page) {
  return page.evaluate((collections) => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const controller = host?.__topologyEditAuthoringController;
    const topology = controller?.session?.currentTopology?.();
    const journal = controller?.session?.journal;
    if (!controller || !topology || !journal) {
      throw new Error('A3D-004: mounted production authority is unavailable.');
    }
    return {
      canonicalHash: topology.canonicalTopologyHash,
      sourceHash: controller.workspaceDataset?.sourceSnapshot?.sourceSemanticHash ?? null,
      sourceByteHash: controller.workspaceDataset?.sourceSnapshot?.sourceByteHash ?? null,
      journalHash: journal.journalHash,
      activeLedgerHash: journal.activeLedgerHash,
      activeCommandIds: [...journal.activeCommandIds],
      activeCommandCount: journal.activeCommandIds.length,
      sessionVersion: journal.sessionVersion,
      topologyRecords: recordSnapshot(topology, collections),
      ghostChildCount: controller.viewportBackend?.groups?.ghostGroup?.children?.length ?? 0,
    };

    function recordSnapshot(value, names) {
      const records = {};
      for (const collection of names) {
        for (const record of value[collection] ?? []) {
          records[`${collection}:${record.id}`] = JSON.stringify(record);
        }
      }
      return records;
    }
  }, COLLECTIONS);
}

export async function captureA3d004Preview(page, surface = 'authoring') {
  return page.evaluate(({ surfaceId, collections }) => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const controller = host?.__topologyEditAuthoringController;
    const current = controller?.session?.currentTopology?.();
    const journal = controller?.session?.journal;
    if (!controller || !current || !journal) {
      throw new Error('A3D-004: mounted production authority is unavailable.');
    }
    const candidate = surfaceId === 'table'
      ? controller.tableAdapter?.runtime?.preview?.candidate
      : controller.authoringRuntime?.candidate;
    if (!candidate?.canonicalTopology) {
      throw new Error(`A3D-004: ${surfaceId} candidate is unavailable after visible Preview.`);
    }
    const changedCanonicalIds = [...new Set(candidate.changedCanonicalIds ?? [])].sort();
    const changed = new Set(changedCanonicalIds);
    const projection = controller.deriveVisual(candidate.canonicalTopology, 'DRAFT').projection;
    const accepted = (row) => changed.has(
      row?.pickTarget?.objectId ?? row?.entityId ?? row?.id,
    );
    return {
      surface: surfaceId,
      authority: {
        canonicalHash: current.canonicalTopologyHash,
        sourceHash: controller.workspaceDataset?.sourceSnapshot?.sourceSemanticHash ?? null,
        sourceByteHash: controller.workspaceDataset?.sourceSnapshot?.sourceByteHash ?? null,
        journalHash: journal.journalHash,
        activeLedgerHash: journal.activeLedgerHash,
        activeCommandIds: [...journal.activeCommandIds],
        activeCommandCount: journal.activeCommandIds.length,
        sessionVersion: journal.sessionVersion,
      },
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
      projectionSignature: normalizedProjection(projection, accepted),
      ghostSignature: normalizedRenderedGroups([
        controller.viewportBackend?.groups?.ghostGroup,
      ]),
      candidateRecords: recordSnapshot(candidate.canonicalTopology, collections),
    };

    function round(value) {
      return Number.isFinite(Number(value)) ? Number(Number(value).toFixed(9)) : null;
    }
    function point(value) {
      return value && [value.x, value.y, value.z].every(Number.isFinite)
        ? [round(value.x), round(value.y), round(value.z)]
        : null;
    }
    function pick(value = {}, fallbackPartRole = '') {
      return {
        modelRole: String(value.modelRole ?? ''),
        objectKind: String(value.objectKind ?? ''),
        objectId: String(value.objectId ?? ''),
        nodeId: String(value.nodeId ?? ''),
        partRole: String(value.partRole ?? fallbackPartRole ?? ''),
        supportId: String(value.supportId ?? ''),
        restraintId: String(value.restraintId ?? ''),
        restraintFamily: String(value.restraintFamily ?? ''),
      };
    }
    function projectionRows(value, plural, compactPlural) {
      const compact = value?.[compactPlural];
      return Array.isArray(compact) ? compact : (value?.[plural] ?? []);
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
          pick: pick(row.pickTarget),
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
          pick: pick(row.pickTarget),
        });
      }
      return rows.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    }
    function normalizedRenderedGroups(groups) {
      const result = [];
      for (const group of groups.filter(Boolean)) {
        group.updateMatrixWorld?.(true);
        group.traverse((object) => {
          if (object === group || !object.geometry) return;
          const directPick = object.userData?.pickTarget ?? null;
          const picks = directPick
            ? [directPick]
            : (Array.isArray(object.userData?.pickTable) ? object.userData.pickTable : []);
          if (!picks.length) return;
          object.geometry.computeBoundingBox?.();
          const bounds = object.geometry.boundingBox;
          const geometryType = String(object.geometry?.type ?? '');
          const shape = {
            geometryType,
            position: point(object.position),
            quaternion: [
              round(object.quaternion?.x), round(object.quaternion?.y),
              round(object.quaternion?.z), round(object.quaternion?.w),
            ],
            scale: point(object.scale),
            geometryBounds: geometryType === 'SphereGeometry' || !bounds ? null : {
              min: point(bounds.min),
              max: point(bounds.max),
            },
          };
          const fallbackPartRole = object.userData?.partRole ?? '';
          for (const target of picks) {
            result.push({ pick: pick(target, fallbackPartRole), shape });
          }
        });
      }
      return result.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
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
  }, { surfaceId: surface, collections: COLLECTIONS });
}

export async function captureA3d004Applied(page, preview) {
  return page.evaluate(({ changedIds, ghostPicks, collections }) => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const controller = host?.__topologyEditAuthoringController;
    const topology = controller?.session?.currentTopology?.();
    const journal = controller?.session?.journal;
    if (!controller || !topology || !journal) {
      throw new Error('A3D-004: applied production authority is unavailable.');
    }
    const changed = new Set(changedIds);
    const accepted = (row) => changed.has(
      row?.pickTarget?.objectId ?? row?.entityId ?? row?.id,
    );
    const projection = controller.deriveVisual(topology, 'DRAFT').projection;
    const wantedPickKeys = new Set(ghostPicks.map((row) => JSON.stringify(row)));
    const rendered = normalizedRenderedGroups([
      controller.viewportBackend?.groups?.draftGroup,
      controller.viewportBackend?.groups?.supportGroup,
    ]).filter((row) => wantedPickKeys.has(JSON.stringify(row.pick)));
    return {
      canonicalHash: topology.canonicalTopologyHash,
      sourceHash: controller.workspaceDataset?.sourceSnapshot?.sourceSemanticHash ?? null,
      sourceByteHash: controller.workspaceDataset?.sourceSnapshot?.sourceByteHash ?? null,
      journalHash: journal.journalHash,
      activeLedgerHash: journal.activeLedgerHash,
      activeCommandIds: [...journal.activeCommandIds],
      activeCommandCount: journal.activeCommandIds.length,
      sessionVersion: journal.sessionVersion,
      projectionSignature: normalizedProjection(projection, accepted),
      renderedSignature: rendered,
      topologyRecords: recordSnapshot(topology, collections),
      ghostChildCount: controller.viewportBackend?.groups?.ghostGroup?.children?.length ?? 0,
    };

    function round(value) {
      return Number.isFinite(Number(value)) ? Number(Number(value).toFixed(9)) : null;
    }
    function point(value) {
      return value && [value.x, value.y, value.z].every(Number.isFinite)
        ? [round(value.x), round(value.y), round(value.z)]
        : null;
    }
    function pick(value = {}, fallbackPartRole = '') {
      return {
        modelRole: String(value.modelRole ?? ''),
        objectKind: String(value.objectKind ?? ''),
        objectId: String(value.objectId ?? ''),
        nodeId: String(value.nodeId ?? ''),
        partRole: String(value.partRole ?? fallbackPartRole ?? ''),
        supportId: String(value.supportId ?? ''),
        restraintId: String(value.restraintId ?? ''),
        restraintFamily: String(value.restraintFamily ?? ''),
      };
    }
    function projectionRows(value, plural, compactPlural) {
      const compact = value?.[compactPlural];
      return Array.isArray(compact) ? compact : (value?.[plural] ?? []);
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
          pick: pick(row.pickTarget),
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
          pick: pick(row.pickTarget),
        });
      }
      return rows.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    }
    function normalizedRenderedGroups(groups) {
      const result = [];
      for (const group of groups.filter(Boolean)) {
        group.updateMatrixWorld?.(true);
        group.traverse((object) => {
          if (object === group || !object.geometry) return;
          const directPick = object.userData?.pickTarget ?? null;
          const picks = directPick
            ? [directPick]
            : (Array.isArray(object.userData?.pickTable) ? object.userData.pickTable : []);
          if (!picks.length) return;
          object.geometry.computeBoundingBox?.();
          const bounds = object.geometry.boundingBox;
          const geometryType = String(object.geometry?.type ?? '');
          const shape = {
            geometryType,
            position: point(object.position),
            quaternion: [
              round(object.quaternion?.x), round(object.quaternion?.y),
              round(object.quaternion?.z), round(object.quaternion?.w),
            ],
            scale: point(object.scale),
            geometryBounds: geometryType === 'SphereGeometry' || !bounds ? null : {
              min: point(bounds.min),
              max: point(bounds.max),
            },
          };
          const fallbackPartRole = object.userData?.partRole ?? '';
          for (const target of picks) {
            result.push({ pick: pick(target, fallbackPartRole), shape });
          }
        });
      }
      return result.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
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
  }, {
    changedIds: preview.changedCanonicalIds,
    ghostPicks: preview.ghostSignature.map((row) => row.pick),
    collections: COLLECTIONS,
  });
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

  const candidateChangedKeys = changedRecordKeys(baseline.topologyRecords, preview.candidateRecords);
  const appliedChangedKeys = changedRecordKeys(baseline.topologyRecords, applied.topologyRecords);
  expect(appliedChangedKeys).toEqual(candidateChangedKeys);

  const candidateChangedIds = [...new Set(candidateChangedKeys.map(recordKeyId))].sort();
  const declaredChangedIds = new Set(preview.changedCanonicalIds);
  expect(
    candidateChangedIds.filter((id) => !declaredChangedIds.has(id)),
    'Candidate record changes escaped declared changedCanonicalIds.',
  ).toEqual([]);

  const appliedByPick = new Map();
  for (const row of applied.renderedSignature) {
    const key = JSON.stringify(row.pick);
    const shapes = appliedByPick.get(key) ?? [];
    shapes.push(row.shape);
    appliedByPick.set(key, shapes);
  }
  for (const ghostRow of preview.ghostSignature) {
    const key = JSON.stringify(ghostRow.pick);
    const shapes = appliedByPick.get(key) ?? [];
    expect(shapes.length, `Applied renderer is missing ghost pick ${key}.`).toBeGreaterThan(0);
    expect(
      shapes.some((shape) => JSON.stringify(shape) === JSON.stringify(ghostRow.shape)),
      `Applied renderer geometry differs for ghost pick ${key}.`,
    ).toBe(true);
  }
}

export function changedRecordKeys(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => before[key] !== after[key])
    .sort();
}

function recordKeyId(key) {
  return String(key).slice(String(key).indexOf(':') + 1);
}
