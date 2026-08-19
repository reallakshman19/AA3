# PR1269 work report — EMP.1 critical WRC numerical/runtime qualification

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `ISSUE: #1261`
- `PR: #1269`
- `BRANCH: agent/emp1-wrc-numerical-contract-issue1261`
- `PARENT_PR: #1266`
- `PARENT_HEAD_AT_CUT: c4ecc9ec48cb87937d65599449dee55b86513f3a`
- `VALIDATED_IMPLEMENTATION_HEAD: 2468b1f712c2d08390988d52becabefd1a5f0d1b`
- `VALIDATION_WORKFLOW_RUN: 32282955286 (#966)`
- `EMP1_CRITICAL_SOFTWARE_CONTRACT: PASS`
- `EMP1_FOCUSED_CHROMIUM: PASS`
- `FULL_WORKFLOW: FAIL_EXTERNAL_B02D`
- `EMP1_C_ENGINEERING_AUTHORITY: BLOCKED`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `RELEASE_QUALIFIED: false`
- `CURRENT_STAGE: EMP1_CRITICAL_SCOPE_PASS_EXTERNAL_B02D_BLOCK`

## Final scope verdict

The confirmed Critical findings are implemented as fail-closed software contracts. On implementation head `2468b1f...`, the exact-head Stage-17 workflow completed every EMP.1 prerequisite and all five focused EMP.1 Chromium journeys, then entered the unrelated B01/B02 production gate and failed at the inherited B02D polar-mesh check:

```text
T3/L1
actual:   BLOCK
expected: PASS
LAFEA_B02_PRODUCTION_SEQUENCE_BLOCKED_AT_B02D_POLAR_MESH
```

Therefore:

```text
EMP.1 critical software-contract scope = PASS
EMP.1 focused browser qualification   = PASS
full Stage-17 workflow                = FAIL_EXTERNAL_B02D
WRC engineering qualification         = BLOCKED / NOT_RUN
CAUx engineering qualification        = BLOCKED / NOT_RUN
release qualification                 = false
```

No B02D file, mesh formulation, frozen B02 definition, or FEM policy is changed by PR1269.

## Authority boundary

This PR deliberately does **not**:

- populate WRC a-j values;
- choose unresolved WRC signs;
- infer a LAFEA→WRC field permutation;
- infer pressure-thrust direction;
- invent a replacement stress-intensity formula;
- freeze CAUx pp.24–31 expected values;
- register an EMP.1.C production evaluator/route;
- grant engineering, code-compliance, or release authority.

WRC and CAUx retained source ledgers still have unresolved raw-PDF SHA-256 custody. WRC remains METHOD_SOURCE; CAUx pp.24–31 remains BENCHMARK_SOURCE; independent-derived evidence remains separate; production results never become source authority.

## Critical findings — implemented contracts

### CF-01 — coefficient inventory fail-open

Retained curve fit:

```text
Y(U) = a + bU + cU² + ... + jU⁹
```

Inventory:

```text
20 SP/SM charts × 6 response curves/chart = 120 response curves
120 curves × 10 named coefficients {a..j} = 1200 scalar coefficients
```

Old fail-open logic could treat one `coefficient_value` per row as complete coverage. New readiness requires all 1200 named scalar slots.

Current retained payload is truthfully blocked:

```text
curveRows                      = 120
coefficientSchema              = LEGACY_SINGLE_VALUE_PER_CURVE
requiredScalarCoefficientCount = 1200
numericScalarCoefficientCount  = 0
missingScalarCoefficientCount  = 1200
```

### CF-02 — runtime U custody

`U` is the polynomial independent variable, not a fixed third chart ordinate. Legacy `parameter_3_name=U / parameter_3_value=...` cannot qualify. A future qualified payload must declare runtime `U` explicitly.

### CF-03 — radial membrane dimensional contradiction

Retained definition:

```text
Y = Nx*T/P
sigma_m = Nx/T
```

Therefore:

```text
Nx      = Y*P/T
sigma_m = Y*P/T²
```

The retained machine equation uses `Y*P/T`, missing one `T`. The runtime now hard-blocks:

`SP_RADIAL_MEMBRANE_STRESS_DIMENSION_MISMATCH`.

No inferred correction is promoted as WRC authority.

### CF-04 — moment membrane dimensional contradiction

Retained definition:

```text
Y = Nx*T*sqrt(Rm*T)/M
```

Therefore:

```text
sigma_m = Y*M/(T²*sqrt(Rm*T))
```

The retained machine equation contains only one shell-thickness divisor outside the square root. The runtime hard-blocks:

`SM_MOMENT_MEMBRANE_STRESS_DIMENSION_MISMATCH`.

### CF-05 — stress-intensity dimensional contradiction

