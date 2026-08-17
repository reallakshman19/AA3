/** Analytical presentation for retained LAFEA.1/LAFEA.2 calculators. */
import { actionButton, card, element } from './lafea-workbench-dom.js';
import { renderDocumentTableEditor } from './lafea-document-table.js';
import { renderLafeaAnalysisSettings } from './lafea-analysis-settings-view.js';
import { renderLafeaEvidence } from './lafea-results-view.js';
import { renderLafeaLifecyclePanel } from './lafea-lifecycle-panel.js';
import { renderLafeaCorrelationAvailability } from './lafea-correlation-availability-view.js';
import { lafeaDocumentDigest } from './lafea-edit-command.js';
import {
  applyLafeaScreeningTermFactorCommand,
  createLafeaScreeningTermFactorCommand,
} from './lafea-screening-term-edit.js';

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

  const screeningCustody = foundation ? null : screeningLoadCustody(
    root,
    stage.document,
    options.handlers.onApplyJson,
  );
  const correlationAvailability = foundation
    ? null
    : renderLafeaCorrelationAvailability(root, stage);

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
  if (correlationAvailability) shell.append(correlationAvailability);
  shell.append(settings.section, results.section, lineage.section);

  if (options.benchmarkHost) {
    const benchmark = card(root, 'Analytical verification output');
    benchmark.body.append(options.benchmarkHost);
    shell.append(benchmark.section);
  }

  return Object.freeze({ element: shell, viewport: null, viewportElement: null,
    viewportReused: false, workflow: null, discretization: null });
}

function screeningLoadCustody(root, documentValue, onApplyJson) {
  const custody = card(root, 'Inherited LAFEA.1 load custody');
  custody.section.dataset.role = 'lafea-screening-load-custody';
  custody.section.dataset.guidedTarget = 'screening-load-custody';
  custody.body.append(element(
    root,
    'p',
    'lafea-workbench__section-intro',
    'LAFEA.2 does not invent attachment resultants. Each mechanical term references an exact retained LAFEA.1 loadCaseId. Term factors are editable only through the screeningCaseId + loadCaseId nested-identity command below; array position is never engineering authority.',
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
    screeningTermsTable(root, documentValue, screeningCases, onApplyJson),
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

function screeningTermsTable(root, documentValue, screeningCases, onApplyJson) {
  const wrapper = element(root, 'div', 'lafea-screening-custody__terms');
  wrapper.append(element(root, 'h4', null, 'Screening-case mechanical terms'));
  if (!screeningCases.length) {
    wrapper.append(element(root, 'p', 'lafea-workbench-svg__empty',
      'No screening cases are available.'));
    return wrapper;
  }
  const table = element(root, 'table', 'lafea-result-table');
  const head = element(root, 'tr');
  ['Screening case', 'Load case', 'Factor', 'Pressure definition', 'Pressure factor', 'Action']
    .forEach((label) => {
      const cell = element(root, 'th', null, label);
      cell.scope = 'col';
      head.append(cell);
    });
  table.append(head);

  screeningCases.forEach((screeningCase) => {
    const screeningCaseId = String(screeningCase?.screeningCaseId ?? '');
    const terms = Array.isArray(screeningCase?.mechanicalTerms)
      ? screeningCase.mechanicalTerms
      : [];
    if (!terms.length) {
      const row = element(root, 'tr');
      const identity = element(root, 'th', null, screeningCaseId || 'UNRESOLVED_SCREENING_CASE');
      identity.scope = 'row';
      row.append(
        identity,
        element(root, 'td', null, 'No mechanical terms'),
        element(root, 'td', null, '—'),
        element(root, 'td', null, String(screeningCase?.pressureDefinitionId ?? '—')),
        element(root, 'td', null, engineeringNumber(screeningCase?.pressureFactor)),
        element(root, 'td', null, '—'),
      );
      table.append(row);
      return;
    }

    terms.forEach((term) => {
      const loadCaseId = String(term?.loadCaseId ?? '');
      const row = element(root, 'tr');
      row.dataset.screeningCaseId = screeningCaseId;
      row.dataset.loadCaseId = loadCaseId;
      const identity = element(root, 'th', null, screeningCaseId || 'UNRESOLVED_SCREENING_CASE');
      identity.scope = 'row';
      const factorCell = element(root, 'td');
      const factor = element(root, 'input');
      factor.type = 'text';
      factor.inputMode = 'decimal';
      factor.autocomplete = 'off';
      factor.value = engineeringNumber(term?.factor);
      factor.dataset.role = 'lafea-screening-term-factor';
      factor.dataset.screeningCaseId = screeningCaseId;
      factor.dataset.loadCaseId = loadCaseId;
      factor.setAttribute('aria-label', `Mechanical factor ${screeningCaseId} ${loadCaseId}`);
      factorCell.append(factor);

      const actionCell = element(root, 'td');
      const apply = actionButton(root, 'Apply factor', () => {
        factor.setCustomValidity('');
        const command = createLafeaScreeningTermFactorCommand({
          commandId: screeningTermCommandId(documentValue, screeningCaseId, loadCaseId),
          expectedDocumentDigest: lafeaDocumentDigest(documentValue),
          screeningCaseId,
          loadCaseId,
          rawText: factor.value,
          origin: {
            surface: 'LAFEA2_SCREENING_TERM_FORM',
            sessionId: 'LAFEA_WORKBENCH_SESSION',
            sequence: 0,
          },
        });
        const editResult = applyLafeaScreeningTermFactorCommand(documentValue, command);
        if (!['APPLIED', 'NO_CHANGE'].includes(editResult.status)) {
          const diagnostic = editResult.diagnostics?.[0];
          factor.setCustomValidity(diagnostic?.message ?? 'Mechanical-term factor edit was rejected.');
          factor.reportValidity();
          return;
        }
        if (editResult.status === 'APPLIED') {
          onApplyJson(JSON.stringify(editResult.document));
        }
      });
      apply.dataset.role = 'lafea-apply-screening-term-factor';
      apply.dataset.screeningCaseId = screeningCaseId;
      apply.dataset.loadCaseId = loadCaseId;
      actionCell.append(apply);

      row.append(
        identity,
        element(root, 'td', null, loadCaseId || 'UNRESOLVED_LOAD_CASE'),
        factorCell,
        element(root, 'td', null, String(screeningCase?.pressureDefinitionId ?? '—')),
        element(root, 'td', null, engineeringNumber(screeningCase?.pressureFactor)),
        actionCell,
      );
      table.append(row);
    });
  });
  wrapper.append(table);
  return wrapper;
}

function screeningTermCommandId(documentValue, screeningCaseId, loadCaseId) {
  const revision = lafeaDocumentDigest(documentValue).replace(/[^a-zA-Z0-9]/gu, '').slice(-12);
  return `LAFEA2-TERM-${screeningCaseId}-${loadCaseId}-${revision}`;
}

function engineeringNumber(value) {
  if (!Number.isFinite(value)) return '—';
  return Number(value.toPrecision(8)).toString();
}
