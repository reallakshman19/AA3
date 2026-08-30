import {
  PROFILE_KINDS,
  canonicalProfile,
} from '../core/lafea-profile-contract/index.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA_CONTINUUM_PHYSICAL_PROBE_SCHEMA,
  LAFEA_CONTINUUM_QUANTITY_IDENTITY_SCHEMA,
  createLafeaContinuumPhysicalProbe,
} from './lafea-continuum-physical-probe.js';
import {
  LAFEA_CONTINUUM_PROBE_CONVERGENCE_DEFINITION_SCHEMA,
  createLafeaContinuumProbeConvergenceDefinition,
} from './lafea-continuum-probe-convergence.js';
import { createLafeaArtifactRecord } from './lafea-lifecycle.js';

export const LAFEA_CONTINUUM_CONVERGENCE_STUDY_REQUEST_SCHEMA =
  'lafea-continuum-convergence-study-request/v1';
export const LAFEA_CONTINUUM_CONVERGENCE_STUDY_DEFINITION_SCHEMA =
  'lafea-continuum-convergence-study-definition/v1';
export const LAFEA_CONTINUUM_CONVERGENCE_STUDY_EVIDENCE_SCHEMA =
  'lafea-continuum-convergence-study-evidence/v1';
export const LAFEA_CONTINUUM_CONVERGENCE_PUBLICATION_POLICY = Object.freeze({
  policyId: 'LAFEA3_NON_SINGULAR_POINTWISE_CONVERGENCE_PUBLICATION_V1',
  revision: '1',
  refinementRatio: 2,
  gciSafetyFactor: 1.25,
  nearZeroAbsolute: 1e-12,
  orderStabilityRelativeTolerance: 0.2,
  publishableClassifications: Object.freeze([
    'ASYMPTOTIC',
    'MONOTONIC_CONVERGING',
    'NEAR_ZERO_FINE_DIFFERENCE',
  ]),
  authorityBasis: 'EXISTING_LAFEA_G4_CONVERGENCE_CONTRACT',
});

const STAGE_ID = 'LAFEA.3';
const PRODUCER_REF = 'LAFEA3-1535/CONTINUUM-CONVERGENCE-STUDY/V1';

export function createLafeaContinuumConvergenceStudyDefinition(value) {
  exact(value, [
    'schema', 'studyId', 'probe', 'levels',
  ], 'LAFEA3_CONVERGENCE_STUDY_REQUEST_KEYS_INVALID');
  if (value.schema !== LAFEA_CONTINUUM_CONVERGENCE_STUDY_REQUEST_SCHEMA) {
    fail('LAFEA3_CONVERGENCE_STUDY_REQUEST_SCHEMA_INVALID');
  }
  const probe = createLafeaContinuumPhysicalProbe(value.probe);
  if (probe.schema !== LAFEA_CONTINUUM_PHYSICAL_PROBE_SCHEMA) {
    fail('LAFEA3_CONVERGENCE_STUDY_PROBE_INVALID');
  }
  const quantityIdentity = quantityIdentityFromProbe(probe);
  const quantityIdentityHash = canonicalLafeaSha256({
    schema: 'lafea-continuum-quantity-identity-hash/v1',
    quantityIdentity,
  });
  const convergenceDefinition = createLafeaContinuumProbeConvergenceDefinition({
    schema: LAFEA_CONTINUUM_PROBE_CONVERGENCE_DEFINITION_SCHEMA,
    studyId: text(value.studyId, 'LAFEA3_CONVERGENCE_STUDY_ID_INVALID'),
    quantityIdentityHash,
    refinementRatio: LAFEA_CONTINUUM_CONVERGENCE_PUBLICATION_POLICY.refinementRatio,
    gciSafetyFactor: LAFEA_CONTINUUM_CONVERGENCE_PUBLICATION_POLICY.gciSafetyFactor,
    nearZeroAbsolute: LAFEA_CONTINUUM_CONVERGENCE_PUBLICATION_POLICY.nearZeroAbsolute,
    orderStabilityRelativeTolerance:
      LAFEA_CONTINUUM_CONVERGENCE_PUBLICATION_POLICY.orderStabilityRelativeTolerance,
    levels: value.levels,
  });
  const base = {
    schema: LAFEA_CONTINUUM_CONVERGENCE_STUDY_DEFINITION_SCHEMA,
    stageId: STAGE_ID,
    studyId: convergenceDefinition.studyId,
    probe,
    probeIdentityHash: probe.probeIdentityHash,
    quantityIdentity,
    quantityIdentityHash,
    convergenceDefinition,
    convergenceDefinitionHash: convergenceDefinition.semanticHash,
    publicationPolicy: LAFEA_CONTINUUM_CONVERGENCE_PUBLICATION_POLICY,
    definitionFrozenBeforeObservations: true,
  };
  return freeze({
    ...base,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-convergence-study-definition-hash/v1',
      definition: base,
    }),
  });
}