The retained `EQ_STRESS_INTENSITY` applies an outer square root to an expression already having stress dimension. Its output therefore has `sqrt(stress)` dimension, not stress.

A simple synthetic state illustrates the defect:

```text
sigx = 100
sigy = 50
tau  = 0
retained outer-root branch = sqrt(100) = 10 sqrt(stress-units)
```

The runtime hard-blocks:

`STRESS_INTENSITY_OUTPUT_DIMENSION_MISMATCH`.

No Tresca/von-Mises replacement is silently substituted as WRC authority.

### CF-06 — LAFEA→WRC axis mapping custody

Existing LAFEA local-frame semantics are not equivalent to the tentative retained WRC mapping by declaration:

```text
LAFEA eX = pipe axial
LAFEA eZ = projected radial hint
LAFEA eY = eZ × eX

LAFEA.2 axial membrane uses Fx/A
LAFEA.2 torsion uses Mx*r/J
```

Future EMP.1.C method authority now requires a separate source-bound runtime qualification containing:

- exact mapping contract hash;
- canonical-frame contract hash;
- source locator;
- binding to the source-qualified WRC raw-PDF SHA-256.

A hard-coded `FX/FY/FZ/MX/MY/MZ -> P/V1/V2/M1/M2/Mt` permutation cannot satisfy the gate by itself.

### CF-07 — pressure-thrust inclusion / double-count custody

Existing supplemental independent sanity case:

```text
pressure = 275 psi
nozzle ID = 12 in
A = pi*12²/4 = 113.097335529 in²
pressure thrust = 31,101.7672705 lbf
restraint axial force = -26 lbf
WRC radial P = -26 - 31,101.7672705
             = -31,127.7672705 lbf
reported rounded value = -31,128 lbf
```

The thrust magnitude is about `31,101.77 / 26 = 1196.22×` the 26-lbf restraint magnitude. Omission or double counting is therefore catastrophic in this sanity case.

The production method cannot become authorized until a source-bound runtime record selects exactly one governed mode:

```text
SOURCE_LOAD_ALREADY_INCLUDES_THRUST
ADD_PRESSURE_THRUST_FROM_NOZZLE_ID
NOT_APPLICABLE_BY_QUALIFIED_METHOD
```

and proves:

- independent check `PASS`;
- `doubleCountGuardQualified = true`;
- retained pressure-thrust policy record hash.

The supplemental Hexagon result remains bounded sanity evidence only; it does not satisfy CAUx A4 or WRC method authority.

### CF-08 — stress-intensity source semantics

Even after the retained dimensional transcription is source-arbitrated, method authority requires:

- source-bound definition contract hash;
- source locator;
- output dimension exactly `STRESS`;
- independent check `PASS`;
- retained qualification-record hash.

### CF-09 — immutable retained-evidence re-observation

The retained WRC extraction is pinned by repository, commit, exact artifact path, Git blob SHA-1, and byte count. EMP.1.C qualification re-reads/re-hashes the retained bytes and independently recomputes readiness.

A hand-edited frozen audit cannot move runtime qualification. During CI this guard correctly found an editorial mismatch in the frozen `openIssues` strings; the repair restored byte-semantic fidelity to the pinned dataset rather than weakening the anti-drift check.

## Current public EMP.1.C blockers

Exactly six intentional blockers remain:

```text
WRC_DATASET_NOT_READY
WRC_DIMENSIONAL_CONTRACT_UNRESOLVED
WRC_RUNTIME_CONTRACTS_UNRESOLVED
WRC_NUMERICAL_COEFFICIENTS_MISSING
WRC_SIGN_ARBITRATION_OPEN
CAUX_PP24_31_NOT_FROZEN
```

Current retained dimensional violations are exactly:

```text
SP_RADIAL_MEMBRANE_STRESS_DIMENSION_MISMATCH
SM_MOMENT_MEMBRANE_STRESS_DIMENSION_MISMATCH
STRESS_INTENSITY_OUTPUT_DIMENSION_MISMATCH
```

Current runtime-contract qualification is intentionally `NOT_RUN/BLOCKED` for axis mapping, pressure-thrust policy, and stress-intensity source definition.

## Validation ledger — implementation head 2468b1f...

