import {
  elementContributionFromFrameElement,
  elementContributionsFromPipingComponent,
} from '../linear-fea-solver/index.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { augmentPipingComponent } from './gravity-expansion-element-augmentation.js';
import { augmentFrameElementReducer, buildSegmentMetaIndex, reducerGravityRequest, reducerThermalRequest }
  from './reducer-condensation-augmentation.js';
import { REDUCER_PRODUCTION_AUTHORIZATION } from './reducer-production-authorization.js';
import { requireReducerOwnerAuthorization } from '../linear-fea-reducer-condensation/index.js';
import { augmentPipingComponentBourdon } from './bourdon-expansion-augmentation.js';
import {
  compareAscii,
  componentLedgerRow,
  effectiveStiffnessHash,
  elementAuthorityError,
  frameLedgerRow,
  indexCasePrimitives,
  requireCapabilityProfile,
  requireContributionIdentity,
} from './inputxml-linear-element-authority-support.js';
import { compileInputXmlFrameElementAuthority } from './inputxml-linear-frame-authority.js';
import { requireInputXmlLinearStructuralPreparation } from './inputxml-linear-structural-preparation-contract.js';
import { compileInputXmlProductionBendComponents } from './inputxml-production-bend-components.js';
import {
  requireInputXmlProductionBendFactorAuthority,
} from './inputxml-production-bend-factor-authority.js';
import { compileInputXmlProductionBranchModifiers } from './inputxml-production-branch-modifiers.js';
import {
  PRODUCTION_CAPABILITY_PROFILE,
  productionBendSourceEligible,
  productionTeeSourceEligible,
} from './production-capability-profile.js';
import { augmentPipingComponentTemperatureAuthorities } from './thermal-expansion-augmentation.js';

/**
 * Compile the one element-authority set consumed by stiffness pre-flight,
 * authorized solve and result recovery. Bends own generated component chords;
 * B31J tees modify the existing three incident frame spans in place.
 */
