ISSUE_CURRENT_STATE_VERSION: 1
CHAIN_ID: ADV-PROD-1634-RECOVERY
ISSUE_BASIS_ID: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0010
UPDATED_AT: 2026-09-04

# Current state — Issue #1634 production recovery

## Acceptance ledger

| ID | Requirement | Status | Current disposition |
|---|---|---|---|
| TASK-001 | Start fixing production-readiness gaps. | IN_PROGRESS | #1637 merged; Draft #1639 carries LEG-002 and remains unmerged. |
| TASK-002 | Use Common exact basis `293a3db7993a6945c01adc592a7ff14a339c504a`. | SATISFIED | Common protocol current. |
| TASK-003 | Restore production bundle browser boot. | PATCHED_NOT_VALIDATED | LEG-001 is on main; exact-head production browser evidence absent. |
| TASK-004 | Restore build/chunk budget without weakening ceiling. | IMPLEMENTED_NOT_ACCEPTED | LEG-002 lazy product transaction exists; Rollup byte reduction unmeasured; ceiling remains 1.125 MiB. |
| TASK-005 | Restore exact-head LAFEA.4 CI execution. | BLOCKED_INFRASTRUCTURE | Opened/reopened/repeated synchronize events through EP-0010 produce zero runs/statuses. |
| TASK-006 | Real-app LAFEA/UI flow recovery. | OPEN | Browser viewport/state matrix awaits bootable exact-head artifact. |
| TASK-007 | Correct UI layout for engineering use. | PARTIAL | Draft #1635 is one bounded inspector fix; full layout matrix remains open. |
| TASK-008 | Keep UI/presentation non-authoritative. | OPEN | Result-custody presentation checks remain required. |
| TASK-009 | Independent manual calculations. | READY_NOT_RUN | BM-001..BM-005 defined; execution/evidence pending. |
| TASK-010 | Published shell benchmark programme. | READY_FOR_SOURCE_FREEZE | Literature candidates identified; exact source/QoI/value custody must be frozen before execution. |
| TASK-011 | Preserve source/oracle/tolerance/solver/recovery authority. | ACTIVE_INVARIANT | LEG-002 leaves EMP.1/LAFEA mechanics unchanged; merged PR #1640 benchmark custody and PR #1620 engineering-review authority remain upstream-owned and untouched. |
| TASK-012 | Hold MITC release qualification until exact-head evidence. | HOLD | `RELEASE_QUALIFIED=false`. |

## Repository / PR ledger

| Item | State |
|---|---|
| live main | `ed01bc8b43ee219a0c69c0d2114ccac351096148` (merge PR #1620) |
| prior recovery PR | #1637 MERGED at `6e6c4062fffbd173aa9c4d2a2b34c2586df47f4e` |
| current recovery PR | #1639 OPEN_DRAFT / merge unauthorized |
| LEG-002 material head | `f85f6b9262fe8ae878eb30c49355af750d50f43b` |
| EP-0009 reconciliation | `7f2477f8fc87faacd7a93a5c3e66cabc2dd3c00d` to main `c053a757...` |
| EP-0010 reconciliation | `08a665d21cb17cb41b7d705724516346656fe219` to main `ed01bc8...` |
| latest endpoint | EP-0010 |
| release | HOLD / false |

## LEG-002 validation ledger

| Check | Status | Evidence |
|---|---|---|
| planned material scope | PASS | Two workspace files + one structural checker; no core numerical/workflow/chunk-ceiling mutation. |
| route-authority owner retained | PASS_SOURCE_INSPECTION | `currentEmp1WorkbenchRouteAuthority()` remains in `emp1-workbench-product-run.js`. |
| route-authority source frozen | PASS_REOBSERVED_SOURCE | Function SHA-256 remains `74f6ebdacfff23d14dd12262b23535f49dc901538c4cbfa013cc458666c3d197`; executable guard remains NOT_RUN. |
| heavy transaction lazy split | PASS_SOURCE_INSPECTION | Public execution entry dynamically loads the heavy implementation; no implementation back-import to owner. |
| latest-main reconciliation | PASS_RELAY | `08a665d2...` has parents prior #1639 custody head and latest main `ed01bc8...`; exact branch blobs were overlaid on exact current-main tree. |
| repository structural checker | NOT_RUN | Partial connector reconstruction is not accepted as execution evidence. |
| EMP.1 product qualification | NOT_RUN | No exact-head Actions/runtime execution. |
| import checker | NOT_RUN | No faithful full checkout/runtime. |
| production Rollup build / chunk bytes | NOT_RUN | Actual byte saving unknown. |
| served production browser boot | NOT_RUN | No exact-head `dist/`. |
| exact-head Actions | BLOCKED_INFRASTRUCTURE | `08a665d2...` produced zero workflow runs and zero combined statuses. |

## Concurrent main reconciliation

During EP-0009 finalization, main advanced from `c053a757...` to `ed01bc8...`, merge of PR #1620 (`EMP.1 governance: add hash-bound engineering review attestation`). The comparison is 15 commits and nine changed files: a distinct EMP.1 engineering-review custody chain, checker, and `src/core/emp1/emp1-engineering-review-record.js`. No path overlaps LEG-002, this recovery chain, `src/workspace/fea-benchmark-panel.js`, or `src/core/fea-benchmarks/**`.

The branch was therefore reconciled again without force at `08a665d21cb17cb41b7d705724516346656fe219` using exact latest-main tree `2e597bfac208cee59dbe1127e0eb43b0d052b658` plus exact current #1639 blobs. GitHub reported #1639 Draft / `mergeable=true` after the relay. The newly merged engineering-review authority remains protected upstream state.

## Read-only P1 candidate

EP-0008's `FeaBenchmarkPanel.run()` lazy benchmark-runtime seam remains `PREQUALIFIED_NOT_OPENED`. A later material leg may alter dependency loading only after LEG-002 measured disposition, preserving synchronous panel APIs, exact case ordering/values/tolerances/hashes, benchmark source custody, engineering-review records, route decisions and release authority. It may not modify `src/core/fea-benchmarks/**`, force a manual chunk, or raise the hard ceiling.

## Benchmark / oracle ledger

BM-001 rotated affine membrane, BM-002 rigid motion, BM-003 pure bending surfaces, BM-004 pressure/FBD and BM-005 cantilever strip remain READY_NOT_RUN. BM-006 Scordelis-Lo, BM-007 pinched cylinder, BM-008 twisted beam and BM-009 thin-limit/distortion remain source/QoI/mesh-freeze or execution pending. BM-010 orientation invariance is READY; BM-011 solver/equilibrium/energy and BM-012 UI evidence fidelity remain NOT_RUN.

## Current blocker / exact next action

LEG-002 remains a bounded packaging correction, not an accepted production fix. Keep #1639 Draft and unmerged. Material work remains paused. Obtain faithful exact-head structural/EMP.1/import/build/chunk/served-browser execution. Only after measured LEG-002 disposition may another material leg open; if additional size reduction remains necessary, use the EP-0008 benchmark-runtime candidate under a fresh write-ahead endpoint. UI/layout/manual/published-benchmark obligations remain open and release remains HOLD.
