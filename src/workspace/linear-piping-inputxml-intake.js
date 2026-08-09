import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
  INPUTXML_LENGTH_UNIT_REGISTRY_ID,
  INPUTXML_LINEAR_PREFEA_REQUEST_SCHEMA,
  LINEAR_PIPING_INPUTXML_UNIT_PROFILE_SCHEMA,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
  authorizeInputXmlLinearSolve,
  diagnoseInputXmlLinearPreFea,
  prepareInputXmlLinearPreFea,
  requireInputXmlLinearPreFeaPreparation,
  requireInputXmlLinearSolveAuthorization,
  requireLinearPipingInputXmlSource,
  requireLinearPipingInputXmlUnitProfile,
  sealLinearPipingInputXmlSource,
  sealLinearPipingInputXmlUnitProfile,
} from '../core/linear-piping-analysis-consumer/index.js';
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
export const LINEAR_PIPING_INPUTXML_PREFLIGHT_SCHEMA = 'linear-piping-inputxml-native-preflight/v1';
export const LINEAR_PIPING_INPUTXML_INTAKE_PROFILE_IDS = Object.freeze([
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
]);
export const LINEAR_PIPING_INPUTXML_FALLBACK_UNIT_IDS = Object.freeze(['mm', 'in']);
export const LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID = 'W';
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
const PREFLIGHT_KEYS = Object.freeze([
  'schema',
  'intakeSemanticHash',
  'status',
  'solveAuthorized',
  'sourceSummary',
  'diagnostics',
  'preparation',
  'authorization',
  'limitationsAccepted',
  'approverIdentity',
  'semanticHash',
]);

/**
 * Inspect exact InputXML bytes without guessing a missing source unit.
 *
 * A supported file declaration is authoritative. If there is no LENGTH
 * declaration, the result is UNIT_AUTHORITY_REQUIRED; callers must supply an
 * explicit fallback unit to `createLinearPipingInputXmlIntake`.
 */
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
 * Seal one native InputXML intake authority. No solver/runtime state is created.
 * Missing units are accepted only when the engineer supplies an allowed
 * fallback unit. A declared file unit always overrides the fallback.
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
  const sourceId = `LFEA-INPUTXML-${inspection.contentSha256.slice(0, 16).toUpperCase()}`;
  const inputXmlSource = sealLinearPipingInputXmlSource({
    sourceId,
    sourceRevision: `SHA256-${inspection.contentSha256.slice(0, 16).toUpperCase()}`,
    fileName: input.fileName,
    mediaType: 'application/xml',
    content: input.content,
  });
  const unitAuthority = unitAuthorityRecord({
    inspection,
    sourceUnit,
    inputXmlSource,
  });
  const unitProfile = sealLinearPipingInputXmlUnitProfile({
    schema: LINEAR_PIPING_INPUTXML_UNIT_PROFILE_SCHEMA,
    profileId: `LFEA-NATIVE-INPUTXML-${sourceUnit.toUpperCase()}-TO-M-R1`,
    registryId: INPUTXML_LENGTH_UNIT_REGISTRY_ID,
    allowedSourceUnits: [sourceUnit],
    sourceEvidence: {
      authority: unitAuthority.authority,
      documentId: input.fileName,
      revision: unitAuthority.revision,
      sourceSemanticHash: inputXmlSource.semanticHash,
    },
    semanticHash: '',
  });
  const componentOrigins = normalizeComponentOrigins(options.componentOrigins);
  const bendRadiusTolerance = normalizeBendTolerance(options.bendRadiusTolerance);
  const requestedProfileId = normalizeProfile(options.requestedProfileId);
  const requestedCaseIds = normalizeCaseIds(options.requestedCaseIds);
  const draft = {
    schema: LINEAR_PIPING_INPUTXML_INTAKE_SCHEMA,
    fileName: input.fileName,
    contentSha256: inspection.contentSha256,
    inputXmlSource,
    unitAuthority,
    ingestionOptions: Object.freeze({
      unit: sourceUnit,
      source: sourceId,
      componentOrigins,
      restraintTypeCodeMap: Object.freeze({ ...DEFAULT_RESTRAINT_TYPE_CODE_MAP }),
      restraintTypeMutation: Object.freeze(defaultRestraintTypeMutationConfig()),
      restraintTypeCorrectionProfileId: CAESAR_INPUTXML_RESTRAINT_TYPE_CORRECTION_PROFILE_ID,
      bendRadiusTolerance,
      unitNormalizationProfile: unitProfile,
    }),
    conditioning: Object.freeze({
      requiredAttachmentPoints: Object.freeze([]),
      profile: INPUTXML_LINEAR_IDENTITY_CONDITIONING_PROFILE,
    }),
    requestedProfileId,
    requestedCaseIds,
    semanticHash: '',
  };
  draft.semanticHash = semanticHash(intakeIdentity(draft));
  return requireLinearPipingInputXmlIntake(draft);
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

