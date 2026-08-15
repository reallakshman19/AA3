import {
  deepFreeze,
  semanticHash,
  stringValue,
} from '../../../core/shared-piping-model/index.js';
import { validatePipingPortTopologyGraph } from '../../../core/piping-topology/index.js';
import {
  validateRestraintCapabilityModel,
  validateSupportAttachmentModel,
} from '../../../core/support-restraints/index.js';
import { requirePipeSectionResolution } from '../../../core/linear-fea-section/index.js';
import {
  solveRootedTreeThermalRestraintCompatibility,
} from '../../../core/empirical-piping-mechanics/index.js';
import {
  STAGEDJSON_BASELINE_TEMPERATURE_K,
  materializeStagedJsonMaterialResolutions,
  requireStagedJsonProcessAuthority,
} from '../../analysis-authority-overlay/index.js';
import {
  requirePreproductionThermalLiftoffDisplacementAuthority,
} from '../preproduction-thermal-liftoff-displacement-authority.js';
import {
  requireSjsonEmpiricalPipingRequest,
} from './sjson-to-empirical-piping-request.js';

export const EMPIRICAL_CANONICAL_THERMAL_ROM_SCHEMA =
  'empirical-canonical-thermal-rom-compatibility/v1';

const MM_TO_M = 1 / 1000;
const POINT_TOLERANCE_M = 1e-9;
const TEMPERATURE_TOLERANCE_K = 1e-9;
const UNIT_VECTOR_TOLERANCE = 1e-12;
const SUPPORTED_DIRECTIONS = Object.freeze(['VERTICAL', 'LATERAL', 'LONGITUDINAL']);
const ACTIVE_BILATERAL_STATES = Object.freeze(['RESTRAINED', 'SPRING']);

/**
 * Experimental authority bridge for the analytical piping ROM.
 *
 * This function does not read raw SJSON, infer topology, invent temperatures,
 * choose a CTE, assume zero support movement, assemble a finite-element model,
 * or register/publish a production calculation method.
 */
