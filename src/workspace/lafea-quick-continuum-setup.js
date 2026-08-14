/**
 * Build the governed domain-first custody package for the bounded LAFEA.3
 * rectangle authoring workflow. This module is pure: it owns no store, DOM,
 * lifecycle state, mesh authority, or execution authority.
 */
import {
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
  createLafeaAnalysisGeometryEvidence,
} from './lafea-analysis-geometry-evidence.js';
import {
  LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
  LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
  createLafeaAnalysisGeometry,
} from './lafea-analysis-geometry-contract.js';
import {
  LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
  createLafeaContinuumAnalysisDomain,
} from './lafea-continuum-analysis-domain.js';
import { requireLafeaStageComposition } from './lafea-stage-composition-root.js';
import { issueLafeaSourceAuthority } from './lafea-source-authority.js';

export const LAFEA_QUICK_CONTINUUM_SETUP_SCHEMA = 'lafea-quick-continuum-setup/v1';
const STAGE_ID = 'LAFEA.3';
const ORIGIN = 'LAFEA3_UI_QUICK_INPUT';

export function createLafeaQuickContinuumSetup(documentValue) {
  const composition = requireLafeaStageComposition(STAGE_ID);
  const source = composition.normalizeDocument(documentValue);
  requireQuickRectangleSource(source);
  const authority = issueLafeaSourceAuthority(STAGE_ID, source, ORIGIN);
  const geometry = rectangleGeometry(source);
  const domain = rectangleDomain(source, authority.sourceHash, geometry);
  const geometryEvidence = createLafeaAnalysisGeometryEvidence({
    schema: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
    stageId: STAGE_ID,
    sourceHash: authority.sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: `${ORIGIN}/GEOMETRY`,
    profileId: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  });
  return deepFreeze({
    schema: LAFEA_QUICK_CONTINUUM_SETUP_SCHEMA,
    stageId: STAGE_ID,
    source,
    authority,
    domain,
    geometryEvidence,
  });
}

function rectangleGeometry(source) {
  const nodes = nodeMap(source);
  const vertex = (nodeId) => {
    const row = nodes.get(nodeId);
    if (!row) fail('LAFEA_QUICK_CONTINUUM_REQUIRED_NODE_MISSING');
    return { vertexId: nodeId, x: row.x, y: row.y };
  };
  return createLafeaAnalysisGeometry({
    schema: LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
    stageId: STAGE_ID,
    geometryId: `${source.modelIdentity}/RECTANGLE_DOMAIN`,
    coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: source.units.length,
    orientationPolicy: LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
    vertices: ['A', 'B', 'C', 'D'].map(vertex),
    segments: [
      line('S_AB', 'A', 'B'),
      line('S_BC', 'B', 'C'),
      line('S_CD', 'C', 'D'),
      line('S_DA', 'D', 'A'),
    ],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S_AB', 'S_BC', 'S_CD', 'S_DA'] }],
  });
}

function rectangleDomain(source, sourceHash, geometry) {
  const caseIds = source.loadCases.map((row) => row.loadCaseId);
  const attachments = [];
  for (const row of source.constraints) {
    const payload = row.dof === 'UX' ? { ux: true } : row.dof === 'UY' ? { uy: true } : null;
    if (!payload) fail('LAFEA_QUICK_CONTINUUM_CONSTRAINT_DOF_UNSUPPORTED');
    attachments.push(attachment(
      `RESTRAINT/${row.constraintId}`,
      'RESTRAINT',
      'VERTEX',
      row.nodeId,
      caseIds,
      payload,
    ));
  }
  for (const loadCase of source.loadCases) {
    for (const row of loadCase.nodalForces) {
      attachments.push(attachment(
        `LOAD/${loadCase.loadCaseId}/${row.loadId}`,
        'CONCENTRATED_LOAD',
        'VERTEX',
        row.nodeId,
        [loadCase.loadCaseId],
        { fx: row.fx, fy: row.fy, unit: source.units.force },
      ));
    }
  }
  return createLafeaContinuumAnalysisDomain({
    schema: LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
    stageId: STAGE_ID,
    sourceHash,
    applicationRef: ORIGIN,
    units: {
      length: source.units.length,
      force: source.units.force,
      stress: source.units.stress,
      temperature: 'C',
    },
    formulation: source.formulation,
    region: { regionId: 'REGION-1', materialRef: source.materials[0].materialId },
    physicalCases: caseIds.map((caseId) => ({ caseId })),
    attachments,
  }, geometry);
}

function requireQuickRectangleSource(source) {
  if (source?.schema !== 'local-continuum-model/v1'
    || source.formulation === undefined
    || source.units?.length !== 'mm'
    || source.units?.force !== 'N'
    || source.units?.stress !== 'MPa') {
    fail('LAFEA_QUICK_CONTINUUM_SOURCE_CONTRACT_INVALID');
  }
  const nodes = nodeMap(source);
  if (nodes.size !== 4 || ['A', 'B', 'C', 'D'].some((id) => !nodes.has(id))) {
    fail('LAFEA_QUICK_CONTINUUM_RECTANGLE_NODES_REQUIRED');
  }
  const a = nodes.get('A'); const b = nodes.get('B');
  const c = nodes.get('C'); const d = nodes.get('D');
  const tol = 1e-10 * Math.max(1, Math.abs(b.x), Math.abs(c.x), Math.abs(c.y), Math.abs(d.y));
  if (!(b.x > a.x + tol && d.y > a.y + tol)
    || Math.abs(a.y - b.y) > tol
    || Math.abs(b.x - c.x) > tol
    || Math.abs(c.y - d.y) > tol
    || Math.abs(d.x - a.x) > tol) {
    fail('LAFEA_QUICK_CONTINUUM_AXIS_ALIGNED_RECTANGLE_REQUIRED');
  }
  if (!Array.isArray(source.materials) || source.materials.length !== 1
    || !Array.isArray(source.loadCases) || source.loadCases.length < 1
    || !Array.isArray(source.constraints) || source.constraints.length < 3) {
    fail('LAFEA_QUICK_CONTINUUM_SOURCE_CONTENT_INVALID');
  }
}

function nodeMap(source) {
  return new Map((Array.isArray(source?.nodes) ? source.nodes : []).map((row) => [row.nodeId, row]));
}
function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}
function attachment(attachmentId, kind, targetType, targetId, physicalCaseIds, payload) {
  return { attachmentId, kind, targetType, targetId, physicalCaseIds, payload };
}
function fail(code) {
  const error = new TypeError(code);
  error.code = code;
  throw error;
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
