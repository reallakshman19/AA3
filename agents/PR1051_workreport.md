# PR 1051 Work Report — Topology-Aware Engineering Table TEE / Reducer Selection

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1051 — `fix(3d-edit): make Engineering Table TEE reducer choices topology-aware` |
| Branch | `agent/topology-aware-tee-reducer-selection` |
| Base | `main@271d04fa2674ab68367808d05f2429ec5e236a6e` |
| Rules | `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md` |
| Mission | Present only M10 reducer choices the existing certified command can represent for the explicitly selected TEE branch. |
| Final code/test candidate | `ef8e41af71568ae2e3f4d9389e7788e10c449583` |
| Status | DRAFT / engineering implementation complete / empirical qualification blocked by unavailable execution mechanism |
| Merge state at code/test candidate | GitHub `mergeable: true`; `main` unchanged at the PR base |
| Reviews | none; no review threads or PR comments |
| CI/status | none; `.github/workflows` is absent after #1043 |

## Architecture Preserved

`canonical TEE row -> explicit branch port -> exact branch node -> directly incident exact-catalogue reducer -> oriented size evidence -> governed TEE_REDUCER_RELATION intent -> plan -> Preview -> validation -> certified transaction -> canonical topology -> existing journal Undo/Redo`

No M10 command change, direct canonical write, alternate topology authority, catalogue synthesis, inferred branch role, Table-owned history, or mutation during Preview/Validate was introduced.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| ISS-1051-01 | UI truthfulness | RESOLVED | Old editor listed all exact-custody reducers before branch selection. New editor lists none pre-branch and only selected-branch candidates afterward. |
| DEC-1051-01 | Command authority | ACCEPTED | `topology-edit-junction-relation-command.js` remains unchanged and final. |
| DEC-1051-02 | Identity | ACCEPTED | Branch authority comes from TEE Table port bindings; reducer incidence/orientation comes from endpoint-specific `FROM`/`TO` bindings. No geometry proximity. |
| DEC-1051-03 | Candidate policy | ACCEPTED | Candidate must be canonical EDGE + REDUCER, incident at exactly one selected branch endpoint, exact-catalogue, positive finite unequal-bore, and reducing away from branch. |
| DEC-1051-04 | Stage gate | ACCEPTED | Stage requires exact branch/reducer plus positive run/branch/downstream DNs matching oriented reducer sizes; runtime re-resolves immediately before intent creation. |
| RISK-1051-01 | Draft preservation | RESOLVED | Branch input rewrites only reducer options/capability DOM state; typed DNs, staged batch and canonical topology are not rerendered/mutated. |
| RISK-1051-02 | Line budget | PASS STATIC CHECK | All touched production modules return no content at lines 300–305, satisfying `<300` physical lines. |
| ISS-1051-02 | Test fixture authority | RESOLVED | Engineering fixture now expects zero pre-branch reducers and derives branch-specific oriented candidates from exact projection identity/custody. |
| RISK-1051-03 | Empirical qualification | BLOCKER | No current workflow runs/status checks exist and the agent container cannot resolve `github.com` for a checkout. Authored tests are not executed evidence. |

## Implemented

### Pure Table authority

`src/workspace/topology-edit/table/topology-edit-table-tee-reducer.js` adds:

- deterministic exact TEE branch bindings;
- branch-scoped direct reducer candidates;
- `FROM|TO` orientation and branch/downstream DN evidence;
- exact-catalogue custody filtering;
- unequal-bore / reduction-away filtering;
- `AVAILABLE|UNREPRESENTABLE` capability derivation;
- exact fail-closed runtime selection resolver.

Fail-closed cases cover missing/ambiguous branch binding, non-REDUCER/non-EDGE, unresolved catalogue, malformed endpoint identity, no/direct-both incidence, invalid/equal sizes, expansion away from branch, selected reducer outside the current candidate set, invalid DNs, and oriented size mismatch.

### Editor/runtime

- Reducer select starts empty/disabled until branch selection.
- Changing branch clears incompatible reducer selection while preserving DN inputs.
- Candidate labels disclose canonical reducer identity, endpoint orientation and `DN branch -> downstream`.
- Stage button exposes capability status/reason and stays disabled until exact representability.
- `stageTopologyEditTeeReducerRelation()` re-resolves the same pure capability and then constructs the existing governed M10 intent.
- Large `TopologyEditTableRuntime`, M10 command, planners, Preview, validation, transaction and journal modules are untouched.

