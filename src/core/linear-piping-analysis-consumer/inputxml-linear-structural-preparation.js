import {
  FRAME_LOCAL_AXIS_PROFILE,
  conditionGeometry,
  resolveFrameLocalAxes,
} from '../centerline-beam-fea/index.js';
import { compileMechanicalModel } from '../linear-fea-model-compiler/index.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { requireInputXmlModelHealthSource } from '../geometry/model-health/index.js';
import { requireInputXmlLinearModelHealth } from './inputxml-linear-model-health-contract.js';
import { requireInputXmlLinearSolvePreparation } from './inputxml-linear-solve-preparation-contract.js';
import { compileInputXmlStructuralConstraints } from './inputxml-linear-structural-constraints.js';
import { retopologiseDeclaredBends } from './bend-retopology.js';
import {
  INPUTXML_LINEAR_STRUCTURAL_PREPARATION_SCHEMA,
  sealInputXmlLinearStructuralPreparation,
} from './inputxml-linear-structural-preparation-contract.js';
import {
  INPUTXML_LINEAR_BEND_RETOPOLOGY_PROFILE,
  INPUTXML_LINEAR_IDENTITY_CONDITIONING_PROFILE,
  InputXmlLinearStructuralPreparationError,
  inputXmlMechanicalModelCompilerProfile,
  requireInputXmlLinearStructuralProfile,
} from './inputxml-linear-structural-profile.js';

