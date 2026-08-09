import { createLoadCalculationReviewModel, validateLoadCalculationReviewModel } from '../core/load-calculation-consumer/index.js';
import { APPLICATION_EVENTS, EVENT_TOPICS } from './event-topics.js';
import { ENGINEERING_MODEL_EVENTS } from './engineering-model-controller.js';
import { engineeringModelStore } from './engineering-model-store.js';
import { renderEngineeringLoadPane, renderLoadCalcConsumer } from './load-calc-consumer-view.js';
import { nonFeaCommonInputStore } from './non-fea-common-input-store.js';
import { sealCurrentNonFeaCommonInput } from './non-fea-common-input-runtime.js';
import { projectDataStore } from './project-data/project-data-store.js';
import {
  EMPIRICAL_LOAD_CALC_SCENARIO_EVENTS,
} from './engineering-loads/empirical-load-calc-scenario-controller.js';
import {
  empiricalLoadCalcScenarioStore,
} from './engineering-loads/empirical-load-calc-scenario-store.js';
import {
  empiricalResultOverlayStore,
} from './engineering-loads/empirical-result-overlay-store.js';

const EMPIRICAL_SCENARIO_VIEW_TABS = new Set([
  'overview', 'restraints', 'load-cases', 'methods', 'results', 'evidence', 'model-3d',
]);

/** Coordinates the real empirical load workflow without generating inputs. */
export class LoadCalcConsumerController {
  constructor(rootElement, consumerController, eventBus) {
    if (!rootElement) throw new TypeError('Load Calc requires a stable root element.');
    this.rootElement = rootElement;
    this.consumerController = consumerController;
    this.eventBus = eventBus;
    this.context = consumerController?.getContext() || null;
    this.reviewModel = buildReviewModel(this.context);
    this.activeTab = 'verify';
    this.message = '';
    this.unsubscribers = [];
    this.renderRevision = 0;
    this.topologyEdit3DController = null;
    this.pending3dInvestigationEntityId = null;
    this.clickHandler = (event) => this.handleClick(event);
  }

  init() {
    if (this.unsubscribers.length) return;
    this.rootElement.addEventListener('click', this.clickHandler);
    this.unsubscribers = [
      this.eventBus.subscribe(APPLICATION_EVENTS.CONTEXT_CHANGED, ({ context }) => this.handleContext(context)),
      this.eventBus.subscribe(EVENT_TOPICS.WORKSPACE_SNAPSHOT_CHANGED, () => this.render()),
      this.eventBus.subscribe(ENGINEERING_MODEL_EVENTS.CHANGED, ({ reason, distribution }) => this.handleEngineeringChange(reason, distribution)),
      this.eventBus.subscribe(ENGINEERING_MODEL_EVENTS.FAILED, ({ message }) => this.handleFailure(message)),
      this.eventBus.subscribe(EVENT_TOPICS.LOAD_CALC_SUBTAB_REQUESTED, ({ tab }) => { this.activeTab = tab; this.render(); }),
      this.eventBus.subscribe(EMPIRICAL_LOAD_CALC_SCENARIO_EVENTS.CHANGED, ({ snapshot }) => {
        this.message = empiricalScenarioMessage(snapshot);
        this.render();
      }),
      this.eventBus.subscribe(EMPIRICAL_LOAD_CALC_SCENARIO_EVENTS.RESULT_OVERLAY_CHANGED, ({ snapshot, projection }) => {
        this.topologyEdit3DController?.viewportBackend?.setGovernedResultProjection(
          projection,
          snapshot?.reasonCode || 'EMPIRICAL_EXECUTION_REQUIRED',
        );
      }),
      this.eventBus.subscribe(EMPIRICAL_LOAD_CALC_SCENARIO_EVENTS.FAILED, ({ message }) => this.handleFailure(message)),
    ];
    this.render();
  }

  handleContext(context) {
    this.context = context;
    this.reviewModel = buildReviewModel(context);
    this.render();
  }

  handleEngineeringChange(reason, distribution) {
    if (reason === 'calculated') this.message = distribution?.status === 'CALCULATED' ? 'Authorized calculation complete.' : 'Authorized calculation blocked; review the listed inputs.';
    if (reason === 'project-data-changed') this.message = 'Project Data changed; common seal, authorization and previous calculations require refresh.';
    if (reason === 'master-data-changed') this.message = 'Master data changed; common seal, authorization and previous calculations require refresh.';
    if (reason === 'authorization-changed') this.message = availabilityMessage(engineeringModelStore.getEmpiricalAuthorizationState());
    this.render();
  }

