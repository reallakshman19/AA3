import { semanticHash } from '../../../core/empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../../../core/shared-primitives/immutable.js';
import {
  assessEmpiricalV3CalculationAuthorizationCurrent,
  requireEmpiricalV3CalculationAuthorization,
  sealEmpiricalV3CoupledCalculationEvidence,
} from '../../../core/empirical-v3-safety/index.js';
import {
  executeCanonicalSourceBoundThermalRomCompatibility,
} from './canonical-thermal-rom-source-bound-execution.js';

export const EMPIRICAL_V3_SOURCE_BOUND_EXECUTION_REQUEST_SCHEMA =
  'empirical-v3-source-bound-execution-request/v1';
export const EMPIRICAL_V3_AUTHORIZED_SOURCE_BOUND_EXECUTION_SCHEMA =
  'empirical-v3-authorized-source-bound-execution/v1';

export function buildEmpiricalV3SourceBoundExecutionDependency(romInput) {
  requireRecord(romInput, 'romInput');
  const material = {
    schema: EMPIRICAL_V3_SOURCE_BOUND_EXECUTION_REQUEST_SCHEMA,
    dataset: datasetIdentity(romInput.dataset),
    adaptedRequestSemanticHash: requireHash(romInput.adaptedRequest?.semanticHash, 'adaptedRequest.semanticHash'),
    topologyGraphSemanticHash: requireHash(romInput.topologyGraph?.semanticHash, 'topologyGraph.semanticHash'),
    supportAttachmentModelSemanticHash: requireHash(
      romInput.supportAttachmentModel?.semanticHash,
      'supportAttachmentModel.semanticHash',
    ),
    restraintCapabilityModelSemanticHash: requireHash(
      romInput.restraintCapabilityModel?.semanticHash,
      'restraintCapabilityModel.semanticHash',
    ),
    materialSectionAuthoritySemanticHash: requireHash(
      romInput.materialSectionAuthority?.semanticHash,
      'materialSectionAuthority.semanticHash',
    ),
    processAuthoritySemanticHashes: semanticHashes(
      romInput.processAuthorities,
      'processAuthorities',
      true,
    ),
    movementAuthoritySemanticHashes: semanticHashes(
      romInput.supportMovementAuthorities,
      'supportMovementAuthorities',
      true,
    ),
    selection: normalizeSelection(romInput.selection),
    options: clone(romInput.options ?? {}),
  };
  const hash = semanticHash(material);
  return deepFreeze({
    kind: 'ROM_EXECUTION_REQUEST',
    ref: `canonical-source-bound-thermal-rom:${hash.slice('fnv1a64:'.length)}`,
    semanticHash: hash,
    request: deepFreeze(material),
  });
}

/**
 * Only this bridge is allowed to cross from a current V3 calculation receipt
 * into the frozen source-bound ROM. It does not alter the ROM input or output.
 */
export function executeAuthorizedEmpiricalV3SourceBoundThermalRom(input) {
  const runId = requireText(input?.runId, 'runId');
  const authorization = requireEmpiricalV3CalculationAuthorization(input?.authorization);
  if (authorization.runId !== runId) throw coded('EMP_V3_EXECUTION_RUN_MISMATCH', 'Authorization runId does not match execution runId.');
  const current = requireCurrentBasis(input?.currentAuthorization, runId);
  const assessment = assessEmpiricalV3CalculationAuthorizationCurrent(authorization, current);
  if (!assessment.current) {
    throw coded(
      'EMP_V3_EXECUTION_AUTHORIZATION_STALE',
      `Calculation authorization is stale: ${assessment.reasons.join(', ')}.`,
      { reasons: assessment.reasons },
    );
  }

  const requestDependency = buildEmpiricalV3SourceBoundExecutionDependency(input?.romInput);
  const authorizedDependency = authorization.dependencies.find((dependency) => (
    dependency.kind === requestDependency.kind && dependency.ref === requestDependency.ref
  ));
  if (!authorizedDependency || authorizedDependency.semanticHash !== requestDependency.semanticHash) {
    throw coded(
      'EMP_V3_EXECUTION_REQUEST_NOT_AUTHORIZED',
      'The exact source-bound ROM execution request is not present in the sealed calculation authorization.',
    );
  }

  const frozenRomExecution = executeCanonicalSourceBoundThermalRomCompatibility(input.romInput);
  const canonicalResult = frozenRomExecution.result;
  const mechanics = canonicalResult?.mechanics;
  if (!canonicalResult?.semanticHash || !mechanics) {
    throw coded('EMP_V3_EXECUTION_ROM_OUTPUT_INVALID', 'Frozen source-bound ROM did not return sealed mechanics output.');
  }
  const romOutputHash = semanticHash(frozenRomExecution);
  const coordinateBindings = coordinateBindingsFromSourceBound(canonicalResult, mechanics);
  const evidence = sealEmpiricalV3CoupledCalculationEvidence({
    runId,
    authorization,
    mechanics,
    romOutputRef: {
      ref: `canonical-source-bound-rom-output:${canonicalResult.semanticHash}`,
      semanticHash: romOutputHash,
    },
    authorityRefs: authorization.dependencies.map((dependency) => ({
      ref: `${dependency.kind}:${dependency.ref}`,
      semanticHash: dependency.semanticHash,
    })),
    coordinateBindings,
  });

  const material = {
    schema: EMPIRICAL_V3_AUTHORIZED_SOURCE_BOUND_EXECUTION_SCHEMA,
    runId,
    authorizationRef: {
      authorizationId: authorization.authorizationId,
      semanticHash: authorization.semanticHash,
    },
    executionRequestRef: {
      ref: requestDependency.ref,
      semanticHash: requestDependency.semanticHash,
    },
    frozenRom: {
      schema: frozenRomExecution.schema,
      canonicalResultSchema: canonicalResult.schema,
      canonicalResultSemanticHash: canonicalResult.semanticHash,
      outputSemanticHash: romOutputHash,
      mechanicsSchema: mechanics.schema,
    },
    evidence,
  };
  const hash = semanticHash(material);
  return deepFreeze({
    ...material,
    executionId: `authorized-execution:${hash.slice('fnv1a64:'.length)}`,
    semanticHash: hash,
  });
}

