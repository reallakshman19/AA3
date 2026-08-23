import {
  sealInputXmlProductionBendFactorAuthority,
} from '../core/linear-piping-analysis-consumer/inputxml-production-bend-factor-authority.js';

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

/**
 * One reusable view/controller for the source-specific engineering authority
 * S3 needs before B31/B31J bend flexibility can enter stiffness. Both fields
 * start unresolved on purpose; source format, CAESAR version and current year
 * are not authority to choose them.
 */
export function createLfeaBendFactorAuthorityControl(doc, options = {}) {
  if (!doc || typeof doc.createElement !== 'function') {
    throw new TypeError('Bend factor authority control requires a document.');
  }
  const onChanged = typeof options.onChanged === 'function' ? options.onChanged : null;
  const root = doc.createElement('fieldset');
  root.className = 'lfea-bend-factor-authority-control';
  root.dataset.role = 'lfea-bend-factor-authority-control';

  const legend = doc.createElement('legend');
  legend.textContent = 'Bend flexibility basis';

  const editionLabel = doc.createElement('label');
  editionLabel.textContent = 'B31 / B31J edition ';
  const editionSelect = doc.createElement('select');
  editionSelect.dataset.role = 'lfea-bend-factor-edition';
  editionSelect.append(option(doc, '', 'Select explicitly…'));
  for (const entry of LFEA_BEND_FACTOR_EDITION_OPTIONS) {
    editionSelect.append(option(doc, entry.value, entry.label));
  }
  editionLabel.append(editionSelect);

  const smoothLabel = doc.createElement('label');
  smoothLabel.textContent = 'Smooth 90° rule ';
  const smoothSelect = doc.createElement('select');
  smoothSelect.dataset.role = 'lfea-bend-smooth90-policy';
  smoothSelect.append(option(doc, '', 'Select explicitly…'));
  for (const entry of LFEA_BEND_SMOOTH90_OPTIONS) {
    smoothSelect.append(option(doc, entry.value, entry.label));
  }
  smoothLabel.append(smoothSelect);

  const disclosure = doc.createElement('p');
  disclosure.dataset.role = 'lfea-bend-factor-authority-disclosure';
  disclosure.textContent = [
    'Required for exact bend flexibility.',
    'The app does not infer this basis from CAESAR version, file geometry, benchmark precedent or current year.',
    'Changing either selection invalidates the current pre-flight authorization.',
  ].join(' ');

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

  function clear() {
    editionSelect.value = '';
    smoothSelect.value = '';
  }

  return Object.freeze({ root, editionSelect, smoothSelect, snapshot, authority, clear });
}

function option(doc, value, label) {
  const element = doc.createElement('option');
  element.value = value;
  element.textContent = label;
  return element;
}
