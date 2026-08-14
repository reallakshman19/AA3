/**
 * Analytical-only presentation for retained LAFEA.1/LAFEA.2 calculators.
 *
 * This view intentionally has no geometry viewport, FE mesh/discretization,
 * element controls, contour controls, or convergence UI. The underlying
 * analytical source/calculation/evidence contracts remain unchanged; only
 * their user-facing placement is separated from the FEA-stage workbench.
 */
import { actionButton, card, element } from './lafea-workbench-dom.js';
import { renderDocumentTableEditor } from './lafea-document-table.js';
import { renderLafeaAnalysisSettings } from './lafea-analysis-settings-view.js';
import { renderLafeaEvidence } from './lafea-results-view.js';
import { renderLafeaLifecyclePanel } from './lafea-lifecycle-panel.js';
import { lafeaWorkbenchReasonLabels } from './lafea-workbench-reason-labels.js';

const ANALYTICAL_ROUTE_DEFINITIONS = Object.freeze({
  'LAFEA.1': Object.freeze({
    label: 'Attachment foundation',
    heading: 'LAFEA.1 — attachment foundation analytical calculation',
    scope: 'Attachment load transfer and elastic pressure baseline are calculated by the retained analytical LAFEA.1 kernel.',
    inputHelp: 'Edit the governed materials, pressure definitions, load-reference points, load cases and units used by the analytical foundation calculation. Display-only source points are not an FE mesh and carry no local attachment-stress authority.',
    resultHelp: 'Results remain attachment-foundation analytical evidence only; they do not establish local FE attachment stress.',
    unauthorizedClaim: 'Local attachment stress',
  }),
  'LAFEA.2': Object.freeze({
    label: 'Pipe-section screening',
    heading: 'LAFEA.2 — nominal pipe-section analytical/screening calculation',
    scope: 'Nominal far-field pipe-section response is calculated by the retained analytical LAFEA.2 screening kernel.',
    inputHelp: 'Edit the governed screening cases and evaluation locations used by the nominal pipe-section calculation. The route has no geometry or mesh authority and does not represent local discontinuity or attachment stress.',
    resultHelp: 'Results remain nominal far-field pipe-section screening evidence only; they do not establish local discontinuity or attachment-stress authority.',
    unauthorizedClaim: 'Local discontinuity / attachment stress',
  }),
});

export function renderLafeaAnalyticalCalcContent(root, state, stage, options) {
  const stageId = stage?.stageId;
  const route = analyticalRoute(stageId);
  const shell = element(root, 'div', 'lafea-analytical-calc');
  shell.dataset.role = 'lafea-analytical-calc';
  shell.dataset.backingStageId = stageId;
  shell.dataset.routeFamily = 'ANALYTICAL';

  const routeCard = card(root, 'Analytical route');
  routeCard.section.dataset.guidedTarget = 'analytical-route';
  routeCard.body.append(
    analyticalRouteSelector(root, stageId, options.onSelectRoute),
    element(root, 'h3', null, route.heading),
    element(
      root,
      'p',
      'lafea-workbench__section-intro',
      'Analytical Calc owns the governed analytical routes. LAFEA.1 and LAFEA.2 are not presented as finite-element stages.',
    ),
  );
  routeCard.body.querySelector('h3').dataset.role = 'lafea-analytical-route-heading';

  const scopeCard = card(root, 'Analytical calculation scope');
  scopeCard.section.dataset.guidedTarget = 'analytical-scope';
  scopeCard.body.append(
    element(
      root,
      'p',
      'lafea-workbench__section-intro',
      `${route.scope} This tab is not a finite-element stage and does not create or display an FE mesh.`,
    ),
    analyticalScopeFacts(root, stageId, route, options.registryEntry),
  );

  const sourceCard = card(root, 'Analytical inputs');
  sourceCard.section.dataset.guidedTarget = 'source';
  sourceCard.body.append(element(
    root,
    'p',
    'lafea-workbench__section-intro',
    route.inputHelp,
  ));
  sourceCard.body.append(renderDocumentTableEditor(
    sourceCard.body,
    stageId,
    stage.document,
    {
      onSetScalar: options.handlers.onSetScalar,
      onApplyJson: options.handlers.onApplyJson,
    },
  ));

  const settingsCard = card(root, 'Calculation contract and settings');
  settingsCard.section.dataset.guidedTarget = 'profile';
  settingsCard.body.append(renderLafeaAnalysisSettings(
    settingsCard.body,
    stage,
    options.registryEntry,
  ));

  const readinessCard = card(root, 'Calculation readiness');
  readinessCard.section.dataset.guidedTarget = 'findings';
  readinessCard.body.append(analyticalReadiness(root, stage));
  if (Array.isArray(state.diagnostics) && state.diagnostics.length) {
    readinessCard.body.append(diagnosticList(root, state.diagnostics));
  }

  const resultsCard = card(root, 'Analytical results');
  resultsCard.section.dataset.guidedTarget = 'results';
  resultsCard.body.append(
    element(root, 'p', 'lafea-workbench__section-intro', route.resultHelp),
    renderLafeaEvidence(
      root,
      stageId,
      stage.document,
      state,
      stage.execution,
    ),
  );

  const lineageCard = card(root, 'Analytical evidence and lineage');
  lineageCard.section.dataset.guidedTarget = 'lineage';
  lineageCard.body.append(renderLafeaLifecyclePanel(
    lineageCard.body,
    stageId,
    stage,
  ));

  shell.append(
    routeCard.section,
    scopeCard.section,
    sourceCard.section,
    settingsCard.section,
    readinessCard.section,
    resultsCard.section,
    lineageCard.section,
  );

  if (options.benchmarkHost) {
    const benchmarkCard = card(root, 'Analytical verification output');
    benchmarkCard.body.append(
      element(
        root,
        'p',
        null,
        `Verification output remains evidence for ${stageId} ${route.label} only. It does not establish finite-element, shell, weld, code, or release authority.`,
      ),
      options.benchmarkHost,
    );
    shell.append(benchmarkCard.section);
  }

  return Object.freeze({
    element: shell,
    viewport: null,
    viewportElement: null,
    viewportReused: false,
    workflow: null,
    discretization: null,
  });
}

