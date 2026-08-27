/**
 * Assembles a real `linear-piping-source-analysis-request/v1` case entry
 * generically from an already-authorized native InputXML pre-flight
 * record, instead of the hand-typed fixture shape
 * `scripts/m003-live-run-analysis-fixture.mjs` builds for one specific
 * benchmark model.
 *
 * Deliberately reuses the pre-flight preparation chain's own output
 * (`sourcePreparation`/`structuralPreparation`/`physicalPreparation` from
 * `prepareInputXmlLinearPreFea`) rather than re-deriving material/section/
 * constraint/load authority from scratch — that chain already compiled a
 * real mechanical model and real W/WP/WT/WPT load-primitive cases from the
 * uploaded source, generically, with no hardcoded node IDs. This module's
 * job is only to re-shape that already-real data into the raw,
 * pre-compile `mechanicalModelInput`/`physicalLoadCaseInput` envelope that
 * `compileLinearPipingInputXmlAnalysisContext` (the real Run path)
 * requires, mirroring `inputxml-linear-structural-preparation.js`'s own
 * internal `compileMechanicalModel(...)` argument construction exactly so
 * the two independently-computed conditioned-topology/source hashes still
 * match.
 *
 * Scope: frame/pipe elements only (`pipingComponents: []`) — piping
 * components (reducers, tees, ...) require selecting a real component
 * profile, which is an engineering judgment call this module does not
 * make generically. `interfaceAuthority`/`nozzleAllowableProfiles`/
 * `b31Authority` are out of scope entirely — see the LFEA revamp plan.
 */
import { FRAME_LOCAL_AXIS_PROFILE, resolveFrameLocalAxes } from '../centerline-beam-fea/index.js';
import { compileFrameElement } from '../linear-fea-frame-element/index.js';
import { frameProfile, recoveryProfile, solverProfile } from './generic-inputxml-solve-model.js';
import { inputXmlLinearPhysicalLoadCaseProfile } from './inputxml-linear-physical-profile.js';
import { inputXmlMechanicalModelCompilerProfile } from './inputxml-linear-structural-profile.js';
import { LINEAR_PIPING_INPUTXML_ANALYSIS_REQUEST_V2_SCHEMA } from './inputxml-source-contract.js';

const SOURCE_ANALYSIS_REQUEST_SCHEMA = 'linear-piping-source-analysis-request/v1';
const DEFAULT_REFERENCE_VECTOR = Object.freeze([0, 0, 1]);

