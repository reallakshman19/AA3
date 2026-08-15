import { semanticHash } from '../../../core/empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../../../core/shared-primitives/immutable.js';
import {
  requireStagedJsonProcessAuthority,
  STAGEDJSON_PROCESS_FIELD_KEYS,
} from '../../analysis-authority-overlay/stagedjson-process-authority.js';
import {
  adaptLegacyNumericResolution,
  adaptSealedDeclaredNumericField,
} from './empirical-v3-source-authority-adapter.js';
import {
  adaptResolutionReference,
} from './empirical-v3-resolution-reference-adapter.js';

export const EMPIRICAL_V3_STAGEDJSON_PROCESS_BASIS_SCHEMA =
  'empirical-v3-stagedjson-process-basis/v1';

const NUMERIC_FIELDS = new Set([
  'designPressure',
  'operatingAnalysisPressure',
  'hydrotestPressure',
  'referenceTemperature',
  'operatingTemperature',
  'designTemperature',
  'operatingFluidDensity',
  'hydrotestFluidDensity',
  'insulationThickness',
  'insulationDensity',
  'materialDensity',
  'corrosionAllowance',
]);
const TEXT_FIELDS = new Set(['fluidPhase', 'fluidService']);
const INSULATION_FIELDS = new Set(['insulationThickness', 'insulationDensity']);
const DEFAULT_REQUIRED_FIELDS = Object.freeze([
  'referenceTemperature',
  'operatingTemperature',
  'operatingAnalysisPressure',
  'operatingFluidDensity',
  'fluidPhase',
  'fluidService',
  'insulationThickness',
]);

/**
 * Validates one current sealed StagedJSON process authority and projects it to
 * branch-common process/insulation basis. Source entity identity is evidence,
 * while branch sameness is based on governed field states/values/units.
 */
export function adaptCurrentStagedJsonProcessBasis(input) {
  const runId = requireText(input?.runId, 'runId');
  const authority = requireStagedJsonProcessAuthority(input?.processAuthority, {
    dataset: input?.dataset,
  });
  const requiredFields = normalizeRequiredFields(input?.requiredFields ?? DEFAULT_REQUIRED_FIELDS);
  const quantityAuthorities = [];
  const textAuthorities = [];
  const risks = [];

  for (const fieldName of STAGEDJSON_PROCESS_FIELD_KEYS) {
    const field = authority.fields[fieldName];
    if (field.status === 'DECLARED' && NUMERIC_FIELDS.has(fieldName)) {
      const quantity = adaptSealedDeclaredNumericField({
        quantityId: `Q:${authority.processAuthorityId}:${fieldName}`,
        quantityKind: fieldName,
        scopeRef: authority.scope.entityId,
        fieldName,
        field,
        authorityRef: {
          ref: authority.processAuthorityId,
          semanticHash: authority.semanticHash,
          evidenceHash: authority.evidenceHash,
        },
      });
      quantityAuthorities.push(quantity);
      continue;
    }
    if (field.status === 'DECLARED' && TEXT_FIELDS.has(fieldName)) {
      const adapted = adaptResolutionReference({
        runId,
        kind: fieldName === 'fluidPhase' ? 'FLUID_PHASE' : 'FLUID_SERVICE',
        ref: String(field.value),
        source: authority.processAuthorityId,
        sourceSemanticHash: authority.semanticHash,
        matchMethod: 'declared',
        needsReview: false,
        exactSourceApproved: true,
        entityIds: [authority.scope.entityId],
      });
      textAuthorities.push(adapted.record);
      continue;
    }
    if (field.status === 'MISSING' && requiredFields.has(fieldName)) {
      const risk = missingRequiredFieldRisk({ runId, authority, fieldName, field });
      risks.push(risk);
    }
  }

  const fieldStates = Object.fromEntries(STAGEDJSON_PROCESS_FIELD_KEYS.map((fieldName) => {
    const field = authority.fields[fieldName];
    return [fieldName, {
      status: field.status,
      value: field.value,
      unit: field.unit,
      required: requiredFields.has(fieldName),
    }];
  }));
  const processStates = Object.fromEntries(
    Object.entries(fieldStates).filter(([fieldName]) => !INSULATION_FIELDS.has(fieldName)),
  );
  const insulationStates = Object.fromEntries(
    Object.entries(fieldStates).filter(([fieldName]) => INSULATION_FIELDS.has(fieldName)),
  );
  const processBasis = sealBasisRecord('PROCESS', processStates);
  const insulationBasis = sealBasisRecord('INSULATION', insulationStates);
  const sourceEvidenceRef = {
    ref: authority.processAuthorityId,
    semanticHash: authority.evidenceHash,
  };

  return deepFreeze({
    schema: EMPIRICAL_V3_STAGEDJSON_PROCESS_BASIS_SCHEMA,
    componentId: authority.scope.entityId,
    observedSourceBranchId: authority.scope.branchId,
    commonAuthorityRefs: [
      { kind: 'PROCESS', ref: processBasis.ref, semanticHash: processBasis.semanticHash },
      { kind: 'INSULATION', ref: insulationBasis.ref, semanticHash: insulationBasis.semanticHash },
    ],
    quantityAuthorities: quantityAuthorities.sort((a, b) => a.quantityId.localeCompare(b.quantityId)),
    textAuthorities: textAuthorities.sort((a, b) => a.kind.localeCompare(b.kind)),
    risks: risks.sort((a, b) => a.riskId.localeCompare(b.riskId)),
    riskRefs: risks.map((risk) => ({ ref: risk.riskId, semanticHash: risk.semanticHash })),
    sourceEvidenceRefs: [sourceEvidenceRef],
    processBasis,
    insulationBasis,
    semanticHash: semanticHash({
      processBasis: processBasis.semanticHash,
      insulationBasis: insulationBasis.semanticHash,
      requiredFields: [...requiredFields].sort(),
    }),
  });
}

