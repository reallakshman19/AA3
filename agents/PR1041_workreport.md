# PR 1041 Work Report — Certified Engineering Table Valve Catalogue Selection

## PR Mission Control

| Field | Current truth |
|---|---|
| Mission | Remove arbitrary valve catalogue JSON input and make Engineering Table valve replacement use only exact compatible immutable catalogue authority. |
| Source | User-directed P1 catalogue-HUD closure; reviewed against `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md`. |
| PR | #1041 — `fix(3d-edit): certify Engineering Table valve catalogue selection` |
| Branch | `agent/certified-valve-catalogue-selection` |
| Initial qualified HEAD | `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0` |
| Picker DN remediation | `3841842733d4eae4a6e4cb49661c3c872a63fa52` |
| Intent DN remediation | `7f5ace9869938882375e1a323b7b9e2787fce045` |
| Line-budget repair source head | `6c022105a7b5f56001ccda39e30b4882f4a99aa1` |
| Pre-disclosure report-sync head | `065da981895c562abc9a2f4e23279ba927365eed` |
| P0 predecessor | PR #1036 merged to `main` as `304f6ff32a0f383cd92793b1c57d7d99d61b4152` |
| Status | DRAFT / engineering review complete / merge decision gated by clean GitHub state with documented qualification limitation |
| Current stage | S5 — final merge custody |
| Last completed stage | S4c — physical line-budget closure |
| Engineering state | PASS on independent review; no known production-code blocker |
| Validation state | Strong retained behavioral/browser evidence; exact final post-report Chromium rerun NOT AVAILABLE because PR #1043 retired the workflow definitions from `main`. |
| Known limitation | RISK-1041-03 — exact-final-head workflow/browser rerun unavailable due repository CI retirement; local independent rerun also unavailable because this execution container cannot resolve GitHub/network dependencies. |
| Next | Verify exact changed-file ledger, no review blocker, current `main`, and raw GitHub clean mergeability; if clean, mark ready and merge with exact-head guard while retaining the limitation below. |

## Handover in 60 Seconds

M06 free-text catalogue JSON is gone. The UI carries only `recordId`; runtime rehydrates the exact current immutable record and binding from the existing Professional Operations catalogue immediately before constructing governed `VALVE_REPLACEMENT`. Independent review closed two real authority gaps: unresolved target DN can neither widen picker candidates nor bypass the picker through direct/rebase/internal Table intent construction. The first post-fix workflow candidate (`ef312390...`) passed main-gate, valve-specific Slice 6, Component HUD, SJSON authorities and multiple authoring suites; Slices 1/2/3 and R1 stopped only at the mandated physical line gate, with their preceding functional contracts passing (Slice 3: 28/28). The line issue was repaired by formatting only, and direct GitHub file inspection proves the intent module is now below 299 lines. PR #1043 then intentionally retired the old topology-edit workflow definitions from `main`, so later commits do not trigger that matrix. This is an infrastructure/evidence limitation, not a hidden green claim.

## Mission and Engineering Intent

Preserve:

`exact canonical VALVE row -> compatible certified record -> explicit recordId -> exact current record/hash -> governed intent -> operation plan -> Preview -> validation -> certified transaction -> canonical topology -> journal Undo/Redo`

UI filtering is not sufficient engineering authorization; exact compatibility is enforced again at the reusable intent boundary. No duplicate catalogue authority, direct canonical write, second applied history, silent fallback, or workflow weakening is introduced.

## Mission Status

| Item | Status |
|---|---|
| Free-text JSON textarea/parser removal | COMPLETE |
| Existing catalogue authority reuse | COMPLETE |
| Exact recordId -> current record/hash -> binding hydration | COMPLETE |
| BALL-only compatible candidates | COMPLETE |
| Picker exact DN fail-closed | COMPLETE |
| Intent exact DN fail-closed | COMPLETE |
| Known class/pressure/end compatibility | COMPLETE |
| Preview/Validate non-mutating; journal Apply | COMPLETE |
| Exact-number work report | COMPLETE |
| `<300` touched-module compliance | COMPLETE |
| Initial full browser/workflow qualification | COMPLETE on `4bb20e...` |
| Post-fix behavioral qualification | PARTIAL but high-signal on `ef312390...`; known failures line-gate-only |
| Exact-final-head Chromium rerun | NOT_RUN — infrastructure retired by #1043 |

## Engineering Item Register

