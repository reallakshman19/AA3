import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS,
  validateLafea4ParentNormalActivationRecord,
} from './lafea4-parent-normal-activation-record.js';
import {
  validateLafea4RetainedMeshParentNormalCompanion,
} from './lafea4-shell-retained-mesh-parent-normal-companion.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY,
  LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD,
} from './lafea4-parent-normal-production-activation.js';

export const LAFEA4_PARENT_NORMAL_PRODUCTION_AUTHORITY_SCHEMA =
  'lafea4-parent-normal-production-authority/v1';
export const LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_SCHEMA =
  'lafea4-parent-normal-production-gate/v1';
export const LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE =
  'LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCKED';
export const LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_INACTIVE_CODE =
  'LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_INACTIVE';

const AUTHORITY_KEYS = Object.freeze([
  'schema', 'stageId', 'policy', 'status', 'activationRecordHash',
  'activationExpectedHead', 'activationEvidenceDigest', 'hardGateActivated',
  'productionBindingAuthorized', 'semanticHash',
]);
const GATE_KEYS = Object.freeze([
  'schema', 'stageId', 'authorityHash', 'authorityStatus', 'activationRecordHash',
  'activationExpectedHead', 'activationEvidenceDigest', 'hardGateActivated',
  'companionHash', 'candidateQualification', 'gateDisposition',
  'retainedMeshAccepted', 'solverExecutionAuthorized', 'diagnosticCode',
  'productionBindingAuthorized', 'releaseQualified', 'semanticHash',
]);

/**
 * Return the only production authority the product may consume.
 *
 * There is intentionally no caller-supplied authority parameter. Current
 * TECH-12E source has a null activation record, therefore the hard gate is
 * deterministically inactive. A later trust-root-only change may replace the
 * null record with the exact reviewed TECH-12D artifact.
 */
export function currentLafea4ParentNormalProductionAuthority() {
  const candidate = LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD;
  if (candidate === null) {
    return authorityRecord({
      status: 'INACTIVE_PENDING_TRUSTED_TECH12D_RECORD',
      activationRecordHash: null,
      activationExpectedHead: null,
      activationEvidenceDigest: null,
      hardGateActivated: false,
      productionBindingAuthorized: false,
    });
  }

  const activation = validateLafea4ParentNormalActivationRecord(candidate);
  if (activation.status !== LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS) {
    fail('LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_NOT_AUTHORIZED');
  }
  return authorityRecord({
    status: 'ACTIVE_TRUSTED_TECH12D_RECORD',
    activationRecordHash: activation.semanticHash,
    activationExpectedHead: activation.expectedHead,
    activationEvidenceDigest: activation.evidenceDigest,
    hardGateActivated: true,
    productionBindingAuthorized: true,
  });
}

export function validateLafea4ParentNormalProductionAuthority(value) {
  exactKeys(value, AUTHORITY_KEYS, 'LAFEA4_PARENT_NORMAL_PRODUCTION_AUTHORITY_KEYS_INVALID');
  if (value.schema !== LAFEA4_PARENT_NORMAL_PRODUCTION_AUTHORITY_SCHEMA
    || value.stageId !== 'LAFEA.4'
    || value.policy !== LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY
    || ![
      'INACTIVE_PENDING_TRUSTED_TECH12D_RECORD',
      'ACTIVE_TRUSTED_TECH12D_RECORD',
    ].includes(value.status)) {
    fail('LAFEA4_PARENT_NORMAL_PRODUCTION_AUTHORITY_INVALID');
  }
  const active = value.status === 'ACTIVE_TRUSTED_TECH12D_RECORD';
  if (value.hardGateActivated !== active
    || value.productionBindingAuthorized !== active) {
    fail('LAFEA4_PARENT_NORMAL_PRODUCTION_AUTHORITY_EFFECT_INVALID');
  }
  if (active) {
    requireSemanticHash(value.activationRecordHash);
    requireCommit(value.activationExpectedHead);
    requireDigest(value.activationEvidenceDigest);
  } else if (value.activationRecordHash !== null
    || value.activationExpectedHead !== null
    || value.activationEvidenceDigest !== null) {
    fail('LAFEA4_PARENT_NORMAL_PRODUCTION_AUTHORITY_INACTIVE_PROVENANCE_INVALID');
  }
  requireSemanticHash(value.semanticHash);
  const core = { ...value };
  delete core.semanticHash;
  const expected = canonicalLafeaSha256({
    schema: 'lafea4-parent-normal-production-authority-hash-input/v1',
    authority: core,
  });
  if (value.semanticHash !== expected) {
    fail('LAFEA4_PARENT_NORMAL_PRODUCTION_AUTHORITY_HASH_INVALID');
  }
  return freeze(structuredClone(value));
}

/**
 * Evaluate the current production decision for one exact retained companion.
 * Product callers cannot inject activation authority; this function always
 * resolves the code-owned trust root itself.
 */
