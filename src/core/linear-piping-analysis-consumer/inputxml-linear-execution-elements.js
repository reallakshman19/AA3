import {
  FRAME_LOCAL_AXIS_PROFILE,
  resolveFrameLocalAxes,
} from '../centerline-beam-fea/index.js';
import { compileFrameElement } from '../linear-fea-frame-element/index.js';
import { elementContributionFromFrameElement } from '../linear-fea-solver/index.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { requireInputXmlLinearStructuralPreparation } from './inputxml-linear-structural-preparation-contract.js';

const AXIS_CUSTODY_TOLERANCE = 1e-12;

/**
 * Reconstitute the B-3.1 frame-element evidence required by a physical case
 * from the already-sealed structural model and load case. Geometry, material,
 * section and local-axis authority are never re-authored: the resolved axis is
 * cross-checked against the compiled model before any loaded element is sealed.
 */
export function compileInputXmlExecutionElementAuthorities(
  structuralPreparation,
  frameProfile,
  loadCase,
) {
  const structural = requireInputXmlLinearStructuralPreparation(structuralPreparation);
  const compilation = structural.compilation;
  const model = compilation.model;
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

  for (const primitive of loadCase?.primitives ?? []) {
    if (primitive.kind === 'DISTRIBUTED_LOAD') {
      if (!distributedByElement.has(primitive.elementId)) distributedByElement.set(primitive.elementId, []);
      distributedByElement.get(primitive.elementId).push(primitive);
    } else if (primitive.kind === 'TEMPERATURE') {
      if (temperatureByElement.has(primitive.elementId)) {
        throw executionElementError(
          'INPUTXML_EXECUTION_MULTIPLE_TEMPERATURE_PRIMITIVES',
          `Element ${primitive.elementId} has more than one temperature primitive.`,
        );
      }
      temperatureByElement.set(primitive.elementId, primitive);
    }
  }

  const frameElements = [];
  const elementContributions = [];
  const elementLedger = [];
  for (const element of [...model.elements].sort((left, right) => compareAscii(left.elementId, right.elementId))) {
    const material = materials.get(element.materialStateId);
    const section = sections.get(element.sectionStateId);
    const nodeI = nodes.get(element.nodeI);
    const nodeJ = nodes.get(element.nodeJ);
    if (!material || !section || !nodeI || !nodeJ) {
      throw executionElementError(
        'INPUTXML_EXECUTION_ELEMENT_AUTHORITY_STALE',
        `InputXML execution element ${element.elementId} has stale authority bindings.`,
      );
    }

    // Use the compiled y-axis as the reference vector. This reproduces the
    // already-governed triad without guessing the original source reference;
    // every component is then compared to the sealed compiled triad below.
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
    elementLedger.push(Object.freeze({
      elementId: element.elementId,
      localAxisEvidenceIdentity: element.localAxes.evidenceIdentity,
      localAxisResultSemanticHash: axes.semanticHash,
      frameElementSemanticHash: frameElement.semanticHash,
      globalStiffnessHash: semanticHash(contribution.globalStiffness),
      equivalentLoadHash: semanticHash(contribution.equivalentLoadGlobal),
      initialStrainLoadHash: semanticHash(contribution.initialStrainLoadGlobal),
      distributedPrimitiveIds: Object.freeze((distributedByElement.get(element.elementId) ?? [])
        .map((row) => row.primitiveId).sort(compareAscii)),
      temperaturePrimitiveId: temperatureByElement.get(element.elementId)?.primitiveId ?? null,
    }));
  }

  return Object.freeze({
    frameElements: Object.freeze(frameElements),
    elementContributions: Object.freeze(elementContributions),
    elementLedger: Object.freeze(elementLedger),
  });
}

function requireAxisCustody(element, resolved) {
  for (const axis of ['x', 'y', 'z']) {
    for (let index = 0; index < 3; index += 1) {
      if (Math.abs(element.localAxes[axis][index] - resolved.axes[axis][index]) > AXIS_CUSTODY_TOLERANCE) {
        throw executionElementError(
          'INPUTXML_EXECUTION_LOCAL_AXIS_CUSTODY_MISMATCH',
          `InputXML execution element ${element.elementId} local-axis custody is inconsistent.`,
        );
      }
    }
  }
}

function position(node) {
  return [node.position.x, node.position.y, node.position.z];
}

function compareAscii(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function executionElementError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'INPUTXML_AUTHORIZED_EXECUTION';
  return error;
}
