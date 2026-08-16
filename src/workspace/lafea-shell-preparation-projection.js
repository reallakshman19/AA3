/**
 * Shell-only preparation projection derived from the governed solver compiler.
 *
 * LAFEA.4/.5 cannot use the legacy preparation producer: that producer is
 * intentionally unqualified and its request contract requires lifecycle model
 * artifacts that are published only after execution. The shell compiler itself
 * performs the relevant pre-run checks against current source authority,
 * midsurface, mesh, material/thickness, BC/load transfer policy and orientation.
 */
export const LAFEA_SHELL_PREPARATION_PROJECTION_SCHEMA =
  'lafea-shell-preparation-projection/v1';

export function buildLafeaShellPreparationProjection(stageValue) {
  const stage = requireStage(stageValue);
  if (stage.shellMidsurfaceProfileActive !== true) {
    return projection(stage.stageId, 'NOT_APPLICABLE', true, [], null, null);
  }
  const solver = stage.shellSolverModelProjection;
  if (!solver || solver.state === 'ABSENT') {
    return projection(
      stage.stageId,
      'ABSENT',
      false,
      solver?.reasons?.length ? solver.reasons : ['SHELL_SOLVER_MODEL_PREPARATION_ABSENT'],
      null,
      solver?.compilerId ?? null,
    );
  }
  if (solver.state === 'CURRENT_PASS' && solver.usableForRun === true) {
    return projection(
      stage.stageId,
      'CURRENT_PASS',
      true,
      [],
      solver.solverModelBindingHash,
      solver.compilerId,
    );
  }
  return projection(
    stage.stageId,
    'CURRENT_BLOCK',
    false,
    solver.reasons?.length ? solver.reasons : ['SHELL_SOLVER_MODEL_PREPARATION_BLOCKED'],
    solver.solverModelBindingHash ?? null,
    solver.compilerId ?? null,
  );
}

function projection(stageId, state, usable, reasons, evidenceHash, producerRef) {
  return freeze({
    schema: LAFEA_SHELL_PREPARATION_PROJECTION_SCHEMA,
    stageId,
    state,
    usableForAuthorization: usable,
    reasons: [...new Set(reasons.filter(Boolean))],
    evidenceHash,
    approvalHash: null,
    producerRef,
    preparationProfileHash: null,
    warningFindingIds: [],
    blockingFindingIds: [],
    authority: 'SHELL_RETAINED_MESH_SOLVER_COMPILER_PREFLIGHT',
    releaseQualified: false,
  });
}

function requireStage(value) {
  if (!value || typeof value !== 'object' || typeof value.stageId !== 'string') {
    throw new TypeError('LAFEA_SHELL_PREPARATION_STAGE_REQUIRED');
  }
  return value;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
