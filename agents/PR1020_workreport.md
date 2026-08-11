# PR #1020 Engineering Work Report

> Canonical living handover authority for PR #1020. Current-state sections are authoritative; Stage Execution Log preserves historical evolution.

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker repair and make the 3D Edit Engineering Table a compact, dynamically scrolling, governed spreadsheet editing surface. |
| Source issue/task | Owner-authorized assignment in this conversation; all work stacked on PR #1020. |
| PR number | 1020 |
| Branch | `agent/fix-topology-validation-worker-production` |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Current HEAD | `6f6f202b657d5bff8f3c0e34168fb7dc32fb2332` before this report update |
| PR status | OPEN / DRAFT / mergeable; combined mission reflected in PR title/body |
| Current stage | Stage 4 — Dense dynamic spreadsheet shell, flex sizing repair substage |
| Last completed stage | Stage 3 — Changed-file verification and documentation-stage completion |
| Engineering status | PARTIAL — density, horizontal scrolling and frozen context are proven; vertical data-grid ownership remains incorrect |
| Validation status | `main-gate`, SJSON render/interaction, non-FEA and Table Slice 4 PASS on `6f6f202...`; Table Slices 3/6/7/8 FAIL in browser qualification; Tool Audit/Reachability still running at last inspection |
| Current blocker | ISS-004 — the bounded lower-region markup is present, but CSS Grid still lets the table data viewport honor its table min-content height; compact panel <450px still reports inner grid `clientHeight === scrollHeight === 567px`. |
| Exact next action | Keep the lower wrapper, switch only the populated surface sizing contract from CSS Grid to flex-column (`header auto`, data `flex:1 1 0; min-height:0`, lower bounded flex item), then rerun exact-head table authorities before Stage 5. |

### Handover in 60 seconds

- **What is now true:** Worker production bundling remains healthy. Table density, horizontal overflow, sticky header and five frozen columns are implemented. `topology-edit-table-grid-view.js` now groups all non-grid controls into `.topology-edit-table__lower`. Existing certified PIPE lifecycle and M06/M10 authority tests remain green inside the table-authority suite before the new layout assertion fails.
- **What is currently being worked on:** ISS-004. The lower wrapper repair did not constrain the inner data grid under CSS Grid. Exact artifact from `6f6f202...` still fails `expect(compact.scrollHeight).toBeGreaterThan(compact.clientHeight)` with `567 == 567`, while the compact floating window geometry assertion has already passed.
- **What remains unfinished:** flex sizing repair and Stage-4 green qualification; Stage 5 direct PIPE-length cells; Stage 6 compound VALVE/TEE cell integration; Stage 7 virtualization/bounded expansion; Stage 8 final reconciliation/validation.
- **What must not be assumed:** adding a lower wrapper plus `minmax(0,1fr)` is sufficient to override table min-content sizing; any table slice failure is a solver/transaction regression—the exact source/contracts/build steps are green; spreadsheet editing exists.
- **Highest-risk remaining item:** immediate RISK-006 (vertical layout ownership); later RISK-001 (second model authority).
- **Exact next recommended action:** change Stage-4 CSS sizing only; do not touch runtime/intents/workflow or start Stage 5 until exact-head Chromium is green.

## 1. Mission and Engineering Intent

### Mission
Provide spreadsheet-like engineering authoring with compact readable rows, dynamic X/Y scrolling, frozen engineering context, direct editing only where explicit authority exists, keyboard navigation, staged/error/stale state, and atomic certified Apply.

### Engineering/user consequence
Users need the Engineering Table to expose more information in a resizable window and behave like a spreadsheet without losing the repository’s certified topology custody. The data grid should own data scrolling; lower engineering controls should remain separately reachable.

### Scope
- Preserve/requalify inherited validation-worker repair.
- Stage 4: density, responsive spreadsheet viewport, X/Y scrolling, sticky/frozen context only.
- Stage 5: direct cells through existing cell-capability authority; PIPE length first.
- Stage 6: route VALVE/TEE `NEEDS_INPUT` cells to existing compound governed editors.
- Stage 7: virtualization/scaling and only bounded additional edit authority backed by production operations.
- Stage 8: final reconciliation and exact-final-head validation.

