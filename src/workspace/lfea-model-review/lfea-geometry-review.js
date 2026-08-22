export const LFEA_GEOMETRY_REVIEW_SCHEMA = 'lfea-geometry-review/v1';
export const LFEA_GEOMETRY_REVIEW_REPRESENTATIONS = Object.freeze(['SOURCE', 'ANALYSIS']);

const EMPTY = Object.freeze([]);

export function buildLfeaGeometryReview(preFlight, engineeringState, representation = 'SOURCE') {
  const selected = requireRepresentation(representation);
  const sourceKind = String(engineeringState?.source?.kind ?? 'UNKNOWN');
  const sourceBundle = preFlight?.diagnostics?.sourceBundle ?? null;
  const sourceGeometry = sourceBundle?.geometry ?? null;
  const structural = preFlight?.preparation?.structuralPreparation ?? null;
  const analysisGeometry = structural?.conditionedTopology?.geometry ?? null;

  const source = geometryDescriptor({
    representation: 'SOURCE',
    sourceKind,
    geometry: sourceKind === 'STAGED_JSON' ? null : sourceGeometry,
    semanticHash: preFlight?.diagnostics?.sourceAuthority?.sourceBundleSemanticHash ?? null,
    evidenceHash: preFlight?.diagnostics?.sourceAuthority?.sourceBundleEvidenceHash ?? null,
    label: 'Imported / source-derived',
    objectPath: 'preFlight.diagnostics.sourceBundle.geometry',
    authority: sourceKind === 'ACCDB'
      ? 'ACCDB importer canonical geometry'
      : sourceKind === 'INPUTXML'
        ? 'InputXML importer canonical geometry'
        : 'Imported/source-derived canonical geometry',
    unavailableReason: sourceKind === 'STAGED_JSON'
      ? 'Original StagedJSON geometry is not retained as a renderable governed geometry object. The derived InputXML geometry is not substituted for the original source.'
      : sourceGeometry === null
        ? 'No governed imported/source-derived geometry is available.'
        : null,
  });
  const analysis = geometryDescriptor({
    representation: 'ANALYSIS',
    sourceKind,
    geometry: analysisGeometry,
    semanticHash: structural?.semanticHash ?? null,
    evidenceHash: structural?.evidenceHash ?? null,
    label: 'Analysis representation',
    objectPath: 'preFlight.preparation.structuralPreparation.conditionedTopology.geometry',
    authority: 'Conditioned structural geometry used by the compiled analysis model',
    unavailableReason: analysisGeometry === null
      ? 'No conditioned analysis geometry is available.'
      : null,
  });

  const descriptors = Object.freeze({ SOURCE: source, ANALYSIS: analysis });
  return Object.freeze({
    schema: LFEA_GEOMETRY_REVIEW_SCHEMA,
    selectedRepresentation: selected,
    sourceKind,
    selected: descriptors[selected],
    representations: descriptors,
    preFlightSemanticHash: preFlight?.semanticHash ?? null,
    sessionRevision: engineeringState?.revision ?? null,
    readOnly: true,
  });
}

function geometryDescriptor({
  representation,
  sourceKind,
  geometry,
  semanticHash,
  evidenceHash,
  label,
  objectPath,
  authority,
  unavailableReason,
}) {
  if (geometry === null) {
    return Object.freeze({
      representation,
      sourceKind,
      available: false,
      label,
      objectPath,
      authority,
      semanticHash,
      evidenceHash,
      unit: null,
      nodes: EMPTY,
      segments: EMPTY,
      unavailableReason,
    });
  }
  if (!Array.isArray(geometry.nodes) || !Array.isArray(geometry.segments)) {
    throw new TypeError(`LFEA ${representation} geometry must contain nodes and segments.`);
  }
  const nodes = Object.freeze(geometry.nodes.map((node) => Object.freeze({
    nodeId: String(node.id),
    x: finite(node.x, 'x', node.id),
    y: finite(node.y, 'y', node.id),
    z: finite(node.z ?? 0, 'z', node.id),
  })));
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  const segments = Object.freeze(geometry.segments.map((segment) => {
    const startNodeId = String(segment.startNodeId);
    const endNodeId = String(segment.endNodeId);
    if (!nodeIds.has(startNodeId) || !nodeIds.has(endNodeId)) {
      throw new TypeError(`LFEA ${representation} segment ${String(segment.id)} references a missing node.`);
    }
    return Object.freeze({
      segmentId: String(segment.id),
      startNodeId,
      endNodeId,
      type: String(segment.type ?? 'UNKNOWN'),
      sourceFeatureId: String(segment.sourceComponentUid ?? ''),
      declaredApproximation: segment.meta?.analysisApproximation ?? null,
      sourceType: segment.meta?.inputXmlSourceType ?? null,
    });
  }));
  return Object.freeze({
    representation,
    sourceKind,
    available: true,
    label,
    objectPath,
    authority,
    semanticHash,
    evidenceHash,
    unit: geometry.unit ?? null,
    nodes,
    segments,
    unavailableReason: null,
  });
}

function requireRepresentation(value) {
  const representation = String(value ?? '').trim().toUpperCase();
  if (!LFEA_GEOMETRY_REVIEW_REPRESENTATIONS.includes(representation)) {
    throw new TypeError(`Unknown LFEA geometry representation ${String(value)}.`);
  }
  return representation;
}

function finite(value, axis, nodeId) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`LFEA geometry node ${String(nodeId)} ${axis} is not finite.`);
  }
  return value;
}
