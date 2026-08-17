import { semanticHash } from '../../../shared-primitives/canonical-json.js';
import { validateWrc537Ed4EngineeringDatasetCandidate } from './ed4-engineering-dataset.js';
import { validateWrc537Ed4CalculationPlan } from './ed4-numerical-adapter.js';
import { validateWrc537Ed4ExecutablePlan } from './ed4-execution-engine.js';
import {
  WRC537_ED4_NUMERICAL_QUALIFICATION_PASS,
  validateWrc537Ed4NumericalQualificationEvidence,
  validateWrc537Ed4NumericalQualificationSuite,
} from './ed4-qualification-engine.js';

export const WRC537_ED4_NUMERICAL_RELEASE_CANDIDATE_SCHEMA = 'wrc537-ed4-numerical-release-candidate/v1';
const AUTHORITY = Object.freeze({
  engineeringUseAuthorized: false,
  authorizationBasis: 'NUMERICALLY_QUALIFIED_CANDIDATE_AWAITING_INDEPENDENT_APPROVAL_AND_TRUST',
});
const BINDING_TYPES = Object.freeze(['DATASET_COEFFICIENT', 'SOURCE_LITERAL']);

export function createWrc537Ed4NumericalReleaseCandidate(
  datasetInput, calculationPlanInput, executablePlanInput, suiteInput, evidenceInput, input,
) {
  const dataset = validateWrc537Ed4EngineeringDatasetCandidate(datasetInput);
  const calculationPlan = validateWrc537Ed4CalculationPlan(dataset, calculationPlanInput);
  const executablePlan = validateWrc537Ed4ExecutablePlan(dataset, calculationPlan, executablePlanInput);
  const suite = validateWrc537Ed4NumericalQualificationSuite(dataset, calculationPlan, executablePlan, suiteInput);
  const evidence = validateWrc537Ed4NumericalQualificationEvidence(
    dataset, calculationPlan, executablePlan, suite, evidenceInput,
  );
  if (evidence.status !== WRC537_ED4_NUMERICAL_QUALIFICATION_PASS) {
    fail('WRC537_ED4_NUMERICAL_RELEASE_QUALIFICATION_NOT_PASS', 'evidence.status');
  }
  requireObject(input, 'releaseCandidateInput');
  exactKeys(input, ['schema', 'candidateIdentity', 'candidateVersion', 'literalBindings'], 'releaseCandidateInput');
  if (input.schema !== WRC537_ED4_NUMERICAL_RELEASE_CANDIDATE_SCHEMA) {
    fail('WRC537_ED4_NUMERICAL_RELEASE_SCHEMA_MISMATCH', 'releaseCandidateInput.schema');
  }
  requiredString(input.candidateIdentity, 'releaseCandidateInput.candidateIdentity');
  requiredString(input.candidateVersion, 'releaseCandidateInput.candidateVersion');
  const literalInventory = executableLiteralInventory(executablePlan);
  const literalBindings = validateLiteralBindings(input.literalBindings, literalInventory, dataset);

  const base = {
    schema: WRC537_ED4_NUMERICAL_RELEASE_CANDIDATE_SCHEMA,
    candidateIdentity: input.candidateIdentity,
    candidateVersion: input.candidateVersion,
    datasetSemanticHash: dataset.datasetSemanticHash,
    planSemanticHash: calculationPlan.planSemanticHash,
    executablePlanSemanticHash: executablePlan.executablePlanSemanticHash,
    suiteSemanticHash: suite.suiteSemanticHash,
    evidenceSemanticHash: evidence.evidenceSemanticHash,
    literalInventory,
    literalBindings,
    authority: clone(AUTHORITY),
  };
  return freeze({ ...base, candidateSemanticHash: semanticHash(base) });
}

export function validateWrc537Ed4NumericalReleaseCandidate(
  datasetInput, calculationPlanInput, executablePlanInput, suiteInput, evidenceInput, value,
) {
  requireObject(value, 'releaseCandidate');
  exactKeys(value, [
    'schema', 'candidateIdentity', 'candidateVersion', 'datasetSemanticHash', 'planSemanticHash',
    'executablePlanSemanticHash', 'suiteSemanticHash', 'evidenceSemanticHash', 'literalInventory',
    'literalBindings', 'authority', 'candidateSemanticHash',
  ], 'releaseCandidate');
  exactKeys(value.authority, ['engineeringUseAuthorized', 'authorizationBasis'], 'releaseCandidate.authority');
  if (value.authority.engineeringUseAuthorized !== false || value.authority.authorizationBasis !== AUTHORITY.authorizationBasis) {
    fail('WRC537_ED4_NUMERICAL_RELEASE_AUTHORITY_INVALID', 'releaseCandidate.authority');
  }
  const recreated = createWrc537Ed4NumericalReleaseCandidate(
    datasetInput, calculationPlanInput, executablePlanInput, suiteInput, evidenceInput,
    {
      schema: value.schema,
      candidateIdentity: value.candidateIdentity,
      candidateVersion: value.candidateVersion,
      literalBindings: value.literalBindings,
    },
  );
  if (semanticHash(value.literalInventory) !== semanticHash(recreated.literalInventory)
    || recreated.candidateSemanticHash !== value.candidateSemanticHash) {
    fail('WRC537_ED4_NUMERICAL_RELEASE_REPLAY_MISMATCH', 'releaseCandidate.candidateSemanticHash');
  }
  return recreated;
}

