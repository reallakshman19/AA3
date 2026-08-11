# PR #1020 Engineering Work Report

> Canonical living handover authority for PR #1020. Current-state sections are authoritative; historical notes retain the material Stage-4 diagnosis.

## 0. Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker repair and make the 3D Edit Engineering Table a compact, dynamically scrolling, governed spreadsheet editing surface. |
| PR | #1020 · `agent/fix-topology-validation-worker-production` → `main` · OPEN / DRAFT / mergeable |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Stage-4 cleanup HEAD | `4a66e01ff04683277a7840cabe55ef3450b6a070` before this report update |
| Current stage | **Stage 5 — governed direct PIPE-length cell foundation** |
| Last completed stage | **Stage 4 — dense dynamic spreadsheet shell** |
| Engineering status | Stage 4 COMPLETE; Stage 5 authorized but production editing changes not started yet. |
| Validation status | On `4a66e01f...`: Table Slice 3 PASS including production Chromium lifecycle; Table Slice 6 PASS including M06/M10/transaction contracts + Chromium; `main-gate` PASS. |
| Current blocker | None for Stage 4. Stage 5 must preserve RISK-001: transient spreadsheet drafts cannot become independent engineering authority. |
| Exact next action | Extract current PIPE-length staging into one shared governed helper, add transient direct-cell draft/keyboard handling, and render only capability-`AVAILABLE` PIPE length cells as inputs. Existing lower PIPE policy editor remains authoritative for anchor/propagation refinement. |

### Handover in 60 seconds

- Production validation-worker fix remains healthy; production builds repeatedly emit the validation-worker asset.
- Stage 4 is done: compact 11px table, dynamic X/Y scrolling, sticky header, five frozen columns, separate data/lower scroll domains, safe collapsed→open drag behavior and exact browser resize/reachability qualification.
- Stage-4 root cause was Chromium native `<details>` content wrapping: the panel had rows `36px 682px` while direct body was `0px`. `70eca6c9...` fixed this by absolutely filling the **body** under the 36px titlebar; measured body became 682px and data-scroll client height 519px. Temporary geometry persistence was removed at `4a66e01f...` and the strict browser suite stayed green.
- Stage 5 source authority is already present: `lengthMm` column declares editor `PIPE_LENGTH`; `deriveTopologyEditTableCellCapability` returns `AVAILABLE` only for exact PIPE EDGE rows; `createTopologyEditTableIntent` validates positive finite length plus explicit geometry policy; current runtime stages that intent into the existing batch/planner.
- Stage 5 must reuse that path. No direct canonical writes, no second batch model, no alternate undo/redo, no fake editability for blocked fields.

## 1. Engineering Invariants

1. Canonical topology is the only model authority.
2. Table/DOM draft state is transient UI state only; it never mutates canonical topology before certified Apply.
3. Preview and validation are non-mutating; Apply remains the governed mutation boundary and one applied batch remains one undo unit.
4. `deriveTopologyEditTableCellCapability` is the editability authority. Direct cells require `status === AVAILABLE`; `NEEDS_INPUT` routes to compound governed editors; blocked/unrepresentable fields remain non-editable.
5. Catalogue-controlled and derived values are never guessed.
6. Stale revisions fail closed or explicitly rebase through the existing table batch authority.
7. Existing certified session/journal remains the only engineering history.
8. No new CI workflows, dependency upgrades, broad refactors, hidden fallbacks or backup files.

