# PR1269 work report — EMP.1 WRC numerical-contract qualification

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
- `GROUNDING_EPOCH: GE-001`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `EMP1_C_ENGINEERING_AUTHORITY: BLOCKED`
- `RELEASE_QUALIFIED: false`
- `CURRENT_STAGE: EXACT_HEAD_VALIDATION_PENDING`
- `EXACT_NEXT_ACTION: execute/inspect exact-head PR workflow; RCA any failure in changed WRC qualification paths before expanding scope`

## Mission

Correct the fail-open numerical qualification contract that aliased 120 retained WRC response-curve rows to 120 complete numerical coefficients.

This PR is intentionally **qualification-contract only**. It does not populate WRC coefficients, implement WRC mechanics, resolve WRC signs/equations, freeze CAUx expected values, register an EMP.1.C execution route, alter FEM, or grant engineering/code/release authority.

## Ground truth — GE-001

- live `main`: `cf3aaeefb028ee387d3d530f5e0e5106bd489dce`
- #1264: draft/open C qualification parent, head `2e26413b0950a80ecb78423f3972fac9c8dc8e6d`
- #1265: merged into #1264 stack
- #1266: draft/open immediate parent, head at branch cut `c4ecc9ec48cb87937d65599449dee55b86513f3a`
- #1266 reviews: none
- #1266 unresolved review threads: none
- `agents/MASTER_INDEX.md`: absent on the parent branch; absence recorded explicitly

Parent exact-head CI passed all EMP.1 A/B/C software and browser checks and then failed later at unchanged LAFEA.3 B02D `T3/L1` mesh qualification. This PR does not touch that boundary.

## Coordination

Classification: `COORDINATION_REQUIRED_STACKED_DEPENDENCY`.

- #1264 owns the previous C gate and its `120/120` numerical-completeness assertion.
- #1266 owns A/B presenter/canonical refresh repairs and explicitly preserves WRC/CAUx authority.
- #1269 stacks on #1266 and supersedes only the numerical coefficient completeness contract in its own branch.

## Appendix A — bounded takeover qualification

This score authorizes only stricter fail-closed guard mutation. It is **not** a claim that WRC/CAUx engineering qualification is complete.

| Question | Score | Evidence / boundary |
|---|---:|---|
| A1 Production trace | 20/20 | Retained WRC audit -> generated C qualification evidence -> runtime C state -> public blocker traced; A/B parent currentness boundaries remain separate. |
| A2 Failure / UX isolation | 19/20 | Public EMP.1 consolidation already exists; no UI/stage rename in this PR. |
| A3 Authority / invariant | 17/20 | METHOD_SOURCE/BENCHMARK_SOURCE identities are pinned by repo/commit/path/blob/size. Raw PDF SHA-256 remains unresolved; therefore source custody and C authority remain BLOCKED. No source numerical value is consumed by this guard repair. |
| A4 Independent validation | 19/20 | Expected-value freeze separation retained; synthetic tests are software-contract tests only. Hexagon pressure-thrust evidence remains supplemental and cannot satisfy CAUx A4. |
| A5 Minimal patch | 20/20 | Changes limited to numerical-readiness parsing/evidence/state + focused self-tests/derived evidence; no mechanics/UI/FEM/tolerance/source-value mutation. |
| **Total** | **95/100** | Minimum per question 17/20. |

### Authority restriction

The WRC and CAUx source ledgers still retain `rawPdfSha256: null` and blocked source qualification. This PR cannot clear source custody, sign arbitration, CAUx benchmark, method authorization, or route registration.

## Confirmed numerical qualification defect

Previous contract:

```text
120 numerical CSV rows
  -> coefficientInventoryRows = 120
  -> 120 numeric coefficient_value cells could satisfy coefficient readiness
```

Retained polynomial representation:

```text
Y(U) = a + bU + cU^2 + ... + jU^9
10 named scalar coefficients per response curve
20 SP/SM charts x 6 response curves/chart = 120 response curves
120 x 10 = 1200 named scalar coefficient slots
```

`U` is carried as the runtime polynomial independent variable in the corrected qualification contract, not as an arbitrary third fixed chart ordinate.

## Implementation checkpoint

### `scripts/emp1-wrc-dataset-readiness-lib.mjs`

- exports required coefficient names `a..j` and runtime independent variable `U`;
- distinguishes response-curve rows from named scalar coefficients;
- recognizes only explicit wide a-j payload as coefficient-schema qualified;
- classifies retained single `coefficient_value` shape as `LEGACY_SINGLE_VALUE_PER_CURVE`;
- reports curve count, coefficients/curve, required/numeric/unresolved/missing/invalid scalar counts;
- reports independent-variable representation and qualification;
- adds fail-closed blockers for malformed coefficient schema, incomplete named scalar set, and invalid independent-variable custody.

### `scripts/emp1-wrc-dataset-readiness-self-test.mjs`

Synthetic software-contract cases prove:

