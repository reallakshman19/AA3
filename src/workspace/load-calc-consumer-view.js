import { createElement } from './dom-helpers.js';
import { classifyLoadCalcResultPresentation } from './load-calc-result-presentation.js';
import { TOPOLOGY_EDIT_DEFAULT_AUTOFIX_GAP_MM } from './topology-edit/topology-edit-gap-autofix-policy.js';

const VIEW_TABS = Object.freeze([
  ['topology', 'Topology'],
  ['project-data', 'Project Data'],
  ['masters', 'Masters'],
  ['preflight', 'Pre-flight'],
  ['verify', 'Verify & Run'],
  ['loads', 'Loads'],
]);

export function renderLoadCalcConsumer(documentRef, state) {
  const root = createElement(documentRef, 'section', 'load-calc-consumer');
  root.innerHTML = `<header class="load-calc-header">
    <div><span class="eyebrow">Engineering loads</span><h1>Load Calc</h1></div>
    <p data-engineering-load-status>${escapeHtml(state.message || '')}</p>
  </header>
  ${workflowMarkup(state.currentWorkflowStepId, state.workflowReadiness)}
  <nav class="load-calc-tabs" aria-label="Load calculation views">
    ${VIEW_TABS.map(([id, label]) => `<button type="button" data-load-calc-tab="${id}" aria-pressed="${state.activeTab === id}">${label}</button>`).join('')}
  </nav>
  <div data-load-calc-pane></div>`;
  return root;
}

export function renderEngineeringLoadPane(container, distribution, supportSiteModel, routePartitionModel, authorizedExecution, authorizationState) {
  container.innerHTML = `${contractSummary(distribution, supportSiteModel, routePartitionModel, authorizedExecution, authorizationState)}${caseMarkup(distribution, supportSiteModel)}`;
}

export function renderLoadCalcTopologyPane(container, supportSiteModel, routePartitionModel, topologyCheck, feedback = '') {
  const status = topologyCheck?.status || 'PENDING';
  container.innerHTML = `<section class="load-calc-error-check" data-topology-check-status="${escapeHtml(status)}">
    <header><div><span class="eyebrow">Input / Error Check</span><h2>Topology & connectivity</h2></div><strong>${escapeHtml(status)}</strong></header>
    <p>${escapeHtml(topologyStatusMessage(status, topologyCheck))}</p>
    ${feedback ? `<p class="load-calc-topology-feedback">${escapeHtml(feedback)}</p>` : ''}
    ${topologySummaryMarkup(topologyCheck)}
    ${topologyAutoFixMarkup(topologyCheck)}
    ${topologyDispositionMarkup(status, topologyCheck)}
    ${topologyFindingsMarkup(topologyCheck)}
    ${topologySkippedMarkup(topologyCheck)}
    ${topologyModelsMarkup(supportSiteModel, routePartitionModel)}
  </section>`;
}

function workflowMarkup(currentStepId, readiness) {
  const steps = [
    ['import', 'Input'],
    ['topology', 'Error Check'],
    ['project-data', 'Project Data'],
    ['masters', 'Masters'],
    ['preflight', 'Pre-flight'],
    ['verify', 'Verify & Run'],
    ['loads', 'Output'],
  ];
  const currentIndex = Math.max(0, steps.findIndex(([id]) => id === currentStepId));
  return `<ol class="load-calc-workflow">${steps.map(([id, label], index) => {
    const ready = readiness?.[id];
    const state = index < currentIndex ? 'complete' : index === currentIndex ? 'active' : 'pending';
    const readinessClass = ready === false ? ' blocked' : ready === true ? ' ready' : '';
    return `<li class="${state}${readinessClass}"><span>${index + 1}</span>${label}</li>`;
  }).join('')}</ol>`;
}

function topologySummaryMarkup(topologyCheck) {
  if (!topologyCheck) return '<p class="panel-empty">Topology check is pending.</p>';
  return `<dl class="load-calc-topology-summary">
    <dt>Blocking</dt><dd>${integer(topologyCheck.blockingIssueCount)}</dd>
    <dt>Review</dt><dd>${integer(topologyCheck.reviewIssueCount)}</dd>
    <dt>Skipped</dt><dd>${integer(topologyCheck.skippedIssueCount)}</dd>
    <dt>Certified gap fixes</dt><dd>${integer(topologyCheck.autoFix?.certifiedExactGapCount)}</dd>
  </dl>`;
}

