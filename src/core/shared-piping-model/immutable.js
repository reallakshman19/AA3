/**
 * Re-exports the neutral structural-predicate/deep-freeze primitives.
 *
 * The implementation lives in `shared-primitives/immutable.js` because it has
 * no piping-specific content and standalone product closures (which forbid
 * depending on this directory) need to reach it too. This file exists so
 * every existing import of `shared-piping-model/immutable.js` keeps working
 * unchanged.
 */
export * from '../shared-primitives/immutable.js';
