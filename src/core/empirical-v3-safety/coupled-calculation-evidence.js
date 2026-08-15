import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';
import { requireEmpiricalV3CalculationAuthorization } from './calculation-authorization.js';

export const EMPIRICAL_V3_COUPLED_CALCULATION_EVIDENCE_SCHEMA =
  'empirical-v3-coupled-calculation-evidence/v1';

const COMPONENT_SCHEMA = 'empirical-rooted-component-thermal-compatibility/v1';
const STRAIGHT_SCHEMA = 'empirical-rooted-tree-thermal-restraint-compatibility/v1';

/** Seals existing ROM outputs for Explain/audit without solving or recomputing. */
export function sealEmpiricalV3CoupledCalculationEvidence(input) {
  const runId = requireText(input?.runId, 'runId');
  const authorization = requireEmpiricalV3CalculationAuthorization(input?.authorization);
  if (authorization.runId !== runId) throw new Error('Evidence runId must match calculation authorization.');
  const source = normalizeMechanicsSource(input?.mechanics);
  const coordinateBindings = normalizeCoordinateBindings(input?.coordinateBindings ?? [], source.coordinateIds);
  const authorityRefs = normalizeRefs(input?.authorityRefs ?? [], 'authorityRefs');
  const romOutputRef = normalizeRef(input?.romOutputRef, 'romOutputRef');
  const pairRows = normalizePairEvidence(source.flexibility.pairEvidence);
  const compatibilityRows = source.compatibility.rows.map((row, index) => deepFreeze({
    coordinateId: requireText(row.coordinateId, `compatibility.rows[${index}].coordinateId`),
    binding: coordinateBindings.get(row.coordinateId) ?? null,
    referenceDisplacementM: finite(row.referenceDisplacementM, 'referenceDisplacementM'),
    targetDisplacementM: finite(row.targetDisplacementM, 'targetDisplacementM'),
    supportStiffnessNPerM: nullableFinite(row.supportStiffnessNPerM, 'supportStiffnessNPerM'),
    supportFlexibilityMPerN: finite(row.supportFlexibilityMPerN, 'supportFlexibilityMPerN'),
    reactionN: finite(row.reactionN, 'reactionN'),
    pipeDisplacementM: finite(row.pipeDisplacementM, 'pipeDisplacementM'),
    supportDeformationM: finite(row.supportDeformationM, 'supportDeformationM'),
    compatibilityResidualM: finite(row.compatibilityResidualM, 'compatibilityResidualM'),
    flexibilityRowMPerN: clone(source.flexibility.matrix[index]),
    pairEvidence: pairRows.filter((pair) => pair.rowCoordinateId === row.coordinateId),
  }));

  const material = {
    schema: EMPIRICAL_V3_COUPLED_CALCULATION_EVIDENCE_SCHEMA,
    runId,
    authorizationRef: {
      authorizationId: authorization.authorizationId,
      semanticHash: authorization.semanticHash,
    },
    romOutputRef,
    sourceMechanicsSchema: source.schema,
    authorityRefs,
    equations: {
      compatibility: '(F+S) R = delta_target - delta_reference',
      pipeRecovery: 'delta_pipe,i = delta_reference,i + sum_j(F_ij R_j)',
      flexibilityDecomposition: 'F_ij = sum_m(f_ij^(m))',
    },
    coupledSystem: {
      coordinateIds: [...source.coordinateIds],
      flexibilityMatrixMPerN: clone(source.flexibility.matrix),
      supportFlexibilityMPerN: clone(source.compatibility.supportFlexibilityMPerN),
      systemMatrixMPerN: clone(source.compatibility.systemMatrixMPerN),
      rhsDisplacementM: clone(source.compatibility.rhsDisplacementM),
      reactionVectorN: source.compatibility.rows.map((row) => row.reactionN),
      numerical: clone(source.compatibility.numerical),
      reciprocity: clone(source.compatibility.reciprocity),
      positiveDefinite: clone(source.compatibility.positiveDefinite),
      compatibility: clone(source.compatibility.compatibility),
      energy: clone(source.compatibility.energy),
    },
    coordinates: compatibilityRows,
    thermalReference: clone(source.thermalReference),
    sourceEvidence: clone(source.sourceEvidence),
    formulaTrace: uniqueSortedTexts([
      ...(source.flexibility.formulaTrace ?? []),
      ...(source.compatibility.formulaTrace ?? []),
      ...(source.sourceFormulaTrace ?? []),
    ]),
    evidencePolicy: {
      mechanicsRecomputed: false,
      flexibilityRecomputed: false,
      reactionRecomputed: false,
      thermalReferenceRecomputed: false,
      componentContributionRecomputed: false,
      uiOrReportMayResolveMechanics: false,
    },
  };
  const hash = semanticHash(material);
  return deepFreeze({ ...material, evidenceId: `calc-evidence:${hash.slice('fnv1a64:'.length)}`, semanticHash: hash });
}

