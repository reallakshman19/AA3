import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../../core/shared-piping-model/immutable.js';
import {
  NON_FEA_GRAVITY_METHOD_AUTO,
  requireReadyNonFeaGravityMethodAuthority,
} from '../project-data/non-fea-gravity-method-authority.js';
import {
  EMPIRICAL_COMPONENT_COG_CLASSIFICATION,
  auditEmpiricalComponentLoadAuthority,
  requireEmpiricalComponentLoadAuthorityAudit,
} from './empirical-component-load-authority.js';
import { getEmpiricalMethodRegistration } from './empirical-method-registry.js';
import {
  EMPIRICAL_LOAD_COG_METHOD,
  EMPIRICAL_LOAD_METHOD,
} from './support-load-distribution-v3.js';

export const EMPIRICAL_GRAVITY_AUTO = NON_FEA_GRAVITY_METHOD_AUTO;
export const EMPIRICAL_GRAVITY_METHOD_SELECTION_SCHEMA =
  'empirical-gravity-method-selection/v1';
export const EMPIRICAL_GOVERNED_GRAVITY_METHOD_SELECTION_SCHEMA =
  'empirical-governed-gravity-method-selection/v1';

const BEAM_CONTACT = 'EMPIRICAL_BEAM_CONTACT_V1';
const ALLOWED_REQUESTS = Object.freeze([
  EMPIRICAL_GRAVITY_AUTO,
  EMPIRICAL_LOAD_COG_METHOD,
  EMPIRICAL_LOAD_METHOD,
]);

export function evaluateEmpiricalGravityMethodSelection(input = {}) {
  const requestedMethod = methodRequest(input.requestedMethod ?? EMPIRICAL_GRAVITY_AUTO);
  const componentAuthorityAudit = auditEmpiricalComponentLoadAuthority({
    dataset: input.dataset,
    profile: input.profile,
    routePartitionModel: input.routePartitionModel,
  });
  return createEmpiricalGravityMethodSelection({ requestedMethod, componentAuthorityAudit });
}

/**
 * Evaluates the existing selector from a hash-bound effective Project Data
 * method request. This wrapper does not authorize execution and does not alter
 * the selector policy or result schema.
 */
export function evaluateGovernedEmpiricalGravityMethodSelection(input = {}) {
  const componentAuthorityAudit = auditEmpiricalComponentLoadAuthority({
    dataset: input.dataset,
    profile: input.profile,
    routePartitionModel: input.routePartitionModel,
  });
  return createGovernedEmpiricalGravityMethodSelection({
    gravityMethodAuthority: input.gravityMethodAuthority,
    componentAuthorityAudit,
  });
}

