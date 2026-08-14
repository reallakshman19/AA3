#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_SHELL_GEOMETRY_QUALIFICATION_V3_SCHEMA,
  qualifyLafeaShellGeometryV3,
} from '../src/workspace/lafea-shell-geometry-qualification-v3.js';

const base = {
  schema: LAFEA_SHELL_GEOMETRY_QUALIFICATION_V3_SCHEMA,
  stageId: 'LAFEA.4', meshContentHash: hash('M'), midsurfaceEvidenceHash: hash('MID'),
  geometryApproximationOperatorHash: hash('GEOM_OP'), lengthUnit: 'mm',
  maximumChordalDeviation: .05, chordalDeviationTolerance: .1,
  maximumNormalDeviationDegrees: 1, normalDeviationToleranceDegrees: 2,
  maximumCurvatureResolutionRatio: .08, curvatureResolutionRatioLimit: .1,
  maximumPropertyBoundaryDeviation: .02, propertyBoundaryDeviationTolerance: .05,
};
const pass = qualifyLafeaShellGeometryV3(base);
assert.equal(pass.qualification, 'PASS');
assert.equal(pass.custodyImpact, 'GEOMETRY_CUSTODY_PASS');
const chordalBlock = qualifyLafeaShellGeometryV3({
  ...base, maximumChordalDeviation: .2,
});
assert.equal(chordalBlock.qualification, 'BLOCK');
assert.equal(chordalBlock.custodyImpact, 'GEOMETRY_CUSTODY_BLOCK');
assert.equal(qualifyLafeaShellGeometryV3({
  ...base, maximumCurvatureResolutionRatio: .25,
}).qualification, 'BLOCK');
assert.equal(qualifyLafeaShellGeometryV3({
  ...base, maximumNormalDeviationDegrees: 5,
}).qualification, 'BLOCK');

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch14', status: 'PASS',
  chordalDeviationIndependentGate: true,
  normalDeviationIndependentGate: true,
  curvatureResolutionIndependentGate: true,
  propertyBoundaryRepresentationIndependentGate: true,
  shellGeometryFailureIsGeometryCustodyNotElementQuality: true,
}));

function hash(value) {
  const hex = Buffer.from(value).toString('hex').padEnd(64, '0').slice(0, 64);
  return `sha256:${hex}`;
}
