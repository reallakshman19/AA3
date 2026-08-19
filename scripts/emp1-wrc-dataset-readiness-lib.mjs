import { createHash } from 'node:crypto';

export const EMP1_WRC_DATASET_AUDIT_SCHEMA = 'emp1-wrc-dataset-readiness/v1';

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

  const csv = inspectNumericalCsv(numericalCsv);
  if (csv.parseErrors.length) {
    failures.push({ code: 'FAIL_NUMERICAL_CSV_PARSE', errors: csv.parseErrors });
  } else {
    if (csv.dataRows === 0) blockers.push({ code: 'BLOCK_NUMERICAL_TABLE_EMPTY' });
    if (csv.numericCoefficientRows === 0) blockers.push({ code: 'BLOCK_NO_NUMERIC_COEFFICIENT_VALUES' });
    if (csv.unresolvedCoefficientRows > 0) blockers.push({ code: 'BLOCK_UNRESOLVED_COEFFICIENT_VALUES', count: csv.unresolvedCoefficientRows });
    if (csv.unresolvedParameterRows > 0) blockers.push({ code: 'BLOCK_UNRESOLVED_PARAMETER_VALUES', count: csv.unresolvedParameterRows });
  }

  const status = failures.length ? 'FAIL' : blockers.length ? 'BLOCKED' : 'PASS';
  return result(status, blockers, failures, {
    methodStatus,
    extractionStatus: dataset.extractionStatus ?? null,
    semanticHash: dataset.semanticHash ?? null,
    unresolvedPathCount: unresolvedPaths.length,
    openIssueCount: openIssues.length,
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

export function inspectNumericalCsv(text) {
  const rows = parseCsv(text);
  const parseErrors = [];
  if (!rows.length) return { dataRows: 0, numericCoefficientRows: 0, unresolvedCoefficientRows: 0, unresolvedParameterRows: 0, reviewStatusCounts: {}, parseErrors };
  const header = rows[0];
  const index = Object.fromEntries(header.map((name, i) => [name, i]));
  for (const required of ['coefficient_value', 'parameter_3_value', 'review_status']) {
    if (!(required in index)) parseErrors.push(`missing column ${required}`);
  }
  if (parseErrors.length) return { dataRows: Math.max(rows.length - 1, 0), numericCoefficientRows: 0, unresolvedCoefficientRows: 0, unresolvedParameterRows: 0, reviewStatusCounts: {}, parseErrors };

  let numericCoefficientRows = 0;
  let unresolvedCoefficientRows = 0;
  let unresolvedParameterRows = 0;
  const reviewStatusCounts = {};
  for (const row of rows.slice(1).filter((r) => r.some((cell) => cell !== ''))) {
    const coefficient = row[index.coefficient_value] ?? '';
    const parameter3 = row[index.parameter_3_value] ?? '';
    if (coefficient === 'UNRESOLVED') unresolvedCoefficientRows += 1;
    else if (coefficient !== '' && Number.isFinite(Number(coefficient))) numericCoefficientRows += 1;
    if (parameter3 === 'UNRESOLVED') unresolvedParameterRows += 1;
    const review = row[index.review_status] ?? '';
    reviewStatusCounts[review] = (reviewStatusCounts[review] ?? 0) + 1;
  }
  return { dataRows: rows.length - 1, numericCoefficientRows, unresolvedCoefficientRows, unresolvedParameterRows, reviewStatusCounts, parseErrors };
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

function extractMethodStatus(text) {
  const match = String(text ?? '').match(/EXTRACTION STATUS:\s*([A-Z_]+)/u);
  return match?.[1] ?? 'MISSING';
}

function result(status, blockers, failures, metrics) {
  return { schema: EMP1_WRC_DATASET_AUDIT_SCHEMA, status, blockers, failures, metrics };
}