function topologyAutoFixMarkup(topologyCheck) {
  if (!topologyCheck) return '';
  const tolerance = topologyCheck.autoFix?.exactToleranceMm ?? TOPOLOGY_EDIT_DEFAULT_AUTOFIX_GAP_MM;
  return `<section class="load-calc-topology-autofix"><h3>Source-backed TopoFix</h3>
    <label>Automatic gap-fix limit (mm)<input type="number" min="0" step="0.1" value="${escapeHtml(tolerance)}" data-load-calc-topology-gap-mm></label>
    <button type="button" class="button" data-load-calc-topology-gap-apply>Apply limit</button>
    <button type="button" class="button button--primary" data-load-calc-topology-autofix ${topologyCheck.autoFix?.certifiedExactGapCount ? '' : 'disabled'}>Prepare auto-fix</button>
    <button type="button" class="button" data-load-calc-topology-review-download>Export review</button>
  </section>`;
}

function topologyModelsMarkup(supportSiteModel, routePartitionModel) {
  return `<details><summary>Canonical load-model evidence</summary><pre>${escapeHtml(JSON.stringify({ supportSiteModel, routePartitionModel }, null, 2))}</pre></details>`;
}

function topologyFindingsMarkup(topologyCheck) {
  const findings = topologyCheck?.findings || [];
  if (!findings.length) return '<p class="panel-empty">No canonical topology findings.</p>';
  return `<section class="load-calc-topology-findings"><h3>Findings</h3><ul>${findings.map((finding) => topologyFindingMarkup(finding, topologyCheck)).join('')}</ul></section>`;
}

function topologySkippedMarkup(topologyCheck) {
  const skipped = topologyCheck?.skippedFindings || [];
  if (!skipped.length) return '';
  return `<details><summary>Skipped findings (${skipped.length})</summary><ul>${skipped.map((finding) => `<li data-topology-finding-id="${escapeHtml(finding.id)}"><strong>${escapeHtml(topologyFindingScope(finding))}</strong> ${escapeHtml(finding.message)} <small>${escapeHtml(finding.skipReason || '')} · receipt ${escapeHtml(finding.skipReceiptId || '')}</small> <button type="button" class="button" data-load-calc-topology-restore="${escapeHtml(finding.id)}">Restore blocker</button></li>`).join('')}</ul></details>`;
}

function topologyFindingMarkup(finding, topologyCheck) {
  const scope = topologyFindingScope(finding);
  const exactFixAvailable = topologyCheck?.autoFix?.certifiedExactGapFindingIds?.includes(finding.id);
  const fix = exactFixAvailable
    ? 'Certified source-backed gap fix available'
    : finding.kind === 'SNAP_GAP'
      ? 'No certified gap fix below the current limit'
      : finding.kind === 'UNKNOWN_RESTRAINT_FAMILY'
        ? 'Source or approved master classification required; the gap limit does not apply'
        : 'Engineering review required; the gap limit does not apply';
  const disposition = finding.reviewDisposition === 'SKIPPED'
    ? `SKIPPED · ${finding.skipReason} · receipt ${finding.skipReceiptId}`
    : `${finding.disposition} · ${fix}`;
  const sourceEvidence = finding.sourceLabel
    ? `<small class="load-calc-topology-source-label">Source evidence: ${escapeHtml(finding.sourceLabel)}</small>`
    : '';
  return `<li data-topology-finding-id="${escapeHtml(finding.id)}">
    <span><strong>${escapeHtml(scope)}</strong>${sourceEvidence}${escapeHtml(finding.message)}<small>${escapeHtml(disposition)}</small></span>
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
    return `<p class="load-calc-error-check__review">Review required: ${reviewCount} unresolved topology finding(s)${findingDetail}; ${topologyCheck?.skippedIssueCount || 0} recorded skip(s). Geometry findings remain governed by source-backed TopoFix policy. Support-semantic reviews require source or approved-master evidence and are never made repairable by changing the ${escapeHtml(gapToleranceMm)} mm gap limit. TopoFix only prepares certified positive SNAP_GAP merges strictly below that limit and never joins separate routes by inference.</p>`;
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
    ${engineeringAuthorityMarkup(distribution)}
    ${blockerMarkup(distribution?.blockers || [...(supportSiteModel?.blockers || []), ...(routePartitionModel?.blockers || [])])}
  </section>`;
}

