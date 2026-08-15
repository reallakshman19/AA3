import { semanticHash } from '../../../core/empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../../../core/shared-primitives/immutable.js';
import {
  adaptLegacyNumericResolution,
} from './empirical-v3-source-authority-adapter.js';
import {
  adaptResolutionReference,
  branchCommonAuthorityRef,
} from './empirical-v3-resolution-reference-adapter.js';

/**
 * Binds the existing branch-process-resolver output to V3 authority classes.
 * Resolver confidence/review metadata is authoritative for whether a master
 * lookup may be called exact; manual/fallback paths remain review-required.
 */
export function adaptBranchProcessResolverOutput(input) {
  const runId = requireText(input?.runId, 'runId');
  const componentId = requireText(input?.componentId, 'componentId');
  const row = requireRecord(input?.resolution, 'resolution');
  const masterSemanticHash = optionalText(input?.masterSemanticHash);
  const sourceSemanticHash = optionalText(input?.sourceSemanticHash);
  const classExact = isExactPipingClassResolution(row);
  const classMasterExact = classExact && Boolean(masterSemanticHash);

  const classAdapted = adaptResolutionReference({
    runId,
    kind: 'PIPING_CLASS',
    ref: optionalText(row.resolvedPipingClass),
    source: 'piping-class-resolver',
    sourceSemanticHash: masterSemanticHash,
    matchMethod: row.pipingClassMatchMethod || row.pipingClassRowMethod || 'none',
    needsReview: !classMasterExact,
    exactMasterApproved: classMasterExact,
    entityIds: [componentId],
  });
  const pipingClassBasis = sealPipingClassBasis(row, classAdapted.record);

  const materialAuthority = classifyMaterialResolution({
    runId,
    componentId,
    row,
    classExact: classMasterExact,
    masterSemanticHash,
    sourceSemanticHash,
  });

  const wallExactMaster = row.wallThicknessSource === 'piping-class-master' && classMasterExact;
  const wallAuthority = adaptLegacyNumericResolution({
    runId,
    quantityId: `Q:${componentId}:WT`,
    quantityKind: 'WALL_THICKNESS',
    scopeRef: componentId,
    value: row.wallThicknessMm,
    unit: 'mm',
    source: row.wallThicknessSource || 'unresolved',
    sourceReference: `${row.wallThicknessSource || 'unresolved'}:${row.wallThicknessKey || componentId}`,
    sourceSemanticHash: wallExactMaster ? masterSemanticHash : sourceSemanticHash,
    evidenceRef: wallExactMaster
      ? `piping-class-master:${row.wallThicknessKey || componentId}:wall-thickness`
      : null,
    evidenceHash: wallExactMaster ? masterSemanticHash : null,
    matchMethod: row.pipingClassMatchMethod || row.pipingClassRowMethod || 'none',
    needsReview: !wallExactMaster,
    exactMasterApproved: wallExactMaster,
    required: true,
  });

  const corrosionExactMaster = row.corrosionSource === 'piping-class-master' && classMasterExact;
  const corrosionAuthority = adaptLegacyNumericResolution({
    runId,
    quantityId: `Q:${componentId}:CORROSION`,
    quantityKind: 'CORROSION_ALLOWANCE',
    scopeRef: componentId,
    value: row.corrosionAllowanceMm,
    unit: 'mm',
    source: row.corrosionSource || 'unresolved',
    sourceReference: `${row.corrosionSource || 'unresolved'}:${row.corrosionKey || componentId}`,
    sourceSemanticHash: corrosionExactMaster ? masterSemanticHash : sourceSemanticHash,
    evidenceRef: corrosionExactMaster
      ? `piping-class-master:${row.corrosionKey || componentId}:corrosion`
      : null,
    evidenceHash: corrosionExactMaster ? masterSemanticHash : null,
    matchMethod: row.pipingClassMatchMethod || row.pipingClassRowMethod || 'none',
    needsReview: !corrosionExactMaster,
    exactMasterApproved: corrosionExactMaster,
    required: false,
  });

  const risks = [
    classAdapted.risk,
    materialAuthority.risk,
    wallAuthority.risk,
    corrosionAuthority.risk,
  ].filter(Boolean).sort((a, b) => a.riskId.localeCompare(b.riskId));

  return deepFreeze({
    componentId,
    classResolution: classAdapted.record,
    pipingClassBasis,
    materialResolution: materialAuthority.record,
    wallQuantity: wallAuthority.quantity,
    corrosionQuantity: corrosionAuthority.quantity,
    branchCommonAuthorityRefs: [
      { kind: 'PIPING_CLASS', ref: pipingClassBasis.ref, semanticHash: pipingClassBasis.semanticHash },
      branchCommonAuthorityRef('MATERIAL_MAPPING', materialAuthority.record),
    ],
    componentLocalAuthorityRefs: [
      { kind: 'WT', ref: wallAuthority.quantity.quantityId, semanticHash: wallAuthority.quantity.semanticHash },
    ],
    risks,
    riskRefs: risks.map((risk) => ({ ref: risk.riskId, semanticHash: risk.semanticHash })),
  });
}

