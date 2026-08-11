import { createLfeaPersistenceAdapter, getLfeaBrowserStorage } from './persistence.js';
import { createLfeaStandaloneRuntime } from './standalone-runtime.js';

export const LFEA_STANDALONE_APPLICATION_SCHEMA = 'lfea-standalone-application/v1';

/** Standalone LFEA boundary: resolve product identity/storage, then construct the LFEA-owned runtime. */
export function bootstrapLfeaStandalone(rootElement, options = {}) {
  if (!rootElement?.ownerDocument) {
    throw new TypeError('Standalone LFEA application root was not found.');
  }
  const identity = createApplicationIdentity(options.identity);
  const storage = Object.hasOwn(options, 'storage')
    ? options.storage
    : getLfeaBrowserStorage(rootElement.ownerDocument.defaultView);
  return createLfeaStandaloneRuntime(rootElement, {
    identity,
    persistence: createLfeaPersistenceAdapter(storage),
    workbench: options.workbench,
  });
}

function createApplicationIdentity(value = {}) {
  const buildTime = text(value.buildTime)
    ?? (typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : null);
  return Object.freeze({
    schema: LFEA_STANDALONE_APPLICATION_SCHEMA,
    application: 'LFEA',
    mode: 'STANDALONE',
    applicationVersion: text(value.applicationVersion) ?? '0.0.0',
    buildSha: text(value.buildSha),
    buildTime,
  });
}

function text(value) {
  const result = String(value ?? '').trim();
  return result || null;
}
