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
    assembleButton.title = 'Assemble the InputXML source into a real run request and send it to Run — requires an authorized pre-flight and a loaded authority supplement.';
    assembleButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h11m0 0-4-4m4 4-4 4"/></svg><span>Assemble &amp; send to Run</span>';
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
      stepButton.innerHTML = `<span class="lfea-pipeline-shell__step-index">${index + 1}</span><span class="lfea-pipeline-shell__step-label">${step.label}</span>`;
      stepButton.addEventListener('click', () => handlers.onStepSelected(step.stepId));
      nav.append(stepButton);
      stepButtons.set(step.stepId, stepButton);
    });

    const content = doc.createElement('div');
    content.className = 'lfea-pipeline-shell__content';
    const sourceHost = doc.createElement('div');
    sourceHost.className = 'lfea-pipeline-shell__host';
    sourceHost.dataset.hostGroup = 'SOURCE';
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

    shell.append(toolbar, nav, content, verificationDrawerHost);
    this.rootElement.append(shell);
    this.elements = {
      shell, toolbar, loadSample, nav, stepButtons, content, sourceHost, loadCaseHost, resultsHost,
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

  setAuthoritySupplementStatus(text) {
    this.elements.authorityText.textContent = text;
  }

  setAssembleStatus(text, isError) {
    this.elements.assembleStatus.textContent = text;
    this.elements.assembleStatus.dataset.status = isError ? 'error' : 'ok';
  }

  render(state) {
    const { stepButtons } = this.elements;
    LFEA_PIPELINE_STEPS.forEach((step) => {
      const stepButton = stepButtons.get(step.stepId);
      const status = state.stepAvailability[step.stepId];
      const isActive = state.activeStepId === step.stepId;
      stepButton.classList.toggle('lfea-pipeline-shell__step--active', isActive);
      stepButton.classList.toggle('lfea-pipeline-shell__step--complete', Boolean(status.complete));
      stepButton.setAttribute('aria-current', isActive ? 'step' : 'false');
      stepButton.disabled = !status.available;
      if (status.detail) stepButton.title = status.detail;
    });
    const activeHostGroup = lfeaPipelineHostGroupFor(state.activeStepId);
    this.elements.sourceHost.hidden = activeHostGroup !== 'SOURCE';
    this.elements.loadCaseHost.hidden = activeHostGroup !== 'LOAD_CASE';
    this.elements.resultsHost.hidden = activeHostGroup !== 'RESULTS';
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
