import { makeFinding } from './inputxml-linear-prefea-contract.js';

export function collectFindings({
  sourceBundle,
  topology,
  proximity,
  representability,
  engineeringSanity,
}) {
  const rows = [];
  for (const diagnostic of sourceBundle.geometry?.diagnostics ?? []) {
    rows.push(normalizeFinding(diagnostic, 'GEOMETRY', ['CANONICAL_GEOMETRY']));
  }
  appendReportFindings(rows, topology, 'TOPOLOGY', ['STRUCTURAL_GRAPH']);
  appendReportFindings(rows, proximity, 'GEOMETRY', ['STRUCTURAL_GRAPH']);
  appendReportFindings(rows, representability, 'COMPONENT', ['LINEAR_STRUCTURAL_MODEL']);
  appendReportFindings(rows, engineeringSanity, 'SCHEMA', ['LINEAR_STRUCTURAL_MODEL']);
  for (const capability of representability.capabilities ?? []) {
    if (capability.status === 'BLOCK') {
      rows.push(makeFinding({
        code: 'REQUIRED_CAPABILITY_BLOCKED',
        category: capability.category ?? 'UNSUPPORTED_FEATURE',
        severity: 'ERROR',
        disposition: 'BLOCK',
        capabilityEffects: [capability.capabilityId],
        sourceFeatureIds: capability.sourceFeatureIds ?? [],
        sourcePaths: [],
        canonicalEntityIds: [],
        physicalCaseIds: [],
        message: `Required capability ${capability.capabilityId} is blocked.`,
        technicalBasis: 'The selected profile cannot prepare all active source features exactly or through a declared approximation.',
        evidence: {
          capabilityId: capability.capabilityId,
          findingIds: capability.findingIds ?? [],
          limitationCodes: capability.limitationCodes ?? [],
        },
        remediation: 'Provide supported source authority or select an explicitly permitted approximation profile.',
        approximationEligible: (capability.limitationCodes ?? []).length > 0,
        authorizationRequired: false,
      }));
    } else if (capability.status === 'WARN' || capability.status === 'CONDITIONAL') {
      rows.push(makeFinding({
        code: 'CAPABILITY_REQUIRES_CONDITIONAL_AUTHORIZATION',
        category: capability.category ?? 'UNSUPPORTED_FEATURE',
        severity: 'WARNING',
        disposition: 'CONDITIONAL',
        capabilityEffects: [capability.capabilityId],
        sourceFeatureIds: capability.sourceFeatureIds ?? [],
        sourcePaths: [],
        canonicalEntityIds: [],
        physicalCaseIds: [],
        message: `Capability ${capability.capabilityId} requires conditional authorization.`,
        technicalBasis: 'The mechanics are executable only with one or more visible profile-specific limitations.',
        evidence: {
          capabilityId: capability.capabilityId,
          findingIds: capability.findingIds ?? [],
          limitationCodes: capability.limitationCodes ?? [],
        },
        remediation: 'Review and explicitly accept the retained limitation set before solving.',
        approximationEligible: true,
        authorizationRequired: true,
      }));
    }
  }
  return deduplicate(rows);
}

function appendReportFindings(target, report, fallbackCategory, effects) {
  for (const row of report?.findings ?? report?.diagnostics ?? []) {
    target.push(normalizeFinding(row, fallbackCategory, effects));
  }
}

function normalizeFinding(row, fallbackCategory, effects) {
  const rawDisposition = String(row.disposition ?? row.status ?? '').toUpperCase();
  const severity = normalizeSeverity(row.severity, rawDisposition);
  const disposition = normalizeDisposition(rawDisposition, severity);
  const capabilityProjection = projectCapabilityEffects(row.capabilityEffects, effects);
  return makeFinding({
    code: String(row.code ?? 'UNCLASSIFIED_INPUTXML_DIAGNOSTIC'),
    category: validCategory(row.category) ? row.category : fallbackCategory,
    severity,
    disposition,
    capabilityEffects: capabilityProjection.ids,
    sourceFeatureIds: row.sourceFeatureIds ?? row.featureIds ?? compact([row.sourceFeatureId]),
    sourcePaths: row.sourcePaths ?? compact([row.sourcePath]),
    canonicalEntityIds: row.canonicalEntityIds ?? compact([
      row.nodeId, row.segmentId, row.componentId, row.restraintId,
    ]),
    physicalCaseIds: row.physicalCaseIds ?? [],
    message: String(row.message ?? row.description ?? row.code ?? 'InputXML diagnostic.'),
    technicalBasis: String(row.technicalBasis ?? row.reason ?? 'Existing production diagnostic authority reported this condition.'),
    evidence: findingEvidence(row, capabilityProjection.upstreamCapabilityEffects),
    remediation: String(row.remediation ?? 'Correct the identified source authority and rerun pre-FEA diagnostics.'),
    approximationEligible: row.approximationEligible === true,
    authorizationRequired: disposition === 'CONDITIONAL' || row.authorizationRequired === true,
  });
}

