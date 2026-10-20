import { lfeaBendFactorAuthoritySelection } from '../lfea-bend-factor-authority-control.js';

export function renderFixInputsLane(doc, controller, body, groups) {
  const actions = doc.createElement('div');
  actions.className = 'lfea-workbench-lane__actions';

  const fixableIds = controller.getFixableElementIds();
  const selectBtn = doc.createElement('button');
  selectBtn.type = 'button';
  selectBtn.className = 'lfea-workbench-btn lfea-workbench-btn--small';
  selectBtn.dataset.action = 'lfea-workbench-select-fixable';
  selectBtn.textContent = `Select fixable (${fixableIds.length})`;
  selectBtn.addEventListener('click', () => {
    controller.selectedFixableElements = controller.getFixableElementIds();
    controller.render();
  });

  const bulkEditBtn = doc.createElement('button');
  bulkEditBtn.type = 'button';
  bulkEditBtn.className = 'lfea-workbench-btn lfea-workbench-btn--small lfea-workbench-btn--primary';
  bulkEditBtn.dataset.action = 'lfea-workbench-bulk-edit';
  bulkEditBtn.textContent = 'Bulk edit';
  bulkEditBtn.addEventListener('click', () => {
    controller.bulkEditorOpen = !controller.bulkEditorOpen;
    controller.render();
  });

  actions.append(selectBtn, bulkEditBtn);
  body.append(actions);

  if (groups.length === 0) {
    const empty = doc.createElement('p');
    empty.className = 'lfea-workbench-empty-text';
    empty.textContent = 'No editable input defects in this model. Standard pipe geometry verified.';
    body.append(empty);
    return;
  }

  const list = doc.createElement('ul');
  list.className = 'lfea-workbench-findings-list';
  for (const group of groups) {
    const li = doc.createElement('li');
    li.textContent = `${group.occurrences}× ${group.plainMessage}`;
    list.append(li);
  }
  body.append(list);
}

export function renderResolveSettingsLane(doc, controller, body, _groups) {
  const basis = lfeaBendFactorAuthoritySelection();
  const card = doc.createElement('div');
  card.className = 'lfea-workbench-settings-card';

  const label = doc.createElement('div');
  label.className = 'lfea-workbench-settings-label';
  label.textContent = 'B31 / B31J Component Basis:';

  const status = doc.createElement('div');
  status.className = 'lfea-workbench-settings-status';
  const tag = doc.createElement('span');
  if (basis.complete) {
    tag.className = 'lfea-workbench-tag lfea-workbench-tag--success';
    tag.textContent = `Component basis resolved (${basis.editionProfileId})`;
  } else {
    tag.className = 'lfea-workbench-tag lfea-workbench-tag--warn';
    tag.textContent = 'Authority unresolved — select edition profile';
  }
  status.append(tag);

  const quickAction = doc.createElement('button');
  quickAction.type = 'button';
  quickAction.className = 'lfea-workbench-btn lfea-workbench-btn--small';
  quickAction.dataset.action = 'lfea-workbench-resolve-basis';
  quickAction.textContent = 'Resolve with B31.3 2024 / B31J 2023';
  quickAction.addEventListener('click', () => {
    controller.applyPreset({
      componentBasis: {
        editionProfileId: 'B31_3_2024_B31J_2023',
        smooth90FlexibilityCorrection: false,
      },
    });
  });

  card.append(label, status, quickAction);
  body.append(card);
}

export function renderPrototypeAssumptionsLane(doc, controller, body, groups) {
  const intro = doc.createElement('p');
  intro.className = 'lfea-workbench-lane-intro';
  intro.textContent = `${groups.length} limitation groups require acceptance for prototype solve.`;

  const reviewBtn = doc.createElement('button');
  reviewBtn.type = 'button';
  reviewBtn.className = 'lfea-workbench-btn lfea-workbench-btn--small lfea-workbench-btn--primary';
  reviewBtn.dataset.action = 'lfea-workbench-open-review';
  reviewBtn.textContent = 'Review together';
  reviewBtn.addEventListener('click', () => {
    controller.reviewSheetOpen = true;
    controller.render();
  });

  body.append(intro, reviewBtn);

  const list = doc.createElement('ul');
  list.className = 'lfea-workbench-findings-list';
  for (const group of groups.slice(0, 5)) {
    const li = doc.createElement('li');
    const strong = doc.createElement('strong');
    strong.textContent = group.code;
    li.append(strong, doc.createTextNode(`: ${group.plainMessage} (${group.occurrences} occurrences)`));
    list.append(li);
  }
  if (groups.length > 5) {
    const more = doc.createElement('li');
    more.className = 'lfea-workbench-more-note';
    more.textContent = `...and ${groups.length - 5} more limitations`;
    list.append(more);
  }
  body.append(list);
}

export function renderInformationLane(doc, _controller, body, groups) {
  const details = doc.createElement('details');
  details.className = 'lfea-workbench-info-details';

  const summary = doc.createElement('summary');
  summary.textContent = `View informational notes (${groups.length})`;
  details.append(summary);

  const list = doc.createElement('ul');
  list.className = 'lfea-workbench-findings-list';
  for (const group of groups) {
    const li = doc.createElement('li');
    li.textContent = `${group.code}: ${group.plainMessage}`;
    list.append(li);
  }
  details.append(list);
  body.append(details);
}
