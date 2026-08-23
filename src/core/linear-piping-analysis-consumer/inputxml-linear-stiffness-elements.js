import { compileInputXmlLinearElementAuthorities } from './inputxml-linear-element-authorities.js';

/**
 * Stiffness-preflight view of the single production element-authority chain.
 * No load case is supplied here, so the returned contributions carry stiffness
 * only. Runtime execution calls the same compiler with a physical load case.
 */
export function compileInputXmlStiffnessElementAuthorities(
  structuralPreparation,
  frameProfile,
  options = {},
) {
  return compileInputXmlLinearElementAuthorities({
    sourcePreparation: options.sourcePreparation,
    structuralPreparation,
    frameProfile,
    loadCase: null,
    bendFactorAuthority: options.bendFactorAuthority ?? null,
    capabilityProfile: options.capabilityProfile,
  });
}
