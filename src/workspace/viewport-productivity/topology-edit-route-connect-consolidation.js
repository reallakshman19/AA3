const ROUTE_ELBOW_TOOL = 'ROUTE_ELBOW';

export function applyStartRouteWorkflowDefaults(runtime) {
  runtime.startRouteValues = {
    ...runtime.startRouteValues,
    inputMode: 'VIEWPORT',
    minimumLengthMm: runtime.startRouteValues.minimumLengthMm || '6',
    overlapToleranceMm: runtime.startRouteValues.overlapToleranceMm || '0.001',
  };
}

export function applyConnectWorkflowDefaults(runtime) {
  runtime.connectValues = {
    ...runtime.connectValues,
    minimumLengthMm: runtime.connectValues.minimumLengthMm || '6',
    overlapToleranceMm: runtime.connectValues.overlapToleranceMm || '0.001',
    allowDirect: true,
    allowOrthogonal: true,
    maxAlternatives: runtime.connectValues.maxAlternatives || '5',
  };
}

export function startRouteWorkflowReady(runtime) {
  const values = runtime.startRouteValues;
  if (!values?.catalogueRecordId) return false;
  if (values.inputMode === 'VIEWPORT') {
    return Boolean(runtime.startAcquisition && runtime.endAcquisition);
  }
  return ['startX', 'startY', 'startZ', 'endX', 'endY', 'endZ']
    .every((key) => String(values[key] ?? '').trim() !== '');
}

export function connectWorkflowReadyForPlanning(runtime) {
  return Boolean(
    runtime.connectStartEndpoint
    && runtime.connectEndEndpoint
    && runtime.connectValues?.catalogueRecordId,
  );
}

export function continueRouteWorkflowActive(runtime) {
  return !runtime.startRouteActive
    && !runtime.connectEndpointsActive
    && runtime.state?.tool === ROUTE_ELBOW_TOOL;
}

export function renderRouteConnectConsolidation(runtime) {
  const hud = runtime.element?.querySelector('.topology-edit-authoring-hud');
  if (!hud) return;
  renameToolButton(hud, 'activate-authoring-route-elbow', 'Continue route');
  if (runtime.startRouteActive) renderStartRoute(hud, runtime);
  else if (runtime.connectEndpointsActive) renderConnect(hud, runtime);
  else if (continueRouteWorkflowActive(runtime)) renderContinueRoute(hud, runtime);
}

function renderStartRoute(hud, runtime) {
  const target = hud.querySelector('.topology-edit-authoring-hud__target');
  if (target) {
    target.innerHTML = '<strong>START ROUTE</strong><span>Set start and end, choose the governed pipe, inspect the ghost, then apply.</span>';
  }
  const form = hud.querySelector('[data-role="topology-edit-authoring-form"]');
  if (form) {
    const startButton = form.querySelector('[data-action="capture-start-route-start"]');
    const endButton = form.querySelector('[data-action="capture-start-route-end"]');
    if (startButton) startButton.textContent = runtime.startAcquisition
      ? 'Replace start from current snap' : 'Set start from current snap';
    if (endButton) endButton.textContent = runtime.endAcquisition
      ? 'Replace end from current snap' : 'Set end from current snap';
    insertEndpointState(form, startButton, 'Start', runtime.startAcquisition?.modelPointMm);
    insertEndpointState(form, endButton, 'End', runtime.endAcquisition?.modelPointMm);
    const details = createDetails(hud, 'start-route-engineering-inputs', 'Engineering inputs');
    details.open = runtime.startRouteValues.inputMode === 'TYPED';
    moveMatching(form, details, [
      '[data-start-route-field="inputMode"]',
      '[data-start-route-field="startX"]',
      '[data-start-route-field="endX"]',
      '[data-start-route-field="axisLock"]',
      '[data-start-route-field="minimumLengthMm"]',
      '[data-start-route-field="overlapToleranceMm"]',
    ]);
    form.append(details);
  }
  consolidateActions(hud, {
    applyLabel: 'Apply route',
    evidenceLabel: 'Engineering evidence',
    recoveryActions: ['preview-authoring-operation', 'validate-authoring-operation'],
  });
}

