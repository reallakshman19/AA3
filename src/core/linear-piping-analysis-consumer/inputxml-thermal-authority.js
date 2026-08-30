import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze, isPlainRecord } from '../shared-piping-model/immutable.js';
import {
  INPUTXML_INSTALLATION_TEMPERATURE,
  InputXmlLinearSolvePreparationError,
} from './inputxml-linear-preparation-profile.js';

export const INPUTXML_THERMAL_EXPANSION_AUTHORITY_SCHEMA =
  'fea-inputxml-thermal-expansion-authority/v1';
export const INPUTXML_THERMAL_INTERVAL_AUTHORITY_SCHEMA =
  'fea-inputxml-thermal-interval-authority/v1';

const INTERVAL_KEYS = Object.freeze([
  'schema',
  'authorityId',
  'basis',
  'status',
  'modelId',
  'sourceBundleSemanticHash',
  'materialNumber',
  'installationTemperature',
  'operatingTemperature',
  'deltaTemperature',
  'coefficientPerKelvin',
  'thermalStrain',
  'sourceEvidence',
  'semanticHash',
]);
const SOURCE_EVIDENCE_KEYS = Object.freeze([
  'sourceId', 'sourceRevision', 'sourceSemanticHash',
]);
const TEMPERATURE_TOLERANCE = 1e-9;
const HASH_PATTERN = /^fnv1a64:[0-9a-f]{16}$/u;

const AUTHORITY_BY_MATERIAL = Object.freeze({
  106: Object.freeze({
    materialLabel: 'A106 Grade B',
    coefficientPerKelvin: 1.17e-5,
    sourceId: 'PROJECT_BENCHMARK_MATERIAL_AUTHORITY_106',
    sourceRevision: 'LFEA_INPUTXML_THERMAL_R1',
  }),
  360: Object.freeze({
    materialLabel: 'A334 Grade 6',
    coefficientPerKelvin: 1.17e-5,
    sourceId: 'PROJECT_BENCHMARK_MATERIAL_AUTHORITY_360',
    sourceRevision: 'LFEA_INPUTXML_THERMAL_R1',
  }),
});

export function resolveInputXmlThermalExpansionAuthority(materialNumber) {
  const normalizedMaterialNumber = normalizeMaterialNumber(materialNumber);
  const authority = normalizedMaterialNumber === null
    ? null
    : AUTHORITY_BY_MATERIAL[normalizedMaterialNumber] ?? null;
  const payload = {
    schema: INPUTXML_THERMAL_EXPANSION_AUTHORITY_SCHEMA,
    materialNumber: normalizedMaterialNumber,
    materialLabel: authority?.materialLabel ?? null,
    status: authority === null ? 'UNRESOLVED' : 'RESOLVED',
    coefficientPerKelvin: authority?.coefficientPerKelvin ?? null,
    sourceEvidence: authority === null ? null : {
      sourceId: authority.sourceId,
      sourceRevision: authority.sourceRevision,
      sourceSemanticHash: semanticHash({
        materialNumber: normalizedMaterialNumber,
        coefficientPerKelvin: authority.coefficientPerKelvin,
        sourceId: authority.sourceId,
        sourceRevision: authority.sourceRevision,
      }),
    },
  };
  return deepFreeze({ ...payload, semanticHash: semanticHash(payload) });
}

/** Seal a source-qualified mean coefficient for one model/material/temperature interval. */
export function sealInputXmlThermalIntervalAuthority(value) {
  const payload = intervalPayload(value);
  const expectedHash = semanticHash(payload);
  if (value?.semanticHash !== undefined
    && value.semanticHash !== ''
    && value.semanticHash !== expectedHash) {
    fail(
      'INPUTXML_THERMAL_INTERVAL_AUTHORITY_HASH_INVALID',
      'Thermal interval authority semantic hash is stale or invalid.',
      { expected: expectedHash, actual: value.semanticHash },
    );
  }
  return deepFreeze({ ...payload, semanticHash: expectedHash });
}

export function requireInputXmlThermalIntervalAuthority(value) {
  requireRecord(value, 'thermalIntervalAuthority');
  requireExactKeys(value, INTERVAL_KEYS, 'thermalIntervalAuthority');
  if (value.schema !== INPUTXML_THERMAL_INTERVAL_AUTHORITY_SCHEMA) {
    fail(
      'INPUTXML_THERMAL_INTERVAL_AUTHORITY_SCHEMA_INVALID',
      'Thermal interval authority schema is invalid.',
    );
  }
  return sealInputXmlThermalIntervalAuthority(value);
}

export function resolveInputXmlThermalInputAuthority({
  intervalAuthority,
  modelId,
  sourceBundleSemanticHash,
  materialNumber,
  operatingTemperature,
}) {
  if (intervalAuthority === null || intervalAuthority === undefined) {
    return Object.freeze({
      basis: 'GENERIC_MATERIAL',
      installationTemperature: INPUTXML_INSTALLATION_TEMPERATURE.value,
      thermalAuthority: resolveInputXmlThermalExpansionAuthority(materialNumber),
    });
  }
  const accepted = requireInputXmlThermalIntervalAuthority(intervalAuthority);
  const normalizedMaterialNumber = normalizeMaterialNumber(materialNumber);
  requireEqual(accepted.modelId, String(modelId), 'MODEL');
  requireEqual(accepted.sourceBundleSemanticHash, sourceBundleSemanticHash, 'SOURCE');
  requireEqual(accepted.materialNumber, normalizedMaterialNumber, 'MATERIAL');
  requireClose(accepted.operatingTemperature, operatingTemperature, 'OPERATING_TEMPERATURE');
  return Object.freeze({
    basis: accepted.basis,
    installationTemperature: accepted.installationTemperature,
    thermalAuthority: accepted,
  });
}

