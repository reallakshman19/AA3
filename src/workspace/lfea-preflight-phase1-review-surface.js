import {
  LFEA_PREFLIGHT_PHASE1_REVIEW_PROVIDERS,
  getLfeaPreflightPhase1ReviewCell,
} from './lfea-preflight-phase1-review-source.js';
import {
  appendLfeaPreflightPhase1ReviewAction,
  createLfeaPreflightPhase1ReviewSession,
  getLfeaPreflightPhase1CellReview,
  getLfeaPreflightPhase1ReviewSessionSnapshot,
  registerLfeaPreflightPhase1CellProposal,
} from './lfea-preflight-phase1-review-session.js';
import { LFEA_PREFLIGHT_REVIEW_ACTION } from './lfea-preflight-phase1-review-ledger.js';
import { LFEA_PREFLIGHT_FIELD_STATUS } from './lfea-preflight-phase1-schema.js';

export function mountLfeaPreflightPhase1ReviewSurface(applicationRoot, options = {}) {
  if (!applicationRoot || typeof applicationRoot.append !== 'function') {
    throw new TypeError('Phase-1 review surface requires an application root.');
  }
  if (typeof options.getSource !== 'function' || typeof options.getViewportModel !== 'function') {
    throw new TypeError('Phase-1 review surface requires source and viewport getters.');
  }
  if (typeof options.nowUtc !== 'function') {
    throw new TypeError('Phase-1 review surface requires an explicit nowUtc provider.');
  }
  const documentRef = options.documentRef ?? applicationRoot.ownerDocument ?? document;
  const elements = createSurface(documentRef);
  applicationRoot.append(elements.root);
  let boundStructuralHash = null;
  let session = null;
  let destroyed = false;
  let refreshQueued = false;

  function ensureSession(source) {
    if (!source || source.blocked || !source.structuralHash) {
      session = null;
      boundStructuralHash = null;
      return null;
    }
    if (session === null || boundStructuralHash !== source.structuralHash) {
      session = createLfeaPreflightPhase1ReviewSession(
        source,
        LFEA_PREFLIGHT_PHASE1_REVIEW_PROVIDERS,
        { reviewerPolicyId: 'LFEA-PREFLIGHT-PHASE1-REVIEW-R1' },
      );
      boundStructuralHash = source.structuralHash;
    }
    return session;
  }

  function scheduleRefresh() {
    if (destroyed || refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => {
      refreshQueued = false;
      if (!destroyed) refresh();
    });
  }

  function refresh() {
    const source = options.getSource();
    const viewportModel = options.getViewportModel();
    const activeSession = ensureSession(source);
    const selection = viewportModel?.selection ?? null;
    if (!source || source.blocked || activeSession === null || !reviewableSelection(selection)) {
      renderEmpty(elements, source?.blocked ? source.reason : selectionBlockReason(selection));
      return;
    }
    const { targetId, fieldOrdinal, fieldId } = selection;
    const cell = getLfeaPreflightPhase1ReviewCell(source, targetId, fieldOrdinal);
    if (cell === null) {
      renderEmpty(elements, 'Selected engineering cell is no longer available.');
      return;
    }
    let review = getLfeaPreflightPhase1CellReview(activeSession, targetId, fieldOrdinal);
    if (cell.status === LFEA_PREFLIGHT_FIELD_STATUS.PROPOSED_REVIEW && review.proposals.length === 0) {
      registerLfeaPreflightPhase1CellProposal(activeSession, {
        targetId,
        fieldOrdinal,
        createdAt: options.nowUtc(),
        sourceEvidence: { registrationAuthority: 'LIVE_REVIEW_SURFACE_SELECTED_PROPOSAL' },
      });
      review = getLfeaPreflightPhase1CellReview(activeSession, targetId, fieldOrdinal);
    }
    renderSelected(elements, {
      targetId,
      fieldOrdinal,
      fieldId,
      cell,
      review,
      sessionSnapshot: getLfeaPreflightPhase1ReviewSessionSnapshot(activeSession),
    });
  }

  function perform(action, extra = {}) {
    const source = options.getSource();
    const viewportModel = options.getViewportModel();
    const activeSession = ensureSession(source);
    const selection = viewportModel?.selection ?? null;
    if (!source || source.blocked || activeSession === null || !reviewableSelection(selection)) {
      elements.feedback.textContent = selectionBlockReason(selection);
      elements.feedback.dataset.status = 'BLOCK';
      return;
    }
    const actor = elements.actor.value.trim();
    const reason = elements.reason.value.trim();
    if (!actor || !reason) {
      elements.feedback.textContent = 'Reviewer identity and reason are required before appending a review event.';
      elements.feedback.dataset.status = 'BLOCK';
      return;
    }
    const review = getLfeaPreflightPhase1CellReview(
      activeSession,
      selection.targetId,
      selection.fieldOrdinal,
    );
    let proposalId = extra.proposalId ?? null;
    if ([LFEA_PREFLIGHT_REVIEW_ACTION.ACCEPT, LFEA_PREFLIGHT_REVIEW_ACTION.REJECT].includes(action)) {
      proposalId = proposalId ?? review.proposals.at(-1)?.proposalId ?? null;
      if (proposalId === null) {
        elements.feedback.textContent = `${action} requires an explicit upstream proposal for the selected cell.`;
        elements.feedback.dataset.status = 'BLOCK';
        return;
      }
    }
    try {
      appendLfeaPreflightPhase1ReviewAction(activeSession, {
        action,
        targetId: selection.targetId,
        fieldOrdinal: selection.fieldOrdinal,
        proposalId,
        value: extra.value,
        compensatesEventId: extra.compensatesEventId,
        actor,
        reason,
        occurredAt: options.nowUtc(),
        evidence: { surface: 'LFEA_PHASE1_REVIEW_SURFACE' },
      });
      elements.feedback.textContent = `${action} appended to immutable review ledger.`;
      elements.feedback.dataset.status = 'PASS';
      refresh();
    } catch (error) {
      elements.feedback.textContent = `${error?.code ?? 'REVIEW_EVENT_FAILED'}: ${error instanceof Error ? error.message : String(error)}`;
      elements.feedback.dataset.status = 'BLOCK';
    }
  }

  elements.accept.addEventListener('click', () => perform(LFEA_PREFLIGHT_REVIEW_ACTION.ACCEPT));
  elements.reject.addEventListener('click', () => perform(LFEA_PREFLIGHT_REVIEW_ACTION.REJECT));
  elements.defer.addEventListener('click', () => perform(LFEA_PREFLIGHT_REVIEW_ACTION.DEFER));
  elements.override.addEventListener('click', () => {
    const value = parseOverrideValue(elements.overrideValue.value);
    if (value === null) {
      elements.feedback.textContent = 'Override value is required and must be finite when numeric.';
      elements.feedback.dataset.status = 'BLOCK';
      return;
    }
    perform(LFEA_PREFLIGHT_REVIEW_ACTION.OVERRIDE, { value });
  });
  elements.undo.addEventListener('click', () => {
    const source = options.getSource();
    const viewportModel = options.getViewportModel();
    const activeSession = ensureSession(source);
    const selection = viewportModel?.selection ?? null;
    if (!activeSession || !reviewableSelection(selection)) {
      elements.feedback.textContent = selectionBlockReason(selection);
      elements.feedback.dataset.status = 'BLOCK';
      return;
    }
    const review = getLfeaPreflightPhase1CellReview(
      activeSession,
      selection.targetId,
      selection.fieldOrdinal,
    );
    const candidate = [...review.events].reverse().find((event) => event.action !== LFEA_PREFLIGHT_REVIEW_ACTION.UNDO
      && !review.reviewState.compensatedEventIds.includes(event.eventId));
    if (!candidate) {
      elements.feedback.textContent = 'No uncompensated review event is available to undo for this cell.';
      elements.feedback.dataset.status = 'BLOCK';
      return;
    }
    perform(LFEA_PREFLIGHT_REVIEW_ACTION.UNDO, { compensatesEventId: candidate.eventId });
  });

  const watchedEvents = ['click', 'keyup', 'change', 'scroll'];
  for (const eventName of watchedEvents) applicationRoot.addEventListener(eventName, scheduleRefresh, true);
  refresh();

  return Object.freeze({
    refresh,
    getSessionSnapshot() {
      return session ? getLfeaPreflightPhase1ReviewSessionSnapshot(session) : null;
    },
    getSelectedReview() {
      const source = options.getSource();
      const viewportModel = options.getViewportModel();
      const activeSession = ensureSession(source);
      const selection = viewportModel?.selection ?? null;
      if (!activeSession || !reviewableSelection(selection)) return null;
      return getLfeaPreflightPhase1CellReview(
        activeSession,
        selection.targetId,
        selection.fieldOrdinal,
      );
    },
    destroy() {
      destroyed = true;
      for (const eventName of watchedEvents) applicationRoot.removeEventListener(eventName, scheduleRefresh, true);
      elements.root.remove();
    },
  });
}

