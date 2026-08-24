import { pipeMetalMassPerLength } from './formulas.js';
import {
  AUDIT_CODES, ELBOW_TYPES, OLET_TYPES, REDUCER_TYPES, TEE_TYPES,
} from './constants.js';
import { evidenceNumber } from './units.js';

/**
 * Effective-length factor (multiplied by outer diameter) used when a fitting
 * has no independent geometric length. Elbow: ASME B16.9 long-radius
 * developed length, confirmed against this dataset's own fitting text ("LR"
 * = long radius). Tee: a run + branch approximated as one nominal diameter of
 * extra pipe material at the intersection, on top of whatever run length is
 * already counted as straight pipe.
 */
const DEVELOPED_LENGTH_FACTOR_BY_TYPE_SET = Object.freeze([
  { types: ELBOW_TYPES, factor: 1.5 },
  { types: TEE_TYPES, factor: 1.0 },
  // Olet and reducer factors are engineering estimates, not standards-derived
  // like the elbow's 1.5xD long-radius developed length. A concentric reducer's
  // B16.9 face-to-face length is close to one nominal diameter at the sizes in
  // use here, and a branch outlet is treated as the same order of material.
  // Both are flagged as ASSUMED on every derivation so they are visible for
  // confirmation rather than silently trusted.
  { types: OLET_TYPES, factor: 1.0, assumedFactor: true },
  { types: REDUCER_TYPES, factor: 1.0, assumedFactor: true },
]);

export function isElbowType(type) {
  return ELBOW_TYPES.includes(String(type || '').trim().toUpperCase());
}

export function isTeeType(type) {
  return TEE_TYPES.includes(String(type || '').trim().toUpperCase());
}

export function isPipeLikeFittingType(type) {
  return DEVELOPED_LENGTH_FACTOR_BY_TYPE_SET.some((row) => row.types.includes(String(type || '').trim().toUpperCase()));
}

/**
 * Derives an elbow's dry metal weight from its own line's already-resolved
 * pipe section. Kept as a distinct export (rather than folded into the
 * generic function below) because it is the established name existing
 * callers already use.
 */
export function deriveElbowComponentWeightEvidence(component, allComponents) {
  return deriveByType(ELBOW_TYPES, 1.5, component, allComponents);
}

/** Same derivation as the elbow, using the tee's own effective-length factor. */
export function deriveTeeComponentWeightEvidence(component, allComponents) {
  return deriveByType(TEE_TYPES, 1.0, component, allComponents);
}

/** Tries every known pipe-like fitting type; returns the first applicable result. */
export function derivePipeLikeFittingWeightEvidence(component, allComponents) {
  for (const { types, factor, assumedFactor } of DEVELOPED_LENGTH_FACTOR_BY_TYPE_SET) {
    const result = deriveByType(types, factor, component, allComponents, assumedFactor);
    if (result) return result;
  }
  return null;
}

/**
 * Derives a fitting's dry metal weight from its own line's already-resolved
 * pipe section (outer diameter, wall thickness, material density), using the
 * same PIPE_METAL_MASS_PER_LENGTH_V1 formula as straight pipe over a standard
 * effective length rather than a geometric segment length.
 *
 * A fitting of this kind carries no independent section evidence source in
 * this codebase; it shares its adjoining pipe's bore and schedule in the
 * general case, so this borrows that already-qualified per-line resolution
 * rather than re-deriving section properties independently. Returns null
 * whenever a confident derivation is not possible — including when the
 * fitting already carries explicit weight evidence, which is never
 * overridden — so a consuming component always falls back to its existing
 * missing-evidence behaviour rather than receiving a fabricated value.
 */
function deriveByType(types, developedLengthFactor, component, allComponents, assumedFactor = false) {
  if (!types.includes(String(component?.type || '').trim().toUpperCase())) return null;
  if (evidenceNumber(component.engineeringProperties?.componentWeightKg) !== null) return null;
  const sibling = findSectionedSiblingPipe(component, allComponents);
  if (!sibling) return null;
  const evidence = sibling.engineeringProperties;
  const odMm = evidenceNumber(evidence.outerDiameterMm);
  const wallMm = evidenceNumber(evidence.wallThicknessMm);
  const densityKgM3 = evidenceNumber(evidence.materialDensityKgM3);
  if (odMm === null || wallMm === null || densityKgM3 === null) return null;
  if (!(odMm > 0) || !(wallMm > 0) || wallMm >= odMm / 2 || !(densityKgM3 > 0)) return null;

  const developedLengthM = developedLengthFactor * (odMm / 1000);
  const perLength = pipeMetalMassPerLength(odMm / 1000, wallMm / 1000, densityKgM3, [
    evidence.outerDiameterMm, evidence.wallThicknessMm, evidence.materialDensityKgM3,
  ]);
  return {
    value: perLength.value * developedLengthM,
    source: AUDIT_CODES.DERIVED_FROM_ADJACENT_PIPE_SECTION,
    derivation: {
      formulaId: perLength.trace.formulaId,
      developedLengthM,
      developedLengthFactor,
      developedLengthFactorAssumed: assumedFactor,
      sourceComponentKey: sibling.componentKey || sibling.sourceEntityId || null,
      outerDiameterMm: odMm,
      wallThicknessMm: wallMm,
      materialDensityKgM3: densityKgM3,
    },
  };
}

/**
 * A PIPE-type component on the same branch as the fitting, already carrying a
 * resolved section (outer diameter, wall thickness, material density). Exact
 * branchId match only: a reducing fitting whose neighbours differ in bore is
 * intentionally not matched, rather than risk borrowing the wrong section.
 */
function findSectionedSiblingPipe(component, components) {
  const branchId = component.identity?.branchId;
  if (!branchId || !Array.isArray(components)) return null;
  return components.find((candidate) => (
    String(candidate.type || '').trim().toUpperCase() === 'PIPE'
    && candidate.identity?.branchId === branchId
    && evidenceNumber(candidate.engineeringProperties?.outerDiameterMm) !== null
    && evidenceNumber(candidate.engineeringProperties?.wallThicknessMm) !== null
    && evidenceNumber(candidate.engineeringProperties?.materialDensityKgM3) !== null
  )) || null;
}
