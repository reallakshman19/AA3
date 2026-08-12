const PREVIEW_ROW_LIMIT = 250;

/** Read-only run comparison surface. Engineering compatibility comes from the comparison engine. */
export function mountLfeaNativeComparisonView(root, options = {}) {
  if (!root?.ownerDocument) throw new TypeError('LFEA Compare view requires a DOM root.');
  const onCompare = typeof options.onCompare === 'function' ? options.onCompare : null;

  function update(historySnapshot, state) {
    const doc = root.ownerDocument;
    root.replaceChildren(header(doc));
    const entries = historySnapshot?.entries ?? [];
    if (entries.length < 2) {
      root.append(message(doc, 'At least two retained native runs are required before semantic comparison is available.'));
      return;
    }
    root.append(selectorPanel(doc, entries, state, onCompare));
    if (state?.comparison) root.append(comparisonPanel(doc, state.comparison));
  }

  return Object.freeze({
    update,
    destroy() { root.replaceChildren(); },
  });
}

function header(doc) {
  const wrapper = doc.createElement('div');
  wrapper.className = 'lfea-native-comparison-header';
  const title = doc.createElement('h2');
  title.textContent = 'Semantic run Compare';
  wrapper.append(title, message(doc,
    'Deltas are produced only when quantity, dimension, unit, basis, sign convention, entity/station, physical case, result authority, and method identity are directly compatible.'));
  return wrapper;
}

function selectorPanel(doc, entries, state, onCompare) {
  const form = doc.createElement('div');
  form.className = 'lfea-native-comparison-controls';
  const left = runSelect(doc, 'Run A', entries, state?.leftRunId);
  const right = runSelect(doc, 'Run B', entries, state?.rightRunId);
  const button = doc.createElement('button');
  button.type = 'button';
  button.dataset.role = 'lfea-compare-runs';
  button.textContent = 'Compare selected runs';
  const updateDisabled = () => { button.disabled = !left.select.value || !right.select.value || left.select.value === right.select.value; };
  left.select.addEventListener('change', updateDisabled);
  right.select.addEventListener('change', updateDisabled);
  button.addEventListener('click', () => onCompare?.(left.select.value, right.select.value));
  updateDisabled();
  form.append(left.label, right.label, button);
  return form;
}

function runSelect(doc, text, entries, selectedRunId) {
  const label = doc.createElement('label');
  label.className = 'lfea-native-comparison-run';
  const caption = doc.createElement('span');
  caption.textContent = text;
  const select = doc.createElement('select');
  select.dataset.role = `lfea-compare-${text === 'Run A' ? 'left' : 'right'}`;
  const blank = doc.createElement('option');
  blank.value = '';
  blank.textContent = 'Select retained run';
  select.append(blank);
  for (const entry of entries) {
    const option = doc.createElement('option');
    option.value = entry.runId;
    option.textContent = `${entry.runId} · ${entry.relation}`;
    option.selected = entry.runId === selectedRunId;
    select.append(option);
  }
  label.append(caption, select);
  return { label, select };
}

function comparisonPanel(doc, comparison) {
  const section = doc.createElement('section');
  section.className = 'lfea-native-comparison-result';
  const heading = doc.createElement('h3');
  heading.textContent = `${comparison.leftRunId} ↔ ${comparison.rightRunId}`;
  section.append(heading, facts(doc, [
    ['Comparison identity', comparison.semanticHash],
    ['Total semantic slots', comparison.rowCount],
    ['Directly comparable', comparison.comparableCount],
    ['Not directly comparable', comparison.incompatibleCount],
  ]));
  if (comparison.rows.length > PREVIEW_ROW_LIMIT) {
    section.append(message(doc,
      `Showing the first ${PREVIEW_ROW_LIMIT} of ${comparison.rows.length} comparison rows. The complete comparison remains retained in application state.`));
  }
  section.append(comparisonTable(doc, comparison.rows.slice(0, PREVIEW_ROW_LIMIT)));
  return section;
}

function comparisonTable(doc, rows) {
  const table = doc.createElement('table');
  table.className = 'lfea-native-comparison-table';
  const head = doc.createElement('tr');
  ['Status', 'Case', 'Entity', 'Station', 'Quantity', 'Basis', 'Unit', 'A', 'B', 'Δ(B-A)', 'Reasons'].forEach((label) => {
    const th = doc.createElement('th'); th.textContent = label; head.append(th);
  });
  table.append(head);
  for (const row of rows) table.append(comparisonRow(doc, row));
  const wrap = doc.createElement('div');
  wrap.className = 'lfea-native-comparison-table-wrap';
  wrap.append(table);
  return wrap;
}

function comparisonRow(doc, row) {
  const reference = row.left ?? row.right;
  const tr = doc.createElement('tr');
  tr.dataset.status = row.status;
  const values = [
    row.status,
    reference?.caseId,
    reference?.entityIdentity,
    reference?.stationIdentity,
    reference?.quantityId,
    reference?.basisId,
    reference?.unit,
    row.left?.value,
    row.right?.value,
    row.delta,
    row.reasonCodes.join(', '),
  ];
  for (const value of values) {
    const td = doc.createElement('td'); td.textContent = display(value); tr.append(td);
  }
  return tr;
}

function facts(doc, rows) {
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

function message(doc, text) {
  const p = doc.createElement('p');
  p.className = 'lfea-journey-copy';
  p.textContent = text;
  return p;
}

function display(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}
