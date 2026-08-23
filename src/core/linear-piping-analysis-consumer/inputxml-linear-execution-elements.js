import { compileInputXmlLinearElementAuthorities } from './inputxml-linear-element-authorities.js';

/** Runtime/recovery view of the same element-authority chain as pre-flight. */
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
    branchFactorAuthority: resolvedOptions.branchFactorAuthority ?? null,
    capabilityProfile: resolvedOptions.capabilityProfile,
  });
}
