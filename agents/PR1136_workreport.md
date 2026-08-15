# PR1136 — Master Data Persistence and Empirical Load Formula Fixes

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Pull request: `#1136`
- Branch: `feat/master-data-persistence-and-load-calc-fixes`
- Base branch: `main`
- Live main at grounding and final implementation comparison: `793f359c0bcb59296cf4541430855f79357c4329`
- Original PR head reviewed: `e052c0d6ce26cfcbab4f75efefd8a78e81e38709`
- REPORT_BASIS_HEAD: `b9c3e94e1f181cfead4a03d9826162443233c401`
- Report-closing commit: documentation-only; production implementation is fully represented by `REPORT_BASIS_HEAD`.
- Work intent: `REVIEW -> SALVAGE -> IMPLEMENT -> VALIDATE -> MERGE`
- Criticality: `ENGINEERING_CRITICAL`
- Mutation authority: `WRITE_ALLOWED` by owner instruction on 2026-08-15
- Merge authority: `AUTHORIZED` by owner instruction on 2026-08-15, subject to closure gates
- Execution mode: normal (AUTO MODE not invoked)

## Handover in 60 Seconds

PR #1136 was recovered rather than merged in its original form. The original head mixed legitimate source-hash persistence and operating-density work with unsafe fake hashes, authorization bypasses, guessed engineering defaults, a physically incorrect MIXED-density fallback, huge hidden master catalogues, and stale IndexedDB clear behavior. The branch was rebuilt from current `main`, retaining only a narrow source-backed master persistence and density-resolution change.

Final production behavior:

- authoritative master rows plus real SHA-256 metadata persist across reloads;
- clear deletes the persisted row payload and cannot be undone by an earlier queued write;
- operating density is source-driven and field-map aware;
- direct/mapped operating density outranks phase-specific values;
- `MIXED -> mixed`, `GAS -> gas`, `LIQUID -> liquid` exactly;
- missing recognized-phase density fails closed;
- an unclassified phase may use a phase-specific value only when exactly one candidate exists;
- a legacy detector-promoted `densityMixed -> density` mapping cannot masquerade as direct operating density;
- explicitly custom-mapped direct operating-density columns remain authoritative;
- zero insulation thickness is accepted only for an explicitly `NONE`/`UNINSULATED` section;
- zero insulation density is accepted only for `NONE`/`UNINSULATED` keys;
- empirical support reaction equations and authorization flow are unchanged.

## Grounding / salvage decision

Original head findings:

- `ISS-1136-001` **BLOCKER / RESOLVED_BY_REBUILD** — fabricated hash placeholders (`'0'.repeat(64)`, `'1'.repeat(64)`, etc.) could masquerade as provenance.
- `ISS-1136-002` **BLOCKER / RESOLVED_BY_REBUILD** — authorized execution failure was caught and replaced by direct calculation, bypassing fail-closed authority.
- `ISS-1136-003` **BLOCKER / RESOLVED_BY_REBUILD** — hidden defaults guessed operating density, component mass, OD, wall thickness, material density, insulation properties and a synthetic line ID.
- `ISS-1136-004` **MAJOR / RESOLVED** — MIXED phase selected liquid density ahead of the mixed density.
- `ISS-1136-005` **MAJOR / RESOLVED** — original branch diverged materially from live main and had no work report.
- `ISS-1136-006` **MAJOR / RESOLVED** — original IndexedDB clear path did not delete the stored row payload.
- `ISS-1136-007` **MAJOR / RESOLVED_DURING_REVIEW** — legacy line-list detector may promote `densityMixed` into generic `density`; resolver now distinguishes raw direct authority from that compatibility promotion.
- `ISS-1136-008` **MAJOR / RESOLVED_DURING_REVIEW** — zero insulation thickness was initially too broadly allowed; it is now limited to explicitly uninsulated sections.

Disposition: `SALVAGE_PARTIAL -> IMPLEMENTED_AND_REVIEWED`. The original unsafe head remains visible in PR history/review evidence but is not part of the final diff.

## Mission / acceptance closure

