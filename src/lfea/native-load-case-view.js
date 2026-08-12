/**
 * Real load-case authoring: the requested physical case set is currently a
 * hidden default (weight-only) inside the source controller. This surfaces
 * every physical case the current source actually supports
 * (preFlight.preparation.physicalPreparation.physicalCases -- the same real,
 * already-computed set native-b31-authoring.js's candidates already use) and
 * lets a person choose which subset to request before analysis, instead of
 * always solving weight-only.
 */
export function mountLfeaNativeLoadCaseView(root, { onApplyCaseSelection } = {}) {
  if (!root?.ownerDocument) throw new TypeError('Native load case root is required.');
  const doc = root.ownerDocument;
  let checked = new Set();
  let statusMessage = '';
  let statusIsError = false;
  let lastPreFlight = null;
  let seededForHash = null;

  function update(preFlight) {
    lastPreFlight = preFlight;
    const cases = availableCases(preFlight);
    const requested = new Set(preFlight?.preparation?.requestedCaseIds ?? []);
    const sourceHash = preFlight?.preparation?.sourceBundleSemanticHash ?? null;
    if (sourceHash !== seededForHash) {
      checked = new Set(requested);
      seededForHash = sourceHash;
    }

    const section = doc.createElement('section');
    section.className = 'lfea-load-case-authoring';
    section.append(heading(doc, 'Load case selection'));
    section.append(paragraph(doc,
      'Select which real physical cases (derived from this source\'s declared weight/thermal/pressure authority) to request for analysis. The currently authorized set is shown below.'));
    if (statusMessage) section.append(statusBanner(doc, statusMessage, statusIsError));
    section.append(requestedTable(doc, preFlight));
    section.append(candidateTable(doc, cases, requested));
    section.append(applyButton(doc, cases));
    root.replaceChildren(section);
  }

  function requestedTable(document_, preFlight) {
    const wrap = document_.createElement('div');
    const requestedIds = preFlight?.preparation?.requestedCaseIds ?? [];
    const authorized = preFlight?.preparation?.authorizedCaseCandidates ?? [];
    wrap.append(factTable(document_, [
      ['Currently requested', requestedIds.join(', ') || '—'],
      ['Authorized physical cases', authorized.map((row) => row.caseId).join(', ') || '—'],
    ]));
    return wrap;
  }

  function candidateTable(document_, cases, requested) {
    const wrap = document_.createElement('div');
    wrap.append(heading(document_, 'Available physical cases', 'h3'));
    if (cases.length === 0) {
      wrap.append(paragraph(document_, 'No physical case is compiled for the current source yet.'));
      return wrap;
    }
    const table = document_.createElement('table');
    table.className = 'lfea-journey-table lfea-load-case-candidates';
    const head = document_.createElement('tr');
    for (const label of ['', 'Case', 'Role', 'Currently requested']) {
      const th = document_.createElement('th'); th.textContent = label; head.append(th);
    }
    table.append(head);
    for (const row of cases) {
      const tr = document_.createElement('tr');
      const cell = document_.createElement('td');
      const checkbox = document_.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.role = 'lfea-load-case-checkbox';
      checkbox.dataset.caseId = row.caseId;
      checkbox.checked = checked.has(row.caseId);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) checked.add(row.caseId); else checked.delete(row.caseId);
      });
      cell.append(checkbox);
      tr.append(cell);
      for (const value of [row.caseId, row.caseRole, requested.has(row.caseId) ? 'YES' : 'NO']) {
        const td = document_.createElement('td'); td.textContent = value; tr.append(td);
      }
      table.append(tr);
    }
    wrap.append(table);
    return wrap;
  }

  function applyButton(document_, cases) {
    const button = document_.createElement('button');
    button.type = 'button';
    button.dataset.role = 'lfea-load-case-apply';
    button.textContent = 'Apply case selection';
    button.disabled = cases.length === 0;
    button.addEventListener('click', () => {
      try {
        onApplyCaseSelection?.([...checked]);
        statusMessage = `Requested ${checked.size} case(s).`;
        statusIsError = false;
      } catch (error) {
        statusMessage = error?.message ?? String(error);
        statusIsError = true;
      }
      update(lastPreFlight);
    });
    return button;
  }

  function destroy() { root.replaceChildren(); }
  return Object.freeze({ update, destroy });
}

function availableCases(preFlight) {
  const cases = preFlight?.preparation?.physicalPreparation?.physicalCases;
  return Array.isArray(cases)
    ? [...cases].map((row) => ({ caseId: row.caseId, caseRole: row.caseRole })).sort((a, b) => (a.caseId < b.caseId ? -1 : 1))
    : [];
}
function heading(doc, text, tag = 'h2') { const node = doc.createElement(tag); node.textContent = text; return node; }
function paragraph(doc, text) { const p = doc.createElement('p'); p.className = 'lfea-journey-copy'; p.textContent = text; return p; }
function statusBanner(doc, message, isError) {
  const p = doc.createElement('p');
  p.className = 'lfea-journey-copy';
  p.dataset.role = 'lfea-load-case-status';
  p.dataset.status = isError ? 'error' : 'ok';
  p.textContent = message;
  return p;
}
function factTable(doc, rows) {
  const table = doc.createElement('table');
  table.className = 'lfea-journey-table';
  for (const [label, value] of rows) {
    const tr = doc.createElement('tr');
    const th = doc.createElement('th'); th.scope = 'row'; th.textContent = label;
    const td = doc.createElement('td'); td.textContent = value;
    tr.append(th, td); table.append(tr);
  }
  return table;
}
