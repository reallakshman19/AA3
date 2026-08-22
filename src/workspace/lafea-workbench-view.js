/** DOM view for the independent guided LAFEA workbench.
 * EMP.1 is the public analytical product. Its retained A/B mechanics continue
 * to execute through LAFEA.1/LAFEA.2 backing stages; LAFEA.3+ remain FEA routes.
 */
import {
  LAFEA_STAGE_REGISTRY,
  lafeaRegisteredExecutionSupported,
  requireLafeaStageRegistryEntry,
} from './lafea-stage-registry.js';
import {
  actionButton,
  captureFocusedControl,
  element,
  restoreFocusedControl,
} from './lafea-workbench-dom.js';
import { renderLafeaWorkbenchContent } from './lafea-workbench-content.js';
import { renderLafeaAnalyticalCalcContent } from './lafea-analytical-calc-content.js';
import {
  EMP1_PUBLIC_PRODUCT,
  buildEmp1ProductProjection,
  emp1StepForBackingStage,
  isEmp1BackingStage,
} from './emp1-product-projection.js';
import {
  EMP1_WORKBENCH_EXECUTION_CURRENTNESS,
  classifyEmp1WorkbenchExecutionCurrentness,
  projectEmp1WorkbenchCState,
  projectEmp1WorkbenchRunReadiness,
} from './emp1-workbench-run-state.js';
import {
  lafeaWorkbenchReasonLabel,
  lafeaWorkbenchReasonLabels,
} from './lafea-workbench-reason-labels.js';
import {
  canReuseLafeaWorkbenchViewport,
  createLafeaWorkbenchViewportDependencies,
} from './lafea-workbench-viewport-lifecycle.js';

const VIEW_RENDER_DEPENDENCIES = new WeakMap();
const DEFAULT_ANALYTICAL_CALC_STAGE_ID = 'LAFEA.1';
const PRESENTATION_STAGE = 'STAGE';
const PRESENTATION_ANALYTICAL = 'ANALYTICAL_CALC';

export class LafeaWorkbenchView {
  constructor(rootElement, options = {}) {
    this.rootElement = rootElement;
    VIEW_RENDER_DEPENDENCIES.set(this, Object.freeze({
      getRenderPacket: typeof options.getRenderPacket === 'function'
        ? options.getRenderPacket
        : () => null,
      getEmp1RunInput: typeof options.getEmp1RunInput === 'function'
        ? options.getEmp1RunInput
        : () => null,
      getEmp1Execution: typeof options.getEmp1Execution === 'function'
        ? options.getEmp1Execution
        : () => null,
      getEmp1RunFailure: typeof options.getEmp1RunFailure === 'function'
        ? options.getEmp1RunFailure
        : () => null,
      getEmp1RouteAuthority: typeof options.getEmp1RouteAuthority === 'function'
        ? options.getEmp1RouteAuthority
        : () => null,
      THREE: options.THREE ?? null,
    }));
    this.handlers = null;
    this.benchmarkHost = null;
    this.section = null;
    this.slots = null;
    this.presentationMode = options.presentationMode === PRESENTATION_ANALYTICAL
      ? PRESENTATION_ANALYTICAL
      : PRESENTATION_STAGE;
    this.analyticalOnly = Boolean(options.analyticalOnly || options.presentationMode === PRESENTATION_ANALYTICAL);
    this.lastState = null;
    this.activeViewport = null;
    this.activeViewportElement = null;
    this.activeViewportDependencies = null;
    this.sceneDocuments = new Map();
    this.sceneLifecycles = new Map();
    this.sceneLifecycleBindings = new Map();
    this.sceneRevisions = new Map();
    this.sceneSelections = new Map();
    this.sceneMeshFocus = new Map();
  }

  setBenchmarkHost(hostElement) { this.benchmarkHost = hostElement; }
  init(handlers) { this.handlers = handlers; }

