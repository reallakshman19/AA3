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
| Line-budget repair code head | `6c022105a7b5f56001ccda39e30b4882f4a99aa1` |
| P0 predecessor | PR #1036 merged to `main` as `304f6ff32a0f383cd92793b1c57d7d99d61b4152` |
| Status | DRAFT / independent review remediation complete / exact-head qualification pending |
| Current stage | S5 — final qualification and merge |
| Last completed stage | S4c — physical line-budget closure |
| Engineering state | PASS on review; no known production-code blocker |
| Validation state | Post-S4c final candidate NOT_RUN yet; prior `ef312390...` failures were line-gate-only and are repaired. |
| Blocker | Exact final-head CI + clean GitHub mergeability against current main. |
| Next | Verify 19-file ledger, run/read full final-head workflow matrix, mark ready, merge with expected-head guard if green/clean. |

## Handover in 60 Seconds

M06 free-text catalogue JSON is gone. The UI carries only a stable `recordId`; runtime rehydrates the exact current immutable record and binding from the existing Professional Operations catalogue immediately before constructing governed `VALVE_REPLACEMENT`. Independent review closed two fail-closed gaps: unresolved target DN cannot widen picker candidates, and reusable Table intent callers cannot construct M06 without a positive finite exact target DN. A subsequent exact-head run exposed only a packaging guard: the intent module was exactly 300 lines. That is now repaired by formatting the newly added throw onto one line; semantics and error text are unchanged. P0 support dependency PR #1036 is already merged. Final empirical qualification remains the only gate.

## Mission and Engineering Intent

Preserve:

`exact canonical VALVE row -> compatible certified record -> explicit recordId -> exact current record/hash -> governed intent -> operation plan -> Preview -> validation -> certified transaction -> canonical topology -> journal Undo/Redo`

UI filtering is not sufficient authorization; exact compatibility is also enforced at the reusable intent boundary. No duplicate catalogue authority, direct canonical write, second applied history, silent fallback, or workflow weakening is allowed.

## Mission Status

| Item | Status |
|---|---|
| Free-text JSON textarea/parser removal | COMPLETE |
| Existing catalogue authority reuse | COMPLETE |
| Exact recordId -> record/hash -> binding hydration | COMPLETE |
| BALL-only compatible candidates | COMPLETE |
| Picker exact DN fail-closed | COMPLETE |
| Intent exact DN fail-closed | COMPLETE |
| Known class/pressure/end compatibility | COMPLETE |
| Preview/Validate non-mutating; journal Apply | COMPLETE |
| Exact-number work report | COMPLETE |
| `<300` touched-module compliance | COMPLETE |
| Final current-head qualification | PENDING |

## Engineering Item Register

| ID | Type | Status | Finding / action |
|---|---|---|---|
| ISS-1041-01 | Authority | RESOLVED | Arbitrary pasted catalogue JSON removed. |
| DEC-1041-01 | Architecture | ACCEPTED | Professional Operations specification catalogue remains sole catalogue authority. |
| DEC-1041-02 | Architecture | ACCEPTED | UI stores stable selection identity only; runtime rebuilds exact binding from current authority. |
| ISS-1041-02 | Correctness | RESOLVED | Missing/invalid/non-positive target DN previously wildcarded candidate filtering; now zero candidates/rejected selection. |
| ISS-1041-03 | Authority | RESOLVED | Reusable Table intent previously skipped size comparison when target DN unresolved; now exact positive finite target DN is mandatory. |
| ISS-1041-04 | Line budget | RESOLVED | `topology-edit-table-intent.js` reached exactly 300 physical lines. Formatting-only compaction in `6c022105...` restores `<300` without behavior or error-text change. |
| RISK-1041-01 | Process custody | RESOLVED | Legacy descriptive report removed; this numbered report is authoritative. |
| RISK-1041-02 | Integration | RESOLVED TO FINAL-GATE BASIS | P0 #1036 is merged; #1041’s 19-file delta is disjoint from #1036 production paths. Final GitHub mergeability/CI remains authoritative. |

## Stage Roadmap and Protocol

### S1 — Authority design — COMPLETE
Arbitrary JSON input was replaced by exact current catalogue record authority. No duplicate catalogue ownership introduced.

### S2 — UI/runtime integration — COMPLETE
Textarea/parser removed; selector stages the existing governed replacement path. No direct canonical mutation or separate history.

### S3 — Initial qualification — COMPLETE
Initial head `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`: all 20 triggered workflows PASS.

