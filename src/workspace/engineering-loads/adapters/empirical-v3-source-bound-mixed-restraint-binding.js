import { semanticHash } from '../../../core/empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../../../core/shared-primitives/immutable.js';
import {
  validateRestraintCapabilityModel,
  validateSupportAttachmentModel,
} from '../../../core/support-restraints/index.js';
import {
  requirePreproductionThermalLiftoffDisplacementAuthority,
} from '../preproduction-thermal-liftoff-displacement-authority.js';
import { requireCanonicalComponentRomRoute } from './canonical-component-rom-route.js';
import { requireSjsonEmpiricalPipingRequest } from './sjson-to-empirical-piping-request.js';

export const EMPIRICAL_V3_SOURCE_BOUND_MIXED_RESTRAINT_BINDING_SCHEMA =
  'empirical-v3-source-bound-mixed-restraint-binding/v1';

const ACTIVE_STATES = new Set(['RESTRAINED', 'SPRING']);
const DIRECTIONS = new Set(['VERTICAL', 'LATERAL', 'LONGITUDINAL']);

/**
 * Binds governed restraint occurrences to existing canonical route nodes and
 * derives support targets from source-backed support movement only.
 */
export function buildEmpiricalV3SourceBoundMixedRestraintBinding(input) {
  exactKeys(input, [
    'adaptedRequest', 'supportAttachmentModel', 'restraintCapabilityModel',
    'route', 'supportMovementAuthorities', 'selection',
  ], 'mixed restraint binding input');
  const request = requireSjsonEmpiricalPipingRequest(input.adaptedRequest);
  const attachmentModel = requireAttachmentModel(input.supportAttachmentModel);
  const restraintModel = requireRestraintModel(input.restraintCapabilityModel);
  const route = requireCanonicalComponentRomRoute(input.route);
  assertCurrentChain(request, attachmentModel, restraintModel, route);
  const selection = requireSelection(input.selection, request);
  const occurrences = new Map(request.restraintOccurrences.map((row) => [row.restraintId, row]));
  const rootOccurrence = requireExplicitOccurrence(requireOccurrence(occurrences, selection.rootRestraintId));
  const coordinateOccurrences = selection.coordinateRestraintIds
    .map((id) => requireExplicitOccurrence(requireOccurrence(occurrences, id)));
  requireRigidRoot(rootOccurrence);
  const attachmentById = new Map(attachmentModel.attachments.map((row) => [row.attachmentId, row]));
  const rootNodeId = routeNodeForOccurrence(rootOccurrence, attachmentById, route);
  const movements = requireMovements(input.supportMovementAuthorities, [rootOccurrence, ...coordinateOccurrences], selection.loadCaseId);
  const rootMovement = movements.get(rootOccurrence.supportSiteId).supportDisplacementM;
  const coordinates = coordinateOccurrences.map((occurrence) => {
    const axis = requireAxis(occurrence.effectiveCapability?.axis, occurrence.restraintId);
    const direction = text(occurrence.effectiveCapability?.direction, `${occurrence.restraintId}.direction`).toUpperCase();
    if (!DIRECTIONS.has(direction)) throw new Error(`Restraint ${occurrence.restraintId} direction is outside the mixed linear qualification.`);
    const state = occurrence.effectiveCapability?.translationalStates?.[direction.toLowerCase()];
    if (!ACTIVE_STATES.has(state)) throw new Error(`Restraint ${occurrence.restraintId} must be RESTRAINED or SPRING in its solved direction.`);
    rejectContact(occurrence);
    const stiffness = requireStiffness(state, occurrence.effectiveCapability?.stiffnessNPerM, occurrence.restraintId);
    const supportMovement = movements.get(occurrence.supportSiteId).supportDisplacementM;
    const targetDisplacementM = dot(subtractVector(supportMovement, rootMovement), axis);
    return deepFreeze({
      coordinateId: occurrence.restraintId,
      restraintId: occurrence.restraintId,
      supportSiteId: occurrence.supportSiteId,
      attachmentId: occurrence.attachmentId,
      nodeId: routeNodeForOccurrence(occurrence, attachmentById, route),
      direction: axis,
      targetDisplacementM,
      supportStiffnessNPerM: stiffness,
      movementAuthorityRef: movementRef(movements.get(occurrence.supportSiteId)),
    });
  });
  if (coordinates.some((row) => row.nodeId === rootNodeId)) throw new Error('Solved restraint cannot share the rooted anchor route node.');
  const movementRecords = [...movements.values()].sort((a, b) => a.supportSiteId.localeCompare(b.supportSiteId));
  const material = {
    schema: EMPIRICAL_V3_SOURCE_BOUND_MIXED_RESTRAINT_BINDING_SCHEMA,
    requestRef: { ref: request.scenarioId, semanticHash: request.semanticHash },
    attachmentModelRef: { ref: attachmentModel.datasetId, semanticHash: attachmentModel.semanticHash },
    restraintModelRef: { ref: restraintModel.datasetId, semanticHash: restraintModel.semanticHash },
    routeRef: { ref: route.connectedComponentId, semanticHash: route.semanticHash },
    loadCaseId: selection.loadCaseId,
    root: {
      restraintId: rootOccurrence.restraintId,
      supportSiteId: rootOccurrence.supportSiteId,
      attachmentId: rootOccurrence.attachmentId,
      nodeId: rootNodeId,
      movementAuthorityRef: movementRef(movements.get(rootOccurrence.supportSiteId)),
    },
    coordinates,
    movementRecords,
    policy: {
      explicitRestraintQualificationOnly: true,
      sourceBackedSupportMovementOnly: true,
      qualifiedMovementOnly: true,
      existingCanonicalRouteNodesOnly: true,
      attachedPortOnly: true,
      supportStationSplittingPerformed: false,
      chainageConsumed: false,
      contactGapFrictionSolved: false,
      targetDisplacementDerivedHere: true,
      mechanicsSolved: false,
    },
  };
  const hash = semanticHash(material);
  return deepFreeze({ ...material, bindingId: `mixed-restraint:${hash.slice('fnv1a64:'.length)}`, semanticHash: hash });
}