export function isExactPipingClassResolution(row) {
  if (!row || typeof row !== 'object') return false;
  const classMethod = normalizeMethod(row.pipingClassMatchMethod);
  const rowMethod = normalizeMethod(row.pipingClassRowMethod);
  const rowReasons = normalizeRowReasons(row.pipingClassRowReasons);
  const exactReasonSet = new Set(rowReasons);
  const hasExactDiscriminators = ['CLASS_EXACT', 'BORE_EXACT', 'COMPONENT_EXACT']
    .every((reason) => exactReasonSet.has(reason));
  const hasApproximateOrMissingEvidence = rowReasons.some((reason) => (
    reason.includes('MISMATCH')
    || reason.includes('MISSING')
    || reason.startsWith('BORE_NEAR')
  ));
  return Boolean(
    row.resolvedPipingClass
    && row.pipingClassMatchedRow
    && row.pipingClassNeedsReview !== true
    && classMethod === 'EXACT'
    && (rowMethod === 'BEST_SCORE' || rowMethod === 'EXACT')
    && hasExactDiscriminators
    && !hasApproximateOrMissingEvidence
  );
}

function sealPipingClassBasis(row, classRecord) {
  const material = {
    schema: 'empirical-v3-piping-class-basis/v1',
    requestedPipingClass: optionalText(row.requestedPipingClass),
    resolvedPipingClass: optionalText(row.resolvedPipingClass),
    authorityClass: classRecord.authorityClass,
    source: optionalText(row.pipingClassSource) || 'piping-class-resolver',
    matchMethod: normalizeMethod(row.pipingClassMatchMethod || row.pipingClassRowMethod || 'none'),
    rowMethod: normalizeMethod(row.pipingClassRowMethod || 'none'),
    needsReview: row.pipingClassNeedsReview === true || classRecord.authorityClass === 'INFERRED_REVIEW_REQUIRED',
    resolutionRef: { ref: classRecord.ref, semanticHash: classRecord.semanticHash },
  };
  const hash = semanticHash(material);
  return deepFreeze({
    ...material,
    ref: `piping-class-basis:${hash.slice('fnv1a64:'.length)}`,
    semanticHash: hash,
  });
}

function classifyMaterialResolution({
  runId,
  componentId,
  row,
  classExact,
  masterSemanticHash,
  sourceSemanticHash,
}) {
  const source = normalizeSource(row.materialSource);
  const exactMaster = classExact && source === 'PIPING_CLASS_MATERIAL_CODE' && Boolean(masterSemanticHash);
  const exactSource = source === 'LINE_LIST_MATERIAL_CODE' && Boolean(sourceSemanticHash);
  const inherentlyApproximate = [
    'PIPING_CLASS_MATERIAL_MAP',
    'LINE_LIST_MATERIAL_MAP',
    'OVERRIDE_MATERIAL_MAP',
    'XML_MATERIAL_MAP',
    'XML_FALLBACK',
    'PIPING_CLASS_CONFIG_MAP',
    'OVERRIDE',
    'OVERRIDE_MATERIAL_CODE',
  ].includes(source);
  return adaptResolutionReference({
    runId,
    kind: 'MATERIAL_MAPPING',
    ref: optionalText(row.materialCode),
    source: row.materialSource || 'unresolved',
    sourceSemanticHash: exactMaster ? masterSemanticHash : sourceSemanticHash,
    matchMethod: exactMaster ? 'exact' : (row.materialCodeMatchMethod || row.materialSource || 'none'),
    needsReview: inherentlyApproximate || !(exactMaster || exactSource),
    exactMasterApproved: exactMaster,
    exactSourceApproved: exactSource,
    entityIds: [componentId],
  });
}

function normalizeRowReasons(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeMethod).filter(Boolean))].sort();
}
function normalizeSource(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}
function normalizeMethod(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}
function requireRecord(value, fieldName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${fieldName} must be an object.`);
  return value;
}
function optionalText(value) { const text = String(value ?? '').trim(); return text || null; }
function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}
