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
import {
  compareAscii,
  componentLedgerRow,
  effectiveStiffnessHash,
  elementAuthorityError,
  frameLedgerRow,
  indexCasePrimitives,
  position,
  requireAxisCustody,
  requireCapabilityProfile,
  requireContributionIdentity,
} from './inputxml-linear-element-authority-support.js';
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

/**
 * Compile the exact element authority set consumed by stiffness pre-flight,
 * authorized solve and result recovery.
 *
 * Ordinary spans remain B-3.1 frame elements. When the production capability
 * profile enables exact bend mechanics, source-qualified bend chords are owned
 * by sealed B-3.2 piping components instead. The two sets are mutually
 * exclusive and must cover the mechanical model exactly once.
 */
export function compileInputXmlLinearElementAuthorities(input) {
  const request = input ?? {};
  const sourcePreparation = request.sourcePreparation;
  const structuralPreparation = request.structuralPreparation;
  const frameProfile = request.frameProfile;
  const loadCase = request.loadCase === undefined ? null : request.loadCase;
  const bendFactorAuthority = request.bendFactorAuthority === undefined
    ? null
    : request.bendFactorAuthority;
  const capabilityProfile = request.capabilityProfile === undefined
    ? PRODUCTION_CAPABILITY_PROFILE
    : request.capabilityProfile;
  const structural = requireInputXmlLinearStructuralPreparation(
    structuralPreparation,
    sourcePreparation,
  );
  if (!frameProfile || typeof frameProfile !== 'object' || Array.isArray(frameProfile)) {
    throw elementAuthorityError(
      'INPUTXML_ELEMENT_AUTHORITY_RECORD_REQUIRED',
      'frameProfile must be a record.',
    );
  }
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
    if (bendFactorAuthority === null) {
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
    elementLedger.push(frameLedgerRow(
      element,
      frameElement,
      contribution,
      axes,
      distributedByElement,
      temperatureByElement,
    ));
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
  const effectiveStiffnessStateHash = pipingComponents.length === 0
    ? compilation.stiffnessStateHash
    : effectiveStiffnessHash(
      compilation,
      capabilityProfileHash,
      acceptedFactorAuthority,
      elementLedger,
    );

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
