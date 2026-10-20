/**
 * LFEA Error Check Legacy Authorization Panel & State Machine
 */

import { lfeaPipelineIcon } from '../lfea-pipeline-icon-manifest.js';
import { actionButton, paragraph } from './lfea-error-check-detailed-views.js';

export function renderAuthorizationPanel(controller) {
  const doc = controller.documentRef;
  const state = authorizationState(controller);
  const fragment = doc.createDocumentFragment();
  const heading = doc.createElement('h4');
  heading.textContent = 'Run authorization';
  fragment.append(heading);

  const stateLine = doc.createElement('div');
  stateLine.className = 'lfea-common-error-check__authorization-state';
  stateLine.dataset.role = 'lfea-error-check-authorization-state';
  stateLine.dataset.state = state.stateId;
  stateLine.append(lfeaPipelineIcon(doc, state.iconId));
  const stateText = doc.createElement('strong');
  stateText.textContent = state.title;
  stateLine.append(stateText);
  fragment.append(stateLine, paragraph(doc, state.detail));

  if (state.stateId === 'CONDITIONAL_PENDING') {
    fragment.append(renderAuthorizationForm(controller, state));
  } else if (state.stateId === 'AUTHORIZED' || state.stateId === 'PASS') {
    const continueButton = actionButton(doc, 'Continue to Load case', 'icon-step-load-case');
    continueButton.classList.add('lfea-common-error-check__primary-action');
    continueButton.dataset.action = 'lfea-error-check-continue';
    continueButton.disabled = typeof controller.options.onContinue !== 'function';
    continueButton.addEventListener('click', () => controller.continueToLoadCase());
    fragment.append(continueButton);
  }

  if (controller.authorizationError) {
    const error = paragraph(doc, controller.authorizationError);
    error.className = 'lfea-common-error-check__authorization-error';
    error.dataset.role = 'lfea-error-check-authorization-error';
    error.setAttribute('role', 'alert');
    fragment.append(error);
  }

  if (!controller.presentation.empty) {
    const warning = paragraph(doc,
      'Changing the source, B31 authority, smooth-90 rule, profile or load-case selection invalidates this authorization.');
    warning.className = 'lfea-common-error-check__invalidation';
    fragment.append(warning, renderAuthorizationEvidence(doc, controller));
  }
  return fragment;
}

export function renderAuthorizationForm(controller, state) {
  const doc = controller.documentRef;
  const fragment = doc.createDocumentFragment();
  const progress = doc.createElement('div');
  progress.className = 'lfea-common-error-check__progress';
  const label = doc.createElement('label');
  label.textContent = `${state.acknowledgedCount} of ${state.conditionalCount} limitations reviewed (open each one above)`;
  label.setAttribute('for', 'lfea-error-check-progress');
  const meter = doc.createElement('progress');
  meter.id = 'lfea-error-check-progress';
  meter.max = Math.max(1, state.conditionalCount);
  meter.value = state.acknowledgedCount;
  progress.append(label, meter);

  const acceptance = doc.createElement('label');
  acceptance.className = 'lfea-common-error-check__acceptance';
  const checkbox = doc.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.dataset.role = 'lfea-error-check-accept-limitations';
  checkbox.checked = controller.limitationsAccepted;
  const acceptanceText = doc.createElement('span');
  acceptanceText.textContent = `I have reviewed each of the ${state.conditionalCount} limitation${state.conditionalCount === 1 ? '' : 's'} above and accept ${state.conditionalCount === 1 ? 'it' : 'them'} for this run.`;
  acceptance.append(checkbox, acceptanceText);

  const reviewer = labelledInput(doc, 'Reviewer', 'lfea-error-check-reviewer', controller.reviewerIdentity);
  const reason = labelledTextarea(doc, 'Reason', 'lfea-error-check-reason', controller.reviewReason);
  const authorize = actionButton(doc,
    `Authorize run with ${state.conditionalCount} limitation${state.conditionalCount === 1 ? '' : 's'}`,
    'icon-step-error-check');
  authorize.classList.add('lfea-common-error-check__primary-action');
  authorize.dataset.action = 'authorize-lfea-error-check-limitations';
  authorize.disabled = !state.ready || controller.authorizing;
  authorize.addEventListener('click', () => controller.authorizeRun());

  const updateDraft = () => {
    controller.reviewerIdentity = reviewer.input.value;
    controller.reviewReason = reason.input.value;
    controller.authorizationError = '';
    authorize.disabled = !authorizationState(controller).ready || controller.authorizing;
  };
  reviewer.input.addEventListener('input', updateDraft);
  reason.input.addEventListener('input', updateDraft);
  checkbox.addEventListener('change', () => {
    controller.setLimitationsAccepted(checkbox.checked);
  });
  fragment.append(progress, acceptance, reviewer.label, reason.label, authorize);
  return fragment;
}

