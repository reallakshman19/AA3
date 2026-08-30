# Issue Current State — #1535 LAFEA.3 ordinary production route / #1569 BM-005 rigor

ISSUE_BASIS_ID: IB-0001
ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0027
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1535
SUBORDINATE_VV_WORK_ITEM: github:reallaksh19/Advanced_Analysis#1569
ENGINEERING_MERGE_HEAD: 0f8b9443d9e578c5509f880713438ddc0b8c0fa4
PRIMARY_RECOVERY_MERGE: #1576 -> e48b004d69350b8c156594732b2ad4716a08b72b
BM005_RECOVERY_MERGE: #1577 -> 0f8b9443d9e578c5509f880713438ddc0b8c0fa4
SUPERSEDED_DRAFTS: #1568; #1572
PR_STATUS: MATERIAL_MERGED / NO_ACTIVE_MATERIAL_PR
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE

## Acceptance ledger

| ID | Status | Evidence / disposition |
|---|---|---|
| TASK-001 | PARTIAL | Ordinary geometry/domain intake plus governed mesh/preflight/compiler/convergence plumbing are now on main; exact-head BM-005 execution is still not demonstrated. |
| TASK-002 | PARTIAL | Curved geometry route and mapped Q8 producer are merged; faithful current-main execution remains unresolved. |
| TASK-003 | PARTIAL | T3/T6/Q8 capability guard and anti-drift evidence exist; integrated exact-head execution remains pending. |
| TASK-004 | PASS | Historical continuum documentation remains subordinate to live source authority. |
| TASK-005 | PASS_STATIC_SOURCE | Richards Lamé source custody and explicit MacNeal-Harder non-equivalence are merged. |
| TASK-006 | PARTIAL | Visible Run -> Convergence -> Results composition is merged; real engineer/browser replay remains NOT_RUN. |
| TASK-007 | PASS_STATIC_SOURCE | Frozen BM-005 package/report contract is merged: Q8 quarter-annulus, four-level ladder, fixed physical probe, convergence-policy binding, negative control and audit hashes. |

## Merge reconciliation

Owner authorized merge. Draft→Ready tooling failed, so exact-head recovery PRs were used without altering engineering material:

- #1568 head `b2406f3ca4ad4015a1dad19f6246fe1ed69d1ebb` -> recovery #1576 -> main merge `e48b004d69350b8c156594732b2ad4716a08b72b`.
- #1572 head `5e67443324d00cadb055c82045e10bcc0caa3cbe` -> recovery #1577 -> main merge `0f8b9443d9e578c5509f880713438ddc0b8c0fa4`.

Superseded Draft PRs #1568 and #1572 are closed to remove duplicate authority; their history remains provenance.

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

Primary oracle: K. L. Richards, *Design Engineer's Handbook*, 1st ed., CRC Press, 2012, Ch.6 p.157 Eqs.6.3–6.4 and §6.3 p.158. Production output cannot alter the frozen oracle, probe, mesh ladder, convergence-policy constants or acceptance after observations.

The report contract records actual candidate HEAD and clean-tree state, source/oracle hashes, model/mesh/solver/recovery/probe lineage, mesh quality/counts, observed orders, Richardson/GCI, oracle comparison, solver/equilibrium diagnostics, negative control, limitations/warnings, authority disposition, semanticHash and evidenceHash. Completed non-qualifying studies emit a machine-readable FAIL report before non-zero exit where the route reaches report construction.

## Benchmark / qualification truth

| ID | Status | Evidence / disposition |
|---|---|---|
| BM-001 | PASS_FOCUSED | Prior focused T3/T6/Q8 mechanics/Jacobian evidence. |
| BM-002 | PASS_FOCUSED | Prior Kirsch benchmark with independent analytical oracle custody. |
| BM-003 | NOT_RUN | Integrated Lamé software execution not retained as current exact-head evidence. |
| BM-004 | PASS_FOCUSED | Prior solver/Jacobian/imposed-displacement/fail-closed focused controls. |
| BM-005 | NOT_RUN_EXECUTION_BLOCKED | Frozen ordinary-route Lamé harness/report package is merged; no faithful clean current-main execution yet. |
| BM-006 | NOT_RUN | Same-case real engineer/browser walkthrough remains unexecuted. |

EXECUTION_BLOCKER: current agent environment cannot obtain a faithful checkout; direct `git clone --no-checkout` failed `Could not resolve host: github.com`; no browser executor is available.
VISIBLE_USER_REPLAY_STATUS: STATIC_COMPOSITION_MERGED / BROWSER_NOT_RUN
CORE_FEA_COMPLETION_STATUS: NOT_PROVEN
RELEASE_QUALIFIED: FALSE

## Protected unchanged authority

No changes are authorized merely because execution is blocked: element formulations, stiffness/load assembly, solver, recovery, mesher mathematics/quality thresholds, pressure semantics, physical-probe mathematics, convergence mathematics/policy, frozen benchmark oracle/tolerances, Owner roadmap, workflow YAML, LAFEA.4/.5 numerical semantics, code assessment and release authority remain protected.

## Exact next action

On a faithful clean checkout of current `main`, run:

```bash
node scripts/lafea.3-bm005-ordinary-route-check.mjs
```

Preserve stdout JSON exactly. The report itself must bind the actual candidate HEAD from `git rev-parse HEAD` and clean-tree state.

- `status=PASS`: persist exact output as `agents/chains/ADV-LAFEA3-1535-PRODUCTION-ROUTE/validation/BM005-<candidateHeadSha>.json`, then perform BM-006 in a real browser using the same frozen case.
- `status=FAIL`: inspect the retained reasons/diagnostics and isolate the first wrong engineering/software boundary.
- pre-report rejection: identify the failing route/schema/preflight boundary.

Any patch after FAIL/pre-report rejection requires a fresh pre-work endpoint and Q1–Q5 pack. Do not weaken oracle, mesh ladder, tolerances or convergence policy to obtain PASS.
