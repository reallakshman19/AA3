/**
 * Private typed-form renderer for governed StageInputDescriptor/v2 fields.
 *
 * The renderer consumes declared descriptors and exact entity identities only.
 * It does not discover arbitrary fields or use array position as authority.
 */
import {
  resolveLafeaDescriptorSourceRef,
  resolveLafeaDescriptorUnit,
} from './lafea-stage-input-descriptors.js';
import {
  displayLafeaNumeric,
  firstLafeaEditDiagnostic,
  friendlyLafeaName,
  groupLafeaDescriptors,
  lafeaDescriptorInstances,
  lafeaDescriptorPath,
  lafeaGetAtPath,
  lafeaInputIdentity,
} from './lafea-document-table-support.js';

export function renderLafeaDescriptorForm({
  documentRef,
  container,
  stageId,
  documentValue,
  descriptors,
  onSetScalar,
  onSetScalarBatch = null,
  batchScalarEdits = false,
}) {
  if (!descriptors.length) {
    const blocked = documentRef.createElement('p');
    blocked.className = 'lafea-workbench-svg__empty';
    blocked.textContent = `${stageId} has no governed editable fields.`;
    container.append(blocked);
    return;
  }

  const groups = groupLafeaDescriptors(descriptors);
  for (const [groupId, rows] of groups) {
    const section = documentRef.createElement('section');
    section.className = 'lafea-doc-table-section';
    section.dataset.inputGroup = groupId;
    const title = documentRef.createElement('h4');
    title.textContent = friendlyLafeaName(groupId);
    section.append(title);

    const entityDescriptors = rows.filter(
      (descriptor) => descriptor.valueContract.domainType === 'ENTITY',
    );
    const scalarDescriptors = rows.filter(
      (descriptor) => descriptor.valueContract.domainType === 'NUMBER',
    );
    entityDescriptors.forEach((descriptor) => {
      section.append(
        renderIdentityRegister(documentRef, documentValue, descriptor),
      );
    });

    if (scalarDescriptors.length) {
      section.append(renderScalarTable({
        documentRef,
        stageId,
        documentValue,
        groupId,
        descriptors: scalarDescriptors,
        onSetScalar,
        onSetScalarBatch,
        batchScalarEdits,
      }));
    }
    container.append(section);
  }
}

function renderScalarTable({
  documentRef,
  stageId,
  documentValue,
  groupId,
  descriptors,
  onSetScalar,
  onSetScalarBatch,
  batchScalarEdits,
}) {
  const wrapper = documentRef.createElement('div');
  wrapper.className = 'lafea-doc-group-editor';
  wrapper.dataset.inputGroup = groupId;
  const table = documentRef.createElement('table');
  table.className = 'lafea-doc-grid lafea-doc-grid--governed';
  // A group whose descriptors are complete X/Y/Z triples is presented one row per
  // identity with an input per axis, instead of three full-width rows per point.
  // Ten reference points read as ten rows rather than thirty, and a transcription
  // error is visible across the axes of one point, which is how the value is
  // actually checked. Only batch groups regroup: per-row groups keep their own
  // Apply button and are left exactly as they were.
  const vectorTriples = batchScalarEdits ? collectVectorTriples(descriptors) : new Map();
  const header = documentRef.createElement('tr');
  const headings = vectorTriples.size
    ? ['Engineering identity', 'X', 'Y', 'Z', 'Unit', 'Source/status']
    : ['Engineering identity', 'Input', 'Unit', 'Source/status'];
  if (!batchScalarEdits) headings.push('Action');
  headings.forEach((label) => {
    const cell = documentRef.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    header.append(cell);
  });
  table.append(header);

  const emitted = new Set();
  descriptors.forEach((descriptor) => {
    const triple = vectorTriples.get(descriptor.descriptorId);
    if (triple) {
      if (emitted.has(triple.groupKey)) return;
      emitted.add(triple.groupKey);
      lafeaDescriptorInstances(documentValue, triple.axes.X)
        .forEach((instance) => {
          table.append(renderVectorRow({
            documentRef,
            stageId,
            documentValue,
            triple,
            instance,
          }));
        });
      return;
    }
    lafeaDescriptorInstances(documentValue, descriptor)
      .forEach((instance) => {
        table.append(renderScalarRow({
          documentRef,
          stageId,
          documentValue,
          descriptor,
          instance,
          onSetScalar,
          batchScalarEdits,
        }));
      });
  });
  wrapper.append(table);
  if (batchScalarEdits) {
    wrapper.append(renderGroupAction({
      documentRef,
      wrapper,
      groupId,
      onSetScalarBatch,
    }));
  }
  return wrapper;
}