### S4a — Picker DN fail-closed — COMPLETE
`compatibleNumber()` now requires finite positive exact target/candidate DN. Null/zero/non-numeric target tests prove zero candidates and resolver rejection.

### S4b — Intent DN fail-closed — COMPLETE
`normalizeValveReplacement()` now rejects unresolved/non-positive/non-finite target DN before intent construction, then requires exact nominal-size equality. Direct `createTopologyEditTableIntent()` regression added.

### S4c — Physical line-budget closure — COMPLETE

**Pre-stage truth:** candidate `ef312390a184cc5009c495100fe593ac33fe7da3` was behaviorally correct but `topology-edit-table-intent.js` had exactly 300 physical lines.

**Evidence before repair:** Slice 3 contracts PASS 28/28 then line gate FAIL; Slice 1 Node contracts PASS then source guard FAIL; Slice 2 authority contracts PASS then line guard FAIL; R1 exact-head hygiene PASS then line guard FAIL. main-gate, Slice 6, Component HUD and several authoring suites PASS on the same candidate.

**Implementation:** formatting-only compaction of the new unresolved-target-DN throw in `6c022105a7b5f56001ccda39e30b4882f4a99aa1`.

**Deviation:** none. No behavior, error text, catalogue logic, planner, Preview, validation, transaction, journal, test expectation, or workflow changed.

**Actual behavior:** engineering semantics unchanged; module is again below the mandated physical-line ceiling.

**Validation:** exact final candidate workflow run remains NOT_RUN at this report update.

**Stage decision:** COMPLETE.

### S5 — Final qualification and merge — IN_PROGRESS

**Plan:** verify final 19-file ledger, no review/thread blocker, final exact-head workflow matrix, and raw GitHub clean mergeability against current main. Mark ready and merge only with `expected_head_sha` if all gates are satisfied.

## Next-Agent Handover

1. Confirm final changed-file list equals this ledger.
2. Read final exact-head workflows; do not infer from previous head.
3. Ensure Slices 1/2/3 and R1 clear the former line gate and reach their downstream tests/browser stages.
4. Confirm no new review comments/threads.
5. Confirm raw PR `mergeable_state: clean` against current main.
6. Mark ready and merge with exact-head guard.
7. Continue topology-aware TEE/reducer selection in a separate numbered work report/PR.

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
- No workflow/guard weakening to make CI pass.

## Validation Ledger

| Candidate | Result |
|---|---|
| `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0` | 20/20 triggered workflows PASS before independent remediation |
| `3841842733d4eae4a6e4cb49661c3c872a63fa52` | Picker DN remediation code/test head |
| `7f5ace9869938882375e1a323b7b9e2787fce045` | Intent DN remediation code/test head |
| `ef312390a184cc5009c495100fe593ac33fe7da3` | Known line-gate-only failures: Slices 1/2/3 + R1; main-gate/Slice6 and multiple suites PASS |
| `6c022105a7b5f56001ccda39e30b4882f4a99aa1` | Formatting-only line-budget repair code head |
| Final report-sync candidate | NOT_RUN |

## Evidence Ledger

- Slice 3 failed job `93887985197`: 28/28 Node contracts PASS; exact 300-line guard failure.
- Slice 1 job `93887985010`: Node contracts PASS; source/line guard failure.
- Slice 2 job `93887984973`: authority contracts PASS; line guard failure.
- R1 job `93887985574`: exact-head/patch hygiene PASS; physical-line guard failure.
- P0 #1036 merged as `304f6ff32a0f383cd92793b1c57d7d99d61b4152`.
- Independent PR audit found no comments, submitted reviews, or unresolved review threads before final qualification.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| Final report-sync exact head | NOT_RUN | This report update creates it. |
| Production Chromium on final head | NOT_RUN | Must be proven by final workflows. |
| Wider valve families | NOT_APPLICABLE | Out of scope. |
| Catalogue authoring/source ingestion | NOT_APPLICABLE | Separate authority slice. |

## Known / Deferred Work

- Broader valve-family replacement.
- Catalogue source authoring/ingestion.
- Topology-aware TEE/reducer candidate derivation.
- NODE_POSITION production-browser qualification.
- Certified support editing/movement semantics.

## Recommended Forward Sequence

1. Qualify and merge #1041 if green/clean.
2. Implement topology-aware TEE/reducer choices.
3. Add full NODE_POSITION browser qualification.
