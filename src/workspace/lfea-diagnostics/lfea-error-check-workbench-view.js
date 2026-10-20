import { classifyLfeaAccdbFindingAction } from './lfea-accdb-capability-actions.js';
import { lfeaBendFactorAuthoritySelection } from '../lfea-bend-factor-authority-control.js';
import {
  renderFixInputsLane,
  renderResolveSettingsLane,
  renderPrototypeAssumptionsLane,
  renderInformationLane,
} from './lfea-error-check-workbench-lanes.js';

export { renderBulkEditor } from './lfea-error-check-bulk-editor.js';
export { renderReviewSheet } from './lfea-error-check-review-sheet.js';
export { renderTestScenarios } from './lfea-error-check-test-scenarios.js';

export const LFEA_WORKBENCH_LANES = Object.freeze([
  { id: 'FIX_INPUTS', title: 'Fix inputs', description: 'Actual editable model defects' },
  { id: 'RESOLVE_SETTINGS', title: 'Resolve shared settings', description: 'Missing component basis, policy or profile' },
  { id: 'PROTOTYPE_ASSUMPTIONS', title: 'Prototype assumptions', description: 'Eligible current-preparation limitations' },
  { id: 'INFORMATION', title: 'Information', description: 'Informational notes (no acknowledgement required)' },
]);

export function classifyFindingLane(group) {
  const code = group?.code ?? '';
  const action = classifyLfeaAccdbFindingAction(code);
  if (group?.disposition === 'PASS' || group?.disposition === 'ADVISORY' || action.actionClass === 'INFORMATION') {
    return 'INFORMATION';
  }
  if (action.actionClass === 'GOVERNED_CHOICE' && /^(BEND|BRANCH)_FACTOR_EDITION_AUTHORITY_UNRESOLVED$/u.test(code)) {
    return 'RESOLVE_SETTINGS';
  }
  if (group?.disposition === 'BLOCK') {
    return 'FIX_INPUTS';
  }
  if (group?.disposition === 'CONDITIONAL') {
    return 'PROTOTYPE_ASSUMPTIONS';
  }
  return 'INFORMATION';
}

export function computeRunBlocker(presentation, _controller) {
  if (presentation.empty) {
    return 'Run blocked: Import a CAESAR II model on Input step';
  }
  const basis = lfeaBendFactorAuthoritySelection();
  const hasBasisBlock = presentation.rows.some((row) =>
    row.disposition === 'BLOCK' && /^(BEND|BRANCH)_FACTOR_EDITION_AUTHORITY_UNRESOLVED$/u.test(row.code),
  );
  if (hasBasisBlock || !basis.complete) {
    return 'Run blocked: Choose B31/B31J component basis in Resolve shared settings';
  }
  const hasInputBlock = presentation.rows.some((row) =>
    row.disposition === 'BLOCK' && !/^(BEND|BRANCH)_FACTOR_EDITION_AUTHORITY_UNRESOLVED$/u.test(row.code),
  );
  if (hasInputBlock) {
    return 'Run blocked: Correct model input defect in Fix inputs';
  }
  if (!presentation.solveAuthorized) {
    return 'Run blocked: Review and accept prototype assumptions';
  }
  return 'Run authorized: Ready for prototype execution';
}