  render(state) {
    if (!this.rootElement || !this.handlers) return;
    if (this.analyticalOnly || isAnalyticalStage(state.activeStageId)) {
      this.presentationMode = PRESENTATION_ANALYTICAL;
    } else if (this.presentationMode === PRESENTATION_ANALYTICAL) {
      this.presentationMode = PRESENTATION_STAGE;
    }
    this.lastState = state;
    const focused = captureFocusedControl(this.rootElement);
    const stageId = state.activeStageId;
    const stage = state.stages[stageId];
    const registryEntry = requireLafeaStageRegistryEntry(stageId);
    const analyticalMode = this.presentationMode === PRESENTATION_ANALYTICAL;
    const fePresentation = !analyticalMode;
    const dependencies = VIEW_RENDER_DEPENDENCIES.get(this);
    const emp1RunInput = analyticalMode ? dependencies.getEmp1RunInput() : null;
    const emp1Execution = analyticalMode ? dependencies.getEmp1Execution() : null;
    const emp1RouteAuthority = analyticalMode ? dependencies.getEmp1RouteAuthority() : null;
    const emp1ExecutionCurrentness = analyticalMode
      ? classifyEmp1WorkbenchExecutionCurrentness({
        execution: emp1Execution,
        aDocument: state.stages?.['LAFEA.1']?.document,
        bDocument: state.stages?.['LAFEA.2']?.document,
        runInput: emp1RunInput,
        currentRouteAuthority: emp1RouteAuthority,
      })
      : null;
    const emp1RunReadiness = analyticalMode
      ? projectEmp1WorkbenchRunReadiness({
        aDocument: state.stages?.['LAFEA.1']?.document,
        bDocument: state.stages?.['LAFEA.2']?.document,
        runInput: emp1RunInput,
      })
      : null;
    const emp1CState = analyticalMode
      ? projectEmp1WorkbenchCState({
        readiness: emp1RunReadiness,
        execution: emp1Execution,
        currentness: emp1ExecutionCurrentness,
        routeAuthority: emp1RouteAuthority,
      })
      : null;
    const analyticalState = analyticalMode
      ? withCurrentEmp1StageExecutions(state, emp1Execution, emp1ExecutionCurrentness)
      : state;
    const baseEmp1Projection = analyticalMode
      ? buildEmp1ProductProjection(analyticalState, {
        workspaceExecutionWired: true,
        workspaceResultAvailable: emp1CState?.currentResultAvailable === true,
      })
      : null;
    const emp1Projection = analyticalMode
      ? withEmp1CStateProjection(baseEmp1Projection, emp1CState)
      : null;
    const renderPacket = fePresentation ? dependencies.getRenderPacket(stageId) : null;
    const sceneRevision = fePresentation
      ? this.nextSceneRevision(stageId, stage.document, stage.lifecycle, stage.lifecycleBinding)
      : 0;
    const viewportDependencies = fePresentation
      ? createLafeaWorkbenchViewportDependencies({ stageId, stage, sceneRevision, renderPacket })
      : null;
    const reuseViewport = fePresentation
      && Boolean(this.activeViewport && this.activeViewportElement)
      && canReuseLafeaWorkbenchViewport(this.activeViewportDependencies, viewportDependencies);
    const previousViewport = this.activeViewport;

    this.ensureShell();
    this.slots.header.replaceChildren(this.header(state, stage, registryEntry, { analyticalMode }));
    this.slots.navigation.replaceChildren(this.stageNavigation(state));
    this.slots.toolbar.replaceChildren(this.toolbar(stageId, stage, analyticalMode, {
      emp1RunReadiness,
      emp1ExecutionCurrentness,
      emp1CState,
    }));

    const presentedStage = analyticalMode ? analyticalState.stages[stageId] : stage;
    const content = analyticalMode
      ? renderLafeaAnalyticalCalcContent(this.rootElement, analyticalState, presentedStage, {
        handlers: this.handlers,
        registryEntry,
        emp1Projection,
        emp1RunInput,
        emp1Execution,
        emp1ExecutionCurrentness,
        emp1CState,
        emp1RouteAuthority,
        emp1RunFailure: dependencies.getEmp1RunFailure(),
        onSelectRoute: (nextStageId) => this.selectAnalyticalRoute(nextStageId, state),
        benchmarkHost: this.benchmarkHost,
      })
      : renderLafeaWorkbenchContent(this.rootElement, state, stage, {
        handlers: this.handlers,
        registryEntry,
        renderPacket,
        THREE: dependencies.THREE,
        sceneRevision,
        reusedViewport: reuseViewport ? { viewport: this.activeViewport, element: this.activeViewportElement } : null,
        selection: this.sceneSelections.get(stageId),
        focusedMeshElementId: this.sceneMeshFocus.get(stageId) ?? null,
        onSelectionChange: (selection) => this.sceneSelections.set(stageId, selection),
        onMeshFocusChange: (elementId) => this.sceneMeshFocus.set(stageId, elementId),
        onNavigateTarget: (target) => this.focusToolbarTarget(target),
        benchmarkHost: this.benchmarkHost,
      });

    if (!reuseViewport) previousViewport?.destroy();
    this.activeViewport = content.viewport;
    this.activeViewportElement = content.viewportElement;
    this.activeViewportDependencies = viewportDependencies;
    this.slots.content.replaceChildren(content.element);
    restoreFocusedControl(this.rootElement, focused);
  }

