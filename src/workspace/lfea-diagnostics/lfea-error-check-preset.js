/**
 * Stage an analysis-profile/component-basis preset without conferring consent.
 * Selection is not source correction approval and never signs off limitations.
 */
export function applyPreset(controller, preset = null) {
  const owner = controller.options.getAccdbController?.();
  const cases = owner?.requestedCaseIds
    ?? controller.presentation?.preFlight?.preparation?.requestedCaseIds
    ?? controller.preFlight?.preparation?.requestedCaseIds
    ?? ['IXP-W'];
  const defaultPreset = {
    name: 'B31.3 Standard Piping Prototype',
    componentBasis: {
      editionProfileId: 'B31_3_2024_B31J_2023',
      smooth90FlexibilityCorrection: false,
    },
    requestedProfileId: owner?.requestedProfileId ?? 'DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_V1',
    requestedCaseIds: cases,
  };
  const chosen = preset ?? defaultPreset;
  // Do not copy untrusted preset.reviewerIdentity or preset.reviewReason,
  // even if an earlier version of the producer included those fields.
  controller.stagedPreset = {
    name: chosen.name,
    componentBasis: chosen.componentBasis,
    requestedProfileId: chosen.requestedProfileId,
    requestedCaseIds: chosen.requestedCaseIds,
  };
  controller.stagedBatch = {
    propertyPatches: [],
    componentBasis: chosen.componentBasis,
    requestedProfileId: chosen.requestedProfileId,
    requestedCaseIds: chosen.requestedCaseIds,
  };
  controller.render();
}