export function createWorkbenchView(doc, controller) {
  const container = doc.createElement('div');
  container.className = 'lfea-workbench-view';
  container.dataset.role = 'lfea-workbench-view';

  // 1. Header with Mode, Case Selection and Run Blocker banner
  const header = doc.createElement('div');
  header.className = 'lfea-workbench-header';

  const titleBar = doc.createElement('div');
  titleBar.className = 'lfea-workbench-header__title-bar';

  const title = doc.createElement('h3');
  title.className = 'lfea-workbench-header__title';
  title.textContent = 'Action Workbench';

  const metaGroup = doc.createElement('div');
  metaGroup.className = 'lfea-workbench-header__meta';

  const modeBadge = doc.createElement('span');
  modeBadge.className = 'lfea-workbench-badge lfea-workbench-badge--mode';
  modeBadge.dataset.role = 'lfea-workbench-mode';
  modeBadge.textContent = 'Mode: PROTOTYPE';

  const scenariosBtn = doc.createElement('button');
  scenariosBtn.type = 'button';
  scenariosBtn.className = 'lfea-workbench-btn lfea-workbench-btn--small';
  scenariosBtn.dataset.action = 'lfea-workbench-toggle-scenarios';
  scenariosBtn.textContent = 'Test scenarios (AC10)';
  scenariosBtn.addEventListener('click', () => {
    controller.testScenariosOpen = !controller.testScenariosOpen;
    controller.render();
  });

  metaGroup.append(modeBadge, scenariosBtn);
  titleBar.append(title, metaGroup);

  const blocker = doc.createElement('div');
  blocker.className = 'lfea-workbench-blocker';
  blocker.dataset.role = 'lfea-workbench-run-blocker';

  header.append(titleBar, blocker);

  // 2. Main 4-lane layout
  const lanesContainer = doc.createElement('div');
  lanesContainer.className = 'lfea-workbench-lanes';
  lanesContainer.dataset.role = 'lfea-workbench-lanes';

  // 3. Persistent Action Footer
  const footer = doc.createElement('div');
  footer.className = 'lfea-workbench-footer';
  footer.dataset.role = 'lfea-workbench-footer';

  const footerSummary = doc.createElement('div');
  footerSummary.className = 'lfea-workbench-footer__summary';
  footerSummary.dataset.role = 'lfea-workbench-footer-summary';

  const footerActions = doc.createElement('div');
  footerActions.className = 'lfea-workbench-footer__actions';

  const prepareBtn = doc.createElement('button');
  prepareBtn.type = 'button';
  prepareBtn.className = 'lfea-workbench-btn';
  prepareBtn.dataset.action = 'lfea-workbench-prepare-prototype';
  prepareBtn.textContent = 'Prepare prototype';
  prepareBtn.addEventListener('click', () => controller.preparePrototype());

  const presetBtn = doc.createElement('button');
  presetBtn.type = 'button';
  presetBtn.className = 'lfea-workbench-btn';
  presetBtn.dataset.action = 'lfea-workbench-use-preset';
  presetBtn.textContent = 'Use preset';
  presetBtn.addEventListener('click', () => controller.applyPreset());

  const previewBtn = doc.createElement('button');
  previewBtn.type = 'button';
  previewBtn.className = 'lfea-workbench-btn';
  previewBtn.dataset.action = 'lfea-workbench-preview';
  previewBtn.textContent = 'Preview changes';
  previewBtn.addEventListener('click', () => controller.previewBatch());

  const applyBtn = doc.createElement('button');
  applyBtn.type = 'button';
  applyBtn.className = 'lfea-workbench-btn lfea-workbench-btn--primary';
  applyBtn.dataset.action = 'lfea-workbench-apply';
  applyBtn.textContent = 'Apply & recheck';
  applyBtn.addEventListener('click', () => controller.applyBatch());

  const undoBtn = doc.createElement('button');
  undoBtn.type = 'button';
  undoBtn.className = 'lfea-workbench-btn';
  undoBtn.dataset.action = 'lfea-workbench-undo';
  undoBtn.textContent = 'Undo batch';
  undoBtn.addEventListener('click', () => controller.undoBatch());

  const reviewBtn = doc.createElement('button');
  reviewBtn.type = 'button';
  reviewBtn.className = 'lfea-workbench-btn';
  reviewBtn.dataset.action = 'lfea-workbench-review-together';
  reviewBtn.textContent = 'Review together';
  reviewBtn.addEventListener('click', () => {
    controller.reviewSheetOpen = !controller.reviewSheetOpen;
    controller.render();
  });

  const runBtn = doc.createElement('button');
  runBtn.type = 'button';
  runBtn.className = 'lfea-workbench-btn lfea-workbench-btn--run';
  runBtn.dataset.action = 'lfea-workbench-run';
  runBtn.textContent = 'Run prototype';
  runBtn.addEventListener('click', () => controller.runPrototype());

  footerActions.append(prepareBtn, presetBtn, previewBtn, applyBtn, undoBtn, reviewBtn, runBtn);
  footer.append(footerSummary, footerActions);

  // Modal dialog containers
  const dialogHost = doc.createElement('div');
  dialogHost.className = 'lfea-workbench-dialog-host';

  const bulkHost = doc.createElement('div');
  bulkHost.className = 'lfea-workbench-dialog';
  const reviewHost = doc.createElement('div');
  reviewHost.className = 'lfea-workbench-dialog';
  const scenariosHost = doc.createElement('div');
  scenariosHost.className = 'lfea-workbench-dialog';

  dialogHost.append(bulkHost, reviewHost, scenariosHost);
  container.append(header, lanesContainer, dialogHost, footer);

  return {
    container,
    header,
    blocker,
    lanesContainer,
    footer,
    footerSummary,
    footerActions,
    prepareBtn,
    presetBtn,
    previewBtn,
    applyBtn,
    undoBtn,
    reviewBtn,
    runBtn,
    bulkHost,
    reviewHost,
    scenariosHost,
  };
}

