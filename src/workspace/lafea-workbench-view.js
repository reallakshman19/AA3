/** DOM view for the independent guided LAFEA workbench.
 * LAFEA.1/LAFEA.2 are first-class analytical stages. LAFEA.3+ use the retained
 * FE viewport where their registered execution route requires one.
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
    this.slots.toolbar.replaceChildren(this.toolbar(stageId, stage, analyticalMode));

    const content = analyticalMode
      ? renderLafeaAnalyticalCalcContent(this.rootElement, state, stage, {
        handlers: this.handlers,
        registryEntry,
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
        ? 'Independent analytical calculation'
        : `LAFEA standalone analysis • analytical stage ${definition.stageId}`;
      title = `${definition.stageId} — ${definition.label}`;
      purpose = `${definition.purpose} This stage uses analytical mechanics and does not create an FE mesh.`;
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
    [
      `Backing route: ${stage.stageId} analytical`,
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
    if (this.analyticalOnly) {
      navigation.setAttribute('aria-label', 'Analytical calculation routes');
      ['LAFEA.1', 'LAFEA.2'].forEach((stageId) => {
        const definition = requireLafeaStageRegistryEntry(stageId);
        const button = actionButton(
          this.rootElement,
          `${stageId} — ${definition.label}`,
          () => this.selectAnalyticalRoute(stageId, state),
        );
        button.dataset.stageId = stageId;
        button.setAttribute('aria-current', definition.stageId === state.activeStageId ? 'step' : 'false');
        navigation.append(button);
      });
      return navigation;
    }

    navigation.setAttribute('aria-label', 'LAFEA analysis stages');
    for (const definition of LAFEA_STAGE_REGISTRY) {
      const analytical = isAnalyticalStage(definition.stageId);
      const disabled = definition.engineState === 'ENGINE_NOT_IMPLEMENTED';
      const methodLabel = analytical ? 'Analytical' : 'FEA';
      const button = actionButton(
        this.rootElement,
        `${definition.stageId} ${definition.label} · ${methodLabel}${disabled ? ' (Not implemented)' : ''}`,
        () => this.selectStagePresentation(definition.stageId, state),
      );
      button.dataset.stageId = definition.stageId;
      button.dataset.method = analytical ? 'ANALYTICAL' : 'FEA';
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
      throw new TypeError(`LAFEA_ANALYTICAL_ROUTE_UNSUPPORTED:${stageId}`);
    }
    this.presentationMode = PRESENTATION_ANALYTICAL;
    const result = this.handlers.onStage(stageId);
    if (state.activeStageId === stageId) this.render(this.lastState ?? state);
    return result;
  }

  toolbar(stageId, stage, analyticalMode = false) {
    const toolbar = element(this.rootElement, 'div', 'lafea-workbench__toolbar');
    const mock = actionButton(
      this.rootElement,
      `[SIMULATED] Load ${stageId} demonstration source`,
      () => this.handlers.onMock(stageId),
    );
    mock.dataset.role = 'lafea-mock';
    mock.dataset.mockData = 'true';
    if (stage?.document) mock.style.display = 'none';

    const file = element(this.rootElement, 'input');
    const fileLabel = element(this.rootElement, 'label', null,
      analyticalMode ? 'Import analytical JSON' : 'Import stage JSON');
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
      executionSupported ? 'Validate and calculate' : 'Calculation not implemented',
      this.handlers.onRun,
    );
    run.dataset.role = 'lafea-run';
    run.disabled = !stage.document || !executionSupported || !runAuthorized;
    run.title = runTitle(stage, executionSupported, authorization);

    const benchmark = actionButton(
      this.rootElement,
      analyticalMode ? 'Run analytical verification suite' : 'Run available verification suite',
      this.handlers.onBenchmark,
    );
    benchmark.dataset.role = 'lafea-benchmark';
    benchmark.disabled = !executionSupported;

    const exportButton = actionButton(
      this.rootElement,
      analyticalMode ? 'Export analytical source' : 'Export source document',
      this.handlers.onExport,
    );
    exportButton.disabled = !stage.document;
    const undo = actionButton(this.rootElement, 'Undo', this.handlers.onUndo);
    undo.disabled = !stage.past.length;
    const redo = actionButton(this.rootElement, 'Redo', this.handlers.onRedo);
    redo.disabled = !stage.future.length;

    const controls = [];
    if (!this.rootElement?.hasAttribute?.('data-lafea-app-root')) controls.push(mock);
    controls.push(fileLabel, file, run);
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

function isAnalyticalStage(stageId) {
  return stageId === 'LAFEA.1' || stageId === 'LAFEA.2';
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
