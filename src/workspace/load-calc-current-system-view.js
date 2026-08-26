import {
  renderEngineeringLoadPane as renderLegacyEngineeringLoadPane,
  renderLoadCalcConsumer as renderLegacyLoadCalcConsumer,
  renderLoadCalcTopologyPane,
} from './load-calc-consumer-view.js';

const CURRENT_SYSTEM_AUTHORITY = 'CURRENT_COMMON_INPUT_SYSTEM_RUN';

export { renderLoadCalcTopologyPane };

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
  return section;
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
