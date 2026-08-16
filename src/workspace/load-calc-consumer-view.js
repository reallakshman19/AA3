/**
 * Builds the empirical Load Calc workbench shell. Engineering values shown by
 * this module are read from immutable empirical result and receipt contracts.
 */
import {
  TOPOLOGY_EDIT_DEFAULT_AUTOFIX_GAP_MM,
  TOPOLOGY_EDIT_MAXIMUM_AUTOFIX_GAP_MM,
} from './topology-edit/topology-edit-gap-autofix-policy.js';

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
  if (snap?.calculationEligible) {
    return { label: 'Run Load Calc', eligible: true, reason: 'Execute configured empirical scenario', action: 'empirical' };
  }
  if (authState?.calculationEligible) {
    return { label: 'Run Load Calc — Gravity', eligible: true, reason: 'Execute authorized gravity load calc', action: 'gravity' };
  }
  return { label: 'Run Load Calc', eligible: false, reason: runReasonText(snap, authState), action: 'none' };
}

function headerMarkup(state) {
  const freshness = state.distribution?.freshness?.status || 'NOT_CALCULATED';
  const authorization = state.authorizationState || {};
  const empiricalScenario = state.empiricalScenarioState || {};
  const commonInput = state.commonInputState || {};
  const activeMethod = empiricalScenario.method || 'CHAINAGE_TRIBUTARY_SPAN_V2';
  const commonSeal = commonInput.commonInput
    ? (commonInput.staleness?.stale ? 'STALE' : 'CURRENT')
    : 'NOT_SEALED';
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
  const advancedOpen = !PRIMARY_TABS.has(state.activeTab);

  return `<header class="empirical-load-calc__header">
    <div><span class="panel-eyebrow">GUIDED WORKFLOW</span><h1>Support Load Calculation</h1></div>
    <div class="empirical-load-calc__facts">
      <span data-pill-status="${sealStatus}">${escapeHtml(sealLabel)}</span>
      <span data-pill-status="${authStatus}">${escapeHtml(authLabel)}</span>
      <span data-pill-status="${resultStatus}">${escapeHtml(resultLabel)}</span>
    </div>
    ${workflowMarkup(state, runAction)}
    <details class="empirical-load-calc__advanced" ${advancedOpen ? 'open' : ''}>
      <summary>Advanced tools <span>${escapeHtml(activeMethod)}</span></summary>
      <nav class="empirical-load-calc__tabs" aria-label="Advanced load calculation views">
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
    </details>
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

const PRIMARY_TABS = new Set(['topology', 'project-data', 'masters', 'preflight', 'verify', 'loads']);

const WORKFLOW_STEPS = Object.freeze([
  Object.freeze({ id: 'import', label: 'Import JSON', tab: null }),
  Object.freeze({ id: 'topology', label: 'Topology Fix', tab: 'topology' }),
  Object.freeze({ id: 'project-data', label: 'Project Data', tab: 'project-data' }),
  Object.freeze({ id: 'masters', label: 'Import Masters', tab: 'masters' }),
  Object.freeze({ id: 'preflight', label: 'Validate Input', tab: 'preflight' }),
  Object.freeze({ id: 'verify', label: 'Run Calc', tab: 'verify' }),
  Object.freeze({ id: 'loads', label: 'View Loads', tab: 'loads' }),
]);

/** Renders the owner-approved process without creating engineering readiness. */
function workflowMarkup(state, runAction) {
  return `<nav class="empirical-load-calc__workflow" aria-label="Load calculation process">
    ${WORKFLOW_STEPS.map((step, index) => workflowStep(step, index, state, runAction)).join('')}
  </nav>`;
}

function workflowStep(step, index, state, runAction) {
  const activeStepId = state.currentWorkflowStepId || 'import';
  const active = step.id === activeStepId;
  const stepState = workflowStepState(step.id, index, activeStepId, state, runAction);
  const action = step.id === 'import'
    ? 'data-load-calc-import'
    : `data-load-calc-tab="${escapeHtml(step.tab)}"`;
  return `<button type="button" class="empirical-load-calc__workflow-step ${active ? 'is-active' : ''}" ${action}
    data-step-state="${escapeHtml(stepState.state)}" aria-current="${active ? 'step' : 'false'}">
    <span class="empirical-load-calc__workflow-index">${index + 1}</span>
    <span class="empirical-load-calc__workflow-label">${escapeHtml(step.label)}</span>
    <span class="empirical-load-calc__workflow-status">${escapeHtml(stepState.label)}</span>
  </button>`;
}

function workflowStepState(stepId, stepIndex, activeStepId, state, runAction) {
  const readiness = state.workflowReadiness || {};
  const activeIndex = WORKFLOW_STEPS.findIndex((step) => step.id === activeStepId);
  const completed = {
    import: readiness.datasetReady,
    topology: readiness.topologyCheckReady,
    'project-data': readiness.projectDataReady,
    masters: readiness.masterDataReady,
    preflight: readiness.validationReady,
    verify: readiness.resultsCurrent,
    loads: readiness.resultsCurrent,
  }[stepId] === true;

  if (stepId === activeStepId) {
    if (stepId === 'topology' && readiness.topologyBlockerCount > 0) {
      return { state: 'blocked', label: 'Fix needed' };
    }
    if (stepId === 'topology' && readiness.topologyReviewIssueCount > 0) {
      return { state: 'review', label: 'Review' };
    }
    if (stepId === 'verify' && runAction.eligible) return { state: 'ready', label: 'Ready' };
    if (stepId === 'preflight' && readiness.validationState && readiness.validationState !== 'NOT_EVALUATED') {
      return { state: 'blocked', label: 'Review' };
    }
    return { state: 'current', label: 'Current' };
  }
  if (activeIndex >= 0 && stepIndex < activeIndex) {
    return completed
      ? { state: 'complete', label: 'Done' }
      : { state: 'blocked', label: 'Required' };
  }
  if (activeIndex < 0 && completed) return { state: 'complete', label: 'Done' };
  return { state: 'pending', label: 'Next' };
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

/**
 * Keeps topology review inside Load Calc. The full editor remains an explicit
 * advanced action and is never opened merely by selecting workflow Step 2.
 */
export function renderLoadCalcTopologyPane(
  container,
  supportSiteModel,
  routePartitionModel,
  topologyCheck,
  policyFeedback,
) {
  if (!container) throw new TypeError('Load Calc Topology Fix requires a container.');
  const modelBlockers = loadModelTopologyBlockers(supportSiteModel, routePartitionModel);
  const blockingFindings = topologyCheck?.blockingFindings || [];
  const reviewFindings = topologyCheck?.reviewFindings || [];
  const findings = topologyCheck?.findings || [];
  const topologyReady = supportSiteModel?.status === 'READY' && routePartitionModel?.status === 'READY';
  const requiresFix = !topologyReady || modelBlockers.length > 0 || blockingFindings.length > 0;
  const reviewRequired = !requiresFix
    && (reviewFindings.length > 0 || (topologyCheck?.skippedIssueCount || 0) > 0);
  const status = requiresFix ? 'BLOCKED' : reviewRequired ? 'REVIEW_REQUIRED' : 'READY';
  const exactFixCount = topologyCheck?.autoFix?.certifiedExactGapCount || 0;
  const gapToleranceMm = topologyCheck?.autoFix?.exactToleranceMm
    || TOPOLOGY_EDIT_DEFAULT_AUTOFIX_GAP_MM;
  const continueLabel = reviewRequired
    ? 'Acknowledge review & continue'
    : 'Continue to Project Data';
  const actionMarkup = `<div class="load-calc-error-check__actions">
    ${findings.length ? '<button type="button" class="button" data-load-calc-tab="3d">Review findings in 3D</button>' : ''}
    ${requiresFix ? '' : `<button type="button" class="button button--primary" data-load-calc-tab="project-data">${continueLabel}</button>`}
  </div>`;
  container.innerHTML = `<section class="load-calc-error-check load-calc-topology" data-role="load-calc-topology" data-status="${status}">
    <header>
      <div><span class="panel-eyebrow">STEP 2</span><h2>Topology Fix</h2>
        <p>${topologyStatusMessage(status, topologyCheck)}</p></div>
      ${actionMarkup}
    </header>
    ${topologyAutofixPolicyMarkup(gapToleranceMm, exactFixCount, policyFeedback)}
    <div class="load-calc-error-check__summary">
      ${diagnosticCard('Support locations', supportSiteModel?.status || 'NOT_AVAILABLE', supportSiteModel?.summary?.physicalLocationCount)}
      ${diagnosticCard('Routes', routePartitionModel?.status || 'NOT_AVAILABLE', routePartitionModel?.summary?.routeCount)}
      ${diagnosticCard('Canonical findings', status, topologyCheck?.issueCount)}
      ${diagnosticCard('Certified auto-fixes', exactFixCount ? 'REVIEW_REQUIRED' : 'READY', exactFixCount)}
      ${diagnosticCard('Skipped findings', topologyCheck?.skippedIssueCount ? 'REVIEW_REQUIRED' : 'READY', topologyCheck?.skippedIssueCount || 0)}
    </div>
    ${modelBlockerMarkup(modelBlockers)}
    ${topologyFindingsMarkup(findings, topologyCheck)}
    ${topologyDispositionMarkup(status, topologyCheck)}
  </section>`;
}

function diagnosticCard(label, status, value) {
  const presentationStatus = status === 'READY'
    ? 'ready'
    : status === 'REVIEW_REQUIRED'
      ? 'review'
      : 'blocked';
  return `<article data-status="${presentationStatus}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(Number.isInteger(value) ? value : status)}</strong><small>${escapeHtml(status)}</small></article>`;
}

