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
| Failed final candidate | `ef312390a184cc5009c495100fe593ac33fe7da3` |
| P0 predecessor | PR #1036 merged to `main` as `304f6ff32a0f383cd92793b1c57d7d99d61b4152` |
| Status | DRAFT / line-budget repair registered before source change |
| Current stage | S4c — physical line-budget closure |
| Last completed stage | S4b — reusable intent DN fail-closed closure |
| Engineering state | PASS behaviorally; one packaging guard blocker remains |
| Validation state | `ef312390...`: main-gate and valve Slice 6 PASS; Slices 1/2/3 + R1 FAIL only at `<300` line gate; Slice 3 functional contracts PASS 28/28 |
| Blocker | ISS-1041-04: `topology-edit-table-intent.js` is exactly 300 physical lines; repository requires `<300`. |
| Next | Apply formatting-only reduction with no behavior change, then re-run exact-head qualification. |

## Handover in 60 Seconds

M06 free-text catalogue JSON is removed. The UI carries only `recordId`; runtime rehydrates the exact current immutable catalogue record and binding before creating governed `VALVE_REPLACEMENT`. Independent review closed two engineering authority gaps: unresolved target DN no longer widens picker candidates, and direct/rebase/internal Table intent callers cannot construct M06 without positive finite exact target DN. The current candidate failed four workflows only because the intent module reached exactly 300 physical lines. Their functional contract steps passed; the line-budget guard is the sole known blocker. This report records that finding before any source repair.

## Mission and Engineering Intent

Preserve:

`exact canonical VALVE row -> compatible certified record -> explicit recordId -> exact current record/hash -> governed intent -> operation plan -> Preview -> validation -> certified transaction -> canonical topology -> journal Undo/Redo`

UI filtering is not engineering authorization; exact compatibility is also enforced at the reusable intent boundary. No catalogue cache, direct canonical write, second Undo stack, or workflow weakening is allowed.

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
| `<300` touched-module compliance | BLOCKED — ISS-1041-04 |
| Final current-head qualification | PENDING |

## Engineering Item Register

| ID | Type | Status | Finding / action |
|---|---|---|---|
| ISS-1041-01 | Authority | RESOLVED | Arbitrary pasted catalogue JSON removed. |
| DEC-1041-01 | Architecture | ACCEPTED | Professional Operations specification catalogue remains sole catalogue authority. |
| DEC-1041-02 | Architecture | ACCEPTED | UI stores stable selection identity only; runtime rebuilds exact binding from current authority. |
| ISS-1041-02 | Correctness | RESOLVED | Missing/invalid/non-positive target DN previously wildcarded candidate filtering; now zero candidates/rejected selection. |
| ISS-1041-03 | Authority | RESOLVED | Reusable Table intent previously skipped size comparison when target DN unresolved; now exact positive finite target DN is mandatory. |
| ISS-1041-04 | Line budget | OPEN | `src/workspace/topology-edit/table/topology-edit-table-intent.js` is 300 physical lines after ISS-1041-03; Slices 1/2/3 and R1 fail the mandated `<300` guard. Repair must be formatting-only and preserve semantics/tests. |
| RISK-1041-01 | Process custody | RESOLVED | Legacy descriptive report removed; this numbered report is authoritative. |
| RISK-1041-02 | Integration | RESOLVED TO REVIEW BASIS | P0 #1036 is merged. #1041 changed-file set is disjoint from #1036 production files; GitHub must still prove final clean mergeability. |

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

### S4c — Physical line-budget closure — IN_PROGRESS

**Pre-stage truth:** candidate `ef312390a184cc5009c495100fe593ac33fe7da3` has correct behavior but `topology-edit-table-intent.js` is exactly 300 physical lines.

**Empirical evidence:**
- Table Slice 3 Node contracts: 28/28 PASS, then `topology-edit-table-slice1-check.mjs` failed `300 physical lines; modules must remain <300`.
- Table Slice 1: Syntax + Node contracts PASS, exact-head/source guard FAIL.
- Table Slice 2: Syntax + Table authority contracts PASS, exact-head/line guard FAIL.
- R1: exact-head/patch hygiene PASS, physical line-budget guard FAIL before browser steps.
- main-gate PASS; Table Slice 6 PASS; catalogue/HUD and several authoring suites PASS on the same candidate.

**Objective:** restore `<300` without changing engineering semantics.

**Plan:** compact only the newly added unresolved-DN throw formatting; do not extract new authority or modify behavior. Re-run focused and broad exact-head qualification.

**Expected:** source module <300; all previously passing contracts unchanged; Slices 1/2/3 and R1 progress beyond line gate.

**Stage decision:** IN_PROGRESS.

### S5 — Final qualification and merge — PENDING
After S4c, require exact final head, clean changed-file ledger, no unresolved review threads/comments, GitHub clean mergeability against `main@304f6ff...` or later, and green qualification evidence. Then mark ready and merge with `expected_head_sha`.

## Next-Agent Handover

1. Make only the registered S4c formatting repair.
2. Re-fetch final 19-file ledger; no unregistered path allowed.
3. Confirm focused valve tests and direct intent regression pass through CI.
4. Confirm Slices 1/2/3/R1 clear the line gate and no downstream new failure appears.
5. Re-check raw PR `mergeable_state` against current main.
6. Mark ready and merge only with exact-head guard.
7. Continue with topology-aware TEE/reducer selection in a new numbered work report/PR.

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
| `ef312390a184cc5009c495100fe593ac33fe7da3` | FAIL only known line-budget gates: Slices 1/2/3 + R1; main-gate/Slice6 and multiple suites PASS |
| Post-S4c candidate | NOT_RUN |

## Evidence Ledger

- Slice 3 failed job `93887985197`: 28/28 Node contracts PASS; line check reports exact 300-line violation.
- Slice 1 job `93887985010`: Node contracts PASS, source guard FAIL.
- Slice 2 job `93887984973`: Table authority contracts PASS, line guard FAIL.
- R1 job `93887985574`: exact-head/patch hygiene PASS, physical line guard FAIL.
- P0 support dependency PR #1036 merged as `304f6ff32a0f383cd92793b1c57d7d99d61b4152`.
- Review audit found no comments, submitted reviews, or unresolved review threads.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| Post-S4c exact head | NOT_RUN | Repair not applied yet. |
| Production Chromium after final S4c | NOT_RUN | R1 stopped at line guard on failed candidate. |
| Wider valve families | NOT_APPLICABLE | Out of scope. |
| Catalogue authoring/source ingestion | NOT_APPLICABLE | Separate authority slice. |

## Known / Deferred Work

- Broader valve-family replacement.
- Catalogue source authoring/ingestion.
- Topology-aware TEE/reducer candidate derivation.
- NODE_POSITION production-browser qualification.
- Certified support editing/movement semantics.

## Recommended Forward Sequence

1. Close ISS-1041-04 and requalify exact head.
2. Merge #1041 if clean/green.
3. Implement topology-aware TEE/reducer choices.
4. Add full NODE_POSITION browser qualification.