  ensureShell() {
    if (this.section) return;
    this.section = element(this.rootElement, 'section', 'lafea-workbench');
    this.section.dataset.role = 'lafea-workbench';
    this.slots = Object.fromEntries(
      ['header', 'navigation', 'toolbar', 'content'].map((name) => {
        const slot = element(this.rootElement, 'div');
        slot.dataset.lafeaSlot = name;
        this.section.append(slot);
        return [name, slot];
      }),
    );
    this.rootElement.append(this.section);
  }

  destroy() {
    this.activeViewport?.destroy();
    this.activeViewport = null;
    this.activeViewportElement = null;
    this.activeViewportDependencies = null;
    this.sceneDocuments.clear();
    this.sceneLifecycles.clear();
    this.sceneLifecycleBindings.clear();
    this.sceneRevisions.clear();
    this.sceneSelections.clear();
    this.sceneMeshFocus.clear();
    VIEW_RENDER_DEPENDENCIES.delete(this);
    this.rootElement?.replaceChildren();
    this.section = null;
    this.slots = null;
    this.handlers = null;
    this.lastState = null;
    this.presentationMode = PRESENTATION_STAGE;
  }

  header(state, stage, definition, modes) {
    const header = element(this.rootElement, 'header', 'lafea-workbench__header');
    const block = element(this.rootElement, 'div');
    let eyebrow;
    let title;
    let purpose;
    let custody = null;

    if (modes.analyticalMode) {
      eyebrow = this.analyticalOnly
        ? 'Independent analytical assessment'
        : 'LAFEA standalone analysis • analytical product';
      title = `${EMP1_PUBLIC_PRODUCT.productId} — ${EMP1_PUBLIC_PRODUCT.label}`;
      purpose = `${EMP1_PUBLIC_PRODUCT.purpose} No FE mesh is created in EMP.1.`;
      custody = this.analyticalCustody(stage);
    } else {
      eyebrow = `LAFEA standalone analysis • active stage ${definition.stageId}`;
      title = `${definition.stageId} — ${definition.label}`;
      purpose = definition.purpose;
      custody = this.headerCustody(stage);
    }

    block.append(
      element(this.rootElement, 'span', 'panel-eyebrow', eyebrow),
      element(this.rootElement, 'h1', null, title),
      element(this.rootElement, 'p', null, purpose),
    );
    if (custody) block.append(custody);
    const status = element(this.rootElement, 'output', 'lafea-workbench__status', state.status);
    status.dataset.status = state.status;
    status.setAttribute('aria-live', 'polite');
    header.append(block, status);
    return header;
  }

  headerCustody(stage) {
    const details = element(this.rootElement, 'details', 'lafea-workbench__custody-details');
    const summary = element(this.rootElement, 'summary', null, 'Technical custody detail');
    const row = element(this.rootElement, 'div', 'lafea-workbench__custody');
    const sections = stage.orchestration?.sections ?? {};
    const values = [
      `Source binding: ${stage.lifecycleBinding?.status ?? 'UNINITIALIZED'}`,
      `Profile: ${stage.lifecycle?.profileId ?? 'UNINITIALIZED'}`,
      `Preparation: ${sections.PREPARATION?.state ?? 'UNAVAILABLE'}`,
      `Mesh: ${stage.analysisMeshCustodyProjection?.state ?? 'UNAVAILABLE'}`,
      `Authorization: ${sections.AUTHORIZATION?.state ?? 'UNAVAILABLE'}`,
      `Release: ${sections.RELEASE?.state === 'COMPLETE' ? 'QUALIFIED' : 'NOT QUALIFIED'}`,
    ];
    values.forEach((value) => row.append(element(this.rootElement, 'span', null, value)));
    details.append(summary, row);
    return details;
  }

