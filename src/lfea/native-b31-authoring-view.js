import { buildB31SustainedCheck, listB31SustainedCandidates } from './native-b31-authoring.js';

/**
 * Real B31 SUSTAINED authority authoring: pick real candidates (straight-pipe
 * element/end/case combinations the model actually has), supply a real
 * caller-authorized code profile/edition dataset (never invented here --
 * ASME allowable-stress tables are licensed content, matching this
 * project's "no hidden values" rule the same way a pasted InputXML file
 * is the only source of geometry), then stage/authorize/publish through the
 * existing governed chain.
 */
export function mountLfeaNativeB31AuthoringView(root, { onStage, onAuthorize, onPublish } = {}) {
  if (!root?.ownerDocument) throw new TypeError('Native B31 authoring root is required.');
  const doc = root.ownerDocument;
  let selected = new Set();
  let profileText = '';
  let datasetText = '';
  let statusMessage = '';
  let statusIsError = false;
  let lastPreFlight = null;
  let lastB31State = null;

  function update(preFlight, b31State) {
    lastPreFlight = preFlight;
    lastB31State = b31State;
    const section = doc.createElement('section');
    section.className = 'lfea-b31-authoring';
    section.append(heading(doc, 'B31.3 SUSTAINED code-check authoring'));
    section.append(paragraph(doc,
      'Select real straight-pipe element/end/case combinations from the current model, supply a caller-authorized ASME B31.3 code profile and edition dataset, then stage, review, and publish the code check.'));
    if (statusMessage) section.append(statusBanner(doc, statusMessage, statusIsError));
    section.append(codeAuthorityInputs(doc));
    section.append(candidateTable(doc, preFlight));
    section.append(stageButton(doc, preFlight));
    section.append(authorityPanel(doc, b31State));
    root.replaceChildren(section);
  }

  function codeAuthorityInputs(document_) {
    const wrap = document_.createElement('div');
    wrap.className = 'lfea-b31-authoring-code-authority';
    wrap.append(fieldLabel(document_, 'Code profile (JSON, already sealed)'));
    const profileArea = textarea(document_, 'lfea-b31-code-profile-input', profileText,
      (value) => { profileText = value; });
    wrap.append(profileArea);
    wrap.append(fieldLabel(document_, 'Edition dataset (JSON, already sealed)'));
    const datasetArea = textarea(document_, 'lfea-b31-edition-dataset-input', datasetText,
      (value) => { datasetText = value; });
    wrap.append(datasetArea);
    return wrap;
  }

  function candidateTable(document_, preFlight) {
    const wrap = document_.createElement('div');
    const candidates = listB31SustainedCandidates(preFlight);
    wrap.append(heading(document_, 'Real SUSTAINED candidates', 'h3'));
    if (candidates.length === 0) {
      wrap.append(paragraph(document_, 'No eligible straight-pipe element/end/SUSTAINED-case combination is available yet.'));
      return wrap;
    }
    const table = document_.createElement('table');
    table.className = 'lfea-journey-table lfea-b31-candidates';
    const head = document_.createElement('tr');
    for (const label of ['', 'Element', 'End', 'Case', 'Role']) {
      const th = document_.createElement('th'); th.textContent = label; head.append(th);
    }
    table.append(head);
    for (const row of candidates) {
      const tr = document_.createElement('tr');
      const checkboxCell = document_.createElement('td');
      const checkbox = document_.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.role = 'lfea-b31-candidate-checkbox';
      checkbox.dataset.candidateId = row.candidateId;
      checkbox.checked = selected.has(row.candidateId);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selected.add(row.candidateId); else selected.delete(row.candidateId);
      });
      checkboxCell.append(checkbox);
      tr.append(checkboxCell);
      for (const value of [row.elementId, row.end, row.caseId, row.caseRole]) {
        const td = document_.createElement('td'); td.textContent = value; tr.append(td);
      }
      table.append(tr);
    }
    wrap.append(table);
    return wrap;
  }

  function stageButton(document_, preFlight) {
    const candidates = listB31SustainedCandidates(preFlight);
    const button = document_.createElement('button');
    button.type = 'button';
    button.dataset.role = 'lfea-b31-stage';
    button.textContent = 'Stage B31 authority';
    button.disabled = candidates.length === 0;
    button.addEventListener('click', () => {
      try {
        const checks = candidates
          .filter((row) => selected.has(row.candidateId))
          .map((row) => buildB31SustainedCheck({
            preFlight, elementId: row.elementId, end: row.end, caseId: row.caseId,
            checkId: `B31-SUS-${row.elementId}-${row.end}-${row.caseId}`,
          }));
        if (checks.length === 0) throw new Error('Select at least one candidate before staging.');
        const codeProfile = parseJson(profileText, 'code profile');
        const editionDataset = parseJson(datasetText, 'edition dataset');
        onStage?.({
          parentSourceBundleSemanticHash: preFlight.preparation.sourceBundleSemanticHash,
          parentModelSemanticHash: preFlight.preparation.modelSemanticHash,
          codeProfile, editionDataset, checks,
        });
        statusMessage = `Staged ${checks.length} check(s).`;
        statusIsError = false;
        selected = new Set();
      } catch (error) {
        statusMessage = error?.message ?? String(error);
        statusIsError = true;
        update(lastPreFlight, lastB31State);
      }
    });
    return button;
  }

  function authorityPanel(document_, state) {
    const wrap = document_.createElement('div');
    wrap.className = 'lfea-b31-authoring-authority';
    wrap.append(heading(document_, 'Staged authority', 'h3'));
    if (!state?.authority) {
      wrap.append(paragraph(document_, 'No B31 authority is currently staged.'));
      return wrap;
    }
    wrap.append(factTable(document_, [
      ['Authority currentness', state.authorityCurrentness],
      ['Authority identity', state.authority.semanticHash],
      ['Code profile identity', state.authority.codeProfile?.semanticHash],
      ['Edition dataset identity', state.authority.editionDataset?.semanticHash],
      ['Checks staged', state.authority.checks?.length],
      ['Publication currentness', state.publicationCurrentness],
    ]));
    wrap.append(authorizeControls(document_, state));
    const publishButton = document_.createElement('button');
    publishButton.type = 'button';
    publishButton.dataset.role = 'lfea-b31-publish';
    publishButton.textContent = 'Publish B31 application';
    publishButton.disabled = state.authorityCurrentness !== 'CURRENT';
    publishButton.addEventListener('click', () => attempt(() => onPublish?.()));
    wrap.append(publishButton);
    return wrap;
  }

  function authorizeControls(document_, state) {
    const wrap = document_.createElement('div');
    wrap.className = 'lfea-b31-authoring-authorize';
    const reviewerInput = document_.createElement('input');
    reviewerInput.type = 'text';
    reviewerInput.placeholder = 'Reviewer identity';
    reviewerInput.dataset.role = 'lfea-b31-reviewer-identity';
    const reasonInput = document_.createElement('input');
    reasonInput.type = 'text';
    reasonInput.placeholder = 'Reason';
    reasonInput.dataset.role = 'lfea-b31-reviewer-reason';
    const button = document_.createElement('button');
    button.type = 'button';
    button.dataset.role = 'lfea-b31-authorize';
    button.textContent = 'Authorize staged authority';
    button.disabled = state.authorityCurrentness !== 'REVIEW_REQUIRED';
    button.addEventListener('click', () => attempt(() => onAuthorize?.({
      reviewerIdentity: reviewerInput.value, reason: reasonInput.value,
      acceptedAuthoritySemanticHash: state.authority.semanticHash,
    })));
    wrap.append(reviewerInput, reasonInput, button);
    return wrap;
  }

  function attempt(action) {
    try { action(); statusMessage = 'Action succeeded.'; statusIsError = false; }
    catch (error) {
      statusMessage = error?.message ?? String(error);
      statusIsError = true;
      update(lastPreFlight, lastB31State);
    }
  }

  function destroy() { root.replaceChildren(); }
  return Object.freeze({ update, destroy });
}

function parseJson(text, label) {
  try { return JSON.parse(text); }
  catch { throw new Error(`${label} is not valid JSON.`); }
}
function heading(doc, text, tag = 'h2') { const node = doc.createElement(tag); node.textContent = text; return node; }
function paragraph(doc, text) { const p = doc.createElement('p'); p.className = 'lfea-journey-copy'; p.textContent = text; return p; }
function fieldLabel(doc, text) { const label = doc.createElement('label'); label.textContent = text; return label; }
function textarea(doc, role, value, onInput) {
  const node = doc.createElement('textarea');
  node.dataset.role = role;
  node.rows = 4;
  node.value = value;
  node.addEventListener('input', () => onInput(node.value));
  return node;
}
function statusBanner(doc, message, isError) {
  const p = doc.createElement('p');
  p.className = 'lfea-journey-copy';
  p.dataset.role = 'lfea-b31-authoring-status';
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
    const td = doc.createElement('td'); td.textContent = value === null || value === undefined || value === '' ? '—' : String(value);
    tr.append(th, td); table.append(tr);
  }
  return table;
}
