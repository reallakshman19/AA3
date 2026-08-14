/**
 * Analytical-only presentation for the retained LAFEA.2 screening calculator.
 *
 * This view intentionally has no geometry viewport, FE mesh/discretization,
 * element controls, contour controls, or convergence UI. The underlying
 * LAFEA.2 analytical source/calculation/evidence contracts remain unchanged;
 * only their user-facing placement is separated from the FEA-stage workbench.
 */
import { card, element } from './lafea-workbench-dom.js';
import { renderDocumentTableEditor } from './lafea-document-table.js';
import { renderLafeaAnalysisSettings } from './lafea-analysis-settings-view.js';
import { renderLafeaEvidence } from './lafea-results-view.js';
import { renderLafeaLifecyclePanel } from './lafea-lifecycle-panel.js';
import { lafeaWorkbenchReasonLabels } from './lafea-workbench-reason-labels.js';

export function renderLafeaAnalyticalCalcContent(root, state, stage, options) {
  const shell = element(root, 'div', 'lafea-analytical-calc');
  shell.dataset.role = 'lafea-analytical-calc';
  shell.dataset.backingStageId = 'LAFEA.2';

  const scopeCard = card(root, 'Analytical calculation scope');
  scopeCard.section.dataset.guidedTarget = 'analytical-scope';
  scopeCard.body.append(
    element(
      root,
      'p',
      'lafea-workbench__section-intro',
      'Nominal far-field pipe-section screening is calculated by the retained analytical LAFEA.2 kernel. This tab is not a finite-element stage and does not create or display an FE mesh.',
    ),
    analyticalScopeFacts(root, options.registryEntry),
  );

  const sourceCard = card(root, 'Analytical inputs');
  sourceCard.section.dataset.guidedTarget = 'source';
  sourceCard.body.append(element(
    root,
    'p',
    'lafea-workbench__section-intro',
    'Edit the governed screening cases, evaluation locations, units, material/section inputs and load references used by the analytical calculation. No display-only geometry is used as calculation input.',
  ));
  sourceCard.body.append(renderDocumentTableEditor(
    sourceCard.body,
    'LAFEA.2',
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
  resultsCard.body.append(renderLafeaEvidence(
    root,
    'LAFEA.2',
    stage.document,
    state,
    stage.execution,
  ));

  const lineageCard = card(root, 'Analytical evidence and lineage');
  lineageCard.section.dataset.guidedTarget = 'lineage';
  lineageCard.body.append(renderLafeaLifecyclePanel(
    lineageCard.body,
    'LAFEA.2',
    stage,
  ));

  shell.append(
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
        'Verification output remains evidence for the analytical screening route only. It does not establish finite-element, local-discontinuity, code, or release authority.',
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

function analyticalScopeFacts(root, registryEntry) {
  const list = element(root, 'dl', 'lafea-lifecycle-panel__readiness');
  const rows = [
    ['Route', 'ANALYTICAL'],
    ['Registered engine', registryEntry?.enginePackage ? `src/core/${registryEntry.enginePackage}` : 'Not registered'],
    ['Authority', registryEntry?.authority ?? 'Not declared'],
    ['FE mesh', 'NOT APPLICABLE'],
    ['FE viewport', 'NOT APPLICABLE'],
    ['Local discontinuity stress', 'NOT AUTHORIZED'],
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
