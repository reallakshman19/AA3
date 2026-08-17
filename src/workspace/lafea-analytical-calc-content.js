/** Analytical presentation for retained LAFEA.1/LAFEA.2 calculators. */
import { actionButton, card, element } from './lafea-workbench-dom.js';
import { renderDocumentTableEditor } from './lafea-document-table.js';
import { renderLafeaAnalysisSettings } from './lafea-analysis-settings-view.js';
import { renderLafeaEvidence } from './lafea-results-view.js';
import { renderLafeaLifecyclePanel } from './lafea-lifecycle-panel.js';

const ROUTES = Object.freeze(['LAFEA.1', 'LAFEA.2']);

export function renderLafeaAnalyticalCalcContent(root, state, stage, options) {
  const stageId = stage?.stageId;
  if (!ROUTES.includes(stageId)) throw new TypeError(`LAFEA_ANALYTICAL_ROUTE_UNSUPPORTED:${stageId}`);
  const foundation = stageId === 'LAFEA.1';
  const shell = element(root, 'div', 'lafea-analytical-calc');
  shell.dataset.role = 'lafea-analytical-calc';
  shell.dataset.backingStageId = stageId;
  shell.dataset.routeFamily = 'ANALYTICAL';

  const route = card(root, 'Analytical stage');
  route.section.dataset.guidedTarget = 'analytical-route';
  const selector = element(root, 'div', 'lafea-guided-summary');
  selector.dataset.role = 'lafea-analytical-route-selector';
  ROUTES.forEach((id) => {
    const button = actionButton(root,
      `${id} — ${id === 'LAFEA.1' ? 'Attachment foundation' : 'Pipe-section screening'}`,
      () => options.onSelectRoute?.(id));
    button.dataset.analyticalRouteId = id;
    button.setAttribute('aria-current', id === stageId ? 'page' : 'false');
    selector.append(button);
  });
  const heading = element(root, 'h3', null, foundation
    ? 'LAFEA.1 — attachment foundation analytical calculation'
    : 'LAFEA.2 — nominal pipe-section analytical/screening calculation');
  heading.dataset.role = 'lafea-analytical-route-heading';
  route.body.append(selector, heading,
    element(root, 'p', 'lafea-workbench__section-intro',
      'LAFEA.1 and LAFEA.2 are analytical LAFEA stages. They do not create or display an FE mesh; LAFEA.3 and later stages provide the registered finite-element routes.'));

  const source = card(root, 'Analytical inputs');
  source.section.dataset.guidedTarget = 'source';
  source.body.append(renderDocumentTableEditor(source.body, stageId, stage.document, {
    onSetScalar: options.handlers.onSetScalar,
    onApplyJson: options.handlers.onApplyJson,
  }));

  const settings = card(root, 'Calculation contract and settings');
  settings.section.dataset.guidedTarget = 'profile';
  settings.body.append(renderLafeaAnalysisSettings(settings.body, stage, options.registryEntry));

  const results = card(root, 'Analytical results');
  results.section.dataset.guidedTarget = 'results';
  results.body.append(
    element(root, 'p', 'lafea-workbench__section-intro', foundation
      ? 'Attachment-foundation analytical evidence only; local FE attachment stress is not authorized.'
      : 'Nominal pipe-section screening evidence only; local discontinuity and attachment stress are not authorized.'),
    renderLafeaEvidence(root, stageId, stage.document, state, stage.execution),
  );

  const lineage = card(root, 'Analytical evidence and lineage');
  lineage.section.dataset.guidedTarget = 'lineage';
  lineage.body.append(renderLafeaLifecyclePanel(lineage.body, stageId, stage));
  shell.append(route.section, source.section, settings.section, results.section, lineage.section);

  if (options.benchmarkHost) {
    const benchmark = card(root, 'Analytical verification output');
    benchmark.body.append(options.benchmarkHost);
    shell.append(benchmark.section);
  }

  return Object.freeze({ element: shell, viewport: null, viewportElement: null,
    viewportReused: false, workflow: null, discretization: null });
}
