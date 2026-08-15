import { deepFreeze } from '../../../core/shared-piping-model/index.js';
import {
  calculateB31Factors,
} from '../../../core/linear-fea-b31-factor-calculator/index.js';
import {
  createEmpiricalElbowFlexibilityAuthority,
  normalizeCircularElbowGeometry,
} from '../../../core/empirical-piping-mechanics/index.js';

export const B31J_EMPIRICAL_ELBOW_AUTHORITY_BRIDGE_SCHEMA =
  'b31j-empirical-elbow-flexibility-authority-bridge/v1';

const RELATIVE_TOLERANCE = 1e-10;
const ANGLE_TOLERANCE_DEG = 1e-9;

/**
 * Converts a sealed/valid B31 factor calculation into the narrow component-local
 * flexibility authority consumed by the analytical elbow ROM.
 *
 * SIFs remain stress-recovery authority and are deliberately not projected into
 * the ROM flexibility record.
 */
export function buildEmpiricalElbowFlexibilityAuthorityFromB31J(input) {
  exactKeys(
    input,
    ['authorityId', 'factorCalculationRequest', 'circularElbowGeometry'],
    'B31J empirical elbow authority bridge input',
  );
  const arc = input.circularElbowGeometry?.semanticHash
    ? normalizeCircularElbowGeometry({
      componentId: input.circularElbowGeometry.componentId,
      startPointM: input.circularElbowGeometry.startPointM,
      endPointM: input.circularElbowGeometry.endPointM,
      centerPointM: input.circularElbowGeometry.centerPointM,
      planeNormal: input.circularElbowGeometry.planeNormal,
    })
    : normalizeCircularElbowGeometry(input.circularElbowGeometry);
  if (input.circularElbowGeometry?.semanticHash
      && input.circularElbowGeometry.semanticHash !== arc.semanticHash) {
    throw coded(
      'B31J_EMPIRICAL_ELBOW_ARC_HASH_MISMATCH',
      'Circular elbow geometry hash is stale.',
    );
  }

  const result = calculateB31Factors(input.factorCalculationRequest);
  if (result.componentType !== 'BEND' || result.status !== 'QUALIFIED') {
    throw coded(
      'B31J_EMPIRICAL_ELBOW_FACTOR_NOT_QUALIFIED',
      'Elbow ROM requires a QUALIFIED BEND factor calculation.',
    );
  }
  if (result.componentId !== arc.componentId) {
    throw coded(
      'B31J_EMPIRICAL_ELBOW_COMPONENT_MISMATCH',
      'B31 factor component identity does not match circular elbow geometry.',
    );
  }
  if (!String(result.sourceIdentity?.standard || '').startsWith('ASME_B31J_')) {
    throw coded(
      'B31J_EMPIRICAL_ELBOW_STANDARD_UNSUPPORTED',
      'Current source-bound elbow ROM requires ASME B31J flexibility authority.',
    );
  }
  const geometry = result.geometry || {};
  relativeEqual(
    geometry.bendRadius,
    arc.radiusM,
    'B31J_EMPIRICAL_ELBOW_RADIUS_MISMATCH',
    'B31J bend radius does not match the continuous circular arc radius.',
  );
  if (geometry.bendAngleDegrees !== null && geometry.bendAngleDegrees !== undefined) {
    const arcDegrees = arc.includedAngleRad * 180 / Math.PI;
    if (Math.abs(geometry.bendAngleDegrees - arcDegrees) > ANGLE_TOLERANCE_DEG) {
      throw coded(
        'B31J_EMPIRICAL_ELBOW_ANGLE_MISMATCH',
        `B31J bend angle ${geometry.bendAngleDegrees} deg does not match arc angle ${arcDegrees} deg.`,
      );
    }
  }
  const flexibility = result.factors?.flexibility;
  if (!flexibility
      || !Number.isFinite(flexibility.inPlane)
      || !Number.isFinite(flexibility.outOfPlane)
      || !Number.isFinite(flexibility.torsional)) {
    throw coded(
      'B31J_EMPIRICAL_ELBOW_FLEXIBILITY_MISSING',
      'Qualified B31J bend result did not expose directional flexibility factors.',
    );
  }

  const authority = createEmpiricalElbowFlexibilityAuthority({
    schema: 'empirical-elbow-flexibility-authority/v1',
    authorityId: requiredText(input.authorityId, 'authorityId'),
    componentId: arc.componentId,
    basis: 'CODE_COMPONENT_FLEXIBILITY',
    inPlaneFlexibilityFactor: flexibility.inPlane,
    outOfPlaneFlexibilityFactor: flexibility.outOfPlane,
    torsionalFlexibilityFactor: flexibility.torsional,
    source: {
      standard: 'ASME_B31J',
      edition: requiredText(result.sourceIdentity.edition, 'result.sourceIdentity.edition'),
      ruleId: requiredText(
        result.factors?.flexibilityRule?.ruleId || result.sourceIdentity.ruleId,
        'B31J flexibility ruleId',
      ),
      sourceSemanticHash: requiredText(
        result.sourceIdentity.sourceSemanticHash,
        'result.sourceIdentity.sourceSemanticHash',
      ),
      factorResultSemanticHash: requiredText(result.semanticHash, 'result.semanticHash'),
    },
    geometryBinding: {
      bendRadiusM: geometry.bendRadius,
      outerDiameterM: geometry.outerDiameter,
      wallThicknessM: geometry.wallThickness,
      pressurePa: geometry.pressure,
      elasticModulusPa: geometry.elasticModulus,
    },
  });

  return deepFreeze({
    schema: B31J_EMPIRICAL_ELBOW_AUTHORITY_BRIDGE_SCHEMA,
    authority,
    factorResult: result,
    evidence: {
      sourceStandard: result.sourceIdentity.standard,
      factorEdition: result.sourceIdentity.edition,
      flexibilityRuleId: result.factors.flexibilityRule.ruleId,
      pressureCorrectionApplied: result.factors.pressureCorrection.applied,
      pressureCorrectionDenominator: result.factors.pressureCorrection.flexibilityDenominator,
      displacementSifConsumedAsFlexibility: false,
      sustainedIndexConsumedAsFlexibility: false,
      responseCalibrationConsumed: false,
      finiteElementSolverConsumed: false,
      geometryRelativeTolerance: RELATIVE_TOLERANCE,
      angleToleranceDeg: ANGLE_TOLERANCE_DEG,
    },
  });
}

function relativeEqual(left, right, code, message) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) throw coded(code, message);
  const residual = Math.abs(left - right) / Math.max(Math.abs(left), Math.abs(right));
  if (residual > RELATIVE_TOLERANCE) throw coded(code, `${message} Relative residual ${residual}.`);
}
function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    throw new TypeError(`${label} contains unexpected or missing keys.`);
  }
}
function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} must be a non-empty string.`);
  return value.trim();
}
function coded(code, message) { const error = new Error(message); error.code = code; return error; }
