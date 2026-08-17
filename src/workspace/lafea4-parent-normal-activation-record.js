import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA4_PARENT_NORMAL_ACTIVATION_RECORD_SCHEMA =
  'lafea4-parent-normal-activation-record/v1';
export const LAFEA4_PARENT_NORMAL_ACTIVATION_AUTHORITY =
  'VERIFIED_TECH8_EXACT_HEAD_EVIDENCE_BUNDLE_ONLY_V1';
export const LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS =
  'AUTHORIZED_FOR_FUTURE_PROMOTION';
export const LAFEA4_PARENT_NORMAL_BLOCKED_STATUS = 'BLOCKED_NOT_QUALIFIED';
export const LAFEA4_PARENT_NORMAL_PRODUCT_EFFECT = 'NONE_TECH12D_RECORD_ONLY';

export const LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS = Object.freeze([
  'TECH11_PARENT_NORMAL_STANDALONE_MATH',
  'TECH11_PARENT_NORMAL_INVERSION_HAND_ORACLE',
  'TECH11_PARENT_NORMAL_SAMPLE',
  'TECH12A_PARENT_NORMAL_SHADOW_BATCH',
  'TECH12B_RETAINED_PARENT_NORMAL_COMPANION',
  'TECH12B_COMPANION_ATOMICITY_SOURCE_WIRING',
  'TECH12C_SOLVER_EXECUTION_COMPANION_BINDING',
  'TECH12D_ACTIVATION_RECORD_POLICY',
  'TECH7_GRADED_REFINEMENT_EXECUTOR',
  'SHELL_SAMPLE_PARENT',
  'SHELL_WORKBENCH_ROUTE',
  'SHELL_COMPILED_EXECUTION',
  'MESHING_SUITE',
  'LAFEA_CORE_SUITE',
  'PRODUCTION_BUILD',
  'VISIBLE_WORKBENCH_CHROMIUM',
]);

const INDEPENDENT_QUALIFICATION_ID = 'LAFEA4-INDEPENDENT-QUALIFICATION-V1';
const MANIFEST_SCHEMA = 'lafea-independent-qualification-manifest/v1';
const COMMANDS_SCHEMA = 'lafea-independent-qualification-commands/v1';
const PLAN_SCHEMA = 'lafea-independent-qualification-plan/v1';
const INTEGRITY_SCHEMA = 'lafea-independent-qualification-bundle-integrity/v1';
const OUTPUT_KEYS = Object.freeze([
  'schema', 'stageId', 'authority', 'status', 'reasons', 'expectedHead',
  'qualificationId', 'runId', 'evidenceDigest', 'planSha256', 'runnerSha256',
  'packageLockSha256', 'verifierSha256', 'manifestDisposition', 'qualificationComplete',
  'preflightAccepted', 'postflightAccepted', 'dependencyInstallSucceeded',
  'browserRequested', 'browserProvisionSucceeded', 'requiredEngineeringStepIds',
  'requiredStepDisposition', 'integrityVerified', 'exactCheckoutVerified',
  'toolingParityVerified', 'productEffect', 'hardGateActivated',
  'retainedMeshAcceptanceChanged', 'solverAuthorizationChanged',
  'releaseQualificationChanged', 'productionBindingAuthorized', 'releaseQualified',
  'semanticHash',
]);

/**
 * Convert a verified TECH-8 evidence bundle into a promotion authorization
 * record. This record is deliberately NOT a product gate. It can only state
 * whether a later, separately reviewed change is eligible to promote the
 * parent-normal criterion into solve authority.
 */
