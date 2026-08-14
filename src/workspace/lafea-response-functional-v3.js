/** Mesh-independent physical response functionals for convergence evidence. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_RESPONSE_FUNCTIONAL_V3_SCHEMA = 'lafea-response-functional/v3';
const ALLOWED = Object.freeze({
  'LAFEA.3': Object.freeze([
    'POINT_DISPLACEMENT', 'REACTION_RESULTANT', 'STRAIN_ENERGY', 'REGION_STRESS_AVERAGE',
  ]),
  'LAFEA.4': Object.freeze([
    'POINT_DISPLACEMENT', 'POINT_ROTATION', 'SHELL_RESULTANT_PATH', 'STRAIN_ENERGY',
  ]),
  'LAFEA.5': Object.freeze([
    'TRANSFER_RESULTANT_FORCE', 'TRANSFER_RESULTANT_MOMENT', 'POINT_DISPLACEMENT',
    'SHELL_RESULTANT_REGION',
  ]),
});
const KEYS = Object.freeze([
  'schema', 'stageId', 'kind', 'physicalLocatorHash', 'component',
  'evaluationPolicyHash', 'singularityDisposition',
]);

export function createLafeaResponseFunctionalV3(value) {
  exact(value, KEYS, 'LAFEA_RESPONSE_FUNCTIONAL_V3_KEYS_INVALID');
  const allowed = ALLOWED[value.stageId];
  if (!allowed) fail('LAFEA_RESPONSE_FUNCTIONAL_V3_STAGE_INVALID');
  const singularityDisposition = enumValue(value.singularityDisposition, [
    'REGULAR_BOUNDED',
    'FIXED_PHYSICAL_REGION_EXCLUDING_SINGULAR_SET',
    'NONCONVERGENT_BY_CONSTRUCTION',
  ], 'SINGULARITY_DISPOSITION');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_RESPONSE_FUNCTIONAL_V3_SCHEMA, 'SCHEMA'),
    stageId: value.stageId,
    kind: enumValue(value.kind, allowed, 'KIND'),
    physicalLocatorHash: sha(value.physicalLocatorHash, 'PHYSICAL_LOCATOR_HASH'),
    component: text(value.component, 'COMPONENT'),
    evaluationPolicyHash: sha(value.evaluationPolicyHash, 'EVALUATION_POLICY_HASH'),
    singularityDisposition,
  });
  const convergenceEligible = singularityDisposition !== 'NONCONVERGENT_BY_CONSTRUCTION';
  return freeze({
    ...record,
    functionalHash: canonicalLafeaSha256({
      schema: 'lafea-response-functional-hash-input/v3', functional: record,
    }),
    convergenceEligible,
    engineeringAuthority: false,
  });
}

export function validateLafeaResponseFunctionalV3(value) {
  const { functionalHash, convergenceEligible, engineeringAuthority, ...input } = value || {};
  const rebuilt = createLafeaResponseFunctionalV3(input);
  if (functionalHash !== rebuilt.functionalHash
    || convergenceEligible !== rebuilt.convergenceEligible) {
    fail('LAFEA_RESPONSE_FUNCTIONAL_V3_HASH_OR_ELIGIBILITY_INVALID');
  }
  if (engineeringAuthority !== false) fail('LAFEA_RESPONSE_FUNCTIONAL_V3_AUTHORITY_INVALID');
  return rebuilt;
}

function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_RESPONSE_FUNCTIONAL_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_RESPONSE_FUNCTIONAL_V3_${field}_INVALID`);
  return value;
}
function sha(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_RESPONSE_FUNCTIONAL_V3_${field}_INVALID`);
  return out;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_RESPONSE_FUNCTIONAL_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