## 2. Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| ISS-001 | Defect | VALIDATED | Production validation worker bundling/load fixed with Vite-recognizable Worker construction. |
| ISS-002 | Defect | VALIDATED | Removed fixed inner grid cap / competing scroll ownership. |
| ISS-003 | Defect | VALIDATED | Frozen authority = Select, Tag, Type, Connect From, Connect To. |
| ISS-004 | Defect | VALIDATED | Data viewport consumes resizable remaining height. |
| ISS-005 | Defect | VALIDATED | Ancestor zero-height/pointer overlap resolved. |
| ISS-006 | Defect | VALIDATED | Horizontal max-content escape contained. |
| ISS-007 | Defect | VALIDATED | Collapsed `<summary>` no longer seeds drag geometry. |
| ISS-008 | Defect | VALIDATED | Native details-content block-size trap bypassed by panel-relative body fill. |
| IMP-001 | Improvement | VALIDATED | Compact typography/controls. |
| **IMP-002** | Improvement | **IN_PROGRESS** | Direct governed spreadsheet cells; start with PIPE length only. |
| **IMP-003** | Improvement | **IN_PROGRESS** | Keyboard draft/commit/cancel and staged/invalid/stale cell state. |
| IMP-004 | Improvement | LATER | Windowed rendering after active-cell semantics stabilize. |
| QST-001 | Question | DONE | PIPE length is the only current direct scalar; VALVE/TEE require compound input. |
| RISK-001 | Risk | HIGH / ACTIVE | Cell drafts must never become a second model authority. |
| RISK-002 | Risk | ACCEPTED | No local checkout/`gh`; executable evidence uses connected GitHub checks. |
| RISK-003 | Risk | ACTIVE | Full rerender can destroy focus/caret; keyboard commit must restore intended focus deterministically. |
| DEC-012 | Decision | ACCEPTED | Direct PIPE cell commits create the same `PIPE_LENGTH` intent/batch/plan as the lower editor. |
| DEC-013 | Decision | ACCEPTED | Uncommitted typed cell values live only in transient runtime draft state. |
| DEC-014 | Decision | ACCEPTED | Enter commits and advances; Shift+Enter moves backward; Tab/Shift+Tab commits and moves; Escape cancels the cell draft. |

## 3. Stage Roadmap

| Stage | Status | Purpose |
|---|---|---|
| 1 | COMPLETE | initialize report before spreadsheet production edits |
| 2 | COMPLETE | synchronize to PR-numbered living report |
| 3 | COMPLETE | reconcile draft PR scope/metadata and changed files |
| 4 | **COMPLETE** | compact reachable dynamic X/Y spreadsheet shell |
| 5 | **IN_PROGRESS** | direct PIPE-length cell + keyboard/draft semantics |
| 6 | NOT_STARTED | governed VALVE/TEE compound-cell integration |
| 7 | NOT_STARTED | virtualization and bounded production-backed expansion |
| 8 | NOT_STARTED | final reconciliation and exact-head closure |

## 4. Stage 4 Closure Record

**Final production behavior:** floating Engineering Table is resizable and stays inside the 3D viewport; data grid owns X/Y overflow; header remains sticky; five context columns remain frozen; rows and lower editors/workflow use separate scroll regions; collapsed click opens without injecting drag coordinates.

**Measured before/after ISS-008:** diagnostic head showed panel 720px / second grid track 682px but body 0px and scroll clientHeight 0. Fixed head `70eca6c9...` measured body 682px, runtime mount 672px, populated surface 672px and data-scroll clientHeight 519px. The unchanged production browser suite then passed.

**Clean qualification:** temporary diagnostic persistence removed at `4a66e01f...`; Table Slice 3 PASS, Table Slice 6 PASS, `main-gate` PASS. Stage 4 decision: COMPLETE.

## 5. Stage 5 — Before Implementation

### Objective
Make `Length` on exact PIPE edge rows behave like a real spreadsheet cell while preserving the existing governed PIPE-length operation path and lower engineering-policy editor.

### Existing authority to reuse
- `topology-edit-table-columns.js`: PIPE `lengthMm` → editor `PIPE_LENGTH`.
- `topology-edit-table-edit-capability.js`: exact PIPE EDGE `lengthMm` → `AVAILABLE`; all other non-certified scalar cells fail closed.
- `topology-edit-table-intent.js`: `PIPE_LENGTH` requires positive finite `lengthMm` and geometry policy (`anchor`, `propagation`).
- `topology-edit-table-runtime.js`: current lower editor builds the exact intent, batch and plan and only mutates canonical state later through Preview → Validate → Apply.