export function requireEmpiricalV3CoupledCalculationEvidence(value) {
  if (!value || value.schema !== EMPIRICAL_V3_COUPLED_CALCULATION_EVIDENCE_SCHEMA) {
    throw new TypeError(`Expected schema ${EMPIRICAL_V3_COUPLED_CALCULATION_EVIDENCE_SCHEMA}.`);
  }
  const { evidenceId, semanticHash: actualHash, ...material } = value;
  const expectedHash = semanticHash(material);
  const expectedId = `calc-evidence:${expectedHash.slice('fnv1a64:'.length)}`;
  if (actualHash !== expectedHash || evidenceId !== expectedId) {
    throw new Error('Empirical V3 coupled calculation evidence identity mismatch.');
  }
  return deepFreeze(value);
}

function normalizeMechanicsSource(value) {
  requireRecord(value, 'mechanics');
  if (value.schema === COMPONENT_SCHEMA) {
    const coordinateIds = requireCoordinateIds(value.coordinateIds, 'mechanics.coordinateIds');
    requireSameOrder(coordinateIds, value.flexibility?.caseIds, 'component flexibility caseIds');
    return {
      schema: value.schema,
      coordinateIds,
      flexibility: normalizeFlexibility(value.flexibility, 'matrixMPerN', coordinateIds.length),
      compatibility: requireCompatibility(value.compatibility, coordinateIds),
      thermalReference: value.thermalReference,
      sourceEvidence: value.evidence,
      sourceFormulaTrace: value.evidence?.formulaTrace ?? [],
    };
  }
  if (value.schema === STRAIGHT_SCHEMA) {
    const coordinateIds = requireCoordinateIds(value.coordinateIds, 'mechanics.coordinateIds');
    requireSameOrder(coordinateIds, value.compatibility?.flexibility?.caseIds, 'straight flexibility caseIds');
    return {
      schema: value.schema,
      coordinateIds,
      flexibility: normalizeFlexibility(value.compatibility?.flexibility, 'matrix', coordinateIds.length),
      compatibility: requireCompatibility(value.compatibility?.compatibility, coordinateIds),
      thermalReference: value.thermalReference,
      sourceEvidence: value.evidence,
      sourceFormulaTrace: value.evidence?.formulaTrace ?? [],
    };
  }
  throw new TypeError(`Unsupported coupled mechanics schema: ${value.schema ?? '<missing>'}.`);
}

function normalizeFlexibility(value, matrixField, size) {
  requireRecord(value, 'flexibility');
  return {
    matrix: requireMatrix(value[matrixField], `flexibility.${matrixField}`, size),
    pairEvidence: requireArray(value.pairEvidence, 'flexibility.pairEvidence'),
    formulaTrace: value.formulaTrace ?? value.evidence?.formulaTrace ?? [],
  };
}

function requireCompatibility(value, coordinateIds) {
  requireRecord(value, 'compatibility');
  requireSameOrder(coordinateIds, value.coordinateIds, 'compatibility coordinateIds');
  if (!Array.isArray(value.rows) || value.rows.length !== coordinateIds.length) {
    throw new TypeError('Compatibility rows must match coordinateIds.');
  }
  requireSameOrder(coordinateIds, value.rows.map((row) => row.coordinateId), 'compatibility row order');
  requireVector(value.supportFlexibilityMPerN, 'supportFlexibilityMPerN', coordinateIds.length);
  requireVector(value.rhsDisplacementM, 'rhsDisplacementM', coordinateIds.length);
  return {
    coordinateIds,
    rows: value.rows,
    supportFlexibilityMPerN: value.supportFlexibilityMPerN,
    systemMatrixMPerN: requireMatrix(value.systemMatrixMPerN, 'systemMatrixMPerN', coordinateIds.length),
    rhsDisplacementM: value.rhsDisplacementM,
    numerical: value.numerical,
    reciprocity: value.reciprocity,
    positiveDefinite: value.positiveDefinite,
    compatibility: value.compatibility,
    energy: value.energy,
    formulaTrace: value.formulaTrace ?? [],
  };
}

