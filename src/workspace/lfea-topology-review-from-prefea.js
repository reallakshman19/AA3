import { requireLinearPipingInputXmlPreFlight } from './linear-piping-inputxml-prefea.js';
import {
  LFEA_TOPOLOGY_REVIEW_KIND,
  createLfeaTopologyReviewModel,
} from './lfea-topology-review-model.js';

export const LFEA_TOPOLOGY_REVIEW_PREFEA_PROJECTION_SCHEMA = 'lfea-topology-review-prefea-projection/v1';

const NODE_REVIEW_CODES = new Set([
  'TOPOLOGY_NODE_ID_DUPLICATE',
  'TOPOLOGY_PROXIMITY_NODE_ID_AMBIGUOUS',
  'TOPOLOGY_DISTINCT_NODES_EXACTLY_COINCIDENT',
  'TOPOLOGY_DISTINCT_NODES_NUMERIC_COINCIDENCE',
  'TOPOLOGY_DISTINCT_NODES_NEAR_COINCIDENT',
]);

const SEGMENT_OVERLAP_CODES = new Set([
  'TOPOLOGY_EXACT_DUPLICATE_SEGMENTS',
  'TOPOLOGY_NUMERIC_DUPLICATE_SEGMENTS',
  'TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP',
  'TOPOLOGY_SEGMENT_NEAR_MISS',
]);

/**
 * Project the already-sealed native InputXML pre-FEA topology/proximity evidence
 * into the read-only P-02 review model. This function never reparses source
 * bytes, reruns a detector, or creates topology mutation authority.
 */
export function createLfeaTopologyReviewFromPreFlight(preFlight) {
  const accepted = requireLinearPipingInputXmlPreFlight(preFlight);
  return createLfeaTopologyReviewFromDiagnostics(accepted.diagnostics);
}

/**
 * Projection seam kept separate for deterministic qualification of retained
 * diagnostic records. The parent native pre-flight entry point above remains
 * the normal product path.
 */
export function createLfeaTopologyReviewFromDiagnostics(diagnostics) {
  requireRecord(diagnostics, 'diagnostics');
  requireRecord(diagnostics.sourceAuthority, 'diagnostics.sourceAuthority');
  const topology = requireDiagnosticRecord(diagnostics.topologyDiagnostics, 'topologyDiagnostics');
  const proximity = requireDiagnosticRecord(diagnostics.proximityDiagnostics, 'proximityDiagnostics');
  const sourceBundleSemanticHash = requireHash(
    diagnostics.sourceAuthority.sourceBundleSemanticHash,
    'sourceBundleSemanticHash',
  );
  const sourceBundleEvidenceHash = requireHash(
    diagnostics.sourceAuthority.sourceBundleEvidenceHash,
    'sourceBundleEvidenceHash',
  );
  assertDiagnosticParent(topology, sourceBundleSemanticHash, sourceBundleEvidenceHash, 'topologyDiagnostics');
  assertDiagnosticParent(proximity, sourceBundleSemanticHash, sourceBundleEvidenceHash, 'proximityDiagnostics');

  const findings = [
    ...(topology.findings ?? []).map((finding) => projectFinding({
      finding,
      diagnostic: topology,
      origin: 'TOPOLOGY',
    })),
    ...(proximity.findings ?? []).map((finding) => projectFinding({
      finding,
      diagnostic: proximity,
      origin: 'PROXIMITY',
    })),
  ];

  return createLfeaTopologyReviewModel({
    sourceAuthority: {
      sourceSemanticHash: sourceBundleSemanticHash,
      sourceEvidenceHash: sourceBundleEvidenceHash,
      diagnosticsSemanticHash: requireHash(diagnostics.semanticHash, 'diagnostics.semanticHash'),
      diagnosticsEvidenceHash: requireHash(diagnostics.evidenceHash, 'diagnostics.evidenceHash'),
    },
    findings,
  });
}

