/** Render the guided LAFEA step navigator without creating engineering state. */
import { lafeaWorkbenchReasonLabels } from './lafea-workbench-reason-labels.js';

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
  title.textContent = 'Analysis workflow';
  const list = doc.createElement('ol');
  for (const step of workflow.steps) {
    const item = doc.createElement('li');
    item.dataset.stepId = step.stepId;
    item.dataset.status = step.status;
    const button = doc.createElement('button');
    button.type = 'button';
    button.dataset.guidedStep = step.stepId;
    button.dataset.status = step.status;
    
    let friendlyStatus = step.status;
    let friendlyLabel = step.label;
    
    if (step.status === 'BLOCKED' && ['SOURCE_IDENTITY', 'ANALYSIS_PROFILE'].includes(step.stepId)) {
      friendlyStatus = 'PENDING';
      friendlyLabel = step.label;
    }
    
    const icons = {
      COMPLETE: '✓',
      READY: '✓',
      NOT_STARTED: '○',
      WARNING: '⚠',
      BLOCKED: '🚫',
      PENDING: '⚡'
    };
    
    button.textContent = `${icons[friendlyStatus] || ''} ${friendlyLabel}`;
    button.addEventListener('click', () => onNavigate?.(step));
    item.append(button);
    
    if (step.reasons.length && step.status !== 'BLOCKED') {
      const reasons = doc.createElement('small');
      reasons.textContent = lafeaWorkbenchReasonLabels(step.reasons).join(' • ');
      item.append(reasons);
    }
    list.append(item);
  }
  const release = doc.createElement('p');
  release.className = 'lafea-guided-workflow__release';
  release.dataset.qualified = workflow.releaseQualified ? 'true' : 'false';
  release.textContent = `Release authority: ${workflow.releaseQualified ? 'QUALIFIED' : 'NOT QUALIFIED'}`;
  nav.append(title, list, release);
  root.replaceChildren(nav);
  return nav;
}
