import {
  EMPIRICAL_FORMULA_IDS,
  deepFreeze,
  requireNonEmptyString,
} from './contracts.js';
import {
  buildRootedTreeThermalReferenceDisplacements,
} from './thermal-reference.js';
import {
  solveRootedTreeRestraintCompatibility,
} from './restraint-compatibility.js';

export const EMPIRICAL_ROOTED_TREE_THERMAL_COMPATIBILITY_SCHEMA =
  'empirical-rooted-tree-thermal-restraint-compatibility/v1';

export function solveRootedTreeThermalRestraintCompatibility(input) {
  requireRecord(input, 'rooted-tree thermal compatibility input');
  exactKeys(
    input,
    ['nodes', 'segments', 'rootNodeId', 'coordinates', 'options'],
    'rooted-tree thermal compatibility input',
  );
  const rootNodeId = requireNonEmptyString(input.rootNodeId, 'rootNodeId');
  const segments = requireCombinedSegments(input.segments);
  const coordinates = requireThermalCompatibilityCoordinates(input.coordinates);

  const thermalReference = buildRootedTreeThermalReferenceDisplacements({
    nodes: input.nodes,
    segments: segments.map((segment) => ({
      segmentId: segment.segmentId,
      nodeAId: segment.nodeAId,
      nodeBId: segment.nodeBId,
      thermal: segment.thermal,
    })),
    rootNodeId,
    coordinates: coordinates.map((coordinate) => ({
      coordinateId: coordinate.coordinateId,
      nodeId: coordinate.nodeId,
      direction: coordinate.direction,
    })),
  });
  const referenceByCoordinateId = new Map(
    thermalReference.rows.map((row) => [row.coordinateId, row.referenceDisplacementM]),
  );

  const compatibility = solveRootedTreeRestraintCompatibility({
    nodes: input.nodes,
    segments: segments.map((segment) => ({
      segmentId: segment.segmentId,
      nodeAId: segment.nodeAId,
      nodeBId: segment.nodeBId,
      properties: segment.properties,
    })),
    rootNodeId,
    coordinates: coordinates.map((coordinate) => ({
      coordinateId: coordinate.coordinateId,
      nodeId: coordinate.nodeId,
      direction: coordinate.direction,
      referenceDisplacementM: requireReference(
        referenceByCoordinateId,
        coordinate.coordinateId,
      ),
      targetDisplacementM: coordinate.targetDisplacementM,
      supportStiffnessNPerM: coordinate.supportStiffnessNPerM,
    })),
    options: input.options,
  });

  return deepFreeze({
    schema: EMPIRICAL_ROOTED_TREE_THERMAL_COMPATIBILITY_SCHEMA,
    rootNodeId,
    coordinateIds: compatibility.coordinateIds,
    thermalReference,
    compatibility,
    evidence: {
      solutionClass: 'ANALYTICAL_FLEXIBILITY_FORCE_METHOD_ROM',
      globalNodalStiffnessMatrixAssembled: false,
      finiteElementRouteUsed: false,
      thermalLoadRepresentation: 'FREE_THERMAL_STRAIN_AND_REFERENCE_DISPLACEMENT',
      directThermalForceInjected: false,
      thermalReferenceAuthority: 'ROOTED_TREE_SEGMENT_THERMAL_STRAIN_KINEMATICS',
      compatibilityAuthority: 'UNIT_LOAD_VIRTUAL_WORK_AND_CLASSICAL_FORCE_METHOD',
      formulaTrace: [EMPIRICAL_FORMULA_IDS.thermalReferenceCompatibility],
    },
  });
}

function requireCombinedSegments(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('segments must be a non-empty array.');
  }
  const rows = value.map((segment, index) => {
    requireRecord(segment, `segments[${index}]`);
    exactKeys(
      segment,
      ['segmentId', 'nodeAId', 'nodeBId', 'properties', 'thermal'],
      `segments[${index}]`,
    );
    return deepFreeze({
      segmentId: requireNonEmptyString(segment.segmentId, `segments[${index}].segmentId`),
      nodeAId: requireNonEmptyString(segment.nodeAId, `segments[${index}].nodeAId`),
      nodeBId: requireNonEmptyString(segment.nodeBId, `segments[${index}].nodeBId`),
      properties: structuredClone(segment.properties),
      thermal: structuredClone(segment.thermal),
    });
  });
  requireUnique(rows.map((row) => row.segmentId), 'segment ids');
  return deepFreeze(rows.sort((left, right) => left.segmentId.localeCompare(right.segmentId)));
}

function requireThermalCompatibilityCoordinates(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('coordinates must be a non-empty array.');
  }
  const rows = value.map((coordinate, index) => {
    requireRecord(coordinate, `coordinates[${index}]`);
    exactKeys(
      coordinate,
      [
        'coordinateId',
        'nodeId',
        'direction',
        'targetDisplacementM',
        'supportStiffnessNPerM',
      ],
      `coordinates[${index}]`,
    );
    return deepFreeze({
      coordinateId: requireNonEmptyString(
        coordinate.coordinateId,
        `coordinates[${index}].coordinateId`,
      ),
      nodeId: requireNonEmptyString(coordinate.nodeId, `coordinates[${index}].nodeId`),
      direction: structuredClone(coordinate.direction),
      targetDisplacementM: coordinate.targetDisplacementM,
      supportStiffnessNPerM: coordinate.supportStiffnessNPerM,
    });
  });
  requireUnique(rows.map((row) => row.coordinateId), 'coordinate ids');
  return deepFreeze(rows.sort((left, right) => left.coordinateId.localeCompare(right.coordinateId)));
}

function requireReference(referenceByCoordinateId, coordinateId) {
  if (!referenceByCoordinateId.has(coordinateId)) {
    throw new TypeError(`Thermal reference displacement missing for coordinate ${coordinateId}.`);
  }
  return referenceByCoordinateId.get(coordinateId);
}
function requireUnique(ids, label) {
  if (new Set(ids).size !== ids.length) throw new TypeError(`${label} must be unique.`);
}
function exactKeys(value, keys, label) {
  requireRecord(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError(`${label} contains unexpected or missing keys.`);
  }
}
function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}
