export const LFEA_MODEL_REVIEW_SCHEMA = 'lfea-model-review/v1';

const EMPTY = Object.freeze([]);

/**
 * Read-only engineering review projection over already-sealed pre-flight records.
 * It does not parse, condition, compile, authorize, assemble or solve anything.
 * Every row keeps the source/canonical/analysis identifiers supplied by the
 * governed preparation chain so a reviewer can see where representation changed.
 */
export function buildLfeaModelReview(preFlight) {
  const preparation = preFlight?.preparation ?? null;
  const structural = preparation?.structuralPreparation ?? null;
  const physical = preparation?.physicalPreparation ?? null;
  if (structural === null) return emptyReview();

  const geometry = structural.conditionedTopology?.geometry ?? null;
  if (!geometry || !Array.isArray(geometry.nodes) || !Array.isArray(geometry.segments)) {
    throw new TypeError('LFEA model review requires conditioned structural geometry.');
  }
  if (!Array.isArray(structural.segmentBindings)
    || !Array.isArray(structural.constraintBindings)) {
    throw new TypeError('LFEA model review requires structural custody bindings.');
  }
  const loadLedger = physical?.loadLedger ?? EMPTY;
  if (!Array.isArray(loadLedger)) throw new TypeError('LFEA model review load ledger is invalid.');

  const segmentById = new Map(geometry.segments.map((row) => [String(row.id), row]));
  const elements = Object.freeze([...structural.segmentBindings]
    .sort((a, b) => numericThenAscii(a.sourceIndex, b.sourceIndex, a.segmentId, b.segmentId))
    .map((binding) => elementRow(binding, segmentById.get(String(binding.segmentId)) ?? null, geometry.unit)));
  const restraints = Object.freeze([...structural.constraintBindings]
    .sort((a, b) => compareAscii(a.inventoryId, b.inventoryId))
    .map(restraintRow));
  const loads = Object.freeze([...loadLedger]
    .sort((a, b) => compareAscii(a.ledgerId, b.ledgerId))
    .map(loadRow));
  const ledger = Object.freeze([
    ...elements.map(elementLedgerRow),
    ...restraints.map(restraintLedgerRow),
    ...loads.map(loadLedgerProjection),
  ]);

  return Object.freeze({
    schema: LFEA_MODEL_REVIEW_SCHEMA,
    empty: false,
    preparationSemanticHash: preparation.semanticHash ?? null,
    structuralSemanticHash: structural.semanticHash ?? null,
    physicalSemanticHash: physical?.semanticHash ?? null,
    mechanicalModelSemanticHash: structural.compilation?.mechanicalModelSemanticHash
      ?? structural.summary?.mechanicalModelSemanticHash ?? null,
    counts: Object.freeze({
      elements: elements.length,
      restraints: restraints.length,
      loads: loads.length,
      transformations: ledger.length,
      declaredApproximations: ledger.filter((row) => row.limitationCodes.length > 0).length,
    }),
    elements,
    restraints,
    loads,
    transformationLedger: ledger,
  });
}

function emptyReview() {
  return Object.freeze({
    schema: LFEA_MODEL_REVIEW_SCHEMA,
    empty: true,
    preparationSemanticHash: null,
    structuralSemanticHash: null,
    physicalSemanticHash: null,
    mechanicalModelSemanticHash: null,
    counts: Object.freeze({ elements: 0, restraints: 0, loads: 0, transformations: 0, declaredApproximations: 0 }),
    elements: EMPTY,
    restraints: EMPTY,
    loads: EMPTY,
    transformationLedger: EMPTY,
  });
}

function elementRow(binding, segment, unit) {
  if (segment === null) {
    throw new TypeError(`LFEA model review segment ${String(binding.segmentId)} is missing.`);
  }
  const meta = segment.meta ?? {};
  const sourceType = meta.inputXmlSourceType ?? binding.componentKind ?? segment.type ?? 'UNKNOWN';
  const analysisType = segment.type ?? 'UNKNOWN';
  const limitationCodes = unique([binding.limitationCode, meta.analysisApproximation]);
  const factor = unit === 'm' ? 1000 : 1;
  return Object.freeze({
    sourceIndex: binding.sourceIndex,
    sourceFeatureId: text(binding.sourceFeatureId),
    sourceType: text(sourceType),
    canonicalSegmentId: text(binding.segmentId),
    analysisElementId: text(binding.elementId),
    fromNodeId: text(binding.startNodeId ?? segment.startNodeId),
    toNodeId: text(binding.endNodeId ?? segment.endNodeId),
    analysisType: text(analysisType),
    outsideDiameterMm: scale(segment.diameter, factor),
    wallThicknessMm: scale(segment.thickness, factor),
    material: text(segment.material ?? ''),
    representabilityDisposition: text(binding.representabilityDisposition ?? 'UNSPECIFIED'),
    transformation: limitationCodes.length > 0 || sourceType !== analysisType
      ? 'DECLARED_TRANSFORMATION'
      : 'DIRECT',
    limitationCodes,
    evidenceRefs: Object.freeze(unique([
      binding.materialResolutionSemanticHash,
      binding.analysisSectionSemanticHash,
      binding.rigidAuthoritySemanticHash,
      binding.localAxisEvidenceIdentity,
    ])),
  });
}

