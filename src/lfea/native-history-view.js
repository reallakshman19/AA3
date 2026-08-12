const HISTORY_EMPTY_TEXT = 'No governed native runs have been retained in this application session.';

/** Read-only History projection. Selection changes History view context only. */
export function mountLfeaNativeHistoryView(rootElement, options = {}) {
  if (!rootElement?.ownerDocument) throw new TypeError('LFEA History view requires a DOM root.');
  const documentRef = rootElement.ownerDocument;
  const onSelectRun = typeof options.onSelectRun === 'function' ? options.onSelectRun : null;
  rootElement.replaceChildren();
  rootElement.classList.add('lfea-native-history');
  rootElement.dataset.role = 'lfea-native-history';

  function update(snapshot) {
    rootElement.replaceChildren(buildHeader(documentRef));
    if (!snapshot?.entries?.length) {
      rootElement.append(paragraph(documentRef, HISTORY_EMPTY_TEXT, 'lfea-native-history-empty'));
      return;
    }
    rootElement.append(buildRunTable(documentRef, snapshot, onSelectRun));
    rootElement.append(buildSelectedDetail(documentRef, snapshot));
  }

  return Object.freeze({
    update,
    destroy() {
      rootElement.replaceChildren();
      rootElement.classList.remove('lfea-native-history');
      delete rootElement.dataset.role;
    },
  });
}

function buildHeader(documentRef) {
  const header = documentRef.createElement('div');
  header.className = 'lfea-native-history-header';
  const title = documentRef.createElement('h2');
  title.textContent = 'Native run History';
  const note = paragraph(documentRef,
    'Retained runs are immutable evidence. Later governed support/B31 publications are append-only attachments to the exact run; selecting history never changes current engineering authority.',
    'lfea-native-history-note');
  header.append(title, note);
  return header;
}

function buildRunTable(documentRef, snapshot, onSelectRun) {
  const table = documentRef.createElement('table');
  table.className = 'lfea-native-history-table';
  const head = documentRef.createElement('thead');
  const headRow = documentRef.createElement('tr');
  ['Run', 'Relation', 'Source SHA', 'Model', 'Cases', 'Raw', 'Recovery', 'Evidence', 'Build'].forEach((label) => {
    const cell = documentRef.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    headRow.append(cell);
  });
  head.append(headRow);
  const body = documentRef.createElement('tbody');
  snapshot.entries.forEach((entry) => body.append(buildRunRow(documentRef, entry, snapshot.selectedRunId, onSelectRun)));
  table.append(head, body);
  return table;
}

function buildRunRow(documentRef, entry, selectedRunId, onSelectRun) {
  const row = documentRef.createElement('tr');
  row.dataset.runId = entry.runId;
  row.dataset.relation = entry.relation;
  if (entry.runId === selectedRunId) row.classList.add('is-selected');
  const identity = entry.record.identity;
  row.append(
    selectableCell(documentRef, entry.runId, onSelectRun),
    textCell(documentRef, entry.relation),
    textCell(documentRef, compact(identity.source.contentSha256)),
    textCell(documentRef, compact(identity.authority.modelSemanticHash)),
    textCell(documentRef, identity.rawExecution.requestedCaseIds.join(', ')),
    textCell(documentRef, identity.rawExecution.status),
    textCell(documentRef, identity.recovery.status),
    textCell(documentRef, attachmentLabel(entry.evidenceAttachments)),
    textCell(documentRef, compact(identity.application.buildSha) ?? identity.application.applicationVersion),
  );
  return row;
}

function selectableCell(documentRef, runId, onSelectRun) {
  const cell = documentRef.createElement('td');
  const button = documentRef.createElement('button');
  button.type = 'button';
  button.className = 'lfea-native-history-select';
  button.dataset.role = 'lfea-history-select-run';
  button.dataset.runId = runId;
  button.textContent = runId;
  button.addEventListener('click', () => onSelectRun?.(runId));
  cell.append(button);
  return cell;
}

function buildSelectedDetail(documentRef, snapshot) {
  const section = documentRef.createElement('section');
  section.className = 'lfea-native-history-detail';
  const title = documentRef.createElement('h3');
  title.textContent = 'Selected run evidence';
  section.append(title);
  const selected = snapshot.selectedRecord;
  if (!selected) {
    section.append(paragraph(documentRef, 'Select a retained run to inspect its provenance.', 'lfea-native-history-empty'));
    return section;
  }
  const entry = snapshot.entries.find((row) => row.runId === selected.runId) ?? null;
  const relation = entry?.relation ?? 'STALE';
  const identity = selected.identity;
  const grid = documentRef.createElement('dl');
  grid.className = 'lfea-native-history-evidence';
  addEvidence(documentRef, grid, 'Run ID', selected.runId);
  addEvidence(documentRef, grid, 'Relation to current model', relation);
  addEvidence(documentRef, grid, 'Source SHA-256', identity.source.contentSha256);
  addEvidence(documentRef, grid, 'Pre-flight', identity.authority.preFlightSemanticHash);
  addEvidence(documentRef, grid, 'Authorization', identity.authority.authorizationSemanticHash);
  addEvidence(documentRef, grid, 'Model', identity.authority.modelSemanticHash);
  addEvidence(documentRef, grid, 'Stiffness', identity.authority.stiffnessStateHash);
  addEvidence(documentRef, grid, 'Load', identity.authority.loadStateHash);
  addEvidence(documentRef, grid, 'Analysis profile', identity.authority.requestedProfileId);
  addEvidence(documentRef, grid, 'Raw execution batch', identity.rawExecution.executionBatchId);
  addEvidence(documentRef, grid, 'Solver profile', identity.rawExecution.solverProfileSemanticHash);
  addEvidence(documentRef, grid, 'Recovery batch', identity.recovery.recoveryBatchId);
  addEvidence(documentRef, grid, 'Recovery profile', identity.recovery.recoveryProfileSemanticHash);
  addEvidence(documentRef, grid, 'LFEA build', identity.application.buildSha ?? identity.application.applicationVersion);
  for (const attachment of entry?.evidenceAttachments ?? []) {
    addEvidence(documentRef, grid, `${attachment.kind} attachment`, attachment.semanticHash);
    addEvidence(documentRef, grid, `${attachment.kind} reviewed authority`, attachment.summary.authorizationSemanticHash);
  }
  section.append(grid);
  return section;
}

function attachmentLabel(attachments = []) {
  return attachments.length ? attachments.map((row) => row.kind).join(', ') : 'None retained';
}
function addEvidence(documentRef, container, label, value) {
  const term = documentRef.createElement('dt');
  term.textContent = label;
  const detail = documentRef.createElement('dd');
  detail.textContent = value ?? 'Not retained';
  container.append(term, detail);
}
function textCell(documentRef, value) {
  const cell = documentRef.createElement('td');
  cell.textContent = value ?? '—';
  return cell;
}
function paragraph(documentRef, value, className) {
  const node = documentRef.createElement('p');
  node.className = className;
  node.textContent = value;
  return node;
}
function compact(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return text.length > 20 ? `${text.slice(0, 17)}…` : text;
}
