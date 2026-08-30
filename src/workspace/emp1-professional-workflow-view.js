import { card, element } from './lafea-workbench-dom.js';
import { buildEmp1ProfessionalWorkflowPresentation } from './emp1-professional-workflow-presentation.js';

/**
 * Engineer-facing EMP.1 workflow. This is a read-only presentation over the
 * governed A/B/C product projection; it does not create calculation state.
 */
export function renderEmp1ProfessionalWorkflow(root, projection, onSelectRoute) {
  const presentation = buildEmp1ProfessionalWorkflowPresentation(projection);
  const workflow = card(root, 'Assessment workflow');
  workflow.section.dataset.role = 'emp1-workflow';
  workflow.section.dataset.productId = presentation.productId;
  workflow.section.dataset.workflowSchema = presentation.schema;

  workflow.body.append(
    element(root, 'strong', 'lafea-result-highlights__status', `${presentation.productId} · professional workflow`),
    element(root, 'p', 'lafea-workbench__section-intro',
      'Work through the engineering assessment from source basis to retained evidence. These seven steps are presentation tasks over the governed EMP.1.A / EMP.1.B / EMP.1.C calculation and evidence layers; they are not separate calculators.'),
  );

  const list = element(root, 'ol', 'lafea-workbench__stages');
  list.dataset.role = 'emp1-professional-workflow-steps';
  for (const step of presentation.steps) {
    const item = element(root, 'li');
    item.dataset.emp1ProfessionalStep = step.stepId;
    const button = element(root, 'button', null, `${step.ordinal} ${step.label} · ${human(step.statusLabel)}`);
    button.type = 'button';
    button.dataset.role = 'emp1-professional-step';
    button.dataset.emp1ProfessionalStep = step.stepId;
    button.dataset.backingSteps = step.backingStepIds.join(',');
    button.dataset.targetRole = step.targetRole;
    button.disabled = step.canOpen !== true;
    button.addEventListener('click', () => navigateProfessionalStep(root, step, onSelectRoute));
    item.append(button);
    list.append(item);
  }
  workflow.body.append(list, authoritySummary(root, presentation.authoritySummary));

  const boundary = element(root, 'p', 'lafea-workbench__authority',
    'Workflow status is presentation-only. Run authorization, source authority, route authority, code compliance and release authority remain owned by the existing governed EMP.1 contracts. Historical/stale C numerical evidence is never promoted to a current result by this workflow.');
  boundary.dataset.role = 'emp1-professional-workflow-authority-boundary';
  workflow.body.append(boundary, technicalBackingDisclosure(root, presentation, onSelectRoute));
  return workflow.section;
}

function authoritySummary(root, summary) {
  const section = element(root, 'div', 'lafea-workbench__custody');
  section.dataset.role = 'emp1-professional-authority-summary';
  section.append(element(root, 'strong', null, 'Currentness and authority'));
  for (const value of [
    summary.sourceCurrentness,
    summary.transferCurrentness,
    summary.screeningCurrentness,
    summary.localMethod,
    summary.localResult,
    summary.releaseProfile,
    summary.codeCompliance,
  ]) {
    section.append(element(root, 'span', null, human(value)));
  }
  return section;
}

function technicalBackingDisclosure(root, presentation, onSelectRoute) {
  const details = element(root, 'details', 'lafea-workbench__custody-details');
  details.dataset.role = 'emp1-technical-backing-steps';
  details.append(element(root, 'summary', null, 'Technical backing calculators and custody (A/B/C)'));
  const nav = element(root, 'nav', 'lafea-workbench__stages');
  nav.setAttribute('aria-label', 'EMP.1 technical backing calculators');
  for (const backing of presentation.backingCalculators) {
    const button = element(root, 'button', null,
      `${backing.shortId} ${backing.label} · ${human(backing.state)}`);
    button.type = 'button';
    button.dataset.role = 'emp1-backing-step';
    button.dataset.emp1Step = backing.shortId;
    button.dataset.emp1StepId = backing.stepId;
    if (backing.backingStageId) {
      button.addEventListener('click', () => onSelectRoute?.(backing.backingStageId));
    } else {
      button.addEventListener('click', () => scrollToRole(root, 'emp1-c-run-configuration'));
    }
    nav.append(button);
  }
  details.append(nav);
  return details;
}

function navigateProfessionalStep(root, step, onSelectRoute) {
  if (step.preferredBackingStageId) {
    onSelectRoute?.(step.preferredBackingStageId);
    scheduleTargetScroll(root, step.targetRole);
    return;
  }
  if (scrollToRole(root, step.targetRole)) return;
  if (step.stepId === 'REVIEW_EVIDENCE') {
    if (scrollToRole(root, 'emp1-c-result-evidence')) return;
    root.querySelector?.('[data-guided-target="lineage"]')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }
}

function scheduleTargetScroll(root, role) {
  const view = root?.ownerDocument?.defaultView;
  const schedule = typeof view?.requestAnimationFrame === 'function'
    ? (callback) => view.requestAnimationFrame(callback)
    : (callback) => setTimeout(callback, 0);
  let attempts = 0;
  const attempt = () => {
    attempts += 1;
    if (scrollToRole(root, role) || attempts >= 3) return;
    schedule(attempt);
  };
  schedule(attempt);
}

function scrollToRole(root, role) {
  const target = root.querySelector?.(`[data-role="${role}"]`)
    ?? root.querySelector?.(`[data-guided-target="${role}"]`);
  target?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  return Boolean(target);
}

function human(value) {
  return String(value ?? 'UNRESOLVED').replaceAll('_', ' ');
}
