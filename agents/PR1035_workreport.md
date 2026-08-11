# PR1035 — LFEA Standalone Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Separate LFEA into an independently bootable/testable/releasable application while preserving governed engineering authority from source through execution, recovery, History, semantic Compare, persistence, publication, dossier, and final extraction. |
| Source task / issue | Advanced_Analysis #1024 — LFEA Standalone Application — separation, product hardening, and next-level roadmap |
| PR number | 1035 |
| Branch | `agent/lfea-standalone-s1-1024` |
| Base commit | Separation merge base `f8486ee75c39c33483742607b7d18ee42ebcde5d`; PR targets `main` |
| Current HEAD | Stage-8 code head before this report sync: `3047664c1e9f91cbca93236affcf13c4387613f2`; GitHub branch metadata is authoritative after the report commit. |
| PR status | DRAFT |
| Current stage | Stage 9 — standalone persistence isolation |
| Last completed stage | Stage 8 — semantic run Comparison; stage decision PARTIAL |
| Engineering status | Source → Review → Model → reviewed B-3.3 execution → CURRENT/STALE raw authority → governed B-3.4 recovery → Results → immutable LFEA History → semantic Compare is implemented in the standalone product. |
| Validation status | On Stage-8 code head `3047664c…`: `main-gate` PASS, LAFEA hybrid browser validation PASS, non-FEA input/load check PASS. Focused standalone Results/History/Compare and full aggregate remain NOT_RUN because no authorized execution path exists from this environment. |
| Current blocker | Exact execution of `node scripts/run-lfea-standalone-check.mjs`. Local checkout still fails DNS resolution; CodingRules prohibit adding/modifying `.github/workflows/*` without explicit authorization. |
| Exact next action | Implement bounded LFEA persistence for non-authoritative product preferences/recent-source metadata only; do not make browser storage engineering evidence or run authority. |

> A report commit cannot embed its own final SHA without becoming self-referential. The explicit stage code head above is the tested/source-reviewed implementation anchor; GitHub PR metadata is authoritative for the report-sync head.

## Handover in 60 Seconds

### What is now true

- LFEA boots through an independent standalone entry/build path.
- Governed InputXML Source → Review → Model reuses retained repository authority rather than recreating it.
- Native execution remains behind `solveInputXmlLinearAnalysis()`.
- B-3.3 raw evidence and B-3.4 recovery are distinct authorities.
- Raw/recovery currentness is an application relation, not mutation of sealed evidence.
- Results expose raw GLOBAL displacement/reactions and recovered LOCAL/GLOBAL element-end actions with canonical units.
- History is LFEA-owned, immutable and in-memory; run identity binds exact source/pre-flight/authorization/model/case/method/recovery/application lineage.
- History selection is view context only.
- Compare is operator-visible and works only from retained History run IDs.
- Compare extracts only governed B-3.3/B-3.4 quantities already present in retained evidence.
- A numeric delta is produced only when quantity, dimension, unit, basis, sign convention, entity/end, physical case, result authority and method identity are compatible.
- Changed local-axis identity blocks LOCAL action comparison while compatible GLOBAL quantities can still compare.
- Missing local-axis or method identity yields explicit non-comparable state, never an assumed match.
- Comparison selection does not mutate current execution/Results authority.
- Current `main` remains 18 commits beyond the separation merge base, confined to topology/table node-position work at last reconciliation.

### What is being worked on

- Stage 9 — explicit LFEA persistence namespace/adapter for bounded non-authoritative product state.

### What remains unfinished

1. exact standalone aggregate execution;
2. persistence isolation;
3. governed support-action/code-result publication;
4. Verification/dossier;
5. standalone browser golden journey;
6. physical-LAFEA-absence rehearsal;
7. physical extraction.

### What must not be assumed

- matching field names imply comparability;
- browser storage may authorize solve/recovery or become the sole copy of engineering evidence;
- selected historic/comparison runs are current;
- raw/recovered/support/code quantities are interchangeable;
- narrow workflow failures are product calculation failures;
- committed standalone checks have executed.