/**
 * Pre-FEA findings intentionally expose capabilityEffects as an ordered list of ids.
 * Model-health findings intentionally expose a richer record keyed by capability id.
 * Keep those contracts distinct: project the record to ids for readiness folding and
 * preserve the complete upstream record separately in finding evidence.
 */
function projectCapabilityEffects(value, fallback) {
  if (value === null || value === undefined) {
    return { ids: fallback, upstreamCapabilityEffects: null };
  }
  if (Array.isArray(value)) {
    return { ids: value, upstreamCapabilityEffects: null };
  }
  if (typeof value === 'object') {
    return {
      ids: Object.keys(value),
      upstreamCapabilityEffects: structuredClone(value),
    };
  }
  return { ids: [String(value)], upstreamCapabilityEffects: null };
}

function findingEvidence(row, upstreamCapabilityEffects) {
  const evidence = baseFindingEvidence(row);
  if (upstreamCapabilityEffects === null) return evidence;
  if (isEvidenceRecord(evidence)) {
    if (Object.prototype.hasOwnProperty.call(evidence, 'upstreamCapabilityEffects')) {
      throw new TypeError('InputXML pre-FEA finding evidence reserves upstreamCapabilityEffects for the model-health projection.');
    }
    return { ...structuredClone(evidence), upstreamCapabilityEffects };
  }
  return {
    upstreamEvidence: structuredClone(evidence),
    upstreamCapabilityEffects,
  };
}

function baseFindingEvidence(row) {
  if (row.evidence !== undefined && row.evidence !== null) return row.evidence;
  if (row.data !== undefined && row.data !== null) return row.data;
  if (row.details !== undefined && row.details !== null) return row.details;
  return { originalCode: row.code ?? null };
}

function isEvidenceRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSeverity(value, disposition) {
  const text = String(value ?? '').toUpperCase();
  if (['INFO', 'WARNING', 'ERROR', 'FATAL'].includes(text)) return text;
  if (disposition === 'BLOCK' || disposition === 'BLOCKED') return 'ERROR';
  if (disposition === 'WARN' || disposition === 'CONDITIONAL' || disposition === 'ADVISORY') return 'WARNING';
  return 'INFO';
}

function normalizeDisposition(value, severity) {
  if (value === 'BLOCK' || value === 'BLOCKED' || severity === 'FATAL' || severity === 'ERROR') return 'BLOCK';
  if (value === 'WARN' || value === 'CONDITIONAL') return 'CONDITIONAL';
  if (value === 'ADVISORY' || severity === 'WARNING') return 'ADVISORY';
  return 'PASS';
}

function deduplicate(rows) {
  return [...new Map(rows.map((row) => [row.findingId, row])).values()];
}

function compact(values) {
  return values.filter((value) => value !== undefined && value !== null).map(String);
}

function validCategory(value) {
  return [
    'SOURCE', 'SCHEMA', 'UNIT', 'GEOMETRY', 'TOPOLOGY', 'COMPONENT', 'MATERIAL', 'SECTION',
    'RIGID', 'RESTRAINT', 'LOAD', 'PRESSURE', 'THERMAL', 'PHYSICAL_CASE', 'CONSTRAINT',
    'MECHANISM', 'STIFFNESS', 'CONDITIONING', 'AUTHORIZATION', 'STALE_EVIDENCE', 'TAMPER',
    'UNSUPPORTED_FEATURE',
  ].includes(value);
}
