import {
  sealInputXmlProductionBendFactorAuthority,
} from '../core/linear-piping-analysis-consumer/inputxml-production-bend-factor-authority.js';
import {
  sealInputXmlProductionBranchFactorAuthority,
} from '../core/linear-piping-analysis-consumer/inputxml-production-branch-factor-authority.js';

import { EMPTY_SELECTION, normalizeSelection, normalizeLfeaComponentBasisSelection } from './lfea-component-basis-selection.js';
import { createLfeaBendFactorAuthorityControl } from './lfea-component-basis-view.js';
export { LFEA_BEND_FACTOR_EDITION_OPTIONS, LFEA_BEND_SMOOTH90_OPTIONS, normalizeLfeaComponentBasisSelection } from './lfea-component-basis-selection.js';
export { createLfeaBendFactorAuthorityControl } from './lfea-component-basis-view.js';

let currentSelection = EMPTY_SELECTION;
// Every mounted instance of the control shares the one governed selection.
// A Set rather than a single reference: the control is mounted both at the
// top of the source step and inline inside the Error Check BLOCK row, and
// both must stay in sync. Instances stay registered while disconnected --
// a panel that re-renders re-appends the same node, and it must already
// hold the shared selection when it reconnects.
const mountedControls = new Set();
// Direct subscribers receive the explicitly selected basis irrespective of
// profile-control DOM replacement or inline Error Check re-rendering.
const authoritySelectionListeners = new Set();

export function subscribeLfeaBendFactorAuthoritySelection(listener) {
  if (typeof listener !== 'function') throw new TypeError('An authority selection listener is required.');
  authoritySelectionListeners.add(listener);
  return () => authoritySelectionListeners.delete(listener);
}

export function lfeaBendFactorAuthoritySelection() {
  return currentSelection;
}

/**
 * The single mutation path for the component factor selection. Updates the
 * shared selection, mirrors it into every mounted control instance (so the
 * top-of-step control and an inline copy never disagree), and re-runs the
 * native pre-flights -- the same regeneration a profile change triggers.
 */
export function setLfeaBendFactorAuthoritySelection(selection, doc) {
  currentSelection = normalizeSelection(selection);
  for (const control of mountedControls) {
    // Sync detached instances too: setting select values works fine on a
    // disconnected node, and an instance that a panel re-appends later must
    // never show a selection the governed state no longer holds.
    control.syncFromSelection(currentSelection);
  }
  const docRef = doc
    ?? [...mountedControls].find((control) => control.root.isConnected)?.root?.ownerDocument
    ?? (typeof document !== 'undefined' ? document : null);
  if (docRef) regenerateNativePreFlights(docRef);
  // Unlike synthetic profile-select events, this path cannot silently miss
  // the active ACCDB adapter when a repaired source's inline controls move.
  // Listeners must regenerate their own current intake (and must never
  // interpret a complete UI selection as an authorization).
  for (const listener of [...authoritySelectionListeners]) listener(currentSelection);
  return currentSelection;
}

export function lfeaBendFactorAuthorityForIntake(intake, selection = currentSelection) {
  const resolvedSelection = normalizeLfeaComponentBasisSelection(selection);
  if (!resolvedSelection.complete) return null;
  const intakeSemanticHash = requireIntakeSemanticHash(intake);
  const smoothToken = resolvedSelection.smooth90FlexibilityCorrection ? 'YES' : 'NO';
  const intakeToken = safeToken(intakeSemanticHash).slice(-20).toUpperCase();
  return sealInputXmlProductionBendFactorAuthority({
    authorityId: `LFEA-BEND-FACTOR-${resolvedSelection.editionProfileId}-SMOOTH90-${smoothToken}-${intakeToken}`,
    editionProfileId: resolvedSelection.editionProfileId,
    smooth90FlexibilityCorrection: resolvedSelection.smooth90FlexibilityCorrection,
    sourceId: 'LFEA_UI_EXPLICIT_COMPONENT_FACTOR_SELECTION',
    sourceRevision: `INTAKE-${intakeSemanticHash}`,
  });
}

/** Tee/branch authority needs the explicit edition only; smooth-90 is bend-only. */
export function lfeaBranchFactorAuthorityForIntake(intake, selection = currentSelection) {
  const resolvedSelection = normalizeLfeaComponentBasisSelection(selection);
  if (resolvedSelection.editionProfileId === null) return null;
  const intakeSemanticHash = requireIntakeSemanticHash(intake);
  const intakeToken = safeToken(intakeSemanticHash).slice(-20).toUpperCase();
  return sealInputXmlProductionBranchFactorAuthority({
    authorityId: `LFEA-BRANCH-FACTOR-${resolvedSelection.editionProfileId}-${intakeToken}`,
    editionProfileId: resolvedSelection.editionProfileId,
    sourceId: 'LFEA_UI_EXPLICIT_COMPONENT_FACTOR_SELECTION',
    sourceRevision: `INTAKE-${intakeSemanticHash}`,
  });
}

