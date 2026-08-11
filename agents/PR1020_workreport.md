# PR #1020 Engineering Work Report

> Single source of truth for PR #1020. Living sections describe current truth; Stage Execution Log preserves material history.

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker fix and complete a compact, dynamically scrolling, governed spreadsheet-style Engineering Table for 3D Edit. |
| Source issue/task | Owner assignment in this PR conversation; inherited production worker defect plus Engineering Table spreadsheet plan. |
| PR number | #1020 |
| Branch | `agent/fix-topology-validation-worker-production` |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Current HEAD before this report update | `ad7c091e86faea34d0ca59381f2d75f7138d3671` |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 6 — governed VALVE/TEE compound-cell integration |
| Last completed stage | Stage 5 — direct governed PIPE-length spreadsheet cell |
| Engineering status | Stage 5 VALIDATED. Stage 6 before-state recorded; no Stage-6 production edit started yet. |
| Validation status | Exact `ad7c091e…`: all triggered workflows green, including Table Slices 3/4/6/7/8, `main-gate`, SJSON interaction/render authorities, 3D Edit reachability/tool audit and non-FEA input check. |
| Current blocker | None. Stage 6 must preserve compound engineering authority: `NEEDS_INPUT` cells may route to governed editors but may not become arbitrary inline values. |
| Exact next action | Add a capability-driven compound-cell entry affordance for VALVE/TEE cells, route it through exact row selection and existing lower governed editor controls, then qualify unchanged transaction semantics. |

### Handover in 60 seconds

**What is now true:** production validation-worker bundling is fixed; Stage 4 compact/dynamic scrolling is green; Stage 5 exposes only certified PIPE `lengthMm` as a direct spreadsheet number cell. Typed drafts are transient, Enter/Tab stage through the existing `PIPE_LENGTH` batch/plan path, Escape cancels, invalid values fail closed, and canonical/session authority remains unchanged until certified Apply.

**Currently being worked on:** Stage 6 compound-cell integration for VALVE and TEE. Their column capability is `NEEDS_INPUT`, not `AVAILABLE`.

**Unfinished:** make VALVE/TEE spreadsheet cells actionable entry points to their existing exact compound editors; complete Stage 7 bounded scaling/virtualization disposition; final changed-file reconciliation and final-head closure.

**Must not be assumed:** VALVE type, TEE branch size/angle, supports, catalogue fields, XYZ coordinates, fittings, or any other visible property are directly editable merely because they appear in the grid. Only certified capability permits editing.

**Highest-risk remaining item:** RISK-001 — spreadsheet convenience must not create a second engineering authority or bypass catalogue/topology constraints.

**Exact next recommended action:** start in `topology-edit-table-cell-edit.js` / `topology-edit-table-grid-view.js`; render `NEEDS_INPUT` capability cells as explicit compound-edit buttons that select the exact row and focus its existing governed editor. Do not stage anything on button click.

## 1. Mission and Engineering Intent

### Mission
Make the Engineering Table behave like a professional spreadsheet where safe, while preserving the governed topology-edit architecture and the production validation-worker repair.

### Engineering/user consequence
Users can inspect large models in a compact scrollable grid, keep identity columns visible, directly type certified PIPE lengths, navigate drafts by keyboard, and enter compound engineering edits from the cell context instead of hunting for detached controls. Engineering mutations still pass through intent → plan → preview → validation → certified transaction.

### Scope
- Production validation worker construction/bundling repair.
- Dense/resizable spreadsheet shell with horizontal and vertical scrolling.
- Sticky header and frozen identity columns.
- Direct PIPE-length cell backed by existing certified intent.
- VALVE/TEE cell-to-compound-editor integration backed by existing certified intents.
- Bounded scaling work only where justified by existing production authority.
- Final exact-head validation and handover.

### Governing engineering principles
1. Canonical topology is the only model authority.
2. Table draft state is UI-only and disposable.
3. Preview/validation are non-mutating.
4. Apply is the only canonical mutation boundary for staged Table work.
5. One applied Table batch remains one certified transaction/undo unit.
6. `deriveTopologyEditTableCellCapability` is the editability authority.
7. Catalogue-controlled, derived, unsupported and stale values fail closed.
8. Selection uses exact canonical IDs.
9. No hidden fallbacks, mock defaults or authority-changing shims.

