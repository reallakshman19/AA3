import { createHash } from 'node:crypto';

export const EMP1_WRC_DATASET_AUDIT_SCHEMA = 'emp1-wrc-dataset-readiness/v1';
export const WRC_CURVE_FIT_COEFFICIENT_NAMES = Object.freeze([
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
]);
export const WRC_CURVE_FIT_INDEPENDENT_VARIABLE = 'U';

const WRC_DIMENSIONAL_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'SP_RADIAL_MEMBRANE',
    coefficientFamilies: Object.freeze({ SP_NX: 'NxT/P', SP_NY: 'NyT/P' }),
    equationId: 'EQ_RADIAL_MEMBRANE',
    acceptedMachineForms: Object.freeze([
      'coeff_Nphi*P/(T**2)',
      'coeff_Nphi*P/T**2',
      'coeff_Nphi*P/(T*T)',
      'coeff_Nphi*P/T/T',
    ]),
    dimensionalBasis: '[Nx*T/P]=1 => Nx=coeff*P/T => sigma=Nx/T=coeff*P/T^2',
  }),
  Object.freeze({
    id: 'SM_MOMENT_MEMBRANE',
    coefficientFamilies: Object.freeze({
      SM_NX: 'NxT√(RmT)/M',
      SM_NY: 'NyT√(RmT)/M',
    }),
    equationId: 'EQ_MOMENT_MEMBRANE',
    acceptedMachineForms: Object.freeze([
      'coeff_Nphi*M/(T**2*sqrt(Rm*T))',
      'coeff_Nphi*M/T**2/sqrt(Rm*T)',
      'coeff_Nphi*M/(T*T*sqrt(Rm*T))',
      'coeff_Nphi*M/T/T/sqrt(Rm*T)',
    ]),
    dimensionalBasis: '[Nx*T*sqrt(Rm*T)/M]=1 => Nx=coeff*M/(T*sqrt(Rm*T)) => sigma=Nx/T=coeff*M/(T^2*sqrt(Rm*T))',
  }),
]);

export function gitBlobSha1Bytes(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const hash = createHash('sha1');
  hash.update(Buffer.from(`blob ${buffer.length}\0`, 'utf8'));
  hash.update(buffer);
  return hash.digest('hex');
}

