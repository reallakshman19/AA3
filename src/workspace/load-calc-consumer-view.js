/**
 * Builds the empirical Load Calc workbench shell. Engineering values shown by
 * this module are read from immutable empirical result and receipt contracts.
 */
export function renderLoadCalcConsumer(documentRef, state) {
  const section = documentRef.createElement('section');
  section.className = 'load-calc-consumer empirical-load-calc';
  section.dataset.role = 'load-calc-consumer';
  section.innerHTML = `${headerMarkup(state)}<div data-load-calc-pane class="empirical-load-calc__pane"></div>`;
  return section;
}

function runReasonText(snap, authState) {
  const code = snap?.reasonCode || authState?.reasonCode || '';
  const MAP = {
    'EMPIRICAL_SCENARIO_REQUIRED': 'Configure a scenario in the Methods tab',
    'EMPIRICAL_SCENARIO_BLOCKED':  'Scenario has blockers — check Methods tab',
    'EMPIRICAL_SCENARIO_NOT_READY': 'Scenario not ready — authorize first',
    'EMPIRICAL_SCENARIO_AUTHORIZATION_REQUIRED': 'Authorize the scenario first',
    'EMPIRICAL_SCENARIO_AUTHORIZATION_STALE': 'Authorization is stale — re-authorize',
    'NO_ACTIVE_DATASET': 'No dataset loaded — import SJSON first',
    'EMPIRICAL_RUNTIME_ACTIVE_MODEL_MISSING': 'Load a dataset first',
    'EMPIRICAL_INPUT_NOT_READY': 'Check Verify & Run tab — some inputs are missing',
    'EMPIRICAL_MODELS_NOT_READY': 'Topology models not ready',
  };
  return MAP[code] || (code ? code.replace(/_/g, ' ').toLowerCase() : 'Not ready');
}

function resolveRunAction(state) {
  const snap = state.empiricalScenarioState;
  const authState = state.authorizationState;
  const common = state.commonInputState;
  const sealOk = !!(common?.commonInput && !common?.staleness?.stale);

  if (snap?.calculationEligible) {
    return { label: 'Run Load Calc', eligible: true, reason: 'Execute configured empirical scenario', action: 'empirical' };
  }
  if (authState?.calculationEligible || sealOk) {
    return { label: 'Run Load Calc', eligible: true, reason: 'Execute authorized empirical support loads', action: 'gravity' };
  }
  return { label: 'Run Load Calc', eligible: false, reason: runReasonText(snap, authState), action: 'none' };
}

