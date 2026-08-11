import {
  LINEAR_FEA_UNITS,
  TRANSLATIONAL_DOFS,
} from '../core/linear-fea-contract/index.js';

const ACTION_FIELDS = Object.freeze(['fx', 'fy', 'fz', 'mx', 'my', 'mz']);

export function mountLfeaNativeResultsView(root) {
  if (!root?.ownerDocument) throw new TypeError('Native Results root is required.');
  let current = null;
  function update(executionState, resultsState) {
    current = { executionState, resultsState };
    render(root, executionState, resultsState);
    return current;
  }
  function destroy() {
    current = null;
    root.replaceChildren();
  }
  return Object.freeze({ update, destroy, getState: () => current });
}

function render(root, executionState, resultsState) {
  const doc = root.ownerDocument;
  const section = doc.createElement('section');
  section.className = 'lfea-results-panel';
  section.dataset.currentness = resultsState?.currentness ?? 'NONE';
  section.append(header(doc, resultsState));

  if (resultsState?.currentness !== 'CURRENT' || !resultsState.results) {
    section.append(nonCurrentMessage(doc, executionState, resultsState));
    root.replaceChildren(section);
    return;
  }

  const batch = resultsState.results;
  section.append(factTable(doc, [
    ['Recovery batch', batch.recoveryBatchId],
    ['Recovery status', batch.status],
    ['Raw execution batch', batch.rawExecutionBatchId],
    ['Recovery profile identity', batch.recoveryProfileSemanticHash],
    ['Force-field stations/span', declared(batch.recoveryProfile.elementForceStationsPerSpan)],
    ['Code-point consistency tolerance', declared(batch.recoveryProfile.codePointConsistencyTolerance)],
    ['Local + global actions retained', batch.recoveryProfile.retainLocalAndGlobalActions ? 'YES' : 'NO'],
    ['Mechanical model identity', batch.modelSemanticHash],
    ['Stiffness identity', batch.stiffnessStateHash],
    ['Load identity', batch.loadStateHash],
  ]));

  for (const caseResult of batch.caseRecoveries) {
    const rawCase = executionState.execution.caseExecutions
      .find((candidate) => candidate.caseId === caseResult.caseId);
    section.append(casePanel(doc, rawCase, caseResult));
  }
  root.replaceChildren(section);
}

function header(doc, resultsState) {
  const headerNode = doc.createElement('header');
  headerNode.className = 'lfea-results-header';
  const title = doc.createElement('h2');
  title.textContent = 'Results authority';
  const badge = doc.createElement('span');
  badge.className = 'lfea-journey-status';
  badge.textContent = resultsState?.currentness ?? 'NONE';
  headerNode.append(title, badge);
  const note = doc.createElement('p');
  note.className = 'lfea-journey-copy';
  note.textContent = 'Raw B-3.3 solver quantities and recovered B-3.4 element actions are displayed as separate authorities in canonical FEA units. Support-action and code-applied quantities are not derived here.';
  const wrapper = doc.createElement('div');
  wrapper.append(headerNode, note);
  return wrapper;
}

function nonCurrentMessage(doc, executionState, resultsState) {
  const block = doc.createElement('div');
  block.className = 'lfea-results-noncurrent';
  if (resultsState?.currentness === 'STALE') {
    block.append(text(doc,
      'Retained recovery evidence is STALE relative to current raw/source/model authority. Engineering values are intentionally hidden from the current Results surface.'));
    block.append(codeList(doc, 'Stale reasons', resultsState.staleReasonCodes));
    if (resultsState.results?.recoveryBatchId) {
      block.append(factTable(doc, [['Retained recovery batch', resultsState.results.recoveryBatchId]]));
    }
    return block;
  }
  const rawCurrent = executionState?.currentness === 'CURRENT';
  block.append(text(doc, rawCurrent
    ? 'A current raw execution exists, but governed B-3.4 recovery has not produced current Results.'
    : 'Run a reviewed native analysis to create current raw execution before Results recovery.'));
  return block;
}