1. **PASS** — persist only user/source-backed master rows, normalized rows, file/sheet identity, SHA-256 and byte length; missing hash remains missing.
2. **PASS by source review** — clear queues IndexedDB deletion after prior writes and increments mutation revision so stale restore cannot overwrite new state.
3. **PASS** — operating-density precedence is explicit and fail-closed; no `1000 kg/m3` fallback.
4. **PASS** — existing range-to-maximum policy remains unchanged.
5. **PASS** — normalized/preview line-list data carries resolved operating density and source label.
6. **PASS by source review** — zero insulation semantics are narrowly restricted to explicit uninsulated state.
7. **PASS** — no empirical reaction equation, support distribution, authorization-flow, hidden master catalogue, or production run-eligibility change is present in the final diff.
8. **PASS** — focused regression and anti-fallback guards are committed.

## Authority trace / invariants

`master file bytes -> SHA-256/source metadata -> master-data controller -> normalized row -> Project Data evidence/source binding -> authorized common input -> empirical calculation -> publication`

Negative assurance:

- Missing source authority still fails closed.
- UI/preview state does not become calculation authority.
- Master edits stale existing common/empirical authority and do not calculate directly.
- No production result is published from synthetic fallback values.
- `CHAINAGE_TRIBUTARY_SPAN_V2/V3` distribution equations are unchanged.
- `EngineeringModelController` authorization flow is unchanged from current main.
- `LoadCalcConsumerController` production eligibility/default behavior is unchanged from current main.

## Implemented items

- `IMP-1136-001` **DONE** — fail-closed field-map-aware operating-density resolver.
- `IMP-1136-002` **DONE** — normalized and preview-visible resolved density/provenance.
- `IMP-1136-003` **DONE** — IndexedDB source-backed master persistence with serialized writes, stale-restore guard and delete-on-clear.
- `IMP-1136-004` **DONE** — explicit uninsulated zero-thickness/zero-density validation semantics.
- `IMP-1136-005` **DONE** — focused formula/provenance regression and anti-fallback guards.

## Validation ledger

| ID | Status | Observation | Oracle | Exact evidence / limitation |
|---|---|---|---|---|
| VAL-1136-001 | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | Final diff preserves current-main source-hash/common-input authority and contains no fake SHA fallback. |
| VAL-1136-002 | PASS | LOCAL_EXECUTION | ANALYTICAL | Exact current resolver code executed with Node against 10 cases: direct, MIXED, GAS, LIQUID, unique candidate, ambiguous candidate, missing MIXED, range-max, legacy promoted mapping, custom mapped direct density. Output: `PASS: 10 exact current resolver cases`. |
| VAL-1136-003 | PASS | SOURCE_INSPECTION | INDEPENDENT_REPRODUCTION | `MIXED` selects mixed density and cannot fall through to liquid. Weight contribution is linear in selected fluid density for fixed bore/length, so the previous fallback could directly corrupt load accuracy. |
| VAL-1136-004 | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | `compare_commits(793f359..., b9c3e94...)`: status `ahead`, ahead 16, behind 0; exactly 9 intended files. No solver/reaction/authorization controller file changed. |
| VAL-1136-005 | PASS | SOURCE_INSPECTION | INDEPENDENT_REPRODUCTION | Project Data rule allows zero insulation only for explicit `NONE`/`UNINSULATED`; zero wall, zero positive insulation density, and zero thickness with positive insulation code remain blocked. Focused script contains those cases. |
| VAL-1136-006 | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | `parseMasterFile()` computes SHA-256 from actual source bytes and `MasterDataController.setRawRows()` stores the returned hash/byte length; final persistence code carries those values unchanged. |
| VAL-1136-007 | NOT_RUN | NOT_OBSERVED | NONE | Full `node scripts/pr1136-master-density-check.mjs` was not executed from a complete repository checkout in this session. Its exact source is committed; resolver mechanics were separately executed as VAL-1136-002. |
| VAL-1136-008 | NOT_RUN | NOT_OBSERVED | NONE | Browser IndexedDB reload/clear E2E was not executable through the GitHub connector-only environment. Reviewed source sequencing is recorded, but no browser PASS is claimed. |
| VAL-1136-009 | NOT_RUN | NOT_OBSERVED | NONE | Exact-head GitHub Actions: no workflow runs and no commit statuses were returned for implementation head `b9c3e94...`; repository main history records the current Actions-budget limitation. |
| VAL-1136-010 | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | PR is mergeable against current main before report-only close; branch was not behind current main. |

## Changed-file ledger at REPORT_BASIS_HEAD