export function executeCanonicalThermalRomCompatibility(input) {
  exactKeys(input, [
    'dataset',
    'adaptedRequest',
    'topologyGraph',
    'supportAttachmentModel',
    'restraintCapabilityModel',
    'processAuthorities',
    'materialSectionAuthority',
    'supportMovementAuthorities',
    'selection',
    'options',
  ], 'canonical thermal ROM input');

  const request = requireSjsonEmpiricalPipingRequest(input.adaptedRequest);
  const topologyGraph = requireTopology(input.topologyGraph);
  const attachmentModel = requireAttachments(input.supportAttachmentModel);
  const restraintModel = requireRestraints(input.restraintCapabilityModel);
  const dataset = requireDataset(input.dataset, request.datasetId);
  const selection = requireSelection(input.selection, request);
  assertCurrentness({ request, topologyGraph, attachmentModel, restraintModel });

  const sourceErrors = (request.blockers || []).filter((row) => row.severity === 'ERROR');
  if (sourceErrors.length) {
    throw coded(
      'EMPIRICAL_CANONICAL_AUTHORITY_REQUEST_BLOCKED',
      'The normalized empirical request contains unresolved authority blockers.',
      { blockers: sourceErrors },
    );
  }

  const occurrenceById = uniqueIndex(
    request.restraintOccurrences,
    (row) => row.restraintId,
    'restraint occurrences',
  );
  const rootOccurrence = requiredIndexed(
    occurrenceById,
    selection.rootRestraintId,
    'root restraint occurrence',
  );
  const coordinateOccurrences = selection.coordinateRestraintIds.map((restraintId) => (
    requiredIndexed(occurrenceById, restraintId, 'coordinate restraint occurrence')
  ));

  requireRootAnchor(rootOccurrence);
  coordinateOccurrences.forEach(requireBilateralCoordinateOccurrence);
  const region = requireOneExactStraightRegion(
    topologyGraph,
    [rootOccurrence, ...coordinateOccurrences],
  );
  requireOccurrenceCoverage(request.restraintOccurrences, region, selection);

  const processByEntityId = requireProcessAuthorities(input.processAuthorities, dataset);
  const materialAuthority = requireMaterialSectionAuthority(input.materialSectionAuthority);
  const materialResolutions = materializeStagedJsonMaterialResolutions(materialAuthority);
  const materialResolutionByStateId = uniqueIndex(
    materialResolutions,
    (row) => row.materialState.materialStateId,
    'material resolutions',
  );

  const propertyAuthority = buildComponentPropertyAuthority({
    request,
    topologyGraph,
    region,
    processByEntityId,
    materialAuthority,
    materialResolutionByStateId,
  });

  const selectedOccurrences = [rootOccurrence, ...coordinateOccurrences];
  const route = buildSplitStraightTree({
    topologyGraph,
    attachmentModel,
    region,
    selectedOccurrences,
    propertyByComponentKey: propertyAuthority.propertyByComponentKey,
  });

  const movementBySite = requireMovementAuthorities(
    input.supportMovementAuthorities,
    selectedOccurrences,
    selection.loadCaseId,
  );
  const rootMovement = movementVector(requiredIndexed(
    movementBySite,
    rootOccurrence.supportSiteId,
    'root support movement authority',
  ));

  const coordinates = coordinateOccurrences.map((occurrence) => {
    const axis = requireUnitAxis(
      occurrence.effectiveCapability?.axis,
      `restraint ${occurrence.restraintId} axis`,
    );
    const movementAuthority = requiredIndexed(
      movementBySite,
      occurrence.supportSiteId,
      'coordinate support movement authority',
    );
    const supportMovement = movementVector(movementAuthority);
    const targetDisplacementM = dot(subtract(supportMovement, rootMovement), axis);
    const state = stateForDirection(occurrence.effectiveCapability);
    const stiffness = occurrence.effectiveCapability?.stiffnessNPerM;
    const supportStiffnessNPerM = stiffness === null || stiffness === undefined
      ? null
      : requirePositive(stiffness, `restraint ${occurrence.restraintId} stiffnessNPerM`);
    if (state === 'SPRING' && supportStiffnessNPerM === null) {
      throw coded(
        'EMPIRICAL_CANONICAL_AUTHORITY_SPRING_STIFFNESS_MISSING',
        `Restraint ${occurrence.restraintId} is SPRING but has no governed stiffness.`,
      );
    }
    return deepFreeze({
      coordinateId: occurrence.restraintId,
      nodeId: requiredIndexed(
        route.nodeByAttachmentId,
        occurrence.attachmentId,
        'coordinate attachment node',
      ),
      direction: axis,
      targetDisplacementM,
      supportStiffnessNPerM,
    });
  });

  const rootNodeId = requiredIndexed(
    route.nodeByAttachmentId,
    rootOccurrence.attachmentId,
    'root attachment node',
  );
  const mechanics = solveRootedTreeThermalRestraintCompatibility({
    nodes: route.nodes,
    segments: route.segments,
    rootNodeId,
    coordinates,
    options: input.options || {},
  });

  const movementBindings = selectedOccurrences.map((occurrence) => {
    const authority = requiredIndexed(
      movementBySite,
      occurrence.supportSiteId,
      'support movement authority',
    );
    return deepFreeze({
      restraintId: occurrence.restraintId,
      supportSiteId: occurrence.supportSiteId,
      displacementAuthoritySemanticHash: authority.semanticHash,
      supportDisplacementM: authority.supportDisplacementM,
      pipeDisplacementConsumed: false,
    });
  }).sort(byField('restraintId'));

  const material = {
    schema: EMPIRICAL_CANONICAL_THERMAL_ROM_SCHEMA,
    datasetId: request.datasetId,
    loadCaseId: selection.loadCaseId,
    rootRestraintId: selection.rootRestraintId,
    coordinateRestraintIds: [...selection.coordinateRestraintIds],
    authorityBindings: {
      adaptedRequestSemanticHash: request.semanticHash,
      topologyGraphSemanticHash: topologyGraph.semanticHash,
      supportAttachmentModelSemanticHash: attachmentModel.semanticHash,
      restraintCapabilityModelSemanticHash: restraintModel.semanticHash,
      materialSectionAuthoritySemanticHash: materialAuthority.semanticHash,
      processAuthoritySemanticHashes: [...processByEntityId.values()]
        .map((row) => row.semanticHash).sort(),
      movementAuthoritySemanticHashes: movementBindings
        .map((row) => row.displacementAuthoritySemanticHash).sort(),
    },
    routeEvidence: route.evidence,
    componentPropertyAuthority: propertyAuthority.evidence,
    movementBindings,
    mechanics,
    policy: {
      solutionClass: 'ANALYTICAL_FLEXIBILITY_FORCE_METHOD_ROM',
      finiteElementSolverConsumed: false,
      finiteElementGlobalStiffnessAssembled: false,
      linearFeaPropertyResolversConsumedOnlyAsSealedMaterialSectionAuthority: true,
      rawSjsonConsumed: false,
      toleranceInferredTopologyConsumed: false,
      guessedTemperaturePermitted: false,
      guessedThermalExpansionPermitted: false,
      implicitZeroSupportMovementPermitted: false,
      gapOrContactLinearizationPermitted: false,
      empiricalResponseMultiplierConsumed: false,
      productionCalculationConsumptionEnabled: false,
      productionMethodRegistrationPermitted: false,
      finalEngineeringPublicationPermitted: false,
    },
  };
  return deepFreeze({ ...material, semanticHash: semanticHash(material) });
}

function assertCurrentness({ request, topologyGraph, attachmentModel, restraintModel }) {
  if (topologyGraph.datasetId !== request.datasetId
      || attachmentModel.datasetId !== request.datasetId
      || restraintModel.datasetId !== request.datasetId) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_DATASET_MISMATCH', 'Canonical authorities do not share one datasetId.');
  }
  if (request.sourceBindings.topologyHash !== topologyGraph.semanticHash
      || request.sourceBindings.attachmentHash !== attachmentModel.semanticHash
      || request.sourceBindings.restraintHash !== restraintModel.semanticHash
      || request.sourceBindings.sharedModelHash !== topologyGraph.sharedModelSemanticHash
      || request.sourceBindings.sharedModelHash !== attachmentModel.sharedModelSemanticHash
      || request.sourceBindings.sharedModelHash !== restraintModel.sharedModelSemanticHash) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_STALE_BINDING', 'Adapted request is stale for supplied topology/support/restraint authority.');
  }
  if (attachmentModel.topologySemanticHash !== topologyGraph.semanticHash
      || restraintModel.attachmentModelSemanticHash !== attachmentModel.semanticHash) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_CHAIN_MISMATCH', 'Support/restraint authority chain is stale.');
  }
}

