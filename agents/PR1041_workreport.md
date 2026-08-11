# PR 1041 Work Report — Certified Engineering Table Valve Catalogue Selection

## PR Mission Control

| Field | Current truth |
|---|---|
| Mission | Remove arbitrary valve catalogue JSON input and make Engineering Table valve replacement select only exact compatible immutable catalogue records. |
| Source | User-directed P1 catalogue-HUD closure; independently reviewed against `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md`. |
| PR | #1041 — `fix(3d-edit): certify Engineering Table valve catalogue selection` |
| Branch | `agent/certified-valve-catalogue-selection` |
| Base | `main` (implementation base `a587867963cc9199caca6e7adfa03af95a316aa2`) |
| Initial qualified implementation HEAD | `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0` |
| DN-remediation code/test head before this report update | `3841842733d4eae4a6e4cb49661c3c872a63fa52` |
| Status | DRAFT / independent review remediation implemented / requalification pending |
| Current stage | S5 — final qualification and integration after P0 merge |
| Last completed stage | S4 — unresolved-DN fail-closed remediation |
| Engineering state | PASS on review — exact target DN now required before any BALL record can appear |
| Validation state | Initial 20-workflow suite PASS on `4bb20e...`; remediation-focused/current-head CI is pending and GitHub-authoritative |
| Blockers | Final validation plus re-evaluation against `main` after #1036 lands |
| Next | Verify changed-file ledger, merge #1036 first, then re-fetch #1041 mergeability/checks and merge only if final protections pass. |

## Handover in 60 Seconds

This PR removes the M06 catalogue JSON textarea/parser and reuses `controller.professionalRuntime.catalogue` as the sole catalogue authority. UI state carries `recordId`; runtime exact-resolves the current immutable record and reconstructs the binding from catalogue/record hashes before staging the existing governed `VALVE_REPLACEMENT` intent. Independent review found a reachable fail-open: unresolved `dnInMm` was treated as a wildcard. That is now fixed. `compatibleNumber()` requires both target and candidate DN to be finite, positive, and equal within the existing epsilon; tests cover `null`, zero, and non-numeric target DN and prove zero candidates plus staging rejection. No class/pressure/end semantics or transaction authority was changed. The legacy descriptive report has been removed.

## Mission and Engineering Intent

Preserve:

`exact canonical VALVE row -> certified catalogue candidate derivation -> explicit recordId -> exact current record/hash -> governed VALVE_REPLACEMENT intent -> operation plan -> candidate/Preview -> validation -> certified transaction -> canonical topology -> journal Undo/Redo`

No caller-manufactured catalogue binding, nearest-size substitution, inferred record authority, direct topology mutation, or second applied history is permitted.

## Mission Status

| Item | Status | Evidence / note |
|---|---|---|
| Remove free-text JSON textarea/parser | COMPLETE | Production UI/runtime path removed |
| Reuse existing certified catalogue authority | COMPLETE | `controller.professionalRuntime.catalogue` |
| Exact recordId -> record/hash -> binding hydration | COMPLETE | pure catalogue binding authority + Table valve authority |
| BALL-only filtering | COMPLETE | candidate predicate |
| Exact nominal-size filtering | COMPLETE | unresolved/non-positive/non-numeric DN now fails closed |
| Known piping/pressure/end compatibility | COMPLETE | candidate predicate filters available target evidence |
| Unknown/incompatible/tampered authority rejection | COMPLETE | catalogue assertions + focused tests |
| Preview/Validate non-mutating / journal Apply | COMPLETE | governed transaction path unchanged |
| CodingRules report custody | COMPLETE | `agents/PR1041_workreport.md` is sole report |
| Final current-head / post-#1036 integration qualification | PENDING | GitHub checks and updated base must be read before merge |

## Engineering Item Register

| ID | Type | Status | Finding / action |
|---|---|---|---|
| ISS-1041-01 | Authority | RESOLVED | M06 accepted arbitrary pasted catalogue-shaped JSON. Replaced with exact current record selection/hydration. |
| DEC-1041-01 | Architecture | ACCEPTED | Existing Professional Operations specification catalogue remains sole catalogue authority. |
| DEC-1041-02 | Architecture | ACCEPTED | UI persists only stable selection identity; command binding is rebuilt immediately before governed intent construction. |
| ISS-1041-02 | Correctness / fail-closed | RESOLVED | Missing/invalid/non-positive target DN previously widened candidate matching. `compatibleNumber()` now requires finite positive exact DN; focused tests cover `null`, `0`, and non-numeric values. |
| RISK-1041-01 | Process custody | RESOLVED | Nonconforming descriptive report replaced by exact-number report; obsolete file removed. |
| RISK-1041-02 | Integration | OPEN | Branch was originally qualified on same old base as P0 #1036. #1036 must land first; then #1041 mergeability/checks must be re-evaluated against new main. |

## Stage Roadmap and Protocol

### S1 — Authority design — COMPLETE

**Pre-stage truth:** Table parsed arbitrary user JSON into catalogue binding input.

**Objective:** select exact current catalogue record without changing certified replacement semantics.

**Actual:** pure catalogue binding projection and Table record selection authority reuse the existing catalogue.

**Decision:** COMPLETE.