function normalizePairEvidence(value) {
  return requireArray(value, 'pairEvidence').map((pair, index) => {
    requireRecord(pair, `pairEvidence[${index}]`);
    const contributions = pair.componentContributions ?? pair.segmentContributions;
    if (!Array.isArray(contributions)) throw new TypeError('Pair evidence lacks component/segment contributions.');
    return deepFreeze({
      rowCoordinateId: requireText(pair.rowCaseId, 'pairEvidence.rowCaseId'),
      columnCoordinateId: requireText(pair.columnCaseId, 'pairEvidence.columnCaseId'),
      valueMPerN: finite(pair.value, 'pairEvidence.value'),
      componentContributions: contributions.map((row, contributionIndex) => deepFreeze({
        componentId: requireText(row.componentId ?? row.segmentId, `contribution[${contributionIndex}].componentId`),
        kind: String(row.kind ?? 'STRAIGHT').trim() || 'STRAIGHT',
        valueMPerN: finite(row.total, `contribution[${contributionIndex}].total`),
        terms: clone(row.terms ?? {}),
        sourceEvidence: clone(row.evidence ?? row),
      })).sort((a, b) => a.componentId.localeCompare(b.componentId)),
    });
  }).sort((a, b) => a.rowCoordinateId.localeCompare(b.rowCoordinateId)
    || a.columnCoordinateId.localeCompare(b.columnCoordinateId));
}

function normalizeCoordinateBindings(value, coordinateIds) {
  if (!Array.isArray(value)) throw new TypeError('coordinateBindings must be an array.');
  const ids = new Set(coordinateIds);
  const map = new Map();
  value.forEach((row, index) => {
    requireRecord(row, `coordinateBindings[${index}]`);
    const coordinateId = requireText(row.coordinateId, `coordinateBindings[${index}].coordinateId`);
    if (!ids.has(coordinateId)) throw new Error(`Coordinate binding ${coordinateId} is outside mechanics output.`);
    if (map.has(coordinateId)) throw new Error(`Duplicate coordinate binding ${coordinateId}.`);
    map.set(coordinateId, deepFreeze({
      coordinateId,
      nodeId: optionalText(row.nodeId),
      supportId: optionalText(row.supportId),
      branchId: optionalText(row.branchId),
      componentIds: uniqueSortedTexts(row.componentIds ?? []),
    }));
  });
  return map;
}

function normalizeRefs(value, fieldName) {
  if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`);
  return value.map((row, index) => ({
    ref: requireText(row?.ref, `${fieldName}[${index}].ref`),
    semanticHash: requireText(row?.semanticHash, `${fieldName}[${index}].semanticHash`),
  })).sort((a, b) => a.ref.localeCompare(b.ref) || a.semanticHash.localeCompare(b.semanticHash));
}
function normalizeRef(value, fieldName) { requireRecord(value, fieldName); return { ref: requireText(value.ref, `${fieldName}.ref`), semanticHash: requireText(value.semanticHash, `${fieldName}.semanticHash`) }; }
function requireMatrix(value, fieldName, size) { if (!Array.isArray(value) || value.length !== size || value.some((row) => !Array.isArray(row) || row.length !== size || row.some((item) => !Number.isFinite(item)))) throw new TypeError(`${fieldName} must be a finite ${size}x${size} matrix.`); return value; }
function requireVector(value, fieldName, size) { if (!Array.isArray(value) || value.length !== size || value.some((item) => !Number.isFinite(item))) throw new TypeError(`${fieldName} must contain ${size} finite values.`); return value; }
function requireCoordinateIds(value, fieldName) { if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${fieldName} must be non-empty.`); const ids = value.map((item, index) => requireText(item, `${fieldName}[${index}]`)); if (new Set(ids).size !== ids.length) throw new TypeError(`${fieldName} must be unique.`); return ids; }
function requireSameOrder(expected, actual, fieldName) { const rows = requireCoordinateIds(actual, fieldName); if (JSON.stringify(expected) !== JSON.stringify(rows)) throw new Error(`${fieldName} must preserve the mechanics coordinate order.`); }
function requireArray(value, fieldName) { if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`); return value; }
function finite(value, fieldName) { if (!Number.isFinite(value)) throw new TypeError(`${fieldName} must be finite.`); return Object.is(value, -0) ? 0 : value; }
function nullableFinite(value, fieldName) { return value === null ? null : finite(value, fieldName); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function requireRecord(value, fieldName) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${fieldName} must be an object.`); }
function uniqueSortedTexts(value) { if (!Array.isArray(value)) throw new TypeError('Expected an array.'); return [...new Set(value.map((item) => requireText(item, 'array item')))].sort(); }
function optionalText(value) { const text = String(value ?? '').trim(); return text || null; }
function requireText(value, fieldName) { const text = String(value ?? '').trim(); if (!text) throw new TypeError(`${fieldName} is required.`); return text; }
