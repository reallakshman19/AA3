# WIP — LAFEA.4–6 Meshing Completion

## Recovery header

- HANDOVER_READINESS: READY_FOR_CONTINUATION
- PR_RECOVERY_STATE: NEW_PR_REQUIRED
- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: PREDECESSOR_PR_MERGED
- PREDECESSOR_PR: #1139 (merged)
- MUTATION_AUTHORITY: WRITE_ALLOWED — owner requested meshing completion and AUTO MODE
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: AUTO
- AUTO_STATE: RUNNING
- SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
- MERGE_AUTHORITY: OWNER_ONLY
- TAKEOVER_AUTHORITY: NOT_APPLICABLE — new successor branch from current main
- BRANCH: `agent/lafea456-meshing-completion-20260815`
- PR_HEAD_OBSERVED: `58de05406baed8f83e49cf380d61ef5a3c5132e3`
- REPORT_BASIS_HEAD: `58de05406baed8f83e49cf380d61ef5a3c5132e3`
- MAIN_HEAD_LAST_CHECKED: `58de05406baed8f83e49cf380d61ef5a3c5132e3`
- MERGE_BASE: `58de05406baed8f83e49cf380d61ef5a3c5132e3`
- REPORT_SYNC: CURRENT
- GROUNDING_EPOCH: GE-LAFEA456-20260815-01
- CURRENT_STAGE: IMPLEMENTATION_START
- CURRENT_BLOCKER: NONE
- HIGHEST_RISK: engineering-authority drift between shell generation/refinement contracts and the actual qualified producer/workbench
- EXACT_NEXT_ACTION: correct stage authority projection and request-adapter regression, then port the bounded two-patch conforming shell seam producer onto current main without touching active LAFEA.3 v3 ownership

## Mission boundary

Complete the current repository's meshing implementation for LAFEA.4–6 without manufacturing unsupported engineering authority.

Current production truth:

- LAFEA.4 and LAFEA.5 are mesh-bearing shell stages using `CST_DKT_TRI3_THIN_SHELL_V1` and the bound shell producer.
- Shell local refinement is not qualified and must remain fail-closed.
- LAFEA.6 has `ENGINE_NOT_IMPLEMENTED`, no mesh lifecycle authority, no mesh adapter, and must remain explicitly non-mesh/unsupported until a separate weld-engine qualification programme exists.
- The missing bounded shell topology scope is the historical two-coplanar-rectangular-patch / one-complete-straight-seam case from draft PR #975. That PR is 1,971 commits behind current main and is evidence only; implementation will be rebuilt against current contracts.

Explicit non-goals:

- no LAFEA.6 weld formulation or solver implementation;
- no new shell element family;
- no shell local/adaptive refinement;
- no release-authority promotion;
- no tolerance weakening;
- no workflow YAML changes;
- no mutation of old PR #975;
- no edits to active LAFEA.3 v3 authority paths owned by draft PR #1129 unless unavoidable.

## Live ground truth / coordination

- Default branch: `main` at `58de05406baed8f83e49cf380d61ef5a3c5132e3`, merge of PR #1139.
- PR #1139 is merged and immutable as predecessor.
- Draft PR #1129 touches `src/workspace/lafea-workbench-mesh-generation-state.js`; classify that exact file as COORDINATION_REQUIRED and avoid it in this slice.
- Draft PR #975 is historical shell-multipatch evidence only; its branch is 1,971 commits behind current main.
- Current shell producer already supports planar single patch, planar holes, cylindrical patch, cylindrical holes, and full-periodic cylinder.
- Current producer registry binds shell TRI3 generation to LAFEA.4/.5.
- Current request-adapter checker is stale: it still asserts shell generation is unavailable.
- Current canonical stage adapter derives `refinementAuthorized` from a global producer flag, accidentally reporting shell refinement true even though the producer registry authorizes retained local refinement families only for LAFEA.3 T3/T6 and the workbench explicitly throws `LAFEA_SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED`.

## Appendix A implementation qualification

