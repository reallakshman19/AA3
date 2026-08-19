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
  const header = documentRef.createElement('tr');
  const headings = [
    'Engineering identity',
    'Input',
    'Unit',
    'Source/status',
  ];
  if (!batchScalarEdits) headings.push('Action');
  headings.forEach((label) => {
    const cell = documentRef.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    header.append(cell);
  });
  table.append(header);

  descriptors.forEach((descriptor) => {
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

  const identityCell = documentRef.createElement('th');
  identityCell.scope = 'row';
  const label = documentRef.createElement('strong');
  label.textContent = descriptor.presentation.label;
  const identity = documentRef.createElement('code');
  identity.textContent = instance.entityId ?? stageId;
  identity.style.display = 'block';
  const path = documentRef.createElement('code');
  path.textContent = lafeaDescriptorPath(descriptor, instance.entityId);
  path.style.display = 'block';
  identityCell.append(label, identity, path);

  const inputCell = documentRef.createElement('td');
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

  inputCell.append(input, state);

  const unitCell = documentRef.createElement('td');
  const unit = resolveLafeaDescriptorUnit(documentValue, descriptor);
  unitCell.textContent = unit ?? descriptor.unitContract.dimension ?? '—';

  const sourceCell = documentRef.createElement('td');
  let sourceRef = null;
  try {
    sourceRef = resolveLafeaDescriptorSourceRef(
      documentValue,
      descriptor,
      instance.entityId,
    );
  } catch {
    sourceRef = null;
  }
  const source = documentRef.createElement('code');
  source.textContent = sourceRef ?? '—';
  const sourceStatus = documentRef.createElement('small');
  sourceStatus.textContent = descriptor.authority.sourceStatus;
  sourceStatus.style.display = 'block';
  sourceCell.append(source, sourceStatus);

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