export function ensureLfeaBendFactorAuthorityControl(doc) {
  if (!doc || typeof doc.querySelector !== 'function') return null;
  const host = doc.querySelector('[data-role="linear-piping-consumer-root"]');
  if (!host || typeof host.append !== 'function') return null;
  // Reuse the instance already mounted in this host. Presence is asked of the
  // host itself, because the module's mount contract is a role query -- DOM
  // conveniences such as Element.contains are not part of it and headless
  // check harnesses (the s3 guard's stub document) do not implement them.
  // An inline instance mounted inside an Error Check BLOCK row is never
  // returned here: a caller asking for the top-of-source control must not be
  // handed a row's control.
  const mountedRoot = typeof host.querySelector === 'function'
    ? host.querySelector('[data-role="lfea-bend-factor-authority-control"]')
    : null;
  if (mountedRoot) {
    for (const control of mountedControls) {
      if (control.root === mountedRoot && !control.inline) return control;
    }
  }
  const control = createLfeaBendFactorAuthorityControl(doc, {
    initialSelection: currentSelection,
    onChanged(selection) { setLfeaBendFactorAuthoritySelection(selection, doc); },
  });
  mountedControls.add(control);
  if (typeof host.prepend === 'function') host.prepend(control.root);
  else host.append(control.root);
  return control;
}

/**
 * A second, caller-placed instance of the control for surfaces that report
 * the authority gate and must offer the fix right there (the Error Check
 * BLOCK row). It shares the governed selection with the top-of-step control
 * through setLfeaBendFactorAuthoritySelection, so a choice made in either
 * place re-runs the pre-flight exactly once and both stay in sync.
 * The caller keeps the returned control and re-appends its root across
 * re-renders; the node is moved, never recreated, so listeners survive.
 */
export function mountLfeaInlineBendFactorAuthorityControl(doc) {
  const control = createLfeaBendFactorAuthorityControl(doc, {
    initialSelection: currentSelection,
    inline: true,
    onChanged(selection) { setLfeaBendFactorAuthoritySelection(selection, doc); },
  });
  control.root.classList.add('lfea-bend-factor-authority-control--inline');
  mountedControls.add(control);
  return control;
}

/**
 * Bring the top-of-step control on screen and spotlight it. Re-mounts it
 * first if its fragile startup mount never landed, so callers can rely on
 * this rather than silently no-op-ing against a missing node. Returns
 * whether a control was there to reveal.
 */
export function revealLfeaBendFactorAuthorityControl(doc) {
  const root = ensureLfeaBendFactorAuthorityControl(doc)?.root
    ?? doc?.querySelector?.('[data-role="lfea-bend-factor-authority-control"]');
  if (!root) return false;
  root.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  root.classList?.add('lfea-bend-factor-authority-control--spotlight');
  const setTimeoutFn = doc?.defaultView?.setTimeout ?? globalThis.setTimeout;
  if (typeof setTimeoutFn === 'function') {
    setTimeoutFn(() => root.classList?.remove('lfea-bend-factor-authority-control--spotlight'), 2600);
  }
  return true;
}

function regenerateNativePreFlights(doc) {
  for (const role of [
    'linear-piping-inputxml-profile',
    'lfea-pipeline-accdb-profile',
  ]) {
    const select = doc.querySelector(`[data-role="${role}"]`);
    if (!select || typeof select.dispatchEvent !== 'function') continue;
    const EventCtor = doc.defaultView?.Event ?? globalThis.Event;
    if (typeof EventCtor === 'function') select.dispatchEvent(new EventCtor('change', { bubbles: true }));
  }
}

function requireIntakeSemanticHash(intake) {
  const value = intake?.semanticHash;
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('Component factor authority requires a sealed source intake semantic hash.');
  }
  return value;
}
function safeToken(value) { return String(value).replace(/[^A-Za-z0-9]/gu, ''); }

/** Adopt an already validated source candidate and its explicit basis together.
 * No profile-select events are emitted: the source owner has prepared once.
 * Its subscriber skips the owner context; other sources refresh normally.
 */
export function commitLfeaComponentBasisSelection(selection, { expectedSelection, owner, onAdopt } = {}) {
  const next = normalizeLfeaComponentBasisSelection(selection);
  if (JSON.stringify(normalizeLfeaComponentBasisSelection(expectedSelection)) !== JSON.stringify(currentSelection)) {
    throw new TypeError('Component basis preview is stale.');
  }
  if (typeof onAdopt !== 'function' || onAdopt.constructor.name === 'AsyncFunction') {
    throw new TypeError('A synchronous source-owner adoption is required.');
  }
  onAdopt();
  currentSelection = next;
  const presentationErrors = [];
  const safely = operation => {
    try { operation(); } catch (error) { presentationErrors.push(error instanceof Error ? error.message : String(error)); }
  };
  for (const control of mountedControls) safely(() => control.syncFromSelection(next));
  for (const listener of [...authoritySelectionListeners]) safely(() => listener(next, { owner }));
  return Object.freeze({ selection: next, presentationErrors: Object.freeze(presentationErrors) });
}