function renderGroupAction({ documentRef, wrapper, groupId, onSetScalarBatch }) {
  const action = documentRef.createElement('div');
  action.className = 'lafea-doc-group-action';
  const output = documentRef.createElement('output');
  output.dataset.role = 'lafea-group-edit-status';
  output.setAttribute('aria-live', 'polite');
  const apply = documentRef.createElement('button');
  apply.type = 'button';
  apply.dataset.role = 'lafea-apply-group';
  apply.dataset.inputGroup = groupId;
  apply.textContent = `Apply ${friendlyLafeaName(groupId)} changes`;
  apply.disabled = true;

  const updateButton = () => {
    apply.disabled = !wrapper.querySelector('[data-role="lafea-governed-input"][data-dirty="true"]');
  };
  wrapper.addEventListener('input', updateButton);
  apply.addEventListener('click', () => {
    const inputs = [...wrapper.querySelectorAll(
      '[data-role="lafea-governed-input"][data-dirty="true"]',
    )];
    if (!inputs.length) return;
    for (const input of inputs) {
      input.reportValidity();
      if (!input.checkValidity()) {
        input.focus();
        return;
      }
    }
    const edits = inputs.map((input) => ({
      descriptorId: input.dataset.descriptorId,
      entityId: input.dataset.entityId || null,
      rawText: input.value,
    }));
    const returned = onSetScalarBatch(edits);
    const diagnostic = firstLafeaEditDiagnostic(returned);
    output.textContent = diagnostic?.message ?? `${edits.length} governed change${edits.length === 1 ? '' : 's'} applied.`;
  });
  action.append(apply, output);
  return action;
}

function renderIdentityRegister(documentRef, documentValue, descriptor) {
  const wrapper = documentRef.createElement('div');
  wrapper.className = 'lafea-doc-identity-register';
  const heading = documentRef.createElement('h5');
  heading.textContent = descriptor.presentation.label;
  const note = documentRef.createElement('p');
  note.textContent = 'Exact engineering identities. Creation and deletion require governed entity commands; array position is not authority.';
  const list = documentRef.createElement('ul');
  const rows = lafeaGetAtPath(
    documentValue,
    descriptor.target.collectionPath,
  );
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const item = documentRef.createElement('li');
    const identity = row?.[descriptor.target.identityKey];
    item.textContent = typeof identity === 'string'
      ? identity
      : 'BLOCKED — MISSING IDENTITY';
    item.dataset.entityId = typeof identity === 'string' ? identity : '';
    list.append(item);
  });
  wrapper.append(heading, note, list);
  return wrapper;
}

const VECTOR_AXES = Object.freeze(['X', 'Y', 'Z']);

/**
 * Identify descriptors that are the X/Y/Z components of one vector quantity.
 *
 * `vectorDescriptors` in lafea-stage-input-descriptors.js generates these as a
 * shared id prefix with a `.x`/`.y`/`.z` suffix and a label suffixed by the axis.
 * Both are required to agree here, and only complete triples group, so anything
 * that does not match falls through to the existing per-descriptor rendering
 * rather than being reshaped on a guess.
 *
 * Returns a Map from descriptorId to its triple, for every descriptor in a
 * complete triple.
 */
