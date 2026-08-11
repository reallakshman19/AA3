# PR 1041 Work Report — Certified Engineering Table Valve Catalogue Selection

## PR Mission Control

| Field | Current truth |
|---|---|
| Mission | Remove arbitrary valve catalogue JSON input and make Engineering Table valve replacement select only exact compatible immutable catalogue records. |
| Source | User-directed P1 catalogue-HUD closure; independently reviewed against `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md`. |
| PR | #1041 — `fix(3d-edit): certify Engineering Table valve catalogue selection` |
| Branch | `agent/certified-valve-catalogue-selection` |
| Base | `main` (implementation base `a587867963cc9199caca6e7adfa03af95a316aa2`) |
| Reviewed implementation HEAD | `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0` |
| Status | DRAFT / review found one P1 fail-closed defect / remediation in progress |
| Current stage | S4 — independent review remediation and closure |
| Last completed stage | S3 — implementation qualification on reviewed head |
| Engineering state | PARTIAL — core catalogue authority is sound; unresolved target DN currently widens candidate matching and must fail closed |
| Validation state | PASS on reviewed implementation HEAD; all 20 triggered workflows completed successfully, but the DN remediation requires focused revalidation |
| Blockers | ISS-1041-02 unresolved-DN wildcard; report path/structure custody discrepancy |
| Next | Remove obsolete report; change DN compatibility to require exact positive finite target DN; add focused regression; update report finding; verify checks and mergeability after #1036 lands. |

## Handover in 60 Seconds

This PR correctly removes the M06 JSON textarea and reuses `controller.professionalRuntime.catalogue` as the sole specification catalogue authority. The UI carries only `recordId`; runtime re-resolves the current immutable record and rebuilds the command binding from catalogue/record hashes before staging the existing governed `VALVE_REPLACEMENT` intent. Independent review confirmed this authority direction and all 20 triggered workflows are green on `4bb20e...`. However, `topologyEditTableValveCatalogueCandidates()` currently treats missing/invalid/non-positive `row.fields.dnInMm` as a wildcard. Table projection can emit `dnInMm: null` with `UNRESOLVED` authority, so the picker could expose BALL records without proving matching nominal size. That violates the stated exact-compatibility contract and must be fixed before merge. No merge should occur until that regression is closed and revalidated.

## Mission and Engineering Intent

Preserve the existing authority flow:

`exact canonical VALVE row -> certified catalogue candidate derivation -> explicit recordId -> exact current record/hash -> governed VALVE_REPLACEMENT intent -> operation plan -> candidate/Preview -> validation -> certified transaction -> canonical topology -> journal Undo/Redo`

The Table must never accept caller-manufactured catalogue binding JSON, nearest-size substitution, or inferred record authority. Candidate visibility itself must be truthful: every selectable record must satisfy the exact compatibility predicates the command can represent.

## Mission Status

| Item | Status | Evidence / note |
|---|---|---|
| Remove free-text JSON textarea/parser | COMPLETE | UI/runtime patches remove production JSON path |
| Reuse existing certified catalogue authority | COMPLETE | `controller.professionalRuntime.catalogue` |
| Exact recordId -> record/hash -> binding hydration | COMPLETE | catalogue binding authority + Table valve catalogue module |
| BALL-only filter | COMPLETE | candidate predicate |
| Exact nominal-size filter | BLOCKED | Missing/invalid/non-positive target DN currently behaves as wildcard; ISS-1041-02 |
| Piping/pressure/end compatibility | COMPLETE for known values | Current predicate filters when target evidence exists |
| Unknown/incompatible/tampered authority fail-closed | COMPLETE | focused tests + catalogue assertions |
| Preview/Validate non-mutating / journal Apply | COMPLETE | existing governed transaction path unchanged |
| Production/browser qualification | COMPLETE on pre-remediation head | 20 workflows green; focused remediation revalidation still required |
| CodingRules report custody | IN_PROGRESS | Exact report created; obsolete descriptive report must be removed |

## Engineering Item Register

