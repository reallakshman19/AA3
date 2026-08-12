import {
  compileLinearPipingInterfaceSet,
  recoverLinearPipingInterfaceLoads,
} from '../core/linear-piping-interface/index.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import { createLinearPipingSupportActionsPublication } from '../workspace/linear-piping-support-actions-publication.js';
import {
  LFEA_NATIVE_SUPPORT_CURRENTNESS,
  lfeaNativeSupportAuthorityCurrentnessReasons,
  lfeaNativeSupportError,
  requireLfeaNativeSupportAuthorityInput,
  requireRunnableSupportPreFlight,
  sealLfeaNativeSupportAuthority,
} from './native-support-authority-contract.js';
import {
  requireLfeaNativeSupportAuthorization,
  sealLfeaNativeSupportAuthorization,
} from './native-support-authorization.js';
import {
  buildLfeaNativeSupportCaseChains,
  lfeaNativeSupportPublicationCurrentnessReasons,
  lfeaNativeSupportPublicationParent,
} from './native-support-publication-case-chain.js';

const REVIEW_REQUIRED = 'REVIEW_REQUIRED';

/**
 * Own staged/reviewed support authority and current-only support publication.
 * Support semantics never come from InputXML restraint rows by inference.
 */
export function createLfeaNativeSupportPublicationAuthority() {
  let state = emptyState();

  function stage(preFlightRecord, input) {
    const { preFlight, input: accepted } = requireLfeaNativeSupportAuthorityInput(
      preFlightRecord,
      input,
    );
    const interfaceSet = compileLinearPipingInterfaceSet({
      compilation: preFlight.preparation.structuralPreparation.compilation,
      supportAttachmentModel: accepted.supportAttachmentModel,
      restraintCapabilityModel: accepted.restraintCapabilityModel,
      definitions: accepted.definitions,
      profile: accepted.interfaceProfile,
    });
    state = deepFreeze({
      authorityCurrentness: REVIEW_REQUIRED,
      authority: sealLfeaNativeSupportAuthority(preFlight, accepted, interfaceSet),
      authorization: null,
      authorityStaleReasonCodes: [],
      publicationCurrentness: LFEA_NATIVE_SUPPORT_CURRENTNESS.NONE,
      publications: null,
      publicationStaleReasonCodes: [],
      publicationParent: null,
    });
    return state;
  }

  function authorize(preFlightRecord, approval) {
    if (state.authorityCurrentness !== REVIEW_REQUIRED || state.authority === null) {
      throw lfeaNativeSupportError(
        'LFEA_NATIVE_SUPPORT_REVIEW_REQUIRED',
        'A current staged support authority is required before review acceptance.',
      );
    }
    const reasons = lfeaNativeSupportAuthorityCurrentnessReasons(
      preFlightRecord,
      state.authority,
    );
    if (reasons.length) {
      state = staleAuthorityState(state, reasons);
      throw lfeaNativeSupportError(
        'LFEA_NATIVE_SUPPORT_REVIEW_STALE',
        'Staged support authority became stale before review acceptance.',
      );
    }
    const authorization = sealLfeaNativeSupportAuthorization(state.authority, approval);
    state = deepFreeze({
      ...state,
      authorityCurrentness: LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT,
      authorization,
      authorityStaleReasonCodes: [],
    });
    return state;
  }

  function reconcile(preFlightRecord, executionState, resultsState) {
    if (state.authority === null) return state;
    const authorityReasons = lfeaNativeSupportAuthorityCurrentnessReasons(
      preFlightRecord,
      state.authority,
    );
    const publicationReasons = lfeaNativeSupportPublicationCurrentnessReasons(
      executionState,
      resultsState,
      state.publicationParent,
    );
    const authorityCurrentness = nextAuthorityCurrentness(state, authorityReasons);
    state = deepFreeze({
      ...state,
      authorityCurrentness,
      authorityStaleReasonCodes: authorityReasons.length
        ? authorityReasons
        : state.authorityStaleReasonCodes,
      publicationCurrentness: nextPublicationCurrentness(
        state,
        authorityCurrentness,
        publicationReasons,
      ),
      publicationStaleReasonCodes: nextPublicationReasons(
        state,
        authorityReasons,
        publicationReasons,
      ),
    });
    return state;
  }

  function readinessAuthority(preFlightRecord, executionState, resultsState) {
    reconcile(preFlightRecord, executionState, resultsState);
    if (state.authorityCurrentness !== LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT) return null;
    requireLfeaNativeSupportAuthorization(state.authorization, state.authority);
    const base = {
      interfaceSet: state.authority.interfaceSet,
      upGlobal: state.authority.upGlobal.value,
      parallelTolerance: state.authority.parallelTolerance.value,
    };
    try {
      const cases = buildLfeaNativeSupportCaseChains(
        preFlightRecord,
        executionState,
        resultsState,
      );
      return deepFreeze({
        ...base,
        analysisResultByCase: Object.freeze(Object.fromEntries(
          cases.map((row) => [row.caseId, row.analysisResult]),
        )),
      });
    } catch {
      return deepFreeze({ ...base, analysisResultByCase: null });
    }
  }

  function publish(preFlightRecord, executionState, resultsState) {
    reconcile(preFlightRecord, executionState, resultsState);
    if (state.authorityCurrentness !== LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT) {
      throw lfeaNativeSupportError(
        state.authorityCurrentness === REVIEW_REQUIRED
          ? 'LFEA_NATIVE_SUPPORT_REVIEW_REQUIRED'
          : 'LFEA_NATIVE_SUPPORT_AUTHORITY_CURRENT_REQUIRED',
        'Reviewed current support authority is required before publication.',
      );
    }
    requireLfeaNativeSupportAuthorization(state.authorization, state.authority);
    const preFlight = requireRunnableSupportPreFlight(preFlightRecord);
    const cases = buildLfeaNativeSupportCaseChains(
      preFlight,
      executionState,
      resultsState,
    );
    const publications = Object.freeze(cases.map((row) => publishCase(
      preFlight,
      row,
      state.authority,
    )));
    state = deepFreeze({
      ...state,
      publicationCurrentness: LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT,
      publications,
      publicationStaleReasonCodes: [],
      publicationParent: lfeaNativeSupportPublicationParent(
        executionState,
        resultsState,
        state.authority,
      ),
    });
    return state;
  }

  function clearCurrentAuthority() {
    if (state.authority === null) return state;
    return setState(staleAuthorityState(state, ['CURRENT_SUPPORT_AUTHORITY_CLEARED']));
  }

  return Object.freeze({
    stage,
    authorize,
    reconcile,
    readinessAuthority,
    publish,
    clearCurrentAuthority,
    getState: () => state,
    getStagedAuthority: () => state.authority,
    getCurrentAuthority: () => state.authorityCurrentness === LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT
      ? state.authority
      : null,
    getCurrentPublications: () => state.publicationCurrentness === LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT
      ? state.publications
      : null,
  });

  function setState(next) {
    state = next;
    return state;
  }
}

