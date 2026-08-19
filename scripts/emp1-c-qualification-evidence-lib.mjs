import fs from 'node:fs';
import path from 'node:path';
import { validateEmp1SourceLedger } from './emp1-source-custody-lib.mjs';

export const EMP1_C_RETAINED_ARTIFACT_PATHS = Object.freeze({
  wrcAudit: 'validation/emp1/wrc537-2013/existing-dataset-audit-v1.json',
  wrcManifest: 'validation/emp1/wrc537-2013/existing-dataset-manifest.json',
  wrcSourceLedger: 'validation/emp1/wrc537-2013/source-ledger.json',
  signCrosscheck: 'validation/emp1/wrc537-2013/hexagon-sign-crosscheck-v1.json',
  cauxSourceLedger: 'validation/emp1/caux2017-wrc01f/source-ledger.json',
  cauxSupplementalPrecheck: 'validation/emp1/caux2017-wrc01f/hexagon-wrc107-independent-precheck-qualification-v1.json',
  cauxBenchmarkQualification: 'validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-qualification-v1.json',
  methodAuthorization: 'validation/emp1/wrc537-2013/emp1-c-method-authorization-v1.json',
});

const EXPECTED_CAUX_PAGES = Object.freeze([24, 25, 26, 27, 28, 29, 30, 31]);
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const REQUIRED_WRC_CURVE_FIT_COEFFICIENTS = 10;
const REQUIRED_WRC_INDEPENDENT_VARIABLE = 'U';

export function loadEmp1CRetainedArtifacts(root = process.cwd()) {
  return {
    wrcAudit: readJson(root, EMP1_C_RETAINED_ARTIFACT_PATHS.wrcAudit),
    wrcManifest: readJson(root, EMP1_C_RETAINED_ARTIFACT_PATHS.wrcManifest),
    wrcSourceLedger: readJson(root, EMP1_C_RETAINED_ARTIFACT_PATHS.wrcSourceLedger),
    signCrosscheck: readJson(root, EMP1_C_RETAINED_ARTIFACT_PATHS.signCrosscheck),
    cauxSourceLedger: readJson(root, EMP1_C_RETAINED_ARTIFACT_PATHS.cauxSourceLedger),
    cauxSupplementalPrecheck: readJson(root, EMP1_C_RETAINED_ARTIFACT_PATHS.cauxSupplementalPrecheck),
    cauxBenchmarkQualification: readOptionalJson(root, EMP1_C_RETAINED_ARTIFACT_PATHS.cauxBenchmarkQualification),
    methodAuthorization: readOptionalJson(root, EMP1_C_RETAINED_ARTIFACT_PATHS.methodAuthorization),
  };
}

