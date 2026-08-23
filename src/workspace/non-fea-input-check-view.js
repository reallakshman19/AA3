import { commonMethodsForImplementation } from '../core/non-fea-method-consumption/index.js';
import { empiricalLoadCalcScenarioStore } from './engineering-loads/empirical-load-calc-scenario-store.js';
import { engineeringModelStore } from './engineering-model-store.js';
import { masterDataController } from './master-data-controller.js';
import { createCurrentNonFeaWorkspaceStatusProjection } from './non-fea-analysis-plan-runtime.js';
import { nonFeaCommonInputStore } from './non-fea-common-input-store.js';
import { nonFeaEnrichmentStore } from './enrichment/non-fea-enrichment-store.js';
import { projectDataStore } from './project-data/project-data-store.js';
import { WorkspaceState } from './workspace-state.js';

const METHOD_ROWS = Object.freeze([
  ['WEIGHT_AND_GRAVITY', 'Weight & gravity'],
  ['SUSTAINED_REACTIONS', 'Sustained reactions'],
  ['SUSTAINED_MEMBER_ACTIONS', 'Sustained member actions'],
  ['SUSTAINED_STRESS', 'Sustained stress'],
  ['THERMAL_FREE_DISPLACEMENT', 'Thermal free displacement'],
  ['RESTRAINT_REACTIONS', 'Restraint reactions'],
  ['VERTICAL_CONTACT', 'Vertical contact'],
  ['COMBINED_OPERATING_REACTION', 'Combined operating reaction'],
  ['ENRICHED_STAGED_JSON_EXPORT', 'Enriched staged JSON export'],
]);

const GATE_LABELS = Object.freeze({
  A_SOURCE_MODEL: 'Source model and normalization',
  B_TOPOLOGY_POS: 'Topology and exact attachments',
  C_PROJECT_BASIS: 'Project basis',
  D_MASTER_AUTHORITY: 'Master authority',
  E_ENRICHMENT: 'Enrichment and overrides',
  F_METHOD_READINESS: 'Method readiness',
  G_QUALIFICATION: 'Qualification',
  H_SEAL_EXPORT: 'Seal and export',
});

/**
 * Renders one read-only view of current Non-FEA Load Calc status.
 *
 * Engineering values, field resolution, checker evaluation, sealing,
 * authorization and execution remain owned by their existing contracts/stores.
 * This view only presents the canonical workspace-status projection plus
 * observational source evidence.
 */
export function renderNonFeaInputCheckView(container, consumerContext, prepared = {}) {
  if (!container) throw new TypeError('Non-FEA Input Check requires a container.');
  const state = createViewState(consumerContext, prepared);
  container.innerHTML = `${styles()}${viewMarkup(state)}`;
  container.dataset.state = state.overallState;
  container.dataset.workspaceStatusSemanticHash = state.status.semanticHash;
  return state;
}

export function createNonFeaInputCheckViewState(consumerContext, prepared = {}) {
  return createViewState(consumerContext, prepared);
}

function createViewState(consumerContext, prepared) {
  const workspace = WorkspaceState.getSnapshot() || {};
  const dataset = workspace.status === 'ready' ? workspace.dataset ?? null : null;
  const masters = masterDataController.getMasterData();
  const projectProfile = projectDataStore.getProfile();
  const projectOrigin = projectDataStore.getOrigin();
  const supportSites = engineeringModelStore.getSupportSiteModel();
  const routes = engineeringModelStore.getRoutePartitionModel();
  const hashes = activeHashes(dataset, masters);
  const audits = Object.freeze({
    normalization: projectDataStore.validate('normalization', hashes),
    topology: projectDataStore.validate('topology', hashes),
    loads: projectDataStore.validate('loads', hashes),
  });
  const status = prepared.status || createCurrentNonFeaWorkspaceStatusProjection();
  const commonSnapshot = prepared.commonSnapshot || nonFeaCommonInputStore.getSnapshot();
  const enrichmentState = prepared.enrichmentState || fallbackEnrichmentState(nonFeaEnrichmentStore.getSnapshot());
  const masterRows = masterSummary(masters);

  return Object.freeze({
    overallState: status.overallState,
    lifecycleState: status.lifecycleState,
    status,
    dataset,
    gates: Object.freeze(status.gates.map((row) => Object.freeze({
      ...row,
      label: GATE_LABELS[row.gateId] || row.gateId,
    }))),
    blockers: status.blockers,
    methodRows: Object.freeze(buildMethodRows(status.commonInput.methodRows)),
    masterRows: Object.freeze(masterRows),
    sourceRows: Object.freeze(sourceEvidenceRows({ dataset, masters, supportSites, routes, consumerContext })),
    routeRows: Object.freeze(routeEvidenceRows(routes)),
    audits,
    projectSummary: summarizeProjectProfile(projectProfile),
    projectOrigin,
    enrichmentState,
    commonSnapshot,
    supportSites,
    routes,
    consumerContext,
  });
}

