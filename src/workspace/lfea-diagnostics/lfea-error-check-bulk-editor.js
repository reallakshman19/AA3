/**
 * LFEA Error Check Action Workbench: Bulk Property Editor Dialog
 *
 * Provides scoped bulk editing of supported pipe properties (DIAMETER, WALL_THICK)
 * with explicit source units, strict selected-target scoping, confirmed reviewer/reason,
 * and non-mutating Cancel.
 */

export function renderBulkEditor(doc, controller, root) {
  root.replaceChildren();
  if (!controller.bulkEditorOpen) {
    root.hidden = true;
    return;
  }
  root.hidden = false;

  const card = doc.createElement('div');
  card.className = 'lfea-workbench-dialog-card';
  card.dataset.role = 'lfea-workbench-bulk-editor';

  const heading = doc.createElement('h4');
  heading.textContent = 'Bulk Edit Supported Properties';

  const form = doc.createElement('div');
  form.className = 'lfea-workbench-bulk-form';

  const accdbController = controller.options.getAccdbController?.();
  const declaredUnit = accdbController?.sourceBundle?.unitSystem?.declared?.length ?? 'mm';
  const elementRows = accdbController?.tables?.INPUT_BASIC_ELEMENT_DATA?.rows ?? [];
  const elementCount = elementRows.length;

  const fixableIds = controller.getFixableElementIds();
  const selectedIds = controller.selectedFixableElements && controller.selectedFixableElements.length > 0
    ? controller.selectedFixableElements
    : fixableIds;
  const selectedCount = selectedIds.length;

  const fieldLabel = doc.createElement('label');
  fieldLabel.textContent = 'Property to edit: ';
  const fieldSelect = doc.createElement('select');
  fieldSelect.dataset.role = 'lfea-workbench-bulk-field';
  fieldSelect.innerHTML = '<option value="DIAMETER">Outside diameter (DIAMETER)</option><option value="WALL_THICK">Wall thickness (WALL_THICK)</option>';
  fieldLabel.append(fieldSelect);

  const scopeLabel = doc.createElement('label');
  scopeLabel.textContent = 'Scope: ';
  const scopeSelect = doc.createElement('select');
  scopeSelect.dataset.role = 'lfea-workbench-bulk-scope';
  scopeSelect.innerHTML = `<option value="ALL">All elements (${elementCount})</option><option value="SELECTED">Selected fixable elements (${selectedCount})</option>`;
  if (selectedCount > 0) {
    scopeSelect.value = 'SELECTED';
  }
  scopeLabel.append(scopeSelect);

  const valLabel = doc.createElement('label');
  valLabel.textContent = `New value (${declaredUnit}): `;
  const valInput = doc.createElement('input');
  valInput.type = 'number';
  valInput.step = 'any';
  valInput.dataset.role = 'lfea-workbench-bulk-value';
  valInput.placeholder = 'e.g. 114.3';
  valLabel.append(valInput);

  const reviewerLabel = doc.createElement('label');
  reviewerLabel.textContent = 'Reviewer: ';
  const reviewerInput = doc.createElement('input');
  reviewerInput.type = 'text';
  reviewerInput.dataset.role = 'lfea-workbench-bulk-reviewer';
  reviewerInput.placeholder = 'e.g. Lead Stress Engineer';
  reviewerInput.value = controller.reviewerIdentity || '';
  reviewerLabel.append(reviewerInput);

  const reasonLabel = doc.createElement('label');
  reasonLabel.textContent = 'Reason: ';
  const reasonInput = doc.createElement('input');
  reasonInput.type = 'text';
  reasonInput.dataset.role = 'lfea-workbench-bulk-reason';
  reasonInput.placeholder = 'e.g. Correct diameter per line list';
  reasonInput.value = controller.reviewReason || '';
  reasonLabel.append(reasonInput);

  form.append(fieldLabel, scopeLabel, valLabel, reviewerLabel, reasonLabel);

  const validationNotice = doc.createElement('div');
  validationNotice.className = 'lfea-workbench-bulk-notice';
  validationNotice.style.color = '#f87171';
  validationNotice.style.fontSize = '0.85rem';
  validationNotice.style.display = 'none';

  const btnBar = doc.createElement('div');
  btnBar.className = 'lfea-workbench-dialog-actions';

  const previewBtn = doc.createElement('button');
  previewBtn.type = 'button';
  previewBtn.className = 'lfea-workbench-btn lfea-workbench-btn--primary';
  previewBtn.dataset.action = 'lfea-workbench-bulk-preview';
  previewBtn.textContent = 'Preview batch';
  previewBtn.addEventListener('click', () => {
    const rawVal = Number(valInput.value);
    if (!Number.isFinite(rawVal) || rawVal <= 0) {
      validationNotice.textContent = 'Enter a positive numeric value in source units.';
      validationNotice.style.display = 'block';
      return;
    }

    const reviewer = reviewerInput.value.trim();
    const reason = reasonInput.value.trim();
    if (!reviewer || !reason) {
      validationNotice.textContent = 'Confirmed reviewer identity and reason are required to preview bulk edits. Fallback approvers are forbidden.';
      validationNotice.style.display = 'block';
      return;
    }

    const field = fieldSelect.value;
    const scope = scopeSelect.value;
    let targetRows = elementRows;

    if (scope === 'SELECTED') {
      const targetIdSet = new Set(selectedIds);
      if (targetIdSet.size === 0) {
        validationNotice.textContent = 'No fixable elements are selected. Switch scope to "All elements" or select fixable elements in Fix inputs.';
        validationNotice.style.display = 'block';
        return;
      }
      targetRows = elementRows.filter((row) => targetIdSet.has(String(row.ELEMENTID)));
    }

    if (targetRows.length === 0) {
      validationNotice.textContent = 'No elements match the chosen scope.';
      validationNotice.style.display = 'block';
      return;
    }

    validationNotice.style.display = 'none';
    controller.reviewerIdentity = reviewer;
    controller.reviewReason = reason;
    const patches = targetRows.map((row) => ({
      accdbElementId: String(row.ELEMENTID),
      field,
      rawValue: rawVal,
      approver: reviewer,
      reason,
    }));
    controller.stageBatchPreview(patches);
  });

  const cancelBtn = doc.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'lfea-workbench-btn';
  cancelBtn.dataset.action = 'lfea-workbench-bulk-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    controller.bulkEditorOpen = false;
    controller.render();
  });

  btnBar.append(previewBtn, cancelBtn);
  card.append(heading, form, validationNotice, btnBar);
  root.append(card);
}
