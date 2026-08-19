/** EMP.1 analytical presentation over retained LAFEA.1/LAFEA.2 calculators. */
import { actionButton, card, element } from './lafea-workbench-dom.js';
import { renderDocumentTableEditor } from './lafea-document-table.js';
import { renderLafeaAnalysisSettings } from './lafea-analysis-settings-view.js';
import { renderLafeaEvidence } from './lafea-results-view.js';
import { renderLafeaLifecyclePanel } from './lafea-lifecycle-panel.js';
import { renderLafeaCorrelationAvailability } from './lafea-correlation-availability-view.js';
import { lafeaDocumentDigest } from './lafea-edit-command.js';
import {
  EMP1_PUBLIC_PRODUCT,
  buildEmp1ProductProjection,
  emp1StepForBackingStage,
  isEmp1BackingStage,
} from './emp1-product-projection.js';
import {
  applyLafeaScreeningTermFactorCommand,
  createLafeaScreeningTermFactorCommand,
} from './lafea-screening-term-edit.js';

export function renderLafeaAnalyticalCalcContent(root, state, stage, options) {
  const stageId = stage?.stageId;
  if (!isEmp1BackingStage(stageId)) throw new TypeError(`EMP1_BACKING_ROUTE_UNSUPPORTED:${stageId}`);
  const foundation = stageId === 'LAFEA.1';
  const step = emp1StepForBackingStage(stageId);
  const projection = options.emp1Projection ?? buildEmp1ProductProjection(state);
  const shell = element(root, 'div', 'lafea-analytical-calc');
  shell.dataset.role = 'lafea-analytical-calc';
  shell.dataset.productId = EMP1_PUBLIC_PRODUCT.productId;
  shell.dataset.backingStageId = stageId;
  shell.dataset.emp1Step = step.shortId;
  shell.dataset.routeFamily = 'ANALYTICAL';

  shell.append(emp1Workflow(root, projection, options.onSelectRoute));

  const route = card(root, 'Active EMP.1 step');
  route.section.dataset.guidedTarget = 'analytical-route';
  const scopeStatus = element(
    root,
    'strong',
    'lafea-result-highlights__status',
    `${step.stepId} ${step.label.toUpperCase()} · ${engineeringStatus(state.status)}`,
  );
  scopeStatus.dataset.role = 'lafea-analytical-scope-status';
  scopeStatus.dataset.rawStatus = String(state.status ?? 'UNKNOWN');
  const heading = element(root, 'h3', null, foundation
    ? 'EMP.1.A — load transfer & pressure baseline'
    : 'EMP.1.B — nominal section screening');
  heading.dataset.role = 'lafea-analytical-route-heading';
  heading.dataset.emp1Step = step.shortId;
  const scopeBoundary = element(
    root,
    'p',
    'lafea-workbench__authority',
    foundation
      ? 'Authority: load/reference transfer and elastic pressure baseline only. It does not calculate WRC 107/537 local-attachment stress or establish code compliance.'
      : 'Authority: nominal pipe-section screening only. EMP.1.C local correlation remains separately governed and blocked.',
  );
  scopeBoundary.dataset.role = 'lafea-analytical-scope-boundary';
  route.body.append(
    scopeStatus,
    heading,
    element(root, 'p', 'lafea-workbench__section-intro',
      `Retained backing engine: ${stageId}. EMP.1 is analytical; registered FE routes begin at LAFEA.3.`),
    scopeBoundary,
  );

  const source = card(root, `${step.stepId} inputs`);
  source.section.dataset.guidedTarget = 'source';
  source.body.append(renderDocumentTableEditor(source.body, stageId, stage.document, {
    onSetScalar: options.handlers.onSetScalar,
    onSetScalarBatch: options.handlers.onSetScalarBatch,
    onApplyJson: options.handlers.onApplyJson,
  }));

  const screeningCustody = foundation ? null : screeningLoadCustody(
    root,
    stage.document,
    projection,
    options.handlers.onApplyJson,
  );
  const correlationAvailability = foundation
    ? null
    : renderLafeaCorrelationAvailability(root, stage);

  const settings = card(root, `${step.stepId} calculation contract and settings`);
  settings.section.dataset.guidedTarget = 'profile';
  settings.body.append(renderLafeaAnalysisSettings(settings.body, stage, options.registryEntry));

  const results = card(root, `${step.stepId} results`);
  results.section.dataset.guidedTarget = 'results';
  results.body.append(
    element(root, 'p', 'lafea-workbench__section-intro', foundation
      ? 'EMP.1.A evidence only; local attachment correlation is not authorized.'
      : 'EMP.1.B nominal screening evidence only; EMP.1.C local attachment correlation is not authorized.'),
    renderLafeaEvidence(root, stageId, stage.document, state, stage.execution),
  );

  const lineage = card(root, `${step.stepId} evidence and lineage`);
  lineage.section.dataset.guidedTarget = 'lineage';
  lineage.body.append(renderLafeaLifecyclePanel(lineage.body, stageId, stage));
  shell.append(route.section, source.section);
  if (screeningCustody) shell.append(screeningCustody);
  if (correlationAvailability) shell.append(correlationAvailability);
  shell.append(settings.section, results.section, lineage.section);

  if (options.benchmarkHost) {
    const benchmark = card(root, `${step.stepId} verification output`);
    benchmark.body.append(options.benchmarkHost);
    shell.append(benchmark.section);
  }

  return Object.freeze({ element: shell, viewport: null, viewportElement: null,
    viewportReused: false, workflow: null, discretization: null });
}