### Highest-risk remaining item

- exact-head executable proof of the standalone aggregate.

### Exact next action

- implement Stage 9 persistence adapter and product consumer; persist only bounded UI/recent-source metadata, then add guards proving LAFEA storage changes cannot alter LFEA engineering authority.

## Mission and Engineering Intent

The separation changes product composition and ownership without changing engineering truth. Presentation, History, Compare and persistence may project/retain governed evidence but may not mint, repair or reinterpret solver authority.

### Governing invariants

1. Source custody is fail-closed.
2. Reviewed execution is mandatory.
3. UI/persistence state never authorizes solve/recovery.
4. Run identity is bound to exact governed lineage.
5. Raw/recovered/support/code stages remain distinct.
6. Historic evidence is immutable.
7. History/Compare selection is view context only.
8. Comparison requires an explicit semantic compatibility tuple.
9. Null/blocked values never become false zero.
10. Persistence must be explicitly namespaced and non-authoritative.
11. Engineering evidence must not depend solely on browser storage.
12. No hidden engineering defaults.
13. No new LAFEA runtime coupling.
14. No `.github/workflows/*` changes without explicit owner authorization.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Standalone entry/shell/build | P0 | IMPLEMENTED | prior | standalone HTML/bootstrap/Vite boundary |
| Source → Review → Model authority | P0 | IMPLEMENTED | prior | governed InputXML custody/pre-FEA chain |
| Reviewed B-3.3 execution | P0 | IMPLEMENTED | prior | governed solve + production raw executor |
| CURRENT/STALE raw authority | P0 | IMPLEMENTED | prior | `src/lfea/native-execution-authority.js` |
| Governed B-3.4 recovery/Results | P0 | IMPLEMENTED | Stage 5 | production recovery + Results authority/view |
| Neutral sparse runtime ownership | P0 | IMPLEMENTED | prior | `src/core/shared-linear-solve/*` |
| LFEA-owned run History | P0 | IMPLEMENTED | Stage 7 | immutable deterministic run records |
| Semantic Compare | P0 | IMPLEMENTED | Stage 8 | semantic quantity extraction + Compare product view |
| Persistence isolation | P1 | IN_PROGRESS | Stage 9 | plan below |
| Support/code publication | P1 | DEFERRED | later | existing governed chains to be composed |
| Verification/dossier | P1 | DEFERRED | later | after result authority stages |
| Full standalone E2E | P0 | DEFERRED | final | requires earlier stages |
| Physical absence rehearsal | P0 | DEFERRED | final | requires standalone qualification |
| Physical extraction | P0 | DEFERRED | last | no numerical/code-rule changes merely for extraction |
| Exact standalone aggregate | P0 | BLOCKED | ongoing | no authorized execution path; NOT_RUN |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | defect | P0 | IMPLEMENTED | General B-3.3 solver executable dependency on LAFEA sparse runtime removed through neutral `shared-linear-solve`. | Yes |
| DEC-001 | decision | P0 | ACCEPTED | Native execution only below `solveInputXmlLinearAnalysis()`. | Yes |
| DEC-002 | decision | P0 | ACCEPTED | B-3.3 raw and B-3.4 recovery remain distinct authorities. | Yes |
| DEC-003 | decision | P0 | ACCEPTED | CURRENT/STALE is a product relation, not mutation of retained engineering evidence. | Yes |
| DEC-004 | decision | P0 | ACCEPTED | Production recovery profile is explicit and retained; no fallback. | Yes |
| DEC-005 | decision | P0 | ACCEPTED | History is LFEA-owned rather than generic Workspace `AnalysisLedgerStore`. | Yes |
| DEC-006 | decision | P0 | ACCEPTED | History/Compare selection cannot mutate current execution/Results authority. | Yes |
| DEC-007 | decision | P0 | ACCEPTED | Identical History evidence deduplicates deterministically without ambient identity. | Yes |
| DEC-008 | decision | P0 | ACCEPTED | History CURRENT requires exact source/pre-flight/authorization and exact raw/recovery identity. | Yes |
| DEC-009 | decision | P0 | ACCEPTED | Compare currently covers only retained B-3.3 raw and B-3.4 recovered quantities. | Yes |
| DEC-010 | decision | P0 | ACCEPTED | Incompatible semantic tuples return `NOT_DIRECTLY_COMPARABLE`; no coerced delta. | Yes |
| DEC-011 | decision | P0 | ACCEPTED | LOCAL recovered-action basis includes exact `localAxisResultSemanticHash`; changed/missing axis identity blocks direct comparison. | Yes |
| DEC-012 | decision | P0 | ACCEPTED | Method compatibility includes requested analysis profile, frame-element profile, solver profile and, for recovery, recovery profile. | Yes |
| DEC-013 | decision | P0 | ACCEPTED | Stage 9 browser persistence is non-authoritative and may retain only bounded UI/recent-source metadata in this stage. | Yes |
| RISK-001 | risk | P0 | BLOCKED | Standalone focused/aggregate commands remain NOT_RUN. | Yes |
| RISK-002 | risk | P1 | ACCEPTED | Branch remains behind current main; current known delta is file-disjoint but final sync/requalification remains required. | Yes |
| RISK-003 | risk | P1 | ACCEPTED | Narrow LFEA workflows reject broad PR scope/candidate ancestry before intended payload. | Yes |
| RISK-004 | risk | P1 | ACCEPTED | BM3 workflow lacks expected BM1 fixture and therefore skips later payload. | Yes |
| RISK-005 | risk | P0 | ACCEPTED | Owner instructed roadmap continuation while standalone executable validation is blocked; NOT_RUN must never be promoted to PASS. | Yes |
| RISK-006 | risk | P1 | ACCEPTED | Stage-7 3D Edit render red was Playwright OS dependency provisioning HTTP 403 before product tests. | Yes |
| DEBT-001 | debt | P2 | ACCEPTED | `bootstrapLfeaStandalone` exceeds the CodingRules normal <40-logical-line function target. The file is 265 physical lines and remains a single explicit composition root; splitting it during Compare would be a broader structural refactor. Revisit only if directly required by later composition growth. | Yes |
| IMP-001 | improvement | P0 | IMPLEMENTED | Governed Results consume only CURRENT qualified raw execution. | Yes |
| IMP-002 | improvement | P0 | IMPLEMENTED | LFEA-owned immutable run History. | Yes |
| IMP-003 | improvement | P0 | IMPLEMENTED | Semantic comparison with explicit compatibility/reason codes. | Yes |
| IMP-004 | improvement | P1 | IN_PROGRESS | Persistence isolation. | Yes |