| Check | Result | Interpretation |
|---|---|---|
| Exact head / clean tree | PASS | workflow #966 |
| Static and projection checks | PASS | no syntax/projection regression |
| Shell mesh compiler/execution custody | PASS | unrelated shell boundary not regressed |
| Standalone inherited-boundary proof | PASS | existing boundary behavior unchanged |
| Standalone build | PASS | bundle builds |
| Production Pages build | PASS | production bundle builds |
| Pinned Chromium install | PASS | browser runtime available |
| WRC coefficient/U/dimensional self-test | PASS | software contract only |
| Supplemental pressure-thrust numerical sanity | PASS | bounded non-authority oracle |
| Runtime axis/thrust/stress-intensity self-test | PASS | software contract only |
| C evidence anti-mutation self-test | PASS | software contract |
| C generated-evidence exact-drift check | PASS | retained byte observation |
| C runtime qualification-state check | PASS | correctly remains BLOCKED |
| Public EMP.1 projection check | PASS | six blockers exposed truthfully |
| A→B custody checks | PASS | parent production contract preserved |
| Focused EMP.1 Chromium journeys | PASS | all five pre-B02 Playwright runs completed |
| B01/B02 production gate | FAIL_EXTERNAL_B02D | `T3/L1: BLOCK != PASS` |
| WRC engineering validation | BLOCKED / NOT_RUN | source qualification required |
| CAUx pp.24–31 hand calculation | BLOCKED / NOT_RUN | benchmark extraction/independent calc required |
| merge | NOT_AUTHORIZED | owner authority required |

The Stage-17 first-failure diagnostic recorded phase `B01_B02_GATE`; because the runner reaches that phase only after all EMP.1 Node prerequisites and all five focused EMP.1 Playwright invocations succeed, the EMP.1 qualification result above is not inferred from partial execution.

## Changed-file boundary

PR1269 changes only EMP.1 qualification/evidence/test/handover files plus the Stage-17 runner registration/diagnostic. It does not modify B02D or FEM production files.

Key production qualification files:

- `src/core/emp1/emp1-c-qualification-state.js`
- `src/core/emp1/emp1-c-qualification-evidence.generated.js`

Key qualification files:

- `scripts/emp1-wrc-dataset-readiness-lib.mjs`
- `scripts/emp1-wrc-dataset-readiness-check.mjs`
- `scripts/emp1-wrc-dataset-readiness-self-test.mjs`
- `scripts/emp1-c-runtime-contract-lib.mjs`
- `scripts/emp1-c-runtime-contract-self-test.mjs`
- `scripts/emp1-c-qualification-evidence-lib.mjs`
- `scripts/emp1-c-qualification-evidence-self-test.mjs`
- `scripts/emp1-c-qualification-evidence-check.mjs`
- `scripts/emp1-c-qualification-state-check.mjs`
- `scripts/emp1-public-product-check.mjs`
- `scripts/lafea-stage17-browser-run.mjs`
- `validation/emp1/wrc537-2013/existing-dataset-audit-v1.json`

## Explicit NOT_RUN / BLOCKED

- WRC raw PDF SHA-256 freeze: `NOT_RUN / BLOCKED`
- CAUx raw PDF SHA-256 freeze: `NOT_RUN / BLOCKED`
- source-qualified 1200 a-j scalar transcription: `NOT_RUN`
- WRC sign/equation primary-source arbitration: `NOT_RUN`
- source-qualified LAFEA→WRC axis mapping: `NOT_RUN`
- pressure-thrust production-policy qualification: `NOT_RUN`
- source-qualified stress-intensity definition: `NOT_RUN`
- CAUx pp.24–31 extraction/freeze and independent hand calculation: `NOT_RUN`
- WRC local-stress production evaluator: `NOT_RUN / NOT_AUTHORIZED`
- EMP.1.C production route registration: `false`
- release qualification: `false`
- B02D repair: `OUT_OF_SCOPE`

## Appendix A — takeover qualification

| Question | Score | Boundary |
|---|---:|---|
| A1 Production trace | 20/20 | Retained bytes -> audit -> generated evidence -> runtime C state -> public blocker; A/B custody remains separate. |
| A2 Failure/UX isolation | 19/20 | One public EMP.1 remains; this PR changes qualification truth, not stage identity. |
| A3 Authority/invariant | 17/20 | Source identities/pins protected; raw SHA remains unresolved, therefore method authority remains blocked. |
| A4 Independent validation design | 19/20 | Production-contamination guards and supplemental-vs-CAUx separation retained; actual CAUx handcalc remains NOT_RUN. |
| A5 Minimal repair | 20/20 | Critical defects converted to fail-closed contracts without unauthorized WRC mechanics. |
| **Total** | **95/100** | Score does not grant WRC engineering authority. |

## Next qualified step

Do **not** code the EMP.1.C production evaluator yet. The next engineering-authority increment must obtain and freeze the raw source SHA-256 values, verify exact WRC equations/signs/runtime mapping against the pinned WRC PDF, transcribe/qualify the complete a-j dataset, qualify pressure-thrust/stress-intensity runtime contracts, and independently reproduce CAUx 2017 pp.24–31 before any execution-route registration.

`FALSIFIER`: if the pinned WRC PDF contradicts the retained coefficient symbols, curve inventory, interpolation semantics, or proposed runtime-contract structure, the PDF wins and the implementation contract must be redesigned rather than tuned to preserve current behavior.