  analyticalCustody(stage) {
    const details = element(this.rootElement, 'details', 'lafea-workbench__custody-details');
    const summary = element(this.rootElement, 'summary', null, 'Technical custody detail');
    const row = element(this.rootElement, 'div', 'lafea-workbench__custody');
    const sections = stage.orchestration?.sections ?? {};
    const step = emp1StepForBackingStage(stage.stageId);
    [
      `Public step: ${step?.stepId ?? 'UNRESOLVED'} ${step?.label ?? ''}`.trim(),
      `Retained backing engine: ${stage.stageId}`,
      `Source binding: ${stage.lifecycleBinding?.status ?? 'UNINITIALIZED'}`,
      `Profile: ${stage.lifecycle?.profileId ?? 'UNINITIALIZED'}`,
      `Preparation: ${sections.PREPARATION?.state ?? 'UNAVAILABLE'}`,
      `Authorization: ${sections.AUTHORIZATION?.state ?? 'UNAVAILABLE'}`,
      'FE mesh: NOT APPLICABLE',
      `Release: ${sections.RELEASE?.state === 'COMPLETE' ? 'QUALIFIED' : 'NOT QUALIFIED'}`,
    ].forEach((value) => row.append(element(this.rootElement, 'span', null, value)));
    details.append(summary, row);
    return details;
  }

  stageNavigation(state) {
    const navigation = element(this.rootElement, 'nav', 'lafea-workbench__stages');
    const emp1 = actionButton(
      this.rootElement,
      `${EMP1_PUBLIC_PRODUCT.productId} ${EMP1_PUBLIC_PRODUCT.label} · Analytical`,
      () => this.selectAnalyticalPresentation(state),
    );
    emp1.dataset.productId = EMP1_PUBLIC_PRODUCT.productId;
    emp1.dataset.method = 'ANALYTICAL';
    emp1.setAttribute('aria-current', isAnalyticalStage(state.activeStageId) ? 'step' : 'false');

    if (this.analyticalOnly) {
      navigation.setAttribute('aria-label', 'Analytical assessment products');
      navigation.append(emp1);
      return navigation;
    }

    navigation.setAttribute('aria-label', 'LAFEA analysis products and stages');
    navigation.append(emp1);
    for (const definition of LAFEA_STAGE_REGISTRY) {
      if (isAnalyticalStage(definition.stageId)) continue;
      const disabled = definition.engineState === 'ENGINE_NOT_IMPLEMENTED';
      const button = actionButton(
        this.rootElement,
        `${definition.stageId} ${definition.label} · FEA${disabled ? ' (Not implemented)' : ''}`,
        () => this.selectStagePresentation(definition.stageId, state),
      );
      button.dataset.stageId = definition.stageId;
      button.dataset.method = 'FEA';
      if (disabled) button.setAttribute('aria-disabled', 'true');
      button.setAttribute('aria-current', definition.stageId === state.activeStageId ? 'step' : 'false');
      navigation.append(button);
    }
    return navigation;
  }

  selectStagePresentation(stageId, state) {
    this.presentationMode = isAnalyticalStage(stageId)
      ? PRESENTATION_ANALYTICAL
      : PRESENTATION_STAGE;
    const result = this.handlers.onStage(stageId);
    if (state.activeStageId === stageId) this.render(this.lastState ?? state);
    return result;
  }

  selectAnalyticalPresentation(state) {
    this.presentationMode = PRESENTATION_ANALYTICAL;
    const stageId = isAnalyticalStage(state.activeStageId)
      ? state.activeStageId
      : DEFAULT_ANALYTICAL_CALC_STAGE_ID;
    const result = this.handlers.onStage(stageId);
    if (state.activeStageId === stageId) this.render(this.lastState ?? state);
    return result;
  }

  selectAnalyticalRoute(stageId, state) {
    if (!isAnalyticalStage(stageId)) {
      throw new TypeError(`EMP1_BACKING_ROUTE_UNSUPPORTED:${stageId}`);
    }
    this.presentationMode = PRESENTATION_ANALYTICAL;
    const result = this.handlers.onStage(stageId);
    if (state.activeStageId === stageId) this.render(this.lastState ?? state);
    return result;
  }

