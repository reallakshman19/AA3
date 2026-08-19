import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
} from '../core/linear-piping-analysis-consumer/inputxml-model-health-profile.js';
import {
  INPUTXML_MEDIA_TYPE,
  requireLinearPipingInputXmlSource,
  sealLinearPipingInputXmlSource,
} from '../core/linear-piping-analysis-consumer/inputxml-source-contract.js';
import {
  INPUTXML_LENGTH_UNIT_REGISTRY_ID,
  LINEAR_PIPING_INPUTXML_UNIT_PROFILE_SCHEMA,
  requireLinearPipingInputXmlUnitProfile,
  sealLinearPipingInputXmlUnitProfile,
} from '../core/linear-piping-analysis-consumer/inputxml-unit-contract.js';
import { INPUTXML_LINEAR_IDENTITY_CONDITIONING_PROFILE } from '../core/linear-piping-analysis-consumer/inputxml-linear-structural-profile.js';
import {
  DEFAULT_RESTRAINT_TYPE_CODE_MAP,
  CAESAR_INPUTXML_RESTRAINT_TYPE_CORRECTION_PROFILE_ID,
  defaultRestraintTypeMutationConfig,
} from '../core/geometry/adapters/inputxml-restraint-type-mutation.js';
import { parseInputXmlUnitSystem } from '../core/geometry/adapters/inputxml-unit-system.js';
import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { sha256HexText } from '../core/shared-piping-model/sha256.js';

export const LINEAR_PIPING_INPUTXML_INTAKE_SCHEMA = 'linear-piping-inputxml-intake/v1';
export const LINEAR_PIPING_INPUTXML_INTAKE_PROFILE_IDS = Object.freeze([
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
]);
// STRICT refuses any feature it can't model exactly (pressure stiffening, bend
// flexibility, linearized unilateral restraints), which BLOCKs on real CAESAR
// exports as a matter of course — those features have a disclosed, reviewable
// approximation this profile exists to accept. APPROXIMATE is the default so a
// first import shows what's genuinely unrepresentable (friction, gap, missing
// compilation) rather than every feature STRICT declines on principle. Nothing
// is hidden: features under this profile still surface as CONDITIONAL and
// still require explicit authorization before a solve is authorized.
export const LINEAR_PIPING_INPUTXML_DEFAULT_PROFILE_ID = DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE;
export const LINEAR_PIPING_INPUTXML_FALLBACK_UNIT_IDS = Object.freeze(['mm', 'in']);
export const LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ROLE = 'W';
export const LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID = 'IXP-W';
export const LINEAR_PIPING_INPUTXML_BEND_TOLERANCE_DEFAULT = Object.freeze({
  value: 1e-6,
  source: 'LFEA_NATIVE_INPUTXML_INTAKE_R1 — visible engineer-reviewable bend-radius tolerance.',
});

const INTAKE_KEYS = Object.freeze([
  'schema',
  'fileName',
  'contentSha256',
  'inputXmlSource',
  'unitAuthority',
  'ingestionOptions',
  'conditioning',
  'requestedProfileId',
  'requestedCaseIds',
  'semanticHash',
]);

/** Inspect exact InputXML bytes without guessing a missing source unit. */
export function inspectLinearPipingInputXmlSource(input) {
  requireFileInput(input);
  const diagnostics = [];
  const unitSystem = parseInputXmlUnitSystem(input.content, undefined, diagnostics);
  const contentSha256 = sha256HexText(input.content);
  const blockingUnitDiagnostics = diagnostics.filter((row) => row.severity === 'error');
  const status = blockingUnitDiagnostics.length > 0
    ? 'BLOCK'
    : unitSystem.lengthUnit
      ? 'READY'
      : 'UNIT_AUTHORITY_REQUIRED';
  return Object.freeze({
    status,
    fileName: input.fileName,
    contentSha256,
    unitDeclared: unitSystem.declared,
    sourceUnit: unitSystem.lengthUnit,
    unitDiagnostics: Object.freeze(diagnostics.map((row) => Object.freeze(structuredClone(row)))),
  });
}