- `scripts/pr1136-master-density-check.mjs` — focused density/provenance/zero-insulation/anti-fallback regression.
- `src/calc-workspace/cii-standalone-port/core/line-density-resolver.js` — corrected operating-density authority and phase logic.
- `src/calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-fields-config.js` — recognizes operating-density and explicit phase-density columns.
- `src/calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-import-masters.js` — user-visible tooltip matches the fail-closed formula.
- `src/calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-import-preview-search.js` — exposes resolved density/source in preview/search projection.
- `src/workspace/master-data-controller.js` — persists source-backed rows/hashes and deletes durable rows on clear.
- `src/workspace/master-data-normalizers.js` — carries resolved operating density and provenance into canonical line-list rows.
- `src/workspace/project-data/project-data-contract.js` — narrowly validates explicit uninsulated zero thickness/density.
- `agents/PR1136_workreport.md` — living engineering handover and closure evidence.

No other production files are changed.

## Review / CI / merge disposition

- Original-head review: **BLOCKED** and documented on PR #1136.
- Rebuilt exact implementation review: **NO REMAINING ENGINEERING BLOCKER FOUND**.
- Merge-base state at implementation head: `ahead=16`, `behind=0`, `mergeable=true`.
- GitHub Actions/statuses: **NOT_RUN / none returned**; do not interpret as PASS.
- Branch-protection details could not be read by the GitHub integration (`403`); the merge API remains the authoritative enforcement point for any required checks.
- Owner supplied explicit merge authority in this conversation.
- Final disposition: `READY_FOR_MERGE`, with CI/browser E2E limitations retained in this report and no false PASS claim.

## Coordination state

`SAFE_WITH_REBUILD`: current main was used as the branch basis. The final scope is confined to master-data persistence, line-list density resolution/preview, validation semantics and focused checks; no overlap with the LAFEA.3 solver changes merged in PR #1134 is introduced.

## Exact continuation state

This report-closing commit is documentation-only. Mark PR #1136 ready, re-read the exact head and mergeability, check workflows/statuses once more, leave a final review disposition, then merge using the exact final head SHA. After merge, verify PR `merged=true` and `main` points to the returned merge commit.

## Appendix A — takeover qualification

Qualification basis: repository-specific evidence on live main and original PR head. Threshold: >=92/100 total and >=17/20 each.

### A1 — Production trace — 20/20

Trace: `parseMasterFile()` hashes source bytes -> `MasterDataController.setRawRows()` retains `sourceHash` -> normalized master data -> Project Data source evidence -> `buildCurrentPreFeaRequestInput()` requires active dataset SHA/common-field resolution -> authorized empirical consumer -> support-load distribution. Prediction: replacing a missing hash with a syntactically valid fake hash can pass format checks while severing provenance. Falsifier: an upstream authoritative API that independently recomputes and verifies the bytes against that fake value; none exists in the reviewed path.

### A2 — Failure isolation — 20/20

The original calculation failure must not be repaired downstream by calling `engineeringModelStore.calculate(masterData)` after authorized execution throws. First wrong boundary is missing/incomplete input authority, not the support reaction arithmetic. Prediction: removing the bypass surfaces the actual blocked reason while preserving previous numerical methods. Falsifier: evidence that the authorized path itself produces wrong reactions with complete valid inputs; not shown by this PR.

### A3 — Authority / invariant — 20/20

Source hashes, master rows and Project Data approvals are engineering authority; UI preview and convenience defaults are not. No fallback may invent density, component weight, OD/wall, line identity or hash. `MASTER_DATA_UPDATED` must stale existing authorization rather than auto-run a new calculation.

### A4 — Independent validation — 19/20

Density tests isolate direct, mixed, gas, liquid, unique-candidate, ambiguous, promoted-mapping and custom-mapping cases. Analytical gravity consequence is linear: fluid weight error scales directly with density error for fixed bore/length, so selecting liquid density for a two-phase mixture can violate a ±20% reaction target before any structural approximation is considered. One mark retained because project-specific cross-solver/load-sheet evidence is outside this PR.

### A5 — Minimal next patch — 19/20

The branch was rebuilt from current main and retains only source-backed persistence, density mapping, zero-insulation validation and tests. It does not carry the original 28k-line generated default masters, authorization changes, load-run eligibility changes or unrelated CSS. One mark retained because browser-level IndexedDB E2E execution remains unavailable in this connector-only session.

**Score: 98/100 — PASS.** Engineering-critical implementation and merge authority are valid within the stated scope and recorded limitations.
