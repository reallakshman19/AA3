import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { issueLafeaSourceAuthority } from './lafea-source-authority.js';

export const LAFEA4_SHELL_THICKNESS_BASIS_SCHEMA = 'lafea4-shell-thickness-basis/v1';
export const LAFEA4_SHELL_THICKNESS_BASIS_CLASSIFICATIONS = Object.freeze([
  'UNIFORM_THICKNESS',
  'NONUNIFORM_THICKNESS',
]);

const ROUND_OFF_FACTOR = 64;
const OUTPUT_KEYS = Object.freeze([
  'schema', 'stageId', 'sourceHash', 'documentRevisionDigest', 'elementCount',
  'minimumThickness', 'maximumThickness', 'uniformThickness', 'classification',
  'semanticHash',
]);

/**
 * Build a mesh-sizing thickness basis from the exact normalized LAFEA.4 source.
 * The source hash is recomputed independently; callers cannot inject a naked
 * thickness value into shell meshing without proving it belongs to the same
 * engineering source as the retained midsurface parent.
 */
export function createLafea4ShellThicknessBasis({ sourceHash, document }) {
  const authority = issueLafeaSourceAuthority(
    'LAFEA.4', document, 'LAFEA4_SHELL_MESH_THICKNESS_BASIS',
  );
  if (authority.sourceHash !== sourceHash) {
    fail('LAFEA4_SHELL_THICKNESS_SOURCE_HASH_MISMATCH');
  }
  if (!Array.isArray(document?.elements) || document.elements.length === 0) {
    fail('LAFEA4_SHELL_THICKNESS_ELEMENTS_REQUIRED');
  }
  const thicknesses = document.elements.map((element) => {
    const value = Number(element?.thickness);
    if (!(Number.isFinite(value) && value > 0)) {
      fail('LAFEA4_SHELL_THICKNESS_VALUE_INVALID');
    }
    return value;
  });
  const minimumThickness = Math.min(...thicknesses);
  const maximumThickness = Math.max(...thicknesses);
  const tolerance = ROUND_OFF_FACTOR * Number.EPSILON
    * Math.max(1, Math.abs(minimumThickness), Math.abs(maximumThickness));
  const uniform = maximumThickness - minimumThickness <= tolerance;
  const core = {
    schema: LAFEA4_SHELL_THICKNESS_BASIS_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash,
    documentRevisionDigest: authority.documentRevisionDigest,
    elementCount: document.elements.length,
    minimumThickness,
    maximumThickness,
    uniformThickness: uniform ? thicknesses[0] : null,
    classification: uniform ? 'UNIFORM_THICKNESS' : 'NONUNIFORM_THICKNESS',
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-shell-thickness-basis-hash-input/v1',
      basis: core,
    }),
  });
}

export function validateLafea4ShellThicknessBasis(value) {
  exactKeys(value, OUTPUT_KEYS, 'LAFEA4_SHELL_THICKNESS_BASIS_KEYS_INVALID');
  if (value.schema !== LAFEA4_SHELL_THICKNESS_BASIS_SCHEMA
    || value.stageId !== 'LAFEA.4'
    || !LAFEA4_SHELL_THICKNESS_BASIS_CLASSIFICATIONS.includes(value.classification)) {
    fail('LAFEA4_SHELL_THICKNESS_BASIS_CONTRACT_INVALID');
  }
  requireSha256(value.sourceHash, 'LAFEA4_SHELL_THICKNESS_SOURCE_HASH_INVALID');
  if (typeof value.documentRevisionDigest !== 'string'
    || !/^fnv1a64:[0-9a-f]{16}$/u.test(value.documentRevisionDigest)) {
    fail('LAFEA4_SHELL_THICKNESS_DOCUMENT_REVISION_INVALID');
  }
  if (!Number.isInteger(value.elementCount) || value.elementCount < 1) {
    fail('LAFEA4_SHELL_THICKNESS_ELEMENT_COUNT_INVALID');
  }
  for (const candidate of [value.minimumThickness, value.maximumThickness]) {
    if (!(Number.isFinite(candidate) && candidate > 0)) {
      fail('LAFEA4_SHELL_THICKNESS_RANGE_INVALID');
    }
  }
  if (value.maximumThickness < value.minimumThickness) {
    fail('LAFEA4_SHELL_THICKNESS_RANGE_INVALID');
  }
  if (value.classification === 'UNIFORM_THICKNESS') {
    if (!(Number.isFinite(value.uniformThickness) && value.uniformThickness > 0)) {
      fail('LAFEA4_SHELL_UNIFORM_THICKNESS_INVALID');
    }
  } else if (value.uniformThickness !== null) {
    fail('LAFEA4_SHELL_NONUNIFORM_THICKNESS_MUST_NOT_HAVE_UNIFORM_VALUE');
  }
  const core = {
    schema: value.schema,
    stageId: value.stageId,
    sourceHash: value.sourceHash,
    documentRevisionDigest: value.documentRevisionDigest,
    elementCount: value.elementCount,
    minimumThickness: value.minimumThickness,
    maximumThickness: value.maximumThickness,
    uniformThickness: value.uniformThickness,
    classification: value.classification,
  };
  const expected = canonicalLafeaSha256({
    schema: 'lafea4-shell-thickness-basis-hash-input/v1',
    basis: core,
  });
  if (value.semanticHash !== expected) {
    fail('LAFEA4_SHELL_THICKNESS_BASIS_HASH_INVALID');
  }
  return freeze(structuredClone(value));
}

function requireSha256(value, code) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) fail(code);
}
function exactKeys(value, expected, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(required)) fail(code);
}
function fail(code) {
  const error = new TypeError(code);
  error.code = code;
  throw error;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
