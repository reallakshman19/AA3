# Issue Current State — #1535 LAFEA.3 ordinary production route / #1569 BM-005 rigor

ISSUE_BASIS_ID: IB-0001
ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0026
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1535
SUBORDINATE_VV_WORK_ITEM: github:reallaksh19/Advanced_Analysis#1569
MAIN_OBSERVED: 541e5ad6078e811c55e1c426f1e8ca7a34356a61
PRIMARY_PR: #1568 DRAFT
STACKED_VV_PR: #1572 DRAFT
PRIMARY_BRANCH: engineering/lafea3-1535-visible-convergence-flow
STACKED_BRANCH: engineering/lafea3-1569-bm005-audit-report
PRIMARY_HEAD: b2406f3ca4ad4015a1dad19f6246fe1ed69d1ebb
PR_STATUS: OPEN_DRAFT_STACK
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE

## Acceptance ledger

| ID | Status | Evidence / disposition |
|---|---|---|
| TASK-001 | PARTIAL | Ordinary geometry/domain intake plus governed mesh/preflight/compiler/convergence plumbing exist; exact-head BM-005 execution is still not demonstrated. |
| TASK-002 | PARTIAL | OUTER/HOLE and curved LINE/CIRCULAR_ARC route checks exist; faithful current-head execution remains unresolved. |
| TASK-003 | PARTIAL | T3/T6/Q8 capability guard and documentation anti-drift exist; integrated exact-head execution remains pending. |
| TASK-004 | PASS | Historical continuum document remains subordinate to live source authority. |
| TASK-005 | PASS_STATIC_SOURCE | Benchmark source matrix plus #1569 BM005 source registry retain Richards Lamé provenance and explicit non-equivalence to MacNeal-Harder Fig.10. |
| TASK-006 | PARTIAL | Static visible workflow composition is repaired around convergence; real engineer/browser replay remains NOT_RUN. |
| TASK-007 | PASS_STATIC_SOURCE | #1569 frozen BM-005 package now defines Q8 quarter-annulus, four-level mesh ladder, fixed r=73/theta=37 displacement probe, current convergence-policy binding, fail-closed negative control and audit report/hash contract. |

## Visible workflow state

SOURCE_REPAIRED:
1. `LafeaWorkbenchController` constructs public `createLafeaWorkbenchStore()`, so convergence/publication custody reaches visible state.
2. Guided workflow exposes `RUN -> CONVERGENCE -> RESULTS_EVIDENCE`.
3. A QUALIFIED solve may remain a completed Run while downstream convergence blocks Results.
4. Results-ready presentation remains bound to lifecycle `resultReady`, not solver status alone.
5. Convergence UI builds the governed displacement physical-probe request without tolerance authority.
6. Non-LAFEA.3 Convergence is NOT_APPLICABLE in primary navigation.

RETAINED_UI_DEBT:
- detailed context still constructs an inert not-applicable Convergence card outside LAFEA.3; browser evidence remains the appropriate gate before low-value composition cleanup.

## Frozen BM-005 package

Case: `BM-005-LAME-CONT-CYL-01` / existing `CONT-CYL-01` family.

```text
Ri=50 mm
Ro=100 mm
Pi=10 MPa
Po=0
E=200000 MPa
nu=0.3
plane stress
Q8 mapped quarter-annulus
h=40/20/10/5 mm
r=2
probe r=73 mm, theta=37 deg
u_expected=0.003819703196347032 mm
```

Primary oracle: K. L. Richards, *Design Engineer's Handbook*, 1st ed., CRC Press, 2012, Ch.6 p.157 Eqs.6.3–6.4 and §6.3 p.158. Repository mapping is tension-positive `sigma_r=A-B/r^2`, `sigma_theta=A+B/r^2`. Production output cannot change oracle, probe, mesh ladder, policy constants or acceptance after observations.

The report contract records exact candidate HEAD, clean tree, source/oracle hashes, geometry/domain/profile/mesh/solver/execution/recovery/probe lineage, per-level mesh counts/quality, observed order, Richardson/GCI, oracle comparison, final solver/equilibrium diagnostics, negative control, limitations/warnings, authority, semanticHash and evidenceHash. A completed non-qualifying study emits `status=FAIL` before non-zero process exit. `releaseQualified` remains false.

## Benchmark / qualification truth

| ID | Status | Evidence / disposition |
|---|---|---|
| BM-001 | PASS_FOCUSED | Prior focused T3/T6/Q8 mechanics/Jacobian evidence. |
| BM-002 | PASS_FOCUSED | Prior Kirsch numerical benchmark with independent analytical oracle custody. |
| BM-003 | NOT_RUN | Integrated Lamé software execution not retained in this chain. |
| BM-004 | PASS_FOCUSED | Prior solver/Jacobian/imposed-displacement/fail-closed focused controls. |
| BM-005 | NOT_RUN_EXECUTION_BLOCKED | Frozen source-qualified ordinary-route Lamé harness/report package exists; no faithful exact-head execution yet. |
| BM-006 | NOT_RUN | Same-case real engineer/browser walkthrough remains unexecuted. |

## LEG-008 validation

PASS_STATIC_SOURCE / artifact inspection:
- Common protocol, project overlay and LAFEA roadmap re-grounded;
- pressure sign traced to production `pressure-loads.js`;
- existing Q8 mapped-transfinite producer traced; no mesher patch required;
- governed convergence constants traced and frozen into benchmark definition;
- independent validation-side reconstruction checks Lamé A/B, boundary/probe values and physical probe coordinates;
- report contract/harness source retains machine-readable PASS/FAIL and exact-head evidence hash separation;
- PR #1572 material scope contains only benchmark/source/report/harness artifacts plus same-chain relay state; no protected numerical production, roadmap or workflow-YAML file.

NOT_RUN:
- Node syntax checks in faithful full checkout;
- BM-005 ordinary-route script;
- build/import/LAFEA regression suites;
- persisted exact-head BM-005 report;
- BM-006 browser replay.

EXECUTION_BLOCKER: faithful clean full-checkout/browser executor unavailable in current agent environment.
VISIBLE_USER_REPLAY_STATUS: STATIC_COMPOSITION_REPAIRED / BROWSER_NOT_RUN
CORE_FEA_COMPLETION_STATUS: NOT_PROVEN
RELEASE_QUALIFIED: FALSE

## Main/base reconciliation

`main` advanced from `0676f6b...` to `541e5ad...`; compare inspection shows intervening material is EMP.1/WRC workflow/relay work with no LAFEA.3 BM-005 benchmark/report overlap. Draft #1568 remains at `b2406f3...`; Draft #1572 remains stacked on that exact head. No rebase/merge was attempted.

## Protected unchanged authority

No changes to element formulations, stiffness/load assembly, solver, recovery, mesher mathematics/quality thresholds, physical-probe mathematics, convergence mathematics, pressure semantics, benchmark oracle/tolerances after freeze, Owner roadmap, workflow YAML, LAFEA.4/.5 numerical semantics, code assessment, release or merge authority.

## Exact next action

Obtain a faithful clean checkout of exact Draft #1572 head and run `node scripts/lafea.3-bm005-ordinary-route-check.mjs`. Preserve stdout JSON exactly. On `status=PASS`, persist the exact report under `agents/chains/ADV-LAFEA3-1535-PRODUCTION-ROUTE/validation/BM005-<candidateHeadSha>.json`, then run BM-006 in a real browser on the same frozen case. On `status=FAIL` or pre-report rejection, do not change protected numerics/oracle/tolerances in the current leg; isolate the first wrong boundary and write a fresh pre-work endpoint before any patch.