function publishCase(preFlight, row, authority) {
  const interfaceRecovery = recoverLinearPipingInterfaceLoads({
    interfaceSet: authority.interfaceSet,
    analysisResult: row.analysisResult,
    loadCase: row.loadCase,
  });
  const publication = createLinearPipingSupportActionsPublication({
    interfaceSet: authority.interfaceSet,
    interfaceRecovery,
    sourceSemanticHash: preFlight.preparation.sourceBundleSemanticHash,
    modelVersion: authority.modelVersion.value,
    upGlobal: authority.upGlobal.value,
    parallelTolerance: authority.parallelTolerance.value,
  });
  return deepFreeze({
    caseId: row.caseId,
    analysisResultSemanticHash: row.analysisResult.semanticHash,
    interfaceRecovery,
    publication,
  });
}

function nextAuthorityCurrentness(state, reasons) {
  if (state.authorityCurrentness === LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE) {
    return LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE;
  }
  return reasons.length ? LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE : state.authorityCurrentness;
}

function nextPublicationCurrentness(state, authorityCurrentness, publicationReasons) {
  if (state.publications === null) return LFEA_NATIVE_SUPPORT_CURRENTNESS.NONE;
  if (state.publicationCurrentness === LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE) {
    return LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE;
  }
  return authorityCurrentness === LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT
    && publicationReasons.length === 0
    ? LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT
    : LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE;
}

function nextPublicationReasons(state, authorityReasons, publicationReasons) {
  if (state.publicationCurrentness === LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE
    && authorityReasons.length === 0 && publicationReasons.length === 0) {
    return state.publicationStaleReasonCodes;
  }
  return uniqueAscii([...authorityReasons, ...publicationReasons]);
}

function staleAuthorityState(state, reasons) {
  return deepFreeze({
    ...state,
    authorityCurrentness: LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE,
    authorityStaleReasonCodes: uniqueAscii(reasons),
    publicationCurrentness: state.publications === null
      ? LFEA_NATIVE_SUPPORT_CURRENTNESS.NONE
      : LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE,
    publicationStaleReasonCodes: state.publications === null
      ? []
      : uniqueAscii(reasons),
  });
}

function emptyState() {
  return deepFreeze({
    authorityCurrentness: LFEA_NATIVE_SUPPORT_CURRENTNESS.NONE,
    authority: null,
    authorization: null,
    authorityStaleReasonCodes: [],
    publicationCurrentness: LFEA_NATIVE_SUPPORT_CURRENTNESS.NONE,
    publications: null,
    publicationStaleReasonCodes: [],
    publicationParent: null,
  });
}

function uniqueAscii(values) {
  return [...new Set(values)].sort(compareAscii);
}
function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
