

import { LFEA_PIPELINE_ACCDB_PROFILE_IDS } from './lfea-pipeline-accdb-view-model.js';
export async function hashOriginalAccdbBytes(bytes) {
  if (!globalThis.crypto?.subtle) {
    throw new TypeError('ACCDB correction requires SHA-256 to bind exact original source bytes; secure cryptography is unavailable.');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return 'sha256:' + [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0')).join('');
}

export function requireProfileId(requestedProfileId) {
  if (!LFEA_PIPELINE_ACCDB_PROFILE_IDS.includes(requestedProfileId)) {
    throw new TypeError(`Unknown analysis profile ${requestedProfileId}.`);
  }
  return requestedProfileId;
}

export function labelledTextInput(doc, labelText, role, value) {
  const label = doc.createElement('label');
  label.textContent = labelText;
  const input = doc.createElement('input');
  input.type = 'text';
  input.dataset.role = role;
  input.value = value ?? '';
  label.append(input);
  return { label, input };
}

export function cell(doc, text) {
  const td = doc.createElement('td');
  td.textContent = text;
  return td;
}

export function displayValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(Number(value.toPrecision(9)));
  return String(value);
}

/**
 * Severity as a word that says what it means for the engineer, rather than a
 * log level. "ERROR" reads as something broken; most of these are the tool
 * declaring its own limits, which is a different thing.
 */
export function severityWord(severity) {
  if (severity === 'error') return 'Stops the analysis';
  if (severity === 'warning') return 'Review and accept';
  return 'For information';
}

export function topStatus(modelHealth) {
  if (!modelHealth) return 'NOT_LOADED';
  const source = modelHealth.summary.capabilityStatusById?.SOURCE_ACCEPTANCE ?? 'UNKNOWN';
  const topology = modelHealth.summary.capabilityStatusById?.TOPOLOGY_ACCEPTANCE ?? 'UNKNOWN';
  if (source === 'BLOCK' || topology === 'BLOCK') return 'BLOCK';
  if (source === 'CONDITIONAL' || topology === 'CONDITIONAL') return 'CONDITIONAL';
  return 'PASS';
}

export function button(doc, label) {
  const value = doc.createElement('button');
  value.type = 'button';
  value.textContent = label;
  return value;
}

export function errorMessage(error) {
  const prefix = error?.code ? `${error.code}: ` : '';
  return `${prefix}${error?.message ?? String(error)}`;
}
