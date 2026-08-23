import { InputXmlLinearStructuralPreparationError } from './inputxml-linear-structural-profile.js';

export function projectInputXmlAnalyticalGeometry(prepared) {
  const bindingBySegment = new Map(prepared.segmentBindings
    .map((row) => [String(row.segmentId), row]));
  const segments = prepared.normalizedGeometry.segments.map((segment) => {
    const binding = bindingBySegment.get(String(segment.id)) ?? null;
    if (binding?.limitationCode !== 'GENERIC_APPROX_BEND_STRAIGHT_CHORD') return segment;
    const tangentBasis = String(segment.meta?.bendTangentBasis ?? '');
    if (tangentBasis === 'ACCDB_CORNER_INTERSECTION_V1'
      || tangentBasis === 'INPUTXML_TANGENT_TO_TANGENT_V1') {
      return segment;
    }
    return Object.freeze({
      ...segment,
      type: 'PIPE',
      meta: Object.freeze({
        ...(segment.meta ?? {}),
        inputXmlSourceType: segment.type,
        analysisApproximation: 'GENERIC_APPROX_BEND_STRAIGHT_CHORD',
      }),
    });
  });
  return Object.freeze({
    ...prepared.normalizedGeometry,
    nodes: prepared.normalizedGeometry.nodes,
    segments: Object.freeze(segments),
  });
}

export function requireExplainedConditioning(sourceGeometry, conditionedGeometry, spanOrigin) {
  const sourceIds = new Set(sourceGeometry.segments.map((row) => String(row.id)));
  const covered = new Set();
  const unexplained = [];
  for (const segment of conditionedGeometry.segments) {
    const origin = resolveOriginId(segment, sourceIds, spanOrigin);
    if (origin === null) unexplained.push(String(segment.id));
    else covered.add(origin);
  }
  const uncovered = [...sourceIds].filter((id) => !covered.has(id)).sort(compareAscii);
  if (unexplained.length > 0 || uncovered.length > 0) {
    fail(
      'INPUTXML_STRUCTURAL_CONDITIONING_CHANGED_SPAN_CUSTODY',
      'Every conditioned span must trace to exactly one retained source segment.',
      { unexplained: unexplained.sort(compareAscii), uncovered },
    );
  }
}

export function resolveSourceSegmentId(segment, sourceSegmentById, spanOrigin) {
  const origin = resolveOriginId(segment, new Set(sourceSegmentById.keys()), spanOrigin);
  if (origin === null) {
    fail(
      'INPUTXML_STRUCTURAL_SEGMENT_AUTHORITY_MISSING',
      `Conditioned segment ${String(segment.id)} has no source-segment origin.`,
      { segmentId: String(segment.id) },
    );
  }
  return origin;
}

export function structuralElementId(modelId, sourceIndex, segmentId, sourceSegmentId) {
  const base = `${modelId}.E${sourceIndex + 1}`;
  if (segmentId === sourceSegmentId) return base;
  const prefix = `${sourceSegmentId}/`;
  const suffix = segmentId.startsWith(prefix) ? segmentId.slice(prefix.length) : segmentId;
  return `${base}.${safeIdentifier(suffix)}`;
}

function resolveOriginId(segment, sourceIds, spanOrigin) {
  const id = String(segment.id);
  if (sourceIds.has(id)) return id;
  if (spanOrigin[id] && sourceIds.has(String(spanOrigin[id]))) return String(spanOrigin[id]);
  const parent = segment.meta?.parentSegmentId == null ? null : String(segment.meta.parentSegmentId);
  if (parent === null) return null;
  if (sourceIds.has(parent)) return parent;
  if (spanOrigin[parent] && sourceIds.has(String(spanOrigin[parent]))) return String(spanOrigin[parent]);
  return null;
}

function fail(code, message, data) {
  throw new InputXmlLinearStructuralPreparationError(message, code, data);
}

function safeIdentifier(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]/gu, '-');
}

function compareAscii(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}
