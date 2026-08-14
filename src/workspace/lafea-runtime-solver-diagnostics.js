/**
 * Read-only runtime diagnostics projected from the authoritative continuum result.
 * No percentages, estimates, substituted solvers, or reconstructed convergence are produced here.
 */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_RUNTIME_SOLVER_DIAGNOSTICS_SCHEMA =
  'lafea-runtime-solver-diagnostics/v1';

export function projectLafeaRuntimeSolverDiagnostics(executionValue) {
  if (!executionValue || typeof executionValue !== 'object') return null;
  const result = executionValue.result;
  if (!result || typeof result !== 'object') return null;
  const meshEvidence = result.meshEvidence ?? {};
  const storageRoute = meshEvidence.globalStiffnessStorage
    ?? (Array.isArray(meshEvidence.globalStiffnessMatrix) ? 'DENSE' : null);
  const loadCases = (result.loadCaseResults ?? []).map((row) => loadCaseDiagnostics(row));
  const base = freeze({
    schema: LAFEA_RUNTIME_SOLVER_DIAGNOSTICS_SCHEMA,
    stageId: executionValue.stageId ?? 'LAFEA.3',
    executionHash: executionValue.compiledExecutionHash ?? null,
    solverModelHash: executionValue.solverModelHash ?? null,
    storageRoute,
    loadCases,
    methods: [...new Set(loadCases.map((row) => row.method).filter(Boolean))].sort(),
    terminationState: executionValue.status === 'QUALIFIED' ? 'CONVERGED' : 'REJECTED',
    progressPolicy: 'REAL_MILESTONES_ONLY_NO_PERCENTAGE',
    releaseQualified: false,
  });
  return freeze({
    ...base,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-runtime-solver-diagnostics-hash-input/v1',
      diagnostics: base,
    }),
  });
}

function loadCaseDiagnostics(row) {
  const solver = row?.solverEvidence ?? {};
  const freeResiduals = Array.isArray(row?.freeDofResiduals) ? row.freeDofResiduals : [];
  const reactions = Array.isArray(row?.reactions) ? row.reactions : [];
  return freeze({
    loadCaseId: row?.loadCaseId ?? null,
    dofCount: freeResiduals.length + reactions.length,
    freeDofCount: freeResiduals.length,
    constrainedDofCount: reactions.length,
    reactionCount: reactions.length,
    method: solver.method ?? null,
    preconditioner: solver.preconditioner ?? null,
    iterations: integerOrNull(solver.iterations),
    iterationLimit: integerOrNull(solver.iterationLimit),
    initialResidualInfinity: numberOrNull(solver.initialResidualInfinity),
    finalResidualInfinity: numberOrNull(solver.finalResidualInfinity),
    convergenceTarget: numberOrNull(solver.convergenceTarget),
    residualTolerance: numberOrNull(solver.residualTolerance),
    pivotRatio: numberOrNull(solver.pivotRatio),
    accepted: solver.accepted === true && row?.equilibrium?.accepted === true,
    freeDofResidualInfinity: maxAbs(freeResiduals.map((item) => item?.value)),
    equilibrium: clone(row?.equilibrium ?? null),
  });
}

function maxAbs(values) {
  const finite = values.filter(Number.isFinite).map(Math.abs);
  return finite.length ? Math.max(...finite) : null;
}
function integerOrNull(value) { return Number.isInteger(value) ? value : null; }
function numberOrNull(value) { return Number.isFinite(value) ? value : null; }
function clone(value) { return value === null || value === undefined ? null : JSON.parse(JSON.stringify(value)); }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
