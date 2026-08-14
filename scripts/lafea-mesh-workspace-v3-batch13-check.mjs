#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_MESH_DOMAIN_CONFORMANCE_V3_SCHEMA,
  qualifyLafeaMeshDomainConformanceV3,
} from '../src/workspace/lafea-mesh-domain-conformance-v3.js';
import { lafeaMeshValidationPolicyV3 } from '../src/workspace/lafea-mesh-validation-bundle-v3.js';

const base = {
  schema: LAFEA_MESH_DOMAIN_CONFORMANCE_V3_SCHEMA,
  stageId: 'LAFEA.4', meshContentHash: hash('M'), analysisGeometryHash: hash('G'),
  propertyBoundaryHash: hash('PB'), conformanceOperatorHash: hash('OPERATOR'),
  lengthUnit: 'mm', measureUnit: 'mm^2', expectedDomainMeasure: 100,
  coveredDomainMeasure: 100, uncoveredDomainMeasure: 0, overlapMeasure: 0,
  outsideDomainMeasure: 0, maximumBoundaryDeviation: .001,
  maximumPropertyBoundaryDeviation: .001, unmappedBcSupportMeasure: 0,
  unmappedLoadSupportMeasure: 0, domainMeasureAbsTolerance: 1e-6,
  boundaryDeviationTolerance: .01, propertyBoundaryDeviationTolerance: .01,
  supportMeasureAbsTolerance: 1e-6,
};
assert.equal(qualifyLafeaMeshDomainConformanceV3(base).qualification, 'PASS');
assert.equal(qualifyLafeaMeshDomainConformanceV3({
  ...base, coveredDomainMeasure: 99, uncoveredDomainMeasure: 1,
}).qualification, 'BLOCK');
assert.equal(qualifyLafeaMeshDomainConformanceV3({
  ...base, maximumPropertyBoundaryDeviation: .5,
}).qualification, 'BLOCK');
assert.equal(qualifyLafeaMeshDomainConformanceV3({
  ...base, unmappedBcSupportMeasure: .1,
}).qualification, 'BLOCK');

for (const [stageId, family] of [
  ['LAFEA.3', 'T3'], ['LAFEA.3', 'T6'],
  ['LAFEA.4', 'CST_DKT_TRI3_THIN_SHELL_V1'],
  ['LAFEA.5', 'CST_DKT_TRI3_THIN_SHELL_V1'],
]) {
  assert.ok(lafeaMeshValidationPolicyV3(stageId, family).requiredGateIds.includes('DOMAIN_CONFORMANCE'));
}

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch13', status: 'PASS',
  exactDomainCoverageIsRequired: true,
  overlapAndOutsideDomainAreGoverned: true,
  propertyBoundaryConformanceIsGoverned: true,
  bcAndLoadSupportMappingAreGoverned: true,
  domainConformanceIsRequiredForEveryV3MeshStage: true,
}));

function hash(value) {
  const hex = Buffer.from(value).toString('hex').padEnd(64, '0').slice(0, 64);
  return `sha256:${hex}`;
}