export function createLafea4ParentNormalActivationRecord({
  expectedHead,
  evidenceDigest,
  manifest,
  commands,
  plan,
  bundleIntegrity,
}) {
  requireCommit(expectedHead, 'LAFEA4_PARENT_NORMAL_ACTIVATION_EXPECTED_HEAD_INVALID');
  requireDigest(evidenceDigest, 'LAFEA4_PARENT_NORMAL_ACTIVATION_EVIDENCE_DIGEST_INVALID');
  requireRecord(manifest, 'LAFEA4_PARENT_NORMAL_ACTIVATION_MANIFEST_REQUIRED');
  requireRecord(commands, 'LAFEA4_PARENT_NORMAL_ACTIVATION_COMMANDS_REQUIRED');
  requireRecord(plan, 'LAFEA4_PARENT_NORMAL_ACTIVATION_PLAN_REQUIRED');
  if (manifest.schema !== MANIFEST_SCHEMA) fail('LAFEA4_PARENT_NORMAL_ACTIVATION_MANIFEST_SCHEMA_INVALID');
  if (commands.schema !== COMMANDS_SCHEMA) fail('LAFEA4_PARENT_NORMAL_ACTIVATION_COMMANDS_SCHEMA_INVALID');
  if (plan.schema !== PLAN_SCHEMA) fail('LAFEA4_PARENT_NORMAL_ACTIVATION_PLAN_SCHEMA_INVALID');

  requireDigest(manifest.planSha256, 'LAFEA4_PARENT_NORMAL_ACTIVATION_PLAN_HASH_INVALID');
  requireDigest(manifest.runnerSha256, 'LAFEA4_PARENT_NORMAL_ACTIVATION_RUNNER_HASH_INVALID');
  requireDigest(
    manifest.packageLockSha256,
    'LAFEA4_PARENT_NORMAL_ACTIVATION_PACKAGE_LOCK_HASH_INVALID',
  );
  const verifierSha256 = bundleIntegrity?.verifierSha256;
  requireDigest(verifierSha256, 'LAFEA4_PARENT_NORMAL_ACTIVATION_VERIFIER_HASH_INVALID');
  if (typeof manifest.runId !== 'string' || !manifest.runId) {
    fail('LAFEA4_PARENT_NORMAL_ACTIVATION_RUN_ID_INVALID');
  }

  const reasons = [];
  const integrityVerified = bundleIntegrity?.schema === INTEGRITY_SCHEMA
    && bundleIntegrity?.verified === true
    && bundleIntegrity?.evidenceDigest === evidenceDigest;
  const exactCheckoutVerified = bundleIntegrity?.exactCheckoutVerified === true;
  const toolingParityVerified = bundleIntegrity?.toolingParityVerified === true;
  if (!integrityVerified) reasons.push('INDEPENDENT_EVIDENCE_INTEGRITY_NOT_VERIFIED');
  if (!exactCheckoutVerified) reasons.push('ACTIVATION_CHECKOUT_NOT_EXACT_HEAD_CLEAN');
  if (!toolingParityVerified) reasons.push('ACTIVATION_TOOLING_PARITY_NOT_VERIFIED');

  const qualificationId = manifest.qualificationId;
  if (qualificationId !== INDEPENDENT_QUALIFICATION_ID
    || commands.qualificationId !== INDEPENDENT_QUALIFICATION_ID
    || plan.qualificationId !== INDEPENDENT_QUALIFICATION_ID) {
    reasons.push('INDEPENDENT_QUALIFICATION_ID_MISMATCH');
  }
  if (manifest.expectedHead !== expectedHead
    || manifest.currentHead !== expectedHead
    || commands.expectedHead !== expectedHead) {
    reasons.push('EXACT_HEAD_BINDING_INVALID');
  }
  if (manifest.disposition !== 'PASS') reasons.push('MANIFEST_DISPOSITION_NOT_PASS');
  if (manifest.qualificationComplete !== true) reasons.push('QUALIFICATION_NOT_COMPLETE');
  if (manifest.preflightAccepted !== true) reasons.push('PREFLIGHT_NOT_ACCEPTED');
  if (manifest.postflightAccepted !== true) reasons.push('POSTFLIGHT_NOT_ACCEPTED');
  if (manifest.dependencyInstallSucceeded !== true) reasons.push('DEPENDENCY_INSTALL_NOT_PASS');
  if (manifest.browserRequested !== true) reasons.push('BROWSER_NOT_REQUESTED');
  if (manifest.browserProvisionSucceeded !== true) reasons.push('BROWSER_NOT_PROVISIONED');

  const planSteps = Array.isArray(plan.steps) ? plan.steps : [];
  const planIds = planSteps.map((row) => row?.id);
  const planIdSet = new Set(planIds);
  if (planIds.length !== planIdSet.size) reasons.push('PLAN_STEP_IDS_NOT_UNIQUE');
  const commandRecords = Array.isArray(commands.records) ? commands.records : [];
  const recordsById = new Map();
  for (const row of commandRecords) {
    if (!row || typeof row.id !== 'string') continue;
    if (recordsById.has(row.id)) reasons.push(`COMMAND_STEP_DUPLICATE:${row.id}`);
    recordsById.set(row.id, row);
  }

  // TECH-8's generic verifier derives disposition from the records it sees.
  // Promotion is stricter: every step declared required by the exact checked-in
  // plan must have one matching command record and that record must PASS.
  for (const step of planSteps.filter((row) => row?.required === true)) {
    const row = recordsById.get(step.id);
    if (!row) {
      reasons.push(`PLAN_REQUIRED_STEP_RESULT_MISSING:${step.id}`);
      continue;
    }
    if (row.required !== true || row.classification !== step.classification) {
      reasons.push(`PLAN_REQUIRED_STEP_AUTHORITY_MISMATCH:${step.id}`);
    }
    if (row.disposition !== 'PASS') {
      reasons.push(`PLAN_REQUIRED_STEP_NOT_PASS:${step.id}:${row.disposition}`);
    }
  }
  for (const [kind, step] of [
    ['DEPENDENCY_INSTALL', plan.dependencyInstall],
    ['BROWSER_PROVISION', plan.browserProvision],
  ]) {
    if (!step || typeof step.id !== 'string') {
      reasons.push(`${kind}_PLAN_RECORD_MISSING`);
      continue;
    }
    const row = recordsById.get(step.id);
    if (!row) {
      reasons.push(`${kind}_COMMAND_RECORD_MISSING`);
      continue;
    }
    if (row.required !== true || row.classification !== 'INFRASTRUCTURE') {
      reasons.push(`${kind}_COMMAND_AUTHORITY_INVALID`);
    }
    if (row.disposition !== 'PASS') {
      reasons.push(`${kind}_COMMAND_NOT_PASS:${row.disposition}`);
    }
  }

  const requiredStepDisposition = {};
  for (const stepId of LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS) {
    if (!planIdSet.has(stepId)) reasons.push(`REQUIRED_STEP_NOT_IN_PLAN:${stepId}`);
    const row = recordsById.get(stepId);
    const disposition = row?.disposition ?? 'MISSING';
    requiredStepDisposition[stepId] = disposition;
    if (!row) {
      reasons.push(`REQUIRED_STEP_RESULT_MISSING:${stepId}`);
      continue;
    }
    if (row.classification !== 'ENGINEERING' || row.required !== true) {
      reasons.push(`REQUIRED_STEP_AUTHORITY_INVALID:${stepId}`);
    }
    if (row.disposition !== 'PASS') {
      reasons.push(`REQUIRED_STEP_NOT_PASS:${stepId}:${row.disposition}`);
    }
  }

  const status = reasons.length === 0
    ? LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS
    : LAFEA4_PARENT_NORMAL_BLOCKED_STATUS;
  const core = {
    schema: LAFEA4_PARENT_NORMAL_ACTIVATION_RECORD_SCHEMA,
    stageId: 'LAFEA.4',
    authority: LAFEA4_PARENT_NORMAL_ACTIVATION_AUTHORITY,
    status,
    reasons: Object.freeze([...new Set(reasons)].sort()),
    expectedHead,
    qualificationId,
    runId: manifest.runId,
    evidenceDigest,
    planSha256: manifest.planSha256,
    runnerSha256: manifest.runnerSha256,
    packageLockSha256: manifest.packageLockSha256,
    verifierSha256,
    manifestDisposition: manifest.disposition,
    qualificationComplete: manifest.qualificationComplete === true,
    preflightAccepted: manifest.preflightAccepted === true,
    postflightAccepted: manifest.postflightAccepted === true,
    dependencyInstallSucceeded: manifest.dependencyInstallSucceeded === true,
    browserRequested: manifest.browserRequested === true,
    browserProvisionSucceeded: manifest.browserProvisionSucceeded === true,
    requiredEngineeringStepIds: LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS,
    requiredStepDisposition: freeze(requiredStepDisposition),
    integrityVerified,
    exactCheckoutVerified,
    toolingParityVerified,
    productEffect: LAFEA4_PARENT_NORMAL_PRODUCT_EFFECT,
    hardGateActivated: false,
    retainedMeshAcceptanceChanged: false,
    solverAuthorizationChanged: false,
    releaseQualificationChanged: false,
    productionBindingAuthorized: false,
    releaseQualified: false,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-parent-normal-activation-record-hash-input/v1',
      record: core,
    }),
  });
}

