import { compileInputXmlLinearElementAuthorities } from './inputxml-linear-element-authorities.js';

/**
 * Stiffness-preflight view of the single production element-authority chain.
 * No load case is supplied here, so the returned contributions carry stiffness
 * only. Runtime execution calls the same compiler with a physical load case.
 */
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
    capabilityProfile: resolvedOptions.capabilityProfile,
  });
}