function projectFinding({ finding, diagnostic, origin }) {
  requireRecord(finding, `${origin.toLowerCase()}Finding`);
  const findingId = requireText(finding.findingId, 'findingId');
  const code = requireText(finding.code, 'code').toUpperCase();
  const effect = diagnosticEffect(finding);
  const geometryUnit = normalizeGeometryUnit(diagnostic.geometryUnit);
  const measurement = measurementInMetres(finding, geometryUnit);
  const sourceEntityIds = sourceIdentities(finding);
  const diagnosticPath = `/diagnostics/${origin.toLowerCase()}/${encodeURIComponent(findingId)}`;
  const diagnosticSemanticHash = requireHash(diagnostic.semanticHash, `${origin}.semanticHash`);
  const diagnosticEvidenceHash = requireHash(diagnostic.evidenceHash, `${origin}.evidenceHash`);

  return Object.freeze({
    findingId,
    kind: reviewKind(origin, code),
    severity: String(finding.severity ?? (effect === 'BLOCK' ? 'ERROR' : 'WARNING')).toUpperCase(),
    disposition: effect === 'BLOCK' ? 'UNRESOLVED' : 'INFORMATIONAL',
    sourceEntityIds,
    sourcePaths: Object.freeze([diagnosticPath]),
    distanceM: measurement?.distanceM ?? null,
    toleranceM: measurement?.toleranceM ?? null,
    message: requireText(finding.message, 'message'),
    technicalBasis: [
      `Retained ${origin.toLowerCase()} diagnostic ${code}.`,
      `Upstream effect: ${effect}.`,
      finding.remediation ? `Upstream remediation: ${String(finding.remediation)}` : null,
      'Review projection is evidence-only and applies no topology mutation.',
    ].filter(Boolean).join(' '),
    evidence: {
      schema: LFEA_TOPOLOGY_REVIEW_PREFEA_PROJECTION_SCHEMA,
      origin,
      upstreamFindingId: findingId,
      upstreamCode: code,
      upstreamEffect: effect,
      upstreamEntities: freezeClone(finding.entities ?? {}),
      upstreamEvidence: freezeClone(finding.evidence ?? {}),
      upstreamRemediation: finding.remediation ?? null,
      diagnosticSemanticHash,
      diagnosticEvidenceHash,
      sourceBundleSemanticHash: diagnostic.sourceBundleSemanticHash,
      sourceBundleEvidenceHash: diagnostic.sourceBundleEvidenceHash,
      geometryUnit: geometryUnit ?? null,
      measurementBasis: measurement?.basis ?? null,
      mutationApplied: false,
      detectorRerun: false,
    },
  });
}

function reviewKind(origin, code) {
  if (NODE_REVIEW_CODES.has(code)) return LFEA_TOPOLOGY_REVIEW_KIND.POSSIBLE_DUPLICATE_NODE;
  if (SEGMENT_OVERLAP_CODES.has(code)) return LFEA_TOPOLOGY_REVIEW_KIND.OVERLAP_CANDIDATE;
  if (origin === 'PROXIMITY' && code.includes('SUPPORT')) {
    return LFEA_TOPOLOGY_REVIEW_KIND.COINCIDENT_SUPPORT;
  }
  return LFEA_TOPOLOGY_REVIEW_KIND.UNRESOLVED_CONNECTIVITY;
}

function diagnosticEffect(finding) {
  const explicit = String(finding.effect ?? '').trim().toUpperCase();
  if (['BLOCK', 'ADVISORY', 'PASS'].includes(explicit)) return explicit;
  const effects = Array.isArray(finding.capabilityEffects) ? finding.capabilityEffects : [];
  if (effects.some((row) => String(row?.effect ?? '').toUpperCase() === 'BLOCK')) return 'BLOCK';
  if (effects.some((row) => String(row?.effect ?? '').toUpperCase() === 'ADVISORY')) return 'ADVISORY';
  return 'ADVISORY';
}

function sourceIdentities(finding) {
  const entities = finding.entities && typeof finding.entities === 'object' ? finding.entities : {};
  const ids = [];
  for (const key of ['nodeIds', 'segmentIds', 'sourceFeatureIds', 'componentIds']) {
    if (Array.isArray(entities[key])) ids.push(...entities[key]);
  }
  if (ids.length === 0 && Number.isSafeInteger(finding.evidence?.nodeOrdinal)) {
    ids.push(`NODE_ORDINAL:${finding.evidence.nodeOrdinal}`);
  }
  if (ids.length === 0 && Number.isSafeInteger(finding.evidence?.segmentOrdinal)) {
    ids.push(`SEGMENT_ORDINAL:${finding.evidence.segmentOrdinal}`);
  }
  if (ids.length === 0) ids.push('MODEL');
  return Object.freeze([...new Set(ids.map((value) => requireText(value, 'sourceEntityId')))].sort(compareAscii));
}

