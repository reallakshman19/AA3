/** Controller for the independent guided LAFEA workbench. */
import { createLafeaWorkbenchOrchestratorStore } from './lafea-workbench-orchestrator-store.js';
import {
  createLafeaAccessoryPanelManager,
  lafeaAccessoryPanelConfigurationRequiresHost,
} from './lafea-workbench-accessory-panels.js';
import {
  downloadLafeaJson,
  installLafeaWorkbenchStyles,
  isLafeaRecord,
  lafeaStageFilename,
  parseLafeaJsonObject,
  readLafeaUtf8,
} from './lafea-workbench-controller-io.js';
import {
  bindLafeaWorkbenchDisplayRenderPacket,
  clearLafeaWorkbenchDisplayRenderPacket,
  destroyLafeaWorkbenchRenderEvidence,
  initializeLafeaWorkbenchRenderEvidence,
  lafeaWorkbenchDisplayRenderPacket,
  lafeaWorkbenchThreeNamespace,
} from './lafea-workbench-render-evidence.js';
import { LafeaWorkbenchView } from './lafea-workbench-view.js';

const ACCESSORY_PANEL_MANAGERS = new WeakMap();
const DESTROYED_CONTROLLERS = new WeakSet();

export class LafeaWorkbenchController {
  constructor(rootElement, options) {
    const configuration = isLafeaRecord(options) ? options : {};
    const { accessoryPanels, THREE, ...storeOptions } = configuration;
    const { benchmarkPanelFactory, mockDocumentFactory, presentationMode, analyticalOnly } = configuration;
    this.rootElement = rootElement;
    this.documentRef = rootElement?.ownerDocument ?? globalThis.document;
    this.store = createLafeaWorkbenchOrchestratorStore(storeOptions);
    this.mockDocumentFactory = typeof mockDocumentFactory === 'function' ? mockDocumentFactory : null;
    initializeLafeaWorkbenchRenderEvidence(this, THREE ?? null);
    this.view = new LafeaWorkbenchView(rootElement, {
      getRenderPacket: (stageId) => lafeaWorkbenchDisplayRenderPacket(this, stageId),
      THREE: lafeaWorkbenchThreeNamespace(this),
      presentationMode,
      analyticalOnly,
    });
    this.benchmarkHost = this.documentRef.createElement('div');
    this.benchmarkHost.dataset.role = 'lafea-benchmark-host';
    this.benchmarkPanel = typeof benchmarkPanelFactory === 'function'
      ? benchmarkPanelFactory(this.benchmarkHost)
      : null;
    if (this.benchmarkPanel) this.view.setBenchmarkHost(this.benchmarkHost);
    if (lafeaAccessoryPanelConfigurationRequiresHost(configuration)) {
      ACCESSORY_PANEL_MANAGERS.set(
        this,
        createLafeaAccessoryPanelManager(this.documentRef, accessoryPanels),
      );
    }
    this.unsubscribe = null;
  }

  init() {
    if (DESTROYED_CONTROLLERS.has(this)) {
      throw new TypeError('LAFEA_WORKBENCH_CONTROLLER_DESTROYED');
    }
    if (this.unsubscribe) return this;
    installLafeaWorkbenchStyles(this.documentRef);
    this.view.init({
      onStage: (stageId) => this.store.selectStage(stageId),
      onMock: (stageId) => this.loadMockData(stageId),
      onFile: (file) => this.loadFile(file),
      onRun: () => this.run(),
      onExport: () => this.downloadDocument(),
      onUndo: () => this.undo(),
      onRedo: () => this.redo(),
      onSetScalar: (descriptorId, entityId, rawText) => this.setScalar(descriptorId, entityId, rawText),
      onApplyJson: (text) => this.applyDocumentText(text),
      onMoveNode: (path, nodeId, x, y) => this.store.moveNode(path, nodeId, x, y),
      onBenchmark: () => this.runBenchmark(),
      onImportMeshEvidence: (file) => this.loadAnalysisMeshEvidenceFile(file),
      onValidateMeshEvidence: () => this.validateRetainedAnalysisMeshEvidence(),
      onExportMeshEvidence: () => this.downloadAnalysisMeshEvidence(),
      onBindMeshProfile: (profile) => {
        const stageId = this.getState().activeStageId;
        if (stageId === 'LAFEA.3'
          && !this.getState().stages[stageId].domainFirstProfileActive) {
          this.store.activateDomainFirstProfile(stageId);
        }
        return this.bindAnalysisMeshProfile(profile);
      },
      onPlanMesh: (overrides) => this.planAnalysisMesh(overrides),
      onGenerateMesh: (overrides) => this.generateAnalysisMesh(overrides),
      onRefineMesh: (request) => this.refineAnalysisMesh(request),
    });
    this.benchmarkPanel?.render();
    this.unsubscribe = this.store.subscribe((state) => this.view.render(state));
    this.view.render(this.store.getState());
    const accessoryPanelManager = ACCESSORY_PANEL_MANAGERS.get(this);
    if (accessoryPanelManager) {
      this.rootElement.append(accessoryPanelManager.hostElement);
      accessoryPanelManager.mount(this);
    }
    return this;
  }

