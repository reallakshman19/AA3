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
let mountedControl = null;

export function lfeaBendFactorAuthoritySelection() {
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
  if (mountedControl?.root?.isConnected) return mountedControl;
  const host = doc.querySelector('[data-role="linear-piping-consumer-root"]');
  if (!host || typeof host.append !== 'function') return null;
  const existing = host.querySelector?.('[data-role="lfea-bend-factor-authority-control"]');
  if (existing) return mountedControl;

  mountedControl = createLfeaBendFactorAuthorityControl(doc, {
    initialSelection: currentSelection,
    onChanged(selection) {
      currentSelection = selection;
      regenerateNativePreFlights(doc);
    },
  });
  if (typeof host.prepend === 'function') host.prepend(mountedControl.root);
  else host.append(mountedControl.root);
  return mountedControl;
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

  return Object.freeze({ root, editionSelect, smoothSelect, snapshot, authority, branchAuthority, clear });
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
    throw new TypeError('Component factor authority requires a sealed source intake semantic hash.');
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
