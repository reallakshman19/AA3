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
  buildLfeaNativeSupportCaseChains,
  lfeaNativeSupportPublicationCurrentnessReasons,
  lfeaNativeSupportPublicationParent,
} from './native-support-publication-case-chain.js';

/**
 * Own explicit support/interface authority and its current-only published
 * support actions. It never infers support semantics from InputXML restraints.
 */
export function createLfeaNativeSupportPublicationAuthority() {
  let state = emptyState();

  function install(preFlightRecord, input) {
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
      authorityCurrentness: LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT,
      authority: sealLfeaNativeSupportAuthority(preFlight, accepted, interfaceSet),
      authorityStaleReasonCodes: [],
      publicationCurrentness: LFEA_NATIVE_SUPPORT_CURRENTNESS.NONE,
      publications: null,
      publicationStaleReasonCodes: [],
      publicationParent: null,
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
    state = deepFreeze({
      ...state,
      authorityCurrentness: authorityReasons.length
        ? LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE
        : LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT,
      authorityStaleReasonCodes: authorityReasons,
      publicationCurrentness: publicationCurrentness(
        state.publications,
        authorityReasons,
        publicationReasons,
      ),
      publicationStaleReasonCodes: uniqueAscii([
        ...authorityReasons,
        ...publicationReasons,
      ]),
    });
    return state;
  }

  function readinessAuthority(preFlightRecord, executionState, resultsState) {
    reconcile(preFlightRecord, executionState, resultsState);
    if (state.authorityCurrentness !== LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT) return null;
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
        'LFEA_NATIVE_SUPPORT_AUTHORITY_CURRENT_REQUIRED',
        'Current governed support authority is required before publication.',
      );
    }
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
    const reason = 'CURRENT_SUPPORT_AUTHORITY_CLEARED';
    state = deepFreeze({
      ...state,
      authorityCurrentness: LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE,
      authorityStaleReasonCodes: [reason],
      publicationCurrentness: state.publications === null
        ? LFEA_NATIVE_SUPPORT_CURRENTNESS.NONE
        : LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE,
      publicationStaleReasonCodes: state.publications === null ? [] : [reason],
    });
    return state;
  }

  return Object.freeze({
    install,
    reconcile,
    readinessAuthority,
    publish,
    clearCurrentAuthority,
    getState: () => state,
    getCurrentAuthority: () => state.authorityCurrentness === LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT
      ? state.authority
      : null,
    getCurrentPublications: () => state.publicationCurrentness === LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT
      ? state.publications
      : null,
  });
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

function publicationCurrentness(publications, authorityReasons, publicationReasons) {
  if (publications === null) return LFEA_NATIVE_SUPPORT_CURRENTNESS.NONE;
  return authorityReasons.length || publicationReasons.length
    ? LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE
    : LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT;
}

function emptyState() {
  return deepFreeze({
    authorityCurrentness: LFEA_NATIVE_SUPPORT_CURRENTNESS.NONE,
    authority: null,
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
