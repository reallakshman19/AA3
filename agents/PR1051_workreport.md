# PR 1051 Work Report — Topology-Aware Engineering Table TEE / Reducer Selection

## PR Mission Control

| Field | Current truth |
|---|---|
| Mission | Make M10 TEE/reducer UI choices truthful to canonical topology so every presented reducer is directly connected to the selected TEE branch node, exactly catalogued, deterministically oriented, and size-compatible with the staged relationship. |
| Source | User-directed PR3 after merged support-dependency #1036 and certified valve-catalogue #1041; governed by `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md`. |
| PR | #1051 — `fix(3d-edit): make Engineering Table TEE reducer choices topology-aware` |
| Branch | `agent/topology-aware-tee-reducer-selection` |
| Base | `main@271d04fa2674ab68367808d05f2429ec5e236a6e` |
| Bootstrap HEAD | `36ba9966b8cb2b82972bbd457a7da7ebc8e0f3fa` (empty tree-equivalent commit; no source diff) |
| Current implementation/test head before browser assertions | `bfbcbb1b9f88d7a7f709c6355e5a9168adac1f07` |
| Status | DRAFT / implementation complete through focused test authoring / qualification in progress |
| Current stage | S3 — focused + production-path qualification |
| Last completed stage | S2 — editor/runtime topology-aware wiring |
| Engineering state | PASS on implementation review; existing M10 command/journal authority untouched |
| Validation state | Tests authored; repository no longer has `.github/workflows` after #1043, so exact execution mechanism must be recorded honestly |
| Blocker | Empirical execution evidence is not yet available in this agent environment; source/browser assertions still require final audit and current-head custody. |
| Next | Update existing Q3/authority Playwright assertions for dynamic filtering, audit line budgets/syntax surfaces, synchronize ledger, then decide merge readiness without claiming unrun checks. |

## Handover in 60 Seconds

Current M10 command authority was already correct and remains unchanged. `assertTopologyEditJunctionRelationTarget()` requires an exact TEE, exact branch node/port, exact two run nodes, canonical REDUCER directly incident to that branch node, matching catalogue record-hash custody, endpoint-oriented size equality, unequal reducer sizes, and non-no-op relation. PR1051 fixes only the upstream UI/capability mismatch.

A new pure Table module now resolves branch bindings and returns only reducer rows that are canonical REDUCER edges, directly incident at exactly one selected branch endpoint, exact-catalogue, positive finite unequal-bore, and reducing away from the branch. It exposes deterministic `FROM|TO` orientation plus branch/downstream DN evidence. The editor starts with no reducer choices until a branch is explicit, dynamically rewrites only the reducer select when branch input changes, preserves typed DN fields, disables Stage until the exact relation is representable, and the runtime re-resolves that capability immediately before constructing the existing governed `TEE_REDUCER_RELATION` intent.

Focused tests now cover exact branch identity, direct incidence, both FROM and TO orientation, unrelated/unresolved/equal-bore/expanding exclusions, DN mismatch, and editor pre-branch/staged behavior. Production browser assertions will be added to the existing `topology-edit-table-authority.spec.js` and `topology-edit-table-q3-concurrency.spec.js`; the latter already owns full M04/M06/M10 Preview/Validate/Apply/Undo/Redo qualification.

## Mission and Engineering Intent

Mandatory flow remains:

`canonical TEE row -> explicit branch-port selection -> exact branch node -> directly incident exact-catalogue reducer candidates -> deterministic endpoint orientation/size evidence -> explicit DN fields -> representability gate -> governed TEE_REDUCER_RELATION intent -> operation plan -> Preview -> validation -> certified transaction -> canonical topology -> journal Undo/Redo`

The UI holds transient branch/reducer/DN draft values only. It does not write topology, synthesize catalogue records, or infer branch role from geometry. The existing M10 normalizer/target assertion remains the final engineering authority.

## Mission Status

| Item | Status |
|---|---|
| Existing M10 command direct-connectivity/custody checks audited | COMPLETE |
| Table projection endpoint/node identity audited | COMPLETE |
| Pure topology-aware reducer candidate authority | COMPLETE |
| Deterministic reducer orientation evidence | COMPLETE |
| Branch-selection-constrained reducer selector | COMPLETE |
| Stage disabled until representable relation | COMPLETE |
| Runtime final re-resolution before intent construction | COMPLETE |
| Focused unit coverage authored | COMPLETE |
| Existing production browser assertions updated | PENDING |
| Empirical exact-head execution | PENDING / environment-mechanism limitation under review |
| Canonical/journal/Preview invariants | UNCHANGED BY IMPLEMENTATION |

## Engineering Item Register