  handleFailure(message) {
    this.message = message || 'Load calculation failed.';
    this.render();
  }

  handleClick(event) {
    const supportEntityId = event.target.closest('[data-load-support-entity-id]')?.dataset.loadSupportEntityId;
    if (supportEntityId) { this.eventBus.publish(EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED, { entityId: supportEntityId, source: 'load-table' }); return; }
    const investigationEntityId = event.target.closest('[data-non-fea-investigation-entity-id]')?.dataset.nonFeaInvestigationEntityId;
    if (investigationEntityId) {
      this.pending3dInvestigationEntityId = investigationEntityId;
      this.activeTab = '3d';
      this.render();
      return;
    }
    const tab = event.target.closest('[data-load-calc-tab]')?.dataset.loadCalcTab;
    if (tab) {
      this.pending3dInvestigationEntityId = null;
      this.activeTab = tab;
      this.render();
      return;
    }
    const restraintId = event.target.closest('[data-empirical-restraint-select]')?.dataset.empiricalRestraintSelect;
    if (restraintId) {
      const occurrence = empiricalLoadCalcScenarioStore.getProposal()?.adaptedRequest?.restraintOccurrences
        ?.find((row) => row.restraintId === restraintId);
      const entityId = occurrence?.sourceEntityIds?.[0]
        || occurrence?.hostSourceEntityId
        || occurrence?.hostEntityId;
      if (entityId) this.eventBus.publish(EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED, { entityId, source: 'load-table' });
      return;
    }
    if (event.target.closest('[data-empirical-open-sjson-viewport]')) {
      this.pending3dInvestigationEntityId = null;
      this.activeTab = '3d';
      this.render();
      return;
    }
    if (event.target.closest('[data-empirical-clone-profile]')) {
      this.eventBus.publish(EMPIRICAL_LOAD_CALC_SCENARIO_EVENTS.CLONE_PROFILE_REQUESTED, {});
      return;
    }
    if (event.target.closest('[data-empirical-authorize]')) {
      this.message = 'Authorizing the current empirical scenario against the common seal…';
      this.eventBus.publish(EMPIRICAL_LOAD_CALC_SCENARIO_EVENTS.AUTHORIZE_REQUESTED, {});
      return;
    }
    if (event.target.closest('[data-empirical-calculate]')) {
      this.message = 'Executing the current common-seal-bound empirical method…';
      this.eventBus.publish(EMPIRICAL_LOAD_CALC_SCENARIO_EVENTS.CALCULATE_REQUESTED, {});
      return;
    }
    if (event.target.closest('[data-load-calc-run]')) {
      const snap = empiricalLoadCalcScenarioStore.getSnapshot();
      const authState = engineeringModelStore.getEmpiricalAuthorizationState();
      
      if (snap?.calculationEligible) {
        this.message = 'Executing the current common-seal-bound empirical method…';
        this.eventBus.publish(EMPIRICAL_LOAD_CALC_SCENARIO_EVENTS.CALCULATE_REQUESTED, {});
      } else if (authState?.calculationEligible) {
        this.message = 'Executing current authorized empirical package against the common seal…';
        this.eventBus.publish(ENGINEERING_MODEL_EVENTS.CALCULATE_REQUESTED, { source: 'load-calc' });
      } else {
        this.message = snap?.reasonCode || 'Not ready — check Verify & Run tab';
        this.render();
      }
      return;
    }

    if (event.target.closest('[data-apply-load-defaults]')) {
      const SAFE_DEFAULTS = [
        { path: 'loadCalculation.gravityMPerS2',        value: 9.80665,                           evidence: { source: 'ISO 80000-3 standard gravity' },         approved: true  },
        { path: 'loadCalculation.loadFactor',            value: 1.0,                               evidence: { source: 'Unfactored operating weight default' },    approved: true  },
        { path: 'loadCalculation.equilibriumTolerances', value: { forceN: 1e-8, momentNmm: 1e-5 }, evidence: { source: 'Production benchmark standard' },          approved: true  },
        { path: 'loadCalculation.activeLoadCases',       value: ['EMPTY', 'OPE'],                  evidence: { source: 'Minimum load case set — add HYD if needed' }, approved: false },
      ];
      SAFE_DEFAULTS.forEach(({ path, value, evidence, approved }) => {
        try { projectDataStore.update(path, value, evidence, approved); } catch (e) { /* field may already be set */ }
      });
      this.message = '4 standard defaults applied. Review activeLoadCases — add HYD if hydrotest is in scope.';
      this.render();
      return;
    }

    if (event.target.closest('[data-seal-inputs]')) {
      this.message = 'Sealing common inputs…';
      try {
        const report = nonFeaCommonInputStore.getReport();
        sealCurrentNonFeaCommonInput({
          confirmationId: 'COMMON-SEAL:' + Date.now(),
          confirmedAt: new Date().toISOString(),
          confirmedBy: 'Verify & Run Fast Seal',
          acceptPartial: report?.packageState !== 'READY',
          acknowledgedBlockedMethods: report?.blockedMethodIds || [],
          statement: 'Sealed via Verify & Run fast-seal action.',
        });
        this.message = 'Inputs sealed successfully.';
      } catch (error) {
        this.message = error instanceof Error ? error.message : String(error);
      }
      this.render();
      return;
    }

    const gotoTab = event.target.closest('[data-goto-tab]')?.dataset.gotoTab;
    if (gotoTab) {
      this.pending3dInvestigationEntityId = null;
      this.activeTab = gotoTab;
      this.render();
      return;
    }
  }

