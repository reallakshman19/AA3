import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import { validateSharedPipingModel } from '../core/shared-piping-model/index.js';
import { requireLinearPipingInputXmlPreFlight } from '../workspace/linear-piping-inputxml-prefea.js';

export const LFEA_NATIVE_SUPPORT_AUTHORITY_SCHEMA = 'lfea-native-support-authority/v1';
export const LFEA_NATIVE_SUPPORT_CURRENTNESS = Object.freeze({
  NONE: 'NONE',
  CURRENT: 'CURRENT',
  STALE: 'STALE',
});

const INPUT_KEYS = Object.freeze([
  'parentSourceBundleSemanticHash',
  'parentModelSemanticHash',
  'supportSharedModel',
  'supportAttachmentModel',
  'restraintCapabilityModel',
  'definitions',
  'interfaceProfile',
  'upGlobal',
  'parallelTolerance',
  'modelVersion',
]);

export function requireLfeaNativeSupportAuthorityInput(preFlightRecord, input) {
  const preFlight = requireRunnablePreFlight(preFlightRecord);
  exactKeys(input, INPUT_KEYS, 'supportAuthorityInput');
  requireHash(input.parentSourceBundleSemanticHash, 'parentSourceBundleSemanticHash');
  requireHash(input.parentModelSemanticHash, 'parentModelSemanticHash');
  requireCurrentParents(preFlight, input);
  requireSupportSharedModel(preFlight, input);
  if (!Array.isArray(input.definitions) || input.definitions.length === 0) {
    throw supportError(
      'LFEA_NATIVE_SUPPORT_DEFINITIONS_REQUIRED',
      'At least one governed support interface definition is required.',
    );
  }
  return deepFreeze({
    preFlight,
    input: {
      ...input,
      definitions: [...input.definitions],
      upGlobal: declaredVector(input.upGlobal, 'upGlobal'),
      parallelTolerance: declaredTolerance(input.parallelTolerance),
      modelVersion: declaredModelVersion(input.modelVersion),
    },
  });
}

export function sealLfeaNativeSupportAuthority(preFlight, input, interfaceSet) {
  const draft = {
    schema: LFEA_NATIVE_SUPPORT_AUTHORITY_SCHEMA,
    parentSourceBundleSemanticHash: preFlight.preparation.sourceBundleSemanticHash,
    parentModelSemanticHash: preFlight.preparation.modelSemanticHash,
    parentCompilationSemanticHash:
      preFlight.preparation.structuralPreparation.compilation.semanticHash,
    supportSharedModelSemanticHash: input.supportSharedModel.semanticHash,
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

export function lfeaNativeSupportAuthorityCurrentnessReasons(preFlightRecord, authority) {
  let preFlight;
  try {
    preFlight = requireRunnablePreFlight(preFlightRecord);
  } catch {
    return Object.freeze(['CURRENT_PREFLIGHT_INVALID']);
  }
  const reasons = [];
  compare(reasons, 'SOURCE_CHANGED', authority.parentSourceBundleSemanticHash,
    preFlight.preparation.sourceBundleSemanticHash);
  compare(reasons, 'MODEL_CHANGED', authority.parentModelSemanticHash,
    preFlight.preparation.modelSemanticHash);
  compare(reasons, 'COMPILATION_CHANGED', authority.parentCompilationSemanticHash,
    preFlight.preparation.structuralPreparation.compilation.semanticHash);
  return Object.freeze(uniqueAscii(reasons));
}

export function requireRunnableSupportPreFlight(record) {
  return requireRunnablePreFlight(record);
}

export function lfeaNativeSupportError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_NATIVE_SUPPORT_PUBLICATION';
  return error;
}

function requireCurrentParents(preFlight, input) {
  if (input.parentSourceBundleSemanticHash !== preFlight.preparation.sourceBundleSemanticHash
    || input.parentModelSemanticHash !== preFlight.preparation.modelSemanticHash) {
    throw supportError(
      'LFEA_NATIVE_SUPPORT_PARENT_MISMATCH',
      'Support authority does not belong to the current source/model preparation.',
    );
  }
}

function requireSupportSharedModel(preFlight, input) {
  const validation = validateSharedPipingModel(input.supportSharedModel);
  if (!validation.ok) {
    throw supportError(
      'LFEA_NATIVE_SUPPORT_SHARED_MODEL_INVALID',
      `Support shared model is invalid: ${validation.errors.join(' ')}`,
    );
  }
  if (input.supportSharedModel.sourceSnapshotRef.sourceSemanticHash
    !== preFlight.preparation.sourceBundleSemanticHash) {
    throw supportError(
      'LFEA_NATIVE_SUPPORT_SOURCE_CUSTODY_MISMATCH',
      'Support shared model source identity does not match the current InputXML source bundle.',
    );
  }
  if (input.supportAttachmentModel.sharedModelSemanticHash
    !== input.supportSharedModel.semanticHash) {
    throw supportError(
      'LFEA_NATIVE_SUPPORT_ATTACHMENT_PARENT_MISMATCH',
      'Support attachment model does not belong to the supplied shared piping model.',
    );
  }
}

function authoritySemanticProjection(record) {
  return {
    schema: record.schema,
    parentSourceBundleSemanticHash: record.parentSourceBundleSemanticHash,
    parentModelSemanticHash: record.parentModelSemanticHash,
    parentCompilationSemanticHash: record.parentCompilationSemanticHash,
    supportSharedModelSemanticHash: record.supportSharedModelSemanticHash,
    supportAttachmentModelSemanticHash: record.supportAttachmentModelSemanticHash,
    restraintCapabilityModelSemanticHash: record.restraintCapabilityModelSemanticHash,
    interfaceSetSemanticHash: record.interfaceSet.semanticHash,
    upGlobal: record.upGlobal,
    parallelTolerance: record.parallelTolerance,
    modelVersion: record.modelVersion,
  };
}

function requireRunnablePreFlight(record) {
  const preFlight = requireLinearPipingInputXmlPreFlight(record);
  if (!preFlight.solveAuthorized
    || !preFlight.preparation?.structuralPreparation?.compilation) {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_PREFLIGHT_REQUIRED',
      'Support authority requires current reviewed mechanical compilation.',
    );
  }
  return preFlight;
}

