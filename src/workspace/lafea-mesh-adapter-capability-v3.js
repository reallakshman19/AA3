/** Stage-owned engineering capability declarations for Mesh Workspace v3. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_MESH_ADAPTER_CAPABILITY_V3_SCHEMA = 'lafea-mesh-adapter-capability/v3';
export const LAFEA_CONTINUUM_MESH_ADAPTER_PAYLOAD_V3_SCHEMA =
  'lafea-continuum-mesh-adapter-payload/v3';
export const LAFEA_SHELL_MESH_ADAPTER_PAYLOAD_V3_SCHEMA =
  'lafea-shell-mesh-adapter-payload/v3';

const SHELL_TRI3 = 'CST_DKT_TRI3_THIN_SHELL_V1';
const CONFIG = Object.freeze({
  'LAFEA.3': Object.freeze({
    payloadSchema: LAFEA_CONTINUUM_MESH_ADAPTER_PAYLOAD_V3_SCHEMA,
    allowedElementFamilies: Object.freeze(['T3', 'T6', 'Q8']),
  }),
  'LAFEA.4': Object.freeze({
    payloadSchema: LAFEA_SHELL_MESH_ADAPTER_PAYLOAD_V3_SCHEMA,
    allowedElementFamilies: Object.freeze([SHELL_TRI3]),
  }),
  'LAFEA.5': Object.freeze({
    payloadSchema: LAFEA_SHELL_MESH_ADAPTER_PAYLOAD_V3_SCHEMA,
    allowedElementFamilies: Object.freeze([SHELL_TRI3]),
  }),
});

export function lafeaMeshAdapterCapabilityV3(stageId) {
  const config = CONFIG[stageId];
  if (!config) fail('LAFEA_MESH_ADAPTER_CAPABILITY_V3_STAGE_INVALID');
  const record = freeze({
    schema: LAFEA_MESH_ADAPTER_CAPABILITY_V3_SCHEMA,
    stageId,
    adapterId: `LAFEA_MESH_ADAPTER:${stageId}:V3`,
    adapterRevision: '3',
    payloadSchema: config.payloadSchema,
    allowedElementFamilies: config.allowedElementFamilies,
    allowedSizingModes: Object.freeze(['ISOTROPIC_SCALAR_ONLY']),
    allowedGenerationModes: Object.freeze(['GENERATE_NEW']),
    localRefinementAuthorized: false,
    adaptiveRefinementAuthorized: false,
    anisotropicSizingAuthorized: false,
    convergenceAutomationAuthorized: false,
    crossStageHostReuseContractAvailable: stageId === 'LAFEA.5',
    crossStageHostReuseAuthorized: false,
  });
  return freeze({
    ...record,
    capabilityHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-adapter-capability-hash-input/v3', record,
    }),
  });
}

export function requireLafeaMeshAdapterCapabilityV3(stageId, capabilityHash) {
  const capability = lafeaMeshAdapterCapabilityV3(stageId);
  if (capability.capabilityHash !== capabilityHash) {
    fail('LAFEA_MESH_ADAPTER_CAPABILITY_V3_HASH_MISMATCH');
  }
  return capability;
}

function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