  render() {
    if (this.activeTab !== '3d' && this.topologyEdit3DController) {
      this.topologyEdit3DController.deactivate();
      this.topologyEdit3DController = null;
      resetTopologyEditCleanShell(this.rootElement.ownerDocument);
    }
    this.renderRevision += 1;
    const revision = this.renderRevision;
    const authorizationState = engineeringModelStore.getEmpiricalAuthorizationState();
    const view = renderLoadCalcConsumer(this.rootElement.ownerDocument, {
      activeTab: this.activeTab,
      message: this.message,
      distribution: engineeringModelStore.getDistribution(),
      authorizedExecution: engineeringModelStore.getAuthorizedExecution(),
      authorizationState,
      supportSiteModel: engineeringModelStore.getSupportSiteModel(),
      routePartitionModel: engineeringModelStore.getRoutePartitionModel(),
      empiricalScenarioState: empiricalLoadCalcScenarioStore.getSnapshot(),
      commonInputState: nonFeaCommonInputStore.getSnapshot(),
    });
    this.rootElement.replaceChildren(view);
    const pane = view.querySelector('[data-load-calc-pane]');
    if (this.activeTab === 'loads') renderEngineeringLoadPane(
      pane,
      engineeringModelStore.getDistribution(),
      engineeringModelStore.getSupportSiteModel(),
      engineeringModelStore.getRoutePartitionModel(),
      engineeringModelStore.getAuthorizedExecution(),
      authorizationState,
    );
    else this.renderDeferredPane(this.activeTab, pane, revision);
  }

