/** Guided content composition for the standalone LAFEA workbench. */
import { card, element } from './lafea-workbench-dom.js';
import { renderLafeaEvidence } from './lafea-results-view.js';
import { renderDocumentTableEditor } from './lafea-document-table.js';
import { renderLafeaLifecyclePanel } from './lafea-lifecycle-panel.js';
import { mountLafeaLiveWorkbenchViewport } from './lafea-live-workbench-viewport.js';
import { buildLafeaDiscretizationViewModel } from './lafea-discretization-view-model.js';
import { renderLafeaDiscretizationPanel } from './lafea-discretization-panel.js';
import { compactLafeaRefinementWorkspace } from './lafea-refinement-disclosure.js';
import { buildLafeaGuidedWorkflow } from './lafea-guided-workflow.js';
import { renderLafeaGuidedWorkflow } from './lafea-guided-workflow-view.js';
import { renderLafeaAnalysisSettings } from './lafea-analysis-settings-view.js';
import { renderLafeaNumericalVerification } from './lafea-numerical-verification-view.js';
import { renderLafeaEngineeringOverview } from './lafea-engineering-overview.js';
import { lafeaWorkbenchReasonLabels } from './lafea-workbench-reason-labels.js';
import { renderLafeaSolveReadiness } from './lafea-solve-readiness-panel.js';
import { renderLafeaNcPlaceholderPanel } from './lafea-nc-placeholder-panel.js';
import {
  renderLafeaEngineeringEvidenceDrawer,
  revealLafeaGuidedTarget,
} from './lafea-workbench-evidence.js';
import { focusLafeaRetainedMeshElement } from './lafea-canvas/retained-mesh-overlay.js';