export function deriveEmp1CQualificationEvidence(artifacts) {
  validateRequiredArtifacts(artifacts);
  const {
    wrcAudit,
    wrcManifest,
    wrcSourceLedger,
    signCrosscheck,
    cauxSourceLedger,
    cauxSupplementalPrecheck,
    cauxBenchmarkQualification,
    methodAuthorization,
  } = artifacts;

  const wrcSourceMetadata = validateEmp1SourceLedger(wrcSourceLedger);
  const cauxSourceMetadata = validateEmp1SourceLedger(cauxSourceLedger);
  if (wrcSourceMetadata.status !== 'PASS') throw new TypeError(`EMP1_C_WRC_SOURCE_LEDGER_${wrcSourceMetadata.code}`);
  if (cauxSourceMetadata.status !== 'PASS') throw new TypeError(`EMP1_C_CAUX_SOURCE_LEDGER_${cauxSourceMetadata.code}`);
  if (wrcSourceLedger.authorityRole !== 'METHOD_SOURCE') throw new TypeError('EMP1_C_WRC_SOURCE_ROLE_INVALID');
  if (cauxSourceLedger.authorityRole !== 'BENCHMARK_SOURCE') throw new TypeError('EMP1_C_CAUX_SOURCE_ROLE_INVALID');

  validateWrcAuditBinding(wrcAudit, wrcManifest);
  validateCauxSource(cauxSourceLedger, cauxSupplementalPrecheck);

  const wrcMetrics = wrcAudit.metrics;
  const wrcSourceCustodyQualified = sourceCustodyQualified(wrcSourceLedger);
  const signConflicts = Object.entries(signCrosscheck.comparison ?? {})
    .filter(([, state]) => state === 'CONFLICT')
    .map(([component]) => `SPHERICAL_${component}_CONFLICT`);
  const signResolutionAuthority = text(
    signCrosscheck.resolutionAuthority,
    signConflicts.length ? 'PINNED_WRC_PDF_ONLY' : 'UNRESOLVED',
  );
  const signStatus = signCrosscheck.status === 'PASS' ? 'PASS' : 'BLOCKED';

  const cauxQualification = deriveCauxBenchmarkQualification(
    cauxSourceLedger,
    cauxSupplementalPrecheck,
    cauxBenchmarkQualification,
  );
  const method = deriveMethodAuthorization(methodAuthorization, wrcSourceLedger, cauxQualification);

  return {
    schema: 'emp1-c-qualification-evidence/v1',
    derivation: {
      mode: 'RETAINED_ARTIFACT_DERIVATION',
      artifactPaths: { ...EMP1_C_RETAINED_ARTIFACT_PATHS },
      manualSummaryPermitted: false,
    },
    wrcDataset: {
      status: wrcAudit.status,
      extractionStatus: wrcMetrics.datasetExtractionStatus,
      unresolvedJsonPathCount: wrcMetrics.unresolvedJsonPathCount,
      openIssueCount: wrcMetrics.openIssueCount,
      numericalDataCount: wrcMetrics.numericalDataCount,
      coefficientCurveRows: wrcMetrics.numericalCsvCurveRows,
      coefficientSchema: wrcMetrics.coefficientSchema,
      coefficientSchemaQualified: wrcMetrics.coefficientSchemaQualified === true,
      coefficientsPerCurve: wrcMetrics.coefficientsPerCurve,
      requiredScalarCoefficientCount: wrcMetrics.requiredScalarCoefficientCount,
      numericScalarCoefficientCount: wrcMetrics.numericScalarCoefficientCount,
      unresolvedScalarCoefficientCount: wrcMetrics.unresolvedScalarCoefficientCount,
      missingScalarCoefficientCount: wrcMetrics.missingScalarCoefficientCount,
      invalidScalarCoefficientCount: wrcMetrics.invalidScalarCoefficientCount,
      independentVariable: wrcMetrics.independentVariable,
      independentVariableRepresentation: wrcMetrics.independentVariableRepresentation,
      independentVariableQualified: wrcMetrics.independentVariableQualified === true,
      semanticHash: wrcMetrics.semanticHash,
      sourceCustodyQualified: wrcSourceCustodyQualified,
      sourceCustodyState: text(wrcSourceLedger.custodyState, 'UNRESOLVED'),
      sourceQualificationState: text(wrcSourceLedger.qualificationState, 'BLOCKED'),
      sourceRawPdfSha256: nullableText(wrcSourceLedger.rawPdfSha256),
    },
    signArbitration: {
      status: signStatus,
      resolutionAuthority: signResolutionAuthority,
      openConflicts: signConflicts,
      sourceCustodyQualified: wrcSourceCustodyQualified,
    },
    cauxBenchmark: cauxQualification,
    methodAuthorization: method,
  };
}

export function renderEmp1CQualificationEvidenceModule(evidence) {
  return [
    '// Generated by scripts/emp1-c-qualification-evidence-build.mjs.',
    '// Do not edit manually; run the build/check scripts against retained qualification artifacts.',
    `export const EMP1_C_RETAINED_QUALIFICATION_EVIDENCE = ${JSON.stringify(evidence, null, 2)};`,
    '',
  ].join('\n');
}

function validateRequiredArtifacts(artifacts) {
  if (!artifacts || typeof artifacts !== 'object') throw new TypeError('EMP1_C_RETAINED_ARTIFACTS_REQUIRED');
  assertSchema(artifacts.wrcAudit, 'emp1-wrc-existing-dataset-audit/v1', 'WRC_AUDIT');
  assertSchema(artifacts.wrcManifest, 'emp1-wrc-existing-dataset-manifest/v1', 'WRC_MANIFEST');
  assertSchema(artifacts.wrcSourceLedger, 'emp1-source-ledger/v1', 'WRC_SOURCE_LEDGER');
  assertSchema(artifacts.signCrosscheck, 'emp1-source-discrepancy/v1', 'SIGN_CROSSCHECK');
  assertSchema(artifacts.cauxSourceLedger, 'emp1-source-ledger/v1', 'CAUX_SOURCE_LEDGER');
  assertSchema(
    artifacts.cauxSupplementalPrecheck,
    'emp1-independent-precheck-qualification/v1',
    'CAUX_SUPPLEMENTAL_PRECHECK',
  );
}