### Governing engineering principles
1. Canonical topology is the sole model authority.
2. DOM/table drafts are UI-owned only; typing/staging/preview/validation do not mutate canonical topology.
3. Certified Apply remains the mutation boundary and one applied table batch remains one undo/redo unit.
4. Existing column descriptors and `deriveTopologyEditTableCellCapability` are UI-policy authority.
5. `AVAILABLE` may be direct; `NEEDS_INPUT` requires governed compound input; `BLOCKED`/`UNREPRESENTABLE` is not free-text editable.
6. Catalogue-controlled and derived values are never guessed or silently defaulted.
7. Stale target revisions fail closed or explicitly rebase.
8. Browser layout evidence measures actual geometry/overflow; scrollbars appear only when needed.

### Explicit non-goals
No direct canonical mutation from DOM handlers; no broad refactor; no dependency upgrades; no backup source files; no speculative abstractions; no new GitHub Actions workflows/gates.

### Important constraints
Named exports; pure helpers where practical; new JS modules <300 physical lines and functions <40 logical lines where practical; no hidden mocks/fallbacks/shims; every abstraction must have a real production consumer in this PR.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Work-report protocol | P0 | DONE | 1-2 | canonical numbered report; pending file removed |
| PR metadata / initial changed-file reconciliation | P0 | DONE | 3 | combined mission; no workflow changes |
| Production validation-worker repair | P0 | VALIDATED | inherited | baseline workflows + current production builds emit worker asset |
| Dense typography/controls | P1 | VALIDATED | 4 | computed table font <=12px; compact controls/cells |
| Horizontal dynamic scrolling | P1 | VALIDATED | 4 | compact `scrollWidth > clientWidth`, overflowX auto |
| Sticky/frozen context | P1 | VALIDATED | 4 | five frozen columns with offsets `[0,58,190,268,396]` |
| Lower controls grouped/bounded | P1 | IMPLEMENTED | 4 | `.topology-edit-table__lower` production wrapper exists |
| Vertical spreadsheet scroll ownership | P1 | IN_PROGRESS | 4 | compact grid still 567px and no own vertical overflow |
| Dynamic height response | P1 | BLOCKED | 4 | resize-growth assertion is after the current compact-overflow failure |
| Stage 4 overall qualification | P0 | BLOCKED | 4 | Slices 3/6/7/8 browser failures on current head |
| Inline cell editing foundation | P1 | NOT_STARTED | 5 | capability authority identified |
| PIPE length direct cell | P1 | NOT_STARTED | 5 | existing `PIPE_LENGTH` / `AVAILABLE` capability |
| VALVE/TEE integration | P2 | NOT_STARTED | 6 | existing `NEEDS_INPUT` compound authority |
| Virtualization/scaling | P2 | NOT_STARTED | 7 | current renderer cap 300 rows |
| Broader edit authority | P2 | DEFERRED | 7/future | explicit governed operation required |
| Final reconciliation/validation | P0 | NOT_STARTED | 8 | pending |

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | Defect | HIGH | VALIDATED | Production validation worker bundling/load failure. | Yes |
| ISS-002 | Defect | MEDIUM | IMPLEMENTED | Fixed inner max-height/nested overflow prevented dynamic reachability. | Yes |
| ISS-003 | Defect | MEDIUM | VALIDATED | Frozen consumer/test initially omitted descriptor-frozen connectivity columns. | Yes |
| ISS-004 | Defect | MEDIUM | IN_PROGRESS | CSS Grid sizing still lets the table min-content height exceed compact window despite lower wrapper. | Yes |
| IMP-001 | Improvement | P1 | VALIDATED | Reduce typography/control density. | Yes |
| IMP-002 | Improvement | P1 | ACCEPTED | Direct governed spreadsheet cells. | Yes |
| IMP-003 | Improvement | P1 | ACCEPTED | Keyboard navigation plus staged/error/stale cell state. | Yes |
| IMP-004 | Improvement | P2 | ACCEPTED | Replace hard 300-row cap with windowed rendering after edit semantics stabilize. | Yes |
| IMP-005 | Improvement | P2 | DEFERRED | Broad XYZ/catalogue/fitting/support editing requires explicit governed operations. | Bounded subset only |
| RISK-001 | Risk | HIGH | ACCEPTED | Spreadsheet drafts could become a second model authority. | Yes |
| RISK-002 | Risk | HIGH | ACCEPTED | No local checkout/gh limits local executable validation. | Yes |
| RISK-003 | Risk | MEDIUM | ACCEPTED | Whole-grid rerender can destroy focus/caret/uncommitted drafts. | Yes |
| RISK-004 | Risk | MEDIUM | ACCEPTED | Frozen region can consume excessive narrow viewport width. | Yes |
| RISK-005 | Risk | MEDIUM | ACCEPTED | Resize test can misdiagnose layout if actual geometry is not measured. | Yes |
| RISK-006 | Risk | MEDIUM | ACCEPTED | Table min-content/lower controls can prevent the data viewport from owning constrained height. | Yes |
| DEC-001 | Decision | HIGH | ACCEPTED | Cell editing stages governed intents; Apply remains mutation boundary. | Yes |
| DEC-002 | Decision | HIGH | ACCEPTED | Existing capability/column metadata controls editability/frozen presentation. | Yes |
| DEC-003 | Decision | MEDIUM | ACCEPTED | Layout/density must validate before edit semantics begin. | Yes |
| DEC-004 | Decision | MEDIUM | ACCEPTED | Owner-authorized assignment stays on PR #1020. | Yes |
| DEC-005 | Decision | MEDIUM | ACCEPTED | Honor all existing `frozen:true` descriptors including connectivity. | Yes |
| DEC-006 | Decision | MEDIUM | REJECTED | CSS Grid `1fr` is not retained as vertical sizing authority after repeated min-content failure. | Yes |
| DEC-007 | Decision | MEDIUM | ACCEPTED | Separate data scroll domain from bounded lower-control scroll domain. | Yes |
| DEC-008 | Decision | MEDIUM | ACCEPTED | Populated table uses flex-column sizing so data viewport gets enforceable `flex:1 1 0; min-height:0`. | Yes |
| QST-001 | Question | MEDIUM | DONE | Direct scalar authority: PIPE length only; VALVE/TEE require compound input. | Yes |
| DEBT-001 | Debt | LOW | ACCEPTED | Two inherited worker commits predate protocol adoption. | Yes |
| DEBT-002 | Debt | MEDIUM | DEFERRED | Existing npm audit reports 6 vulnerabilities; dependency upgrades out of scope. | No change |
| DEBT-003 | Debt | LOW | DEFERRED | Existing circular-chunk / >500kB build warnings while bundle ceiling passes. | No change |

