import {
  canonicalJson,
  canonicalSha256,
} from '../core/shared-primitives/canonical-json-sha256.js';

/**
 * LAFEA compatibility surface for the neutral canonical JSON/SHA-256 primitive.
 * The LAFEA profile identity remains product-owned and unchanged.
 */
export const LAFEA_CANONICAL_SHA256_PROFILE = 'LAFEA_CANONICAL_JSON_SHA256_V1';

export function canonicalLafeaJson(value) {
  return canonicalJson(value);
}

export function canonicalLafeaSha256(value) {
  return canonicalSha256(value);
}
