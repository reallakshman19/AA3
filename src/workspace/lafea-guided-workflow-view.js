/** Render the guided LAFEA step navigator without creating engineering state. */
import { buildLafeaWorkflowAreaPresentation } from './lafea-guided-workflow-presentation.js';
import { lafeaWorkbenchReasonLabels } from './lafea-workbench-reason-labels.js';
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

    const label = doc.createElement('span');
    label.className = 'lafea-guided-workflow__label';
    label.textContent = area.label;

    const state = doc.createElement('span');
    state.className = 'lafea-guided-workflow__state';
    state.dataset.tone = presentation.tone;
    state.textContent = presentation.label;

    button.append(label, state);
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