### Planned implementation
1. Extract the existing PIPE-length intent/batch/plan staging body into a small shared production helper so lower editor and cell commits use identical authority.
2. Add a small direct-cell module that:
   - renders an `<input type="number">` only when cell capability is `AVAILABLE` and intent kind is `PIPE_LENGTH`;
   - stores raw typed value in a transient `Map` keyed by canonical ID;
   - never stages on each keystroke and never touches canonical/session state;
   - Enter/Tab commits through the shared PIPE-length staging helper, Shift reverses navigation, Escape cancels the draft;
   - retains invalid draft + marks cell invalid when intent normalization rejects the value;
   - marks staged/stale cells from the existing batch/stale authority.
3. Preserve current geometry-policy behavior: if an exact staged intent already exists, reuse its anchor/propagation; otherwise direct-cell commit uses the same current UI defaults as the lower PIPE editor (`FROM` / `DOWNSTREAM`). The selected-row lower editor remains available to change/re-stage policy explicitly.
4. Clear transient drafts on canonical revision changes, discard, and destroy so stale typed text never survives authority changes.
5. Keep existing Preview/Validate/Apply, undo/redo and rebase logic unchanged.

### Expected files
- new small helper under `src/workspace/viewport-productivity/` for shared PIPE staging;
- new small direct-cell runtime/view helper under `src/workspace/viewport-productivity/`;
- minimal wiring in `topology-edit-table-runtime.js` and `topology-edit-table-grid-view.js`;
- focused Node/browser tests, preferably extending existing table authority suites without new workflow files.

### Required evidence
- Typing changes neither canonical hash nor journal/session version.
- Escape restores projected/staged value with no batch change.
- Enter creates the same governed `PIPE_LENGTH` intent/batch/plan semantics as the existing lower editor.
- Preview and Validate remain authority no-ops; Apply changes canonical once; Undo/Redo exact.
- Invalid/non-positive input fails closed and remains visibly invalid without staging.
- BLOCKED/NEEDS_INPUT properties are not converted to free-text cells.
- Keyboard commit preserves useful next-cell focus after rerender.

## 6. Changed-File Ledger

Current notable files in PR:
- `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` — inherited production worker fix.
- `tests/topology-edit-professional-validation-worker-client.test.mjs` — worker regression.
- `agents/PR1020_workreport.md` — living engineering authority.
- `src/workspace/viewport-productivity/topology-edit-table-styles.js` — Stage-4 density/scroll/frozen/body sizing.
- `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` — frozen markers/lower-region wrapper; Stage-5 cell rendering target.
- `src/workspace/viewport-productivity/topology-edit-table-productivity-adapter.js` — safe open/drag boundary.
- `e2e/topology-edit-table-authority.spec.js` — strict production table authority/layout suite, diagnostics removed.

No `.github/workflows/*` changes.

## 7. Next-Agent Handover

- PR/branch: #1020 / `agent/fix-topology-validation-worker-production`.
- Stage-4 cleanup head before this report: `4a66e01ff04683277a7840cabe55ef3450b6a070`.
- Do not redo Stage 4 or validation-worker investigation.
- Start Stage 5 by extracting the existing `stagePipeLength` operation body; direct cells must call that same helper.
- Do not expose VALVE/TEE as direct scalar inputs in Stage 5; they remain compound `NEEDS_INPUT` authority for Stage 6.
- Preserve current strict Chromium oracle and add direct-cell assertions to it or another existing table suite.

## 8. Closure Record

Mission complete: **NO**. Stage 4 is complete and qualified. Stage 5 is authorized/in progress; Stages 6-8 remain. PR stays draft until final exact-head reconciliation.