## Engineering Decisions and Invariants

| Invariant | Enforcement | Validation status |
|---|---|---|
| Reviewed execution mandatory | governed solve gate | source review; focused standalone execution NOT_RUN |
| STALE raw/recovery cannot act current | native execution/results authorities | source review; focused checks NOT_RUN |
| History evidence immutable | `native-run-history.js` | source review; History check NOT_RUN |
| History/Compare selection is view-only | standalone bootstrap runtime identity assertions | source review; focused checks NOT_RUN |
| Comparison requires semantic compatibility | `native-run-comparison.js` tuple/reason codes | source review; Compare check NOT_RUN |
| Changed local basis blocks local delta | local-axis semantic hash in basis identity | source review; Compare check NOT_RUN |
| Method/profile changes block delta | requested/frame/solver/recovery method identity | source review; Compare check NOT_RUN |
| Browser persistence cannot grant engineering authority | Stage-9 design boundary | implementation pending |
| No LAFEA runtime coupling | dependency guards + neutral sparse ownership | source review; aggregate NOT_RUN |

## Stage Roadmap and Execution Log

### Stages 1–3 — governance / PR allocation / initial reconciliation
Living report established, PR allocated and file ledger reconciled. **Stage decision: COMPLETE.**

### Stage 4 — exact-head qualification
Repository-wide gate passed, but standalone aggregate did not execute. Narrow LFEA workflows failed their own scope/ancestry checks before intended payload. **Stage decision: PARTIAL.**

