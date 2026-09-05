import { LAFEA_WORKBENCH_STYLES } from './lafea-workbench-styles.js';
import { LAFEA_GUIDED_WORKBENCH_STYLES } from './lafea-guided-workbench-styles.js';
import { LAFEA_UI_MODERNIZATION_STYLES } from './lafea-ui-modernization-styles.js';
import { FEA_BENCHMARK_STYLES } from './fea-benchmark-styles.js';
import { EMP1_ANALYTICAL_LAYOUT_STYLES } from './emp1-analytical-layout-styles.js';

export const LAFEA_JSON_INTAKE_MAX_BYTES = 5 * 1024 * 1024;
export const LAFEA_JSON_INTAKE_ALLOWED_MIME_TYPES = Object.freeze([
  'application/json',
  'text/json',
]);

// Keep this module import-light. vite.config.js deliberately isolates it as a
// leaf chunk; importing the workbench model/composition graph here can recreate
// evaluation-order cycles. The focused security checker cross-checks this exact
// discriminator against the canonical exported workbench schema.
export const LAFEA_JSON_INTAKE_WORKBENCH_DOCUMENT_SCHEMA = 'lafea-workbench-document/v1';
const LAFEA_WORKBENCH_DOCUMENT_SCHEMA_PREFIX = 'lafea-workbench-document/';
const JSON_FILE_EXTENSION = /\.json$/iu;

export function installLafeaWorkbenchStyles(documentRef) {
  if (!documentRef || documentRef.querySelector('[data-lafea-workbench-styles]')) return;
  const style = documentRef.createElement('style');
  style.dataset.lafeaWorkbenchStyles = 'true';
  style.textContent = `${LAFEA_WORKBENCH_STYLES}\n${LAFEA_GUIDED_WORKBENCH_STYLES}\n${LAFEA_UI_MODERNIZATION_STYLES}\n${FEA_BENCHMARK_STYLES}\n${EMP1_ANALYTICAL_LAYOUT_STYLES}`;
  documentRef.head?.append(style);
}

/**
 * Read one browser-selected JSON file through a bounded byte intake.
 *
 * The browser input `accept` attribute is UX only. This function is the runtime
 * boundary: it validates the File metadata before any payload read, limits the
 * actual slice to maxBytes + 1, requires fatal UTF-8 decoding, and verifies the
 * payload is a JSON object with no unsupported workbench-envelope version.
 */
export async function readLafeaUtf8(file, options = {}) {
  const policy = requireLafeaJsonFile(file, options.maxBytes ?? LAFEA_JSON_INTAKE_MAX_BYTES);
  const bounded = file.slice(0, policy.maxBytes + 1);
  if (!bounded || typeof bounded.arrayBuffer !== 'function') {
    throw intakeError(
      TypeError,
      'LAFEA_JSON_FILE_BYTE_READER_REQUIRED',
      'Selected LAFEA JSON must provide a bounded byte reader.',
    );
  }

  const bytes = await bounded.arrayBuffer();
  if (!(bytes instanceof ArrayBuffer)) {
    throw intakeError(
      TypeError,
      'LAFEA_JSON_FILE_BYTE_READER_INVALID',
      'Selected LAFEA JSON byte reader returned an invalid payload.',
    );
  }
  if (bytes.byteLength > policy.maxBytes) {
    throw intakeError(
      RangeError,
      'LAFEA_JSON_FILE_TOO_LARGE',
      `Selected LAFEA JSON exceeds the ${policy.maxBytes}-byte intake limit.`,
    );
  }
  if (bytes.byteLength !== policy.declaredBytes) {
    throw intakeError(
      RangeError,
      'LAFEA_JSON_FILE_SIZE_MISMATCH',
      'Selected LAFEA JSON byte length does not match its declared file size.',
    );
  }

  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw intakeError(
      TypeError,
      'LAFEA_JSON_UTF8_INVALID',
      'Selected LAFEA JSON is not valid UTF-8.',
    );
  }

  // Validate before returning text so every current file consumer inherits the
  // same fail-closed JSON/object/schema boundary without becoming an authority.
  parseLafeaJsonObject(text, 'Selected LAFEA JSON');
  return text;
}