function engineeringAuthorityMarkup(distribution) {
  if (!distribution) return '';
  const convention = distribution.gravityConventionAuthority || null;
  const support = distribution.supportCapabilityAuthority || null;
  if (!convention && !support) return '';
  const supportRows = support?.rows || [];
  const defaultRows = supportRows.filter((row) => row.fallbackUsed === true);
  const bearingDefaults = defaultRows.filter((row) => row.vertical === true);
  const unresolved = supportRows.filter((row) => row.resolutionAuthority === 'UNRESOLVED_NON_BEARING');
  return `<details open class="load-engineering-authority"><summary>Engineering basis & fallback authority</summary>
    <dl>
      <dt>Source basis</dt><dd>${escapeHtml(distribution.sourceAxisAuthority?.mechanicsScope || distribution.sourceAxisBasis || 'LEGACY / UNBOUND')}</dd>
      <dt>Force convention</dt><dd><code>${escapeHtml(distribution.forceOutputConvention || 'LEGACY_FIXED')}</code></dd>
      <dt>Moment convention</dt><dd><code>${escapeHtml(distribution.momentOutputConvention || 'LEGACY_FIXED')}</code></dd>
      <dt>Analysis basis</dt><dd><code>${escapeHtml(distribution.analysisBasis || 'LEGACY_FIXED')}</code></dd>
      <dt>Result sign</dt><dd><code>${escapeHtml(distribution.resultSignConvention || 'LEGACY_FIXED')}</code></dd>
      <dt>Support capability authority</dt><dd>${escapeHtml(support?.sourceAuthority || 'LEGACY / EXACT-KEY')}</dd>
      <dt>Support DEFAULT resolutions</dt><dd>${integer(defaultRows.length)}</dd>
      <dt>Bearing DEFAULT resolutions</dt><dd>${integer(bearingDefaults.length)}</dd>
      <dt>Unresolved non-bearing support members</dt><dd>${integer(unresolved.length)}</dd>
    </dl>
    ${convention ? `<details><summary>Convention evidence</summary><pre>${escapeHtml(JSON.stringify(convention, null, 2))}</pre></details>` : ''}
    ${support ? `<details ${defaultRows.length ? 'open' : ''}><summary>Support capability resolution (${integer(supportRows.length)})</summary><pre>${escapeHtml(JSON.stringify(supportRows, null, 2))}</pre></details>` : ''}
  </details>`;
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
  return distribution.loadCases.map((loadCase) => {
    const acceptedCurrent = current && isPublishableCaseStatus(loadCase.status);
    return `<section class="load-case-evidence" data-load-case-status="${escapeHtml(loadCase.status)}">
    <h2>${escapeHtml(loadCase.loadCaseId)} <span>${escapeHtml(loadCase.status)}${current ? '' : ' / STALE'}</span></h2>
    ${completenessMarkup(loadCase.completenessAudit, loadCase.status, current)}
    ${blockerMarkup(loadCase.blockers)}
    <table><thead><tr><th>Support site</th><th>Status</th><th>Vertical force (N, source Z-up)</th><th>Transfer moment demand (N·mm)</th><th>Contributors</th></tr></thead>
    <tbody>${loadCase.supportResults.map((row) => `<tr><td><button type="button" data-load-support-entity-id="${escapeHtml(primaryBySite.get(row.supportSiteId) || '')}">${escapeHtml(row.supportSiteId)}</button></td><td>${escapeHtml(row.status)}${current ? '' : ' / STALE'}</td><td>${force(row.verticalForceN, acceptedCurrent && isPublishableCaseStatus(row.status))}</td><td>${moment(row.cantileverMomentDemandNmm, acceptedCurrent && isPublishableCaseStatus(row.status))}</td><td>${integer(row.contributorIds?.length)}</td></tr>`).join('')}</tbody></table>
    <details ${loadCase.status === 'CALCULATED_WITH_EXCEPTIONS' ? 'open' : ''}><summary>Exceptions (${integer(loadCase.exceptionLedger?.length)})</summary><pre>${escapeHtml(JSON.stringify(loadCase.exceptionLedger || [], null, 2))}</pre></details>
    <details><summary>Contribution ledger (${integer(loadCase.contributionLedger?.length)})</summary><pre>${escapeHtml(JSON.stringify(loadCase.contributionLedger || [], null, 2))}</pre></details>
    <details><summary>Excluded inputs (${integer(loadCase.excludedInputs?.length)})</summary><pre>${escapeHtml(JSON.stringify(loadCase.excludedInputs || [], null, 2))}</pre></details>
    <details><summary>Equilibrium / route closure</summary><pre>${escapeHtml(JSON.stringify(loadCase.equilibrium || null, null, 2))}</pre></details>
  </section>`;
  }).join('');
}

