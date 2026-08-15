import { deepFreeze } from './contracts.js';
import {
  EMPIRICAL_ROOTED_COMPONENT_FLEXIBILITY_SCHEMA,
  EMPIRICAL_ROOTED_COMPONENT_THERMAL_COMPATIBILITY_SCHEMA,
  assembleRootedTreeComponentFlexibility as assembleUnchecked,
  solveRootedTreeComponentThermalCompatibility as solveUnchecked,
} from './rooted-tree-component-flexibility.js';

export {
  EMPIRICAL_ROOTED_COMPONENT_FLEXIBILITY_SCHEMA,
  EMPIRICAL_ROOTED_COMPONENT_THERMAL_COMPATIBILITY_SCHEMA,
};

const AXISYMMETRIC_RELATIVE_TOLERANCE = 1e-10;

/**
 * Public component-ROM gate. The underlying unit-load route constructs a
 * deterministic transverse member basis; until a separate principal-axis
 * authority exists, every section admitted here must therefore be axisymmetric.
 */
export function assembleRootedTreeComponentFlexibility(input) {
  requireAxisymmetricComponentSections(input?.components);
  return assembleUnchecked(input);
}

export function solveRootedTreeComponentThermalCompatibility(input) {
  requireAxisymmetricComponentSections(input?.components);
  return solveUnchecked(input);
}

export function inspectRootedTreeComponentSectionCustody(components) {
  return requireAxisymmetricComponentSections(components);
}

function requireAxisymmetricComponentSections(components) {
  if (!Array.isArray(components) || components.length === 0) {
    throw new TypeError('components must be a non-empty array.');
  }
  const rows = components.map((component, index) => {
    const id = typeof component?.componentId === 'string' && component.componentId.trim()
      ? component.componentId.trim()
      : `components[${index}]`;
    const iy = component?.properties?.secondMomentYM4;
    const iz = component?.properties?.secondMomentZM4;
    if (!Number.isFinite(iy) || !(iy > 0) || !Number.isFinite(iz) || !(iz > 0)) {
      throw new TypeError(`${id} requires positive finite Iy and Iz.`);
    }
    const scale = Math.max(iy, iz);
    const relativeDifference = Math.abs(iy - iz) / scale;
    if (relativeDifference > AXISYMMETRIC_RELATIVE_TOLERANCE) {
      const error = new RangeError(
        `${id} section is not axisymmetric: Iy/Iz relative difference ${relativeDifference} exceeds ${AXISYMMETRIC_RELATIVE_TOLERANCE}.`,
      );
      error.code = 'EMPIRICAL_COMPONENT_SECTION_ORIENTATION_UNRESOLVED';
      throw error;
    }
    return deepFreeze({
      componentId: id,
      kind: component?.kind ?? null,
      secondMomentYM4: iy,
      secondMomentZM4: iz,
      relativeDifference,
      tolerance: AXISYMMETRIC_RELATIVE_TOLERANCE,
      status: 'AXISYMMETRIC',
    });
  });
  return deepFreeze({
    sectionOrientationAuthority: 'AXISYMMETRIC_SECTION_ONLY',
    deterministicTransverseAxesAccepted: true,
    separatePrincipalAxisAuthorityConsumed: false,
    rows,
  });
}