| ID | Type | Status | Finding / action |
|---|---|---|---|
| ISS-1041-01 | Authority | RESOLVED | Arbitrary pasted catalogue JSON removed. |
| DEC-1041-01 | Architecture | ACCEPTED | Professional Operations specification catalogue remains sole catalogue authority. |
| DEC-1041-02 | Architecture | ACCEPTED | UI stores stable selection identity only; runtime rebuilds exact binding from current authority. |
| ISS-1041-02 | Correctness | RESOLVED | Missing/invalid/non-positive target DN previously wildcarded candidate filtering; now zero candidates/rejected selection. |
| ISS-1041-03 | Authority | RESOLVED | Reusable Table intent previously skipped size comparison when target DN unresolved; now exact positive finite target DN is mandatory. |
| ISS-1041-04 | Line budget | RESOLVED | `topology-edit-table-intent.js` reached exactly 300 physical lines. Formatting-only compaction restores `<300` without behavior/error-text change. |
| RISK-1041-01 | Process custody | RESOLVED | Legacy descriptive report removed; this numbered report is authoritative. |
| RISK-1041-02 | Integration | RESOLVED TO FINAL-GATE BASIS | P0 #1036 is merged; #1041’s changed production paths do not overlap #1036’s production paths. Raw GitHub mergeability remains authoritative at merge time. |
| RISK-1041-03 | Qualification infrastructure | ACCEPTED / EXPLICIT | PR #1043 retired the old topology-edit workflow files from default branch before the final report-sync candidate, so GitHub returns no new workflow runs for that final head. A local clone/Chromium rerun was attempted but the execution container has no DNS/network access (`Could not resolve host: github.com`). Retired CI will not be restored or weakened. Exact-final Chromium is explicitly not claimed. |

## Stage Roadmap and Protocol

### S1 — Authority design — COMPLETE
Arbitrary JSON input was replaced by exact existing catalogue record authority. No duplicate catalogue ownership introduced.

### S2 — UI/runtime integration — COMPLETE
Textarea/parser removed; selector feeds the existing governed replacement path. No direct canonical mutation or separate history.

### S3 — Initial qualification — COMPLETE
Initial head `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`: all 20 triggered workflows passed, including production Chromium authorities and Table/Component HUD suites.

### S4a — Picker DN fail-closed — COMPLETE
`compatibleNumber()` now requires finite positive exact target/candidate DN. Tests prove null/zero/non-numeric target yields zero candidates and selected-record rejection.

### S4b — Intent DN fail-closed — COMPLETE
`normalizeValveReplacement()` rejects unresolved/non-positive/non-finite target DN before intent construction and then requires exact nominal-size equality. Direct `createTopologyEditTableIntent()` regression added.

### S4c — Physical line-budget closure — COMPLETE

**Pre-stage truth:** candidate `ef312390a184cc5009c495100fe593ac33fe7da3` was behaviorally correct but `topology-edit-table-intent.js` was exactly 300 physical lines.

**Evidence:** Slice 3 contracts passed 28/28 and then the source guard reported the exact 300-line failure. Slice 1 Node contracts and Slice 2 authority contracts passed before the same guard class failed. R1 exact-head/patch hygiene passed before its physical-line guard. On the same candidate, main-gate, Slice 6, Component HUD, SJSON Render/Interaction, inline/component/valve/tee-olet/blind-flange authoring, LAFEA and non-FEA were successful.

**Implementation:** formatting-only compaction of the new unresolved-target-DN throw in `6c022105a7b5f56001ccda39e30b4882f4a99aa1`.

**Direct final proof:** GitHub file retrieval at lines 299–305 for the later report-sync candidate returns no source content, proving the touched module is below the `<300` ceiling.

**Deviation:** none. No behavior, error text, catalogue logic, planner, Preview, validation, transaction, journal, test expectation, or workflow was changed.

**Stage decision:** COMPLETE.

### S5 — Final qualification and merge custody — IN_PROGRESS

**Current truth:** no known engineering blocker remains. Exact-final workflow rerun cannot occur through the retired workflow set, and local rerun is unavailable in this execution environment. This limitation is now permanent evidence rather than an unstated assumption.

**Merge rule:** proceed only if the exact final PR head has the exact 19-file ledger, no unresolved review/comment blocker, current `main` is re-read, and raw GitHub reports a clean merge. Merge must use `expected_head_sha`; do not force through a conflict or protection failure.

## Next-Agent Handover

1. Confirm final changed-file list equals this ledger.
2. Confirm no new review/comment/thread blocker.
3. Re-read current `main` and raw PR mergeability immediately before merge.
4. Mark ready and merge with exact-head guard only if clean.
5. Do not claim exact-final Chromium; cite RISK-1041-03.
6. Continue topology-aware TEE/reducer selection in a separate numbered work report/PR.

## Changed-File Ledger