### ISS-001 — production validation-worker load failure
**Status:** VALIDATED. Production path uses Vite-recognized `new Worker(new URL(..., import.meta.url), ...)`; injected worker config remains explicit test-only. Production builds emit the worker asset and baseline/current checks support the fix.

### ISS-002 — constrained table viewport
**Status:** IMPLEMENTED; closure depends on ISS-004. Fixed 470px cap removed; density and horizontal data scrolling are already proven.

### ISS-003 — frozen descriptor coverage mismatch
**Status:** VALIDATED. Renderer consumes all source frozen descriptors and CSS gives Select/Tag/Type/Connect From/Connect To cumulative sticky offsets. Browser assertions pass.

### ISS-004 — spreadsheet grid does not own constrained vertical space
- **Status:** IN_PROGRESS.
- **Severity:** MEDIUM.
- **Stage discovered:** Stage-4 qualification; refined across `d83fdbd...` and `6f6f202...`.
- **Affected:** `topology-edit-table-styles.js`, `topology-edit-table-grid-view.js`, existing table-authority E2E.
- **Observed behavior:** compact actual panel height is <450px; `.topology-edit-table__scroll` still reports `clientHeight === scrollHeight === 567px` and therefore physically exceeds its intended remaining-space region. This persists after lower controls were grouped into `.topology-edit-table__lower` and the populated surface used `auto minmax(0,1fr) auto`.
- **Engineering consequence:** data rows are not the true vertical scroll owner; content can be clipped/indirect even though outer ancestors hide/scroll overflow.
- **Root cause:** CSS Grid item sizing continues to honor the table’s min-content contribution in this hierarchy. The lower wrapper solved sibling proliferation but not the grid min-content behavior.
- **Chosen resolution:** preserve the lower wrapper; make `.topology-edit-table--populated` a flex column. Header is non-flexing, `.topology-edit-table__scroll` is `flex:1 1 0; min-height:0; overflow:auto`, lower controls are `flex:0 1 auto; max-height:210px; overflow:auto` (180px mobile). This removes grid min-content track sizing from the data-height authority.
- **Alternatives considered:** force vertical scrollbar rejected; weaken the compact overflow assertion rejected; hard pixel data height rejected; another CSS Grid minmax variant rejected after two exact-browser failures.
- **Edge cases:** no selection, selected PIPE, large all-properties content, validation/staged panels, compact/mobile widths, empty model (unchanged path).
- **Validation required:** compact demo grid must own vertical overflow; actual 420→620 panel growth must increase grid clientHeight; lower controls remain reachable; existing PIPE lifecycle and M06/M10 tests remain green; Slices 3/6/7/8 and main-gate exact-head evidence.
- **Closure evidence:** pending.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary Output | Commit |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization/findings | pre-implementation report | `c908e7c...` |
| 2 | COMPLETE | PR allocation/report synchronization | sole numbered report | `d92b958...` |
| 3 | COMPLETE | Changed-file verification/documentation | truthful PR metadata + reconciliation | `3984e470...` metadata state |
| 4 | PARTIAL | Dense dynamic spreadsheet shell | compact grid, true X/Y ownership, frozen context | active; flex sizing repair next |
| 5 | NOT_STARTED | Inline edit foundation | active/edit cell state, PIPE length direct cell, keyboard commit/cancel | pending |
| 6 | NOT_STARTED | Compound editor integration | VALVE/TEE governed input from cells | pending |
| 7 | NOT_STARTED | Bounded expansion/scaling | virtualization; production-backed extra edits only | pending |
| 8 | NOT_STARTED | Final validation/reconciliation/closure | exact final-head evidence | pending |