function intervalPayload(value) {
  requireRecord(value, 'thermalIntervalAuthority');
  if (value.schema !== INPUTXML_THERMAL_INTERVAL_AUTHORITY_SCHEMA) {
    fail(
      'INPUTXML_THERMAL_INTERVAL_AUTHORITY_SCHEMA_INVALID',
      'Thermal interval authority schema is invalid.',
    );
  }
  const installationTemperature = finite(value.installationTemperature, 'installationTemperature');
  const operatingTemperature = finite(value.operatingTemperature, 'operatingTemperature');
  const deltaTemperature = operatingTemperature - installationTemperature;
  if (Math.abs(deltaTemperature) <= TEMPERATURE_TOLERANCE) {
    fail(
      'INPUTXML_THERMAL_INTERVAL_AUTHORITY_INTERVAL_INVALID',
      'Thermal interval authority requires a non-zero temperature interval.',
    );
  }
  const coefficientPerKelvin = positive(value.coefficientPerKelvin, 'coefficientPerKelvin');
  const sourceEvidence = sourceEvidencePayload(value.sourceEvidence);
  return {
    schema: INPUTXML_THERMAL_INTERVAL_AUTHORITY_SCHEMA,
    authorityId: nonempty(value.authorityId, 'authorityId'),
    basis: 'MODEL_INTERVAL_MEAN',
    status: 'RESOLVED',
    modelId: nonempty(value.modelId, 'modelId'),
    sourceBundleSemanticHash: hash(
      value.sourceBundleSemanticHash,
      'sourceBundleSemanticHash',
    ),
    materialNumber: requiredMaterialNumber(value.materialNumber),
    installationTemperature,
    operatingTemperature,
    deltaTemperature,
    coefficientPerKelvin,
    thermalStrain: coefficientPerKelvin * deltaTemperature,
    sourceEvidence,
  };
}

function sourceEvidencePayload(value) {
  requireRecord(value, 'thermalIntervalAuthority.sourceEvidence');
  requireExactKeys(value, SOURCE_EVIDENCE_KEYS, 'thermalIntervalAuthority.sourceEvidence');
  return {
    sourceId: nonempty(value.sourceId, 'sourceEvidence.sourceId'),
    sourceRevision: nonempty(value.sourceRevision, 'sourceEvidence.sourceRevision'),
    sourceSemanticHash: hash(
      value.sourceSemanticHash,
      'sourceEvidence.sourceSemanticHash',
    ),
  };
}

function requiredMaterialNumber(value) {
  const materialNumber = normalizeMaterialNumber(value);
  if (materialNumber === null) {
    fail(
      'INPUTXML_THERMAL_INTERVAL_AUTHORITY_MATERIAL_INVALID',
      'Thermal interval authority material number is invalid.',
      { materialNumber: value },
    );
  }
  return materialNumber;
}

function requireEqual(actual, expected, boundary) {
  if (actual !== expected) {
    fail(
      `INPUTXML_THERMAL_INTERVAL_AUTHORITY_${boundary}_MISMATCH`,
      `Thermal interval authority ${boundary.toLowerCase()} identity does not match the solve.`,
      { actual, expected },
    );
  }
}

function requireClose(actual, expected, boundary) {
  if (!Number.isFinite(expected) || Math.abs(actual - expected) > TEMPERATURE_TOLERANCE) {
    fail(
      `INPUTXML_THERMAL_INTERVAL_AUTHORITY_${boundary}_MISMATCH`,
      'Thermal interval authority operating temperature does not match the source segment.',
      { actual, expected },
    );
  }
}

function finite(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(
      'INPUTXML_THERMAL_INTERVAL_AUTHORITY_VALUE_INVALID',
      `Thermal interval authority ${field} must be finite.`,
      { field, value },
    );
  }
  return value;
}

function positive(value, field) {
  const number = finite(value, field);
  if (!(number > 0)) {
    fail(
      'INPUTXML_THERMAL_INTERVAL_AUTHORITY_VALUE_INVALID',
      `Thermal interval authority ${field} must be positive.`,
      { field, value },
    );
  }
  return number;
}

function nonempty(value, field) {
  const text = String(value ?? '').trim();
  if (!text) {
    fail(
      'INPUTXML_THERMAL_INTERVAL_AUTHORITY_IDENTITY_INVALID',
      `Thermal interval authority ${field} must be a non-empty string.`,
      { field },
    );
  }
  return text;
}

function hash(value, field) {
  const text = nonempty(value, field);
  if (!HASH_PATTERN.test(text)) {
    fail(
      'INPUTXML_THERMAL_INTERVAL_AUTHORITY_IDENTITY_INVALID',
      `Thermal interval authority ${field} must be a semantic hash.`,
      { field, value },
    );
  }
  return text;
}

function requireRecord(value, field) {
  if (!isPlainRecord(value)) {
    fail(
      'INPUTXML_THERMAL_INTERVAL_AUTHORITY_RECORD_REQUIRED',
      `${field} must be a record.`,
    );
  }
}

function requireExactKeys(value, expected, field) {
  const actual = Object.keys(value).sort(compareAscii);
  const required = [...expected].sort(compareAscii);
  if (actual.length !== required.length
    || actual.some((key, index) => key !== required[index])) {
    fail(
      'INPUTXML_THERMAL_INTERVAL_AUTHORITY_KEYS_INVALID',
      `${field} keys are invalid.`,
      { actual, required },
    );
  }
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function fail(code, message, data) {
  throw new InputXmlLinearSolvePreparationError(message, code, data);
}

function normalizeMaterialNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || Math.abs(numeric - Math.round(numeric)) > 1e-9) return null;
  return String(Math.round(numeric));
}
