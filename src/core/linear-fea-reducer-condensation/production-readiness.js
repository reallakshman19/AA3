import { deepFreeze, isPlainRecord } from '../shared-piping-model/immutable.js';
import {
  REDUCER_SAMPLING_RULE,
  REDUCER_SEGMENT_COUNT,
  fail,
} from './contract.js';

export const REDUCER_PRODUCTION_READINESS_SCHEMA =
  'fea-linear-reducer-production-readiness/v1';

export const REDUCER_CANDIDATE_PARITY_STATUS =
  'CANDIDATE_PENDING_SECTION_SAMPLING_VERIFICATION';

export const REDUCER_PRODUCTION_BLOCKER_CODES = Object.freeze([
  'REDUCER_SECTION_SAMPLING_AUTHORITY_UNQUALIFIED',
  'REDUCER_GRAVITY_OWNERSHIP_AUTHORITY_UNQUALIFIED',
  'REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED',
]);

/**
 * Assess whether the current v1 ten-cylinder reducer authority may be used as
 * exact CAESAR reducer mechanics in production.
 *
 * It may not. The v1 authority deliberately contains only a candidate midpoint
 * sampling rule and no qualified current-version CAESAR parity evidence. The
 * public ten-cylinder structural description also does not establish gravity
 * ownership. Historical independent reducer verification reports a CAESAR
 * weight rule based on the From-end section, so gravity must be qualified as a
 * separate authority rather than inferred from the structural discretization.
 *
 * Production readiness therefore cannot be unlocked by changing a status
 * string. A later S4 implementation must add and validate explicit source/parity
 * evidence and revise this boundary before exact reducer mechanics can become
 * reachable.
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
        'or controlled current-version CAESAR response extraction that uniquely discriminates the implemented sampling rule from alternatives',
      ]),
    }),
    Object.freeze({
      code: 'REDUCER_GRAVITY_OWNERSHIP_AUTHORITY_UNQUALIFIED',
      message: [
        'The ten-cylinder structural description does not establish the reducer gravity rule.',
        'Historical independent CAESAR reducer verification reports From-end OD/thickness weight behavior, which conflicts with assuming progressive ten-cylinder physical weight.',
        'Current-version metal, fluid, insulation, resultant and first-moment ownership must therefore be qualified independently.',
      ].join(' '),
      requiredEvidence: Object.freeze([
        'current-version forward/reverse reducer metal-only gravity comparison that discriminates From-end, To-end, average and progressive-section weight rules',
        'independent fluid-only and insulation-only ownership observations',
        'support resultant and first-moment or equivalent centroid evidence',
      ]),
    }),
    Object.freeze({
      code: 'REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED',
      message: 'Exact reducer production use requires controlled current-version CAESAR parity for structural and thermal response; candidate internal mathematics is insufficient.',
      requiredEvidence: Object.freeze([
        'axial, torsional and bending displacement/reaction parity under independent load cases',
        'thermal free-extension and restrained-reaction parity',
        'retained distinction between structural reducer mechanics and code SIF/stress authority',
        'qualification evidence conforming to docs/lfea/S4_Reducer_Parity_Protocol_20260824.md',
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

/**
 * The owner-authorized production path, kept deliberately separate from
 * `requireReducerCondensationProductionReady` above.
 *
 * That function answers "is this S4-qualified?" and the answer is still no; it
 * is unchanged and still throws unconditionally. This one answers a different
 * question -- "has the owner accepted the measured error for production use?" --
 * and the two must not be confused, which is why the S4 gate is not routed
 * around or softened to serve this.
 *
 * An authorization is required to name the blockers it does NOT close, so it
 * can never read as qualification.
 */
export function requireReducerOwnerAuthorization(authorization) {
  const record = authorization ?? null;
  if (record === null || typeof record !== 'object') {
    fail('Exact reducer mechanics require an explicit owner authorization record.',
      'REDUCER_OWNER_AUTHORIZATION_MISSING');
  }
  if (record.schema !== 'lfea-reducer-production-authorization/v1') {
    fail('Reducer owner authorization schema is invalid.', 'REDUCER_OWNER_AUTHORIZATION_INVALID');
  }
  if (record.authorizedRule !== REDUCER_SAMPLING_RULE) {
    fail(
      `Reducer owner authorization names rule ${String(record.authorizedRule)}, but the compiled `
      + `authority implements ${REDUCER_SAMPLING_RULE}. An authorization must match what actually runs.`,
      'REDUCER_OWNER_AUTHORIZATION_RULE_MISMATCH',
    );
  }
  const notClosed = record.blockersExplicitlyNotClosed;
  if (!Array.isArray(notClosed)
    || REDUCER_PRODUCTION_BLOCKER_CODES.some((code) => !notClosed.includes(code))) {
    fail(
      'Reducer owner authorization must name every S4 blocker it does not close, so that '
      + 'production use on measured evidence can never be mistaken for S4 qualification.',
      'REDUCER_OWNER_AUTHORIZATION_INCOMPLETE',
    );
  }
  return record;
}
