import { createSharedPipingModel } from '../../src/core/shared-piping-model/index.js';
import { createLfeaPreflightPhase1MasterAuthority } from '../../src/workspace/lfea-preflight-phase1-master-authority.js';
import {
  LFEA_PREFLIGHT_PHASE1_REVIEW_PROVIDERS,
  createLfeaPreflightPhase1ReviewSource,
  getLfeaPreflightPhase1ReviewCell,
} from '../../src/workspace/lfea-preflight-phase1-review-source.js';
import {
  createLfeaPreflightPhase1Viewport,
  getLfeaPreflightPhase1ViewportModel,
  selectLfeaPreflightPhase1Cell,
} from '../../src/workspace/lfea-preflight-phase1-viewport.js';
import { mountLfeaPreflightPhase1ReviewSurface } from '../../src/workspace/lfea-preflight-phase1-review-surface.js';
import {
  LFEA_PREFLIGHT_ENGINEERING_FIELDS,
  LFEA_PREFLIGHT_FIELD_STATUS,
} from '../../src/workspace/lfea-preflight-phase1-schema.js';

const CAPTURED = Object.freeze({
  lineList: '2026-08-11T08:00:00.000Z',
  pipingClass: '2026-08-11T08:01:00.000Z',
  materialMap: '2026-08-11T08:02:00.000Z',
});
const HASH = Object.freeze({
  lineList: '1'.repeat(64),
  pipingClass: '2'.repeat(64),
  materialMap: '3'.repeat(64),
});
const WALL_FIELD = 'piping.wallThicknessMm';

export function mountP06MasterReview(root, options = {}) {
  if (!root || typeof root.replaceChildren !== 'function') {
    throw new TypeError('P-06 Chromium fixture requires a DOM root.');
  }
  const sourceWallThickness = 6.02;
  const masterWallThickness = Number(options.masterWallThickness ?? sourceWallThickness);
  const sharedModel = model(sourceWallThickness);
  const masterData = masters(masterWallThickness);
  const authority = createLfeaPreflightPhase1MasterAuthority({
    sharedModel,
    masterData,
    capturedAtByMaster: CAPTURED,
  });
  const sourceOnly = createLfeaPreflightPhase1ReviewSource(
    sharedModel,
    masterData.lineList.normalizedRows,
  );
  const source = createLfeaPreflightPhase1ReviewSource(
    sharedModel,
    masterData.lineList.normalizedRows,
    { masterAuthority: authority },
  );
  const targetId = source.lineIndex.targetIds[0];
  const fieldOrdinal = LFEA_PREFLIGHT_ENGINEERING_FIELDS.indexOf(WALL_FIELD);
  const viewport = createLfeaPreflightPhase1Viewport(source, {
    providers: LFEA_PREFLIGHT_PHASE1_REVIEW_PROVIDERS,
    viewportHeight: 360,
    viewportWidth: 900,
  });
  selectLfeaPreflightPhase1Cell(viewport, targetId, fieldOrdinal);

  root.replaceChildren();
  const host = document.createElement('section');
  host.dataset.role = 'p06-chromium-review-host';
  root.append(host);
  const surface = mountLfeaPreflightPhase1ReviewSurface(host, {
    documentRef: document,
    getSource: () => source,
    getViewportModel: () => getLfeaPreflightPhase1ViewportModel(viewport),
    nowUtc: () => '2026-08-11T09:10:00.000Z',
  });
  const cell = getLfeaPreflightPhase1ReviewCell(source, targetId, fieldOrdinal);
  const sourceOnlyTargetId = sourceOnly.lineIndex.targetIds[0];

  const controller = Object.freeze({
    destroy() {
      surface.destroy();
      root.replaceChildren();
    },
  });
  globalThis.__P06_PREFLIGHT_BROWSER__ = { controller };

  return Object.freeze({
    targetId,
    sourceOnlyTargetId,
    sourceStableTargetIdentity: sourceOnlyTargetId === targetId,
    datasetIdentity: source.datasetIdentity,
    engineeringEvidenceHash: source.engineeringEvidenceHash,
    structuralHash: source.structuralHash,
    fieldId: WALL_FIELD,
    status: cell.statusText,
    statusValue: cell.status,
    value: cell.value,
    evidenceKinds: Object.freeze(cell.evidence.map((entry) => entry.sourceKind)),
    evidenceCount: cell.evidence.length,
    conflict: cell.status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT,
  });
}

