/**
 * Stage-specific engineering qualification policies.
 *
 * These are not generic UI defaults. They are source-controlled authority
 * boundaries that define the weakest settings permitted to retain a qualified
 * stage result. Callers may tighten them, but weakening requires a separately
 * qualified policy revision rather than a browser/API override.
 */
export const LAFEA3_QUALIFIED_MESH_QUALITY_POLICY = Object.freeze({
  policyId: 'LAFEA3_MESH_QUALITY_POLICY_V1',
  revision: '2026-08-15',
  authority: 'SOURCE_CONTROLLED_ENGINEERING_QUALIFICATION_GATE',
  weakeningRule: 'TIGHTEN_ONLY',
  fields: Object.freeze({
    adjacentSizeRatioMax: 1.5,
    aspectRatioWarn: 3.0,
    aspectRatioBlock: 10.0,
    scaledJacobianWarn: 0.5,
    scaledJacobianBlock: 0.2,
    adaptiveLevelsMinimum: 3,
  }),
});