| ID | Type | Status | Finding / action |
|---|---|---|---|
| ISS-1051-01 | UI truthfulness | RESOLVED | Old editor enumerated every exact-custody reducer independent of selected branch. It now presents no reducers pre-branch and only current branch candidates afterward. |
| DEC-1051-01 | Architecture | ACCEPTED | `topology-edit-junction-relation-command.js` remains unchanged as certified final M10 authority. |
| DEC-1051-02 | Identity | ACCEPTED | Table projection `TEE.identity.portBindings` resolves branch port -> exact node; reducer endpoint-specific `identity.portBindings` resolves incidence/orientation. No geometric proximity. |
| DEC-1051-03 | Candidate policy | ACCEPTED | Candidate must be canonical EDGE REDUCER, directly incident at exactly one selected branch endpoint, exact catalogue custody, finite positive endpoint DNs, unequal-bore, and a reduction away from the branch. |
| DEC-1051-04 | Ordering | ACCEPTED | Deterministic canonical reducer-ID ordering; no traversal-order authority. |
| DEC-1051-05 | Stage gate | ACCEPTED | Stage disabled until exact branch binding, candidate reducer, positive run/branch/downstream DN, and oriented branch/downstream size equality. Runtime revalidates before intent creation. |
| RISK-1051-01 | UI draft preservation | RESOLVED | Branch input imperatively replaces only reducer `<option>` children and capability state; DN input values are not rerendered/reset and no batch/canonical mutation occurs. |
| RISK-1051-02 | Source line budget | MITIGATED / FINAL CHECK PENDING | New pure capability module is intentionally small; Table runtime class is untouched; wiring is confined to existing delegated cell-input and engineering-runtime/editor modules. |
| RISK-1051-03 | Qualification mechanism | OPEN | `.github/workflows` is absent on current main after #1043. Existing repository Playwright specs remain authoritative source tests but this connected-agent environment has no local checkout/network clone path. No retired workflow will be restored and no unrun browser result will be claimed. |
| DEC-1051-06 | Browser reuse | ACCEPTED | Reuse existing `e2e/topology-edit-table-authority.spec.js` for pre-branch UI truthfulness and `e2e/topology-edit-table-q3-concurrency.spec.js` for branch narrowing plus full M10 Preview/Validate/Apply/Undo/Redo; no duplicate E2E harness. |

## Stage Roadmap and Protocol

### S0 — Predecessor custody — COMPLETE

P0 #1036 merged as `304f6ff32a0f383cd92793b1c57d7d99d61b4152`; certified valve selector #1041 merged as `271d04fa2674ab68367808d05f2429ec5e236a6e`. PR1051 starts from that combined main state.

### S1 — Pure topology-aware candidate/capability authority — COMPLETE

**Implemented module:** `src/workspace/topology-edit/table/topology-edit-table-tee-reducer.js`.

APIs:
- `topologyEditTableTeeBranchBindings(row)` — deterministic unique exact TEE branch-port bindings.
- `topologyEditTableTeeReducerCandidates({ projection, row, branchPortKey })` — frozen candidates carrying canonical reducer ID/revision, branch node/port, `FROM|TO` branch endpoint, oriented branch/downstream DNs, and record ID/hash evidence.
- `deriveTopologyEditTableTeeReducerCapability({...})` — `AVAILABLE|UNREPRESENTABLE` stable representability result.
- `resolveTopologyEditTableTeeReducerSelection()` — exact fail-closed runtime resolver.

Fail-closed rules implemented: missing/ambiguous branch binding; non-REDUCER/non-EDGE; no exact catalogue evidence; missing/ambiguous endpoint bindings; zero/both-endpoint incidence; unresolved/non-positive/equal endpoint sizes; expansion away from branch; selected reducer not in current branch candidate set; non-positive supplied DNs; branch/downstream DN mismatch.

**Decision:** COMPLETE.

### S2 — Editor/runtime wiring — COMPLETE

`teeReducerEditor()` now:
- renders exact TEE branch choices;
- renders reducer select disabled/empty before branch selection;
- derives only current branch reducer candidates;
- includes oriented `DN branch -> downstream` evidence in labels;
- derives current representability and disables Stage with a reason until `AVAILABLE`.

`handleTopologyEditTableEngineeringInput()` is called through the existing delegated Table cell-input handler. On branch input it replaces only reducer options, clearing an incompatible prior reducer; on branch/reducer/DN input it refreshes Stage capability state without model rerender.

`stageTopologyEditTeeReducerRelation()` re-resolves exact current capability and constructs the same existing `TEE_REDUCER_RELATION` intent from certified details. No command, planner, Preview, validation, transaction, canonical mutation, or journal module changed.

**Decision:** COMPLETE.

### S3 — Focused qualification — IN PROGRESS

Authored tests:
- `tests/topology-edit-table-tee-reducer.test.mjs`: exact branch bindings; direct FROM and TO reducer orientation; unrelated reducer excluded; unresolved catalogue excluded; equal-bore excluded; expansion-away excluded; available relation details; wrong reducer/DNs fail closed.
- `tests/topology-edit-table-engineering-editor.test.mjs`: pre-branch reducer select has no candidates and Stage disabled; staged exact branch exposes only directly connected exact reducer with oriented size label and enabled certified state.

Production assertions planned before editing those files:
- `e2e/topology-edit-table-authority.spec.js`: exact TEE branch choices visible; reducer list empty/disabled pre-branch; Stage disabled pre-representability.
- `e2e/topology-edit-table-q3-concurrency.spec.js`: reducer list empty pre-branch; selecting fixture-certified branch narrows list to exact directly incident reducer; Stage stays disabled until matching DN relationship; existing full three-intent Preview/Validate/Apply/Undo/Redo remains intact.

