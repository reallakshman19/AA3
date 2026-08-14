/** Analytical-only presentation for retained LAFEA.1/LAFEA.2 calculators. */
import { actionButton, card, element } from './lafea-workbench-dom.js';
import { renderDocumentTableEditor } from './lafea-document-table.js';
import { renderLafeaAnalysisSettings } from './lafea-analysis-settings-view.js';
import { renderLafeaEvidence } from './lafea-results-view.js';
import { renderLafeaLifecyclePanel } from './lafea-lifecycle-panel.js';
import { lafeaWorkbenchReasonLabels } from './lafea-workbench-reason-labels.js';

const ANALYTICAL_STAGE_IDS = Object.freeze(['LAFEA.1', 'LAFEA.2']);

export function renderLafeaAnalyticalCalcContent(root, state, stage, options) {
  const stageId = stage?.stageId;
  assertAnalyticalStage(stageId);
  const foundation = stageId === 'LAFEA.1';
  const label = foundation ? 'Attachment foundation' : 'Pipe-section screening';
  const shell = element(root, 'div', 'lafea-analytical-calc');
  shell.dataset.role = 'lafea-analytical-calc';
  shell.dataset.backingStageId = stageId;
  shell.dataset.routeFamily = 'ANALYTICAL';

  const routeCard = card(root, 'Analytical route');
  routeCard.section.dataset.guidedTarget = 'analytical-route';
  const heading = element(
    root,
    'h3',
    null,
    foundation
      ? 'LAFEA.1 — attachment foundation analytical calculation'
      : 'LAFEA.2 — nominal pipe-section analytical/screening calculation',
  );
  heading.dataset.role = 'lafea-analytical-route-heading';
  routeCard.body.append(
    routeSelector(root, stageId, options.onSelectRoute),
    heading,
    element(root, 'p', 'lafea-workbench__section-intro',
      'Analytical Calc owns LAFEA.1 and LAFEA.2; neither is presented as a finite-element stage.'),
  );

  const scopeCard = card(root, 'Analytical calculation scope');
  scopeCard.section.dataset.guidedTarget = 'analytical-scope';
  scopeCard.body.append(
    element(root, 'p', 'lafea-workbench__section-intro', `${foundation
      ? 'Attachment load transfer and elastic pressure baseline use the retained LAFEA.1 analytical kernel.'
      : 'Nominal far-field pipe-section response uses the retained LAFEA.2 screening kernel.'} This tab is not a finite-element stage and does not create or display an FE mesh.`),
    scopeFacts(root, stageId, label, foundation, options.registryEntry),
  );

  const sourceCard = card(root, 'Analytical inputs');
  sourceCard.section.dataset.guidedTarget = 'source';
  sourceCard.body.append(
    element(root, 'p', 'lafea-workbench__section-intro', foundation
      ? 'Edit governed materials, pressure definitions, load-reference points, load cases and units. Display-only source points are not an FE mesh.'
      : 'Edit governed screening cases and evaluation locations. This route has no geometry or mesh authority and does not represent local discontinuity stress.'),
    renderDocumentTableEditor(sourceCard.body, stageId, stage.document, {
      onSetScalar: options.handlers.onSetScalar,
      onApplyJson: options.handlers.onApplyJson,
    }),
  );

  const settingsCard = card(root, 'Calculation contract and settings');
  settingsCard.section.dataset.guidedTarget = 'profile';
  settingsCard.body.append(renderLafeaAnalysisSettings(settingsCard.body, stage, options.registryEntry));

  const readinessCard = card(root, 'Calculation readiness');
  readinessCard.section.dataset.guidedTarget = 'findings';
  readinessCard.body.append(analyticalReadiness(root, stage));
  if (state.diagnostics?.length) readinessCard.body.append(diagnosticList(root, state.diagnostics));

  const resultsCard = card(root, 'Analytical results');
  resultsCard.section.dataset.guidedTarget = 'results';
  resultsCard.body.append(
    element(root, 'p', 'lafea-workbench__section-intro', foundation
      ? 'Results are attachment-foundation analytical evidence only; no local FE attachment-stress authority is claimed.'
      : 'Results are nominal pipe-section screening evidence only; no local discontinuity or attachment-stress authority is claimed.'),
    renderLafeaEvidence(root, stageId, stage.document, state, stage.execution),
  );

  const lineageCard = card(root, 'Analytical evidence and lineage');
  lineageCard.section.dataset.guidedTarget = 'lineage';
  lineageCard.body.append(renderLafeaLifecyclePanel(lineageCard.body, stageId, stage));
  shell.append(routeCard.section, scopeCard.section, sourceCard.section, settingsCard.section,
    readinessCard.section, resultsCard.section, lineageCard.section);

  if (options.benchmarkHost) {
    const benchmarkCard = card(root, 'Analytical verification output');
    benchmarkCard.body.append(
      element(root, 'p', null,
        `Verification output is evidence for ${stageId} ${label} only; it grants no finite-element, shell, weld, code or release authority.`),
      options.benchmarkHost,
    );
    shell.append(benchmarkCard.section);
  }

  return Object.freeze({ element: shell, viewport: null, viewportElement: null,
    viewportReused: false, workflow: null, discretization: null });
}