export function parseLafeaJsonObject(text, label = 'LAFEA JSON') {
  if (typeof text !== 'string') {
    throw intakeError(TypeError, 'LAFEA_JSON_TEXT_REQUIRED', `${label} text is required.`);
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw intakeError(SyntaxError, 'LAFEA_JSON_MALFORMED', `${label} is malformed JSON.`);
  }
  if (!isLafeaRecord(value)) {
    throw intakeError(TypeError, 'LAFEA_JSON_OBJECT_REQUIRED', `${label} must be a JSON object.`);
  }
  assertSupportedWorkbenchEnvelope(value);
  return value;
}

export function downloadLafeaJson(documentRef, value, filename) {
  if (!documentRef || typeof Blob === 'undefined' || typeof URL === 'undefined') return;
  const url = URL.createObjectURL(new Blob(
    [JSON.stringify(value, null, 2)],
    { type: 'application/json' },
  ));
  const anchor = documentRef.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  documentRef.body?.append(anchor);
  anchor.click();
  anchor.remove();
  revokeObjectUrlAfterDownload(url);
}

export function lafeaStageFilename(stageId) {
  return stageId.toLowerCase().replace('.', '-');
}

export function isLafeaRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireLafeaJsonFile(file, maxBytes) {
  if (!file || typeof file !== 'object') {
    throw intakeError(TypeError, 'LAFEA_JSON_FILE_REQUIRED', 'A selected LAFEA JSON file is required.');
  }
  const limit = positiveInteger(maxBytes, 'LAFEA_JSON_FILE_LIMIT_INVALID');
  const name = typeof file.name === 'string' ? file.name.trim() : '';
  if (!name || !JSON_FILE_EXTENSION.test(name)) {
    throw intakeError(
      TypeError,
      'LAFEA_JSON_FILE_EXTENSION_REJECTED',
      'Selected LAFEA source must use the .json file extension.',
    );
  }

  const mime = canonicalMime(file.type);
  if (mime && !LAFEA_JSON_INTAKE_ALLOWED_MIME_TYPES.includes(mime)) {
    throw intakeError(
      TypeError,
      'LAFEA_JSON_FILE_MIME_REJECTED',
      'Selected LAFEA source must use a JSON media type.',
    );
  }

  const declaredBytes = Number(file.size);
  if (!Number.isInteger(declaredBytes) || declaredBytes < 0) {
    throw intakeError(
      TypeError,
      'LAFEA_JSON_FILE_SIZE_REQUIRED',
      'Selected LAFEA JSON file size is unavailable or invalid.',
    );
  }
  if (declaredBytes > limit) {
    throw intakeError(
      RangeError,
      'LAFEA_JSON_FILE_TOO_LARGE',
      `Selected LAFEA JSON exceeds the ${limit}-byte intake limit.`,
    );
  }
  if (typeof file.slice !== 'function') {
    throw intakeError(
      TypeError,
      'LAFEA_JSON_FILE_BYTE_READER_REQUIRED',
      'Selected LAFEA JSON must provide a bounded byte reader.',
    );
  }
  return Object.freeze({ maxBytes: limit, declaredBytes, mime });
}

function assertSupportedWorkbenchEnvelope(value) {
  const schema = typeof value?.schema === 'string' ? value.schema.trim() : '';
  if (!schema.startsWith(LAFEA_WORKBENCH_DOCUMENT_SCHEMA_PREFIX)) return;
  if (schema === LAFEA_JSON_INTAKE_WORKBENCH_DOCUMENT_SCHEMA) return;
  throw intakeError(
    TypeError,
    'LAFEA_WORKBENCH_DOCUMENT_SCHEMA_UNSUPPORTED',
    'LAFEA workbench document envelope schema is unsupported.',
  );
}

function canonicalMime(value) {
  return typeof value === 'string'
    ? value.split(';', 1)[0].trim().toLowerCase()
    : '';
}

function positiveInteger(value, code) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw intakeError(TypeError, code, 'LAFEA JSON intake byte limit must be a positive integer.');
  }
  return number;
}

function intakeError(ErrorType, code, message) {
  const error = new ErrorType(message);
  error.code = code;
  return error;
}

function revokeObjectUrlAfterDownload(url) {
  let revoked = false;
  const revoke = () => {
    if (revoked) return;
    revoked = true;
    URL.revokeObjectURL(url);
    globalThis.clearTimeout(timeout);
    globalThis.removeEventListener?.('focus', revoke);
  };
  const timeout = globalThis.setTimeout(revoke, 30_000);
  globalThis.addEventListener?.('focus', revoke, { once: true });
}
