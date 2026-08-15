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
 * Branch piping-class identity and component-row exactness are deliberately
 * separate: an exact class does not make a best-score component row exact.
 */
export function adaptBranchProcessResolverOutput(input) {
  const runId = requireText(input?.runId, 'runId');
  const componentId = requireText(input?.componentId, 'componentId');
  const row = requireRecord(input?.resolution, 'resolution');
  const masterSemanticHash = optionalText(input?.masterSemanticHash);
  const sourceSemanticHash = optionalText(input?.sourceSemanticHash);
  const classIdentityExact = isExactPipingClassIdentity(row);
  const classMasterExact = classIdentityExact && Boolean(masterSemanticHash);
  const componentRowMasterExact = isExactPipingClassResolution(row) && Boolean(masterSemanticHash);

  const classAdapted = adaptResolutionReference({
    runId,
    kind: 'PIPING_CLASS',
    ref: optionalText(row.resolvedPipingClass),
    source: 'piping-class-resolver',
    sourceSemanticHash: masterSemanticHash,
    matchMethod: row.pipingClassMatchMethod || 'none',
    needsReview: !classMasterExact,
    exactMasterApproved: classMasterExact,
    entityIds: [componentId],
  });
  const pipingClassBasis = sealPipingClassBasis(row, classAdapted.record);

  const materialAuthority = classifyMaterialResolution({
    runId,
    componentId,
    row,
    componentRowExact: componentRowMasterExact,
    masterSemanticHash,
    sourceSemanticHash,
  });

  const wallFromMaster = row.wallThicknessSource === 'piping-class-master';
  const wallExactMaster = wallFromMaster && componentRowMasterExact;
  const wallAuthority = adaptLegacyNumericResolution({
    runId,
    quantityId: `Q:${componentId}:WT`,
    quantityKind: 'WALL_THICKNESS',
    scopeRef: componentId,
    value: row.wallThicknessMm,
    unit: 'mm',
    source: row.wallThicknessSource || 'unresolved',
    sourceReference: `${row.wallThicknessSource || 'unresolved'}:${row.wallThicknessKey || componentId}`,
    sourceSemanticHash: wallFromMaster ? masterSemanticHash : sourceSemanticHash,
    evidenceRef: wallExactMaster
      ? `piping-class-master:${row.wallThicknessKey || componentId}:wall-thickness`
      : null,
    evidenceHash: wallExactMaster ? masterSemanticHash : null,
    matchMethod: row.pipingClassRowMethod || row.pipingClassMatchMethod || 'none',
    needsReview: !wallExactMaster,
    exactMasterApproved: wallExactMaster,
    required: true,
  });

  // Corrosion is resolved by a second rating-aware master-row lookup in the
  // legacy resolver. That lookup's row method/reasons are not preserved in the
  // current output, so V3 cannot prove this numeric value exact from this seam.
  const corrosionFromMaster = row.corrosionSource === 'piping-class-master';
  const corrosionExactMaster = false;
  const corrosionAuthority = adaptLegacyNumericResolution({
    runId,
    quantityId: `Q:${componentId}:CORROSION`,
    quantityKind: 'CORROSION_ALLOWANCE',
    scopeRef: componentId,
    value: row.corrosionAllowanceMm,
    unit: 'mm',
    source: row.corrosionSource || 'unresolved',
    sourceReference: `${row.corrosionSource || 'unresolved'}:${row.corrosionKey || componentId}`,
    sourceSemanticHash: corrosionFromMaster ? masterSemanticHash : sourceSemanticHash,
    evidenceRef: null,
    evidenceHash: null,
    matchMethod: row.corrosionMatchMethod || 'legacy-rating-aware-match-evidence-not-preserved',
    needsReview: true,
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

export function isExactPipingClassIdentity(row) {
  if (!row || typeof row !== 'object') return false;
  return Boolean(
    row.resolvedPipingClass
    && normalizeMethod(row.pipingClassMatchMethod) === 'EXACT'
    && row.pipingClassNeedsReview !== true
  );
}

/**
 * Exact component-row authority requires exact class, bore, component type and
 * schedule evidence from the production row scorer. `best-score` alone is not
 * authority: missing/mismatched/near evidence remains review-required.
 */
export function isExactPipingClassResolution(row) {
  if (!isExactPipingClassIdentity(row) || !row.pipingClassMatchedRow) return false;
  const rowMethod = normalizeMethod(row.pipingClassRowMethod);
  const rowReasons = normalizeRowReasons(row.pipingClassRowReasons);
  const exactReasonSet = new Set(rowReasons);
  const hasExactDiscriminators = ['CLASS_EXACT', 'BORE_EXACT', 'COMPONENT_EXACT', 'SCHEDULE_EXACT']
    .every((reason) => exactReasonSet.has(reason));
  const hasApproximateOrMissingEvidence = rowReasons.some((reason) => (
    reason.includes('MISMATCH')
    || reason.includes('MISSING')
    || reason.includes('NEAR')
  ));
  return Boolean(
    (rowMethod === 'BEST_SCORE' || rowMethod === 'EXACT')
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
    matchMethod: normalizeMethod(row.pipingClassMatchMethod || 'none'),
    rowMethod: normalizeMethod(row.pipingClassRowMethod || 'none'),
    needsReview: classRecord.authorityClass === 'INFERRED_REVIEW_REQUIRED',
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
  componentRowExact,
  masterSemanticHash,
  sourceSemanticHash,
}) {
  const source = normalizeSource(row.materialSource);
  const fromPipingClassMaster = source === 'PIPING_CLASS_MATERIAL_CODE';
  const exactMaster = componentRowExact && fromPipingClassMaster && Boolean(masterSemanticHash);
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
    sourceSemanticHash: fromPipingClassMaster ? masterSemanticHash : sourceSemanticHash,
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
