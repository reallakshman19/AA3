import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA_SHELL_MULTIPATCH_ELEMENT,
  LAFEA_SHELL_MULTIPATCH_MESH_OUTPUT_SCHEMA,
  LAFEA_SHELL_MULTIPATCH_MESH_PLAN_SCHEMA,
  LAFEA_SHELL_MULTIPATCH_MESH_SCOPE,
  LAFEA_SHELL_MULTIPATCH_MESH_STRATEGY,
  planLafeaMultiPatchShellAnalysisMesh,
  produceLafeaMultiPatchShellAnalysisMesh as produceHistoricalCore,
} from './lafea-shell-multipatch-mesh-core.js';

export {
  LAFEA_SHELL_MULTIPATCH_ELEMENT,
  LAFEA_SHELL_MULTIPATCH_MESH_OUTPUT_SCHEMA,
  LAFEA_SHELL_MULTIPATCH_MESH_PLAN_SCHEMA,
  LAFEA_SHELL_MULTIPATCH_MESH_SCOPE,
  LAFEA_SHELL_MULTIPATCH_MESH_STRATEGY,
  planLafeaMultiPatchShellAnalysisMesh,
};

/**
 * Current-contract adapter around the previously qualified multipatch mechanics.
 *
 * The historical core carried `lifecycleAuthority: false` in its producer
 * output. Current LAFEA mesh-producer contracts intentionally carry no
 * lifecycle/release/merge authority fields at all; those authorities belong to
 * orchestration and release custody, not mesh generation. Preserve the proven
 * mesh/evidence mechanics while rebuilding only the non-authoritative output
 * envelope under the current contract.
 */
export function produceLafeaMultiPatchShellAnalysisMesh(input) {
  const produced = produceHistoricalCore(input);
  if (Object.hasOwn(produced.output, 'releaseAuthority')
    || Object.hasOwn(produced.output, 'mergeAuthority')) {
    fail('LAFEA_SHELL_MULTIPATCH_PRODUCER_AUTHORITY_FIELD_FORBIDDEN');
  }
  const {
    lifecycleAuthority: _legacyLifecycleAuthority,
    outputHash: _legacyOutputHash,
    ...outputCore
  } = produced.output;
  const output = freeze({
    ...outputCore,
    outputHash: canonicalLafeaSha256({
      schema: 'lafea-shell-multipatch-mesh-output-hash-input/v1',
      output: outputCore,
    }),
  });
  for (const field of ['lifecycleAuthority', 'releaseAuthority', 'mergeAuthority']) {
    if (Object.hasOwn(output, field)) fail('LAFEA_SHELL_MULTIPATCH_PRODUCER_AUTHORITY_FIELD_FORBIDDEN');
  }
  return freeze({ plan: produced.plan, output, evidence: produced.evidence });
}

function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
