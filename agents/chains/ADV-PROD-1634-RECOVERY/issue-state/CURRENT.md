ISSUE_CURRENT_STATE_VERSION: 1
CHAIN_ID: ADV-PROD-1634-RECOVERY
ISSUE_BASIS_ID: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0013
UPDATED_AT: 2026-09-04

# Current state — Issue #1634 production recovery

## Acceptance ledger

| ID | Requirement | Status | Current disposition |
|---|---|---|---|
| TASK-001 | Start fixing production-readiness gaps. | IN_PROGRESS | #1637 merged; Draft #1639 carries LEG-002 and remains unmerged. |
| TASK-002 | Use Common exact basis `293a3db7993a6945c01adc592a7ff14a339c504a`. | SATISFIED | Common protocol current. |
| TASK-003 | Restore production bundle browser boot. | PATCHED_NOT_VALIDATED | LEG-001 is on main; exact-head production browser evidence remains absent. |
| TASK-004 | Restore build/chunk budget without weakening ceiling. | IMPLEMENTED_NOT_ACCEPTED | LEG-002 lazy product transaction exists; Rollup byte reduction remains unmeasured; ceiling remains 1.125 MiB. |
| TASK-005 | Restore exact-head LAFEA.4 / recovery CI execution. | CI_CREATED_BUT_RED_UPSTREAM | GitHub Actions run creation recovered for #1639. Three exact-head PR workflows were created and all failed in protected EMP.1 qualification before LEG-002 build/chunk/browser disposition. Existing LAFEA.4 workflow remains path-filtered away from #1639 and lacks served-browser/adoption-complete coverage. |
| TASK-006 | Real-app LAFEA/UI flow recovery. | OPEN | Browser viewport/state matrix awaits bootable exact-head artifact. |
| TASK-007 | Correct UI layout for engineering use. | PARTIAL | Draft #1635 is one bounded inspector fix; full layout matrix remains open. |
| TASK-008 | Keep UI/presentation non-authoritative. | OPEN | Result-custody presentation checks remain required. |
| TASK-009 | Independent manual calculations. | READY_NOT_RUN | BM-001..BM-005 defined; execution/evidence pending. |
| TASK-010 | Published shell benchmark programme. | READY_FOR_SOURCE_FREEZE | Literature candidates identified; exact source/QoI/value custody must be frozen before execution. |
| TASK-011 | Preserve source/oracle/tolerance/solver/recovery authority. | ACTIVE_INVARIANT | LEG-002 leaves EMP.1/LAFEA mechanics unchanged; upstream oracle/route qualification drift is recorded but not mutated here. |
| TASK-012 | Hold MITC release qualification until exact-head evidence. | HOLD | `RELEASE_QUALIFIED=false`. |

## Repository / PR ledger

| Item | State |
|---|---|
| live main | `2279b44f249e138e63da41ebbf764397cfd5002e` |
| prior recovery PR | #1637 MERGED at `6e6c4062fffbd173aa9c4d2a2b34c2586df47f4e` |
| current recovery PR | #1639 OPEN_DRAFT / merge unauthorized |
| observed pre-EP-0013 PR head | `a738845b86b6ebc61dc9f18183f3cfa4834feb15` |
| observed GitHub PR merge ref | `3d8e212d17d31d1648b254abb471c8f7ff9b6ce0` |
| LEG-002 material head | `f85f6b9262fe8ae878eb30c49355af750d50f43b` |
| latest-main reconciliation | `36f822031ed703f35e616e4783c986f5372c1c2c` to main `2279b44f...` |
| latest endpoint | EP-0013 |
| release | HOLD / false |

## Exact-head CI ledger

| Run | Workflow | Conclusion | First controlling failure |
|---|---|---|---|
| `33897322245` | EMP.1 current-main independent baseline | FAILURE | subordinate exact-head requalification exposes `POST_AUTHORITY_ORACLE_SEMANTIC_HASH_DRIFT` |
| `33897322240` | EMP.1 gamma5 bounded route on current main | FAILURE | same protected semantic-refreeze drift before downstream qualification |
| `33897322187` | EMP.1 runEmp1 bounded gamma5 orchestration | FAILURE | stale axis-authority suspension assertion expects authorization false while current main exports true |

The independent baseline log first reports `PASS_ZERO_PRODUCTION_SEMANTIC_IMPORTS` and `PASS_INDEPENDENT_ORACLE_INTERPRETATION_DECOUPLED`; the red result is the frozen semantic hash mismatch:

- actual: `0aec3815479ea092e61bad3858519c8495f9b5cbe6ac711e76ce5bd6f80a806c`
- expected: `60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18`
- site: `scripts/emp1-wrc-gamma5-post-authority-independent-refreeze.mjs:170`

