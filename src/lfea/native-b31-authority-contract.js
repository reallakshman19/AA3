import {
  requireCodeProfile,
  requireEditionDataset,
  requireStressFactorSet,
} from '../core/linear-fea-b31-code-engine/index.js';
import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import { requireLinearPipingInputXmlPreFlight } from '../workspace/linear-piping-inputxml-prefea.js';

export const LFEA_NATIVE_B31_AUTHORITY_SCHEMA = 'lfea-native-b31-authority/v1';
export const LFEA_NATIVE_B31_CURRENTNESS = Object.freeze({
  NONE: 'NONE',
  CURRENT: 'CURRENT',
  STALE: 'STALE',
});
export const LFEA_NATIVE_B31_REVIEW_REQUIRED = 'REVIEW_REQUIRED';

const INPUT_KEYS = Object.freeze([
  'parentSourceBundleSemanticHash',
  'parentModelSemanticHash',
  'codeProfile',
  'editionDataset',
  'checks',
]);
const CHECK_KEYS = Object.freeze([
  'checkId',
  'category',
  'elementId',
  'end',
  'combinationId',
  'actionSource',
  'stressFactorSet',
  'pressureStressContribution',
  'coldTemperature',
  'sustainedStress',
  'occasionalCategoryId',
]);
const IMPLEMENTED_CATEGORIES = Object.freeze([
  'SUSTAINED',
  'OCCASIONAL',
  'DISPLACEMENT_STRESS_RANGE',
  'EXPANSION_RANGE_ENVELOPE',
]);

export function requireLfeaNativeB31AuthorityInput(preFlightRecord, input) {
  const preFlight = requireRunnablePreFlight(preFlightRecord);
  exactKeys(input, INPUT_KEYS, 'b31AuthorityInput');
  requireHash(input.parentSourceBundleSemanticHash, 'parentSourceBundleSemanticHash');
  requireHash(input.parentModelSemanticHash, 'parentModelSemanticHash');
  if (input.parentSourceBundleSemanticHash !== preFlight.preparation.sourceBundleSemanticHash
    || input.parentModelSemanticHash !== preFlight.preparation.modelSemanticHash) {
    throw b31Error(
      'LFEA_NATIVE_B31_PARENT_MISMATCH',
      'B31 authority does not belong to the current source/model preparation.',
    );
  }
  const codeProfile = requireCodeProfile(input.codeProfile);
  const editionDataset = requireEditionDataset(input.editionDataset);
  if (!Array.isArray(input.checks) || input.checks.length === 0) {
    throw b31Error('LFEA_NATIVE_B31_CHECKS_REQUIRED', 'At least one governed B31 check is required.');
  }
  const checks = input.checks.map((row, index) => canonicalCheck(row, index));
  const ids = checks.map((row) => row.checkId);
  if (new Set(ids).size !== ids.length) {
    throw b31Error('LFEA_NATIVE_B31_CHECK_DUPLICATE', 'B31 check identities must be unique.');
  }
  return deepFreeze({
    preFlight,
    input: deepFreeze({
      parentSourceBundleSemanticHash: input.parentSourceBundleSemanticHash,
      parentModelSemanticHash: input.parentModelSemanticHash,
      codeProfile,
      editionDataset,
      checks,
    }),
  });
}

export function sealLfeaNativeB31Authority(preFlight, input, codeStationAuthority) {
  const draft = {
    schema: LFEA_NATIVE_B31_AUTHORITY_SCHEMA,
    parentSourceBundleSemanticHash: preFlight.preparation.sourceBundleSemanticHash,
    parentModelSemanticHash: preFlight.preparation.modelSemanticHash,
    parentCompilationSemanticHash: preFlight.preparation.structuralPreparation.compilation.semanticHash,
    codeProfile: input.codeProfile,
    editionDataset: input.editionDataset,
    checks: input.checks,
    codeStationAuthority,
    semanticHash: '',
  };
  draft.semanticHash = semanticHash(authorityProjection(draft));
  return deepFreeze(draft);
}

export function lfeaNativeB31AuthorityCurrentnessReasons(preFlightRecord, authority) {
  let preFlight;
  try { preFlight = requireRunnablePreFlight(preFlightRecord); }
  catch { return Object.freeze(['CURRENT_PREFLIGHT_INVALID']); }
  const reasons = [];
  compare(reasons, 'SOURCE_CHANGED', authority.parentSourceBundleSemanticHash,
    preFlight.preparation.sourceBundleSemanticHash);
  compare(reasons, 'MODEL_CHANGED', authority.parentModelSemanticHash,
    preFlight.preparation.modelSemanticHash);
  compare(reasons, 'COMPILATION_CHANGED', authority.parentCompilationSemanticHash,
    preFlight.preparation.structuralPreparation.compilation.semanticHash);
  return Object.freeze(uniqueAscii(reasons));
}

export function requireRunnableB31PreFlight(record) {
  return requireRunnablePreFlight(record);
}

export function lfeaNativeB31Error(code, message) {
  return b31Error(code, message);
}

