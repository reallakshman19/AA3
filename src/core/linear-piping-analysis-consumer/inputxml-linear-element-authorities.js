import {
  FRAME_LOCAL_AXIS_PROFILE,
  resolveFrameLocalAxes,
} from '../centerline-beam-fea/index.js';
import { compileFrameElement } from '../linear-fea-frame-element/index.js';
import {
  elementContributionFromFrameElement,
  elementContributionsFromPipingComponent,
} from '../linear-fea-solver/index.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { augmentPipingComponent } from './gravity-expansion-element-augmentation.js';
import { requireInputXmlLinearStructuralPreparation } from './inputxml-linear-structural-preparation-contract.js';
import { compileInputXmlProductionBendComponents } from './inputxml-production-bend-components.js';
import {
  requireInputXmlProductionBendFactorAuthority,
} from './inputxml-production-bend-factor-authority.js';
import {
  PRODUCTION_CAPABILITY_PROFILE,
  productionBendSourceEligible,
} from './production-capability-profile.js';
import { augmentPipingComponentTemperatureAuthorities } from './thermal-expansion-augmentation.js';

const AXIS_CUSTODY_TOLERANCE = 1e-12;

/**
 * Compile the exact element authority set consumed by stiffness pre-flight,
 * authorized solve and result recovery.
 *
 * Ordinary spans remain B-3.1 frame elements. When the production capability
 * profile enables exact bend mechanics, source-qualified bend chords are owned
 * by sealed B-3.2 piping components instead. The two sets are mutually
 * exclusive and must cover the mechanical model exactly once.
 */
