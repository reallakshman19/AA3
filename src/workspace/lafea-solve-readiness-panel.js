/** Compact decision-first Solve readiness presentation. */
import { createLafeaInfoDisclosure } from './lafea-info-disclosure.js';
import { lafeaWorkbenchReasonLabels } from './lafea-workbench-reason-labels.js';
import { lafeaUiStatusPresentation } from './lafea-ui-status.js';

const STEP_IDS = Object.freeze(['MODEL_DIAGNOSTICS', 'AUTHORIZATION', 'RUN']);

export function renderLafeaSolveReadiness(root, workflow, diagnostics = []) {
  if (!root?.ownerDocument) throw new TypeError('LAFEA_SOLVE_READINESS_ROOT_REQUIRED');
  const doc = root.ownerDocument;
  const section = doc.createElement('section');
  section.className = 'lafea-solve-readiness';
  section.dataset.role = 'lafea-solve-readiness';

  const steps = STEP_IDS
    .map((stepId) => workflow?.steps?.find((candidate) => candidate.stepId === stepId))
    .filter(Boolean);
  const run = steps.find((step) => step.stepId === 'RUN') ?? null;
  const status = run?.status ?? 'BLOCKED';
  const presentation = lafeaUiStatusPresentation(status);
  section.dataset.status = status;

  const heading = doc.createElement('div');
  heading.className = 'lafea-solve-readiness__heading';
  const title = doc.createElement('strong');
  title.textContent = `Solve: ${presentation.label}`;
  title.dataset.tone = presentation.tone;
  heading.append(title);

  const allReasons = unique([
    ...steps.flatMap((step) => step.reasons ?? []),
    ...diagnostics.map((item) => item?.code).filter(Boolean),
  ]);
  const humanReasons = lafeaWorkbenchReasonLabels(allReasons);
  if (humanReasons.length) {
    const primary = doc.createElement('p');
    primary.className = 'lafea-solve-readiness__primary-reason';
    primary.textContent = humanReasons[0];
    section.append(heading, primary);
  } else {
    const primary = doc.createElement('p');
    primary.className = 'lafea-solve-readiness__primary-reason';
    primary.textContent = status === 'READY'
      ? 'Current model, authorization, and mesh gates permit the registered solve action.'
      : 'Additional current engineering evidence is required before solving.';
    section.append(heading, primary);
  }

  const evidenceRows = [
    ...steps.map((step) => [step.label, lafeaUiStatusPresentation(step.status).label]),
    ...allReasons.map((reason, index) => [`Reason ${index + 1}`, reason]),
  ];
  const diagnosticMessages = diagnostics
    .filter((item) => item?.message && item.message !== item.code)
    .map((item, index) => [`Diagnostic ${index + 1}`, item.message]);
  section.append(createLafeaInfoDisclosure(
    doc,
    'Solve readiness evidence',
    [...evidenceRows, ...diagnosticMessages],
    { summaryText: 'Why? (i)', role: 'lafea-solve-readiness-evidence' },
  ));
  return section;
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value))];
}
