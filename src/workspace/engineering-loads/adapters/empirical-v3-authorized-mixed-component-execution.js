import { semanticHash } from '../../../core/empirical-piping-mechanics/identity.js';
import {
  solveRootedTreeComponentThermalCompatibility,
} from '../../../core/empirical-piping-mechanics/rooted-tree-component-flexibility-gate.js';
import { deepFreeze } from '../../../core/shared-primitives/immutable.js';
import {
  assessEmpiricalV3CalculationAuthorizationCurrent,
  requireEmpiricalV3CalculationAuthorization,
  sealEmpiricalV3CoupledCalculationEvidence,
} from '../../../core/empirical-v3-safety/index.js';
import {
  requireEmpiricalV3SourceBoundMixedComponentRomInput,
} from './empirical-v3-source-bound-mixed-component-producer.js';

export const EMPIRICAL_V3_MIXED_COMPONENT_EXECUTION_REQUEST_SCHEMA =
  'empirical-v3-mixed-component-execution-request/v1';
export const EMPIRICAL_V3_AUTHORIZED_MIXED_COMPONENT_EXECUTION_SCHEMA =
  'empirical-v3-authorized-mixed-component-execution/v1';

/**
 * Seals the exact already-qualified mixed producer as one authorization
 * dependency. The producer remains inert; this does not execute mechanics.
 */
export function buildEmpiricalV3MixedComponentExecutionDependency(producerValue) {
  const producer = requireStrictProducer(producerValue);
  const material = {
    schema: EMPIRICAL_V3_MIXED_COMPONENT_EXECUTION_REQUEST_SCHEMA,
    producerRef: {
      producerId: producer.producerId,
      semanticHash: producer.semanticHash,
    },
    routeRef: producer.routeRef,
    bindingRef: producer.bindingRef,
    authorityRefs: normalizeRefs(producer.authorityRefs),
    frozenMechanics: {
      entrypoint: 'solveRootedTreeComponentThermalCompatibility',
      mechanicsSchema: 'empirical-rooted-component-thermal-compatibility/v1',
      numericalOptions: 'FROZEN_DEFAULTS_ONLY',
    },
  };
  const hash = semanticHash(material);
  return deepFreeze({
    kind: 'ROM_EXECUTION_REQUEST',
    ref: `mixed-component-thermal-rom:${hash.slice('fnv1a64:'.length)}`,
    semanticHash: hash,
    request: deepFreeze(material),
  });
}

/**
 * Sole V3 crossing from a current calculation receipt into the frozen #1148
 * straight/elbow component ROM. It does not alter producer input or mechanics.
 */
export function executeAuthorizedEmpiricalV3MixedComponentThermalRom(input) {
  const runId = requireText(input?.runId, 'runId');
  const authorization = requireEmpiricalV3CalculationAuthorization(input?.authorization);
  if (authorization.runId !== runId) {
    throw coded('EMP_V3_MIXED_EXECUTION_RUN_MISMATCH', 'Authorization runId does not match mixed execution runId.');
  }
  const current = requireCurrentBasis(input?.currentAuthorization, runId);
  const assessment = assessEmpiricalV3CalculationAuthorizationCurrent(authorization, current);
  if (!assessment.current) {
    throw coded(
      'EMP_V3_MIXED_EXECUTION_AUTHORIZATION_STALE',
      `Calculation authorization is stale: ${assessment.reasons.join(', ')}.`,
      { reasons: assessment.reasons },
    );
  }

  const producer = requireStrictProducer(input?.producer);
  const requestDependency = buildEmpiricalV3MixedComponentExecutionDependency(producer);
  const authorizedDependency = authorization.dependencies.find((dependency) => (
    dependency.kind === requestDependency.kind && dependency.ref === requestDependency.ref
  ));
  if (!authorizedDependency || authorizedDependency.semanticHash !== requestDependency.semanticHash) {
    throw coded(
      'EMP_V3_MIXED_EXECUTION_REQUEST_NOT_AUTHORIZED',
      'The exact mixed-component ROM execution request is not present in the sealed calculation authorization.',
    );
  }

  const mechanics = solveRootedTreeComponentThermalCompatibility(producer.romInput);
  if (mechanics?.schema !== 'empirical-rooted-component-thermal-compatibility/v1') {
    throw coded(
      'EMP_V3_MIXED_EXECUTION_ROM_OUTPUT_INVALID',
      'Frozen mixed-component ROM did not return the qualified mechanics schema.',
    );
  }
  const romOutputHash = semanticHash(mechanics);
  const evidence = sealEmpiricalV3CoupledCalculationEvidence({
    runId,
    authorization,
    mechanics,
    romOutputRef: {
      ref: `mixed-component-rom-output:${romOutputHash.slice('fnv1a64:'.length)}`,
      semanticHash: romOutputHash,
    },
    authorityRefs: mergeEvidenceRefs(producer, authorization),
    coordinateBindings: producer.restraintBinding.coordinates.map((row) => ({
      coordinateId: row.coordinateId,
      nodeId: row.nodeId,
      supportId: row.supportSiteId,
      branchId: null,
      componentIds: [],
    })),
  });

  const material = {
    schema: EMPIRICAL_V3_AUTHORIZED_MIXED_COMPONENT_EXECUTION_SCHEMA,
    runId,
    authorizationRef: {
      authorizationId: authorization.authorizationId,
      semanticHash: authorization.semanticHash,
    },
    producerRef: {
      producerId: producer.producerId,
      semanticHash: producer.semanticHash,
    },
    executionRequestRef: {
      ref: requestDependency.ref,
      semanticHash: requestDependency.semanticHash,
    },
    frozenRom: {
      entrypoint: 'solveRootedTreeComponentThermalCompatibility',
      mechanicsSchema: mechanics.schema,
      outputSemanticHash: romOutputHash,
    },
    evidence,
  };
  const hash = semanticHash(material);
  return deepFreeze({
    ...material,
    executionId: `authorized-mixed-execution:${hash.slice('fnv1a64:'.length)}`,
    semanticHash: hash,
  });
}