function headerMarkup(state) {
  const supportSummary = state.supportSiteModel?.summary;
  const routeSummary = state.routePartitionModel?.summary;
  const freshness = state.distribution?.freshness?.status || 'NOT_CALCULATED';
  const authorization = state.authorizationState || {};
  const empiricalScenario = state.empiricalScenarioState || {};
  const commonInput = state.commonInputState || {};
  const activeMethod = empiricalScenario.method || 'CHAINAGE_TRIBUTARY_SPAN_V2';
  const authority = authorization.packageSemanticHash
    ? 'AUTHORIZED_HANDOFF'
    : state.distribution ? 'UNAUTHORIZED_LEGACY_RESULT' : 'NOT_CALCULATED';
  const commonSeal = commonInput.commonInput
    ? (commonInput.staleness?.stale ? 'STALE' : 'CURRENT')
    : 'NOT_SEALED';
  const eligible = authorization.calculationEligible === true;
  const recalculate = authorization.state === 'EXECUTED_CURRENT';
  const disabledReason = authorizationReason(authorization);
  const runAction = resolveRunAction(state);

  const sealStatus = commonSeal === 'CURRENT' ? 'ok' : (commonSeal === 'NOT_SEALED' ? 'warn' : 'fail');
  const authSt = authorization.state || 'NOT_CONFIGURED';
  const authStatus = (authSt === 'EXECUTED_CURRENT' || authSt === 'AUTHORIZED_CURRENT') ? 'ok' : (authSt.includes('AWAITING') || authSt === 'DRAFT_READY' ? 'warn' : 'fail');
  const resultStatus = freshness === 'CURRENT' ? 'ok' : (freshness === 'NOT_CALCULATED' ? 'warn' : 'fail');

  // Human-readable pill labels
  const SEAL_LABELS = { CURRENT: 'Sealed ✓', STALE: 'Seal stale ⚠', NOT_SEALED: 'Not sealed' };
  const AUTH_LABELS = {
    EXECUTED_CURRENT: 'Authorized ✓', AUTHORIZED_CURRENT: 'Authorized ✓',
    DRAFT_READY: 'Ready to authorize', DRAFT_BLOCKED: 'Scenario blocked',
    AUTHORIZED_STALE: 'Stale — re-authorize', EXECUTED_STALE: 'Results stale',
    NOT_CONFIGURED: 'No scenario', AWAITING_AUTHORIZATION: 'Awaiting auth',
  };
  const RESULT_LABELS = { CURRENT: 'Results ready ✓', NOT_CALCULATED: 'Not run yet', STALE: 'Results stale' };
  const sealLabel  = SEAL_LABELS[commonSeal]   || commonSeal;
  const authLabel  = AUTH_LABELS[authSt]        || authSt;
  const resultLabel = RESULT_LABELS[freshness]  || freshness;

  return `<header class="empirical-load-calc__header">
    <div><span class="panel-eyebrow">${escapeHtml(activeMethod)}</span><h1>Empirical Support Loads</h1></div>
    <div class="empirical-load-calc__facts">
      <span data-pill-status="${sealStatus}">${escapeHtml(sealLabel)}</span>
      <span data-pill-status="${authStatus}">${escapeHtml(authLabel)}</span>
      <span data-pill-status="${resultStatus}">${escapeHtml(resultLabel)}</span>
    </div>
    <nav class="empirical-load-calc__tabs" aria-label="Load calculation views">
      <button type="button" class="${state.activeTab === 'verify' || !state.activeTab ? 'is-active' : ''}" data-load-calc-tab="verify" title="Pre-run readiness checklist">★ Verify &amp; Run</button>
      ${tabGroup('Setup', [
        ['overview', 'Overview'],
        ['project-data', 'Project Data'],
        ['masters', 'Masters'],
        ['enrichment', 'Enrichment & Overrides'],
      ], state.activeTab)}
      ${tabGroup('Scenario', [
        ['restraints', 'Restraints'],
        ['load-cases', 'Load Cases'],
        ['methods', 'Methods'],
      ], state.activeTab)}
      ${tabGroup('Output', [
        ['results', 'Results'],
        ['loads', 'Load Evaluation'],
        ['evidence', 'Evidence'],
      ], state.activeTab)}
      ${tabGroup('Diagnostics', [
        ['preflight', 'Input Check'],
        ['method-basis', 'Method Basis'],
        ['seal-export', 'Seal & Export'],
        ['json-trace', 'JSON Trace'],
      ], state.activeTab)}
      ${tabGroup('Model', [
        ['3d', 'Model / 3D'],
      ], state.activeTab)}
    </nav>
    <div class="empirical-load-calc__actions">
      <button type="button" class="button button--primary" 
        ${runAction.eligible ? '' : 'disabled'}
        data-load-calc-run
        title="${escapeHtml(runAction.reason)}">
        ▶ ${escapeHtml(runAction.label)}
      </button>
      <output data-engineering-load-status aria-live="polite">${escapeHtml(state.message || (!runAction.eligible ? runAction.reason : ''))}</output>
    </div>
  </header>`;
}

function tabGroup(label, tabs, activeTab) {
  return `<span class="empirical-load-calc__tab-group" role="group" aria-label="${escapeHtml(label)}">
    <span class="panel-eyebrow">${escapeHtml(label)}</span>
    ${tabs.map(([id, tabLabel]) => tab(id, tabLabel, activeTab)).join('')}
  </span>`;
}

function tab(id, label, activeTab) {
  const selected = id === activeTab;
  return `<button type="button" data-load-calc-tab="${id}" aria-selected="${selected}" class="${selected ? 'is-active' : ''}">${label}</button>`;
}