export function wrc537Ed4NumericalReleaseCandidateCanActivateEngineering(
  datasetInput, calculationPlanInput, executablePlanInput, suiteInput, evidenceInput, candidateInput,
) {
  validateWrc537Ed4NumericalReleaseCandidate(
    datasetInput, calculationPlanInput, executablePlanInput, suiteInput, evidenceInput, candidateInput,
  );
  return false;
}

export function executableLiteralInventory(executablePlanInput) {
  requireObject(executablePlanInput, 'executablePlan');
  const rows = [];
  executablePlanInput.equationImplementations.forEach((implementation) => {
    collectGraphLiterals(
      implementation.graph,
      `EQUATION:${implementation.equationId}:graph`,
      implementation.sourceRef,
      implementation.sourceLocator,
      rows,
    );
  });
  executablePlanInput.interpolationImplementations.forEach((implementation) => {
    collectGraphLiterals(
      implementation.graph,
      `INTERPOLATION:${implementation.ruleId}:graph`,
      implementation.sourceRef,
      implementation.sourceLocator,
      rows,
    );
  });
  rows.sort((a, b) => a.literalKey.localeCompare(b.literalKey));
  return freeze(rows);
}

function collectGraphLiterals(node, path, sourceRef, sourceLocator, rows) {
  if (node.op === 'CONST') rows.push({ literalKey: `${path}.value`, value: node.value, sourceRef, sourceLocator });
  if (node.op === 'POLYNOMIAL') {
    node.coefficients.forEach((value, index) => rows.push({
      literalKey: `${path}.coefficients[${index}]`, value, sourceRef, sourceLocator,
    }));
  }
  if (node.arg) collectGraphLiterals(node.arg, `${path}.arg`, sourceRef, sourceLocator, rows);
  if (Array.isArray(node.args)) node.args.forEach((child, index) =>
    collectGraphLiterals(child, `${path}.args[${index}]`, sourceRef, sourceLocator, rows));
  if (node.x) collectGraphLiterals(node.x, `${path}.x`, sourceRef, sourceLocator, rows);
  ['x0', 'x1', 'y0', 'y1'].forEach((key) => {
    if (node[key]) collectGraphLiterals(node[key], `${path}.${key}`, sourceRef, sourceLocator, rows);
  });
}

function validateLiteralBindings(rows, inventory, dataset) {
  requireArray(rows, 'releaseCandidateInput.literalBindings');
  const expected = inventory.map((row) => row.literalKey).sort();
  const actual = rows.map((row, index) => requiredString(row.literalKey, `releaseCandidateInput.literalBindings[${index}].literalKey`));
  if (new Set(actual).size !== actual.length || actual.slice().sort().join('|') !== expected.join('|')) {
    fail('WRC537_ED4_NUMERICAL_RELEASE_LITERAL_BINDING_SET_MISMATCH', 'releaseCandidateInput.literalBindings');
  }
  const inventoryByKey = new Map(inventory.map((row) => [row.literalKey, row]));
  const coefficientById = new Map(dataset.coefficientRows.map((row) => [row.coefficient_id, row]));
  const bindings = rows.map((row, index) => {
    const path = `releaseCandidateInput.literalBindings[${index}]`;
    exactKeys(row, ['literalKey', 'bindingType', 'coefficientId', 'sourceRef', 'sourceLocator'], path);
    if (!BINDING_TYPES.includes(row.bindingType)) fail('WRC537_ED4_NUMERICAL_RELEASE_BINDING_TYPE_INVALID', `${path}.bindingType`);
    const literal = inventoryByKey.get(row.literalKey);
    if (row.bindingType === 'DATASET_COEFFICIENT') {
      requiredString(row.coefficientId, `${path}.coefficientId`);
      const coefficient = coefficientById.get(row.coefficientId);
      if (!coefficient) fail('WRC537_ED4_NUMERICAL_RELEASE_COEFFICIENT_UNKNOWN', `${path}.coefficientId`);
      const value = Number(coefficient.coefficient_value);
      if (!Number.isFinite(value) || value !== literal.value) {
        fail('WRC537_ED4_NUMERICAL_RELEASE_COEFFICIENT_VALUE_MISMATCH', path);
      }
      if (row.sourceRef !== coefficient.source_ref || row.sourceLocator !== coefficient.source_locator) {
        fail('WRC537_ED4_NUMERICAL_RELEASE_COEFFICIENT_SOURCE_MISMATCH', path);
      }
    } else {
      if (row.coefficientId !== null) fail('WRC537_ED4_NUMERICAL_RELEASE_SOURCE_LITERAL_COEFFICIENT_MUST_BE_NULL', `${path}.coefficientId`);
      if (row.sourceRef !== literal.sourceRef || row.sourceLocator !== literal.sourceLocator) {
        fail('WRC537_ED4_NUMERICAL_RELEASE_SOURCE_LITERAL_BINDING_MISMATCH', path);
      }
    }
    return clone(row);
  });
  bindings.sort((a, b) => a.literalKey.localeCompare(b.literalKey));
  return freeze(bindings);
}

function exactKeys(value, expected, path) {
  requireObject(value, path);
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) fail('WRC537_ED4_EXACT_KEYS_MISMATCH', path);
}
function requiredString(value, path) { if (typeof value !== 'string' || !value.trim()) fail('WRC537_ED4_STRING_REQUIRED', path); return value; }
function requireObject(value, path) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail('WRC537_ED4_OBJECT_REQUIRED', path); }
function requireArray(value, path) { if (!Array.isArray(value)) fail('WRC537_ED4_ARRAY_REQUIRED', path); }
function clone(value) { return structuredClone(value); }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
function fail(code, path) { const error = new Error(code); error.code = code; error.path = path; throw error; }