## 5. Stage Execution Log

### Stage 1 — Report initialization and technical findings
Created pending report before spreadsheet production edits and recorded architecture/invariants. PR/file/report checks PASS. **Decision: COMPLETE.**

### Stage 2 — PR allocation and report synchronization
Created numbered report, deleted pending report, reconciled diff; baseline workflows passed. **Decision: COMPLETE.**

### Stage 3 — Changed-file verification and documentation completion
Synchronized PR metadata, confirmed draft/mergeable/no workflow changes, resolved direct-editability QST using existing capability authority. **Decision: COMPLETE.**

### Stage 4 — Dense dynamic spreadsheet shell

#### Before stage
Table used `.78rem` text, larger controls, nested scrolling and a `max-height:min(48vh,470px)` inner grid.

#### Objective
Reduce density and make the data viewport consume available floating-window space with X/Y scrolling and frozen context without changing engineering mutation semantics.

#### Scope
`topology-edit-table-styles.js`, `topology-edit-table-grid-view.js`, existing `e2e/topology-edit-table-authority.spec.js`. No runtime/intent/workflow changes.

#### Implementation performed to date
1. Compact styling: 11px table surface, 24–26px controls, reduced cell padding.
2. Fixed inner 470px cap removed.
3. Grid view emits stable column/frozen markers and full-value titles.
4. Five frozen columns receive deterministic offsets `[0,58,190,268,396]`.
5. Existing E2E gained density, X/Y overflow, frozen and resize evidence.
6. Percentage data track was replaced with CSS Grid `1fr`; browser still showed 567px data viewport in compact panel.
7. All content below data grid was grouped in `.topology-edit-table__lower`; CSS used explicit `auto minmax(0,1fr) auto`; browser still showed 567px data viewport.

