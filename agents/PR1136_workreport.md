# PR1136 — Master Data Persistence and Empirical Load Formula Fixes

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Pull request: `#1136`
- Branch: `feat/master-data-persistence-and-load-calc-fixes`
- Base branch: `main`
- Live main at grounding: `793f359c0bcb59296cf4541430855f79357c4329`
- Original PR head reviewed: `e052c0d6ce26cfcbab4f75efefd8a78e81e38709`
- REPORT_BASIS_HEAD: `793f359c0bcb59296cf4541430855f79357c4329`
- Work intent: `REVIEW -> SALVAGE -> IMPLEMENT -> VALIDATE -> MERGE`
- Criticality: `ENGINEERING_CRITICAL`
- Mutation authority: `WRITE_ALLOWED` by owner instruction on 2026-08-15
- Merge authority: `AUTHORIZED` by owner instruction on 2026-08-15, subject to closure gates
- Execution mode: normal (AUTO MODE not invoked)

## Handover in 60 Seconds

PR #1136 originally contained legitimate master-data persistence and line-list operating-density work mixed with unsafe engineering shortcuts. The original head was reviewed and then deliberately rebuilt from current `main` rather than patched in place. The preserved mission is: persist source-backed master rows and source hashes across browser reload; resolve operating fluid density from mapped line-list data with explicit, fail-closed precedence; expose that resolved value to normalized master data and preview UI; and permit physically valid zero insulation thickness / zero density for explicitly uninsulated codes. Do not add synthetic master data, guessed pipe geometry, guessed component weights, fake hashes, or any authorization bypass.

## Grounding / salvage decision

Original head findings:

- `ISS-1136-001` **BLOCKER** — fabricated hash placeholders (`'0'.repeat(64)`, `'1'.repeat(64)`, etc.) could masquerade as provenance.
- `ISS-1136-002` **BLOCKER** — `EngineeringModelController.calculate()` caught authorized execution failure and directly invoked calculation, bypassing authorization/fail-closed behavior.
- `ISS-1136-003` **BLOCKER** — hidden engineering defaults guessed operating density, component mass, OD, wall thickness, material density, insulation properties and a synthetic line ID.
- `ISS-1136-004` **MAJOR** — MIXED phase selected liquid density before an available mixed density; this can materially overstate two-phase weight.
- `ISS-1136-005` **MAJOR** — branch was materially diverged from current main and had no PR work report.
- `ISS-1136-006` **MAJOR** — IndexedDB clear path in the original implementation did not remove stored rows, allowing cleared data to reappear after reload.

Disposition: `SALVAGE_PARTIAL`. Original head was preserved in Git history/review discussion, then branch ref was rebuilt from live main `793f359...`.

## Mission / acceptance

1. Persist only user/source-backed master rows, normalized rows, file/sheet identity, SHA-256 and byte length; missing hash remains missing.
2. Clear removes both in-memory/local mapping state and persisted row payload so stale masters cannot resurrect.
3. Operating-density resolution order is explicit:
   - process override, when explicitly supplied;
   - direct/mapped operating density;
   - exact phase-specific density (`MIXED -> mixed`, `GAS -> gas`, `LIQUID -> liquid`);
   - if phase is absent/unrecognized, use a phase-specific value only when exactly one candidate exists;
   - ambiguous/missing density remains unresolved; no `1000 kg/m3` fallback.
4. Preserve range policy already owned by `resolveDensityRangeToMax`; this PR does not redefine conservative range treatment.
5. Store/display resolved operating fluid density and resolution source in normalized line-list data.
6. Project Data permits `insulationThicknessMm = 0` and zero insulation density only for explicit `NONE`/`UNINSULATED` keys; other governed densities/section values remain positive.
7. No changes to empirical reaction equations, authorization flow, support distribution, default master catalogues, or production calculation eligibility.
8. Add focused regression/source guards and reconcile every changed file before merge.

## Authority trace / invariants

`master file bytes -> SHA-256/source metadata -> master-data controller -> normalized row -> Project Data evidence/source binding -> authorized common input -> empirical calculation -> publication`

Must remain invariant:

- Missing source authority fails closed.
- UI/preview state does not become calculation authority.
- Master edits stale existing common/empirical authority and do not calculate directly.
- No production result is published from synthetic fallback values.
- Existing `CHAINAGE_TRIBUTARY_SPAN_V2/V3` numerical distribution formulas are unchanged.

## Implementation plan