### Explicit non-goals
- No direct `canonicalTopology` writes from spreadsheet cells.
- No second undo/redo stack for applied changes.
- No arbitrary free-text catalogue records or topology relations.
- No speculative support/XYZ/fitting editors without certified production operations.
- No new GitHub Actions workflows.
- No dependency upgrades or unrelated refactors.

### Important constraints
- Existing edited files must remain recoverable via branch history.
- New modules must have real production consumers in this PR.
- New JS stays below 300 physical lines where practical; functions below 40 logical lines where practical.
- All assignment work remains on PR #1020 unless Owner changes scope.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Production validation-worker bundling | P0 | VALIDATED | inherited / 1-3 | production build emits `topology-edit-validation-worker-*.js`; exact-head matrix green |
| Compact table typography | P0 | VALIDATED | 4 | 11px table surface + compact controls; browser authority green |
| Dynamic X/Y scrolling and resizable height | P0 | VALIDATED | 4 | Table Slice 3/6 Chromium green |
| Sticky header + frozen identity context | P0 | VALIDATED | 4 | Select/Tag/Type/Connect From/Connect To fixed offsets; browser authority green |
| Direct PIPE length cell | P0 | VALIDATED | 5 | invalid/draft/commit lifecycle in production Chromium; exact-head matrix green |
| Keyboard Enter/Tab/Escape semantics | P0 | VALIDATED | 5 | production E2E + exact-head matrix green |
| VALVE compound cell integration | P1 | IN_PROGRESS | 6 | before-state recorded; production edit not started |
| TEE compound cell integration | P1 | IN_PROGRESS | 6 | before-state recorded; production edit not started |
| Virtualization / >300-row scaling | P1 | NOT_STARTED | 7 | current renderer still hard-caps at 300 rows |
| Broader unsupported edit surface | P2 | DEFERRED | 7 | no certified Table intents for support/XYZ/fittings/catalogue scalars |
| Final reconciliation / closure | P0 | NOT_STARTED | 8 | pending final head |

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| ISS-001 | Defect | P0 | VALIDATED | Vite could not statically recognize validation worker when URL was prebuilt. | Yes |
| ISS-002 | Defect | P0 | VALIDATED | Inner grid had fixed `48vh/470px` cap and competing scroll ownership. | Yes |
| ISS-003 | Defect | P1 | VALIDATED | Frozen-column source authority and CSS offsets initially diverged. | Yes |
| ISS-004 | Defect | P0 | VALIDATED | Data viewport did not consume resized remaining height. | Yes |
| ISS-005 | Defect | P0 | VALIDATED | Ancestor sizing caused zero-height/pointer overlap. | Yes |
| ISS-006 | Defect | P0 | VALIDATED | Open floating window escaped to max-content width. | Yes |
| ISS-007 | Defect | P0 | VALIDATED | Collapsed `<summary>` pointerdown seeded closed geometry into drag state. | Yes |
| ISS-008 | Defect | P0 | VALIDATED | Native `<details>` content sizing collapsed body; panel-relative body fill resolved it. | Yes |
| ISS-009 | Defect | P1 | VALIDATED | Stage-5 input duplicated row `data-canonical-id`, breaking row selector uniqueness. | Yes |
| IMP-001 | Improvement | P0 | VALIDATED | Compact typography/controls. | Yes |
| IMP-002 | Improvement | P0 | VALIDATED | Direct governed PIPE length spreadsheet cell. | Yes |
| IMP-003 | Improvement | P0 | VALIDATED | Keyboard draft/commit/cancel + invalid/staged/stale state. | Yes |
| IMP-004 | Improvement | P1 | ACCEPTED | Replace 300-row hard cap with windowed rendering if bounded in Stage 7. | Yes |
| IMP-005 | Improvement | P1 | IN_PROGRESS | Compound VALVE/TEE cells should enter governed editors from spreadsheet context. | Yes |
| QST-001 | Question | P0 | DONE | PIPE length is the only current direct scalar capability (`AVAILABLE`). | Yes |
| QST-002 | Question | P1 | ACCEPTED | Whether Stage 7 virtualization can be added without destabilizing focus/cell state; decide after Stage 6. | Yes |
| RISK-001 | Risk | HIGH | ACTIVE | Spreadsheet drafts/compound affordances must not become a second engineering authority. | Yes |
| RISK-002 | Risk | MEDIUM | ACCEPTED | No local checkout/`gh`; executable evidence comes from connected GitHub checks. | Yes |
| RISK-003 | Risk | MEDIUM | ACTIVE | Full grid rerender can destroy focus/caret; direct-cell code restores focus explicitly. | Yes |
| RISK-004 | Risk | MEDIUM | ACTIVE | Virtualization may conflict with keyboard focus, selection and sticky/frozen state. | Yes |
| DEBT-001 | Debt | MEDIUM | ACCEPTED | Current lower compound editors remain a secondary details area rather than in-cell popovers. | Yes; Stage 6 reduces navigation cost without duplicating editor authority. |
| DEC-012 | Decision | — | ACCEPTED | Direct PIPE cell commits call the same governed PIPE staging helper as the lower editor. | Yes |
| DEC-013 | Decision | — | ACCEPTED | Uncommitted typed values live only in transient runtime `cellDrafts`. | Yes |
| DEC-014 | Decision | — | ACCEPTED | Enter/Tab commit; Shift reverses navigation; Escape cancels. | Yes |
| DEC-015 | Decision | — | ACCEPTED | Row-level `data-canonical-id` remains unique; cell inputs use cell-specific identity attributes. | Yes |
| DEC-016 | Decision | — | ACCEPTED | `NEEDS_INPUT` cells route to compound editors; they do not become direct scalar/text inputs. | Yes |

