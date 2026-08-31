import { TRANSLATIONAL_DOFS } from '../linear-fea-contract/model-schema.js';
import { dofIndexOf } from './dof-map.js';
import { compareAscii, requirePositive } from './solver-contract.js';

const CODE = 'SOLVER_ASSEMBLY_INVALID';

function pushDirectionalBlock(triplets, constraint, rowIndices, colIndices, stiffness, sign) {
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const value = sign * stiffness * constraint.direction[row] * constraint.direction[column];
      if (value === 0) continue;
      triplets.push({
        row: rowIndices[row],
        col: colIndices[column],
        value,
        tag: `SPRING:${constraint.constraintId}`,
      });
    }
  }
}

function buildDirectionalSpringTriplets(constraint, dofMap, stiffness) {
  const primary = TRANSLATIONAL_DOFS.map((dof) => dofIndexOf(dofMap, constraint.nodeId, dof));
  const triplets = [];
  pushDirectionalBlock(triplets, constraint, primary, primary, stiffness, 1);
  if (typeof constraint.connectedNodeId === 'string') {
    const connected = TRANSLATIONAL_DOFS.map((dof) => dofIndexOf(dofMap, constraint.connectedNodeId, dof));
    pushDirectionalBlock(triplets, constraint, primary, connected, stiffness, -1);
    pushDirectionalBlock(triplets, constraint, connected, primary, stiffness, -1);
    pushDirectionalBlock(triplets, constraint, connected, connected, stiffness, 1);
  }
  return triplets;
}

export function buildSpringTriplets(model, dofMap) {
  const springs = model.constraints
    .filter((constraint) => constraint.behavior === 'LINEAR_SPRING')
    .sort((left, right) => compareAscii(left.constraintId, right.constraintId));
  const triplets = springs.flatMap((constraint) => {
    const stiffness = requirePositive(constraint.stiffness, `constraints[${constraint.constraintId}].stiffness`, CODE);
    if (Array.isArray(constraint.direction)) {
      return buildDirectionalSpringTriplets(constraint, dofMap, stiffness);
    }
    const index = dofIndexOf(dofMap, constraint.nodeId, constraint.dof);
    return [{ row: index, col: index, value: stiffness, tag: `SPRING:${constraint.constraintId}` }];
  });
  return { triplets, springs };
}
