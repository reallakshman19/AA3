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
| Picker DN-remediation head | `3841842733d4eae4a6e4cb49661c3c872a63fa52` |
| Intent DN-remediation code/test head | `7f5ace9869938882375e1a323b7b9e2787fce045` |
| Status | DRAFT / independent review remediation complete / final qualification pending |
| Current stage | S5 — final qualification and post-P0 integration |
| Last completed stage | S4b — reusable Table-intent DN fail-closed closure |
| Engineering state | PASS on independent review — picker and reusable intent both require exact positive finite target DN |
| Validation state | Initial 20-workflow suite PASS on `4bb20e...`; current final-head CI is pending and must be read from GitHub before merge |
| Blockers | Final current-head checks plus re-evaluation against `main` after #1036 lands |
| Next | Verify final ledger/checks, merge #1036 first, then re-evaluate #1041 against updated main and merge only if protections pass. |

## Handover in 60 Seconds

M06 no longer has a free-text catalogue JSON path. The production selector derives compatible BALL record IDs from `controller.professionalRuntime.catalogue`; runtime exact-resolves the current immutable record and reconstructs catalogue binding authority immediately before creating `VALVE_REPLACEMENT`. Independent review closed two fail-closed gaps: (1) the picker no longer treats missing/invalid target DN as a wildcard, and (2) `createTopologyEditTableIntent()` itself now rejects unresolved target DN so non-DOM/rebase/internal callers cannot bypass exact size authority. Focused tests cover null/zero/non-numeric picker DN and direct intent rejection. No catalogue loader, planner, Preview, validation, canonical transaction, or journal authority was replaced.

## Mission and Engineering Intent

Preserve:

`exact canonical VALVE row -> certified compatible record -> explicit recordId -> exact current record/hash -> governed VALVE_REPLACEMENT intent -> operation plan -> Preview -> validation -> certified transaction -> canonical topology -> journal Undo/Redo`

Exact compatibility is enforced at reusable boundaries; UI filtering alone is never considered sufficient engineering authorization.

## Mission Status

| Item | Status |
|---|---|
| Free-text JSON textarea/parser removed | COMPLETE |
| Existing certified specification catalogue reused | COMPLETE |
| Exact recordId -> current record/hash -> binding hydration | COMPLETE |
| BALL-only candidate filtering | COMPLETE |
| Picker exact nominal-size authority | COMPLETE |
| Reusable Table-intent exact nominal-size authority | COMPLETE |
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
| ISS-1041-02 | Correctness | RESOLVED | Picker wildcarded missing/invalid/non-positive target DN. Candidate predicate now requires finite positive exact DN; null/zero/non-numeric tests added. |
| ISS-1041-03 | Authority | RESOLVED | Reusable Table intent skipped size validation when target DN was unresolved. `normalizeValveReplacement()` now throws unless target DN is positive/finite, then enforces exact nominal-size equality. Direct intent regression added. |
| RISK-1041-01 | Process custody | RESOLVED | Descriptive report replaced by `agents/PR1041_workreport.md`; obsolete file removed. |
| RISK-1041-02 | Integration | OPEN | Initial qualification predates P0 #1036; final merge must be re-evaluated against updated `main`. |

## Stage Roadmap and Protocol

### S1 — Authority design — COMPLETE
Pre-stage arbitrary JSON could enter Table catalogue binding. Replaced with exact existing catalogue record authority. Decision: COMPLETE.

### S2 — UI/runtime integration — COMPLETE
Textarea/parser removed; exact record selection feeds the same governed intent and transaction path. Decision: COMPLETE.

### S3 — Initial qualification — COMPLETE
Head `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`: all 20 triggered workflows completed successfully. Decision: COMPLETE for that head.

### S4a — Picker DN fail-closed remediation — COMPLETE

**Finding:** projection can represent `dnInMm: null` / `UNRESOLVED`; picker widened such rows.

**Files:** `src/workspace/topology-edit/table/topology-edit-table-valve-catalogue.js`, `tests/topology-edit-table-valve-catalogue.test.mjs`.