/**
 * Run the existing production pre-FEA diagnostics/preparation chain directly
 * from the native source intake. The custom validator deliberately validates a
 * source-intake record rather than requiring the old hand-authored downstream
 * `sourceAnalysisRequest`; diagnostics/preparation never consume that object.
 */
export function prepareLinearPipingInputXmlPreFlight(value, options) {
  if (options === undefined) options = {};
  const intake = requireLinearPipingInputXmlIntake(value);
  const sourceOnlyRequest = sourceOnlyAnalysisRequest(intake);
  const diagnostics = diagnoseInputXmlLinearPreFea({
    schema: INPUTXML_LINEAR_PREFEA_REQUEST_SCHEMA,
    analysisRequest: sourceOnlyRequest,
    requestedProfileId: intake.requestedProfileId,
    requestedCaseIds: intake.requestedCaseIds,
  }, {
    validateSourceRequest: requireNativeSourceOnlyAnalysisRequest,
    ...(options.diagnosticsOptions ?? {}),
  });
  const preparation = prepareInputXmlLinearPreFea(diagnostics, options.preparationOptions ?? {});
  const authorization = preparation.status === 'PASS'
    ? authorizeInputXmlLinearSolve(preparation)
    : null;
  return sealNativePreFlight({ intake, diagnostics, preparation, authorization });
}

export function authorizeLinearPipingInputXmlPreFlight(record, approval) {
  const accepted = requireLinearPipingInputXmlPreFlight(record);
  if (accepted.status === 'BLOCK') {
    failIntake('PIPING_INPUTXML_NATIVE_PREFLIGHT_BLOCK_OVERRIDE_PROHIBITED',
      'A BLOCK native InputXML pre-flight cannot be authorized.');
  }
  if (accepted.solveAuthorized) return accepted;
  const approverIdentity = requireText(approval?.approverIdentity, 'approval.approverIdentity').trim();
  const reason = requireText(approval?.reason, 'approval.reason').trim();
  const preparation = requireInputXmlLinearPreFeaPreparation(accepted.preparation, accepted.diagnostics);
  const warningFindingIds = uniqueAscii(preparation.findings
    .filter((finding) => finding.disposition === 'CONDITIONAL')
    .map((finding) => finding.findingId));
  const limitationsAccepted = uniqueAscii([
    ...(preparation.limitations ?? []),
    ...preparation.findings
      .filter((finding) => finding.disposition === 'CONDITIONAL')
      .map((finding) => finding.code),
  ]);
  const authorization = authorizeInputXmlLinearSolve(preparation, {
    authorizationSource: 'LFEA_NATIVE_INPUTXML_REVIEW_V1',
    authorizationRevision: '1',
    approverIdentity,
    reason,
    limitationsAccepted,
    authorizedPhysicalCaseIds: preparation.requestedCaseIds,
    warningFindingIds,
    invalidationPolicy: 'INVALIDATE_ON_PARENT_IDENTITY_CHANGE',
    expiration: null,
  });
  return sealNativePreFlight({
    intake: accepted.intake,
    diagnostics: accepted.diagnostics,
    preparation,
    authorization,
  });
}

export function requireLinearPipingInputXmlPreFlight(record) {
  requireRecord(record, 'nativePreFlight');
  requireExactKeys(record, PREFLIGHT_KEYS, 'nativePreFlight');
  if (record.schema !== LINEAR_PIPING_INPUTXML_PREFLIGHT_SCHEMA) {
    failIntake('PIPING_INPUTXML_NATIVE_PREFLIGHT_SCHEMA_INVALID',
      'Native InputXML pre-flight schema is invalid.');
  }
  const intake = requireLinearPipingInputXmlIntake(record.sourceSummary?.intake ?? record.intake);
  void intake;
  return record;
}

function sealNativePreFlight({ intake, diagnostics, preparation, authorization }) {
  const acceptedPreparation = requireInputXmlLinearPreFeaPreparation(preparation, diagnostics);
  const acceptedAuthorization = authorization === null
    ? null
    : requireInputXmlLinearSolveAuthorization(
      authorization,
      acceptedPreparation,
      acceptedPreparation.requestedCaseIds,
    );
  const sourceSummary = Object.freeze({
    intake,
    fileName: intake.fileName,
    contentSha256: intake.contentSha256,
    sourceSemanticHash: intake.inputXmlSource.semanticHash,
    sourceContentHash: intake.inputXmlSource.contentHash,
    unitDeclared: intake.unitAuthority.declared,
    sourceUnit: intake.unitAuthority.sourceUnit,
    unitAuthority: intake.unitAuthority.authority,
    jobName: diagnostics.sourceBundle.jobName,
    nodeCount: diagnostics.sourceBundle.geometry.nodes.length,
    elementCount: diagnostics.sourceBundle.geometry.segments.length,
    requestedCaseIds: intake.requestedCaseIds,
    availableCaseIds: Object.freeze((acceptedPreparation.physicalPreparation?.physicalCases ?? [])
      .map((entry) => entry.caseId).sort(compareAscii)),
    restraintTypeCorrectionProfileId: intake.ingestionOptions.restraintTypeCorrectionProfileId,
    bendRadiusTolerance: intake.ingestionOptions.bendRadiusTolerance,
  });
  const draft = {
    schema: LINEAR_PIPING_INPUTXML_PREFLIGHT_SCHEMA,
    intakeSemanticHash: intake.semanticHash,
    status: acceptedPreparation.status,
    solveAuthorized: acceptedAuthorization !== null,
    sourceSummary,
    diagnostics,
    preparation: acceptedPreparation,
    authorization: acceptedAuthorization,
    limitationsAccepted: Object.freeze([...(acceptedAuthorization?.limitationsAccepted ?? [])]),
    approverIdentity: acceptedAuthorization?.approverIdentity ?? null,
    semanticHash: '',
  };
  draft.semanticHash = semanticHash(nativePreFlightIdentity(draft));
  return Object.freeze(draft);
}

