import {
  B31_APPLICATION_REQUEST_SCHEMA,
  compileLinearPipingB31Application,
} from '../core/linear-piping-code-application/index.js';
import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import {
  LFEA_NATIVE_B31_CURRENTNESS,
  LFEA_NATIVE_B31_REVIEW_REQUIRED,
  lfeaNativeB31AuthorityCurrentnessReasons,
  lfeaNativeB31Error,
  requireLfeaNativeB31AuthorityInput,
  requireRunnableB31PreFlight,
  sealLfeaNativeB31Authority,
} from './native-b31-authority-contract.js';
import {
  requireLfeaNativeB31Authorization,
  sealLfeaNativeB31Authorization,
} from './native-b31-authorization.js';
import {
  buildLfeaNativeB31CaseChains,
  lfeaNativeB31PublicationCurrentnessReasons,
  lfeaNativeB31PublicationParent,
} from './native-b31-case-chain.js';
import {
  codeStationFor,
  createLfeaNativeStraightCodeStationAuthority,
} from './native-b31-code-stations.js';

/** Own reviewed straight-pipe code-point authority and governed B31 output. */
export function createLfeaNativeB31PublicationAuthority() {
  let state = emptyState();

  function stage(preFlightRecord, input) {
    const { preFlight, input: accepted } = requireLfeaNativeB31AuthorityInput(preFlightRecord, input);
    const codeStationAuthority = createLfeaNativeStraightCodeStationAuthority(
      preFlight,
      accepted.checks,
    );
    state = deepFreeze({
      authorityCurrentness: LFEA_NATIVE_B31_REVIEW_REQUIRED,
      authority: sealLfeaNativeB31Authority(preFlight, accepted, codeStationAuthority),
      authorization: null,
      authorityStaleReasonCodes: [],
      publicationCurrentness: LFEA_NATIVE_B31_CURRENTNESS.NONE,
      application: null,
      codeRecoveries: null,
      publicationStaleReasonCodes: [],
      publicationParent: null,
    });
    return state;
  }

  function authorize(preFlightRecord, approval) {
    if (state.authorityCurrentness !== LFEA_NATIVE_B31_REVIEW_REQUIRED || !state.authority) {
      throw lfeaNativeB31Error(
        'LFEA_NATIVE_B31_REVIEW_REQUIRED',
        'A current staged B31 authority is required before review acceptance.',
      );
    }
    const reasons = lfeaNativeB31AuthorityCurrentnessReasons(preFlightRecord, state.authority);
    if (reasons.length) {
      state = staleState(state, reasons);
      throw lfeaNativeB31Error(
        'LFEA_NATIVE_B31_REVIEW_STALE',
        'Staged B31 authority became stale before review acceptance.',
      );
    }
    state = deepFreeze({
      ...state,
      authorityCurrentness: LFEA_NATIVE_B31_CURRENTNESS.CURRENT,
      authorization: sealLfeaNativeB31Authorization(state.authority, approval),
      authorityStaleReasonCodes: [],
    });
    return state;
  }

  function reconcile(preFlightRecord, executionState, resultsState) {
    if (!state.authority) return state;
    const authorityReasons = lfeaNativeB31AuthorityCurrentnessReasons(
      preFlightRecord,
      state.authority,
    );
    const publicationReasons = lfeaNativeB31PublicationCurrentnessReasons(
      executionState,
      resultsState,
      state.publicationParent,
    );
    const authorityCurrentness = nextAuthorityCurrentness(state, authorityReasons);
    state = deepFreeze({
      ...state,
      authorityCurrentness,
      authorityStaleReasonCodes: authorityReasons.length
        ? authorityReasons : state.authorityStaleReasonCodes,
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
    if (state.authorityCurrentness !== LFEA_NATIVE_B31_CURRENTNESS.CURRENT) return null;
    requireLfeaNativeB31Authorization(state.authorization, state.authority);
    try {
      const chains = buildLfeaNativeB31CaseChains(
        requireRunnableB31PreFlight(preFlightRecord),
        executionState,
        resultsState,
        state.authority,
      );
      return deepFreeze({
        codeProfile: state.authority.codeProfile,
        editionDataset: state.authority.editionDataset,
        checks: state.authority.checks,
        codeRecoveryByCase: Object.freeze(Object.fromEntries(chains.map((row) => [
          row.caseId,
          row.codeRecovery,
        ]))),
      });
    } catch {
      return deepFreeze({
        codeProfile: state.authority.codeProfile,
        editionDataset: state.authority.editionDataset,
        checks: state.authority.checks,
        codeRecoveryByCase: null,
      });
    }
  }

  function publish(preFlightRecord, executionState, resultsState) {
    reconcile(preFlightRecord, executionState, resultsState);
    if (state.authorityCurrentness !== LFEA_NATIVE_B31_CURRENTNESS.CURRENT) {
      throw lfeaNativeB31Error(
        state.authorityCurrentness === LFEA_NATIVE_B31_REVIEW_REQUIRED
          ? 'LFEA_NATIVE_B31_REVIEW_REQUIRED'
          : 'LFEA_NATIVE_B31_AUTHORITY_CURRENT_REQUIRED',
        'Reviewed current B31 authority is required before publication.',
      );
    }
    requireLfeaNativeB31Authorization(state.authorization, state.authority);
    const preFlight = requireRunnableB31PreFlight(preFlightRecord);
    const chains = buildLfeaNativeB31CaseChains(
      preFlight,
      executionState,
      resultsState,
      state.authority,
    );
    const application = compileLinearPipingB31Application({
      schema: B31_APPLICATION_REQUEST_SCHEMA,
      applicationId: applicationId(state.authority, resultsState.results.semanticHash),
      codeProfile: state.authority.codeProfile,
      editionDataset: state.authority.editionDataset,
      cases: chains.map((row) => ({
        caseId: row.caseId,
        loadCase: row.loadCase,
        recovery: row.codeRecovery.augmentedRecovery,
      })),
      checks: buildApplicationChecks(preFlight, chains, state.authority),
    });
    state = deepFreeze({
      ...state,
      publicationCurrentness: LFEA_NATIVE_B31_CURRENTNESS.CURRENT,
      application,
      codeRecoveries: Object.freeze(chains.map((row) => deepFreeze({
        caseId: row.caseId,
        baseRecoverySemanticHash: row.baseRecoverySemanticHash,
        codeRecoverySemanticHash: row.codeRecovery.semanticHash,
        augmentedRecoverySemanticHash: row.codeRecovery.augmentedRecovery.semanticHash,
      }))),
      publicationStaleReasonCodes: [],
      publicationParent: lfeaNativeB31PublicationParent(
        executionState,
        resultsState,
        state.authority,
      ),
    });
    return state;
  }

  function clearCurrentAuthority() {
    if (!state.authority) return state;
    state = staleState(state, ['CURRENT_B31_AUTHORITY_CLEARED']);
    return state;
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
    getCurrentAuthority: () => state.authorityCurrentness === LFEA_NATIVE_B31_CURRENTNESS.CURRENT
      ? state.authority : null,
    getCurrentApplication: () => state.publicationCurrentness === LFEA_NATIVE_B31_CURRENTNESS.CURRENT
      ? state.application : null,
  });
}

function buildApplicationChecks(preFlight, chains, authority) {
  const structural = preFlight.preparation.structuralPreparation;
  const materials = new Map(structural.materialResolutions.map((row) => [row.semanticHash, row]));
  const sections = new Map(structural.sectionResolutions.map((row) => [row.semanticHash, row]));
  const chainById = new Map(chains.map((row) => [row.caseId, row]));
  return authority.checks.map((check) => {
    const { component, station } = codeStationFor(
      authority.codeStationAuthority,
      check.elementId,
      check.end,
    );
    const evaluationCase = chainById.get(check.evaluationCaseId);
    const frameElementRecord = evaluationCase?.frameElementById?.[check.elementId];
    const sectionResolution = sections.get(component.analysisSectionSemanticHash);
    const materialResolution = materials.get(component.materialResolutionSemanticHash);
    if (!evaluationCase || !frameElementRecord || !sectionResolution || !materialResolution) {
      throw lfeaNativeB31Error(
        'LFEA_NATIVE_B31_CHECK_PARENT_MISSING',
        `B31 check ${check.checkId} lacks exact frame/section/material authority.`,
      );
    }
    return {
      checkId: check.checkId,
      category: check.category,
      codePointId: station.stationId,
      componentId: component.componentId,
      combinationId: check.combinationId,
      actionSource: check.actionSource,
      frameElementRecord,
      sectionResolution,
      sustainedSectionResolution: null,
      materialResolution,
      stressFactorSet: check.stressFactorSet,
      pressureStressContribution: check.pressureStressContribution,
      coldTemperature: check.coldTemperature,
      sustainedStress: check.sustainedStress,
      occasionalCategoryId: check.occasionalCategoryId,
    };
  });
}

function applicationId(authority, recoveryBatchHash) {
  return `LFEA-B31-${semanticHash({
    authority: authority.semanticHash,
    recoveryBatchHash,
  }).slice('fnv1a64:'.length).toUpperCase()}`;
}
function nextAuthorityCurrentness(state, reasons) {
  if (state.authorityCurrentness === LFEA_NATIVE_B31_CURRENTNESS.STALE) return LFEA_NATIVE_B31_CURRENTNESS.STALE;
  return reasons.length ? LFEA_NATIVE_B31_CURRENTNESS.STALE : state.authorityCurrentness;
}
function nextPublicationCurrentness(state, authorityCurrentness, publicationReasons) {
  if (!state.application) return LFEA_NATIVE_B31_CURRENTNESS.NONE;
  if (state.publicationCurrentness === LFEA_NATIVE_B31_CURRENTNESS.STALE) return LFEA_NATIVE_B31_CURRENTNESS.STALE;
  return authorityCurrentness === LFEA_NATIVE_B31_CURRENTNESS.CURRENT && publicationReasons.length === 0
    ? LFEA_NATIVE_B31_CURRENTNESS.CURRENT : LFEA_NATIVE_B31_CURRENTNESS.STALE;
}
function nextPublicationReasons(state, authorityReasons, publicationReasons) {
  if (state.publicationCurrentness === LFEA_NATIVE_B31_CURRENTNESS.STALE
    && authorityReasons.length === 0 && publicationReasons.length === 0) {
    return state.publicationStaleReasonCodes;
  }
  return uniqueAscii([...authorityReasons, ...publicationReasons]);
}
function staleState(state, reasons) {
  return deepFreeze({
    ...state,
    authorityCurrentness: LFEA_NATIVE_B31_CURRENTNESS.STALE,
    authorityStaleReasonCodes: uniqueAscii(reasons),
    publicationCurrentness: state.application
      ? LFEA_NATIVE_B31_CURRENTNESS.STALE : LFEA_NATIVE_B31_CURRENTNESS.NONE,
    publicationStaleReasonCodes: state.application ? uniqueAscii(reasons) : [],
  });
}
function emptyState() {
  return deepFreeze({
    authorityCurrentness: LFEA_NATIVE_B31_CURRENTNESS.NONE,
    authority: null,
    authorization: null,
    authorityStaleReasonCodes: [],
    publicationCurrentness: LFEA_NATIVE_B31_CURRENTNESS.NONE,
    application: null,
    codeRecoveries: null,
    publicationStaleReasonCodes: [],
    publicationParent: null,
  });
}
function uniqueAscii(values) { return [...new Set(values)].sort(compareAscii); }
function compareAscii(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