### Significant item detail — IMP-005 / DEC-016
- **Status:** IN_PROGRESS / accepted design.
- **Stage discovered:** planning / confirmed at Stage 6.
- **Affected components:** cell capability, grid rendering, runtime click handling, existing engineering editor.
- **Observed behaviour:** VALVE/TEE values are visible in the grid but editing requires first selecting a row and then using the lower editor.
- **Engineering consequence:** user perceives the grid as display-only for compound fields despite certified edit paths existing.
- **Root cause:** grid renderer currently special-cases only `AVAILABLE` direct PIPE cells; `NEEDS_INPUT` capability is not surfaced in-cell.
- **Chosen resolution:** render an explicit compound-edit affordance in the relevant cell. Activation performs exact row selection and focuses the existing governed editor. It does not stage or infer any input.
- **Alternatives considered:** inline free-text fields rejected because exact catalogue/branch/reducer evidence is required; duplicate in-cell compound forms rejected because they would create two form authorities and increase stale-state risk.
- **Edge cases:** non-GATE valves remain blocked; TEE relation still needs branch/reducer selection; selection coordinator may rerender before focus—focus should be deferred after selection render.
- **Validation required:** click cell affordance → exact row selected; lower editor visible/focused; no batch/canonical/session change until explicit Stage button; existing M06/M10 Preview→Validate→Apply tests unchanged.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary Output | Commit/HEAD |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization and technical findings | `PR_PENDING` report | historical |
| 2 | COMPLETE | PR allocation and report synchronization | `PR1020_workreport.md` | historical |
| 3 | COMPLETE | Changed-file verification and documentation-stage completion | reconciled PR scope | historical |
| 4 | COMPLETE | Dense/dynamic spreadsheet shell | compact scroll/frozen/resizable table | `4a66e01f…` clean qualification |
| 5 | COMPLETE | Governed direct PIPE-length cell | typed direct cell + keyboard lifecycle | `ad7c091e…` exact-head all-green |
| 6 | IN_PROGRESS | Governed VALVE/TEE compound-cell integration | capability-driven in-cell entry to existing editors | before-state recorded here |
| 7 | NOT_STARTED | Scaling + bounded production-backed expansion | virtualization decision/implementation; defer unsupported edits explicitly | — |
| 8 | NOT_STARTED | Final reconciliation and closure | final report, changed-file/validation reconciliation | — |

