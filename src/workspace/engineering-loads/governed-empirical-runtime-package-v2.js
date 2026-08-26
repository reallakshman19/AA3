import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../../core/shared-piping-model/immutable.js';
import {
  requireGovernedEmpiricalGravityMethodSelection,
} from './empirical-gravity-method-selection.js';
import {
  AUTHORIZED_EMPIRICAL_RUNTIME_PACKAGE_V2_SCHEMA,
  requireAuthorizedEmpiricalRuntimePackageV2,
  sealAuthorizedEmpiricalRuntimePackageV2,
} from './authorized-empirical-runtime-package-v2.js';
import {
  EMPIRICAL_LOAD_COG_METHOD,
  EMPIRICAL_LOAD_METHOD,
} from './support-load-distribution-v3.js';

export const GOVERNED_EMPIRICAL_RUNTIME_PACKAGE_PROJECTION_V2_SCHEMA =
  'governed-empirical-runtime-package-projection/v1';

const INPUT_KEYS = Object.freeze([
  'schema', 'governedSelection', 'packageContext',
]);
const OUTPUT_KEYS = Object.freeze([
  'schema', 'governedSelection', 'runtimePackage', 'semanticHash',
]);
const PACKAGE_CONTEXT_KEYS = Object.freeze([
  'packageId', 'configuredAt', 'executionId', 'executedAt',
  'authorizedInput', 'bindings',
]);
const EXECUTABLE_METHODS = Object.freeze([
  EMPIRICAL_LOAD_METHOD,
  EMPIRICAL_LOAD_COG_METHOD,
]);

/**
 * Converts an already-governed gravity-method selection into the exact
 * method-bound V2 runtime package. AUTO is resolved before this boundary.
 *
 * This projection does not create execution authorization, currentness, or
 * calculation eligibility. Those remain owned by the existing V2 runtime
 * package/store/controller contracts.
 */
export function createGovernedEmpiricalRuntimePackageProjectionV2(value) {
  exact(value, INPUT_KEYS, 'governedEmpiricalRuntimePackageProjectionV2Input');
  if (value.schema !== GOVERNED_EMPIRICAL_RUNTIME_PACKAGE_PROJECTION_V2_SCHEMA) {
    fail(
      'Unsupported governed empirical runtime-package projection input.',
      'EMPIRICAL_GOVERNED_RUNTIME_PROJECTION_SCHEMA_INVALID',
    );
  }
  exact(value.packageContext, PACKAGE_CONTEXT_KEYS, 'packageContext');
  const governedSelection = requireGovernedEmpiricalGravityMethodSelection(
    value.governedSelection,
  );
  const method = selectedExecutableMethod(governedSelection);
  const runtimePackage = sealAuthorizedEmpiricalRuntimePackageV2({
    schema: AUTHORIZED_EMPIRICAL_RUNTIME_PACKAGE_V2_SCHEMA,
    method,
    ...value.packageContext,
  });
  const draft = {
    schema: GOVERNED_EMPIRICAL_RUNTIME_PACKAGE_PROJECTION_V2_SCHEMA,
    governedSelection,
    runtimePackage,
    semanticHash: 'fnv1a64:0000000000000000',
  };
  return requireGovernedEmpiricalRuntimePackageProjectionV2({
    ...draft,
    semanticHash: computeGovernedEmpiricalRuntimePackageProjectionV2SemanticHash(draft),
  });
}

export function governedEmpiricalRuntimePackageProjectionV2SemanticProjection(value) {
  return Object.fromEntries(OUTPUT_KEYS
    .filter((key) => key !== 'semanticHash')
    .map((key) => [key, value[key]]));
}

export function computeGovernedEmpiricalRuntimePackageProjectionV2SemanticHash(value) {
  return semanticHash(governedEmpiricalRuntimePackageProjectionV2SemanticProjection(value));
}

export function requireGovernedEmpiricalRuntimePackageProjectionV2(value) {
  exact(value, OUTPUT_KEYS, 'governedEmpiricalRuntimePackageProjectionV2');
  if (value.schema !== GOVERNED_EMPIRICAL_RUNTIME_PACKAGE_PROJECTION_V2_SCHEMA) {
    fail(
      'Unsupported governed empirical runtime-package projection.',
      'EMPIRICAL_GOVERNED_RUNTIME_PROJECTION_SCHEMA_INVALID',
    );
  }
  const governedSelection = requireGovernedEmpiricalGravityMethodSelection(
    value.governedSelection,
  );
  const selectedMethod = selectedExecutableMethod(governedSelection);
  const runtimePackage = requireAuthorizedEmpiricalRuntimePackageV2(value.runtimePackage);
  if (runtimePackage.method !== selectedMethod) {
    fail(
      'Runtime package method differs from the governed selected method.',
      'EMPIRICAL_GOVERNED_RUNTIME_METHOD_MISMATCH',
      {
        selectedMethod,
        runtimePackageMethod: runtimePackage.method,
      },
    );
  }
  const governedProjectDataSemanticHash =
    governedSelection.gravityMethodAuthority.projectDataSemanticHash;
  if (
    runtimePackage.bindings.projectDataProfileSemanticHash
    !== governedProjectDataSemanticHash
  ) {
    fail(
      'Runtime package Project Data binding differs from the governed method authority profile.',
      'EMPIRICAL_GOVERNED_RUNTIME_PROFILE_BINDING_MISMATCH',
      {
        governedProjectDataSemanticHash,
        runtimePackageProjectDataProfileSemanticHash:
          runtimePackage.bindings.projectDataProfileSemanticHash,
      },
    );
  }
  if (governedSelection.selection.policy?.selectionIsNotExecutionAuthorization !== true) {
    fail(
      'Governed method selection must remain explicitly non-authorizing.',
      'EMPIRICAL_GOVERNED_RUNTIME_SELECTION_AUTHORITY_INVALID',
    );
  }
  const result = {
    schema: GOVERNED_EMPIRICAL_RUNTIME_PACKAGE_PROJECTION_V2_SCHEMA,
    governedSelection,
    runtimePackage,
    semanticHash: value.semanticHash,
  };
  if (result.semanticHash !== computeGovernedEmpiricalRuntimePackageProjectionV2SemanticHash(result)) {
    fail(
      'Governed empirical runtime-package projection semantic hash is stale.',
      'EMPIRICAL_GOVERNED_RUNTIME_PROJECTION_HASH_MISMATCH',
    );
  }
  return deepFreeze(result);
}

function selectedExecutableMethod(governedSelection) {
  const method = governedSelection.selection.selectedMethod;
  if (!EXECUTABLE_METHODS.includes(method)) {
    fail(
      'Governed selection has no executable V2/V3 gravity method.',
      'EMPIRICAL_GOVERNED_RUNTIME_SELECTION_NOT_EXECUTABLE',
      {
        requestedMethod: governedSelection.selection.requestedMethod,
        selectedMethod: method,
        selectionState: governedSelection.selection.selectionState,
      },
    );
  }
  return method;
}

function exact(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(
      `${label} must be an object.`,
      'EMPIRICAL_GOVERNED_RUNTIME_PROJECTION_TYPE_INVALID',
    );
  }
  const actual = Object.keys(value).sort(ascii);
  const expected = [...keys].sort(ascii);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      `${label} contains unexpected or missing keys.`,
      'EMPIRICAL_GOVERNED_RUNTIME_PROJECTION_KEYS_INVALID',
      { actual, expected },
    );
  }
}

function ascii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function fail(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details === null ? null : deepFreeze(details);
  throw error;
}