export function auditWrcDatasetPackage({ methodText, dataset, numericalCsv, artifactIdentity = null }) {
  const blockers = [];
  const failures = [];

  if (artifactIdentity) {
    for (const row of artifactIdentity) {
      if (row.actualByteCount !== row.expectedByteCount) {
        failures.push({ code: 'FAIL_ARTIFACT_BYTE_COUNT', artifact: row.id, expected: row.expectedByteCount, actual: row.actualByteCount });
      }
      if (row.actualGitBlobSha1 !== row.expectedGitBlobSha1) {
        failures.push({ code: 'FAIL_ARTIFACT_GIT_BLOB', artifact: row.id, expected: row.expectedGitBlobSha1, actual: row.actualGitBlobSha1 });
      }
    }
  }

  if (!dataset || typeof dataset !== 'object' || Array.isArray(dataset)) {
    failures.push({ code: 'FAIL_DATASET_NOT_OBJECT' });
    return result('FAIL', blockers, failures, {});
  }

  if (dataset.schema !== 'wrc537-source-extraction/v1') {
    failures.push({ code: 'FAIL_DATASET_SCHEMA', actual: dataset.schema ?? null });
  }

  const methodStatus = extractMethodStatus(methodText);
  if (methodStatus !== 'READY_FOR_IMPLEMENTATION') blockers.push({ code: 'BLOCK_METHOD_DEFINITION_STATUS', actual: methodStatus });
  if (dataset.extractionStatus !== 'READY_FOR_IMPLEMENTATION') blockers.push({ code: 'BLOCK_DATASET_EXTRACTION_STATUS', actual: dataset.extractionStatus ?? null });
  if (String(dataset.extractionCaveat ?? '').match(/licensed .*pdf.*not available/i)) blockers.push({ code: 'BLOCK_PRIMARY_SOURCE_NOT_AVAILABLE_TO_EXTRACTOR' });
  if (dataset.semanticHash == null || dataset.semanticHash === '') blockers.push({ code: 'BLOCK_DATASET_SEMANTIC_HASH_MISSING' });
  if (!Array.isArray(dataset.numericalData) || dataset.numericalData.length === 0) blockers.push({ code: 'BLOCK_DATASET_NUMERICAL_DATA_EMPTY' });

  const unresolvedPaths = collectUnresolvedPaths(dataset);
  if (unresolvedPaths.length) blockers.push({ code: 'BLOCK_UNRESOLVED_DATASET_FIELDS', count: unresolvedPaths.length, paths: unresolvedPaths });

  const openIssues = Array.isArray(dataset.openIssues) ? dataset.openIssues : [];
  if (openIssues.length) blockers.push({ code: 'BLOCK_DATASET_OPEN_ISSUES', count: openIssues.length, issues: openIssues });

  const dimensionalContract = inspectWrcMethodDimensionalContract(dataset);
  if (dimensionalContract.status !== 'PASS') blockers.push({
    code: 'BLOCK_METHOD_DIMENSIONAL_CONTRACT',
    violationCount: dimensionalContract.violations.length,
    violations: dimensionalContract.violations,
  });

  const csv = inspectNumericalCsv(numericalCsv);
  if (csv.parseErrors.length) {
    failures.push({ code: 'FAIL_NUMERICAL_CSV_PARSE', errors: csv.parseErrors });
  } else {
    if (csv.curveRows === 0) blockers.push({ code: 'BLOCK_NUMERICAL_TABLE_EMPTY' });
    if (!csv.coefficientSchemaQualified) blockers.push({
      code: 'BLOCK_COEFFICIENT_SCHEMA_REQUIRES_A_TO_J',
      actual: csv.coefficientSchema,
      requiredCoefficientNames: WRC_CURVE_FIT_COEFFICIENT_NAMES,
    });
    if (csv.numericScalarCoefficientCount === 0) blockers.push({
      code: 'BLOCK_NO_NUMERIC_SCALAR_COEFFICIENT_VALUES',
      required: csv.requiredScalarCoefficientCount,
    });
    if (csv.unresolvedScalarCoefficientCount > 0) blockers.push({
      code: 'BLOCK_UNRESOLVED_SCALAR_COEFFICIENT_VALUES',
      count: csv.unresolvedScalarCoefficientCount,
    });
    if (csv.missingScalarCoefficientCount > 0 || csv.invalidScalarCoefficientCount > 0) blockers.push({
      code: 'BLOCK_INCOMPLETE_SCALAR_COEFFICIENT_SET',
      missing: csv.missingScalarCoefficientCount,
      invalid: csv.invalidScalarCoefficientCount,
      required: csv.requiredScalarCoefficientCount,
    });
    if (!csv.independentVariableQualified) blockers.push({
      code: 'BLOCK_INDEPENDENT_VARIABLE_CUSTODY',
      required: WRC_CURVE_FIT_INDEPENDENT_VARIABLE,
      actualRepresentation: csv.independentVariableRepresentation,
    });
  }

  const status = failures.length ? 'FAIL' : blockers.length ? 'BLOCKED' : 'PASS';
  return result(status, blockers, failures, {
    methodStatus,
    extractionStatus: dataset.extractionStatus ?? null,
    semanticHash: dataset.semanticHash ?? null,
    unresolvedPathCount: unresolvedPaths.length,
    openIssueCount: openIssues.length,
    dimensionalContract,
    numericalCsv: csv,
  });
}

export function collectUnresolvedPaths(value, path = '$', output = []) {
  if (typeof value === 'string') {
    if (/\bUNRESOLVED\b/u.test(value)) output.push(path);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUnresolvedPaths(item, `${path}[${index}]`, output));
    return output;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) collectUnresolvedPaths(item, `${path}.${key}`, output);
  }
  return output;
}

/**
 * Fail closed when the retained equation expression contradicts the retained
 * dimensionless coefficient definition. This does not claim that either
 * transcription is authoritative WRC source data; it only proves that the two
 * retained statements cannot both be used as an implementation contract.
 */