export function buildInputXmlRunRequestCase({
  intake,
  preparation,
  caseId,
  analysisIdentity,
  analysisRevision,
}) {
  requireRecord(intake, 'intake');
  requireRecord(preparation, 'preparation');
  requireText(caseId, 'caseId');
  requireText(analysisIdentity, 'analysisIdentity');
  if (!Number.isInteger(analysisRevision) || analysisRevision < 1) {
    throw runRequestCaseError('INPUTXML_RUN_REQUEST_REVISION_INVALID', 'analysisRevision must be a positive integer.');
  }

  const structuralPreparation = requireRecord(preparation.structuralPreparation, 'preparation.structuralPreparation');
  const physicalPreparation = requireRecord(preparation.physicalPreparation, 'preparation.physicalPreparation');
  const physicalCase = (physicalPreparation.physicalCases ?? []).find((row) => row.caseId === caseId);
  if (!physicalCase) {
    throw runRequestCaseError(
      'INPUTXML_RUN_REQUEST_CASE_UNAVAILABLE',
      `Physical case ${caseId} is not available from this pre-flight's compiled load cases.`,
      { caseId, availableCaseIds: (physicalPreparation.physicalCases ?? []).map((row) => row.caseId) },
    );
  }

  const mechanicalModelInput = buildMechanicalModelInput(intake, structuralPreparation);
  const physicalLoadCaseInput = buildPhysicalLoadCaseInput(physicalCase.loadCase);
  // compileFrameElement() requires already-sealed primitives (retaining
  // `limitations`), unlike compilePhysicalLoadCase()'s raw input — so this
  // uses the case's original sealed primitives, not physicalLoadCaseInput's
  // stripped-for-resealing copies.
  const frameElements = buildFrameElements(structuralPreparation, physicalCase.loadCase.primitives);

  return Object.freeze({
    // v2, not v1: a real uploaded InputXML source is very rarely already
    // declared in metres (mm/in are the common cases), and v1 hard-requires
    // the ingestion unit to already be metres. v2's governed
    // unitNormalizationProfile is exactly the same profile intake already
    // sealed for the source's actual declared/authorized unit.
    schema: LINEAR_PIPING_INPUTXML_ANALYSIS_REQUEST_V2_SCHEMA,
    inputXmlSource: intake.inputXmlSource,
    ingestionOptions: Object.freeze({
      unit: intake.ingestionOptions.unit,
      source: intake.ingestionOptions.source,
      componentOrigins: intake.ingestionOptions.componentOrigins,
      restraintTypeCodeMap: intake.ingestionOptions.restraintTypeCodeMap,
      restraintTypeMutation: intake.ingestionOptions.restraintTypeMutation,
      bendRadiusTolerance: intake.ingestionOptions.bendRadiusTolerance,
      unitNormalizationProfile: intake.ingestionOptions.unitNormalizationProfile,
    }),
    conditioning: intake.conditioning,
    sourceAnalysisRequest: Object.freeze({
      schema: SOURCE_ANALYSIS_REQUEST_SCHEMA,
      analysisIdentity,
      analysisRevision,
      mechanicalModelInput,
      physicalLoadCaseInput,
      frameElements,
      pipingComponents: Object.freeze([]),
      solverProfile: solverProfile(),
      recoveryProfile: recoveryProfile(),
      expectedSourceAuthorities: Object.freeze({
        sourceSemanticHash: intake.inputXmlSource.semanticHash,
        conditionedTopologyHash: structuralPreparation.conditionedTopology.semanticHash,
        compilerProfileSemanticHash: mechanicalModelInput.profile.semanticHash,
        loadCaseProfileSemanticHash: physicalLoadCaseInput.profile.semanticHash,
      }),
    }),
  });
}

function buildMechanicalModelInput(intake, structuralPreparation) {
  const modelId = structuralPreparation.modelId;
  const conditionedTopology = structuralPreparation.conditionedTopology;
  const nodesById = new Map(conditionedTopology.geometry.nodes.map((node) => [String(node.id), node]));
  const nodeBindings = conditionedTopology.geometry.nodes.map((node) => ({
    nodeId: `${modelId}.N${safeId(node.id)}`,
    conditionedNodeId: `CN-${safeId(node.id)}`,
    topologyNodeId: String(node.id),
  }));
  const elementBindings = structuralPreparation.segmentBindings.map((binding) => ({
    elementId: binding.elementId,
    conditionedSegmentId: binding.segmentId,
    topologySegmentId: binding.segmentId,
    materialStateId: binding.materialStateId,
    sectionStateId: binding.sectionStateId,
    formulationId: 'PIPE_FRAME3D_LINEAR_V1',
    localAxisEvidenceIdentity: binding.localAxisEvidenceIdentity,
    sourceComponentId: binding.sourceFeatureId,
  }));
  const localAxisResults = structuralPreparation.segmentBindings.map((binding) => ({
    evidenceIdentity: binding.localAxisEvidenceIdentity,
    result: resolveFrameLocalAxes({
      nodeI: point(nodesById, binding.startNodeId),
      nodeJ: point(nodesById, binding.endNodeId),
      referenceVector: DEFAULT_REFERENCE_VECTOR,
      profile: FRAME_LOCAL_AXIS_PROFILE,
    }),
  }));
  return {
    modelIdentity: `${modelId}-${structuralPreparation.analysisProfileId}`,
    modelRevision: 1,
    // Must equal the raw InputXML source hash the real Run path
    // independently recomputes — not sourcePreparation's own hash — see
    // requireSourceRequestMatchesInputXml in inputxml-source-binding.js.
    sourceSemanticHash: intake.inputXmlSource.semanticHash,
    conditionedTopology,
    nodeBindings,
    elementBindings,
    materialResolutions: structuralPreparation.materialResolutions,
    sectionResolutions: structuralPreparation.sectionResolutions,
    localAxisResults,
    localAxisProfile: FRAME_LOCAL_AXIS_PROFILE,
    constraintDeclarations: structuralPreparation.constraintDeclarations,
    profile: inputXmlMechanicalModelCompilerProfile(),
  };
}