### Stage 5 — governed Results
Implemented explicit production B-3.4 recovery and authority-honest Results UI. Focused/aggregate commands remain NOT_RUN. **Stage decision: PARTIAL.**

### Stage 6 — validation-path / current-main reconciliation
No authorized generic command runner was found; workflow edits are prohibited without owner authorization; local checkout still fails DNS. Known main delta is file-disjoint topology/table work. **Stage decision: PARTIAL.**

### Stage 7 — LFEA-owned History
Implemented immutable deterministic LFEA run records, exact lineage/currentness projection, read-only History UI and view-only selection. Focused/aggregate commands remain NOT_RUN. **Stage decision: PARTIAL.**

### Stage 8 — semantic run Comparison

**Implementation performed**

- Added `src/lfea/native-run-comparison.js`.
- Extracts comparison quantities only from retained run evidence:
  - B-3.3 raw nodal displacement/rotation, GLOBAL;
  - B-3.3 raw reactions, GLOBAL;
  - B-3.4 recovered element-end actions, LOCAL;
  - B-3.4 recovered element-end actions, GLOBAL.
- Uses repository authority conventions rather than UI labels:
  - reaction sign convention `SUPPORT_ACTION_ON_STRUCTURE_R_EQ_KU_MINUS_F_V1`;
  - recovered end-action convention `FRAME_END_ACTION_ON_ELEMENT_V1`.
- Semantic compatibility checks:
  - quantity ID;
  - dimension;
  - canonical unit;
  - basis identity;
  - sign convention;
  - entity identity;
  - station/end identity;
  - physical load-case hash;
  - result authority/stage;
  - method identity.
- LOCAL recovered basis is `ELEMENT_LOCAL_AXES:<localAxisResultSemanticHash>`; missing axis becomes explicit unavailable basis.
- Method identity includes requested analysis profile + frame-element profile + solver profile; recovered quantities also include recovery profile.
- `COMPARABLE` rows retain A/B, signed `B-A` delta and absolute delta.
- Any mismatch, missing quantity, unavailable basis/method or non-finite value returns `NOT_DIRECTLY_COMPARABLE` and null deltas.
- Added `src/lfea/native-comparison-controller.js`, `native-comparison-view.js`, and `native-comparison.css`.
- Compare is a real standalone navigation destination and production consumer.
- Compare selects two History run IDs independently of History selected-run context.
- Standalone bootstrap exposes `compareNativeRuns()` and `getNativeRunComparison()` and asserts comparison cannot mutate execution/Results state identity.
- Added `scripts/lfea-standalone-native-comparison-check.mjs` and included it in `scripts/run-lfea-standalone-check.mjs`.

**Deviations / findings**

- Initial comparator used solver profile alone for method identity; source review identified that frame-element formulation and recovery profile also affect meaning. Method identity was tightened before closure.
- Initial local basis representation could have allowed two missing-axis quantities to share the same unavailable marker. `BASIS_UNAVAILABLE` now blocks that case explicitly.
- Floating comparison check was corrected to use numerical tolerance rather than exact decimal subtraction equality.

**Focused comparison check coverage**

- compatible retained quantities produce signed/absolute delta;
- exact reaction/end-action convention custody;
- changed local-axis identity blocks LOCAL deltas while GLOBAL rows remain comparable;
- changed physical-case hash blocks all corresponding deltas;
- different case IDs are not paired by field name;
- solver profile change blocks comparison;
- frame-element profile change blocks comparison;
- recovery-profile change blocks recovered rows while unchanged raw rows remain comparable;
- missing local basis blocks comparison;
- every semantic tuple field independently returns its mismatch code;
- null value and unavailable method produce no delta;
- source guards prohibit generic ledger/storage/EventBus/LAFEA coupling and support/B31 derivation.

**CodingRules audit**

