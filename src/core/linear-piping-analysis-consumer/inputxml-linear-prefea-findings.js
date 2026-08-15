import { makeFinding } from './inputxml-linear-prefea-contract.js';
import {
  requestedProfileFamily, capabilityAppliesToRequest, scopedDisposition, severityForScopedDisposition,
} from './inputxml-linear-prefea-profile-scope.js';

export function collectFindings({
  sourceBundle,
  topology,
  proximity,
  representability,
  engineeringSanity,
  requestedProfileId,
}) {
  const requestedFamily = requestedProfileFamily(requestedProfileId);
  const rows = [];
  for (const diagnostic of sourceBundle.geometry?.diagnostics ?? []) {
    rows.push(normalizeFinding(diagnostic, 'GEOMETRY', ['CANONICAL_GEOMETRY'], requestedFamily));
  }
  appendReportFindings(rows, topology, 'TOPOLOGY', ['STRUCTURAL_GRAPH'], requestedFamily);
  appendReportFindings(rows, proximity, 'GEOMETRY', ['STRUCTURAL_GRAPH'], requestedFamily);
  // diagnoseInputXmlLinearModelHealth (representability) folds the SAME
  // topology-graph and topology-proximity findings into its own findings list
  // (as category TOPOLOGY_GRAPH / TOPOLOGY_PROXIMITY) so it can fold their
  // effect into the TOPOLOGY_ACCEPTANCE capability status — that fold already
  // happened before this function ever saw representability.capabilities, so
  // excluding them here changes nothing about capability status. What it does
  // change: without this filter, every topology/proximity defect (a collinear
  // overlap, a near-coincident node) was reported twice — once here under its
  // correct TOPOLOGY/GEOMETRY category from the direct topology/proximity
  // appends above, and again relabeled COMPONENT (TOPOLOGY_GRAPH/
  // TOPOLOGY_PROXIMITY fail validCategory and fall back to the representability
  // call's fallbackCategory) with a different findingId, so deduplicate()
  // couldn't merge them. On BM4 this doubled every topology finding (7 became
  // 14) and inflated the BLOCK count and Pre-flight noise to match.
  const representabilityFindings = (representability.findings ?? [])
    .filter((row) => row.category !== 'TOPOLOGY_GRAPH' && row.category !== 'TOPOLOGY_PROXIMITY');
  appendReportFindings(rows, { findings: representabilityFindings }, 'COMPONENT', ['LINEAR_STRUCTURAL_MODEL'], requestedFamily);
  appendReportFindings(rows, engineeringSanity, 'SCHEMA', ['LINEAR_STRUCTURAL_MODEL'], requestedFamily);
  for (const capability of representability.capabilities ?? []) {
    if (!capabilityAppliesToRequest(capability.capabilityId, requestedFamily)) continue;
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

function appendReportFindings(target, report, fallbackCategory, effects, requestedFamily) {
  for (const row of report?.findings ?? report?.diagnostics ?? []) {
    target.push(normalizeFinding(row, fallbackCategory, effects, requestedFamily));
  }
}

function normalizeFinding(row, fallbackCategory, effects, requestedFamily) {
  const capabilityProjection = projectCapabilityEffects(row.capabilityEffects, effects);
  const scoped = scopedDisposition(capabilityProjection.upstreamCapabilityEffects, requestedFamily ?? null);
  const rawDisposition = String(row.disposition ?? row.status ?? '').toUpperCase();
  const severity = scoped !== null ? severityForScopedDisposition(scoped) : normalizeSeverity(row.severity, rawDisposition);
  const disposition = scoped !== null ? scoped : normalizeDisposition(rawDisposition, severity);
  return makeFinding({
    code: String(row.code ?? 'UNCLASSIFIED_INPUTXML_DIAGNOSTIC'),
    category: validCategory(row.category) ? row.category : fallbackCategory,
    severity,
    disposition,
    capabilityEffects: capabilityProjection.ids,
    sourceFeatureIds: row.sourceFeatureIds ?? row.featureIds ?? compact([row.sourceFeatureId]),
    sourcePaths: row.sourcePaths ?? compact([row.sourcePath]),
    canonicalEntityIds: row.canonicalEntityIds ?? entityIdsFromRow(row),
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
 * Three upstream authorities publish three deliberate shapes, and all three reach
 * this normalizer:
 *
 *   model-health   Record<capabilityId, {disposition, limitationCode}>
 *   topology and   Array<{capabilityId, effect}>
 *     proximity
 *   pre-FEA        Array<capabilityId>
 *
 * Keep those contracts distinct: project each to ids for readiness folding and
 * preserve the richer upstream form separately in finding evidence.
 *
 * The object-array shape previously fell through the bare Array branch, so a
 * topology or proximity finding reached makeFinding carrying objects. uniqueAscii
 * stringifies its input, so capabilityEffects became ["[object Object]"] — the
 * affected capability was destroyed, and because capabilityEffects is part of the
 * finding identity, that value fed findingId and the sealed semantic hash.
 */
function projectCapabilityEffects(value, fallback) {
  if (value === null || value === undefined) {
    return { ids: fallback, upstreamCapabilityEffects: null };
  }
  if (Array.isArray(value)) {
    if (!value.some(isCapabilityEffectRecord)) {
      return { ids: value, upstreamCapabilityEffects: null };
    }
    return {
      ids: value.map((row) => (isCapabilityEffectRecord(row) ? row.capabilityId : row)),
      upstreamCapabilityEffects: structuredClone(value),
    };
  }
  if (typeof value === 'object') {
    return {
      ids: Object.keys(value),
      upstreamCapabilityEffects: structuredClone(value),
    };
  }
  return { ids: [String(value)], upstreamCapabilityEffects: null };
}

/**
 * Topology and proximity findings carry the entities they implicate under an
 * `entities` record (nodeIds, segmentIds, componentIds, restraintIds) rather than
 * the scalar fields the other authorities use. Without this, every such finding
 * reached the pre-FEA contract with an empty canonicalEntityIds, so the summary's
 * affected-entity counts under-reported topology damage to zero.
 */
function entityIdsFromRow(row) {
  const scalars = compact([row.nodeId, row.segmentId, row.componentId, row.restraintId]);
  const entities = row.entities;
  if (entities === null || typeof entities !== 'object' || Array.isArray(entities)) return scalars;
  const collected = [...scalars];
  for (const value of Object.values(entities)) {
    if (Array.isArray(value)) collected.push(...compact(value));
    else if (value !== null && value !== undefined && typeof value !== 'object') collected.push(String(value));
  }
  return collected;
}

function isCapabilityEffectRecord(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && typeof value.capabilityId === 'string';
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