export function evaluateLafea4ParentNormalProductionGate({ companion }) {
  const retainedCompanion = validateLafea4RetainedMeshParentNormalCompanion(companion);
  const authority = validateLafea4ParentNormalProductionAuthority(
    currentLafea4ParentNormalProductionAuthority(),
  );
  const decision = qualificationEvaluateLafea4ParentNormalProductionGateDecisionKernel({
    candidateQualification: retainedCompanion.candidateQualification,
    hardGateActivated: authority.hardGateActivated,
  });
  const core = {
    schema: LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_SCHEMA,
    stageId: 'LAFEA.4',
    authorityHash: authority.semanticHash,
    authorityStatus: authority.status,
    activationRecordHash: authority.activationRecordHash,
    activationExpectedHead: authority.activationExpectedHead,
    activationEvidenceDigest: authority.activationEvidenceDigest,
    hardGateActivated: authority.hardGateActivated,
    companionHash: retainedCompanion.semanticHash,
    candidateQualification: retainedCompanion.candidateQualification,
    gateDisposition: decision.gateDisposition,
    retainedMeshAccepted: decision.retainedMeshAccepted,
    solverExecutionAuthorized: decision.solverExecutionAuthorized,
    diagnosticCode: decision.diagnosticCode,
    productionBindingAuthorized: authority.productionBindingAuthorized,
    releaseQualified: false,
  };
  return validateLafea4ParentNormalProductionGate(freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-parent-normal-production-gate-hash-input/v1',
      gate: core,
    }),
  }));
}

export function validateLafea4ParentNormalProductionGate(value) {
  exactKeys(value, GATE_KEYS, 'LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_KEYS_INVALID');
  if (value.schema !== LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_SCHEMA
    || value.stageId !== 'LAFEA.4'
    || !['PASS', 'BLOCK'].includes(value.candidateQualification)
    || !['NOT_ENFORCED', 'ALLOW', 'BLOCK'].includes(value.gateDisposition)
    || typeof value.retainedMeshAccepted !== 'boolean'
    || typeof value.solverExecutionAuthorized !== 'boolean'
    || typeof value.hardGateActivated !== 'boolean'
    || typeof value.productionBindingAuthorized !== 'boolean'
    || value.releaseQualified !== false) {
    fail('LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_INVALID');
  }
  requireSemanticHash(value.authorityHash);
  requireSemanticHash(value.companionHash);
  const expectedDecision = qualificationEvaluateLafea4ParentNormalProductionGateDecisionKernel({
    candidateQualification: value.candidateQualification,
    hardGateActivated: value.hardGateActivated,
  });
  if (value.gateDisposition !== expectedDecision.gateDisposition
    || value.retainedMeshAccepted !== expectedDecision.retainedMeshAccepted
    || value.solverExecutionAuthorized !== expectedDecision.solverExecutionAuthorized
    || value.diagnosticCode !== expectedDecision.diagnosticCode
    || value.productionBindingAuthorized !== value.hardGateActivated) {
    fail('LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_DECISION_INVALID');
  }
  if (value.hardGateActivated) {
    if (value.authorityStatus !== 'ACTIVE_TRUSTED_TECH12D_RECORD') {
      fail('LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_ACTIVE_AUTHORITY_INVALID');
    }
    requireSemanticHash(value.activationRecordHash);
    requireCommit(value.activationExpectedHead);
    requireDigest(value.activationEvidenceDigest);
  } else if (value.authorityStatus !== 'INACTIVE_PENDING_TRUSTED_TECH12D_RECORD'
    || value.activationRecordHash !== null
    || value.activationExpectedHead !== null
    || value.activationEvidenceDigest !== null) {
    fail('LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_INACTIVE_AUTHORITY_INVALID');
  }
  requireSemanticHash(value.semanticHash);
  const core = { ...value };
  delete core.semanticHash;
  const expected = canonicalLafeaSha256({
    schema: 'lafea4-parent-normal-production-gate-hash-input/v1',
    gate: core,
  });
  if (value.semanticHash !== expected) {
    fail('LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_HASH_INVALID');
  }
  return freeze(structuredClone(value));
}

/**
 * Qualification-only pure decision kernel. It has no source of authority and
 * cannot activate product behavior by itself. TECH-12E uses it to freeze both
 * future active branches while the production trust root remains empty.
 */
export function qualificationEvaluateLafea4ParentNormalProductionGateDecisionKernel({
  candidateQualification,
  hardGateActivated,
}) {
  if (!['PASS', 'BLOCK'].includes(candidateQualification)
    || typeof hardGateActivated !== 'boolean') {
    fail('LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_DECISION_INPUT_INVALID');
  }
  if (!hardGateActivated) {
    return freeze({
      gateDisposition: 'NOT_ENFORCED',
      retainedMeshAccepted: true,
      solverExecutionAuthorized: true,
      diagnosticCode: LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_INACTIVE_CODE,
    });
  }
  if (candidateQualification === 'PASS') {
    return freeze({
      gateDisposition: 'ALLOW',
      retainedMeshAccepted: true,
      solverExecutionAuthorized: true,
      diagnosticCode: null,
    });
  }
  return freeze({
    gateDisposition: 'BLOCK',
    retainedMeshAccepted: false,
    solverExecutionAuthorized: false,
    diagnosticCode: LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE,
  });
}

function authorityRecord(fields) {
  const core = {
    schema: LAFEA4_PARENT_NORMAL_PRODUCTION_AUTHORITY_SCHEMA,
    stageId: 'LAFEA.4',
    policy: LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY,
    ...fields,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-parent-normal-production-authority-hash-input/v1',
      authority: core,
    }),
  });
}
function exactKeys(value, expected, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    fail(code);
  }
}
function requireCommit(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/u.test(value)) {
    fail('LAFEA4_PARENT_NORMAL_PRODUCTION_COMMIT_INVALID');
  }
}
function requireDigest(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/u.test(value)) {
    fail('LAFEA4_PARENT_NORMAL_PRODUCTION_DIGEST_INVALID');
  }
}
function requireSemanticHash(value) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    fail('LAFEA4_PARENT_NORMAL_PRODUCTION_SEMANTIC_HASH_INVALID');
  }
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
