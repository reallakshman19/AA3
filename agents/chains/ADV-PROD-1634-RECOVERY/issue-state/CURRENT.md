ISSUE_CURRENT_STATE_VERSION: 1
CHAIN_ID: ADV-PROD-1634-RECOVERY
ISSUE_BASIS_ID: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0012
UPDATED_AT: 2026-09-04

# Current state — Issue #1634 production recovery

## Acceptance ledger

| ID | Requirement | Status | Current disposition |
|---|---|---|---|
| TASK-001 | Start fixing production-readiness gaps. | IN_PROGRESS | #1637 merged; Draft #1639 carries LEG-002 and remains unmerged. |
| TASK-002 | Use Common exact basis `293a3db7993a6945c01adc592a7ff14a339c504a`. | SATISFIED | Common protocol current. |
| TASK-003 | Restore production bundle browser boot. | PATCHED_NOT_VALIDATED | LEG-001 is on main; exact-head production browser evidence absent. |
| TASK-004 | Restore build/chunk budget without weakening ceiling. | IMPLEMENTED_NOT_ACCEPTED | LEG-002 lazy product transaction exists; Rollup byte reduction unmeasured; ceiling remains 1.125 MiB. |
| TASK-005 | Restore exact-head LAFEA.4 CI execution. | BLOCKED_INFRASTRUCTURE | #1639 exact observed head still has zero PR runs/statuses; repository run creation remains unavailable from this chain. Existing LAFEA.4 workflow is path-filtered and lacks served-browser/adoption-complete coverage. |
| TASK-006 | Real-app LAFEA/UI flow recovery. | OPEN | Browser viewport/state matrix awaits bootable exact-head artifact. |
| TASK-007 | Correct UI layout for engineering use. | PARTIAL | Draft #1635 is one bounded inspector fix; full layout matrix remains open. |
| TASK-008 | Keep UI/presentation non-authoritative. | OPEN | Result-custody presentation checks remain required. |
| TASK-009 | Independent manual calculations. | READY_NOT_RUN | BM-001..BM-005 defined; execution/evidence pending. |
| TASK-010 | Published shell benchmark programme. | READY_FOR_SOURCE_FREEZE | Literature candidates identified; exact source/QoI/value custody must be frozen before execution. |
| TASK-011 | Preserve source/oracle/tolerance/solver/recovery authority. | ACTIVE_INVARIANT | LEG-002 leaves EMP.1/LAFEA mechanics unchanged; merged benchmark-custody, engineering-review and review-readiness authority remain upstream-owned and untouched. |
| TASK-012 | Hold MITC release qualification until exact-head evidence. | HOLD | `RELEASE_QUALIFIED=false`. |

## Repository / PR ledger

| Item | State |
|---|---|
| live main | `2279b44f249e138e63da41ebbf764397cfd5002e` |
| prior recovery PR | #1637 MERGED at `6e6c4062fffbd173aa9c4d2a2b34c2586df47f4e` |
| current recovery PR | #1639 OPEN_DRAFT / merge unauthorized |
| observed pre-EP-0012 PR head | `36f822031ed703f35e616e4783c986f5372c1c2c` |
| LEG-002 material head | `f85f6b9262fe8ae878eb30c49355af750d50f43b` |
| latest-main reconciliation | `36f822031ed703f35e616e4783c986f5372c1c2c` to main `2279b44f...` |
| latest endpoint | EP-0012 |
| release | HOLD / false |

## LEG-002 validation ledger

| Check | Status | Evidence |
|---|---|---|
| planned material scope | PASS | Two workspace files + one structural checker; no core numerical/workflow/chunk-ceiling mutation. |
| route-authority owner retained | PASS_SOURCE_INSPECTION | `currentEmp1WorkbenchRouteAuthority()` remains in `emp1-workbench-product-run.js`. |
| route-authority source frozen | PASS_REOBSERVED_SOURCE | Function SHA-256 remains `74f6ebdacfff23d14dd12262b23535f49dc901538c4cbfa013cc458666c3d197`; executable guard remains NOT_RUN. |
| heavy transaction lazy split | PASS_SOURCE_INSPECTION | Public execution entry dynamically loads the heavy implementation; no implementation back-import to owner. |
| repository structural checker | NOT_RUN | No faithful full checkout/runtime. |
| EMP.1 product qualification | NOT_RUN | #1639 has no Actions run and local full checkout is unavailable. |
| import checker | NOT_RUN | No faithful full checkout/runtime. |
| production Rollup build / chunk bytes | NOT_RUN | Actual byte saving unknown. |
| served production browser boot | NOT_RUN | No exact-head `dist/`. |
| exact-head Actions | BLOCKED_ON_RUN_CREATION | Observed head `36f822031ed703f35e616e4783c986f5372c1c2c` has zero PR workflow runs and zero combined statuses. |

