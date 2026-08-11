import { deepFreeze, semanticHash } from '../../core/shared-piping-model/index.js';

export const TOPOLOGY_EDIT_INLINE_REPLACEMENT_SCHEMA =
  'TopologyEditInlineComponentReplacement.v1';

const DIRECTIONS = new Set(['FROM_TO', 'TO_FROM']);
const COMPONENT_TYPES = new Set(['VALVE', 'FLANGE', 'REDUCER']);
const EPSILON_MM = 1e-9;

export function normalizeTopologyEditInlineReplacementPayload(input = {}) {
  const binding = normalizeCatalogueBinding(input.catalogueBinding);
  const direction = enumText(input.direction ?? 'FROM_TO', DIRECTIONS, 'direction');
  if (binding.componentType !== 'VALVE' && direction !== 'FROM_TO') {
    throw new RangeError(
      'TopologyEditInlineReplacement: FLANGE/REDUCER replacement requires FROM_TO orientation.',
    );
  }
  const material = {
    schema: TOPOLOGY_EDIT_INLINE_REPLACEMENT_SCHEMA,
    edgeId: requiredText(input.edgeId, 'edgeId'),
    direction,
    lengthAuthority: binding.componentType === 'VALVE'
      ? 'CATALOGUE_VALVE_FACE_TO_FACE' : 'CATALOGUE_COMPONENT_LENGTH',
    catalogueBinding: binding,
  };
  return deepFreeze({ ...material, replacementHash: semanticHash(material) });
}

export function assertTopologyEditInlineReplacementTarget(topology, payloadInput) {
  const payload = normalizeTopologyEditInlineReplacementPayload(payloadInput);
  const edge = exact(topology?.edges, payload.edgeId, 'component edge');
  if (token(edge.entityType) !== payload.catalogueBinding.componentType) {
    throw new RangeError(
      `TopologyEditInlineReplacement: ${edge.id} is not a ${payload.catalogueBinding.componentType} edge.`,
    );
  }
  const from = exact(topology?.nodes, edge.fromNodeId, 'FROM node');
  const to = exact(topology?.nodes, edge.toNodeId, 'TO node');
  const geometricLengthMm = distance(from.position, to.position);
  if (!(geometricLengthMm > EPSILON_MM)) {
    throw new RangeError(`TopologyEditInlineReplacement: ${edge.id} has zero geometric length.`);
  }
  assertCompatible(edge, payload, geometricLengthMm);
  if (edge.catalogueBinding?.recordHash === payload.catalogueBinding.recordHash) {
    throw new RangeError(`TopologyEditInlineReplacement: ${edge.id} replacement is a no-op.`);
  }
  return deepFreeze({ payload, edge, from, to, geometricLengthMm });
}

export function applyTopologyEditInlineReplacement(topology, command) {
  const target = assertTopologyEditInlineReplacementTarget(topology, command.payload);
  const binding = target.payload.catalogueBinding;
  const reverse = target.payload.direction === 'TO_FROM';
  const edges = clone(topology.edges);
  const index = edges.findIndex((edge) => edge.id === target.edge.id);
  edges[index] = {
    ...target.edge,
    ...replacementFields(binding, reverse),
    entityType: binding.componentType,
    lengthAuthority: target.payload.lengthAuthority,
    insertionDirection: target.payload.direction,
    topologyOperation: 'REPLACE_INLINE_COMPONENT',
    catalogueBinding: binding,
    catalogueRecordId: binding.recordId,
    catalogueRecordHash: binding.recordHash,
    catalogueHash: binding.catalogueHash,
    catalogueSourceHash: binding.sourceHash,
    lastModifiedByCommandId: command.commandId,
    editAncestry: uniqueText([
      ...(target.edge.editAncestry ?? []), target.edge.id, command.commandId,
    ]),
  };
  return { ...topology, edges };
}

