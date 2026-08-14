/** Non-authoritative rendering/LOD proxy mapped back to exact retained mesh entities. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA_SELECTION_REFERENCE_V3_SCHEMA,
  createLafeaSelectionReferenceV3,
} from './lafea-selection-reference-v3.js';

export const LAFEA_RENDER_PROXY_V3_SCHEMA = 'lafea-render-proxy/v3';
const KEYS = Object.freeze([
  'schema', 'stageId', 'meshContentHash', 'renderLodHash', 'proxyId',
  'authoritativeElementIds',
]);

export function createLafeaRenderProxyV3(value) {
  exact(value, KEYS, 'LAFEA_RENDER_PROXY_V3_KEYS_INVALID');
  const elementIds = ids(value.authoritativeElementIds);
  const record = freeze({
    schema: exactText(value.schema, LAFEA_RENDER_PROXY_V3_SCHEMA, 'SCHEMA'),
    stageId: enumValue(value.stageId, ['LAFEA.3', 'LAFEA.4', 'LAFEA.5'], 'STAGE_ID'),
    meshContentHash: sha256(value.meshContentHash, 'MESH_CONTENT_HASH'),
    renderLodHash: sha256(value.renderLodHash, 'RENDER_LOD_HASH'),
    proxyId: text(value.proxyId, 'PROXY_ID'),
    authoritativeElementIds: elementIds,
  });
  return freeze({
    ...record,
    proxyHash: canonicalLafeaSha256({ schema: 'lafea-render-proxy-hash-input/v3', proxy: record }),
    engineeringAuthority: false,
  });
}

export function resolveLafeaRenderProxyElementSelectionV3(proxyValue, context) {
  const proxy = validateLafeaRenderProxyV3(proxyValue);
  const expectedMeshContentHash = sha256(context?.expectedMeshContentHash, 'EXPECTED_MESH_CONTENT_HASH');
  if (proxy.meshContentHash !== expectedMeshContentHash) {
    fail('LAFEA_RENDER_PROXY_V3_MESH_MISMATCH');
  }
  let elementId = context?.exactElementId ?? null;
  if (elementId === null) {
    if (proxy.authoritativeElementIds.length !== 1) fail('LAFEA_RENDER_PROXY_V3_AMBIGUOUS_PICK');
    [elementId] = proxy.authoritativeElementIds;
  } else {
    elementId = text(elementId, 'EXACT_ELEMENT_ID');
    if (!proxy.authoritativeElementIds.includes(elementId)) {
      fail('LAFEA_RENDER_PROXY_V3_EXACT_ELEMENT_NOT_IN_PROXY');
    }
  }
  return createLafeaSelectionReferenceV3({
    schema: LAFEA_SELECTION_REFERENCE_V3_SCHEMA,
    kind: 'MESH_ELEMENT',
    stageId: proxy.stageId,
    locator: { meshContentHash: proxy.meshContentHash, elementId },
  });
}

export function validateLafeaRenderProxyV3(value) {
  const { proxyHash, engineeringAuthority, ...input } = value || {};
  const rebuilt = createLafeaRenderProxyV3(input);
  if (proxyHash !== rebuilt.proxyHash) fail('LAFEA_RENDER_PROXY_V3_HASH_INVALID');
  if (engineeringAuthority !== false) fail('LAFEA_RENDER_PROXY_V3_AUTHORITY_INVALID');
  return rebuilt;
}
function ids(value) {
  if (!Array.isArray(value) || !value.length) fail('LAFEA_RENDER_PROXY_V3_ELEMENT_IDS_INVALID');
  const out = value.map((row) => text(row, 'ELEMENT_ID')).sort();
  if (new Set(out).size !== out.length) fail('LAFEA_RENDER_PROXY_V3_ELEMENT_IDS_DUPLICATE');
  return Object.freeze(out);
}
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_RENDER_PROXY_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_RENDER_PROXY_V3_${field}_INVALID`);
  return value;
}
function sha256(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_RENDER_PROXY_V3_${field}_INVALID`);
  return out;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_RENDER_PROXY_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