## Qualification Source Authored

### Node contracts

`tests/topology-edit-table-tee-reducer.test.mjs` covers:

- exact TEE branch identity;
- direct incidence only;
- FROM orientation;
- TO orientation;
- unrelated exact reducer exclusion;
- unresolved catalogue exclusion;
- equal-bore exclusion;
- expansion-away exclusion;
- wrong reducer / branch DN / downstream DN / run DN rejection;
- exact available selection evidence.

`tests/topology-edit-table-engineering-editor.test.mjs` covers:

- pre-branch reducer selector has no reducer candidates and Stage is disabled;
- staged exact branch shows only the directly connected exact reducer with oriented size label and available capability.

### Production browser source

`e2e/topology-edit-table-tee-reducer.spec.js` reuses the existing Q3 engineering fixture and asserts:

- reducer select empty/disabled before branch selection;
- Stage disabled before representability;
- branch selection narrows options to that branch's exact candidates;
- branch/reducer/DN edits leave canonical hash, batch hash and intent count unchanged before Stage;
- matching oriented DNs enable capability/Stage;
- explicit Stage creates exactly one batch intent while canonical hash remains unchanged.

Existing `e2e/topology-edit-table-q3-concurrency.spec.js` remains unchanged and is still the repository source authority for the full M04/M06/M10 Preview -> Validate -> Apply -> Undo -> Redo lifecycle.

Existing `e2e/topology-edit-table-authority.spec.js` remains unchanged; its shared fixture now expects zero reducer options before a branch is selected.

## Changed-File Ledger — Exact at `ef8e41af...`

1. `agents/PR1051_workreport.md`
2. `e2e/helpers/topology-edit-table-engineering-fixture.js`
3. `e2e/topology-edit-table-tee-reducer.spec.js`
4. `src/workspace/topology-edit/table/topology-edit-table-tee-reducer.js`
5. `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
6. `src/workspace/viewport-productivity/topology-edit-table-engineering-editor.js`
7. `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
8. `tests/topology-edit-table-engineering-editor.test.mjs`
9. `tests/topology-edit-table-tee-reducer.test.mjs`

No command, canonical mutation, journal, catalogue authority, validation protocol, or workflow file is changed.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| `main@271d04fa2674ab68367808d05f2429ec5e236a6e` | architectural baseline |
| `36ba9966b8cb2b82972bbd457a7da7ebc8e0f3fa` | empty bootstrap before implementation |
| `bfbcbb1b9f88d7a7f709c6355e5a9168adac1f07` | production implementation + focused test source authored |
| `9e674648089acaf029f4327b76148cec77549b7c` | branch-aware fixture correction; no statuses/workflows; clean mergeability/review surface |
| `ef8e41af71568ae2e3f4d9389e7788e10c449583` | final code/test source candidate including focused Playwright assertion; empirical execution NOT_RUN |

Static evidence:

- new candidate module: `<300` lines;
- engineering runtime: `<300` lines;
- engineering editor: `<300` lines;
- cell-edit delegation module: `<300` lines;
- PR has no reviews, threads or comments;
- `main` remains the original PR base;
- GitHub reports the PR mergeable;
- commit status list is empty.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| Focused Node tests | NOT_RUN | no exact repository checkout/runtime available in this agent environment |
| Focused Playwright M10 test | NOT_RUN | workflows retired; local clone unavailable |
| Existing Q3 full browser lifecycle on PR1051 head | NOT_RUN | same execution limitation |
| M10 command behavior changes | NOT_APPLICABLE | command deliberately unchanged |

## Merge Decision

**Do not merge yet.** Branch protection being off and GitHub mergeability being clean are not substitutes for executing new engineering behavior. Keep PR1051 draft until the authored Node + Playwright contracts are run on the exact candidate (or until the user explicitly accepts that qualification gap).

## Next Planned Slice

After PR1051 is empirically qualified and merged, continue with the separate NODE_POSITION production-browser qualification slice: NODE_ONLY, CONNECTED_RUN, support/dependency fail-closed behavior, stale conflicts, Preview/Validate non-mutation, and exact Apply/Undo/Redo custody.
