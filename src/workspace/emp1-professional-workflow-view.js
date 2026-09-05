import { projectEmp1Readiness } from '../core/emp1/emp1-readiness-projection.js';
import { card, element } from './lafea-workbench-dom.js';
import { renderEmp1EngineeringReviewPanel } from './emp1-engineering-review-view.js';
import { renderEmp1BenchmarkEvidencePanel } from './emp1-benchmark-view.js';
import { buildEmp1ProfessionalWorkflowPresentation } from './emp1-professional-workflow-presentation.js';
import { emp1PlainLanguageLabel } from './emp1-plain-language-labels.js';

const READINESS_DIMENSIONS = Object.freeze([
  Object.freeze({ key: 'source', label: 'Source & input' }),
  Object.freeze({ key: 'method', label: 'Bounded method' }),
  Object.freeze({ key: 'applicability', label: 'Applicability' }),
  Object.freeze({ key: 'calculation', label: 'Calculation' }),
  Object.freeze({ key: 'review', label: 'Engineering review' }),
  Object.freeze({ key: 'codeCompliance', label: 'Code compliance' }),
  Object.freeze({ key: 'release', label: 'Release qualification' }),
]);

/**
 * Engineer-facing EMP.1 workflow. Calculation/method authority remains owned by
 * existing governed contracts. Optional review state is consumed from the
 * workspace review controller; this DOM layer never authors engineering hashes.
 */