function validateWrcAuditBinding(audit, manifest) {
  const manifestById = new Map((manifest.artifacts ?? []).map((item) => [item.id, item]));
  const expected = [
    ['METHOD_DEFINITION', audit.basis?.methodDefinitionBlob],
    ['DATASET', audit.basis?.datasetBlob],
    ['NUMERICAL_TABLES', audit.basis?.numericalTablesBlob],
  ];
  for (const [id, blob] of expected) {
    const retained = manifestById.get(id);
    if (!retained || retained.gitBlobSha1 !== blob) {
      throw new TypeError(`EMP1_C_WRC_AUDIT_MANIFEST_BINDING_MISMATCH:${id}`);
    }
  }
  if (manifest.productionAuthority !== false || manifest.authority !== 'QUALIFICATION_INPUT_ONLY') {
    throw new TypeError('EMP1_C_WRC_MANIFEST_AUTHORITY_INVALID');
  }

  const metrics = audit.metrics;
  for (const key of [
    'unresolvedJsonPathCount',
    'openIssueCount',
    'numericalDataCount',
    'numericalCsvCurveRows',
    'coefficientsPerCurve',
    'requiredScalarCoefficientCount',
    'numericScalarCoefficientCount',
    'unresolvedScalarCoefficientCount',
    'missingScalarCoefficientCount',
    'invalidScalarCoefficientCount',
    'legacyAnonymousCoefficientRows',
    'legacyNumericValueRows',
    'legacyUnresolvedValueRows',
    'legacyParameter3UnresolvedRows',
  ]) {
    if (!Number.isInteger(metrics?.[key]) || metrics[key] < 0) {
      throw new TypeError(`EMP1_C_WRC_AUDIT_METRIC_INVALID:${key}`);
    }
  }

  if (metrics.coefficientsPerCurve !== REQUIRED_WRC_CURVE_FIT_COEFFICIENTS) {
    throw new TypeError('EMP1_C_WRC_COEFFICIENTS_PER_CURVE_INVALID');
  }
  if (metrics.requiredScalarCoefficientCount
      !== metrics.numericalCsvCurveRows * metrics.coefficientsPerCurve) {
    throw new TypeError('EMP1_C_WRC_REQUIRED_SCALAR_COEFFICIENT_COUNT_INVALID');
  }
  if (metrics.requiredScalarCoefficientCount
      !== metrics.numericScalarCoefficientCount
        + metrics.unresolvedScalarCoefficientCount
        + metrics.missingScalarCoefficientCount
        + metrics.invalidScalarCoefficientCount) {
    throw new TypeError('EMP1_C_WRC_SCALAR_COEFFICIENT_ACCOUNTING_INVALID');
  }
  if (typeof metrics.coefficientSchema !== 'string' || !metrics.coefficientSchema) {
    throw new TypeError('EMP1_C_WRC_COEFFICIENT_SCHEMA_INVALID');
  }
  if (typeof metrics.coefficientSchemaQualified !== 'boolean') {
    throw new TypeError('EMP1_C_WRC_COEFFICIENT_SCHEMA_QUALIFICATION_INVALID');
  }
  if (metrics.independentVariable !== REQUIRED_WRC_INDEPENDENT_VARIABLE) {
    throw new TypeError('EMP1_C_WRC_INDEPENDENT_VARIABLE_INVALID');
  }
  if (typeof metrics.independentVariableRepresentation !== 'string'
      || !metrics.independentVariableRepresentation) {
    throw new TypeError('EMP1_C_WRC_INDEPENDENT_VARIABLE_REPRESENTATION_INVALID');
  }
  if (typeof metrics.independentVariableQualified !== 'boolean') {
    throw new TypeError('EMP1_C_WRC_INDEPENDENT_VARIABLE_QUALIFICATION_INVALID');
  }
}

function validateCauxSource(ledger, supplementalPrecheck) {
  if (ledger.sourceId !== 'CAUX_2017_WRC01F_PP24_31') throw new TypeError('EMP1_C_CAUX_SOURCE_ID_INVALID');
  if (!sameArray(ledger.benchmarkPdfPages, EXPECTED_CAUX_PAGES)) {
    throw new TypeError('EMP1_C_CAUX_PAGE_RANGE_INVALID');
  }
  if (supplementalPrecheck.subject?.classification !== 'SUPPLEMENTAL_REFERENCE_NOT_CAUX_BENCHMARK') {
    throw new TypeError('EMP1_C_CAUX_PRECHECK_CLASSIFICATION_INVALID');
  }
  if (supplementalPrecheck.maySatisfyCauxA4 !== false) {
    throw new TypeError('EMP1_C_CAUX_PRECHECK_AUTHORITY_ESCALATION');
  }
  if (supplementalPrecheck.mayAuthorizeEmp1CProduction !== false) {
    throw new TypeError('EMP1_C_CAUX_PRECHECK_PRODUCTION_AUTHORITY_ESCALATION');
  }
}