function requireTopology(value) {
  const validation = validatePipingPortTopologyGraph(value);
  if (!validation.ok) throw new TypeError(`Invalid piping topology graph: ${validation.errors.join(' ')}`);
  if (value.profile?.allowToleranceInference !== false
      || value.connections.some((row) => row.evidenceType === 'TOLERANCE_INFERRED')) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_TOLERANCE_TOPOLOGY_REJECTED', 'Canonical thermal ROM requires exact topology; tolerance-inferred connections are prohibited.');
  }
  if ((value.summary?.ambiguousPortCount || 0) > 0) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_AMBIGUOUS_PORT_REJECTED', 'Ambiguous topology ports are outside the canonical thermal ROM domain.');
  }
  return value;
}

function requireAttachments(value) {
  const validation = validateSupportAttachmentModel(value);
  if (!validation.ok) throw new TypeError(`Invalid support attachment model: ${validation.errors.join(' ')}`);
  return value;
}

function requireRestraints(value) {
  const validation = validateRestraintCapabilityModel(value);
  if (!validation.ok) throw new TypeError(`Invalid restraint capability model: ${validation.errors.join(' ')}`);
  return value;
}

function requireDataset(value, expectedDatasetId) {
  if (!value || value.schema !== 'analysis-workspace-dataset/v1'
      || !Array.isArray(value.entities) || stringValue(value.datasetId) !== expectedDatasetId) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_DATASET_INVALID', 'Active normalized dataset is required and must match the empirical request datasetId.');
  }
  return value;
}

function requireSelection(value, request) {
  exactKeys(value, ['loadCaseId', 'rootRestraintId', 'coordinateRestraintIds'], 'canonical thermal ROM selection');
  const loadCaseId = requiredText(value.loadCaseId, 'selection.loadCaseId');
  const loadCase = request.loadCases.find((row) => row.loadCaseId === loadCaseId);
  if (!loadCase) throw coded('EMPIRICAL_CANONICAL_AUTHORITY_LOAD_CASE_MISSING', `Load case ${loadCaseId} is absent from the governed request.`);
  if (!loadCase.effects?.thermalStrain || loadCase.effects.weight
      || loadCase.effects.pressureCompatibility || loadCase.effects.pressureStress) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_LOAD_OWNERSHIP_INVALID', 'Canonical thermal ROM accepts a thermal-strain-only governed load case in this phase.');
  }
  const coordinateRestraintIds = uniqueTextList(
    value.coordinateRestraintIds,
    'selection.coordinateRestraintIds',
  );
  const rootRestraintId = requiredText(value.rootRestraintId, 'selection.rootRestraintId');
  if (coordinateRestraintIds.includes(rootRestraintId)) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_ROOT_DUPLICATED', 'Root restraint cannot also be a compatibility coordinate.');
  }
  return deepFreeze({ loadCaseId, rootRestraintId, coordinateRestraintIds });
}

function requireRootAnchor(occurrence) {
  if (!isAnchor(occurrence.effectiveCapability?.type)) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_ROOT_NOT_ANCHOR', `Root restraint ${occurrence.restraintId} must be a governed anchor.`);
  }
  rejectContactFields(occurrence);
  const states = occurrence.effectiveCapability?.translationalStates || {};
  if (['vertical', 'lateral', 'longitudinal'].some((key) => states[key] !== 'RESTRAINED')) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_ROOT_NOT_RIGID', `Root anchor ${occurrence.restraintId} must be restrained in all three translational states.`);
  }
  if (occurrence.effectiveCapability?.stiffnessNPerM !== null
      && occurrence.effectiveCapability?.stiffnessNPerM !== undefined) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_ROOT_FINITE_STIFFNESS_UNSUPPORTED', 'Root reference anchor must be rigid in this phase.');
  }
}

function requireBilateralCoordinateOccurrence(occurrence) {
  rejectContactFields(occurrence);
  if (isAnchor(occurrence.effectiveCapability?.type)) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_MULTI_AXIS_ANCHOR_UNSUPPORTED', `Non-root anchor ${occurrence.restraintId} requires a future multi-axis coordinate expansion.`);
  }
  const direction = stringValue(occurrence.effectiveCapability?.direction).toUpperCase();
  if (!SUPPORTED_DIRECTIONS.includes(direction)) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_DIRECTION_UNSUPPORTED', `Restraint ${occurrence.restraintId} direction ${direction || 'UNRESOLVED'} is outside the current bilateral coordinate domain.`);
  }
  const axis = requireUnitAxis(occurrence.effectiveCapability?.axis, `restraint ${occurrence.restraintId} axis`);
  void axis;
  const state = stateForDirection(occurrence.effectiveCapability);
  if (!ACTIVE_BILATERAL_STATES.includes(state)) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_STATE_UNSUPPORTED', `Restraint ${occurrence.restraintId} state ${state || 'UNRESOLVED'} is not bilateral linear.`);
  }
  if (state === 'SPRING') {
    requirePositive(occurrence.effectiveCapability?.stiffnessNPerM, `restraint ${occurrence.restraintId} stiffnessNPerM`);
  }
}

