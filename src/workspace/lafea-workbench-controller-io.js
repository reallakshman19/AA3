import { LAFEA_WORKBENCH_STYLES } from './lafea-workbench-styles.js';
import { LAFEA_GUIDED_WORKBENCH_STYLES } from './lafea-guided-workbench-styles.js';
import { LAFEA_UI_MODERNIZATION_STYLES } from './lafea-ui-modernization-styles.js';
import { FEA_BENCHMARK_STYLES } from './fea-benchmark-styles.js';

export function installLafeaWorkbenchStyles(documentRef) {
  if (!documentRef || documentRef.querySelector('[data-lafea-workbench-styles]')) return;
  const style = documentRef.createElement('style');
  style.dataset.lafeaWorkbenchStyles = 'true';
  style.textContent = `${LAFEA_WORKBENCH_STYLES}\n${LAFEA_GUIDED_WORKBENCH_STYLES}\n${LAFEA_UI_MODERNIZATION_STYLES}\n${FEA_BENCHMARK_STYLES}`;
  documentRef.head?.append(style);
}

export async function readLafeaUtf8(file) {
  if (typeof file.arrayBuffer === 'function') {
    return new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
  }
  if (typeof file.text === 'function') return file.text();
  throw new TypeError('Selected LAFEA source cannot be read.');
}

export function parseLafeaJsonObject(text, label) {
  const value = JSON.parse(text);
  if (!isLafeaRecord(value)) throw new TypeError(`${label} must be a JSON object.`);
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
