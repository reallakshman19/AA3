import { compareAscii, failBendRetopology } from './bend-retopology-contract.js';

export function requireRetiredNodeBindingsResolvable(input) {
  for (const [sourceNodeId, record] of input.retiredNodeRecords) {
    if (record.nearestNodeId !== null) continue;
    const node = input.sourceNodesById.get(sourceNodeId);
    const boundKinds = boundKindsAtNode(node, sourceNodeId, input.sourceSegments);
    if (boundKinds.length === 0) continue;
    failBendRetopology(
      'BEND_RETOPOLOGY_BOUND_NODE_AMBIGUOUS',
      `Retired bend corner node ${sourceNodeId} carries bound engineering entities but has no unique retained target.`,
      {
        sourceNodeId,
        bendSegmentId: record.bendSegmentId,
        candidates: record.candidates,
        boundKinds,
      },
    );
  }
}

export function retargetBoundSegmentEvidence(segment, retiredNodeRecords) {
  const records = segment.meta?.analysis?.forcesMoments;
  if (!Array.isArray(records) || records.length === 0) return segment;
  let changed = false;
  const forcesMoments = records.map((record) => {
    if (record?.nodeId === null || record?.nodeId === undefined) return record;
    const sourceNodeId = String(record.nodeId);
    const target = retiredNodeRecords.get(sourceNodeId) ?? null;
    if (target === null) return record;
    if (target.nearestNodeId === null) {
      failBendRetopology(
        'BEND_RETOPOLOGY_BOUND_NODE_AMBIGUOUS',
        `Applied force/moment at retired bend corner node ${sourceNodeId} has no unique retained target.`,
        { sourceNodeId, bendSegmentId: target.bendSegmentId, candidates: target.candidates },
      );
    }
    changed = true;
    return Object.freeze({
      ...record,
      nodeId: String(target.nearestNodeId),
      retopologySourceNodeId: sourceNodeId,
    });
  });
  if (!changed) return segment;
  return Object.freeze({
    ...segment,
    meta: Object.freeze({
      ...segment.meta,
      analysis: Object.freeze({ ...segment.meta.analysis, forcesMoments: Object.freeze(forcesMoments) }),
    }),
  });
}

export function segmentMeta(source, extra, preserveBoundEvidence) {
  const meta = { ...(source.meta ?? {}), ...extra };
  if (meta.analysis && typeof meta.analysis === 'object') {
    const analysis = { ...meta.analysis };
    if (!preserveBoundEvidence) delete analysis.forcesMoments;
    meta.analysis = Object.freeze(analysis);
  }
  return Object.freeze(meta);
}

export function freezeNodeRetargeting(record) {
  return Object.freeze({
    sourceNodeId: record.sourceNodeId,
    bendSegmentId: record.bendSegmentId,
    candidates: Object.freeze(record.candidates.map((row) => Object.freeze({ ...row }))),
    nearestNodeId: record.nearestNodeId,
    codeStationNodeId: record.codeStationNodeId,
    reason: record.reason,
  });
}

function boundKindsAtNode(node, sourceNodeId, sourceSegments) {
  const kinds = [];
  if (node) {
    if (String(node.restraint ?? 'FREE') !== 'FREE') kinds.push('CANONICAL_RESTRAINT_CLASS');
    if (Array.isArray(node.meta?.restraints) && node.meta.restraints.length > 0) kinds.push('RESTRAINT');
    if (Array.isArray(node.meta?.attachmentPoints) && node.meta.attachmentPoints.length > 0) kinds.push('ATTACHMENT_POINT');
  }
  for (const segment of sourceSegments) {
    for (const record of segment.meta?.analysis?.forcesMoments ?? []) {
      if (record?.nodeId != null && String(record.nodeId) === String(sourceNodeId)) {
        kinds.push('APPLIED_FORCE_MOMENT');
      }
    }
  }
  return [...new Set(kinds)].sort(compareAscii);
}
