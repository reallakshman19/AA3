import {
  EMP1_WORKBENCH_BOUNDED_ROUTE_REQUEST_SCHEMA,
  EMP1_WORKBENCH_RUN_INPUT_SCHEMA,
} from './emp1-workbench-run-state.js';
import { card, element } from './lafea-workbench-dom.js';

/**
 * Editable source-binding form for the governed EMP.1.C transaction.
 * DOM values are drafts only. They become calculation input only after the
 * controller accepts and normalizes the complete run-input command.
 */
export function renderEmp1WorkbenchRunConfiguration(root, options = {}) {
  const state = options.state ?? {};
  const aDocument = state.stages?.['LAFEA.1']?.document ?? null;
  const bDocument = state.stages?.['LAFEA.2']?.document ?? null;
  const runInput = options.runInput ?? null;
  const currentness = options.currentness ?? { state: 'NOT_RUN', reasons: [] };
  const cStep = options.projection?.steps?.find((step) => step.shortId === 'C') ?? null;
  const boundedRoute = cStep?.boundedProductionRoutes?.[0] ?? null;
  const routeSuspended = Boolean(
    boundedRoute && (boundedRoute.registered !== true || boundedRoute.engineeringUseAuthorized !== true),
  );
  const suspensionReasons = routeSuspended ? boundedRoute.suspensionReasons ?? [] : [];
  const panel = card(root, 'EMP.1.C source binding and run setup');
  panel.section.dataset.role = 'emp1-c-run-configuration';
  panel.section.dataset.currentness = currentness.state;
  panel.section.dataset.productionAuthority = routeSuspended ? 'SUSPENDED' : 'AVAILABLE';

  panel.body.append(element(root, 'p', 'lafea-workbench__section-intro',
    'Select retained A identities and bind the source-referenced attachment diameter. Rm, T, WRC reference coordinates, axes, γ, β, Kn and Kb are not editable here; they are derived from retained A/B evidence by the governed C preparation path.'));

  const status = element(root, 'strong', 'lafea-result-highlights__status',
    `EMP.1 transaction: ${human(currentness.state)}`);
  status.dataset.role = 'emp1-product-currentness';
  panel.body.append(status);
  if (currentness.reasons?.length) {
    panel.body.append(element(root, 'p', 'lafea-workbench__authority',
      `Retained transaction is not current: ${currentness.reasons.map(human).join('; ')}.`));
  }
  if (options.runFailure) {
    const failure = element(root, 'p', 'lafea-workbench__authority',
      `Last EMP.1 transaction failed: ${options.runFailure.code ?? options.runFailure.message ?? 'UNRESOLVED'}.`);
    failure.dataset.role = 'emp1-run-failure';
    panel.body.append(failure);
  }

  if (!aDocument || !bDocument) {
    panel.body.append(element(root, 'p', 'lafea-workbench-svg__empty',
      'Load both EMP.1.A and EMP.1.B source documents before configuring the local-correlation transaction.'));
    return panel.section;
  }

  const local = runInput?.localMethod ?? {};
  const routeRequest = local.routeRequest ?? {};
  const attachment = local.attachmentGeometry ?? {};
  const lengthUnit = canonicalLengthUnit(aDocument, bDocument);
  const form = element(root, 'div', 'lafea-workbench__form');

  const loadCase = selectField(root, 'Load case at retained A target reference',
    loadCaseIdentities(aDocument), routeRequest.loadCaseIdentity, 'emp1-c-load-case');
  const pressure = selectField(root, 'Pressure result (comparison scope requires Δp = 0)',
    pressureResultIdentities(aDocument), routeRequest.pressureResultIdentity, 'emp1-c-pressure-result');
  const geometryIdentity = inputField(root, 'Attachment geometry identity',
    attachment.geometryIdentity ?? '', 'text', 'emp1-c-geometry-identity');
  const diameter = inputField(root, `Attachment outside diameter (${lengthUnit})`,
    finiteText(attachment.attachmentDiameter), 'number', 'emp1-c-attachment-diameter');
  diameter.input.min = '0';
  diameter.input.step = 'any';
  const sourceRef = inputField(root, 'Attachment diameter source reference',
    attachment.sourceReference ?? '', 'text', 'emp1-c-attachment-source-ref');
  form.append(loadCase.row, pressure.row, geometryIdentity.row, diameter.row, sourceRef.row);

  const canonical = element(root, 'p', 'lafea-workbench__authority',
    `Canonical length unit: ${lengthUnit}. Enter the attachment diameter in this exact unit; no UI-side unit conversion is calculation authority.`);
  canonical.dataset.role = 'emp1-c-canonical-length-unit';

  const apply = element(root, 'button', null, 'Apply C source binding');
  apply.type = 'button';
  apply.dataset.role = 'emp1-c-apply-run-input';
  apply.addEventListener('click', () => {
    sourceRef.input.setCustomValidity('');
    const response = options.onApply?.({
      schema: EMP1_WORKBENCH_RUN_INPUT_SCHEMA,
      localMethod: {
        routeRequest: {
          schema: EMP1_WORKBENCH_BOUNDED_ROUTE_REQUEST_SCHEMA,
          loadCaseIdentity: loadCase.input.value,
          pressureResultIdentity: pressure.input.value,
        },
        attachmentGeometry: {
          geometryIdentity: geometryIdentity.input.value.trim(),
          attachmentDiameter: Number(diameter.input.value),
          unit: lengthUnit,
          sourceReference: sourceRef.input.value.trim(),
        },
      },
    });
    if (response?.status === 'REJECTED') {
      sourceRef.input.setCustomValidity(response.message ?? response.code ?? 'EMP.1 source binding was rejected.');
      sourceRef.input.reportValidity();
    }
  });

  const boundary = element(root, 'div', 'lafea-workbench__authority');
  boundary.dataset.role = 'emp1-c-production-authority';
  if (routeSuspended) {
    boundary.append(
      element(root, 'strong', null, 'C production execution suspended'),
      element(root, 'p', null,
        'The source-bound A→B→C transaction may be prepared, but no production WRC stress result is authorized while cylindrical WRC load-axis/sign authority remains unresolved.'),
    );
    const reasons = element(root, 'ul');
    suspensionReasons.forEach((reason) => reasons.append(element(root, 'li', null, human(reason))));
    boundary.append(reasons);
  } else {
    boundary.append(
      element(root, 'strong', null, 'Bounded C execution authority'),
      element(root, 'p', null,
        'Only the registered bounded runtime domain may execute. A successful run is not global WRC authority, code compliance, or release qualification.'),
    );
  }
  panel.body.append(form, canonical, apply, boundary);
  return panel.section;
}