#### Changed files
| File | Change | Why |
|---|---|---|
| `src/workspace/viewport-productivity/topology-edit-table-styles.js` | density, overflow/frozen sizing, current three-region layout | resolve ISS-002/004 |
| `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` | stable frozen metadata + lower-controls wrapper | expose authority and separate scroll domains |
| `e2e/topology-edit-table-authority.spec.js` | browser-visible layout qualification | independent evidence |

#### Deviations from plan
- Initial frozen oracle omitted source-frozen connectivity columns; ISS-003 fixed by honoring source metadata.
- CSS Grid `1fr` and later explicit lower wrapper did not override table min-content height in Chromium; plan now changes only sizing primitive to flex rather than adding more Grid tweaks.

#### Validation performed
| Check | Result | Evidence/Notes |
|---|---|---|
| Stage-4 source containment | PASS | no runtime/intent/workflow/workflow-file changes |
| Source/line guards | PASS | table slice pre-browser steps |
| Table Node/transaction contracts | PASS | table slice checks |
| Production build | PASS | validation worker asset emitted |
| Existing PIPE lifecycle E2E | PASS until layout test | table authority test 1 remains green |
| Existing M06/M10 E2E | PASS until layout test | table authority test 3 remains green |
| Density/horizontal overflow | PASS | layout test reaches later assertion |
| Frozen context | PASS | all five + offsets |
| Compact vertical data ownership | FAIL | `567 == 567` on `6f6f202...` |
| Dynamic height response | NOT_RUN | blocked by compact overflow assertion |
| `main-gate` | PASS | `6f6f202...` run 344 |
| Table Slice 4 | PASS | `6f6f202...` run 61 |
| Table Slice 3 | FAIL | `6f6f202...` run 281, Chromium layout assertion |
| Table Slice 6 | FAIL | `6f6f202...` run 229, same Stage-4 browser surface |
| Table Slice 7 | FAIL | `6f6f202...` run 103 |
| Table Slice 8 | FAIL | `6f6f202...` run 129 |
| SJSON render/interaction | PASS | exact head |
| non-FEA input check | PASS | exact head |

#### Issues discovered
ISS-003 resolved; ISS-004 remains. RISK-006 refined. No evidence of topology/transaction regression.

#### Stage decision
**PARTIAL.** Stage 5 remains blocked.

### Stage 4 flex sizing repair — before implementation
- **Before stage:** code head `6f6f202...`; lower wrapper is production-consumed; CSS Grid still produces a 567px data viewport inside a panel under 450px; source/contracts/build are green.
- **Objective:** make browser layout mechanically constrain the data viewport to remaining height without changing markup or engineering behavior.
- **Scope:** `topology-edit-table-styles.js` only unless exact-browser evidence proves a test issue. Existing E2E remains unchanged initially.
- **Engineering rationale:** flexbox with `flex:1 1 0` + `min-height:0` is a direct remaining-space contract and avoids the table min-content grid-track interaction observed twice.
- **Planned implementation:** `.topology-edit-table--populated { display:flex; flex-direction:column; overflow:hidden; }`; header `flex:0 0 auto`; data scroll `flex:1 1 0; min-height:0`; lower `flex:0 1 auto; max-height:210px; overflow:auto`; mobile lower max-height 180px. Keep generic table/empty-model rules unchanged.
- **Expected examples:** at actual ~420px panel height, 20-row data grid has vertical overflow and lower controls remain independently reachable; at ~620px panel height, grid clientHeight grows materially; horizontal overflow/frozen columns unchanged.
- **Edge cases:** lower editor expansion, no selection, all-properties groups, narrow/mobile, empty model.
- **Planned validation:** exact diff; existing layout E2E unchanged; Slices 3/6/7/8 and main-gate; existing lifecycle/compound editor tests.
- **Known risks:** lower region maximum can still consume 210px of very small windows, but data `flex:1 1 0` remains shrinkable to zero; minimum viable compact window is covered by existing panel min-height and browser evidence.

