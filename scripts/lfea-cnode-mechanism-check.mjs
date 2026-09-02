import assert from 'node:assert/strict';
import {
  connectedComponents,
  detectFloatingComponents,
} from '../src/core/linear-fea-solver/mechanism-diagnostics.js';

const deliberateBreak = process.argv.includes('--deliberate-break');
const connectedSpring = Object.freeze({
  constraintId: 'C-CNODE',
  nodeId: 'N1',
  connectedNodeId: 'N2',
  dof: null,
  behavior: 'LINEAR_SPRING',
  basis: 'GLOBAL',
  stiffness: 1000,
  direction: Object.freeze([1, 0, 0]),
});
const exercisedSpring = deliberateBreak
  ? Object.freeze({ ...connectedSpring, connectedNodeId: null })
  : connectedSpring;
const nodes = Object.freeze([
  Object.freeze({ nodeId: 'N1' }),
  Object.freeze({ nodeId: 'N2' }),
]);

const freePair = Object.freeze({
  nodes,
  elements: Object.freeze([]),
  constraints: Object.freeze([exercisedSpring]),
});
assert.deepEqual(connectedComponents(freePair), [{ componentId: 'N1', nodeIds: ['N1', 'N2'] }],
  'a connected-node spring must join its endpoint nodes into one mechanical component');
assert.deepEqual(detectFloatingComponents(freePair), [{ componentId: 'N1', nodeIds: ['N1', 'N2'] }],
  'an internal CNODE spring must not make a free component look grounded');

const fixedPair = Object.freeze({
  ...freePair,
  constraints: Object.freeze([
    exercisedSpring,
    Object.freeze({ constraintId: 'C-FIX', nodeId: 'N1', dof: 'UX', behavior: 'FIXED' }),
  ]),
});
assert.deepEqual(detectFloatingComponents(fixedPair), [],
  'a real ground restraint on either endpoint grounds the mechanically connected component');

const groundedSpringPair = Object.freeze({
  ...freePair,
  constraints: Object.freeze([
    exercisedSpring,
    Object.freeze({
      constraintId: 'C-GROUND-SPRING', nodeId: 'N2', dof: 'UY',
      behavior: 'LINEAR_SPRING', stiffness: 500,
    }),
  ]),
});
assert.deepEqual(detectFloatingComponents(groundedSpringPair), [],
  'a genuine spring-to-ground is a physical restraint while CNODE remains internal');

console.log(JSON.stringify({
  check: 'lfea-cnode-mechanism',
  status: 'PASS',
  connectedNodeSpringCreatesMechanicalAdjacency: true,
  connectedNodeSpringIsNotGroundRestraint: true,
  realGroundRestraintClearsFloatingState: true,
  deliberateBreakMode: '--deliberate-break drops connected-node custody and must turn this topology gate red',
}, null, 2));
