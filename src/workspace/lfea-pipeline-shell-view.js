import { LFEA_PIPELINE_STEPS, lfeaPipelineHostGroupFor, requireLfeaPipelineStep } from './lfea-pipeline-step-registry.js';
import { installLfeaPipelineIconSprite, lfeaPipelineIcon } from './lfea-pipeline-icon-manifest.js';

/** Renders the unified LFEA pipeline chrome and native task hosts. */
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
    loadSample.className = 'lfea-pipeline-shell__toolbar-action lfea-pipeline-shell__load-sample';
    loadSample.dataset.action = 'lfea-pipeline-load-sample';
    loadSample.title = 'Load the repository sample CAESAR II InputXML model.';
    loadSample.append(lfeaPipelineIcon(doc, 'icon-load-sample'), toolbarText(doc, 'Load sample'));
    loadSample.addEventListener('click', () => handlers.onLoadSample?.());
    toolbar.append(loadSample);

    const optionalToolsLabel = doc.createElement('span');
    optionalToolsLabel.className = 'lfea-pipeline-shell__toolbar-status';
    optionalToolsLabel.dataset.role = 'lfea-pipeline-optional-tools-label';
    optionalToolsLabel.textContent = 'Optional tools';
    optionalToolsLabel.title = 'These controls are outside the normal Input → Error check → Load case → Run → Output → Export path.';
    toolbar.append(optionalToolsLabel);

    const authorityLabel = doc.createElement('label');
    authorityLabel.className = 'lfea-pipeline-shell__toolbar-action lfea-pipeline-shell__authority';
    authorityLabel.title = 'Optional governed authority supplement for interface/B31 code checks. Normal LFEA analysis does not require it.';
    const authorityInput = doc.createElement('input');
    authorityInput.type = 'file';
    authorityInput.accept = '.json,application/json';
    authorityInput.dataset.role = 'lfea-pipeline-authority-supplement-file';
    authorityInput.hidden = true;
    authorityInput.addEventListener('change', () => handlers.onAuthoritySupplementSelected(authorityInput.files?.[0] ?? null));
    const authorityText = doc.createElement('span');
    authorityText.className = 'lfea-pipeline-shell__toolbar-status';
    authorityText.dataset.role = 'lfea-pipeline-authority-supplement-status';
    authorityText.textContent = 'Not loaded';
    authorityLabel.append(
      lfeaPipelineIcon(doc, 'icon-authority-supplement'),
      authorityInput,
      toolbarText(doc, 'Authority supplement'),
      authorityText,
    );
    toolbar.append(authorityLabel);

    const assembleButton = doc.createElement('button');
    assembleButton.type = 'button';
    assembleButton.className = 'lfea-pipeline-shell__toolbar-action lfea-pipeline-shell__assemble';
    assembleButton.dataset.action = 'lfea-pipeline-assemble-and-run';
    assembleButton.title = 'Optional interface/B31 code checks. Normal LFEA analysis uses the Run step.';
    assembleButton.append(lfeaPipelineIcon(doc, 'icon-code-checks'), toolbarText(doc, 'Code checks'));
    assembleButton.addEventListener('click', () => handlers.onAssembleAndSendToRun());
    toolbar.append(assembleButton);

    const assembleStatus = doc.createElement('output');
    assembleStatus.dataset.role = 'lfea-pipeline-assemble-status';
    toolbar.append(assembleStatus);

    const verificationDrawerToggle = doc.createElement('button');
    verificationDrawerToggle.type = 'button';
    verificationDrawerToggle.className = 'lfea-pipeline-shell__toolbar-action lfea-pipeline-shell__verification-toggle';
    verificationDrawerToggle.dataset.action = 'lfea-pipeline-toggle-verification-drawer';
    verificationDrawerToggle.title = 'Verification / ACCDB-QA for this application.';
    verificationDrawerToggle.append(lfeaPipelineIcon(doc, 'icon-verification'), toolbarText(doc, 'Verification / QA'));
    verificationDrawerToggle.setAttribute('aria-expanded', 'false');
    verificationDrawerToggle.addEventListener('click', () => this.toggleVerificationDrawer());
    toolbar.append(verificationDrawerToggle);

    const nav = doc.createElement('nav');
    nav.className = 'lfea-pipeline-shell__stepper';
    nav.setAttribute('aria-label', 'LFEA pipeline steps');
    const stepButtons = new Map();
    const stepConnectors = [];
    LFEA_PIPELINE_STEPS.forEach((step, index) => {
      const stepButton = doc.createElement('button');
      stepButton.type = 'button';
      stepButton.className = 'lfea-pipeline-shell__step';
      stepButton.dataset.role = 'lfea-pipeline-step';
      stepButton.dataset.stepId = step.stepId;

      const visual = doc.createElement('span');
      visual.className = 'lfea-pipeline-shell__step-visual';
      visual.append(lfeaPipelineIcon(doc, step.iconId));
      const ordinal = doc.createElement('span');
      ordinal.className = 'lfea-pipeline-shell__step-index';
      ordinal.dataset.role = 'lfea-pipeline-step-index';
      ordinal.textContent = String(index + 1);
      visual.append(ordinal);
      const completeIcon = doc.createElement('span');
      completeIcon.className = 'lfea-pipeline-shell__step-complete-icon';
      completeIcon.dataset.role = 'lfea-pipeline-step-complete-icon';
      completeIcon.hidden = true;
      completeIcon.append(lfeaPipelineIcon(doc, 'icon-status-complete'));
      visual.append(completeIcon);

      const copy = doc.createElement('span');
      copy.className = 'lfea-pipeline-shell__step-copy';
      const label = doc.createElement('span');
      label.className = 'lfea-pipeline-shell__step-label';
      label.textContent = step.label;
      const statusText = doc.createElement('span');
      statusText.className = 'lfea-pipeline-shell__step-status';
      statusText.dataset.role = 'lfea-pipeline-step-status-label';
      copy.append(label, statusText);
      stepButton.append(visual, copy);
      stepButton.addEventListener('click', () => handlers.onStepSelected(step.stepId));
      nav.append(stepButton);
      stepButtons.set(step.stepId, stepButton);

      if (index < LFEA_PIPELINE_STEPS.length - 1) {
        const connector = doc.createElement('span');
        connector.className = 'lfea-pipeline-shell__connector';
        connector.dataset.role = 'lfea-pipeline-step-connector';
        connector.dataset.fromStepId = step.stepId;
        connector.dataset.toStepId = LFEA_PIPELINE_STEPS[index + 1].stepId;
        connector.dataset.connectorStatus = 'PENDING';
        connector.setAttribute('aria-hidden', 'true');
        nav.append(connector);
        stepConnectors.push(connector);
      }
    });

    const activeContext = doc.createElement('div');
    activeContext.className = 'lfea-pipeline-shell__context';
    activeContext.dataset.role = 'lfea-pipeline-active-step-context';
    const activeContextIcon = doc.createElement('span');
    activeContextIcon.className = 'lfea-pipeline-shell__context-icon';
    activeContextIcon.dataset.role = 'lfea-pipeline-active-step-icon';
    const activeContextCopy = doc.createElement('span');
    activeContextCopy.className = 'lfea-pipeline-shell__context-copy';
    const activeContextEyebrow = doc.createElement('span');
    activeContextEyebrow.className = 'lfea-pipeline-shell__context-eyebrow';
    activeContextEyebrow.dataset.role = 'lfea-pipeline-active-step-position';
    const activeContextTitle = doc.createElement('strong');
    activeContextTitle.dataset.role = 'lfea-pipeline-active-step-title';
    const activeContextDescription = doc.createElement('span');
    activeContextDescription.className = 'lfea-pipeline-shell__context-description';
    activeContextDescription.dataset.role = 'lfea-pipeline-active-step-description';
    activeContextCopy.append(activeContextEyebrow, activeContextTitle, activeContextDescription);
    const activeContextState = doc.createElement('span');
    activeContextState.className = 'lfea-pipeline-shell__context-state';
    activeContextState.dataset.role = 'lfea-pipeline-active-step-state';
    activeContext.append(activeContextIcon, activeContextCopy, activeContextState);

    const guidance = doc.createElement('p');
    guidance.className = 'lfea-pipeline-shell__guidance';
    guidance.dataset.role = 'lfea-pipeline-guidance';
    guidance.setAttribute('aria-live', 'polite');

    const content = doc.createElement('div');
    content.className = 'lfea-pipeline-shell__content';
    const sourceHost = taskHost(doc, 'SOURCE');
    sourceHost.dataset.activeSource = 'NONE';
    const loadCaseHost = taskHost(doc, 'LOAD_CASE');
    const runHost = taskHost(doc, 'RUN');
    const outputHost = taskHost(doc, 'OUTPUT');
    const exportHost = taskHost(doc, 'EXPORT');
    content.append(sourceHost, loadCaseHost, runHost, outputHost, exportHost);

    const verificationDrawerHost = doc.createElement('div');
    verificationDrawerHost.className = 'lfea-pipeline-shell__verification-drawer';
    verificationDrawerHost.dataset.role = 'lfea-pipeline-verification-drawer-host';
    verificationDrawerHost.hidden = true;

    shell.append(toolbar, nav, activeContext, guidance, content, verificationDrawerHost);
    this.rootElement.append(shell);
    this.elements = {
      shell, toolbar, loadSample, nav, guidance, stepButtons, stepConnectors, content,
      sourceHost, loadCaseHost, runHost, outputHost, exportHost,
      authorityInput, authorityText, assembleButton, assembleStatus,
      verificationDrawerToggle, verificationDrawerHost,
      activeContext, activeContextIcon, activeContextEyebrow, activeContextTitle, activeContextDescription, activeContextState,
    };
    return this;
  }

  toggleVerificationDrawer() {
    const host = this.elements.verificationDrawerHost;
    host.hidden = !host.hidden;
    this.elements.verificationDrawerToggle.setAttribute('aria-expanded', host.hidden ? 'false' : 'true');
    this.elements.verificationDrawerToggle.classList.toggle('lfea-pipeline-shell__verification-toggle--open', !host.hidden);
  }

  setActiveSourceKind(kind) { this.elements.sourceHost.dataset.activeSource = kind; }
  setAuthoritySupplementStatus(text) { this.elements.authorityText.textContent = normalizeAuthorityStatus(text); }
  setAssembleStatus(text, isError) {
    this.elements.assembleStatus.textContent = text;
    this.elements.assembleStatus.dataset.status = isError ? 'error' : 'ok';
  }

  render(state) {
    const guidance = state.guidance;
    LFEA_PIPELINE_STEPS.forEach((step, index) => {
      const stepButton = this.elements.stepButtons.get(step.stepId);
      const status = state.stepAvailability[step.stepId];
      const isActive = state.activeStepId === step.stepId;
      const stepStatus = guidance.stepStatusById[step.stepId];
      stepButton.classList.toggle('lfea-pipeline-shell__step--active', isActive);
      stepButton.classList.toggle('lfea-pipeline-shell__step--complete', Boolean(status.complete));
      stepButton.classList.toggle('lfea-pipeline-shell__step--next', guidance.nextStepId === step.stepId);
      stepButton.dataset.stepStatus = stepStatus;
      stepButton.setAttribute('aria-current', isActive ? 'step' : 'false');
      stepButton.disabled = !status.available;
      const indexCell = stepButton.querySelector('[data-role="lfea-pipeline-step-index"]');
      if (indexCell) indexCell.textContent = String(index + 1);
      const completeIcon = stepButton.querySelector('[data-role="lfea-pipeline-step-complete-icon"]');
      if (completeIcon) completeIcon.hidden = !status.complete;
      const statusLabel = stepButton.querySelector('[data-role="lfea-pipeline-step-status-label"]');
      if (statusLabel) statusLabel.textContent = readableStatus(stepStatus);
      const title = status.complete
        ? `${step.label}: done.`
        : status.available
          ? (status.detail ?? `${step.label}: ready.`)
          : (status.blockedReason ?? status.detail ?? `${step.label} is not reachable yet.`);
      stepButton.title = title;
      stepButton.setAttribute('aria-label', `${step.label} — ${stepStatus.toLowerCase()}. ${title}`);
    });

    this.elements.stepConnectors.forEach((connector) => {
      const from = state.stepAvailability[connector.dataset.fromStepId];
      const to = state.stepAvailability[connector.dataset.toStepId];
      const touchesActive = state.activeStepId === connector.dataset.fromStepId
        || state.activeStepId === connector.dataset.toStepId;
      connector.dataset.connectorStatus = from.complete
        ? 'COMPLETE'
        : !to.available
          ? 'BLOCKED'
          : touchesActive || guidance.nextStepId === connector.dataset.toStepId ? 'ACTIVE' : 'PENDING';
    });

    const activeStep = requireLfeaPipelineStep(state.activeStepId);
    const activeIndex = LFEA_PIPELINE_STEPS.findIndex((step) => step.stepId === activeStep.stepId);
    const activeStatus = guidance.stepStatusById[activeStep.stepId];
    this.elements.activeContext.dataset.stepId = activeStep.stepId;
    this.elements.activeContext.dataset.stepStatus = activeStatus;
    this.elements.activeContextIcon.replaceChildren(lfeaPipelineIcon(this.documentRef, activeStep.iconId));
    this.elements.activeContextEyebrow.textContent = `Step ${activeIndex + 1} of ${LFEA_PIPELINE_STEPS.length}`;
    this.elements.activeContextTitle.textContent = activeStep.label;
    this.elements.activeContextDescription.textContent = activeStep.description;
    this.elements.activeContextState.textContent = readableStatus(activeStatus);
    this.elements.guidance.textContent = `${guidance.completedCount} of ${guidance.stepCount} steps complete · ${guidance.nextActionText}`;
    this.elements.guidance.dataset.nextStepId = guidance.nextStepId ?? '';

    const activeHostGroup = lfeaPipelineHostGroupFor(state.activeStepId);
    for (const host of this.taskHosts()) {
      host.hidden = host.dataset.hostGroup !== activeHostGroup;
      host.dataset.activeStep = state.activeStepId;
    }
  }

  taskHosts() {
    return [this.elements.sourceHost, this.elements.loadCaseHost, this.elements.runHost, this.elements.outputHost, this.elements.exportHost];
  }

  getSourceHost() { return this.elements.sourceHost; }
  getLoadCaseHost() { return this.elements.loadCaseHost; }
  getRunHost() { return this.elements.runHost; }
  getOutputHost() { return this.elements.outputHost; }
  // Compatibility: existing consumers use ResultsHost for result/application surfaces.
  getResultsHost() { return this.elements.outputHost; }
  getExportHost() { return this.elements.exportHost; }
  getVerificationDrawerHost() { return this.elements.verificationDrawerHost; }

  destroy() {
    this.elements?.shell.remove();
    this.elements = null;
  }
}

function taskHost(doc, group) {
  const host = doc.createElement('div');
  host.className = 'lfea-pipeline-shell__host';
  host.dataset.hostGroup = group;
  return host;
}

function toolbarText(doc, text) {
  const span = doc.createElement('span');
  span.className = 'lfea-pipeline-shell__toolbar-label';
  span.textContent = text;
  return span;
}

function readableStatus(status) {
  return ({ COMPLETE: 'Complete', CURRENT: 'Current', READY: 'Ready', BLOCKED: 'Blocked' })[status] ?? status;
}

function normalizeAuthorityStatus(text) {
  if (text === 'No authority supplement loaded') return 'Not loaded';
  if (text.startsWith('Loaded: ')) return text.slice('Loaded: '.length);
  return text;
}