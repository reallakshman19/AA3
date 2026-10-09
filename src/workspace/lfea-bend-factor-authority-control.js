import {
  sealInputXmlProductionBendFactorAuthority,
} from '../core/linear-piping-analysis-consumer/inputxml-production-bend-factor-authority.js';
import {
  sealInputXmlProductionBranchFactorAuthority,
} from '../core/linear-piping-analysis-consumer/inputxml-production-branch-factor-authority.js';

export const LFEA_BEND_FACTOR_EDITION_OPTIONS = Object.freeze([
  Object.freeze({ value: 'B31_3_2018_APPENDIX_D', label: 'ASME B31.3 2018 — Appendix D' }),
  Object.freeze({ value: 'B31_3_2020_B31J_2017', label: 'ASME B31.3 2020 + B31J 2017' }),
  Object.freeze({ value: 'B31_3_2022_B31J_2017', label: 'ASME B31.3 2022 + B31J 2017' }),
  Object.freeze({ value: 'B31_3_2024_B31J_2023', label: 'ASME B31.3 2024 + B31J 2023' }),
]);

export const LFEA_BEND_SMOOTH90_OPTIONS = Object.freeze([
  Object.freeze({ value: 'NO', label: 'Do not apply smooth 90° correction' }),
  Object.freeze({ value: 'YES', label: 'Apply smooth 90° correction where applicable' }),
]);

const EMPTY_SELECTION = Object.freeze({
  editionProfileId: null,
  smooth90FlexibilityCorrection: null,
  complete: false,
});

let currentSelection = EMPTY_SELECTION;
// Every mounted instance of the control shares the one governed selection.
// A Set rather than a single reference: the control is mounted both at the
// top of the source step and inline inside the Error Check BLOCK row, and
// both must stay in sync. Instances stay registered while disconnected --
// a panel that re-renders re-appends the same node, and it must already
// hold the shared selection when it reconnects.
const mountedControls = new Set();

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
  return currentSelection;
}

export function lfeaBendFactorAuthorityForIntake(intake) {
  if (!currentSelection.complete) return null;
  const intakeSemanticHash = requireIntakeSemanticHash(intake);
  const smoothToken = currentSelection.smooth90FlexibilityCorrection ? 'YES' : 'NO';
  const intakeToken = safeToken(intakeSemanticHash).slice(-20).toUpperCase();
  return sealInputXmlProductionBendFactorAuthority({
    authorityId: `LFEA-BEND-FACTOR-${currentSelection.editionProfileId}-SMOOTH90-${smoothToken}-${intakeToken}`,
    editionProfileId: currentSelection.editionProfileId,
    smooth90FlexibilityCorrection: currentSelection.smooth90FlexibilityCorrection,
    sourceId: 'LFEA_UI_EXPLICIT_COMPONENT_FACTOR_SELECTION',
    sourceRevision: `INTAKE-${intakeSemanticHash}`,
  });
}

/** Tee/branch authority needs the explicit edition only; smooth-90 is bend-only. */
export function lfeaBranchFactorAuthorityForIntake(intake) {
  if (currentSelection.editionProfileId === null) return null;
  const intakeSemanticHash = requireIntakeSemanticHash(intake);
  const intakeToken = safeToken(intakeSemanticHash).slice(-20).toUpperCase();
  return sealInputXmlProductionBranchFactorAuthority({
    authorityId: `LFEA-BRANCH-FACTOR-${currentSelection.editionProfileId}-${intakeToken}`,
    editionProfileId: currentSelection.editionProfileId,
    sourceId: 'LFEA_UI_EXPLICIT_COMPONENT_FACTOR_SELECTION',
    sourceRevision: `INTAKE-${intakeSemanticHash}`,
  });
}

