ISSUE_CURRENT_STATE_VERSION: 1
CHAIN_ID: ADV-PROD-1634-RECOVERY
ISSUE_BASIS_ID: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0007
UPDATED_AT: 2026-09-03

# Current state — Issue #1634 production recovery

## Original task / acceptance ledger

| ID | Requirement | Status | Current evidence / disposition |
|---|---|---|---|
| TASK-001 | Start fixing production-readiness gaps. | IN_PROGRESS | Recovery PR #1637 merged by explicit Owner authorization; follow-on Draft #1639 carries LEG-002 and is unmerged. |
| TASK-002 | Use Common exact basis `293a3db7993a6945c01adc592a7ff14a339c504a`. | SATISFIED | Common protocol remains current for the chain. |
| TASK-003 | Restore production bundle browser boot. | PATCHED_NOT_VALIDATED | LEG-001 chunk-graph correction is on main; no exact-head production build/served-browser execution exists. |
| TASK-004 | Restore build/chunk budget without weakening ceiling. | IMPLEMENTED_NOT_ACCEPTED | LEG-002 moves the heavy EMP.1 transaction behind the existing async API while preserving the authority owner. Net Rollup byte reduction remains unmeasured; hard ceiling remains 1.125 MiB. |
| TASK-005 | Restore exact-head LAFEA.4 CI execution. | BLOCKED_INFRASTRUCTURE | Current unconditional pull-request workflow produced zero runs/check-runs after opened, reopened and synchronize events; workflow mutation remains prohibited. |
| TASK-006 | Real-app LAFEA/UI flow recovery. | OPEN | Browser viewport/state matrix remains defined in PLAN-0001; execution waits for a bootable exact-head production artifact. |
| TASK-007 | Correct UI layout for engineering use. | PARTIAL | Separate Draft #1635 covers one inspector layout correction; full matrix remains open. |
| TASK-008 | Keep UI/presentation non-authoritative. | OPEN | Result-custody presentation checks remain required. |
| TASK-009 | Independent manual calculations. | READY_NOT_RUN | BM-001..BM-005 payloads are defined; candidate execution/evidence retention remains pending. |
| TASK-010 | Published shell benchmark programme. | READY_FOR_SOURCE_FREEZE | Literature candidates are identified; exact benchmark definitions/QoI/value provenance must be frozen before execution. |
| TASK-011 | Preserve source/oracle/tolerance/solver/recovery authority. | ACTIVE_INVARIANT | LEG-001 leaves Issue #1551 spring-rate authority unchanged; LEG-002 leaves EMP.1 core numerical/registry/applicability/route authority and LAFEA mechanics unchanged. |
| TASK-012 | Hold MITC release qualification until exact-head evidence. | HOLD | `RELEASE_QUALIFIED=false`. |

## Current repository / PR ledger

| Item | State |
|---|---|
| live main | `1aab8842759e63fe94f80438630647c166866034` |
| prior recovery PR | #1637 MERGED at `6e6c4062fffbd173aa9c4d2a2b34c2586df47f4e` |
| current recovery PR | #1639 OPEN_DRAFT / merge unauthorized |
| LEG-002 material head | `f85f6b9262fe8ae878eb30c49355af750d50f43b` |
| reconciliation commit | `e13497f3115c350e7ba2760474c2bc7aceabd453` |
| execution-retrigger custody commit | `107e82681bd907f0b1b5ea0abf126ff0664643fc` |
| latest endpoint | EP-0007 |
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
| route-authority source frozen | PASS_REOBSERVED_SOURCE | exact function source SHA-256 recomputed in-session as `74f6ebdacfff23d14dd12262b23535f49dc901538c4cbfa013cc458666c3d197`; repository checker itself remains NOT_RUN. |
| heavy transaction lazy split | PASS_SOURCE_INSPECTION | `executeEmp1WorkbenchProduct()` dynamically loads `emp1-workbench-product-execution.js`; lazy implementation receives the existing authority resolver and has no import back to the owner. |
| EMP.1 product qualification | NOT_RUN | no exact-head Actions/runtime execution. |
| import checker | NOT_RUN | no faithful full checkout/runtime. |
| production Rollup build / chunk bytes | NOT_RUN | actual byte saving unknown. |
| served production browser boot | NOT_RUN | no current `dist/`. |
| exact-head Actions | BLOCKED_INFRASTRUCTURE | zero runs/check-runs after original PR opening, close/reopen, and custody-only synchronize push. |

## CI diagnosis

`.github/workflows/emp1-gamma5-main-route.yml` declares both unconditional `pull_request:` and `workflow_dispatch:` triggers and directly runs `scripts/emp1-workbench-product-run-qualification.mjs`. Draft #1639 was closed/reopened without code mutation and then received custody-only commit `107e8268...`, producing both `reopened` and `synchronize` pull-request events. GitHub still returned zero workflow runs and zero check-runs for both the prior and synchronize heads. Changed-file filtering and missing PR-event generation are therefore not credible explanations. The connected interface exposes no workflow-dispatch action, and the local execution container cannot resolve github.com for a faithful checkout. Protected workflow YAML will not be changed solely to manufacture execution.

## Read-only P1 profiling result

The default application state is `WORKSPACE`, but bootstrap statically imports and constructs LAFEA, LFEA and Empirical workbench controllers, and `ApplicationShellController.init()` initializes all three while hidden. Existing browser LAFEA qualification activates the LAFEA tab before consuming workbench state, which supports first-activation laziness as a candidate. However, the bootstrap public API also exposes direct synchronous workbench methods/state, so a naive deferred proxy would change API semantics or introduce races. No material lifecycle change is authorized while LEG-002 lacks executable evidence.

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

LEG-002 is a bounded packaging correction, not an accepted production fix. A faithful Rollup build and served-browser smoke remain controlling evidence, while repository Actions currently creates neither workflow runs nor check-runs for #1639 pull-request events.

## Exact next action

Keep #1639 Draft and unmerged. Material work remains paused. Continue only read-only P1 import-graph/lifecycle profiling and infrastructure diagnosis until faithful exact-head structural/EMP.1/import/build/chunk/browser execution exists. Do not raise the bundle ceiling, mutate protected workflows, or change numerical/source/route/release authority. UI/layout/manual/published benchmark obligations remain open and release remains HOLD.
