import { deepFreeze, isPlainRecord } from '../shared-piping-model/immutable.js';
import {
  REDUCER_SAMPLING_RULE,
  REDUCER_SEGMENT_COUNT,
} from './contract.js';

export const REDUCER_PRODUCTION_READINESS_SCHEMA =
  'fea-linear-reducer-production-readiness/v1';

export const REDUCER_CANDIDATE_PARITY_STATUS =
  'CANDIDATE_PENDING_SECTION_SAMPLING_VERIFICATION';

export const REDUCER_REQUIRED_PRODUCTION_PARITY_STATUS =
  'QUALIFIED_CAESAR_REDUCER_PARITY_V1';

export const REDUCER_PRODUCTION_BLOCKER_CODES = Object.freeze([
  'REDUCER_SECTION_SAMPLING_AUTHORITY_UNQUALIFIED',
  'REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED',
]);

/**
 * Assess whether a compiled reducer authority may be advertised or consumed as
 * exact CAESAR reducer mechanics in production.
 *
 * The current package is intentionally a candidate: public Hexagon material
 * confirms ten successively changing cylinders but does not state the exact
 * representative section station for each cylinder. A mathematical B-3.23
 * condensation PASS therefore cannot, by itself, authorize production parity.
 */
export function assessReducerCondensationProductionReadiness(authority) {
  requireAuthorityShape(authority);
  const blockers = [];

  if (authority.parityStatus !== REDUCER_REQUIRED_PRODUCTION_PARITY_STATUS
    || authority.samplingRule === REDUCER_SAMPLING_RULE) {
    blockers.push(Object.freeze({
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
    }));
  }

  if (authority.parityStatus !== REDUCER_REQUIRED_PRODUCTION_PARITY_STATUS) {
    blockers.push(Object.freeze({
      code: 'REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED',
      message: 'Exact reducer production use requires controlled CAESAR parity for structural response; candidate internal mathematics is insufficient.',
      requiredEvidence: Object.freeze([
        'reducer stiffness or displacement/reaction parity under independent load cases',
        'gravity resultant/centroid behavior where reducer weight participates',
        'thermal response parity where reducer thermal strain participates',
        'retained distinction between structural reducer mechanics and code SIF/stress authority',
      ]),
    }));
  }

  const status = blockers.length === 0 ? 'READY' : 'BLOCK';
  return deepFreeze({
    schema: REDUCER_PRODUCTION_READINESS_SCHEMA,
    reducerId: authority.reducerId,
    inputSemanticHash: authority.inputSemanticHash,
    segmentCount: authority.geometry.segmentCount,
    samplingRule: authority.samplingRule,
    parityStatus: authority.parityStatus,
    requiredParityStatus: REDUCER_REQUIRED_PRODUCTION_PARITY_STATUS,
    status,
    productionUseAuthorized: status === 'READY',
    blockerCodes: blockers.map((row) => row.code),
    blockers,
  });
}

export function requireReducerCondensationProductionReady(authority) {
  const assessment = assessReducerCondensationProductionReadiness(authority);
  if (!assessment.productionUseAuthorized) {
    const error = new TypeError(
      `Reducer ${assessment.reducerId} is not qualified for exact production mechanics: ${assessment.blockerCodes.join(', ')}.`,
    );
    error.name = 'ReducerProductionReadinessError';
    error.code = 'REDUCER_PRODUCTION_PARITY_NOT_QUALIFIED';
    error.readiness = assessment;
    throw error;
  }
  return authority;
}

function requireAuthorityShape(authority) {
  if (!isPlainRecord(authority)
    || authority.schema !== 'fea-linear-reducer-condensation-authority/v1'
    || typeof authority.reducerId !== 'string'
    || typeof authority.inputSemanticHash !== 'string'
    || !isPlainRecord(authority.geometry)
    || authority.geometry.segmentCount !== REDUCER_SEGMENT_COUNT
    || typeof authority.samplingRule !== 'string'
    || typeof authority.parityStatus !== 'string') {
    throw new TypeError('Reducer production readiness requires a sealed ten-cylinder condensation authority.');
  }
  return authority;
}