| ID | Type | Status | Finding / action |
|---|---|---|---|
| ISS-1041-01 | Authority | RESOLVED | Production M06 accepted arbitrary pasted catalogue-shaped JSON. Replaced with certified record selection and current catalogue hydration. |
| DEC-1041-01 | Architecture | ACCEPTED | The existing Professional Operations catalogue is the sole catalogue authority; no Table cache/loader/hash authority is introduced. |
| DEC-1041-02 | Architecture | ACCEPTED | UI persists only stable record selection identity; command binding is rebuilt from exact current catalogue authority before intent construction. |
| ISS-1041-02 | Correctness / fail-closed | OPEN | `compatibleNumber()` returns true when target `dnInMm` is missing, invalid, or <= 0. Projection can legitimately emit unresolved DN, so candidate derivation can widen to unrelated BALL sizes. Fix by requiring finite positive target and candidate DN with exact equality tolerance; add missing/invalid DN tests. |
| RISK-1041-01 | Process custody | RESOLVING | Previous `agents/PR_valve_catalogue_selection_workreport.md` does not satisfy exact report filename/mandatory ledgers. This report supersedes it; obsolete report must be deleted. |
| RISK-1041-02 | Integration | OPEN | Branch was qualified from the same old base as P0 PR #1036. #1036 must land first; then #1041 must be re-evaluated against updated `main` before merge. |

## Stage Roadmap and Protocol

### S1 — Authority design — COMPLETE

**Pre-stage truth:** Table could parse arbitrary JSON supplied by an operator and feed catalogue-looking binding data downstream.

**Objective:** move authority to exact current specification catalogue record selection without changing governed replacement transaction semantics.

**Actual:** introduced pure catalogue-to-command binding projection and Table candidate/selection authority; runtime resolves current catalogue before creating the intent.

**Decision:** COMPLETE.

### S2 — UI/runtime integration — COMPLETE

**Files/areas:** valve catalogue authority, table engineering runtime/editor/grid/cell edit, existing inline-authoring compatibility export.

**Expected:** no free-text fallback; only compatible BALL records; selector stages same normalized intent path; no direct canonical mutation.

**Actual:** JSON parser/textarea removed; controlled selector added; exact binding hydration feeds existing `VALVE_REPLACEMENT` path.

**Decision:** COMPLETE subject to S4 exact-DN correction.

### S3 — Initial qualification — COMPLETE

**Implementation qualification head:** `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`.

All 20 triggered workflows completed successfully, including main-gate, Table slices, protected SJSON render/interaction, Tool Audit, R1 reachability, Component HUD, Q3 transaction coverage, and component authoring suites.

**Decision:** COMPLETE for the reviewed head.

### S4 — Independent review remediation — IN_PROGRESS

**Current truth:** independent review found no PR comments/review threads, but discovered ISS-1041-02 by comparing candidate predicate semantics to Table projection authority. `edgeFields()` can emit `dnInMm = null` / `UNRESOLVED`; `compatibleNumber()` currently treats that as compatible with every candidate size.

**Objective:** make nominal-size compatibility strictly fail closed without widening scope or altering catalogue authority.

**Files planned:**
- `src/workspace/topology-edit/table/topology-edit-table-valve-catalogue.js`
- `tests/topology-edit-table-valve-catalogue.test.mjs`
- this report

**Plan:** require finite positive observed/candidate nominal sizes and exact equality within existing epsilon; add tests for `null`, zero, and non-numeric target DN yielding no candidates and rejected selection. No changes to pressure/class/end semantics in this remediation.

**Expected behavior:** unresolved DN produces zero selectable records; no record can be staged until target DN authority is present and exact.

**Risks:** report/code commits change candidate SHA and require renewed exact-head CI evidence. PR #1036 changes `main` first, so final merge readiness must consider that updated base.

## Next-Agent Handover

1. Delete obsolete descriptive report and keep `agents/PR1041_workreport.md` as the sole PR report.
2. Fix ISS-1041-02 exactly as stated; add focused regression tests before considering merge.
3. Confirm no production `data-table-edit-valve-catalogue` textarea/free-text parser remains.
4. Confirm changed-file ledger matches final PR paths.
5. Merge #1036 first. Re-open #1041 mergeability against updated `main`; do not assume the old-base green head proves combined state.
6. Mark ready and merge only when required checks/protections are satisfied on the final current head/base state.

## Changed-File Ledger

Expected final paths after report rename/cleanup and ISS-1041-02 remediation:

