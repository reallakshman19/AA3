import { deepFreeze } from '../shared-piping-model/immutable.js';
import {
  runBm4lFrictionStiffnessSensitivity as runBaseSensitivity,
  scaleBm4lFrictionStiffnessPackage,
} from './caesar-friction-sensitivity.js';
import { solveCaesarAccdbFrictionBenchmark } from './caesar-accdb-friction-stage2-governed.js';

const GOVERNED_DIAGNOSTIC_CASE_IDS = Object.freeze(['L13', 'L7', 'L15', 'L1']);

/** Extend the existing diagnostic sensitivity receipt to the hydrotest primitive. */
export function runBm4lFrictionStiffnessSensitivity(input) {
  const base = runBaseSensitivity(input);
  const multipliers = base.multipliers;
  const qualificationMultiplier = base.qualificationMultiplier;
  const runs = {};

  for (const multiplier of multipliers) {
    const key = `${Number(multiplier)}x`;
    const baseRun = base.runs[key];
    if (multiplier === qualificationMultiplier) {
      runs[key] = deepFreeze({
        ...baseRun,
        cases: deepFreeze({
          ...(baseRun.cases ?? {}),
          L1: projectL1(input.nominalResult),
        }),
      });
      continue;
    }

    try {
      const diagnosticPackage = scaleBm4lFrictionStiffnessPackage(input.benchmarkPackage, multiplier);
      const result = solveCaesarAccdbFrictionBenchmark(diagnosticPackage, {
        caseIds: ['L1'],
        frictionSolverProfile: input.frictionSolverProfile,
        repeatCount: 1,
      });
      const l1 = projectL1(result);
      runs[key] = deepFreeze({
        ...baseRun,
        status: baseRun.status === 'PASS' && l1.status === 'PASS'
          ? 'PASS'
          : baseRun.status === 'BLOCKED_DIAGNOSTIC' || l1.status !== 'PASS'
            ? 'BLOCKED_DIAGNOSTIC'
            : baseRun.status,
        cases: deepFreeze({
          ...(baseRun.cases ?? {}),
          L1: l1,
        }),
        l1Error: null,
      });
    } catch (error) {
      runs[key] = deepFreeze({
        ...baseRun,
        status: 'BLOCKED_DIAGNOSTIC',
        cases: deepFreeze({
          ...(baseRun.cases ?? {}),
          L1: deepFreeze({
            status: 'BLOCKED_DIAGNOSTIC',
            rowCount: 0,
            executionSemanticHash: null,
            configuration: null,
            finalRepeat: null,
            independentSolvePerformed: true,
          }),
        }),
        l1Error: deepFreeze({
          name: String(error?.name ?? 'Error'),
          code: error?.code === undefined ? null : String(error.code),
          message: String(error?.message ?? error),
        }),
      });
    }
  }

  return deepFreeze({
    ...base,
    schema: 'm047-bm4l-friction-stiffness-sensitivity/v2',
    diagnosticCaseIds: GOVERNED_DIAGNOSTIC_CASE_IDS,
    runs: deepFreeze(runs),
  });
}

export { scaleBm4lFrictionStiffnessPackage };

function projectL1(result) {
  const evidence = result?.mechanics?.cases?.L1 ?? null;
  const caseResult = result?.cases?.L1 ?? null;
  return deepFreeze({
    status: evidence?.status ?? 'NOT_AVAILABLE',
    rowCount: Array.isArray(caseResult?.rows) ? caseResult.rows.length : 0,
    executionSemanticHash: caseResult?.executionSemanticHash ?? null,
    configuration: evidence?.configuration ?? null,
    finalRepeat: Array.isArray(evidence?.repeats) && evidence.repeats.length > 0
      ? evidence.repeats.at(-1)
      : null,
    independentSolvePerformed: evidence?.kind === 'PRIMITIVE_NONLINEAR',
  });
}