function buildFrameElements(structuralPreparation, primitives) {
  const conditionedTopology = structuralPreparation.conditionedTopology;
  const nodesById = new Map(conditionedTopology.geometry.nodes.map((node) => [String(node.id), node]));
  const materialByStateId = new Map(
    structuralPreparation.materialResolutions.map((row) => [row.materialState.materialStateId, row]),
  );
  const sectionByStateId = new Map(
    structuralPreparation.sectionResolutions.map((row) => [row.sectionState.sectionStateId, row]),
  );
  const distributedByElement = new Map();
  const temperatureByElement = new Map();
  for (const primitive of primitives) {
    if (primitive.kind === 'DISTRIBUTED_LOAD') {
      if (!distributedByElement.has(primitive.elementId)) distributedByElement.set(primitive.elementId, []);
      distributedByElement.get(primitive.elementId).push(primitive);
    }
    if (primitive.kind === 'TEMPERATURE') temperatureByElement.set(primitive.elementId, primitive);
  }
  const profile = frameProfile();
  return Object.freeze(structuralPreparation.segmentBindings.map((binding) => {
    const material = materialByStateId.get(binding.materialStateId);
    const section = sectionByStateId.get(binding.sectionStateId);
    if (!material || !section) {
      throw runRequestCaseError(
        'INPUTXML_RUN_REQUEST_ELEMENT_AUTHORITY_MISSING',
        `Element ${binding.elementId} has no retained material/section resolution.`,
        { elementId: binding.elementId },
      );
    }
    return compileFrameElement({
      elementId: binding.elementId,
      material,
      section,
      localAxes: {
        result: resolveFrameLocalAxes({
          nodeI: point(nodesById, binding.startNodeId),
          nodeJ: point(nodesById, binding.endNodeId),
          referenceVector: DEFAULT_REFERENCE_VECTOR,
          profile: FRAME_LOCAL_AXIS_PROFILE,
        }),
        profile: FRAME_LOCAL_AXIS_PROFILE,
      },
      profile,
      distributedLoads: distributedByElement.get(binding.elementId) ?? [],
      temperature: temperatureByElement.get(binding.elementId) ?? null,
      pressure: null,
      releases: [],
      endSprings: [],
      rigidOffsets: null,
    });
  }));
}

function buildPhysicalLoadCaseInput(loadCase) {
  return {
    loadCaseId: loadCase.loadCaseId,
    loadCaseClass: loadCase.loadCaseClass,
    presentation: loadCase.presentation,
    // sealLoadPrimitive() adds `limitations`/`semanticHash` when the case
    // was first compiled; strip them back off so these can serve as raw
    // primitive input to a fresh compilePhysicalLoadCase() call, which
    // reseals (and recomputes both) itself.
    primitives: loadCase.primitives.map(
      ({ limitations: _limitations, semanticHash: _semanticHash, ...primitive }) => primitive,
    ),
    profile: inputXmlLinearPhysicalLoadCaseProfile(),
  };
}

function point(nodesById, nodeId) {
  const node = nodesById.get(String(nodeId));
  if (!node) {
    throw runRequestCaseError(
      'INPUTXML_RUN_REQUEST_NODE_MISSING',
      `Node ${nodeId} is missing from the conditioned topology.`,
      { nodeId },
    );
  }
  return [node.x, node.y, node.z];
}

function safeId(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]/gu, '-');
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw runRequestCaseError('INPUTXML_RUN_REQUEST_RECORD_REQUIRED', `${field} must be a record.`);
  }
  return value;
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    throw runRequestCaseError('INPUTXML_RUN_REQUEST_TEXT_REQUIRED', `${field} must be a non-empty string.`);
  }
  return value;
}

function runRequestCaseError(code, message, evidence) {
  const error = new TypeError(message);
  error.code = code;
  error.evidence = evidence ?? null;
  return error;
}
