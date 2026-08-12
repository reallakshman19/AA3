# PR 1061 Work Report — Certified Explicit Support Station Relocation

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1061 — `feat(3d-edit): certify explicit support station relocation` |
| Branch | `agent/certified-support-placement-semantics` |
| Base | stacked on PR #1054 at `7d3002df5915027f607a7db10b2f75049fe14c94`; temporarily retargeted to isolated qualification base `qualification/pr1061-exact-head` for exact-head execution |
| Bootstrap | `da0fb665a3ca58788fad83c96ca27b0938d8d083` — empty tree-equivalent commit |
| Final source/test candidate before empirical repair | `d08cd53d4f79c346a83ee44e2a2a6b9ee4f4291f` |
| First exact-head qualification candidate | `66b76dcba5027d737f5ce805e07861b717ee9450` |
| Second exact-head qualification candidate | `1a8c40967e42a559c0998189a60a11dbb638600a` |
| Third exact-head qualification candidate | `1747775aedcaac6879e894e0d41a42a9f31df738` |
| Mission | Certify explicit relocation of a support along its already-resolved exact straight host, without host rebinding or automatic parent-geometry follow. |
| Engineering state | EMPIRICAL REPAIR IN PROGRESS |
| Empirical execution | **PARTIAL PASS / BROWSER FAIL** on run `31568210108`: exact-head/source checks PASS; focused Node qualification PASS 14/14; production Chromium started but failed at the E2E row-discovery assertion before support editing. |
| Merge state | Draft / unmerged. Browser qualification failure remains a merge blocker. |

## Authority Flow

`exact SUPPORT selection -> placement eligibility -> transient station draft -> governed SUPPORT_PLACEMENT intent -> deterministic operation plan -> candidate Preview ghost -> validation -> certified atomic transaction -> canonical placement override -> existing journal Undo/Redo -> support/Three projection -> committed workspace writeback`

Canonical topology remains engineering authority. Three meshes, support glyphs, and workspace entities remain projections/writeback only.

## Certified Semantics

This PR authorizes exactly one placement operation: **explicit same-host station relocation**.

- Host identity is resolved only by `resolveTopologyEditSupportHostEdge()`.
- Station is finite millimetres from the canonical host edge `FROM` node.
- Initial host classes are straight `PIPE`, `STRAIGHT`, or `STRAIGHT_ELEMENT` only.
- `0 <= stationMm <= hostLengthMm`; exact no-op is rejected.
- Origin is deterministic interpolation on the canonical host centerline.
- One command changes one canonical support record only.
- Support, host edge, and both host endpoint node revisions enter stale/dependency custody.
- Existing exact attachment projected-point/segment/distance evidence is retained; certified placement is a separate `placementOverride`.
- Existing certified journal remains the only engineering Undo/Redo authority.

Still prohibited: host rebinding, arbitrary support XYZ movement, moving pipe nodes as a proxy for support relocation, direct Three/entity mutation as authority, automatic support follow/restation during PIPE length/NODE_POSITION/valve/slope/split/trim/connected-run, weakening `SUPPORT_GEOMETRY_POLICY_REQUIRED`, or adding a support-specific history stack.

Parent geometry therefore remains fail-closed after this PR.

## Root Cause and Issue Register

