# PR 1053 Work Report — Engineering Table NODE_POSITION Production Browser Qualification

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1053 — `test(3d-edit): qualify NODE_POSITION production browser path` |
| Branch | `agent/node-position-browser-qualification` |
| Base / current main | `271d04fa2674ab68367808d05f2429ec5e236a6e` |
| Bootstrap | `904b23c63e96ac5d80c50276f87592b79000f813` — empty tree-equivalent commit before changed files |
| Rules | `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md` |
| Mission | Qualify production-browser Table NODE_POSITION for NODE_ONLY, CONNECTED_RUN, support fail-closed behavior, stale concurrency, Preview/Validate non-mutation, and exact Apply/Undo/Redo custody. |
| Final test-source candidate before report sync | `af8eb77536c0a173241e4ccf2e1f3e8ccdc5e9bb` |
| Status | DRAFT / test-source implementation complete / empirical execution unavailable |
| Production source changes | NONE |
| GitHub state at candidate | mergeable; base unchanged; no reviews, review threads, PR comments, workflow runs, or commit statuses |
| Merge decision | DO NOT MERGE until exact-head Node/Playwright execution is available or the user explicitly accepts the qualification gap |

## Architecture Preserved

`Table coordinate draft -> governed NODE_POSITION intent -> operation plan -> candidate Preview -> validation worker -> certified transaction -> canonical topology -> existing journal Undo/Redo`

This PR adds browser qualification source only. It does not introduce direct node writes, Table-owned history, Preview/Validate mutation, support-follow semantics, guessed run membership, alternate validation authority, or weakened stale/dependency guards.

## Existing Contract Audit

The retained pure NODE_POSITION authority was audited before browser source was authored:

- `tests/topology-edit-table-node-position.test.mjs` already proves exact endpoint capability, NODE_ONLY command construction, CONNECTED_RUN component translation, stale expected-position rejection, dependent-record fail-closed behavior, overlap rejection, Preview/Validate non-mutation, certified Apply and exact active-ledger Undo/Redo.
- `deriveTopologyEditTableNodePositionCapability()` reports support dependencies as `SUPPORT_GEOMETRY_POLICY_REQUIRED` and junction/boundary/rigid/bend dependencies as `NODE_DEPENDANT_POLICY_REQUIRED`.
- `compileTopologyEditTableNodePosition()` removes the source edge to derive CONNECTED_RUN membership, rejects cycles/dependants, and routes the exact moved node set through `planMoveConnectedRun()`.
- `planMoveConnectedRun()` rechecks support geometry dependencies across all moved nodes and affected edges.
- `validateTopologyEditTableRuntime()` verifies both Preview identity and current canonical hash after an asynchronous validation receipt returns; stale receipts throw `validation completed against a stale Preview` before Apply authorization.
- `rebaseTopologyEditTableBatchPlan()` tracks both target revisions and canonical dependency revisions, including validation-neighbourhood node/edge dependencies.

No defect requiring production-source modification was found during this audit.

## Production Browser Targets

| Case | Fixture / target | Purpose |
|---|---|---|
| NODE_ONLY success | 20-element demo, `P-003` TO | known unrestrained positive control already used by #1036 browser qualification |
| support negative | 20-element demo, `P-001` TO | support-dependent endpoint must remain disabled / mutation-free |
| CONNECTED_RUN success | Q3 fixture, `P-M04` TO | source-edge removal leaves a multi-node downstream valve/tail component, allowing identical-delta and internal-length checks |
| unrelated rebase | Q3, staged `P-R42` FROM + Canvas move of `P-TAIL` terminal | disjoint certified canonical change |
| exact-target stale | Q3, staged `P-R42` FROM + Canvas move of same FROM node | target/dependency changed |
| source-edge dependency stale | Q3, staged `P-R42` FROM + Canvas move of `P-R42` TO | target node unchanged, but source edge/neighbour dependency revision changes |
| stale validation arrival | Q3 with delayed test wrapper around real validation client | canonical change still occurs through certified Canvas UI while the real worker receipt is withheld |

## Authored Qualification Source

### `e2e/helpers/topology-edit-table-node-position-fixture.js`

Shared helper uses production-visible controls and existing certified authoring paths:

- opens Workspace and either the 20-element demo or exact Q3 fixture;
- enters 3D Edit and opens Engineering Table through `[data-action="open-engineering-table"]`;
- resolves Table/canonical row authority in-page;
- derives Q3 CONNECTED_RUN membership by removing the exact selected edge, matching production graph semantics;
- captures canonical, active-ledger, source, renderer, ghost, Table batch/preview/validation/stale evidence;
- captures exact node positions and edge lengths;
- drives independent Canvas MOVE_NODE through existing object-tree -> authoring -> Preview -> Validate -> Apply controls.

The helper is 252 physical lines, below the repository `<300` new-module gate.

### `e2e/topology-edit-table-node-position-lifecycle.spec.js`

NODE_ONLY `P-003` TO:

- coordinate typing is a canonical/journal/source no-op;
- Stage is a canonical/journal/source no-op and creates one Table intent;
- Preview is non-mutating and produces ghost geometry;
- Validate is non-mutating and reaches `READY_TO_APPLY`;
- Apply moves the exact endpoint node to requested coordinates, preserves source authority and renderer singularity, and adds one active command;
- Undo restores baseline canonical hash, active ledger/command IDs and exact node position;
- Redo restores the applied canonical/ledger/command IDs and exact requested position.