function assertCompatible(edge, payload, geometricLengthMm) {
  const binding = payload.catalogueBinding;
  assertPrimarySize(edge, binding);
  compareIfKnown(edge.pipingClass, binding.pipingClass, 'piping class');
  compareIfKnown(edge.pressureClass, binding.pressureClass, 'pressure class');
  const reverse = payload.direction === 'TO_FROM';
  compareIfKnown(
    edge.endConnectionFrom,
    reverse ? binding.endConnectionTo : binding.endConnectionFrom,
    'FROM end connection',
  );
  compareIfKnown(
    edge.endConnectionTo,
    reverse ? binding.endConnectionFrom : binding.endConnectionTo,
    'TO end connection',
  );
  if (binding.componentType === 'REDUCER') {
    const secondary = positiveMaybe(edge.secondaryNominalSizeMm ?? edge.secondaryDiameterMm);
    if (secondary === null || !nearlyEqual(secondary, binding.secondaryNominalSizeMm)) {
      throw new RangeError(
        'TopologyEditInlineReplacement: replacement reducer secondary nominal size differs from target reducer.',
      );
    }
  }
  if (binding.componentType !== 'VALVE'
    && !nearlyEqual(geometricLengthMm, binding.componentLengthMm)) {
    throw new RangeError(
      `TopologyEditInlineReplacement: ${binding.componentType} replacement must preserve the current geometric envelope.`,
    );
  }
}

function assertPrimarySize(edge, binding) {
  const edgeNominal = positiveMaybe(edge.nominalSizeMm ?? edge.diameterMm);
  if (edgeNominal === null) {
    throw new RangeError('TopologyEditInlineReplacement: existing component nominal size is unresolved.');
  }
  if (!nearlyEqual(edgeNominal, binding.nominalSizeMm)) {
    throw new RangeError(
      `TopologyEditInlineReplacement: replacement ${binding.componentType} nominal size differs from target component.`,
    );
  }
}

function replacementFields(binding, reverse) {
  const common = {
    diameterMm: binding.nominalSizeMm,
    outsideDiameterMm: binding.outsideDiameterMm,
    diameterAuthority: 'OUTSIDE_DIAMETER',
    componentLengthMm: binding.componentLengthMm,
    componentMassKg: binding.componentMassKg,
    materialSpecification: binding.materialSpecification,
    pressureClass: binding.pressureClass,
    pipingClass: binding.pipingClass,
    endConnectionFrom: reverse ? binding.endConnectionTo : binding.endConnectionFrom,
    endConnectionTo: reverse ? binding.endConnectionFrom : binding.endConnectionTo,
  };
  if (binding.componentType === 'VALVE') return {
    ...common,
    componentLengthMm: binding.valveFaceToFaceMm,
    valveFaceToFaceMm: binding.valveFaceToFaceMm,
    valveType: binding.valveType,
  };
  if (binding.componentType === 'FLANGE') return {
    ...common,
    flangeType: binding.flangeType,
    flangeFacing: binding.flangeFacing,
    flangeClass: binding.flangeClass,
    flangeThicknessMm: binding.flangeThicknessMm,
    flangeOutsideDiameterMm: binding.flangeOutsideDiameterMm,
  };
  return {
    ...common,
    secondaryNominalSizeMm: binding.secondaryNominalSizeMm,
    secondaryOutsideDiameterMm: binding.secondaryOutsideDiameterMm,
    reducerType: binding.reducerType,
    reducerOrientation: binding.reducerOrientation,
  };
}