## 6. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` | inherited | inherited | production Worker bundling/load repair | Yes | baseline/current build PASS; final rerun required |
| `tests/topology-edit-professional-validation-worker-client.test.mjs` | inherited | inherited | worker regression coverage | No | baseline PASS; final rerun required |
| `agents/PR_PENDING_workreport.md` | 1 | 2 | temporary bootstrap; created/deleted | No | no net diff; explained |
| `agents/PR1020_workreport.md` | 2 | 4 | living report | No | current |
| `src/workspace/viewport-productivity/topology-edit-table-styles.js` | 4 | 4 | density, data scrolling, frozen layout | Presentation | partial; flex repair pending |
| `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` | 4 | 4 | frozen markers + lower region | Presentation | production-consumed; layout still partial |
| `e2e/topology-edit-table-authority.spec.js` | 4 | 4 | production-visible table qualification | Test | compact vertical ownership failing |

Current net PR file set is expected: numbered report, two inherited worker files, styles, grid view, table-authority E2E. No `.github/workflows/*` changes.

## 7. Engineering Decisions and Invariants

### DEC-001 — governed staging, explicit Apply
Direct spreadsheet interaction may never mutate canonical topology; Stage 4 does not touch runtime/intents/workflow.

### DEC-002 — metadata/capability-driven policy
Column descriptors and cell-capability receipts are UI policy authority.

### DEC-003 — layout before semantics
Stage 5 cannot start until Stage 4 exact-browser qualification is green.

### DEC-004 — single PR stacking
All authorized work remains on PR #1020; PR remains draft.

### DEC-005 — honor all frozen descriptors
Five source-authoritative frozen columns remain frozen with bounded deterministic offsets.

### DEC-007 — separate data and controls scroll domains
Data grid owns data X/Y scrolling; lower engineering controls own their bounded scroll region.

### DEC-008 — flex remaining-space authority
Populated table uses flex sizing for vertical ownership because repeated CSS Grid exact-browser evidence failed to constrain the data table’s min-content height.

## 8. Validation and Evidence Ledger

### Software validation
| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| PR metadata | PASS | `6f6f202...` | open/draft/mergeable |
| Net changed-file scope | PASS | `6f6f202...` | expected files; no workflow changes |
| `main-gate` | PASS | `6f6f202...` | run 344 |
| SJSON render/interaction | PASS | `6f6f202...` | exact-head workflows |
| non-FEA input check | PASS | `6f6f202...` | exact-head workflow |
| Table Slice 4 | PASS | `6f6f202...` | exact-head workflow |
| Table source/Node/contracts/build | PASS | `6f6f202...` | pre-browser steps in failing slices |
| Density/horizontal/frozen behavior | PASS | `6f6f202...` | browser reaches compact vertical assertion |
| Compact vertical data ownership | FAIL | `6f6f202...` | 567 equals 567 |
| Table Slices 3/6/7/8 | FAIL | `6f6f202...` | Stage-4 browser surface |
| Tool Audit / Real User Reachability | IN_PROGRESS at last check | `6f6f202...` | no conclusion yet |
| Flex sizing repair | NOT_RUN | pending | next exact head |
| Spreadsheet direct-edit validation | NOT_RUN | current | Stage 5+ |
| Final-head applicable validation | NOT_RUN | current | Stage 8 |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| Worker production bundle | PASS | build emits worker asset |
| Compact readable density | PASS | computed font <=12px |
| Horizontal data scrolling | PASS | compact width overflow |
| Frozen engineering context | PASS | five sticky columns/offsets |
| Vertical data scroll ownership | FAIL | data viewport not constrained |
| Resizable grid height consumption | NOT_RUN | blocked by compact assertion |
| Canonical unchanged before future direct Apply | NOT_RUN | Stage 5 |
| Focus/caret safe | NOT_RUN | Stage 5 |
| Stale revision safe | NOT_RUN | Stage 5+ |
| Atomic spreadsheet undo/redo | NOT_RUN | Stage 5+ |

### Explicitly not validated
Stage 4 vertical ownership/dynamic growth; all spreadsheet editing behavior; broad XYZ/catalogue/support edit authority.

## 9. Known Issues, Improvements, and Deferred Scope

- **Open defects:** ISS-004; ISS-002 closes only when Stage 4 vertical ownership is validated.
- **Deferred improvements:** IMP-004 virtualization; IMP-005 broad edit authority.
- **Open risks:** RISK-001/002/003/004/005/006.
- **Open questions:** none; QST-001 done.
- **Accepted/deferred debt:** DEBT-001/002/003.