export function deriveLafeaContinuumConvergenceMeshProfile(
  baseProfileValue,
  studyDefinition,
  level,
) {
  const baseProfile = canonicalProfile(PROFILE_KINDS.MESH, baseProfileValue);
  const definition = requireStudyDefinition(studyDefinition);
  const declared = definition.convergenceDefinition.levels.find(
    (row) => row.levelId === level?.levelId,
  );
  if (!declared || declared.h !== level.h) fail('LAFEA3_CONVERGENCE_LEVEL_NOT_DECLARED');
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: baseProfile.schema,
    profileIdentity: `${baseProfile.profileIdentity}/CONVERGENCE/${definition.studyId}/${declared.levelId}`,
    sourceRevision: `${baseProfile.sourceRevision}|CONVERGENCE:${definition.studyId}:${declared.levelId}`,
    semanticHash: undefined,
    fields: {
      ...baseProfile.fields,
      globalTargetSize: declared.h,
    },
  });
}

export function createLafeaContinuumConvergenceStudyEvidence(options) {
  const definition = requireStudyDefinition(options?.definition);
  const convergence = options?.convergence;
  if (!convergence || convergence.definitionHash !== definition.convergenceDefinitionHash
    || convergence.quantityIdentityHash !== definition.quantityIdentityHash
    || convergence.probeIdentityHash !== definition.probeIdentityHash) {
    fail('LAFEA3_CONVERGENCE_EVALUATION_BINDING_INVALID');
  }
  const levels = normalizeLevelReceipts(options?.levels, definition);
  const finalLevel = levels.at(-1);
  const publication = publicationDisposition(convergence);
  const recoverySetHash = canonicalLafeaSha256({
    schema: 'lafea-continuum-convergence-recovery-set-hash/v1',
    recoveryHashes: levels.map((row) => row.recoveryHash),
  });
  const convergenceProfileHash = canonicalLafeaSha256({
    schema: 'lafea-continuum-convergence-publication-profile-hash/v1',
    definitionHash: definition.convergenceDefinitionHash,
    policy: definition.publicationPolicy,
  });
  const base = {
    schema: LAFEA_CONTINUUM_CONVERGENCE_STUDY_EVIDENCE_SCHEMA,
    stageId: STAGE_ID,
    studyId: definition.studyId,
    sourceHash: sha(options?.sourceHash, 'LAFEA3_CONVERGENCE_SOURCE_HASH_INVALID'),
    analysisDomainHash: sha(options?.analysisDomainHash, 'LAFEA3_CONVERGENCE_DOMAIN_HASH_INVALID'),
    analysisGeometryHash: sha(options?.analysisGeometryHash, 'LAFEA3_CONVERGENCE_GEOMETRY_HASH_INVALID'),
    baseMeshProfileHash: text(options?.baseMeshProfileHash, 'LAFEA3_CONVERGENCE_BASE_PROFILE_HASH_INVALID'),
    definitionHash: definition.semanticHash,
    probeIdentityHash: definition.probeIdentityHash,
    quantityIdentityHash: definition.quantityIdentityHash,
    levels,
    convergenceEvidence: convergence,
    classification: convergence.classification,
    publicationPolicy: definition.publicationPolicy,
    publicationReasons: publication.reasons,
    usableForResultPublication: publication.usableForResultPublication,
    recoverySetHash,
    convergenceProfileHash,
    finalRecoveryHash: finalLevel.recoveryHash,
    releaseQualified: false,
  };
  return freeze({
    ...base,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-convergence-study-evidence-hash/v1',
      evidence: base,
    }),
  });
}

export function createLafeaContinuumConvergenceLifecycleRegistration(studyEvidence) {
  const study = requireStudyEvidence(studyEvidence);
  const pass = study.usableForResultPublication === true;
  const record = createLafeaArtifactRecord({
    stageId: STAGE_ID,
    kind: 'CONVERGENCE',
    status: pass ? 'CURRENT' : 'BLOCKED',
    artifactHash: study.semanticHash,
    parentHashes: {
      recoveryHash: study.finalRecoveryHash,
      recoverySetHash: study.recoverySetHash,
      convergenceProfileHash: study.convergenceProfileHash,
    },
    qualification: pass ? 'PASS' : 'BLOCK',
    producerRef: PRODUCER_REF,
    diagnostics: [],
  });
  return freeze({
    record,
    registrationId: `LAFEA3-CONVERGENCE-${study.semanticHash.slice(7, 23).toUpperCase()}`,
  });
}

