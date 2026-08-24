import { compileInputXmlLinearElementAuthorities } from './inputxml-linear-element-authorities.js';

/** Stiffness-preflight view of the single production element-authority chain. */
export function compileInputXmlStiffnessElementAuthorities(
  structuralPreparation,
  frameProfile,
  options,
) {
  const resolvedOptions = options === undefined ? {} : options;
  return compileInputXmlLinearElementAuthorities({
    sourcePreparation: resolvedOptions.sourcePreparation,
    structuralPreparation,
    frameProfile,
    loadCase: null,
    bendFactorAuthority: resolvedOptions.bendFactorAuthority ?? null,
    branchFactorAuthority: resolvedOptions.branchFactorAuthority ?? null,
    capabilityProfile: resolvedOptions.capabilityProfile,
  });
}