function viewMarkup(state) {
  return `<section class="non-fea-input-check" data-role="non-fea-input-check" data-state="${escapeHtml(state.overallState)}" data-lifecycle-state="${escapeHtml(state.lifecycleState)}" data-workspace-status-semantic-hash="${escapeHtml(state.status.semanticHash)}">
    <header class="non-fea-input-check__header">
      <div>
        <div class="non-fea-input-check__title-row">
          <span class="panel-eyebrow">STEP 5</span>
          <span class="non-fea-input-check__scope">READ-ONLY CHECK</span>
        </div>
        <h2>Validate Input</h2>
        <p>Resolve the listed issues before calculation. This check does not invent or change engineering values.</p>
      </div>
      ${nextActionMarkup(state)}
    </header>

    <section class="non-fea-input-check__result" data-status="${state.blockers.length ? 'blocked' : 'ready'}">
      <strong>${state.blockers.length ? `${state.blockers.length} issue${state.blockers.length === 1 ? '' : 's'} need attention` : 'Input validation passed'}</strong>
      <span>${state.status.summary.readyGateCount}/8 governed checks ready</span>
    </section>

    <section class="non-fea-input-check__summary">
      ${metric('Dataset', state.status.source.datasetId || 'NOT_LOADED')}
      ${metric('Project Data', state.gates.find((row) => row.gateId === 'C_PROJECT_BASIS')?.state || 'NOT_EVALUATED', statusClass(state.gates.find((row) => row.gateId === 'C_PROJECT_BASIS')?.state))}
      ${metric('Masters', state.gates.find((row) => row.gateId === 'D_MASTER_AUTHORITY')?.state || 'NOT_EVALUATED', statusClass(state.gates.find((row) => row.gateId === 'D_MASTER_AUTHORITY')?.state))}
      ${metric('Blockers', state.blockers.length, state.blockers.length ? 'blocked' : 'ready')}
    </section>

    ${state.blockers.length ? blockerSummaryMarkup(state.blockers) : '<p class="non-fea-ready-copy">All required checks currently pass. Continue to Run Calc.</p>'}

    <details class="non-fea-input-check__advanced">
      <summary>Advanced validation evidence</summary>
      <div class="non-fea-input-check__advanced-intro">
        <span>GOVERNED COMMON INPUT</span><span>NON-FEA ONLY</span><span>PHASE 1 · PREFLIGHT CONSOLIDATION</span><span>STATUS PROJECTION V1</span>
        <p><strong>Boundary:</strong> this view does not edit engineering values, accept enrichment, evaluate methods, issue a seal, authorize an implementation, execute a calculation or process FEA results. It only renders current governed status and evidence.</p>
      </div>
      <div class="non-fea-input-check__layout">
        <main>
          ${workflowMarkup(state.gates)}
          ${auditMarkup(state.audits)}
          ${sourceEvidenceMarkup(state.sourceRows)}
          ${routeEvidenceMarkup(state.routeRows)}
          ${methodMarkup(state.methodRows)}
          ${blockerMarkup(state.blockers)}
        </main>
        <aside>
          ${projectBasisMarkup(state)}
          ${masterMarkup(state.masterRows)}
          ${enrichmentAuthorityMarkup(state)}
          ${commonInputAuthorityMarkup(state)}
          ${historicalAuthorityMarkup(state)}
        </aside>
      </div>
    </details>
  </section>`;
}

const ROOT_CAUSE_GUIDANCE = Object.freeze({
  QUALIFICATION_PROFILE_REQUIRED: 'No locked QUALIFIED profile is bound to these methods. This is qualification evidence from your validation programme, so there is no built-in default: load an approved profile set into Project Data under qualificationPolicy.qualificationProfiles, approve it, then select the profile and version. Every other blocker can be cleared and these methods will still not seal until that is supplied.',
  SECTION_COVERAGE_INCOMPLETE: 'Some pipes have no outer diameter and wall thickness. Both come from the Piping Class master, so check that its rows actually match the piping class and bore used by those lines — a loaded master still leaves gaps where nothing matched.',
  FLEXURAL_COVERAGE_INCOMPLETE: 'Some pipes have neither a flexural rigidity nor the elastic modulus and second moment of area needed to derive one. Modulus comes from the material, and the second moment from bore and wall thickness, so this usually clears with Section coverage once the Piping Class rows match those lines.',
  MASS_COVERAGE_INCOMPLETE: 'Some entities have no mass evidence. Pipes need a unit weight, or a material density with bore and wall thickness. Valves and other fittings need a component weight from the Weights master. Operating and hydro cases each need their fluid density from the Line List, and insulated lines need an insulation weight or density.',
  MASTER_NOT_CURRENT: 'A required master has no current normalized rows or source hash. Re-apply its column mapping.',
});

/**
 * Gate rows carry their state as the issue code, so a blocked gate reports
 * BLOCKED rather than a cause. Those rows restate causes that are already
 * listed under their own gate area, and grouping them as shared causes counts
 * the same problem twice.
 */
const GATE_STATE_CODES = new Set([
  'BLOCKED', 'PARTIALLY_READY', 'STALE', 'NOT_EVALUATED', 'NOT_SEALED',
]);

/** Masters and entity matching resolve coverage; the codes share one remedy. */
const COVERAGE_CODES = new Set([
  'SECTION_COVERAGE_INCOMPLETE',
  'FLEXURAL_COVERAGE_INCOMPLETE',
  'MASS_COVERAGE_INCOMPLETE',
]);

/**
 * Groups blockers by their underlying cause rather than by the method each one
 * surfaces through. One missing master blocks many methods, so a per-method list
 * overstates how many distinct problems there are to fix.
 */
function rootCauseMarkup(rows, active) {
  const relevant = active
    ? rows.filter((row) => !row.scope || !METHOD_SCOPES.has(row.scope) || active.has(row.scope))
    : rows;
  const byCode = new Map();
  relevant.forEach((row) => {
    const code = row.code || 'UNSPECIFIED';
    const entry = byCode.get(code) || { code, count: 0, scopes: new Set() };
    entry.count += 1;
    if (row.scope) entry.scopes.add(row.scope);
    byCode.set(code, entry);
  });
  const shared = [...byCode.values()]
    .filter((entry) => entry.scopes.size > 1 && !GATE_STATE_CODES.has(entry.code))
    .sort((left, right) => right.count - left.count);
  if (shared.length === 0) return '';
  const covered = shared.reduce((sum, entry) => sum + entry.count, 0);
  const coverage = shared.filter((entry) => COVERAGE_CODES.has(entry.code));
  const coverageNote = coverage.length > 1
    ? `<p class="non-fea-input-check__root-note">The ${coverage.length} coverage causes below are one problem, not ${coverage.length}: entities that no master row resolved. Fixing the match clears them together. Open Advanced validation evidence for the entity list.</p>`
    : '';
  return `<div class="non-fea-input-check__root-causes">
    <strong>${covered} of these come from ${shared.length} shared cause${shared.length === 1 ? '' : 's'}</strong>
    ${coverageNote}
    <ul>${shared.map((entry) => `<li>
      <code>${escapeHtml(entry.code)}</code> — blocks ${entry.scopes.size} method(s), ${entry.count} issue(s).
      ${escapeHtml(ROOT_CAUSE_GUIDANCE[entry.code] || 'Resolve this cause to clear every method listed against it.')}
    </li>`).join('')}</ul>
  </div>`;
}