/**
 * Seal one source/ingestion authority from an already-inspected source.
 *
 * Split out of createLinearPipingInputXmlIntake so a second source format can
 * seal an intake through exactly this code rather than a parallel copy of it.
 * Everything format-specific -- how the text was obtained, which unit
 * declaration is authoritative, what the media type is -- is decided by the
 * caller and passed in; everything custody-related (source sealing, unit
 * profile, ingestion options, identity hash) happens here, once.
 */
export function createLinearPipingSourceIntake(input) {
  const fileName = requireText(input.fileName, 'sourceIntake.fileName');
  const content = requireText(input.content, 'sourceIntake.content');
  const mediaType = input.mediaType ?? INPUTXML_MEDIA_TYPE;
  const sourceUnit = String(input.sourceUnit ?? '').trim().toLowerCase();
  if (!sourceUnit) {
    failIntake('PIPING_INPUTXML_INTAKE_UNIT_AUTHORITY_REQUIRED', 'A source length unit is required.');
  }
  const contentSha256 = sha256HexText(content);
  const sourceId = `${input.sourceIdPrefix ?? 'LFEA-INPUTXML'}-${contentSha256.slice(0, 16).toUpperCase()}`;
  const inputXmlSource = sealLinearPipingInputXmlSource({
    sourceId,
    sourceRevision: `SHA256-${contentSha256.slice(0, 16).toUpperCase()}`,
    fileName,
    mediaType,
    content,
  });
  const unitAuthority = Object.freeze({
    declared: input.unitAuthority?.declared ?? true,
    sourceUnit,
    authority: input.unitAuthority?.authority ?? 'CAESAR_INPUTXML_DECLARED_LENGTH_UNIT',
    revision: input.unitAuthority?.revision ?? inputXmlSource.contentHash,
    evidence: input.unitAuthority?.evidence ?? 'The declared source length unit is authoritative.',
  });
  const unitProfile = sealLinearPipingInputXmlUnitProfile({
    schema: LINEAR_PIPING_INPUTXML_UNIT_PROFILE_SCHEMA,
    profileId: `LFEA-NATIVE-INPUTXML-${sourceUnit.toUpperCase()}-TO-M-R1`,
    registryId: INPUTXML_LENGTH_UNIT_REGISTRY_ID,
    allowedSourceUnits: [sourceUnit],
    sourceEvidence: {
      authority: unitAuthority.authority,
      documentId: fileName,
      revision: unitAuthority.revision,
      sourceSemanticHash: inputXmlSource.semanticHash,
    },
    semanticHash: '',
  });
  const draft = {
    schema: LINEAR_PIPING_INPUTXML_INTAKE_SCHEMA,
    fileName,
    contentSha256,
    inputXmlSource,
    unitAuthority,
    ingestionOptions: Object.freeze({
      unit: sourceUnit,
      source: sourceId,
      componentOrigins: normalizeComponentOrigins(input.componentOrigins),
      restraintTypeCodeMap: Object.freeze({ ...DEFAULT_RESTRAINT_TYPE_CODE_MAP }),
      restraintTypeMutation: Object.freeze(defaultRestraintTypeMutationConfig()),
      restraintTypeCorrectionProfileId: CAESAR_INPUTXML_RESTRAINT_TYPE_CORRECTION_PROFILE_ID,
      bendRadiusTolerance: normalizeBendTolerance(input.bendRadiusTolerance),
      unitNormalizationProfile: unitProfile,
    }),
    conditioning: Object.freeze({
      requiredAttachmentPoints: Object.freeze([]),
      profile: INPUTXML_LINEAR_IDENTITY_CONDITIONING_PROFILE,
    }),
    requestedProfileId: normalizeProfile(input.requestedProfileId),
    requestedCaseIds: normalizeCaseIds(input.requestedCaseIds),
    semanticHash: '',
  };
  draft.semanticHash = semanticHash(intakeIdentity(draft));
  return requireLinearPipingInputXmlIntake(draft);
}

/**
 * Seal one native InputXML source/ingestion authority. No pre-FEA preparation,
 * factorization or solver runtime is created here.
 */
