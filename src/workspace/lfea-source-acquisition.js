export const LFEA_SOURCE_ACQUISITION_SCHEMA = 'lfea-source-acquisition/v1';

const SOURCE_KINDS = Object.freeze(['NONE', 'INPUTXML', 'STAGED_JSON', 'ACCDB']);
const SOURCE_LABELS = Object.freeze({
  NONE: 'No source loaded',
  INPUTXML: 'CAESAR II InputXML',
  STAGED_JSON: 'StagedJSON',
  ACCDB: 'CAESAR II ACCDB',
});
const IMPORT_INPUT_ROLE = Object.freeze({
  INPUTXML: 'linear-piping-inputxml-source-file',
  STAGED_JSON: 'lfea-pipeline-stagedjson-source-file',
  ACCDB: 'lfea-pipeline-accdb-source-file',
});
const CLEAR_ACTION = Object.freeze({
  INPUTXML: 'clear-linear-piping-inputxml-source',
  STAGED_JSON: 'clear-lfea-pipeline-stagedjson-source',
  ACCDB: 'clear-lfea-pipeline-accdb-source',
});

export function buildLfeaSourceAcquisitionModel(engineeringState, fallbackKind = 'NONE') {
  const fallback = requireSourceKind(fallbackKind);
  const source = engineeringState?.source ?? null;
  const sourceKind = source && SOURCE_KINDS.includes(source.kind) ? source.kind : fallback;
  const active = sourceKind !== 'NONE';
  const provenance = source?.provenance && typeof source.provenance === 'object' ? source.provenance : {};
  const rows = [];

  if (active) {
    rows.push(['Source representation', SOURCE_LABELS[sourceKind]]);
    rows.push(['Original source', source?.fileName ?? 'Unavailable']);
    if (sourceKind === 'STAGED_JSON') {
      rows.push(['Derived preparation artifact', provenance.derivedInputXmlFileName ?? 'Unavailable']);
      rows.push(['Preparation provider', 'InputXML — derived from StagedJSON']);
      if (provenance.diagnosticsSummary?.warning !== undefined) {
        rows.push(['Conversion warnings', String(provenance.diagnosticsSummary.warning)]);
      }
    } else if (sourceKind === 'INPUTXML') {
      rows.push(['Preparation provider', 'InputXML — native source']);
    } else if (sourceKind === 'ACCDB') {
      rows.push(['Preparation provider', 'ACCDB direct canonical/pre-flight bridge']);
      rows.push(['Engineer overrides', String(provenance.overrideCount ?? 0)]);
    }
  }

  return Object.freeze({
    schema: LFEA_SOURCE_ACQUISITION_SCHEMA,
    active,
    sourceKind,
    sourceLabel: SOURCE_LABELS[sourceKind],
    fileName: source?.fileName ?? null,
    preparationOwner: source?.preparationOwner ?? null,
    identityKey: source?.identityKey ?? null,
    providerIdentityKey: source?.providerIdentityKey ?? null,
    derivedInputXmlFileName: provenance.derivedInputXmlFileName ?? null,
    rows: Object.freeze(rows.map(([label, value]) => Object.freeze({ label, value }))),
  });
}