## 5. Stage Execution Log

### Stage 4 — COMPLETE
**Implementation performed:** compact 11px styling, dynamic X/Y scroll ownership, sticky header/five frozen columns, bounded floating-window sizing, safe collapsed→open drag boundary, lower/data scroll separation.

**Validation performed:** production Table Chromium lifecycle and component relation slices green after diagnostics were removed. Root native `<details>` sizing issue was resolved by panel-relative body fill.

**Stage decision:** COMPLETE.

### Stage 5 — COMPLETE

#### Before stage
Direct spreadsheet editing was absent. `lengthMm` already had certified `PIPE_LENGTH` capability; VALVE/TEE were `NEEDS_INPUT`.

#### Objective
Expose exact PIPE length as a direct spreadsheet cell without changing mutation authority.

#### Planned scope
Shared PIPE staging helper, transient cell module, runtime/grid wiring, production E2E.

#### Implementation performed
- Extracted/reused governed PIPE length staging in `topology-edit-table-pipe-length-runtime.js`.
- Added production-consumed `topology-edit-table-cell-edit.js`.
- Direct cell renders only for capability `AVAILABLE` + `PIPE_LENGTH`.
- Raw typing stays in `runtime.cellDrafts`; no batch is created per keystroke.
- Invalid/non-positive commit remains local invalid state and does not stage.
- Enter/Tab stages through existing intent/batch/plan; Escape cancels; focus is restored after rerender.
- Runtime resets cell drafts on canonical changes/discard/destroy.
- E2E changed PIPE lifecycle from detached length field staging to direct cell typing while retaining lower anchor/propagation policy controls.
- ISS-009 repaired by keeping `data-canonical-id` unique to rows and moving cell identity to `data-table-cell-canonical-id`.

#### Changed files
| File | Change | Why |
|---|---|---|
| `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js` | new direct cell/draft/keyboard module | bounded spreadsheet behavior with production consumer |
| `src/workspace/viewport-productivity/topology-edit-table-pipe-length-runtime.js` | shared staging helper | one authoritative PIPE staging path |
| `src/workspace/viewport-productivity/topology-edit-table-runtime.js` | event/draft wiring | production consumption |
| `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` | render direct cells | spreadsheet surface |
| `e2e/topology-edit-table-authority.spec.js` | direct-cell lifecycle qualification | independent production browser evidence |

#### Deviations from plan
Cell identity initially reused `data-canonical-id`; Chromium exposed selector ambiguity. This was corrected without weakening the test or changing engineering semantics.

#### Validation performed
| Check | Result | Evidence/Notes |
|---|---|---|
| Exact-head / line-budget guards | PASS | `ad7c091e…` Table Slice 3 |
| Table Node contracts | PASS | 23/23 on exact `ad7c091e…` |
| Production build | PASS | validation-worker asset emitted |
| Table Slice 3 Chromium lifecycle | PASS | direct PIPE invalid/draft/commit + layout/M06/M10 |
| Table Slice 4 | PASS | exact `ad7c091e…` |
| Table Slice 6 | PASS | relation/transaction contracts + Chromium |
| Table Slice 7 | PASS | exact `ad7c091e…` |
| Table Slice 8 | PASS | exact `ad7c091e…` |
| `main-gate` | PASS | exact `ad7c091e…` |
| 3D Edit SJSON Interaction Authority | PASS | exact `ad7c091e…` |
| 3D Edit Sjson Render Authority | PASS | exact `ad7c091e…` |
| 3D Edit Real User Reachability | PASS | exact `ad7c091e…` |
| 3D Edit Tool Audit | PASS | exact `ad7c091e…` |
| non-FEA input check | PASS | exact `ad7c091e…` |

#### Stage decision
COMPLETE.