## 10. Recommended Forward Sequence

1. Complete flex repair and obtain green exact-head Stage-4 table browser authorities.
2. Close ISS-002/004 with exact evidence, update report after Stage 4, then record Stage 5 before-state.
3. Stage 5: direct `PIPE_LENGTH` cell using existing capability receipt; prove canonical hash is unchanged through edit/stage/preview/validate and changes only on Apply; prove Enter/Tab/Escape/focus behavior.
4. Stage 6: route `NEEDS_INPUT` VALVE/TEE cells to existing governed compound editors.
5. Stage 7: virtualization only after active-cell semantics stabilize; extra edits require explicit production authority.
6. Stage 8: final file reconciliation, exact-final-head validation, item dispositions and closure/handover refresh.

## 11. Next-Agent Handover

- **Current stopping point:** Stage 4 flex sizing repair, before CSS mutation.
- **Exact current state:** code head `6f6f202...`; lower wrapper exists; main-gate/build/contracts green; browser data viewport still 567px in compact panel and Slices 3/6/7/8 fail on layout surface.
- **PR / branch / HEAD:** #1020 / `agent/fix-topology-validation-worker-production` / `6f6f202b657d5bff8f3c0e34168fb7dc32fb2332` before this report commit.
- **Last completed stage:** Stage 3.
- **Current active stage:** Stage 4 PARTIAL.
- **Start here:** `src/workspace/viewport-productivity/topology-edit-table-styles.js`: replace populated CSS Grid sizing with flex-column sizing exactly documented in Stage 4 flex repair; leave grid markup and E2E unchanged first.
- **Do not redo:** worker investigation; report bootstrap; PR metadata; frozen-column repair; lower wrapper implementation; QST-001.
- **Do not assume:** another CSS Grid minmax tweak will solve Chromium min-content behavior; Stage 5 is authorized before Stage 4 green.
- **Files currently involved:** report, table styles, grid view, table-authority E2E, inherited worker client/test.
- **Known failing checks:** Table Slices 3/6/7/8 on `6f6f202...`; exact failure surface is compact inner-grid vertical overflow.
- **Validation still required:** flex head Slices 3/6/7/8/main-gate; Stage5+; final head.
- **Open engineering questions:** none.
- **Deferred improvements:** IMP-004/005; DEBT-002/003.
- **Highest-risk remaining item:** RISK-006 immediately; RISK-001 after Stage 4.
- **Exact next recommended action:** change CSS sizing only, inspect exact diff, then let existing browser authorities validate before any Stage-5 work.
- **Required reading:** this report §§0,3,4,5 Stage4,7,8,11; `topology-edit-table-styles.js`; `topology-edit-table-grid-view.js`; Stage-4 E2E block.

## 12. Process Notes / Lessons Learned

- Existing metadata is a stronger test oracle than remembered UI assumptions.
- Sticky columns require both sticky positioning and deterministic cumulative offsets.
- CSS Grid `1fr` can still honor min-content contributions in a way that defeats a resizable data viewport; exact browser evidence should drive the sizing primitive.
- A lower wrapper can be structurally correct yet insufficient if the parent sizing algorithm still refuses to shrink the data table.
- Scrollbars should appear because content exceeds a bounded viewport, not because CSS forces them.
- Green CI is exact-head evidence only.

## 13. PR Closure Record

| Closure Criterion | Result |
|---|---|
| Mission completed | NO |
| In-scope items dispositioned | NO |
| Engineering Item Register synchronized | YES current state |
| Changed files reconciled | YES through `6f6f202...`; repeat after repair/final |
| Validation rerun at final HEAD | NO |
| Unexplained changes | None known |
| Deferred improvements recorded | YES |
| Known limitations recorded | YES |
| Handover current | YES |
| New CI workflows added | NO |
| Final HEAD | Not final |

### Final outcome
Pending.

### Remaining known limitations
ISS-004 blocks Stage-4 closure; Stage 5-8 remain incomplete.

### Recommended next PR
None for this assignment; Owner explicitly authorized single PR #1020.

### Final HEAD
Not final.