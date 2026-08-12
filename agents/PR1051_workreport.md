# PR 1051 Work Report — Topology-Aware Engineering Table TEE / Reducer Selection

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1051 — `fix(3d-edit): make Engineering Table TEE reducer choices topology-aware` |
| Branch | `agent/topology-aware-tee-reducer-selection` |
| Base | `main@271d04fa2674ab68367808d05f2429ec5e236a6e` |
| Rules | `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md` |
| Mission | Present only M10 reducer choices that the existing certified command can actually represent for the explicitly selected TEE branch. |
| Status | DRAFT — implementation complete; qualification/audit in progress |
| Current stage | S3 focused + production-path qualification |
| Empirical CI | NOT_RUN on final head; `.github/workflows` was retired by #1043 and this agent has no local checkout/network clone path |

## Required Architecture

`canonical TEE row -> explicit branch port -> exact branch node -> directly incident exact-catalogue reducer -> oriented size evidence -> governed TEE_REDUCER_RELATION intent -> plan -> Preview -> validation -> certified transaction -> canonical topology -> existing journal Undo/Redo`

No M10 command change, direct canonical write, alternate topology authority, catalogue synthesis, inferred branch role, Table-owned history, or mutation during Preview/Validate is authorized.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| ISS-1051-01 | UI truthfulness | RESOLVED | Old editor listed all exact-custody reducers before branch selection. New editor lists none pre-branch and only selected-branch candidates afterward. |
| DEC-1051-01 | Command authority | ACCEPTED | `topology-edit-junction-relation-command.js` remains unchanged and final. |
| DEC-1051-02 | Identity | ACCEPTED | TEE branch authority comes from `TEE.identity.portBindings`; reducer incidence/orientation comes from endpoint-specific `FROM`/`TO` Table bindings. No geometry proximity. |
| DEC-1051-03 | Candidate policy | ACCEPTED | Candidate must be canonical EDGE + REDUCER, incident at exactly one selected branch endpoint, exact-catalogue, positive finite unequal-bore, and reducing away from the branch. |
| DEC-1051-04 | Stage gate | ACCEPTED | Stage is disabled until branch/reducer/run DN/branch DN/downstream DN form an exact representable relation; runtime re-resolves before intent construction. |
| RISK-1051-01 | Draft preservation | RESOLVED | Branch input updates only reducer options/capability DOM state; typed DN fields and canonical/staged state are not rerendered or mutated. |
| RISK-1051-02 | Line budget | PASS STATIC CHECK | All touched production modules return no content at lines 300–305, satisfying the repository `<300` physical-line gate. |
| RISK-1051-03 | Qualification mechanism | OPEN | Current main has no `.github/workflows`; source tests remain, but exact-head execution is unavailable in this connected-agent environment. Do not claim unrun PASS. |
| ISS-1051-02 | Test fixture authority | RESOLVED | Shared `engineeringEditorFixture()` no longer defines pre-branch expected reducers as every exact reducer. It now reports zero pre-branch reducers and derives branch-specific eligible reducer cases. |
| DEC-1051-05 | Browser source coverage | ACCEPTED | Add one small `e2e/topology-edit-table-tee-reducer.spec.js` that reuses the existing Q3 engineering fixture to prove live branch narrowing, Stage gating, and pre-Stage non-mutation. Existing Q3 concurrency spec remains the full Apply/Undo/Redo authority. |

## S0 — Predecessor Custody — COMPLETE

- #1036 merged as `304f6ff32a0f383cd92793b1c57d7d99d61b4152`.
- #1041 merged as `271d04fa2674ab68367808d05f2429ec5e236a6e`.
- PR1051 began from that combined main state with an empty bootstrap commit before production changes.

## S1 — Pure Candidate / Capability Authority — COMPLETE

New `src/workspace/topology-edit/table/topology-edit-table-tee-reducer.js` provides deterministic branch bindings, branch-scoped reducer candidates, a representability capability, an exact runtime resolver, and labels carrying branch endpoint plus `DN branch -> downstream` evidence.

Fail-closed cases: missing/ambiguous branch binding; non-REDUCER/non-EDGE; missing exact catalogue custody; missing/ambiguous endpoints; zero/both-endpoint incidence; unresolved/non-positive/equal-bore sizes; expansion away from branch; selected reducer outside current candidate set; invalid supplied DNs; oriented branch/downstream DN mismatch.

## S2 — Editor / Runtime Wiring — COMPLETE

