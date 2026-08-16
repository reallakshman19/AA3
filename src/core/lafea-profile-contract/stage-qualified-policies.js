/**
 * Stage-specific engineering qualification policies.
 *
 * These are not generic UI defaults. They are source-controlled authority
 * boundaries that define the weakest settings permitted to retain a qualified
 * stage result. Callers may tighten them, but weakening requires a separately
 * qualified policy revision rather than a browser/API override.
 */
const LAFEA3_MESH_QUALITY_FIELDS = Object.freeze({
  adjacentSizeRatioMax: 1.5,
  aspectRatioWarn: 3.0,
  aspectRatioBlock: 10.0,
  scaledJacobianWarn: 0.5,
  scaledJacobianBlock: 0.2,
  adaptiveLevelsMinimum: 3,
});

const LAFEA_SHELL_MESH_QUALITY_FIELDS = Object.freeze({
  adjacentSizeRatioMax: 1.5,
  aspectRatioWarn: 5.0,
  aspectRatioBlock: 10.0,
  scaledJacobianWarn: 0.6,
  scaledJacobianBlock: 0.2,
  adaptiveLevelsMinimum: 3,
});

export const LAFEA3_QUALIFIED_MESH_QUALITY_POLICY = Object.freeze({
  policyId: 'LAFEA3_MESH_QUALITY_POLICY_V1',
  revision: '2026-08-15',
  authority: 'SOURCE_CONTROLLED_ENGINEERING_QUALIFICATION_GATE',
  weakeningRule: 'TIGHTEN_ONLY',
  fields: LAFEA3_MESH_QUALITY_FIELDS,
});

/**
 * LAFEA.4 shell quality authority is deliberately declared independently from
 * the LAFEA.3 continuum policy. The numerical limits reflect the established
 * shell qualification envelope and are combined with explicit shell
 * orientation/topology and midsurface-director checks.
 */
export const LAFEA4_QUALIFIED_MESH_QUALITY_POLICY = Object.freeze({
  policyId: 'LAFEA4_SHELL_MESH_QUALITY_POLICY_V1',
  revision: '2026-08-16',
  authority: 'SOURCE_CONTROLLED_ENGINEERING_QUALIFICATION_GATE',
  weakeningRule: 'TIGHTEN_ONLY',
  formulation: 'CST_DKT_TRI3_THIN_SHELL_V1',
  fields: LAFEA_SHELL_MESH_QUALITY_FIELDS,
});

/**
 * LAFEA.5 adopts a caller-authored host-shell mesh rather than remeshing it.
 * Adoption does not waive mesh-quality authority: the retained source mesh
 * must satisfy the declared shell shape floor plus source-director/winding
 * consistency before it can receive governed mesh PASS evidence.
 */
export const LAFEA5_QUALIFIED_MESH_QUALITY_POLICY = Object.freeze({
  policyId: 'LAFEA5_SOURCE_SHELL_MESH_QUALITY_POLICY_V1',
  revision: '2026-08-16',
  authority: 'SOURCE_CONTROLLED_ENGINEERING_QUALIFICATION_GATE',
  weakeningRule: 'TIGHTEN_ONLY',
  formulation: 'CST_DKT_TRI3_THIN_SHELL_V1',
  fields: LAFEA_SHELL_MESH_QUALITY_FIELDS,
});