function restraintRow(binding) {
  const limitationCodes = unique([binding.limitationCode, ...(binding.limitationCodes ?? [])]);
  return Object.freeze({
    sourceFeatureId: text(binding.sourceFeatureId),
    inventoryId: text(binding.inventoryId),
    sourceNodeId: text(binding.sourceNodeId),
    canonicalNodeId: text(binding.sourceNodeId),
    analysisDeclarationIds: Object.freeze([...(binding.declarationIds ?? [])].map(text)),
    targetDofs: Object.freeze([...(binding.targetDofs ?? [])].map(text)),
    implementation: text(binding.implementation ?? 'UNSPECIFIED'),
    unilateralAction: binding.unilateralAction ?? null,
    limitationCodes,
    evidenceRefs: Object.freeze(unique([binding.sourceRecordSemanticHash])),
  });
}

function loadRow(row) {
  return Object.freeze({
    ledgerId: text(row.ledgerId),
    sourceKind: text(row.sourceKind ?? 'UNKNOWN'),
    sourceFeatureId: text(row.sourceFeatureId ?? ''),
    canonicalSegmentId: text(row.segmentId ?? ''),
    analysisElementId: text(row.elementId ?? ''),
    disposition: text(row.disposition ?? 'UNSPECIFIED'),
    primitiveIds: Object.freeze([...(row.primitiveIds ?? [])].map(text)),
    caseIds: Object.freeze([...(row.caseIds ?? [])].map(text)),
    limitationCodes: Object.freeze(unique([row.limitationCode])),
    evidence: freezeValue(row.evidence),
  });
}

function elementLedgerRow(row) {
  return freezeLedger({
    ledgerId: `ELEMENT:${row.canonicalSegmentId}`,
    entityClass: 'ELEMENT',
    sourceRef: row.sourceFeatureId,
    canonicalRef: row.canonicalSegmentId,
    analysisRefs: [row.analysisElementId],
    disposition: row.transformation,
    limitationCodes: row.limitationCodes,
    evidenceRefs: row.evidenceRefs,
  });
}

function restraintLedgerRow(row) {
  return freezeLedger({
    ledgerId: `RESTRAINT:${row.inventoryId}`,
    entityClass: 'RESTRAINT',
    sourceRef: row.sourceFeatureId,
    canonicalRef: `NODE:${row.canonicalNodeId}`,
    analysisRefs: row.analysisDeclarationIds,
    disposition: row.implementation,
    limitationCodes: row.limitationCodes,
    evidenceRefs: row.evidenceRefs,
  });
}

function loadLedgerProjection(row) {
  return freezeLedger({
    ledgerId: `LOAD:${row.ledgerId}`,
    entityClass: 'LOAD',
    sourceRef: row.sourceFeatureId || row.sourceKind,
    canonicalRef: row.canonicalSegmentId || 'MODEL',
    analysisRefs: row.primitiveIds,
    disposition: row.disposition,
    limitationCodes: row.limitationCodes,
    evidenceRefs: unique([row.evidence?.authoritySemanticHash]),
  });
}

function freezeLedger(value) {
  return Object.freeze({
    ...value,
    analysisRefs: Object.freeze([...value.analysisRefs].map(text)),
    limitationCodes: Object.freeze([...value.limitationCodes].map(text)),
    evidenceRefs: Object.freeze([...value.evidenceRefs].map(text)),
  });
}

function scale(value, factor) {
  return typeof value === 'number' && Number.isFinite(value) ? value * factor : null;
}

function freezeValue(value) {
  if (value === null || value === undefined || typeof value !== 'object') return value ?? null;
  if (Array.isArray(value)) return Object.freeze(value.map(freezeValue));
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, freezeValue(item)])));
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && String(value) !== '').map(text))]
    .sort(compareAscii);
}

function text(value) {
  return String(value ?? '');
}

function compareAscii(left, right) {
  const a = text(left);
  const b = text(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function numericThenAscii(leftIndex, rightIndex, leftId, rightId) {
  const left = Number.isFinite(leftIndex) ? leftIndex : Number.MAX_SAFE_INTEGER;
  const right = Number.isFinite(rightIndex) ? rightIndex : Number.MAX_SAFE_INTEGER;
  return left === right ? compareAscii(leftId, rightId) : left - right;
}