- `agents/PR1041_workreport.md`
- `e2e/helpers/topology-edit-table-engineering-fixture.js`
- `e2e/topology-edit-component-hud-catalog.spec.js`
- `e2e/topology-edit-table-authority.spec.js`
- `e2e/topology-edit-table-q3-concurrency.spec.js`
- `public/fixtures/topology-edit-professional-spec-catalog.json`
- `src/workspace/topology-edit/professional/topology-edit-inline-component-operation.js`
- `src/workspace/topology-edit/professional/topology-edit-spec-catalog-binding.js`
- `src/workspace/topology-edit/table/topology-edit-table-valve-catalogue.js`
- `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
- `src/workspace/viewport-productivity/topology-edit-table-engineering-editor.js`
- `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
- `src/workspace/viewport-productivity/topology-edit-table-grid-view.js`
- `tests/topology-edit-component-hud-context.test.mjs`
- `tests/topology-edit-table-engineering-editor.test.mjs`
- `tests/topology-edit-table-selection-contract.test.mjs`
- `tests/topology-edit-table-valve-catalogue.test.mjs`

Any additional/missing path is a closure blocker until recorded and justified here.

## Decisions and Invariants

- Catalogue authority remains `TopologyEditSpecificationCatalogue.v3` owned by Professional Operations.
- UI selection identity is not catalogue engineering data; exact record/hash is rehydrated from current immutable authority.
- No free-text catalogue binding fallback is allowed.
- Nominal size must be exactly compatible; unresolved DN must not broaden candidates.
- Pressure/class/end-connection filters apply to available target evidence and must never synthesize missing values.
- Preview/Validate remain non-mutating; Apply remains the certified transaction boundary.
- Existing canonical topology and journal Undo/Redo remain authoritative.
- No workflow/guard weakening is authorized.

## Validation Ledger

Initial implementation qualification head: `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`.

| Workflow | Status on reviewed head |
|---|---|
| main-gate | PASS |
| 3D Edit Sjson Render Authority | PASS |
| 3D Edit SJSON Interaction Authority | PASS |
| 3D Edit R1 Real User Reachability | PASS |
| 3D Edit Tool Audit | PASS |
| Topology Edit Table Slice 1 | PASS |
| Topology Edit Table Slice 2 | PASS |
| Topology Edit Table Slice 3 | PASS |
| Topology Edit Table Slice 4 | PASS |
| Topology Edit Table Slice 6 | PASS |
| Topology Edit Table Slice 7 | PASS |
| Topology Edit Table Slice 8 | PASS |
| 3D Edit Component HUD | PASS |
| 3D Edit Inline Component Insertion | PASS |
| 3D Edit Component Authoring | PASS |
| 3D Edit Valve Assembly Authoring | PASS |
| 3D Edit Tee Olet Branch Authoring | PASS |
| 3D Edit Blind Flange Authoring | PASS |
| LAFEA hybrid browser validation | PASS |
| non-fea-input-check-load-calc | PASS |

Focused remediation validation for ISS-1041-02: **NOT_RUN yet**; must run after code change.

## Evidence Ledger

- Reviewed candidate SHA: `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`.
- Initial PR state: 17 changed files, +567 / -145 before report path cleanup/remediation.
- Review state: no comments, no submitted reviews, no unresolved review threads.
- Projection authority evidence: `edgeFields()` derives `dnInMm` from canonical nominal size or source-observed nominal size and may emit `null` with `UNRESOLVED` authority, proving ISS-1041-02 is reachable rather than purely defensive.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| ISS-1041-02 remediation | NOT_RUN | Code change has not yet been applied. |
| Combined state after PR #1036 merge | NOT_RUN | #1036 is P0 and must land first. |
| Wider valve families beyond existing GATE -> BALL contract | NOT_APPLICABLE | Deferred by mission. |
| Catalogue authoring/source ingestion | NOT_APPLICABLE | Separate authority slice. |

## Known / Deferred Work

- Broader valve type replacement beyond the current GATE -> BALL contract.
- Catalogue authoring and source ingestion.
- Topology-aware TEE/reducer candidate derivation (next planned PR).
- Support editing and support movement semantics.
- Multi-cell paste/fill/range editing.

## Recommended Forward Sequence

1. Close #1036 and merge P0 support dependency custody.
2. Fix ISS-1041-02, revalidate #1041 against updated main state, then merge.
3. Build topology-aware TEE -> branch port/node -> directly connected reducer -> compatible catalogue record capability derivation.
4. Add full production-browser NODE_POSITION NODE_ONLY / CONNECTED_RUN / concurrency qualification.
5. Only after those, design certified SUPPORT editing semantics.