/**
 * Methods this load calculation actually consumes.
 *
 * The common checker is requested for every registered method, but the active
 * implementation binds only a subset. A blocker against an unbound method never
 * prevents this calculation, so the two are reported separately instead of
 * being presented as one undifferentiated backlog.
 */
/** Scopes that name a common method, as opposed to a gate or data area. */
const METHOD_SCOPES = new Set(METHOD_ROWS.map(([methodId]) => methodId));

function activeCalculationMethods() {
  try {
    const method = empiricalLoadCalcScenarioStore.getProposal()?.method
      || 'CHAINAGE_TRIBUTARY_SPAN_V2';
    return new Set(commonMethodsForImplementation(method));
  } catch {
    return null;
  }
}

function blockerSummaryMarkup(rows) {
  const groups = [];
  const byScope = new Map();
  rows.forEach((row) => {
    const key = row.scope || 'INPUT';
    const existing = byScope.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    const group = { scope: key, count: 1, message: row.message || row.code || 'Input evidence is incomplete.' };
    groups.push(group);
    byScope.set(key, group);
  });
  const active = activeCalculationMethods();
  // Only a method-scoped blocker can be irrelevant. Gate and data scopes such as
  // C_PROJECT_BASIS or MASTER_DATA are prerequisites for every method and must
  // never be filtered out, or the summary reports zero while the run stays
  // disabled.
  const blocksThis = (group) => !active
    || !METHOD_SCOPES.has(group.scope)
    || active.has(group.scope);
  const required = groups.filter(blocksThis);
  const other = groups.filter((group) => !blocksThis(group));
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  const requiredTotal = required.reduce((sum, group) => sum + group.count, 0);
  // A gate area summarises the requirements beneath it, so it clears when those
  // are fixed rather than needing separate work. Marking it prevents the same
  // problem being read as two outstanding items.
  const item = (group) => `<li${GATE_LABELS[group.scope] ? ' data-rollup="true"' : ''}><strong>${escapeHtml(group.scope)}</strong><span>${group.count} issue${group.count === 1 ? '' : 's'}</span><p>${escapeHtml(group.message)}${GATE_LABELS[group.scope] ? ' This is a gate summary: it clears when the causes above are resolved.' : ''}</p></li>`;
  const otherSection = other.length === 0 ? '' : `<details class="non-fea-input-check__other-methods">
    <summary>${other.reduce((sum, group) => sum + group.count, 0)} issue(s) in ${other.length} area(s) that do not block this calculation</summary>
    <p>These belong to requested methods that the active implementation does not consume. They are reported for completeness and do not need to be resolved to run this load calculation.</p>
    <ul>${other.map(item).join('')}</ul>
  </details>`;
  return `<section class="non-fea-input-check__blocker-summary"><h3>What needs attention</h3>
    <p class="non-fea-input-check__blocker-reconcile">${requiredTotal} of ${total} issue(s) block this calculation, across ${required.length} area(s).</p>
    ${rootCauseMarkup(rows, active)}
    <ul>${required.map(item).join('')}</ul>
    ${otherSection}
    <p>Open Advanced validation evidence for the complete audit trail.</p>
  </section>`;
}

function nextActionMarkup(state) {
  const blockedGate = state.gates.find((row) => row.state !== 'READY');
  const actions = {
    A_SOURCE_MODEL: ['data-load-calc-import', 'Import JSON'],
    B_TOPOLOGY_POS: ['data-load-calc-tab="3d"', 'Fix Topology'],
    C_PROJECT_BASIS: ['data-load-calc-tab="project-data"', 'Complete Project Data'],
    D_MASTER_AUTHORITY: ['data-load-calc-tab="masters"', 'Import Masters'],
    E_ENRICHMENT: ['data-load-calc-tab="enrichment"', 'Review Enrichment'],
    F_METHOD_READINESS: ['data-load-calc-tab="method-basis"', 'Review Method Readiness'],
    G_QUALIFICATION: ['data-load-calc-tab="method-basis"', 'Review Qualification'],
    H_SEAL_EXPORT: ['data-load-calc-tab="seal-export"', 'Seal Validated Input'],
  };
  const [attribute, label] = actions[blockedGate?.gateId] || ['data-load-calc-tab="verify"', 'Continue to Run Calc'];
  return `<div class="non-fea-input-check__actions"><button type="button" class="button button--primary" ${attribute}>${escapeHtml(label)}</button></div>`;
}

function workflowMarkup(gates) {
  return `<section class="non-fea-panel">
    <header><div><span class="panel-eyebrow">EIGHT-GATE WORKFLOW</span><h3>Current governed lifecycle</h3></div><p>Gate state comes only from <code>non-fea-workspace-status-projection/v1</code>.</p></header>
    <div class="non-fea-gates">${gates.map((row, index) => `<article class="non-fea-gate non-fea-gate--${statusClass(row.state)}" data-common-input-state="${escapeHtml(row.state)}"${row.gateId === 'E_ENRICHMENT' ? ` data-enrichment-gate-state="${escapeHtml(row.state)}"` : ''}>
      <div class="non-fea-gate__index">${index + 1}</div>
      <div><div class="non-fea-gate__heading"><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.state)}</span></div>
      <code>${escapeHtml(row.gateId)}</code><p>${escapeHtml(row.message)}</p></div>
    </article>`).join('')}</div>
  </section>`;
}

