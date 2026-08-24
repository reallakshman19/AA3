/** Source-faithful governed domain/geometry parent for the LAFEA.3 Sample route. */
import { createLafeaAnalysisGeometry } from './lafea-analysis-geometry-contract.js';
import {
  createLafeaAnalysisGeometryEvidence,
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
} from './lafea-analysis-geometry-evidence.js';
import { createLafeaContinuumAnalysisDomain } from './lafea-continuum-analysis-domain.js';

const STAGE_ID = 'LAFEA.3';
const GEOMETRY_ID = 'SIMULATED-PAD-DOMAIN';
const BOUNDARY_NODE_IDS = Object.freeze([
  'N01', 'N02', 'N03', 'N04', 'N08', 'N12', 'N14', 'N13', 'N09', 'N05',
]);
const SEGMENTS = Object.freeze([
  ['S1A', 'N01', 'N02'],
  ['S1B', 'N02', 'N03'],
  ['S1C', 'N03', 'N04'],
  ['S2', 'N04', 'N08'],
  ['S3', 'N08', 'N12'],
  ['S4', 'N12', 'N14'],
  ['S5', 'N14', 'N13'],
  ['S6', 'N13', 'N09'],
  ['S7', 'N09', 'N05'],
  ['S8', 'N05', 'N01'],
]);

export function createLafea3SimulatedDomainAndGeometryEvidence(sourceHash, source) {
  const document = requireSampleSource(source);
  const nodeById = new Map(document.nodes.map((row) => [row.nodeId, row]));
  const boundaryIds = new Set(BOUNDARY_NODE_IDS);
  requireFeatureCoverage(document, boundaryIds);

  const geometry = createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: STAGE_ID,
    geometryId: GEOMETRY_ID,
    coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: document.units.length,
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: BOUNDARY_NODE_IDS.map((vertexId) => {
      const node = nodeById.get(vertexId);
      if (!node) fail('LAFEA3_SIMULATED_SOURCE_BOUNDARY_NODE_MISSING');
      return { vertexId, x: node.x, y: node.y };
    }),
    segments: SEGMENTS.map(([segmentId, startVertexId, endVertexId]) => ({
      segmentId, type: 'LINE', startVertexId, endVertexId,
    })),
    loops: [{
      loopId: 'OUTER',
      role: 'OUTER',
      segmentIds: SEGMENTS.map(([segmentId]) => segmentId),
    }],
  });

  const physicalCaseIds = document.loadCases.map((row) => row.loadCaseId);
  const domain = createLafeaContinuumAnalysisDomain({
    schema: 'lafea-continuum-analysis-domain/v1',
    stageId: STAGE_ID,
    sourceHash,
    applicationRef: GEOMETRY_ID,
    units: {
      length: document.units.length,
      force: document.units.force,
      stress: document.units.stress,
      temperature: 'C',
    },
    formulation: document.formulation,
    region: {
      regionId: 'REGION-1',
      materialRef: requireSingleMaterial(document).materialId,
    },
    physicalCases: physicalCaseIds.map((caseId) => ({ caseId })),
    attachments: [
      ...document.constraints.map((row) => restraintAttachment(row, physicalCaseIds)),
      ...document.loadCases.flatMap((loadCase) => loadAttachments(loadCase, document.units.force)),
    ],
  }, geometry);

  const geometryEvidence = createLafeaAnalysisGeometryEvidence({
    schema: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
    stageId: STAGE_ID,
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'SIMULATED/GEOMETRY/SOURCE_FIDELITY_V1',
    profileId: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  });

  return { domain, geometryEvidence };
}

function requireSampleSource(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)
    || source.modelIdentity !== 'ASME_B313_REINFORCED_NOZZLE_PAD_2D'
    || !Array.isArray(source.nodes) || !Array.isArray(source.constraints)
    || !Array.isArray(source.loadCases)) {
    fail('LAFEA3_SIMULATED_SOURCE_INVALID');
  }
  return source;
}

function requireSingleMaterial(source) {
  if (!Array.isArray(source.materials) || source.materials.length !== 1
    || typeof source.materials[0]?.materialId !== 'string') {
    fail('LAFEA3_SIMULATED_SOURCE_SINGLE_MATERIAL_REQUIRED');
  }
  return source.materials[0];
}

function requireFeatureCoverage(source, boundaryIds) {
  const physicalNodeIds = new Set([
    ...source.constraints.map((row) => row.nodeId),
    ...source.loadCases.flatMap((loadCase) => loadCase.nodalForces.map((row) => row.nodeId)),
  ]);
  for (const nodeId of physicalNodeIds) {
    if (!boundaryIds.has(nodeId)) fail('LAFEA3_SIMULATED_SOURCE_FEATURE_NOT_REPRESENTED');
  }
}

function restraintAttachment(row, physicalCaseIds) {
  if (row.value !== 0 || !['UX', 'UY'].includes(row.dof)) {
    fail('LAFEA3_SIMULATED_SOURCE_RESTRAINT_NOT_QUALIFIED');
  }
  return {
    attachmentId: row.constraintId,
    kind: 'RESTRAINT',
    targetType: 'VERTEX',
    targetId: row.nodeId,
    physicalCaseIds: [...physicalCaseIds],
    payload: row.dof === 'UX' ? { ux: true } : { uy: true },
  };
}

function loadAttachments(loadCase, forceUnit) {
  for (const key of [
    'edgeTractions', 'pressureLoads', 'bodyForces', 'temperatureLoads', 'imposedDisplacements',
  ]) {
    if (!Array.isArray(loadCase[key]) || loadCase[key].length !== 0) {
      fail('LAFEA3_SIMULATED_SOURCE_NON_NODAL_LOAD_NOT_QUALIFIED');
    }
  }
  return loadCase.nodalForces.map((row) => ({
    attachmentId: row.loadId,
    kind: 'CONCENTRATED_LOAD',
    targetType: 'VERTEX',
    targetId: row.nodeId,
    physicalCaseIds: [loadCase.loadCaseId],
    payload: { fx: row.fx, fy: row.fy, unit: forceUnit },
  }));
}

function fail(code) {
  const error = new TypeError(code);
  error.code = code;
  throw error;
}
