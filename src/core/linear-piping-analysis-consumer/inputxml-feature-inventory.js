import { semanticHash } from '../shared-piping-model/canonical-json.js';
import {
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE as STRICT, DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE as APPROXIMATE,
  exactDisposition, approximationDisposition, unsupportedDisposition, codeOnlyDisposition,
  invalidDisposition, inactiveDisposition,
} from './inputxml-model-health-profile.js';
import {
  NUMERIC_TOLERANCE, classifyRestraint, restraintDispositions, numericAttribute, normalizedNodeAttribute,
} from './inputxml-feature-inventory-restraints.js';
import {
  classifyPredefinedHanger,
  predefinedHangerDispositions,
} from './inputxml-predefined-hanger.js';
import { isSifSlotUnfilled, isForcesMomentsSlotUnfilled } from './inputxml-feature-inventory-slots.js';
import {
  productionAuthorizedPressureEffects,
  productionComponentIsRepresentable,
  productionComponentLimitation,
} from './production-capability-profile.js';

const SIF_TEE_CODES = new Set([3, 5]);

export function buildInputXmlFeatureInventory(sourceBundle) {
  if (!sourceBundle || !Array.isArray(sourceBundle.elementRecords)
    || !Array.isArray(sourceBundle.geometry?.segments)) {
    throw new TypeError('InputXML feature inventory requires a retained source bundle.');
  }
  const stiffnessToSi = sourceBundle.geometry.summary?.inputXmlStiffnessToSiFactor ?? null;
  const lengthUnit = sourceBundle.geometry.summary?.inputXmlLengthUnit
    ?? sourceBundle.geometry.unit
    ?? null;
  const segmentById = new Map(
    sourceBundle.geometry.segments.map((segment) => [String(segment.id), segment]),
  );
  const rows = [];
  for (const element of sourceBundle.elementRecords) {
    const segment = element.canonicalSegmentId === null
      ? null
      : segmentById.get(String(element.canonicalSegmentId)) ?? null;
    const componentKind = componentKindOf(element, segment);
    const componentInventoryId = `${element.sourceFeatureId}/COMPONENT`;
    rows.push(inventoryRow({
      inventoryId: componentInventoryId,
      sourceFeatureId: element.sourceFeatureId,
      sourceKind: 'ELEMENT_COMPONENT',
      active: true,
      sourceIndex: element.sourceIndex,
      targetIds: {
        nodeIds: [element.fromNodeId, element.toNodeId],
        segmentIds: [element.canonicalSegmentId],
      },
      sourceRecord: element,
      classification: {
        componentKind,
        canonicalStatus: element.canonicalStatus,
        canonicalSegmentType: segment?.type ?? element.canonicalSegmentType ?? null,
      },
      dispositions: componentDispositions(componentKind, element.canonicalStatus, segment),
    }));

    for (const feature of element.childFeatures ?? []) {
      rows.push(childInventory({
        element, feature, segment, componentInventoryId, stiffnessToSi, lengthUnit,
      }));
    }
    rows.push(...fieldInventory(element, segment));
  }
  rows.sort((left, right) => compareAscii(left.inventoryId, right.inventoryId));
  requireUniqueInventory(rows);
  return Object.freeze(rows);
}