export function renderEmp1ProfessionalWorkflow(
  root,
  projection,
  onSelectRoute,
  options = {},
) {
  const runFailure = options.runFailure ?? null;
  const reviewWorkspace = options.reviewWorkspace ?? null;
  const benchmarkEvidence = options.benchmarkEvidence ?? null;
  const readiness = projectEmp1Readiness(projection, {
    reviewState: reviewWorkspace?.readinessReviewState ?? null,
  });
  const presentation = buildEmp1ProfessionalWorkflowPresentation(projection);
  const workflow = card(root, 'Assessment workflow');
  workflow.section.dataset.role = 'emp1-workflow';
  workflow.section.dataset.productId = presentation.productId;
  workflow.section.dataset.workflowSchema = presentation.schema;

  const failure = runFailureBanner(root, runFailure);
  if (failure) workflow.body.append(failure);

  workflow.body.append(
    element(root, 'strong', 'lafea-result-highlights__status', `${presentation.productId} · professional workflow`),
    element(root, 'p', 'lafea-workbench__section-intro',
      'Work through the engineering assessment from source basis to retained evidence. These seven steps are presentation tasks over the governed EMP.1.A / EMP.1.B / EMP.1.C calculation and evidence layers; they are not separate calculators.'),
    readinessDashboard(root, readiness),
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

  const notice = currentnessNotice(root, presentation.currentnessNotice);
  if (notice) workflow.body.append(notice);
  if (reviewWorkspace) {
    workflow.body.append(renderEmp1EngineeringReviewPanel(
      root,
      reviewWorkspace,
      options.onReview,
    ));
  }
  if (benchmarkEvidence) {
    workflow.body.append(renderEmp1BenchmarkEvidencePanel(root, benchmarkEvidence));
  }

  const boundary = element(root, 'p', 'lafea-workbench__authority',
    'Workflow status is presentation-only for calculation and release authority. An explicit engineering-review action may retain a hash-bound human attestation through the review controller, while external benchmark evidence may increase confidence; neither creates source, method, applicability, numerical, code-compliance, production, release, or professional-seal authority. Historical/stale C numerical evidence is never promoted to a current result by this workflow.');
  boundary.dataset.role = 'emp1-professional-workflow-authority-boundary';
  workflow.body.append(boundary, technicalBackingDisclosure(root, presentation, onSelectRoute));
  return workflow.section;
}

/**
 * A failed transaction is reported here, at the top of the first card under the
 * toolbar, as well as in the card that owns the failed state. Previously the only
 * trace sat roughly 5,000px down the page in the teal style used for routine
 * read-only notices, so a failed run looked identical to a disclaimer.
 */
function runFailureBanner(root, runFailure) {
  if (!runFailure) return null;
  const section = element(root, 'div', 'lafea-workbench__failure');
  section.dataset.role = 'emp1-workflow-run-failure';
  section.setAttribute('role', 'alert');
  const code = runFailure.code ?? runFailure.message ?? 'UNRESOLVED';
  section.append(
    element(root, 'strong', null, 'The last EMP.1 transaction did not complete'),
    element(root, 'p', null, emp1PlainLanguageLabel(code)),
  );
  if (emp1PlainLanguageLabel(code) !== code) {
    const technical = element(root, 'p', null, code);
    technical.dataset.role = 'emp1-workflow-run-failure-code';
    section.append(technical);
  }
  return section;
}

function readinessDashboard(root, readiness) {
  if (readiness?.schema !== 'emp1-readiness/v1') {
    throw new TypeError('EMP1_READINESS_DASHBOARD_PROJECTION_INVALID');
  }

  const section = element(root, 'section', 'lafea-workbench__custody');
  section.dataset.role = 'emp1-readiness-dashboard';
  section.dataset.readinessSchema = readiness.schema;
  section.dataset.overall = readiness.overall;
  section.append(element(root, 'strong', null, 'Engineering readiness'));

  const overall = element(root, 'p', 'lafea-result-highlights__status', `Overall · ${human(readiness.overall)}`);
  overall.dataset.role = 'emp1-readiness-overall';
  overall.dataset.state = readiness.overall;
  section.append(overall);

  const dimensions = element(root, 'dl', 'lafea-workbench__custody');
  dimensions.dataset.role = 'emp1-readiness-dimensions';
  for (const definition of READINESS_DIMENSIONS) {
    const state = readiness[definition.key]?.state ?? 'UNRESOLVED';
    const row = element(root, 'div');
    row.dataset.role = 'emp1-readiness-dimension';
    row.dataset.readinessDimension = definition.key;
    row.dataset.readinessState = state;
    row.append(
      element(root, 'dt', null, definition.label),
      element(root, 'dd', null, human(state)),
    );
    dimensions.append(row);
  }
  section.append(dimensions);

  if (readiness.blockers.length) {
    const details = element(root, 'details', 'lafea-workbench__custody-details');
    details.dataset.role = 'emp1-readiness-blockers';
    details.append(element(root, 'summary', null, `Blocking evidence (${readiness.blockers.length})`));
    const list = element(root, 'ul');
    for (const code of readiness.blockers) {
      const item = element(root, 'li', null, human(code));
      item.dataset.blockerCode = code;
      list.append(item);
    }
    details.append(list);
    section.append(details);
  }

  const boundary = element(root, 'p', 'lafea-workbench__authority',
    'Readiness is a read-only projection of existing governed EMP.1 evidence and any supplied governed review state. This dashboard does not itself establish method authority, applicability authority, engineering review, code compliance, or release qualification.');
  boundary.dataset.role = 'emp1-readiness-authority-boundary';
  section.append(boundary);
  return section;
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

function currentnessNotice(root, notice) {
  if (!notice) return null;
  const section = element(root, 'div', 'lafea-workbench__authority');
  section.dataset.role = 'emp1-professional-currentness-notice';
  section.dataset.state = notice.state;
  section.setAttribute('role', 'status');
  section.setAttribute('aria-live', 'polite');
  section.append(element(root, 'strong', null, notice.title));

  const reasons = element(root, 'ul');
  notice.reasons.forEach((reason, index) => {
    const reasonCode = notice.reasonCodes[index];
    const isRawFallback = Boolean(reasonCode)
      && reason === String(reasonCode).replaceAll('_', ' ');
    const item = element(root, 'li', null, isRawFallback ? human(reasonCode) : reason);
    if (reasonCode) item.dataset.reasonCode = reasonCode;
    reasons.append(item);
  });
  section.append(reasons);

  const action = element(root, 'p', null, notice.action);
  action.dataset.role = 'emp1-professional-required-action';
  section.append(action);
  return section;
}

function technicalBackingDisclosure(root, presentation, onSelectRoute) {
  const details = element(root, 'details', 'lafea-workbench__custody-details');
  details.dataset.role = 'emp1-technical-backing-steps';
  details.open = presentation.backingCalculators.some(
    (backing) => backing.state && backing.state !== 'SOURCE_INCOMPLETE',
  );
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
  if (step.stepId === 'REVIEW_EVIDENCE'
    && scrollToRole(root, 'emp1-engineering-review-panel')) return;
  if (scrollToRole(root, step.targetRole)) return;
  if (step.stepId === 'REVIEW_EVIDENCE') {
    if (scrollToRole(root, 'emp1-benchmark-evidence-panel')) return;
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
  return emp1PlainLanguageLabel(value);
}