  runBenchmark() { return this.benchmarkPanel?.run() ?? null; }
  getBenchmarkReport() { return this.benchmarkPanel?.getReport() ?? null; }

  async loadFile(file) {
    if (!file) return this.getState();
    try {
      return this.importDocument(JSON.parse(await readLafeaUtf8(file)));
    } catch (error) {
      return this.store.reportEditError('document', null, error);
    }
  }

  async loadAnalysisMeshEvidenceFile(file) {
    if (!file) return this.getState();
    try {
      const value = JSON.parse(await readLafeaUtf8(file));
      this.recoverAnalysisMeshEvidence(value);
      return this.getState();
    } catch (error) {
      return this.store.reportEditError('analysisMeshEvidence', null, error);
    }
  }

  importDocument(value, stageId, sourceHash = null) {
    return this.store.importDocument(value, stageId, sourceHash);
  }

  async loadMockData(stageId) {
    if (!this.mockDocumentFactory) {
      return this.store.reportEditError(
        'document',
        null,
        new TypeError('LAFEA_SIMULATED_SOURCE_NOT_CONFIGURED'),
      );
    }
    try {
      const documentValue = await this.mockDocumentFactory(stageId);
      const result = this.importDocument(documentValue, stageId);
      const state = this.getState();
      const hash = state.stages[stageId]?.lifecycle?.source?.sourceHash;
      if (stageId === 'LAFEA.3') {
        const { createLafeaMockDomainAndGeometryEvidence } = await import('./lafea-simulated-source-provider.js');
        this.store.activateDomainFirstProfile();
        if (hash) {
          const mockEv = await createLafeaMockDomainAndGeometryEvidence(stageId, hash);
          if (mockEv) {
            this.store.registerAnalysisDomain(mockEv.domain);
            this.store.registerAnalysisGeometryEvidence(mockEv.geometryEvidence);
          }
        }
      } else if (stageId === 'LAFEA.4' && hash) {
        const { createLafeaSimulatedShellMidsurfaceEvidence } = await import(
          './lafea-simulated-shell-midsurface-provider.js'
        );
        const shellParent = createLafeaSimulatedShellMidsurfaceEvidence(
          stageId,
          hash,
          documentValue,
        );
        if (shellParent) this.store.registerShellMidsurfaceEvidence(shellParent);
      } else if (stageId === 'LAFEA.5' && hash) {
        const { createLafea5SourceShellParent } = await import(
          './lafea-source-shell-mesh-adoption.js'
        );
        const shellParent = createLafea5SourceShellParent({
          sourceHash: hash,
          shellTemplate: documentValue.shellTemplate,
        });
        this.store.registerShellMidsurfaceEvidence(shellParent);
      }
      return result;
    } catch (error) {
      return this.store.reportEditError('document', null, error);
    }
  }

  exportDocument() { return this.store.exportDocument(); }
  exportLifecycle() { return this.store.exportLifecycle(); }
  initializeLifecycle(sourceHash, originRef) {
    return this.store.initializeLifecycle(sourceHash, originRef);
  }
  applyLifecycleEvent(event) { return this.store.applyLifecycleEvent(event); }
  registerLifecycleArtifact(record, registrationId) {
    return this.store.registerLifecycleArtifact(record, registrationId);
  }
  revalidateLifecycleBinding(sourceHash, originRef) {
    return this.store.revalidateLifecycleBinding(sourceHash, originRef);
  }
  registerTemplateReleaseRecord(value, stageId = this.getState().activeStageId) {
    return this.store.registerTemplateReleaseRecord(value, stageId);
  }
  selectRetainedTemplateReleaseRecord(stageId = this.getState().activeStageId) {
    return this.store.selectRetainedTemplateReleaseRecord(stageId);
  }
  buildReleaseBindingProjection(stageId = this.getState().activeStageId) {
    return this.store.buildReleaseBindingProjection(stageId);
  }
  registerNumericalVerificationEvidence(value, stageId = this.getState().activeStageId) {
    return this.store.registerNumericalVerificationEvidence(value, stageId);
  }
  selectRetainedNumericalVerificationEvidence(stageId = this.getState().activeStageId) {
    return this.store.selectRetainedNumericalVerificationEvidence(stageId);
  }
  buildNumericalVerificationProjection(stageId = this.getState().activeStageId) {
    return this.store.buildNumericalVerificationProjection(stageId);
  }
  registerT6GeometryQualification(value, stageId = this.getState().activeStageId) {
    return this.store.registerT6GeometryQualification(value, stageId);
  }
  selectRetainedT6GeometryQualification(stageId = this.getState().activeStageId) {
    return this.store.selectRetainedT6GeometryQualification(stageId);
  }
  buildT6GeometryQualificationProjection(stageId = this.getState().activeStageId) {
    return this.store.buildT6GeometryQualificationProjection(stageId);
  }
  exportT6GeometryQualification(stageId = this.getState().activeStageId) {
    return this.store.exportT6GeometryQualification(stageId);
  }
  validateLafeaAnalysisMeshEvidence(value) {
    return this.store.validateLafeaAnalysisMeshEvidence(value);
  }
  registerAnalysisMeshEvidence(value) {
    return this.store.registerAnalysisMeshEvidence(value);
  }
  selectRetainedAnalysisMeshEvidence(stageId) {
    return this.store.selectRetainedAnalysisMeshEvidence(stageId);
  }

