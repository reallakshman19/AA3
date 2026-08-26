/**
 * Verifies createStagedJsonToInputXmlWorkerClient()'s RUN/COMPLETE/FAILURE
 * message protocol and lifecycle guarantees using an injected FakeWorker --
 * no real Worker/Pyodide/browser involved (the real Pyodide-driving path
 * is proven separately, against real python3 and real vendored files, by
 * stagedjson-to-inputxml-python-check.mjs). Pattern matches the existing
 * FakeWorker precedent in fea-ui-upgrade-check.mjs.
 */
import assert from 'node:assert/strict';
import { createStagedJsonToInputXmlWorkerClient } from '../src/core/geometry/adapters/stagedjson-to-inputxml-worker-client.js';

class FakeWorker {
  constructor() {
    this.listeners = new Map();
    this.request = null;
    this.terminated = false;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  postMessage(value) {
    this.request = value;
  }

  emit(type, event) {
    this.listeners.get(type)?.(event);
  }

  terminate() {
    this.terminated = true;
  }
}

// 1. convert() posts a RUN message with the exact input shape, and a
// COMPLETE reply resolves with `message.result`.
{
  let worker;
  const client = createStagedJsonToInputXmlWorkerClient(() => {
    worker = new FakeWorker();
    return worker;
  });
  const completion = client.convert({
    stagedJsonText: '[{"name":"B1"}]',
    sourceName: 'Sjson.json',
    options: { inferOdFromNominalBore: true },
  });
  assert.equal(worker.request.type, 'RUN');
  assert.equal(typeof worker.request.requestId, 'string');
  assert.deepEqual(worker.request.input, {
    stagedJsonText: '[{"name":"B1"}]',
    sourceName: 'Sjson.json',
    options: { inferOdFromNominalBore: true },
  });
  assert.equal(client.isRunning(), true);

  worker.emit('message', {
    data: { type: 'COMPLETE', requestId: worker.request.requestId, result: { inputXmlText: '<CAESARII/>' } },
  });
  const result = await completion;
  assert.deepEqual(result, { inputXmlText: '<CAESARII/>' });
  assert.equal(client.isRunning(), false);
  assert.equal(worker.terminated, true);
}

// 2. A FAILURE message rejects with an Error carrying .code/.diagnostics.
{
  let worker;
  const client = createStagedJsonToInputXmlWorkerClient(() => {
    worker = new FakeWorker();
    return worker;
  });
  const completion = client.convert({ stagedJsonText: '[]' });
  worker.emit('message', {
    data: {
      type: 'FAILURE',
      requestId: worker.request.requestId,
      error: { name: 'Error', message: 'boom', code: 'STAGEDJSON_TO_INPUTXML_CONVERSION_FAILED', diagnostics: { summary: { error: 1 } } },
    },
  });
  await assert.rejects(completion, (error) => {
    assert.equal(error.message, 'boom');
    assert.equal(error.code, 'STAGEDJSON_TO_INPUTXML_CONVERSION_FAILED');
    assert.deepEqual(error.diagnostics, { summary: { error: 1 } });
    return true;
  });
}

// 3. A native worker `error` event rejects with a sane fallback message.
{
  let worker;
  const client = createStagedJsonToInputXmlWorkerClient(() => {
    worker = new FakeWorker();
    return worker;
  });
  const completion = client.convert({ stagedJsonText: '[]' });
  worker.emit('error', { message: 'Worker crashed.' });
  await assert.rejects(completion, (error) => {
    assert.equal(error.message, 'Worker crashed.');
    return true;
  });
}

// 4. Single-active-run guard: calling convert() while one is in flight
// throws rather than silently starting a second worker.
{
  const client = createStagedJsonToInputXmlWorkerClient(() => new FakeWorker());
  client.convert({ stagedJsonText: '[]' });
  assert.throws(() => client.convert({ stagedJsonText: '[]' }), TypeError);
}

// 5. stagedJsonText is required and validated before a worker is even
// created.
{
  const client = createStagedJsonToInputXmlWorkerClient(() => new FakeWorker());
  assert.throws(() => client.convert({}), TypeError);
  assert.throws(() => client.convert({ stagedJsonText: '   ' }), TypeError);
}

// 6. cancel() terminates the worker and rejects with an AbortError.
{
  let worker;
  const client = createStagedJsonToInputXmlWorkerClient(() => {
    worker = new FakeWorker();
    return worker;
  });
  const completion = client.convert({ stagedJsonText: '[]' });
  client.cancel();
  assert.equal(worker.terminated, true);
  assert.equal(client.isRunning(), false);
  await assert.rejects(completion, (error) => error.name === 'AbortError');
}

console.log(JSON.stringify({
  check: 'stagedjson-to-inputxml-worker-client',
  status: 'PASS',
}));
