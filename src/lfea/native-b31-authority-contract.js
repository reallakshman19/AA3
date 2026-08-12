import {
  requireCodeProfile,
  requireEditionDataset,
  requireStressFactorSet,
} from '../core/linear-fea-b31-code-engine/index.js';
import { requirePipeSectionResolution } from '../core/linear-fea-section/index.js';
import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import { requireLinearPipingInputXmlPreFlight } from '../workspace/linear-piping-inputxml-prefea.js';

export const LFEA_NATIVE_B31_AUTHORITY_SCHEMA = 'lfea-native-b31-authority/v1';
export const LFEA_NATIVE_B31_CURRENTNESS = Object.freeze({ NONE: 'NONE', CURRENT: 'CURRENT', STALE: 'STALE' });
export const LFEA_NATIVE_B31_REVIEW_REQUIRED = 'REVIEW_REQUIRED';

const INPUT_KEYS = Object.freeze([
  'parentSourceBundleSemanticHash', 'parentModelSemanticHash',
  'codeProfile', 'editionDataset', 'checks',
]);
const CHECK_KEYS = Object.freeze([
  'checkId', 'category', 'elementId', 'end', 'combinationId',
  'actionSource', 'evaluationCaseId', 'stressFactorSet',
  'sectionBasisReason', 'sustainedSectionResolution',
  'pressureStressContribution', 'coldTemperature', 'sustainedStress',
  'occasionalCategoryId',
]);
const NATIVE_IMPLEMENTED_CATEGORY = 'SUSTAINED';
const SUSTAINED_PHYSICAL_CASE_ROLES = Object.freeze(['WEIGHT_BASE', 'WEIGHT_PRESSURE']);

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
  if (new Set(checks.map((row) => row.checkId)).size !== checks.length) {
    throw b31Error('LFEA_NATIVE_B31_CHECK_DUPLICATE', 'B31 check identities must be unique.');
  }
  requireCaseCustody(preFlight, checks);
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

export function requireRunnableB31PreFlight(record) { return requireRunnablePreFlight(record); }
export function lfeaNativeB31Error(code, message) { return b31Error(code, message); }

function canonicalCheck(value, index) {
  const field = `b31AuthorityInput.checks[${index}]`;
  exactKeys(value, CHECK_KEYS, field);
  const category = requiredText(value.category, `${field}.category`);
  if (category !== NATIVE_IMPLEMENTED_CATEGORY) {
    throw b31Error(
      'LFEA_NATIVE_B31_CATEGORY_UNSUPPORTED',
      `${field}.category must be SUSTAINED in the first native straight-pipe publication boundary.`,
    );
  }
  const end = requiredText(value.end, `${field}.end`);
  if (!['I', 'J'].includes(end)) {
    throw b31Error('LFEA_NATIVE_B31_END_INVALID', `${field}.end must be I or J.`);
  }
  const actionSource = canonicalSingleCase(value.actionSource, `${field}.actionSource`);
  const evaluationCaseId = requiredText(value.evaluationCaseId, `${field}.evaluationCaseId`);
  const combinationId = requiredText(value.combinationId, `${field}.combinationId`);
  if (evaluationCaseId !== actionSource.caseId) {
    throw b31Error(
      'LFEA_NATIVE_B31_EVALUATION_CASE_MISMATCH',
      'A native SUSTAINED check must evaluate section/material state from its cited physical case.',
    );
  }
  if (combinationId !== actionSource.caseId) {
    throw b31Error(
      'LFEA_NATIVE_B31_COMBINATION_CASE_MISMATCH',
      'A native single-case SUSTAINED combination identity must equal its cited physical case.',
    );
  }
  if (value.coldTemperature !== null || value.sustainedStress !== null
    || value.occasionalCategoryId !== null) {
    throw b31Error(
      'LFEA_NATIVE_B31_CATEGORY_FIELDS_INVALID',
      'Native SUSTAINED checks require coldTemperature, sustainedStress, and occasionalCategoryId to be null.',
    );
  }
  return deepFreeze({
    checkId: requiredText(value.checkId, `${field}.checkId`),
    category,
    elementId: requiredText(value.elementId, `${field}.elementId`),
    end,
    combinationId,
    actionSource,
    evaluationCaseId,
    stressFactorSet: requireStressFactorSet(value.stressFactorSet),
    sectionBasisReason: requiredText(value.sectionBasisReason, `${field}.sectionBasisReason`),
    sustainedSectionResolution: requirePipeSectionResolution(value.sustainedSectionResolution),
    pressureStressContribution: canonicalPressureContribution(
      value.pressureStressContribution,
      `${field}.pressureStressContribution`,
    ),
    coldTemperature: null,
    sustainedStress: null,
    occasionalCategoryId: null,
  });
}

function canonicalSingleCase(value, field) {
  exactKeys(value, ['kind', 'caseId'], field);
  if (value.kind !== 'SINGLE_CASE') {
    throw b31Error(
      'LFEA_NATIVE_B31_ACTION_SOURCE_INVALID',
      'The first native B31 boundary supports SINGLE_CASE SUSTAINED checks only.',
    );
  }
  return deepFreeze({ kind: value.kind, caseId: requiredText(value.caseId, `${field}.caseId`) });
}

function canonicalPressureContribution(value, field) {
  if (value === null) return null;
  exactKeys(value, ['value', 'source'], field);
  if (!Number.isFinite(value.value)) {
    throw b31Error('LFEA_NATIVE_B31_PRESSURE_STRESS_INVALID', `${field}.value must be finite.`);
  }
  return deepFreeze({
    value: value.value,
    source: requiredText(value.source, `${field}.source`),
  });
}

function requireCaseCustody(preFlight, checks) {
  const caseById = new Map(preFlight.preparation.physicalPreparation.physicalCases
    .map((row) => [row.caseId, row]));
  for (const check of checks) {
    const physicalCase = caseById.get(check.actionSource.caseId);
    if (!physicalCase) {
      throw b31Error(
        'LFEA_NATIVE_B31_CASE_MISSING',
        `B31 check ${check.checkId} references unavailable physical case ${check.actionSource.caseId}.`,
      );
    }
    if (!SUSTAINED_PHYSICAL_CASE_ROLES.includes(physicalCase.caseRole)) {
      throw b31Error(
        'LFEA_NATIVE_B31_SUSTAINED_CASE_ROLE_INVALID',
        `B31 SUSTAINED check ${check.checkId} cannot use physical role ${physicalCase.caseRole}.`,
      );
    }
  }
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
function compare(reasons, code, expected, actual) { if (expected !== actual) reasons.push(code); }
function uniqueAscii(values) { return [...new Set(values)].sort(compareAscii); }
function compareAscii(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function b31Error(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_NATIVE_B31_PUBLICATION';
  return error;
}