  bindAnalysisMeshProfile(v, s = this.getState().activeStageId) { return this.store.bindAnalysisMeshProfile(v, s); }
  /** Preview only: runs the bound producer without touching mesh custody. */
  planAnalysisMesh(o = {}, s = this.getState().activeStageId) { return this.store.planAnalysisMesh(o, s); }
  generateAnalysisMesh(o = {}, s = this.getState().activeStageId) { return this.store.generateAnalysisMesh(o, s); }
  refineAnalysisMesh(r = {}, s = this.getState().activeStageId) { return this.store.refineAnalysisMesh(r, s); }
  selectRetainedAnalysisMeshEvidenceV2(s = this.getState().activeStageId) { return this.store.selectRetainedAnalysisMeshEvidenceV2(s); }

  buildAnalysisMeshCustodyProjection(stageId = this.getState().activeStageId) {
    const stage = this.getState().stages[stageId];
    return this.store.buildAnalysisMeshCustodyProjection(
      stage,
      stage?.retainedAnalysisMeshEvidence ?? null,
    );
  }

  exportAnalysisMeshEvidence(stageId = this.getState().activeStageId) {
    return this.store.exportAnalysisMeshEvidence(stageId);
  }
  recoverAnalysisMeshEvidence(value) {
    return this.store.recoverAnalysisMeshEvidence(value);
  }
  validateRetainedAnalysisMeshEvidence(stageId = this.getState().activeStageId) {
    const evidence = this.selectRetainedAnalysisMeshEvidence(stageId);
    return evidence ? this.validateLafeaAnalysisMeshEvidence(evidence) : null;
  }

  getDisplayViewportContext() {
    const viewport = this.view.activeViewport;
    if (!viewport) return null;
    const state = viewport.getState();
    return Object.freeze({
      schema: 'lafea-workbench-display-context/v1',
      stageId: state.stageId,
      sceneRevision: state.sceneRevision,
      sourceSemanticHash: viewport.scene.sourceSemanticHash,
      mode: state.mode,
      status: state.status,
    });
  }

  setDisplayRenderPacket(packetValue) {
    const binding = bindLafeaWorkbenchDisplayRenderPacket(this, packetValue);
    this.renderActiveStageIf(binding.stageId);
    return binding;
  }

  clearDisplayRenderPacket(stageId = this.getState().activeStageId) {
    const binding = clearLafeaWorkbenchDisplayRenderPacket(this, stageId);
    if (binding.status === 'CLEARED') this.renderActiveStageIf(binding.stageId);
    return binding;
  }

  renderActiveStageIf(stageId) {
    if (this.unsubscribe && this.getState().activeStageId === stageId) {
      this.view.render(this.getState());
    }
  }

  setScalar(descriptorId, entityId, rawText) {
    try {
      return this.store.setScalar(descriptorId, entityId, rawText, 'FORM');
    } catch (error) {
      return this.store.reportEditError(descriptorId, entityId, error);
    }
  }

  applyDocumentText(text) {
    try {
      return this.store.replaceDocument(parseLafeaJsonObject(text, 'LAFEA document'), 'RAW_JSON');
    } catch (error) {
      return this.store.reportEditError('document', null, error);
    }
  }

  run() { return this.store.run(); }
  undo() { return this.store.undo(); }
  redo() { return this.store.redo(); }
  getState() { return this.store.getState(); }

  downloadDocument() {
    const value = this.exportDocument();
    downloadLafeaJson(this.documentRef, value, `${lafeaStageFilename(value.stageId)}-document.json`);
    return value;
  }

  downloadAnalysisMeshEvidence(stageId = this.getState().activeStageId) {
    const value = this.exportAnalysisMeshEvidence(stageId);
    if (!value) return null;
    downloadLafeaJson(this.documentRef, value, `${lafeaStageFilename(stageId)}-analysis-mesh-evidence.json`);
    return value;
  }

  destroy() {
    if (DESTROYED_CONTROLLERS.has(this)) return;
    DESTROYED_CONTROLLERS.add(this);
    const accessoryPanelManager = ACCESSORY_PANEL_MANAGERS.get(this);
    accessoryPanelManager?.destroy();
    ACCESSORY_PANEL_MANAGERS.delete(this);
    this.benchmarkPanel?.destroy();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.store.destroy();
    this.view.destroy();
    destroyLafeaWorkbenchRenderEvidence(this);
    this.rootElement = null;
  }
}
