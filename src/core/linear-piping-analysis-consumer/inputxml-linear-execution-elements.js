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
  options,
) {
  const resolvedOptions = options === undefined ? {} : options;
  return compileInputXmlLinearElementAuthorities({
    sourcePreparation: resolvedOptions.sourcePreparation,
    structuralPreparation,
    frameProfile,
    loadCase,
    bendFactorAuthority: resolvedOptions.bendFactorAuthority ?? null,
    capabilityProfile: resolvedOptions.capabilityProfile,
  });
}