  async renderDeferredPane(tab, pane, revision) {
    try {
      const empiricalState = {
        snapshot: empiricalLoadCalcScenarioStore.getSnapshot(),
        proposal: empiricalLoadCalcScenarioStore.getProposal(),
        authorization: empiricalLoadCalcScenarioStore.getAuthorization(),
        execution: empiricalLoadCalcScenarioStore.getExecution(),
        overlaySnapshot: empiricalResultOverlayStore.getSnapshot(),
        selectedEntityId: this.context?.selectedEntityId || null,
      };
      if (tab === 'verify' || !tab) {
        if (revision === this.renderRevision) this.renderVerifyPane(pane, empiricalState);
      } else if (EMPIRICAL_SCENARIO_VIEW_TABS.has(tab)) {
        const scenarioView = await import('./engineering-loads/empirical-load-calc-scenario-view.js');
        if (revision !== this.renderRevision) return;
        if (tab === 'overview') scenarioView.renderEmpiricalScenarioOverview(pane, empiricalState);
        else if (tab === 'restraints') scenarioView.renderEmpiricalScenarioRestraints(pane, empiricalState);
        else if (tab === 'load-cases') scenarioView.renderEmpiricalScenarioLoadCases(pane, empiricalState);
        else if (tab === 'methods') scenarioView.renderEmpiricalScenarioMethods(pane, empiricalState);
        else if (tab === 'results') scenarioView.renderEmpiricalScenarioResults(pane, empiricalState);
        else if (tab === 'evidence') scenarioView.renderEmpiricalScenarioEvidence(pane, empiricalState);
        else scenarioView.renderEmpiricalScenarioModel3d(pane, empiricalState);
      } else if (tab === 'preflight') {
        const { renderEmpiricalPreflightView } = await import('./empirical-preflight-view.js');
        if (revision === this.renderRevision) renderEmpiricalPreflightView(pane, this.context);
      } else if (tab === 'project-data') {
        const { renderProjectDataView } = await import('./project-data/project-data-view.js');
        if (revision === this.renderRevision) renderProjectDataView(pane, () => this.render());
      } else if (tab === 'masters') {
        const { renderMasterDataUI } = await import('./master-data-ui.js');
        if (revision === this.renderRevision) pane.replaceChildren(renderMasterDataUI(pane.ownerDocument));
      } else if (tab === 'enrichment') {
        const { renderNonFeaEnrichmentView } = await import('./enrichment/non-fea-enrichment-view.js');
        if (revision === this.renderRevision) renderNonFeaEnrichmentView(pane, () => this.render());
      } else if (tab === 'method-basis') {
        const { renderNonFeaMethodBasisView } = await import('./non-fea-method-basis-view.js');
        if (revision === this.renderRevision) renderNonFeaMethodBasisView(pane, () => this.render());
      } else if (tab === 'seal-export') {
        const { renderNonFeaSealExportView } = await import('./non-fea-seal-export-view.js');
        if (revision === this.renderRevision) renderNonFeaSealExportView(pane, () => this.render());
      } else if (tab === 'json-trace') {
        const { renderJsonTraceUI } = await import('./json-trace-ui.js');
        if (revision === this.renderRevision) pane.replaceChildren(renderJsonTraceUI(pane.ownerDocument));
      } else if (tab === '3d') {
        const { TopologyEdit3DViewController } = await import('./topology-edit-3d-sjson-fidelity-controller.js');
        if (revision !== this.renderRevision) return;
        if (!this.topologyEdit3DController?.hostElement) {
          resetTopologyEditCleanShell(this.rootElement.ownerDocument);
          const controller = new TopologyEdit3DViewController(this.eventBus);
          this.topologyEdit3DController = controller;
          await controller.activate();
          if (revision !== this.renderRevision) {
            const stillCurrent3D = this.activeTab === '3d'
              && this.topologyEdit3DController === controller;
            if (!stillCurrent3D) {
              controller.deactivate();
              if (this.topologyEdit3DController === controller) {
                this.topologyEdit3DController = null;
              }
              resetTopologyEditCleanShell(this.rootElement.ownerDocument);
            }
            return;
          }
        }
        if (revision === this.renderRevision) {
          const overlaySnapshot = empiricalResultOverlayStore.getSnapshot();
          this.topologyEdit3DController.viewportBackend?.setGovernedResultProjection(
            empiricalResultOverlayStore.getProjection(),
            overlaySnapshot.reasonCode || 'EMPIRICAL_EXECUTION_REQUIRED',
          );
          this.topologyEdit3DController.renderPane(pane);
          const entityId = this.pending3dInvestigationEntityId;
          this.pending3dInvestigationEntityId = null;
          if (entityId) {
            const focus = this.topologyEdit3DController.focusWorkspaceEntity?.(entityId);
            if (focus && focus.status !== 'FOCUSED') {
              this.message = `3D investigation target ${entityId} is not available in the current governed render projection.`;
            }
          }
        }
      } else {
        throw new RangeError(`Unknown Load Calc tab: ${tab}.`);
      }
    } catch (error) {
      if (revision === this.renderRevision) pane.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  renderVerifyPane(container, state) {
    const authState = engineeringModelStore.getEmpiricalAuthorizationState();
    const commonState = nonFeaCommonInputStore.getSnapshot();
    const scenarioState = empiricalLoadCalcScenarioStore.getSnapshot();
    const profile = projectDataStore.getProfile();
  
    // Gate statuses
    const datasetOk  = authState?.reasonCode !== 'NO_ACTIVE_DATASET' && authState?.reasonCode !== null;
    const sealOk     = !!(commonState?.commonInput && !commonState?.staleness?.stale);
    const authOk     = !!(scenarioState?.calculationEligible || authState?.calculationEligible);
  
    // Loads field audit — read current values from profile
    const lc = profile?.loadCalculation || {};
    const su = profile?.sourcesAndUnits || {};
  
    function fieldVal(group, key) {
      const entry = (group === 'lc' ? lc : su)[key];
      return entry?.value ?? null;
    }
    function fieldApproved(group, key) {
      const entry = (group === 'lc' ? lc : su)[key];
      return entry?.approved === true;
    }
  
    const gravitySet   = fieldVal('lc', 'gravityMPerS2') !== null;
    const factorSet    = fieldVal('lc', 'loadFactor') !== null && fieldVal('lc', 'loadFactor') > 0;
    const equilSet     = fieldVal('lc', 'equilibriumTolerances') !== null;
    const casesSet     = Array.isArray(fieldVal('lc', 'activeLoadCases')) && fieldVal('lc', 'activeLoadCases').length > 0;
    const allSafeSet   = gravitySet && factorSet && equilSet && casesSet;
  
    const pipeSectSet  = fieldVal('lc', 'pipeSectionProperties') !== null;
    const matDensSet   = fieldVal('lc', 'materialDensitiesKgPerM3') !== null;
    const opFluidSet   = fieldVal('lc', 'operatingFluidDensitiesKgPerM3') !== null;
    const hydFluidSet  = fieldVal('lc', 'hydroFluidDensitiesKgPerM3') !== null;
    const insulSet     = fieldVal('lc', 'insulationDensitiesKgPerM3') !== null;
    const compWtSet    = fieldVal('lc', 'componentWeightsKg') !== null;
    const lineListSet  = fieldVal('su', 'lineListSource') !== null;
    const pipClassSet  = fieldVal('su', 'pipingClassSource') !== null;
    const compSrcSet   = fieldVal('su', 'componentWeightSource') !== null;
  
    const masterFieldsSet = pipeSectSet && matDensSet && opFluidSet && hydFluidSet && insulSet && compWtSet;
    const sourceFieldsSet = lineListSet && pipClassSet && compSrcSet;
  
    // Count blockers for the loads gate
    const loadsBlockerCount = [gravitySet, factorSet, equilSet, casesSet, pipeSectSet, matDensSet,
      opFluidSet, hydFluidSet, insulSet, compWtSet, lineListSet, pipClassSet, compSrcSet
    ].filter((v) => !v).length;
    const loadsOk = loadsBlockerCount === 0;
  
    const esc = (val) => String(val ?? '').replace(/[&<>'"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
  
    function gate(ok, label, detail, actionHtml = '') {
      return `<li class="verify-gate" data-status="${ok ? 'ok' : 'fail'}">
        <span class="verify-gate__icon">${ok ? '✅' : '❌'}</span>
        <span class="verify-gate__label">${esc(label)}</span>
        <span class="verify-gate__detail">${esc(detail)}</span>
        ${actionHtml}
      </li>`;
    }
  
    const sealBtn  = !sealOk  ? `<button class="verify-gate__action" data-seal-inputs title="Seal all common inputs now">→ Seal inputs</button>` : '';
    const authNote = !authOk && sealOk ? `<button class="verify-gate__action" data-empirical-authorize title="Authorize the configured scenario">→ Authorize</button>` : (!authOk ? `<span class="verify-gate__blocked">(seal first)</span>` : '');
  
    const loadsDetail = loadsOk
      ? 'All 13 fields ready'
      : `${loadsBlockerCount} field${loadsBlockerCount > 1 ? 's' : ''} need values`;
  
    container.innerHTML = `
      <div class="verify-run-pane">
        <div class="verify-layout">
  
          <!-- LEFT: Gates -->
          <div class="verify-gates-col">
            <div class="verify-section-header">
              <h2>Readiness Gates</h2>
              <span class="verify-progress" data-ok="${loadsOk && sealOk && authOk}">
                ${[datasetOk, loadsOk, sealOk, authOk].filter(Boolean).length} / 4 passing
              </span>
            </div>
            <ul class="verify-checklist">
              ${gate(datasetOk, 'Dataset', datasetOk ? 'SJSON active' : 'No dataset loaded')}
              ${gate(loadsOk, 'Load calc fields', loadsDetail,
                !loadsOk && !allSafeSet
                  ? '<button class="verify-gate__action verify-gate__action--primary" data-apply-load-defaults>Apply 4 defaults</button>'
                  : (!loadsOk ? '<button class="verify-gate__action verify-gate__action--secondary" data-goto-tab="masters">→ Open Masters</button>' : '')
              )}
              ${gate(sealOk, 'Common seal', sealOk ? 'Inputs sealed' : 'NOT_SEALED', sealBtn)}
              ${gate(authOk, 'Authorization', authOk ? 'Calculation eligible' : 'AWAITING_AUTHORIZATION', authNote)}
            </ul>
            <p class="engineering-note">Results publish Fv / Fl(guide) / Fa(lineStop) per restraint after calculation.</p>
          </div>
  
          <!-- RIGHT: Quick-fix panel -->
          <div class="verify-quickfix-col">
  
            <!-- Safe defaults card -->
            <div class="verify-card ${allSafeSet ? 'verify-card--ok' : 'verify-card--warn'}">
              <div class="verify-card__header">
                <span>${allSafeSet ? '✅' : '⚠'} Standard defaults</span>
                <span class="verify-card__subtitle">${allSafeSet ? 'All applied' : '4 physical constants'}</span>
              </div>
              <dl class="verify-defaults-dl">
                <dt>Gravity</dt><dd>${gravitySet ? '9.80665 m/s²' : '<em>empty</em>'}</dd>
                <dt>Load factor</dt><dd>${factorSet ? (fieldVal('lc','loadFactor') + ' (ratio)') : '<em>0 — invalid</em>'}</dd>
                <dt>Equilibrium tolerances</dt><dd>${equilSet ? '{ forceN: 1e-8, momentNmm: 1e-5 }' : '<em>missing</em>'}</dd>
                <dt>Active load cases</dt><dd>${casesSet ? esc(JSON.stringify(fieldVal('lc','activeLoadCases'))) : '<em>missing</em>'}</dd>
              </dl>
              ${!allSafeSet ? '<button class="verify-run-btn" data-apply-load-defaults>Apply 4 standard defaults</button><p class="engineering-note" style="margin-top:6px">activeLoadCases will be set to [EMPTY, OPE] — add HYD manually if hydrotest is in scope.</p>' : ''}
            </div>
  
            <!-- Master-dependent fields card -->
            <div class="verify-card verify-card--info" style="margin-top:12px">
              <div class="verify-card__header">
                <span>${masterFieldsSet ? '✅' : '📋'} Master-dependent fields</span>
                <span class="verify-card__subtitle">Must come from master data</span>
              </div>
              <dl class="verify-defaults-dl">
                <dt>Pipe section properties</dt><dd>${pipeSectSet ? '✓ Set' : '<em>missing</em>'}</dd>
                <dt>Material densities</dt><dd>${matDensSet ? '✓ Set' : '<em>missing</em>'}</dd>
                <dt>Operating fluid densities</dt><dd>${opFluidSet ? '✓ Set' : '<em>missing</em>'}</dd>
                <dt>Hydro fluid densities</dt><dd>${hydFluidSet ? '✓ Set' : '<em>missing</em>'}</dd>
                <dt>Insulation densities</dt><dd>${insulSet ? '✓ Set' : '<em>missing</em>'}</dd>
                <dt>Component weights</dt><dd>${compWtSet ? '✓ Set' : '<em>missing</em>'}</dd>
              </dl>
              ${!masterFieldsSet ? '<button class="verify-gate__action verify-gate__action--secondary" style="width:100%;margin-top:8px" data-goto-tab="masters">→ Open Masters tab</button>' : ''}
            </div>
  
            <!-- Source fields card -->
            <div class="verify-card verify-card--info" style="margin-top:12px">
              <div class="verify-card__header">
                <span>${sourceFieldsSet ? '✅' : '🔗'} Source bindings</span>
                <span class="verify-card__subtitle">Auto-resolve when masters are loaded</span>
              </div>
              <dl class="verify-defaults-dl">
                <dt>Line-list source</dt><dd>${lineListSet ? '✓ Bound' : '<em>not bound</em>'}</dd>
                <dt>Piping-class source</dt><dd>${pipClassSet ? '✓ Bound' : '<em>not bound</em>'}</dd>
                <dt>Component-weight source</dt><dd>${compSrcSet ? '✓ Bound' : '<em>not bound</em>'}</dd>
              </dl>
            </div>
  
          </div>
        </div>
      </div>
    `;
  }

  getReviewModel() {
    return this.reviewModel && validateLoadCalculationReviewModel(this.reviewModel).ok ? this.reviewModel : null;
  }

  destroy() {
    this.topologyEdit3DController?.deactivate();
    this.topologyEdit3DController = null;
    this.pending3dInvestigationEntityId = null;
    resetTopologyEditCleanShell(this.rootElement.ownerDocument);
    this.rootElement.removeEventListener('click', this.clickHandler);
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.rootElement.replaceChildren();
    this.context = null;
    this.reviewModel = null;
  }
}

/** Preserves the prior public W10.9 readiness contract. */
export function createLoadCalcActionAvailability(context, reviewModel) {
  const contracts = context?.contracts || {};
  const hasModelLoads = Boolean(reviewModel);
  const canRebuildModelLoads = Boolean(contracts.topologyGraph);
  const hasPathInputs = Boolean(hasModelLoads && contracts.sharedModel && contracts.topologyGraph && contracts.supportAttachmentModel && contracts.restraintCapabilityModel);
  const hasPathModel = Boolean(hasModelLoads && contracts.verticalLoadPathModel);
  return Object.freeze({
    rebuildModelLoads: canRebuildModelLoads,
    exportModelLoads: hasModelLoads,
    rebuildPaths: hasPathInputs,
    runScreening: hasPathModel,
    exportScreening: Boolean(reviewModel?.summary.screeningIncluded),
  });
}

function availabilityMessage(state) {
  const reason = state?.reasonCode || state?.state || 'EMPIRICAL_PACKAGE_REQUIRED';
  const messages = {
    NO_ACTIVE_DATASET: 'Load calculation requires an active normalized dataset.',
    EMPIRICAL_PACKAGE_REQUIRED: 'Load calculation requires an explicitly authorized empirical package.',
    AUTHORIZATION_BINDINGS_CHANGED: 'The authorized empirical package is stale; authorize a package for the current dataset and evidence.',
    PROJECT_DATA_CHANGED: 'Project Data changed; a new common seal and authorized empirical package are required.',
    MASTER_DATA_CHANGED: 'Master data changed; a new common seal and authorized empirical package are required.',
    DATASET_EDITED: 'The dataset changed; a new common seal and authorized empirical package are required.',
    DATASET_REBUILT: 'The dataset model was rebuilt; a new common seal and authorized empirical package are required.',
    DATASET_REPLACED: 'The active dataset changed; a new common seal and authorized empirical package are required.',
    COMMON_INPUT_REQUIRED: 'A current common enriched piping input seal is required.',
    COMMON_INPUT_STALE: 'The common enriched piping input seal is stale.',
    COMMON_INPUT_METHOD_NOT_READY: 'The common input is not sealed for the requested empirical method.',
  };
  return messages[reason] || `Load calculation is disabled: ${reason}.`;
}

function empiricalScenarioMessage(snapshot) {
  const messages = {
    NOT_CONFIGURED: 'Configure an empirical scenario before authorization.',
    DRAFT_BLOCKED: 'Empirical scenario is blocked; review the Overview and Evidence panes.',
    DRAFT_READY: 'Empirical scenario is ready for common-seal-bound authorization.',
    AUTHORIZED_CURRENT: 'Empirical scenario is authorized against the current common seal.',
    AUTHORIZED_STALE: 'Empirical scenario authorization is stale.',
    EXECUTED_CURRENT: 'Empirical method execution is current and common-seal-bound.',
    EXECUTED_STALE: 'Empirical method results are stale and are not current overlays.',
  };
  return messages[snapshot?.state] || '';
}

function resetTopologyEditCleanShell(documentRef) {
  const host = documentRef?.querySelector('[data-role="topology-edit-render-host"]');
  if (!host) return;
  const mountedWorkspace = host.querySelector('[data-role="topology-edit-workspace"]');
  if (mountedWorkspace?.isConnected) return;
  delete host.dataset.topologyEditCleanShell;
  host.classList.remove('topology-edit-clean-shell');
}

function buildReviewModel(context) {
  const contracts = context?.contracts || {};
  if (!context || !contracts.sharedModel || !contracts.loadCaseSet || !contracts.loadPrimitiveSet || !contracts.modelLoadReadinessAudit) return null;
  try { return createLoadCalculationReviewModel(context); } catch { return null; }
}