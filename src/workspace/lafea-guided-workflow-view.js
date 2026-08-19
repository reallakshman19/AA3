/** Render the guided LAFEA step navigator without creating engineering state. */
import { buildLafeaWorkflowAreaPresentation } from './lafea-guided-workflow-presentation.js';
import { lafeaWorkbenchReasonLabels } from './lafea-workbench-reason-labels.js';
import { lafeaUiIcon, lafeaWorkflowAreaIconId } from './lafea-ui-icons.js';
import { lafeaUiStatusPresentation } from './lafea-ui-status.js';

export function renderLafeaGuidedWorkflow(root, workflow, onNavigate) {
  if (!root?.ownerDocument || workflow?.schema !== 'lafea-guided-workflow/v1') {
    throw new TypeError('LAFEA_GUIDED_WORKFLOW_VIEW_INPUT_INVALID');
  }
  const doc = root.ownerDocument;
  const nav = doc.createElement('nav');
  nav.className = 'lafea-guided-workflow';
  nav.dataset.role = 'lafea-guided-workflow';
  nav.setAttribute('aria-label', 'LAFEA analysis areas');

  const title = doc.createElement('h2');
  title.textContent = 'Analysis';
  const list = doc.createElement('ol');
  list.className = 'lafea-guided-workflow__areas';

  for (const area of buildLafeaWorkflowAreaPresentation(workflow)) {
    const presentation = lafeaUiStatusPresentation(area.status);
    const item = doc.createElement('li');
    item.dataset.workflowArea = area.areaId;
    item.dataset.uiStatus = area.status;

    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'lafea-guided-workflow__area';
    button.dataset.workflowAreaAction = area.areaId;
    button.dataset.uiStatus = area.status;
    button.setAttribute('aria-label', `${area.label}: ${presentation.label}`);

    const icon = lafeaUiIcon(doc, lafeaWorkflowAreaIconId(area.areaId));
    icon.classList.add('lafea-guided-workflow__icon');

    const label = doc.createElement('span');
    label.className = 'lafea-guided-workflow__label';
    label.textContent = area.label;

    const state = doc.createElement('span');
    state.className = 'lafea-guided-workflow__state';
    state.dataset.tone = presentation.tone;
    state.textContent = presentation.label;

    button.append(icon, label, state);
    button.addEventListener('click', () => onNavigate?.(area.targetStep));
    item.append(button);

    const summaryReason = primaryReason(area);
    if (summaryReason) {
      const reasons = doc.createElement('small');
      reasons.className = 'lafea-guided-workflow__reasons';
      reasons.textContent = summaryReason;
      item.append(reasons);
    }

    if (area.steps.length > 1) item.append(technicalSteps(doc, area, onNavigate));
    list.append(item);
  }

  const release = doc.createElement('p');
  release.className = 'lafea-guided-workflow__release';
  release.dataset.qualified = workflow.releaseQualified ? 'true' : 'false';
  release.textContent = `Release authority: ${workflow.releaseQualified ? 'Qualified' : 'Not qualified'}`;

  nav.append(title, list, release);
  root.replaceChildren(nav);
  return nav;
}

/**
 * Pure EMP.1 presentation leaf. It creates DOM only and accepts all mutation
 * callbacks from the caller; it owns no store, controller or engineering state.
 */
export function renderEmp1AssessmentWorkflow(root, projection, onSelectRoute) {
  const workflow = workbenchCard(root, 'Assessment workflow');
  workflow.section.dataset.role = 'emp1-workflow';
  workflow.section.dataset.productId = projection.product.productId;
  const overall = dom(root, 'strong', 'lafea-result-highlights__status',
    `EMP.1 · ${humanState(projection.state)}`);
  overall.dataset.role = 'emp1-product-state';
  workflow.body.append(
    overall,
    dom(root, 'p', 'lafea-workbench__section-intro',
      'Work left to right. A is the current load/reference authority. B must bind to that current A evidence while retaining its own screening cases and evaluation locations. C stays blocked until WRC source/data and CAUx benchmark qualification are complete.'),
  );

  const nav = dom(root, 'nav', 'lafea-workbench__stages');
  nav.setAttribute('aria-label', 'EMP.1 assessment steps');
  for (const step of projection.steps) {
    const button = dom(root, 'button', null,
      `${step.shortId} ${step.label} · ${humanState(step.state)}`);
    button.type = 'button';
    button.dataset.role = 'emp1-step';
    button.dataset.emp1Step = step.shortId;
    button.dataset.emp1StepId = step.stepId;
    button.dataset.state = step.state;
    button.setAttribute('aria-current', projection.activeStepId === step.stepId ? 'step' : 'false');
    button.disabled = step.shortId === 'C';
    if (step.shortId === 'C') button.title = `Blocked: ${step.blockers.join(', ')}`;
    button.addEventListener('click', () => {
      if (step.backingStageId) onSelectRoute?.(step.backingStageId);
    });
    nav.append(button);
  }
  workflow.body.append(nav);

  const c = projection.steps.find((step) => step.shortId === 'C');
  const blocker = dom(root, 'div', 'lafea-workbench__authority');
  blocker.dataset.role = 'emp1-c-blocker';
  blocker.append(dom(root, 'strong', null, 'EMP.1.C blocked — no production local-correlation authority.'));
  const list = dom(root, 'ul');
  for (const code of c.blockers) list.append(dom(root, 'li', null, emp1BlockerLabel(code)));
  blocker.append(list);
  workflow.body.append(blocker);
  return workflow.section;
}

