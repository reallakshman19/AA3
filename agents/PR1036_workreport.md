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
| Report-custody head before this update | `e205a7b57fac360372d1edfc208d3f1601f861ed` |
| Status | DRAFT / reviewed / implementation qualified / closure checks pending |
| Current stage | S4 — merge readiness |
| Last completed stage | S4a — exact-number work-report custody |
| Engineering state | PASS — independent review found no production-code blocker |
| Validation state | PASS on reviewed implementation HEAD; all 16 triggered workflows completed successfully. Report-only head checks must remain GitHub-authoritative for merge. |
| Blocker | None in production code. Merge remains gated by current GitHub check/mergeability state. |
| Next | Verify changed-file ledger, refresh PR body, mark ready, and merge only if current required checks/protections permit it. |

## Handover in 60 Seconds

This PR introduces one shared, pure support geometry dependency authority and routes geometry-changing planners plus the certified `MOVE_NODE` session boundary through it. Supports resolve by `hostEntityId`, `edgeId`, `attachedEdgeId`, or unique incident-edge fallback from `nodeId`. If an affected support depends on moved/affected geometry and no certified relocation policy exists, the operation fails closed with `SUPPORT_GEOMETRY_POLICY_REQUIRED` before canonical mutation or journal change. No support is moved or rewritten. Browser qualification uses support-dependent P-001 as a negative control and unrestrained P-003/TO as a positive MOVE_NODE control. Independent review found no code blocker. The descriptive legacy report has been replaced by this numbered report.

## Mission and Engineering Intent

Preserve the authority flow:

`UI interaction -> governed intent -> operation plan -> candidate/Preview -> validation -> certified transaction -> canonical topology -> journal Undo/Redo -> renderer projection`

The mission prevents support geometry dependencies from being omitted when attachment is represented by edge/component authority rather than only `support.nodeId`. Policy remains conservative: reject parent geometry movement until support movement semantics are separately certified.

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
| Support relocation/follow semantics | DEFERRED | Separate certified support-command policy required |
| CodingRules report custody | COMPLETE | `agents/PR1036_workreport.md` is the sole PR report |

## Engineering Item Register

| ID | Type | Status | Finding / action |
|---|---|---|---|
| ISS-1036-01 | Correctness | RESOLVED | Edge/station-hosted supports could escape geometry dependency custody when direct node linkage did not expose affected geometry. Shared authority + session backstop closes it. |
| DEC-1036-01 | Architecture | ACCEPTED | Support movement remains unsupported; affected parent geometry changes fail closed rather than auto-following/restationing supports. |
| DEC-1036-02 | Architecture | ACCEPTED | Certified session is final backstop for every `MOVE_NODE`; planner/capability guards remain earlier truthfulness layers. |
| RISK-1036-01 | Process custody | RESOLVED | Legacy descriptive report was nonconforming; replaced with this exact-number report and obsolete file removed. |
| RISK-1036-02 | Integration | OPEN UNTIL #1041 MERGE | #1041 was originally qualified on the same older base. After #1036 lands, #1041 must be re-evaluated against new `main`. |

## Stage Roadmap and Protocol

### S1 — Architecture impact and dependency semantics — COMPLETE

**Pre-stage truth:** renderer support hosting could use explicit edge/component identity while geometry custody was primarily node-oriented.

**Objective:** one reusable dependency authority, deterministic immutable evidence, no planner-specific support mutation.

**Actual:** shared support dependency resolution reused by planners, changed-scope, capability authority and certified session.

**Decision:** COMPLETE.

### S2 — Production integration — COMPLETE

**Files/areas:** route/slope/change-scope, Table NODE_POSITION capability/planner, editor capability, certified session.

**Edge cases:** direct node dependency, explicit host, incident fallback, ambiguous affected host, unrelated support, split edge, connected run, valve F2F, PIPE-length propagation, declared slope.

**Actual:** unsupported affected supports fail before command/journal mutation; unrelated supports do not block; no second Undo/support write path introduced.

**Decision:** COMPLETE.

### S3 — Qualification — COMPLETE

**Objective:** prove negative/positive controls through repository production-browser paths and focused tests.

**Actual:** implementation head `d6d72148...` has all 16 triggered workflows completed successfully; browser suites prove P-001 blocked/no mutation and P-003/TO successful MOVE_NODE/Undo/Redo behavior.

**Decision:** COMPLETE.

### S4 — Closure and merge custody — COMPLETE EXCEPT MERGE ACTION

**Current truth:** independent code review found no production blocker, no comments, no submitted reviews, and no unresolved review threads. Required work-report naming/structure has been corrected and obsolete report removed.

**Actual behavior:** production code remained unchanged during report custody repair.

**Validation:** implementation qualification remains PASS on `d6d72148...`; current report-only branch checks are to be read from GitHub before merge.

**Remaining risk:** GitHub mergeability/required checks can change with base/head state.

**Stage decision:** COMPLETE; merge action is permitted only if current GitHub protections are satisfied.

## Next-Agent Handover

1. Verify changed files match the ledger exactly.
2. Verify no new review/comment/thread appeared.
3. Mark draft PR ready for review.
4. Re-fetch PR metadata/checks and merge with `expected_head_sha`; do not bypass protection.
5. Re-evaluate #1041 after `main` changes.

## Changed-File Ledger

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

Any discrepancy is a closure blocker until documented.

## Decisions and Invariants

- Canonical topology and certified journal remain the only engineering mutation/history authorities.
- Preview/validation remain non-mutating; meshes remain projections only.
- No support follow, relocation, restation, add/delete/property mutation is authorized.
- `SUPPORT_GEOMETRY_POLICY_REQUIRED` is the stable fail-closed disposition.
- Capability/planner checks may reject earlier; certified session retains final MOVE_NODE guard.
- Dependency evidence is deterministic, sorted and immutable.

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

Focused test intent covers explicit/incident hosts, ambiguous authority, changed scope, connected run, PIPE length, valve F2F, NODE_POSITION, slope, and no-mutation session rejection.

## Evidence Ledger

- Reviewed implementation SHA: `d6d72148a8a49998b9e93e17e368c812c81eae6a`.
- Report-custody branch head before this report update: `e205a7b57fac360372d1edfc208d3f1601f861ed`.
- Review state: no comments, no submitted reviews, no unresolved review threads.
- Browser/fixture evidence is produced by the successful workflow suites above.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| Certified support relocation/follow | NOT_APPLICABLE | Deliberately not implemented. |
| Combined post-merge state with PR #1041 | NOT_RUN | Must be checked after #1036 changes main. |
| Support add/delete/property editing | NOT_APPLICABLE | Future governed slice. |

## Known / Deferred Work

- Decide certified support movement semantics: fixed global, host-follow translation, station-preserving, or explicit relocation.
- Implement support editing only after command/journal semantics are separately certified.
- No known production correctness limitation remains inside this PR's stated fail-closed mission.

## Recommended Forward Sequence

1. Merge #1036 if current protections are green.
2. Re-evaluate/fix/requalify #1041 against updated main, then merge.
3. Implement topology-aware TEE/reducer choice derivation.
4. Add production-browser NODE_POSITION qualification.
5. Only then design certified SUPPORT editing.