**Actual:** both target and candidate DN must be finite, positive and equal within epsilon. Null/zero/non-numeric targets return no candidates and selected-record resolution rejects.

**Decision:** COMPLETE.

### S4b — Intent-layer DN fail-closed remediation — COMPLETE

**Finding:** reusable `normalizeValveReplacement()` used `finitePositive()` but skipped nominal comparison when it returned null.

**Files:** `src/workspace/topology-edit/table/topology-edit-table-intent.js`, `tests/topology-edit-table-m04-m06-m10.test.mjs`, this report.

**Implementation:** unresolved/non-positive/non-finite target DN now throws `replacement valve target nominal size must be positive and finite`; valid target DN must exactly equal catalogue binding nominal size.

**Test:** direct `createTopologyEditTableIntent()` against a projection with unresolved valve DN must throw before intent construction.

**Deviation:** none. Class/pressure/end optional-known-value semantics, catalogue loading, planners, Preview, validation, transaction and journal are unchanged.

**Actual behavior:** no Table M06 intent exists without exact target nominal-size authority.

**Validation:** code and regression are committed; final CI is not claimed until GitHub reports it.

**New findings:** none.

**Stage decision:** COMPLETE.

### S5 — Final qualification and integration — IN_PROGRESS

**Current truth:** independent review remediation is complete. Initial pre-remediation suite was green. #1036 is the mandated P0 predecessor.

**Plan:** verify current-head CI; merge #1036 first; then re-fetch #1041 base/head mergeability/checks. If stale/conflicting/blocked, refresh rather than bypass.

**Expected:** combined candidate contains P0 support dependency closure plus certified valve catalogue selection with exact DN authority at both picker and intent layers.

## Next-Agent Handover

1. Confirm final changed-file list equals ledger.
2. Confirm current final-head workflows and focused tests pass.
3. Merge #1036 first.
4. Re-fetch #1041 after main changes; do not rely solely on old-base green evidence.
5. Mark ready and merge with `expected_head_sha` only when protections pass.
6. Start topology-aware TEE/reducer derivation in a separate PR/report.

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

Any discrepancy blocks closure until recorded.

## Decisions and Invariants

- Catalogue authority remains `TopologyEditSpecificationCatalogue.v3` owned by Professional Operations.
- UI identity is not catalogue engineering data; exact record/hash is rehydrated from current authority.
- No free-text catalogue fallback.
- Exact target DN is mandatory in picker candidate derivation and reusable Table intent normalization.
- Known class/pressure/end evidence constrains candidates; missing optional evidence is not synthesized.
- Preview/Validate remain non-mutating; Apply is certified transaction boundary; canonical journal remains sole applied Undo/Redo authority.
- No workflow or architecture guard weakening.

## Validation Ledger

Initial head `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`: PASS on all 20 triggered workflows (main-gate; Table Slices 1/2/3/4/6/7/8; SJSON Render/Interaction; R1; Tool Audit; Component HUD; Inline/Component/Valve/Tee-Olet/Blind-Flange authoring; LAFEA; non-FEA).

Picker remediation code/test head: `3841842733d4eae4a6e4cb49661c3c872a63fa52`.

Intent remediation code/test head: `7f5ace9869938882375e1a323b7b9e2787fce045`.

Final report-sync head CI: **pending GitHub query; do not infer PASS**.

## Evidence Ledger

- Initial qualified SHA: `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`.
- Picker remediation SHA: `3841842733d4eae4a6e4cb49661c3c872a63fa52`.
- Intent remediation SHA: `7f5ace9869938882375e1a323b7b9e2787fce045`.
- Projection evidence: unresolved nominal size is representable as `dnInMm: null` / `UNRESOLVED`.
- Review state: no comments, submitted reviews, or unresolved review threads at independent audit.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| Final report-sync head CI | NOT_RUN / pending query | This report update creates the final candidate head. |
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

1. Verify current final-head qualification.
2. Merge #1036 P0.
3. Re-evaluate and merge #1041 against updated main.
4. Implement topology-aware TEE/reducer choices.
5. Add full NODE_POSITION browser qualification.