function declaredVector(value, field) {
  exactKeys(value, ['value', 'source'], field);
  const vector = value.value;
  exactKeys(vector, ['x', 'y', 'z'], `${field}.value`);
  if (![vector.x, vector.y, vector.z].every(Number.isFinite)
    || Math.hypot(vector.x, vector.y, vector.z) === 0) {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_UP_VECTOR_INVALID',
      `${field}.value must be a finite non-zero vector.`,
    );
  }
  return deepFreeze({
    value: deepFreeze({ ...vector }),
    source: nonEmpty(value.source, `${field}.source`),
  });
}

function declaredTolerance(value) {
  exactKeys(value, ['value', 'source'], 'parallelTolerance');
  if (!Number.isFinite(value.value) || !(value.value > 0 && value.value < 1)) {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_TOLERANCE_INVALID',
      'parallelTolerance.value must be greater than zero and less than one.',
    );
  }
  return deepFreeze({
    value: value.value,
    source: nonEmpty(value.source, 'parallelTolerance.source'),
  });
}

function declaredModelVersion(value) {
  exactKeys(value, ['value', 'source'], 'modelVersion');
  if (!Number.isSafeInteger(value.value) || value.value < 0) {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_MODEL_VERSION_INVALID',
      'modelVersion.value must be a non-negative safe integer.',
    );
  }
  return deepFreeze({
    value: value.value,
    source: nonEmpty(value.source, 'modelVersion.source'),
  });
}

function exactKeys(value, keys, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_RECORD_REQUIRED',
      `${field} must be a record.`,
    );
  }
  const actual = Object.keys(value).sort(compareAscii);
  const expected = [...keys].sort(compareAscii);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_KEYS_INVALID',
      `${field} keys are invalid.`,
    );
  }
}

function requireHash(value, field) {
  if (typeof value !== 'string' || !/^fnv1a64:[0-9a-f]{16}$/u.test(value)) {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_HASH_INVALID',
      `${field} must be a semantic hash.`,
    );
  }
}

function nonEmpty(value, field) {
  const text = String(value ?? '').trim();
  if (!text) {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_VALUE_REQUIRED',
      `${field} is required.`,
    );
  }
  return text;
}
function compare(reasons, code, expected, actual) {
  if (expected !== actual) reasons.push(code);
}
function uniqueAscii(values) {
  return [...new Set(values)].sort(compareAscii);
}
function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