export function createLinearPipingInputXmlIntake(input, options) {
  if (options === undefined) options = {};
  requireFileInput(input);
  const inspection = inspectLinearPipingInputXmlSource(input);
  if (inspection.status === 'BLOCK') {
    failIntake('PIPING_INPUTXML_INTAKE_UNIT_DECLARATION_INVALID',
      'InputXML unit declarations are invalid or unsupported.', inspection.unitDiagnostics);
  }
  const fallbackUnit = normalizeFallbackUnit(options.fallbackUnit);
  if (inspection.status === 'UNIT_AUTHORITY_REQUIRED' && fallbackUnit === null) {
    failIntake('PIPING_INPUTXML_INTAKE_UNIT_AUTHORITY_REQUIRED',
      'InputXML has no supported <UNITS><LENGTH> declaration. Explicit mm or in authority is required.', {
        allowedUnits: LINEAR_PIPING_INPUTXML_FALLBACK_UNIT_IDS,
      });
  }
  const sourceUnit = inspection.sourceUnit ?? fallbackUnit;
  const declared = Boolean(inspection.unitDeclared) && inspection.sourceUnit !== null;
  return createLinearPipingSourceIntake({
    fileName: input.fileName,
    content: input.content,
    mediaType: INPUTXML_MEDIA_TYPE,
    sourceUnit,
    sourceIdPrefix: 'LFEA-INPUTXML',
    unitAuthority: {
      declared,
      authority: declared
        ? 'CAESAR_INPUTXML_DECLARED_LENGTH_UNIT'
        : 'LFEA_ENGINEER_DECLARED_FALLBACK_LENGTH_UNIT',
      // A fallback unit is the engineer's declaration, not the file's, so its
      // revision must not read as if the file had carried the unit.
      revision: declared ? undefined : `ENGINEER-SELECTION-${sourceUnit.toUpperCase()}`,
      evidence: declared
        ? 'The supported <UNITS><LENGTH> declaration in the selected InputXML is authoritative.'
        : 'The selected source has no supported <UNITS><LENGTH>; the engineer explicitly selected the fallback unit.',
    },
    componentOrigins: options.componentOrigins,
    bendRadiusTolerance: options.bendRadiusTolerance,
    requestedProfileId: options.requestedProfileId,
    requestedCaseIds: options.requestedCaseIds,
  });
}

export function requireLinearPipingInputXmlIntake(value) {
  requireRecord(value, 'inputXmlIntake');
  requireExactKeys(value, INTAKE_KEYS, 'inputXmlIntake');
  if (value.schema !== LINEAR_PIPING_INPUTXML_INTAKE_SCHEMA) {
    failIntake('PIPING_INPUTXML_INTAKE_SCHEMA_INVALID', 'Native InputXML intake schema is invalid.');
  }
  if (!/^[0-9a-f]{64}$/u.test(value.contentSha256)
    || sha256HexText(value.inputXmlSource?.content ?? '') !== value.contentSha256) {
    failIntake('PIPING_INPUTXML_INTAKE_SHA256_INVALID', 'InputXML SHA-256 custody is stale.');
  }
  const inputXmlSource = requireLinearPipingInputXmlSource(value.inputXmlSource);
  const unitProfile = requireLinearPipingInputXmlUnitProfile(value.ingestionOptions?.unitNormalizationProfile);
  if (value.ingestionOptions.source !== inputXmlSource.sourceId
    || !unitProfile.allowedSourceUnits.includes(value.ingestionOptions.unit)) {
    failIntake('PIPING_INPUTXML_INTAKE_SOURCE_AUTHORITY_STALE',
      'InputXML intake source or unit authority is stale.');
  }
  normalizeComponentOrigins(value.ingestionOptions.componentOrigins);
  normalizeBendTolerance(value.ingestionOptions.bendRadiusTolerance);
  normalizeProfile(value.requestedProfileId);
  normalizeCaseIds(value.requestedCaseIds);
  const expectedHash = semanticHash(intakeIdentity(value));
  if (value.semanticHash !== expectedHash) {
    failIntake('PIPING_INPUTXML_INTAKE_HASH_INVALID', 'InputXML intake semantic hash is stale.', {
      expected: expectedHash,
      actual: value.semanticHash,
    });
  }
  return Object.freeze(structuredClone(value));
}