export function createGovernedEmpiricalGravityMethodSelection(input = {}) {
  const authority = requireReadyNonFeaGravityMethodAuthority(input.gravityMethodAuthority);
  const audit = requireEmpiricalComponentLoadAuthorityAudit(input.componentAuthorityAudit);
  if (audit.projectDataProfileSemanticHash !== authority.projectDataSemanticHash) {
    throw codedError(
      'Gravity-method authority and component-load audit do not bind the same effective Project Data profile.',
      'EMPIRICAL_GRAVITY_METHOD_AUTHORITY_PROFILE_MISMATCH',
      {
        authorityProjectDataSemanticHash: authority.projectDataSemanticHash,
        auditProjectDataProfileSemanticHash: audit.projectDataProfileSemanticHash,
      },
    );
  }
  const selection = createEmpiricalGravityMethodSelection({
    requestedMethod: authority.requestedMethod,
    componentAuthorityAudit: audit,
  });
  const base = {
    schema: EMPIRICAL_GOVERNED_GRAVITY_METHOD_SELECTION_SCHEMA,
    gravityMethodAuthority: authority,
    selection,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function createEmpiricalGravityMethodSelection(input = {}) {
  const requestedMethod = methodRequest(input.requestedMethod ?? EMPIRICAL_GRAVITY_AUTO);
  const audit = requireEmpiricalComponentLoadAuthorityAudit(input.componentAuthorityAudit);
  const classification = classifyAudit(audit);
  const explicit = requestedMethod !== EMPIRICAL_GRAVITY_AUTO;
  const choice = explicit
    ? explicitChoice(requestedMethod, classification)
    : autoChoice(classification);
  const candidates = candidateRows(classification, choice.selectedMethod);
  const fallbackLedger = fallbackRows(requestedMethod, classification, choice);
  const base = {
    schema: EMPIRICAL_GRAVITY_METHOD_SELECTION_SCHEMA,
    requestedMethod,
    selectedMethod: choice.selectedMethod,
    selectionState: choice.selectionState,
    componentAuthorityAuditSemanticHash: audit.semanticHash,
    candidates,
    fallbackLedger,
    assumptions: choice.assumptions,
    exceptions: classification.exceptions,
    policy: {
      highestFidelityQualifiedMethodFirst: true,
      missingCogMayFallbackToV2: true,
      knownOffRouteCogMayFallbackToV2: false,
      ambiguousCogMayFallbackToV2: false,
      invalidCogEvidenceMayFallbackToV2: false,
      explicitMomentMayFallbackToV2: false,
      beamContactIsSeparateMechanicsFamily: true,
      selectionIsNotExecutionAuthorization: true,
    },
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function requireEmpiricalGravityMethodSelection(value) {
  if (!value || value.schema !== EMPIRICAL_GRAVITY_METHOD_SELECTION_SCHEMA) {
    throw new TypeError(`Expected ${EMPIRICAL_GRAVITY_METHOD_SELECTION_SCHEMA}.`);
  }
  const { semanticHash: supplied, ...base } = value;
  if (supplied !== semanticHash(base)) {
    throw new TypeError('Empirical gravity method-selection semantic hash mismatch.');
  }
  methodRequest(value.requestedMethod);
  if (value.selectedMethod !== null) methodRequest(value.selectedMethod);
  return deepFreeze(structuredClone(value));
}

export function requireGovernedEmpiricalGravityMethodSelection(value) {
  if (!value || value.schema !== EMPIRICAL_GOVERNED_GRAVITY_METHOD_SELECTION_SCHEMA) {
    throw new TypeError(`Expected ${EMPIRICAL_GOVERNED_GRAVITY_METHOD_SELECTION_SCHEMA}.`);
  }
  const { semanticHash: supplied, ...base } = value;
  if (supplied !== semanticHash(base)) {
    throw new TypeError('Governed empirical gravity method-selection semantic hash mismatch.');
  }
  const authority = requireReadyNonFeaGravityMethodAuthority(value.gravityMethodAuthority);
  const selection = requireEmpiricalGravityMethodSelection(value.selection);
  if (selection.requestedMethod !== authority.requestedMethod) {
    throw codedError(
      'Governed selector request differs from gravity-method authority.',
      'EMPIRICAL_GRAVITY_METHOD_AUTHORITY_REQUEST_MISMATCH',
    );
  }
  return deepFreeze(structuredClone(value));
}

function classifyAudit(audit) {
  const records = audit.records || [];
  const missingCog = records.filter((row) => (
    row.cogClassification === EMPIRICAL_COMPONENT_COG_CLASSIFICATION.MIDPOINT_FALLBACK
  ));
  const onRouteCog = records.filter((row) => (
    row.cogClassification === EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE
  ));
  const hard = records.filter(hasFallbackProhibitingEvidence);
  const otherBlocked = records.filter((row) => (
    row.integrationEligible !== true && !hard.includes(row)
  ));
  const exceptions = [...hard, ...otherBlocked].map((row) => deepFreeze({
    entityId: row.entityId,
    routeId: row.routeId,
    cogClassification: row.cogClassification,
    blockerCodes: (row.blockers || []).map((item) => item.code).sort(),
    explicitMomentNm: row.explicitMoment?.magnitudeNm ?? null,
    disposition: row.integrationDisposition,
  })).sort(byEntity);
  return deepFreeze({
    componentCount: records.length,
    missingCogCount: missingCog.length,
    onRouteCogCount: onRouteCog.length,
    hardExceptionCount: hard.length,
    otherBlockedCount: otherBlocked.length,
    missingCogIds: missingCog.map((row) => row.entityId).sort(),
    hardExceptionIds: hard.map((row) => row.entityId).sort(),
    exceptions,
  });
}

function autoChoice(state) {
  if (state.hardExceptionCount > 0 || state.otherBlockedCount > 0) {
    return deepFreeze({
      selectedMethod: null,
      selectionState: 'EXCEPTION_POLICY_REQUIRED',
      assumptions: [],
    });
  }
  if (state.componentCount === 0) {
    return deepFreeze({
      selectedMethod: EMPIRICAL_LOAD_METHOD,
      selectionState: 'SELECTED_V2_NO_COG_FIDELITY_GAIN',
      assumptions: [],
    });
  }
  if (state.missingCogCount > 0) {
    return deepFreeze({
      selectedMethod: EMPIRICAL_LOAD_METHOD,
      selectionState: 'SELECTED_V2_MISSING_COG_FALLBACK',
      assumptions: state.missingCogIds.map((entityId) => deepFreeze({
        entityId,
        code: 'GEOMETRIC_MIDPOINT_APPLICATION',
        reason: 'No qualified component CoG evidence is available.',
      })),
    });
  }
  return deepFreeze({
    selectedMethod: EMPIRICAL_LOAD_COG_METHOD,
    selectionState: 'SELECTED_V3_COG',
    assumptions: [],
  });
}

function explicitChoice(requestedMethod, state) {
  if (requestedMethod === EMPIRICAL_LOAD_COG_METHOD) {
    if (state.hardExceptionCount > 0 || state.otherBlockedCount > 0) {
      return deepFreeze({ selectedMethod: null, selectionState: 'EXPLICIT_V3_OUTSIDE_QUALIFIED_INPUT_DOMAIN', assumptions: [] });
    }
    if (state.missingCogCount > 0) {
      return deepFreeze({ selectedMethod: null, selectionState: 'EXPLICIT_V3_COG_INPUT_INCOMPLETE', assumptions: [] });
    }
    return deepFreeze({ selectedMethod: requestedMethod, selectionState: 'EXPLICIT_V3_SELECTED', assumptions: [] });
  }
  if (state.hardExceptionCount > 0 || state.otherBlockedCount > 0) {
    return deepFreeze({ selectedMethod: null, selectionState: 'EXPLICIT_V2_FALLBACK_PROHIBITED_BY_KNOWN_EVIDENCE', assumptions: [] });
  }
  return deepFreeze({
    selectedMethod: requestedMethod,
    selectionState: 'EXPLICIT_V2_SELECTED',
    assumptions: state.missingCogIds.map((entityId) => deepFreeze({
      entityId,
      code: 'GEOMETRIC_MIDPOINT_APPLICATION',
      reason: 'Explicit V2 uses the qualified midpoint application rule.',
    })),
  });
}

function candidateRows(state, selectedMethod) {
  return deepFreeze([
    candidate(EMPIRICAL_LOAD_COG_METHOD,
      state.hardExceptionCount || state.otherBlockedCount
        ? 'OUTSIDE_QUALIFIED_INPUT_DOMAIN'
        : state.missingCogCount ? 'INPUT_INCOMPLETE' : 'READY',
      selectedMethod),
    candidate(EMPIRICAL_LOAD_METHOD,
      state.hardExceptionCount || state.otherBlockedCount
        ? 'FALLBACK_PROHIBITED_BY_KNOWN_EVIDENCE' : 'READY',
      selectedMethod),
    deepFreeze({
      methodId: BEAM_CONTACT,
      registration: registration(BEAM_CONTACT),
      applicability: 'SEPARATE_RESTRICTED_MECHANICS_FAMILY',
      inputState: 'NOT_EVALUATED_BY_CHAINAGE_SELECTOR',
      selected: false,
      reason: 'Beam/contact requires independent planarity, component-type, boundary and restraint-capability qualification.',
    }),
  ]);
}

function fallbackRows(requestedMethod, state, choice) {
  if (requestedMethod !== EMPIRICAL_GRAVITY_AUTO) return deepFreeze([]);
  if (choice.selectedMethod === EMPIRICAL_LOAD_METHOD && state.missingCogCount > 0) {
    return deepFreeze([{
      fromMethod: EMPIRICAL_LOAD_COG_METHOD,
      toMethod: EMPIRICAL_LOAD_METHOD,
      reasonCode: 'COG_NOT_AVAILABLE',
      affectedEntityIds: state.missingCogIds,
      permittedByPolicy: true,
    }]);
  }
  if (choice.selectedMethod === null) {
    return deepFreeze([{
      fromMethod: EMPIRICAL_LOAD_COG_METHOD,
      toMethod: EMPIRICAL_LOAD_METHOD,
      reasonCode: 'KNOWN_ECCENTRICITY_OR_UNQUALIFIED_COMPONENT_EVIDENCE',
      affectedEntityIds: state.hardExceptionIds,
      permittedByPolicy: false,
    }]);
  }
  return deepFreeze([]);
}

function candidate(methodId, inputState, selectedMethod) {
  return deepFreeze({
    methodId,
    registration: registration(methodId),
    applicability: 'VERTICAL_CHAINAGE_DISTRIBUTION',
    inputState,
    selected: selectedMethod === methodId,
  });
}

function registration(methodId) {
  const row = getEmpiricalMethodRegistration(methodId);
  return row ? deepFreeze(structuredClone(row)) : null;
}

function hasFallbackProhibitingEvidence(row) {
  if ((row.explicitMoment?.magnitudeNm ?? 0) > 0) return true;
  return [
    EMPIRICAL_COMPONENT_COG_CLASSIFICATION.OFF_ROUTE,
    EMPIRICAL_COMPONENT_COG_CLASSIFICATION.AMBIGUOUS,
    EMPIRICAL_COMPONENT_COG_CLASSIFICATION.INVALID,
  ].includes(row.cogClassification);
}

function methodRequest(value) {
  const method = String(value || '').trim();
  if (!ALLOWED_REQUESTS.includes(method)) {
    throw new RangeError(`Unsupported empirical gravity method request: ${method || 'EMPTY'}.`);
  }
  return method;
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function byEntity(left, right) {
  return `${left.entityId}|${left.routeId}`.localeCompare(`${right.entityId}|${right.routeId}`);
}
