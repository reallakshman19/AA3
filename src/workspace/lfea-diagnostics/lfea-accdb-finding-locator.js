/** Exact ACCDB provenance projection; never infer a source edit from proximity. */
export const LFEA_ACCDB_FINDING_LOCATOR_SCHEMA = 'lfea-accdb-finding-locator/v1';

export function resolveLfeaAccdbFindingTargets(finding, sourceBundle, descriptor) {
  const records = Array.isArray(sourceBundle?.elementRecords) ? sourceBundle.elementRecords : [];
  const nodes = Array.isArray(descriptor?.nodes) ? descriptor.nodes : [];
  const segments = Array.isArray(descriptor?.segments) ? descriptor.segments : [];
  const features = new Set(finding?.sourceFeatureIds ?? []);
  const entities = new Set(finding?.canonicalEntityIds ?? []);
  const sourceIds = new Set();
  const exactNodeIds = new Set();
  for (const record of records) {
    const identities = [record.sourceFeatureId, record.canonicalSegmentId,
      'ACCDB-SOURCE-E' + record.accdbElementId];
    if (identities.some((id) => id && (features.has(id) || entities.has(id)))) {
      sourceIds.add('ACCDB-SOURCE-E' + record.accdbElementId);
    }
  }
  for (const node of nodes) {
    if (entities.has(node.nodeId) || features.has(node.nodeId)) {
      exactNodeIds.add(node.nodeId);
    }
  }
  const segmentIds = new Set();
  for (const segment of segments) {
    if (sourceIds.has(segment.sourceFeatureId)
      || features.has(segment.sourceFeatureId)
      || entities.has(segment.segmentId)) {
      segmentIds.add(segment.segmentId);
    }
  }
  // A PIPINGELEMENT identity may resolve the element record but not its
  // conditioned/discretized analysis segment. Do not invent a correspondence.
  const resolvedSource = sourceIds.size > 0 || exactNodeIds.size > 0;
  return Object.freeze({
    schema: LFEA_ACCDB_FINDING_LOCATOR_SCHEMA,
    findingId: String(finding?.findingId ?? ''),
    segmentIds: Object.freeze([...segmentIds].sort()),
    nodeIds: Object.freeze([...exactNodeIds].sort()),
    sourceComponentUids: Object.freeze([...sourceIds].sort()),
    resolvedSource, visibleTargetCount: segmentIds.size + exactNodeIds.size,
    targetStatus: !resolvedSource ? 'UNRESOLVED_PROVENANCE'
      : segmentIds.size + exactNodeIds.size ? 'EXACT' : 'SOURCE_ONLY_NOT_IN_REPRESENTATION',
  });
}

export function sourceElementForSegment(segment, sourceBundle) {
  const uid = String(segment?.sourceFeatureId ?? '');
  return (sourceBundle?.elementRecords ?? []).find((row) =>
    'ACCDB-SOURCE-E' + row.accdbElementId === uid || row.canonicalSegmentId === segment?.segmentId) ?? null;
}

export function findingsForAccdbSelection(findings, sourceBundle, descriptor, selection) {
  if (!selection) return Object.freeze([]);
  return Object.freeze((findings ?? []).filter((finding) => {
    const targets = resolveLfeaAccdbFindingTargets(finding, sourceBundle, descriptor);
    return selection.kind === 'NODE'
      ? targets.nodeIds.includes(selection.id)
      : targets.segmentIds.includes(selection.id);
  }));
}