function normalizeCatalogueBinding(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('TopologyEditInlineReplacement: catalogueBinding must be an object.');
  }
  const componentType = enumText(
    value.componentType,
    COMPONENT_TYPES,
    'catalogueBinding.componentType',
  );
  const material = {
    catalogueHash: requiredText(value.catalogueHash, 'catalogueBinding.catalogueHash'),
    sourceHash: requiredText(value.sourceHash, 'catalogueBinding.sourceHash'),
    recordId: requiredText(value.recordId, 'catalogueBinding.recordId'),
    recordHash: requiredText(value.recordHash, 'catalogueBinding.recordHash'),
    componentType,
    nominalSizeMm: positive(value.nominalSizeMm, 'catalogueBinding.nominalSizeMm'),
    outsideDiameterMm: positive(value.outsideDiameterMm, 'catalogueBinding.outsideDiameterMm'),
    pipingClass: requiredText(value.pipingClass, 'catalogueBinding.pipingClass').toUpperCase(),
    pressureClass: optionalText(value.pressureClass, true),
    materialSpecification: optionalText(value.materialSpecification, true),
    componentMassKg: positiveMaybe(value.componentMassKg),
    componentLengthMm: componentType === 'VALVE'
      ? positive(value.valveFaceToFaceMm, 'catalogueBinding.valveFaceToFaceMm')
      : positive(value.componentLengthMm, 'catalogueBinding.componentLengthMm'),
    endConnectionFrom: requiredText(value.endConnectionFrom, 'catalogueBinding.endConnectionFrom').toUpperCase(),
    endConnectionTo: requiredText(value.endConnectionTo, 'catalogueBinding.endConnectionTo').toUpperCase(),
    valveType: componentType === 'VALVE'
      ? requiredText(value.valveType, 'catalogueBinding.valveType').toUpperCase() : null,
    valveFaceToFaceMm: componentType === 'VALVE'
      ? positive(value.valveFaceToFaceMm, 'catalogueBinding.valveFaceToFaceMm') : null,
    flangeType: componentType === 'FLANGE'
      ? requiredText(value.flangeType, 'catalogueBinding.flangeType').toUpperCase() : null,
    flangeFacing: componentType === 'FLANGE'
      ? requiredText(value.flangeFacing, 'catalogueBinding.flangeFacing').toUpperCase() : null,
    flangeClass: componentType === 'FLANGE'
      ? requiredText(value.flangeClass ?? value.pressureClass, 'catalogueBinding.flangeClass').toUpperCase() : null,
    flangeThicknessMm: componentType === 'FLANGE'
      ? positiveMaybe(value.flangeThicknessMm ?? value.componentLengthMm) : null,
    flangeOutsideDiameterMm: componentType === 'FLANGE'
      ? positiveMaybe(value.flangeOutsideDiameterMm ?? value.outsideDiameterMm) : null,
    secondaryNominalSizeMm: componentType === 'REDUCER'
      ? positive(value.secondaryNominalSizeMm, 'catalogueBinding.secondaryNominalSizeMm') : null,
    secondaryOutsideDiameterMm: componentType === 'REDUCER'
      ? positive(value.secondaryOutsideDiameterMm, 'catalogueBinding.secondaryOutsideDiameterMm') : null,
    reducerType: componentType === 'REDUCER'
      ? requiredText(value.reducerType, 'catalogueBinding.reducerType').toUpperCase() : null,
    reducerOrientation: componentType === 'REDUCER'
      ? requiredText(value.reducerOrientation, 'catalogueBinding.reducerOrientation').toUpperCase() : null,
    sourceReference: normalizeSourceReference(value.sourceReference),
  };
  return deepFreeze(material);
}

function normalizeSourceReference(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('TopologyEditInlineReplacement: sourceReference must be an object.');
  }
  return deepFreeze({
    documentId: requiredText(value.documentId, 'sourceReference.documentId'),
    revision: requiredText(value.revision, 'sourceReference.revision'),
    path: requiredText(value.path, 'sourceReference.path'),
  });
}
function exact(rows, id, label) {
  const matches = (rows ?? []).filter((row) => row?.id === id);
  if (matches.length !== 1) {
    throw new RangeError(
      `TopologyEditInlineReplacement: ${label} ${id} resolved ${matches.length} records.`,
    );
  }
  return matches[0];
}
function compareIfKnown(left, right, label) {
  if (left !== null && left !== undefined && String(left).trim()
    && token(left) !== token(right)) {
    throw new RangeError(
      `TopologyEditInlineReplacement: replacement ${label} is incompatible with target component.`,
    );
  }
}
function requiredText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`TopologyEditInlineReplacement: ${label} is required.`);
  return text;
}
function optionalText(value, uppercase = false) {
  const text = String(value ?? '').trim();
  return text ? (uppercase ? text.toUpperCase() : text) : null;
}
function positive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new RangeError(`TopologyEditInlineReplacement: ${label} must be positive.`);
  }
  return number;
}
function positiveMaybe(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function distance(a, b) { return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); }
function nearlyEqual(a, b) { return Math.abs(Number(a) - Number(b)) <= EPSILON_MM; }
function token(value) { return String(value ?? '').trim().toUpperCase(); }
function enumText(value, allowed, label) {
  const text = requiredText(value, label).toUpperCase();
  if (!allowed.has(text)) {
    throw new RangeError(`TopologyEditInlineReplacement: unsupported ${label} ${text}.`);
  }
  return text;
}
function clone(value) { return JSON.parse(JSON.stringify(value ?? [])); }
function uniqueText(values) {
  return [...new Set(values.map((row) => String(row ?? '').trim()).filter(Boolean))].sort();
}
