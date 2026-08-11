# PR 1036 Work Report — Support Geometry Dependency Closure

## PR Mission Control

| Field | Current truth |
|---|---|
| Mission | Close support/geometry dependency custody for every governed geometry-changing 3D Edit path without introducing support-follow mutation semantics. |
| Source | User-directed P0 support dependency closure; reviewed against `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md`. |
| PR | #1036 — `fix(3d-edit): close support-host geometry dependency gap` |
| Branch | `agent/fix-support-geometry-dependency` |
| Base | `main` (implementation base `a587867963cc9199caca6e7adfa03af95a316aa2`) |
| Reviewed implementation HEAD | `d6d72148a8a49998b9e93e17e368c812c81eae6a` |
| Status | DRAFT / reviewed / implementation qualified / merge closure in progress |
| Current stage | S4 — closure, exact-number work-report custody, merge readiness |
| Last completed stage | S3 — browser and regression qualification |
| Engineering state | PASS — no code blocker found in independent review |
| Validation state | PASS on reviewed implementation HEAD; all 16 triggered workflows completed successfully |
| Blocker | Process-only: prior report filename/structure did not satisfy pinned CodingRules. This report resolves the structure/name requirement; obsolete report is to be removed before closure. |
| Next | Remove obsolete descriptive report, refresh PR body, verify current head/check state, mark ready and merge if GitHub still reports a safe merge. |

## Handover in 60 Seconds

This PR introduces one shared, pure support geometry dependency authority and routes geometry-changing planners plus the certified `MOVE_NODE` session boundary through it. Supports can be resolved by `hostEntityId`, `edgeId`, `attachedEdgeId`, or unique incident-edge fallback from `nodeId`. If an affected support depends on moved/affected geometry and no certified relocation policy exists, the operation fails closed with `SUPPORT_GEOMETRY_POLICY_REQUIRED` before canonical mutation or journal change. No support is moved or rewritten. Browser qualification uses support-dependent P-001 as a negative control and unrestrained P-003/TO as a positive MOVE_NODE control. Independent review found no production-code blocker. The remaining closure work is report custody + safe merge.

## Mission and Engineering Intent

Preserve the existing authority flow:

`UI interaction -> governed intent -> operation plan -> candidate/Preview -> validation -> certified transaction -> canonical topology -> journal Undo/Redo -> renderer projection`

The mission is specifically to prevent support geometry dependencies from being omitted when support attachment is represented by edge/component authority rather than only `support.nodeId`. The conservative policy is intentional: reject the parent geometry operation until support movement semantics are separately certified.

## Mission Status

| Item | Status | Evidence / note |
|---|---|---|
| Shared support-host resolution | COMPLETE | `topology-edit-support-geometry-dependency.js` |
| Hosted support changed-scope custody | COMPLETE | `topology-edit-change-scope.js` |
| Connected-run / endpoint / split blocking | COMPLETE | `topology-edit-route-operations.js` |
| Declared-slope blocking | COMPLETE | `topology-edit-slope-operation.js` |
| NODE_POSITION fail-closed policy | COMPLETE | Table capability + node-position planner |
| Every governed MOVE_NODE final backstop | COMPLETE | `topology-edit-certified-session.js` |
| Capability truthfulness | COMPLETE | editor-state capability authority/contract |
| Positive and negative browser controls | COMPLETE | clean layout, R1 reachability, Tool Audit, remount custody |
| Support relocation/follow semantics | DEFERRED | Explicitly out of scope; requires separate certified support command policy |
| CodingRules report custody | IN_PROGRESS | Exact report created here; obsolete report removal pending |

## Engineering Item Register

