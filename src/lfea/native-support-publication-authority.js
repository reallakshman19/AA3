import {
  LINEAR_PIPING_ANALYSIS_REQUEST_SCHEMA,
  composeLinearPipingAnalysisResult,
  deriveLinearPipingParentSet,
} from '../core/linear-piping-analysis-consumer/index.js';
import { compileInputXmlExecutionElementAuthorities } from '../core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js';
import { inputXmlProductionRecoveryProfile } from '../core/linear-piping-analysis-consumer/inputxml-linear-recovery-profile.js';
import {
  inputXmlStiffnessFrameElementProfile,
  inputXmlStiffnessSolverProfile,
} from '../core/linear-piping-analysis-consumer/inputxml-linear-stiffness-profile.js';
import {
  compileLinearPipingInterfaceSet,
  recoverLinearPipingInterfaceLoads,
} from '../core/linear-piping-interface/index.js';
import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import { createLinearPipingSupportActionsPublication } from '../workspace/linear-piping-support-actions-publication.js';
import { requireLinearPipingInputXmlPreFlight } from '../workspace/linear-piping-inputxml-prefea.js';

export const LFEA_NATIVE_SUPPORT_AUTHORITY_SCHEMA = 'lfea-native-support-authority/v1';
export const LFEA_NATIVE_SUPPORT_CURRENTNESS = Object.freeze({
  NONE: 'NONE', CURRENT: 'CURRENT', STALE: 'STALE',
});

const INPUT_KEYS = Object.freeze([
  'parentSourceBundleSemanticHash', 'parentModelSemanticHash',
  'supportAttachmentModel', 'restraintCapabilityModel', 'definitions', 'interfaceProfile',
  'upGlobal', 'parallelTolerance', 'modelVersion',
]);

/**
 * Own explicit support/interface authority and its current-only published
 * support actions. This layer composes existing governed producers only; it
 * never infers support semantics from InputXML global restraint rows.
 */