function auditMarkup(audits) {
  const rows = [['normalization', 'Normalization'], ['topology', 'Topology'], ['loads', 'Load calculation']];
  return `<section class="non-fea-panel" data-role="non-fea-project-audits">
    <header><div><span class="panel-eyebrow">PROJECT DATA WORKFLOWS</span><h3>Non-FEA prerequisite audits</h3></div><p>These are observational details behind Gate C; Project Data remains the editor and policy authority.</p></header>
    <div class="non-fea-audits">${rows.map(([key, label]) => {
    const audit = audits[key];
    return `<article data-preflight-workflow="${escapeHtml(key)}" data-status="${audit?.valid ? 'READY' : 'BLOCKED'}">
      <strong>${escapeHtml(label)}</strong><span>${audit?.valid ? 'READY' : `BLOCKED (${audit?.errors?.length || 0})`}</span>
      <p>${audit?.valid ? 'Approved evidence is current.' : escapeHtml(firstAuditMessage(audit))}</p></article>`;
  }).join('')}</div>
  </section>`;
}

function sourceEvidenceMarkup(rows) {
  return `<section class="non-fea-panel" data-role="non-fea-source-evidence">
    <header><div><span class="panel-eyebrow">SOURCE CUSTODY</span><h3>Active source and contract evidence</h3></div><p>Hashes and observed content are displayed without creating missing evidence.</p></header>
    <div class="non-fea-table-wrap"><table><thead><tr><th>Evidence</th><th>Status</th><th>Source / schema</th><th>SHA / semantic hash</th><th>Observed content</th></tr></thead>
    <tbody>${rows.map((row) => `<tr><td><strong>${escapeHtml(row.label)}</strong></td><td><span class="non-fea-chip non-fea-chip--${statusClass(row.status)}">${escapeHtml(row.status)}</span></td><td>${escapeHtml(row.source)}</td><td><code title="${escapeHtml(row.hash)}">${escapeHtml(compactHash(row.hash))}</code></td><td>${escapeHtml(row.observed)}</td></tr>`).join('')}</tbody></table></div>
  </section>`;
}