export function renderEngineeringLoadPane(
  container,
  distribution,
  supportSiteModel,
  routePartitionModel,
  authorizedExecution = null,
  authorizationState = null,
) {
  if (!container) return;
  container.innerHTML = `${contractSummary(
    distribution,
    supportSiteModel,
    routePartitionModel,
    authorizedExecution,
    authorizationState,
  )}${caseMarkup(distribution, supportSiteModel)}`;
}

function contractSummary(distribution, supportSiteModel, routePartitionModel, authorizedExecution, authorizationState) {
  const siteStatus = supportSiteModel?.status || 'NOT_AVAILABLE';
  const routeStatus = routePartitionModel?.status || 'NOT_AVAILABLE';
  const status = distribution?.status || 'NOT_CALCULATED';
  return `<section class="load-contract-summary"><h2>Calculation authority</h2>
    <dl><dt>Support sites</dt><dd>${escapeHtml(siteStatus)}</dd><dt>Route partitions</dt><dd>${escapeHtml(routeStatus)}</dd><dt>Distribution</dt><dd>${escapeHtml(status)}</dd><dt>Authorization</dt><dd>${escapeHtml(authorizationState?.state || 'NOT_CONFIGURED')}</dd><dt>Authorization freshness</dt><dd>${escapeHtml(authorizationState?.authorizationFreshness || 'NOT_APPLICABLE')}</dd><dt>Execution freshness</dt><dd>${escapeHtml(authorizationState?.executionFreshness || 'NOT_APPLICABLE')}</dd></dl>
    ${authorizationMarkup(authorizedExecution, distribution, authorizationState)}
    ${blockerMarkup(distribution?.blockers || [...(supportSiteModel?.blockers || []), ...(routePartitionModel?.blockers || [])])}
  </section>`;
}

function authorizationMarkup(execution, distribution, authorizationState) {
  if (!execution) {
    const authority = authorizationState?.packageSemanticHash
      ? 'AUTHORIZED_HANDOFF_NOT_EXECUTED'
      : distribution ? 'UNAUTHORIZED_LEGACY_RESULT' : 'NOT_CALCULATED';
    return `<p data-empirical-authority="${authority}">Authority: ${authority}. ${escapeHtml(authorizationReason(authorizationState))}</p>${authorizationDetails(authorizationState)}`;
  }
  return `<details open data-empirical-authority="AUTHORIZED_HANDOFF">
    <summary>Authorized execution receipt: ${escapeHtml(execution.executionId)}</summary>
    <dl>
      <dt>Authorization state</dt><dd>${escapeHtml(authorizationState?.state || 'UNKNOWN')}</dd>
      <dt>Freshness</dt><dd>${escapeHtml(distribution?.freshness?.status || 'UNKNOWN')}</dd>
      <dt>Status</dt><dd>${escapeHtml(execution.status)}</dd>
      <dt>Executed</dt><dd>${escapeHtml(execution.executedAt)}</dd>
      <dt>Project</dt><dd>${escapeHtml(execution.projectId)}</dd>
      <dt>Baseline</dt><dd><code>${escapeHtml(execution.baselineSemanticHash)}</code></dd>
      <dt>Handoff</dt><dd><code>${escapeHtml(execution.handoffSemanticHash)}</code></dd>
      <dt>Projection</dt><dd><code>${escapeHtml(execution.projectionPayloadSemanticHash)}</code></dd>
      <dt>Input</dt><dd><code>${escapeHtml(execution.authorizedInputSemanticHash)}</code></dd>
      <dt>Distribution</dt><dd><code>${escapeHtml(execution.distributionSemanticHash)}</code></dd>
      <dt>Receipt</dt><dd><code>${escapeHtml(execution.semanticHash)}</code></dd>
    </dl>
    ${authorizationDetails(authorizationState)}
  </details>`;
}

function authorizationDetails(state) {
  if (!state) return '';
  const details = state.details?.length ? `<pre>${escapeHtml(JSON.stringify(state.details, null, 2))}</pre>` : '';
  return `<details ${state.calculationEligible ? '' : 'open'} class="empirical-authorization-state"><summary>${escapeHtml(state.state)}${state.reasonCode ? ` — ${escapeHtml(state.reasonCode)}` : ''}</summary>${details}</details>`;
}