export function compileInputXmlLinearStructure(
  sourceBundle,
  modelHealthReport,
  sourcePreparation,
  options,
) {
  if (options === undefined) options = {};
  const source = requireInputXmlModelHealthSource(sourceBundle);
  const health = requireInputXmlLinearModelHealth(modelHealthReport, source);
  const prepared = requireInputXmlLinearSolvePreparation(sourcePreparation, source, health);
  const profile = requireInputXmlLinearStructuralProfile(prepared.analysisProfileId);
  const capability = health.capabilities
    .find((row) => row.capabilityId === profile.modelCapabilityId) ?? null;
  if (capability === null || capability.status === 'BLOCK') {
    fail(
      'INPUTXML_STRUCTURAL_MODEL_CAPABILITY_BLOCKED',
      `InputXML ${profile.modelCapabilityId} capability blocks structural compilation.`,
      {
        capabilityId: profile.modelCapabilityId,
        findingIds: capability?.findingIds ?? [],
        limitationCodes: capability?.limitationCodes ?? [],
      },
    );
  }

  const modelId = normalizeModelId(options.modelId ?? prepared.modelId);
  const analyticalGeometry = projectInputXmlAnalyticalGeometry(prepared);
  const retopology = retopologiseDeclaredBends(
    analyticalGeometry,
    options.bendRetopologyProfile ?? INPUTXML_LINEAR_BEND_RETOPOLOGY_PROFILE,
  );
  const conditionedTopology = conditionGeometry(
    retopology.geometry,
    [],
    options.conditioningProfile ?? INPUTXML_LINEAR_IDENTITY_CONDITIONING_PROFILE,
  );
  requireExplainedConditioning(analyticalGeometry, conditionedTopology.geometry, retopology);

  const materialByHash = new Map(prepared.materialResolutions
    .map((row) => [row.semanticHash, row]));
  const sectionByHash = new Map(prepared.sectionResolutions
    .map((row) => [row.semanticHash, row]));
  const authorityBindingBySegment = new Map(prepared.segmentBindings
    .map((row) => [row.segmentId, row]));
  const sourceSegmentById = new Map(prepared.normalizedGeometry.segments
    .map((row) => [String(row.id), row]));
  const nodesById = new Map(conditionedTopology.geometry.nodes
    .map((row) => [String(row.id), row]));

  // A bend chord carries no authority of its own: it inherits the binding of
  // the source span it was cut from, and the chord ordinal keeps its element id
  // unique. Without the ordinal every chord of one bend would compile under the
  // same element id and the model compiler would reject the model.
  const chordOrdinal = new Map();
  const segmentBindings = conditionedTopology.geometry.segments.map((segment) => {
    const segmentId = String(segment.id);
    const originId = retopology.spanOrigin.get(segmentId)
      ?? (segment.meta?.parentSegmentId == null ? segmentId : String(segment.meta.parentSegmentId));
    const authority = authorityBindingBySegment.get(originId) ?? null;
    const sourceSegment = sourceSegmentById.get(originId) ?? null;
    if (authority === null || sourceSegment === null) {
      fail(
        'INPUTXML_STRUCTURAL_SEGMENT_AUTHORITY_MISSING',
        `Conditioned segment ${segmentId} has no retained authority binding.`,
        { segmentId, originId },
      );
    }
    const isChord = originId !== segmentId;
    let chordIndex = null;
    if (isChord) {
      chordIndex = (chordOrdinal.get(originId) ?? 0) + 1;
      chordOrdinal.set(originId, chordIndex);
    }
    const material = materialByHash.get(authority.materialResolutionSemanticHash) ?? null;
    const section = sectionByHash.get(authority.analysisSectionSemanticHash) ?? null;
    if (material === null || section === null) {
      fail(
        'INPUTXML_STRUCTURAL_STATE_AUTHORITY_MISSING',
        `Segment ${segmentId} has stale material or section authority.`,
        { segmentId },
      );
    }
    const elementId = isChord
      ? `${modelId}.E${authority.sourceIndex + 1}.B${chordIndex}`
      : `${modelId}.E${authority.sourceIndex + 1}`;
    return Object.freeze({
      segmentId,
      elementId,
      parentSegmentId: isChord ? originId : null,
      bendChordIndex: chordIndex,
      sourceFeatureId: authority.sourceFeatureId,
      sourceIndex: authority.sourceIndex,
      componentKind: authority.componentKind,
      representabilityDisposition: authority.representabilityDisposition,
      limitationCode: authority.limitationCode,
      materialStateId: material.materialState.materialStateId,
      sectionStateId: section.sectionState.sectionStateId,
      materialResolutionSemanticHash: material.semanticHash,
      materialResolutionEvidenceHash: material.evidenceHash,
      physicalSectionSemanticHash: authority.physicalSectionSemanticHash,
      analysisSectionSemanticHash: section.semanticHash,
      rigidAuthoritySemanticHash: authority.rigidAuthoritySemanticHash,
      localAxisEvidenceIdentity: `AXIS-${elementId}`,
      startNodeId: String(segment.startNodeId),
      endNodeId: String(segment.endNodeId),
    });
  });

  const constraints = compileInputXmlStructuralConstraints({
    inventory: health.inventory,
    modelId,
    analysisProfileId: prepared.analysisProfileId,
  });
  const referenceVector = requireReferenceVector(options.referenceVector ?? [0, 0, 1]);
  const localAxisResults = segmentBindings.map((binding) => ({
    evidenceIdentity: binding.localAxisEvidenceIdentity,
    result: resolveFrameLocalAxes({
      nodeI: point(nodesById, binding.startNodeId),
      nodeJ: point(nodesById, binding.endNodeId),
      referenceVector,
      profile: FRAME_LOCAL_AXIS_PROFILE,
    }),
  }));
  const compilation = compileMechanicalModel({
    modelIdentity: `${modelId}-${prepared.analysisProfileId}`,
    modelRevision: 1,
    sourceSemanticHash: prepared.semanticHash,
    conditionedTopology,
    nodeBindings: conditionedTopology.geometry.nodes.map((node) => ({
      nodeId: `${modelId}.N${safe(node.id)}`,
      conditionedNodeId: `CN-${safe(node.id)}`,
      topologyNodeId: String(node.id),
    })),
    elementBindings: segmentBindings.map((binding) => ({
      elementId: binding.elementId,
      conditionedSegmentId: binding.segmentId,
      topologySegmentId: binding.segmentId,
      materialStateId: binding.materialStateId,
      sectionStateId: binding.sectionStateId,
      formulationId: 'PIPE_FRAME3D_LINEAR_V1',
      localAxisEvidenceIdentity: binding.localAxisEvidenceIdentity,
      sourceComponentId: binding.sourceFeatureId,
    })),
    materialResolutions: prepared.materialResolutions,
    sectionResolutions: prepared.sectionResolutions,
    localAxisResults,
    localAxisProfile: FRAME_LOCAL_AXIS_PROFILE,
    constraintDeclarations: constraints.declarations,
    profile: inputXmlMechanicalModelCompilerProfile(),
  });

  const limitations = uniqueAscii([
    ...prepared.limitations,
    ...capability.limitationCodes,
    ...segmentBindings.map((row) => row.limitationCode),
    ...constraints.bindings.map((row) => row.limitationCode),
    ...compilation.limitations.map((row) => row.code),
  ]);

  return sealInputXmlLinearStructuralPreparation({
    schema: INPUTXML_LINEAR_STRUCTURAL_PREPARATION_SCHEMA,
    preparationId: `IXSTRUCT-${semanticHash({
      sourcePreparation: prepared.semanticHash,
      modelId,
      compilation: compilation.semanticHash,
    })}`,
    modelId,
    analysisProfileId: prepared.analysisProfileId,
    modelCapabilityStatus: capability.status,
    sourcePreparationSemanticHash: prepared.semanticHash,
    sourcePreparationEvidenceHash: prepared.evidenceHash,
    sourceBundleSemanticHash: prepared.sourceBundleSemanticHash,
    sourceBundleEvidenceHash: prepared.sourceBundleEvidenceHash,
    modelHealthSemanticHash: health.semanticHash,
    modelHealthEvidenceHash: health.evidenceHash,
    conditionedTopology,
    materialResolutions: prepared.materialResolutions,
    sectionResolutions: prepared.sectionResolutions,
    rigidAuthorities: prepared.rigidAuthorities,
    segmentBindings: Object.freeze(segmentBindings),
    constraintDeclarations: constraints.declarations,
    constraintBindings: constraints.bindings,
    compilation,
    limitations,
    summary: Object.freeze({
      nodeCount: compilation.model.nodes.length,
      elementCount: compilation.model.elements.length,
      constraintCount: compilation.model.constraints.length,
      materialStateCount: compilation.model.materialStates.length,
      sectionStateCount: compilation.model.sectionStates.length,
      mechanicalModelSemanticHash: compilation.mechanicalModelSemanticHash,
      stiffnessStateHash: compilation.stiffnessStateHash,
    }),
    executionBoundary: Object.freeze({
      constraintsCompiled: true,
      mechanicalModelCompiled: true,
      loadPrimitivesCompiled: false,
      stiffnessAssembled: false,
      factorizationCreated: false,
      solveAuthorized: false,
      reasonCodes: Object.freeze([
        'PHYSICAL_LOAD_CASE_PREPARATION_DEFERRED',
        'STIFFNESS_PREFLIGHT_DEFERRED',
      ]),
    }),
  });
}