function renderConnect(hud, runtime) {
  const target = hud.querySelector('.topology-edit-authoring-hud__target');
  if (target) {
    target.innerHTML = '<strong>CONNECT ENDS</strong><span>Select two graph-open pipe endpoints, choose pipe and route, inspect the ghost, then apply.</span>';
  }
  const form = hud.querySelector('[data-role="topology-edit-authoring-form"]');
  if (form) {
    const start = form.querySelector('[data-action="capture-connect-start"]');
    const end = form.querySelector('[data-action="capture-connect-end"]');
    if (start) start.textContent = runtime.connectStartEndpoint
      ? 'Replace start with selected endpoint' : 'Use selected endpoint as start';
    if (end) end.textContent = runtime.connectEndEndpoint
      ? 'Replace end with selected endpoint' : 'Use selected endpoint as end';
    const details = createDetails(hud, 'connect-engineering-inputs', 'Route policy');
    moveMatching(form, details, [
      '[data-connect-field="minimumLengthMm"]',
      '[data-connect-field="overlapToleranceMm"]',
      '[data-connect-field="allowDirect"]',
      '[data-connect-field="allowOrthogonal"]',
      '[data-connect-field="maxAlternatives"]',
    ]);
    form.append(details);
  }
  consolidateActions(hud, {
    applyLabel: 'Apply connection',
    evidenceLabel: 'Engineering evidence',
    recoveryActions: [
      'plan-connect-alternatives',
      'preview-authoring-operation',
      'validate-authoring-operation',
    ],
  });
}

function renderContinueRoute(hud) {
  const target = hud.querySelector('.topology-edit-authoring-hud__target');
  if (target) {
    const span = target.querySelector('span');
    if (span) span.textContent = 'Select one graph-open pipe end, enter the route offset, inspect the ghost, then apply.';
  }
  consolidateActions(hud, {
    applyLabel: 'Apply route',
    evidenceLabel: 'Engineering evidence',
    recoveryActions: ['preview-authoring-operation', 'validate-authoring-operation'],
  });
}

function consolidateActions(hud, options) {
  hud.querySelector('[data-role="route-connect-engineering-evidence"]')?.remove();
  const actions = hud.querySelector('.topology-edit-authoring-hud__actions');
  const evidence = hud.querySelector('.topology-edit-authoring-hud__evidence');
  if (!actions) return;
  const apply = actions.querySelector('[data-action="apply-authoring-operation"]');
  const cancel = actions.querySelector('[data-action="cancel-authoring-operation"]');
  if (apply) apply.textContent = options.applyLabel;
  if (cancel) cancel.textContent = 'Cancel';
  const details = createDetails(hud, 'route-connect-engineering-evidence', options.evidenceLabel);
  const recovery = hud.ownerDocument.createElement('div');
  recovery.className = 'topology-edit-authoring-hud__recovery-actions';
  for (const action of options.recoveryActions) {
    const button = actions.querySelector(`[data-action="${action}"]`);
    if (button) recovery.append(button);
  }
  if (recovery.children.length) details.append(recovery);
  if (evidence) details.append(evidence);
  actions.after(details);
}

function moveMatching(form, details, selectors) {
  const moved = new Set();
  for (const selector of selectors) {
    const control = form.querySelector(selector);
    if (!control) continue;
    const container = control.closest('fieldset, label');
    if (container && !moved.has(container)) {
      moved.add(container);
      details.append(container);
    }
  }
}

function insertEndpointState(form, button, label, point) {
  if (!button) return;
  const row = form.ownerDocument.createElement('p');
  row.className = 'topology-edit-authoring-hud__endpoint-state';
  row.dataset.routeEndpointState = label.toLowerCase();
  row.innerHTML = `<strong>${label}</strong><span>${point ? formatPoint(point) : 'Not set'}</span>`;
  button.before(row);
}

function createDetails(hud, role, label) {
  const details = hud.ownerDocument.createElement('details');
  details.dataset.role = role;
  details.className = 'topology-edit-authoring-hud__details';
  const summary = hud.ownerDocument.createElement('summary');
  summary.textContent = label;
  details.append(summary);
  return details;
}

function renameToolButton(hud, action, label) {
  const button = hud.querySelector(`[data-action="${action}"]`);
  if (button) button.textContent = label;
}

function formatPoint(point) {
  return `X ${format(point.x)} · Y ${format(point.y)} · Z ${format(point.z)} mm`;
}
function format(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en', { maximumFractionDigits: 3 }) : '—';
}