## EP-0012 latest-main reconciliation

`main` advanced to `2279b44f249e138e63da41ebbf764397cfd5002e` through merged PR #1621, which composes existing engineering-review state into EMP.1 readiness. This is authority-relevant upstream behavior, so it was reviewed before reconciliation rather than treated as a path-only merge.

The upstream change remains a read-only readiness projection: it does not move, duplicate, or redefine `currentEmp1WorkbenchRouteAuthority()`, the LEG-002 lazy execution seam, FEM mechanics, benchmark values/tolerances, or release authority. The recovery branch was then reconciled non-destructively at `36f822031ed703f35e616e4783c986f5372c1c2c`, whose parents are the prior recovery head and current main. GitHub reports #1639 Draft and mergeable=true on the new base.

The observed reconciled head still has zero pull-request workflow runs and zero combined commit statuses. Therefore the base drift is resolved, but executable validation is not.

## CI root-cause disposition

The workflow files are present; this is not a missing-YAML diagnosis. Historical Actions execution exists, while recent recovery heads have no run creation. The connected surface cannot inspect the administrative reason or dispatch the required workflow, and the local environment cannot materialize a faithful full repository runtime. Do not infer a numerical or bundle PASS/FAIL from the missing execution.

The unconditional EMP.1 workflow is necessary but insufficient for LEG-002 acceptance because it does not execute the new structural guard, production Rollup/chunk measurement, or served-browser smoke. The existing LAFEA.4 workflow includes build/import gates but is path-filtered away from #1639 and lacks served-production browser coverage; chain #1536 separately owns adoption-validation aggregation policy.

## Read-only P1 candidate

EP-0008's `FeaBenchmarkPanel.run()` lazy benchmark-runtime seam remains `PREQUALIFIED_NOT_OPENED`. No new material packaging leg may open before measured LEG-002 disposition. Any later leg must preserve synchronous panel APIs, exact case order/values/tolerances/hashes/source custody, one benchmark implementation, deterministic failure/concurrency semantics, and upstream engineering-review/readiness authority; it may not modify `src/core/fea-benchmarks/**`, force a manual chunk, or raise the hard ceiling.

## Benchmark / oracle ledger

BM-001 rotated affine membrane, BM-002 rigid motion, BM-003 pure bending surfaces, BM-004 pressure/FBD and BM-005 cantilever strip remain READY_NOT_RUN. BM-006 Scordelis-Lo, BM-007 pinched cylinder, BM-008 twisted beam and BM-009 thin-limit/distortion remain source/QoI/mesh-freeze or execution pending. BM-010 orientation invariance is READY; BM-011 solver/equilibrium/energy and BM-012 UI evidence fidelity remain NOT_RUN.

## Current blocker / exact next action

LEG-002 remains a bounded packaging correction, not an accepted production fix. Keep #1639 Draft and unmerged; material work stays paused.

Restore a faithful execution route by either restoring repository Actions run creation or supplying a faithful full checkout/dependency/browser runtime. On exact #1639 head run, in order: `node scripts/bundle-lazy-emp1-product-run-check.mjs`; governed EMP.1 product qualification; `npm run check:imports`; `npm run build` with retained exact chunk bytes against the unchanged 1.125 MiB ceiling; then serve `dist/` and execute Chromium smoke with page-error/console/unhandled-rejection capture.

PASS with sufficient chunk margin and clean browser boot permits LEG-002 acceptance and progression to UI/layout + numerical qualification. PASS but still over ceiling permits a fresh write-ahead endpoint for the EP-0008 benchmark-runtime candidate. Any executable failure must first isolate the wrong owner. Workflow YAML/settings, numerical/source/oracle/tolerance/route/readiness/release authority and the ceiling remain protected.