export function renderWorkbenchLanes(doc, controller, container, presentation) {
  container.replaceChildren();

  const laneMap = {
    FIX_INPUTS: [],
    RESOLVE_SETTINGS: [],
    PROTOTYPE_ASSUMPTIONS: [],
    INFORMATION: [],
  };

  for (const section of presentation.sections) {
    for (const group of section.groups) {
      const laneId = classifyFindingLane(group);
      if (laneMap[laneId]) {
        laneMap[laneId].push(group);
      }
    }
  }

  for (const laneDef of LFEA_WORKBENCH_LANES) {
    const lane = doc.createElement('div');
    lane.className = `lfea-workbench-lane lfea-workbench-lane--${laneDef.id.toLowerCase()}`;
    lane.dataset.laneId = laneDef.id;

    const laneHeader = doc.createElement('div');
    laneHeader.className = 'lfea-workbench-lane__header';

    const titleGroup = doc.createElement('div');
    const title = doc.createElement('h4');
    title.className = 'lfea-workbench-lane__title';
    title.textContent = laneDef.title;

    const desc = doc.createElement('span');
    desc.className = 'lfea-workbench-lane__desc';
    desc.textContent = laneDef.description;
    titleGroup.append(title, desc);

    const count = doc.createElement('span');
    count.className = 'lfea-workbench-lane__count';
    const items = laneMap[laneDef.id] ?? [];
    count.textContent = String(items.length);

    laneHeader.append(titleGroup, count);
    lane.append(laneHeader);

    const laneBody = doc.createElement('div');
    laneBody.className = 'lfea-workbench-lane__body';

    if (laneDef.id === 'FIX_INPUTS') {
      renderFixInputsLane(doc, controller, laneBody, laneMap.FIX_INPUTS);
    } else if (laneDef.id === 'RESOLVE_SETTINGS') {
      renderResolveSettingsLane(doc, controller, laneBody, laneMap.RESOLVE_SETTINGS);
    } else if (laneDef.id === 'PROTOTYPE_ASSUMPTIONS') {
      renderPrototypeAssumptionsLane(doc, controller, laneBody, laneMap.PROTOTYPE_ASSUMPTIONS);
    } else if (laneDef.id === 'INFORMATION') {
      renderInformationLane(doc, controller, laneBody, laneMap.INFORMATION);
    }

    lane.append(laneBody);
    container.append(lane);
  }
}
