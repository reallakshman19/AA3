import { INPUTXML_LINEAR_PREFEA_REQUEST_SCHEMA } from '../core/linear-piping-analysis-consumer/inputxml-linear-prefea-contract.js';
import {
  diagnoseInputXmlLinearPreFea,
  requireInputXmlLinearPreFeaDiagnostics,
} from '../core/linear-piping-analysis-consumer/inputxml-linear-prefea-diagnostics.js';
import {
  prepareInputXmlLinearPreFea,
  requireInputXmlLinearPreFeaPreparation,
} from '../core/linear-piping-analysis-consumer/inputxml-linear-prefea-preparation.js';
import {
  authorizeInputXmlLinearSolve,
  requireInputXmlLinearSolveAuthorization,
} from '../core/linear-piping-analysis-consumer/inputxml-linear-solve-authorization.js';
import { requireLinearPipingInputXmlSource } from '../core/linear-piping-analysis-consumer/inputxml-source-contract.js';
import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import {
  ensureLfeaBendFactorAuthorityControl,
  lfeaBendFactorAuthorityForIntake,
  lfeaBranchFactorAuthorityForIntake,
} from './lfea-bend-factor-authority-control.js';
import { requireLinearPipingInputXmlIntake } from './linear-piping-inputxml-intake.js';

export const LINEAR_PIPING_INPUTXML_PREFLIGHT_SCHEMA = 'linear-piping-inputxml-native-preflight/v1';