function childInventory({ element, feature, segment, componentInventoryId, stiffnessToSi, lengthUnit }) {
  const kind = String(feature.kind ?? 'UNKNOWN').toUpperCase();
  const sourceFeatureId = String(feature.sourceFeatureId);
  const common = {
    inventoryId: sourceFeatureId,
    sourceFeatureId,
    sourceKind: kind,
    active: true,
    sourceIndex: element.sourceIndex,
    targetIds: {
      nodeIds: childNodeIds(feature.rawAttributes, element),
      segmentIds: [element.canonicalSegmentId],
    },
    sourceRecord: feature,
  };
  if (['BEND', 'REDUCER', 'RIGID'].includes(kind)) {
    return inventoryRow({
      ...common,
      classification: { kind, mechanicsOwnedByInventoryId: componentInventoryId },
      dispositions: componentDispositions(kind, element.canonicalStatus, segment),
    });
  }
  if (kind === 'SIF') {
    if (isSifSlotUnfilled(feature.rawAttributes)) return unfilledSlotRow(common, kind);
    const typeCode = numericAttribute(feature.rawAttributes, ['TYPE']);
    return inventoryRow({
      ...common,
      classification: { kind, typeCode, codeInputSupported: typeCode !== null && SIF_TEE_CODES.has(typeCode) },
      dispositions: both(codeOnlyDisposition('CODE_STRESS_INPUT_ONLY')),
    });
  }
  if (kind === 'ALLOWABLE_STRESS') {
    return inventoryRow({ ...common, classification: { kind }, dispositions: both(codeOnlyDisposition('CODE_STRESS_INPUT_ONLY')) });
  }
  if (kind === 'HANGER') {
    const classification = classifyPredefinedHanger(feature.rawAttributes, stiffnessToSi, lengthUnit);
    return inventoryRow({
      ...common,
      active: classification.nodeId !== null,
      classification,
      dispositions: predefinedHangerDispositions(classification),
    });
  }
  if (kind === 'FORCES_MOMENTS') {
    if (isForcesMomentsSlotUnfilled(feature.rawAttributes)) return unfilledSlotRow(common, kind);
    return inventoryRow({ ...common, classification: { kind }, dispositions: both(exactDisposition()) });
  }
  if (kind === 'RESTRAINT') {
    const classification = classifyRestraint(feature.rawAttributes, element, segment, stiffnessToSi);
    return inventoryRow({
      ...common,
      active: classification.active,
      classification,
      dispositions: restraintDispositions(classification),
    });
  }
  return inventoryRow({
    ...common,
    classification: { kind },
    dispositions: both(invalidDisposition('MODEL_SOURCE_FEATURE_UNCLASSIFIED')),
  });
}

function fieldInventory(element, segment) {
  const rows = [];
  const temperature = element.fieldEvidence?.TEMP_EXP_C1;
  if (temperature) {
    const active = finiteNumber(temperature.canonicalValue) !== null;
    rows.push(inventoryRow({
      inventoryId: `${element.sourceFeatureId}/FIELD[TEMP_EXP_C1]`,
      sourceFeatureId: `${element.sourceFeatureId}/FIELD[TEMP_EXP_C1]`,
      sourceKind: 'TEMPERATURE_INPUT', active, sourceIndex: element.sourceIndex,
      targetIds: { nodeIds: [], segmentIds: [element.canonicalSegmentId] },
      sourceRecord: temperature,
      classification: {
        field: 'TEMP_EXP_C1', sourceDisposition: temperature.disposition,
        canonicalValue: temperature.canonicalValue,
      },
      dispositions: active ? both(exactDisposition()) : both(inactiveDisposition()),
    }));
  }
  const pressure = element.fieldEvidence?.PRESSURE1;
  if (pressure) {
    const value = finiteNumber(pressure.canonicalValue);
    const active = value !== null && Math.abs(value) > NUMERIC_TOLERANCE;
    rows.push(inventoryRow({
      inventoryId: `${element.sourceFeatureId}/FIELD[PRESSURE1]`,
      sourceFeatureId: `${element.sourceFeatureId}/FIELD[PRESSURE1]`,
      sourceKind: 'PRESSURE_INPUT', active, sourceIndex: element.sourceIndex,
      targetIds: { nodeIds: [], segmentIds: [element.canonicalSegmentId] },
      sourceRecord: pressure,
      classification: {
        field: 'PRESSURE1', sourceDisposition: pressure.disposition,
        canonicalValue: pressure.canonicalValue,
        currentAuthorizedEffects: segment?.meta?.analysis?.pressure == null
          ? null : productionAuthorizedPressureEffects(),
      },
      dispositions: active ? {
        [STRICT]: unsupportedDisposition('MODEL_PRESSURE_STRUCTURAL_EFFECTS_UNREPRESENTED'),
        [APPROXIMATE]: approximationDisposition('GENERIC_APPROX_PRESSURE_CODE_ONLY'),
      } : both(inactiveDisposition()),
    }));
  }
  return rows;
}