export function renderLafeaWorkbenchContent(root, state, stage, options) {
  const workflow = buildLafeaGuidedWorkflow(state);
  const discretization = buildLafeaDiscretizationViewModel(stage);
  const shell = element(root, 'div', 'lafea-guided-shell');
  const navHost = element(root, 'aside', 'lafea-guided-shell__nav');
  const main = element(root, 'div', 'lafea-guided-shell__main');
  shell.append(navHost, main);

  let activeViewport = null;
  renderLafeaGuidedWorkflow(navHost, workflow, (step) => {
    const target = shell.querySelector(`[data-guided-target="${step.focusTarget}"]`);
    if (revealLafeaGuidedTarget(target)) return;
    options.onNavigateTarget?.(step.focusTarget);
  });

  const engineeringOverview = renderLafeaEngineeringOverview(
    root,
    stage,
    options.registryEntry,
    { onRun: options.handlers.onRun },
  );
  engineeringOverview.dataset.guidedTarget = 'engineering-overview';

  const nextActionBanner = renderNextActionBanner(
    root,
    stage,
    discretization,
    workflow,
    options,
    shell,
  );

  const sourceCard = card(root, 'Model inputs');
  sourceCard.section.dataset.guidedTarget = 'source';
  sourceCard.body.append(element(
    root,
    'p',
    'lafea-workbench__section-intro',
    'Define the governed geometry, material, restraints, load cases and units here. Advanced raw JSON remains available for whole-document inspection.',
  ));
  sourceCard.body.append(renderDocumentTableEditor(
    sourceCard.body,
    state.activeStageId,
    stage.document,
    {
      onSetScalar: options.handlers.onSetScalar,
      onApplyJson: options.handlers.onApplyJson,
    },
  ));

  const profileCard = card(root, 'Solver and analysis settings');
  profileCard.section.dataset.guidedTarget = 'profile';
  profileCard.body.append(renderLafeaAnalysisSettings(
    profileCard.body,
    stage,
    options.registryEntry,
    options.handlers,
  ));

  const viewportCard = card(root, 'Engineering viewport');
  viewportCard.section.dataset.guidedTarget = 'viewport';
  viewportCard.section.classList.add('lafea-cae-workspace__viewport-card');
  const reusedViewport = validReusableViewport(options.reusedViewport);
  const preview = reusedViewport?.element ?? element(root, 'div', 'lafea-workbench__svg');
  const retainedMeshEvidence = stage.domainFirstProfileActive === true
    || stage.shellMidsurfaceProfileActive === true
    ? stage.retainedAnalysisMeshEvidenceV2 ?? null
    : stage.retainedAnalysisMeshEvidence ?? null;
  activeViewport = reusedViewport?.viewport ?? mountLafeaLiveWorkbenchViewport(preview, {
    stageId: state.activeStageId,
    document: stage.document,
    lifecycle: stage.lifecycle,
    lifecycleBinding: stage.lifecycleBinding,
    sceneRevision: options.sceneRevision,
    renderPacket: options.renderPacket,
    selection: options.selection,
    THREE: options.THREE,
    cssWidth: 760,
    cssHeight: 440,
    devicePixelRatio: 1,
    onMoveNode: options.registryEntry.previewSource.editable
      ? options.handlers.onMoveNode
      : undefined,
    onSelectionChange: options.onSelectionChange,
    retainedMeshEvidence: stage.analysisMeshCustodyProjection?.canView
      ? retainedMeshEvidence
      : null,
    analysisMeshCustodyState: stage.analysisMeshCustodyProjection?.state ?? null,
    focusedMeshElementId: options.focusedMeshElementId,
    onFocusMeshElement: options.onMeshFocusChange,
  });
  viewportCard.body.append(
    viewportModePanel(root, activeViewport.getState(), retainedMeshEvidence, stage),
    preview,
  );
  if (!activeViewport.scene.sourcePrimitives.length) {
    viewportCard.body.append(element(
      root,
      'p',
      'lafea-workbench-svg__empty',
      'No explicit source geometry is available for this stage. No geometry or mesh has been synthesized.',
    ));
  }
  viewportCard.body.append(truthPanel(root, options.registryEntry));

  const discretizationCard = card(root, 'Meshing and discretization');
  discretizationCard.section.dataset.guidedTarget = 'discretization';
  discretizationCard.section.classList.add('lafea-cae-workspace__inspector-card');
  const discretizationHost = element(root, 'div');
  renderLafeaDiscretizationPanel(discretizationHost, discretization, {
    onImportEvidence: options.handlers.onImportMeshEvidence,
    onValidateEvidence: options.handlers.onValidateMeshEvidence,
    onExportEvidence: options.handlers.onExportMeshEvidence,
    onBindMeshProfile: options.handlers.onBindMeshProfile,
    onPlanMesh: options.handlers.onPlanMesh,
    onGenerateMesh: options.handlers.onGenerateMesh,
    onRefineMesh: options.handlers.onRefineMesh,
    onFocusElement: (elementId) => {
      options.onMeshFocusChange?.(elementId, true);
      focusLafeaRetainedMeshElement(preview, elementId);
    },
    onAdvance: () => {
      if (stage.stageId === 'LAFEA.3'
        && stage.domainFirstProfileActive === true
        && stage.preparationProjection?.state !== 'CURRENT_PASS') {
        return options.handlers.onPrepareContinuum?.();
      }
      return navigateTo(shell, 'findings');
    },
  });
  compactLafeaRefinementWorkspace(discretizationHost, discretization);
  discretizationCard.body.append(discretizationHost);

  const numericalCard = card(root, 'Numerical verification');
  numericalCard.section.dataset.guidedTarget = 'numerical-verification';
  numericalCard.body.append(renderLafeaNumericalVerification(numericalCard.body, stage));

  const preflightCard = card(root, 'Solve readiness');
  preflightCard.section.dataset.guidedTarget = 'findings';
  preflightCard.section.classList.add('lafea-cae-workspace__inspector-card');
  preflightCard.body.append(renderLafeaSolveReadiness(
    preflightCard.body,
    workflow,
    Array.isArray(state.diagnostics) ? state.diagnostics : [],
  ));

  const evidenceCard = card(root, 'Analysis results');
  evidenceCard.section.dataset.guidedTarget = 'results';
  evidenceCard.body.append(renderLafeaEvidence(
    root,
    state.activeStageId,
    stage.document,
    state,
    stage.execution,
  ));

  const lifecycleCard = card(root, 'Engineering evidence and lineage');
  lifecycleCard.section.dataset.guidedTarget = 'lineage';
  lifecycleCard.body.append(renderLafeaLifecyclePanel(
    lifecycleCard.body,
    state.activeStageId,
    stage,
  ));

  const ncCard = card(root, 'NC governance — evidence placeholders');
  ncCard.body.append(renderLafeaNcPlaceholderPanel(ncCard.body));

  const caeWorkspace = element(root, 'section', 'lafea-cae-workspace');
  caeWorkspace.dataset.role = 'lafea-cae-workspace';
  const viewportPane = element(root, 'div', 'lafea-cae-workspace__viewport');
  const inspectorPane = element(root, 'aside', 'lafea-cae-workspace__inspector');
  viewportPane.append(viewportCard.section);
  inspectorPane.append(discretizationCard.section, preflightCard.section);
  caeWorkspace.append(viewportPane, inspectorPane);

  const context = element(root, 'section', 'lafea-cae-workspace__context');
  context.dataset.role = 'lafea-cae-workspace-context';
  context.append(
    sourceCard.section,
    profileCard.section,
    evidenceCard.section,
    renderLafeaEngineeringEvidenceDrawer(
      root,
      [numericalCard.section, lifecycleCard.section, ncCard.section],
      options.benchmarkHost,
    ),
  );

  main.append(nextActionBanner, engineeringOverview, caeWorkspace, context);

  return Object.freeze({
    element: shell,
    viewport: activeViewport,
    viewportElement: preview,
    viewportReused: Boolean(reusedViewport),
    workflow,
    discretization,
  });
}

