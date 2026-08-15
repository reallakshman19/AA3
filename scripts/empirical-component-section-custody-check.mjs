import assert from 'node:assert/strict';
import {
  assembleRootedTreeComponentFlexibility,
  inspectRootedTreeComponentSectionCustody,
} from '../src/core/empirical-piping-mechanics/index.js';

const baseProperties = {
  elasticModulusPa: 200e9,
  shearModulusPa: 76.923076923e9,
  areaM2: 0.004,
  secondMomentYM4: 8e-6,
  secondMomentZM4: 8e-6,
  torsionConstantM4: 1.6e-5,
};
const straight = {
  componentId: 'PIPE-1',
  kind: 'STRAIGHT',
  nodeAId: 'N0',
  nodeBId: 'N1',
  properties: baseProperties,
  thermal: null,
  geometry: null,
  flexibilityAuthority: null,
};
const custody = inspectRootedTreeComponentSectionCustody([straight]);
assert.equal(custody.sectionOrientationAuthority, 'AXISYMMETRIC_SECTION_ONLY');
assert.equal(custody.rows[0].status, 'AXISYMMETRIC');

assert.throws(() => assembleRootedTreeComponentFlexibility({
  nodes: [
    { id: 'N0', pointM: { x: 0, y: 0, z: 0 } },
    { id: 'N1', pointM: { x: 1, y: 0, z: 0 } },
  ],
  components: [{
    ...straight,
    properties: { ...baseProperties, secondMomentZM4: 1.01 * baseProperties.secondMomentYM4 },
  }],
  rootNodeId: 'N0',
  cases: [{ caseId: 'UY', nodeId: 'N1', direction: [0, 1, 0] }],
}), (error) => error?.code === 'EMPIRICAL_COMPONENT_SECTION_ORIENTATION_UNRESOLVED');

console.log('PASS: mixed ROM section-orientation custody checks');