- one anonymous numeric value per curve cannot pass;
- 9/10 named a-j slots cannot pass;
- unresolved named coefficient remains blocked;
- complete ten-name + runtime-U shape can satisfy only the synthetic shape gate.

### `validation/emp1/wrc537-2013/existing-dataset-audit-v1.json`

Frozen current retained-package expectation now states:

```text
curveRows = 120
coefficientSchema = LEGACY_SINGLE_VALUE_PER_CURVE / BLOCKED
coefficientsPerCurve = 10
requiredScalarCoefficientCount = 1200
numericScalarCoefficientCount = 0
missingScalarCoefficientCount = 1200
independentVariable = U
independentVariableRepresentation = LEGACY_PARAMETER_3_ROW_ORDINATE / BLOCKED
```

No WRC coefficient value is added.

### `scripts/emp1-c-qualification-evidence-lib.mjs`

- propagates curve/scalar/schema/U evidence;
- validates `required = curveRows x 10`;
- validates scalar accounting `required = numeric + unresolved + missing + invalid`;
- refuses malformed retained audit metrics.

### `src/core/emp1/emp1-c-qualification-state.js`

Coefficient readiness now requires simultaneously:

```text
curveRows > 0
coefficient schema qualified
coefficientsPerCurve = 10
requiredScalar = curveRows x 10
numericScalar = requiredScalar
unresolved = 0
missing = 0
invalid = 0
independentVariable = U
independentVariableQualified = true
```

Current public/runtime C state remains BLOCKED.

### Focused C tests

- synthetic `1199/1200` remains blocked;
- 120 anonymous per-curve values remain blocked;
- legacy row-ordinate U remains blocked;
- complete synthetic a-j/U data can only progress to the already-existing method/route gates.

## Changed-file ledger — current

Production qualification state:

- `src/core/emp1/emp1-c-qualification-state.js`
- `src/core/emp1/emp1-c-qualification-evidence.generated.js`

Qualification/evidence:

- `scripts/emp1-wrc-dataset-readiness-lib.mjs`
- `scripts/emp1-wrc-dataset-readiness-self-test.mjs`
- `scripts/emp1-c-qualification-evidence-lib.mjs`
- `scripts/emp1-c-qualification-evidence-self-test.mjs`
- `scripts/emp1-c-qualification-state-check.mjs`
- `validation/emp1/wrc537-2013/existing-dataset-audit-v1.json`

Handover/coordination:

- `agents/PR1269_workreport.md`
- `agents/status/PR1269.yaml` (to be created at migration checkpoint)
- `agents/claims/PR1269.yaml` (to be created at migration checkpoint)

## Validation ledger

| Check | State | Oracle classification |
|---|---|---|
| parent exact-head EMP.1 software/browser gates | PASS | production/runtime observation on #1266 parent |
| WRC parser/a-j self-test on #1269 | PENDING_REMOTE_EXECUTION | synthetic software-contract oracle |
| retained WRC readiness check | PENDING_REMOTE_EXECUTION; expected BLOCKED | frozen retained-artifact expectation |
| C evidence self-test | PENDING_REMOTE_EXECUTION | synthetic software-contract oracle |
| C evidence generated drift check | PENDING_REMOTE_EXECUTION | deterministic retained-artifact reconstruction |
| C runtime state check | PENDING_REMOTE_EXECUTION; expected BLOCKED | deterministic retained evidence |
| Chromium EMP.1 regressions | PENDING_REMOTE_EXECUTION | production browser |
| WRC engineering validation | BLOCKED / NOT_RUN | primary source required |
| CAUx pp24-31 qualification | BLOCKED / NOT_RUN | benchmark source + independent handcalc required |
| B02D | inherited external blocker | unchanged LAFEA.3 boundary |
| merge | NOT_AUTHORIZED | owner authority required |

## Explicit NOT_RUN / BLOCKED

- raw WRC PDF SHA-256: unresolved in retained ledger
- raw CAUx PDF SHA-256: unresolved in retained ledger
- source-qualified a-j transcription: NOT_RUN
- source equation/sign correction: NOT_RUN
- CAUx pp24-31 extraction/freeze: NOT_RUN
- WRC local-stress production evaluator: NOT_RUN / NOT_AUTHORIZED
- C route registration: false
- release/code authority: false
- B02D repair: out of scope

## Decisions / risks

- `DEC-WRC-001`: 120 CSV rows are response-curve records, not complete scalar coefficient evidence.
- `DEC-WRC-002`: ten named a-j values are required per curve before coefficient completeness can pass.
- `DEC-WRC-003`: no inferred WRC equation correction is promoted in this increment; primary source must arbitrate dimensional/sign discrepancies.
- `DEC-WRC-004`: runtime `U` receives explicit qualification custody and is not cleared by assigning a numeric third-row parameter.
- `RISK-WRC-001`: if the exact pinned WRC PDF disproves the retained 120-curve/a-j representation, abandon this schema and redesign from the primary source rather than adapting the source to this software contract.
