import { accdbRestraintTypeCorrespondence } from '../geometry/adapters/accdb-restraint-type-correspondence.js';

/**
 * The child features an ACCDB element carries -- rigids, reducers, restraints
 * and SIFs -- in the shape the governed feature inventory reads.
 *
 * Split out of accdb-source-binding.js when that file outgrew this project's
 * module size limit. The binding still owns the element records and their
 * field evidence; everything about what hangs off an element lives here.
 */

export function childFeatureRecords({ sourceFeatureId, row, rigidsByPointer, reducersByPointer, restraintsByNode, sifsByNode }) {
  const records = [];
  const rigidPointer = numberOrNull(row.RIGID_PTR);
  if (rigidPointer != null && rigidPointer > 0) {
    const declaration = rigidsByPointer.get(rigidPointer);
    if (declaration) {
      records.push(Object.freeze({
        sourceFeatureId: `${sourceFeatureId}/RIGID[0]`,
        parentFeatureId: sourceFeatureId,
        kind: 'RIGID',
        ordinal: 0,
        rawAttributes: Object.freeze({ TYPE: declaration.RIGID_TYPE ?? null, WEIGHT: declaration.RIGID_WGT ?? null }),
      }));
    }
  }
  const reducerPointer = numberOrNull(row.REDUCER_PTR);
  if (reducerPointer != null && reducerPointer > 0) {
    const declaration = reducersByPointer.get(reducerPointer);
    if (declaration) {
      records.push(Object.freeze({
        sourceFeatureId: `${sourceFeatureId}/REDUCER[0]`,
        parentFeatureId: sourceFeatureId,
        kind: 'REDUCER',
        ordinal: 0,
        rawAttributes: Object.freeze({ ...declaration }),
      }));
    }
  }
  const fromNode = cleanNodeId(row.FROM_NODE);
  const toNode = cleanNodeId(row.TO_NODE);
  // Restraints attach to nodes in ACCDB's own table shape, not to elements as
  // InputXML's inline <RESTRAINT> tags do. They are still surfaced here as
  // element child features, because that is where the governed feature
  // inventory looks for them -- and an inventory that finds no restraints
  // compiles a model with no supports at all, which is exactly what happened
  // before this: every ACCDB model reached the solver as an unrestrained
  // rigid-body mechanism.
  //
  // Each restraint is emitted exactly once, on the lowest-numbered element
  // that touches its node, so a node shared by two elements does not declare
  // its support twice and collide on the DOF.
  //
  // TYPE carries CAESAR's own label (ANC, +Y, GUI, LIM) rather than either
  // numbering. The ACCDB code cannot be passed through -- it is a different
  // enumeration from InputXML's (see accdb-restraint-type-correspondence.js)
  // -- and the label is the form the correction table resolves directly,
  // never re-mutating it, which a corrected numeric code could not guarantee.
  let restraintOrdinal = 0;
  for (const nodeId of [fromNode, toNode]) {
    for (const restraintRow of restraintsByNode.get(nodeId) ?? []) {
      if (String(restraintRow.__ownerElementId) !== String(row.ELEMENTID)) continue;
      const correspondence = accdbRestraintTypeCorrespondence(restraintRow.RES_TYPEID);
      records.push(Object.freeze({
        sourceFeatureId: `${sourceFeatureId}/RESTRAINT[${restraintOrdinal}]`,
        parentFeatureId: sourceFeatureId,
        kind: 'RESTRAINT',
        ordinal: restraintOrdinal,
        rawAttributes: Object.freeze({
          NODE: nodeId,
          // Null when the code has no evidenced correspondence; the geometry
          // adapter has already raised ACCDB_RESTRAINT_TYPE_UNMAPPED for it,
          // and the inventory will read the restraint as unclassified rather
          // than as some default kind.
          TYPE: correspondence?.typeLabel ?? null,
          ACCDB_RES_TYPEID: restraintRow.RES_TYPEID ?? null,
          XCOSINE: restraintRow.XCOSINE ?? null,
          YCOSINE: restraintRow.YCOSINE ?? null,
          ZCOSINE: restraintRow.ZCOSINE ?? null,
          GAP: restraintRow.GAP ?? null,
          FRIC_COEF: restraintRow.FRIC_COEF ?? null,
          CNODE: restraintRow.CNODE ?? null,
          STIFFNESS: restraintRow.STIFFNESS ?? null,
        }),
      }));
      restraintOrdinal += 1;
    }
  }
  let sifOrdinal = 0;
  for (const nodeId of [fromNode, toNode]) {
    for (const sifRow of sifsByNode.get(nodeId) ?? []) {
      records.push(Object.freeze({
        sourceFeatureId: `${sourceFeatureId}/SIF[${sifOrdinal}]`,
        parentFeatureId: sourceFeatureId,
        kind: 'SIF',
        ordinal: sifOrdinal,
        rawAttributes: Object.freeze({ NODE: sifRow.NODE, TYPE: sifRow.TYPE, SIF_IN: sifRow.SIF_IN, SIF_OUT: sifRow.SIF_OUT }),
      }));
      sifOrdinal += 1;
    }
  }
  return records;
}

/**
 * Restraints keyed by node, each tagged with the one element that will declare
 * it.
 *
 * A restrained node is usually shared by two elements. Without a single
 * declared owner the same support would be emitted twice and the constraint
 * compiler would fail closed on a DOF collision -- correctly, since two
 * declarations of one support is exactly what that check exists to catch. The
 * lowest ELEMENTID touching the node owns it, which is deterministic and
 * independent of table order.
 */
export function accdbRestraintsByNode(restraintRows, elementRows) {
  const ownerByNode = new Map();
  for (const element of elementRows) {
    const elementId = Number(element.ELEMENTID);
    for (const nodeId of [cleanNodeId(element.FROM_NODE), cleanNodeId(element.TO_NODE)]) {
      if (!nodeId) continue;
      const current = ownerByNode.get(nodeId);
      if (current === undefined || elementId < current) ownerByNode.set(nodeId, elementId);
    }
  }
  const byNode = new Map();
  for (const row of restraintRows) {
    const nodeId = cleanNodeId(row.NODE_NUM ?? row.NODE);
    if (!nodeId) continue;
    const owner = ownerByNode.get(nodeId);
    // A restraint on a node no element touches is left out of the inventory;
    // the geometry adapter already reports it as an unresolved restraint node.
    if (owner === undefined) continue;
    if (!byNode.has(nodeId)) byNode.set(nodeId, []);
    byNode.get(nodeId).push({ ...row, __ownerElementId: owner });
  }
  return byNode;
}


function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.abs(numeric - ACCDB_BLANK_SENTINEL) < ACCDB_SENTINEL_TOLERANCE ? null : numeric;
}

function cleanNodeId(value) {
  const numeric = numberOrNull(value);
  if (numeric === null) return '';
  return String(Math.round(numeric));
}

const ACCDB_BLANK_SENTINEL = -1.01010000705719;
const ACCDB_SENTINEL_TOLERANCE = 0.001;
