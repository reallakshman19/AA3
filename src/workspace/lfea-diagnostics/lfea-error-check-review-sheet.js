/**
 * LFEA Error Check Action Workbench: Prototype Review Sheet Dialog (AC5)
 *
 * Presents all current preparation limitations together with result consequences.
 * Requires confirmed, non-empty reviewer identity and reason before accepting.
 * NEVER fabricates fallback reviewer identities or reasons.
 */

export function renderReviewSheet(doc, controller, root, presentation) {
  root.replaceChildren();
  if (!controller.reviewSheetOpen) {
    root.hidden = true;
    return;
  }
  root.hidden = false;

  const card = doc.createElement('div');
  card.className = 'lfea-workbench-dialog-card lfea-workbench-review-sheet-card';
  card.dataset.role = 'lfea-workbench-review-sheet';

  const heading = doc.createElement('h4');
  heading.textContent = 'Prototype Limitations Review & Single Acceptance';

  const intro = doc.createElement('p');
  intro.textContent = 'Review the complete set of current preparation limitations. Acceptance is given explicitly for this exact preparation and authorized load cases.';

  const condGroups = presentation.sections
    .flatMap((s) => s.groups)
    .filter((g) => g.disposition === 'CONDITIONAL');

  const table = doc.createElement('table');
  table.className = 'lfea-workbench-review-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Code / Finding</th>
        <th>Consequence</th>
        <th>Plain Guidance</th>
        <th>Occurrences</th>
      </tr>
    </thead>
    <tbody>
      ${condGroups
        .map(
          (g) => `
        <tr>
          <td><strong>${g.code}</strong></td>
          <td><span class="lfea-workbench-tag lfea-workbench-tag--${g.limitationKind === 'PROCESS_NOTE' ? 'info' : 'warn'}">${g.limitationKind === 'PROCESS_NOTE' ? 'About this pass' : 'Affects the result'}</span></td>
          <td>${g.plainMessage}</td>
          <td>${g.occurrences}</td>
        </tr>`,
        )
        .join('')}
    </tbody>
  `;

  const signoffBar = doc.createElement('div');
  signoffBar.className = 'lfea-workbench-signoff-bar';

  const reviewerLabel = doc.createElement('label');
  reviewerLabel.textContent = 'Reviewer: ';
  const reviewerInput = doc.createElement('input');
  reviewerInput.type = 'text';
  reviewerInput.dataset.role = 'lfea-error-check-reviewer';
  reviewerInput.placeholder = 'e.g. Lead Stress Engineer';
  reviewerInput.value = controller.reviewerIdentity || '';
  reviewerLabel.append(reviewerInput);

  const reasonLabel = doc.createElement('label');
  reasonLabel.textContent = 'Reason: ';
  const reasonInput = doc.createElement('input');
  reasonInput.type = 'text';
  reasonInput.dataset.role = 'lfea-error-check-reason';
  reasonInput.placeholder = 'e.g. Verified prototype review';
  reasonInput.value = controller.reviewReason || '';
  reasonLabel.append(reasonInput);

  signoffBar.append(reviewerLabel, reasonLabel);

  const validationNotice = doc.createElement('div');
  validationNotice.className = 'lfea-workbench-review-notice';
  validationNotice.style.color = '#f87171';
  validationNotice.style.fontSize = '0.85rem';
  validationNotice.style.display = 'none';

  const actions = doc.createElement('div');
  actions.className = 'lfea-workbench-dialog-actions';

  const acceptBtn = doc.createElement('button');
  acceptBtn.type = 'button';
  acceptBtn.className = 'lfea-workbench-btn lfea-workbench-btn--primary';
  acceptBtn.dataset.action = 'authorize-lfea-error-check-limitations';
  acceptBtn.dataset.role = 'lfea-error-check-accept-limitations';
  acceptBtn.textContent = 'Accept these assumptions for this prototype run';

  const checkValidation = () => {
    const hasReviewer = Boolean(reviewerInput.value.trim());
    const hasReason = Boolean(reasonInput.value.trim());
    if (!hasReviewer || !hasReason) {
      acceptBtn.disabled = true;
      acceptBtn.title = 'Confirmed reviewer identity and reason are required to accept prototype assumptions.';
    } else {
      acceptBtn.disabled = false;
      acceptBtn.title = '';
      validationNotice.style.display = 'none';
    }
  };

  reviewerInput.addEventListener('input', () => {
    controller.reviewerIdentity = reviewerInput.value.trim();
    checkValidation();
  });
  reasonInput.addEventListener('input', () => {
    controller.reviewReason = reasonInput.value.trim();
    checkValidation();
  });

  checkValidation();

  acceptBtn.addEventListener('click', async () => {
    const reviewer = reviewerInput.value.trim();
    const reason = reasonInput.value.trim();
    if (!reviewer || !reason) {
      validationNotice.textContent = 'Confirmed reviewer identity and reason are required. Fallback or fabricated reviewer inputs are forbidden.';
      validationNotice.style.display = 'block';
      checkValidation();
      return;
    }
    controller.reviewerIdentity = reviewer;
    controller.reviewReason = reason;
    controller.limitationsAccepted = true;
    for (const g of condGroups) controller.acknowledgedGroupIds.add(g.groupId);
    controller.reviewSheetOpen = false;
    await controller.authorizeRun();
    controller.render();
  });

  const closeBtn = doc.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'lfea-workbench-btn';
  closeBtn.dataset.action = 'lfea-workbench-close-review';
  closeBtn.textContent = 'Close review';
  closeBtn.addEventListener('click', () => {
    controller.reviewSheetOpen = false;
    controller.render();
  });

  actions.append(acceptBtn, closeBtn);
  card.append(heading, intro, table, signoffBar, validationNotice, actions);
  root.append(card);
}
