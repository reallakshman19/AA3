/**
 * LFEA Error Check Action Workbench: Disposable Test Scenarios Dialog (AC6, AC10)
 *
 * Demonstrates creating and recovering from test errors on isolated disposable candidates
 * without modifying authentic source bytes or live shared component-basis authority.
 */

import { lfeaBendFactorAuthoritySelection } from '../lfea-bend-factor-authority-control.js';
import { captureScenarioBaseline, checkScenarioRecovery, staleTokenScenario } from './lfea-error-check-scenario-probes.js';

function ensureBaseline(controller, owner) {
  if (!controller.scenarioBaseline || controller.activeTestScenario?.recovered) {
    controller.scenarioBaseline = captureScenarioBaseline(owner, lfeaBendFactorAuthoritySelection);
  }
}

export function renderTestScenarios(doc, controller, root) {
  root.replaceChildren();
  if (!controller.testScenariosOpen) {
    root.hidden = true;
    return;
  }
  root.hidden = false;

  const card = doc.createElement('div');
  card.className = 'lfea-workbench-dialog-card lfea-workbench-test-scenarios-card';
  card.dataset.role = 'lfea-workbench-test-scenarios';

  const heading = doc.createElement('h4');
  heading.textContent = 'Disposable Test Scenarios (AC10)';

  const intro = doc.createElement('p');
  intro.textContent = 'Demonstrates creating and recovering from test errors on isolated disposable candidates without modifying original source bytes or live shared state.';

  const resultBox = doc.createElement('div');
  resultBox.className = 'lfea-workbench-scenario-result';
  resultBox.dataset.role = 'lfea-workbench-scenario-result';

  if (controller.activeTestScenario) {
    resultBox.style.display = 'block';
    resultBox.style.margin = '0.75rem 0';
    resultBox.style.padding = '0.75rem';
    resultBox.style.background = '#1e293b';
    resultBox.style.borderRadius = '4px';
    resultBox.style.border = '1px solid #475569';

    const title = doc.createElement('div');
    const recovered = controller.activeTestScenario.recovered;
    const isBlock = controller.activeTestScenario.status === 'BLOCK';
    title.style.color = recovered ? '#4ade80' : isBlock ? '#f87171' : '#fbbf24';
    title.style.fontWeight = '600';
    title.textContent = recovered ? '✓ Recovery verified: disposable scenario cleared.'
      : `Scenario: ${controller.activeTestScenario.name} [Status: ${controller.activeTestScenario.status}]`;
    const detail = doc.createElement('div');
    detail.style.marginTop = '0.25rem';
    detail.textContent = controller.activeTestScenario.blocker;
    resultBox.append(title, detail);
  } else {
    resultBox.style.display = 'none';
  }

  const buttons = doc.createElement('div');
  buttons.className = 'lfea-workbench-dialog-actions';

  const unsetBasisBtn = doc.createElement('button');
  unsetBasisBtn.type = 'button';
  unsetBasisBtn.className = 'lfea-workbench-btn lfea-workbench-btn--small';
  unsetBasisBtn.dataset.action = 'lfea-workbench-test-unset-basis';
  unsetBasisBtn.textContent = 'Test unset component basis';
  unsetBasisBtn.addEventListener('click', () => {
    const accdbController = controller.options.getAccdbController?.();
    if (!accdbController || !accdbController.tables) {
      controller.activeTestScenario = {
        name: 'Unset Component Basis',
        status: 'BLOCK',
        blocker: 'Run blocked: Import an ACCDB source first',
        recovered: false,
      };
      controller.render();
      return;
    }

    try {
      ensureBaseline(controller, accdbController);
      const candidate = accdbController.prepareCandidate(
        accdbController.effectiveTables ?? accdbController.tables,
        { componentBasis: { editionProfileId: null, smooth90FlexibilityCorrection: null } },
      );
      const blocked = candidate.preFlight?.status === 'BLOCK';
      const intact = checkScenarioRecovery(accdbController, controller.scenarioBaseline,
        lfeaBendFactorAuthoritySelection).recovered;
      controller.activeTestScenario = {
        name: 'Unset Component Basis',
        status: blocked && intact ? 'BLOCK' : 'FAILED',
        blocker: blocked && intact
          ? 'Run blocked: Choose B31/B31J component basis in Resolve shared settings; live state unchanged.'
          : 'Unset-basis scenario did not independently prove BLOCK and live-state isolation.',
        recovered: false,
      };
    } catch (err) {
      controller.activeTestScenario = {
        name: 'Unset Component Basis', status: 'FAILED',
        blocker: `Could not verify isolated BLOCK: ${err instanceof Error ? err.message : String(err)}`,
        recovered: false,
      };
    }
    controller.render();
  });

  const missingPropBtn = doc.createElement('button');
  missingPropBtn.type = 'button';
  missingPropBtn.className = 'lfea-workbench-btn lfea-workbench-btn--small';
  missingPropBtn.dataset.action = 'lfea-workbench-test-missing-property';
  missingPropBtn.textContent = 'Test missing property';
  missingPropBtn.addEventListener('click', () => {
    const accdbController = controller.options.getAccdbController?.();
    if (!accdbController || !accdbController.tables) {
      controller.activeTestScenario = {
        name: 'Missing Supported Property',
        status: 'BLOCK',
        blocker: 'Run blocked: Import an ACCDB source first',
        recovered: false,
      };
      controller.render();
      return;
    }
    try {
      ensureBaseline(controller, accdbController);
      const disposableTables = structuredClone(accdbController.effectiveTables ?? accdbController.tables);
      const rows = disposableTables.INPUT_BASIC_ELEMENT_DATA?.rows ?? [];
      if (!rows.length) throw new TypeError('No source element to modify on disposable copy.');
      rows[0].DIAMETER = 0;
      const candidate = accdbController.prepareCandidate(disposableTables, {});
      const blocked = candidate.preFlight?.status === 'BLOCK';
      const intact = checkScenarioRecovery(accdbController, controller.scenarioBaseline,
        lfeaBendFactorAuthoritySelection).recovered;
      controller.activeTestScenario = {
        name: 'Missing Supported Property', status: blocked && intact ? 'BLOCK' : 'FAILED',
        blocker: blocked && intact ? 'Run blocked: Correct model input defect in Fix inputs; live state unchanged.'
          : 'Missing-property scenario did not prove a governed BLOCK with no live mutation.',
        recovered: false,
      };
    } catch (err) {
      controller.activeTestScenario = {
        name: 'Missing Supported Property', status: 'FAILED',
        blocker: `Could not verify missing-property BLOCK: ${err instanceof Error ? err.message : String(err)}`,
        recovered: false,
      };
    }
    controller.render();
  });

  const staleOverrideBtn = doc.createElement('button');
  staleOverrideBtn.type = 'button';
  staleOverrideBtn.className = 'lfea-workbench-btn lfea-workbench-btn--small';
  staleOverrideBtn.dataset.action = 'lfea-workbench-test-stale-override';
  staleOverrideBtn.textContent = 'Test stale override';
  staleOverrideBtn.addEventListener('click', () => {
    const owner = controller.options.getAccdbController?.();
    try {
      if (owner?.tables) ensureBaseline(controller, owner);
      controller.activeTestScenario = staleTokenScenario(owner, lfeaBendFactorAuthoritySelection);
    } catch (error) {
      controller.activeTestScenario = { name: 'Stale Override Rejection', status: 'FAILED',
        recovered: false, blocker: error instanceof Error ? error.message : String(error) };
    }
    controller.render();
  });

  const recoverBtn = doc.createElement('button');
  recoverBtn.type = 'button';
  recoverBtn.className = 'lfea-workbench-btn lfea-workbench-btn--small lfea-workbench-btn--primary';
  recoverBtn.dataset.action = 'lfea-workbench-recover-scenario';
  recoverBtn.textContent = 'Demonstrate recovery';
  recoverBtn.addEventListener('click', () => {
    const owner = controller.options.getAccdbController?.();
    controller.activeTestScenario = checkScenarioRecovery(owner, controller.scenarioBaseline,
      lfeaBendFactorAuthoritySelection);
    controller.render();
  });

  const closeBtn = doc.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'lfea-workbench-btn lfea-workbench-btn--small';
  closeBtn.dataset.action = 'lfea-workbench-close-scenarios';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => {
    controller.testScenariosOpen = false;
    controller.render();
  });

  buttons.append(unsetBasisBtn, missingPropBtn, staleOverrideBtn, recoverBtn, closeBtn);
  card.append(heading, intro, resultBox, buttons);
  root.append(card);
}
