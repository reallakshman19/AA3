

import { revealLfeaBendFactorAuthorityControl } from './lfea-bend-factor-authority-control.js';

import { plainLanguageForCapability, plainLanguageForCapabilityStatus } from './lfea-finding-plain-language.js';

import { button, labelledTextInput } from './lfea-accdb-panel-utils.js';
export function renderCapabilities(doc, root, controller) {
  const heading = doc.createElement('strong');
  heading.textContent = `Model-health capabilities — ${controller.requestedProfileId}`;
  root.append(heading);

  const note = doc.createElement('p');
  note.dataset.role = 'lfea-pipeline-accdb-profile-note';
  note.textContent = 'These are what the model can and cannot do as it stands, for the profile selected above. "Not used by the selected profile" means the other profile would need it — it is not a fault in your model. Anything marked "does not stop an analysis" is recorded for you to see, and never blocks a run.';
  root.append(note);

  const capTable = doc.createElement('table');
  capTable.dataset.role = 'lfea-pipeline-accdb-capabilities';
  for (const capability of controller.healthView.capabilities) {
    const tr = doc.createElement('tr');
    tr.dataset.status = capability.status;
    tr.dataset.appliesToProfile = String(capability.appliesToProfile);
    tr.dataset.gatesSolve = String(capability.gatesSolve);
    const th = doc.createElement('th');
    th.scope = 'row';
    th.textContent = plainLanguageForCapability(capability.capabilityId);
    th.title = capability.capabilityId;
    const td = doc.createElement('td');
    const statusWords = plainLanguageForCapabilityStatus(capability.status);
    td.textContent = capability.gatesSolve
      ? statusWords
      : `${statusWords} — does not stop an analysis`;
    tr.append(th, td);
    capTable.append(tr);
  }
  root.append(capTable);
}

/**
 * Where this model stands, and the one control that moves it forward.
 *
 * A conditional pre-flight needs an engineer to accept the disclosed
 * simplifications by name before anything downstream will run, so the panel
 * asks for that here rather than leaving the Load-case step disabled with no
 * visible way to enable it.
 */
export function renderPreFlight(doc, root, controller) {
  const status = doc.createElement('p');
  status.dataset.role = 'lfea-pipeline-accdb-preflight-status';
  status.dataset.status = controller.preFlight?.status ?? (controller.preFlightError ? 'FAILED' : 'NOT_PREPARED');
  if (controller.preFlightError) {
    status.textContent = `This model cannot be prepared for analysis: ${controller.preFlightError}`;
    root.append(status);
    return;
  }
  if (!controller.preFlight) {
    status.textContent = 'This model has not been prepared for analysis.';
    root.append(status);
    return;
  }
  if (controller.preFlight.solveAuthorized) {
    status.textContent = controller.preFlight.approverIdentity
      ? `Ready to analyse. Limitations accepted by ${controller.preFlight.approverIdentity}.`
      : 'Ready to analyse. Nothing needed accepting.';
    root.append(status);
    return;
  }
  if (controller.preFlight.status === 'BLOCK') {
    // The blocking findings live in preparation.findings, not in the
    // model-health groups above -- rendering the generic instruction with
    // nothing below it was a dead end. Print the actual blockers, and for
    // the component-factor authority gates point at the control that
    // resolves them. Re-importing is never required: a resolved blocker
    // re-runs preparation through the profile/control change events.
    status.textContent = 'This model cannot be analysed yet. The item(s) below stop it. '
      + 'Resolve them and the pre-flight runs again on its own -- there is no need to load the file again.';
    root.append(status);
    root.append(renderBlockingPreparationFindings(doc, controller));
    return;
  }
  status.textContent = 'This model can be analysed once you accept the notes below. '
    + 'They are simplifications this tool makes, not faults in your model — your name and reason are recorded with the acceptance.';
  root.append(status);

  const custody = doc.createElement('div');
  custody.dataset.role = 'lfea-pipeline-accdb-acceptance';
  const reviewer = labelledTextInput(doc, 'Your name ', 'lfea-pipeline-accdb-reviewer', controller.reviewerIdentity);
  reviewer.input.addEventListener('input', () => { controller.reviewerIdentity = reviewer.input.value; });
  const reason = labelledTextInput(doc, 'Reason ', 'lfea-pipeline-accdb-review-reason', controller.reviewReason);
  reason.input.addEventListener('input', () => { controller.reviewReason = reason.input.value; });
  const accept = button(doc, 'Accept these notes and continue');
  accept.dataset.action = 'accept-lfea-pipeline-accdb-limitations';
  accept.addEventListener('click', () => controller.acceptLimitations());
  custody.append(reviewer.label, reason.label, accept);
  root.append(custody);
}

/**
 * Blockers preparation retained but the model-health verdict never showed.
 *
 * Capability/model-health findings are rendered by renderFindingGroups; a
 * pre-flight can still BLOCK on preparation-only findings (today: the
 * B31/B31J bend and welding-tee factor authority gates). An engineer told to
 * "fix the items marked 'Stops the analysis' below" found nothing below,
 * because these findings were never rendered anywhere in this panel.
 */
const COMPONENT_FACTOR_AUTHORITY_CODES = new Set([
  'BEND_FACTOR_EDITION_AUTHORITY_UNRESOLVED',
  'BRANCH_FACTOR_EDITION_AUTHORITY_UNRESOLVED',
]);

export function renderBlockingPreparationFindings(doc, controller) {
  const root = doc.createElement('div');
  root.dataset.role = 'lfea-pipeline-accdb-blocking-findings';
  const blocking = (controller.preFlight?.preparation?.findings ?? [])
    .filter((finding) => finding?.disposition === 'BLOCK' || finding?.severity === 'ERROR');
  if (blocking.length === 0) {
    const none = doc.createElement('p');
    none.textContent = 'No blocking finding was retained with this pre-flight. Report this state -- it should not be reachable.';
    root.append(none);
    return root;
  }
  const heading = doc.createElement('strong');
  heading.textContent = `Blocking this analysis — ${blocking.length} item(s)`;
  root.append(heading);
  const list = doc.createElement('ul');
  for (const finding of blocking) {
    const item = doc.createElement('li');
    item.dataset.code = finding.code;
    const message = doc.createElement('p');
    message.textContent = `${finding.message} (${finding.code})`;
    item.append(message);
    if (COMPONENT_FACTOR_AUTHORITY_CODES.has(finding.code)) {
      const guidance = doc.createElement('p');
      guidance.dataset.role = 'lfea-pipeline-accdb-blocker-guidance';
      guidance.append(
        'Resolve it on this step: choose an edition under "B31 / B31J component basis". ',
      );
      const jump = button(doc, 'Go to the component basis control');
      jump.dataset.action = 'goto-lfea-bend-factor-authority-control';
      jump.addEventListener('click', () => {
        // Re-mounts the control first if its fragile startup mount never
        // landed, so this never silently no-ops against a missing node.
        revealLfeaBendFactorAuthorityControl(doc);
      });
      guidance.append(jump);
      item.append(guidance);
    } else if (finding.remediation) {
      const remediation = doc.createElement('p');
      remediation.textContent = `Remediation: ${finding.remediation}`;
      item.append(remediation);
    }
    list.append(item);
  }
  root.append(list);
  return root;
}
