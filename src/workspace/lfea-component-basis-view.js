import { sealInputXmlProductionBendFactorAuthority } from '../core/linear-piping-analysis-consumer/inputxml-production-bend-factor-authority.js';
import { sealInputXmlProductionBranchFactorAuthority } from '../core/linear-piping-analysis-consumer/inputxml-production-branch-factor-authority.js';
import { LFEA_BEND_FACTOR_EDITION_OPTIONS, LFEA_BEND_SMOOTH90_OPTIONS, normalizeSelection } from './lfea-component-basis-selection.js';

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

  return Object.freeze({
    root, editionSelect, smoothSelect, snapshot, authority, branchAuthority, clear, syncFromSelection,
    inline: resolvedOptions.inline === true,
  });
}

function option(doc, value, label) {
  const element = doc.createElement('option');
  element.value = value;
  element.textContent = label;
  return element;
}
