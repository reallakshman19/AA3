# PR1492 Work Report — Issue #1321 D3 Current Effective-Value Inspection

## Recovery header
- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1492 — `Load Calc: expose current effective engineering values`
- Branch: `agent/issue-1321-effective-value-inspection`
- Base branch: `main`
- Exact base: `3a54862127c601f3e4c59159526e7345fc06cf4c`
- Source-complete reconciliation head observed before final recovery update: `774bf56301106c64f626bfd6e68ded3e79db0be7`
- Criticality: ENGINEERING_CRITICAL
- Execution mode: AUTO
- Merge authority: OWNER_ONLY_NOT_GRANTED
- State: SOURCE_COMPLETE_REVIEW_PENDING_EXECUTION

## Mission
Expose the exact current Common Input **resolution decisions** in Load Calc Step 3 so an engineer can inspect the selected target value, authority, source/revision, basis and competing-candidate custody without creating another resolver or altering numerical mechanics.

## Why this slice is independent of PR #1491
PR #1491 qualifies X/Y/Z source-axis metadata/sign binding for scalar gravity and remains unmerged pending execution. PR #1492 starts from merged `main` and does not touch source-axis mechanics, Product-default profile version, support-load formulas, Run, or solver behavior. Its only runtime dependency is the already-live current Common Input request builder.

## Production trace used by D3
`renderProjectDataView()`
→ `renderNonFeaCalculationDefaultsView()`
→ `renderNonFeaCalculationEffectiveValuesInspector()`
→ `buildCurrentPreFeaRequestInput()`
→ existing `resolveNonFeaEnrichment()` result in `resolutionLedger`
→ `createCalculationEffectiveValuesInspection()` read-only projection
→ Step-3 Advanced inspection table.

No call from the inspector invokes `resolveNonFeaEnrichment()`, `resolveNonFeaEffectiveValues()`, sealing, authorized execution, or empirical runtime APIs.

## Authority boundary
The current Common Input field-resolution ledger remains the decision authority. D3 does not:
- change precedence;
- create or approve evidence;
- promote Product defaults;
- seal Common Input;
- authorize or execute Run;
- alter support-load/statics, route, CoG, solver or tolerance logic.

If `buildCurrentPreFeaRequestInput()` cannot produce current authority, the inspector renders `UNAVAILABLE` with the actual error code/message and invents no fallback value.

## Important completeness limit
`non-fea-field-resolution-ledger/v1` is a **decision ledger**, not a complete duplicate of the source model. Source-only values that have no competing enrichment/default candidate may require no resolution row. PR #1492 therefore labels the UI as **Current resolver decisions** and explicitly states that it is not a complete calculation-input inventory.

The existing versioned Product-default catalog remains separately visible in Calculation Defaults. PR #1492 does not falsely relabel a global Product default as a target-level winner unless the existing current resolver actually supplies that evidence.

## Implemented source cut
1. Added `non-fea-calculation-effective-values-model.js`:
   - accepts only `non-fea-field-resolution-ledger/v1`;
   - mirrors `selected` rather than recomputing precedence;
   - preserves selected authority, source ID, record ID, revision, basis/default/scope evidence;
   - retains candidate count and candidate authorities;
   - retains BLOCKED/unresolved decision rows rather than dropping them;
   - does not mutate the source ledger.
2. Added `non-fea-calculation-effective-values-view.js`:
   - consumes `buildCurrentPreFeaRequestInput().resolutionLedger`;
   - renders a read-only Advanced Step-3 table;
   - displays unavailable current authority fail-closed;
   - distinguishes target resolver decisions from Product-global catalog assumptions.
3. Updated `project-data-view.js` to attach the inspector only for the Load Calc Calculation Defaults route. Non-Load-Calc Project Data routing is unchanged.
4. Added `non-fea-calculation-effective-values-inspection-check.mjs` with synthetic source/master/project-default/blocked custody cases and source guard assertions.
5. Registered the focused falsifier in `scripts/run-non-fea-checks.mjs`.

## Focused falsifier coverage
Fixture proves, when executable:
- SOURCE_EXPLICIT selected over a shadowed PROJECT_CONFIGURED_DEFAULT is mirrored exactly;
- EXACT_APPROVED_MASTER winner is mirrored;
- PROJECT_CONFIGURED_DEFAULT winner retains default ID/scope/basis;
- BLOCKED same-authority candidate custody remains visible;
- input resolution ledger is not mutated;
- Step-3 inspector consumes `buildCurrentPreFeaRequestInput`;
- no second resolver is called;
- source-only inventory limitation and Product-global separation are disclosed.

## Final source reconciliation
- live `main`: `3a54862127c601f3e4c59159526e7345fc06cf4c`
- compare at source-complete reconciliation: `ahead_by=12`, `behind_by=0`
- exact changed-file count: `8`
- GitHub mergeable: `true`
- draft: `true`
- reviews: `0`
- review threads: `0`
- temporary `agents/WIP-1321-effective-value-inspection.yaml`: removed

## Validation truth
- live main grounding to `3a54862127c601f3e4c59159526e7345fc06cf4c`: PASS_SOURCE_INSPECTION
- current Common Input resolver ownership trace: PASS_SOURCE_INSPECTION
- source-only/no-resolution-row completeness audit: PASS_SOURCE_INSPECTION
- independent-of-#1491 boundary: PASS_SOURCE_INSPECTION
- exact eight-file GitHub diff reconciliation: PASS_SOURCE_INSPECTION
- reviews/threads reconciliation: PASS_SOURCE_INSPECTION
- faithful local checkout: BLOCKED — `Could not resolve host: github.com`
- focused D3 Node falsifier: NOT_RUN
- `node scripts/run-non-fea-checks.mjs`: NOT_RUN
- `npm run check:imports`: NOT_RUN
- `node scripts/advanced-shell-contract-check.mjs`: NOT_RUN
- `npm run build`: NOT_RUN
- `git diff --check`: NOT_RUN

No NOT_RUN item is represented as PASS. Hosted or reconstructed execution is not substituted for a faithful repository checkout.

## Final net file ledger — 8 files
1. `agents/PR1492_workreport.md`
2. `agents/claims/PR1492.yaml`
3. `agents/status/PR1492.yaml`
4. `scripts/non-fea-calculation-effective-values-inspection-check.mjs`
5. `scripts/run-non-fea-checks.mjs`
6. `src/workspace/project-data/non-fea-calculation-effective-values-model.js`
7. `src/workspace/project-data/non-fea-calculation-effective-values-view.js`
8. `src/workspace/project-data/project-data-view.js`

## Appendix A — next-agent takeover questions
1. Why is `buildCurrentPreFeaRequestInput().resolutionLedger` the authoritative D3 source rather than `authorized-empirical-effective-value-ledger.js`?
2. Show exactly where the inspector could accidentally become a second resolver, and prove the current code does not do that.
3. Explain why a source-only field can be absent from the resolution ledger and why the UI must not call this a complete calculation-input inventory.
4. For a source candidate shadowing a project configured default, identify which fields in D3 prove the selected winner and retain competing-candidate custody.
5. What exact runtime failure path causes the inspector to render `UNAVAILABLE`, and why is that preferable to showing Product/default fallback data?

## EXACT_NEXT_ACTION
Keep #1492 draft. On a faithful checkout, run the focused D3 falsifier, the Non-FEA aggregate, import check, advanced-shell contract, build and `git diff --check`; then re-ground to live main and seek explicit owner merge authorization. If execution remains unavailable, preserve `NOT_RUN` and do not claim merge qualification.