- Reducer selector empty/disabled until branch selection.
- Branch selection derives current candidates only.
- Branch changes clear an incompatible reducer without resetting typed DNs.
- Stage button reflects capability status/reason.
- `stageTopologyEditTeeReducerRelation()` re-resolves the current capability before creating the existing M10 intent.
- M10 command/planner/Preview/validation/transaction/canonical/journal modules are unchanged.

## S3 — Focused Qualification — IN PROGRESS

Authored unit coverage:

- `tests/topology-edit-table-tee-reducer.test.mjs`: exact branch identity, direct incidence, FROM/TO orientation, unrelated/unresolved/equal-bore/expansion exclusions, DN mismatch and exact selection details.
- `tests/topology-edit-table-engineering-editor.test.mjs`: no pre-branch reducer option + disabled Stage; staged exact branch exposes only the direct reducer with oriented label and available capability.

Production source coverage:

- `e2e/helpers/topology-edit-table-engineering-fixture.js`: pre-branch expectation corrected and branch-specific eligible reducer cases derived from exact projection identity/custody.
- `e2e/topology-edit-table-tee-reducer.spec.js`: authorized new focused spec; must prove no pre-branch reducer, branch-scoped options, Stage disabled until exact DNs, no canonical/batch mutation before Stage, then one governed staged batch.
- existing `e2e/topology-edit-table-q3-concurrency.spec.js`: unchanged full M04/M06/M10 Stage -> Preview -> Validate -> Apply -> Undo -> Redo path.
- existing `e2e/topology-edit-table-authority.spec.js`: unchanged source test now expects zero pre-branch reducer IDs through the corrected helper.

## S4 — Production Browser Qualification — PENDING EXECUTION

Required source path:

`Table -> select TEE -> reducer disabled/empty -> select branch -> reducer list narrows -> choose exact reducer -> enter matching DNs -> Stage -> existing Q3 Preview -> Validate -> Apply -> Undo -> Redo`

Execution limitation remains explicit: no GitHub workflow runs trigger on current commits because the workflow directory was retired; no local checkout/network clone is available here. Authored tests are not equivalent to executed tests.

## Changed-File Ledger

Authorized current scope:

- `agents/PR1051_workreport.md`
- `src/workspace/topology-edit/table/topology-edit-table-tee-reducer.js` — new
- `src/workspace/viewport-productivity/topology-edit-table-engineering-editor.js`
- `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
- `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
- `tests/topology-edit-table-tee-reducer.test.mjs` — new
- `tests/topology-edit-table-engineering-editor.test.mjs`
- `e2e/helpers/topology-edit-table-engineering-fixture.js`
- `e2e/topology-edit-table-tee-reducer.spec.js` — new focused production UI source qualification

Existing Q3/authority specs are intentionally not modified unless a newly recorded issue requires it.

Any additional path must be registered here before modification.

Explicitly excluded: M10 command, canonical mutation, journal/Undo/Redo, catalogue authorities, validation protocol, and retired `.github/workflows`.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| `main@271d04fa2674ab68367808d05f2429ec5e236a6e` | architecture audit only |
| `36ba9966b8cb2b82972bbd457a7da7ebc8e0f3fa` | empty bootstrap; zero changed files |
| `bfbcbb1b9f88d7a7f709c6355e5a9168adac1f07` | implementation + focused test source authored; empirical execution NOT_RUN |
| `9e674648089acaf029f4327b76148cec77549b7c` | fixture correction; no statuses/workflows; main unchanged; PR mergeable; reviews/comments/threads empty |
| final head | pending focused E2E source + final report sync |

## Evidence / Invariants

- Existing M10 command already rejects non-direct reducers, wrong endpoint sizing, equal-bore reducers, custody drift, and no-op relations.
- New UI authority mirrors representability only; it does not replace command authority.
- Branch/reducer/DN input does not create a batch or journal entry; explicit Stage is the first governed-intent boundary.
- Preview/Validate remain non-mutating; Apply remains the only canonical transaction boundary.
- No workflow/guard weakening or restoration is permitted to manufacture green evidence.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| Focused Node execution | NOT_RUN | no local repository/runtime path in this agent environment |
| Production Chromium execution | NOT_RUN | workflow infrastructure retired; local clone unavailable |
| M10 command changes | NOT_APPLICABLE | command deliberately unchanged |

## Next

1. Add the registered focused E2E source test and enrich its already-authorized fixture evidence if needed.
2. Audit final changed-file list, PR mergeability/review surfaces and commit statuses.
3. Synchronize this report and PR description with the exact final head and `NOT_RUN` limitation.
4. Keep PR draft/unmerged until empirical qualification is available or the user explicitly chooses to accept that evidence gap.
5. After PR1051, continue with separate NODE_POSITION browser qualification.