### A1 — production trace (19/20)
Trace: LAFEA.4/.5 shell midsurface evidence -> `lafea-shell-midsurface-dispatch.js` -> `planLafeaShellAnalysisMesh()` / `produceLafeaShellAnalysisMesh()` -> v2 mesh evidence -> governed custody -> local-shell solver input. Generation authority is registered in `lafea-mesh-producer-registry.js`; local shell refinement is separately blocked in workbench state. LAFEA.6 terminates at stage registry/lifecycle adapter before mesh production.

### A2 — current failure isolation (19/20)
Two independently observable authority mismatches are isolated: stale shell-generation assertions in `scripts/lafea-mesh-stage-adapters-check.mjs`, and shell refinement overstatement in `lafea-stage-analysis-adapter.js`. Missing multipatch support is isolated to shell midsurface dispatch/contract + shell mesh producer dispatch rather than solver mechanics.

### A3 — authority/invariant reasoning (20/20)
Invariant: UI/request capability may never exceed qualified producer scope; generation and refinement are distinct claims. LAFEA.4/.5 may generate shell TRI3 but may not locally refine. LAFEA.6 must expose neither generation nor solver authority. Cross-stage similarity of shell meshes does not permit stage-authority reuse; each generated evidence remains stage-bound.

### A4 — independent validation route (18/20)
Use existing shell producer/workbench/authority-boundary checks as regression oracles; add a focused multipatch mechanics/negative checker based on force-free topology invariants: exact seam station coincidence, edge owner count=2 along seam, global non-manifold count <=2, authoritative area closure, positive facet/director alignment, deterministic artifact hash, and negative rejection for gap/overlap/third patch/holes/noncoincident seam. Runtime evidence will be CI-only because the connected private repository is not locally cloned in this environment; unexecuted checks will remain NOT_RUN until CI observes them.

### A5 — minimal patch plan (18/20)
Patch only current shell authority/dispatch/producer/test surfaces; avoid active #1129 workbench state. Add one bounded multipatch contract and one bounded producer module, dispatch them from existing shell abstractions, correct refinement authority derivation, update stale stage-adapter tests, and add negative LAFEA.6 assertions. No solver, formulation, release, tolerance, workflow, or LAFEA.3 v3 changes.

Total: 94/100. Minimum per item: 18. Implementation authority: PASS.

## Planned stages

1. Authority alignment: generation true for LAFEA.4/.5, shell refinement false, LAFEA.6 non-mesh.
2. Bounded two-patch shell midsurface contract and deterministic seam-weld producer for LAFEA.4/.5.
3. Dispatch integration without changing shell solver/formulation or active #1129 workbench state.
4. Focused positive/negative/determinism tests and aggregate script integration only where existing package scripts permit; no workflow files.
5. Draft successor PR, exact-head CI inspection, repair loop, durable PR workreport.

## Validation ledger

| Check | Status | Observation | Oracle | Basis / limitation |
|---|---|---|---|---|
| Live main grounding | PASS | REMOTE_EXECUTION | AUTHORITATIVE_REFERENCE | GitHub current main SHA |
| PR #1139 disposition | PASS | REMOTE_EXECUTION | AUTHORITATIVE_REFERENCE | merged predecessor |
| Active overlap #1129 | PASS | REMOTE_EXECUTION | AUTHORITATIVE_REFERENCE | changed-filename ledger; workbench generation state avoided |
| Historical #975 drift | PASS | REMOTE_EXECUTION | AUTHORITATIVE_REFERENCE | 1,971 commits behind main |
| Engineering delivery skill + AGENTS policy | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | Common skill and repository policy |
| Appendix A qualification | PASS | SOURCE_INSPECTION | ENGINEERING_REVIEW | 94/100, each >=18 |
| Production checks | NOT_RUN | NOT_OBSERVED | NONE | implementation not yet committed |

## Authority boundary

`releaseAuthority=false` throughout this work. No successful meshing result alone changes lifecycle/release authority. No LAFEA.6 mesh or solver authority is introduced.