function analyticalRouteSelector(root, activeStageId, onSelectRoute) {
  const section = element(root, 'div', 'lafea-guided-summary');
  section.dataset.role = 'lafea-analytical-route-selector';
  Object.entries(ANALYTICAL_ROUTE_DEFINITIONS).forEach(([stageId, route]) => {
    const button = actionButton(
      root,
      `${stageId} — ${route.label}`,
      () => onSelectRoute?.(stageId),
    );
    button.dataset.analyticalRouteId = stageId;
    button.setAttribute('aria-current', stageId === activeStageId ? 'page' : 'false');
    section.append(button);
  });
  return section;
}

function analyticalScopeFacts(root, stageId, route, registryEntry) {
  const list = element(root, 'dl', 'lafea-lifecycle-panel__readiness');
  const rows = [
    ['Route family', 'ANALYTICAL'],
    ['Route identity', stageId],
    ['Calculation', route.label],
    ['Registered engine', registryEntry?.enginePackage ? `src/core/${registryEntry.enginePackage}` : 'Not registered'],
    ['Authority', registryEntry?.authority ?? 'Not declared'],
    ['FE mesh', 'NOT APPLICABLE'],
    ['FE viewport', 'NOT APPLICABLE'],
    [route.unauthorizedClaim, 'NOT AUTHORIZED'],
  ];
  rows.forEach(([label, value]) => {
    list.append(
      element(root, 'dt', null, label),
      element(root, 'dd', null, value),
    );
  });
  return list;
}

function analyticalReadiness(root, stage) {
  const section = element(root, 'div', 'lafea-guided-summary');
  const orchestration = stage.orchestration?.sections ?? {};
  const rows = [
    ['Source', orchestration.SOURCE],
    ['Model', orchestration.MODEL],
    ['Preparation', orchestration.PREPARATION],
    ['Authorization', orchestration.AUTHORIZATION],
    ['Execution', orchestration.EXECUTION],
    ['Results', orchestration.RESULTS],
  ];
  rows.forEach(([label, value]) => {
    const row = element(root, 'div', 'lafea-guided-summary__row');
    const status = value?.state ?? 'UNAVAILABLE';
    row.dataset.status = status;
    const reasons = Array.isArray(value?.reasons)
      ? lafeaWorkbenchReasonLabels(value.reasons)
      : [];
    row.append(
      element(root, 'strong', null, `${label}: ${status}`),
      element(root, 'span', null, reasons.length ? ` — ${reasons.join(' • ')}` : ''),
    );
    section.append(row);
  });
  return section;
}

function diagnosticList(root, diagnostics) {
  const section = element(root, 'section');
  section.dataset.role = 'lafea-diagnostics';
  section.append(element(root, 'h3', null, 'Current findings'));
  const list = element(root, 'ul');
  diagnostics.forEach((item) => {
    list.append(element(
      root,
      'li',
      null,
      `${item.severity ?? 'INFO'} ${item.code ?? 'UNKNOWN'} — ${item.message ?? ''}`,
    ));
  });
  section.append(list);
  return section;
}

function analyticalRoute(stageId) {
  const route = ANALYTICAL_ROUTE_DEFINITIONS[stageId];
  if (!route) throw new TypeError(`LAFEA_ANALYTICAL_ROUTE_UNSUPPORTED:${stageId}`);
  return route;
}