#### Handover delta
- **Newly true:** PIPE length is a governed spreadsheet cell; full exact-head matrix green.
- **Newly discovered:** selector contracts are part of UI authority; row canonical identity must stay unique.
- **Still unresolved:** compound-cell entry and >300-row scaling.
- **Next stage starts with:** capability-driven `NEEDS_INPUT` cell affordances.

### Stage 6 — BEFORE IMPLEMENTATION

**What is currently true:** VALVE `valveType` and TEE `branchDnMm`/`branchAngleDeg` columns have certified editor descriptors, but their capability is `NEEDS_INPUT`. Existing lower editors already gather exact required inputs and stage certified `VALVE_REPLACEMENT` / `TEE_REDUCER_RELATION` intents.

**Objective:** make the spreadsheet itself the entry point for these compound edits while retaining one form authority.

**Scope:** `topology-edit-table-cell-edit.js`, `topology-edit-table-grid-view.js`, minimal runtime click/selection focus wiring, styles if required, and existing browser tests. Existing engineering-runtime/intent/planner semantics should remain unchanged.

**Engineering rationale:** a spreadsheet cell can represent an engineering action without pretending a compound operation is a scalar value. Routing the user to the existing exact editor preserves catalogue/relationship authority and avoids duplicate forms.

**Planned implementation:** derive capability for each cell. If `NEEDS_INPUT` and intent kind is VALVE/TEE, render a compact cell button around the displayed projected value with a clear edit affordance/title. On click: exact row selection through the existing coordinator; after rerender focus the relevant compound editor’s first required input. No batch/intent creation occurs until the existing explicit Stage button is used.

**Expected examples:** clicking a GATE valve Type cell selects that valve and focuses exact BALL catalogue JSON; clicking TEE branch DN/angle selects the TEE and focuses Branch port. Non-GATE valves remain blocked/read-only; REDUCER/SUPPORT/uncertified columns remain text only.

**Edge cases:** selection coordinator may rerender synchronously; focus should be scheduled against the newly rendered exact editor. Compound cell click must not toggle multi-select accidentally. Staged rows should still show staged state and preserve existing form values.

**Planned validation:** extend existing E2E to assert compound cell affordances exist only for `NEEDS_INPUT` certified cells, clicking them is an authority no-op, exact row becomes primary, expected lower input receives focus, and existing M06/M10 staging/Preview/Validate/Apply remain unchanged.

**Known risks:** RISK-001, RISK-003. No new engineering mutation path is authorized.

