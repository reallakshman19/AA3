/**
 * Re-exports the neutral canonical-JSON/FNV-1a semantic-hash primitives.
 *
 * The implementation lives in `shared-primitives/canonical-json.js` because it
 * has no piping-specific content and standalone product closures (which
 * forbid depending on this directory) need to reach it too. This file exists
 * so every existing import of `shared-piping-model/canonical-json.js` keeps
 * working unchanged.
 */
export * from '../shared-primitives/canonical-json.js';
