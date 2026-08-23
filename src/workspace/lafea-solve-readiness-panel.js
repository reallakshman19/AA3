/** Decision-first Solve readiness projection for the shared LAFEA.3–6 workbench. */
import { createLafeaInfoDisclosure } from './lafea-info-disclosure.js';
import { lafeaWorkbenchReasonLabel } from './lafea-workbench-reason-labels.js';
import { lafeaUiStatusPresentation } from './lafea-ui-status.js';

export const LAFEA_SOLVE_READINESS_VIEW_SCHEMA = 'lafea-solve-readiness-view/v1';

const STEP_IDS = Object.freeze(['MODEL_DIAGNOSTICS', 'AUTHORIZATION', 'RUN']);

export function buildLafeaSolveReadinessViewModel(workflow, diagnostics = []) {
  const steps = STEP_IDS
    .map((stepId) => workflow?.steps?.find((candidate) => candidate.stepId === stepId))
    .filter(Boolean)
    .map((step) => Object.freeze({
      stepId: step.stepId,
      label: step.label,
      status: step.status,
      reasons: Object.freeze([...(step.reasons ?? [])]),
    }));
  const unsupported = workflow?.analysisRouteFamily === 'UNSUPPORTED';
  const run = steps.find((step) => step.stepId === 'RUN') ?? null;
  const canonicalStatus = unsupported ? 'NOT_APPLICABLE' : run?.status ?? 'BLOCKED';
  const reasons = unique([
    ...diagnostics.map((item) => item?.code).filter(Boolean),
    ...steps.flatMap((step) => step.reasons),
  ]);
  const primaryCode = unsupported
    ? reasons.find((reason) => reason === 'UNSUPPORTED_STAGE_ENGINE_NOT_IMPLEMENTED') ?? reasons[0] ?? null
    : reasons[0] ?? null;
  const primaryMessage = unsupported
    ? 'No qualified analysis route is registered for this stage. Source and model review remain available, but solve execution is not applicable.'
    : primaryCode
      ? lafeaWorkbenchReasonLabel(primaryCode)
      : canonicalStatus === 'READY'
        ? 'Current model, authorization, and mesh gates permit the registered solve action.'
        : 'Additional current engineering evidence is required before solving.';
  const presentation = lafeaUiStatusPresentation(canonicalStatus);

  return Object.freeze({
    schema: LAFEA_SOLVE_READINESS_VIEW_SCHEMA,
    status: canonicalStatus,
    label: presentation.label,
    tone: presentation.tone,
    executionSupported: !unsupported,
    primaryCode,
    primaryMessage,
    steps: Object.freeze(steps),
    reasons: Object.freeze(reasons),
    diagnostics: Object.freeze((Array.isArray(diagnostics) ? diagnostics : []).map((item) => Object.freeze({
      severity: item?.severity ?? 'INFO',
      message: item?.message ?? '',
      code: item?.code ?? 'UNKNOWN',
    }))),
  });
}

export function renderLafeaSolveReadiness(root, workflow, diagnostics = []) {
  if (!root?.ownerDocument) throw new TypeError('LAFEA_SOLVE_READINESS_ROOT_REQUIRED');
  const doc = root.ownerDocument;
  const model = buildLafeaSolveReadinessViewModel(workflow, diagnostics);
  const section = doc.createElement('section');
  section.className = 'lafea-solve-readiness';
  section.dataset.role = 'lafea-solve-readiness';
  section.dataset.status = model.status;
  section.dataset.executionSupported = String(model.executionSupported);

  const heading = doc.createElement('div');
  heading.className = 'lafea-solve-readiness__heading';
  const state = doc.createElement('strong');
  state.className = 'lafea-solve-readiness__state';
  state.dataset.tone = model.tone;
  state.textContent = `Solve: ${model.label}`;
  heading.append(state);

  const primary = doc.createElement('p');
  primary.className = 'lafea-solve-readiness__primary-reason';
  primary.dataset.role = 'lafea-solve-readiness-primary';
  primary.textContent = model.primaryMessage;
  section.append(heading, primary);

  const details = createLafeaInfoDisclosure(
    doc,
    model.executionSupported ? 'Solve readiness evidence' : 'Stage execution evidence',
    [
      ...model.steps.map((step) => [step.label, lafeaUiStatusPresentation(step.status).label]),
      ...model.reasons.map((reason, index) => [`Reason ${index + 1}`, `${lafeaWorkbenchReasonLabel(reason)} (${reason})`]),
    ],
    {
      role: 'lafea-solve-readiness-evidence',
      summaryText: 'Why? (i)',
      heading: false,
      className: 'lafea-solve-readiness__evidence',
    },
  );

  if (model.diagnostics.length) {
    const diagnosticSection = doc.createElement('section');
    diagnosticSection.dataset.role = 'lafea-diagnostics';
    diagnosticSection.dataset.guidedRole = 'findings';
    const list = doc.createElement('ul');
    list.className = 'lafea-diagnostics__list';
    for (const item of model.diagnostics) {
      const row = doc.createElement('li');
      row.className = 'lafea-diagnostics__item';
      row.dataset.severity = item.severity;
      const message = doc.createElement('span');
      message.textContent = item.message;
      const code = doc.createElement('code');
      code.textContent = item.code;
      row.append(message, code);
      list.append(row);
    }
    diagnosticSection.append(list);
    details.append(diagnosticSection);
  }

  section.append(details);
  return section;
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value))];
}