function viewportModePanel(root, viewportState, retainedMeshEvidence, stage) {
  const panel = element(root, 'div', 'lafea-viewport-mode-panel');
  panel.dataset.role = 'lafea-viewport-mode-panel';
  const mode = viewportState?.mode ?? 'SOURCE_AUTHORING';
  const renderer = viewportState?.renderer ?? 'SVG';
  const meshCount = Array.isArray(retainedMeshEvidence?.mesh?.elements)
    ? retainedMeshEvidence.mesh.elements.length
    : 0;
  panel.append(
    viewportMode(root, 'Geometry', stage.document ? 'Available' : 'Not available', mode === 'SOURCE_AUTHORING'),
    viewportMode(root, 'Mesh', meshCount ? `${meshCount} elements` : 'Not generated', meshCount > 0),
    viewportMode(
      root,
      'Result contour',
      mode === 'QUALIFIED_RESULT' ? `Ready · ${renderer}` : 'Waiting for qualified result',
      mode === 'QUALIFIED_RESULT',
    ),
  );
  return panel;
}

function viewportMode(root, label, value, active) {
  const item = element(root, 'div', 'lafea-viewport-mode-panel__item');
  item.dataset.active = String(active);
  item.append(element(root, 'strong', null, label), element(root, 'span', null, value));
  return item;
}