| ID | Type | Status | Finding / resolution |
|---|---|---|---|
| ISS-1061-01 | Correctness | RESOLVED IN SOURCE | Live canonical support construction previously discarded exact attachment `attachmentId`, `projectedPointCanonical`, `segmentParameter`, and `distanceCanonical`, leaving an approximate endpoint `nodeId`. The dispatch adapter retains those already-resolved facts; governed SJSON canonical build/rebuild uses that same dispatch path. No second attachment inference algorithm was introduced. |
| ISS-1061-02 | Preview correctness | RESOLVED IN SOURCE | SJSON supports use a separate governed support projection, so generic Table ghost filtering could omit support relocation and candidate derivation could momentarily publish candidate support as the normal glyph. Table Preview restores current canonical support projection and renders an explicit candidate support ghost at the certified candidate origin. |
| ISS-1061-03 | Reducer immutability | RESOLVED / RUN 2+ PASS | Placement resolution now freezes detached support/host/node descriptors rather than live candidate records. Reducer/writeback tests pass. |
| ISS-1061-04 | Nullable evidence semantics | RESOLVED / RUN 2+ PASS | Null/undefined/blank attachment/station evidence remains absent; numeric zero remains valid. Projected-point-only and conflict guards pass. |
| ISS-1061-05 | Qualification expectation | RESOLVED / RUN 2+ PASS | Table test explicitly asserts the established deterministic `sequence: 0` command envelope. |
| ISS-1061-06 | Authoring certification | RESOLVED AS DOWNSTREAM / RUN 2+ PASS | Prior certification regeneration failure was downstream of the frozen reducer defect. Preview → Validate → Apply and exact Undo/Redo pass without weakening certification. |
| ISS-1061-07 | Capability receipt shape | RESOLVED / RUN 3 NODE PASS | Object-valued `currentOrigin` was removed from receipt details and represented as scalar `currentOriginX/Y/Z`, preserving `TopologyEditCapabilityReceipt.v1`. Run 3 focused Node gate passes 14/14. |
| ISS-1061-08 | Browser row discovery | OPEN / E2E REPAIR AUTHORIZED | Run `31568210108` reached the production Engineering Table after loading the intended XYZ fixture. Typing source tag `S-007` visibly filters the Table to exactly one SUPPORT row labeled with the human-facing tag `Support 07 — XYZ …`, but the E2E then incorrectly required the row's rendered text itself to contain `S-007`. Table filtering intentionally searches canonical/component/entity/source identities and fields, while row rendering exposes projected human fields plus exact `data-canonical-id`. Repair may select the unique visible row returned by the real filter interaction and retain exact canonical-ID assertions; it must not bypass the visible filter/row click path or invoke controller methods as UI coverage. |

## Architecture Decisions

| Decision | Result |
|---|---|
| Exact placement basis | Declared station, retained attachment segment, and retained projected point must agree when multiple authorities exist; disagreement fails closed. |
| Projected-point station | If segment/station is absent, a retained `ATTACHMENT_PROJECTED_POINT` may define station only when it lies exactly on the resolved straight host segment. |
| Curved host | Fail closed; no chord-based approximation. |
| Durable writeback | Committed support center plus explicit `TOPOLOGY_EDIT_SUPPORT_*` audit attributes. Original source `STATION_MM`, source attributes, vendor fields, and immutable source snapshot are not overwritten. |
| Reopen | Audit station/segment/host/center/hash are revalidated against current canonical host geometry before `placementOverride` is rehydrated. Malformed audit fails closed. |
| SJSON live projection | Only an ephemeral governed projection-dataset clone receives certified APOS. Actual workspace/source dataset stays unchanged. |
| Table authority | Displayed station changes to `CERTIFIED_TABLE_OVERRIDE` only after Apply; original source/vendor evidence remains separately visible. |
| Parent geometry | #1036 `SUPPORT_GEOMETRY_POLICY_REQUIRED` remains intact and is explicitly regression-tested. |
| Empirical repair boundary | Repair demonstrated defects only. Do not weaken planner, capability, certification, effect, stale-revision, source-custody, parent support-geometry, or visible-browser interaction guards to obtain a green run. |

## Implemented Contracts

### Pure command authority

`UPDATE_SUPPORT_PLACEMENT` is registered through:

`command request -> exact target resolution -> pure reducer -> candidate delta validation -> certified session/transaction`

The payload is `{ supportId, hostEdgeId, stationMm }`. Target resolution captures the support, exact host edge, host FROM node and host TO node. Effect validation requires exactly one changed support, no node/edge/junction/boundary/rigid/bend delta, preserved non-placement support material, and a valid certified override.

### Engineering Table