function missingRequiredFieldRisk({ runId, authority, fieldName, field }) {
  if (NUMERIC_FIELDS.has(fieldName)) {
    return adaptLegacyNumericResolution({
      runId,
      quantityId: `Q:${authority.processAuthorityId}:${fieldName}`,
      quantityKind: fieldName,
      scopeRef: authority.scope.entityId,
      value: null,
      unit: field.unit,
      source: 'stagedjson-missing',
      sourceReference: `${authority.processAuthorityId}:${fieldName}`,
      sourceSemanticHash: authority.semanticHash,
      required: true,
    }).risk;
  }
  return adaptResolutionReference({
    runId,
    kind: fieldName === 'fluidPhase' ? 'FLUID_PHASE' : 'FLUID_SERVICE',
    ref: null,
    source: authority.processAuthorityId,
    sourceSemanticHash: authority.semanticHash,
    matchMethod: 'missing',
    needsReview: true,
    entityIds: [authority.scope.entityId],
  }).risk;
}

function sealBasisRecord(kind, fieldStates) {
  const material = {
    schema: 'empirical-v3-branch-common-basis/v1',
    kind,
    fieldStates,
  };
  const hash = semanticHash(material);
  return deepFreeze({
    ...material,
    ref: `${kind.toLowerCase()}-basis:${hash.slice('fnv1a64:'.length)}`,
    semanticHash: hash,
  });
}

function normalizeRequiredFields(value) {
  if (!Array.isArray(value)) throw new TypeError('requiredFields must be an array.');
  const allowed = new Set(STAGEDJSON_PROCESS_FIELD_KEYS);
  const result = new Set();
  for (const fieldName of value) {
    const text = requireText(fieldName, 'requiredFields item');
    if (!allowed.has(text)) throw new Error(`Unknown StagedJSON process field: ${text}.`);
    result.add(text);
  }
  return result;
}

function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}