function casePanel(doc, rawCase, caseResult) {
  const section = doc.createElement('section');
  section.className = 'lfea-results-case';
  const title = doc.createElement('h3');
  title.textContent = `${caseResult.caseId} · ${caseResult.caseRole}`;
  section.append(title, factTable(doc, [
    ['Raw execution status', caseResult.executionStatus],
    ['Raw execution identity', caseResult.executionHash],
    ['Physical load identity', caseResult.physicalLoadCaseHash],
    ['Recovery identity', caseResult.recoveryHash],
    ['Recovery evidence identity', caseResult.recoveryEvidenceHash],
  ]));
  if (rawCase) {
    section.append(subheading(doc, 'Raw B-3.3 displacement — GLOBAL basis'));
    section.append(rawVectorTable(doc, rawCase.execution.displacement, 'RAW_B3.3_DISPLACEMENT', displacementUnit));
    section.append(subheading(doc, 'Raw B-3.3 reactions — GLOBAL basis'));
    section.append(rawVectorTable(doc, rawCase.execution.reactions, 'RAW_B3.3_REACTION', reactionUnit));
  }
  section.append(subheading(doc, 'Recovered B-3.4 element-end actions'));
  section.append(recoveredActionTable(doc, caseResult.recovery.elementActions));
  return section;
}

function rawVectorTable(doc, rows, authority, unitForDof) {
  const table = tableWithHead(doc, ['Node', 'DOF', 'Value', 'Unit', 'Basis', 'Authority']);
  for (const row of rows) {
    table.append(tableRow(doc, [row.nodeId, row.dof, row.value, unitForDof(row.dof), 'GLOBAL', authority]));
  }
  return scrollWrap(doc, table);
}

function recoveredActionTable(doc, actions) {
  const labels = ['Element', 'End', 'Basis', ...ACTION_FIELDS.map((field) => `${field.toUpperCase()} [${actionUnit(field)}]`), 'Authority'];
  const table = tableWithHead(doc, labels);
  for (const action of actions) {
    for (const end of ['I', 'J']) {
      for (const basis of ['local', 'global']) {
        const values = ACTION_FIELDS.map((field) => action[basis][end][field]);
        table.append(tableRow(doc, [
          action.elementId,
          end,
          basis.toUpperCase(),
          ...values,
          'RECOVERED_B3.4_ELEMENT_ACTION',
        ]));
      }
    }
  }
  return scrollWrap(doc, table);
}

function displacementUnit(dof) {
  return TRANSLATIONAL_DOFS.includes(dof) ? LINEAR_FEA_UNITS.length : LINEAR_FEA_UNITS.rotation;
}
function reactionUnit(dof) {
  return TRANSLATIONAL_DOFS.includes(dof) ? LINEAR_FEA_UNITS.force : LINEAR_FEA_UNITS.moment;
}
function actionUnit(field) { return field.startsWith('f') ? LINEAR_FEA_UNITS.force : LINEAR_FEA_UNITS.moment; }

function factTable(doc, rows) {
  const table = doc.createElement('table');
  table.className = 'lfea-journey-table';
  for (const [label, value] of rows) {
    const tr = doc.createElement('tr');
    const th = doc.createElement('th'); th.scope = 'row'; th.textContent = label;
    const td = doc.createElement('td'); td.textContent = display(value);
    tr.append(th, td); table.append(tr);
  }
  return table;
}

function tableWithHead(doc, labels) {
  const table = doc.createElement('table');
  table.className = 'lfea-journey-table lfea-results-table';
  const tr = doc.createElement('tr');
  for (const label of labels) { const th = doc.createElement('th'); th.textContent = label; tr.append(th); }
  table.append(tr);
  return table;
}

function tableRow(doc, values) {
  const tr = doc.createElement('tr');
  for (const value of values) { const td = doc.createElement('td'); td.textContent = display(value); tr.append(td); }
  return tr;
}

function scrollWrap(doc, table) {
  const wrap = doc.createElement('div'); wrap.className = 'lfea-results-table-wrap'; wrap.append(table); return wrap;
}
function subheading(doc, value) { const heading = doc.createElement('h4'); heading.textContent = value; return heading; }
function text(doc, value) { const p = doc.createElement('p'); p.className = 'lfea-journey-copy'; p.textContent = value; return p; }
function codeList(doc, label, values) { const box = doc.createElement('div'); box.append(subheading(doc, label)); const list = doc.createElement('ul'); for (const value of values ?? []) { const li = doc.createElement('li'); const code = doc.createElement('code'); code.textContent = value; li.append(code); list.append(li); } box.append(list); return box; }
function declared(entry) { return entry ? `${entry.value} · ${entry.source}` : null; }
function display(value) { return value === null || value === undefined || value === '' ? '—' : String(value); }