function caseMarkup(distribution, supportSiteModel) {
  if (!distribution?.loadCases?.length) return '<p class="panel-empty">A current authorized empirical package is required before calculation.</p>';
  const primaryBySite = new Map((supportSiteModel?.sites || []).map((site) => [site.siteId, site.primaryEntityId]));
  const current = distribution.freshness?.status === 'CURRENT';
  return distribution.loadCases.map((loadCase) => `<section class="load-case-evidence">
    <h2>${escapeHtml(loadCase.loadCaseId)} <span>${escapeHtml(loadCase.status)}${current ? '' : ' / STALE'}</span></h2>
    ${blockerMarkup(loadCase.blockers)}
    <table><thead><tr><th>Support site</th><th>Status</th><th>Vertical force (N, source Z-up)</th><th>Contributors</th></tr></thead>
    <tbody>${loadCase.supportResults.map((row) => `<tr><td><button type="button" data-load-support-entity-id="${escapeHtml(primaryBySite.get(row.supportSiteId) || '')}">${escapeHtml(row.supportSiteId)}</button></td><td>${escapeHtml(row.status)}${current ? '' : ' / STALE'}</td><td>${force(row.verticalForceN, current && loadCase.status === 'CALCULATED' && row.status === 'CALCULATED')}</td><td>${integer(row.contributorIds?.length)}</td></tr>`).join('')}</tbody></table>
    <details><summary>Contribution ledger (${integer(loadCase.contributionLedger?.length)})</summary><pre>${escapeHtml(JSON.stringify(loadCase.contributionLedger || [], null, 2))}</pre></details>
    <details><summary>Excluded inputs (${integer(loadCase.excludedInputs?.length)})</summary><pre>${escapeHtml(JSON.stringify(loadCase.excludedInputs || [], null, 2))}</pre></details>
  </section>`).join('');
}

function blockerMarkup(blockers) {
  if (!blockers?.length) return '';
  return `<details open class="load-blockers"><summary>Blocked inputs (${blockers.length})</summary><ul>${blockers.map((row) => `<li><strong>${escapeHtml(row.code || 'BLOCKED')}</strong> ${escapeHtml(row.path || row.routeId || '')} ${escapeHtml(row.message || '')}</li>`).join('')}</ul></details>`;
}

function authorizationReason(state) {
  if (!state) return 'Authorized empirical package is not configured.';
  const messages = {
    NO_ACTIVE_DATASET: 'An active normalized dataset is required.',
    EMPIRICAL_PACKAGE_REQUIRED: 'An explicitly authorized empirical package is required.',
    AUTHORIZATION_BINDINGS_CHANGED: 'The retained authorization is stale against current mechanical or authority inputs.',
    PROJECT_DATA_CHANGED: 'Project Data changed after authorization.',
    MASTER_DATA_CHANGED: 'Master data changed after authorization.',
    DATASET_EDITED: 'The active dataset changed after authorization.',
    DATASET_REBUILT: 'The active dataset model was rebuilt after authorization.',
    DATASET_REPLACED: 'A different dataset is active.',
  };
  if (messages[state.reasonCode]) return messages[state.reasonCode];
  if (state.state === 'NOT_CONFIGURED' || state.state === 'AWAITING_AUTHORIZATION') {
    return 'An explicitly authorized empirical package is required.';
  }
  if (state.state === 'BLOCKED_NOT_READY') {
    return 'The current empirical inputs are not readiness-qualified.';
  }
  if (state.state === 'AUTHORIZED_STALE' || state.state === 'EXECUTED_STALE') {
    return 'The retained authorized empirical evidence is stale.';
  }
  return state.calculationEligible === true
    ? 'Authorized empirical calculation is available.'
    : 'Authorized empirical calculation is disabled.';
}

function force(value, acceptedCurrent) {
  if (!acceptedCurrent) return Number.isFinite(value) ? `${value.toFixed(3)} (HISTORICAL)` : 'BLOCKED';
  return Number.isFinite(value) ? value.toFixed(3) : 'BLOCKED';
}
function integer(value) { return Number.isInteger(value) ? String(value) : '—'; }
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  })[character]);
}
