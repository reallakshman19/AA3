ISSUE_CURRENT_STATE_VERSION: 1
CHAIN_ID: ADV-PROD-1634-RECOVERY
ISSUE_BASIS_ID: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0009
UPDATED_AT: 2026-09-04

# Current state — Issue #1634 production recovery

## Original task / acceptance ledger

| ID | Requirement | Status | Current evidence / disposition |
|---|---|---|---|
| TASK-001 | Start fixing production-readiness gaps. | IN_PROGRESS | Recovery PR #1637 merged by explicit Owner authorization; follow-on Draft #1639 carries LEG-002 and is unmerged. |
| TASK-002 | Use Common exact basis `293a3db7993a6945c01adc592a7ff14a339c504a`. | SATISFIED | Common protocol remains current for the chain. |
| TASK-003 | Restore production bundle browser boot. | PATCHED_NOT_VALIDATED | LEG-001 chunk-graph correction is on main; no exact-head production build/served-browser execution exists. |
| TASK-004 | Restore build/chunk budget without weakening ceiling. | IMPLEMENTED_NOT_ACCEPTED | LEG-002 moves the heavy EMP.1 transaction behind the existing async API while preserving the authority owner. Net Rollup byte reduction remains unmeasured; hard ceiling remains 1.125 MiB. |
| TASK-005 | Restore exact-head LAFEA.4 CI execution. | BLOCKED_INFRASTRUCTURE | Current unconditional pull-request workflow produced zero runs/check-runs after opened, reopened and repeated synchronize events through EP-0009; workflow mutation remains prohibited. |
| TASK-006 | Real-app LAFEA/UI flow recovery. | OPEN | Browser viewport/state matrix remains defined in PLAN-0001; execution waits for a bootable exact-head production artifact. |
| TASK-007 | Correct UI layout for engineering use. | PARTIAL | Separate Draft #1635 covers one inspector layout correction; full matrix remains open. |
| TASK-008 | Keep UI/presentation non-authoritative. | OPEN | Result-custody presentation checks remain required. |
| TASK-009 | Independent manual calculations. | READY_NOT_RUN | BM-001..BM-005 payloads are defined; candidate execution/evidence retention remains pending. |
| TASK-010 | Published shell benchmark programme. | READY_FOR_SOURCE_FREEZE | Literature candidates are identified; exact benchmark definitions/QoI/value provenance must be frozen before execution. |
| TASK-011 | Preserve source/oracle/tolerance/solver/recovery authority. | ACTIVE_INVARIANT | LEG-001 leaves Issue #1551 spring-rate authority unchanged; LEG-002 leaves EMP.1 core numerical/registry/applicability/route authority and LAFEA mechanics unchanged; merged PR #1640 benchmark custody remains authoritative and untouched. |
| TASK-012 | Hold MITC release qualification until exact-head evidence. | HOLD | `RELEASE_QUALIFIED=false`. |

## Current repository / PR ledger

