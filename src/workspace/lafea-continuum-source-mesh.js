/** Canonical source-authored analysis mesh for the legacy LAFEA.3 lifecycle path. */
import {
  LAFEA_ANALYSIS_MESH_SCHEMA,
  canonicalLafeaAnalysisMesh,
} from './lafea-analysis-mesh-contract.js';
import {
  createLafeaContinuumGeometryProjection,
} from './lafea-continuum-geometry-projection.js';

export function createLafeaContinuumSourceAnalysisMesh(modelValue) {
  const geometry = createLafeaContinuumGeometryProjection(modelValue);
  return canonicalLafeaAnalysisMesh({
    schema: LAFEA_ANALYSIS_MESH_SCHEMA,
    meshIdentity: `LAFEA.3/SOURCE_AUTHORED/${geometry.semanticHash}`,
    nodes: geometry.nodes.map((row) => ({
      nodeId: row.nodeId,
      x: row.x,
      y: row.y,
      z: 0,
    })),
    elements: geometry.elements.map((row) => ({
      elementId: row.elementId,
      elementType: row.elementType,
      nodeIds: [...row.nodeIds],
    })),
  });
}