function deriveCauxBenchmarkQualification(ledger, supplementalPrecheck, qualification) {
  const sourceQualified = sourceCustodyQualified(ledger);
  const base = {
    status: 'NOT_RUN',
    sourceIdentityVerified: true,
    sourceCustodyQualified: sourceQualified,
    sourceCustodyState: text(ledger.custodyState, 'UNRESOLVED'),
    sourceQualificationState: text(ledger.qualificationState, 'BLOCKED'),
    sourceRawPdfSha256: nullableText(ledger.rawPdfSha256),
    pageRange: `${EXPECTED_CAUX_PAGES[0]}-${EXPECTED_CAUX_PAGES.at(-1)}`,
    expectedValuesFrozen: false,
    independentHandCalculationStatus: 'NOT_RUN',
    benchmarkHash: null,
    supplementalPrecheckVerdict: text(supplementalPrecheck.verdict, 'UNRESOLVED'),
    supplementalPrecheckMaySatisfyCauxA4: supplementalPrecheck.maySatisfyCauxA4 === true,
  };
  if (!qualification) return base;
  assertSchema(
    qualification,
    'emp1-caux-pp24-31-benchmark-qualification/v1',
    'CAUX_BENCHMARK_QUALIFICATION',
  );
  if (!sourceQualified) throw new TypeError('EMP1_C_CAUX_QUALIFICATION_WITHOUT_SOURCE_CUSTODY');
  if (qualification.sourceId !== ledger.sourceId) throw new TypeError('EMP1_C_CAUX_QUALIFICATION_SOURCE_ID_MISMATCH');
  if (qualification.sourceRawPdfSha256 !== ledger.rawPdfSha256) {
    throw new TypeError('EMP1_C_CAUX_QUALIFICATION_SOURCE_SHA256_MISMATCH');
  }
  if (qualification.productionObservationUsedToSetExpectedValues !== false) {
    throw new TypeError('EMP1_C_CAUX_EXPECTED_VALUES_PRODUCTION_CONTAMINATED');
  }
  return {
    ...base,
    status: text(qualification.status, 'BLOCKED'),
    expectedValuesFrozen: qualification.expectedValuesFrozen === true,
    independentHandCalculationStatus: text(
      qualification.independentHandCalculation?.status,
      'NOT_RUN',
    ),
    benchmarkHash: nullableText(qualification.benchmarkHash),
  };
}

function deriveMethodAuthorization(authorization, wrcSourceLedger, cauxQualification) {
  const blocked = {
    engineeringUseAuthorized: false,
    qualificationRecordHash: null,
    authoritySource: 'NO_RETAINED_METHOD_AUTHORIZATION_ARTIFACT',
  };
  if (!authorization) return blocked;
  assertSchema(authorization, 'emp1-c-method-authorization/v1', 'METHOD_AUTHORIZATION');
  if (!sourceCustodyQualified(wrcSourceLedger)) {
    throw new TypeError('EMP1_C_METHOD_AUTHORIZATION_WITHOUT_WRC_SOURCE_CUSTODY');
  }
  if (cauxQualification.status !== 'PASS' || !cauxQualification.benchmarkHash) {
    throw new TypeError('EMP1_C_METHOD_AUTHORIZATION_WITHOUT_CAUX_BENCHMARK_PASS');
  }
  if (authorization.wrcSourceRawPdfSha256 !== wrcSourceLedger.rawPdfSha256) {
    throw new TypeError('EMP1_C_METHOD_AUTHORIZATION_WRC_SHA256_MISMATCH');
  }
  if (authorization.cauxBenchmarkHash !== cauxQualification.benchmarkHash) {
    throw new TypeError('EMP1_C_METHOD_AUTHORIZATION_CAUX_HASH_MISMATCH');
  }
  return {
    engineeringUseAuthorized: authorization.engineeringUseAuthorized === true,
    qualificationRecordHash: nullableText(authorization.qualificationRecordHash),
    authoritySource: EMP1_C_RETAINED_ARTIFACT_PATHS.methodAuthorization,
  };
}

function sourceCustodyQualified(ledger) {
  return ledger.custodyState === 'VERIFIED'
    && ledger.qualificationState === 'PASS'
    && SHA256_HEX.test(ledger.rawPdfSha256 ?? '');
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readOptionalJson(root, relativePath) {
  const filePath = path.join(root, relativePath);
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : null;
}

function assertSchema(value, expected, label) {
  if (!value || typeof value !== 'object' || value.schema !== expected) {
    throw new TypeError(`EMP1_C_${label}_SCHEMA_INVALID`);
  }
}

function sameArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function text(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function nullableText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