export function inspectWrcMethodDimensionalContract(dataset) {
  const families = new Map((dataset?.coefficientFamilies ?? []).map((row) => [row.id, row]));
  const equations = new Map((dataset?.equations ?? []).map((row) => [row.id, row]));
  const violations = [];
  const checks = [];

  for (const contract of WRC_DIMENSIONAL_CONTRACTS) {
    let familyDefinitionsMatch = true;
    const familyEvidence = {};
    for (const [familyId, expectedSymbol] of Object.entries(contract.coefficientFamilies)) {
      const actualSymbol = families.get(familyId)?.symbol ?? null;
      familyEvidence[familyId] = { expectedSymbol, actualSymbol };
      if (normalizeSymbol(actualSymbol) !== normalizeSymbol(expectedSymbol)) familyDefinitionsMatch = false;
    }

    const equation = equations.get(contract.equationId);
    const actualMachine = equation?.machine ?? null;
    const normalizedMachine = normalizeExpression(actualMachine);
    const acceptedMachineForms = contract.acceptedMachineForms.map(normalizeExpression);
    const equationDimensionallyConsistent = acceptedMachineForms.includes(normalizedMachine);

    const check = {
      id: contract.id,
      coefficientFamilies: familyEvidence,
      equationId: contract.equationId,
      actualMachine,
      acceptedMachineForms: [...contract.acceptedMachineForms],
      dimensionalBasis: contract.dimensionalBasis,
      familyDefinitionsMatch,
      equationDimensionallyConsistent,
      status: familyDefinitionsMatch && equationDimensionallyConsistent ? 'PASS' : 'BLOCKED',
    };
    checks.push(check);

    if (!familyDefinitionsMatch) violations.push({
      id: `${contract.id}_COEFFICIENT_DEFINITION_MISMATCH`,
      contractId: contract.id,
      evidence: familyEvidence,
    });
    if (!equationDimensionallyConsistent) violations.push({
      id: `${contract.id}_STRESS_DIMENSION_MISMATCH`,
      contractId: contract.id,
      equationId: contract.equationId,
      actualMachine,
      expectedMachineForms: [...contract.acceptedMachineForms],
      dimensionalBasis: contract.dimensionalBasis,
    });
  }

  return {
    status: violations.length ? 'BLOCKED' : 'PASS',
    checks,
    violations,
  };
}

/**
 * Inspect the retained WRC numerical-table payload without granting engineering
 * authority to its values.
 *
 * The retained method definition describes one response curve as a ninth-order
 * polynomial in runtime variable U with ten named scalar coefficients a..j.
 * Therefore a CSV row is a response-curve record, not one complete numerical
 * coefficient. A future source-qualified payload must expose all ten names per
 * curve before this guard can report coefficient completeness.
 */
export function inspectNumericalCsv(text) {
  const rows = parseCsv(text);
  const parseErrors = [];
  if (!rows.length) return emptyCsvInspection(parseErrors);

  const header = rows[0];
  const index = Object.fromEntries(header.map((name, i) => [name, i]));
  if (!('review_status' in index)) parseErrors.push('missing column review_status');

  const data = rows.slice(1).filter((row) => row.some((cell) => cell !== ''));
  const curveRows = data.length;
  const wideAtoJ = WRC_CURVE_FIT_COEFFICIENT_NAMES.every((name) => name in index);
  const legacySingleValue = 'coefficient_value' in index && !wideAtoJ;
  const coefficientSchema = wideAtoJ
    ? 'WIDE_A_TO_J_PER_CURVE'
    : legacySingleValue
      ? 'LEGACY_SINGLE_VALUE_PER_CURVE'
      : 'MISSING_A_TO_J_COEFFICIENT_PAYLOAD';
  const coefficientSchemaQualified = wideAtoJ;
  const requiredScalarCoefficientCount = curveRows * WRC_CURVE_FIT_COEFFICIENT_NAMES.length;

  let numericScalarCoefficientCount = 0;
  let unresolvedScalarCoefficientCount = 0;
  let missingScalarCoefficientCount = coefficientSchemaQualified ? 0 : requiredScalarCoefficientCount;
  let invalidScalarCoefficientCount = 0;
  let legacyNumericValueRows = 0;
  let legacyUnresolvedValueRows = 0;
  const reviewStatusCounts = {};

  for (const row of data) {
    if (wideAtoJ) {
      for (const name of WRC_CURVE_FIT_COEFFICIENT_NAMES) {
        const cell = String(row[index[name]] ?? '').trim();
        if (cell === '') missingScalarCoefficientCount += 1;
        else if (cell === 'UNRESOLVED') unresolvedScalarCoefficientCount += 1;
        else if (Number.isFinite(Number(cell))) numericScalarCoefficientCount += 1;
        else invalidScalarCoefficientCount += 1;
      }
    } else if (legacySingleValue) {
      const cell = String(row[index.coefficient_value] ?? '').trim();
      if (cell === 'UNRESOLVED') legacyUnresolvedValueRows += 1;
      else if (cell !== '' && Number.isFinite(Number(cell))) legacyNumericValueRows += 1;
    }
    const review = String(row[index.review_status] ?? '');
    reviewStatusCounts[review] = (reviewStatusCounts[review] ?? 0) + 1;
  }

  const independent = inspectIndependentVariable(data, index);
  return {
    dataRows: curveRows,
    curveRows,
    coefficientSchema,
    coefficientSchemaQualified,
    coefficientsPerCurve: WRC_CURVE_FIT_COEFFICIENT_NAMES.length,
    requiredCoefficientNames: [...WRC_CURVE_FIT_COEFFICIENT_NAMES],
    requiredScalarCoefficientCount,
    numericScalarCoefficientCount,
    unresolvedScalarCoefficientCount,
    missingScalarCoefficientCount,
    invalidScalarCoefficientCount,
    legacyNumericValueRows,
    legacyUnresolvedValueRows,
    independentVariable: WRC_CURVE_FIT_INDEPENDENT_VARIABLE,
    independentVariableRepresentation: independent.representation,
    independentVariableQualified: independent.qualified,
    legacyParameter3UnresolvedRows: independent.legacyParameter3UnresolvedRows,
    reviewStatusCounts,
    parseErrors,
  };
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/u, '')); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (quoted) throw new TypeError('EMP1_WRC_CSV_UNTERMINATED_QUOTE');
  if (field !== '' || row.length) { row.push(field.replace(/\r$/u, '')); rows.push(row); }
  return rows;
}

