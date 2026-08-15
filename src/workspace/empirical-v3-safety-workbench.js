import {
  createEngineeringConfirmationReceipt,
  requireEmpiricalV3SafetyPresentationPackage,
} from '../core/empirical-v3-safety/index.js';
import { EventBus } from './event-bus.js';
import { EVENT_TOPICS } from './event-topics.js';
import { renderEmpiricalV3BranchBasis } from './empirical-v3-branch-basis-view.js';
import {
  focusEmpiricalV3Risk,
  renderEmpiricalV3SafetyGate,
} from './empirical-v3-safety-gate-view.js';
import { renderEmpiricalV3EvidenceInspector } from './empirical-v3-evidence-view.js';

export function mountEmpiricalV3SafetyWorkbench(applicationRoot, options = {}) {
  if (!applicationRoot || typeof applicationRoot.querySelector !== 'function') {
    throw new TypeError('Empirical V3 safety workbench requires the application root.');
  }
  const panelContainer = applicationRoot.querySelector(
    '[data-panel="properties"] .panel-collapsible-content',
  );
  if (!panelContainer) throw new TypeError('Empirical V3 safety workbench mount root is missing.');
  const controller = new EmpiricalV3SafetyWorkbenchController(
    panelContainer,
    options.documentRef ?? applicationRoot.ownerDocument,
    options,
  );
  return controller.init();
}

export class EmpiricalV3SafetyWorkbenchController {
  constructor(panelContainer, documentRef, options = {}) {
    this.panelContainer = panelContainer;
    this.documentRef = documentRef;
    this.options = options;
    this.packageValue = null;
    this.activeTab = 'BRANCH_BASIS';
    this.lastConfirmationReceipt = null;
    this.message = 'No sealed Empirical V3 safety package is loaded.';
    this.error = '';
    this.elements = null;
  }

  init() {
    if (this.elements) return this;
    this.elements = createSection(this.documentRef);
    this.panelContainer.append(this.elements.section);
    this.elements.branchTab.addEventListener('click', () => this.setTab('BRANCH_BASIS'));
    this.elements.safetyTab.addEventListener('click', () => this.setTab('SAFETY_GATE'));
    this.elements.clearButton.addEventListener('click', () => this.clear());
    this.render();
    return this;
  }

  loadPackage(value) {
    this.packageValue = requireEmpiricalV3SafetyPresentationPackage(value);
    this.lastConfirmationReceipt = null;
    this.error = '';
    this.message = [
      `Loaded safety package for ${this.packageValue.runId}.`,
      `Workflow ${this.packageValue.workflow.state}.`,
      `Risk set ${this.packageValue.riskSet.riskSetId}.`,
    ].join(' ');
    this.render();
    return this.packageValue;
  }

  clear() {
    this.packageValue = null;
    this.lastConfirmationReceipt = null;
    this.error = '';
    this.message = 'Empirical V3 safety package cleared.';
    this.render();
  }

  setTab(tab) {
    if (!['BRANCH_BASIS', 'SAFETY_GATE'].includes(tab)) throw new RangeError(`Unsupported Empirical V3 tab: ${tab}`);
    this.activeTab = tab;
    this.render();
  }

  openRisk(riskId) {
    this.activeTab = 'SAFETY_GATE';
    this.render();
    return focusEmpiricalV3Risk(this.elements.content, riskId);
  }

  locateEntities(entityIds) {
    const ids = uniqueTexts(entityIds);
    if (!ids.length) return;
    if (typeof this.options.onLocateEntities === 'function') {
      this.options.onLocateEntities(ids);
      return;
    }
    EventBus.publish(EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED, {
      entityId: ids[0],
      source: 'api',
    });
    this.message = ids.length === 1
      ? `Located ${ids[0]}.`
      : `Located ${ids[0]}; ${ids.length - 1} additional governed entities remain linked to this finding.`;
    this.renderStatus();
  }

  showRecord(ref, semanticHash) {
    const entry = this.packageValue?.records.find((record) => (
      record.ref === ref && (!semanticHash || record.semanticHash === semanticHash)
    )) ?? null;
    renderEmpiricalV3EvidenceInspector(this.elements.evidence, entry);
    if (!entry) {
      this.error = `No sealed presentation record is available for ${ref}.`;
      this.renderStatus();
    }
    return entry;
  }

  reviewAssumption(risk, review = {}) {
    if (!this.packageValue) throw new Error('A current safety package is required.');
    const actor = requiredText(review.actor, 'Reviewer');
    const comment = requiredText(review.comment, 'Review basis / comment');
    try {
      const receipt = createEngineeringConfirmationReceipt({
        risk,
        basisCode: 'ENGINEER_CONFIRMED_CURRENT_ASSUMPTION',
        basisParameters: {
          riskSemanticHash: risk.semanticHash,
          reasonCode: risk.reasonCode,
          valueSnapshot: risk.valueSnapshot,
        },
        authorityRefs: risk.authorityRefs.filter((ref) => ref.semanticHash),
        auditMetadata: {
          actor,
          timestamp: new Date().toISOString(),
          comment,
        },
      });
      this.lastConfirmationReceipt = receipt;
      this.error = '';
      this.message = [
        `Created singular confirmation ${receipt.receiptId}.`,
        'The current Safety Gate remains unchanged until the domain supplies a re-evaluated sealed package.',
      ].join(' ');
      const nextPackage = this.options.onConfirmationCreated?.(receipt, this.packageValue) ?? null;
      if (nextPackage) this.packageValue = requireEmpiricalV3SafetyPresentationPackage(nextPackage);
      this.render();
      return receipt;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.message = 'Engineering assumption confirmation was rejected.';
      this.render();
      throw error;
    }
  }

