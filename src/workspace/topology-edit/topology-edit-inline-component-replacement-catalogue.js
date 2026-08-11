import { deepFreeze } from '../../core/shared-piping-model/index.js';

const COMPONENT_TYPES = new Set(['VALVE', 'FLANGE', 'REDUCER']);
const EPSILON_MM = 1e-9;

export function normalizeTopologyEditReplacementCatalogueBinding(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('TopologyEditInlineReplacement: catalogueBinding must be an object.');
  }
  const componentType = enumText(
    value.componentType,
    COMPONENT_TYPES,
    'catalogueBinding.componentType',
  );
  return deepFreeze({
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
    endConnectionFrom: requiredText(
      value.endConnectionFrom,
      'catalogueBinding.endConnectionFrom',
    ).toUpperCase(),
    endConnectionTo: requiredText(
      value.endConnectionTo,
      'catalogueBinding.endConnectionTo',
    ).toUpperCase(),
    valveType: componentType === 'VALVE'
      ? requiredText(value.valveType, 'catalogueBinding.valveType').toUpperCase() : null,
    valveFaceToFaceMm: componentType === 'VALVE'
      ? positive(value.valveFaceToFaceMm, 'catalogueBinding.valveFaceToFaceMm') : null,
    flangeType: componentType === 'FLANGE'
      ? requiredText(value.flangeType, 'catalogueBinding.flangeType').toUpperCase() : null,
    flangeFacing: componentType === 'FLANGE'
      ? requiredText(value.flangeFacing, 'catalogueBinding.flangeFacing').toUpperCase() : null,
    flangeClass: componentType === 'FLANGE'
      ? requiredText(
        value.flangeClass ?? value.pressureClass,
        'catalogueBinding.flangeClass',
      ).toUpperCase() : null,
    flangeThicknessMm: componentType === 'FLANGE'
      ? positiveMaybe(value.flangeThicknessMm ?? value.componentLengthMm) : null,
    flangeOutsideDiameterMm: componentType === 'FLANGE'
      ? positiveMaybe(value.flangeOutsideDiameterMm ?? value.outsideDiameterMm) : null,
    secondaryNominalSizeMm: componentType === 'REDUCER'
      ? positive(value.secondaryNominalSizeMm, 'catalogueBinding.secondaryNominalSizeMm') : null,
    secondaryOutsideDiameterMm: componentType === 'REDUCER'
      ? positive(
        value.secondaryOutsideDiameterMm,
        'catalogueBinding.secondaryOutsideDiameterMm',
      ) : null,
    reducerType: componentType === 'REDUCER'
      ? requiredText(value.reducerType, 'catalogueBinding.reducerType').toUpperCase() : null,
    reducerOrientation: componentType === 'REDUCER'
      ? requiredText(
        value.reducerOrientation,
        'catalogueBinding.reducerOrientation',
      ).toUpperCase() : null,
    sourceReference: normalizeSourceReference(value.sourceReference),
  });
}

export function assertTopologyEditReplacementCompatibility(
  edge,
  binding,
  geometricLengthMm,
  direction,
) {
  assertPrimarySize(edge, binding);
  compareIfKnown(edge.pipingClass, binding.pipingClass, 'piping class');
  compareIfKnown(edge.pressureClass, binding.pressureClass, 'pressure class');
  const reverse = direction === 'TO_FROM';
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
  if (binding.componentType === 'REDUCER') assertReducerSecondarySize(edge, binding);
  if (binding.componentType !== 'VALVE'
    && !nearlyEqual(geometricLengthMm, binding.componentLengthMm)) {
    throw new RangeError(
      `TopologyEditInlineReplacement: ${binding.componentType} replacement must preserve the current geometric envelope.`,
    );
  }
}

export function topologyEditReplacementFields(binding, reverse) {
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

function assertPrimarySize(edge, binding) {
  const nominal = positiveMaybe(edge.nominalSizeMm);
  if (nominal !== null) {
    if (!nearlyEqual(nominal, binding.nominalSizeMm)) sizeMismatch('nominal size');
    return;
  }
  if (token(edge.diameterAuthority) === 'OUTSIDE_DIAMETER') {
    const outside = positiveMaybe(edge.outsideDiameterMm ?? edge.diameterMm);
    if (outside === null || !nearlyEqual(outside, binding.outsideDiameterMm)) {
      sizeMismatch('outside diameter');
    }
    return;
  }
  const legacyNominal = positiveMaybe(edge.diameterMm);
  if (legacyNominal === null || !nearlyEqual(legacyNominal, binding.nominalSizeMm)) {
    sizeMismatch('nominal size');
  }
}
function assertReducerSecondarySize(edge, binding) {
  const nominal = positiveMaybe(edge.secondaryNominalSizeMm);
  if (nominal !== null) {
    if (!nearlyEqual(nominal, binding.secondaryNominalSizeMm)) {
      sizeMismatch('reducer secondary nominal size');
    }
    return;
  }
  const outside = positiveMaybe(edge.secondaryOutsideDiameterMm);
  if (outside === null || !nearlyEqual(outside, binding.secondaryOutsideDiameterMm)) {
    sizeMismatch('reducer secondary outside diameter');
  }
}
function compareIfKnown(left, right, label) {
  if (left !== null && left !== undefined && String(left).trim()
    && token(left) !== token(right)) {
    throw new RangeError(
      `TopologyEditInlineReplacement: replacement ${label} is incompatible with target component.`,
    );
  }
}
function sizeMismatch(label) {
  throw new RangeError(
    `TopologyEditInlineReplacement: replacement ${label} differs from target component.`,
  );
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
function nearlyEqual(a, b) { return Math.abs(Number(a) - Number(b)) <= EPSILON_MM; }
function token(value) { return String(value ?? '').trim().toUpperCase(); }
function enumText(value, allowed, label) {
  const text = requiredText(value, label).toUpperCase();
  if (!allowed.has(text)) {
    throw new RangeError(`TopologyEditInlineReplacement: unsupported ${label} ${text}.`);
  }
  return text;
}
