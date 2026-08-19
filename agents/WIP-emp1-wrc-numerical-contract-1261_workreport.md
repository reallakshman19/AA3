# WIP work report — EMP.1 WRC numerical-contract qualification

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE_WIP`
- `TAKEOVER_AUTHORITY: QUALIFIED_FOR_FAIL_CLOSED_GUARD_MUTATION_ONLY`
- `ISSUE: #1261`
- `BRANCH: agent/emp1-wrc-numerical-contract-issue1261`
- `PARENT_PR: #1266`
- `PARENT_HEAD_AT_CUT: c4ecc9ec48cb87937d65599449dee55b86513f3a`
- `MAIN_HEAD_AT_GROUNDING: cf3aaeefb028ee387d3d530f5e0e5106bd489dce`
- `GROUNDING_EPOCH: GE-001`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `EMP1_C_ENGINEERING_AUTHORITY: BLOCKED`
- `RELEASE_QUALIFIED: false`
- `EXACT_NEXT_ACTION: replace the 120-row coefficient readiness shortcut with a curve-vs-scalar a-j qualification contract; keep EMP.1.C fail-closed`

## Mission

Correct the numerical qualification contract that currently treats one CSV row as one WRC numerical coefficient. This increment does **not** extract WRC values, implement WRC mechanics, resolve signs, freeze the CAUx benchmark, register an EMP.1.C execution route, or change FEM behavior.

The retained WRC method package states that the SP/SM response uses a ninth-order polynomial with ten named scalar coefficients `a` through `j` per response curve. The retained numerical CSV has 120 response-curve rows and a single `coefficient_value` field per row. Therefore `120/120 numeric rows` is not sufficient evidence of a complete a-j payload.

## Ground truth — GE-001

### Repository / branch state

- repository: `reallaksh19/Advanced_Analysis`
- live `main`: `cf3aaeefb028ee387d3d530f5e0e5106bd489dce`
- open parent qualification PR: `#1264`, head `2e26413b0950a80ecb78423f3972fac9c8dc8e6d`
- merged stack increment: `#1265` merged into the #1264 branch
- immediate parent repair PR: `#1266`, draft/open, head `c4ecc9ec48cb87937d65599449dee55b86513f3a`
- #1266 reviews: none
- #1266 unresolved review threads: none
- `agents/MASTER_INDEX.md`: not present on the parent branch; absence recorded, not inferred as an empty coordination set

### Parent exact-head validation

Observed GitHub Actions run for `c4ecc9ec...`:

- checkout/head cleanliness: PASS
- static/build prerequisites: PASS
- EMP.1.C evidence/state checks: PASS while C remains BLOCKED
- EMP.1.A deterministic + browser checks: PASS
- EMP.1.B refresh/currentness deterministic + browser checks: PASS
- grouped empirical edit browser journey: PASS
- full Stage-17: FAIL later at inherited LAFEA.3 B02D `T3/L1`, expected PASS / observed BLOCK

The B02D boundary is unchanged by #1266 and is outside this successor scope.

## Coordination classification

`COORDINATION_REQUIRED_STACKED_DEPENDENCY`.

- #1264 owns the present qualification gate and currently claims that 119/120 cannot pass while 120/120 can satisfy coefficient coverage.
- #1266 owns A/B presenter and canonical refresh repairs and explicitly preserves WRC/CAUx authority unchanged.
- This WIP intentionally stacks on #1266 and supersedes only the **numerical coefficient completeness assertion** in the successor branch.
- Do not modify #1264/#1266 branches in place.
- Do not touch LAFEA.3+ FEM, B02D policy/input/oracle, or `.github/workflows/**`.

## Appendix A — bounded takeover qualification

This score authorizes only a **stricter fail-closed qualification guard**. It does not authorize EMP.1.C numerical mechanics or engineering use.