- `src/lfea/native-run-comparison.js`: 223 physical lines.
- `src/lfea/native-comparison-view.js`: 154 physical lines.
- `scripts/lfea-standalone-native-comparison-check.mjs`: 220 physical lines.
- `src/lfea/bootstrap.js`: 265 physical lines.
- New Compare modules are production-consumed in this PR; unused production abstractions = 0.
- No `.github/workflows/*` change.
- `DEBT-001` records the composition-root function-length exception rather than silently ignoring the normal function target.

**Changed files / reconciliation**

Five new Stage-8 paths:

- `src/lfea/native-run-comparison.js`
- `src/lfea/native-comparison-controller.js`
- `src/lfea/native-comparison-view.js`
- `src/lfea/native-comparison.css`
- `scripts/lfea-standalone-native-comparison-check.mjs`

Also intentionally updated bootstrap, main, standalone layout, aggregate checker and this report. GitHub reports **54 changed PR paths; 54/54 explained; no unexplained file**.

**Validation performed on Stage-8 code head `3047664c1e9f91cbca93236affcf13c4387613f2`**

| Validation | Status | Evidence |
|---|---|---|
| `main-gate` | PASS | exact Stage-8 code head |
| `LAFEA hybrid browser validation` | PASS | exact Stage-8 code head; separate LAFEA regression |
| `non-fea-input-check-load-calc` | PASS | exact Stage-8 code head |
| `lfea-linear-core-exact-head` | FAIL | narrow broad-PR changed-path containment rejects before intended numerical payload |
| `LFEA WP-PF1 exact-head qualification` | FAIL | historical candidate-chain guard before intended product payload |
| `M028 M029 BM3 Consolidated Qualification` | FAIL | previously documented missing BM1 fixture; later payload skipped |
| `3D Edit SJSON Interaction Authority` | NOT_RUN | still in progress at Stage-8 closure snapshot; no conclusion yet |
| `3D Edit Sjson Render Authority` | NOT_RUN | still in progress at Stage-8 closure snapshot; no conclusion yet |
| `scripts/lfea-standalone-native-comparison-check.mjs` | NOT_RUN | no authorized execution path |
| `scripts/lfea-standalone-native-history-check.mjs` | NOT_RUN | no authorized execution path |
| `scripts/lfea-standalone-native-results-check.mjs` | NOT_RUN | no authorized execution path |
| `node scripts/run-lfea-standalone-check.mjs` | NOT_RUN | local checkout DNS failure; no authorized generic CI runner |

**Stage decision: PARTIAL.** Production semantic Compare is implemented and source/diff-reviewed; executable standalone validation remains NOT_RUN.

### Stage 9 — standalone persistence isolation

**Current truth**

- The standalone LFEA modules currently contain no direct `localStorage`/`sessionStorage` usage.
- Repository-wide storage exists elsewhere, including generic Workspace settings persistence, but no LFEA-owned standalone namespace adapter exists.
- History currently remains in-memory by deliberate Stage-7 design.
- Full engineering run evidence can be large; browser localStorage is not an acceptable sole engineering evidence store.

**Objective**

Create one bounded LFEA-owned persistence boundary for non-authoritative product state while proving browser storage cannot change Source/Review/Model/Execution/Results/History engineering authority.

**Expected scope/files**

- `src/lfea/persistence.js` — explicit versioned LFEA storage adapter with caller-supplied storage object.
- `src/lfea/persisted-ui-state.js` or equivalent bounded product-state controller if required for production consumption.
- `src/lfea/bootstrap.js` — consume the adapter for supported view preferences/recent-source metadata only.
- `scripts/lfea-standalone-persistence-check.mjs` — namespace, corruption, isolation and authority guards.
- `scripts/run-lfea-standalone-check.mjs` — aggregate the focused check.
- this report.

**Allowed persisted state in Stage 9**

- active standalone view preference;
- Compare left/right run IDs only as non-authoritative UI preference if those IDs exist in current in-memory History;
- recent source metadata such as display filename/content SHA for convenience, never source content or run authorization;
- bounded standalone UI/settings values if an actual current production consumer is present.