function createSurface(documentRef) {
  const root = el(documentRef, 'section', 'lfea-phase1-review-ledger');
  root.dataset.role = 'lfea-phase1-review-ledger';
  const header = el(documentRef, 'div', 'lfea-phase1-review-ledger__header');
  header.append(
    textEl(documentRef, 'h3', 'Review ledger / Trace'),
    textEl(documentRef, 'p', 'Append-only engineering review evidence. Undo compensates a prior event; it never deletes history.'),
  );
  const identity = el(documentRef, 'div', 'lfea-phase1-review-ledger__identity');
  const actor = input(documentRef, 'text', 'Reviewer identity');
  actor.dataset.role = 'lfea-phase1-reviewer';
  const reason = input(documentRef, 'text', 'Review reason / technical basis');
  reason.dataset.role = 'lfea-phase1-review-reason';
  identity.append(actor, reason);

  const trace = el(documentRef, 'dl', 'lfea-phase1-review-ledger__trace');
  const actions = el(documentRef, 'div', 'lfea-phase1-review-ledger__actions');
  const accept = button(documentRef, 'Accept proposal', 'ACCEPT');
  const reject = button(documentRef, 'Reject proposal', 'REJECT');
  const overrideValue = input(documentRef, 'text', 'Override value');
  overrideValue.dataset.role = 'lfea-phase1-override-value';
  const override = button(documentRef, 'Override', 'OVERRIDE');
  const defer = button(documentRef, 'Defer', 'DEFER');
  const undo = button(documentRef, 'Undo last event', 'UNDO');
  actions.append(accept, reject, overrideValue, override, defer, undo);
  const feedback = textEl(documentRef, 'p', 'Select an engineering cell to inspect review custody.');
  feedback.className = 'lfea-phase1-review-ledger__feedback';
  root.append(header, identity, trace, actions, feedback);
  return { root, actor, reason, trace, accept, reject, overrideValue, override, defer, undo, feedback };
}

