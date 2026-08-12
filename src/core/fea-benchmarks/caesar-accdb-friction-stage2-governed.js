import { deepFreeze } from '../shared-piping-model/immutable.js';
import {
  BM4L_FRICTION_EXECUTION_ORDER,
  solveCaesarAccdbFrictionBenchmark as solveRawCaesarAccdbFrictionBenchmark,
} from './caesar-accdb-friction-solve.js';
import { solveBm4lHydrotestFrictionCase } from './caesar-accdb-hydrotest-friction.js';

/**
 * Governed Stage-2 public solver.
 *
 * L13/L7/L15 remain owned by the existing #1085 nonlinear path. L1 is solved
 * last through the source-custodied WW+HP compatibility assembly. This wrapper
 * exists so the hydrotest fix does not broaden or rewrite the qualified raw
 * friction adapter.
 */
export function solveCaesarAccdbFrictionBenchmark(benchmarkPackage, options = {}) {
  const requested = normalizeRequestedCases(options.caseIds);
  const baseRequested = requested.filter((caseId) => caseId !== 'L1');
  const baseResult = baseRequested.length > 0
    ? solveRawCaesarAccdbFrictionBenchmark(benchmarkPackage, {
      ...options,
      caseIds: baseRequested,
    })
    : null;

  if (!requested.includes('L1')) return baseResult;

  const hydro = solveBm4lHydrotestFrictionCase(benchmarkPackage, options);
  const mechanicsContext = baseResult?.mechanics ?? hydro.solverContext;
  const baseLimitations = Array.isArray(mechanicsContext?.limitations)
    ? mechanicsContext.limitations.filter((text) => !String(text).startsWith('L1 WW+HP is blocked'))
    : [];
  const baseStatus = baseResult?.status ?? 'PASS';
  const status = baseStatus === 'PASS' && hydro.evidence.status === 'PASS' ? 'PASS' : 'BLOCKED';

  return deepFreeze({
    schema: 'lfea-accdb-friction-benchmark-actual/v1',
    benchmarkId: benchmarkPackage.benchmarkId,
    sourceAccdbSha256: benchmarkPackage.source.sha256,
    status,
    executionOrder: BM4L_FRICTION_EXECUTION_ORDER.filter((caseId) => requested.includes(caseId)),
    cases: {
      ...(baseResult?.cases ?? {}),
      L1: hydro.caseResult,
    },
    mechanics: {
      schema: 'lfea-accdb-friction-solve-evidence/v1',
      configurationAuthority: mechanicsContext?.configurationAuthority ?? null,
      solverProfile: mechanicsContext?.solverProfile ?? options.frictionSolverProfile ?? null,
      cases: {
        ...(baseResult?.mechanics?.cases ?? {}),
        L1: hydro.evidence,
      },
      limitations: Object.freeze([
        ...baseLimitations,
        'L1 WW+HP uses a source-custodied assembly-only transformation: WW is SG=1 water-filled weight, HP is HYDRO_PRESSURE, and hydro insulation is excluded under CAESAR default Include Insulation in Hydrotest=False.',
        'The L1 compatibility alias is never benchmark reference authority; stored pinned ACCDB L1 output remains the comparison reference.',
      ]),
    },
  });
}

function normalizeRequestedCases(caseIds) {
  const requested = caseIds ?? BM4L_FRICTION_EXECUTION_ORDER;
  if (!Array.isArray(requested) || requested.length === 0) {
    throw new TypeError('At least one governed BM4_L friction case is required.');
  }
  const values = [...new Set(requested.map(String))];
  const unknown = values.filter((caseId) => !BM4L_FRICTION_EXECUTION_ORDER.includes(caseId));
  if (unknown.length > 0) {
    throw new TypeError(`Unsupported BM4_L Stage-2 friction cases: ${unknown.join(', ')}.`);
  }
  return Object.freeze(values);
}
