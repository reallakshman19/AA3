import {
  EMPTY_ENGINEERING_CORRELATION_REGISTRY,
  engineeringCorrelationMethods,
} from '../core/local-attachment-correlation/index.js';

export const LAFEA_CORRELATION_PRODUCT_AVAILABILITY_SCHEMA =
  'lafea-correlation-product-availability/v1';

/**
 * Code-owned engineering correlation registry used by the LAFEA product seam.
 * It is intentionally empty until a qualified release registers a trusted
 * method/edition and its hash-bound approval record.
 */
export const LAFEA_ENGINEERING_CORRELATION_REGISTRY =
  EMPTY_ENGINEERING_CORRELATION_REGISTRY;

export function lafeaCorrelationProductAvailability(stage) {
  if (!stage || stage.stageId !== 'LAFEA.2') {
    throw new TypeError('LAFEA_CORRELATION_PRODUCT_STAGE_MUST_BE_LAFEA2');
  }
  const methods = engineeringCorrelationMethods(LAFEA_ENGINEERING_CORRELATION_REGISTRY);
  const acceptedScreeningResult = stage.execution?.status === 'QUALIFIED'
    && stage.execution?.result?.qualification?.state === 'ACCEPTED';
  const resultHash = acceptedScreeningResult
    ? stage.execution.result.semanticHashes?.screeningResultPayloadSemanticHash ?? null
    : null;
  const reasons = [];
  if (!methods.length) reasons.push('NO_ENGINEERING_CORRELATION_PROFILE_REGISTERED');
  if (!acceptedScreeningResult) reasons.push('QUALIFIED_LAFEA2_RESULT_REQUIRED');
  if (acceptedScreeningResult && !resultHash) reasons.push('LAFEA2_RESULT_HASH_REQUIRED');
  const ready = reasons.length === 0;
  return freeze({
    schema: LAFEA_CORRELATION_PRODUCT_AVAILABILITY_SCHEMA,
    stageId: 'LAFEA.2',
    state: ready ? 'READY' : 'BLOCKED',
    reasons,
    registeredMethodCount: methods.length,
    methods,
    sourceEvidence: {
      screeningResultStatus: stage.execution?.status ?? 'NOT_RUN',
      screeningResultQualification: stage.execution?.result?.qualification?.state ?? null,
      screeningResultPayloadSemanticHash: resultHash,
    },
    nextRequiredInput: ready ? 'SOURCE_BOUND_ATTACHMENT_GEOMETRY' : null,
  });
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