function rejectContactFields(occurrence) {
  const capability = occurrence.effectiveCapability || {};
  if (capability.gapMm !== null && capability.gapMm !== undefined) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_GAP_UNSUPPORTED', `Restraint ${occurrence.restraintId} carries gap authority; contact is outside this phase.`);
  }
  if (Number.isFinite(capability.friction) && capability.friction !== 0) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_FRICTION_UNSUPPORTED', `Restraint ${occurrence.restraintId} carries nonzero friction authority.`);
  }
}

function stateForDirection(capability) {
  const direction = stringValue(capability?.direction).toUpperCase();
  const states = capability?.translationalStates || {};
  return direction === 'VERTICAL' ? states.vertical
    : direction === 'LATERAL' ? states.lateral
      : direction === 'LONGITUDINAL' ? states.longitudinal
        : null;
}

function requireOneExactStraightRegion(graph, occurrences) {
  const hostKeys = new Set(occurrences.map((row) => requiredText(row.hostEntityId, `restraint ${row.restraintId} hostEntityId`)));
  const candidates = graph.connectedComponents.filter((region) => (
    [...hostKeys].every((key) => region.componentKeys.includes(key))
  ));
  if (candidates.length !== 1) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_REGION_UNRESOLVED', 'Selected restraints must resolve to exactly one connected topology region.');
  }
  const region = candidates[0];
  if (region.cyclic === true) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_LOOP_UNSUPPORTED', 'Closed-loop topology is outside the rooted reference-tree phase.');
  }
  const componentByKey = new Map(graph.components.map((row) => [row.componentKey, row]));
  for (const componentKey of region.componentKeys) {
    const component = componentByKey.get(componentKey);
    if (!component || stringValue(component.type).toUpperCase() !== 'PIPE'
        || !Array.isArray(component.portKeys) || component.portKeys.length !== 2) {
      throw coded('EMPIRICAL_CANONICAL_AUTHORITY_COMPONENT_UNSUPPORTED', `Region component ${componentKey} is not a two-port straight PIPE.`);
    }
  }
  return region;
}

function requireOccurrenceCoverage(allOccurrences, region, selection) {
  const regionSet = new Set(region.componentKeys);
  const expected = allOccurrences
    .filter((row) => regionSet.has(row.hostEntityId))
    .map((row) => row.restraintId).sort();
  const selected = [selection.rootRestraintId, ...selection.coordinateRestraintIds].sort();
  if (JSON.stringify(expected) !== JSON.stringify(selected)) {
    throw coded(
      'EMPIRICAL_CANONICAL_AUTHORITY_RESTRAINT_COVERAGE_MISMATCH',
      'Current phase requires explicit coverage of every governed restraint occurrence in the selected region; no physical restraint may be silently omitted.',
      { expectedRestraintIds: expected, selectedRestraintIds: selected },
    );
  }
}

function requireProcessAuthorities(values, dataset) {
  if (!Array.isArray(values) || values.length === 0) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_PROCESS_MISSING', 'Process authorities must be a non-empty array.');
  }
  const byEntityId = new Map();
  for (const value of values) {
    const authority = requireStagedJsonProcessAuthority(value, { dataset });
    if (byEntityId.has(authority.scope.entityId)) {
      throw coded('EMPIRICAL_CANONICAL_AUTHORITY_PROCESS_DUPLICATE', `Duplicate process authority for ${authority.scope.entityId}.`);
    }
    byEntityId.set(authority.scope.entityId, authority);
  }
  return byEntityId;
}

function requireMaterialSectionAuthority(value) {
  if (!value || value.schema !== 'stagedjson-material-section-authority/v1'
      || !Array.isArray(value.entityResolutions) || !Array.isArray(value.materials)
      || !stringValue(value.branchId) || !stringValue(value.semanticHash)) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_MATERIAL_SECTION_INVALID', 'A sealed stagedjson-material-section-authority/v1 is required.');
  }
  const { semanticHash: actual, ...payload } = value;
  if (actual !== semanticHash(payload)) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_MATERIAL_SECTION_HASH_MISMATCH', 'Material/section authority semantic hash mismatch.');
  }
  return value;
}

