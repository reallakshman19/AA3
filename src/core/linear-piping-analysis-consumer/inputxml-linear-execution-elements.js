import { compileInputXmlLinearElementAuthorities } from './inputxml-linear-element-authorities.js';

/**
 * Runtime/recovery view of the same production element-authority chain used by
 * stiffness pre-flight. Supplying the physical load case binds distributed and
 * thermal loads without changing who owns each span's stiffness.
 */
export function compileInputXmlExecutionElementAuthorities(
  structuralPreparation,
  frameProfile,
  loadCase,
  options = {},
) {
  return compileInputXmlLinearElementAuthorities({
    sourcePreparation: options.sourcePreparation,
    structuralPreparation,
    frameProfile,
    loadCase,
    bendFactorAuthority: options.bendFactorAuthority ?? null,
    capabilityProfile: options.capabilityProfile,
  });
}
