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

export const EMPTY_SELECTION = Object.freeze({
  editionProfileId: null,
  smooth90FlexibilityCorrection: null,
  complete: false,
});


export function normalizeSelection(value) {
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

export function normalizeLfeaComponentBasisSelection(value) {
  if (!value || typeof value !== 'object') throw new TypeError('An explicit component basis selection is required.');
  const edition = value.editionProfileId;
  if (edition != null && edition !== '' && !LFEA_BEND_FACTOR_EDITION_OPTIONS.some(entry => entry.value === edition)) {
    throw new TypeError('Unsupported component basis edition.');
  }
  const smooth = value.smooth90FlexibilityCorrection;
  if (smooth != null && typeof smooth !== 'boolean') throw new TypeError('The smooth-90 policy must be explicit or unresolved.');
  return normalizeSelection(value);
}