const NATIVE_SOURCE_REQUEST_SCHEMA = 'linear-piping-inputxml-native-source-request/v1';
const PREFLIGHT_KEYS = Object.freeze([
  'schema',
  'intake',
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
 * Run the production diagnostics/preparation chain from one sealed intake.
 * B31/B31J bend and tee factor authorities enter only through explicit sealed
 * engineer choices. No code edition is inferred from file type or CAESAR version.
 */
export function prepareLinearPipingInputXmlPreFlight(value, options) {
  if (options === undefined) options = {};
  const intake = requireLinearPipingInputXmlIntake(value);
  const diagnostics = diagnoseInputXmlLinearPreFea({
    schema: INPUTXML_LINEAR_PREFEA_REQUEST_SCHEMA,
    analysisRequest: sourceOnlyAnalysisRequest(intake),
    requestedProfileId: intake.requestedProfileId,
    requestedCaseIds: intake.requestedCaseIds,
  }, {
    validateSourceRequest: requireNativeSourceOnlyAnalysisRequest,
    ...(options.diagnosticsOptions ?? {}),
  });
  const bendFactorAuthority = options.bendFactorAuthority === undefined
    ? lfeaBendFactorAuthorityForIntake(intake)
    : options.bendFactorAuthority;
  const branchFactorAuthority = options.branchFactorAuthority === undefined
    ? lfeaBranchFactorAuthorityForIntake(intake)
    : options.branchFactorAuthority;
  const preparationOptions = options.preparationOptions ?? {};
  const preparation = prepareInputXmlLinearPreFea(
    diagnostics,
    {
      ...preparationOptions,
      stiffnessOptions: {
        ...(preparationOptions.stiffnessOptions ?? {}),
        bendFactorAuthority,
        branchFactorAuthority,
      },
    },
  );
  const authorization = preparation.status === 'PASS'
    ? authorizeInputXmlLinearSolve(preparation)
    : null;
  return sealNativePreFlight({ intake, diagnostics, preparation, authorization });
}

/** Seal explicit engineer acceptance for a conditional native pre-flight. */
export function authorizeLinearPipingInputXmlPreFlight(record, approval) {
  const accepted = requireLinearPipingInputXmlPreFlight(record);
  if (accepted.status === 'BLOCK') {
    failPreFlight('PIPING_INPUTXML_NATIVE_PREFLIGHT_BLOCK_OVERRIDE_PROHIBITED',
      'A BLOCK native InputXML pre-flight cannot be authorized.');
  }
  if (accepted.solveAuthorized) return accepted;
  const approverIdentity = requireText(
    approval?.approverIdentity,
    'approval.approverIdentity',
  ).trim();
  const reason = requireText(approval?.reason, 'approval.reason').trim();
  const preparation = requireInputXmlLinearPreFeaPreparation(
    accepted.preparation,
    accepted.diagnostics,
  );
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

/** Revalidate the complete source → preparation → authorization custody chain. */
export function requireLinearPipingInputXmlPreFlight(record) {
  requireRecord(record, 'nativePreFlight');
  requireExactKeys(record, PREFLIGHT_KEYS, 'nativePreFlight');
  if (record.schema !== LINEAR_PIPING_INPUTXML_PREFLIGHT_SCHEMA) {
    failPreFlight('PIPING_INPUTXML_NATIVE_PREFLIGHT_SCHEMA_INVALID',
      'Native InputXML pre-flight schema is invalid.');
  }
  const intake = requireLinearPipingInputXmlIntake(record.intake);
  if (record.intakeSemanticHash !== intake.semanticHash) {
    failPreFlight('PIPING_INPUTXML_NATIVE_PREFLIGHT_INTAKE_STALE',
      'Native pre-flight intake identity is stale.');
  }
  const diagnostics = requireInputXmlLinearPreFeaDiagnostics(record.diagnostics);
  requireEqual(
    diagnostics.sourceAuthority?.sourceSemanticHash,
    intake.inputXmlSource.semanticHash,
    'PIPING_INPUTXML_NATIVE_PREFLIGHT_SOURCE_SEMANTIC_STALE',
    'Native pre-flight diagnostics no longer match the sealed InputXML source semantic identity.',
  );
  requireEqual(
    diagnostics.sourceAuthority?.contentHash,
    intake.inputXmlSource.contentHash,
    'PIPING_INPUTXML_NATIVE_PREFLIGHT_SOURCE_CONTENT_STALE',
    'Native pre-flight diagnostics no longer match the sealed InputXML source content identity.',
  );
  const preparation = requireInputXmlLinearPreFeaPreparation(record.preparation, diagnostics);
  requireEqual(preparation.requestedProfileId, intake.requestedProfileId,
    'PIPING_INPUTXML_NATIVE_PREFLIGHT_PROFILE_STALE',
    'Native pre-flight profile no longer matches the source intake.');
  requireEqualArrays(preparation.requestedCaseIds, intake.requestedCaseIds,
    'PIPING_INPUTXML_NATIVE_PREFLIGHT_CASES_STALE',
    'Native pre-flight cases no longer match the source intake.');
  requireEqual(record.status, preparation.status,
    'PIPING_INPUTXML_NATIVE_PREFLIGHT_STATUS_STALE',
    'Native pre-flight status no longer matches the sealed preparation.');
  requireSourceSummary(record.sourceSummary, intake, diagnostics, preparation);

  const authorization = record.authorization === null
    ? null
    : requireInputXmlLinearSolveAuthorization(
      record.authorization,
      preparation,
      preparation.requestedCaseIds,
    );
  const solveAuthorized = authorization !== null;
  requireEqual(record.solveAuthorized, solveAuthorized,
    'PIPING_INPUTXML_NATIVE_PREFLIGHT_AUTHORIZATION_STALE',
    'Native pre-flight authorization state is stale.');
  requireEqualArrays(
    record.limitationsAccepted,
    authorization?.limitationsAccepted ?? [],
    'PIPING_INPUTXML_NATIVE_PREFLIGHT_LIMITATIONS_STALE',
    'Native pre-flight accepted limitations are stale.',
  );
  requireEqual(
    record.approverIdentity,
    authorization?.approverIdentity ?? null,
    'PIPING_INPUTXML_NATIVE_PREFLIGHT_APPROVER_STALE',
    'Native pre-flight approver identity is stale.',
  );
  const expectedHash = semanticHash(nativePreFlightIdentity(record));
  if (record.semanticHash !== expectedHash) {
    failPreFlight('PIPING_INPUTXML_NATIVE_PREFLIGHT_HASH_INVALID',
      'Native InputXML pre-flight semantic hash is stale.', {
        expected: expectedHash,
        actual: record.semanticHash,
      });
  }
  return Object.freeze({
    ...record,
    intake,
    diagnostics,
    preparation,
    authorization,
  });
}

function sealNativePreFlight({ intake, diagnostics, preparation, authorization }) {
  const acceptedIntake = requireLinearPipingInputXmlIntake(intake);
  const acceptedDiagnostics = requireInputXmlLinearPreFeaDiagnostics(diagnostics);
  const acceptedPreparation = requireInputXmlLinearPreFeaPreparation(
    preparation,
    acceptedDiagnostics,
  );
  const acceptedAuthorization = authorization === null
    ? null
    : requireInputXmlLinearSolveAuthorization(
      authorization,
      acceptedPreparation,
      acceptedPreparation.requestedCaseIds,
    );
  const sourceSummary = Object.freeze({
    fileName: acceptedIntake.fileName,
    contentSha256: acceptedIntake.contentSha256,
    sourceSemanticHash: acceptedIntake.inputXmlSource.semanticHash,
    sourceContentHash: acceptedIntake.inputXmlSource.contentHash,
    unitDeclared: acceptedIntake.unitAuthority.declared,
    sourceUnit: acceptedIntake.unitAuthority.sourceUnit,
    unitAuthority: acceptedIntake.unitAuthority.authority,
    jobName: acceptedDiagnostics.sourceBundle.jobName,
    nodeCount: acceptedDiagnostics.sourceBundle.geometry.nodes.length,
    elementCount: acceptedDiagnostics.sourceBundle.geometry.segments.length,
    requestedCaseIds: acceptedIntake.requestedCaseIds,
    availableCaseIds: Object.freeze((acceptedPreparation.physicalPreparation?.physicalCases ?? [])
      .map((entry) => entry.caseId).sort(compareAscii)),
    restraintTypeCorrectionProfileId:
      acceptedIntake.ingestionOptions.restraintTypeCorrectionProfileId,
    bendRadiusTolerance: acceptedIntake.ingestionOptions.bendRadiusTolerance,
  });
  const draft = {
    schema: LINEAR_PIPING_INPUTXML_PREFLIGHT_SCHEMA,
    intake: acceptedIntake,
    intakeSemanticHash: acceptedIntake.semanticHash,
    status: acceptedPreparation.status,
    solveAuthorized: acceptedAuthorization !== null,
    sourceSummary,
    diagnostics: acceptedDiagnostics,
    preparation: acceptedPreparation,
    authorization: acceptedAuthorization,
    limitationsAccepted: Object.freeze([
      ...(acceptedAuthorization?.limitationsAccepted ?? []),
    ]),
    approverIdentity: acceptedAuthorization?.approverIdentity ?? null,
    semanticHash: '',
  };
  draft.semanticHash = semanticHash(nativePreFlightIdentity(draft));
  return requireLinearPipingInputXmlPreFlight(Object.freeze(draft));
}

function sourceOnlyAnalysisRequest(intake) {
  return Object.freeze({
    schema: NATIVE_SOURCE_REQUEST_SCHEMA,
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
  if (value.schema !== NATIVE_SOURCE_REQUEST_SCHEMA
    || value.sourceAnalysisRequest !== null) {
    failPreFlight('PIPING_INPUTXML_NATIVE_SOURCE_REQUEST_INVALID',
      'Native source-only request is invalid.');
  }
  requireLinearPipingInputXmlSource(value.inputXmlSource);
  requireRecord(value.ingestionOptions, 'nativeSourceRequest.ingestionOptions');
  requireRecord(value.conditioning, 'nativeSourceRequest.conditioning');
  return value;
}

function requireSourceSummary(summary, intake, diagnostics, preparation) {
  requireRecord(summary, 'nativePreFlight.sourceSummary');
  const expected = {
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
    availableCaseIds: (preparation.physicalPreparation?.physicalCases ?? [])
      .map((entry) => entry.caseId).sort(compareAscii),
    restraintTypeCorrectionProfileId: intake.ingestionOptions.restraintTypeCorrectionProfileId,
    bendRadiusTolerance: intake.ingestionOptions.bendRadiusTolerance,
  };
  if (JSON.stringify(summary) !== JSON.stringify(expected)) {
    failPreFlight('PIPING_INPUTXML_NATIVE_PREFLIGHT_SOURCE_SUMMARY_STALE',
      'Native pre-flight source summary no longer matches its parents.');
  }
}

function nativePreFlightIdentity(value) {
  return {
    schema: value.schema,
    intakeSemanticHash: value.intakeSemanticHash,
    status: value.status,
    solveAuthorized: value.solveAuthorized,
    sourceSummary: value.sourceSummary,
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

function requireEqual(actual, expected, code, message) {
  if (actual !== expected) failPreFlight(code, message, { actual, expected });
}

function requireEqualArrays(actual, expected, code, message) {
  if (!Array.isArray(actual) || !Array.isArray(expected)
    || actual.length !== expected.length
    || actual.some((value, index) => value !== expected[index])) {
    failPreFlight(code, message, { actual, expected });
  }
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failPreFlight('PIPING_INPUTXML_NATIVE_PREFLIGHT_RECORD_REQUIRED',
      `${field} must be a record.`);
  }
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    failPreFlight('PIPING_INPUTXML_NATIVE_PREFLIGHT_REVIEW_FIELD_REQUIRED',
      `${field} is required.`);
  }
  return value;
}

function requireExactKeys(value, expected, field) {
  const actual = Object.keys(value).sort(compareAscii);
  const required = [...expected].sort(compareAscii);
  if (actual.length !== required.length
    || actual.some((key, index) => key !== required[index])) {
    failPreFlight('PIPING_INPUTXML_NATIVE_PREFLIGHT_KEYS_INVALID',
      `${field} keys are invalid.`, { actual, required });
  }
}

function uniqueAscii(values) {
  return Object.freeze([...new Set(values)].sort(compareAscii));
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failPreFlight(code, message, evidence) {
  const error = new TypeError(message);
  error.code = code;
  error.evidence = evidence ?? null;
  error.analysisStage = 'INPUTXML_NATIVE_PREFLIGHT';
  throw error;
}

// The mount host (linear-piping-consumer-root) is built by the app's own
// bootstrap after this module's import graph resolves, so a single attempt
// here can run before that host exists and never mount at all -- silently,
// since ensureLfeaBendFactorAuthorityControl() returns null rather than
// throwing when its host is missing. Retry across macrotask ticks: the
// function already no-ops once mounted, so repeated calls are safe.
if (typeof document !== 'undefined' && typeof setTimeout === 'function') {
  let mountAttemptsRemaining = 50;
  const attemptMount = () => {
    mountAttemptsRemaining -= 1;
    if (ensureLfeaBendFactorAuthorityControl(document) !== null || mountAttemptsRemaining <= 0) return;
    setTimeout(attemptMount, 0);
  };
  setTimeout(attemptMount, 0);
}