function projectInputXmlAnalyticalGeometry(prepared) {
  const bindingBySegment = new Map(prepared.segmentBindings
    .map((row) => [String(row.segmentId), row]));
  const segments = prepared.normalizedGeometry.segments.map((segment) => {
    const binding = bindingBySegment.get(String(segment.id)) ?? null;
    if (binding?.limitationCode !== 'GENERIC_APPROX_BEND_STRAIGHT_CHORD') return segment;
    // A bend whose arc is placeable keeps its declared type and geometry so the
    // re-topology pass below can represent the curvature. Retyping every bend to
    // PIPE here is what made "bends are modelled as straight pieces" true: the
    // curvature was discarded at preparation and then reported downstream as a
    // limitation of the solver. A bend with no resolvable arc still degrades to
    // a straight chord, and still says so, because that is a real limitation of
    // that model's data rather than of this path.
    if (placeableBendArc(segment)) return segment;
    return Object.freeze({
      ...segment,
      type: 'PIPE',
      meta: Object.freeze({
        ...(segment.meta ?? {}),
        inputXmlSourceType: segment.type,
        analysisApproximation: 'GENERIC_APPROX_BEND_STRAIGHT_CHORD',
      }),
    });
  });
  return Object.freeze({
    ...prepared.normalizedGeometry,
    nodes: prepared.normalizedGeometry.nodes,
    segments: Object.freeze(segments),
  });
}