function quantityIdentityFromProbe(probe) {
  return freeze({
    schema: LAFEA_CONTINUUM_QUANTITY_IDENTITY_SCHEMA,
    probeId: probe.probeId,
    physicalCoordinate: probe.physicalCoordinate,
    coordinateFrame: probe.coordinateFrame,
    loadCaseId: probe.loadCaseId,
    quantityId: probe.quantityId,
    representation: probe.representation,
    recoveryMethod: probe.recoveryMethod,
    units: probe.units,
    singularityClassification: probe.singularityClassification,
  });
}

function normalizeLevelReceipts(value, definition) {
  if (!Array.isArray(value) || value.length !== definition.convergenceDefinition.levels.length) {
    fail('LAFEA3_CONVERGENCE_LEVEL_RECEIPTS_INVALID');
  }
  return freeze(value.map((row, index) => {
    const declared = definition.convergenceDefinition.levels[index];
    if (!row || row.levelId !== declared.levelId || row.h !== declared.h) {
      fail('LAFEA3_CONVERGENCE_LEVEL_RECEIPT_ORDER_INVALID');
    }
    if (row.probeIdentityHash !== definition.probeIdentityHash
      || row.quantityIdentityHash !== definition.quantityIdentityHash) {
      fail('LAFEA3_CONVERGENCE_LEVEL_RECEIPT_IDENTITY_INVALID');
    }
    return freeze({
      levelId: declared.levelId,
      h: declared.h,
      meshProfileHash: text(row.meshProfileHash, 'LAFEA3_CONVERGENCE_LEVEL_PROFILE_HASH_INVALID'),
      meshHash: sha(row.meshHash, 'LAFEA3_CONVERGENCE_LEVEL_MESH_HASH_INVALID'),
      solverModelHash: sha(row.solverModelHash, 'LAFEA3_CONVERGENCE_LEVEL_SOLVER_HASH_INVALID'),
      executionHash: sha(row.executionHash, 'LAFEA3_CONVERGENCE_LEVEL_EXECUTION_HASH_INVALID'),
      recoveryHash: sha(row.recoveryHash, 'LAFEA3_CONVERGENCE_LEVEL_RECOVERY_HASH_INVALID'),
      probeEvidenceHash: sha(row.probeEvidenceHash, 'LAFEA3_CONVERGENCE_LEVEL_PROBE_HASH_INVALID'),
      probeIdentityHash: row.probeIdentityHash,
      quantityIdentityHash: row.quantityIdentityHash,
      authoritativeValue: finite(row.authoritativeValue, 'LAFEA3_CONVERGENCE_LEVEL_VALUE_INVALID'),
      authoritativeUnits: text(row.authoritativeUnits, 'LAFEA3_CONVERGENCE_LEVEL_UNITS_INVALID'),
    });
  }));
}

function publicationDisposition(convergence) {
  const reasons = [];
  if (convergence.pointwiseAcceptanceEligible !== true) reasons.push('CONVERGENCE_POINTWISE_ACCEPTANCE_INELIGIBLE');
  if (!LAFEA_CONTINUUM_CONVERGENCE_PUBLICATION_POLICY.publishableClassifications
    .includes(convergence.classification)) {
    reasons.push(`CONVERGENCE_CLASSIFICATION_${convergence.classification}_NOT_PUBLISHABLE`);
  }
  return freeze({
    usableForResultPublication: reasons.length === 0,
    reasons: reasons.length ? reasons : ['CONVERGENCE_QUALIFIED_FOR_RESULT_PUBLICATION'],
  });
}

function requireStudyDefinition(value) {
  if (!value || value.schema !== LAFEA_CONTINUUM_CONVERGENCE_STUDY_DEFINITION_SCHEMA
    || value.stageId !== STAGE_ID || value.definitionFrozenBeforeObservations !== true
    || !value.convergenceDefinition || typeof value.semanticHash !== 'string') {
    fail('LAFEA3_CONVERGENCE_STUDY_DEFINITION_INVALID');
  }
  return value;
}
function requireStudyEvidence(value) {
  if (!value || value.schema !== LAFEA_CONTINUUM_CONVERGENCE_STUDY_EVIDENCE_SCHEMA
    || value.stageId !== STAGE_ID || typeof value.semanticHash !== 'string'
    || value.releaseQualified !== false) {
    fail('LAFEA3_CONVERGENCE_STUDY_EVIDENCE_INVALID');
  }
  return value;
}
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, code) { if (typeof value !== 'string' || !value.trim()) fail(code); return value.trim(); }
function sha(value, code) { const out = text(value, code); if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(code); return out; }
function finite(value, code) { if (!Number.isFinite(value)) fail(code); return Object.is(value, -0) ? 0 : value; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