export function collectVectorTriples(descriptors) {
  const candidates = new Map();
  descriptors.forEach((descriptor) => {
    const match = /^(?<group>.+)\.(?<axis>[xyz])$/u.exec(descriptor.descriptorId);
    if (!match) return;
    const axis = match.groups.axis.toUpperCase();
    const label = descriptor.presentation?.label ?? '';
    if (!label.endsWith(` ${axis}`)) return;
    const groupKey = match.groups.group;
    const entry = candidates.get(groupKey)
      ?? { groupKey, axes: {}, label: label.slice(0, -2) };
    entry.axes[axis] = descriptor;
    candidates.set(groupKey, entry);
  });

  const triples = new Map();
  candidates.forEach((entry) => {
    if (!VECTOR_AXES.every((axis) => entry.axes[axis])) return;
    VECTOR_AXES.forEach((axis) => triples.set(entry.axes[axis].descriptorId, entry));
  });
  return triples;
}

/** The governed numeric input for one descriptor instance, shared by both row shapes. */
function buildGovernedInput({ documentRef, stageId, descriptor, instance }) {
  const inputId = lafeaInputIdentity(descriptor, instance.entityId);
  const input = documentRef.createElement('input');
  input.id = inputId;
  input.type = 'text';
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
  input.dataset.role = 'lafea-governed-input';
  input.dataset.descriptorId = descriptor.descriptorId;
  input.dataset.entityId = instance.entityId ?? '';
  input.value = displayLafeaNumeric(instance.value);
  input.dataset.initialValue = input.value;
  input.dataset.dirty = 'false';
  input.placeholder = instance.state === 'PRESENT_NULL' ? 'null' : '';
  input.setAttribute(
    'aria-label',
    `${descriptor.presentation.label} ${instance.entityId ?? stageId}`,
  );
  const state = documentRef.createElement('small');
  state.id = `${inputId}-state`;
  if (['MISSING', 'INVALID_NUMBER', 'PRESENT_NULL'].includes(instance.state)) {
    state.textContent = `State: ${instance.state}`;
    input.setAttribute('aria-describedby', state.id);
  } else {
    state.style.display = 'none';
  }
  input.addEventListener('input', () => {
    validateNumericInput(input, descriptor.valueContract);
    input.dataset.dirty = String(input.value.trim() !== input.dataset.initialValue.trim());
  });
  return { input, state };
}

/**
 * The identity cell. The exact document path stays in the DOM because it is real
 * custody information a reviewer needs, but it is demoted: the engineering label
 * leads, and the path is small, muted and available in full on hover rather than
 * competing with the label on every row.
 */
function buildIdentityCell({ documentRef, stageId, descriptor, instance, labelText }) {
  const cell = documentRef.createElement('th');
  cell.scope = 'row';
  const label = documentRef.createElement('strong');
  label.textContent = labelText ?? descriptor.presentation.label;
  const identity = documentRef.createElement('code');
  identity.textContent = instance.entityId ?? stageId;
  identity.className = 'lafea-doc-identity';
  const path = documentRef.createElement('code');
  path.textContent = lafeaDescriptorPath(descriptor, instance.entityId);
  path.className = 'lafea-doc-path';
  path.title = path.textContent;
  cell.append(label, identity, path);
  return cell;
}

/** One row carrying the X, Y and Z inputs of a single vector identity. */
function renderVectorRow({ documentRef, stageId, documentValue, triple, instance }) {
  const row = documentRef.createElement('tr');
  row.dataset.vectorGroup = triple.groupKey;
  if (instance.entityId) row.dataset.rowId = instance.entityId;

  row.append(buildIdentityCell({
    documentRef,
    stageId,
    descriptor: triple.axes.X,
    instance,
    labelText: triple.label,
  }));

  VECTOR_AXES.forEach((axis) => {
    const descriptor = triple.axes[axis];
    const axisInstance = lafeaDescriptorInstances(documentValue, descriptor)
      .find((candidate) => candidate.entityId === instance.entityId) ?? instance;
    const cell = documentRef.createElement('td');
    cell.dataset.vectorAxis = axis;
    const { input, state } = buildGovernedInput({
      documentRef, stageId, descriptor, instance: axisInstance,
    });
    cell.append(input, state);
    row.append(cell);
  });

  const unitCell = documentRef.createElement('td');
  const unit = resolveLafeaDescriptorUnit(documentValue, triple.axes.X);
  unitCell.textContent = unit ?? triple.axes.X.unitContract.dimension ?? '\u2014';
  row.append(unitCell);

  row.append(buildSourceCell({
    documentRef, documentValue, descriptor: triple.axes.X, instance,
  }));
  return row;
}