function placeableBendArc(segment) {
  const meta = segment?.meta ?? {};
  const point = (value) => Boolean(value)
    && [value.x, value.y, value.z].every((n) => typeof n === 'number' && Number.isFinite(n));
  return point(meta.bendArcCentre) && point(meta.bendTangentStart) && point(meta.bendTangentEnd);
}

/**
 * Every conditioned span must trace to exactly one retained source segment.
 *
 * This replaces an identity check that required the conditioned span id list to
 * equal the source list. That guarantee cannot survive representing a bend as
 * an element chain, but the custody question behind it still has to be
 * answered: nothing may appear in the analysis model that did not come from the
 * source. So instead of requiring the lists to match, each conditioned span
 * must declare the source span it came from, and every source span must still
 * be represented. An unexplained or orphaned span fails closed exactly as an
 * identity mismatch did.
 */
function requireExplainedConditioning(sourceGeometry, conditionedGeometry, retopology) {
  const sourceIds = new Set(sourceGeometry.segments.map((row) => String(row.id)));
  const covered = new Set();
  const unexplained = [];
  for (const segment of conditionedGeometry.segments) {
    const id = String(segment.id);
    const declared = retopology.spanOrigin.get(id)
      ?? (segment.meta?.parentSegmentId == null ? null : String(segment.meta.parentSegmentId));
    const origin = sourceIds.has(id) ? id : declared;
    if (origin === null || !sourceIds.has(origin)) {
      unexplained.push(id);
      continue;
    }
    covered.add(origin);
  }
  const unrepresented = [...sourceIds].filter((id) => !covered.has(id)).sort(compareAscii);
  if (unexplained.length > 0 || unrepresented.length > 0) {
    fail(
      'INPUTXML_STRUCTURAL_CONDITIONING_CHANGED_SPAN_CUSTODY',
      'Every conditioned span must trace to exactly one retained source segment.',
      {
        unexplainedConditionedSegmentIds: unexplained.sort(compareAscii).slice(0, 12),
        unrepresentedSourceSegmentIds: unrepresented.slice(0, 12),
      },
    );
  }
}

function point(nodesById, nodeId) {
  const node = nodesById.get(String(nodeId)) ?? null;
  if (node === null) {
    fail('INPUTXML_STRUCTURAL_NODE_MISSING', `Node ${nodeId} is missing from conditioned geometry.`, { nodeId });
  }
  return [node.x, node.y, node.z];
}

function requireReferenceVector(value) {
  if (!Array.isArray(value) || value.length !== 3
    || value.some((entry) => typeof entry !== 'number' || !Number.isFinite(entry))
    || Math.hypot(...value) === 0) {
    throw new TypeError('InputXML structural referenceVector must contain three finite nonzero components.');
  }
  return Object.freeze([...value]);
}

function normalizeModelId(value) {
  const text = String(value ?? '').trim();
  if (!/^[A-Za-z0-9_.-]+$/u.test(text)) {
    throw new TypeError('InputXML structural modelId is invalid.');
  }
  return text;
}

function fail(code, message, data) {
  throw new InputXmlLinearStructuralPreparationError(message, code, data);
}

function safe(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]/gu, '-');
}

function uniqueAscii(values) {
  return [...new Set(values.filter(Boolean).map(String))].sort(compareAscii);
}

function compareAscii(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}
