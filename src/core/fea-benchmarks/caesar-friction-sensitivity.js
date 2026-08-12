import { deepFreeze } from '../shared-piping-model/immutable.js';
import { solveCaesarAccdbFrictionBenchmark } from './caesar-accdb-friction-solve.js';

const DIAGNOSTIC_CASE_IDS = Object.freeze(['L13', 'L7', 'L15']);

/**
 * Run the issue-governed FRICT_STIF sensitivity without changing nominal
 * qualification. The nominal 1x result is supplied by the caller and is never
 * re-solved or replaced by a diagnostic multiplier.
 */
export function runBm4lFrictionStiffnessSensitivity({
  benchmarkPackage,
  frictionSolverProfile,
  nominalResult,
}) {
  const multipliers = normalizeSensitivityMultipliers(frictionSolverProfile);
  const qualificationMultiplier = Number(frictionSolverProfile.qualificationStiffnessMultiplier);
  if (qualificationMultiplier !== 1) {
    throw new TypeError('BM4_L Stage 2 qualificationStiffnessMultiplier must remain 1.');
  }
  if (!multipliers.includes(qualificationMultiplier)) {
    throw new TypeError('stiffnessSensitivityMultipliers must include the qualification multiplier 1.');
  }
  if (!nominalResult || nominalResult.benchmarkId !== 'BM4_L') {
    throw new TypeError('Nominal BM4_L friction result is required for sensitivity evidence.');
  }

  const runs = {};
  for (const multiplier of multipliers) {
    const key = multiplierKey(multiplier);
    if (multiplier === qualificationMultiplier) {
      runs[key] = deepFreeze({
        multiplier,
        role: 'QUALIFICATION_NOMINAL_REUSED',
        status: nominalResult.status,
        source: 'NOMINAL_TWO_REPEAT_RESULT',
        cases: sensitivityCaseProjection(nominalResult),
        error: null,
      });
      continue;
    }
    try {
      const diagnosticPackage = scaleBm4lFrictionStiffnessPackage(benchmarkPackage, multiplier);
      const result = solveCaesarAccdbFrictionBenchmark(diagnosticPackage, {
        caseIds: DIAGNOSTIC_CASE_IDS,
        frictionSolverProfile,
        repeatCount: 1,
      });
      runs[key] = deepFreeze({
        multiplier,
        role: 'DIAGNOSTIC_ONLY',
        status: result.status,
        source: 'INDEPENDENT_DIAGNOSTIC_SOLVE',
        cases: sensitivityCaseProjection(result),
        error: null,
      });
    } catch (error) {
      runs[key] = deepFreeze({
        multiplier,
        role: 'DIAGNOSTIC_ONLY',
        status: 'BLOCKED_DIAGNOSTIC',
        source: 'INDEPENDENT_DIAGNOSTIC_SOLVE',
        cases: null,
        error: deepFreeze({
          name: String(error?.name ?? 'Error'),
          code: error?.code === undefined ? null : String(error.code),
          message: String(error?.message ?? error),
        }),
      });
    }
  }

  return deepFreeze({
    schema: 'm047-bm4l-friction-stiffness-sensitivity/v1',
    parameter: 'FRICT_STIF',
    multipliers,
    qualificationMultiplier,
    qualificationRule: 'ONLY_1X_GOVERNS_STAGE2_ACCEPTANCE',
    diagnosticCaseIds: DIAGNOSTIC_CASE_IDS,
    runs,
  });
}

/** Return a diagnostic package with only the declared FRICT_STIF value scaled. */
export function scaleBm4lFrictionStiffnessPackage(benchmarkPackage, multiplierInput) {
  if (!benchmarkPackage || benchmarkPackage.schema !== 'caesar-accdb-benchmark-package/v1') {
    throw new TypeError('A canonical BM4_L ACCDB package is required.');
  }
  if (benchmarkPackage.benchmarkId !== 'BM4_L') {
    throw new TypeError('Friction stiffness sensitivity is qualified only for BM4_L.');
  }
  const multiplier = positive(multiplierInput, 'frictionStiffnessMultiplier');
  const authority = benchmarkPackage.profile.configurationAuthority;
  if (authority?.schema !== 'caesar-configuration-authority/v1') {
    throw new TypeError('BM4_L sensitivity scaling expects the frozen v1 source authority before migration.');
  }
  const globalLayer = authority.layers?.overallGlobalDefault;
  const declared = globalLayer?.settings?.FRICT_STIF;
  if (!declared || declared.unit !== 'DISPLAYED_CAESAR_UNITS' || !(Number(declared.value) > 0)) {
    throw new TypeError('BM4_L sensitivity requires positive displayed-unit FRICT_STIF authority.');
  }
  const scaledSetting = Object.freeze({
    ...declared,
    value: Number(declared.value) * multiplier,
  });
  return Object.freeze({
    ...benchmarkPackage,
    profile: Object.freeze({
      ...benchmarkPackage.profile,
      configurationAuthority: Object.freeze({
        ...authority,
        layers: Object.freeze({
          ...authority.layers,
          overallGlobalDefault: Object.freeze({
            ...globalLayer,
            settings: Object.freeze({
              ...globalLayer.settings,
              FRICT_STIF: scaledSetting,
            }),
          }),
        }),
      }),
    }),
    diagnosticFrictionStiffnessScale: multiplier,
  });
}

function sensitivityCaseProjection(result) {
  return deepFreeze(Object.fromEntries(DIAGNOSTIC_CASE_IDS.map((caseId) => {
    const evidence = result.mechanics?.cases?.[caseId] ?? null;
    const caseResult = result.cases?.[caseId] ?? null;
    return [caseId, deepFreeze({
      status: evidence?.status ?? (caseId === 'L15' && caseResult?.rows?.length > 0 ? 'DERIVED' : 'NOT_AVAILABLE'),
      rowCount: Array.isArray(caseResult?.rows) ? caseResult.rows.length : 0,
      executionSemanticHash: caseResult?.executionSemanticHash ?? null,
      configuration: evidence?.configuration ?? null,
      finalRepeat: Array.isArray(evidence?.repeats) && evidence.repeats.length > 0
        ? evidence.repeats.at(-1)
        : null,
      independentSolvePerformed: caseId === 'L15'
        ? false
        : evidence?.kind === 'PRIMITIVE_NONLINEAR',
    })];
  })));
}

function normalizeSensitivityMultipliers(profile) {
  if (!profile || profile.schema !== 'caesar-friction-solver-profile/v1') {
    throw new TypeError('frictionSolverProfile/v1 is required for sensitivity.');
  }
  if (!Array.isArray(profile.stiffnessSensitivityMultipliers)
    || profile.stiffnessSensitivityMultipliers.length === 0) {
    throw new TypeError('stiffnessSensitivityMultipliers must be a non-empty array.');
  }
  const values = profile.stiffnessSensitivityMultipliers.map((value, index) =>
    positive(value, `stiffnessSensitivityMultipliers[${index}]`));
  if (new Set(values).size !== values.length) {
    throw new TypeError('stiffnessSensitivityMultipliers contains duplicates.');
  }
  return Object.freeze([...values]);
}

function multiplierKey(value) {
  return `${Number(value)}x`;
}

function positive(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new TypeError(`${field} must be finite and positive.`);
  }
  return number;
}
