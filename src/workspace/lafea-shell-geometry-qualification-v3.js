/** Shell midsurface approximation qualification, independent of element-shape quality. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_SHELL_GEOMETRY_QUALIFICATION_V3_SCHEMA =
  'lafea-shell-geometry-qualification/v3';
const KEYS = Object.freeze([
  'schema', 'stageId', 'meshContentHash', 'midsurfaceEvidenceHash',
  'geometryApproximationOperatorHash', 'lengthUnit', 'maximumChordalDeviation',
  'chordalDeviationTolerance', 'maximumNormalDeviationDegrees',
  'normalDeviationToleranceDegrees', 'maximumCurvatureResolutionRatio',
  'curvatureResolutionRatioLimit', 'maximumPropertyBoundaryDeviation',
  'propertyBoundaryDeviationTolerance',
]);

export function qualifyLafeaShellGeometryV3(value) {
  exact(value, KEYS, 'LAFEA_SHELL_GEOMETRY_V3_KEYS_INVALID');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_SHELL_GEOMETRY_QUALIFICATION_V3_SCHEMA, 'SCHEMA'),
    stageId: enumValue(value.stageId, ['LAFEA.4', 'LAFEA.5'], 'STAGE_ID'),
    meshContentHash: sha(value.meshContentHash, 'MESH_CONTENT_HASH'),
    midsurfaceEvidenceHash: sha(value.midsurfaceEvidenceHash, 'MIDSURFACE_EVIDENCE_HASH'),
    geometryApproximationOperatorHash: sha(
      value.geometryApproximationOperatorHash,
      'GEOMETRY_APPROXIMATION_OPERATOR_HASH',
    ),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    maximumChordalDeviation: nonNegative(value.maximumChordalDeviation, 'MAXIMUM_CHORDAL_DEVIATION'),
    chordalDeviationTolerance: nonNegative(value.chordalDeviationTolerance, 'CHORDAL_DEVIATION_TOLERANCE'),
    maximumNormalDeviationDegrees: nonNegative(
      value.maximumNormalDeviationDegrees,
      'MAXIMUM_NORMAL_DEVIATION_DEGREES',
    ),
    normalDeviationToleranceDegrees: nonNegative(
      value.normalDeviationToleranceDegrees,
      'NORMAL_DEVIATION_TOLERANCE_DEGREES',
    ),
    maximumCurvatureResolutionRatio: nonNegative(
      value.maximumCurvatureResolutionRatio,
      'MAXIMUM_CURVATURE_RESOLUTION_RATIO',
    ),
    curvatureResolutionRatioLimit: nonNegative(
      value.curvatureResolutionRatioLimit,
      'CURVATURE_RESOLUTION_RATIO_LIMIT',
    ),
    maximumPropertyBoundaryDeviation: nonNegative(
      value.maximumPropertyBoundaryDeviation,
      'MAXIMUM_PROPERTY_BOUNDARY_DEVIATION',
    ),
    propertyBoundaryDeviationTolerance: nonNegative(
      value.propertyBoundaryDeviationTolerance,
      'PROPERTY_BOUNDARY_DEVIATION_TOLERANCE',
    ),
  });
  const gates = freeze([
    gate('MIDSURFACE_CHORDAL_DEVIATION', record.maximumChordalDeviation, record.chordalDeviationTolerance),
    gate('MIDSURFACE_NORMAL_DEVIATION', record.maximumNormalDeviationDegrees, record.normalDeviationToleranceDegrees),
    gate('CURVATURE_RESOLUTION_H_OVER_R', record.maximumCurvatureResolutionRatio, record.curvatureResolutionRatioLimit),
    gate(
      'PROPERTY_BOUNDARY_REPRESENTATION',
      record.maximumPropertyBoundaryDeviation,
      record.propertyBoundaryDeviationTolerance,
    ),
  ]);
  const qualification = gates.some((row) => row.status === 'BLOCK') ? 'BLOCK' : 'PASS';
  const core = freeze({
    ...record,
    gates,
    qualification,
    custodyImpact: qualification === 'BLOCK' ? 'GEOMETRY_CUSTODY_BLOCK' : 'GEOMETRY_CUSTODY_PASS',
  });
  return freeze({
    ...core,
    qualificationHash: canonicalLafeaSha256({
      schema: 'lafea-shell-geometry-qualification-hash-input/v3', evidence: core,
    }),
    engineeringAuthority: false,
  });
}
function gate(metric, value, maximum) {
  return freeze({ metric, value, maximum, status: value <= maximum ? 'PASS' : 'BLOCK' });
}
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_SHELL_GEOMETRY_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_SHELL_GEOMETRY_V3_${field}_INVALID`);
  return value;
}
function sha(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_SHELL_GEOMETRY_V3_${field}_INVALID`);
  return out;
}
function nonNegative(value, field) {
  if (!Number.isFinite(value) || value < 0) fail(`LAFEA_SHELL_GEOMETRY_V3_${field}_INVALID`);
  return Object.is(value, -0) ? 0 : value;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_SHELL_GEOMETRY_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
