export const LFEA_PIPELINE_LAYOUT_GRID_SCHEMA = 'lfea-pipeline-layout-grid/v1';

/**
 * Project the sealed conditioned topology into a CAEPIPE-style element table:
 * one row per element, in the units an engineer reads.
 *
 * Column KEYS deliberately match topology-edit-table-columns.js
 * (fromNodeId/toNodeId/deltaX../outsideDiameterMm/wallThicknessMm/material)
 * so the editable Layout grid can adopt the same rows without renaming
 * anything. This projection is read-only: it derives nothing the model does
 * not already declare, and every value it shows is a unit conversion of a
 * sealed one.
 *
 * The conditioned geometry works in metres and kelvin and pascals; this
 * converts to mm / degC / barg for display only.
 */
const KELVIN_OFFSET = 273.15;
const PASCAL_PER_BAR = 1e5;

export const LFEA_PIPELINE_LAYOUT_COLUMNS = Object.freeze([
  Object.freeze({ key: 'elementIndex', label: '#', align: 'right' }),
  Object.freeze({ key: 'fromNodeId', label: 'From', align: 'left' }),
  Object.freeze({ key: 'toNodeId', label: 'To', align: 'left' }),
  Object.freeze({ key: 'elementType', label: 'Type', align: 'left' }),
  Object.freeze({ key: 'deltaX', label: 'DX [mm]', align: 'right' }),
  Object.freeze({ key: 'deltaY', label: 'DY [mm]', align: 'right' }),
  Object.freeze({ key: 'deltaZ', label: 'DZ [mm]', align: 'right' }),
  Object.freeze({ key: 'lengthMm', label: 'Length [mm]', align: 'right' }),
  Object.freeze({ key: 'outsideDiameterMm', label: 'OD [mm]', align: 'right' }),
  Object.freeze({ key: 'wallThicknessMm', label: 'Wall [mm]', align: 'right' }),
  Object.freeze({ key: 'material', label: 'Material', align: 'left' }),
  Object.freeze({ key: 'temperatureC', label: 'Temp [°C]', align: 'right' }),
  Object.freeze({ key: 'pressureBar', label: 'Press [bar]', align: 'right' }),
  Object.freeze({ key: 'restraint', label: 'Restraint', align: 'left' }),
]);

export function buildLfeaPipelineLayoutGrid(preFlight) {
  const structural = preFlight?.preparation?.structuralPreparation ?? null;
  const geometry = structural?.conditionedTopology?.geometry ?? null;
  if (geometry === null) {
    return Object.freeze({ schema: LFEA_PIPELINE_LAYOUT_GRID_SCHEMA, rows: Object.freeze([]), unit: null });
  }
  const nodes = new Map(geometry.nodes.map((node) => [String(node.id), node]));
  const restraintsByNode = restraintLabels(structural.constraintBindings ?? []);
  const toMm = geometry.unit === 'm' ? 1000 : 1;

  const rows = geometry.segments.map((segment, index) => {
    const from = nodes.get(String(segment.startNodeId)) ?? null;
    const to = nodes.get(String(segment.endNodeId)) ?? null;
    const delta = from === null || to === null
      ? { x: null, y: null, z: null }
      : { x: (to.x - from.x) * toMm, y: (to.y - from.y) * toMm, z: (to.z - from.z) * toMm };
    const analysis = segment.meta?.analysis ?? {};
    return Object.freeze({
      elementIndex: index + 1,
      segmentId: segment.id,
      fromNodeId: String(segment.startNodeId),
      toNodeId: String(segment.endNodeId),
      elementType: segment.type ?? '',
      deltaX: delta.x,
      deltaY: delta.y,
      deltaZ: delta.z,
      lengthMm: delta.x === null ? null : Math.hypot(delta.x, delta.y, delta.z),
      // Diameter and wall are already in the geometry's own length unit.
      outsideDiameterMm: scaled(segment.diameter, toMm),
      wallThicknessMm: scaled(segment.thickness, toMm),
      material: segment.material ?? '',
      temperatureC: offsetFrom(analysis.operatingTemperature, KELVIN_OFFSET),
      pressureBar: divided(analysis.pressure, PASCAL_PER_BAR),
      // A restraint belongs to the node, so it is shown against the element
      // that node starts, matching how CAESAR's own layout reads.
      restraint: restraintsByNode.get(String(segment.startNodeId)) ?? '',
    });
  });

  return Object.freeze({
    schema: LFEA_PIPELINE_LAYOUT_GRID_SCHEMA,
    rows: Object.freeze(rows),
    unit: geometry.unit,
    nodeCount: geometry.nodes.length,
    elementCount: rows.length,
  });
}

/** One short label per node, naming the DOFs held and any approximation. */
function restraintLabels(bindings) {
  const byNode = new Map();
  for (const binding of bindings) {
    const parts = [binding.targetDofs.length === 6 ? 'ANC' : binding.targetDofs.join('/')];
    if (binding.unilateralAction) parts.push(binding.unilateralAction.resistedSign > 0 ? 'one-way +' : 'one-way −');
    if ((binding.limitationCodes ?? []).includes('GENERIC_APPROX_GAP_CLOSED')) parts.push('gap');
    if ((binding.limitationCodes ?? []).includes('GENERIC_APPROX_FRICTION_IGNORED')) parts.push('friction');
    const label = parts.join(' ');
    const existing = byNode.get(binding.sourceNodeId);
    byNode.set(binding.sourceNodeId, existing === undefined ? label : `${existing}, ${label}`);
  }
  return byNode;
}

function scaled(value, factor) {
  return typeof value === 'number' && Number.isFinite(value) ? value * factor : null;
}

function offsetFrom(value, offset) {
  return typeof value === 'number' && Number.isFinite(value) ? value - offset : null;
}

function divided(value, divisor) {
  return typeof value === 'number' && Number.isFinite(value) ? value / divisor : null;
}
