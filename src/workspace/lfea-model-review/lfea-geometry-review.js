import { restraintTypeCodeLabel } from '../../core/geometry/adapters/inputxml-restraint-type-mutation.js';

export const LFEA_GEOMETRY_REVIEW_SCHEMA = 'lfea-geometry-review/v1';
export const LFEA_GEOMETRY_REVIEW_REPRESENTATIONS = Object.freeze(['SOURCE', 'ANALYSIS']);

const EMPTY = Object.freeze([]);

const ANCHOR_RESTRAINT_LABELS = Object.freeze(new Set(['ANC', 'ANCHOR', 'A', 'FIXED', 'FIX']));

/**
 * CAESAR's restraint labels carry their action sense in the label itself, not
 * in the direction cosines. The cosines give only the line of action -- the
 * axis a restraint works along -- which is the same for a double-acting `Y`
 * and a one-way `+Y`. The sign prefix is what says whether the restraint
 * resists movement along that axis in both senses or only one:
 *
 *   Y / X / Z / GUI / LIM   double-acting: resists both senses of the axis
 *   +Y                      one-way: acts in +Y, so it stops the pipe moving
 *                           DOWN (-Y) and lets it lift off freely
 *   -Y                      one-way: acts in -Y, a hold-down that stops uplift
 *
 * Reading only the cosines would therefore draw a rest support and a
 * fully-restrained axis identically, which understates the freedom a one-way
 * support actually leaves in the model. The `+`/`-` prefix is CAESAR's own
 * convention and holds across the whole label vocabulary (+X/-X, +LIM/-LIM,
 * +YROD/-YROD, +ZSNB/-ZSNB ...), so the sense is derived structurally from
 * the prefix rather than from an enumerated table that could fall behind it.
 */
export function lfeaRestraintActionSense(typeLabel) {
  const label = String(typeLabel ?? '').trim().toUpperCase();
  if (!label) return 'UNKNOWN';
  if (ANCHOR_RESTRAINT_LABELS.has(label)) return 'ANCHOR';
  if (label.startsWith('+')) return 'POSITIVE_SINGLE_ACTING';
  if (label.startsWith('-')) return 'NEGATIVE_SINGLE_ACTING';
  return 'DOUBLE_ACTING';
}

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
    restraintClass: node.restraint && node.restraint !== 'FREE' ? String(node.restraint) : null,
    restraints: Object.freeze((node.meta?.restraints ?? []).map((restraint) => {
      // ACCDB supplies the label directly; InputXML retains only the corrected
      // numeric TYPE, so the label is resolved from the same canonical code
      // vocabulary rather than being left blank for one source.
      const typeLabel = restraint.typeLabel ?? restraintTypeCodeLabel(restraint.typeCode) ?? null;
      return Object.freeze({
        typeLabel,
        actionSense: lfeaRestraintActionSense(typeLabel),
        xCosine: finiteOrNull(restraint.xCosine),
        yCosine: finiteOrNull(restraint.yCosine),
        zCosine: finiteOrNull(restraint.zCosine),
      });
    })),
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

function finiteOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