**Explicitly prohibited in Stage 9**

- raw execution/recovery objects as localStorage engineering authority;
- pre-flight authorization as browser authority;
- source XML as an implicit current source on reload;
- automatic reconstruction of CURRENT History from storage;
- solver/recovery profile defaults from storage;
- LAFEA-owned keys/namespaces;
- direct storage access outside the adapter.

**Namespace proposal**

All keys must begin with explicit LFEA product ownership, for example:

- `lfea.ui.activeView.v1`
- `lfea.ui.compareSelection.v1`
- `lfea.source.recentMetadata.v1`

No generic `analysis.*`, `workspace.*` or `lafea.*` key may be used by the standalone adapter.

**Engineering rationale**

Persistence improves operator continuity but cannot become an alternate engineering authority chain. A stored value can help restore navigation or a recent-file label; it cannot authorize solve, mark a run current, create evidence, or repair a stale governed record.

**Planned implementation**

1. Adapter accepts explicit storage dependency; no ambient global lookup inside domain helpers.
2. Versioned JSON envelopes; parse/shape errors fail closed to “no preference” and never create engineering state.
3. Writes restricted to declared keys and bounded primitive metadata.
4. Bootstrap restores only allowed UI preference after all engineering authorities initialize empty/current by their own domain rules.
5. History/Compare selections from storage are accepted only if the referenced in-memory run currently exists; otherwise ignored.
6. Source metadata remains informational only; no file content is reconstructed.
7. Source guard fails on direct `localStorage`/`sessionStorage` use outside the adapter.

**Expected behavior / edge cases**

- missing storage → app still functions with no persistence;
- corrupted JSON → preference ignored, engineering state unchanged;
- values under LAFEA/generic namespaces → ignored;
- LAFEA storage mutation → no LFEA engineering state change;
- stale run ID in persisted Compare selection → ignored;
- source clear does not erase historic in-memory evidence merely because recent metadata changes;
- destroy may flush bounded preferences but cannot serialize engineering evidence.

**Planned validation**

- exact LFEA key allowlist and namespace;
- malformed/corrupt entries fail closed;
- storage write/read roundtrip for allowed UI metadata;
- no source XML/pre-flight/raw/recovery/history evidence serialized;
- changing unrelated/LAFEA keys cannot change standalone application state;
- bootstrap uses adapter in production;
- direct storage access source guard;
- CodingRules size/function audit;
- focused/aggregate execution status remains NOT_RUN unless authorized path becomes available.

**Known risks**

- Persisting even run IDs can confuse users if the in-memory run no longer exists; restore must validate against current History before display.
- A future durable engineering evidence store is a separate product decision and must use explicit integrity/revalidation; do not silently extend Stage-9 localStorage scope.

**Stage decision before coding: not yet applicable; Stage 9 is IN_PROGRESS after this report sync.**

## Changed-File Ledger

Current actual PR changed-file count after Stage 8: **54; 54/54 accounted**.

Stage-9 expected paths are listed above. Any new path outside the declared scope must be registered before closure. Any unexplained changed file blocks closure.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| `main-gate` | PASS | `3047664c…` | GitHub Actions exact-head |
| LAFEA hybrid browser validation | PASS | `3047664c…` | separate regression |
| non-FEA input/load check | PASS | `3047664c…` | GitHub Actions exact-head |
| narrow linear-core workflow | FAIL | `3047664c…` | scope containment before intended payload |
| narrow WP-PF1 workflow | FAIL | `3047664c…` | historic candidate-chain guard |
| BM3 consolidated workflow | FAIL | `3047664c…` | missing BM1 fixture before later payload |
| standalone Results focused check | NOT_RUN | current | no execution path |
| standalone History focused check | NOT_RUN | current | no execution path |
| standalone Compare focused check | NOT_RUN | current | no execution path |
| standalone aggregate | NOT_RUN | current | local checkout DNS failure; no authorized generic CI runner |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Source/review/run/recovery authority architecture | IMPLEMENTED | source/diff review; focused runtime NOT_RUN |
| History exact lineage/currentness | IMPLEMENTED | source/diff review; focused runtime NOT_RUN |
| Semantic Compare compatibility/reason codes | IMPLEMENTED | source/diff review; focused runtime NOT_RUN |
| Persistence isolation | IN_PROGRESS | Stage 9 plan |