### S4 — Production user-path qualification — PENDING EXECUTION

Repository-owned source path remains:

`Table -> select TEE -> choose branch port -> reducer list narrows -> choose exact incident reducer -> enter DNs -> Stage -> Preview -> Validate -> Apply -> Undo -> Redo`.

The existing Q3 spec already verifies canonical hash unchanged through Preview, READY_TO_APPLY validation, exact engineering results after Apply, source/opaque custody preservation, singular renderer, Undo canonical restoration, and Redo applied-hash restoration.

Execution caveat: current main has no `.github/workflows` directory after #1043, and this agent has no local repository checkout and no working network clone path. This report will distinguish authored source qualification from actually executed evidence.

## Next-Agent Handover

1. Update the two registered existing Playwright specs only; do not create a parallel harness.
2. Audit changed-file ledger and source line budgets.
3. Check current PR/base mergeability and review surfaces.
4. If no execution mechanism becomes available, do not claim PASS; record `NOT_RUN` precisely and leave merge decision tied to engineering review + repository policy rather than fabricated CI.
5. Keep M10 command/transaction/journal untouched.
6. After PR1051 closure, continue with separate NODE_POSITION browser-qualification slice.

## Changed-File Ledger

Authorized scope:

- `agents/PR1051_workreport.md`
- `src/workspace/topology-edit/table/topology-edit-table-tee-reducer.js` (new)
- `src/workspace/viewport-productivity/topology-edit-table-engineering-editor.js`
- `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
- `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
- `tests/topology-edit-table-tee-reducer.test.mjs` (new)
- `tests/topology-edit-table-engineering-editor.test.mjs`
- `e2e/topology-edit-table-authority.spec.js`
- `e2e/topology-edit-table-q3-concurrency.spec.js`

Any additional path must be registered here before modification.

Explicitly excluded unless a newly recorded finding proves necessity:
- `src/workspace/topology-edit/topology-edit-junction-relation-command.js`
- canonical topology mutation modules
- journal/Undo/Redo modules
- catalogue loaders/authorities
- validation worker protocol
- retired `.github/workflows`

## Decisions and Invariants

- Canonical topology remains sole engineering state authority; Three/DOM are projections/interactions only.
- Existing M10 command remains final connectivity/size/catalogue target authority.
- Table projection identity is reused; no geometric nearest-neighbour branch/reducer matching.
- No candidate is presented if orientation, reduction direction, endpoint size, or exact catalogue custody is unresolved.
- UI draft changes are non-mutating and do not create journal entries.
- Stage creates at most one governed intent for the selected TEE; Apply remains one certified transaction.
- No hidden/default branch role, reducer orientation, or catalogue substitution.
- Deterministic ordering by stable canonical IDs.
- No workflow restoration/guard weakening to manufacture qualification evidence.

## Validation Ledger

| Candidate | Validation |
|---|---|
| `main@271d04fa2674ab68367808d05f2429ec5e236a6e` | Pre-change architectural audit only |
| `36ba9966b8cb2b82972bbd457a7da7ebc8e0f3fa` | Empty bootstrap commit; zero changed files |
| `bfbcbb1b9f88d7a7f709c6355e5a9168adac1f07` | Pure capability + editor/runtime wiring + focused test source authored; empirical execution NOT_RUN |
| Final PR1051 head | PENDING |

## Evidence Ledger

- Old editor defect: all exact-custody reducers were enumerated before branch connectivity was considered.
- Projection identity: edge rows carry endpoint-specific `FROM`/`TO` bindings; TEE rows carry exact multipoint port/node bindings.
- M10 command: direct incidence, exact record-hash custody, oriented branch/downstream equality, unequal-bore and non-no-op are already enforced.
- New candidate module mirrors only representability needed to make UI choices truthful and does not mutate/replace command authority.
- PR1051 report preceded all production source changes.
- Current main has no `.github/workflows` directory; `fetch_commit_workflow_runs` returns no run for current PR head.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| Focused Node tests execution | NOT_RUN | No local checkout/runtime available through connected agent. |
| Production Chromium execution | NOT_RUN | Existing Playwright specs are source-authoritative, but current workflow infrastructure was retired and local clone unavailable. |
| M10 command changes | NOT_APPLICABLE | Explicitly out of scope; existing command retained. |

## Known / Deferred Work

- Full NODE_POSITION production-browser qualification remains the next planned independent slice after PR1051.
- Certified SUPPORT editing/movement semantics remain deferred.
- Generalized catalogue authoring/ingestion remains out of scope.
- PR1051 does not broaden M10 beyond explicit TEE + directly connected reducer relation editing.

## Recommended Forward Sequence

1. Finish PR1051 browser assertions + static audit + report sync.
2. Close/merge only under truthful evidence and current repository policy.
3. Open separate NODE_POSITION browser-qualification PR covering NODE_ONLY, CONNECTED_RUN, stale concurrency, exact Undo/Redo hashes.
4. Only afterward consider certified support editing semantics.