| Item | State |
|---|---|
| live main | `c053a757b34c5c7341022e93af72439ab43167bc` (merge of PR #1640) |
| prior recovery PR | #1637 MERGED at `6e6c4062fffbd173aa9c4d2a2b34c2586df47f4e` |
| current recovery PR | #1639 OPEN_DRAFT / merge unauthorized |
| LEG-002 material head | `f85f6b9262fe8ae878eb30c49355af750d50f43b` |
| EP-0008 latest-main reconciliation | `c86bfe2dc7cc7a0aa6562e47a295a0881e953370` |
| EP-0009 latest-main reconciliation | `7f2477f8fc87faacd7a93a5c3e66cabc2dd3c00d` |
| latest endpoint | EP-0009 |
| release | HOLD / false |

## LEG-001 validation ledger

| Check | Status | Evidence |
|---|---|---|
| Spring-rate resolver normal path | PASS | `400 N/mm -> 400000 N/m`; unresolved units withheld. |
| Wrong-rate negative | PASS | deliberate bad conversion exits nonzero. |
| Unresolved fallback negative | PASS | forbidden fallback exits nonzero. |
| Ownership source contract | PASS_SOURCE_INSPECTION | qualified spring-rate authority remains same import-free leaf; generated ownership is routed with generic core. |
| production build / served-browser | NOT_RUN | faithful exact-head runtime absent. |

## LEG-002 validation ledger

| Check | Status | Evidence |
|---|---|---|
| planned material scope | PASS | two workspace files + one structural checker; no core numerical/workflow/chunk-ceiling mutation. |
| route-authority owner retained | PASS_SOURCE_INSPECTION | `currentEmp1WorkbenchRouteAuthority()` remains in `emp1-workbench-product-run.js`. |
| route-authority source frozen | PASS_REOBSERVED_SOURCE | exact function source SHA-256 remains `74f6ebdacfff23d14dd12262b23535f49dc901538c4cbfa013cc458666c3d197`; repository checker itself remains NOT_RUN. |
| heavy transaction lazy split | PASS_SOURCE_INSPECTION | `executeEmp1WorkbenchProduct()` dynamically loads `emp1-workbench-product-execution.js`; lazy implementation receives the existing authority resolver and has no import back to the owner. |
| latest-main reconciliation | PASS_RELAY | `7f2477f8...` has parents prior #1639 custody head and latest main `c053a757...`; reconciliation used exact prior PR blobs over the current-main tree and restored mergeability. |
| repository structural checker | NOT_RUN | connector output cannot faithfully materialize all large source blobs for local execution; partial reconstruction is not accepted as evidence. |
| EMP.1 product qualification | NOT_RUN | no exact-head Actions/runtime execution. |
| import checker | NOT_RUN | no faithful full checkout/runtime. |
| production Rollup build / chunk bytes | NOT_RUN | actual byte saving unknown. |
| served production browser boot | NOT_RUN | no current `dist/`. |
| exact-head Actions | BLOCKED_INFRASTRUCTURE | reconciliation head `7f2477f8...` produced zero workflow runs and zero combined statuses; prior opened/reopened/synchronize observations were also zero. |

## CI diagnosis

`.github/workflows/emp1-gamma5-main-route.yml` declares both unconditional `pull_request:` and `workflow_dispatch:` triggers and directly runs `scripts/emp1-workbench-product-run-qualification.mjs`. Draft #1639 has emitted opened, reopened and multiple synchronize events with zero workflow/check execution. Changed-file filtering and lack of a PR event are therefore not credible explanations. Protected workflow YAML will not be changed solely to manufacture execution.

## EP-0009 latest-main reconciliation

`main` advanced to `c053a757b34c5c7341022e93af72439ab43167bc`, merge of PR #1640 (`EMP.1: retain benchmark programme and reconciled CAUx evidence`). PR #1640 changes authority-relevant EMP.1 benchmark programme/comparison custody, but its 26 changed paths do not overlap LEG-002 material paths, this recovery chain, or `src/core/fea-benchmarks/**`.

Before reconciliation #1639 was not mergeable. The branch was rebuilt from exact latest-main tree `9d297ae72ce66c89215b86cf3a03ba31145da956` plus the exact existing #1639 blobs and committed as two-parent reconciliation `7f2477f8fc87faacd7a93a5c3e66cabc2dd3c00d` without force update. GitHub then reported #1639 open, Draft and `mergeable=true`; the reconciliation itself preserved the same 11 changed paths and did not alter an engineering/material blob.

## Read-only P1 prequalification

The EP-0008 `FeaBenchmarkPanel.run()` runtime-lazy candidate remains `PREQUALIFIED_NOT_OPENED`. PR #1640 does not invalidate its call-contract analysis, but the new main benchmark custody must remain untouched. Any later packaging leg must defer only benchmark execution/runtime imports inside the already-async `run()` path while preserving synchronous panel construction/render/getReport/download, exact case selection/order, expected values, tolerances, hashes and runner authority, one real panel class, deterministic concurrent/failure behavior, and no `src/core/fea-benchmarks/**`, manual-chunk, workflow or ceiling mutation.

No material benchmark-runtime change has been made.

## Benchmark / oracle ledger

| ID | Status | Current evidence / next action |
|---|---|---|
| BM-001 Rotated affine membrane | READY | independent local-frame stress/engineering-strain oracle defined; direct global-vs-local comparison is a negative control. |
| BM-002 Rigid motion | READY | zero strain/stress/energy invariant. |
| BM-003 Pure bending surfaces | READY | top/bottom analytical stress/strain values defined. |
| BM-004 Pressure/resultant FBD | READY | force and moment closure equations defined; no thickness/end-cap invention. |
| BM-005 Cantilever strip | READY | Euler-Bernoulli response payload defined subject to matching idealization. |
| BM-006 Scordelis-Lo | NOT_RUN | exact shell-theory/source/QoI/value provenance must be frozen; do not blindly use 0.3024 ft. |
| BM-007 Pinched cylinder | NOT_RUN | source/QoI/mesh ladder freeze pending. |
| BM-008 Twisted beam | NOT_RUN | regular/distorted mesh ladder pending. |
| BM-009 MITC thin-limit/distortion | NOT_RUN | thickness/distortion ladder pending. |
| BM-010 Orientation/normal/permutation | READY | execute after candidate production route exists. |
| BM-011 Solver/equilibrium/energy | NOT_RUN | focused + aggregate gates pending. |
| BM-012 UI evidence fidelity | NOT_RUN | browser/view-model comparison after production boot. |

## Current blocker / diagnosis

LEG-002 remains a bounded packaging correction, not an accepted production fix. A faithful Rollup build and served-browser smoke remain controlling evidence. The EP-0009 reconciliation synchronize head still produced no workflow runs or statuses.

## Exact next action

Keep #1639 Draft and unmerged. Material work remains paused. Obtain faithful exact-head structural/EMP.1/import/build/chunk/browser execution. Only after measured LEG-002 disposition may another material packaging leg open; if additional reduction remains necessary, the EP-0008 benchmark-runtime candidate is the preferred prequalified seam under a fresh write-ahead endpoint. UI/layout/manual/published benchmark obligations remain open and release remains HOLD.