`stationMm` is a compound `SUPPORT_PLACEMENT` editor. Stage re-derives current canonical placement capability immediately before intent construction. The editor exposes exact host, host length, current station authority and bounded station input. Placement and restraint editing remain separate certified intents.

### Projection and writeback

- Generic support glyph origin: certified override first, then legacy fallback for untouched supports.
- SJSON governed support projection: candidate/live certified APOS supplied only through an ephemeral dataset clone.
- Preview: explicit support ghost; canonical/live support projection restored before ghost rendering.
- Commit: support geometry center/start/end moves only after accepted canonical transaction/writeback.
- Reopen: explicit placement audit is revalidated and rehydrated.

## Qualification Evidence

### Authored focused Node qualification

- `tests/topology-edit-support-placement-command.test.mjs`
- `tests/topology-edit-table-support-placement.test.mjs`
- `tests/topology-edit-support-placement-writeback.test.mjs`

### Authored production Chromium qualification

`e2e/topology-edit-table-support-placement.spec.js` uses the visible-user XYZ path:

`Workspace -> XYZ fixture -> 3D Edit -> Engineering Table -> filter/select S-007 -> type station -> Stage -> Preview -> Validate -> Apply -> Undo -> Redo -> filter/select P-011 -> verify parent movement remains support-policy blocked`

Controller access is read-only evidence only; no direct controller invocation is used as UI coverage.

### First executed exact-head gate — FAIL

Run `31567646893` checked out exact head `66b76dcba5027d737f5ce805e07861b717ee9450`:

- exact-head/source setup checks: PASS
- focused Node qualification: **5 pass / 9 fail**
- Chromium: SKIPPED after Node failure.

### Second executed exact-head gate — FAIL, NARROWED

Run `31567986663` checked out exact head `1a8c40967e42a559c0998189a60a11dbb638600a`:

- exact-head/source setup checks: PASS
- focused Node qualification: **13 pass / 1 fail**
- only residual Node failure: ISS-1061-07
- Chromium: SKIPPED after Node failure.

### Third executed exact-head gate — NODE PASS / CHROMIUM FAIL

Run `31568210108` checked out exact head `1747775aedcaac6879e894e0d41a42a9f31df738`:

- exact-head checkout: PASS
- Node 22 setup / `npm ci` / Chromium installation: PASS
- exact-head assertion, all four `node --check` checks, and `git diff --check`: PASS
- focused Node qualification: **PASS — 14 tests, 14 pass, 0 fail**
- command authority, exact revisions, one-support delta, null/conflict/no-op/stale/curved guards: PASS
- durable writeback/reopen/tamper/source-custody: PASS
- deterministic Table plan/dependencies: PASS
- capability receipt contract: PASS
- Preview → Validate → Apply and exact Undo/Redo: PASS
- stale-host rebase and `SUPPORT_GEOMETRY_POLICY_REQUIRED`: PASS
- production Chromium launched the real application, loaded `topology-edit-demo-20-v1-XYZ-10-COMPONENT-BRANCH-v1`, confirmed 7 supports, entered 3D Edit, opened Engineering Table, typed `S-007` into the visible filter, and displayed one SUPPORT row
- production Chromium then **FAIL** before row selection because the E2E required `tbody tr` rendered text to contain the source tag `S-007`; screenshot proves the unique filtered row is rendered as `Support 07 — XYZ …`
- Playwright evidence artifact uploaded successfully as ID `9130325213`, name `pr1061-support-placement-1747775aedcaac6879e894e0d41a42a9f31df738-1`, size `2,055,005` bytes, artifact SHA256 `88de77d8ef802f84cf5c2a0e0a832536133633f0063a9de744785c85906a3b98`
- artifact contains failure screenshot, `error-context.md`, and `trace.zip`

This run is not a Chromium qualification PASS; no support editing occurred after the failed row-text assertion.

## Static Closure Audit