- `agents/PR1041_workreport.md`
- `e2e/helpers/topology-edit-table-engineering-fixture.js`
- `e2e/topology-edit-component-hud-catalog.spec.js`
- `e2e/topology-edit-table-authority.spec.js`
- `e2e/topology-edit-table-q3-concurrency.spec.js`
- `public/fixtures/topology-edit-professional-spec-catalog.json`
- `src/workspace/topology-edit/professional/topology-edit-inline-component-operation.js`
- `src/workspace/topology-edit/professional/topology-edit-spec-catalog-binding.js`
- `src/workspace/topology-edit/table/topology-edit-table-intent.js`
- `src/workspace/topology-edit/table/topology-edit-table-valve-catalogue.js`
- `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
- `src/workspace/viewport-productivity/topology-edit-table-engineering-editor.js`
- `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
- `src/workspace/viewport-productivity/topology-edit-table-grid-view.js`
- `tests/topology-edit-component-hud-context.test.mjs`
- `tests/topology-edit-table-engineering-editor.test.mjs`
- `tests/topology-edit-table-m04-m06-m10.test.mjs`
- `tests/topology-edit-table-selection-contract.test.mjs`
- `tests/topology-edit-table-valve-catalogue.test.mjs`

Any mismatch is a closure blocker until recorded.

## Decisions and Invariants

- Canonical topology + certified journal remain sole engineering mutation/history authorities.
- Catalogue authority remains existing `TopologyEditSpecificationCatalogue.v3` custody.
- Exact target DN is mandatory in picker and reusable intent boundaries.
- No free-text fallback or inferred catalogue record.
- Preview/Validate remain non-mutating; Apply remains certified atomic transaction.
- Retired workflows are not reintroduced and guards are not weakened to manufacture qualification evidence.

## Validation Ledger

| Candidate | Result |
|---|---|
| `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0` | 20/20 triggered workflows PASS before independent remediation; includes production Chromium coverage. |
| `3841842733d4eae4a6e4cb49661c3c872a63fa52` | Picker DN remediation code/test head. |
| `7f5ace9869938882375e1a323b7b9e2787fce045` | Intent DN remediation code/test head. |
| `ef312390a184cc5009c495100fe593ac33fe7da3` | High-signal post-fix run: main-gate/Slice6/Component HUD/SJSON and multiple authoring suites PASS; Slices 1/2/3 + R1 blocked only by exact 300-line guard, with preceding contracts PASS. |
| `6c022105a7b5f56001ccda39e30b4882f4a99aa1` | Formatting-only line-budget repair source head. |
| `065da981895c562abc9a2f4e23279ba927365eed` | Report-sync candidate; source line budget directly proven, but no workflow triggered after #1043 workflow retirement. |
| Final disclosure-report head | No engineering-source change from `065da981...`; no old workflow run is expected by repository design. |

## Evidence Ledger

- Slice 3 failed job `93887985197`: 28/28 Node contracts PASS; exact 300-line guard failure only.
- Slice 1 job `93887985010`: Node contracts PASS; source/line guard failure.
- Slice 2 job `93887984973`: authority contracts PASS; line guard failure.
- R1 job `93887985574`: exact-head/patch hygiene PASS; physical-line guard failure before browser stage.
- Direct final source proof: fetching `topology-edit-table-intent.js` lines 299–305 at `065da981...` returned empty content.
- P0 #1036 merged as `304f6ff32a0f383cd92793b1c57d7d99d61b4152`.
- PR #1043 intentionally retired obsolete topology-edit workflow definitions from `main`; no restoration was made.
- Local clone/browser attempt failed due execution-container DNS/network unavailability, not application behavior.
- Independent PR audit found no comments, submitted reviews, or unresolved review threads before final merge checks.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| Real Chromium on exact final disclosure-report head | NOT_RUN | Old workflow definitions were retired by merged PR #1043; local execution environment cannot resolve network/dependencies. |
| Re-execution of Slices 1/2/3/R1 after the formatting-only line repair | NOT_RUN | Same retired-CI limitation. The prior behavioral candidate passed their functional pre-guard steps; only the line guard failed. |
| Wider valve families | NOT_APPLICABLE | Out of scope. |
| Catalogue authoring/source ingestion | NOT_APPLICABLE | Separate authority slice. |

## Known / Deferred Work

- Broader valve-family replacement.
- Catalogue source authoring/ingestion.
- Topology-aware TEE/reducer candidate derivation.
- NODE_POSITION production-browser qualification using the repository’s current qualification mechanism rather than retired workflows.
- Certified support editing/movement semantics.

## Recommended Forward Sequence

1. Merge #1041 if the final raw PR state is clean and review-free, retaining RISK-1041-03 explicitly.
2. Implement topology-aware TEE/reducer choices.
3. Add full NODE_POSITION browser qualification under the current repository qualification mechanism.
