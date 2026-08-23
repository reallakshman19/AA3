import { compareAscii, failBendRetopology } from './bend-retopology-contract.js';

export function collectRetopologyBindingBlockers(input) {
  const blockers = [];
  for (const [sourceNodeId, record] of input.retiredNodeRecords) {
    if (record.nearestNodeId !== null) continue;
    const node = input.sourceNodesById.get(sourceNodeId);
    const boundKinds = boundKindsAtNode(node, sourceNodeId, input.sourceSegments);
    if (boundKinds.length === 0) continue;
    blockers.push(Object.freeze({
      code: 'BEND_RETOPOLOGY_BOUND_NODE_AMBIGUOUS',
      sourceNodeId,
      bendSegmentId: record.bendSegmentId,
      candidates: Object.freeze(record.candidates.map((row) => Object.freeze({ ...row }))),
      boundKinds: Object.freeze(boundKinds),
      reason: record.reason,
    }));
  }
  return Object.freeze(blockers.sort((left, right) => compareAscii(left.sourceNodeId, right.sourceNodeId)));
}

export function requireBendRetopologyBindingsResolved(retopology) {
  const blockers = retopology?.bindingBlockers ?? [];
  if (blockers.length === 0) return;
  const first = blockers[0];
  failBendRetopology(
    first.code,
    `Retired bend corner node ${first.sourceNodeId} carries bound engineering entities but has no qualified retained target.`,
    {
      sourceNodeId: first.sourceNodeId,
      bendSegmentId: first.bendSegmentId,
      candidates: first.candidates,
      boundKinds: first.boundKinds,
      blockerCount: blockers.length,
    },
  );
}

export function retargetBoundSegmentEvidence(segment, retiredNodeRecords) {
  const records = segment.meta?.analysis?.forcesMoments;
  if (!Array.isArray(records) || records.length === 0) return segment;
  let changed = false;
  const forcesMoments = records.map((record) => {
    const sourceNodeId = explicitForceMomentNodeId(record, segment);
    if (sourceNodeId === null) return record;
    const target = retiredNodeRecords.get(sourceNodeId) ?? null;
    if (target === null || target.nearestNodeId === null) return record;
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
      const target = explicitForceMomentNodeId(record, segment);
      if (target === sourceNodeId) kinds.push(forceMomentBindingKind(record));
    }
  }
  return [...new Set(kinds)].sort(compareAscii);
}

function explicitForceMomentNodeId(record, segment) {
  if (record?.nodeId !== null && record?.nodeId !== undefined) return String(record.nodeId);
  // ACCDB stores FORCMNT_PTR on the element and vectors in INPUT_FORCMNT.
  // The paired CAESAR InputXML supplied for BM4 places the corresponding
  // FORCESMOMENTS declaration at that element's TO node (for example working
  // points 20120, 20330 and 20340). This establishes the target sufficiently
  // to BLOCK a retired-node migration; it does not authorize moving the load.
  if (record?.forceMomentNumber !== null && record?.forceMomentNumber !== undefined
    && segment?.meta?.sourceElementId !== null && segment?.meta?.sourceElementId !== undefined) {
    return String(segment.endNodeId);
  }
  return null;
}

function forceMomentBindingKind(record) {
  return record?.nodeId !== null && record?.nodeId !== undefined
    ? 'APPLIED_FORCE_MOMENT'
    : 'APPLIED_FORCE_MOMENT_ACCDB_TO_NODE_PAIRED_EXPORT';
}
