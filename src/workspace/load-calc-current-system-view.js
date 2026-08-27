import {
  renderEngineeringLoadPane as renderLegacyEngineeringLoadPane,
  renderLoadCalcConsumer as renderLegacyLoadCalcConsumer,
  renderLoadCalcTopologyPane as renderLegacyLoadCalcTopologyPane,
} from './load-calc-consumer-view.js';

const CURRENT_SYSTEM_AUTHORITY = 'CURRENT_COMMON_INPUT_SYSTEM_RUN';
const PRODUCT_PRIMARY_TABS = new Set(['topology', 'project-data', 'verify', 'loads']);
const LEGACY_ADVANCED_VIEW_COUNT = 11;

export const LOAD_CALC_PRIMARY_WORKFLOW_V1 = Object.freeze([
  Object.freeze({ id: 'import', label: 'Import', selector: '[data-load-calc-import]', tab: null }),
  Object.freeze({ id: 'topology', label: 'Check Topology', selector: '[data-load-calc-tab="topology"]', tab: 'topology' }),
  Object.freeze({ id: 'defaults', label: 'Calculation Defaults', selector: '[data-load-calc-tab="project-data"]', tab: 'project-data' }),
  Object.freeze({ id: 'run', label: 'Run', selector: '[data-load-calc-tab="verify"]', tab: 'verify' }),
  Object.freeze({ id: 'results', label: 'Results', selector: '[data-load-calc-tab="loads"]', tab: 'loads' }),
]);

export const LOAD_CALC_PROMOTED_ADVANCED_TABS_V1 = Object.freeze([
  Object.freeze({ tab: 'masters', label: 'Master Data' }),
  Object.freeze({ tab: 'preflight', label: 'Input Check' }),
]);

export function renderLoadCalcConsumer(documentRef, state) {
  const routineReady = isRoutineRunReady(state?.commonInputState);
  const currentExecution = state?.currentCommonInputExecution || null;
  const scenarioReady = state?.empiricalScenarioState?.calculationEligible === true;
  const projectedAuthorization = !scenarioReady && routineReady
    ? {
        ...(state?.authorizationState || {}),
        state: currentExecution ? 'EXECUTED_CURRENT_SYSTEM' : 'ROUTINE_SYSTEM_READY',
        calculationEligible: true,
        reasonCode: null,
        authorizationFreshness: 'CURRENT',
        executionFreshness: currentExecution ? 'CURRENT' : 'NOT_APPLICABLE',
      }
    : state?.authorizationState;
  const section = renderLegacyLoadCalcConsumer(documentRef, {
    ...state,
    authorizationState: projectedAuthorization,
  });

  if (!scenarioReady && routineReady && typeof section?.querySelector === 'function') {
    const button = section.querySelector('[data-load-calc-run]');
    if (button) {
      button.disabled = false;
      button.removeAttribute?.('disabled');
      button.title = 'Execute the current governed gravity calculation from READY Common Input.';
      button.textContent = '▶ Run Load Calc — Gravity';
    }
    const facts = section.querySelectorAll?.('.empirical-load-calc__facts [data-pill-status]') || [];
    const authorityPill = facts[1];
    if (authorityPill) {
      authorityPill.dataset.pillStatus = 'ok';
      authorityPill.textContent = currentExecution
        ? 'System run current ✓'
        : 'Routine run ready ✓';
    }
  }
  convergeFiveStepWorkflow(section, state);
  return section;
}

export function renderLoadCalcTopologyPane(
  container,
  supportSiteModel,
  routePartitionModel,
  topologyCheck,
  policyFeedback,
  skipError = null,
) {
  renderLegacyLoadCalcTopologyPane(
    container,
    supportSiteModel,
    routePartitionModel,
    topologyCheck,
    policyFeedback,
    skipError,
  );
  if (typeof container?.innerHTML !== 'string') return;
  container.innerHTML = container.innerHTML
    .replace('<h2>Topology Fix</h2>', '<h2>Check Topology</h2>')
    .replaceAll('Continue to Project Data', 'Continue to Calculation Defaults');
}