| ID | Type | Status | Finding / action |
|---|---|---|---|
| ISS-1036-01 | Correctness | RESOLVED | Edge/station-hosted supports could escape geometry dependency custody when no direct `support.nodeId` relationship exposed the affected geometry. Resolved with shared dependency authority + session backstop. |
| DEC-1036-01 | Architecture | ACCEPTED | Support movement remains unsupported. Parent geometry changes fail closed instead of auto-following, restationing, or mutating support records. |
| DEC-1036-02 | Architecture | ACCEPTED | Certified session is the final backstop for every `MOVE_NODE`; planner/capability checks remain earlier truthful guards, not alternate mutation authorities. |
| RISK-1036-01 | Process custody | RESOLVING | Previous report path `agents/PR_support_geometry_dependency_workreport.md` does not meet pinned `agents/PR<NUMBER>_workreport.md` rule and lacks mandatory ledgers/stage protocol. This report supersedes it; obsolete file must be deleted. |
| RISK-1036-02 | Integration | OPEN UNTIL MERGE | PR #1041 was qualified from the same old base. After #1036 lands, #1041 must be re-evaluated against the new `main` before its merge. |

## Stage Roadmap and Protocol

### S1 — Architecture impact and dependency semantics — COMPLETE

**Pre-stage truth:** support rendering could resolve host edges through explicit edge/component fields while movement custody was primarily node-oriented.

**Objective:** identify one reusable dependency authority instead of planner-specific patches.

**Expected behavior:** exact host resolution, deterministic immutable evidence, fail-closed ambiguous affected host authority, no support mutation.

**Actual:** implemented the shared support dependency module and reused it from planners, changed-scope derivation, capability authority, and certified session.

**Decision:** COMPLETE.

### S2 — Production integration — COMPLETE

**Files/areas:** professional route/slope/change-scope, Table NODE_POSITION capability/planner, editor capability, certified session.

**Edge cases:** direct node dependency, explicit edge/component host, unique incident fallback, ambiguous affected host, unrelated support, split edge, connected run, valve F2F, PIPE length propagation, declared slope.

**Actual:** unsupported affected supports fail before command/journal mutation; unrelated supports do not block; no second Undo or support write path introduced.

**Decision:** COMPLETE.

### S3 — Qualification — COMPLETE

**Objective:** prove negative and positive controls through repository-owned production-browser paths and focused node tests.

**Actual:** implementation head `d6d72148...` has all 16 triggered workflows completed with `success`; browser suites were updated to prove P-001 blocked/no mutation and P-003/TO successful MOVE_NODE/Undo/Redo behavior.

**Decision:** COMPLETE.

### S4 — Closure and merge custody — IN_PROGRESS

**Current truth:** code review found no production blocker and no unresolved PR review thread/comment. The implementation head is green. The only discovered closure defect is report naming/structure under the newly pinned CodingRules.

**Plan:** keep production code unchanged; replace descriptive report with this exact-number report; update PR description reference; verify head/check/mergeability; mark ready; merge only with expected head protection.

**Risk:** any report commit changes the branch head. GitHub required checks remain authoritative for merge readiness; do not claim an untested post-report code head as separately qualified engineering logic.

## Next-Agent Handover

1. Confirm `agents/PR1036_workreport.md` exists and the obsolete descriptive report is removed.
2. Confirm PR changed-file ledger matches the list below exactly.
3. Confirm no new review threads/comments appeared.
4. Confirm GitHub reports the PR merge-safe after leaving draft and required checks permit merge.
5. Merge with expected current head SHA; do not force merge through protection.
6. After merge, treat PR #1041 as based on an older `main`; re-evaluate it before merging.

## Changed-File Ledger

Expected final PR paths after report rename/cleanup:

