# PR 1051 Work Report — Topology-Aware Engineering Table TEE / Reducer Selection

## PR Mission Control

| Field | Current truth |
|---|---|
| Mission | Make M10 TEE/reducer UI choices truthful to canonical topology so every presented reducer is directly connected to the selected TEE branch node, exactly catalogued, oriented deterministically, and size-compatible with the staged relationship. |
| Source | User-directed PR3 after merged support-dependency #1036 and certified valve-catalogue #1041; governed by `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md`. |
| PR | #1051 — `fix(3d-edit): make Engineering Table TEE reducer choices topology-aware` |
| Branch | `agent/topology-aware-tee-reducer-selection` |
| Base | `main@271d04fa2674ab68367808d05f2429ec5e236a6e` |
| Bootstrap HEAD | `36ba9966b8cb2b82972bbd457a7da7ebc8e0f3fa` (empty tree-equivalent commit; no source diff) |
| Status | DRAFT / architecture frozen before implementation |
| Current stage | S1 — capability contract and exact candidate derivation |
| Last completed stage | S0 — predecessor review/merge custody (#1036, #1041) |
| Engineering state | DESIGN READY; no production source changed yet |
| Validation state | NOT_RUN for this PR |
| Blocker | None; implementation must preserve the already-certified M10 command and journal path. |
| Next | Implement one pure Table TEE/reducer capability authority, wire editor/runtime transient behavior, add focused + production-path tests, then qualify under the repository's current post-#1043 mechanism. |

## Handover in 60 Seconds

Current M10 command authority is already correct and fail-closed. `assertTopologyEditJunctionRelationTarget()` requires an exact TEE, exact branch node/port, exact two run nodes, a canonical REDUCER edge directly incident to the selected branch node, matching catalogue record hash, deterministic reducer endpoint orientation, unequal reducer sizes, and exact tee-branch/downstream size agreement. The defect is upstream: `teeReducerEditor()` currently lists every exact-custody reducer in the projection before a branch is selected, so the UI can advertise options the command will reject. PR #1051 will add a pure candidate/capability module based only on immutable Table projection identity (`nodeIds`, endpoint `portBindings`, exact catalogue custody), use it to constrain reducer choices by selected branch, and keep Stage disabled until the selected branch/reducer/DNs form a representable M10 relation. No canonical mutation, command change, second topology interpretation, or inferred orientation is authorized.

## Mission and Engineering Intent

Mandatory flow remains:

`canonical TEE row -> explicit branch-port selection -> exact branch node -> directly incident exact-catalogue reducer candidates -> deterministic endpoint orientation/size evidence -> explicit DN fields -> representability gate -> governed TEE_REDUCER_RELATION intent -> operation plan -> Preview -> validation -> certified transaction -> canonical topology -> journal Undo/Redo`

The UI may hold transient branch/reducer/DN draft values only. It must not write topology, synthesize catalogue records, or infer a branch role from geometry. The existing M10 normalizer/target assertion remains the final engineering authority.

## Mission Status

| Item | Status |
|---|---|
| Existing M10 command direct-connectivity/custody checks audited | COMPLETE |
| Table projection endpoint/node identity audited | COMPLETE |
| Pure topology-aware reducer candidate authority | PENDING |
| Deterministic reducer orientation evidence | PENDING |
| Branch-selection-constrained reducer selector | PENDING |
| Stage disabled until representable relation | PENDING |
| Runtime final re-resolution before intent construction | PENDING |
| Focused unit coverage | PENDING |
| Production browser/UI-path coverage | PENDING |
| Canonical/journal/Preview invariants | MUST REMAIN UNCHANGED |

## Engineering Item Register

| ID | Type | Status | Finding / action |
|---|---|---|---|
| ISS-1051-01 | UI truthfulness | OPEN | `teeReducerEditor()` currently filters only `elementType=REDUCER`, canonical EDGE, and exact catalogue custody, then presents reducers independent of selected TEE branch connectivity. |
| DEC-1051-01 | Architecture | ACCEPTED | Do not change `topology-edit-junction-relation-command.js`; it is already the certified final M10 authority. |
| DEC-1051-02 | Identity | ACCEPTED | Use Table projection `TEE.identity.portBindings` to resolve branch port -> exact node, and reducer endpoint-specific `identity.portBindings` to resolve direct incidence/orientation. Do not use geometric proximity. |
| DEC-1051-03 | Candidate policy | ACCEPTED | Reducer candidate must be canonical EDGE, `REDUCER`, directly incident to selected branch node at exactly one endpoint, exact catalogue custody, finite positive endpoint DNs, and unequal-bore. |
| DEC-1051-04 | Ordering | ACCEPTED | Candidate ordering/tie behavior is deterministic by canonical reducer ID; no traversal-order authority. |
| DEC-1051-05 | Stage gate | ACCEPTED | Stage remains disabled until branch binding, exact candidate reducer, positive run/branch/downstream DN, and candidate-oriented branch/downstream sizes all match. Runtime revalidates instead of trusting disabled UI state. |
| RISK-1051-01 | UI draft preservation | OPEN | Dynamic branch changes must not accidentally reset typed DN fields or mutate staged/canonical state. Prefer narrow transient/imperative select updates or a small explicit draft contract; avoid full model rerender solely to filter options. |
| RISK-1051-02 | Source line budget | OPEN | Existing viewport runtime modules are near/over repository line-budget thresholds. Prefer a new <300-line pure capability module and minimal wiring; do not grow monolithic files unnecessarily. |
| RISK-1051-03 | Qualification mechanism | OPEN | PR #1043 retired older topology-edit workflows. This PR must identify/use the repository's current qualification mechanism; no retired workflow restoration or guard weakening. |

## Stage Roadmap and Protocol

### S0 — Predecessor custody — COMPLETE

**Truth:** P0 support dependency closure #1036 merged as `304f6ff32a0f383cd92793b1c57d7d99d61b4152`; certified valve catalogue #1041 merged as `271d04fa2674ab68367808d05f2429ec5e236a6e`.

**Decision:** PR1051 starts from the combined main state; no stacked old-base assumption.

### S1 — Pure topology-aware candidate/capability authority — IN PROGRESS

**Pre-stage truth:** Table projection already contains enough immutable identity: TEE branch candidates as exact port bindings; every edge row has canonical endpoint nodes plus `FROM`/`TO` port bindings; reducer custody exposes exact catalogue identity and projected endpoint DNs.

**Objective:** centralize UI representability instead of duplicating ad hoc filters in editor/runtime.

**Planned API shape:**

- `topologyEditTableTeeBranchBindings(row)` -> deterministic exact TEE branch-port choices.
- `topologyEditTableTeeReducerCandidates({ projection, row, branchPortKey })` -> frozen deterministic candidates carrying reducer canonical ID, branch node, branch endpoint (`FROM|TO`), branch-side DN, downstream DN, catalogue record/hash evidence.
- `deriveTopologyEditTableTeeReducerCapability({...})` -> `AVAILABLE|UNREPRESENTABLE` with stable reason/details for exact selected branch/reducer/DN relationship.
- optional exact resolver used by runtime immediately before intent construction.

**Fail-closed rules:** ambiguous/missing branch binding; no exact incident reducer; reducer incident at zero or both endpoints; missing exact catalogue; unresolved/non-positive/equal endpoint sizes; selected reducer not in current candidate set; supplied branch/downstream DN mismatch.

**Expected:** every reducer visible for a selected branch is command-representable at the topology/custody/orientation layer.

### S2 — Editor/runtime wiring — PENDING

**Objective:** branch first, then constrained reducer; no pre-branch all-reducer list.

**Expected UI:**
- branch selector contains deterministic exact TEE port bindings;
- reducer selector is disabled/empty until a branch is selected;
- selecting/changing branch refreshes only its reducer choices and clears incompatible reducer selection;
- candidate label includes canonical/tag identity plus oriented `DN branch -> downstream` evidence;
- Stage button disabled until `derive...Capability()` is `AVAILABLE` for current values;
- runtime exact-resolves current branch/reducer capability again before creating the existing `TEE_REDUCER_RELATION` intent.

**Transient rule:** branch/reducer form interaction changes no canonical hash, no journal hash, no staged batch until explicit Stage.

### S3 — Focused qualification — PENDING

Required tests:
- no branch selected -> no reducer candidates;
- selected branch resolves exact node;
- only directly incident REDUCER appears;
- unrelated exact reducer excluded;
- non-REDUCER edge excluded;
- non-exact catalogue reducer excluded;
- degenerate/ambiguous incidence rejected;
- unresolved/zero/equal-bore reducer excluded;
- FROM orientation maps `dnIn -> branch`, `dnOut -> downstream`;
- TO orientation maps `dnOut -> branch`, `dnIn -> downstream`;
- deterministic candidate ordering;
- candidate mismatch disables/rejects Stage;
- matching branch/reducer/DNs creates the same normalized M10 intent authority as before;
- branch change clears previously incompatible reducer choice without canonical mutation.

### S4 — Production user-path qualification — PENDING

Use repository-owned fixture/current browser qualification mechanism. Full path:

`Table -> select TEE -> choose branch port -> verify reducer list narrows -> choose exact incident reducer -> enter DNs -> Stage -> Preview -> Validate -> Apply -> Undo -> Redo`.

Evidence assertions:
- pre-branch unrelated reducers not selectable;
- Stage disabled until exact representability;
- branch/reducer input and Stage/Preview/Validate do not mutate canonical topology;
- Apply writes only the certified junction relation via existing command/journal;
- reducer/source/catalogue authority unchanged;
- Undo restores exact prior canonical + journal hashes; Redo restores exact applied hashes;
- stale target/reducer revision rebase remains fail-closed through existing Table batch authority.

No direct controller-only test is sufficient as UI proof.

## Next-Agent Handover

1. Read this report before source modification; register any new issue/risk here first.
2. Implement the pure Table capability module before editor-specific filtering.
3. Keep M10 command/transaction/journal modules untouched unless a newly proven command defect is recorded first.
4. Minimize wiring changes and respect physical line limits.
5. Update this report after each stage with actual behavior/evidence.
6. Identify the current post-#1043 browser qualification mechanism rather than restoring retired CI.

## Changed-File Ledger

Expected implementation scope; revise this ledger before introducing any additional path:

- `agents/PR1051_workreport.md`
- `src/workspace/topology-edit/table/topology-edit-table-tee-reducer.js` (new)
- `src/workspace/viewport-productivity/topology-edit-table-engineering-editor.js`
- `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
- one minimal existing UI event/wiring module only if required after line-budget review
- `tests/topology-edit-table-tee-reducer.test.mjs` (new)
- `tests/topology-edit-table-engineering-editor.test.mjs`
- one production E2E Table qualification spec if the current repository mechanism supports it

Explicitly excluded unless a new recorded finding proves necessity:
- `src/workspace/topology-edit/topology-edit-junction-relation-command.js`
- canonical topology mutation modules
- journal/Undo/Redo modules
- catalogue loaders/authorities
- validation worker protocol

## Decisions and Invariants

- Canonical topology remains sole engineering state authority; Three/DOM are projections/interactions only.
- Existing M10 command remains final connectivity/size/catalogue target authority.
- Table projection identity is reused; no geometric nearest-neighbour branch/reducer matching.
- No candidate is presented if its orientation or exact catalogue custody is unresolved.
- UI draft changes are non-mutating and do not create journal entries.
- Stage creates at most one governed intent for the selected TEE; Apply remains one certified transaction.
- No hidden/default branch role, reducer orientation, or catalogue substitution.
- Deterministic ordering by stable canonical IDs.

## Validation Ledger

| Candidate | Validation |
|---|---|
| `main@271d04fa2674ab68367808d05f2429ec5e236a6e` | Pre-change architectural audit only |
| `36ba9966b8cb2b82972bbd457a7da7ebc8e0f3fa` | Empty bootstrap commit; zero changed files |
| PR1051 implementation candidate | NOT_RUN |

## Evidence Ledger

- Current editor evidence: `teeReducerEditor()` enumerates all exact-custody reducer EDGE rows before considering selected branch connectivity.
- Table projection evidence: edge rows include endpoint-specific `portBindings`; junction rows include exact multipoint bindings and node IDs.
- M10 command evidence: `assertTopologyEditJunctionRelationTarget()` already requires reducer direct incidence, exact record hash custody, endpoint-oriented size equality, and non-no-op relation.
- PR1051 opened with zero changed files specifically so this numbered report precedes implementation source changes.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| New candidate derivation | NOT_RUN | Not implemented yet. |
| Dynamic UI filtering | NOT_RUN | Not implemented yet. |
| Production Chromium | NOT_RUN | Qualification mechanism to be identified after implementation; old workflows retired by #1043. |
| M10 command changes | NOT_APPLICABLE | Explicitly out of scope; existing command retained. |

## Known / Deferred Work

- Full NODE_POSITION production-browser qualification remains the next planned independent slice after PR1051.
- Certified SUPPORT editing/movement semantics remain deferred.
- Generalized catalogue authoring/ingestion remains out of scope.
- PR1051 does not broaden M10 beyond explicit TEE + directly connected reducer relation editing.

## Recommended Forward Sequence

1. Complete PR1051 topology-aware TEE/reducer capability + UI + qualification.
2. Open separate NODE_POSITION browser-qualification PR covering NODE_ONLY, CONNECTED_RUN, stale concurrency, exact Undo/Redo hashes.
3. Only afterward consider certified support editing semantics.
