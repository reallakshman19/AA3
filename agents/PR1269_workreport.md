# PR1269 work report — EMP.1 critical WRC numerical/runtime qualification

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `TAKEOVER_AUTHORITY: QUALIFIED_FOR_FAIL_CLOSED_GUARD_MUTATION_ONLY`
- `ISSUE: #1261`
- `PR: #1269`
- `BRANCH: agent/emp1-wrc-numerical-contract-issue1261`
- `PARENT_PR: #1266`
- `PARENT_HEAD_AT_CUT: c4ecc9ec48cb87937d65599449dee55b86513f3a`
- `MAIN_HEAD_AT_GROUNDING: cf3aaeefb028ee387d3d530f5e0e5106bd489dce`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `EMP1_C_ENGINEERING_AUTHORITY: BLOCKED`
- `RELEASE_QUALIFIED: false`
- `CURRENT_STAGE: CRITICAL_GUARDS_IMPLEMENTED_EXACT_HEAD_VALIDATION_PENDING`
- `EXACT_NEXT_ACTION: inspect latest exact-head Stage-17 run; RCA only changed EMP.1 paths, preserve inherited B02D boundary`

## Mission

Implement the confirmed **critical** EMP.1 qualification fixes without fabricating WRC authority. This PR now covers the fail-open numerical contract, dimensional contradictions, source/runtime load mapping custody, pressure-thrust double-count custody, and stress-intensity output semantics.

It deliberately does **not** populate WRC coefficients, choose WRC signs, infer the LAFEA→WRC permutation, infer pressure-thrust direction, invent a stress-intensity formula, freeze CAUx expected values, register an EMP.1.C evaluator, alter FEM, or grant engineering/code/release authority.

## Ground truth and authority

- #1269 stacks on draft #1266; #1266 A/B production repairs remain untouched.
- WRC and CAUx source ledgers still have `rawPdfSha256: null`; both source qualifications remain BLOCKED.
- Retained WRC extraction is qualification input only, pinned to `Advanced_Analysis@67317dc9...` by immutable repo/commit/blob/byte-count contract.
- WRC METHOD_SOURCE, CAUx BENCHMARK_SOURCE, independent-derived evidence, and production result remain separate authority classes.
- Supplemental Hexagon pressure-thrust evidence is sanity-check only and cannot satisfy CAUx A4 or WRC method authority.

## Critical findings implemented

### CF-01 — coefficient inventory fail-open

Retained method representation is a ninth-order polynomial:

```text
Y(U) = a + bU + cU² + ... + jU⁹
```

Therefore:

```text
20 SP/SM charts × 6 response curves/chart = 120 response curves
120 curves × 10 named coefficients {a..j} = 1200 scalar coefficients
```

Previous readiness could treat 120 `coefficient_value` cells as complete. New contract requires all 1200 named scalar slots. Current retained payload is truthfully:

```text
curveRows = 120
coefficientSchema = LEGACY_SINGLE_VALUE_PER_CURVE / BLOCKED
requiredScalarCoefficientCount = 1200
numericScalarCoefficientCount = 0
missingScalarCoefficientCount = 1200
```

### CF-02 — runtime U custody

`U` is the polynomial independent variable, not a fixed third row ordinate. Legacy `parameter_3_name=U / parameter_3_value=...` cannot qualify. A future source-qualified payload must explicitly declare runtime `U` custody.

### CF-03 — radial membrane dimensional contradiction

Retained coefficient symbol:

```text
Y = Nx*T/P
```

With retained general shell stress `sigma_m = Nx/T`, dimensional algebra gives:

```text
Nx = Y*P/T
sigma_m = Y*P/T²
```

The retained machine equation uses `Y*P/T`, one factor of `T` short. This is now a hard blocker:

`SP_RADIAL_MEMBRANE_STRESS_DIMENSION_MISMATCH`.

The code does not silently replace the source equation; the pinned WRC PDF must arbitrate it.

### CF-04 — moment membrane dimensional contradiction

Retained coefficient symbol:

```text
Y = Nx*T*sqrt(Rm*T)/M
```

Therefore:

```text
sigma_m = Y*M/(T²*sqrt(Rm*T))
```