function renderNextActionBanner(root, stage, discretization, workflow, options, shell) {
  const banner = element(root, 'div', 'lafea-next-action-banner');
  banner.dataset.role = 'lafea-next-action-banner';
  banner.dataset.guidedTarget = 'run';
  banner.dataset.meshUiPhase = discretization.uiPhase;

  if (!stage.document) {
    banner.dataset.intent = 'model';
    banner.append(element(root, 'strong', null, 'Step 1: Load a model to begin'));
    return banner;
  }

  if (!discretization.evidence.present) {
    banner.dataset.intent = 'mesh';
    const sourceAdoption = discretization.generation.generationMode === 'SOURCE_MESH_ADOPTION';
    banner.append(element(
      root,
      'strong',
      null,
      meshActionHeading(discretization.uiPhase, sourceAdoption),
    ));
    const btn = element(
      root,
      'button',
      'lafea-next-action-banner__button',
      meshActionLabel(discretization.uiPhase),
    );
    btn.type = 'button';
    btn.title = 'Open the governed meshing controls. This navigation action does not bind a profile or generate a mesh.';
    btn.onclick = () => navigateTo(shell, 'discretization');
    banner.append(btn);
    return banner;
  }

  if (stage.execution?.status !== 'QUALIFIED') {
    banner.dataset.intent = 'solve';
    const runStep = workflow.steps.find((step) => step.stepId === 'RUN');
    const eligible = workflow.runEligibleByCurrentUiGate === true
      && discretization.actions.canRun === true
      && runStep?.status === 'READY';
    banner.dataset.runEligible = String(eligible);
    banner.append(element(
      root,
      'strong',
      null,
      eligible ? 'Step 3: Ready to solve' : 'Step 3: Solve checks pending',
    ));
    const btn = element(root, 'button', 'lafea-next-action-banner__button', 'Run analysis');
    btn.type = 'button';
    btn.disabled = !eligible;
    btn.title = eligible
      ? 'Run the canonically authorized registered stage calculation.'
      : `Run is blocked until current authorization and mesh gates pass${runStep?.reasons?.length ? `: ${lafeaWorkbenchReasonLabels(runStep.reasons).join(' • ')}` : '.'}`;
    btn.onclick = () => options.handlers.onRun?.();
    banner.append(btn);
    return banner;
  }

  banner.dataset.intent = 'results';
  banner.append(element(root, 'strong', null, 'Analysis result retained'));
  const review = element(root, 'button', 'lafea-next-action-banner__button', 'Review retained results');
  review.type = 'button';
  review.title = 'Review retained solver/recovery evidence. Display contours are not substituted for numerical authority.';
  review.onclick = () => navigateTo(shell, 'results');
  banner.append(review);
  return banner;
}

function meshActionHeading(uiPhase, sourceAdoption) {
  if (uiPhase === 'PROFILE_REQUIRED') {
    return sourceAdoption ? 'Step 2: Configure source-mesh adoption' : 'Step 2: Configure analysis mesh';
  }
  if (uiPhase === 'READY_TO_PLAN') return 'Step 2: Mesh profile bound — preview or generate';
  if (uiPhase === 'PLAN_AVAILABLE') return 'Step 2: Mesh plan available for review';
  if (uiPhase === 'PLAN_BLOCKED') return 'Step 2: Mesh plan is blocked by resource limits';
  if (uiPhase === 'PARENT_REQUIRED') return 'Step 2: Geometry parent required before meshing';
  if (uiPhase === 'PRODUCER_UNAVAILABLE') return 'Step 2: Qualified mesh producer unavailable';
  return 'Step 2: Review meshing prerequisites';
}

function meshActionLabel(uiPhase) {
  if (uiPhase === 'PROFILE_REQUIRED') return 'Configure mesh';
  if (uiPhase === 'PLAN_AVAILABLE' || uiPhase === 'PLAN_BLOCKED') return 'Review mesh plan';
  return 'Open mesh controls';
}

function validReusableViewport(value) {
  if (!value || typeof value !== 'object') return null;
  if (!value.viewport?.scene || !value.element?.ownerDocument) return null;
  return value;
}

function truthPanel(root, registryEntry) {
  const section = element(root, 'details', 'lafea-workbench__truth');
  section.append(element(root, 'summary', null, 'Solver authority and current limitations'));
  section.append(
    element(
      root,
      'p',
      null,
      `Declared engine: ${registryEntry.enginePackage ? `src/core/${registryEntry.enginePackage}` : 'NONE'}`,
    ),
    element(root, 'p', null, `Authority: ${registryEntry.authority}`),
  );
  const limitations = element(root, 'ul');
  registryEntry.limitations.forEach((value) => limitations.append(element(root, 'li', null, value)));
  section.append(limitations);
  return section;
}

function navigateTo(shell, targetName) {
  const target = shell.querySelector(`[data-guided-target="${targetName}"]`);
  revealLafeaGuidedTarget(target);
}