- `agents/PR1036_workreport.md`
- `e2e/topology-edit-clean-layout.spec.js`
- `e2e/topology-edit-real-user-reachability.spec.js`
- `e2e/topology-edit-tool-audit.spec.js`
- `e2e/topology-edit-tool-icon-remount-custody.spec.js`
- `src/workspace/topology-edit/editor-state/topology-edit-capability-authority.js`
- `src/workspace/topology-edit/editor-state/topology-edit-capability-contract.js`
- `src/workspace/topology-edit/professional/topology-edit-change-scope.js`
- `src/workspace/topology-edit/professional/topology-edit-route-operations.js`
- `src/workspace/topology-edit/professional/topology-edit-slope-operation.js`
- `src/workspace/topology-edit/professional/topology-edit-support-geometry-dependency.js`
- `src/workspace/topology-edit/table/topology-edit-table-edit-capability.js`
- `src/workspace/topology-edit/table/topology-edit-table-node-position-planner.js`
- `src/workspace/topology-edit/topology-edit-certified-session.js`
- `tests/topology-edit-capability-authority.test.mjs`
- `tests/topology-edit-professional-engineering-scope.test.mjs`
- `tests/topology-edit-support-geometry-dependency.test.mjs`
- `tests/topology-edit-support-geometry-table-regression.test.mjs`

Any additional or missing path is a closure blocker until explained here.

## Decisions and Invariants

- Canonical topology and certified journal remain the only engineering mutation/history authorities.
- Preview/validation remain non-mutating.
- Meshes/render objects remain projections only.
- No automatic support follow, relocation, restation, add, delete, or property mutation is authorized by this PR.
- `SUPPORT_GEOMETRY_POLICY_REQUIRED` is the stable fail-closed disposition for affected support geometry without a certified policy.
- Capability derivation and planners may reject earlier, but the certified session retains the final MOVE_NODE guard.
- Deterministic support dependency evidence is sorted and immutable.

## Validation Ledger

Implementation qualification head: `d6d72148a8a49998b9e93e17e368c812c81eae6a`.

| Workflow | Status |
|---|---|
| main-gate | PASS |
| 3D Edit Sjson Render Authority | PASS |
| 3D Edit SJSON Interaction Authority | PASS |
| 3D Edit R1 Real User Reachability | PASS |
| 3D Edit Tool Audit | PASS |
| 3D Edit SJSON Remount | PASS |
| 3D Edit Selection Foundation | PASS |
| 3D Edit Inline Component Insertion | PASS |
| Topology Edit Table Slice 1 | PASS |
| Topology Edit Table Slice 2 | PASS |
| Topology Edit Table Slice 3 | PASS |
| Topology Edit Table Slice 6 | PASS |
| Topology Edit Table Slice 7 | PASS |
| Topology Edit Table Slice 8 | PASS |
| LAFEA hybrid browser validation | PASS |
| non-fea-input-check-load-calc | PASS |

Focused test intent additionally covers explicit/incident support hosts, ambiguous authority, changed scope, connected run, PIPE length, valve F2F, NODE_POSITION, slope, and exact no-mutation session rejection.

## Evidence Ledger

- Candidate implementation SHA: `d6d72148a8a49998b9e93e17e368c812c81eae6a`.
- Repository fixture/browser evidence is produced by the workflow suites listed above.
- PR metadata at review time: 18 changed files, +658 / -76 before report path cleanup.
- Review state at independent audit: no comments, no submitted reviews, no unresolved review threads.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| Certified support relocation/follow behavior | NOT_APPLICABLE | Deliberately not implemented. |
| Combined post-merge state with PR #1041 | NOT_RUN | #1041 must be re-evaluated after #1036 changes `main`. |
| Support add/delete/property editing | NOT_APPLICABLE | Separate future governed slice. |

## Known / Deferred Work

- Decide certified support movement semantics: fixed global, follow host translation, station-preserving, or explicit relocation.
- Implement support editing only after those semantics and command/journal behavior are separately certified.
- No known production correctness limitation remains inside this PR's stated fail-closed mission.

## Recommended Forward Sequence

1. Close this report custody discrepancy and merge #1036 if GitHub protections remain green.
2. Rebase/re-evaluate PR #1041 against updated `main`; close its catalogue fail-closed review findings before merge.
3. Implement topology-aware TEE/reducer choice derivation.
4. Add full production-browser NODE_POSITION qualification.
5. Only then consider certified SUPPORT editing semantics.