The retained machine equation uses only one `T` outside the square-root. This is now a hard blocker:

`SM_MOMENT_MEMBRANE_STRESS_DIMENSION_MISMATCH`.

### CF-05 — retained stress-intensity equation is dimensionally invalid

Retained machine transcription includes an outer square-root of a first-degree stress expression. Its output dimension is `sqrt(stress)`, not stress. Example sanity state `sigx=100`, `sigy=50`, `tau=0` yields the retained outer-root branch `10 sqrt(stress units)` instead of a stress-valued principal quantity.

The retained equation now produces:

`STRESS_INTENSITY_OUTPUT_DIMENSION_MISMATCH`.

No replacement Tresca/von-Mises formula is promoted as WRC authority.

### CF-06 — LAFEA→WRC axis mapping cannot be inferred

Existing production LAFEA local frame is explicitly:

```text
eX = pipe axial
eZ = projected radial hint
eY = eZ × eX
```

Existing section-screening mechanics use:

```text
Fx/A = axial membrane
Mx*r/J = torsion
```

The retained WRC mapping is unresolved/tentative. A future evaluator can no longer become authorized by hard-coding a field permutation. A separate source-bound runtime qualification must provide:

- mapping contract hash;
- canonical-frame contract hash;
- exact source locator;
- source-qualified WRC raw-PDF SHA binding.

### CF-07 — pressure thrust / double-count custody

Supplemental independent sanity case proves the magnitude risk:

```text
pressure = 275 psi
nozzle ID = 12 in
A = pi*12²/4 = 113.0973355 in²
F_thrust = 31,101.7673 lbf
restraint axial force = -26 lbf
P_WRC = -26 - 31,101.7673 = -31,127.7673 lbf -> -31,128 lbf displayed
```

The thrust term is about `1196×` the 26-lbf restraint magnitude. Omitting or double-counting it is therefore catastrophic in this case.

Future runtime qualification must select exactly one explicit governed mode:

- `SOURCE_LOAD_ALREADY_INCLUDES_THRUST`
- `ADD_PRESSURE_THRUST_FROM_NOZZLE_ID`
- `NOT_APPLICABLE_BY_QUALIFIED_METHOD`

and must include an independent check plus `doubleCountGuardQualified=true`. No thrust sign/direction is inferred by this PR.

### CF-08 — stress-intensity source semantics must be explicit

Even after the retained dimensional defect is resolved, method authority requires a source-bound stress-intensity definition contract, source locator, output dimension `STRESS`, independent-check PASS, and qualification-record hash.

## Anti-mutation / authority hardening

- Retained extraction manifest is immutable in code by repository, commit, blob SHA-1, and byte count.
- C evidence re-reads and hashes retained files and recomputes readiness from those bytes.
- A hand-edited frozen audit cannot move runtime qualification: observed/frozen drift throws.
- Runtime-contract evidence cannot be based on production observation.
- Method authorization must bind the runtime-contract qualification hash as well as WRC source SHA and CAUx benchmark hash.
- EMP.1.C production route remains unregistered.

## Current public C blockers

The retained state intentionally exposes six blockers:

```text
WRC_DATASET_NOT_READY
WRC_DIMENSIONAL_CONTRACT_UNRESOLVED
WRC_RUNTIME_CONTRACTS_UNRESOLVED
WRC_NUMERICAL_COEFFICIENTS_MISSING
WRC_SIGN_ARBITRATION_OPEN
CAUX_PP24_31_NOT_FROZEN
```

Current dimensional violations are exactly three:

```text
SP_RADIAL_MEMBRANE_STRESS_DIMENSION_MISMATCH
SM_MOMENT_MEMBRANE_STRESS_DIMENSION_MISMATCH
STRESS_INTENSITY_OUTPUT_DIMENSION_MISMATCH
```

Current runtime-contract qualification is `NOT_RUN/BLOCKED` for load-axis mapping, pressure thrust, and stress intensity.

## Changed-file ledger

Production qualification state:

- `src/core/emp1/emp1-c-qualification-state.js`
- `src/core/emp1/emp1-c-qualification-evidence.generated.js`

Qualification/evidence:

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

