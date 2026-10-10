// The source is the tracked CAESAR II fixture, not a generated model or duplicated binary.
// Vite emits the 5 MB ACCDB as a hashed static asset; its URL string enters the JS bundle,
// but its bytes are fetched only when the user explicitly requests the reference model.
import bm4lAssetUrl from '../../benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB?url';

export const BM4L_REFERENCE_FILE_NAME = 'BM4_L.ACCDB';
export const BM4L_REFERENCE_BYTE_LENGTH = 5_136_384;
export const BM4L_REFERENCE_SHA256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';

function assertNotAborted(signal) {
  if (signal?.aborted) {
    throw new DOMException('Reference BM4_L download was cancelled.', 'AbortError');
  }
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Fetch the authentic repository ACCDB, validate the complete bytes, and only then return
 * a File for the existing ACCDB importer. No engineering source state is touched here.
 *
 * Dependency parameters allow deterministic negative tests; production uses the browser
 * fetch, WebCrypto and File implementations. There is deliberately no hashing fallback.
 */
export async function loadVerifiedBM4LReferenceFile({
  url = bm4lAssetUrl,
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
  FileImpl = globalThis.File,
  signal,
} = {}) {
  assertNotAborted(signal);
  if (typeof cryptoImpl?.subtle?.digest !== 'function') {
    throw new Error('Reference BM4_L requires browser SHA-256 support; no model was imported.');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('Reference BM4_L download is not available in this browser.');
  }
  if (typeof FileImpl !== 'function') {
    throw new Error('Reference BM4_L requires browser File support.');
  }

  const response = await fetchImpl(url, { signal, credentials: 'same-origin' });
  assertNotAborted(signal);
  if (!response?.ok) {
    const status = Number.isInteger(response?.status) ? ` (HTTP ${response.status})` : '';
    throw new Error(`Reference BM4_L is unavailable${status}; the active source was not replaced.`);
  }

  // A length header cannot be trusted alone (it may be absent or incorrect): always
  // validate the exact body length and cryptographic digest after the download.
  const buffer = await response.arrayBuffer();
  assertNotAborted(signal);
  if (buffer.byteLength !== BM4L_REFERENCE_BYTE_LENGTH) {
    throw new Error(`Reference BM4_L size mismatch: expected ${BM4L_REFERENCE_BYTE_LENGTH} bytes, received ${buffer.byteLength}; no model was imported.`);
  }

  const digest = toHex(await cryptoImpl.subtle.digest('SHA-256', buffer));
  assertNotAborted(signal);
  if (digest !== BM4L_REFERENCE_SHA256) {
    throw new Error('Reference BM4_L SHA-256 mismatch; no model was imported.');
  }

  return new FileImpl([buffer], BM4L_REFERENCE_FILE_NAME, {
    type: 'application/vnd.ms-access',
  });
}
