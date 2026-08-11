# PR 1041 Work Report — Certified Engineering Table Valve Catalogue Selection

## PR Mission Control

| Field | Current truth |
|---|---|
| Mission | Remove arbitrary valve catalogue JSON input and make Engineering Table valve replacement use only exact compatible immutable catalogue authority. |
| Source | User-directed P1 catalogue-HUD closure; reviewed against `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md`. |
| PR | #1041 — `fix(3d-edit): certify Engineering Table valve catalogue selection` |
| Branch | `agent/certified-valve-catalogue-selection` |
| Base | `main` (original implementation base `a587867963cc9199caca6e7adfa03af95a316aa2`) |
| Initial qualified implementation HEAD | `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0` |
| UI DN-remediation code/test head | `3841842733d4eae4a6e4cb49661c3c872a63fa52` |
| Status | DRAFT / independent review remediation active |
| Current stage | S4b — reusable Table-intent DN fail-closed closure |
| Last completed stage | S4a — picker candidate DN fail-closed correction |
| Engineering state | PARTIAL — UI picker is fail-closed; reusable intent normalizer still permits unresolved target DN and must be tightened |
| Validation state | Initial 20-workflow suite PASS on `4bb20e...`; current remediation heads are not yet claimed qualified |
| Blockers | ISS-1041-03 plus final integration qualification after P0 #1036 merge |
| Next | Tighten `normalizeValveReplacement()` to require exact positive target DN, add focused intent regression, then requalify. |

## Handover in 60 Seconds

The M06 JSON textarea/parser is gone. Production UI carries only `recordId`; runtime resolves the current immutable record from `controller.professionalRuntime.catalogue` and rebuilds catalogue binding authority before creating `VALVE_REPLACEMENT`. Independent review first found that unresolved `dnInMm` widened UI candidate matching; that is fixed and tested. A second authority-layer finding is now open: `createTopologyEditTableIntent()` currently calls `finitePositive(row.fields.dnInMm)` and skips size comparison when it returns `null`. Because this function is reusable outside the DOM picker, an unresolved-DN row could still construct an engineering intent if supplied a catalogue binding directly. The intent contract itself must fail closed, not rely exclusively on UI filtering.

## Mission and Engineering Intent

Preserve:

`exact canonical VALVE row -> certified compatible record -> explicit recordId -> exact current record/hash -> governed VALVE_REPLACEMENT intent -> operation plan -> Preview -> validation -> certified transaction -> canonical topology -> journal Undo/Redo`

Authority must be enforced at each reusable boundary. UI filtering is not a substitute for intent normalization.

## Mission Status

| Item | Status |
|---|---|
| Free-text JSON textarea/parser removed | COMPLETE |
| Existing certified specification catalogue reused | COMPLETE |
| Exact recordId -> current record/hash -> binding hydration | COMPLETE |
| BALL-only candidate filtering | COMPLETE |
| Picker requires exact positive finite target DN | COMPLETE |
| Reusable Table intent requires exact target DN | BLOCKED — ISS-1041-03 |
| Known piping/pressure/end compatibility filtering | COMPLETE |
| Unknown/incompatible/tampered catalogue rejection | COMPLETE |
| Preview/Validate non-mutating / journal Apply | COMPLETE |
| Exact-number work-report custody | COMPLETE |
| Final current-head/post-#1036 integration qualification | PENDING |

## Engineering Item Register

| ID | Type | Status | Finding / action |
|---|---|---|---|
| ISS-1041-01 | Authority | RESOLVED | Arbitrary pasted catalogue JSON removed from M06 production path. |
| DEC-1041-01 | Architecture | ACCEPTED | Professional Operations specification catalogue remains the sole catalogue authority. |
| DEC-1041-02 | Architecture | ACCEPTED | UI stores selection identity only; binding is rebuilt from current immutable authority before staging. |
| ISS-1041-02 | Correctness | RESOLVED | Picker treated missing/invalid/non-positive target DN as wildcard. Candidate predicate now requires finite positive exact DN and focused tests cover null/zero/non-numeric input. |
| ISS-1041-03 | Authority / fail-closed | OPEN | `normalizeValveReplacement()` permits unresolved target DN by skipping the size comparison. Require `finitePositive(row.fields.dnInMm)` to succeed or throw, then enforce exact nominal-size equality. Add direct `createTopologyEditTableIntent()` regression. |
| RISK-1041-01 | Process custody | RESOLVED | Descriptive legacy report replaced by `agents/PR1041_workreport.md`. |
| RISK-1041-02 | Integration | OPEN | Original qualification predates P0 #1036; final merge must be re-evaluated against updated `main`. |

## Stage Roadmap and Protocol

### S1 — Authority design — COMPLETE
Pre-stage: arbitrary JSON could enter Table catalogue binding. Objective: reuse exact existing catalogue. Actual: pure catalogue binding projection plus exact record selection. Decision: COMPLETE.