function buildComponentPropertyAuthority(context) {
  const requestComponentByKey = uniqueIndex(context.request.components, (row) => row.componentKey, 'request components');
  const entityResolutionById = uniqueIndex(
    context.materialAuthority.entityResolutions,
    (row) => row.entityId,
    'material/section entity resolutions',
  );
  const propertyByComponentKey = new Map();
  const evidence = [];

  for (const componentKey of [...context.region.componentKeys].sort()) {
    const component = requiredIndexed(requestComponentByKey, componentKey, 'request component');
    const sourceEntityId = requiredText(component.sourceEntityId, `component ${componentKey} sourceEntityId`);
    const process = requiredIndexed(context.processByEntityId, sourceEntityId, 'process authority');
    if (process.scope.branchId !== context.materialAuthority.branchId) {
      throw coded('EMPIRICAL_CANONICAL_AUTHORITY_BRANCH_MISMATCH', `Process/material authority branch mismatch for ${sourceEntityId}.`);
    }
    const referenceK = temperatureToK(requireDeclaredField(process.fields.referenceTemperature, `${sourceEntityId}.referenceTemperature`));
    const operatingK = temperatureToK(requireDeclaredField(process.fields.operatingTemperature, `${sourceEntityId}.operatingTemperature`));
    if (Math.abs(referenceK - STAGEDJSON_BASELINE_TEMPERATURE_K) > TEMPERATURE_TOLERANCE_K) {
      throw coded(
        'EMPIRICAL_CANONICAL_AUTHORITY_REFERENCE_NOT_CTE_BASELINE',
        `Entity ${sourceEntityId} reference temperature ${referenceK} K does not equal the current approved mean-CTE baseline ${STAGEDJSON_BASELINE_TEMPERATURE_K} K.`,
      );
    }

    const entityResolution = requiredIndexed(entityResolutionById, sourceEntityId, 'material/section entity resolution');
    const operatingStateRef = entityResolution.materialStates?.OPERATING;
    if (!operatingStateRef) {
      throw coded('EMPIRICAL_CANONICAL_AUTHORITY_OPERATING_MATERIAL_STATE_MISSING', `Entity ${sourceEntityId} has no sealed OPERATING material state.`);
    }
    if (Math.abs(operatingStateRef.evaluationTemperatureK - operatingK) > TEMPERATURE_TOLERANCE_K) {
      throw coded('EMPIRICAL_CANONICAL_AUTHORITY_OPERATING_TEMPERATURE_MISMATCH', `Entity ${sourceEntityId} process/material operating temperatures differ.`);
    }
    const materialResolution = requiredIndexed(
      context.materialResolutionByStateId,
      operatingStateRef.materialStateId,
      'operating material resolution',
    );
    if (materialResolution.semanticHash !== operatingStateRef.resolutionSemanticHash
        || materialResolution.evidenceHash !== operatingStateRef.resolutionEvidenceHash) {
      throw coded('EMPIRICAL_CANONICAL_AUTHORITY_MATERIAL_RECEIPT_MISMATCH', `Entity ${sourceEntityId} operating material receipt is stale.`);
    }
    const sectionResolution = requirePipeSectionResolution(entityResolution.sectionResolution);
    if (sectionResolution.semanticHash !== entityResolution.sectionResolutionSemanticHash) {
      throw coded('EMPIRICAL_CANONICAL_AUTHORITY_SECTION_RECEIPT_MISMATCH', `Entity ${sourceEntityId} section receipt is stale.`);
    }
    const state = materialResolution.materialState;
    const section = sectionResolution.sectionState;
    const properties = deepFreeze({
      elasticModulusPa: requirePositive(state.elasticModulus, `${sourceEntityId}.elasticModulus`),
      shearModulusPa: requirePositive(state.shearModulus, `${sourceEntityId}.shearModulus`),
      areaM2: requirePositive(section.area, `${sourceEntityId}.section.area`),
      secondMomentYM4: requirePositive(section.secondMomentY, `${sourceEntityId}.section.secondMomentY`),
      secondMomentZM4: requirePositive(section.secondMomentZ, `${sourceEntityId}.section.secondMomentZ`),
      torsionConstantM4: requirePositive(section.polarMoment, `${sourceEntityId}.section.polarMoment`),
    });
    if (properties.secondMomentYM4 !== properties.secondMomentZM4) {
      throw coded('EMPIRICAL_CANONICAL_AUTHORITY_SECTION_NOT_AXISYMMETRIC', `Entity ${sourceEntityId} section is not exactly circular/axisymmetric.`);
    }
    const thermal = deepFreeze({
      referenceTemperatureC: referenceK - 273.15,
      analysisTemperatureC: operatingK - 273.15,
      expansionCoefficientPerK: requireNonNegative(
        state.thermalExpansionCoefficient,
        `${sourceEntityId}.thermalExpansionCoefficient`,
      ),
      coefficientBasis: 'APPROVED_MEAN_BETWEEN_REFERENCE_AND_ANALYSIS',
    });
    propertyByComponentKey.set(componentKey, deepFreeze({ properties, thermal }));
    evidence.push(deepFreeze({
      componentKey,
      sourceEntityId,
      processAuthorityId: process.processAuthorityId,
      processAuthoritySemanticHash: process.semanticHash,
      processAuthorityEvidenceHash: process.evidenceHash,
      materialStateId: state.materialStateId,
      materialResolutionSemanticHash: materialResolution.semanticHash,
      materialResolutionEvidenceHash: materialResolution.evidenceHash,
      sectionStateId: section.sectionStateId,
      sectionResolutionSemanticHash: sectionResolution.semanticHash,
      referenceTemperatureK: referenceK,
      operatingTemperatureK: operatingK,
      thermalExpansionCoefficientPerK: thermal.expansionCoefficientPerK,
      thermalExpansionBasis: thermal.coefficientBasis,
    }));
  }
  return deepFreeze({ propertyByComponentKey, evidence: evidence.sort(byField('componentKey')) });
}