function loadModelTopologyBlockers(supportSiteModel, routePartitionModel) {
  return [
    ...(supportSiteModel?.blockers || []),
    ...(routePartitionModel?.blockers || []),
  ];
}

function modelBlockerMarkup(blockers) {
  if (!blockers.length) return '';
  return `<section class="load-calc-error-check__group"><h3>Load-model blockers</h3>
    <ul class="load-calc-error-check__issues">${blockers.map((row) => `<li><strong>${escapeHtml(row.code || 'TOPOLOGY_BLOCKED')}</strong><span>${escapeHtml(row.message || row.path || row.routeId || row.projectDataPath || 'Topology evidence is incomplete.')}</span></li>`).join('')}</ul>
  </section>`;
}

/** Shows configuration and execution as separate actions with local feedback. */
function topologyAutofixPolicyMarkup(gapToleranceMm, exactFixCount, policyFeedback) {
  const candidateMessage = exactFixCount > 0
    ? `${exactFixCount} certified source-backed endpoint gap(s) are eligible. Select Prepare auto-fix to create a 3D draft.`
    : 'No certified source-backed endpoint gaps are eligible. Changing the limit does not make other finding types auto-fixable.';
  const autoFixTitle = exactFixCount > 0
    ? `Prepare ${exactFixCount} certified gap fix candidate(s) in 3D Edit.`
    : 'No certified source-backed endpoint gap is available at the active limit.';
  return `<section class="load-calc-topology-policy" aria-label="Automatic topology fix policy">
    <div><strong>Automatic gap fix</strong><span>Set the limit first, then prepare an eligible certified 3D draft.</span></div>
    <label>Fix gaps strictly below
      <input type="number" min="0.1" max="${TOPOLOGY_EDIT_MAXIMUM_AUTOFIX_GAP_MM}" step="0.1" value="${escapeHtml(gapToleranceMm)}" data-load-calc-topology-gap-mm aria-label="Automatic gap fix tolerance in millimetres">
      mm
    </label>
    <button type="button" class="button" data-load-calc-topology-gap-apply>Set limit</button>
    <button type="button" class="button button--primary" data-load-calc-topology-autofix
      ${exactFixCount > 0 ? '' : 'disabled'} title="${escapeHtml(autoFixTitle)}">Prepare auto-fix (${escapeHtml(exactFixCount)})</button>
    <output class="load-calc-topology-policy__status" data-load-calc-topology-policy-status aria-live="polite">${escapeHtml(policyFeedback || candidateMessage)}</output>
    <small>Maximum setting: ${TOPOLOGY_EDIT_MAXIMUM_AUTOFIX_GAP_MM} mm. Gaps equal to the limit are excluded. Explicit Commit draft remains required.</small>
  </section>`;
}