export function compileInputXmlLinearElementAuthorities({
  sourcePreparation,
  structuralPreparation,
  frameProfile,
  loadCase = null,
  bendFactorAuthority = null,
  capabilityProfile = PRODUCTION_CAPABILITY_PROFILE,
}) {
  const structural = requireInputXmlLinearStructuralPreparation(
    structuralPreparation,
    sourcePreparation,
  );
  requireRecord(frameProfile, 'frameProfile');
  const capability = requireCapabilityProfile(capabilityProfile);
  const compilation = structural.compilation;
  const model = compilation.model;
  const modelElementsById = new Map(model.elements.map((row) => [row.elementId, row]));
  const materials = new Map(structural.materialResolutions.map((resolution) => [
    resolution.materialState.materialStateId,
    resolution,
  ]));
  const sections = new Map(structural.sectionResolutions.map((resolution) => [
    resolution.sectionState.sectionStateId,
    resolution,
  ]));
  const nodes = new Map(model.nodes.map((node) => [node.nodeId, node]));
  const distributedByElement = new Map();
  const temperatureByElement = new Map();
  indexCasePrimitives(loadCase, distributedByElement, temperatureByElement);

  let acceptedFactorAuthority = null;
  let pipingComponents = [];
  const eligibleBendCount = (sourcePreparation?.normalizedGeometry?.segments ?? [])
    .filter(productionBendSourceEligible).length;
  if (capability.bendExactMechanics && eligibleBendCount > 0) {
    if (bendFactorAuthority === null || bendFactorAuthority === undefined) {
      throw elementAuthorityError(
        'BEND_FACTOR_EDITION_AUTHORITY_UNRESOLVED',
        'Exact production bend mechanics require an explicit sealed B31/B31J factor authority.',
        { eligibleBendCount },
      );
    }
    acceptedFactorAuthority = requireInputXmlProductionBendFactorAuthority(bendFactorAuthority);
    const compiled = compileInputXmlProductionBendComponents({
      sourcePreparation,
      structuralPreparation: structural,
      frameElementProfile: frameProfile,
      factorAuthority: acceptedFactorAuthority,
    });
    pipingComponents = [...compiled.pipingComponents];
  }

  if (loadCase !== null && pipingComponents.length > 0) {
    pipingComponents = pipingComponents.map((component) => augmentPipingComponent(
      component,
      distributedByElement,
      modelElementsById,
    ));
    pipingComponents = [...augmentPipingComponentTemperatureAuthorities({
      compilation,
      loadCase,
      pipingComponents,
    }).pipingComponents];
  }

  const componentElement = new Map();
  const componentContribution = new Map();
  for (const component of pipingComponents) {
    const contributions = elementContributionsFromPipingComponent(component);
    if (contributions.length !== component.elements.length) {
      throw elementAuthorityError(
        'INPUTXML_COMPONENT_ELEMENT_COVERAGE_INVALID',
        `Piping component ${component.componentId} has inconsistent element contribution coverage.`,
      );
    }
    component.elements.forEach((entry, index) => {
      if (componentElement.has(entry.elementId)) {
        throw elementAuthorityError(
          'INPUTXML_COMPONENT_ELEMENT_AUTHORITY_DUPLICATED',
          `Element ${entry.elementId} is owned by more than one piping component.`,
        );
      }
      componentElement.set(entry.elementId, { component, entry });
      componentContribution.set(entry.elementId, contributions[index]);
    });
  }

  const frameElements = [];
  const elementContributions = [];
  const elementLedger = [];
  for (const element of [...model.elements].sort((left, right) => compareAscii(left.elementId, right.elementId))) {
    const componentOwner = componentElement.get(element.elementId) ?? null;
    if (componentOwner !== null) {
      const contribution = componentContribution.get(element.elementId);
      requireContributionIdentity(contribution, element.elementId);
      elementContributions.push(contribution);
      elementLedger.push(componentLedgerRow(element, componentOwner, contribution));
      continue;
    }

    const material = materials.get(element.materialStateId);
    const section = sections.get(element.sectionStateId);
    const nodeI = nodes.get(element.nodeI);
    const nodeJ = nodes.get(element.nodeJ);
    if (!material || !section || !nodeI || !nodeJ) {
      throw elementAuthorityError(
        'INPUTXML_EXECUTION_ELEMENT_AUTHORITY_STALE',
        `InputXML element ${element.elementId} has stale material/section/node authority bindings.`,
      );
    }
    const axes = resolveFrameLocalAxes({
      nodeI: position(nodeI),
      nodeJ: position(nodeJ),
      referenceVector: [...element.localAxes.y],
      profile: FRAME_LOCAL_AXIS_PROFILE,
    });
    requireAxisCustody(element, axes);
    const frameElement = compileFrameElement({
      elementId: element.elementId,
      material,
      section,
      localAxes: { result: axes, profile: FRAME_LOCAL_AXIS_PROFILE },
      profile: frameProfile,
      distributedLoads: distributedByElement.get(element.elementId) ?? [],
      temperature: temperatureByElement.get(element.elementId) ?? null,
      releases: [],
      endSprings: [],
      rigidOffsets: null,
    });
    const contribution = elementContributionFromFrameElement(frameElement);
    frameElements.push(frameElement);
    elementContributions.push(contribution);
    elementLedger.push(frameLedgerRow(element, frameElement, contribution, axes,
      distributedByElement, temperatureByElement));
  }

  const ledgerIds = new Set(elementLedger.map((row) => row.elementId));
  if (ledgerIds.size !== model.elements.length || elementLedger.length !== model.elements.length) {
    throw elementAuthorityError(
      'INPUTXML_ELEMENT_AUTHORITY_COVERAGE_INVALID',
      'Runtime element authority must cover every compiled mechanical span exactly once.',
      { modelElementCount: model.elements.length, ledgerCount: elementLedger.length },
    );
  }
  elementContributions.sort((left, right) => compareAscii(left.elementId, right.elementId));
  elementLedger.sort((left, right) => compareAscii(left.elementId, right.elementId));
  frameElements.sort((left, right) => compareAscii(left.elementId, right.elementId));
  pipingComponents.sort((left, right) => compareAscii(left.componentId, right.componentId));

  const capabilityProfileHash = semanticHash(capability);
  const effectiveStiffnessStateHash = semanticHash({
    mechanicalStiffnessStateHash: compilation.stiffnessStateHash,
    capabilityProfileHash,
    bendFactorAuthoritySemanticHash: acceptedFactorAuthority?.semanticHash ?? null,
    elementStiffness: elementLedger.map((row) => ({
      elementId: row.elementId,
      authorityKind: row.authorityKind,
      globalStiffnessHash: row.globalStiffnessHash,
    })),
  });

  return Object.freeze({
    frameElements: Object.freeze(frameElements),
    pipingComponents: Object.freeze(pipingComponents),
    elementContributions: Object.freeze(elementContributions),
    elementLedger: Object.freeze(elementLedger),
    capabilityProfileHash,
    bendFactorAuthority: acceptedFactorAuthority,
    bendExactMechanicsApplied: pipingComponents.length > 0,
    eligibleBendCount,
    effectiveStiffnessStateHash,
  });
}

function componentLedgerRow(modelElement, owner, contribution) {
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

function frameLedgerRow(
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

function indexCasePrimitives(loadCase, distributedByElement, temperatureByElement) {
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

function requireAxisCustody(element, resolved) {
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

function requireContributionIdentity(contribution, elementId) {
  if (!contribution || contribution.elementId !== elementId) {
    throw elementAuthorityError(
      'INPUTXML_COMPONENT_ELEMENT_CONTRIBUTION_MISMATCH',
      `Piping-component contribution for ${elementId} has stale identity.`,
    );
  }
}

function requireCapabilityProfile(value) {
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

function position(node) {
  return [node.position.x, node.position.y, node.position.z];
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

function elementAuthorityError(code, message, data) {
  const error = new TypeError(message);
  error.code = code;
  error.data = data ?? null;
  error.analysisStage = 'INPUTXML_ELEMENT_AUTHORITY';
  return error;
}

function compareAscii(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}