  requestRun() {
    if (!this.packageValue?.workflow.canRunCalculation || !this.packageValue.calculationAuthorization) {
      throw new Error('Empirical V3 calculation requires the current sealed calculation authorization.');
    }
    if (typeof this.options.onRunRequested !== 'function') {
      throw new Error('Empirical V3 execution bridge is not wired.');
    }
    return this.options.onRunRequested({
      authorization: this.packageValue.calculationAuthorization,
      packageValue: this.packageValue,
    });
  }

  getSnapshot() {
    return Object.freeze({
      status: this.packageValue ? 'CURRENT' : 'EMPTY',
      runId: this.packageValue?.runId ?? null,
      workflowState: this.packageValue?.workflow.state ?? 'NO_PACKAGE',
      packageSemanticHash: this.packageValue?.semanticHash ?? null,
      riskSetSemanticHash: this.packageValue?.riskSet.semanticHash ?? null,
      activeTab: this.activeTab,
      lastConfirmationReceiptId: this.lastConfirmationReceipt?.receiptId ?? null,
      message: this.message,
      error: this.error || null,
    });
  }

  getPackage() { return this.packageValue; }
  getLastConfirmationReceipt() { return this.lastConfirmationReceipt; }

  render() {
    if (!this.elements) return;
    this.renderStatus();
    this.elements.branchTab.setAttribute('aria-selected', String(this.activeTab === 'BRANCH_BASIS'));
    this.elements.safetyTab.setAttribute('aria-selected', String(this.activeTab === 'SAFETY_GATE'));
    this.elements.clearButton.disabled = !this.packageValue;
    if (!this.packageValue) {
      const empty = this.documentRef.createElement('p');
      empty.className = 'empirical-v3-safety__empty';
      empty.textContent = 'Load a sealed safety presentation package to review Branch Basis and the Calculation Safety Gate.';
      this.elements.content.replaceChildren(empty);
      renderEmpiricalV3EvidenceInspector(this.elements.evidence, null);
      return;
    }
    const actions = {
      locate: (ids) => this.locateEntities(ids),
      showRecord: (ref, hash) => this.showRecord(ref, hash),
      openRisk: (riskId) => this.openRisk(riskId),
      review: (risk, review) => this.reviewAssumption(risk, review),
      run: typeof this.options.onRunRequested === 'function' ? () => this.requestRun() : null,
    };
    if (this.activeTab === 'BRANCH_BASIS') {
      renderEmpiricalV3BranchBasis(this.elements.content, this.packageValue, actions);
    } else {
      renderEmpiricalV3SafetyGate(this.elements.content, this.packageValue, actions);
    }
  }

  renderStatus() {
    if (!this.elements) return;
    this.elements.status.textContent = this.message;
    this.elements.error.hidden = !this.error;
    this.elements.error.textContent = this.error;
  }

  destroy() {
    this.elements?.section.remove();
    this.elements = null;
    this.packageValue = null;
    this.lastConfirmationReceipt = null;
  }
}

function createSection(doc) {
  const section = doc.createElement('section');
  section.className = 'properties-accordion-section empirical-v3-safety';
  section.dataset.role = 'empirical-v3-safety-workbench';
  const header = doc.createElement('header');
  header.className = 'accordion-section-header';
  const title = doc.createElement('span');
  title.className = 'accordion-section-title';
  title.textContent = 'Empirical V3 Safety';
  header.append(title);
  const body = doc.createElement('div');
  body.className = 'accordion-section-body';
  const toolbar = doc.createElement('div');
  toolbar.className = 'empirical-v3-safety__toolbar';
  const branchTab = button(doc, 'Branch Basis', 'empirical-v3-branch-basis-tab');
  const safetyTab = button(doc, 'Safety Gate', 'empirical-v3-safety-gate-tab');
  branchTab.setAttribute('role', 'tab');
  safetyTab.setAttribute('role', 'tab');
  const clearButton = button(doc, 'Clear', 'empirical-v3-safety-clear');
  toolbar.append(branchTab, safetyTab, clearButton);
  const status = doc.createElement('output');
  status.className = 'empirical-v3-safety__status';
  status.setAttribute('aria-live', 'polite');
  const error = doc.createElement('p');
  error.className = 'empirical-v3-safety__error';
  error.hidden = true;
  const content = doc.createElement('div');
  content.className = 'empirical-v3-safety__content';
  const evidence = doc.createElement('aside');
  evidence.className = 'empirical-v3-safety__evidence';
  evidence.hidden = true;
  body.append(toolbar, status, error, content, evidence);
  section.append(header, body);
  return { section, branchTab, safetyTab, clearButton, status, error, content, evidence };
}

function button(doc, label, role) {
  const value = doc.createElement('button');
  value.type = 'button';
  value.textContent = label;
  value.dataset.role = role;
  return value;
}
function uniqueTexts(value) {
  if (!Array.isArray(value)) throw new TypeError('entityIds must be an array.');
  return [...new Set(value.map((item) => requiredText(item, 'entityId')))];
}
function requiredText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}