function intakeIdentity(value) {
  return {
    schema: value.schema,
    fileName: value.fileName,
    contentSha256: value.contentSha256,
    inputXmlSourceSemanticHash: value.inputXmlSource.semanticHash,
    inputXmlSourceContentHash: value.inputXmlSource.contentHash,
    unitAuthority: value.unitAuthority,
    ingestionOptions: value.ingestionOptions,
    conditioning: value.conditioning,
    requestedProfileId: value.requestedProfileId,
    requestedCaseIds: value.requestedCaseIds,
  };
}

function normalizeFallbackUnit(value) {
  if (value === undefined || value === null || value === '') return null;
  const unit = String(value).trim().toLowerCase();
  if (!LINEAR_PIPING_INPUTXML_FALLBACK_UNIT_IDS.includes(unit)) {
    failIntake('PIPING_INPUTXML_INTAKE_FALLBACK_UNIT_INVALID',
      'Native InputXML fallback unit must be mm or in.', {
        supplied: value,
        allowed: LINEAR_PIPING_INPUTXML_FALLBACK_UNIT_IDS,
      });
  }
  return unit;
}

function normalizeProfile(value) {
  const profile = value ?? LINEAR_PIPING_INPUTXML_DEFAULT_PROFILE_ID;
  if (!LINEAR_PIPING_INPUTXML_INTAKE_PROFILE_IDS.includes(profile)) {
    failIntake('PIPING_INPUTXML_INTAKE_PROFILE_INVALID', 'Native InputXML profile is unsupported.');
  }
  return profile;
}

function normalizeCaseIds(value) {
  const cases = value ?? [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID];
  if (!Array.isArray(cases) || cases.length === 0
    || cases.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    failIntake('PIPING_INPUTXML_INTAKE_CASES_INVALID',
      'Native InputXML requested cases must be a non-empty string array.');
  }
  return Object.freeze(uniqueAscii(cases.map((entry) => entry.trim())));
}

function normalizeComponentOrigins(value) {
  const origins = value ?? {};
  requireRecord(origins, 'componentOrigins');
  const result = {};
  for (const [nodeId, point] of Object.entries(origins)) {
    requireRecord(point, `componentOrigins.${nodeId}`);
    for (const key of ['x', 'y', 'z']) {
      if (typeof point[key] !== 'number' || !Number.isFinite(point[key])) {
        failIntake('PIPING_INPUTXML_INTAKE_COMPONENT_ORIGIN_INVALID',
          `componentOrigins.${nodeId}.${key} must be finite.`);
      }
    }
    result[nodeId] = Object.freeze({ x: point.x, y: point.y, z: point.z });
  }
  return Object.freeze(result);
}

function normalizeBendTolerance(value) {
  const row = value ?? LINEAR_PIPING_INPUTXML_BEND_TOLERANCE_DEFAULT;
  if (!row || typeof row !== 'object' || Array.isArray(row)
    || typeof row.value !== 'number' || !Number.isFinite(row.value) || row.value <= 0
    || typeof row.source !== 'string' || row.source.trim() === '') {
    failIntake('PIPING_INPUTXML_INTAKE_BEND_TOLERANCE_INVALID',
      'Native InputXML bend radius tolerance must be a positive declared value.');
  }
  return Object.freeze({ value: row.value, source: row.source });
}

function requireFileInput(value) {
  requireRecord(value, 'fileInput');
  requireText(value.fileName, 'fileInput.fileName');
  requireText(value.content, 'fileInput.content');
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failIntake('PIPING_INPUTXML_INTAKE_RECORD_REQUIRED', `${field} must be a record.`);
  }
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    failIntake('PIPING_INPUTXML_INTAKE_TEXT_REQUIRED', `${field} must be non-empty.`);
  }
  return value;
}

function requireExactKeys(value, expected, field) {
  const actual = Object.keys(value).sort(compareAscii);
  const required = [...expected].sort(compareAscii);
  if (actual.length !== required.length || actual.some((key, index) => key !== required[index])) {
    failIntake('PIPING_INPUTXML_INTAKE_KEYS_INVALID', `${field} keys are invalid.`, { actual, required });
  }
}

function uniqueAscii(values) {
  return [...new Set(values)].sort(compareAscii);
}

function compareAscii(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function failIntake(code, message, evidence) {
  const error = new TypeError(message);
  error.code = code;
  error.evidence = evidence ?? null;
  error.analysisStage = 'INPUTXML_SOURCE_INTAKE';
  throw error;
}