export function requireEmpiricalV3AuthorizedMixedComponentExecution(value) {
  if (!value || value.schema !== EMPIRICAL_V3_AUTHORIZED_MIXED_COMPONENT_EXECUTION_SCHEMA) {
    throw new TypeError(`Expected schema ${EMPIRICAL_V3_AUTHORIZED_MIXED_COMPONENT_EXECUTION_SCHEMA}.`);
  }
  const { executionId, semanticHash: actual, ...material } = value;
  const expected = semanticHash(material);
  if (actual !== expected
      || executionId !== `authorized-mixed-execution:${expected.slice('fnv1a64:'.length)}`) {
    throw new Error('Authorized mixed-component execution identity mismatch.');
  }
  return deepFreeze(value);
}

function requireStrictProducer(value) {
  const producer = requireEmpiricalV3SourceBoundMixedComponentRomInput(value);
  const required = {
    exactQuantityAuthorityOnly: true,
    governedRestraintBindingRequired: true,
    sourceBackedSupportMovementOnly: true,
    existingCanonicalRouteNodesOnly: true,
    supportStationSplittingPerformed: false,
    chainageConsumed: false,
    toleranceTopologyConsumed: false,
    benchmarkElbowFlexibilityAccepted: false,
    mechanicsSolved: false,
    numericalOptionsOverridden: false,
    executionEnabled: false,
  };
  for (const [field, expected] of Object.entries(required)) {
    if (producer.policy?.[field] !== expected) {
      throw coded(
        'EMP_V3_MIXED_EXECUTION_PRODUCER_POLICY_INVALID',
        `Mixed producer policy ${field} must remain ${expected}.`,
      );
    }
  }
  return producer;
}

function requireCurrentBasis(value, runId) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('currentAuthorization must be an object.');
  }
  if (requireText(value.runId, 'currentAuthorization.runId') !== runId) {
    throw coded(
      'EMP_V3_MIXED_EXECUTION_CURRENT_RUN_MISMATCH',
      'Current authorization basis belongs to another run.',
    );
  }
  return value;
}
function normalizeRefs(value) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError('producer.authorityRefs must be non-empty.');
  return value.map((row, index) => ({
    ref: requireText(row?.ref, `authorityRefs[${index}].ref`),
    semanticHash: requireText(row?.semanticHash, `authorityRefs[${index}].semanticHash`),
  })).sort((a, b) => a.ref.localeCompare(b.ref) || a.semanticHash.localeCompare(b.semanticHash));
}
function mergeEvidenceRefs(producer, authorization) {
  const rows = [
    ...producer.authorityRefs,
    ...authorization.dependencies.map((dependency) => ({
      ref: `${dependency.kind}:${dependency.ref}`,
      semanticHash: dependency.semanticHash,
    })),
  ];
  const map = new Map(rows.map((row) => [`${row.ref}\u0000${row.semanticHash}`, row]));
  return [...map.values()].sort((a, b) => a.ref.localeCompare(b.ref) || a.semanticHash.localeCompare(b.semanticHash));
}
function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}
function coded(code, message, evidence) {
  const error = new Error(message);
  error.code = code;
  if (evidence !== undefined) error.evidence = evidence;
  return error;
}
