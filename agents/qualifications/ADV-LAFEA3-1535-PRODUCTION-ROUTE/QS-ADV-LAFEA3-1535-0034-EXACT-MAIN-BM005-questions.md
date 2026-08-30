# LAFEA.3 takeover qualification — exact-main BM-005 execution boundary

QUESTION_SET_ID: QS-ADV-LAFEA3-1535-0034-EXACT-MAIN-BM005
CHAIN_ID: ADV-LAFEA3-1535-PRODUCTION-ROUTE
WORK_ITEM: github:reallaksh19/Advanced_Analysis#1535
SUBORDINATE_VV_WORK_ITEM: github:reallaksh19/Advanced_Analysis#1569
QUALIFICATION_SCOPE_ID: QSCOPE-ADV-LAFEA3-1535-EXACT-MAIN-BM005
QUESTION_SET_STATUS: CURRENT
BASIS_HEAD: 26f732ba8142828dc6c6160e4355993a60aa186a
BASIS_WORKFLOW_RUN: 33325078376
BASIS_ATTEMPT_1_JOB: 99293663739
BASIS_RETRY_JOB: 99293821163

Score target: total >= 92/100 and each question >= 17/20. A correct number without the engineering reasoning and authority trace does not qualify.

## Q1 — Exact-main production trace and NOT_RUN classification — 20

Against exact main `26f732ba8142828dc6c6160e4355993a60aa186a`, trace the full intended execution route from the `push` event in `.github/workflows/lafea3-bm005-qualification.yml` through:

1. exact-head `actions/checkout@v4`;
2. clean-tree/head guards;
3. Node syntax checks;
4. `scripts/lafea.3-bm005-ordinary-route-check.mjs`;
5. frozen `BM-005-LAME-CONT-CYL-01` definition and source registry;
6. ordinary geometry intake -> mapped-transfinite Q8 mesh -> preflight -> continuum solve/recovery -> fixed physical probe -> four-level convergence workbench;
7. `createBm005AuditReport()` and artifact persistence.

Then use run `33325078376`, attempt-1 job `99293663739`, retry job `99293821163`, `steps=[]/null`, zero artifacts and unavailable job log (`BlobNotFound`) to identify the **first unexecuted boundary** and justify exactly why the state is `BM-005 NOT_RUN_EXECUTION_BLOCKED`, not `FAIL` and not `PASS`.

Fail conditions: treating scheduler recognition as checkout evidence; claiming any solver/mesh/probe/report code executed; treating CI conclusion `failure` as a numerical benchmark failure.

## Q2 — Four-level Richardson/GCI and asymptotic-range proof by hand — 20

Use the controlled four-level sequence with refinement ratio `r=2`:

```text
f1 = 1.2500 mm
f2 = 1.2850 mm
f3 = 1.2920 mm
f4 = 1.2934 mm
Fs = 1.25
nearZeroAbsolute = 1e-12
orderStabilityRelativeTolerance = 0.20
```

By hand:

1. compute `d21=f2-f1`, `d32=f3-f2`, `d43=f4-f3`;
2. compute both overlapping observed orders `p123` and `p234`;
3. evaluate the frozen order-stability criterion and classify whether the four levels are asymptotic;
4. compute the fine-grid Richardson extrapolation from `f3,f4`;
5. compute fine absolute GCI and GCI percent;
6. state what must happen if either difference changes sign, a denominator is near zero, the two `p` values are unstable, mesh hashes repeat, execution hashes repeat, or the physical-probe identity changes.

Expected arithmetic if correctly derived: both orders are approximately `2.321928094887...`, final Richardson estimate `1.29375 mm`, fine absolute GCI `0.0004375 mm`, fine GCI about `0.033825576%`.

Fail conditions: using one observed order as sufficient proof of asymptotic range; accepting monotonicity alone; silently dropping a level or changing the frozen tolerance.

## Q3 — Independent Lamé oracle, pressure sign and negative control — 20

For the frozen plane-stress thick-cylinder case:

```text
Ri = 50 mm
Ro = 100 mm
Pi = 10 MPa
Po = 0
E = 200000 MPa
nu = 0.3
probe r = 73 mm, theta = 37 deg
```

Starting from the Lamé tension-positive form

```text
sigma_r = A - B/r^2
sigma_theta = A + B/r^2
```

independently derive `A`, `B`, `sigma_r(73)`, `sigma_theta(73)` and the plane-stress radial displacement magnitude

```text
u(r) = ((1-nu) A r + (1+nu) B/r) / E.
```

Verify the frozen values and units:

- `A = 3.3333333333333335 MPa`
- `B = 33333.333333333336 MPa*mm^2`
- `sigma_r(73) = -2.921748920998312 MPa`
- `sigma_theta(73) = 9.58841558766498 MPa`
- `u(73) = 0.003819703196347032 mm`

Then explain the inner-pressure normal/sign convention on the quarter-annulus and why removing the Y-axis `UX` symmetry restraint leaves a rigid translation that must fail closed as an under-constrained/singular system.

Fail conditions: using production FE output as the oracle; reversing the physical pressure direction; accepting the deficient negative control as publishable.

## Q4 — Report custody, semantic/evidence hashes and exact-head invalidation — 20

Explain and reconstruct the authority boundary among:

- frozen benchmark/source registry;
- convergence policy;
- numerical solver/recovery/probe outputs;
- `createBm005AuditReport()`;
- `semanticHash`;
- `evidenceHash`;
- CI/workflow transport;
- `benchmarkQualified`, `resultPublicationQualified`, `coreFeaCompletionProven`, and `releaseQualified`.

Show why `semanticHash` binds engineering meaning while `evidenceHash` additionally binds the actual candidate HEAD and observed qualification/diagnostic evidence. Explain why a relay-only or unrelated integrated-main HEAD change invalidates an old exact-head PASS receipt even if the Lamé engineering result is numerically unchanged.

State the required PASS evidence fields, including distinct mesh/execution hashes, observed orders, Richardson, fine GCI, pointwise eligibility, oracle coverage by GCI, accepted solver/equilibrium diagnostics, expected negative-control rejection, `cleanTree=true`, and exact `candidateHeadSha`.

Falsifier: a green CI status with report `status=FAIL` or `releaseQualified=false` must not be promoted by the workflow or UI.

## Q5 — First-wrong-boundary isolation, minimal patch and BM-006 gate — 20

Given the current exact-main evidence, state the present **NO-PATCH** boundary and the smallest legitimate next action. Then define the decision tree for a future executable run:

1. failure before checkout/step 1;
2. checkout/head/clean-tree guard failure;
3. schema/frozen-definition rejection before report construction;
4. mesh/preflight/solver/recovery/probe failure;
5. completed report with convergence/oracle/negative-control qualification failure;
6. report `status=PASS`.

For each case, identify the minimum evidence required before any code change and which protected domains must remain untouched unless independently falsified. Explicitly prohibit weakening the oracle, mesh ladder, probe, tolerances, convergence policy or fail-closed negative control to obtain PASS.

Finally, state the BM-006 gate: only after exact-head BM-005 PASS may the same frozen case be replayed in a real browser through the engineer-visible Run -> Convergence -> Results flow, with source/probe/result identities reconciled to the retained BM-005 report. Explain why BM-005 PASS alone still does not set `RELEASE_QUALIFIED=true` or prove the entire LAFEA programme complete.

Fail conditions: patching solver/mesher/report semantics while the first wrong boundary is hosted runner allocation; skipping exact-head evidence; treating BM-006 static source inspection as browser replay; claiming production/release authority from benchmark success alone.
