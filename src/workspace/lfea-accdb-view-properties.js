

import { button, cell, displayValue, labelledTextInput } from './lfea-accdb-panel-utils.js';
export function renderOverrideSection(doc, root, controller) {
  if (!controller.sourceBundle) return;

  const heading = doc.createElement('strong');
  heading.textContent = 'Element properties';
  root.append(heading);

  const scope = doc.createElement('p');
  scope.dataset.role = 'accdb-override-scope-disclosure';
  scope.textContent = 'Overrides replace the raw cell in the file\'s own declared units and re-run the whole import, so inheritance and unit conversion behave exactly as if the file carried the value. This element-field override table does not edit node IDs, geometry or topology. Imported ACCDB source-node coordinates can be corrected separately in Error Check → Piping model through previewed, source-bound workspace drafts; no ACCDB binary is rewritten. Every applied override is listed below and carries its approver and reason.';
  root.append(scope);

  if (controller.overrideDisclosures.length > 0) {
    const appliedHeading = doc.createElement('p');
    appliedHeading.dataset.role = 'accdb-applied-overrides';
    appliedHeading.textContent = `Engineer overrides in force — ${controller.overrideDisclosures.length} `
      + `(approver: ${controller.overrideSet.approver}; reason: ${controller.overrideSet.reason})`;
    root.append(appliedHeading);
    const appliedList = doc.createElement('ul');
    for (const disclosure of controller.overrideDisclosures) {
      const item = doc.createElement('li');
      item.dataset.code = disclosure.code;
      item.textContent = disclosure.message;
      appliedList.append(item);
    }
    root.append(appliedList);
  }

  const toggle = button(doc, controller.showProperties ? 'Hide element property table' : 'Show element property table');
  toggle.dataset.action = 'toggle-lfea-pipeline-accdb-properties';
  toggle.addEventListener('click', () => controller.togglePropertyTable());
  root.append(toggle);
  if (!controller.showProperties) return;

  renderOverrideCustody(doc, root, controller);
  renderPropertyTable(doc, root, controller);
}

function renderOverrideCustody(doc, root, controller) {
  const custody = doc.createElement('div');
  custody.dataset.role = 'accdb-override-custody';
  const approver = labelledTextInput(doc, 'Approver ', 'accdb-override-approver', controller.overrideApprover);
  approver.input.addEventListener('input', () => { controller.overrideApprover = approver.input.value; });
  const reason = labelledTextInput(doc, 'Reason ', 'accdb-override-reason', controller.overrideReason);
  reason.input.addEventListener('input', () => { controller.overrideReason = reason.input.value; });
  const applyButton = button(doc, 'Apply overrides');
  applyButton.dataset.action = 'apply-lfea-pipeline-accdb-overrides';
  applyButton.addEventListener('click', () => controller.applyOverrides());
  const resetButton = button(doc, 'Withdraw overrides');
  resetButton.dataset.action = 'reset-lfea-pipeline-accdb-overrides';
  resetButton.addEventListener('click', () => controller.resetOverrides());
  custody.append(approver.label, reason.label, applyButton, resetButton);
  root.append(custody);

}

function renderPropertyTable(doc, root, controller) {
  const table = doc.createElement('table');
  table.dataset.role = 'lfea-pipeline-accdb-element-properties';
  const head = doc.createElement('tr');
  for (const columnLabel of ['Element', 'From', 'To', 'Type', 'Field', 'Raw (file unit)', 'Disposition', 'Converted (SI)', 'Override (file unit)']) {
    const th = doc.createElement('th');
    th.scope = 'col';
    th.textContent = columnLabel;
    head.append(th);
  }
  table.append(head);

  for (const row of controller.propertyRows) {
    for (const [index, fieldRow] of row.fields.entries()) {
      const tr = doc.createElement('tr');
      tr.dataset.accdbElementId = row.accdbElementId;
      tr.dataset.field = fieldRow.name;
      tr.dataset.disposition = fieldRow.disposition;
      // Element identity is printed once per element, not once per field.
      tr.append(
        cell(doc, index === 0 ? row.accdbElementId : ''),
        cell(doc, index === 0 ? row.fromNodeId ?? '' : ''),
        cell(doc, index === 0 ? row.toNodeId ?? '' : ''),
        cell(doc, index === 0 ? row.canonicalSegmentType ?? '' : ''),
        cell(doc, fieldRow.name),
        cell(doc, displayValue(fieldRow.rawValue)),
        cell(doc, fieldRow.disposition),
        cell(doc, displayValue(fieldRow.canonicalValue)),
      );

      const overrideCell = doc.createElement('td');
      const input = doc.createElement('input');
      input.type = fieldRow.kind === 'STRING' ? 'text' : 'number';
      if (fieldRow.kind !== 'STRING') input.step = 'any';
      input.dataset.role = 'accdb-override-input';
      input.dataset.accdbElementId = row.accdbElementId;
      input.dataset.field = fieldRow.name;
      input.value = controller.overrideDrafts.get(`${row.accdbElementId}:${fieldRow.name}`) ?? '';
      input.addEventListener('input', () => {
        controller.setOverrideDraft(row.accdbElementId, fieldRow.name, input.value);
      });
      overrideCell.append(input);
      tr.append(overrideCell);
      table.append(tr);
    }
  }
  root.append(table);
}