function routeSelector(root, activeStageId, onSelectRoute) {
  const section = element(root, 'div', 'lafea-guided-summary');
  section.dataset.role = 'lafea-analytical-route-selector';
  ANALYTICAL_STAGE_IDS.forEach((stageId) => {
    const button = actionButton(root,
      `${stageId} — ${stageId === 'LAFEA.1' ? 'Attachment foundation' : 'Pipe-section screening'}`,
      () => onSelectRoute?.(stageId));
    button.dataset.analyticalRouteId = stageId;
    button.setAttribute('aria-current', stageId === activeStageId ? 'page' : 'false');
    section.append(button);
  });
  return section;
}

function scopeFacts(root, stageId, label, foundation, registryEntry) {
  const list = element(root, 'dl', 'lafea-lifecycle-panel__readiness');
  [
    ['Route family', 'ANALYTICAL'], ['Route identity', stageId], ['Calculation', label],
    ['Registered engine', registryEntry?.enginePackage ? `src/core/${registryEntry.enginePackage}` : 'Not registered'],
    ['Authority', registryEntry?.authority ?? 'Not declared'], ['FE mesh', 'NOT APPLICABLE'],
    ['FE viewport', 'NOT APPLICABLE'],
    [foundation ? 'Local attachment stress' : 'Local discontinuity / attachment stress', 'NOT AUTHORIZED'],
  ].forEach(([name, value]) => list.append(element(root, 'dt', null, name), element(root, 'dd', null, value)));
  return list;
}

function analyticalReadiness(root, stage) {
  const section = element(root, 'div', 'lafea-guided-summary');
  const orchestration = stage.orchestration?.sections ?? {};
  [['Source', orchestration.SOURCE], ['Model', orchestration.MODEL],
    ['Preparation', orchestration.PREPARATION], ['Authorization', orchestration.AUTHORIZATION],
    ['Execution', orchestration.EXECUTION], ['Results', orchestration.RESULTS]].forEach(([label, value]) => {
    const row = element(root, 'div', 'lafea-guided-summary__row');
    const status = value?.state ?? 'UNAVAILABLE';
    const reasons = Array.isArray(value?.reasons) ? lafeaWorkbenchReasonLabels(value.reasons) : [];
    row.dataset.status = status;
    row.append(element(root, 'strong', null, `${label}: ${status}`),
      element(root, 'span', null, reasons.length ? ` — ${reasons.join(' • ')}` : ''));
    section.append(row);
  });
  return section;
}

function diagnosticList(root, diagnostics) {
  const section = element(root, 'section');
  section.dataset.role = 'lafea-diagnostics';
  section.append(element(root, 'h3', null, 'Current findings'));
  const list = element(root, 'ul');
  diagnostics.forEach((item) => list.append(element(root, 'li', null,
    `${item.severity ?? 'INFO'} ${item.code ?? 'UNKNOWN'} — ${item.message ?? ''}`)));
  section.append(list);
  return section;
}

function assertAnalyticalStage(stageId) {
  if (!ANALYTICAL_STAGE_IDS.includes(stageId)) throw new TypeError(`LAFEA_ANALYTICAL_ROUTE_UNSUPPORTED:${stageId}`);
}