### Explicitly Not Validated

- exact standalone aggregate execution;
- full browser Source→Review→Run→Results→History→Compare journey;
- persistence roundtrip in the standalone browser;
- support/code publication from standalone runtime;
- dossier/export qualification;
- physical LAFEA-absence proof.

## Known / Deferred Work and Recommended Forward Sequence

1. **Stage 9 persistence isolation** — current stage. Must precede final product qualification so E2E can prove clean reload/namespace behavior without introducing authority drift.
2. **Support/code authority** — compose existing governed support-action and B31 provenance chains after persistence boundary is stable; do not derive in UI.
3. **Verification/Dossier** — expose scope-specific qualification/evidence and fail-closed issue/export after all result authorities are wired.
4. **Full standalone E2E** — Source→Review→Run→Results→History→mutate→rerun→Compare→dossier plus negative journeys and persistence checks.
5. **Physical-absence rehearsal** — LAFEA runtime physically unavailable; standalone build/check/E2E must still work.
6. **Physical extraction** — last; clean install/build and exact qualification, no solver/code-rule change bundled merely for separation.

## Next-Agent Handover

### Current stopping point

Stage 8 Compare is implemented but executable-focused validation remains NOT_RUN. Stage 9 persistence is pre-registered and is the active production boundary.

### PR / branch / HEAD

- PR #1035
- branch `agent/lfea-standalone-s1-1024`
- Stage-8 code head `3047664c1e9f91cbca93236affcf13c4387613f2`; report-sync commit follows it.

### Last completed stage

- Stage 8 — semantic Compare; decision PARTIAL.

### Current active stage

- Stage 9 — persistence isolation.

### Start here

- `src/lfea/bootstrap.js`
- `src/lfea/native-run-history.js`
- `src/lfea/native-run-comparison.js`
- repository reference `src/workspace/settings-persistence-adapter.js` for persistence patterns, not authority reuse.

### Do not redo

- governed source/pre-FEA chain;
- B-3.3 run gate;
- B-3.4 recovery;
- neutral sparse extraction;
- History exact lineage/currentness;
- Compare semantic compatibility.

### Do not assume

- browser storage may persist engineering authority;
- Compare can infer entity mapping or unit conversion;
- same node/element label across runs is sufficient without tuple compatibility;
- standalone focused checks have executed.

### Files currently involved

Expected new Stage-9 files: persistence adapter, optionally bounded persisted-UI state consumer, focused persistence check; existing bootstrap/aggregate/report only as required.

### Known failing checks

- narrow linear-core scope containment;
- WP-PF1 candidate-chain guard;
- BM3 missing fixture;
- standalone focused/aggregate commands NOT_RUN.

### Validation still required

- standalone Results, History, Compare, Persistence focused checks;
- full standalone aggregate;
- browser golden journey;
- physical absence.

### Open QST items

- Final synchronization method with current `main` before ready-for-review.
- Future durable engineering evidence persistence mechanism; intentionally not answered by Stage 9.

### Important deferred IMP items

- support/code publication;
- Verification/dossier;
- standalone E2E;
- physical extraction.

### Highest-risk remaining item

Exact standalone aggregate execution.

### Exact next recommended action

Implement the bounded LFEA persistence adapter and production consumer exactly within the Stage-9 allowlist; add isolation/source guards; then reconcile actual files and exact-head CI before support/code work.

### Required reading

- Issue #1024
- Common `CodingRules.md` at `43eccc27967ecec7d67513c08255398b496be5ce`
- this report
- `src/lfea/bootstrap.js`
- `src/lfea/native-run-history.js`
- `src/lfea/native-run-comparison.js`
- `src/workspace/settings-persistence-adapter.js`