function measurementInMetres(finding, geometryUnit) {
  const evidence = finding.evidence ?? {};
  const nested = evidence?.evidence && typeof evidence.evidence === 'object' ? evidence.evidence : null;
  let distance = null;
  let tolerance = null;
  let basis = null;

  if (finiteNonnegative(evidence.residualNorm) && finiteNonnegative(evidence.acceptanceTolerance)) {
    distance = evidence.residualNorm;
    tolerance = evidence.acceptanceTolerance;
    basis = 'COORDINATE_CLOSURE_RESIDUAL';
  } else if (finiteNonnegative(evidence.separation)) {
    distance = evidence.separation;
    const classification = String(evidence.classification ?? '').toUpperCase();
    tolerance = classification === 'NEAR_COINCIDENT'
      ? evidence.nearTolerance
      : evidence.coincidenceTolerance;
    basis = 'NODE_PROXIMITY_SEPARATION';
  } else if (finiteNonnegative(nested?.distance)) {
    distance = nested.distance;
    const classification = String(evidence.classification ?? '').toUpperCase();
    tolerance = classification === 'NEAR_MISS' ? nested.nearTolerance : nested.hitTolerance;
    basis = 'SEGMENT_PAIR_DISTANCE';
  } else if (finiteNonnegative(evidence.length) && finiteNonnegative(evidence.hitTolerance)) {
    distance = evidence.length;
    tolerance = evidence.hitTolerance;
    basis = 'DEGENERATE_SEGMENT_LENGTH';
  }

  if (distance === null && tolerance === null) return null;
  if (!finiteNonnegative(distance) || !finiteNonnegative(tolerance)) {
    throw projectionError(
      'E_P02_DIAGNOSTIC_MEASUREMENT_INCOMPLETE',
      `Topology diagnostic ${finding.findingId ?? '(unknown)'} has an incomplete distance/tolerance pair.`,
    );
  }
  const factor = metreFactor(geometryUnit);
  return Object.freeze({
    distanceM: canonicalNumber(distance * factor),
    toleranceM: canonicalNumber(tolerance * factor),
    basis,
  });
}

function metreFactor(unit) {
  if (unit === 'm') return 1;
  if (unit === 'mm') return 0.001;
  if (unit === 'in') return 0.0254;
  throw projectionError(
    'E_P02_GEOMETRY_UNIT_UNSUPPORTED',
    `Topology diagnostic distance cannot be projected to metres from geometry unit ${unit ?? '(missing)'}.`,
  );
}

function normalizeGeometryUnit(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const unit = String(value).trim().toLowerCase();
  if (unit === 'millimeter' || unit === 'millimetre' || unit === 'millimeters' || unit === 'millimetres') return 'mm';
  if (unit === 'inch' || unit === 'inches') return 'in';
  if (unit === 'meter' || unit === 'metre' || unit === 'meters' || unit === 'metres') return 'm';
  return unit;
}

function assertDiagnosticParent(record, semanticHash, evidenceHash, field) {
  if (record.sourceBundleSemanticHash !== semanticHash || record.sourceBundleEvidenceHash !== evidenceHash) {
    throw projectionError(
      'E_P02_DIAGNOSTIC_PARENT_STALE',
      `${field} no longer matches the retained pre-FEA source-bundle authority.`,
    );
  }
}

function requireDiagnosticRecord(value, field) {
  requireRecord(value, field);
  requireHash(value.semanticHash, `${field}.semanticHash`);
  requireHash(value.evidenceHash, `${field}.evidenceHash`);
  requireHash(value.sourceBundleSemanticHash, `${field}.sourceBundleSemanticHash`);
  requireHash(value.sourceBundleEvidenceHash, `${field}.sourceBundleEvidenceHash`);
  if (!Array.isArray(value.findings)) {
    throw projectionError('E_P02_DIAGNOSTIC_FINDINGS_REQUIRED', `${field}.findings must be an array.`);
  }
  return value;
}

function requireHash(value, field) {
  const text = requireText(value, field);
  if (!/^(?:fnv1a64|sha256):[0-9a-z]+$/u.test(text)) {
    throw projectionError('E_P02_HASH_INVALID', `${field} must be an explicit semantic/evidence hash.`);
  }
  return text;
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw projectionError('E_P02_RECORD_REQUIRED', `${field} must be a record.`);
  }
}

function requireText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw projectionError('E_P02_FIELD_REQUIRED', `${field} must be a non-empty string.`);
  return text;
}

function finiteNonnegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function canonicalNumber(value) {
  if (!Number.isFinite(value)) throw projectionError('E_P02_DISTANCE_INVALID', 'Converted topology distance must be finite.');
  return Object.is(value, -0) ? 0 : value;
}

function freezeClone(value) {
  const clone = structuredClone(value);
  freezeRecursive(clone);
  return clone;
}

function freezeRecursive(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  if (Array.isArray(value)) value.forEach(freezeRecursive);
  else Object.values(value).forEach(freezeRecursive);
  return Object.freeze(value);
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function projectionError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_TOPOLOGY_REVIEW_PREFEA_PROJECTION';
  return error;
}
