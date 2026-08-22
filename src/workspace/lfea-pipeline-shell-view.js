import { LFEA_PIPELINE_STEPS, lfeaPipelineHostGroupFor } from './lfea-pipeline-step-registry.js';
import { installLfeaPipelineIconSprite, lfeaPipelineIcon } from './lfea-pipeline-icon-manifest.js';

/** Renders the unified LFEA pipeline stepper chrome around existing panel hosts. */
export class LfeaPipelineShellView {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.documentRef = rootElement.ownerDocument;
    this.elements = null;
  }

  init(handlers) {
    const doc = this.documentRef;
    const shell = doc.createElement('section');
    shell.className = 'lfea-pipeline-shell';
    shell.dataset.role = 'lfea-pipeline-shell';

    installLfeaPipelineIconSprite(shell);

    const toolbar = doc.createElement('div');
    toolbar.className = 'lfea-pipeline-shell__toolbar';
    const loadSample = doc.createElement('button');
    loadSample.type = 'button';
    loadSample.className = 'lfea-pipeline-shell__load-sample';
    loadSample.dataset.action = 'lfea-pipeline-load-sample';
    loadSample.disabled = true;
    loadSample.title = 'Sample fixtures for each input type land in a later phase of the LFEA revamp.';
    loadSample.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"/></svg><span>Load sample</span>';
    toolbar.append(loadSample);

    const authorityLabel = doc.createElement('label');
    authorityLabel.className = 'lfea-pipeline-shell__authority';
    authorityLabel.title = 'A small JSON supplement carrying only interfaceAuthority, nozzleAllowableProfiles, b31Authority, and applicationId — real, cited vendor/code values, not something this tool derives.';
    const authorityInput = doc.createElement('input');
    authorityInput.type = 'file';
    authorityInput.accept = '.json,application/json';
    authorityInput.dataset.role = 'lfea-pipeline-authority-supplement-file';
    authorityInput.hidden = true;
    authorityInput.addEventListener('change', () => handlers.onAuthoritySupplementSelected(authorityInput.files?.[0] ?? null));
    const authorityText = doc.createElement('span');
    authorityText.dataset.role = 'lfea-pipeline-authority-supplement-status';
    authorityText.textContent = 'No authority supplement loaded';
    authorityLabel.append(authorityInput, authorityText);
    toolbar.append(authorityLabel);

    const assembleButton = doc.createElement('button');
    assembleButton.type = 'button';
    assembleButton.className = 'lfea-pipeline-shell__assemble';
    assembleButton.dataset.action = 'lfea-pipeline-assemble-and-run';
    assembleButton.title = 'Optional: add nozzle interface mechanics and B31 code checks on top of the analysis. Needs an authorized pre-flight and an authority supplement (licensed project data). Displacements, support loads and element forces do not need this — use Analyze on the Load case step.';
    assembleButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h11m0 0-4-4m4 4-4 4"/></svg><span>Code checks (optional)</span>';
    assembleButton.addEventListener('click', () => handlers.onAssembleAndSendToRun());
    toolbar.append(assembleButton);
    const assembleStatus = doc.createElement('output');
    assembleStatus.dataset.role = 'lfea-pipeline-assemble-status';
    toolbar.append(assembleStatus);

    // QA for this application itself (a benchmark suite + a frozen ACCDB
    // comparison), not an output of the user's own analysis -- reachable
    // from any step via this one persistent toggle, not gated behind the
    // step sequence like sourceHost/loadCaseHost/resultsHost are.
    const verificationDrawerToggle = doc.createElement('button');
    verificationDrawerToggle.type = 'button';
    verificationDrawerToggle.className = 'lfea-pipeline-shell__verification-toggle';
    verificationDrawerToggle.dataset.action = 'lfea-pipeline-toggle-verification-drawer';
    verificationDrawerToggle.title = 'Verification / ACCDB-QA — benchmark suite and CAESAR II ACCDB comparison for this application itself.';
    verificationDrawerToggle.append(lfeaPipelineIcon(doc, 'icon-verification'));
    const verificationDrawerToggleLabel = doc.createElement('span');
    verificationDrawerToggleLabel.textContent = 'Verification / QA';
    verificationDrawerToggle.append(verificationDrawerToggleLabel);
    verificationDrawerToggle.setAttribute('aria-expanded', 'false');
    verificationDrawerToggle.addEventListener('click', () => this.toggleVerificationDrawer());
    toolbar.append(verificationDrawerToggle);

    const nav = doc.createElement('nav');
    nav.className = 'lfea-pipeline-shell__stepper';
    nav.setAttribute('aria-label', 'LFEA pipeline steps');
    const stepButtons = new Map();
    LFEA_PIPELINE_STEPS.forEach((step, index) => {
      const stepButton = doc.createElement('button');
      stepButton.type = 'button';
      stepButton.className = 'lfea-pipeline-shell__step';
      stepButton.dataset.role = 'lfea-pipeline-step';
      stepButton.dataset.stepId = step.stepId;
      stepButton.innerHTML = `<span class="lfea-pipeline-shell__step-index" data-role="lfea-pipeline-step-index">${index + 1}</span><span class="lfea-pipeline-shell__step-label">${step.label}</span>`;
      stepButton.addEventListener('click', () => handlers.onStepSelected(step.stepId));
      nav.append(stepButton);
      stepButtons.set(step.stepId, stepButton);
    });

    // What is done, and what to do next. The stepper alone could only show
    // six buttons of equal weight; this line names the one step the engineer
    // is actually meant to act on, or says what is blocking if none is
    // reachable.
    const guidance = doc.createElement('p');
    guidance.className = 'lfea-pipeline-shell__guidance';
    guidance.dataset.role = 'lfea-pipeline-guidance';
    guidance.setAttribute('aria-live', 'polite');

    const content = doc.createElement('div');
    content.className = 'lfea-pipeline-shell__content';
    const sourceHost = doc.createElement('div');
    sourceHost.className = 'lfea-pipeline-shell__host';
    sourceHost.dataset.hostGroup = 'SOURCE';
    sourceHost.dataset.activeSource = 'NONE';
    const loadCaseHost = doc.createElement('div');
    loadCaseHost.className = 'lfea-pipeline-shell__host';
    loadCaseHost.dataset.hostGroup = 'LOAD_CASE';
    const resultsHost = doc.createElement('div');
    resultsHost.className = 'lfea-pipeline-shell__host';
    resultsHost.dataset.hostGroup = 'RESULTS';
    content.append(sourceHost, loadCaseHost, resultsHost);

    const verificationDrawerHost = doc.createElement('div');
    verificationDrawerHost.className = 'lfea-pipeline-shell__verification-drawer';
    verificationDrawerHost.dataset.role = 'lfea-pipeline-verification-drawer-host';
    verificationDrawerHost.hidden = true;

    shell.append(toolbar, nav, guidance, content, verificationDrawerHost);
    this.rootElement.append(shell);
    this.elements = {
      shell, toolbar, loadSample, nav, guidance, stepButtons, content, sourceHost, loadCaseHost, resultsHost,
      authorityInput, authorityText, assembleButton, assembleStatus,
      verificationDrawerToggle, verificationDrawerHost,
    };
    return this;
  }

  toggleVerificationDrawer() {
    const host = this.elements.verificationDrawerHost;
    host.hidden = !host.hidden;
    this.elements.verificationDrawerToggle.setAttribute('aria-expanded', host.hidden ? 'false' : 'true');
    this.elements.verificationDrawerToggle.classList.toggle('lfea-pipeline-shell__verification-toggle--open', !host.hidden);
  }

  /**
   * Which source owns the loaded model.
   *
   * All three source panels mount into the same host, which is right while
   * nothing is loaded -- the engineer picks one. Once a model IS loaded, the
   * other two are noise at best: an ACCDB import left the InputXML panel
   * sitting underneath it saying "No native InputXML source is loaded", on
   * the very step that was reviewing the ACCDB model. The stylesheet reads
   * this stamp and shows only the panel that owns what is loaded.
   */
  setActiveSourceKind(kind) {
    this.elements.sourceHost.dataset.activeSource = kind;
  }

  setAuthoritySupplementStatus(text) {
    this.elements.authorityText.textContent = text;
  }

  setAssembleStatus(text, isError) {
    this.elements.assembleStatus.textContent = text;
    this.elements.assembleStatus.dataset.status = isError ? 'error' : 'ok';
  }

  render(state) {
    const { stepButtons } = this.elements;
    const guidance = state.guidance;
    LFEA_PIPELINE_STEPS.forEach((step, index) => {
      const stepButton = stepButtons.get(step.stepId);
      const status = state.stepAvailability[step.stepId];
      const isActive = state.activeStepId === step.stepId;
      const stepStatus = guidance.stepStatusById[step.stepId];
      stepButton.classList.toggle('lfea-pipeline-shell__step--active', isActive);
      stepButton.classList.toggle('lfea-pipeline-shell__step--complete', Boolean(status.complete));
      stepButton.classList.toggle('lfea-pipeline-shell__step--next', guidance.nextStepId === step.stepId);
      stepButton.dataset.stepStatus = stepStatus;
      stepButton.setAttribute('aria-current', isActive ? 'step' : 'false');
      stepButton.disabled = !status.available;
      // A finished step reads as finished at a glance; the number is only
      // useful until it is done.
      const indexCell = stepButton.querySelector('[data-role="lfea-pipeline-step-index"]');
      if (indexCell) indexCell.textContent = status.complete ? '✓' : String(index + 1);
      // Every disabled step says what would unblock it rather than being a
      // dead button with no explanation.
      const title = status.complete
        ? `${step.label}: done.`
        : status.available
          ? (status.detail ?? `${step.label}: ready.`)
          : (status.blockedReason ?? status.detail ?? `${step.label} is not reachable yet.`);
      stepButton.title = title;
      stepButton.setAttribute('aria-label', `${step.label} — ${stepStatus.toLowerCase()}. ${title}`);
    });
    this.elements.guidance.textContent =
      `Step ${guidance.completedCount} of ${guidance.stepCount} complete. ${guidance.nextActionText}`;
    this.elements.guidance.dataset.nextStepId = guidance.nextStepId ?? '';
    const activeHostGroup = lfeaPipelineHostGroupFor(state.activeStepId);
    this.elements.sourceHost.hidden = activeHostGroup !== 'SOURCE';
    // INPUT and ERROR_CHECK share the SOURCE host but are not the same view:
    // Input is the file and what was read from it, Error check is the review
    // of what that means. Stamping the step lets each show only its own half
    // instead of both rendering the whole panel identically.
    this.elements.sourceHost.dataset.activeStep = state.activeStepId;
    this.elements.loadCaseHost.hidden = activeHostGroup !== 'LOAD_CASE';
    this.elements.resultsHost.hidden = activeHostGroup !== 'RESULTS';
    // RUN, OUTPUT and EXPORT share the RESULTS host and are no more the same
    // view than Input and Error check are: Run is whether it solved, Output is
    // the numbers, Export is getting them out. Without this stamp all three
    // rendered the same page -- every panel in the host at once, including the
    // separate sealed-package workbench, which asks for its own authorization
    // and knows nothing about the model just analyzed.
    this.elements.resultsHost.dataset.activeStep = state.activeStepId;
  }

  getSourceHost() {
    return this.elements.sourceHost;
  }

  getLoadCaseHost() {
    return this.elements.loadCaseHost;
  }

  getResultsHost() {
    return this.elements.resultsHost;
  }

  getVerificationDrawerHost() {
    return this.elements.verificationDrawerHost;
  }

  destroy() {
    this.elements?.shell.remove();
    this.elements = null;
  }
}