export function requireEmpiricalV3SourceBoundMixedRestraintBinding(value) {
  if (!value || value.schema !== EMPIRICAL_V3_SOURCE_BOUND_MIXED_RESTRAINT_BINDING_SCHEMA) {
    throw new TypeError(`Expected schema ${EMPIRICAL_V3_SOURCE_BOUND_MIXED_RESTRAINT_BINDING_SCHEMA}.`);
  }
  const { bindingId, semanticHash: actual, ...material } = value;
  const expected = semanticHash(material);
  if (actual !== expected || bindingId !== `mixed-restraint:${expected.slice('fnv1a64:'.length)}`) {
    throw new Error('Mixed restraint binding identity mismatch.');
  }
  return deepFreeze(value);
}

function assertCurrentChain(request, attachmentModel, restraintModel, route) {
  if (request.status !== 'READY_FOR_RUNTIME_BRIDGE') throw new Error('Governed empirical request is not READY_FOR_RUNTIME_BRIDGE.');
  if (request.datasetId !== route.datasetId || attachmentModel.datasetId !== request.datasetId || restraintModel.datasetId !== request.datasetId) {
    throw new Error('Mixed restraint authorities must share one dataset.');
  }
  if (request.sourceBindings.topologyHash !== route.topologyGraphSemanticHash
      || request.sourceBindings.attachmentHash !== attachmentModel.semanticHash
      || request.sourceBindings.restraintHash !== restraintModel.semanticHash
      || attachmentModel.topologySemanticHash !== route.topologyGraphSemanticHash
      || restraintModel.attachmentModelSemanticHash !== attachmentModel.semanticHash) {
    throw new Error('Mixed restraint authority chain is stale.');
  }
  if ((request.blockers || []).some((row) => row.severity === 'ERROR')) throw new Error('Governed empirical request has unresolved ERROR blockers.');
}
function requireSelection(value, request) {
  exactKeys(value, ['loadCaseId', 'rootRestraintId', 'coordinateRestraintIds'], 'mixed restraint selection');
  const loadCaseId = text(value.loadCaseId, 'selection.loadCaseId');
  const loadCase = request.loadCases.find((row) => row.loadCaseId === loadCaseId);
  if (!loadCase || !loadCase.effects?.thermalStrain || loadCase.effects.weight || loadCase.effects.pressureCompatibility || loadCase.effects.pressureStress) {
    throw new Error(`Load case ${loadCaseId} must be the governed thermal-strain-only case.`);
  }
  const coordinateRestraintIds = uniqueTexts(value.coordinateRestraintIds, 'selection.coordinateRestraintIds');
  const rootRestraintId = text(value.rootRestraintId, 'selection.rootRestraintId');
  if (!coordinateRestraintIds.length || coordinateRestraintIds.includes(rootRestraintId)) throw new Error('Mixed restraint selection requires distinct root and solved restraints.');
  return { loadCaseId, rootRestraintId, coordinateRestraintIds };
}
function requireExplicitOccurrence(occurrence) {
  if (occurrence.qualification !== 'EXPLICIT') {
    throw new Error(`Restraint ${occurrence.restraintId} must have EXPLICIT source qualification for mixed source-bound execution.`);
  }
  return occurrence;
}
function requireRigidRoot(occurrence) {
  if (!/ANCHOR|(^|_)ANC(HOR)?($|_)/.test(String(occurrence.effectiveCapability?.type || '').toUpperCase())) throw new Error(`Root ${occurrence.restraintId} must be a governed anchor.`);
  const states = occurrence.effectiveCapability?.translationalStates || {};
  if (['vertical','lateral','longitudinal'].some((key) => states[key] !== 'RESTRAINED')) throw new Error(`Root ${occurrence.restraintId} must be rigid in all translational directions.`);
  rejectContact(occurrence);
}
function rejectContact(occurrence) {
  const capability = occurrence.effectiveCapability || {};
  if (capability.gapMm !== null && capability.gapMm !== undefined) throw new Error(`Restraint ${occurrence.restraintId} gap/contact is outside mixed linear qualification.`);
  if (capability.friction !== null && capability.friction !== undefined) throw new Error(`Restraint ${occurrence.restraintId} friction is outside mixed linear qualification.`);
}
function routeNodeForOccurrence(occurrence, attachmentById, route) {
  const attachment = attachmentById.get(occurrence.attachmentId);
  if (!attachment || attachment.supportKey !== occurrence.supportSiteId || !attachment.attachedPortKey) {
    throw new Error(`Restraint ${occurrence.restraintId} must have one governed port attachment; interior support splitting is not qualified.`);
  }
  const matches = route.nodes.filter((node) => node.sourcePortKeys.includes(attachment.attachedPortKey));
  if (matches.length !== 1) throw new Error(`Restraint ${occurrence.restraintId} attachment does not map uniquely to an existing canonical route node.`);
  return matches[0].id;
}
function requireMovements(values, occurrences, loadCaseId) {
  if (!Array.isArray(values)) throw new TypeError('supportMovementAuthorities must be an array.');
  const requested = new Set(occurrences.map((row) => row.supportSiteId));
  const map = new Map();
  for (const raw of values) {
    const authority = requirePreproductionThermalLiftoffDisplacementAuthority(raw);
    if (!requested.has(authority.supportSiteId) || authority.loadCaseId !== loadCaseId) continue;
    if (authority.qualification !== 'QUALIFIED' || authority.provenance !== 'SOURCE_BACKED_SUPPORT_DISPLACEMENT'
        || !['GOVERNED_IMPORT','APPROVED_ENGINEERING_DATA'].includes(authority.source.sourceKind)) {
      throw new Error(`Support movement ${authority.supportSiteId} is not qualified source-backed support displacement.`);
    }
    if (map.has(authority.supportSiteId)) throw new Error(`Duplicate support movement for ${authority.supportSiteId}.`);
    map.set(authority.supportSiteId, authority);
  }
  for (const site of requested) if (!map.has(site)) throw new Error(`Missing source-backed support movement for ${site}.`);
  return map;
}
function requireAttachmentModel(value) { const validation=validateSupportAttachmentModel(value); if(!validation.ok)throw new TypeError(`Invalid support attachment model: ${validation.errors.join(' ')}`); return value; }
function requireRestraintModel(value) { const validation=validateRestraintCapabilityModel(value); if(!validation.ok)throw new TypeError(`Invalid restraint capability model: ${validation.errors.join(' ')}`); return value; }
function requireOccurrence(map, id) { const row=map.get(id); if(!row)throw new Error(`Missing governed restraint occurrence ${id}.`); return row; }
function requireAxis(value, id) { if(!Array.isArray(value)||value.length!==3||value.some((n)=>!Number.isFinite(n)))throw new Error(`Restraint ${id} requires a governed finite axis.`); return value.map((n)=>Object.is(n,-0)?0:n); }
function requireStiffness(state, value, id) { if(state==='SPRING'){if(!Number.isFinite(value)||value<=0)throw new Error(`Spring restraint ${id} requires governed positive stiffness.`);return value;} if(value!==null&&value!==undefined)throw new Error(`Rigid restraint ${id} must not carry spring stiffness.`); return null; }
function movementRef(value) { return { ref:value.displacementId, semanticHash:value.semanticHash }; }
function subtractVector(a,b) { return [a.x-b.x,a.y-b.y,a.z-b.z]; }
function dot(a,b) { return a.reduce((sum,v,i)=>sum+(v*b[i]),0); }
function uniqueTexts(value,label) { if(!Array.isArray(value))throw new TypeError(`${label} must be an array.`); const rows=value.map((item,i)=>text(item,`${label}[${i}]`)); if(new Set(rows).size!==rows.length)throw new Error(`${label} must be unique.`); return rows; }
function exactKeys(value,keys,label) { if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(Object.keys(value).sort())!==JSON.stringify([...keys].sort()))throw new TypeError(`${label} contains unexpected or missing keys.`); }
function text(value,label) { const result=String(value??'').trim(); if(!result)throw new TypeError(`${label} is required.`); return result; }
