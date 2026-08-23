import { deepFreeze, isPlainRecord } from '../shared-piping-model/immutable.js';
import {
  REDUCER_SAMPLING_RULE,
  REDUCER_SEGMENT_COUNT,
} from './contract.js';

export const REDUCER_PRODUCTION_READINESS_SCHEMA =
  'fea-linear-reducer-production-readiness/v1';

export const REDUCER_CANDIDATE_PARITY_STATUS =
  'CANDIDATE_PENDING_SECTION_SAMPLING_VERIFICATION';

export const REDUCER_PRODUCTION_BLOCKER_CODES = Object.freeze([
  'REDUCER_SECTION_SAMPLING_AUTHORITY_UNQUALIFIED',
  'REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED',
]);

/**
 * Assess whether the current v1 ten-cylinder reducer authority may be used as
 * exact CAESAR reducer mechanics in production.
 *
 * It may not. The v1 authority deliberately contains only a candidate midpoint
 * sampling rule and no qualified CAESAR parity evidence contract. Production
 * readiness therefore cannot be unlocked by changing a status string. A later
 * S4 implementation must add and validate explicit source/parity evidence and
 * revise this boundary before exact reducer mechanics can become reachable.
 */
export function assessReducerCondensationProductionReadiness(authority) {
  requireCurrentCandidateAuthority(authority);
  const blockers = Object.freeze([
    Object.freeze({
      code: 'REDUCER_SECTION_SAMPLING_AUTHORITY_UNQUALIFIED',
      message: [
        'Reducer section sampling is not source-qualified for exact CAESAR parity.',
        `Current sampling rule: ${authority.samplingRule}.`,
        `Current parity status: ${authority.parityStatus}.`,
      ].join(' '),
      requiredEvidence: Object.freeze([
        'authoritative CAESAR/Hexagon statement of the ten-cylinder section sampling station',
        'or controlled CAESAR response extraction that uniquely discriminates the implemented sampling rule from alternatives',
      ]),
    }),
    Object.freeze({
      code: 'REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED',
      message: 'Exact reducer production use requires controlled CAESAR parity for structural response; candidate internal mathematics is insufficient.',
      requiredEvidence: Object.freeze([
        'reducer stiffness or displacement/reaction parity under independent load cases',
        'gravity resultant/centroid behavior where reducer weight participates',
        'thermal response parity where reducer thermal strain participates',
        'retained distinction between structural reducer mechanics and code SIF/stress authority',
      ]),
    }),
  ]);

  return deepFreeze({
    schema: REDUCER_PRODUCTION_READINESS_SCHEMA,
    reducerId: authority.reducerId,
    inputSemanticHash: authority.inputSemanticHash,
    segmentCount: authority.geometry.segmentCount,
    samplingRule: authority.samplingRule,
    parityStatus: authority.parityStatus,
    status: 'BLOCK',
    productionUseAuthorized: false,
    blockerCodes: blockers.map((row) => row.code),
    blockers,
  });
}

export function requireReducerCondensationProductionReady(authority) {
  const assessment = assessReducerCondensationProductionReadiness(authority);
  const error = new TypeError(
    `Reducer ${assessment.reducerId} is not qualified for exact production mechanics: ${assessment.blockerCodes.join(', ')}.`,
  );
  error.name = 'ReducerProductionReadinessError';
  error.code = 'REDUCER_PRODUCTION_PARITY_NOT_QUALIFIED';
  error.readiness = assessment;
  throw error;
}

function requireCurrentCandidateAuthority(authority) {
  if (!isPlainRecord(authority)
    || authority.schema !== 'fea-linear-reducer-condensation-authority/v1'
    || typeof authority.reducerId !== 'string'
    || typeof authority.inputSemanticHash !== 'string'
    || !isPlainRecord(authority.geometry)
    || authority.geometry.segmentCount !== REDUCER_SEGMENT_COUNT
    || authority.samplingRule !== REDUCER_SAMPLING_RULE
    || authority.parityStatus !== REDUCER_CANDIDATE_PARITY_STATUS) {
    throw new TypeError([
      'Reducer production readiness v1 accepts only the current sealed candidate authority.',
      'A different sampling/parity record requires an explicit qualified-parity contract revision.',
    ].join(' '));
  }
  return authority;
}