  toolbar(stageId, stage, analyticalMode = false, emp1 = {}) {
    const toolbar = element(this.rootElement, 'div', 'lafea-workbench__toolbar');
    const step = analyticalMode ? emp1StepForBackingStage(stageId) : null;
    const publicId = step?.stepId ?? stageId;
    const mock = actionButton(
      this.rootElement,
      `[SIMULATED] Load ${publicId} demonstration source`,
      () => this.handlers.onMock(stageId),
    );
    mock.dataset.role = 'lafea-mock';
    mock.dataset.mockData = 'true';
    if (stage?.document) mock.style.display = 'none';

    const completeSample = analyticalMode
      ? actionButton(
        this.rootElement,
        '[SIMULATED] Load complete EMP.1 qualification sample',
        this.handlers.onLoadEmp1QualificationSample,
      )
      : null;
    if (completeSample) {
      completeSample.dataset.role = 'emp1-load-complete-qualification-sample';
      completeSample.dataset.mockData = 'true';
      completeSample.title = 'Load source-only A/B/C qualification inputs through the normal workbench custody path. Derived WRC quantities and production authority are not injected.';
    }

    const file = element(this.rootElement, 'input');
    const fileLabel = element(this.rootElement, 'label', null,
      analyticalMode ? `Import ${publicId} source JSON` : 'Import stage JSON');
    const fileId = `lafea-import-${stageId.replace('.', '-')}`;
    file.id = fileId;
    fileLabel.htmlFor = fileId;
    file.type = 'file';
    file.accept = '.json,application/json';
    file.dataset.role = 'lafea-import';
    file.addEventListener('change', () => this.handlers.onFile(file.files?.[0] ?? null));

    const executionSupported = lafeaRegisteredExecutionSupported(stageId);
    const authorization = stage.orchestration?.sections?.AUTHORIZATION ?? null;
    const runAuthorized = authorization?.state === 'READY';
    const run = actionButton(
      this.rootElement,
      executionSupported ? (analyticalMode ? `Validate and run ${publicId}` : 'Validate and calculate') : 'Calculation not implemented',
      this.handlers.onRun,
    );
    run.dataset.role = 'lafea-run';
    if (step) run.dataset.emp1Step = step.shortId;
    run.disabled = !stage.document || !executionSupported || !runAuthorized;
    run.title = runTitle(stage, executionSupported, authorization);

    const productRun = analyticalMode
      ? actionButton(this.rootElement, 'Prepare EMP.1 · A → B → governed C', this.handlers.onRunEmp1)
      : null;
    if (productRun) {
      productRun.dataset.role = 'emp1-run-product';
      productRun.dataset.currentness = emp1.emp1ExecutionCurrentness?.state ?? 'NOT_RUN';
      productRun.disabled = emp1.emp1RunReadiness?.runAuthorized !== true;
      productRun.title = productRun.disabled
        ? `EMP.1 source binding is not ready: ${(emp1.emp1RunReadiness?.reasons ?? []).join(', ')}`
        : 'Execute retained A/B mechanics and prepare source-bound C custody. If C production authority is suspended, no WRC stress result is produced.';
    }

    const cRun = analyticalMode
      ? actionButton(
        this.rootElement,
        emp1.emp1CState?.buttonLabel ?? 'Run C',
        this.handlers.onRunEmp1,
      )
      : null;
    if (cRun) {
      cRun.dataset.role = 'emp1-run-c';
      cRun.dataset.cState = emp1.emp1CState?.state ?? 'SOURCE_INCOMPLETE';
      cRun.disabled = emp1.emp1CState?.buttonEnabled !== true;
      cRun.title = cRun.disabled
        ? `C production execution is unavailable: ${(emp1.emp1CState?.blockerCodes ?? []).join(', ') || 'source/authority not ready'}`
        : 'Execute the governed C transaction under the current route authority. Unchanged A/B layers are retained.';
    }

    const benchmark = actionButton(
      this.rootElement,
      analyticalMode ? `Verify ${publicId}` : 'Run available verification suite',
      this.handlers.onBenchmark,
    );
    benchmark.dataset.role = 'lafea-benchmark';
    benchmark.disabled = !executionSupported;

    const exportButton = actionButton(
      this.rootElement,
      analyticalMode ? `Export ${publicId} source` : 'Export source document',
      this.handlers.onExport,
    );
    exportButton.disabled = !stage.document;
    const undo = actionButton(this.rootElement, 'Undo', this.handlers.onUndo);
    undo.disabled = !stage.past.length;
    const redo = actionButton(this.rootElement, 'Redo', this.handlers.onRedo);
    redo.disabled = !stage.future.length;

    const controls = [];
    if (!this.rootElement?.hasAttribute?.('data-lafea-app-root')) controls.push(mock);
    if (completeSample) controls.push(completeSample);
    controls.push(fileLabel, file);
    if (productRun) controls.push(productRun);
    if (cRun) controls.push(cRun);
    controls.push(run);
    if (this.benchmarkHost) controls.push(benchmark);
    controls.push(exportButton, undo, redo);
    toolbar.append(...controls);
    return toolbar;
  }

