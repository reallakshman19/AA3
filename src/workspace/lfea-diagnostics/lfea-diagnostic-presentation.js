import { PREFEA_DISPOSITIONS, PREFEA_SEVERITIES } from '../../core/linear-piping-analysis-consumer/inputxml-linear-prefea-contract.js';
import { plainLanguageForFindingCode } from '../lfea-finding-plain-language.js';

export const LFEA_DIAGNOSTIC_PRESENTATION_SCHEMA = 'lfea-diagnostic-presentation/v1';

const PRESENTATION_BY_DISPOSITION = Object.freeze({
  PASS: Object.freeze({ level: 'info', label: 'Passed' }),
  ADVISORY: Object.freeze({ level: 'info', label: 'For information' }),
  CONDITIONAL: Object.freeze({ level: 'warning', label: 'Review and accept' }),
  BLOCK: Object.freeze({ level: 'error', label: 'Stops the analysis' }),
});
const PREFLIGHT_STATUSES = Object.freeze(['PASS', 'WARN', 'BLOCK']);

/**
 * Project one already-governed pre-FEA finding set into a source-agnostic UI
 * contract. This module owns presentation only: the finding's sealed
 * `disposition` is copied verbatim and is the sole input to the display impact.
 * Message text, raw severity and capability effects are never used to decide
 * whether a finding blocks or requires acceptance.
 */
export function buildLfeaDiagnosticPresentation(preFlight, options = {}) {
  if (!preFlight || typeof preFlight !== 'object' || Array.isArray(preFlight)) {
    throw new TypeError('LFEA diagnostic presentation requires a pre-flight record.');
  }
  const preparation = preFlight.preparation;
  if (!preparation || typeof preparation !== 'object' || !Array.isArray(preparation.findings)) {
    throw new TypeError('LFEA diagnostic presentation requires preFlight.preparation.findings.');
  }
  const preFlightStatus = normalizePreFlightStatus(preFlight.status ?? preparation.status ?? null);
  const rows = Object.freeze(preparation.findings.map((finding, index) => projectFinding(finding, index)));
  const groups = groupRows(rows);
  const counts = Object.freeze(Object.fromEntries(PREFEA_DISPOSITIONS.map((disposition) => [
    disposition,
    rows.filter((row) => row.disposition === disposition).length,
  ])));
  return Object.freeze({
    schema: LFEA_DIAGNOSTIC_PRESENTATION_SCHEMA,
    source: sourceMetadata(options),
    preFlightStatus,
    solveAuthorized: preFlight.solveAuthorized === true,
    preparationSemanticHash: textOrNull(preparation.semanticHash),
    preparationEvidenceHash: textOrNull(preparation.evidenceHash),
    findingCount: rows.length,
    counts,
    rows,
    groups,
  });
}

function projectFinding(finding, index) {
  if (!finding || typeof finding !== 'object' || Array.isArray(finding)) {
    throw new TypeError(`preFlight.preparation.findings[${index}] must be an object.`);
  }
  const findingId = requiredText(finding.findingId, `findings[${index}].findingId`);
  const code = requiredText(finding.code, `findings[${index}].code`);
  const category = requiredText(finding.category, `findings[${index}].category`);
  const disposition = requiredText(finding.disposition, `findings[${index}].disposition`).toUpperCase();
  if (!PREFEA_DISPOSITIONS.includes(disposition)) {
    throw new TypeError(`Unsupported governed disposition ${JSON.stringify(disposition)} for ${findingId}.`);
  }
  const authoritySeverity = optionalEnum(
    finding.severity,
    PREFEA_SEVERITIES,
    `findings[${index}].severity`,
  );
  const impact = PRESENTATION_BY_DISPOSITION[disposition];
  return Object.freeze({
    findingId,
    code,
    category,
    disposition,
    authoritySeverity,
    presentationLevel: impact.level,
    presentationLabel: impact.label,
    message: requiredText(finding.message, `findings[${index}].message`),
    plainMessage: plainLanguageForFindingCode(code),
    technicalBasis: textOrNull(finding.technicalBasis),
    remediation: textOrNull(finding.remediation),
    sourceFeatureIds: copyStringArray(finding.sourceFeatureIds),
    sourcePaths: copyStringArray(finding.sourcePaths),
    canonicalEntityIds: copyStringArray(finding.canonicalEntityIds),
    physicalCaseIds: copyStringArray(finding.physicalCaseIds),
    approximationEligible: finding.approximationEligible === true,
    authorizationRequired: finding.authorizationRequired === true,
  });
}

function groupRows(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const key = JSON.stringify([
      row.category,
      row.disposition,
      row.code,
      row.message,
      row.remediation,
    ]);
    let group = byKey.get(key);
    if (!group) {
      group = {
        category: row.category,
        disposition: row.disposition,
        presentationLevel: row.presentationLevel,
        presentationLabel: row.presentationLabel,
        code: row.code,
        message: row.message,
        plainMessage: row.plainMessage,
        remediation: row.remediation,
        findingIds: [],
        sourceFeatureIds: [],
        occurrences: [],
      };
      byKey.set(key, group);
    }
    group.findingIds.push(row.findingId);
    for (const id of row.sourceFeatureIds) {
      if (!group.sourceFeatureIds.includes(id)) group.sourceFeatureIds.push(id);
    }
    group.occurrences.push(row);
  }
  return Object.freeze([...byKey.values()].map((group) => Object.freeze({
    ...group,
    count: group.occurrences.length,
    findingIds: Object.freeze(group.findingIds),
    sourceFeatureIds: Object.freeze(group.sourceFeatureIds),
    occurrences: Object.freeze(group.occurrences),
  })));
}

function sourceMetadata(options) {
  return Object.freeze({
    kind: textOrNull(options.sourceKind),
    identityKey: textOrNull(options.sourceIdentityKey),
    fileName: textOrNull(options.fileName),
  });
}

function normalizePreFlightStatus(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const status = String(value).trim().toUpperCase();
  if (!PREFLIGHT_STATUSES.includes(status)) {
    throw new TypeError(`Unsupported pre-flight status ${JSON.stringify(status)}.`);
  }
  return status;
}

function optionalEnum(value, allowed, field) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const token = String(value).trim().toUpperCase();
  if (!allowed.includes(token)) throw new TypeError(`${field} has unsupported value ${JSON.stringify(token)}.`);
  return token;
}

function copyStringArray(value) {
  if (value === null || value === undefined) return Object.freeze([]);
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new TypeError('Finding identity/evidence lists must contain strings.');
  }
  return Object.freeze([...value]);
}

function requiredText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${field} is required.`);
  return text;
}

function textOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}