## 6. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR1020_workreport.md` | 1 | 6 | living source of truth | Yes | content reconciled to exact head before stages |
| `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` | inherited | inherited | production Vite worker construction | Yes | build + matrix PASS |
| `tests/topology-edit-professional-validation-worker-client.test.mjs` | inherited | inherited | worker regression | Yes | matrix PASS |
| `src/workspace/viewport-productivity/topology-edit-table-styles.js` | 4 | 5 | compact/scroll/frozen/body/cell styling | UI-sensitive | Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` | 4 | 5 | grid/frozen/direct-cell rendering | Yes | Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-productivity-adapter.js` | 4 | 4 | safe open/drag boundary | UI-sensitive | Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-pipe-length-runtime.js` | 5 | 5 | shared governed PIPE staging | Yes | contracts + Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js` | 5 | 5 | transient direct spreadsheet cell behavior | Yes | Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-runtime.js` | 5 | 5 | production event/draft integration | Yes | matrix PASS |
| `e2e/topology-edit-table-authority.spec.js` | 4 | 5 | production UI/authority qualification | Yes | PASS exact `ad7c091e…` |

**Actual GitHub changed-file list at Stage-6 start:** exactly the ten files above. **No discrepancy. No `.github/workflows/*` changes.**

## 7. Engineering Decisions and Invariants

### DEC-012 — shared PIPE staging
Both detached policy editor and direct cell call the same governed staging helper. No duplicate operation semantics.

### DEC-013 — transient drafts only
Raw typed text belongs to runtime-owned draft UI state. Canonical topology, session and journal are untouched until Apply.

### DEC-015 — canonical DOM identity uniqueness
`data-canonical-id` is reserved for canonical row identity in this surface. Child cell controls use cell-specific attributes.

### DEC-016 — compound cells are action affordances, not scalar editors
VALVE/TEE `NEEDS_INPUT` cells may activate/focus their existing governed editor but cannot infer or directly write missing catalogue/branch/reducer evidence.

### Invariants affected by this PR
| Invariant | Enforcement | Validation | PR effect |
|---|---|---|---|
| Preview never becomes canonical authority | existing Table workflow/transaction | transaction contracts + E2E | unchanged |
| Typing does not mutate model | `cellDrafts` + no stage on input | E2E authority no-op | strengthened |
| Apply is atomic | existing certified transaction | Table transaction tests | unchanged |
| Stale revisions fail closed/rebase explicitly | existing batch/rebase | Node contracts | unchanged |
| Unsupported cells remain non-editable | capability receipt | Stage 5/6 E2E | strengthened |
| Catalogue relations are exact | existing VALVE/TEE intent normalization | Slice 6 contracts | unchanged |

## 8. Validation and Evidence Ledger

### Software validation — exact `ad7c091e86faea34d0ca59381f2d75f7138d3671`
| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Table Slice 3 | PASS | `ad7c091e…` | exact head, 23 Node contracts, build, Chromium |
| Table Slice 4 | PASS | `ad7c091e…` | workflow run green |
| Table Slice 6 | PASS | `ad7c091e…` | governed relation + transaction + Chromium |
| Table Slice 7 | PASS | `ad7c091e…` | workflow run green |
| Table Slice 8 | PASS | `ad7c091e…` | workflow run green |
| main-gate | PASS | `ad7c091e…` | workflow run green |
| SJSON interaction | PASS | `ad7c091e…` | workflow run green |
| SJSON render | PASS | `ad7c091e…` | workflow run green |
| Real-user reachability | PASS | `ad7c091e…` | workflow run green |
| Tool audit | PASS | `ad7c091e…` | workflow run green |
| non-FEA input check | PASS | `ad7c091e…` | workflow run green |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| Direct PIPE typing is authority no-op | VALIDATED | production E2E compares authority before staging |
| Invalid length does not create batch | VALIDATED | production E2E |
| PIPE commit reuses governed intent/batch | VALIDATED | source path + Table contracts/E2E |
| Layout resizes dynamically | VALIDATED | Chromium Stage-4 test retained and green |
| Frozen context persists | VALIDATED | Chromium Stage-4 test retained and green |
| Worker bundles in production | VALIDATED | build asset emission |
| VALVE/TEE compound-cell entry | NOT_RUN | Stage 6 not implemented yet |
| >300-row virtualization | NOT_RUN | Stage 7 pending |

### Explicitly not validated
- Arbitrary XYZ editing from the table.
- Support/fitting/catalogue scalar editing beyond existing certified intents.
- Multi-cell paste/fill-down.
- Models above 300 rendered rows without filtering; current UI still hard-caps DOM rows.

## 9. Known Issues, Improvements, and Deferred Scope

### Open defects
None known on current validated Stage-5 head.

### Deferred improvements
- IMP-004 virtualization/windowed rendering decision in Stage 7.
- Broader cell edit surface only after certified intents exist.
- Multi-cell copy/paste/fill-down remains future work unless bounded authority can be demonstrated without scope expansion.

### Open engineering risks
RISK-001, RISK-003, RISK-004.

### Open engineering questions
QST-002 virtualization implementation/disposition.

### Accepted technical debt
DEBT-001: compound engineering form remains in lower details region; Stage 6 only makes cells direct entry points to that single governed form.

## 10. Recommended Forward Sequence

1. **Finish Stage 6 (IMP-005 / DEC-016).** This matters because the spreadsheet should be the interaction entry point while compound evidence remains exact. It depends on already-green Stage 5 cell infrastructure and existing M06/M10 editors.
2. **Stage 7 decide/implement bounded virtualization (IMP-004 / RISK-004 / QST-002).** Do this only after compound-cell focus/navigation is stable because virtualization affects DOM/focus ownership. Unsupported engineering edits should be explicitly deferred rather than fabricated.
3. **Stage 8 final reconciliation.** Re-fetch actual changed files, compare against ledger, ensure every register item has disposition, rerun/observe final exact-head checks, update closure/handover, leave PR draft unless Owner explicitly asks ready/merge.
4. **Recommended next PR after #1020:** certified coordinate/node/connected-run Table operations and/or support editing, but only after those professional operation contracts exist. This addresses the larger spreadsheet expectation without architecture drift.

## 11. Next-Agent Handover

**Current stopping point:** Stage 5 is fully validated; Stage 6 before-state recorded. No Stage-6 production edit has been made after this report update.

**PR / branch / HEAD:** PR #1020 / `agent/fix-topology-validation-worker-production`; production head before this report commit `ad7c091e86faea34d0ca59381f2d75f7138d3671`.

**Last completed stage:** Stage 5 — direct governed PIPE-length spreadsheet cell.

**Current active stage:** Stage 6 — compound VALVE/TEE cell integration.

**Start here:** `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`. Add a capability-driven renderer for `NEEDS_INPUT` intents and a click helper. Then wire `topology-edit-table-grid-view.js` and minimal `topology-edit-table-runtime.js` click handling. Use the existing selection coordinator and `topology-edit-table-engineering-editor.js`; do not create duplicate VALVE/TEE forms.

**Do not redo:** validation-worker investigation; Stage-4 details sizing diagnosis; PIPE staging extraction; direct-cell identity repair.

**Do not assume:** non-GATE valves are editable; TEE inputs can be inferred; visible columns imply editable authority; Stage 7 virtualization is already safe.

**Files currently involved:** `topology-edit-table-cell-edit.js`, `topology-edit-table-grid-view.js`, `topology-edit-table-runtime.js`, `topology-edit-table-engineering-editor.js`, `e2e/topology-edit-table-authority.spec.js`, work report.

**Known failing checks:** None on exact Stage-5 head `ad7c091e…`.

**Validation still required:** Stage-6 cell entry/focus and unchanged M06/M10 lifecycle; Stage-7 scaling disposition; final-head matrix/reconciliation.

**Open engineering questions:** QST-002.

**Deferred improvements:** IMP-004 and broader unsupported editing.

**Highest-risk remaining item:** RISK-001 — any convenience path that stages/invents compound inputs directly would violate authority.

**Exact next recommended action:** implement `NEEDS_INPUT` cell affordance with no staging side effect; first browser assertion must prove canonical/batch/session authority remains unchanged on cell activation.

**Required reading:** this report sections 0, 3, Stage 6 before-state; `topology-edit-table-edit-capability.js`; `topology-edit-table-cell-edit.js`; `topology-edit-table-engineering-editor.js`; relevant E2E M06/M10 section.

## 12. Process Notes / Lessons Learned

- Browser selector attributes can become de facto contracts; duplicating canonical identity on child controls broke strict row locators even though engineering logic was correct.
- Chromium native `<details>` sizing differed materially from assumed grid semantics; independent browser geometry evidence was required.
- Do not turn `NEEDS_INPUT` into direct editing merely for spreadsheet aesthetics; the capability receipt is the engineering boundary.
- Exact-head validation matters because earlier green results do not validate later UI wiring.

## 13. PR Closure Record

| Closure Criterion | Result |
|---|---|
| Mission completed | NO — Stages 6-8 pending |
| In-scope items dispositioned | PARTIAL |
| Engineering Item Register synchronized | YES at Stage-6 start |
| Changed files reconciled | YES at Stage-6 start; final reconciliation pending |
| Validation rerun at final HEAD | NO |
| Unexplained changes | None known |
| Deferred improvements recorded | YES |
| Known limitations recorded | YES |
| Handover current | YES |
| New CI workflows added | NO |
| Final HEAD | Not yet established |

**Final outcome:** pending.

**Remaining known limitations:** compound cell entry, >300-row scaling, final closure.

**Recommended next PR:** pending final Stage-7 disposition; likely certified coordinate/support editing rather than ungoverned scalar expansion.

**Final HEAD:** pending.