function buildSplitStraightTree({ topologyGraph, attachmentModel, region, selectedOccurrences, propertyByComponentKey }) {
  const componentSet = new Set(region.componentKeys);
  const components = topologyGraph.components.filter((row) => componentSet.has(row.componentKey));
  const portById = uniqueIndex(topologyGraph.ports, (row) => row.portKey, 'topology ports');
  const allPortIds = components.flatMap((component) => component.portKeys);
  const dsu = createDisjointSet(allPortIds);
  topologyGraph.connections.forEach((connection) => {
    if (dsu.parent.has(connection.portAKey) && dsu.parent.has(connection.portBKey)) {
      union(dsu, connection.portAKey, connection.portBKey);
    }
  });

  const groups = new Map();
  allPortIds.forEach((portId) => {
    const root = find(dsu, portId);
    const rows = groups.get(root) || [];
    rows.push(portId);
    groups.set(root, rows);
  });
  const nodeByPortId = {};
  const nodesById = new Map();
  [...groups.values()].forEach((portIds) => {
    const sorted = [...portIds].sort();
    const points = sorted.map((portId) => mmPointToM(requiredIndexed(portById, portId, 'topology port').positionCanonical, `topology port ${portId}`));
    points.slice(1).forEach((point) => {
      if (distance(points[0], point) > POINT_TOLERANCE_M) {
        throw coded('EMPIRICAL_CANONICAL_AUTHORITY_JOINT_POSITION_CONFLICT', `Connected topology joint ${sorted[0]} has conflicting positions.`);
      }
    });
    const nodeId = `NODE:${sorted[0]}`;
    sorted.forEach((portId) => { nodeByPortId[portId] = nodeId; });
    nodesById.set(nodeId, deepFreeze({ id: nodeId, pointM: points[0] }));
  });

  const attachmentById = uniqueIndex(attachmentModel.attachments, (row) => row.attachmentId, 'support attachments');
  const selectedAttachmentRows = selectedOccurrences.map((occurrence) => {
    const attachment = requiredIndexed(attachmentById, occurrence.attachmentId, 'selected support attachment');
    if (attachment.attachedComponentKey !== occurrence.hostEntityId) {
      throw coded('EMPIRICAL_CANONICAL_AUTHORITY_ATTACHMENT_HOST_MISMATCH', `Restraint ${occurrence.restraintId} attachment/host binding is stale.`);
    }
    return { occurrence, attachment };
  });
  const attachmentsByComponent = groupBy(selectedAttachmentRows, (row) => row.attachment.attachedComponentKey);
  const nodeByAttachmentId = new Map();
  const segments = [];
  const segmentBindings = [];

  for (const component of components.sort(byField('componentKey'))) {
    const portA = requiredIndexed(portById, component.portKeys[0], 'component port A');
    const portB = requiredIndexed(portById, component.portKeys[1], 'component port B');
    const aMm = requirePointMm(portA.positionCanonical, `${component.componentKey}.portA`);
    const bMm = requirePointMm(portB.positionCanonical, `${component.componentKey}.portB`);
    const chord = subtract(bMm, aMm);
    const chord2 = dot(chord, chord);
    if (!(chord2 > 0)) throw coded('EMPIRICAL_CANONICAL_AUTHORITY_COMPONENT_ZERO_LENGTH', `Component ${component.componentKey} has zero length.`);

    const stationRows = (attachmentsByComponent.get(component.componentKey) || []).map((row) => {
      const projected = requirePointMm(row.attachment.projectedPointCanonical, `attachment ${row.attachment.attachmentId} projected point`);
      const parameter = dot(subtract(projected, aMm), chord) / chord2;
      const reconstructed = add(aMm, scale(chord, parameter));
      if (parameter < -1e-12 || parameter > 1 + 1e-12
          || distance(scale(projected, MM_TO_M), scale(reconstructed, MM_TO_M)) > POINT_TOLERANCE_M) {
        throw coded('EMPIRICAL_CANONICAL_AUTHORITY_ATTACHMENT_OFF_COMPONENT', `Attachment ${row.attachment.attachmentId} is not on its governed straight component centerline.`);
      }
      return { ...row, parameter: clamp01(parameter), pointMm: projected };
    }).sort((left, right) => left.parameter - right.parameter
      || left.attachment.attachmentId.localeCompare(right.attachment.attachmentId));

    const groupsAtStation = [];
    for (const row of stationRows) {
      const existing = groupsAtStation.find((group) => distance(
        scale(group.pointMm, MM_TO_M),
        scale(row.pointMm, MM_TO_M),
      ) <= POINT_TOLERANCE_M);
      if (existing) existing.rows.push(row);
      else groupsAtStation.push({ parameter: row.parameter, pointMm: row.pointMm, rows: [row] });
    }
    const stations = [
      { parameter: 0, pointMm: aMm, nodeId: nodeByPortId[component.portKeys[0]], rows: [] },
      ...groupsAtStation.map((group, index) => ({ ...group, nodeId: `NODE:SPLIT:${component.componentKey}:${index + 1}` })),
      { parameter: 1, pointMm: bMm, nodeId: nodeByPortId[component.portKeys[1]], rows: [] },
    ].sort((left, right) => left.parameter - right.parameter || left.nodeId.localeCompare(right.nodeId));

    // Coalesce support stations that exactly coincide with a component endpoint.
    for (const station of stations.slice(1, -1)) {
      if (distance(scale(station.pointMm, MM_TO_M), scale(aMm, MM_TO_M)) <= POINT_TOLERANCE_M) {
        station.nodeId = nodeByPortId[component.portKeys[0]];
      } else if (distance(scale(station.pointMm, MM_TO_M), scale(bMm, MM_TO_M)) <= POINT_TOLERANCE_M) {
        station.nodeId = nodeByPortId[component.portKeys[1]];
      } else if (!nodesById.has(station.nodeId)) {
        nodesById.set(station.nodeId, deepFreeze({ id: station.nodeId, pointM: scale(station.pointMm, MM_TO_M) }));
      }
      station.rows.forEach((row) => nodeByAttachmentId.set(row.attachment.attachmentId, station.nodeId));
    }

    const uniqueStations = [];
    for (const station of stations) {
      const prior = uniqueStations.at(-1);
      if (prior && prior.nodeId === station.nodeId) {
        station.rows?.forEach((row) => nodeByAttachmentId.set(row.attachment.attachmentId, prior.nodeId));
        continue;
      }
      uniqueStations.push(station);
    }
    const authority = requiredIndexed(propertyByComponentKey, component.componentKey, 'component material/property authority');
    for (let index = 0; index < uniqueStations.length - 1; index += 1) {
      const left = uniqueStations[index];
      const right = uniqueStations[index + 1];
      if (left.nodeId === right.nodeId) continue;
      const segmentId = `${component.componentKey}::ROM::${index + 1}`;
      segments.push(deepFreeze({
        segmentId,
        nodeAId: left.nodeId,
        nodeBId: right.nodeId,
        properties: structuredClone(authority.properties),
        thermal: structuredClone(authority.thermal),
      }));
      segmentBindings.push(deepFreeze({
        segmentId,
        sourceComponentKey: component.componentKey,
        sourceParameterRange: [left.parameter, right.parameter],
      }));
    }
  }

  selectedAttachmentRows.forEach((row) => {
    if (!nodeByAttachmentId.has(row.attachment.attachmentId)) {
      // Endpoint attachments are resolved here if their station group was coalesced.
      const component = components.find((item) => item.componentKey === row.attachment.attachedComponentKey);
      const point = requirePointMm(row.attachment.projectedPointCanonical, 'selected attachment projected point');
      for (const portKey of component.portKeys) {
        const portPoint = requirePointMm(requiredIndexed(portById, portKey, 'selected component port').positionCanonical, 'selected component port point');
        if (distance(scale(point, MM_TO_M), scale(portPoint, MM_TO_M)) <= POINT_TOLERANCE_M) {
          nodeByAttachmentId.set(row.attachment.attachmentId, nodeByPortId[portKey]);
          break;
        }
      }
    }
    requiredIndexed(nodeByAttachmentId, row.attachment.attachmentId, 'selected attachment node');
  });

  return deepFreeze({
    nodes: [...nodesById.values()].sort(byField('id')),
    segments: segments.sort(byField('segmentId')),
    nodeByAttachmentId,
    evidence: {
      topologyAuthority: 'VALIDATED_EXACT_PIPING_PORT_TOPOLOGY_GRAPH',
      supportStationAuthority: 'VALIDATED_SUPPORT_ATTACHMENT_PROJECTED_POINT',
      selectedRegionId: region.connectedComponentId,
      sourceComponentCount: components.length,
      analyticalSpanCount: segments.length,
      supportStationSplitCreatesFiniteElements: false,
      toleranceInferredTopologyConsumed: false,
      pointConsistencyToleranceM: POINT_TOLERANCE_M,
      segmentBindings: segmentBindings.sort(byField('segmentId')),
    },
  });
}