function model(wallThickness) {
  return createSharedPipingModel({
    project: { datasetId: 'P06-CHROMIUM', name: 'P06 Chromium', sourceName: 'p06-chromium.json' },
    units: { length: 'mm', force: 'N', mass: 'kg' },
    sourceSnapshotRef: {
      schema: 'source-package-snapshot/v1',
      datasetId: 'P06-CHROMIUM',
      sourceSchema: 'p06-chromium-fixture/v1',
      sourceSemanticHash: 'fnv1a64:aaaaaaaaaaaaaaaa',
      sourceByteHash: null,
    },
    components: [{
      componentKey: 'PIPE-100',
      sourceEntityId: 'PIPE-100',
      name: 'Display name deliberately differs from line identity',
      type: 'PIPE',
      identity: { lineId: 'S100', branchId: 'S100/B1', systemId: '', zoneId: '' },
      boreMm: 100,
      attributes: { SPEC: 'A1', RATING: '150', WT: String(wallThickness) },
      engineeringProperties: { pipingClassCode: 'A1', ratingClassCode: '150', nominalBoreMm: 100 },
      geometry: {
        start: null,
        end: null,
        center: null,
        points: [],
        branchPoints: [],
        sources: {},
        sourcePath: '/PIPE-100',
        ports: [],
      },
      compatibilityEvidence: {},
      sourceReferences: { sourceEntityId: 'PIPE-100' },
      diagnostics: [],
    }],
    supports: [],
    sourceReferences: { nodes: [] },
    diagnostics: [],
  });
}

function masters(wallThickness) {
  return {
    lineList: master('line-list.xlsx', 'LineList', HASH.lineList, {
      lineKey: 'LINE', pipingClass: 'CLASS', convertedBore: 'DN',
    }, [{
      _sourceRowIndex: 9,
      _sourceRowNumber: 10,
      _sourceSheet: 'LineList',
      lineKey: 'S100',
      lineNoKey: 'S100',
      pipingClass: 'A1',
      rating: '150',
      material: 'A106-B',
      convertedBore: 100,
      p1: 1200,
      hydroPressure: 1800,
      t1: 200,
      t2: 120,
      t3: -20,
      density: 850,
      densityMixed: 850,
      phase: 'LIQUID',
    }]),
    pipingClass: master('piping-class.xlsx', 'Class', HASH.pipingClass, {
      pipingClass: 'CLASS', convertedBore: 'DN', nps: 'NPS', schedule: 'SCH',
      wallThickness: 'WT', corrosion: 'CA', materialName: 'MATERIAL',
    }, [{
      _sourceRowIndex: 19,
      _sourceRowNumber: 20,
      _sourceSheet: 'Class',
      pipingClass: 'A1',
      convertedBore: 100,
      nps: 4,
      schedule: 'SCH40',
      wallThickness,
      corrosion: 1.5,
      materialName: 'ASTM A106 B',
    }]),
    materialMap: master('materials.xlsx', 'Materials', HASH.materialMap, {
      code: 'CODE', material: 'MATERIAL', spec: 'SPEC',
    }, [{
      _sourceRowIndex: 29,
      _sourceRowNumber: 30,
      _sourceSheet: 'Materials',
      code: 'A106-B',
      material: 'ASTM A106 B',
      spec: 'ASTM A106',
    }]),
  };
}

function master(fileName, sheetName, sourceHash, fieldMap, normalizedRows) {
  return {
    fileName,
    sheetName,
    sourceHash,
    byteLength: 4096,
    fieldMap,
    normalizedRows,
    diagnostics: [],
  };
}
