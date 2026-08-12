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

Preserved flow:

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
| RISK-1051-02 | Line budget | FINAL AUDIT PENDING | New authority is a small pure module; Table runtime class is untouched; wiring is delegated through existing smaller modules. |
| RISK-1051-03 | Qualification mechanism | OPEN | Current main has no `.github/workflows`; source tests remain, but exact-head execution is unavailable in this connected-agent environment. Do not claim unrun PASS. |
| ISS-1051-02 | Test fixture authority | OPEN / REMEDIATION AUTHORIZED | Shared `engineeringEditorFixture()` still defines expected M10 reducers as every exact reducer, encoding the pre-fix UI defect. Update the helper to expose zero pre-branch reducers plus branch-specific eligible reducer IDs; production behavior must not be widened to satisfy the stale fixture. |

## S0 — Predecessor Custody — COMPLETE

- #1036 support geometry dependency closure merged as `304f6ff32a0f383cd92793b1c57d7d99d61b4152`.
- #1041 certified valve catalogue selector merged as `271d04fa2674ab68367808d05f2429ec5e236a6e`.
- PR1051 began from the combined main state with an empty bootstrap commit before production changes.

## S1 — Pure Candidate / Capability Authority — COMPLETE

New `src/workspace/topology-edit/table/topology-edit-table-tee-reducer.js` provides:

- `topologyEditTableTeeBranchBindings(row)`
- `topologyEditTableTeeReducerCandidates({ projection, row, branchPortKey })`
- `deriveTopologyEditTableTeeReducerCapability({...})`
- `resolveTopologyEditTableTeeReducerSelection()`
- deterministic candidate labels with branch endpoint and `DN branch -> downstream` evidence.

Fail-closed cases include missing/ambiguous branch binding, non-REDUCER/non-EDGE, missing exact catalogue custody, missing/ambiguous endpoints, zero/both-endpoint incidence, unresolved/non-positive/equal-bore sizes, expansion away from branch, selected reducer outside current candidate set, invalid DNs, and oriented branch/downstream DN mismatch.

## S2 — Editor / Runtime Wiring — COMPLETE

- Reducer selector is empty/disabled until branch selection.
- Branch selection derives current candidates only.
- Branch changes clear an incompatible reducer without resetting typed DNs.
- Stage button reflects capability state and reason.
- `stageTopologyEditTeeReducerRelation()` re-resolves the current capability before creating the existing M10 intent.
- `topology-edit-junction-relation-command.js`, planners, Preview, validation, transaction, canonical mutation, and journal modules are unchanged.

## S3 — Focused Qualification — IN PROGRESS

Authored unit coverage:

- `tests/topology-edit-table-tee-reducer.test.mjs`
  - exact TEE branch bindings;
  - direct incidence only;
  - FROM orientation;
  - TO orientation;
  - unrelated exact reducer excluded;
  - unresolved catalogue excluded;
  - equal-bore excluded;
  - expansion-away excluded;
  - candidate/DN mismatch fail closed;
  - exact relation resolves immutable evidence.
- `tests/topology-edit-table-engineering-editor.test.mjs`
  - pre-branch reducer selector has no reducer candidates and Stage is disabled;
  - staged exact branch shows only directly connected exact reducer with oriented size label and enabled capability.

Production source qualification:

- existing `e2e/topology-edit-table-q3-concurrency.spec.js` already owns full M04/M06/M10 Stage -> Preview -> Validate -> Apply -> Undo -> Redo lifecycle;
- existing `e2e/topology-edit-table-authority.spec.js` owns production editor-authority assertions;
- shared helper `e2e/helpers/topology-edit-table-engineering-fixture.js` must be corrected because its old `exactReducerIds` expectation encodes the pre-branch all-reducer defect.

## S4 — Production Browser Qualification — PENDING EXECUTION

Required source assertions after fixture correction:

- pre-branch reducer selector contains no reducer choices and is disabled;
- Stage is disabled pre-representability;
- selecting the fixture-certified branch exposes only directly incident compatible reducer(s);
- existing Q3 path then stages M10 and retains Preview/Validate non-mutation, certified Apply, source custody, renderer singularity, Undo restoration, and Redo restoration.

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
- `e2e/helpers/topology-edit-table-engineering-fixture.js` — test-only fixture authority remediation registered before change
- `e2e/topology-edit-table-authority.spec.js` — only if direct production assertion change is needed after fixture remediation
- `e2e/topology-edit-table-q3-concurrency.spec.js` — only if narrow branch-filter assertions can be added safely; existing lifecycle must remain intact

Any additional path must be registered here before modification.

Explicitly excluded:

- `src/workspace/topology-edit/topology-edit-junction-relation-command.js`
- canonical mutation modules
- journal/Undo/Redo modules
- catalogue loaders/authorities
- validation worker protocol
- retired `.github/workflows`

## Validation Ledger

| Candidate | Evidence |
|---|---|
| `main@271d04fa2674ab68367808d05f2429ec5e236a6e` | architecture audit only |
| `36ba9966b8cb2b82972bbd457a7da7ebc8e0f3fa` | empty bootstrap; zero changed files |
| `bfbcbb1b9f88d7a7f709c6355e5a9168adac1f07` | implementation + focused test source authored; empirical execution NOT_RUN |
| current/final head | pending fixture/browser/static audit sync |

## Evidence / Invariants

- Existing M10 command already rejects non-direct reducers, wrong endpoint sizing, equal-bore reducers, custody drift, and no-op relations.
- New UI authority mirrors representability only; it does not replace the command.
- Branch/reducer/DN input does not create a batch or journal entry; explicit Stage remains the first governed-intent boundary.
- Preview/Validate remain non-mutating; Apply remains the only canonical transaction boundary.
- No workflow/guard weakening or restoration is permitted to manufacture green evidence.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| Focused Node execution | NOT_RUN | no local repository/runtime path in this agent environment |
| Production Chromium execution | NOT_RUN | workflow infrastructure retired; local clone unavailable |
| M10 command changes | NOT_APPLICABLE | command deliberately unchanged |

## Next

1. Correct the registered engineering fixture expectation.
2. Keep existing Q3 lifecycle intact; add only safe production assertions.
3. Audit final changed-file list, line budgets, PR reviews/comments, base/head mergeability, and commit statuses.
4. Synchronize this report with exact final head and limitations.
5. Merge only if current repository policy permits and the evidence is stated truthfully.
6. After PR1051, start separate NODE_POSITION browser-qualification PR.
