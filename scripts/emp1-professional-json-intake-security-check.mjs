#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LAFEA_JSON_INTAKE_ALLOWED_MIME_TYPES,
  LAFEA_JSON_INTAKE_MAX_BYTES,
  LAFEA_JSON_INTAKE_WORKBENCH_DOCUMENT_SCHEMA,
  parseLafeaJsonObject,
  readLafeaUtf8,
} from '../src/workspace/lafea-workbench-controller-io.js';
import { LAFEA_WORKBENCH_DOCUMENT_SCHEMA } from '../src/workspace/lafea-workbench-model.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

assert.equal(LAFEA_JSON_INTAKE_MAX_BYTES, 5 * 1024 * 1024);
assert.deepEqual([...LAFEA_JSON_INTAKE_ALLOWED_MIME_TYPES], ['application/json', 'text/json']);
assert.equal(
  LAFEA_JSON_INTAKE_WORKBENCH_DOCUMENT_SCHEMA,
  LAFEA_WORKBENCH_DOCUMENT_SCHEMA,
  'import-light intake discriminator must equal the canonical workbench schema',
);

const accepted = fakeJsonFile({
  name: 'emp1-source.json',
  type: 'application/json; charset=utf-8',
  text: JSON.stringify({ schema: 'emp1-source-contract/v1', source: 'bounded-test' }),
});
assert.deepEqual(
  JSON.parse(await readLafeaUtf8(accepted)),
  { schema: 'emp1-source-contract/v1', source: 'bounded-test' },
);
assert.equal(accepted.calls.slice, 1);
assert.equal(accepted.calls.arrayBuffer, 1);

const noMime = fakeJsonFile({ name: 'EMP1-SOURCE.JSON', type: '', text: '{"a":1}' });
assert.equal(await readLafeaUtf8(noMime), '{"a":1}');

await rejectsCode(
  () => readLafeaUtf8(fakeJsonFile({ name: 'source.txt', type: 'application/json', text: '{}' })),
  'LAFEA_JSON_FILE_EXTENSION_REJECTED',
);
await rejectsCode(
  () => readLafeaUtf8(fakeJsonFile({ name: 'source.json', type: 'text/plain', text: '{}' })),
  'LAFEA_JSON_FILE_MIME_REJECTED',
);

const oversize = fakeJsonFile({
  name: 'source.json',
  type: 'application/json',
  text: '{}',
  declaredSize: LAFEA_JSON_INTAKE_MAX_BYTES + 1,
});
await rejectsCode(() => readLafeaUtf8(oversize), 'LAFEA_JSON_FILE_TOO_LARGE');
assert.equal(oversize.calls.slice, 0, 'oversize metadata must reject before any payload read');
assert.equal(oversize.calls.arrayBuffer, 0, 'oversize metadata must reject before any payload allocation');

await rejectsCode(
  () => readLafeaUtf8(fakeJsonFile({
    name: 'source.json', type: 'application/json', text: '{}', declaredSize: Number.NaN,
  })),
  'LAFEA_JSON_FILE_SIZE_REQUIRED',
);

await rejectsCode(
  () => readLafeaUtf8(fakeBytesFile({
    name: 'source.json',
    type: 'application/json',
    bytes: Uint8Array.from([0xc3, 0x28]),
  })),
  'LAFEA_JSON_UTF8_INVALID',
);

await rejectsCode(
  () => readLafeaUtf8(fakeJsonFile({ name: 'source.json', type: 'application/json', text: '{' })),
  'LAFEA_JSON_MALFORMED',
);
await rejectsCode(
  () => readLafeaUtf8(fakeJsonFile({ name: 'source.json', type: 'application/json', text: '[]' })),
  'LAFEA_JSON_OBJECT_REQUIRED',
);
await rejectsCode(
  () => readLafeaUtf8(fakeJsonFile({ name: 'source.json', type: 'application/json', text: 'null' })),
  'LAFEA_JSON_OBJECT_REQUIRED',
);

const unsupportedEnvelope = JSON.stringify({
  schema: 'lafea-workbench-document/v2',
  stageId: 'LAFEA.1',
  document: {},
});
await rejectsCode(
  () => readLafeaUtf8(fakeJsonFile({
    name: 'future.json', type: 'application/json', text: unsupportedEnvelope,
  })),
  'LAFEA_WORKBENCH_DOCUMENT_SCHEMA_UNSUPPORTED',
);

assert.deepEqual(parseLafeaJsonObject(JSON.stringify({
  schema: LAFEA_WORKBENCH_DOCUMENT_SCHEMA,
  stageId: 'LAFEA.1',
  document: {},
}), 'LAFEA document'), {
  schema: LAFEA_WORKBENCH_DOCUMENT_SCHEMA,
  stageId: 'LAFEA.1',
  document: {},
});

