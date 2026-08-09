/**
 * Stage/formulation DOF policy used for mesh resource estimates.
 *
 * This is an engineering contract, not a display heuristic. LAFEA.3 planar
 * continuum carries UX/UY. LAFEA.4 and LAFEA.5 use the qualified
 * CST_DKT_TRI3_THIN_SHELL_V1 formulation whose node basis is
 * UX/UY/UZ/R1/R2 and deliberately has no drilling DOF.
 */
export const LAFEA_MESH_DOF_POLICY_SCHEMA = 'lafea-mesh-dof-policy/v1';

const DOFS_PER_NODE_BY_STAGE = Object.freeze({
  'LAFEA.3': 2,
  'LAFEA.4': 5,
  'LAFEA.5': 5,
});

export function lafeaMeshDofsPerNode(stageId) {
  const value = DOFS_PER_NODE_BY_STAGE[stageId];
  if (!Number.isInteger(value) || value <= 0) {
    const error = new TypeError('LAFEA_MESH_DOF_POLICY_STAGE_NOT_SUPPORTED');
    error.code = 'LAFEA_MESH_DOF_POLICY_STAGE_NOT_SUPPORTED';
    throw error;
  }
  return value;
}

export function estimateLafeaMeshDofs(stageId, nodeCount) {
  if (!Number.isInteger(nodeCount) || nodeCount < 0) {
    const error = new TypeError('LAFEA_MESH_DOF_POLICY_NODE_COUNT_INVALID');
    error.code = 'LAFEA_MESH_DOF_POLICY_NODE_COUNT_INVALID';
    throw error;
  }
  return lafeaMeshDofsPerNode(stageId) * nodeCount;
}
