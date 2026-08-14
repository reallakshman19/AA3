/** DOM view for the independent guided LAFEA workbench.
 * Compatibility audit: FEA-stage content mounts mountLafeaLiveWorkbenchViewport
 * through renderLafeaWorkbenchContent; the retained source path remains
 * mountLafeaSourceWorkbenchViewport. No geometry or mesh has been synthesized.
 *
 * LAFEA.1 is intentionally presented as TBA. Its retained analytical foundation
 * route is exposed separately through the Analytical Calc tab, which never
 * mounts FE viewport, mesh/discretization, contour, or convergence UI.
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
const ANALYTICAL_CALC_STAGE_ID = 'LAFEA.1';
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
    this.presentationMode = PRESENTATION_STAGE;
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
    if (this.presentationMode === PRESENTATION_ANALYTICAL
      && state.activeStageId !== ANALYTICAL_CALC_STAGE_ID) {
      this.presentationMode = PRESENTATION_STAGE;
    }
    this.lastState = state;
    const focused = captureFocusedControl(this.rootElement);
    const stageId = state.activeStageId;
    const stage = state.stages[stageId];
    const registryEntry = requireLafeaStageRegistryEntry(stageId);
    const analyticalMode = this.presentationMode === PRESENTATION_ANALYTICAL;
    const tbaMode = this.presentationMode === PRESENTATION_STAGE
      && stageId === ANALYTICAL_CALC_STAGE_ID;
    const fePresentation = !analyticalMode && !tbaMode;
    const dependencies = VIEW_RENDER_DEPENDENCIES.get(this);
    const renderPacket = fePresentation ? dependencies.getRenderPacket(stageId) : null;
    const sceneRevision = fePresentation
      ? this.nextSceneRevision(stageId, stage.document, stage.lifecycle, stage.lifecycleBinding)
      : 0;
    const viewportDependencies = fePresentation
      ? createLafeaWorkbenchViewportDependencies({
        stageId, stage, sceneRevision, renderPacket,
      })
      : null;
    const reuseViewport = fePresentation
      && Boolean(this.activeViewport && this.activeViewportElement)
      && canReuseLafeaWorkbenchViewport(
        this.activeViewportDependencies,
        viewportDependencies,
      );
    const previousViewport = this.activeViewport;

    this.ensureShell();
    this.slots.header.replaceChildren(this.header(
      state,
      stage,
      registryEntry,
      { analyticalMode, tbaMode },
    ));
    this.slots.navigation.replaceChildren(this.stageNavigation(state));
    this.slots.toolbar.replaceChildren(
      tbaMode ? this.tbaToolbar() : this.toolbar(stageId, stage, analyticalMode),
    );

    let content;
    if (tbaMode) {
      content = this.tbaContent();
    } else if (analyticalMode) {
      content = renderLafeaAnalyticalCalcContent(this.rootElement, state, stage, {
        handlers: this.handlers,
        registryEntry,
        benchmarkHost: this.benchmarkHost,
      });
    } else {
      content = renderLafeaWorkbenchContent(this.rootElement, state, stage, {
        handlers: this.handlers,
        registryEntry,
        renderPacket,
        THREE: dependencies.THREE,
        sceneRevision,
        reusedViewport: reuseViewport ? {
          viewport: this.activeViewport,
          element: this.activeViewportElement,
        } : null,
        selection: this.sceneSelections.get(stageId),
        focusedMeshElementId: this.sceneMeshFocus.get(stageId) ?? null,
        onSelectionChange: (selection) => this.sceneSelections.set(stageId, selection),
        onMeshFocusChange: (elementId) => this.sceneMeshFocus.set(stageId, elementId),
        onNavigateTarget: (target) => this.focusToolbarTarget(target),
        benchmarkHost: this.benchmarkHost,
      });
    }

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
    let displayStatus = state.status;

    if (modes.tbaMode) {
      eyebrow = 'LAFEA standalone analysis • reserved stage';
      title = 'LAFEA.1 — TBA';
      purpose = 'Stage implementation is intentionally not presented yet. No FE geometry, mesh, solver, result, or demonstration state is exposed in LAFEA.1.';
      displayStatus = 'TBA';
    } else if (modes.analyticalMode) {
      eyebrow = 'Independent analytical calculation';
      title = 'Analytical Calc';
      purpose = 'Attachment load transfer and elastic pressure baseline using the retained analytical calculation route. This is not a finite-element or mesh stage.';
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
    const status = element(
      this.rootElement,
      'output',
      'lafea-workbench__status',
      displayStatus,
    );
    status.dataset.status = displayStatus;
    status.setAttribute('aria-live', 'polite');
    header.append(block, status);
    return header;
  }

  headerCustody(stage) {
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
    return row;
  }

  analyticalCustody(stage) {
    const row = element(this.rootElement, 'div', 'lafea-workbench__custody');
    const sections = stage.orchestration?.sections ?? {};
    const values = [
      `Backing route: ${ANALYTICAL_CALC_STAGE_ID} analytical`,
      `Source binding: ${stage.lifecycleBinding?.status ?? 'UNINITIALIZED'}`,
      `Profile: ${stage.lifecycle?.profileId ?? 'UNINITIALIZED'}`,
      `Preparation: ${sections.PREPARATION?.state ?? 'UNAVAILABLE'}`,
      `Authorization: ${sections.AUTHORIZATION?.state ?? 'UNAVAILABLE'}`,
      `FE mesh: NOT APPLICABLE`,
      `Release: ${sections.RELEASE?.state === 'COMPLETE' ? 'QUALIFIED' : 'NOT QUALIFIED'}`,
    ];
    values.forEach((value) => row.append(element(this.rootElement, 'span', null, value)));
    return row;
  }

  stageNavigation(state) {
    const navigation = element(this.rootElement, 'nav', 'lafea-workbench__stages');
    navigation.setAttribute('aria-label', 'LAFEA stages and analytical calculation');
    for (const definition of LAFEA_STAGE_REGISTRY) {
      const label = definition.stageId === ANALYTICAL_CALC_STAGE_ID
        ? `${definition.stageId} TBA`
        : `${definition.stageId} ${definition.label}`;
      const button = actionButton(
        this.rootElement,
        label,
        () => this.selectStagePresentation(definition.stageId, state),
      );
      button.dataset.stageId = definition.stageId;
      button.setAttribute(
        'aria-current',
        this.presentationMode === PRESENTATION_STAGE
          && definition.stageId === state.activeStageId
          ? 'step'
          : 'false',
      );
      navigation.append(button);
      if (definition.stageId === ANALYTICAL_CALC_STAGE_ID) {
        const analytical = actionButton(
          this.rootElement,
          'Analytical Calc',
          () => this.selectAnalyticalPresentation(state),
        );
        analytical.dataset.lafeaTab = PRESENTATION_ANALYTICAL;
        analytical.dataset.backingStageId = ANALYTICAL_CALC_STAGE_ID;
        analytical.setAttribute(
          'aria-current',
          this.presentationMode === PRESENTATION_ANALYTICAL ? 'step' : 'false',
        );
        navigation.append(analytical);
      }
    }
    return navigation;
  }

  selectStagePresentation(stageId, state) {
    this.presentationMode = PRESENTATION_STAGE;
    const result = this.handlers.onStage(stageId);
    if (state.activeStageId === stageId) this.render(this.lastState ?? state);
    return result;
  }

  selectAnalyticalPresentation(state) {
    this.presentationMode = PRESENTATION_ANALYTICAL;
    const result = this.handlers.onStage(ANALYTICAL_CALC_STAGE_ID);
    if (state.activeStageId === ANALYTICAL_CALC_STAGE_ID) {
      this.render(this.lastState ?? state);
    }
    return result;
  }

  toolbar(stageId, stage, analyticalMode = false) {
    const toolbar = element(this.rootElement, 'div', 'lafea-workbench__toolbar');
    const displayName = analyticalMode ? 'Analytical Calc' : stageId;
    const mock = actionButton(
      this.rootElement,
      `[SIMULATED] Load ${displayName} demonstration source`,
      () => this.handlers.onMock(stageId),
    );
    mock.dataset.role = 'lafea-mock';
    mock.dataset.mockData = 'true';

    const file = element(this.rootElement, 'input');
    const fileLabel = element(
      this.rootElement,
      'label',
      null,
      analyticalMode ? 'Import analytical JSON' : 'Import stage JSON',
    );
    const fileId = `lafea-import-${analyticalMode ? 'analytical-calc' : stageId.replace('.', '-')}`;
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
    toolbar.append(mock, fileLabel, file, run, benchmark, exportButton, undo, redo);
    return toolbar;
  }

  tbaToolbar() {
    const toolbar = element(this.rootElement, 'div', 'lafea-workbench__toolbar');
    const notice = element(
      this.rootElement,
      'span',
      'lafea-workbench__section-intro',
      'LAFEA.1 is TBA. No source import, demonstration data, meshing, calculation, or verification action is available from this stage tab.',
    );
    notice.dataset.role = 'lafea-tba-toolbar';
    toolbar.append(notice);
    return toolbar;
  }

  tbaContent() {
    const shell = element(this.rootElement, 'section', 'lafea-tba-stage');
    shell.dataset.role = 'lafea-tba-stage';
    shell.dataset.stageId = ANALYTICAL_CALC_STAGE_ID;
    shell.append(
      element(this.rootElement, 'span', 'panel-eyebrow', 'Reserved stage'),
      element(this.rootElement, 'h2', null, 'LAFEA.1 — TBA'),
      element(
        this.rootElement,
        'p',
        null,
        'This stage intentionally exposes no finite-element geometry, mesh, element controls, viewport, solver controls, contours, convergence, results, or simulated FE content.',
      ),
      element(
        this.rootElement,
        'p',
        null,
        'The existing attachment-foundation analytical load-transfer and pressure-baseline capability has moved to the separate Analytical Calc tab.',
      ),
    );
    return Object.freeze({
      element: shell,
      viewport: null,
      viewportElement: null,
      viewportReused: false,
      workflow: null,
      discretization: null,
    });
  }

  nextSceneRevision(stageId, document, lifecycle, lifecycleBinding) {
    const changed = !this.sceneDocuments.has(stageId)
      || this.sceneDocuments.get(stageId) !== document
      || this.sceneLifecycles.get(stageId) !== lifecycle
      || this.sceneLifecycleBindings.get(stageId) !== lifecycleBinding;
    if (changed) {
      this.sceneDocuments.set(stageId, document);
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

function runTitle(stage, executionSupported, authorization) {
  if (!executionSupported) {
    return lafeaWorkbenchReasonLabel('UNSUPPORTED_STAGE_ENGINE_NOT_IMPLEMENTED');
  }
  if (!stage.document) return 'Import or create a valid source document before running the analysis.';
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