Handover:

- `agents/PR1269_workreport.md`
- `agents/status/PR1269.yaml`
- `agents/claims/PR1269.yaml`
- legacy WIP status is marked superseded by PR1269.

## Validation ledger

| Check | State | Oracle |
|---|---|---|
| WRC coefficient/U/dimensional self-test | PENDING_LATEST_EXACT_HEAD | synthetic software contract |
| runtime axis/thrust/stress-intensity self-test | PENDING_LATEST_EXACT_HEAD | synthetic software contract |
| retained WRC observed-vs-frozen audit | PENDING_LATEST_EXACT_HEAD; expected BLOCKED | retained bytes + immutable pin |
| C evidence derivation/anti-mutation self-test | PENDING_LATEST_EXACT_HEAD | software contract |
| generated evidence exact-drift check | PENDING_LATEST_EXACT_HEAD | deterministic retained artifacts |
| C runtime state check | PENDING_LATEST_EXACT_HEAD; expected BLOCKED | retained evidence |
| public EMP.1 projection check | PENDING_LATEST_EXACT_HEAD | production projection |
| Chromium EMP.1 browser journey | PENDING_LATEST_EXACT_HEAD | production browser |
| WRC engineering validation | BLOCKED / NOT_RUN | primary source required |
| CAUx pp24–31 qualification | BLOCKED / NOT_RUN | benchmark source + independent handcalc required |
| downstream B02D | inherited external blocker | unchanged FEM boundary |
| merge | NOT_AUTHORIZED | owner authority required |

## Explicit NOT_RUN / BLOCKED

- WRC raw PDF SHA-256 freeze: NOT_RUN / retained ledger unresolved
- CAUx raw PDF SHA-256 freeze: NOT_RUN / retained ledger unresolved
- source-qualified 1200 a-j scalar transcription: NOT_RUN
- WRC sign/equation source arbitration: NOT_RUN
- source-qualified LAFEA→WRC axis mapping: NOT_RUN
- pressure-thrust production policy qualification: NOT_RUN
- source-qualified stress-intensity definition: NOT_RUN
- CAUx pp24–31 source extraction/freeze + independent handcalc: NOT_RUN
- WRC local-stress production evaluator: NOT_RUN / NOT_AUTHORIZED
- EMP.1.C route registration: false
- release qualification: false
- B02D repair: out of scope

## Appendix A — bounded takeover qualification

| Question | Score | Boundary |
|---|---:|---|
| A1 Production trace | 20/20 | Retained bytes -> audit -> generated evidence -> runtime C state -> public blocker; A/B custody stays separate. |
| A2 Failure/UX isolation | 19/20 | One public EMP.1 already exists; this PR changes qualification truth, not stage identity. |
| A3 Authority/invariant | 17/20 | Source identities/pins preserved; raw SHA remains unresolved, so method authority remains blocked. |
| A4 Independent validation design | 19/20 | Production contamination guards and supplemental-vs-CAUx separation retained; actual CAUx handcalc remains NOT_RUN. |
| A5 Minimal repair | 20/20 | Critical defects are converted to fail-closed contracts without implementing unauthorized WRC mechanics. |
| **Total** | **95/100** | No score grants WRC engineering authority. |

## Decisions / falsifiers

- `DEC-WRC-001`: 120 rows are response curves; 1200 named a-j scalar coefficients are required.
- `DEC-WRC-002`: runtime `U` cannot be represented as a fixed chart row ordinate.
- `DEC-WRC-003`: dimensional contradictions are blockers, not inferred source corrections.
- `DEC-WRC-004`: load-axis mapping requires explicit source-bound transformation custody.
- `DEC-WRC-005`: pressure thrust requires an explicit inclusion mode and double-count guard.
- `DEC-WRC-006`: stress intensity must be source-qualified as a stress-valued output.
- `DEC-WRC-007`: retained audit/manifest cannot be edited together to move the frozen authority baseline.
- `FALSIFIER`: if the exact pinned WRC PDF contradicts the retained coefficient symbols, curve inventory, interpolation semantics, or assumed runtime contract structure, the PDF wins and this contract must be redesigned rather than adjusted to preserve current implementation.