function renderEmpty(elements, reason) {
  elements.trace.replaceChildren();
  addTrace(elements.trace, 'State', reason ?? 'Select an engineering cell in the virtualized review grid.');
  setActionAvailability(elements, { proposalEligible: false, undoEligible: false, selected: false });
}

function renderSelected(elements, value) {
  elements.trace.replaceChildren();
  addTrace(elements.trace, 'Target', value.targetId);
  addTrace(elements.trace, 'Field', `${value.fieldId} [${value.fieldOrdinal}]`);
  addTrace(elements.trace, 'Value', formatValue(value.cell.value));
  addTrace(elements.trace, 'Status', value.cell.statusText);
  addTrace(elements.trace, 'Source', value.cell.sourceKind);
  addTrace(elements.trace, 'Method', value.cell.method);
  addTrace(elements.trace, 'Locator', value.cell.locator);
  addTrace(elements.trace, 'Source hash', value.cell.sourceHash ?? '—');
  const evidence = Array.isArray(value.cell.evidence) ? value.cell.evidence : [];
  addTrace(elements.trace, 'Evidence count', evidence.length);
  evidence.forEach((entry, index) => {
    addTrace(elements.trace, `Evidence ${index + 1}`, formatEvidence(entry));
  });
  addTrace(elements.trace, 'Review disposition', value.review.reviewState.disposition);
  addTrace(elements.trace, 'Proposal IDs', value.review.proposalIds.join(', ') || '—');
  addTrace(elements.trace, 'Review event IDs', value.review.events.map((event) => event.eventId).join(', ') || '—');
  addTrace(elements.trace, 'Ledger hash', value.sessionSnapshot.ledgerSemanticHash);
  const proposalEligible = value.review.proposals.length > 0;
  const uncompensated = value.review.events.some((event) => event.action !== LFEA_PREFLIGHT_REVIEW_ACTION.UNDO
    && !value.review.reviewState.compensatedEventIds.includes(event.eventId));
  setActionAvailability(elements, { proposalEligible, undoEligible: uncompensated, selected: true });
}

function formatEvidence(entry) {
  return [
    entry.sourceKind,
    entry.statusText,
    `value=${formatValue(entry.value)}`,
    `method=${entry.method}`,
    `locator=${entry.locator ?? '—'}`,
    `hash=${entry.sourceHash ?? '—'}`,
    entry.diagnostics?.length ? `diagnostics=${entry.diagnostics.join(',')}` : null,
  ].filter(Boolean).join(' | ');
}

function setActionAvailability(elements, state) {
  elements.accept.disabled = !state.proposalEligible;
  elements.reject.disabled = !state.proposalEligible;
  elements.override.disabled = !state.selected;
  elements.overrideValue.disabled = !state.selected;
  elements.defer.disabled = !state.selected;
  elements.undo.disabled = !state.undoEligible;
}

function reviewableSelection(selection) {
  return Boolean(selection && selection.inFilteredSet !== false && selection.inPreset !== false);
}

function selectionBlockReason(selection) {
  if (!selection) return 'Select an engineering cell in the virtualized review grid.';
  if (selection.inFilteredSet === false) {
    return 'Selected engineering cell is outside the current indexed filter or exception queue. Review actions are disabled.';
  }
  if (selection.inPreset === false) {
    return 'Selected engineering field is outside the current column preset. Review actions are disabled.';
  }
  return 'Selected engineering cell is unavailable for review.';
}

function addTrace(root, label, value) {
  const documentRef = root.ownerDocument;
  root.append(textEl(documentRef, 'dt', label), textEl(documentRef, 'dd', String(value ?? '—')));
}

function parseOverrideValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const numeric = Number(text);
  return Number.isFinite(numeric) && /^[-+]?\d/u.test(text) ? numeric : text;
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function input(documentRef, type, placeholder) {
  const node = el(documentRef, 'input', 'lfea-phase1-review-ledger__input');
  node.type = type;
  node.placeholder = placeholder;
  return node;
}

function button(documentRef, label, action) {
  const node = textEl(documentRef, 'button', label);
  node.type = 'button';
  node.dataset.reviewAction = action;
  node.className = 'lfea-phase1-review-ledger__button';
  return node;
}

function textEl(documentRef, tagName, text) {
  const node = el(documentRef, tagName);
  node.textContent = text;
  return node;
}

function el(documentRef, tagName, className) {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  return node;
}