export function renderAuthorizationEvidence(doc, controller) {
  const list = doc.createElement('dl');
  list.className = 'lfea-common-error-check__authorization-evidence';
  const rows = [
    ['Preparation hash', shortHash(controller.presentation.preparationSemanticHash)],
    ['Diagnostics hash', shortHash(controller.presentation.evidenceSummary.diagnosticsSemanticHash)],
    ['Profile', controller.presentation.evidenceSummary.requestedProfileId ?? 'UNAVAILABLE'],
  ];
  for (const [lbl, val] of rows) {
    const term = doc.createElement('dt');
    term.textContent = lbl;
    const desc = doc.createElement('dd');
    desc.textContent = val;
    list.append(term, desc);
  }
  return list;
}

export function renderEvidenceSummary(doc, presentation, host) {
  host.replaceChildren();
  if (presentation.empty) return;
  const heading = doc.createElement('h4');
  heading.textContent = 'Evidence custody';
  const list = doc.createElement('dl');
  const rows = [
    ['Preparation hash', shortHash(presentation.preparationSemanticHash)],
    ['Diagnostics hash', shortHash(presentation.evidenceSummary.diagnosticsSemanticHash)],
    ['Evidence hash', shortHash(presentation.preparationEvidenceHash)],
    ['Governed findings', String(presentation.findingCount)],
    ['Distinct issues', String(presentation.distinctIssueCount)],
  ];
  for (const [lbl, val] of rows) {
    const term = doc.createElement('dt');
    term.textContent = lbl;
    const desc = doc.createElement('dd');
    desc.textContent = val;
    list.append(term, desc);
  }
  host.append(heading, list);
}

export function labelledInput(doc, labelText, role, value) {
  const label = doc.createElement('label');
  label.className = 'lfea-common-error-check__field';
  const span = doc.createElement('span');
  span.textContent = labelText;
  const input = doc.createElement('input');
  input.type = 'text';
  input.dataset.role = role;
  input.value = value ?? '';
  label.append(span, input);
  return { label, input };
}

export function labelledTextarea(doc, labelText, role, value) {
  const label = doc.createElement('label');
  label.className = 'lfea-common-error-check__field';
  const span = doc.createElement('span');
  span.textContent = labelText;
  const input = doc.createElement('textarea');
  input.dataset.role = role;
  input.rows = 2;
  input.value = value ?? '';
  label.append(span, input);
  return { label, input };
}