### S2 — UI/runtime integration — COMPLETE

**Expected:** no free-text fallback; exact BALL record IDs only; same governed intent path; no direct canonical write.

**Actual:** textarea/parser removed, controlled selector added, runtime exact-hydrates current catalogue record before intent creation.

**Decision:** COMPLETE.

### S3 — Initial qualification — COMPLETE

**Head:** `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`.

All 20 triggered workflows completed successfully, covering main-gate, Table slices, protected SJSON render/interaction, R1, Tool Audit, Component HUD, Q3 transaction and authoring suites.

**Decision:** COMPLETE for that head.

### S4 — Independent review remediation — COMPLETE

**Pre-stage finding:** Table projection can emit `dnInMm: null` / `UNRESOLVED`, while candidate `compatibleNumber()` treated missing/invalid/non-positive observed DN as compatible with any candidate.

**Objective:** make nominal-size compatibility strictly fail closed without altering other catalogue predicates or transaction paths.

**Files changed:**
- `src/workspace/topology-edit/table/topology-edit-table-valve-catalogue.js`
- `tests/topology-edit-table-valve-catalogue.test.mjs`
- this report

**Implementation:** candidate number compatibility now requires finite positive target and candidate values plus exact epsilon match. Added regression over `null`, `0`, and `not-a-number`, asserting no candidates and selection rejection.

**Deviation:** none; class/pressure/end optional-known-value semantics deliberately unchanged.

**Actual behavior:** unresolved target DN no longer exposes or stages any BALL record.

**Validation:** code/test change is committed; final CI result is not claimed here until GitHub reports it.

**New findings:** none.

**Remaining risk:** combined state with P0 #1036 has not yet been validated.

**Stage decision:** COMPLETE.

### S5 — Final qualification and merge integration — IN_PROGRESS

**Current truth:** remediation is implemented and initial pre-remediation suite was green. #1036 is the mandated P0 predecessor.

**Plan:** merge #1036 only after its current protections pass; then re-fetch #1041 current head/base mergeability and checks. Do not use old-base green evidence as sole proof if GitHub requires a refreshed candidate.

**Expected:** final candidate includes P0 support custody plus exact valve catalogue DN fail-closed behavior with no conflicts.

## Next-Agent Handover

1. Confirm final changed-file list equals ledger.
2. Confirm current branch workflows include the focused regression through main-gate/Table suites.
3. Merge #1036 first.
4. Re-fetch #1041 PR state after main changes; if GitHub reports stale/conflicting/blocked, refresh rather than bypass.
5. Mark ready and merge with `expected_head_sha` only when protections are satisfied.
6. Proceed to topology-aware TEE/reducer candidate derivation as a new PR/report.

## Changed-File Ledger

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

Any discrepancy is a closure blocker until documented.

## Decisions and Invariants

- Catalogue authority remains `TopologyEditSpecificationCatalogue.v3` owned by Professional Operations.
- UI identity is not engineering catalogue data; record/hash is rehydrated from current immutable authority.
- No free-text catalogue binding fallback.
- Target nominal size must be positive, finite and exactly compatible; unresolved DN never broadens candidates.
- Pressure/class/end filters use available target evidence and never synthesize missing values.
- Preview/Validate remain non-mutating; Apply is the certified transaction boundary.
- Canonical topology/journal Undo/Redo remain authoritative.
- No workflow or architecture guard weakening.

## Validation Ledger

Initial qualification head: `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`.

| Workflow | Initial status |
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

Remediation code/test head before this report update: `3841842733d4eae4a6e4cb49661c3c872a63fa52` — current workflow status must be fetched from GitHub before merge.

## Evidence Ledger

- Initial qualified SHA: `4bb20e33100e9d5a1e4fb8b989741f8aafe650b0`.
- DN remediation code/test head: `3841842733d4eae4a6e4cb49661c3c872a63fa52`.
- Projection evidence: canonical/source nominal may be absent, yielding `dnInMm: null` with `UNRESOLVED` authority; the remediation closes that reachable path.
- Review state at audit: no comments, no submitted reviews, no unresolved review threads.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| Final report-sync head CI | NOT_RUN / pending query | This update itself creates a new report-only head. GitHub is authoritative. |
| Combined state after #1036 merge | NOT_RUN | P0 has not yet landed. |
| Wider valve families beyond GATE -> BALL | NOT_APPLICABLE | Deferred. |
| Catalogue authoring/source ingestion | NOT_APPLICABLE | Separate authority slice. |

## Known / Deferred Work

- Broader valve-family replacement.
- Catalogue authoring/source ingestion.
- Topology-aware TEE/reducer candidate derivation (next PR).
- Production NODE_POSITION browser qualification (following PR).
- Support editing/movement semantics.
- Multi-cell paste/fill/range editing.

## Recommended Forward Sequence

1. Merge #1036 when its current protections pass.
2. Re-evaluate and merge #1041 only after current-head/post-P0 protections pass.
3. Implement topology-aware TEE -> branch port/node -> directly connected reducer -> compatible catalogue record derivation.
4. Add NODE_POSITION NODE_ONLY / CONNECTED_RUN / concurrency browser qualification.
5. Only then design certified SUPPORT editing semantics.