function canonicalCheck(value, index) {
  const field = `b31AuthorityInput.checks[${index}]`;
  exactKeys(value, CHECK_KEYS, field);
  const checkId = requiredText(value.checkId, `${field}.checkId`);
  const category = requiredText(value.category, `${field}.category`);
  if (!IMPLEMENTED_CATEGORIES.includes(category)) {
    throw b31Error('LFEA_NATIVE_B31_CATEGORY_UNSUPPORTED', `${field}.category is unsupported.`);
  }
  const end = requiredText(value.end, `${field}.end`);
  if (!['I', 'J'].includes(end)) {
    throw b31Error('LFEA_NATIVE_B31_END_INVALID', `${field}.end must be I or J.`);
  }
  const actionSource = canonicalActionSource(value.actionSource, category, `${field}.actionSource`);
  return deepFreeze({
    checkId,
    category,
    elementId: requiredText(value.elementId, `${field}.elementId`),
    end,
    combinationId: requiredText(value.combinationId, `${field}.combinationId`),
    actionSource,
    stressFactorSet: requireStressFactorSet(value.stressFactorSet),
    pressureStressContribution: cloneNullable(value.pressureStressContribution),
    coldTemperature: cloneNullable(value.coldTemperature),
    sustainedStress: cloneNullable(value.sustainedStress),
    occasionalCategoryId: value.occasionalCategoryId === null
      ? null : requiredText(value.occasionalCategoryId, `${field}.occasionalCategoryId`),
  });
}

function canonicalActionSource(value, category, field) {
  if (value?.kind === 'SINGLE_CASE') {
    exactKeys(value, ['kind', 'caseId'], field);
    if (category === 'DISPLACEMENT_STRESS_RANGE' || category === 'EXPANSION_RANGE_ENVELOPE') {
      throw b31Error('LFEA_NATIVE_B31_RANGE_SOURCE_REQUIRED', `${category} requires CASE_RANGE.`);
    }
    return deepFreeze({ kind: value.kind, caseId: requiredText(value.caseId, `${field}.caseId`) });
  }
  if (value?.kind === 'CASE_RANGE') {
    exactKeys(value, ['kind', 'fromCaseId', 'toCaseId'], field);
    if (!['DISPLACEMENT_STRESS_RANGE', 'EXPANSION_RANGE_ENVELOPE'].includes(category)) {
      throw b31Error('LFEA_NATIVE_B31_RANGE_CATEGORY_INVALID', `${category} cannot use CASE_RANGE.`);
    }
    const fromCaseId = requiredText(value.fromCaseId, `${field}.fromCaseId`);
    const toCaseId = requiredText(value.toCaseId, `${field}.toCaseId`);
    if (fromCaseId === toCaseId) {
      throw b31Error('LFEA_NATIVE_B31_RANGE_CASES_IDENTICAL', 'CASE_RANGE endpoints must differ.');
    }
    return deepFreeze({ kind: value.kind, fromCaseId, toCaseId });
  }
  throw b31Error('LFEA_NATIVE_B31_ACTION_SOURCE_INVALID', `${field}.kind is unsupported.`);
}

function authorityProjection(record) {
  return {
    schema: record.schema,
    parentSourceBundleSemanticHash: record.parentSourceBundleSemanticHash,
    parentModelSemanticHash: record.parentModelSemanticHash,
    parentCompilationSemanticHash: record.parentCompilationSemanticHash,
    codeProfileSemanticHash: record.codeProfile.semanticHash,
    editionDatasetSemanticHash: record.editionDataset.semanticHash,
    checks: record.checks,
    codeStationAuthoritySemanticHash: record.codeStationAuthority.semanticHash,
  };
}

function requireRunnablePreFlight(record) {
  const preFlight = requireLinearPipingInputXmlPreFlight(record);
  if (!preFlight.solveAuthorized || !preFlight.preparation?.structuralPreparation?.compilation) {
    throw b31Error(
      'LFEA_NATIVE_B31_PREFLIGHT_REQUIRED',
      'B31 authority requires the current reviewed mechanical compilation.',
    );
  }
  return preFlight;
}

function cloneNullable(value) {
  return value === null ? null : deepFreeze(structuredClone(value));
}
function exactKeys(value, expectedKeys, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw b31Error('LFEA_NATIVE_B31_INPUT_INVALID', `${field} must be a record.`);
  }
  const actual = Object.keys(value).sort(compareAscii);
  const expected = [...expectedKeys].sort(compareAscii);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw b31Error('LFEA_NATIVE_B31_INPUT_INVALID', `${field} keys are invalid.`);
  }
}
function requireHash(value, field) {
  if (typeof value !== 'string' || !/^fnv1a64:[0-9a-f]{16}$/u.test(value)) {
    throw b31Error('LFEA_NATIVE_B31_INPUT_INVALID', `${field} must be a semantic hash.`);
  }
}
function requiredText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw b31Error('LFEA_NATIVE_B31_INPUT_INVALID', `${field} is required.`);
  return text;
}
function compare(reasons, code, expected, actual) {
  if (expected !== actual) reasons.push(code);
}
function uniqueAscii(values) { return [...new Set(values)].sort(compareAscii); }
function compareAscii(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function b31Error(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_NATIVE_B31_PUBLICATION';
  return error;
}
