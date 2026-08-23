import { semanticHash } from '../shared-piping-model/canonical-json.js';

const AXIS_CUSTODY_TOLERANCE = 1e-12;

export function componentLedgerRow(modelElement, owner, contribution) {
  const { component, entry } = owner;
  return Object.freeze({
    elementId: modelElement.elementId,
    nodeI: modelElement.nodeI,
    nodeJ: modelElement.nodeJ,
    materialStateId: modelElement.materialStateId,
    sectionStateId: modelElement.sectionStateId,
    sourceComponentId: modelElement.sourceAncestry.sourceComponentId,
    localAxisEvidenceIdentity: modelElement.localAxes.evidenceIdentity,
    localAxisResultSemanticHash: entry.frameElement.localAxes.semanticHash,
    frameElementSemanticHash: entry.frameElement.semanticHash,
    globalStiffnessHash: semanticHash(contribution.globalStiffness),
    equivalentLoadHash: semanticHash(contribution.equivalentLoadGlobal),
    initialStrainLoadHash: semanticHash(contribution.initialStrainLoadGlobal),
    distributedPrimitiveIds: Object.freeze(entry.frameElement.appliedLoads
      .filter((row) => row.kind === 'DISTRIBUTED_LOAD')
      .map((row) => row.primitiveId).sort(compareAscii)),
    temperaturePrimitiveId: entry.frameElement.thermal?.primitiveId ?? null,
    stiffnessRelevantLimitationCodes: Object.freeze(entry.frameElement.limitations
      .filter((row) => row.stiffnessRelevant)
      .map((row) => row.code).sort(compareAscii)),
    authorityKind: 'PIPING_COMPONENT',
    pipingComponentId: component.componentId,
    pipingComponentSemanticHash: component.semanticHash,
    pipingComponentProfileSemanticHash: component.profileSemanticHash,
    flexibilityFactorSetId: component.flexibility?.factorSetId ?? null,
    flexibilityFactor: component.flexibility?.factor ?? null,
    flexibilityGeometryBasis: component.flexibility?.geometryBasis ?? null,
    flexibilityDoubleCountGuardAccepted: component.flexibility?.doubleCountGuard?.accepted ?? false,
  });
}

export function frameLedgerRow(
  modelElement,
  frameElement,
  contribution,
  axes,
  distributedByElement,
  temperatureByElement,
) {
  return Object.freeze({
    elementId: modelElement.elementId,
    nodeI: modelElement.nodeI,
    nodeJ: modelElement.nodeJ,
    materialStateId: modelElement.materialStateId,
    sectionStateId: modelElement.sectionStateId,
    sourceComponentId: modelElement.sourceAncestry.sourceComponentId,
    localAxisEvidenceIdentity: modelElement.localAxes.evidenceIdentity,
    localAxisResultSemanticHash: axes.semanticHash,
    frameElementSemanticHash: frameElement.semanticHash,
    globalStiffnessHash: semanticHash(contribution.globalStiffness),
    equivalentLoadHash: semanticHash(contribution.equivalentLoadGlobal),
    initialStrainLoadHash: semanticHash(contribution.initialStrainLoadGlobal),
    distributedPrimitiveIds: Object.freeze((distributedByElement.get(modelElement.elementId) ?? [])
      .map((row) => row.primitiveId).sort(compareAscii)),
    temperaturePrimitiveId: temperatureByElement.get(modelElement.elementId)?.primitiveId ?? null,
    stiffnessRelevantLimitationCodes: Object.freeze(frameElement.limitations
      .filter((row) => row.stiffnessRelevant)
      .map((row) => row.code).sort(compareAscii)),
    authorityKind: 'FRAME_ELEMENT',
    pipingComponentId: null,
    pipingComponentSemanticHash: null,
    pipingComponentProfileSemanticHash: null,
    flexibilityFactorSetId: null,
    flexibilityFactor: null,
    flexibilityGeometryBasis: null,
    flexibilityDoubleCountGuardAccepted: false,
  });
}

export function indexCasePrimitives(loadCase, distributedByElement, temperatureByElement) {
  for (const primitive of loadCase?.primitives ?? []) {
    if (primitive.kind === 'DISTRIBUTED_LOAD') {
      if (!distributedByElement.has(primitive.elementId)) distributedByElement.set(primitive.elementId, []);
      distributedByElement.get(primitive.elementId).push(primitive);
    } else if (primitive.kind === 'TEMPERATURE') {
      if (temperatureByElement.has(primitive.elementId)) {
        throw elementAuthorityError(
          'INPUTXML_EXECUTION_MULTIPLE_TEMPERATURE_PRIMITIVES',
          `Element ${primitive.elementId} has more than one temperature primitive.`,
        );
      }
      temperatureByElement.set(primitive.elementId, primitive);
    }
  }
}

export function requireAxisCustody(element, resolved) {
  for (const axis of ['x', 'y', 'z']) {
    for (let index = 0; index < 3; index += 1) {
      if (Math.abs(element.localAxes[axis][index] - resolved.axes[axis][index]) > AXIS_CUSTODY_TOLERANCE) {
        throw elementAuthorityError(
          'INPUTXML_EXECUTION_LOCAL_AXIS_CUSTODY_MISMATCH',
          `InputXML element ${element.elementId} local-axis custody is inconsistent.`,
        );
      }
    }
  }
}

export function requireContributionIdentity(contribution, elementId) {
  if (!contribution || contribution.elementId !== elementId) {
    throw elementAuthorityError(
      'INPUTXML_COMPONENT_ELEMENT_CONTRIBUTION_MISMATCH',
      `Piping-component contribution for ${elementId} has stale identity.`,
    );
  }
}

export function requireCapabilityProfile(value) {
  requireRecord(value, 'capabilityProfile');
  for (const field of [
    'bendExactMechanics', 'teeExactMechanics', 'reducerExactMechanics',
    'pressureStiffening', 'pressureAxialThrust', 'pressureBourdon', 'pressureCodeStress',
  ]) {
    if (typeof value[field] !== 'boolean') {
      throw elementAuthorityError(
        'INPUTXML_PRODUCTION_CAPABILITY_PROFILE_INVALID',
        `capabilityProfile.${field} must be boolean.`,
      );
    }
  }
  return Object.freeze({ ...value });
}

export function effectiveStiffnessHash(compilation, capabilityProfileHash, factorAuthority, elementLedger) {
  return semanticHash({
    mechanicalStiffnessStateHash: compilation.stiffnessStateHash,
    capabilityProfileHash,
    bendFactorAuthoritySemanticHash: factorAuthority?.semanticHash ?? null,
    elementStiffness: elementLedger.map((row) => ({
      elementId: row.elementId,
      authorityKind: row.authorityKind,
      globalStiffnessHash: row.globalStiffnessHash,
    })),
  });
}

export function position(node) {
  return [node.position.x, node.position.y, node.position.z];
}

export function elementAuthorityError(code, message, data) {
  const error = new TypeError(message);
  error.code = code;
  error.data = data ?? null;
  error.analysisStage = 'INPUTXML_ELEMENT_AUTHORITY';
  return error;
}

export function compareAscii(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw elementAuthorityError(
      'INPUTXML_ELEMENT_AUTHORITY_RECORD_REQUIRED',
      `${field} must be a record.`,
    );
  }
  return value;
}