function requireMovementAuthorities(values, occurrences, loadCaseId) {
  if (!Array.isArray(values) || values.length === 0) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_MOVEMENT_MISSING', 'Explicit source-backed support-movement authority is required for root and every coordinate restraint.');
  }
  const bySite = new Map();
  values.forEach((value) => {
    const authority = requirePreproductionThermalLiftoffDisplacementAuthority(value);
    if (authority.qualification !== 'QUALIFIED') {
      throw coded('EMPIRICAL_CANONICAL_AUTHORITY_MOVEMENT_UNQUALIFIED', `Support movement ${authority.supportSiteId} is not QUALIFIED.`);
    }
    if (authority.loadCaseId !== loadCaseId) {
      throw coded('EMPIRICAL_CANONICAL_AUTHORITY_MOVEMENT_LOAD_CASE_MISMATCH', `Support movement ${authority.supportSiteId} is bound to another load case.`);
    }
    if (bySite.has(authority.supportSiteId)) {
      throw coded('EMPIRICAL_CANONICAL_AUTHORITY_MOVEMENT_DUPLICATE', `Duplicate movement authority for ${authority.supportSiteId}.`);
    }
    bySite.set(authority.supportSiteId, authority);
  });
  const expected = occurrences.map((row) => row.supportSiteId).sort();
  const actual = [...bySite.keys()].sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw coded(
      'EMPIRICAL_CANONICAL_AUTHORITY_MOVEMENT_COVERAGE_MISMATCH',
      'Movement authority must cover exactly the root and solved restraint support sites; no missing movement becomes zero.',
      { expectedSupportSiteIds: expected, actualSupportSiteIds: actual },
    );
  }
  return bySite;
}