### S2 — UI/runtime integration — COMPLETE
Textarea/parser removed; selector stages same governed `VALVE_REPLACEMENT`; no direct canonical write or second Undo. Decision: COMPLETE.

### S3 — Initial qualification — COMPLETE
Head `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`: all 20 triggered workflows completed successfully. Decision: COMPLETE for that head.

### S4a — Picker DN fail-closed remediation — COMPLETE

**Finding:** Table projection can emit `dnInMm: null` / `UNRESOLVED`; picker number predicate widened such rows.

**Files:** `topology-edit-table-valve-catalogue.js`, `tests/topology-edit-table-valve-catalogue.test.mjs`.

**Implementation:** both target and candidate DN must be finite, positive and equal within epsilon. Null/zero/non-numeric targets return no candidates and selected-record resolution fails.

**Decision:** COMPLETE; final CI still pending.

### S4b — Intent-layer DN fail-closed remediation — IN_PROGRESS

**Current truth:** reusable Table intent normalization does not require target DN authority; `finitePositive()` returning `null` bypasses mismatch validation.

**Objective:** ensure direct/rebase/internal callers cannot construct M06 intent without exact target DN.

**Planned files:**
- `src/workspace/topology-edit/table/topology-edit-table-intent.js`
- `tests/topology-edit-table-m04-m06-m10.test.mjs`
- this report

**Plan:** if target `dnInMm` is unresolved/non-positive/non-finite, throw a stable M06 target-DN error before accepting catalogue binding; otherwise require exact nominal-size equality. Add direct intent tests for unresolved target DN and mismatch.

**Expected behavior:** no reusable Table M06 intent exists without exact target nominal-size authority.

**Scope guard:** do not change catalogue loading, class/pressure/end optional-known-value semantics, operation planning, Preview, validation, transaction, or journal behavior.

### S5 — Final qualification and integration — PENDING
Merge #1036 first, then re-fetch #1041 mergeability/checks against new main. Never bypass stale/failed required checks.

## Next-Agent Handover

1. Close ISS-1041-03 exactly at intent normalization plus focused test.
2. Verify final changed-file list against ledger.
3. Confirm current-head workflows after remediation.
4. Merge P0 #1036 first.
5. Re-evaluate #1041 against updated main; mark ready and merge only if protections pass.
6. Start topology-aware TEE/reducer derivation as a separate PR/report.

## Changed-File Ledger

Expected final paths after ISS-1041-03:

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

Any discrepancy blocks closure until recorded.

## Decisions and Invariants

- Catalogue authority remains `TopologyEditSpecificationCatalogue.v3` owned by Professional Operations.
- UI identity is not catalogue engineering data; exact record/hash is rehydrated from current authority.
- No free-text catalogue fallback.
- Exact target DN is mandatory both for picker candidates and reusable intent normalization.
- Known class/pressure/end evidence constrains candidates; missing optional evidence is not synthesized.
- Preview/Validate remain non-mutating; Apply is certified transaction boundary; canonical journal remains sole applied Undo/Redo authority.
- No workflow or architecture guard weakening.

## Validation Ledger

Initial head `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`: PASS on all 20 triggered workflows (main-gate; Table Slices 1/2/3/4/6/7/8; SJSON Render/Interaction; R1; Tool Audit; Component HUD; Inline/Component/Valve/Tee-Olet/Blind-Flange authoring; LAFEA; non-FEA).

Picker remediation head before report sync: `3841842733d4eae4a6e4cb49661c3c872a63fa52`; final CI not yet claimed.

Intent remediation: NOT_RUN — code change not yet applied.

## Evidence Ledger

- Initial qualified SHA: `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`.
- Picker remediation code/test SHA: `3841842733d4eae4a6e4cb49661c3c872a63fa52`.
- Projection evidence: unresolved nominal size is representable as `dnInMm: null` / `UNRESOLVED`.
- Intent evidence: `normalizeValveReplacement()` currently skips comparison when `finitePositive()` returns null.
- Review state: no comments, no submitted reviews, no unresolved review threads at independent audit.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| ISS-1041-03 remediation | NOT_RUN | Registered before code change. |
| Combined state after #1036 | NOT_RUN | P0 not yet merged. |
| Wider valve families | NOT_APPLICABLE | Out of scope. |
| Catalogue authoring/source ingestion | NOT_APPLICABLE | Separate authority slice. |

## Known / Deferred Work

- Broader valve-family replacement.
- Catalogue authoring/source ingestion.
- Topology-aware TEE/reducer candidate derivation.
- NODE_POSITION production-browser qualification.
- Certified support editing/movement semantics.
- Multi-cell paste/fill/range editing.

## Recommended Forward Sequence

1. Close ISS-1041-03 and requalify.
2. Merge #1036 P0.
3. Re-evaluate and merge #1041 against updated main.
4. Implement topology-aware TEE/reducer choices.
5. Add full NODE_POSITION browser qualification.
