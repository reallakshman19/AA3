import {
  requireLinearPipingInterfaceRecovery,
  requireLinearPipingInterfaceSet,
} from '../core/linear-piping-interface/index.js';
import { projectSupportActionTriad } from '../core/linear-piping-support-action-triad/index.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';

export const LFEA_SUPPORT_ACTIONS_PUBLICATION_SCHEMA = 'lfea-support-actions-published/v1';

const HASH_PATTERN = /^fnv1a64:[0-9a-f]{16}$/u;

/**
 * Build the read-only 3D Edit presentation payload from governed recovery.
 * Gravity-up is explicit input: this layer has no authority to assume +Z or
 * infer vertical from the frame-element local e2/e3 axes.
 *
 * reportingSignConvention is retained per action because interface definitions
 * may legitimately use different reporting signs. The projected axial/lateral/
 * vertical values are incomplete engineering data without that convention.
 */
export function createLinearPipingSupportActionsPublication(input) {
  requireRecord(input, 'supportActionsPublicationInput');
  const interfaceSet = requireLinearPipingInterfaceSet(input.interfaceSet);
  const recovery = requireLinearPipingInterfaceRecovery(input.interfaceRecovery);
  const sourceSemanticHash = requireHash(input.sourceSemanticHash, 'sourceSemanticHash');
  const modelVersion = requireVersion(input.modelVersion);
  const parallelTolerance = requireTolerance(input.parallelTolerance);

  if (recovery.interfaceSetSemanticHash !== interfaceSet.semanticHash) {
    fail(
      'Interface recovery does not belong to the supplied interface set.',
      'LFEA_SUPPORT_ACTIONS_INTERFACE_SET_STALE',
    );
  }

  const definitions = new Map(interfaceSet.interfaces.map((definition) => [
    definition.interfaceId,
    definition,
  ]));
  const entityOwners = new Set();
  const actions = recovery.results.map((result) => {
    const definition = definitions.get(result.interfaceId);
    if (!definition || definition.nodeId !== result.nodeId) {
      fail(
        `Recovered interface ${result.interfaceId} is stale against its definition.`,
        'LFEA_SUPPORT_ACTIONS_INTERFACE_STALE',
      );
    }
    const entityId = definition.supportBinding?.supportKey ?? definition.sourceEntityId;
    if (entityOwners.has(entityId)) {
      fail(
        `More than one recovered interface resolves to 3D Edit entity ${entityId}.`,
        'LFEA_SUPPORT_ACTIONS_ENTITY_AMBIGUOUS',
      );
    }
    entityOwners.add(entityId);
    const triad = projectSupportActionTriad({
      forceGlobal: result.forceGlobal,
      tangentGlobal: definition.basis.e1,
      upGlobal: input.upGlobal,
      parallelTolerance,
    });
    return deepFreeze({
      entityId,
      nodeId: result.nodeId,
      interfaceId: result.interfaceId,
      loadCaseId: recovery.loadCaseId,
      reportingSignConvention: result.reportingSignConvention,
      triadSemanticHash: triad.semanticHash,
      recoverySemanticHash: recovery.semanticHash,
      triadStatus: triad.status,
      triadReason: triad.reason,
      fAxial: triad.fAxial,
      fLateral: triad.fLateral,
      fVertical: triad.fVertical,
    });
  }).sort(compareAction);

  return deepFreeze({
    schema: LFEA_SUPPORT_ACTIONS_PUBLICATION_SCHEMA,
    sourceSemanticHash,
    modelVersion,
    analysisResultSemanticHash: recovery.analysisResultSemanticHash,
    executionHash: recovery.executionHash,
    loadCaseId: recovery.loadCaseId,
    physicalLoadCaseHash: recovery.physicalLoadCaseHash,
    units: deepFreeze({ force: recovery.units.force }),
    actions,
  });
}

function compareAction(left, right) {
  return compareAscii(left.entityId, right.entityId)
    || compareAscii(left.interfaceId, right.interfaceId);
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${field} must be a record.`, 'LFEA_SUPPORT_ACTIONS_INPUT_INVALID');
  }
  return value;
}

function requireHash(value, field) {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    fail(`${field} must be a semantic hash.`, 'LFEA_SUPPORT_ACTIONS_INPUT_INVALID');
  }
  return value;
}

function requireVersion(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail('modelVersion must be a non-negative safe integer.', 'LFEA_SUPPORT_ACTIONS_INPUT_INVALID');
  }
  return value;
}

function requireTolerance(value) {
  if (!Number.isFinite(value) || !(value > 0 && value < 1)) {
    fail(
      'parallelTolerance must be greater than zero and less than one.',
      'LFEA_SUPPORT_ACTIONS_INPUT_INVALID',
    );
  }
  return value;
}

function fail(message, code) {
  const error = new TypeError(message);
  error.code = code;
  throw error;
}