/**
 * Creates the EMP.1.B custody header/card only. The caller appends B-owned
 * screening tables so this leaf never imports edit/store/controller modules.
 */
export function createEmp1BSourceCustodyCard(root, projection, hasDocument, onRefresh) {
  const custody = workbenchCard(root, 'EMP.1.B source custody from A');
  custody.section.dataset.role = 'lafea-screening-load-custody';
  custody.section.dataset.guidedTarget = 'screening-load-custody';
  const currentness = dom(root, 'strong', 'lafea-result-highlights__status',
    `A → B evidence: ${humanState(projection.custody.bSourceEvidenceState)}`);
  currentness.dataset.role = 'emp1-b-source-currentness';
  currentness.dataset.state = projection.custody.bSourceEvidenceState;
  custody.body.append(
    currentness,
    dom(root, 'p', 'lafea-workbench__section-intro',
      'EMP.1.B owns its screening cases, factors and evaluation locations. Only its validated A-derived source evidence may be refreshed from the current qualified EMP.1.A result.'),
    dom(root, 'p', 'lafea-workbench__authority', projection.custody.userAction),
  );

  if (!hasDocument) {
    custody.body.append(dom(root, 'p', 'lafea-workbench-svg__empty',
      'B custody becomes available after a valid EMP.1.B source document is loaded.'));
    return custody;
  }

  const refresh = dom(root, 'button', null, 'Refresh B from current A');
  refresh.type = 'button';
  refresh.dataset.role = 'emp1-refresh-b-from-a';
  refresh.disabled = !projection.custody.canRefreshBFromCurrentA;
  refresh.title = emp1RefreshTitle(projection.custody);
  refresh.addEventListener('click', () => onRefresh?.());
  custody.body.append(refresh);
  return custody;
}

function technicalSteps(doc, area, onNavigate) {
  const details = doc.createElement('details');
  details.className = 'lafea-guided-workflow__technical';
  const summary = doc.createElement('summary');
  summary.textContent = `${area.steps.length} governed checks`;
  const list = doc.createElement('ol');

  for (const step of area.steps) {
    const presentation = lafeaUiStatusPresentation(step.status);
    const item = doc.createElement('li');
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'lafea-guided-workflow__technical-step';
    button.dataset.guidedStep = step.stepId;
    button.dataset.status = step.status;
    button.textContent = `${step.label} — ${presentation.label}`;
    button.addEventListener('click', () => onNavigate?.(step));
    item.append(button);
    list.append(item);
  }
  details.append(summary, list);
  return details;
}

function primaryReason(area) {
  if (!area.reasons.length || !['BLOCKED', 'WARNING'].includes(area.status)) return null;
  const labels = lafeaWorkbenchReasonLabels(area.reasons);
  if (!labels.length) return null;
  return labels.length === 1 ? labels[0] : `${labels[0]} · ${labels.length - 1} more`;
}

function emp1BlockerLabel(code) {
  return ({
    WRC_DATASET_NOT_READY: 'WRC extraction package is not READY_FOR_IMPLEMENTATION.',
    WRC_NUMERICAL_COEFFICIENTS_MISSING: 'WRC a–j numerical coefficient payload is not qualified.',
    WRC_SIGN_ARBITRATION_OPEN: 'WRC load/sign convention arbitration remains open.',
    CAUX_PP24_31_NOT_FROZEN: 'CAUx 2017 pp.24–31 benchmark values and independent hand calculation are not frozen.',
  })[code] ?? code;
}

function emp1RefreshTitle(custody) {
  if (custody.canRefreshBFromCurrentA) {
    return 'Replace only B sourceEvidence with the current qualified A model/result; preserve and revalidate all B-owned screening inputs.';
  }
  if (custody.bSourceEvidenceState === 'CURRENT_A_EVIDENCE') {
    return 'B already uses the current qualified A evidence.';
  }
  if (custody.refreshBlockerCode) return `Refresh blocked: ${custody.refreshBlockerCode}`;
  return 'A current qualified A result and an existing B request are required.';
}

function workbenchCard(root, titleText) {
  const section = dom(root, 'section', 'lafea-workbench__card');
  const title = dom(root, 'h2', null, titleText);
  const body = dom(root, 'div');
  section.append(title, body);
  return { section, body };
}

function dom(root, tag, className, text) {
  const value = root.ownerDocument.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined) value.textContent = text;
  return value;
}

function humanState(value) {
  return String(value ?? 'UNKNOWN').replaceAll('_', ' ');
}
