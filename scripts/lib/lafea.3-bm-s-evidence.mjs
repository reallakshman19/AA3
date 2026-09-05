import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EXPECTED_PATH = path.join(
  ROOT,
  'validation/lafea-benchmark-data/B02/oracle/expected-values.json',
);

export function loadB02ExpectedCase(caseId) {
  const record = JSON.parse(fs.readFileSync(EXPECTED_PATH, 'utf8'));
  assert.equal(record.schema, 'lafea-b02-expected-values/v1');
  assert.equal(record.authority.productionOutputUsed, false);
  assert.equal(record.authority.productionOutputMayModifyExpectedValues, false);
  const row = record.cases.find((item) => item.caseId === caseId);
  assert.ok(row, `missing B02 expected-values case ${caseId}`);
  requireCitation(row.citation, caseId);
  return Object.freeze(structuredClone(row));
}

export function writeBmSCaseEvidence(envName, evidence) {
  const reportPath = process.env[envName];
  if (!reportPath) return null;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  return reportPath;
}

export function semanticHashes(result) {
  const hashes = result.semanticHashes ?? {};
  return {
    canonicalModelSemanticHash: hashes.canonicalModelSemanticHash ?? null,
    loadCaseInputSemanticHash: hashes.loadCaseInputSemanticHash ?? null,
    resultPayloadSemanticHash: hashes.resultPayloadSemanticHash ?? null,
    executionEvidenceHash: hashes.executionEvidenceHash ?? null,
    qualificationEvidenceHash: hashes.qualificationEvidenceHash ?? null,
  };
}

function requireCitation(citation, caseId) {
  assert.ok(citation && typeof citation === 'object', `${caseId} citation is required`);
  for (const field of ['publisher', 'author', 'title', 'edition', 'year']) {
    assert.ok(citation[field], `${caseId} citation.${field} is required`);
  }
  assert.ok(Array.isArray(citation.pages) && citation.pages.length > 0, `${caseId} citation pages required`);
  assert.ok(
    Array.isArray(citation.equationIdentifiers) && citation.equationIdentifiers.length > 0,
    `${caseId} equation identifiers required`,
  );
}