export function requireEmpiricalV3AuthorizedSourceBoundExecution(value) {
  if (!value || value.schema !== EMPIRICAL_V3_AUTHORIZED_SOURCE_BOUND_EXECUTION_SCHEMA) {
    throw new TypeError(`Expected schema ${EMPIRICAL_V3_AUTHORIZED_SOURCE_BOUND_EXECUTION_SCHEMA}.`);
  }
  const { executionId, semanticHash: actual, ...material } = value;
  const expected = semanticHash(material);
  if (actual !== expected || executionId !== `authorized-execution:${expected.slice('fnv1a64:'.length)}`) {
    throw new Error('Authorized source-bound execution identity mismatch.');
  }
  return deepFreeze(value);
}

function requireCurrentBasis(value, runId) {
  requireRecord(value, 'currentAuthorization');
  if (requireText(value.runId, 'currentAuthorization.runId') !== runId) {
    throw coded('EMP_V3_EXECUTION_CURRENT_RUN_MISMATCH', 'Current authorization basis belongs to another run.');
  }
  return value;
}
function datasetIdentity(value) {
  requireRecord(value, 'romInput.dataset');
  return {
    datasetId: requireText(value.datasetId, 'dataset.datasetId'),
    sourceSemanticHash: requireText(value.sourceSnapshot?.sourceSemanticHash, 'dataset.sourceSnapshot.sourceSemanticHash'),
    sharedModelSemanticHash: requireHash(
      value.sharedModel?.semanticHash ?? value.sharedModelSemanticHash,
      'dataset.sharedModel.semanticHash',
    ),
  };
}
function semanticHashes(value, fieldName, requireNonEmpty) {
  if (!Array.isArray(value) || (requireNonEmpty && value.length === 0)) {
    throw new TypeError(`${fieldName} must be a non-empty array.`);
  }
  return value.map((row, index) => requireHash(row?.semanticHash, `${fieldName}[${index}].semanticHash`)).sort();
}
function normalizeSelection(value) {
  requireRecord(value, 'romInput.selection');
  return {
    loadCaseId: requireText(value.loadCaseId, 'selection.loadCaseId'),
    rootRestraintId: requireText(value.rootRestraintId, 'selection.rootRestraintId'),
    coordinateRestraintIds: uniqueTexts(value.coordinateRestraintIds ?? []),
  };
}
function coordinateBindingsFromSourceBound(result, mechanics) {
  const coordinateIds = new Set(mechanics.coordinateIds ?? []);
  const actionCases = mechanics.compatibility?.actions?.cases ?? [];
  const nodeByCoordinate = new Map(actionCases.map((row) => [row.caseId, row.nodeId]));
  return (result.movementBindings ?? [])
    .filter((row) => coordinateIds.has(row.restraintId))
    .map((row) => ({
      coordinateId: row.restraintId,
      nodeId: nodeByCoordinate.get(row.restraintId) ?? null,
      supportId: row.supportSiteId,
      branchId: null,
      componentIds: [],
    }));
}
function uniqueTexts(value) {
  if (!Array.isArray(value)) throw new TypeError('Expected an array.');
  return [...new Set(value.map((item) => requireText(item, 'array item')))].sort();
}
function requireHash(value, fieldName) {
  const text = requireText(value, fieldName);
  if (!/^fnv1a64:[0-9a-f]{16}$/u.test(text)) throw new TypeError(`${fieldName} must be a semantic hash.`);
  return text;
}
function clone(value) { const result = JSON.parse(JSON.stringify(value)); semanticHash(result); return result; }
function requireRecord(value, fieldName) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${fieldName} must be an object.`); }
function requireText(value, fieldName) { const text = String(value ?? '').trim(); if (!text) throw new TypeError(`${fieldName} is required.`); return text; }
function coded(code, message, evidence) { const error = new Error(message); error.code = code; if (evidence !== undefined) error.evidence = evidence; return error; }