function inspectIndependentVariable(data, index) {
  if ('independent_variable' in index) {
    const qualified = data.length > 0 && data.every((row) =>
      String(row[index.independent_variable] ?? '').trim() === WRC_CURVE_FIT_INDEPENDENT_VARIABLE);
    return {
      representation: 'EXPLICIT_RUNTIME_INDEPENDENT_VARIABLE',
      qualified,
      legacyParameter3UnresolvedRows: 0,
    };
  }

  if ('parameter_3_name' in index || 'parameter_3_value' in index) {
    const legacyParameter3UnresolvedRows = data.filter((row) =>
      String(row[index.parameter_3_name] ?? '').trim() === WRC_CURVE_FIT_INDEPENDENT_VARIABLE
      && String(row[index.parameter_3_value] ?? '').trim() === 'UNRESOLVED').length;
    return {
      representation: 'LEGACY_PARAMETER_3_ROW_ORDINATE',
      qualified: false,
      legacyParameter3UnresolvedRows,
    };
  }

  return {
    representation: 'MISSING_RUNTIME_INDEPENDENT_VARIABLE',
    qualified: false,
    legacyParameter3UnresolvedRows: 0,
  };
}

function emptyCsvInspection(parseErrors) {
  return {
    dataRows: 0,
    curveRows: 0,
    coefficientSchema: 'MISSING_A_TO_J_COEFFICIENT_PAYLOAD',
    coefficientSchemaQualified: false,
    coefficientsPerCurve: WRC_CURVE_FIT_COEFFICIENT_NAMES.length,
    requiredCoefficientNames: [...WRC_CURVE_FIT_COEFFICIENT_NAMES],
    requiredScalarCoefficientCount: 0,
    numericScalarCoefficientCount: 0,
    unresolvedScalarCoefficientCount: 0,
    missingScalarCoefficientCount: 0,
    invalidScalarCoefficientCount: 0,
    legacyNumericValueRows: 0,
    legacyUnresolvedValueRows: 0,
    independentVariable: WRC_CURVE_FIT_INDEPENDENT_VARIABLE,
    independentVariableRepresentation: 'MISSING_RUNTIME_INDEPENDENT_VARIABLE',
    independentVariableQualified: false,
    legacyParameter3UnresolvedRows: 0,
    reviewStatusCounts: {},
    parseErrors,
  };
}

function normalizeExpression(value) {
  return typeof value === 'string' ? value.replace(/\s+/gu, '') : '';
}

function normalizeSymbol(value) {
  return typeof value === 'string'
    ? value.replace(/\s+/gu, '').replace(/×/gu, '*')
    : '';
}

function extractMethodStatus(text) {
  const match = String(text ?? '').match(/EXTRACTION STATUS:\s*([A-Z_]+)/u);
  return match?.[1] ?? 'MISSING';
}

function result(status, blockers, failures, metrics) {
  return { schema: EMP1_WRC_DATASET_AUDIT_SCHEMA, status, blockers, failures, metrics };
}