export function createLfeaSourceAcquisitionController(sourceHostElement, documentRef = sourceHostElement?.ownerDocument) {
  if (!sourceHostElement || typeof sourceHostElement.append !== 'function') {
    throw new TypeError('LFEA source acquisition requires the SOURCE host.');
  }
  if (!documentRef || typeof documentRef.createElement !== 'function') {
    throw new TypeError('LFEA source acquisition requires a document.');
  }
  const elements = createElements(documentRef);
  sourceHostElement.append(elements.section);
  let model = buildLfeaSourceAcquisitionModel(null);

  for (const button of elements.sourceButtons) {
    button.addEventListener('click', () => requestImport(button.dataset.sourceKind));
  }
  elements.clearButton.addEventListener('click', () => clearActiveSource());

  function requestImport(kind) {
    const sourceKind = requireSourceKind(kind);
    if (sourceKind === 'NONE') return;
    if (sourceKind === 'STAGED_JSON') {
      const providerOption = sourceHostElement.querySelector('[data-role="lfea-pipeline-stagedjson-infer-od"]');
      if (providerOption) providerOption.checked = elements.stagedInferOd.checked;
    }
    const input = sourceHostElement.querySelector(`[data-role="${IMPORT_INPUT_ROLE[sourceKind]}"]`);
    if (!input || typeof input.click !== 'function') {
      setStatus(`The ${SOURCE_LABELS[sourceKind]} importer is not available.`, true);
      return;
    }
    setStatus(
      model.active
        ? `Choose the replacement ${SOURCE_LABELS[sourceKind]} file. The current engineering model remains active until a replacement loads successfully.`
        : `Choose a ${SOURCE_LABELS[sourceKind]} file.`,
      false,
    );
    input.click();
  }

  function clearActiveSource() {
    if (!model.active) return;
    const button = sourceHostElement.querySelector(`[data-action="${CLEAR_ACTION[model.sourceKind]}"]`);
    if (!button || typeof button.click !== 'function') {
      setStatus(`The active ${model.sourceLabel} source could not be cleared from this view.`, true);
      return;
    }
    button.click();
  }

  function render(nextModel) {
    if (!nextModel || nextModel.schema !== LFEA_SOURCE_ACQUISITION_SCHEMA) {
      throw new TypeError('LFEA source acquisition render requires the source-acquisition model.');
    }
    model = nextModel;
    elements.section.dataset.activeSource = model.sourceKind;
    elements.activeBadge.hidden = !model.active;
    elements.activeBadge.textContent = model.active ? `Active source: ${model.sourceLabel}` : '';
    elements.clearButton.hidden = !model.active;
    elements.actionLead.textContent = model.active ? 'Replace source' : 'Choose source';
    for (const button of elements.sourceButtons) {
      button.textContent = model.active
        ? `Replace with ${SOURCE_LABELS[button.dataset.sourceKind]}`
        : SOURCE_LABELS[button.dataset.sourceKind];
    }

    elements.summary.replaceChildren();
    if (!model.active) {
      const empty = documentRef.createElement('p');
      empty.dataset.role = 'lfea-source-acquisition-empty';
      empty.textContent = 'Choose one source representation. Only one engineering model is active at a time.';
      elements.summary.append(empty);
      setStatus('No engineering source is loaded.', false);
      return;
    }

    const table = documentRef.createElement('table');
    table.dataset.role = 'lfea-source-acquisition-summary-table';
    for (const row of model.rows) {
      const tr = documentRef.createElement('tr');
      const th = documentRef.createElement('th');
      th.scope = 'row';
      th.textContent = row.label;
      const td = documentRef.createElement('td');
      td.textContent = row.value;
      tr.append(th, td);
      table.append(tr);
    }
    elements.summary.append(table);

    if (model.sourceKind === 'STAGED_JSON') {
      const note = documentRef.createElement('p');
      note.dataset.role = 'lfea-source-acquisition-derived-note';
      note.textContent = 'The InputXML used for governed pre-flight is a derived preparation artifact. The original engineering source remains the StagedJSON file shown above.';
      elements.summary.append(note);
    }

    if (model.identityKey || model.providerIdentityKey) {
      const details = documentRef.createElement('details');
      details.dataset.role = 'lfea-source-acquisition-provenance-ids';
      const summary = documentRef.createElement('summary');
      summary.textContent = 'Provenance identifiers';
      const text = documentRef.createElement('p');
      text.textContent = [
        model.identityKey ? `Source identity: ${model.identityKey}` : null,
        model.providerIdentityKey ? `Preparation-provider identity: ${model.providerIdentityKey}` : null,
      ].filter(Boolean).join(' · ');
      details.append(summary, text);
      elements.summary.append(details);
    }
    setStatus(`Loaded ${model.fileName ?? model.sourceLabel}.`, false);
  }

  function setStatus(text, isError) {
    elements.status.textContent = text;
    elements.status.dataset.status = isError ? 'error' : 'ok';
  }

  render(model);
  return Object.freeze({
    render,
    getModel: () => model,
    destroy() { elements.section.remove(); },
  });
}

function createElements(doc) {
  const section = doc.createElement('section');
  section.className = 'lfea-source-acquisition';
  section.dataset.role = 'lfea-source-acquisition';

  const header = doc.createElement('div');
  header.className = 'lfea-source-acquisition__header';
  const title = doc.createElement('h3');
  title.textContent = 'Source model';
  const activeBadge = doc.createElement('span');
  activeBadge.className = 'lfea-source-acquisition__badge';
  activeBadge.dataset.role = 'lfea-source-acquisition-active';
  activeBadge.hidden = true;
  header.append(title, activeBadge);

  const summary = doc.createElement('div');
  summary.dataset.role = 'lfea-source-acquisition-summary';

  const actions = doc.createElement('div');
  actions.className = 'lfea-source-acquisition__actions';
  actions.dataset.role = 'lfea-source-acquisition-actions';
  const actionLead = doc.createElement('strong');
  actionLead.textContent = 'Choose source';
  actions.append(actionLead);

  const sourceButtons = ['INPUTXML', 'STAGED_JSON', 'ACCDB'].map((sourceKind) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.dataset.action = 'lfea-source-acquisition-import';
    button.dataset.sourceKind = sourceKind;
    button.textContent = SOURCE_LABELS[sourceKind];
    actions.append(button);
    return button;
  });

  const stagedOptions = doc.createElement('details');
  stagedOptions.className = 'lfea-source-acquisition__staged-option';
  stagedOptions.dataset.role = 'lfea-source-acquisition-staged-options';
  const stagedSummary = doc.createElement('summary');
  stagedSummary.textContent = 'StagedJSON options';
  const stagedChoice = doc.createElement('label');
  stagedChoice.className = 'lfea-source-acquisition__staged-option-choice';
  const stagedInferOd = doc.createElement('input');
  stagedInferOd.type = 'checkbox';
  stagedInferOd.dataset.role = 'lfea-source-acquisition-staged-infer-od';
  stagedChoice.append(stagedInferOd, doc.createTextNode(' Infer missing OD from nominal bore'));
  stagedOptions.append(stagedSummary, stagedChoice);
  actions.append(stagedOptions);

  const clearButton = doc.createElement('button');
  clearButton.type = 'button';
  clearButton.dataset.action = 'lfea-source-acquisition-clear';
  clearButton.textContent = 'Clear active source';
  clearButton.hidden = true;
  actions.append(clearButton);

  const status = doc.createElement('output');
  status.className = 'lfea-source-acquisition__status';
  status.dataset.role = 'lfea-source-acquisition-status';
  status.setAttribute('aria-live', 'polite');

  section.append(header, summary, actions, status);
  return { section, activeBadge, summary, actions, actionLead, sourceButtons, stagedInferOd, clearButton, status };
}

function requireSourceKind(value) {
  const kind = String(value ?? '').trim().toUpperCase();
  if (!SOURCE_KINDS.includes(kind)) throw new TypeError(`Unknown LFEA source kind ${String(value)}.`);
  return kind;
}