| Question | Score | Evidence / boundary |
|---|---:|---|
| A1 Production trace | 20/20 | C readiness is derived from retained WRC audit -> C qualification evidence -> runtime qualification state -> public product blocker. A/B parent hashes/currentness remain separate. |
| A2 Failure / UX isolation | 19/20 | Current public EMP.1 product is already consolidated; the successor does not rename or change UI routing. A naïve stage rename would break retained backing-stage, descriptor/edit-command, and refresh contracts. |
| A3 Authority / invariant | 17/20 | METHOD_SOURCE and BENCHMARK_SOURCE are separately pinned by repository/commit/path/Git blob/byte count. Raw PDF SHA-256 remains unresolved, therefore source custody and EMP.1.C remain BLOCKED. This guard increment consumes no WRC numerical value and cannot clear that gate. Full C mechanics remain not authorized until exact raw SHA-256/page arbitration is retained. |
| A4 Independent validation | 19/20 | Expected-value freeze order and source/handcalc/production separation are retained. The Hexagon pressure-thrust case remains supplemental only and cannot satisfy CAUx A4. New tests will be synthetic gate tests, not WRC result oracles. |
| A5 Minimal patch | 20/20 | First patch is limited to numerical-readiness parsing/evidence/state and focused self-tests; no source extraction, WRC evaluator, UI redesign, migration, tolerance, or FEM change. |
| **Total** | **95/100** | Minimum per question 17/20. |

### A3 restriction carried forward

The supplied pinned PDF identities are known, but the current source ledgers retain `rawPdfSha256: null` and `qualificationState: BLOCKED`. This is not waived. The bounded authorization above exists because the proposed mutation can only make the gate stricter; it cannot create method authority or any numerical engineering result.

## Numerical defect being corrected

Current readiness logic:

```text
CSV data row -> coefficient_value
120 rows -> coefficientInventoryRows=120
120 numeric coefficient_value cells -> numericalCoefficientsReady=true
```

Required qualification semantics for the retained SP/SM polynomial representation:

```text
response curve record
  -> exact coefficient set {a,b,c,d,e,f,g,h,i,j}

20 charts x 6 response curves/chart = 120 response curves
120 curves x 10 scalar coefficients/curve = 1200 required scalar coefficients
```

`U` is the runtime polynomial independent variable in the retained equation form. It must not be counted as a third fixed chart ordinate whose unresolved row value can be cleared by supplying an arbitrary number.

## Planned minimal change

1. `scripts/emp1-wrc-dataset-readiness-lib.mjs`
   - distinguish response-curve rows from scalar a-j coefficient slots;
   - support an explicit a-j wide payload contract;
   - report schema completeness, required/numeric/unresolved scalar counts, and independent-variable custody;
   - block the retained legacy single-value-per-curve CSV.
2. `scripts/emp1-wrc-dataset-readiness-self-test.mjs`
   - prove one numeric value/curve cannot pass;
   - prove 9/10 coefficients cannot pass;
   - prove complete a-j rows can satisfy the coefficient-shape gate in synthetic data only.
3. `scripts/emp1-c-qualification-evidence-lib.mjs`
   - propagate curve count and scalar a-j coverage rather than aliasing CSV row count as coefficient count.
4. `src/core/emp1/emp1-c-qualification-state.js`
   - require coefficient schema + a-j completeness + independent-variable representation before coefficient readiness.
5. generated/retained qualification evidence and focused state self-test
   - update only derived guard evidence; current engineering state must remain BLOCKED.

## Explicit NOT_RUN / BLOCKED

- raw WRC PDF SHA-256: unresolved in retained ledger
- raw CAUx PDF SHA-256: unresolved in retained ledger
- exact CAUx pp.24-31 extraction/freeze: NOT_RUN / BLOCKED
- WRC sign arbitration: BLOCKED
- WRC a-j source transcription: NOT_RUN
- WRC source equation correction: NOT_RUN; no inferred formula is promoted
- EMP.1.C production evaluator: NOT_RUN / NOT_AUTHORIZED
- EMP.1.C route registration: false
- code/release authority: false
- B02D RCA: outside scope
- merge: NOT_AUTHORIZED

## Risks / decisions

- `DEC-WRC-001`: Treat the existing 120 CSV rows as response-curve records, not a complete scalar coefficient payload.
- `DEC-WRC-002`: Require ten named coefficients a-j for each curve before scalar coefficient completeness can pass.
- `DEC-WRC-003`: Do not repair WRC equations from dimensional inference in this increment; retain the mismatch as a source-arbitration blocker.
- `DEC-WRC-004`: Do not treat `U` as a fixed chart-coordinate value; qualification must carry an explicit runtime-independent-variable contract.
- `RISK-WRC-001`: The exact primary PDF may prove that the retained chart inventory/labels require a different schema. If so, abandon this schema extension and redesign from the pinned source rather than forcing the source into the software model.