- `IMP-1136-001` — add fail-closed field-map-aware operating density resolver.
- `IMP-1136-002` — normalize/display resolved operating density and density source.
- `IMP-1136-003` — persist source-backed master payload in IndexedDB; delete payload on clear.
- `IMP-1136-004` — narrowly correct zero-insulation validation semantics.
- `IMP-1136-005` — extend containment/regression checks for density precedence, ambiguity, provenance and no authorization bypass.

## Validation ledger — baseline

| ID | Status | Observation | Oracle | Evidence / limitation |
|---|---|---|---|---|
| VAL-1136-001 | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | Current main requires `dataset.sourceSha256` and governed common-input authority; synthetic hashes are incompatible with that contract. |
| VAL-1136-002 | PASS | SOURCE_INSPECTION | INDEPENDENT_REPRODUCTION | MIXED fluid with explicit mixed and liquid densities must use the mixed/operating mixture density, not the liquid-only density. |
| VAL-1136-003 | NOT_RUN | NOT_OBSERVED | NONE | Exact-head repository scripts not yet run; implementation not yet applied. |
| VAL-1136-004 | NOT_RUN | NOT_OBSERVED | NONE | GitHub Actions exact-head status pending post-implementation. |

## Changed-file ledger

Current durable change at this checkpoint:

- `agents/PR1136_workreport.md` — recovery/authority/validation record.

Planned files are not yet claimed as changed until written.

## Review / CI state

- Original-head engineering review comment submitted on PR #1136.
- Original PR head rejected for merge; salvage rebuild in progress.
- No workflow run was associated with original head when inspected.

## Coordination state

`SAFE_WITH_REBUILD`: current main was used as the new basis. The reconstructed scope is confined to master-data persistence, line-list density resolution/preview, validation semantics and focused checks; no overlap with the LAFEA.3 solver changes merged in PR #1134 is intended.

## Exact continuation state

Implement the five `IMP-1136-*` items on this branch. After each material change, refresh this report, inspect the exact PR diff, run or obtain the focused checks, verify no unauthorized fallback patterns, mark PR ready only after exact-head review, then merge using expected head SHA.

## Appendix A — takeover qualification

Qualification basis: repository-specific evidence on live main and original PR head. Threshold: >=92/100 total and >=17/20 each.

### A1 — Production trace — 20/20

Trace: `parseMasterFile()` hashes source bytes -> `MasterDataController.setRawRows()` retains `sourceHash` -> normalized master data -> Project Data source evidence -> `buildCurrentPreFeaRequestInput()` requires active dataset SHA/common-field resolution -> authorized empirical consumer -> support-load distribution. Prediction: replacing a missing hash with a syntactically valid fake hash can pass format checks while severing provenance. Falsifier: an upstream authoritative API that independently recomputes and verifies the bytes against that fake value; none exists in the reviewed path.

### A2 — Failure isolation — 20/20

The original calculation failure must not be repaired downstream by calling `engineeringModelStore.calculate(masterData)` after authorized execution throws. First wrong boundary is missing/incomplete input authority, not the support reaction arithmetic. Prediction: removing the bypass will surface the actual blocked reason while preserving previous numerical methods. Falsifier: evidence that the authorized path itself produces wrong reactions with complete valid inputs; not shown by this PR.

### A3 — Authority / invariant — 20/20

Source hashes, master rows and Project Data approvals are engineering authority; UI preview and convenience defaults are not. No fallback may invent density, component weight, OD/wall, line identity or hash. `MASTER_DATA_UPDATED` must stale existing authorization rather than auto-run a new calculation.

### A4 — Independent validation — 19/20

Density test matrix will isolate direct, mixed, gas, liquid, unique-candidate and ambiguous cases. Analytical gravity consequence is linear: fluid weight error scales directly with density error for fixed bore/length, so selecting liquid density for a two-phase mixture can violate a ±20% reaction target before any structural approximation is considered. One mark retained because project-specific cross-solver/load-sheet evidence is outside this PR.

### A5 — Minimal next patch — 19/20

Rebuild from current main; preserve only source-backed persistence, density mapping, zero-insulation validation and tests. Do not carry the 28k-line generated default masters, authorization changes, load-run eligibility changes or unrelated CSS. One mark retained because browser-level IndexedDB E2E execution may depend on available CI/runtime tooling.

**Score: 98/100 — PASS.** Engineering-critical implementation authority may proceed within the stated scope.
