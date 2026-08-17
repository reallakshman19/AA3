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

  const screeningCustody = foundation ? null : screeningLoadCustody(root, stage.document);

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
  shell.append(route.section, source.section);
  if (screeningCustody) shell.append(screeningCustody);
  shell.append(settings.section, results.section, lineage.section);

  if (options.benchmarkHost) {
    const benchmark = card(root, 'Analytical verification output');
    benchmark.body.append(options.benchmarkHost);
    shell.append(benchmark.section);
  }

  return Object.freeze({ element: shell, viewport: null, viewportElement: null,
    viewportReused: false, workflow: null, discretization: null });
}

function screeningLoadCustody(root, documentValue) {
  const custody = card(root, 'Inherited LAFEA.1 load custody');
  custody.section.dataset.role = 'lafea-screening-load-custody';
  custody.section.dataset.guidedTarget = 'screening-load-custody';
  custody.body.append(element(
    root,
    'p',
    'lafea-workbench__section-intro',
    'LAFEA.2 does not invent attachment resultants. The screening cases below reference retained LAFEA.1 transformed load cases. Current term factors are shown read-only here; changing nested term factors remains blocked until an identity-based edit command is registered.',
  ));
  if (!documentValue || typeof documentValue !== 'object') {
    custody.body.append(element(root, 'p', 'lafea-workbench-svg__empty',
      'Load custody becomes available after a valid LAFEA.2 source document is loaded.'));
    return custody.section;
  }

  const sourceResult = documentValue.sourceEvidence?.foundationResult;
  const loadCases = Array.isArray(sourceResult?.transformedLoadCases)
    ? sourceResult.transformedLoadCases
    : [];
  const screeningCases = Array.isArray(documentValue.screeningCases)
    ? documentValue.screeningCases
    : [];
  const canonicalUnits = documentValue.sourceEvidence?.foundationModel?.units?.canonical ?? {};
  const forceUnit = canonicalUnits.force ?? 'force';
  const momentUnit = canonicalUnits.moment ?? 'moment';

  custody.body.append(
    resultantsTable(root, loadCases, forceUnit, momentUnit),
    screeningTermsTable(root, screeningCases),
  );
  return custody.section;
}

function resultantsTable(root, loadCases, forceUnit, momentUnit) {
  const wrapper = element(root, 'div', 'lafea-screening-custody__resultants');
  wrapper.append(element(root, 'h4', null, 'Retained transformed resultants'));
  if (!loadCases.length) {
    wrapper.append(element(root, 'p', 'lafea-workbench-svg__empty',
      'No retained LAFEA.1 transformed load cases are available.'));
    return wrapper;
  }
  const table = element(root, 'table', 'lafea-result-table');
  const head = element(root, 'tr');
  ['Load case', `Fx (${forceUnit})`, `Fy (${forceUnit})`, `Fz (${forceUnit})`,
    `Mx (${momentUnit})`, `My (${momentUnit})`, `Mz (${momentUnit})`]
    .forEach((label) => {
      const cell = element(root, 'th', null, label);
      cell.scope = 'col';
      head.append(cell);
    });
  table.append(head);
  loadCases.forEach((loadCase) => {
    const force = Array.isArray(loadCase?.transformedForceLocal)
      ? loadCase.transformedForceLocal
      : [];
    const moment = Array.isArray(loadCase?.transformedMomentLocal)
      ? loadCase.transformedMomentLocal
      : [];
    const row = element(root, 'tr');
    const identity = element(root, 'th', null, String(loadCase?.identity ?? 'UNRESOLVED_LOAD_CASE'));
    identity.scope = 'row';
    row.append(identity);
    [...force.slice(0, 3), ...moment.slice(0, 3)].forEach((value) => {
      row.append(element(root, 'td', null, engineeringNumber(value)));
    });
    table.append(row);
  });
  wrapper.append(table);
  return wrapper;
}

function screeningTermsTable(root, screeningCases) {
  const wrapper = element(root, 'div', 'lafea-screening-custody__terms');
  wrapper.append(element(root, 'h4', null, 'Screening-case mechanical terms'));
  if (!screeningCases.length) {
    wrapper.append(element(root, 'p', 'lafea-workbench-svg__empty',
      'No screening cases are available.'));
    return wrapper;
  }
  const table = element(root, 'table', 'lafea-result-table');
  const head = element(root, 'tr');
  ['Screening case', 'Mechanical terms', 'Pressure definition', 'Pressure factor']
    .forEach((label) => {
      const cell = element(root, 'th', null, label);
      cell.scope = 'col';
      head.append(cell);
    });
  table.append(head);
  screeningCases.forEach((screeningCase) => {
    const row = element(root, 'tr');
    const identity = element(root, 'th', null,
      String(screeningCase?.screeningCaseId ?? 'UNRESOLVED_SCREENING_CASE'));
    identity.scope = 'row';
    const terms = Array.isArray(screeningCase?.mechanicalTerms)
      ? screeningCase.mechanicalTerms
      : [];
    row.append(
      identity,
      element(root, 'td', null, terms.length
        ? terms.map((term) => `${term.loadCaseId} × ${engineeringNumber(term.factor)}`).join(' + ')
        : 'No mechanical terms'),
      element(root, 'td', null, String(screeningCase?.pressureDefinitionId ?? '—')),
      element(root, 'td', null, engineeringNumber(screeningCase?.pressureFactor)),
    );
    table.append(row);
  });
  wrapper.append(table);
  return wrapper;
}

function engineeringNumber(value) {
  if (!Number.isFinite(value)) return '—';
  return Number(value.toPrecision(8)).toString();
}
