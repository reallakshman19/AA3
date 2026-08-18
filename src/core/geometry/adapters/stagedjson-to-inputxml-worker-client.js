/**
 * Browser Worker lifecycle for StagedJSON -> InputXML conversion.
 * Mirrors `lfea-worker-client.js`'s RUN/COMPLETE/FAILURE protocol and
 * single-active-run guarantee.
 */
export function createStagedJsonToInputXmlWorkerClient(workerFactory) {
  const createWorker = workerFactory ?? defaultWorkerFactory;
  let active = null;

  function convert({ stagedJsonText, sourceName, options } = {}) {
    if (active) throw new TypeError('A StagedJSON -> InputXML conversion is already active.');
    if (typeof stagedJsonText !== 'string' || !stagedJsonText.trim()) {
      throw new TypeError('stagedJsonText is required.');
    }
    const worker = createWorker();
    const requestId = `stagedjson-to-inputxml-${sequence += 1}`;
    return new Promise((resolve, reject) => {
      const current = { worker, requestId, reject, settled: false };
      active = current;
      worker.addEventListener('message', (event) => {
        const message = event.data ?? {};
        if (message.requestId !== requestId) return;
        if (active !== current || current.settled) return;
        if (message.type === 'FAILURE') {
          settle(current);
          reject(workerFailure(message));
          return;
        }
        if (message.type !== 'COMPLETE') return;
        settle(current);
        resolve(message.result);
      });
      worker.addEventListener('error', (event) => {
        if (active !== current || current.settled) return;
        const message = {
          type: 'FAILURE',
          requestId,
          error: {
            name: 'Error',
            message: event.message || 'StagedJSON -> InputXML worker execution failed.',
            code: null,
          },
        };
        settle(current);
        reject(workerFailure(message));
      });
      worker.postMessage({
        type: 'RUN',
        requestId,
        input: { stagedJsonText, sourceName, options },
      });
    });
  }

  function cancel() {
    if (!active) return;
    const current = active;
    current.settled = true;
    current.worker.terminate();
    active = null;
    current.reject(new DOMException('StagedJSON -> InputXML conversion cancelled.', 'AbortError'));
  }

  function settle(current) {
    current.settled = true;
    current.worker.terminate();
    if (active === current) active = null;
  }

  return Object.freeze({
    convert,
    cancel,
    isRunning: () => Boolean(active),
    destroy: () => cancel(),
  });
}

let sequence = 0;

function defaultWorkerFactory() {
  return new Worker(
    new URL('./stagedjson-to-inputxml-worker.js', import.meta.url),
    { type: 'module', name: 'stagedjson-to-inputxml' },
  );
}

function workerFailure(message) {
  const error = new Error(message.error?.message || 'StagedJSON -> InputXML worker execution failed.');
  error.name = message.error?.name || 'Error';
  if (typeof message.error?.code === 'string') error.code = message.error.code;
  error.diagnostics = message.error?.diagnostics ?? null;
  error.workerMessage = message;
  return error;
}