// Stage-specific schemas remain the stage normalizer's authority. The file gate
// rejects only unsupported versions in the workbench-envelope namespace.
assert.deepEqual(
  parseLafeaJsonObject('{"schema":"lafea-stage-example/v999","value":1}', 'LAFEA document'),
  { schema: 'lafea-stage-example/v999', value: 1 },
);

const mismatch = fakeJsonFile({
  name: 'source.json', type: 'application/json', text: '{}', declaredSize: 1,
});
await rejectsCode(() => readLafeaUtf8(mismatch), 'LAFEA_JSON_FILE_SIZE_MISMATCH');

const boundedActual = fakeJsonFile({
  name: 'source.json',
  type: 'application/json',
  text: '{}',
  declaredSize: 2,
  sliceBytes: new Uint8Array(LAFEA_JSON_INTAKE_MAX_BYTES + 1),
});
await rejectsCode(() => readLafeaUtf8(boundedActual), 'LAFEA_JSON_FILE_TOO_LARGE');

const malformedSecret = 'PROPRIETARY_SOURCE_VALUE_SHOULD_NOT_ECHO';
try {
  parseLafeaJsonObject(`{"x":"${malformedSecret}"`, 'LAFEA document');
  assert.fail('malformed JSON should reject');
} catch (error) {
  assert.equal(error.code, 'LAFEA_JSON_MALFORMED');
  assert.equal(String(error.message).includes(malformedSecret), false);
}

const ioSource = await read('src/workspace/lafea-workbench-controller-io.js');
assert.match(ioSource, /file\.slice\(0, policy\.maxBytes \+ 1\)/u);
assert.match(ioSource, /TextDecoder\('utf-8', \{ fatal: true \}\)/u);
assert.match(ioSource, /parseLafeaJsonObject\(text, 'Selected LAFEA JSON'\)/u);
assert.match(ioSource, /LAFEA_WORKBENCH_DOCUMENT_SCHEMA_UNSUPPORTED/u);
assert.equal(ioSource.includes("from './lafea-workbench-model.js'"), false,
  'production intake I/O must remain import-light and must not pull the model/composition graph into its manual chunk');
assert.equal(/\beval\s*\(/u.test(ioSource), false);
assert.equal(/new\s+Function\s*\(/u.test(ioSource), false);

const viteSource = await read('vite.config.js');
assert.match(viteSource, /lafea-workbench-controller-io\.js/u);
assert.match(viteSource, /return 'lafea-workbench-io'/u);

const controllerSource = await read('src/workspace/lafea-workbench-controller.js');
assert.match(controllerSource, /JSON\.parse\(await readLafeaUtf8\(file\)\)/u);
assert.equal((controllerSource.match(/readLafeaUtf8\(file\)/gu) ?? []).length, 2,
  'both current file-intake paths must pass through the shared guard');

console.log(JSON.stringify({
  schema: 'emp1-professional-json-intake-security-check/v1',
  status: 'PASS_FAIL_CLOSED_JSON_INTAKE_POLICY',
  maxBytes: LAFEA_JSON_INTAKE_MAX_BYTES,
  workbenchSchemaCrossChecked: true,
  intakeIoManualChunkBoundaryPreserved: true,
  runtimeExtensionGuard: true,
  runtimeMimeGuard: true,
  preReadSizeGuard: true,
  boundedSliceGuard: true,
  fatalUtf8Guard: true,
  malformedJsonRejected: true,
  nonObjectJsonRejected: true,
  unsupportedWorkbenchEnvelopeRejected: true,
  stageNormalizerAuthorityPreserved: true,
  arbitraryCodeExecutionFromImportedJson: false,
  sourceContentEchoInMalformedError: false,
  engineeringAuthorityCreated: false,
  routeAuthorityCreated: false,
  codeComplianceCreated: false,
  releaseAuthorityCreated: false,
  numericalComparison: 'NOT_APPLICABLE_INTAKE_SECURITY_ONLY',
}, null, 2));

function fakeJsonFile({ name, type, text, declaredSize, sliceBytes = null }) {
  return fakeBytesFile({
    name,
    type,
    bytes: new TextEncoder().encode(text),
    declaredSize,
    sliceBytes,
  });
}

function fakeBytesFile({ name, type, bytes, declaredSize, sliceBytes = null }) {
  const payload = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const calls = { slice: 0, arrayBuffer: 0 };
  return {
    name,
    type,
    size: declaredSize === undefined ? payload.byteLength : declaredSize,
    calls,
    slice(start, end) {
      calls.slice += 1;
      const selected = sliceBytes instanceof Uint8Array
        ? sliceBytes
        : payload.slice(start, Math.min(end, payload.byteLength));
      return {
        async arrayBuffer() {
          calls.arrayBuffer += 1;
          return selected.buffer.slice(selected.byteOffset, selected.byteOffset + selected.byteLength);
        },
      };
    },
  };
}

async function rejectsCode(action, code) {
  await assert.rejects(action, (error) => {
    assert.equal(error?.code, code);
    return true;
  });
}

async function read(path) {
  return readFile(resolve(root, path), 'utf8');
}
