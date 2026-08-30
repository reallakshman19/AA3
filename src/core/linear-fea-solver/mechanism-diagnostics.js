import { INACTIVE_ANALYSIS_DOF_BEHAVIOR } from '../linear-fea-contract/model-schema.js';
import { compareAscii } from './solver-contract.js';

/**
 * Section 8 "Failure": mechanism, rank deficiency, near-zero pivot and
 * conflicting constraints reported by node/DOF and connected component.
 *
 * Two independent detectors feed the same failure report:
 *  - a topological one, here, that finds a whole rigid body with no physical
 *    restraint touching any of its nodes;
 *  - a numerical one, in `factorization.js`, that reads the pivots for a
 *    partial mechanism the topology check cannot see.
 */

class UnionFind {
  constructor(keys) {
    this.parent = new Map(keys.map((key) => [key, key]));
  }

  find(key) {
    let root = key;
    while (this.parent.get(root) !== root) root = this.parent.get(root);
    let cursor = key;
    while (this.parent.get(cursor) !== root) {
      const next = this.parent.get(cursor);
      this.parent.set(cursor, root);
      cursor = next;
    }
    return root;
  }

  union(left, right) {
    const rootLeft = this.find(left);
    const rootRight = this.find(right);
    if (rootLeft !== rootRight) this.parent.set(rootLeft, rootRight);
  }
}

/**
 * Group model nodes into connected components under mechanical adjacency.
 * Frame elements and exact connected-node springs both transmit internal
 * action between nodes. A grounded spring does not create another model node
 * and therefore does not add an adjacency edge.
 */
export function connectedComponents(model) {
  const nodeIds = model.nodes.map((node) => node.nodeId);
  const unionFind = new UnionFind(nodeIds);
  for (const element of model.elements) unionFind.union(element.nodeI, element.nodeJ);
  for (const constraint of model.constraints) {
    if (constraint.behavior === 'LINEAR_SPRING' && typeof constraint.connectedNodeId === 'string') {
      unionFind.union(constraint.nodeId, constraint.connectedNodeId);
    }
  }
  const groups = new Map();
  for (const nodeId of nodeIds) {
    const root = unionFind.find(nodeId);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(nodeId);
  }
  return [...groups.values()]
    .map((members) => {
      const sorted = [...members].sort(compareAscii);
      return { componentId: sorted[0], nodeIds: sorted };
    })
    .sort((left, right) => compareAscii(left.componentId, right.componentId));
}

function isGroundRestraint(constraint) {
  if (constraint.behavior === INACTIVE_ANALYSIS_DOF_BEHAVIOR) return false;
  if (constraint.behavior === 'LINEAR_SPRING' && constraint.connectedNodeId) return false;
  return true;
}

/**
 * Connected components with zero physical ground restraints touching any
 * member node. Connected-node springs are internal stiffness and therefore do
 * not make a free assembly grounded merely because one spring endpoint lies in
 * the component.
 */
export function detectFloatingComponents(model) {
  const restrainedNodeIds = new Set(model.constraints
    .filter(isGroundRestraint)
    .map((constraint) => constraint.nodeId));
  return connectedComponents(model).filter(
    (component) => !component.nodeIds.some((nodeId) => restrainedNodeIds.has(nodeId)),
  );
}