function componentKindOf(element, segment) {
  const childKinds = new Set((element.childFeatures ?? []).map((feature) => String(feature.kind).toUpperCase()));
  if (childKinds.has('RIGID') || ['VALVE', 'FLANGE'].includes(segment?.type)) return 'RIGID';
  if (childKinds.has('BEND') || segment?.type === 'BEND') return 'BEND';
  if (childKinds.has('REDUCER')) return 'REDUCER';
  if (segment?.type === 'TEE' || hasTeeSif(element.childFeatures ?? [])) return 'TEE';
  if (segment?.type === 'PIPE') return 'STRAIGHT_PIPE';
  return segment?.type ? String(segment.type) : 'UNRESOLVED';
}

function hasTeeSif(features) {
  return features.some((feature) => (
    String(feature.kind).toUpperCase() === 'SIF'
      && SIF_TEE_CODES.has(numericAttribute(feature.rawAttributes, ['TYPE']))
  ));
}

function componentDispositions(componentKind, canonicalStatus, segment) {
  const resolvedCanonicalStatus = canonicalStatus === undefined ? 'RECONCILED' : canonicalStatus;
  if (resolvedCanonicalStatus !== 'RECONCILED') {
    return both(invalidDisposition('MODEL_COMPONENT_SOURCE_UNRECONCILED'));
  }
  if (componentKind === 'STRAIGHT_PIPE' || componentKind === 'RIGID') return both(exactDisposition());
  const limitation = productionComponentLimitation(componentKind, undefined, segment);
  if (limitation === null) {
    if (!productionComponentIsRepresentable(componentKind)) {
      return both(unsupportedDisposition('MODEL_COMPONENT_TYPE_UNSUPPORTED'));
    }
    return both(exactDisposition());
  }
  return {
    [STRICT]: unsupportedDisposition(`MODEL_${componentKind}_EXACT_MECHANICS_UNAVAILABLE`),
    [APPROXIMATE]: approximationDisposition(limitation),
  };
}

function childNodeIds(attributes, element) {
  const nodeId = normalizedNodeAttribute(attributes, ['NODE', 'NODE_NUM']);
  return [nodeId, element.fromNodeId, element.toNodeId];
}

function unfilledSlotRow(common, kind) {
  return inventoryRow({
    ...common, active: false, classification: { kind, unfilledSlot: true }, dispositions: both(inactiveDisposition()),
  });
}

function inventoryRow(value) {
  return Object.freeze({
    inventoryId: value.inventoryId,
    sourceFeatureId: value.sourceFeatureId,
    sourceKind: value.sourceKind,
    active: value.active,
    sourceIndex: value.sourceIndex,
    targetIds: Object.freeze({
      nodeIds: Object.freeze(uniqueAscii(value.targetIds.nodeIds)),
      segmentIds: Object.freeze(uniqueAscii(value.targetIds.segmentIds)),
    }),
    sourceRecordSemanticHash: semanticHash(value.sourceRecord),
    classification: Object.freeze(value.classification),
    dispositionByProfile: Object.freeze(value.dispositions),
  });
}

function requireUniqueInventory(rows) {
  const ids = new Set();
  for (const row of rows) {
    if (ids.has(row.inventoryId)) throw new TypeError(`InputXML feature inventory identity ${row.inventoryId} is duplicated.`);
    ids.add(row.inventoryId);
  }
}

function both(disposition) {
  return Object.freeze({ [STRICT]: disposition, [APPROXIMATE]: disposition });
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function uniqueAscii(values) {
  return [...new Set((values ?? [])
    .filter((value) => value !== null && value !== undefined)
    .map(String))].sort(compareAscii);
}

function compareAscii(left, right) {
  const a = String(left); const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}