/** Source pointer and retained-source status for one descriptor instance. */
function buildSourceCell({ documentRef, documentValue, descriptor, instance }) {
  const cell = documentRef.createElement('td');
  let sourceRef = null;
  try {
    sourceRef = resolveLafeaDescriptorSourceRef(documentValue, descriptor, instance.entityId);
  } catch {
    sourceRef = null;
  }
  const source = documentRef.createElement('code');
  source.textContent = sourceRef ?? '\u2014';
  const sourceStatus = documentRef.createElement('small');
  sourceStatus.textContent = descriptor.authority.sourceStatus;
  sourceStatus.style.display = 'block';
  cell.append(source, sourceStatus);
  return cell;
}

function renderScalarRow({
  documentRef,
  stageId,
  documentValue,
  descriptor,
  instance,
  onSetScalar,
  batchScalarEdits,
}) {
  const row = documentRef.createElement('tr');
  row.dataset.descriptorId = descriptor.descriptorId;
  if (instance.entityId) row.dataset.rowId = instance.entityId;

  const identityCell = buildIdentityCell({ documentRef, stageId, descriptor, instance });

  const inputCell = documentRef.createElement('td');
  const { input, state } = buildGovernedInput({ documentRef, stageId, descriptor, instance });
  inputCell.append(input, state);

  const unitCell = documentRef.createElement('td');
  const unit = resolveLafeaDescriptorUnit(documentValue, descriptor);
  unitCell.textContent = unit ?? descriptor.unitContract.dimension ?? '—';

  const sourceCell = buildSourceCell({ documentRef, documentValue, descriptor, instance });

  row.append(identityCell, inputCell, unitCell, sourceCell);
  if (!batchScalarEdits) {
    const actionCell = documentRef.createElement('td');
    const apply = documentRef.createElement('button');
    apply.type = 'button';
    apply.textContent = 'Apply';
    apply.dataset.role = 'lafea-apply-descriptor';
    apply.addEventListener('click', () => {
      validateNumericInput(input, descriptor.valueContract);
      if (!input.checkValidity()) {
        input.reportValidity();
        return;
      }
      const returned = onSetScalar(
        descriptor.descriptorId,
        instance.entityId,
        input.value,
      );
      const diagnostic = firstLafeaEditDiagnostic(returned);
      if (diagnostic) {
        input.setCustomValidity(diagnostic.message);
        input.setAttribute('aria-invalid', 'true');
        input.reportValidity();
      }
    });
    actionCell.append(apply);
    row.append(actionCell);
  }
  return row;
}

function validateNumericInput(input, contract) {
  input.setCustomValidity('');
  const text = input.value.trim();
  if (text !== '') {
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) {
      input.setCustomValidity('Must be a finite number');
    } else if (contract.minimum !== null
      && (contract.minimumExclusive ? parsed <= contract.minimum : parsed < contract.minimum)) {
      input.setCustomValidity(
        `Value must be ${contract.minimumExclusive ? '>' : '>='} ${contract.minimum}`,
      );
    } else if (contract.maximum !== null
      && (contract.maximumExclusive ? parsed >= contract.maximum : parsed > contract.maximum)) {
      input.setCustomValidity(
        `Value must be ${contract.maximumExclusive ? '<' : '<='} ${contract.maximum}`,
      );
    }
  }
  input.setAttribute('aria-invalid', input.checkValidity() ? 'false' : 'true');
}