function sourceOnlyAnalysisRequest(intake) {
  return Object.freeze({
    schema: 'linear-piping-inputxml-native-source-request/v1',
    inputXmlSource: intake.inputXmlSource,
    ingestionOptions: Object.freeze({
      unit: intake.ingestionOptions.unit,
      source: intake.ingestionOptions.source,
      componentOrigins: intake.ingestionOptions.componentOrigins,
      restraintTypeCodeMap: intake.ingestionOptions.restraintTypeCodeMap,
      restraintTypeMutation: intake.ingestionOptions.restraintTypeMutation,
      bendRadiusTolerance: intake.ingestionOptions.bendRadiusTolerance,
    }),
    conditioning: intake.conditioning,
    sourceAnalysisRequest: null,
  });
}

function requireNativeSourceOnlyAnalysisRequest(value) {
  requireRecord(value, 'nativeSourceRequest');
  if (value.schema !== 'linear-piping-inputxml-native-source-request/v1'
    || value.sourceAnalysisRequest !== null) {
    failIntake('PIPING_INPUTXML_NATIVE_SOURCE_REQUEST_INVALID',
      'Native source-only request is invalid.');
  }
  requireLinearPipingInputXmlSource(value.inputXmlSource);
  normalizeComponentOrigins(value.ingestionOptions?.componentOrigins);
  normalizeBendTolerance(value.ingestionOptions?.bendRadiusTolerance);
  return value;
}

function unitAuthorityRecord({ inspection, sourceUnit, inputXmlSource }) {
  const declared = inspection.unitDeclared && inspection.sourceUnit !== null;
  const authority = declared
    ? 'CAESAR_INPUTXML_DECLARED_LENGTH_UNIT'
    : 'LFEA_ENGINEER_DECLARED_FALLBACK_LENGTH_UNIT';
  return Object.freeze({
    declared,
    sourceUnit,
    authority,
    revision: declared ? inputXmlSource.contentHash : `ENGINEER-SELECTION-${sourceUnit.toUpperCase()}`,
    evidence: declared
      ? 'The supported <UNITS><LENGTH> declaration in the selected InputXML is authoritative.'
      : 'The selected source has no supported <UNITS><LENGTH>; the engineer explicitly selected the fallback unit.',
  });
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

function nativePreFlightIdentity(value) {
  return {
    schema: value.schema,
    intakeSemanticHash: value.intakeSemanticHash,
    status: value.status,
    solveAuthorized: value.solveAuthorized,
    sourceSummary: {
      fileName: value.sourceSummary.fileName,
      contentSha256: value.sourceSummary.contentSha256,
      sourceSemanticHash: value.sourceSummary.sourceSemanticHash,
      sourceContentHash: value.sourceSummary.sourceContentHash,
      unitDeclared: value.sourceSummary.unitDeclared,
      sourceUnit: value.sourceSummary.sourceUnit,
      unitAuthority: value.sourceSummary.unitAuthority,
      jobName: value.sourceSummary.jobName,
      nodeCount: value.sourceSummary.nodeCount,
      elementCount: value.sourceSummary.elementCount,
      requestedCaseIds: value.sourceSummary.requestedCaseIds,
      availableCaseIds: value.sourceSummary.availableCaseIds,
      restraintTypeCorrectionProfileId: value.sourceSummary.restraintTypeCorrectionProfileId,
      bendRadiusTolerance: value.sourceSummary.bendRadiusTolerance,
    },
    diagnosticsSemanticHash: value.diagnostics.semanticHash,
    diagnosticsEvidenceHash: value.diagnostics.evidenceHash,
    preparationSemanticHash: value.preparation.semanticHash,
    preparationEvidenceHash: value.preparation.evidenceHash,
    authorizationSemanticHash: value.authorization?.semanticHash ?? null,
    authorizationEvidenceHash: value.authorization?.evidenceHash ?? null,
    limitationsAccepted: value.limitationsAccepted,
    approverIdentity: value.approverIdentity,
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
  const profile = value ?? STRICT_INPUTXML_LINEAR_STATIC_PROFILE;
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
