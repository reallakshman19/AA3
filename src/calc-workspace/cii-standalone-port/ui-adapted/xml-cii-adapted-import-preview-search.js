import { resolveLineListDensity } from '../core/line-density-resolver.js';
import { normalizeLineListRow } from '../core/linelist-mapping.js';
import { MASTER_FIELDS } from './xml-cii-adapted-fields-config.js';

const previewSearchMetrics = {
  rowBuilds: 0,
  rowsNormalized: 0,
  mappingResolutions: 0,
  supportConfigParses: 0,
  searchIndexBuilds: 0,
  searchTextRows: 0,
};

function text(value, fallback = '') {
  const out = String(value ?? '').trim();
  return out || fallback;
}

function mappedFieldMap(masterKey, state) {
  previewSearchMetrics.mappingResolutions += 1;
  const configKey = MASTER_FIELDS[masterKey]?.configKey;
  const contextMap = state.masterContext?.config?.[configKey]?.fieldMap;
  if (contextMap && Object.keys(contextMap).length > 0) return contextMap;

  let config = {};
  try {
    previewSearchMetrics.supportConfigParses += 1;
    config = JSON.parse(state.supportConfigJson || '{}');
  } catch {}
  return config[configKey]?.fieldMap || {};
}

function readMappedValue(row, keys) {
  for (const key of keys) {
    const value = key ? row?.[key] : '';
    if (text(value)) return text(value);
  }
  return '';
}

function normalizePreviewSearchRow(row, masterKey, fieldMap, index) {
  if (masterKey !== 'lineList') return row;
  const normalized = row?.lineNoKey || row?.lineNo || row?.lineKey || row?.lineSeqNo
    ? row : normalizeLineListRow(row, fieldMap, index);
  const raw = normalized?._raw || row;
  const densityInfo = resolveLineListDensity({ ...normalized, _raw: raw }, null, fieldMap);
  return {
    ...normalized,
    lineKey1: text(normalized?.lineKey1) || readMappedValue(raw, [fieldMap.lineKey1, 'lineKey1', 'Service', 'SERVICE']),
    lineKey2: text(normalized?.lineKey2) || readMappedValue(raw, [fieldMap.lineKey2, 'lineKey2', 'Line number', 'Line Number']),
    lineSeqNo: text(normalized?.lineSeqNo) || readMappedValue(raw, [fieldMap.lineSeqNo, 'lineSeqNo', 'Line number', 'Line Number']),
    operatingFluidDensity: densityInfo.value || '',
    densitySource: densityInfo.source || 'none',
  };
}

function previewSourceRows(master, state) {
  if (Array.isArray(master.rows) && master.rows.length > 0) return master.rows;
  return Array.isArray(state.masterContext?.rawRows?.[master.key])
    ? state.masterContext.rawRows[master.key]
    : [];
}

/**
 * Builds the full searchable projection only when search is requested. Exactly
 * one authoritative row source is normalized: canonical master.rows when
 * available, otherwise rawRows. Mapping is resolved once per build and reused
 * for every row; supportConfigJson is never parsed per row.
 */
export function buildPreviewSearchRows(master, state) {
  const sourceRows = previewSourceRows(master, state);
  const fieldMap = master.key === 'lineList' ? mappedFieldMap(master.key, state) : {};
  previewSearchMetrics.rowBuilds += 1;
  previewSearchMetrics.rowsNormalized += sourceRows.length;
  return sourceRows.map((row, index) => normalizePreviewSearchRow(row, master.key, fieldMap, index));
}

/**
 * Builds searchable text once per row so subsequent keystrokes perform only
 * string inclusion against the cached index. This object is presentation-only;
 * engineering Preview/calculation continue to consume the authoritative rows.
 */
export function buildPreviewSearchIndex(master, state) {
  const rows = buildPreviewSearchRows(master, state);
  previewSearchMetrics.searchIndexBuilds += 1;
  previewSearchMetrics.searchTextRows += rows.length;
  return rows.map((row) => ({
    row,
    searchText: previewSearchText(row),
  }));
}

export function previewSearchText(row) {
  const values = Object.entries(row || {})
    .filter(([key]) => !key.startsWith('_'))
    .map(([, value]) => text(value));
  const composites = [
    `${text(row?.lineKey1)}${text(row?.lineSeqNo)}`,
    `${text(row?.lineKey1)}${text(row?.lineNoKey)}`,
    `${text(row?.lineKey1)}${text(row?.lineKey2)}`,
    text(row?.lineNoKey),
    text(row?.lineNo),
    text(row?.lineKey),
  ];
  return [...values, ...composites].join(' ').toLowerCase();
}

export function getPreviewSearchMetrics() {
  return { ...previewSearchMetrics };
}

export function resetPreviewSearchMetrics() {
  previewSearchMetrics.rowBuilds = 0;
  previewSearchMetrics.rowsNormalized = 0;
  previewSearchMetrics.mappingResolutions = 0;
  previewSearchMetrics.supportConfigParses = 0;
  previewSearchMetrics.searchIndexBuilds = 0;
  previewSearchMetrics.searchTextRows = 0;
}