- Exact changed-file ledger remains **28 feature files**; the temporary qualification workflow exists only on isolated branch `qualification/pr1061-exact-head`, not on the feature head.
- No geometry planner or #1036 support-dependency authority changed.
- No legacy source adapter or large SJSON restraint-validator implementation changed.
- New/tight production and E2E modules remain subject to the repository `<300` physical-line guard.
- Source review/mergeability are not represented as empirical qualification.

## Exact Changed-File Ledger

1. `agents/PR1061_workreport.md`
2. `e2e/topology-edit-table-support-placement.spec.js`
3. `src/workspace/topology-edit-3d-sjson-fidelity-controller.js`
4. `src/workspace/topology-edit/support-restraint-family.js`
5. `src/workspace/topology-edit/table/topology-edit-table-batch-planner.js`
6. `src/workspace/topology-edit/table/topology-edit-table-columns.js`
7. `src/workspace/topology-edit/table/topology-edit-table-edit-capability.js`
8. `src/workspace/topology-edit/table/topology-edit-table-engineering-planner.js`
9. `src/workspace/topology-edit/table/topology-edit-table-intent.js`
10. `src/workspace/topology-edit/table/topology-edit-table-projection.js`
11. `src/workspace/topology-edit/table/topology-edit-table-support-placement-contract.js`
12. `src/workspace/topology-edit/topology-edit-command-contract.js`
13. `src/workspace/topology-edit/topology-edit-command-effect-dispatch.js`
14. `src/workspace/topology-edit/topology-edit-command-resolver.js`
15. `src/workspace/topology-edit/topology-edit-pure-reducer-dispatch.js`
16. `src/workspace/topology-edit/topology-edit-sjson-runtime-authority-v2.js`
17. `src/workspace/topology-edit/topology-edit-source-adapter-dispatch.js`
18. `src/workspace/topology-edit/topology-edit-support-placement-command.js`
19. `src/workspace/topology-edit/topology-edit-support-placement.js`
20. `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
21. `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
22. `src/workspace/viewport-productivity/topology-edit-table-properties-view.js`
23. `src/workspace/viewport-productivity/topology-edit-table-support-placement-editor.js`
24. `src/workspace/viewport-productivity/topology-edit-table-support-restraint-editor.js`
25. `src/workspace/viewport-productivity/topology-edit-table-workflow.js`
26. `tests/topology-edit-support-placement-command.test.mjs`
27. `tests/topology-edit-support-placement-writeback.test.mjs`
28. `tests/topology-edit-table-support-placement.test.mjs`

Any future discrepancy is a closure blocker until this report is updated before the change.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| Focused Node tests on run-3 exact head | PASS — 14/14 | Executed in run `31568210108` on exact head `1747775aedcaac6879e894e0d41a42a9f31df738`. |
| Production Chromium/WebGL S-007 lifecycle | FAIL BEFORE EDIT | Real Chromium reached the filtered Table row, then failed the E2E's incorrect source-tag-in-rendered-text assertion. |
| Combined stack after #1054 merge | NOT_RUN | #1061 remains stacked/draft; re-evaluate against the eventual merged base. |
| Automatic support-follow on parent geometry | NOT_APPLICABLE | Deliberately prohibited and remains fail-closed. |
| Curved-host relocation | NOT_APPLICABLE | Deliberately unrepresentable in this slice. |

## Handover / Next Gate

1. Repair ISS-1061-08 in the E2E only: keep the real visible filter interaction, assert it returns exactly one non-spacer row with exact `data-canonical-id`, click the real Select control, and do not require the human-rendered label to repeat the source tag.
2. Re-run all three focused Node files plus the production Chromium lifecycle on the new exact head.
3. Diagnose any new browser failure from trace/screenshot evidence; do not weaken assertions unrelated to the demonstrated mismatch.
4. Once the full lifecycle is green, update this report with exact run/artifact evidence, then execute a report-sync exact-head qualification so the final report commit itself is empirically qualified.
5. Restore PR #1061 to its original stacked base after qualification and re-check integration/mergeability; do **not** merge based on source review alone.
