/** Quantified mesh-to-analysis-domain conformance evidence. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_MESH_DOMAIN_CONFORMANCE_V3_SCHEMA = 'lafea-mesh-domain-conformance/v3';
const KEYS = Object.freeze([
  'schema', 'stageId', 'meshContentHash', 'analysisGeometryHash',
  'propertyBoundaryHash', 'conformanceOperatorHash', 'lengthUnit', 'measureUnit',
  'expectedDomainMeasure', 'coveredDomainMeasure', 'uncoveredDomainMeasure',
  'overlapMeasure', 'outsideDomainMeasure', 'maximumBoundaryDeviation',
  'maximumPropertyBoundaryDeviation', 'unmappedBcSupportMeasure',
  'unmappedLoadSupportMeasure', 'domainMeasureAbsTolerance',
  'boundaryDeviationTolerance', 'propertyBoundaryDeviationTolerance',
  'supportMeasureAbsTolerance',
]);

export function qualifyLafeaMeshDomainConformanceV3(value) {
  exact(value, KEYS, 'LAFEA_MESH_DOMAIN_CONFORMANCE_V3_KEYS_INVALID');
  const record = {
    schema: exactText(value.schema, LAFEA_MESH_DOMAIN_CONFORMANCE_V3_SCHEMA, 'SCHEMA'),
    stageId: enumValue(value.stageId, ['LAFEA.3', 'LAFEA.4', 'LAFEA.5'], 'STAGE_ID'),
    meshContentHash: sha(value.meshContentHash, 'MESH_CONTENT_HASH'),
    analysisGeometryHash: sha(value.analysisGeometryHash, 'ANALYSIS_GEOMETRY_HASH'),
    propertyBoundaryHash: sha(value.propertyBoundaryHash, 'PROPERTY_BOUNDARY_HASH'),
    conformanceOperatorHash: sha(value.conformanceOperatorHash, 'CONFORMANCE_OPERATOR_HASH'),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    measureUnit: text(value.measureUnit, 'MEASURE_UNIT'),
    expectedDomainMeasure: positive(value.expectedDomainMeasure, 'EXPECTED_DOMAIN_MEASURE'),
    coveredDomainMeasure: nonNegative(value.coveredDomainMeasure, 'COVERED_DOMAIN_MEASURE'),
    uncoveredDomainMeasure: nonNegative(value.uncoveredDomainMeasure, 'UNCOVERED_DOMAIN_MEASURE'),
    overlapMeasure: nonNegative(value.overlapMeasure, 'OVERLAP_MEASURE'),
    outsideDomainMeasure: nonNegative(value.outsideDomainMeasure, 'OUTSIDE_DOMAIN_MEASURE'),
    maximumBoundaryDeviation: nonNegative(value.maximumBoundaryDeviation, 'MAXIMUM_BOUNDARY_DEVIATION'),
    maximumPropertyBoundaryDeviation: nonNegative(
      value.maximumPropertyBoundaryDeviation,
      'MAXIMUM_PROPERTY_BOUNDARY_DEVIATION',
    ),
    unmappedBcSupportMeasure: nonNegative(value.unmappedBcSupportMeasure, 'UNMAPPED_BC_SUPPORT_MEASURE'),
    unmappedLoadSupportMeasure: nonNegative(value.unmappedLoadSupportMeasure, 'UNMAPPED_LOAD_SUPPORT_MEASURE'),
    domainMeasureAbsTolerance: nonNegative(value.domainMeasureAbsTolerance, 'DOMAIN_MEASURE_ABS_TOLERANCE'),
    boundaryDeviationTolerance: nonNegative(value.boundaryDeviationTolerance, 'BOUNDARY_DEVIATION_TOLERANCE'),
    propertyBoundaryDeviationTolerance: nonNegative(
      value.propertyBoundaryDeviationTolerance,
      'PROPERTY_BOUNDARY_DEVIATION_TOLERANCE',
    ),
    supportMeasureAbsTolerance: nonNegative(value.supportMeasureAbsTolerance, 'SUPPORT_MEASURE_ABS_TOLERANCE'),
  };
  const measureClosureResidual = Math.abs(
    record.coveredDomainMeasure + record.uncoveredDomainMeasure - record.expectedDomainMeasure,
  );
  const gates = freeze([
    gate('DOMAIN_MEASURE_CLOSURE', measureClosureResidual, record.domainMeasureAbsTolerance),
    gate('UNCOVERED_DOMAIN', record.uncoveredDomainMeasure, record.domainMeasureAbsTolerance),
    gate('OVERLAP', record.overlapMeasure, record.domainMeasureAbsTolerance),
    gate('OUTSIDE_DOMAIN', record.outsideDomainMeasure, record.domainMeasureAbsTolerance),
    gate('BOUNDARY_DEVIATION', record.maximumBoundaryDeviation, record.boundaryDeviationTolerance),
    gate(
      'PROPERTY_BOUNDARY_DEVIATION',
      record.maximumPropertyBoundaryDeviation,
      record.propertyBoundaryDeviationTolerance,
    ),
    gate('UNMAPPED_BC_SUPPORT', record.unmappedBcSupportMeasure, record.supportMeasureAbsTolerance),
    gate('UNMAPPED_LOAD_SUPPORT', record.unmappedLoadSupportMeasure, record.supportMeasureAbsTolerance),
  ]);
  const core = freeze({
    ...record,
    measureClosureResidual,
    gates,
    qualification: gates.some((row) => row.status === 'BLOCK') ? 'BLOCK' : 'PASS',
  });
  return freeze({
    ...core,
    qualificationHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-domain-conformance-hash-input/v3', evidence: core,
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
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_MESH_DOMAIN_CONFORMANCE_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_MESH_DOMAIN_CONFORMANCE_V3_${field}_INVALID`);
  return value;
}
function sha(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_MESH_DOMAIN_CONFORMANCE_V3_${field}_INVALID`);
  return out;
}
function positive(value, field) {
  if (!Number.isFinite(value) || value <= 0) fail(`LAFEA_MESH_DOMAIN_CONFORMANCE_V3_${field}_INVALID`);
  return value;
}
function nonNegative(value, field) {
  if (!Number.isFinite(value) || value < 0) fail(`LAFEA_MESH_DOMAIN_CONFORMANCE_V3_${field}_INVALID`);
  return Object.is(value, -0) ? 0 : value;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_MESH_DOMAIN_CONFORMANCE_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