function topologyFindingsMarkup(findings, topologyCheck) {
  if (!findings.length) return '';
  const exactFixIds = new Set(topologyCheck?.autoFix?.exactGapIssueIds || []);
  const groups = groupTopologyFindings(findings);
  return `<section class="load-calc-error-check__group"><h3>Canonical topology findings</h3>
    <p>${findings.length} findings grouped into ${groups.length} similar type(s). Expand a group to review exact source scope and dispositions.</p>
    <div class="load-calc-topology-groups">${groups.map((group) => topologyFindingGroupMarkup(
      group,
      exactFixIds,
    )).join('')}</div>
    <button type="button" class="button" data-load-calc-topology-review-download>Download review record</button>
  </section>`;
}

function groupTopologyFindings(findings) {
  const grouped = findings.reduce((groups, finding) => {
    const key = `${finding.severity}:${finding.kind}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(finding);
    return groups;
  }, new Map());
  return [...grouped.entries()]
    .map(([key, rows]) => ({ key, rows }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function topologyFindingGroupMarkup(group, exactFixIds) {
  const first = group.rows[0];
  const openCount = group.rows.filter((finding) => finding.reviewDisposition !== 'SKIPPED').length;
  const blockingCount = group.rows.filter((finding) => (
    finding.disposition === 'BLOCK' && finding.reviewDisposition !== 'SKIPPED'
  )).length;
  const skippedCount = group.rows.filter((finding) => finding.reviewDisposition === 'SKIPPED').length;
  const status = blockingCount > 0 ? 'blocked' : openCount > 0 || skippedCount > 0 ? 'review' : 'ready';
  return `<details class="load-calc-topology-group" data-status="${status}">
    <summary><strong>${escapeHtml(`${first.severity} ${first.kind}`)}</strong><span>${group.rows.length} finding(s) · ${openCount} open${skippedCount ? ` · ${skippedCount} skipped` : ''}</span></summary>
    <ul class="load-calc-error-check__issues">${group.rows.map((finding) => topologyFindingRowMarkup(
      finding,
      exactFixIds.has(finding.id),
    )).join('')}</ul>
  </details>`;
}

function topologyFindingRowMarkup(finding, exactFixAvailable) {
  const scope = topologyFindingScope(finding);
  const fix = exactFixAvailable
    ? `Auto-fix candidate at ${Number(finding.distanceMm).toFixed(3)} mm`
    : finding.kind === 'SNAP_GAP'
      ? 'No certified gap fix below the current limit'
      : finding.kind === 'UNKNOWN_RESTRAINT_FAMILY'
        ? 'Source or approved master classification required; the gap limit does not apply'
        : 'Engineering review required; the gap limit does not apply';
  const disposition = finding.reviewDisposition === 'SKIPPED'
    ? `SKIPPED · ${finding.skipReason} · receipt ${finding.skipReceiptId}`
    : `${finding.disposition} · ${fix}`;
  return `<li data-topology-finding-id="${escapeHtml(finding.id)}">
    <span><strong>${escapeHtml(scope)}</strong>${escapeHtml(finding.message)}<small>${escapeHtml(disposition)}</small></span>
    ${topologyFindingActionMarkup(finding, exactFixAvailable)}
  </li>`;
}

function topologyFindingActionMarkup(finding, exactFixAvailable) {
  if (finding.disposition !== 'BLOCK' || finding.id.startsWith('system:')) return '';
  if (finding.reviewDisposition === 'SKIPPED') {
    return `<button type="button" class="button" data-load-calc-topology-restore="${escapeHtml(finding.id)}">Restore blocker</button>`;
  }
  if (exactFixAvailable) return '<span class="load-calc-topology-fix-label">Use certified AutoFix above</span>';
  return `<div class="load-calc-topology-skip">
    <select data-load-calc-topology-skip-reason aria-label="Reason for skipping this finding">
      <option value="">Select reviewed reason…</option>
      <option value="CONFIRMED_VALID_SOURCE_GEOMETRY">Confirmed valid source geometry</option>
      <option value="INTENTIONAL_INDEPENDENT_SYSTEM">Intentional independent system</option>
      <option value="KNOWN_SOURCE_DATA_LIMITATION">Known source-data limitation</option>
      <option value="ACCEPTED_FOR_CURRENT_CALCULATION">Accepted for current calculation</option>
    </select>
    <button type="button" class="button" data-load-calc-topology-skip="${escapeHtml(finding.id)}">Skip</button>
  </div>`;
}

function topologyFindingScope(finding) {
  const branches = finding.sourceScope?.branchIds || [];
  const lines = finding.sourceScope?.lineKeys || [];
  if (branches.length) return `Branch ${branches.join(', ')}`;
  if (lines.length) return `Line ${lines.join(', ')}`;
  return 'Model scope';
}

function topologyStatusMessage(status, topologyCheck) {
  if (status === 'BLOCKED') {
    const skipped = topologyCheck?.skippedIssueCount || 0;
    return `${topologyCheck?.blockingIssueCount || 0} open blocking canonical finding(s) or load-model prerequisite(s) must be resolved.${skipped ? ` ${skipped} finding(s) have recorded skip receipts.` : ''}`;
  }
  if (status === 'REVIEW_REQUIRED') {
    return `${topologyCheck?.reviewIssueCount || 0} medium/low finding(s) and ${topologyCheck?.skippedIssueCount || 0} skipped blocker(s) remain in the review record.`;
  }
  return 'The committed canonical topology has no findings requiring action.';
}

function topologyDispositionMarkup(status, topologyCheck) {
  if (status === 'BLOCKED') {
    const exactFixCount = topologyCheck?.autoFix?.certifiedExactGapCount || 0;
    const gapToleranceMm = topologyCheck?.autoFix?.exactToleranceMm
      || TOPOLOGY_EDIT_DEFAULT_AUTOFIX_GAP_MM;
    const fixMessage = exactFixCount
      ? ` ${exactFixCount} source-backed gap fix(es) strictly below ${escapeHtml(gapToleranceMm)} mm can be prepared automatically.`
      : ' No source-backed automatic fix is available for the current findings.';
    return `<p class="load-calc-error-check__blocked">Topology is blocked. Resolve HIGH findings and load-model prerequisites before continuing.${fixMessage}</p>`;
  }
  if (status === 'REVIEW_REQUIRED') {
    const reviewCount = topologyCheck?.reviewIssueCount || 0;
    const kindSummary = Object.entries(topologyCheck?.countsByKind || {})
      .filter(([, count]) => Number(count) > 0)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([kind, count]) => `${count} ${kind}`)
      .join(', ');
    const gapToleranceMm = topologyCheck?.autoFix?.exactToleranceMm
      || TOPOLOGY_EDIT_DEFAULT_AUTOFIX_GAP_MM;
    const findingDetail = kindSummary ? ` (${escapeHtml(kindSummary)})` : '';
    return `<p class="load-calc-error-check__review">Review required: ${reviewCount} unresolved topology finding(s)${findingDetail}; ${topologyCheck?.skippedIssueCount || 0} recorded skip(s). Findings outside certified gap repair require source or approved-master evidence. TopoFix only prepares certified positive SNAP_GAP merges strictly below ${escapeHtml(gapToleranceMm)} mm and never joins separate routes by inference.</p>`;
  }
  return '<p class="load-calc-error-check__passed">Topology check passed. Continue to the next step.</p>';
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
