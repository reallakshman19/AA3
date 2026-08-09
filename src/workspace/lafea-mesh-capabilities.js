/**
 * Truthful stage mesh capabilities.
 *
 * Automatic generation is reported as available only for a stage that has a
 * qualified producer bound in `lafea-mesh-producer-registry.js`. Every other
 * stage keeps reporting `QUALIFIED_MESH_PRODUCER_NOT_AVAILABLE`.
 */
import { requireLafeaLifecycleProfileForStage } from './lafea-lifecycle-profiles.js';
import {
  LAFEA_MESH_PRODUCER_LOCAL_REFINEMENT_AUTHORIZED,
  lafeaMeshProducerBound,
} from './lafea-mesh-producer-registry.js';

export const LAFEA_MESH_CAPABILITIES_SCHEMA = 'lafea-mesh-capabilities/v1';

const STAGE_ELEMENT_FAMILIES = Object.freeze({
  'LAFEA.3': Object.freeze(['T3', 'T6', 'Q8']),
  'LAFEA.4': Object.freeze(['CST_DKT_TRI3_THIN_SHELL_V1']),
  'LAFEA.5': Object.freeze(['CST_DKT_TRI3_THIN_SHELL_V1']),
});

export function lafeaMeshCapabilities(stageId) {
  const lifecycleProfile = requireLafeaLifecycleProfileForStage(stageId);
  const applicable = lifecycleProfile.meshApplicable === true;
  const producerBound = applicable && lafeaMeshProducerBound(stageId);
  return freeze({
    schema: LAFEA_MESH_CAPABILITIES_SCHEMA,
    stageId,
    applicable,
    retainedAuthorizedMesh: applicable,
    sourceDiscretizationAuthorized: false,
    automaticMeshProducerQualified: producerBound,
    manualRefinementQualified: producerBound && LAFEA_MESH_PRODUCER_LOCAL_REFINEMENT_AUTHORIZED,
    allowedElementFamilies: applicable ? [...STAGE_ELEMENT_FAMILIES[stageId]] : [],
    generationRequestSupported: applicable,
    generationExecutionAuthorized: producerBound,
    reasons: applicable
      ? [
        'RETAIN_AUTHORIZED_MESH_SUPPORTED',
        'SOURCE_DISCRETIZATION_NOT_AUTHORIZED',
        producerBound
          ? 'QUALIFIED_MESH_PRODUCER_BOUND'
          : 'QUALIFIED_MESH_PRODUCER_NOT_AVAILABLE',
        'GOVERNED_REFINEMENT_COMMAND_NOT_AVAILABLE',
      ]
      : ['ANALYSIS_MESH_NOT_APPLICABLE'],
  });
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