export function compileInputXmlLinearElementAuthorities(input) {
  const request = input ?? {};
  const sourcePreparation = requireSourcePreparation(request.sourcePreparation);
  const structuralPreparation = request.structuralPreparation;
  const frameProfile = request.frameProfile;
  const loadCase = request.loadCase === undefined ? null : request.loadCase;
  const bendFactorAuthority = request.bendFactorAuthority === undefined ? null : request.bendFactorAuthority;
  const branchFactorAuthority = request.branchFactorAuthority === undefined ? null : request.branchFactorAuthority;
  const capabilityProfile = request.capabilityProfile === undefined
    ? PRODUCTION_CAPABILITY_PROFILE
    : request.capabilityProfile;
  const structural = requireInputXmlLinearStructuralPreparation(structuralPreparation, sourcePreparation);
  if (!frameProfile || typeof frameProfile !== 'object' || Array.isArray(frameProfile)) {
    throw elementAuthorityError('INPUTXML_ELEMENT_AUTHORITY_RECORD_REQUIRED', 'frameProfile must be a record.');
  }
  const capability = requireCapabilityProfile(capabilityProfile);
  const compilation = structural.compilation;
  const model = compilation.model;
  const modelElementsById = new Map(model.elements.map((row) => [row.elementId, row]));
  const materials = new Map(structural.materialResolutions.map((resolution) => [
    resolution.materialState.materialStateId, resolution,
  ]));
  const sections = new Map(structural.sectionResolutions.map((resolution) => [
    resolution.sectionState.sectionStateId, resolution,
  ]));
  const nodes = new Map(model.nodes.map((node) => [node.nodeId, node]));
  const distributedByElement = new Map();
  const temperatureByElement = new Map();
  const pressureByElement = new Map();
  indexCasePrimitives(loadCase, distributedByElement, temperatureByElement, pressureByElement);

  const eligibleBendCount = sourcePreparation.normalizedGeometry.segments
    .filter(productionBendSourceEligible).length;
  let acceptedBendFactorAuthority = null;
  let pipingComponents = [];
  let bendGeometryByComponent = new Map();
  if (capability.bendExactMechanics && eligibleBendCount > 0) {
    if (bendFactorAuthority === null) {
      throw elementAuthorityError(
        'BEND_FACTOR_EDITION_AUTHORITY_UNRESOLVED',
        'Exact production bend mechanics require an explicit sealed B31/B31J factor authority.',
        { eligibleBendCount },
      );
    }
    acceptedBendFactorAuthority = requireInputXmlProductionBendFactorAuthority(bendFactorAuthority);
    const compiled = compileInputXmlProductionBendComponents({
      sourcePreparation,
      structuralPreparation: structural,
      frameElementProfile: frameProfile,
      factorAuthority: acceptedBendFactorAuthority,
      capabilityProfile: capability,
    });
    pipingComponents = [...compiled.pipingComponents];
    bendGeometryByComponent = compiled.bendGeometryByComponent;
  }

  if (loadCase !== null && pipingComponents.length > 0) {
    pipingComponents = pipingComponents.map((component) => augmentPipingComponent(
      component, distributedByElement, modelElementsById,
    ));
    pipingComponents = [...augmentPipingComponentTemperatureAuthorities({
      compilation, loadCase, pipingComponents,
    }).pipingComponents];
    // Bourdon last: it reads the chord's effective local stiffness, so it must
    // see the element after gravity and thermal have been bound to it.
    if (capability.pressureBourdon === true && bendGeometryByComponent.size > 0) {
      pipingComponents = [...augmentPipingComponentBourdon({
        pipingComponents, bendGeometryByComponent, pressureByElement,
      })];
    }
  }

  const eligibleTeeJunctionCount = sourceTeeJunctionCount(sourcePreparation);
  let acceptedBranchFactorAuthority = null;
  let branchJunctions = [];
  let branchModifierByElementId = new Map();
  if (capability.teeExactMechanics && eligibleTeeJunctionCount > 0) {
    if (branchFactorAuthority === null) {
      throw elementAuthorityError(
        'BRANCH_FACTOR_EDITION_AUTHORITY_UNRESOLVED',
        'Exact production welding-tee mechanics require an explicit sealed B31/B31J branch factor authority.',
        { eligibleTeeJunctionCount },
      );
    }
    const compiled = compileInputXmlProductionBranchModifiers({
      sourcePreparation,
      structuralPreparation: structural,
      factorAuthority: branchFactorAuthority,
    });
    acceptedBranchFactorAuthority = compiled.factorAuthority;
    branchJunctions = [...compiled.junctions];
    branchModifierByElementId = compiled.modifierByElementId;
  }

  const componentElement = new Map();
  const componentContribution = new Map();
  for (const component of pipingComponents) {
    const contributions = elementContributionsFromPipingComponent(component);
    if (contributions.length !== component.elements.length) {
      throw elementAuthorityError('INPUTXML_COMPONENT_ELEMENT_COVERAGE_INVALID',
        `Piping component ${component.componentId} has inconsistent element contribution coverage.`);
    }
    component.elements.forEach((entry, index) => {
      if (componentElement.has(entry.elementId)) {
        throw elementAuthorityError('INPUTXML_COMPONENT_ELEMENT_AUTHORITY_DUPLICATED',
          `Element ${entry.elementId} is owned by more than one piping component.`);
      }
      componentElement.set(entry.elementId, { component, entry });
      componentContribution.set(entry.elementId, contributions[index]);
    });
  }

  const segmentMetaById = buildSegmentMetaIndex(structural, sourcePreparation.normalizedGeometry.segments);
  const frameElements = [];
  const elementContributions = [];
  const elementLedger = [];
  for (const element of [...model.elements].sort((left, right) => compareAscii(left.elementId, right.elementId))) {
    const componentOwner = componentElement.get(element.elementId) ?? null;
    const branchModifier = branchModifierByElementId.get(element.elementId) ?? null;
    if (componentOwner !== null) {
      if (branchModifier !== null) {
        throw elementAuthorityError('INPUTXML_COMPONENT_BRANCH_AUTHORITY_OVERLAP',
          `Element ${element.elementId} cannot be owned by both bend component and tee modifier authority.`);
      }
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
      throw elementAuthorityError('INPUTXML_EXECUTION_ELEMENT_AUTHORITY_STALE',
        `InputXML element ${element.elementId} has stale material/section/node authority bindings.`);
    }
    let built = compileInputXmlFrameElementAuthority({
      element,
      material,
      section,
      nodeI,
      nodeJ,
      frameProfile,
      distributedLoads: distributedByElement.get(element.elementId) ?? [],
      temperature: temperatureByElement.get(element.elementId) ?? null,
      pressure: pressureByElement.get(element.elementId) ?? null,
      temperatureByElement,
      branchModifier,
    });
    // A reducer keeps its element and bindings; only the stiffness and load
    // vectors it carried under the uniform-section approximation are replaced.
    const reducerMeta = capability.reducerExactMechanics === true
      ? (segmentMetaById.get(String(element.elementId))?.reducer ?? null)
      : null;
    if (reducerMeta !== null) {
      requireReducerOwnerAuthorization(REDUCER_PRODUCTION_AUTHORIZATION);
      built = {
        ...built,
        frameElement: augmentFrameElementReducer({
          frameElement: built.frameElement,
          reducerId: String(element.elementId),
          reducer: reducerMeta,
          section: section,
          material: material.materialState,
          gravity: reducerGravityRequest(
            segmentMetaById.get(String(element.elementId)),
            built.frameElement,
            true,
          ),
          thermal: reducerThermalRequest(temperatureByElement.get(element.elementId) ?? null),
          sourceEvidence: {
            sourceId: `REDUCER:${String(element.elementId)}`,
            sourceRevision: String(sourcePreparation.sourceBundleSemanticHash),
            sourceSemanticHash: String(sourcePreparation.semanticHash),
          },
        }),
      };
    }
    const contribution = elementContributionFromFrameElement(built.frameElement);
    frameElements.push(built.frameElement);
    elementContributions.push(contribution);
    elementLedger.push(frameLedgerRow(
      element,
      built.frameElement,
      contribution,
      built.axes,
      distributedByElement,
      temperatureByElement,
      branchModifier,
    ));
  }

  const ledgerIds = new Set(elementLedger.map((row) => row.elementId));
  if (ledgerIds.size !== model.elements.length || elementLedger.length !== model.elements.length) {
    throw elementAuthorityError('INPUTXML_ELEMENT_AUTHORITY_COVERAGE_INVALID',
      'Runtime element authority must cover every compiled mechanical span exactly once.',
      { modelElementCount: model.elements.length, ledgerCount: elementLedger.length });
  }
  elementContributions.sort((left, right) => compareAscii(left.elementId, right.elementId));
  elementLedger.sort((left, right) => compareAscii(left.elementId, right.elementId));
  frameElements.sort((left, right) => compareAscii(left.elementId, right.elementId));
  pipingComponents.sort((left, right) => compareAscii(left.componentId, right.componentId));

  const capabilityProfileHash = semanticHash(capability);
  const bendExactMechanicsApplied = pipingComponents.length > 0;
  const teeExactMechanicsApplied = branchJunctions.length > 0;
  const effectiveStiffnessStateHash = !bendExactMechanicsApplied && !teeExactMechanicsApplied
    ? compilation.stiffnessStateHash
    : effectiveStiffnessHash(
      compilation,
      capabilityProfileHash,
      acceptedBendFactorAuthority,
      acceptedBranchFactorAuthority,
      elementLedger,
    );

  return Object.freeze({
    frameElements: Object.freeze(frameElements),
    pipingComponents: Object.freeze(pipingComponents),
    elementContributions: Object.freeze(elementContributions),
    elementLedger: Object.freeze(elementLedger),
    capabilityProfileHash,
    bendFactorAuthority: acceptedBendFactorAuthority,
    branchFactorAuthority: acceptedBranchFactorAuthority,
    bendExactMechanicsApplied,
    teeExactMechanicsApplied,
    eligibleBendCount,
    eligibleTeeJunctionCount,
    branchJunctions: Object.freeze(branchJunctions),
    effectiveStiffnessStateHash,
  });
}

function sourceTeeJunctionCount(sourcePreparation) {
  const ids = new Set();
  for (const segment of sourcePreparation.normalizedGeometry.segments) {
    if (!productionTeeSourceEligible(segment)) continue;
    for (const sif of segment.meta?.analysis?.sifs ?? []) {
      if (Number(sif.typeCode) === 3 && sif.nodeId != null) ids.add(String(sif.nodeId));
    }
  }
  return ids.size;
}

function requireSourcePreparation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !value.normalizedGeometry || !Array.isArray(value.normalizedGeometry.segments)) {
    throw elementAuthorityError('INPUTXML_ELEMENT_SOURCE_PREPARATION_REQUIRED',
      'Element authority compilation requires retained source preparation with normalized geometry.');
  }
  return value;
}