export function ensureLfeaBendFactorAuthorityControl(doc) {
  if (!doc || typeof doc.querySelector !== 'function') return null;
  const host = doc.querySelector('[data-role="linear-piping-consumer-root"]');
  if (!host || typeof host.append !== 'function') return null;
  for (const control of mountedControls) {
    if (control.root.isConnected && host.contains(control.root)) return control;
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

export function createLfeaBendFactorAuthorityControl(doc, options) {
  const resolvedOptions = options === undefined ? {} : options;
  if (!doc || typeof doc.createElement !== 'function') {
    throw new TypeError('Component factor authority control requires a document.');
  }
  const onChanged = typeof resolvedOptions.onChanged === 'function' ? resolvedOptions.onChanged : null;
  const root = doc.createElement('fieldset');
  root.className = 'lfea-bend-factor-authority-control';
  root.dataset.role = 'lfea-bend-factor-authority-control';

  const legend = doc.createElement('legend');
  legend.textContent = 'B31 / B31J component basis';

  const editionLabel = doc.createElement('label');
  editionLabel.textContent = 'B31 / B31J edition ';
  const editionSelect = doc.createElement('select');
  editionSelect.dataset.role = 'lfea-bend-factor-edition';
  editionSelect.append(option(doc, '', 'Select explicitly…'));
  for (const entry of LFEA_BEND_FACTOR_EDITION_OPTIONS) editionSelect.append(option(doc, entry.value, entry.label));
  editionLabel.append(editionSelect);

  const smoothLabel = doc.createElement('label');
  smoothLabel.textContent = 'Bend smooth 90° rule ';
  const smoothSelect = doc.createElement('select');
  smoothSelect.dataset.role = 'lfea-bend-smooth90-policy';
  smoothSelect.append(option(doc, '', 'Select explicitly…'));
  for (const entry of LFEA_BEND_SMOOTH90_OPTIONS) smoothSelect.append(option(doc, entry.value, entry.label));
  smoothLabel.append(smoothSelect);

  const disclosure = doc.createElement('p');
  disclosure.dataset.role = 'lfea-bend-factor-authority-disclosure';
  disclosure.textContent = [
    'The edition is required for exact B31/B31J bend and welding-tee flexibility.',
    'The smooth 90° choice applies only to bends.',
    'The app does not infer either authority from CAESAR version, geometry, benchmark precedent or current year.',
    'Changing a selection regenerates pre-flight and invalidates the current authorization.',
  ].join(' ');

  const initial = normalizeSelection(resolvedOptions.initialSelection);
  editionSelect.value = initial.editionProfileId ?? '';
  smoothSelect.value = initial.smooth90FlexibilityCorrection === null
    ? ''
    : initial.smooth90FlexibilityCorrection ? 'YES' : 'NO';

  const emit = () => onChanged?.(snapshot());
  editionSelect.addEventListener('change', emit);
  smoothSelect.addEventListener('change', emit);
  root.append(legend, editionLabel, smoothLabel, disclosure);

  function snapshot() {
    const editionProfileId = editionSelect.value || null;
    const smooth90 = smoothSelect.value === '' ? null : smoothSelect.value === 'YES';
    return Object.freeze({
      editionProfileId,
      smooth90FlexibilityCorrection: smooth90,
      complete: editionProfileId !== null && smooth90 !== null,
    });
  }

  function authority({ sourceId, sourceRevision, authorityIdPrefix }) {
    const state = snapshot();
    if (!state.complete) return null;
    return sealInputXmlProductionBendFactorAuthority({
      authorityId: `${authorityIdPrefix}-${state.editionProfileId}-SMOOTH90-${state.smooth90FlexibilityCorrection ? 'YES' : 'NO'}`,
      editionProfileId: state.editionProfileId,
      smooth90FlexibilityCorrection: state.smooth90FlexibilityCorrection,
      sourceId,
      sourceRevision,
    });
  }

  function branchAuthority({ sourceId, sourceRevision, authorityIdPrefix }) {
    const state = snapshot();
    if (state.editionProfileId === null) return null;
    return sealInputXmlProductionBranchFactorAuthority({
      authorityId: `${authorityIdPrefix}-${state.editionProfileId}`,
      editionProfileId: state.editionProfileId,
      sourceId,
      sourceRevision,
    });
  }

  function clear() {
    editionSelect.value = '';
    smoothSelect.value = '';
    const state = snapshot();
    onChanged?.(state);
    return state;
  }

  /** Mirror a selection changed elsewhere without emitting another change. */
  function syncFromSelection(selection) {
    const normalized = normalizeSelection(selection);
    editionSelect.value = normalized.editionProfileId ?? '';
    smoothSelect.value = normalized.smooth90FlexibilityCorrection === null
      ? ''
      : normalized.smooth90FlexibilityCorrection ? 'YES' : 'NO';
  }

  return Object.freeze({ root, editionSelect, smoothSelect, snapshot, authority, branchAuthority, clear, syncFromSelection });
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

function normalizeSelection(value) {
  if (!value || typeof value !== 'object') return EMPTY_SELECTION;
  const editionProfileId = typeof value.editionProfileId === 'string'
    && LFEA_BEND_FACTOR_EDITION_OPTIONS.some((entry) => entry.value === value.editionProfileId)
    ? value.editionProfileId
    : null;
  const smooth90 = typeof value.smooth90FlexibilityCorrection === 'boolean'
    ? value.smooth90FlexibilityCorrection
    : null;
  return Object.freeze({
    editionProfileId,
    smooth90FlexibilityCorrection: smooth90,
    complete: editionProfileId !== null && smooth90 !== null,
  });
}

function requireIntakeSemanticHash(intake) {
  const value = intake?.semanticHash;
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('Component factor authority  requires a sealed source intake semantic hash.');
  }
  return value;
}
function safeToken(value) { return String(value).replace(/[^A-Za-z0-9]/gu, ''); }
function option(doc, value, label) {
  const element = doc.createElement('option');
  element.value = value;
  element.textContent = label;
  return element;
}