function routeEvidenceMarkup(rows) {
  return `<section class="non-fea-panel" data-role="non-fea-route-evidence">
    <header><div><span class="panel-eyebrow">EXACT ROUTE EVIDENCE</span><h3>Route partitions</h3></div><p>No proximity repair or inferred joining is performed by this view.</p></header>
    ${rows.length ? `<div class="non-fea-table-wrap"><table><thead><tr><th>Route</th><th>Line</th><th>Status</th><th>Edges</th><th>Physical edges</th><th>Length (mm)</th><th>Blockers</th></tr></thead><tbody>${rows.map((row) => `<tr><td><strong>${escapeHtml(row.routeId)}</strong></td><td>${escapeHtml(row.lineKey)}</td><td><span class="non-fea-chip non-fea-chip--${statusClass(row.status)}">${escapeHtml(row.status)}</span></td><td>${row.edgeCount}</td><td>${row.physicalEdgeCount}</td><td>${escapeHtml(row.totalLengthMm)}</td><td>${escapeHtml(row.blockers)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="panel-empty">Route partitions are not available.</p>'}
  </section>`;
}

function methodMarkup(rows) {
  return `<section class="non-fea-panel">
    <header><div><span class="panel-eyebrow">METHOD READINESS</span><h3>Independent Non-FEA input readiness</h3></div><p>Input readiness comes only from the common checker. Implementation qualification, selection, authorization and execution remain separate.</p></header>
    <div class="non-fea-table-wrap"><table><thead><tr><th>Method</th><th>Input state</th><th>Current basis</th></tr></thead><tbody>${rows.map((row) => `<tr data-method-id="${escapeHtml(row.methodId)}"><td><strong>${escapeHtml(row.label)}</strong><code>${escapeHtml(row.methodId)}</code></td><td><span class="non-fea-chip non-fea-chip--${statusClass(row.state)}">${escapeHtml(row.state)}</span></td><td>${escapeHtml(row.basis)}</td></tr>`).join('')}</tbody></table></div>
  </section>`;
}

function blockerMarkup(rows) {
  return `<section class="non-fea-panel">
    <header><div><span class="panel-eyebrow">STATUS BLOCKERS</span><h3>Current unresolved lifecycle evidence</h3></div><strong>${rows.length}</strong></header>
    ${rows.length ? `<ul class="non-fea-blockers">${rows.slice(0, 200).map((row) => `<li><span class="non-fea-chip non-fea-chip--blocked">${escapeHtml(row.scope)}</span><div><strong>${escapeHtml(row.code)}</strong><p>${escapeHtml(row.message)}</p></div></li>`).join('')}</ul>` : '<p class="panel-empty non-fea-ready-copy">The current status projection has no blocking or stale lifecycle evidence.</p>'}
  </section>`;
}

function projectBasisMarkup(state) {
  const summary = state.projectSummary;
  return `<section class="non-fea-panel non-fea-side-panel">
    <header><div><span class="panel-eyebrow">PROJECT BASIS OWNER</span><h3>Project Data</h3></div><button type="button" data-load-calc-tab="project-data">Edit</button></header>
    <dl class="non-fea-facts"><dt>Authority</dt><dd>${escapeHtml(state.projectOrigin?.kind || 'NOT_AVAILABLE')}</dd><dt>Source</dt><dd>${escapeHtml(state.projectOrigin?.source || 'NOT_AVAILABLE')}</dd><dt>Revision</dt><dd>${escapeHtml(summary.revision)}</dd><dt>Normalization</dt><dd>${state.audits.normalization.valid ? 'READY' : 'BLOCKED'}</dd><dt>Load fields</dt><dd>${summary.loadApproved}/${summary.loadTotal} approved</dd><dt>Topology fields</dt><dd>${summary.topologyApproved}/${summary.topologyTotal} approved</dd><dt>Missing values</dt><dd>${summary.missing}</dd></dl>
    <p class="non-fea-muted">Project Data remains the owning editor for approved calculation policy. Input Check does not duplicate its write authority.</p>
  </section>`;
}

function masterMarkup(rows) {
  return `<section class="non-fea-panel non-fea-side-panel">
    <header><div><span class="panel-eyebrow">MASTER DATA OWNER</span><h3>Exact-match sources</h3></div><button type="button" data-load-calc-tab="masters">Review</button></header>
    <ul class="non-fea-master-list">${rows.map((row) => `<li><div><strong>${escapeHtml(row.label)}</strong><small>${row.rowCount} normalized rows · ${escapeHtml(compactHash(row.sourceHash))}</small></div><span class="non-fea-chip non-fea-chip--${statusClass(row.status)}">${escapeHtml(row.status)}</span></li>`).join('')}</ul>
    <p class="non-fea-muted">Approved Masters may create exact review candidates; they do not directly write accepted enrichment or calculation authority.</p>
  </section>`;
}

function enrichmentAuthorityMarkup(state) {
  const row = state.enrichmentState;
  return `<section class="non-fea-panel non-fea-side-panel" data-role="non-fea-enrichment-authority" data-status="${escapeHtml(row.status)}">
    <header><div><span class="panel-eyebrow">COMMON ENRICHMENT AUTHORITY</span><h3>${escapeHtml(row.status)}</h3></div><button type="button" data-load-calc-tab="enrichment">Review</button></header>
    <dl class="non-fea-facts"><dt>Proposals</dt><dd>${row.proposalCount}</dd><dt>Accepted records</dt><dd>${row.acceptedCount}</dd><dt>Resolutions</dt><dd>${row.resolutionCount}</dd><dt>Affected entities</dt><dd>${row.affectedEntityCount}</dd><dt>Source binding</dt><dd><code>${escapeHtml(compactHash(row.boundSourceSemanticHash))}</code></dd><dt>Sidecar</dt><dd><code>${escapeHtml(compactHash(row.sidecarSemanticHash))}</code></dd><dt>Resolution ledger</dt><dd><code>${escapeHtml(compactHash(row.resolutionLedgerSemanticHash))}</code></dd></dl>
    <p class="non-fea-muted">${escapeHtml(row.message)}</p>
    ${row.blockers.length ? `<ul class="non-fea-blockers">${row.blockers.slice(0, 20).map((blocker) => `<li><div><strong>${escapeHtml(blocker.code || 'BLOCKED')}</strong><p>${escapeHtml(blocker.message || blocker.path || 'Enrichment authority is blocked.')}</p></div></li>`).join('')}</ul>` : ''}
  </section>`;
}

function commonInputAuthorityMarkup(state) {
  const status = state.status;
  const common = status.commonInput;
  const sealState = common.commonInputSemanticHash ? (common.commonInputStale ? 'STALE' : 'CURRENT') : 'NOT_SEALED';
  return `<section class="non-fea-panel non-fea-side-panel non-fea-seal" data-role="non-fea-common-input-authority" data-report-state="${escapeHtml(common.reportPackageState || 'NOT_EVALUATED')}" data-seal-state="${escapeHtml(sealState)}" data-workspace-status-semantic-hash="${escapeHtml(status.semanticHash)}">
    <header><div><span class="panel-eyebrow">COMMON CHECKER & SEAL</span><h3>${escapeHtml(status.lifecycleState)}</h3></div><button type="button" data-load-calc-tab="method-basis">Review</button></header>
    <dl class="non-fea-facts"><dt>Overall</dt><dd>${escapeHtml(status.overallState)}</dd><dt>Ready gates</dt><dd>${status.summary.readyGateCount}/8</dd><dt>Ready methods</dt><dd>${status.summary.checkerReadyMethodCount}</dd><dt>Blocked methods</dt><dd>${status.summary.checkerBlockedMethodCount}</dd><dt>Candidate</dt><dd><code>${escapeHtml(compactHash(common.candidateSemanticHash))}</code></dd><dt>Seal</dt><dd>${escapeHtml(sealState)}</dd><dt>Common input</dt><dd><code>${escapeHtml(compactHash(common.commonInputSemanticHash))}</code></dd><dt>Implementations</dt><dd>${status.summary.qualifiedImplementationCount}/${status.summary.implementationCount} qualified</dd><dt>Authorizations</dt><dd>${status.summary.authorizationReceiptCount}</dd><dt>Executions</dt><dd>${status.summary.executionReceiptCount}</dd><dt>Export</dt><dd>${common.exportSemanticHash ? 'CREATED' : 'NOT_CREATED'}</dd><dt>Status projection</dt><dd><code>${escapeHtml(compactHash(status.semanticHash))}</code></dd></dl>
    ${state.commonSnapshot.error ? `<p class="non-fea-muted">${escapeHtml(state.commonSnapshot.error)}</p>` : ''}
    <button type="button" data-load-calc-tab="seal-export">Open Seal & Export</button>
    <p class="non-fea-muted">Checker evaluation, explicit sealing, method authorization and calculation remain separate lifecycle actions.</p>
  </section>`;
}

function historicalAuthorityMarkup(state) {
  const execution = state.status.execution;
  return `<section class="non-fea-panel non-fea-side-panel">
    <header><div><span class="panel-eyebrow">MIGRATION EVIDENCE</span><h3>Historical legacy authority</h3></div></header>
    <dl class="non-fea-facts"><dt>Scenario</dt><dd>${escapeHtml(execution.empiricalScenarioState || 'NOT_CONFIGURED')}</dd><dt>Authorization</dt><dd>${escapeHtml(execution.empiricalAuthorizationState || 'NOT_CONFIGURED')}</dd><dt>Reason</dt><dd>${escapeHtml(execution.empiricalAuthorizationReasonCode || 'NOT_AVAILABLE')}</dd></dl>
    <p class="non-fea-muted">Retained historical authorizations are evidence only. They cannot establish current common-checker readiness or execution authority.</p>
  </section>`;
}

function buildMethodRows(statusRows) {
  const byId = new Map((statusRows || []).map((row) => [row.methodId, row]));
  return METHOD_ROWS.map(([methodId, label]) => {
    const row = byId.get(methodId);
    const state = row?.state || 'NOT_EVALUATED';
    return {
      methodId,
      label,
      state,
      basis: state === 'READY'
        ? 'All exact common-checker input requirements are current.'
        : row?.blockerCodes?.length
          ? row.blockerCodes.join(', ')
          : 'The common checker has not produced a current method receipt.',
    };
  });
}

function fallbackEnrichmentState(snapshot) {
  const status = snapshot.stale
    ? 'STALE'
    : snapshot.acceptedRecords?.length
      ? 'NOT_EVALUATED'
      : snapshot.proposals?.length
        ? 'REVIEW_REQUIRED'
        : 'NOT_EVALUATED';
  return Object.freeze({
    status,
    message: snapshot.acceptedRecords?.length
      ? 'Accepted common-enrichment evidence exists; current field resolution has not been projected for this view.'
      : snapshot.proposals?.length
        ? `${snapshot.proposals.length} exact enrichment proposals await review.`
        : 'No accepted common-enrichment sidecar has been reviewed for the active source.',
    proposalCount: snapshot.proposals?.length || 0,
    acceptedCount: snapshot.acceptedRecords?.length || 0,
    sourceSemanticHash: snapshot.currentSourceSemanticHash || null,
    boundSourceSemanticHash: snapshot.boundSourceSemanticHash || null,
    sidecarSemanticHash: null,
    resolutionLedgerSemanticHash: null,
    impactSemanticHash: null,
    resolutionCount: 0,
    affectedEntityCount: 0,
    blockers: Object.freeze([]),
  });
}

function sourceEvidenceRows({ dataset, masters, supportSites, routes, consumerContext }) {
  const availableContracts = consumerContext?.availabilitySummary?.availableContractKeys;
  return [
    evidenceRow('SJSON dataset', dataset && isSha256(dataset.sourceSha256) ? 'READY' : 'BLOCKED', dataset?.sourceName || dataset?.datasetId || 'NOT_LOADED', dataset?.sourceSha256, dataset ? `${integer(dataset.summary?.nodeCount)} nodes · ${integer(dataset.summary?.entityCount ?? dataset.summary?.objectCount)} entities` : 'No active dataset'),
    evidenceRow('Shared piping model', isSemanticHash(dataset?.sharedModel?.semanticHash) ? 'READY' : 'BLOCKED', dataset?.sharedModel?.schema || 'NOT_AVAILABLE', dataset?.sharedModel?.semanticHash, dataset?.sharedModel ? `${integer(dataset.sharedModel.components?.length)} components · ${integer(dataset.sharedModel.supports?.length)} supports` : 'Not materialized'),
    masterEvidenceRow('Line list', masters?.lineList, true),
    masterEvidenceRow('Piping classes', masters?.pipingClass, true),
    masterEvidenceRow('Component weights', masters?.weight, true),
    masterEvidenceRow('Material map', masters?.materialMap, false),
    evidenceRow('Support sites', supportSites?.status || 'BLOCKED', supportSites?.schema || 'NOT_BUILT', supportSites?.semanticHash, supportSites ? `${integer(supportSites.summary?.supportAssemblyCount)} assemblies · ${integer(supportSites.summary?.physicalLocationCount)} sites` : 'Not built'),
    evidenceRow('Route partitions', routes?.status || 'BLOCKED', routes?.schema || 'NOT_BUILT', routes?.semanticHash, routes ? `${integer(routes.summary?.routeCount)} routes · ${integer(routes.summary?.edgeCount)} edges` : 'Not built'),
    evidenceRow('Workspace contracts', consumerContext ? 'READY' : 'BLOCKED', consumerContext?.schema || 'NOT_AVAILABLE', consumerContext?.semanticHash, consumerContext ? `${integer(availableContracts?.length)} available contracts` : 'Context unavailable'),
  ];
}

function masterEvidenceRow(label, master, required) {
  const rows = Array.isArray(master?.normalizedRows) ? master.normalizedRows : [];
  const ready = rows.length > 0 && Boolean(master?.sourceHash);
  return evidenceRow(label, ready ? 'READY' : required ? 'BLOCKED' : 'OPTIONAL', master?.fileName || master?.sheetName || 'NOT_LOADED', master?.sourceHash, `${rows.length} normalized rows`);
}
function evidenceRow(label, status, source, hash, observed) {
  return Object.freeze({ label, status, source: source || 'NOT_AVAILABLE', hash: hash || 'NOT_AVAILABLE', observed });
}
function routeEvidenceRows(routes) {
  return (routes?.routes || []).map((route) => Object.freeze({
    routeId: route.routeId || 'NOT_AVAILABLE', lineKey: route.lineKey || 'NOT_AVAILABLE', status: route.status || 'BLOCKED', edgeCount: Array.isArray(route.edgeIds) ? route.edgeIds.length : 0, physicalEdgeCount: Array.isArray(route.physicalEdgeIds) ? route.physicalEdgeIds.length : 0, totalLengthMm: Number.isFinite(route.totalLengthMm) ? route.totalLengthMm.toFixed(3) : 'BLOCKED', blockers: (route.blockers || []).map((row) => row.code || row.message || String(row)).join(', ') || '—',
  }));
}
function masterSummary(masters) {
  return [masterRow('lineList', 'Line list', masters?.lineList, true), masterRow('pipingClass', 'Piping classes', masters?.pipingClass, true), masterRow('weight', 'Component weights', masters?.weight, true), masterRow('materialMap', 'Material map', masters?.materialMap, false)];
}
function masterRow(key, label, value, required) {
  const rowCount = Array.isArray(value?.normalizedRows) ? value.normalizedRows.length : 0;
  const status = rowCount > 0 && value?.sourceHash ? 'READY' : required ? 'BLOCKED' : 'OPTIONAL';
  return Object.freeze({ key, label, required, rowCount, status, sourceHash: value?.sourceHash || null });
}
function summarizeProjectProfile(profile) {
  const load = summarizeGroup(profile?.loadCalculation);
  const topology = summarizeGroup(profile?.topology);
  return Object.freeze({ revision: profile?.revision ?? 'NOT_AVAILABLE', loadApproved: load.approved, loadTotal: load.total, topologyApproved: topology.approved, topologyTotal: topology.total, missing: load.missing + topology.missing });
}
function summarizeGroup(group) {
  const entries = Object.values(group || {}).filter((row) => row && typeof row === 'object' && Object.prototype.hasOwnProperty.call(row, 'value'));
  return { total: entries.length, approved: entries.filter((row) => row.approved === true && row.value !== null).length, missing: entries.filter((row) => row.value === null).length };
}
function activeHashes(dataset, masters) {
  return { dataset: dataset?.sourceSha256 ?? '', lineList: masters?.lineList?.sourceHash ?? '', pipingClass: masters?.pipingClass?.sourceHash ?? '', componentWeight: masters?.weight?.sourceHash ?? '', materialMap: masters?.materialMap?.sourceHash ?? '' };
}
function firstAuditMessage(audit) {
  const row = audit?.errors?.[0];
  return row?.message || row?.path || row?.projectDataPath || 'Required Project Data evidence is unavailable.';
}
function metric(label, value, state = '') {
  return `<article class="non-fea-metric ${state ? `non-fea-metric--${state}` : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}
function statusClass(value) {
  const token = String(value || '').toUpperCase();
  if (token === 'READY' || token.includes('CURRENT')) return 'ready';
  if (['PARTIAL', 'PARTIALLY_READY', 'REVIEW_REQUIRED', 'NOT_EVALUATED', 'OPTIONAL', 'NOT_SEALED'].includes(token)) return 'warning';
  if (token === 'STALE') return 'stale';
  return 'blocked';
}
function compactHash(value) {
  if (!value || value === 'NOT_AVAILABLE') return 'NOT_AVAILABLE';
  return value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
}
function integer(value) { return Number.isInteger(value) ? String(value) : 'NOT_AVAILABLE'; }
function isSha256(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/iu.test(value); }
function isSemanticHash(value) { return typeof value === 'string' && /^fnv1a64:[a-f0-9]{16}$/iu.test(value); }
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

function styles() {
  return `<style>
    .non-fea-input-check{display:flex;flex-direction:column;gap:14px;height:100%;overflow:auto;padding:16px;background:#07101e;color:#e2e8f0;box-sizing:border-box}
    .non-fea-input-check__header,.non-fea-panel>header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.non-fea-input-check__header h2,.non-fea-panel h3{margin:2px 0;color:#e2e8f0}.non-fea-input-check__header h2{font-size:26px}.non-fea-input-check__header p,.non-fea-panel header p,.non-fea-muted{margin:5px 0;color:#94a3b8;line-height:1.45}
    .non-fea-input-check__title-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.non-fea-input-check__scope,.non-fea-input-check__phase{padding:3px 8px;border:1px solid #0ea5e9;border-radius:999px;color:#7dd3fc;font-size:10px;font-weight:800;letter-spacing:.08em}.non-fea-input-check__phase{border-color:#6d28d9;color:#c4b5fd}.non-fea-input-check__actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.non-fea-input-check button{border:1px solid #334155;border-radius:5px;background:#111c2f;color:#e2e8f0;padding:7px 10px;cursor:pointer}.non-fea-input-check button:hover{border-color:#38bdf8;color:#7dd3fc}
    .non-fea-input-check__result{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid #7f1d1d;border-radius:7px;background:rgba(127,29,29,.12)}.non-fea-input-check__result[data-status="ready"]{border-color:#166534;background:rgba(22,101,52,.12)}.non-fea-input-check__result strong{color:#f87171}.non-fea-input-check__result[data-status="ready"] strong{color:#4ade80}.non-fea-input-check__result span{color:#cbd5e1}.non-fea-input-check__summary{display:grid;grid-template-columns:repeat(4,minmax(110px,1fr));gap:8px}.non-fea-metric{padding:10px;border:1px solid #293548;border-radius:6px;background:#0d1728}.non-fea-metric span{display:block;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.06em}.non-fea-metric strong{display:block;margin-top:5px;font-size:16px;overflow-wrap:anywhere}.non-fea-metric--ready{border-color:#166534}.non-fea-metric--blocked{border-color:#991b1b}.non-fea-metric--warning{border-color:#92400e}
    .non-fea-input-check__advanced{border:1px solid #293548;border-radius:7px;background:#091322}.non-fea-input-check__advanced>summary{padding:11px 13px;color:#7dd3fc;font-weight:800;cursor:pointer}.non-fea-input-check__advanced[open]>summary{border-bottom:1px solid #293548}.non-fea-input-check__advanced-intro{display:flex;flex-wrap:wrap;gap:7px;padding:12px 13px;color:#94a3b8}.non-fea-input-check__advanced-intro span{padding:3px 7px;border:1px solid #334155;border-radius:999px;font-size:9px;font-weight:800;letter-spacing:.06em}.non-fea-input-check__advanced-intro p{flex-basis:100%;margin:3px 0 0;padding:9px;border:1px solid #164e63;border-radius:6px;background:#082f49;color:#bae6fd}.non-fea-input-check__advanced .non-fea-input-check__layout{padding:0 12px 12px}
    .non-fea-input-check__blocker-summary{padding:13px;border:1px solid #3f2730;border-radius:7px;background:#0b1424}.non-fea-input-check__blocker-summary h3{margin:0 0 10px;color:#f8fafc}.non-fea-input-check__blocker-summary ul{display:grid;grid-template-columns:1fr;gap:8px;margin:0;padding:0;list-style:none}.non-fea-input-check__blocker-summary li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;padding:9px;border:1px solid #3f2730;border-radius:6px}.non-fea-input-check__blocker-summary li strong{min-width:0;overflow-wrap:anywhere;color:#f87171}.non-fea-input-check__blocker-summary li span{color:#cbd5e1;font-size:11px}.non-fea-input-check__blocker-summary li p{grid-column:1/-1;margin:0;color:#94a3b8;font-size:11px;line-height:1.35}.non-fea-input-check__blocker-summary>p{margin:10px 0 0;color:#94a3b8;font-size:11px}
    .non-fea-input-check__root-causes{margin:0 0 12px;padding:10px 12px;border:1px solid #92400e;border-radius:6px;background:#1c1207}
    .non-fea-input-check__root-causes>strong{display:block;margin-bottom:6px;color:#fbbf24;font-size:12px}
    .non-fea-input-check__root-causes ul{display:flex;flex-direction:column;gap:5px;margin:0;padding:0;list-style:none}
    .non-fea-input-check__root-causes li{display:block;padding:6px 8px;border:1px solid #3f2d14;border-radius:5px;color:#d6bb92;font-size:11px;line-height:1.4}
    .non-fea-input-check__root-causes code{color:#fcd34d;font-weight:700}
    .non-fea-input-check__root-note{margin:0 0 7px;color:#bae6fd;font-size:11px;line-height:1.4}
    .non-fea-input-check__blocker-summary li[data-rollup="true"]{border-style:dashed;opacity:.82}
    .non-fea-input-check__blocker-summary li[data-rollup="true"] strong{color:#fbbf24}
    .non-fea-input-check__other-methods{margin:10px 0 0;border:1px solid #293548;border-radius:6px;background:#0d1728}
    .non-fea-input-check__other-methods summary{padding:8px 10px;cursor:pointer;color:#94a3b8;font-size:11px}
    .non-fea-input-check__other-methods>p{margin:0;padding:0 10px 8px;color:#64748b;font-size:11px;line-height:1.4}
    .non-fea-input-check__other-methods>ul{padding:0 10px 10px}
    .non-fea-input-check__layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(300px,1fr);gap:12px;align-items:start}.non-fea-input-check__layout main,.non-fea-input-check__layout aside{display:flex;flex-direction:column;gap:12px}.non-fea-panel{padding:13px;border:1px solid #293548;border-radius:7px;background:#0b1424;box-shadow:0 8px 24px rgba(0,0,0,.12)}.panel-eyebrow{display:block;color:#38bdf8;font-size:10px;font-weight:800;letter-spacing:.1em}.non-fea-panel code{display:block;color:#64748b;font-size:10px;margin-top:2px;overflow-wrap:anywhere}
    .non-fea-gates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.non-fea-gate{display:grid;grid-template-columns:30px 1fr;gap:9px;padding:10px;border:1px solid #334155;border-radius:6px;background:#0c1728}.non-fea-gate__index{display:flex;width:26px;height:26px;align-items:center;justify-content:center;border-radius:50%;background:#172033;color:#94a3b8;font-weight:800}.non-fea-gate__heading{display:flex;justify-content:space-between;gap:8px}.non-fea-gate p{margin:6px 0 0;color:#94a3b8;line-height:1.35;font-size:12px}.non-fea-gate--ready{border-color:#166534}.non-fea-gate--ready .non-fea-gate__heading span{color:#4ade80}.non-fea-gate--warning{border-color:#92400e}.non-fea-gate--warning .non-fea-gate__heading span{color:#fbbf24}.non-fea-gate--blocked,.non-fea-gate--stale{border-color:#7f1d1d}.non-fea-gate--blocked .non-fea-gate__heading span,.non-fea-gate--stale .non-fea-gate__heading span{color:#f87171}
    .non-fea-audits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.non-fea-audits article{padding:10px;border:1px solid #334155;border-radius:6px;background:#0c1728}.non-fea-audits article>span{display:block;margin-top:4px;font-weight:800}.non-fea-audits article p{margin:6px 0 0;color:#94a3b8;font-size:11px}.non-fea-audits [data-status="READY"]{border-color:#166534}.non-fea-audits [data-status="READY"]>span{color:#4ade80}.non-fea-audits [data-status="BLOCKED"]{border-color:#7f1d1d}.non-fea-audits [data-status="BLOCKED"]>span{color:#f87171}
    .non-fea-table-wrap{overflow:auto;margin-top:10px}.non-fea-input-check table{width:100%;border-collapse:collapse}.non-fea-input-check th,.non-fea-input-check td{text-align:left;padding:8px;border-bottom:1px solid #223047;vertical-align:top}.non-fea-input-check th{color:#7dd3fc;font-size:11px;text-transform:uppercase;letter-spacing:.05em}.non-fea-input-check td{font-size:12px}.non-fea-chip{display:inline-flex;padding:3px 7px;border-radius:999px;border:1px solid #475569;font-size:10px;font-weight:800}.non-fea-chip--ready{border-color:#166534;color:#4ade80}.non-fea-chip--warning{border-color:#92400e;color:#fbbf24}.non-fea-chip--blocked,.non-fea-chip--stale{border-color:#7f1d1d;color:#f87171}
    .non-fea-blockers{list-style:none;padding:0;margin:10px 0 0;display:flex;flex-direction:column;gap:7px}.non-fea-blockers li{display:grid;grid-template-columns:max-content 1fr;gap:9px;padding:8px;border:1px solid #3f2730;border-radius:5px}.non-fea-blockers p{margin:3px 0 0;color:#94a3b8}.non-fea-ready-copy{color:#4ade80}.non-fea-side-panel header button{padding:5px 8px}.non-fea-facts{display:grid;grid-template-columns:110px 1fr;gap:7px;margin:12px 0}.non-fea-facts dt{color:#94a3b8}.non-fea-facts dd{margin:0;overflow-wrap:anywhere}.non-fea-master-list{list-style:none;padding:0;margin:10px 0;display:flex;flex-direction:column;gap:7px}.non-fea-master-list li{display:flex;justify-content:space-between;gap:10px;padding:8px;border:1px solid #26354a;border-radius:5px}.non-fea-master-list small{display:block;color:#64748b;margin-top:3px}.non-fea-seal{border-color:#164e63}.panel-empty{color:#94a3b8}
    @media(max-width:1100px){.non-fea-input-check__summary{grid-template-columns:repeat(3,1fr)}.non-fea-input-check__layout{grid-template-columns:1fr}.non-fea-gates{grid-template-columns:1fr}}@media(max-width:780px){.non-fea-audits{grid-template-columns:1fr}}@media(max-width:680px){.non-fea-input-check__header{flex-direction:column}.non-fea-input-check__actions{justify-content:flex-start}.non-fea-input-check__summary{grid-template-columns:repeat(2,1fr)}}
  </style>`;
}