Support negative `P-001` TO:

- NODE_POSITION capability is `UNREPRESENTABLE`;
- reason text requires certified support movement policy;
- movement-mode and Stage controls are disabled;
- canonical/journal/source authority remains unchanged and no batch intent exists.

CONNECTED_RUN `P-M04` TO:

- draft/Stage/Preview/Validate remain non-mutating;
- Preview produces ghost geometry;
- Apply translates every derived moving-side node by the same delta;
- anchor node remains fixed;
- every internal moving-side edge length remains unchanged;
- source authority and renderer singularity remain unchanged;
- active command count grows by the exact moved-node count;
- Undo restores exact baseline geometry + active ledger;
- Redo restores exact applied canonical + active ledger/command IDs.

The lifecycle spec is 179 physical lines.

### `e2e/topology-edit-table-node-position-concurrency.spec.js`

- disjoint certified Canvas edit safely rebases a staged NODE_POSITION batch, updates basis, clears Preview, preserves one intent and leaves Preview available;
- exact target-node Canvas edit produces `STALE_CONFLICT` with dependency revision evidence and disables Preview;
- opposite source-edge endpoint Canvas edit produces the same fail-closed dependency conflict while the target node itself is unchanged;
- delayed real validation receipt arriving after a certified canonical change cannot authorize Apply: the production stale-Preview guard records the stale error, clears validation/Preview authority and leaves Apply disabled.

The validation timing wrapper only controls when the already-computed real worker result returns. It does not replace production validation, mutate canonical topology, or synthesize a receipt.

The concurrency spec is 133 physical lines.

## Changed-File Ledger — Exact at `af8eb775...`

1. `agents/PR1053_workreport.md`
2. `e2e/helpers/topology-edit-table-node-position-fixture.js`
3. `e2e/topology-edit-table-node-position-concurrency.spec.js`
4. `e2e/topology-edit-table-node-position-lifecycle.spec.js`

No `src/`, fixture, command, planner, transaction, journal, validation-worker, catalogue, or workflow file is changed.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| DEC-1053-01 | Scope | ACCEPTED | Qualification-only PR; no production change without a recorded failing contract. |
| DEC-1053-02 | Positive/negative controls | ACCEPTED | `P-003` TO success and `P-001` TO support block reuse already-certified production demo semantics. |
| DEC-1053-03 | CONNECTED_RUN | ACCEPTED | Q3 `P-M04` TO is derived at runtime as an acyclic multi-node moving side; membership is not hard-coded. |
| DEC-1053-04 | Concurrency | ACCEPTED | All canonical changes use certified Canvas authoring UI, not direct test mutation. |
| DEC-1053-05 | Stale validation timing | ACCEPTED | Test wrapper delays the real validation result only; production stale-check remains authoritative. |
| ISS-1053-01 | Test helper closure | RESOLVED | Initial helper draft incorrectly closed over Node-side functions inside `page.evaluate`; rewritten with browser-local topology helpers before any spec depended on it. |
| DEC-1053-06 | Undo custody | ACCEPTED | Browser assertions follow the established contract: exact canonical + active-ledger/command restoration, not equality of broader journal bookkeeping hash after Undo. |
| RISK-1053-01 | Empirical execution | BLOCKER | `.github/workflows` remains absent after #1043; exact candidate has zero workflow runs/statuses; this agent environment cannot obtain a local GitHub checkout. |

## Validation Ledger

| Candidate | Evidence |
|---|---|
| `main@271d04fa2674ab68367808d05f2429ec5e236a6e` | retained production/pure-contract audit; main still unchanged at final custody check |
| `904b23c63e96ac5d80c50276f87592b79000f813` | empty bootstrap, zero changed files |
| `af8eb77536c0a173241e4ccf2e1f3e8ccdc5e9bb` | complete 4-file test-source candidate; mergeable; no reviews/comments/threads; zero workflow runs/statuses; empirical execution NOT_RUN |
| report-sync head | created by this report update; re-query before any future merge decision |

Static custody completed:

- changed-file list matches the four registered paths exactly;
- all three new E2E/helper modules are below 300 lines;
- production Table/authoring selectors were cross-checked against existing repository browser tests and source;
- current `main` remains the PR base;
- no review/comment/thread blocker exists.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| NODE_ONLY new Playwright test | NOT_RUN | no exact-head browser execution mechanism available |
| CONNECTED_RUN new Playwright test | NOT_RUN | same infrastructure limitation |
| support negative new Playwright test | NOT_RUN | same infrastructure limitation |
| concurrency/stale new Playwright tests | NOT_RUN | same infrastructure limitation |
| stale-validation arrival test | NOT_RUN | source authored and audited only |
| production behavior changes | NOT_APPLICABLE | no production source changed |

## Merge Decision / Handover

**Keep PR1053 draft and unmerged.** GitHub mergeability and disabled branch-status enforcement are not substitutes for executing new browser qualification. When an execution mechanism is restored, run the exact-head lifecycle and concurrency specs (plus retained NODE_POSITION pure tests); only then mark ready/merge if green.

PR1051 is likewise still draft for the same empirical-execution gap. Do not begin certified SUPPORT editing until these remaining qualification slices are resolved, because support movement semantics are a separate authority decision rather than a workaround for missing qualification.