export function renderEngineeringLoadPane(
  container,
  distribution,
  supportSiteModel,
  routePartitionModel,
  authorizedExecution = null,
  authorizationState = null,
  currentCommonInputExecution = null,
) {
  if (!currentCommonInputExecution) {
    renderLegacyEngineeringLoadPane(
      container,
      distribution,
      supportSiteModel,
      routePartitionModel,
      authorizedExecution,
      authorizationState,
    );
    return;
  }

  const systemState = {
    ...(authorizationState || {}),
    state: 'EXECUTED_CURRENT_SYSTEM',
    calculationEligible: true,
    reasonCode: null,
    authorizationFreshness: 'CURRENT',
    executionFreshness: 'CURRENT',
    packageSemanticHash: null,
  };
  renderLegacyEngineeringLoadPane(
    container,
    distribution,
    supportSiteModel,
    routePartitionModel,
    null,
    systemState,
  );
  const legacyAuthority = /<p data-empirical-authority="UNAUTHORIZED_LEGACY_RESULT">[\s\S]*?<\/p>/u;
  if (!legacyAuthority.test(container.innerHTML)) {
    throw codedError(
      'Current-system Load Calc presentation could not locate the legacy authority placeholder.',
      'CURRENT_COMMON_INPUT_SYSTEM_PRESENTATION_PLACEHOLDER_MISSING',
    );
  }
  container.innerHTML = container.innerHTML.replace(
    legacyAuthority,
    currentSystemExecutionMarkup(currentCommonInputExecution, distribution),
  );
}

export function isRoutineRunReady(commonState) {
  if (commonState?.error) return false;
  const commonInput = commonState?.commonInput;
  const currentReadySeal = commonInput
    && commonState?.staleness?.stale === false
    && commonInput.packageState === 'READY'
    && nonemptyArray(commonInput.sealedMethodIds)
    && emptyArray(commonInput.blockedMethodIds);
  if (currentReadySeal) return true;

  const report = commonState?.report;
  return report?.packageState === 'READY'
    && nonemptyArray(report.readyMethodIds)
    && emptyArray(report.blockedMethodIds);
}

function convergeFiveStepWorkflow(section, state) {
  if (typeof section?.querySelector !== 'function') return;
  const workflow = section.querySelector('.empirical-load-calc__workflow');
  if (!workflow) {
    throw codedError('Load Calc product workflow root is missing.', 'LOAD_CALC_FIVE_STEP_WORKFLOW_ROOT_MISSING');
  }

  for (const row of LOAD_CALC_PROMOTED_ADVANCED_TABS_V1) {
    const legacyButton = workflow.querySelector(
      `button.empirical-load-calc__workflow-step[data-load-calc-tab="${row.tab}"]`,
    );
    if (!legacyButton) {
      throw codedError(
        `Load Calc legacy ${row.tab} workflow entry is missing.`,
        'LOAD_CALC_FIVE_STEP_PROMOTION_SOURCE_MISSING',
      );
    }
    legacyButton.remove();
  }

  LOAD_CALC_PRIMARY_WORKFLOW_V1.forEach((step, index) => {
    const button = workflow.querySelector(`button.empirical-load-calc__workflow-step${step.selector}`);
    if (!button) {
      throw codedError(
        `Load Calc primary workflow entry is missing: ${step.id}.`,
        'LOAD_CALC_FIVE_STEP_PRIMARY_ENTRY_MISSING',
      );
    }
    const indexNode = button.querySelector('.empirical-load-calc__workflow-index');
    const labelNode = button.querySelector('.empirical-load-calc__workflow-label');
    if (!indexNode || !labelNode) {
      throw codedError(
        `Load Calc primary workflow markup is incomplete: ${step.id}.`,
        'LOAD_CALC_FIVE_STEP_PRIMARY_MARKUP_INVALID',
      );
    }
    indexNode.textContent = String(index + 1);
    labelNode.textContent = step.label;
  });
  normalizeCalculationDefaultsStatus(workflow, state);

  const advanced = workflow.querySelector('details.empirical-load-calc__advanced');
  const summary = advanced?.querySelector('summary.empirical-load-calc__workflow-step');
  const advancedNav = advanced?.querySelector('nav.empirical-load-calc__tabs');
  if (!advanced || !summary || !advancedNav || typeof advancedNav.insertAdjacentHTML !== 'function') {
    throw codedError(
      'Load Calc Advanced tools markup is unavailable for secondary diagnostics.',
      'LOAD_CALC_FIVE_STEP_ADVANCED_MARKUP_INVALID',
    );
  }
  advancedNav.insertAdjacentHTML('afterbegin', promotedAdvancedGroupMarkup(state?.activeTab));

  const promotedActive = LOAD_CALC_PROMOTED_ADVANCED_TABS_V1
    .some((row) => row.tab === state?.activeTab);
  const advancedActive = promotedActive
    || (Boolean(state?.activeTab) && !PRODUCT_PRIMARY_TABS.has(state.activeTab));
  advanced.open = advancedActive;
  summary.classList.toggle('is-active', advancedActive);
  summary.dataset.stepState = advancedActive ? 'current' : 'pending';
  const advancedIndex = summary.querySelector('.empirical-load-calc__workflow-index');
  const advancedLabel = summary.querySelector('.empirical-load-calc__workflow-label');
  const advancedStatus = summary.querySelector('.empirical-load-calc__workflow-status');
  if (advancedIndex) advancedIndex.textContent = 'ADV';
  if (advancedLabel) advancedLabel.textContent = 'Advanced tools';
  if (advancedStatus) {
    const promoted = LOAD_CALC_PROMOTED_ADVANCED_TABS_V1
      .find((row) => row.tab === state?.activeTab);
    if (promoted) advancedStatus.textContent = promoted.label;
    else if (!advancedActive) {
      advancedStatus.textContent = `${LEGACY_ADVANCED_VIEW_COUNT + LOAD_CALC_PROMOTED_ADVANCED_TABS_V1.length} views`;
    }
  }

  const runButton = section.querySelector('[data-load-calc-run]');
  const output = section.querySelector('[data-engineering-load-status]');
  if (runButton?.title === 'Check Verify & Run tab — some inputs are missing') {
    runButton.title = 'Open Run or Advanced → Input Check — some inputs are missing';
  }
  if (output?.textContent === 'Check Verify & Run tab — some inputs are missing') {
    output.textContent = 'Open Run or Advanced → Input Check — some inputs are missing';
  }
}

