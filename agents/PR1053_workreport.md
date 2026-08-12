# PR 1053 Work Report — Engineering Table NODE_POSITION Production Browser Qualification

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1053 — `test(3d-edit): qualify NODE_POSITION production browser path` |
| Branch | `agent/node-position-browser-qualification` |
| Base | `main@271d04fa2674ab68367808d05f2429ec5e236a6e` |
| Bootstrap | `904b23c63e96ac5d80c50276f87592b79000f813` — empty tree-equivalent commit; zero changed files |
| Rules | `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md` |
| Mission | Qualify the real production-browser Table NODE_POSITION path for NODE_ONLY, CONNECTED_RUN, support/dependency fail-closed behavior, concurrency/staleness, Preview/Validate non-mutation, and exact Apply/Undo/Redo custody. |
| Status | DRAFT / report-first qualification planning |
| Production behavior changes | NONE AUTHORIZED unless a browser/source contract proves a defect and that finding is recorded here first |
| Empirical CI | Current repository has no `.github/workflows` after #1043; source qualification may be authored but must not be reported as executed PASS without an available execution mechanism |

## Required Architecture

The browser path must remain:

`Table coordinate input -> transient DOM draft -> governed NODE_POSITION intent -> operation plan -> candidate topology -> Preview ghost -> validation worker -> certified transaction -> canonical topology -> existing journal Undo/Redo`

Prohibited in this PR unless a separately recorded defect proves necessity:

- direct node/canonical writes from Table/DOM;
- Table-owned applied undo stack;
- mutation during coordinate editing, Stage, Preview, or Validate;
- bypassing support/dependent-record custody;
- guessed connected-run membership;
- weakening stale/conflict or source/line-budget guards;
- changing support movement semantics.

## Qualification Goals

### NODE_ONLY positive path

Production browser path:

`open Table -> select safe PIPE -> edit FROM/TO XYZ -> NODE_ONLY -> Stage -> Preview -> Validate -> Apply -> Undo -> Redo`

Required evidence:

- typing coordinates does not change canonical hash or journal authority;
- Stage does not change canonical hash;
- Preview does not change canonical hash and produces ghost geometry;
- Validate does not change canonical hash;
- Apply changes the exact endpoint node to the requested coordinates;
- source semantic/byte authority remains unchanged;
- renderer remains singular;
- Undo restores exact pre-Apply canonical hash + active ledger/hash/command IDs;
- Redo restores exact applied canonical + ledger state.

Positive-control target should reuse a verified unrestrained production-demo endpoint (prior audit identified P-003 TO as a successful MOVE_NODE target) rather than weakening support policy around supported P-001.

### CONNECTED_RUN positive path

Production browser path uses the same Table editor but `CONNECTED_RUN` movement mode.

Required evidence:

- selected complete plain connected run translates by one identical delta;
- anchor-side/outside geometry remains fixed;
- internal translated-run edge lengths remain unchanged;
- typed/Stage/Preview/Validate remain canonical no-ops;
- Apply/Undo/Redo custody matches NODE_ONLY standards.

### Support/dependent fail-closed path

Use a support-dependent production target (prior audit identified P-001 as intentionally blocked after merged #1036).

Required evidence:

- capability/editor is disabled or Stage fails closed with `SUPPORT_GEOMETRY_POLICY_REQUIRED` according to the production surface contract;
- no canonical/journal mutation occurs;
- no support relocation/follow behavior is introduced.

### Concurrency / stale custody

After staging NODE_POSITION:

- unrelated Canvas edit -> Table safely rebases staged intent/plan and requires regenerated Preview;
- mutate target node -> `STALE_CONFLICT` / target/dependency revision conflict;
- mutate affected support/host edge -> stale conflict when applicable;
- validation result arriving after canonical change is rejected and cannot authorize Apply.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| DEC-1053-01 | Scope | ACCEPTED | This is qualification-first. Existing NODE_POSITION production/pure behavior is presumed unchanged until a failing contract proves otherwise. |
| DEC-1053-02 | Positive control | ACCEPTED | Prefer verified unrestrained P-003 TO for NODE_ONLY success; supported P-001 remains a negative/fail-closed control. |
| DEC-1053-03 | Architecture | ACCEPTED | Reuse existing Table editor/runtime, session, validation worker and journal; no new execution authority. |
| RISK-1053-01 | Browser execution | OPEN | Repository workflows are retired and this agent currently lacks a local checkout/network clone path; authored Playwright source may remain NOT_RUN. |
| RISK-1053-02 | Fixture truth | OPEN | Existing production demo/Q3 fixtures must be audited before hard-coding endpoint/run IDs; tests should derive exact topology/custody evidence where practical. |
| RISK-1053-03 | Concurrency determinism | OPEN | Connected-run and stale-host tests must mutate exact canonical records through existing certified Canvas/Table paths, not direct test-only model mutation unless the repository already treats such fixture setup as authoritative. |

## Stage Roadmap

### S0 — Report-first custody — COMPLETE

PR opened from current main with empty bootstrap commit; this numbered report is the first changed file.

### S1 — Existing contract/fixture audit — IN PROGRESS

Read and map:

- pure NODE_POSITION capability/contract/planner/rebase tests;
- production Table editor selectors/runtime behavior;
- current production demo fixture topology for safe/blocked endpoints;
- existing browser helpers for evidence, Canvas move, Table selection and undo/redo;
- support dependency negative-control evidence from merged #1036.

No source/test modification beyond this report during S1.

### S2 — NODE_ONLY production browser source qualification — PENDING

Prefer one focused E2E spec/harness reuse rather than duplicating an entire production controller setup.

### S3 — CONNECTED_RUN + support fail-closed source qualification — PENDING

Derive run membership before movement and compare identical deltas/internal lengths after Apply; verify support-dependent target remains fail closed/no mutation.

### S4 — concurrency/stale browser source qualification — PENDING

Reuse existing Table/Canvas certified operation helpers where possible.

### S5 — empirical execution + merge custody — PENDING

If no execution mechanism exists, leave exact tests marked NOT_RUN and keep the PR draft rather than equating source review with browser PASS.

## Changed-File Ledger

Current authorized scope before S1 audit:

- `agents/PR1053_workreport.md`

Expected later test-only scope, to be registered precisely before edits:

- one focused NODE_POSITION Playwright spec, preferably new and small;
- existing browser helper/fixture only if required and registered first;
- existing E2E spec only if a narrow assertion extension is safer than a new focused spec.

Production source files are **not authorized** until a concrete defect is registered here first.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| `main@271d04fa2674ab68367808d05f2429ec5e236a6e` | baseline from merged support-dependency + valve-catalogue state |
| `904b23c63e96ac5d80c50276f87592b79000f813` | empty bootstrap; zero changed files |
| report-first head | report only; no behavior/test change |

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| NODE_ONLY production browser | NOT_RUN | audit/source test not yet authored |
| CONNECTED_RUN production browser | NOT_RUN | audit/source test not yet authored |
| support fail-closed browser | NOT_RUN | audit/source test not yet authored |
| concurrency/stale browser | NOT_RUN | audit/source test not yet authored |
| production behavior changes | NOT_APPLICABLE | none authorized or made |

## Next

1. Audit existing NODE_POSITION tests/capability/planner/editor and browser helpers.
2. Register exact test/helper files before modification.
3. Add focused browser source qualification without changing production behavior unless a failing contract proves a defect.
4. Keep empirical execution evidence separate from authored test source.