function emp1Workflow(root, projection, onSelectRoute) {
  const workflow = card(root, 'Assessment workflow');
  workflow.section.dataset.role = 'emp1-workflow';
  workflow.section.dataset.productId = EMP1_PUBLIC_PRODUCT.productId;
  const overall = element(root, 'strong', 'lafea-result-highlights__status',
    `EMP.1 · ${projection.state.replaceAll('_', ' ')}`);
  overall.dataset.role = 'emp1-product-state';
  workflow.body.append(
    overall,
    element(root, 'p', 'lafea-workbench__section-intro',
      'Work left to right. A and B use retained qualified analytical engines. C stays blocked until WRC source/data and CAUx benchmark qualification are complete.'),
  );

  const nav = element(root, 'nav', 'lafea-workbench__stages');
  nav.setAttribute('aria-label', 'EMP.1 assessment steps');
  projection.steps.forEach((projectedStep) => {
    const label = `${projectedStep.shortId} ${projectedStep.label} · ${projectedStep.state.replaceAll('_', ' ')}`;
    const button = actionButton(root, label, () => {
      if (projectedStep.backingStageId) onSelectRoute(projectedStep.backingStageId);
    });
    button.dataset.role = 'emp1-step';
    button.dataset.emp1Step = projectedStep.shortId;
    button.dataset.emp1StepId = projectedStep.stepId;
    button.dataset.state = projectedStep.state;
    button.setAttribute('aria-current', projection.activeStepId === projectedStep.stepId ? 'step' : 'false');
    if (!projectedStep.backingStageId || !projectedStep.runAuthorized && projectedStep.shortId === 'C') {
      button.disabled = projectedStep.shortId === 'C';
    }
    if (projectedStep.shortId === 'C') {
      button.title = `Blocked: ${projectedStep.blockers.join(', ')}`;
    }
    nav.append(button);
  });
  workflow.body.append(nav);

  const c = projection.steps.find((item) => item.shortId === 'C');
  const blocker = element(root, 'div', 'lafea-workbench__authority');
  blocker.dataset.role = 'emp1-c-blocker';
  blocker.append(element(root, 'strong', null, 'EMP.1.C blocked — no production local-correlation authority.'));
  const list = element(root, 'ul');
  c.blockers.forEach((code) => list.append(element(root, 'li', null, blockerLabel(code))));
  blocker.append(list);
  workflow.body.append(blocker);
  return workflow.section;
}

function blockerLabel(code) {
  return ({
    WRC_DATASET_NOT_READY: 'WRC extraction package is not READY_FOR_IMPLEMENTATION.',
    WRC_NUMERICAL_COEFFICIENTS_MISSING: 'WRC a–j numerical coefficient payload is not qualified.',
    WRC_SIGN_ARBITRATION_OPEN: 'WRC load/sign convention arbitration remains open.',
    CAUX_PP24_31_NOT_FROZEN: 'CAUx 2017 pp.24–31 benchmark values and independent hand calculation are not frozen.',
  })[code] ?? code;
}

function screeningLoadCustody(root, documentValue, projection, onApplyJson) {
  const custody = card(root, 'EMP.1.B source custody from A');
  custody.section.dataset.role = 'lafea-screening-load-custody';
  custody.section.dataset.guidedTarget = 'screening-load-custody';
  custody.body.append(
    element(root, 'p', 'lafea-workbench__section-intro',
      'EMP.1.B uses a retained snapshot of EMP.1.A foundation evidence. Switching steps does not silently recalculate or replace this snapshot.'),
    element(root, 'p', 'lafea-workbench__authority', projection.custody.userAction),
  );
  if (!documentValue || typeof documentValue !== 'object') {
    custody.body.append(element(root, 'p', 'lafea-workbench-svg__empty',
      'B custody becomes available after a valid EMP.1.B source document is loaded.'));
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
  wrapper.append(element(root, 'h4', null, 'Retained EMP.1.A transformed resultants'));
  if (!loadCases.length) {
    wrapper.append(element(root, 'p', 'lafea-workbench-svg__empty',
      'No retained EMP.1.A transformed load cases are available.'));
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

function engineeringStatus(value) {
  return String(value ?? 'UNKNOWN').replaceAll('_', ' ');
}
