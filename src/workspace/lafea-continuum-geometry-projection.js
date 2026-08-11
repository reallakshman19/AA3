/** Canonical geometry/topology identity for the legacy LAFEA.3 lifecycle path. */
import {
  validateCanonicalLocalContinuumModel,
} from '../core/local-continuum/index.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_CONTINUUM_GEOMETRY_PROJECTION_SCHEMA =
  'lafea-continuum-geometry-projection/v1';

export function createLafeaContinuumGeometryProjection(modelValue) {
  const model = validateCanonicalLocalContinuumModel(modelValue);
  const projection = {
    schema: LAFEA_CONTINUUM_GEOMETRY_PROJECTION_SCHEMA,
    stageId: 'LAFEA.3',
    lengthUnit: model.units.canonical.length,
    nodes: model.nodes.map((row) => freeze({
      nodeId: row.nodeId,
      x: row.x,
      y: row.y,
    })),
    elements: model.elements.map((row) => freeze({
      elementId: row.elementId,
      elementType: row.elementType,
      nodeIds: [...row.nodeIds],
    })),
  };
  return freeze({
    ...projection,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-geometry-projection-hash-input/v1',
      projection,
    }),
  });
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