function movementVector(authority) {
  const value = authority.supportDisplacementM;
  return [
    requireFinite(value.x, `${authority.supportSiteId}.supportDisplacementM.x`),
    requireFinite(value.y, `${authority.supportSiteId}.supportDisplacementM.y`),
    requireFinite(value.z, `${authority.supportSiteId}.supportDisplacementM.z`),
  ];
}

function requireDeclaredField(field, label) {
  if (!field || field.status !== 'DECLARED' || !Number.isFinite(field.value)
      || !['degC', 'K'].includes(field.unit) || !stringValue(field.sourceEntityId)
      || !Array.isArray(field.evidence) || field.evidence.length === 0) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_PROCESS_FIELD_UNRESOLVED', `${label} must be explicitly DECLARED with retained source evidence.`);
  }
  return field;
}

function temperatureToK(field) {
  return field.unit === 'K' ? field.value : field.value + 273.15;
}

function requireUnitAxis(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !Number.isFinite(item))) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_AXIS_INVALID', `${label} must be a finite three-vector.`);
  }
  const norm = Math.hypot(...value);
  if (Math.abs(norm - 1) > UNIT_VECTOR_TOLERANCE) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_AXIS_NOT_UNIT', `${label} must be unit length within ${UNIT_VECTOR_TOLERANCE}.`);
  }
  return deepFreeze([...value]);
}

function requirePointMm(value, label) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.z)) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_POINT_INVALID', `${label} must be a finite canonical millimetre point.`);
  }
  return [value.x, value.y, value.z];
}

function mmPointToM(value, label) {
  return scale(requirePointMm(value, label), MM_TO_M);
}

function isAnchor(value) {
  const type = stringValue(value).toUpperCase();
  return /ANCHOR/.test(type) || /(^|_)ANC(HOR)?($|_)/.test(type);
}

function createDisjointSet(ids) {
  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) {
    throw coded('EMPIRICAL_CANONICAL_AUTHORITY_PORT_OWNERSHIP_DUPLICATE', 'Component port ownership must be unique within the selected region.');
  }
  return { parent: new Map(unique.map((id) => [id, id])), rank: new Map(unique.map((id) => [id, 0])) };
}
function find(dsu, value) {
  const parent = dsu.parent.get(value);
  if (parent === value) return value;
  const root = find(dsu, parent);
  dsu.parent.set(value, root);
  return root;
}
function union(dsu, left, right) {
  let a = find(dsu, left);
  let b = find(dsu, right);
  if (a === b) return;
  const ar = dsu.rank.get(a);
  const br = dsu.rank.get(b);
  if (ar < br) [a, b] = [b, a];
  dsu.parent.set(b, a);
  if (ar === br) dsu.rank.set(a, ar + 1);
}

function uniqueIndex(values, keyOf, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array.`);
  const map = new Map();
  values.forEach((value) => {
    const key = requiredText(keyOf(value), `${label} key`);
    if (map.has(key)) throw coded('EMPIRICAL_CANONICAL_AUTHORITY_DUPLICATE_IDENTITY', `${label} contains duplicate ${key}.`);
    map.set(key, value);
  });
  return map;
}
function requiredIndexed(map, key, label) {
  if (!key || !map.has(key)) throw coded('EMPIRICAL_CANONICAL_AUTHORITY_REFERENCE_MISSING', `${label} ${key || '<missing>'} is unresolved.`);
  return map.get(key);
}
function groupBy(values, keyOf) {
  const map = new Map();
  values.forEach((value) => {
    const key = keyOf(value);
    const rows = map.get(key) || [];
    rows.push(value);
    map.set(key, rows);
  });
  return map;
}
function uniqueTextList(values, label) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError(`${label} must be a non-empty array.`);
  const rows = values.map((value, index) => requiredText(value, `${label}[${index}]`)).sort();
  if (new Set(rows).size !== rows.length) throw new TypeError(`${label} must be unique.`);
  return deepFreeze(rows);
}
function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    throw new TypeError(`${label} contains unexpected or missing keys.`);
  }
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`${label} must be a non-empty string.`);
  return text;
}
function requireFinite(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  return value;
}
function requirePositive(value, label) {
  const number = requireFinite(value, label);
  if (!(number > 0)) throw new RangeError(`${label} must be positive.`);
  return number;
}
function requireNonNegative(value, label) {
  const number = requireFinite(value, label);
  if (number < 0) throw new RangeError(`${label} must be non-negative.`);
  return number;
}
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function add(left, right) { return left.map((value, index) => value + right[index]); }
function scale(vector, factor) { return vector.map((value) => value * factor); }
function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function distance(left, right) { return Math.hypot(...subtract(left, right)); }
function clamp01(value) { return Math.max(0, Math.min(1, value)); }
function byField(field) { return (left, right) => String(left[field]).localeCompare(String(right[field])); }
function coded(code, message, details = null) {
  const error = new Error(message);
  error.code = code;
  if (details !== null) error.details = details;
  return error;
}