export function createLfeaNativeSupportPublicationAuthority() {
  let state = emptyState();

  function install(preFlightRecord, input) {
    const preFlight = requireRunnablePreFlight(preFlightRecord);
    const accepted = requireAuthorityInput(input, preFlight);
    const interfaceSet = compileLinearPipingInterfaceSet({
      compilation: preFlight.preparation.structuralPreparation.compilation,
      supportAttachmentModel: accepted.supportAttachmentModel,
      restraintCapabilityModel: accepted.restraintCapabilityModel,
      definitions: accepted.definitions,
      profile: accepted.interfaceProfile,
    });
    state = deepFreeze({
      authorityCurrentness: LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT,
      authority: sealAuthority(preFlight, accepted, interfaceSet),
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
    const authorityReasons = authorityCurrentnessReasons(preFlightRecord, state.authority);
    const publicationReasons = publicationCurrentnessReasons(
      executionState, resultsState, state.publicationParent,
    );
    state = deepFreeze({
      ...state,
      authorityCurrentness: authorityReasons.length
        ? LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE
        : LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT,
      authorityStaleReasonCodes: authorityReasons,
      publicationCurrentness: state.publications === null
        ? LFEA_NATIVE_SUPPORT_CURRENTNESS.NONE
        : authorityReasons.length || publicationReasons.length
          ? LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE
          : LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT,
      publicationStaleReasonCodes: uniqueAscii([...authorityReasons, ...publicationReasons]),
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
      const cases = buildCaseChains(preFlightRecord, executionState, resultsState);
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
      throw supportError('LFEA_NATIVE_SUPPORT_AUTHORITY_CURRENT_REQUIRED',
        'Current governed support authority is required before publication.');
    }
    const preFlight = requireRunnablePreFlight(preFlightRecord);
    const cases = buildCaseChains(preFlight, executionState, resultsState);
    const publications = cases.map((row) => {
      const interfaceRecovery = recoverLinearPipingInterfaceLoads({
        interfaceSet: state.authority.interfaceSet,
        analysisResult: row.analysisResult,
        loadCase: row.loadCase,
      });
      const publication = createLinearPipingSupportActionsPublication({
        interfaceSet: state.authority.interfaceSet,
        interfaceRecovery,
        sourceSemanticHash: preFlight.preparation.sourceBundleSemanticHash,
        modelVersion: state.authority.modelVersion.value,
        upGlobal: state.authority.upGlobal.value,
        parallelTolerance: state.authority.parallelTolerance.value,
      });
      return deepFreeze({
        caseId: row.caseId,
        analysisResultSemanticHash: row.analysisResult.semanticHash,
        interfaceRecovery,
        publication,
      });
    });
    state = deepFreeze({
      ...state,
      publicationCurrentness: LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT,
      publications,
      publicationStaleReasonCodes: [],
      publicationParent: publicationParent(executionState, resultsState, state.authority),
    });
    return state;
  }

  function clearCurrentAuthority() {
    if (state.authority === null) return state;
    state = deepFreeze({
      ...state,
      authorityCurrentness: LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE,
      authorityStaleReasonCodes: ['CURRENT_SUPPORT_AUTHORITY_CLEARED'],
      publicationCurrentness: state.publications === null
        ? LFEA_NATIVE_SUPPORT_CURRENTNESS.NONE
        : LFEA_NATIVE_SUPPORT_CURRENTNESS.STALE,
      publicationStaleReasonCodes: state.publications === null
        ? [] : ['CURRENT_SUPPORT_AUTHORITY_CLEARED'],
    });
    return state;
  }

  return Object.freeze({
    install, reconcile, readinessAuthority, publish, clearCurrentAuthority,
    getState: () => state,
    getCurrentAuthority: () => state.authorityCurrentness === LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT
      ? state.authority : null,
    getCurrentPublications: () => state.publicationCurrentness === LFEA_NATIVE_SUPPORT_CURRENTNESS.CURRENT
      ? state.publications : null,
  });
}

function buildCaseChains(preFlightRecord, executionState, resultsState) {
  const preFlight = requireRunnablePreFlight(preFlightRecord);
  const raw = requireCurrentRaw(executionState);
  const recoveryBatch = requireCurrentRecovery(resultsState, raw);
  const preparation = preFlight.preparation;
  const physicalById = new Map(preparation.physicalPreparation.physicalCases
    .map((row) => [row.caseId, row]));
  const recoveredById = new Map(recoveryBatch.caseRecoveries
    .map((row) => [row.caseId, row]));
  const frameProfile = inputXmlStiffnessFrameElementProfile();
  const solverProfile = inputXmlStiffnessSolverProfile();
  const recoveryProfile = inputXmlProductionRecoveryProfile();
  return raw.caseExecutions.map((rawCase) => {
    const physical = physicalById.get(rawCase.caseId);
    const recovered = recoveredById.get(rawCase.caseId);
    if (!physical || !recovered) {
      throw supportError('LFEA_NATIVE_SUPPORT_CASE_AUTHORITY_MISSING',
        `Current case ${rawCase.caseId} lacks physical or B-3.4 recovery authority.`);
    }
    const elements = compileInputXmlExecutionElementAuthorities(
      preparation.structuralPreparation,
      frameProfile,
      physical.loadCase,
    );
    const requestBase = {
      schema: LINEAR_PIPING_ANALYSIS_REQUEST_SCHEMA,
      analysisIdentity: `LFEA-SUPPORT-${raw.executionBatchId}-${rawCase.caseId}`,
      analysisRevision: 1,
      compilation: preparation.structuralPreparation.compilation,
      loadCase: physical.loadCase,
      frameElements: elements.frameElements,
      pipingComponents: [],
      solverProfile,
      recoveryProfile,
      expectedParents: null,
    };
    const request = { ...requestBase, expectedParents: deriveLinearPipingParentSet(requestBase) };
    return deepFreeze({
      caseId: rawCase.caseId,
      loadCase: physical.loadCase,
      analysisResult: composeLinearPipingAnalysisResult({
        request,
        execution: rawCase.execution,
        recovery: recovered.recovery,
      }),
    });
  });
}

function requireAuthorityInput(input, preFlight) {
  exactKeys(input, INPUT_KEYS, 'supportAuthorityInput');
  requireHash(input.parentSourceBundleSemanticHash, 'parentSourceBundleSemanticHash');
  requireHash(input.parentModelSemanticHash, 'parentModelSemanticHash');
  if (input.parentSourceBundleSemanticHash !== preFlight.preparation.sourceBundleSemanticHash
    || input.parentModelSemanticHash !== preFlight.preparation.modelSemanticHash) {
    throw supportError('LFEA_NATIVE_SUPPORT_PARENT_MISMATCH',
      'Support authority does not belong to the current source/model preparation.');
  }
  if (!Array.isArray(input.definitions) || input.definitions.length === 0) {
    throw supportError('LFEA_NATIVE_SUPPORT_DEFINITIONS_REQUIRED',
      'At least one governed support interface definition is required.');
  }
  return deepFreeze({
    ...input,
    definitions: [...input.definitions],
    upGlobal: declaredVector(input.upGlobal, 'upGlobal'),
    parallelTolerance: declaredTolerance(input.parallelTolerance),
    modelVersion: declaredModelVersion(input.modelVersion),
  });
}

function sealAuthority(preFlight, input, interfaceSet) {
  const draft = {
    schema: LFEA_NATIVE_SUPPORT_AUTHORITY_SCHEMA,
    parentSourceBundleSemanticHash: preFlight.preparation.sourceBundleSemanticHash,
    parentModelSemanticHash: preFlight.preparation.modelSemanticHash,
    parentCompilationSemanticHash: preFlight.preparation.structuralPreparation.compilation.semanticHash,
    supportAttachmentModelSemanticHash: input.supportAttachmentModel.semanticHash,
    restraintCapabilityModelSemanticHash: input.restraintCapabilityModel.semanticHash,
    interfaceSet,
    upGlobal: input.upGlobal,
    parallelTolerance: input.parallelTolerance,
    modelVersion: input.modelVersion,
    semanticHash: '',
  };
  draft.semanticHash = semanticHash(authoritySemanticProjection(draft));
  return deepFreeze(draft);
}

function authoritySemanticProjection(record) {
  return {
    schema: record.schema,
    parentSourceBundleSemanticHash: record.parentSourceBundleSemanticHash,
    parentModelSemanticHash: record.parentModelSemanticHash,
    parentCompilationSemanticHash: record.parentCompilationSemanticHash,
    supportAttachmentModelSemanticHash: record.supportAttachmentModelSemanticHash,
    restraintCapabilityModelSemanticHash: record.restraintCapabilityModelSemanticHash,
    interfaceSetSemanticHash: record.interfaceSet.semanticHash,
    upGlobal: record.upGlobal,
    parallelTolerance: record.parallelTolerance,
    modelVersion: record.modelVersion,
  };
}

function authorityCurrentnessReasons(preFlightRecord, authority) {
  const reasons = [];
  let preFlight;
  try { preFlight = requireRunnablePreFlight(preFlightRecord); }
  catch { return ['CURRENT_PREFLIGHT_INVALID']; }
  compare(reasons, 'SOURCE_CHANGED', authority.parentSourceBundleSemanticHash,
    preFlight.preparation.sourceBundleSemanticHash);
  compare(reasons, 'MODEL_CHANGED', authority.parentModelSemanticHash,
    preFlight.preparation.modelSemanticHash);
  compare(reasons, 'COMPILATION_CHANGED', authority.parentCompilationSemanticHash,
    preFlight.preparation.structuralPreparation.compilation.semanticHash);
  return uniqueAscii(reasons);
}

function publicationCurrentnessReasons(executionState, resultsState, expected) {
  if (expected === null) return [];
  const reasons = [];
  const raw = executionState?.currentness === 'CURRENT' ? executionState.execution : null;
  const recovery = resultsState?.currentness === 'CURRENT' ? resultsState.results : null;
  if (!raw) reasons.push('RAW_EXECUTION_NO_LONGER_CURRENT');
  if (!recovery) reasons.push('B3_4_RECOVERY_NO_LONGER_CURRENT');
  if (raw) compare(reasons, 'RAW_EXECUTION_CHANGED', expected.rawExecutionSemanticHash, raw.semanticHash);
  if (recovery) compare(reasons, 'B3_4_RECOVERY_CHANGED', expected.recoveryBatchSemanticHash, recovery.semanticHash);
  return uniqueAscii(reasons);
}

function publicationParent(executionState, resultsState, authority) {
  return deepFreeze({
    rawExecutionSemanticHash: executionState.execution.semanticHash,
    recoveryBatchSemanticHash: resultsState.results.semanticHash,
    supportAuthoritySemanticHash: authority.semanticHash,
  });
}

function requireRunnablePreFlight(record) {
  const preFlight = requireLinearPipingInputXmlPreFlight(record);
  if (!preFlight.solveAuthorized || !preFlight.preparation?.structuralPreparation?.compilation) {
    throw supportError('LFEA_NATIVE_SUPPORT_PREFLIGHT_REQUIRED',
      'Support authority requires current reviewed mechanical compilation.');
  }
  return preFlight;
}

function requireCurrentRaw(state) {
  const raw = state?.currentness === 'CURRENT' ? state.execution : null;
  if (!raw || !['QUALIFIED', 'CONDITIONAL'].includes(raw.status)) {
    throw supportError('LFEA_NATIVE_SUPPORT_CURRENT_RAW_REQUIRED',
      'Support publication requires current qualified/conditional B-3.3 execution.');
  }
  return raw;
}

function requireCurrentRecovery(state, raw) {
  const recovery = state?.currentness === 'CURRENT' ? state.results : null;
  if (!recovery || recovery.rawExecutionBatchSemanticHash !== raw.semanticHash) {
    throw supportError('LFEA_NATIVE_SUPPORT_CURRENT_RECOVERY_REQUIRED',
      'Support publication requires current B-3.4 recovery for the exact raw execution.');
  }
  return recovery;
}

function declaredVector(value, field) {
  exactKeys(value, ['value', 'source'], field);
  const vector = value.value;
  exactKeys(vector, ['x', 'y', 'z'], `${field}.value`);
  if (![vector.x, vector.y, vector.z].every(Number.isFinite)
    || Math.hypot(vector.x, vector.y, vector.z) === 0) {
    throw supportError('LFEA_NATIVE_SUPPORT_UP_VECTOR_INVALID',
      `${field}.value must be a finite non-zero vector.`);
  }
  return deepFreeze({
    value: deepFreeze({ ...vector }),
    source: nonEmpty(value.source, `${field}.source`),
  });
}

function declaredTolerance(value) {
  exactKeys(value, ['value', 'source'], 'parallelTolerance');
  if (!Number.isFinite(value.value) || !(value.value > 0 && value.value < 1)) {
    throw supportError('LFEA_NATIVE_SUPPORT_TOLERANCE_INVALID',
      'parallelTolerance.value must be greater than zero and less than one.');
  }
  return deepFreeze({
    value: value.value,
    source: nonEmpty(value.source, 'parallelTolerance.source'),
  });
}

function declaredModelVersion(value) {
  exactKeys(value, ['value', 'source'], 'modelVersion');
  if (!Number.isSafeInteger(value.value) || value.value < 0) {
    throw supportError('LFEA_NATIVE_SUPPORT_MODEL_VERSION_INVALID',
      'modelVersion.value must be a non-negative safe integer.');
  }
  return deepFreeze({
    value: value.value,
    source: nonEmpty(value.source, 'modelVersion.source'),
  });
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

function exactKeys(value, keys, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw supportError('LFEA_NATIVE_SUPPORT_RECORD_REQUIRED', `${field} must be a record.`);
  }
  const actual = Object.keys(value).sort(compareAscii);
  const expected = [...keys].sort(compareAscii);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw supportError('LFEA_NATIVE_SUPPORT_KEYS_INVALID', `${field} keys are invalid.`);
  }
}
function requireHash(value, field) {
  if (typeof value !== 'string' || !/^fnv1a64:[0-9a-f]{16}$/u.test(value)) {
    throw supportError('LFEA_NATIVE_SUPPORT_HASH_INVALID', `${field} must be a semantic hash.`);
  }
}
function nonEmpty(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw supportError('LFEA_NATIVE_SUPPORT_VALUE_REQUIRED', `${field} is required.`);
  return text;
}
function compare(reasons, code, expected, actual) { if (expected !== actual) reasons.push(code); }
function uniqueAscii(values) { return [...new Set(values)].sort(compareAscii); }
function compareAscii(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function supportError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_NATIVE_SUPPORT_PUBLICATION';
  return error;
}