The runEmp1 stale assertion is directly present on current base: its suspension checker expects route authorization `false`, while `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js` exports route authorization `true`.

Neither protected failure belongs to #1639 material scope. #1639 does not modify the post-authority refreeze/oracle custody files, suspension checker, route implementation, `src/core/emp1/**`, source registry, or benchmark values/tolerances. No protected refreeze or route inversion may be performed in this recovery PR.

## LEG-002 validation ledger

| Check | Status | Evidence |
|---|---|---|
| planned material scope | PASS | Two workspace files + one structural checker; no core numerical/workflow/chunk-ceiling mutation. |
| route-authority owner retained | PASS_SOURCE_INSPECTION | `currentEmp1WorkbenchRouteAuthority()` remains in `emp1-workbench-product-run.js`. |
| route-authority source frozen | PASS_REOBSERVED_SOURCE | Function SHA-256 remains `74f6ebdacfff23d14dd12262b23535f49dc901538c4cbfa013cc458666c3d197`. |
| heavy transaction lazy split | PASS_SOURCE_INSPECTION | Public execution entry dynamically loads the heavy implementation; no implementation back-import to owner. |
| repository structural checker | NOT_RUN | No current-main workflow references `bundle-lazy-emp1-product-run-check`; faithful local full runtime remains unavailable. |
| EMP.1 product qualification | RED_UPSTREAM_BEFORE_LEG_002_DISPOSITION | Three exact-head PR workflows exist, but fail in protected upstream EMP.1 qualification. |
| import checker | NOT_RUN_FOR_LEG_002_ACCEPTANCE | Current red workflows do not provide the required accepted import gate for this leg. |
| production Rollup build / chunk bytes | NOT_RUN_FOR_LEG_002_ACCEPTANCE | Actual byte saving unknown. |
| served production browser boot | NOT_RUN | No accepted exact-head `dist/` browser smoke. |
| exact-head Actions | RUN_CREATION_RECOVERED / RED | Hosted checkout and Node execution function; current exact-head qualification is red upstream. |

## EP-0013 disposition

EP-0011/EP-0012's run-creation diagnosis is superseded. The controlling state is now `BLOCKED_ON_LEG_002_EXECUTION_COVERAGE` with an upstream dependency `EMP1_QUALIFICATION_BASIS_RED`.

This is not evidence that LEG-002 passed or failed the production bundle-size problem. The existing workflows fail before they measure the new lazy-boundary guard, exact Rollup chunk bytes, hard 1.125 MiB gate, or served-production Chromium boot.

Do not fix the protected EMP.1 oracle/route qualification inconsistencies in #1639. They require their existing authority/qualification owner and independent review.

## Read-only P1 candidate

EP-0008's `FeaBenchmarkPanel.run()` lazy benchmark-runtime seam remains `PREQUALIFIED_NOT_OPENED`. No new material packaging leg may open before measured LEG-002 disposition. Any later leg must preserve synchronous panel APIs, exact case order/values/tolerances/hashes/source custody, one benchmark implementation, deterministic failure/concurrency semantics, and upstream engineering-review/readiness authority; it may not modify `src/core/fea-benchmarks/**`, force a manual chunk, or raise the hard ceiling.

## Benchmark / oracle ledger

BM-001 rotated affine membrane, BM-002 rigid motion, BM-003 pure bending surfaces, BM-004 pressure/FBD and BM-005 cantilever strip remain READY_NOT_RUN. BM-006 Scordelis-Lo, BM-007 pinched cylinder, BM-008 twisted beam and BM-009 thin-limit/distortion remain source/QoI/mesh-freeze or execution pending. BM-010 orientation invariance is READY; BM-011 solver/equilibrium/energy and BM-012 UI evidence fidelity remain NOT_RUN.

## Current blocker / exact next action

LEG-002 remains a bounded packaging correction, not an accepted production fix. Keep #1639 Draft and unmerged; material work stays paused.

First route the EMP.1 semantic-refreeze and suspension-state failures to the protected EMP.1 qualification owner; do not silently refreeze or invert route authority here. After that upstream basis is reconciled, obtain exact #1639 merge-ref execution that specifically runs: `node scripts/bundle-lazy-emp1-product-run-check.mjs`; governed EMP.1 product qualification; `npm run check:imports`; `npm run build` with retained exact chunk bytes against the unchanged 1.125 MiB ceiling; then serve `dist/` and execute Chromium smoke with page-error/console/unhandled-rejection capture.

Only a measured LEG-002 PASS/FAIL may authorize another packaging leg, UI/layout execution, or numerical benchmark execution. Workflow YAML/settings, numerical/source/oracle/tolerance/route/readiness/release authority and the ceiling remain protected.
