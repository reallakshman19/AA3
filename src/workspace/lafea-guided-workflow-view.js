/** Render the guided LAFEA step navigator without creating engineering state. */
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
  nav.setAttribute('aria-label', 'Guided LAFEA analysis steps');

  const title = doc.createElement('h2');
  title.textContent = 'Workflow status';
  const list = doc.createElement('ol');

  for (const step of workflow.steps) {
    const presentation = lafeaUiStatusPresentation(step.status);
    const item = doc.createElement('li');
    item.dataset.stepId = step.stepId;
    item.dataset.status = step.status;

    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'lafea-guided-workflow__step';
    button.dataset.guidedStep = step.stepId;
    button.dataset.status = step.status;
    button.setAttribute('aria-label', `${step.label}: ${presentation.label}`);

    const label = doc.createElement('span');
    label.className = 'lafea-guided-workflow__label';
    label.textContent = step.label;

    const state = doc.createElement('span');
    state.className = 'lafea-guided-workflow__state';
    state.dataset.tone = presentation.tone;
    state.textContent = presentation.label;

    button.append(label, state);
    button.addEventListener('click', () => onNavigate?.(step));
    item.append(button);

    if (step.reasons.length) {
      const reasons = doc.createElement('small');
      reasons.className = 'lafea-guided-workflow__reasons';
      reasons.textContent = lafeaWorkbenchReasonLabels(step.reasons).join(' • ');
      item.append(reasons);
    }
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