export function authorizationState(controller) {
  const presentation = controller.presentation;
  if (presentation.empty) {
    return state('EMPTY', 'No model loaded', 'Load a model to view pre-flight findings and authorize.', 'icon-status-inactive', false, 0, 0,
      'No model loaded.');
  }
  if (presentation.counts.BLOCK > 0) {
    return state('BLOCKING', 'Run blocked by source findings',
      `${presentation.counts.BLOCK} finding${presentation.counts.BLOCK === 1 ? '' : 's'} must be fixed in the source file before this model can be run.`,
      'icon-status-blocked', false, 0, 0,
      'BLOCK findings must be fixed in source.');
  }
  const groups = conditionalGroups(presentation);
  const acknowledgedCount = groups.filter((group) => controller.acknowledgedGroupIds.has(group.groupId)).length;
  if (presentation.solveAuthorized) {
    const reviewer = controller.preFlight?.approverIdentity ?? 'the current reviewer';
    return state('AUTHORIZED', 'Run authorized', `The current limitation set is sealed by ${reviewer}.`, 'icon-status-complete', false,
      groups.length, groups.length, 'The current pre-flight is already authorized.');
  }
  if (groups.length === 0) {
    return state('PASS', 'No authorization required', 'The current pre-flight has no conditional limitations.', 'icon-status-complete', false, 0, 0,
      'No conditional limitations require authorization.');
  }
  const reviewerReady = controller.reviewerIdentity.trim() !== '';
  const reasonReady = controller.reviewReason.trim() !== '';
  const callbackReady = typeof controller.options.onAuthorizePreFlight === 'function';
  const allReviewed = acknowledgedCount === groups.length;
  const accepted = controller.limitationsAccepted;
  const ready = allReviewed && accepted && reviewerReady && reasonReady && callbackReady;
  const blockedReason = !allReviewed
    ? `Open and review all ${groups.length} limitation${groups.length === 1 ? '' : 's'} above, then accept them below.`
    : !accepted
      ? 'Tick the acceptance box to confirm the reviewed limitations are accepted for this run.'
      : !reviewerReady
        ? 'Enter the reviewer name before authorizing.'
        : !reasonReady
          ? 'Enter an acceptance reason before authorizing.'
          : !callbackReady
            ? 'The active source does not expose an authorization controller.'
            : '';
  return state('CONDITIONAL_PENDING', ready ? 'Ready to authorize' : 'Review required',
    `${acknowledgedCount} of ${groups.length} limitations reviewed.`, 'icon-step-error-check', ready,
    groups.length, acknowledgedCount, blockedReason);
}

export function state(stateId, title, detail, iconId, ready, conditionalCount, acknowledgedCount, blockedReason) {
  return Object.freeze({ stateId, title, detail, iconId, ready, conditionalCount, acknowledgedCount, blockedReason });
}

export function conditionalGroups(presentation) {
  return presentation.sections.flatMap((section) => section.groups)
    .filter((group) => group.disposition === 'CONDITIONAL');
}

export function findGroup(presentation, groupId) {
  for (const section of presentation.sections) {
    const hit = section.groups.find((entry) => entry.groupId === groupId);
    if (hit) return hit;
  }
  return null;
}

export function toggleSetValue(values, key) {
  if (values.has(key)) values.delete(key);
  else values.add(key);
}

export function errorCheckStatusLabel(presentation) {
  if (presentation.empty) return 'No model';
  if (presentation.counts.BLOCK > 0) return `${presentation.counts.BLOCK} blocking`;
  if (presentation.solveAuthorized) return 'Authorized';
  if (presentation.counts.CONDITIONAL > 0) return `${presentation.counts.CONDITIONAL} conditional`;
  if (presentation.counts.ADVISORY > 0) return 'Advisory notes';
  return 'Passed';
}

export function errorCheckStatusToken(presentation) {
  if (presentation.empty) return 'INACTIVE';
  if (presentation.counts.BLOCK > 0) return 'BLOCK';
  if (presentation.solveAuthorized) return 'PASS';
  if (presentation.counts.CONDITIONAL > 0) return 'CONDITIONAL';
  if (presentation.counts.ADVISORY > 0) return 'ADVISORY';
  return 'PASS';
}

export function shortHash(value) {
  if (!value) return 'NONE';
  const text = String(value);
  return text.length > 16 ? text.slice(0, 8) + '...' + text.slice(-8) : text;
}