  nextSceneRevision(stageId, documentValue, lifecycle, lifecycleBinding) {
    const changed = !this.sceneDocuments.has(stageId)
      || this.sceneDocuments.get(stageId) !== documentValue
      || this.sceneLifecycles.get(stageId) !== lifecycle
      || this.sceneLifecycleBindings.get(stageId) !== lifecycleBinding;
    if (changed) {
      this.sceneDocuments.set(stageId, documentValue);
      this.sceneLifecycles.set(stageId, lifecycle);
      this.sceneLifecycleBindings.set(stageId, lifecycleBinding);
      this.sceneRevisions.set(stageId, (this.sceneRevisions.get(stageId) ?? 0) + 1);
      this.sceneSelections.delete(stageId);
      this.sceneMeshFocus.delete(stageId);
    }
    return this.sceneRevisions.get(stageId) ?? 0;
  }

  focusToolbarTarget(target) {
    if (target !== 'run') return;
    this.slots?.toolbar?.querySelector?.('[data-role="lafea-run"]')?.focus?.();
  }
}

function withCurrentEmp1StageExecutions(state, execution, currentness) {
  if (currentness?.inputCurrent !== true || !execution) return state;
  const loadTransfer = execution.stageExecutions?.loadTransfer ?? null;
  const sectionScreening = execution.stageExecutions?.sectionScreening ?? null;
  if (!loadTransfer && !sectionScreening) return state;
  return {
    ...state,
    stages: {
      ...state.stages,
      'LAFEA.1': loadTransfer
        ? { ...state.stages['LAFEA.1'], execution: loadTransfer }
        : state.stages['LAFEA.1'],
      'LAFEA.2': sectionScreening
        ? { ...state.stages['LAFEA.2'], execution: sectionScreening }
        : state.stages['LAFEA.2'],
    },
  };
}

function withEmp1CStateProjection(projection, cState) {
  if (!projection || !cState) return projection;
  return Object.freeze({
    ...projection,
    steps: Object.freeze(projection.steps.map((step) => step.shortId === 'C'
      ? Object.freeze({
        ...step,
        state: cState.state,
        resultAvailable: cState.currentResultAvailable,
        retainedResultAvailable: cState.retainedResultAvailable,
        runAuthorized: cState.buttonEnabled,
        blockers: cState.blockerCodes,
        currentnessBadge: cState.stageBadge,
      })
      : step)),
  });
}

function isAnalyticalStage(stageId) {
  return isEmp1BackingStage(stageId);
}

function runTitle(stage, executionSupported, authorization) {
  if (!executionSupported) {
    return lafeaWorkbenchReasonLabel('UNSUPPORTED_STAGE_ENGINE_NOT_IMPLEMENTED');
  }
  if (!stage.document) {
    return 'Import or create a valid source document before running the analysis.';
  }
  if (authorization?.state !== 'READY') {
    const reasons = lafeaWorkbenchReasonLabels(
      authorization?.reasons?.length
        ? authorization.reasons
        : ['CANONICAL_AUTHORIZATION_NOT_READY'],
    ).join(' ');
    return `Run is not authorized. ${reasons}`;
  }
  return 'Analysis authorization is ready. A retained calculation result does not by itself establish release qualification.';
}