function completenessMarkup(audit, status, current) {
  if (!audit) return '';
  const state = status === 'CALCULATED_WITH_EXCEPTIONS'
    ? 'exceptions'
    : status === 'CALCULATED'
      ? 'complete'
      : 'failed';
  return `<section class="load-case-completeness" data-completeness-state="${state}">
    <strong>${current ? 'Current result' : 'Historical result'} · ${escapeHtml(status)}</strong>
    <dl>
      <dt>Evaluated force</dt><dd>${engineeringNumber(audit.evaluatedForceN, 'N')}</dd>
      <dt>Allocated force</dt><dd>${engineeringNumber(audit.allocatedForceN, 'N')}</dd>
      <dt>Unallocated force</dt><dd>${engineeringNumber(audit.unallocatedForceN, 'N')}</dd>
      <dt>Coverage</dt><dd>${percentage(audit.coverageRatio)}</dd>
      <dt>Boundary-transfer moment</dt><dd>${engineeringNumber(audit.boundaryTransferMomentNmm, 'N·mm')}</dd>
      <dt>Unallocated first moment</dt><dd>${engineeringNumber(audit.unallocatedFirstMomentNmm, 'N·mm')}</dd>
      <dt>Exceptions</dt><dd>${integer(audit.exceptionCount)}</dd>
      <dt>Excluded inputs</dt><dd>${integer(audit.excludedContributionCount)}</dd>
    </dl>
  </section>`;
}

function blockerMarkup(blockers) {
  if (!blockers?.length) return '';
  return `<details open class="load-blockers"><summary>Blocking failures (${blockers.length})</summary><ul>${blockers.map((row) => `<li><strong>${escapeHtml(row.code || 'BLOCKED')}</strong> ${escapeHtml(row.path || row.routeId || '')} ${escapeHtml(row.message || '')}</li>`).join('')}</ul></details>`;
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

function isPublishableCaseStatus(value) {
  return value === 'CALCULATED' || value === 'CALCULATED_WITH_EXCEPTIONS';
}

function force(value, acceptedCurrent) {
  if (!acceptedCurrent) return Number.isFinite(value) ? `${value.toFixed(3)} (HISTORICAL)` : 'FAILED';
  return Number.isFinite(value) ? value.toFixed(3) : '—';
}

function moment(value, acceptedCurrent) {
  if (!acceptedCurrent) return Number.isFinite(value) ? `${value.toFixed(3)} (HISTORICAL)` : '—';
  return Number.isFinite(value) ? value.toFixed(3) : '—';
}

function engineeringNumber(value, unit) {
  return Number.isFinite(value) ? `${value.toFixed(3)} ${unit}` : '—';
}

function percentage(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)} %` : '—';
}

function integer(value) { return Number.isInteger(value) ? String(value) : '—'; }
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;',
  })[character]);
}