export function renderEmp1WorkbenchExecutionSummary(root, execution, currentness) {
  if (!execution) return null;
  const panel = card(root, 'EMP.1 transaction evidence');
  panel.section.dataset.role = 'emp1-product-execution-summary';
  panel.section.dataset.currentness = currentness?.state ?? 'UNRESOLVED';
  const routeExecuted = execution.authority?.boundedLocalRouteExecuted === true;
  panel.body.append(keyValueTable(root, [
    ['Transaction status', execution.status],
    ['Engineering decision', execution.decision],
    ['Currentness', currentness?.state],
    ['EMP.1 source hash', execution.sourceHash],
    ['A result hash', execution.result?.loadTransfer?.resultHash],
    ['B retained evidence hash', execution.result?.sectionScreening?.resultHash],
    [routeExecuted ? 'C result hash' : 'C blocked/preparation evidence hash', execution.result?.localCorrelation?.resultHash],
    ['A/B/C invocations', invocationText(execution.invocations)],
    ['C source custody prepared', execution.authority?.boundedLocalRoutePrepared === true ? 'YES' : 'NO'],
    ['C production route executed', routeExecuted ? 'YES' : 'NO'],
    ['C suspension reasons', (execution.authority?.routeSuspensionReasons ?? []).map(human).join('; ') || '—'],
    ['Global C authority', execution.authority?.globalEmp1CRouteAuthority === true ? 'YES' : 'NO'],
    ['Code compliance produced', execution.authority?.codeComplianceProduced === true ? 'YES' : 'NO'],
    ['Release qualified', execution.authority?.releaseQualified === true ? 'YES' : 'NO'],
  ]));
  if (currentness?.state === 'STALE') {
    panel.body.append(element(root, 'p', 'lafea-workbench__authority',
      'This retained transaction is historical/stale and is excluded from current EMP.1 evidence until the transaction is rerun.'));
  }
  if (!routeExecuted && execution.authority?.routeSuspensionReasons?.length) {
    panel.body.append(element(root, 'p', 'lafea-workbench__authority',
      'No WRC stress field was produced by this transaction. A/B results and prepared C custody are retained only to support fail-closed engineering traceability.'));
  }
  return panel.section;
}

function loadCaseIdentities(documentValue) {
  const requested = documentValue?.resultRequests?.transformedLoadCaseIdentities;
  if (Array.isArray(requested) && requested.length) return uniqueText(requested);
  return uniqueText((documentValue?.loadCases ?? []).map((row) => row?.identity));
}
function pressureResultIdentities(documentValue) {
  return uniqueText((documentValue?.resultRequests?.pressure ?? []).map((row) => row?.identity));
}
function canonicalLengthUnit(aDocument, bDocument) {
  return aDocument?.units?.canonical?.length
    ?? bDocument?.units?.canonical?.length
    ?? aDocument?.units?.length
    ?? 'UNRESOLVED';
}
function uniqueText(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()))];
}
function selectField(root, labelText, values, selected, role) {
  const row = element(root, 'label');
  const label = element(root, 'span', null, labelText);
  const input = element(root, 'select');
  input.dataset.role = role;
  const blank = element(root, 'option', null, 'Select…');
  blank.value = '';
  input.append(blank);
  values.forEach((value) => {
    const option = element(root, 'option', null, value);
    option.value = value;
    option.selected = value === selected;
    input.append(option);
  });
  row.append(label, input);
  return { row, input };
}
function inputField(root, labelText, value, type, role) {
  const row = element(root, 'label');
  const label = element(root, 'span', null, labelText);
  const input = element(root, 'input');
  input.type = type;
  input.value = value;
  input.dataset.role = role;
  row.append(label, input);
  return { row, input };
}
function keyValueTable(root, rows) {
  const table = element(root, 'table', 'lafea-result-table');
  const head = element(root, 'tr');
  ['Engineering datum', 'Retained value'].forEach((label) => {
    const th = element(root, 'th', null, label);
    th.scope = 'col';
    head.append(th);
  });
  table.append(head);
  rows.forEach(([label, value]) => {
    const tr = element(root, 'tr');
    const th = element(root, 'th', null, label);
    th.scope = 'row';
    tr.append(th, element(root, 'td', null, value == null || value === '' ? '—' : String(value)));
    table.append(tr);
  });
  return table;
}
function invocationText(value) {
  if (!value) return '—';
  return `A ${value.loadTransfer ?? 0} · B ${value.sectionScreening ?? 0} · prepare C ${value.localPreparation ?? 0} · production C ${value.localCorrelation ?? 0}`;
}
function finiteText(value) { return Number.isFinite(value) ? String(value) : ''; }
function human(value) { return String(value ?? 'UNRESOLVED').replaceAll('_', ' '); }
