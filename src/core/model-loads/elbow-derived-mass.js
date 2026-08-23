import { pipeMetalMassPerLength } from './formulas.js';
import { ELBOW_TYPES, AUDIT_CODES } from './constants.js';
import { evidenceNumber } from './units.js';

/**
 * ASME B16.9 long-radius elbow developed length: length = 1.5 x OD.
 * Confirmed against this dataset's own fitting description text (DTXR reads
 * "ELBOW 90 DEG LR BW ..." — "LR" is long-radius), not assumed.
 */
const DEVELOPED_LENGTH_FACTOR = 1.5;

export function isElbowType(type) {
  return ELBOW_TYPES.includes(String(type || '').trim().toUpperCase());
}

/**
 * Derives an elbow's dry metal weight from its own line's already-resolved
 * pipe section (outer diameter, wall thickness, material density), using the
 * same PIPE_METAL_MASS_PER_LENGTH_V1 formula as straight pipe over a standard
 * long-radius developed length rather than a geometric segment length.
 *
 * An elbow carries no independent section evidence source in this codebase;
 * it shares its adjoining pipe's bore and schedule in the general case, so
 * this borrows that already-qualified per-line resolution rather than
 * re-deriving section properties independently. Returns null whenever a
 * confident derivation is not possible — including when the elbow already
 * carries explicit weight evidence, which is never overridden — so a
 * consuming component always falls back to its existing missing-evidence
 * behaviour rather than receiving a fabricated value.
 */
export function deriveElbowComponentWeightEvidence(component, allComponents) {
  if (!isElbowType(component?.type)) return null;
  if (evidenceNumber(component.engineeringProperties?.componentWeightKg) !== null) return null;
  const sibling = findSectionedSiblingPipe(component, allComponents);
  if (!sibling) return null;
  const evidence = sibling.engineeringProperties;
  const odMm = evidenceNumber(evidence.outerDiameterMm);
  const wallMm = evidenceNumber(evidence.wallThicknessMm);
  const densityKgM3 = evidenceNumber(evidence.materialDensityKgM3);
  if (odMm === null || wallMm === null || densityKgM3 === null) return null;
  if (!(odMm > 0) || !(wallMm > 0) || wallMm >= odMm / 2 || !(densityKgM3 > 0)) return null;

  const developedLengthM = DEVELOPED_LENGTH_FACTOR * (odMm / 1000);
  const perLength = pipeMetalMassPerLength(odMm / 1000, wallMm / 1000, densityKgM3, [
    evidence.outerDiameterMm, evidence.wallThicknessMm, evidence.materialDensityKgM3,
  ]);
  return {
    value: perLength.value * developedLengthM,
    source: AUDIT_CODES.DERIVED_FROM_ADJACENT_PIPE_SECTION,
    derivation: {
      formulaId: perLength.trace.formulaId,
      developedLengthM,
      developedLengthFactor: DEVELOPED_LENGTH_FACTOR,
      sourceComponentKey: sibling.componentKey || sibling.sourceEntityId || null,
      outerDiameterMm: odMm,
      wallThicknessMm: wallMm,
      materialDensityKgM3: densityKgM3,
    },
  };
}

/**
 * A PIPE-type component on the same branch as the elbow, already carrying a
 * resolved section (outer diameter, wall thickness, material density). Exact
 * branchId match only: a reducing elbow whose neighbours differ in bore is
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