export function validateLafea4ParentNormalActivationRecord(value) {
  exactKeys(value, OUTPUT_KEYS, 'LAFEA4_PARENT_NORMAL_ACTIVATION_RECORD_KEYS_INVALID');
  if (value.schema !== LAFEA4_PARENT_NORMAL_ACTIVATION_RECORD_SCHEMA
    || value.stageId !== 'LAFEA.4'
    || value.authority !== LAFEA4_PARENT_NORMAL_ACTIVATION_AUTHORITY
    || ![LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS, LAFEA4_PARENT_NORMAL_BLOCKED_STATUS]
      .includes(value.status)
    || value.productEffect !== LAFEA4_PARENT_NORMAL_PRODUCT_EFFECT
    || value.hardGateActivated !== false
    || value.retainedMeshAcceptanceChanged !== false
    || value.solverAuthorizationChanged !== false
    || value.releaseQualificationChanged !== false
    || value.productionBindingAuthorized !== false
    || value.releaseQualified !== false) {
    fail('LAFEA4_PARENT_NORMAL_ACTIVATION_RECORD_CONTRACT_INVALID');
  }
  requireCommit(value.expectedHead, 'LAFEA4_PARENT_NORMAL_ACTIVATION_EXPECTED_HEAD_INVALID');
  for (const [field, hash] of Object.entries({
    evidenceDigest: value.evidenceDigest,
    planSha256: value.planSha256,
    runnerSha256: value.runnerSha256,
    packageLockSha256: value.packageLockSha256,
    verifierSha256: value.verifierSha256,
  })) requireDigest(hash, `LAFEA4_PARENT_NORMAL_ACTIVATION_${field.toUpperCase()}_INVALID`);
  if (value.qualificationId !== INDEPENDENT_QUALIFICATION_ID
    || typeof value.runId !== 'string' || !value.runId) {
    fail('LAFEA4_PARENT_NORMAL_ACTIVATION_PROVENANCE_INVALID');
  }
  if (!Array.isArray(value.reasons) || value.reasons.some((row) => typeof row !== 'string')) {
    fail('LAFEA4_PARENT_NORMAL_ACTIVATION_REASONS_INVALID');
  }
  if (JSON.stringify(value.requiredEngineeringStepIds)
    !== JSON.stringify(LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS)) {
    fail('LAFEA4_PARENT_NORMAL_ACTIVATION_REQUIRED_STEPS_INVALID');
  }
  const dispositionKeys = Object.keys(value.requiredStepDisposition ?? {}).sort();
  const requiredKeys = [...LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS].sort();
  if (JSON.stringify(dispositionKeys) !== JSON.stringify(requiredKeys)
    || Object.values(value.requiredStepDisposition).some(
      (row) => !['PASS', 'FAIL', 'NOT_RUN', 'MISSING'].includes(row),
    )) {
    fail('LAFEA4_PARENT_NORMAL_ACTIVATION_STEP_DISPOSITION_INVALID');
  }
  const shouldAuthorize = value.integrityVerified === true
    && value.exactCheckoutVerified === true
    && value.toolingParityVerified === true
    && value.manifestDisposition === 'PASS'
    && value.qualificationComplete === true
    && value.preflightAccepted === true
    && value.postflightAccepted === true
    && value.dependencyInstallSucceeded === true
    && value.browserRequested === true
    && value.browserProvisionSucceeded === true
    && Object.values(value.requiredStepDisposition).every((row) => row === 'PASS')
    && value.reasons.length === 0;
  if ((value.status === LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS) !== shouldAuthorize) {
    fail('LAFEA4_PARENT_NORMAL_ACTIVATION_STATUS_INVALID');
  }
  const core = { ...value };
  delete core.semanticHash;
  const expectedHash = canonicalLafeaSha256({
    schema: 'lafea4-parent-normal-activation-record-hash-input/v1',
    record: core,
  });
  if (value.semanticHash !== expectedHash) {
    fail('LAFEA4_PARENT_NORMAL_ACTIVATION_RECORD_HASH_INVALID');
  }
  return freeze(structuredClone(value));
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    fail(code);
  }
}
function requireRecord(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  return value;
}
function requireCommit(value, code) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/u.test(value)) fail(code);
}
function requireDigest(value, code) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/u.test(value)) fail(code);
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
