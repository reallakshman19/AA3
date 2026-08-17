/**
 * Pure render of a StagedJSON -> InputXML conversion diagnostics sidecar
 * (the `diagnostics` object stagedjson-to-inputxml-worker-client.js's
 * convert() resolves with). Modeled on renderUnitDiagnostics /
 * appendFindingList in linear-piping-inputxml-diagnostics-view.js and
 * linear-piping-inputxml-source-workflow.js, but grouped by
 * severity-then-code rather than listed flat: a real converted model can
 * carry hundreds of records (792 on the app's own Sjson.json fixture),
 * and dumping them one <li> per record would make the panel unusable.
 */

export const MAX_DETAIL_ROWS_PER_CODE = 20;

const SEVERITY_ORDER = ['error', 'warning', 'info', 'ok'];
const COLLAPSED_SEVERITIES = new Set(['info', 'ok']);

export function renderStagedJsonConversionDiagnostics(documentRef, root, diagnostics) {
  root.replaceChildren();
  root.dataset.role = 'stagedjson-conversion-diagnostics';
  if (!diagnostics) {
    root.dataset.diagnosticsSchema = '';
    return;
  }
  root.dataset.diagnosticsSchema = diagnostics.schema ?? '';

  root.append(renderSummary(documentRef, diagnostics));

  const records = Array.isArray(diagnostics.records) ? diagnostics.records : [];
  const bySeverity = groupBySeverity(records);
  for (const severity of SEVERITY_ORDER) {
    const severityRecords = bySeverity.get(severity);
    if (!severityRecords || severityRecords.length === 0) continue;
    root.append(renderSeverityGroup(documentRef, severity, severityRecords));
  }
}

function renderSummary(doc, diagnostics) {
  const summary = diagnostics.summary ?? {};
  const table = doc.createElement('table');
  table.dataset.role = 'stagedjson-conversion-diagnostics-summary';
  const rows = [
    ['Status', diagnostics.outputReady ? 'READY' : 'NOT READY'],
    ['Total', summary.total ?? 0],
    ['Errors', summary.error ?? 0],
    ['Warnings', summary.warning ?? 0],
    ['Info', summary.info ?? 0],
    ['OK', summary.ok ?? 0],
    ['Source', diagnostics.sourceName ?? ''],
    ['Output', diagnostics.outputName ?? ''],
    ['Generated at', diagnostics.generatedAt ?? ''],
  ];
  for (const [label, value] of rows) {
    const row = doc.createElement('tr');
    const th = doc.createElement('th');
    th.textContent = label;
    const td = doc.createElement('td');
    td.textContent = String(value);
    row.append(th, td);
    table.append(row);
  }
  return table;
}

function groupBySeverity(records) {
  const bySeverity = new Map();
  for (const record of records) {
    const severity = String(record?.severity ?? 'info').toLowerCase();
    if (!bySeverity.has(severity)) bySeverity.set(severity, []);
    bySeverity.get(severity).push(record);
  }
  return bySeverity;
}

function groupByCode(records) {
  const byCode = new Map();
  for (const record of records) {
    const code = record?.code ?? 'UNKNOWN';
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(record);
  }
  return byCode;
}

function renderSeverityGroup(doc, severity, records) {
  const byCode = groupByCode(records);
  const body = doc.createElement('div');
  body.dataset.severity = severity;
  for (const [code, codeRecords] of byCode) {
    body.append(renderCodeGroup(doc, severity, code, codeRecords));
  }

  if (!COLLAPSED_SEVERITIES.has(severity)) {
    const heading = doc.createElement('strong');
    heading.textContent = `${severity.toUpperCase()} — ${records.length}`;
    const section = doc.createElement('div');
    section.dataset.role = 'stagedjson-conversion-diagnostics-severity-group';
    section.dataset.severity = severity;
    section.append(heading, body);
    return section;
  }

  const details = doc.createElement('details');
  details.dataset.role = 'stagedjson-conversion-diagnostics-severity-group';
  details.dataset.severity = severity;
  const summary = doc.createElement('summary');
  summary.textContent = `${severity.toUpperCase()} — ${records.length} records — expand to view`;
  details.append(summary, body);
  return details;
}

function renderCodeGroup(doc, severity, code, records) {
  const group = doc.createElement('div');
  group.dataset.role = 'stagedjson-conversion-diagnostics-code-group';
  group.dataset.code = code;
  const heading = doc.createElement('strong');
  heading.textContent = `${code} (${records.length}×)`;
  group.append(heading);

  const list = doc.createElement('ul');
  const shown = records.slice(0, MAX_DETAIL_ROWS_PER_CODE);
  for (const record of shown) {
    const item = doc.createElement('li');
    item.dataset.severity = severity;
    item.dataset.code = code;
    const location = record.sourcePath || record.sourceBranch || (record.node != null ? `node ${record.node}` : '');
    item.textContent = location ? `${location}: ${record.message}` : record.message;
    list.append(item);
  }
  if (records.length > shown.length) {
    const more = doc.createElement('li');
    more.dataset.role = 'stagedjson-conversion-diagnostics-more';
    more.textContent = `+${records.length - shown.length} more`;
    list.append(more);
  }
  group.append(list);
  return group;
}