function normalizeCalculationDefaultsStatus(workflow, state) {
  const button = workflow.querySelector(
    'button.empirical-load-calc__workflow-step[data-load-calc-tab="project-data"]',
  );
  const status = button?.querySelector('.empirical-load-calc__workflow-status');
  if (!button || !status) return;
  const readiness = state?.workflowReadiness || {};
  if (readiness.datasetReady !== true) {
    button.dataset.stepState = 'pending';
    status.textContent = 'After import';
    return;
  }
  if (readiness.topologyCheckReady !== true) {
    button.dataset.stepState = 'pending';
    status.textContent = 'After topology';
    return;
  }
  const resolved = isRoutineRunReady(state?.commonInputState);
  const active = state?.activeTab === 'project-data';
  button.dataset.stepState = active ? 'current' : resolved ? 'complete' : 'ready';
  status.textContent = resolved ? 'Resolved' : active ? 'Review' : 'Available';
}

function promotedAdvancedGroupMarkup(activeTab) {
  return `<span class="empirical-load-calc__tab-group" role="group" aria-label="Engineering inputs">
    <span class="panel-eyebrow">Engineering inputs</span>
    ${LOAD_CALC_PROMOTED_ADVANCED_TABS_V1.map((row) => `<button type="button" data-load-calc-tab="${row.tab}" aria-selected="${row.tab === activeTab}" class="${row.tab === activeTab ? 'is-active' : ''}">${row.label}</button>`).join('')}
  </span>`;
}

function currentSystemExecutionMarkup(execution, distribution) {
  return `<details open data-empirical-authority="${CURRENT_SYSTEM_AUTHORITY}">
    <summary>Current Common Input system-run receipt</summary>
    <dl>
      <dt>Authority</dt><dd>${CURRENT_SYSTEM_AUTHORITY}</dd>
      <dt>Freshness</dt><dd>${escapeHtml(distribution?.freshness?.status || 'UNKNOWN')}</dd>
      <dt>Method</dt><dd>${escapeHtml(execution.executedMethod || execution.requestedMethod || distribution?.method || 'UNKNOWN')}</dd>
      <dt>Project</dt><dd>${escapeHtml(execution.projectId || 'NOT_SET')}</dd>
      <dt>Dataset</dt><dd>${escapeHtml(execution.datasetId || 'UNKNOWN')}</dd>
      <dt>Common Input</dt><dd><code>${escapeHtml(execution.commonInputSemanticHash)}</code></dd>
      <dt>Common Input seal</dt><dd><code>${escapeHtml(execution.commonInputSealSemanticHash)}</code></dd>
      <dt>Run authorization</dt><dd><code>${escapeHtml(execution.runAuthorizationSemanticHash)}</code></dd>
      <dt>Mass projection</dt><dd><code>${escapeHtml(execution.massProjectionSemanticHash)}</code></dd>
      <dt>Distribution</dt><dd><code>${escapeHtml(execution.distributionSemanticHash)}</code></dd>
      <dt>Receipt</dt><dd><code>${escapeHtml(execution.semanticHash)}</code></dd>
    </dl>
    <p>System-generated routine Run evidence. No legacy published baseline, handoff, or human approval is asserted.</p>
  </details>`;
}

function nonemptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function emptyArray(value) {
  return Array.isArray(value) && value.length === 0;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  })[character]);
}

function codedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}
