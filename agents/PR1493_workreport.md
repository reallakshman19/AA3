# PR1493 Work Report — Issue #1321 D4 Default Usage + Coverage Observability

## Recovery header
- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1493 — `Load Calc: expose default usage and coverage summary`
- Branch: `agent/issue-1321-default-usage-coverage-summary`
- Base branch: `main`
- Exact base: `b2e8745a8cdb47850b8f162cea8c16f3f4006e03` (squash merge of #1492)
- Criticality: ENGINEERING_CRITICAL
- Execution mode: AUTO
- Merge authority: OWNER_ONLY_NOT_GRANTED
- State: SOURCE_COMPLETE_REVIEW_PENDING_EXECUTION

## Mission
Close the remaining Issue #1321 PR-D observability items:
- Default-usage summary.
- Exception/coverage summary.

The implementation is read-only and reuses existing authority/checker evidence rather than introducing another default, resolution, coverage or readiness mechanism.

## Live Issue #1321 grounding
PR-D requires:
- Basic settings panel — already merged.
- Advanced settings panel — already merged.
- Scope editor — already merged.
- Provenance/effective-value badges — merged before/with D3.
- Reset to product default — merged in Basic Calculation Defaults.
- Per-line/per-component effective value table — #1492 / D3 merged at `b2e8745a...`.
- Default-usage summary — this D4 slice.
- Exception/coverage summary — this D4 slice.

## Production trace used by D4
One Step-3 current-input build is shared by D3 and D4:

`renderProjectDataView()`
→ `renderNonFeaCalculationDefaultsView()`
→ `renderNonFeaCalculationEffectiveValuesInspector()`
→ **one** `buildCurrentPreFeaRequestInput()`
→ D3 reads `current.resolutionLedger`
→ D4 calls canonical `createPreFeaPipingCheckRequest(current)`
→ canonical `runPreFeaPipingCheck(request)`
→ D4 projects:
  - `request.configuredDefaultUsageLedger`
  - `current.productDefaultProvider.usageRows / shadowedRows`
  - `report.methodRows[].requirements[]`
  - `report.blockers`.

No Common Input store mutation is required merely to view Step 3. D4 does not call `evaluateCurrentNonFeaCommonInput()`, sealing, Run execution, effective-value resolution, or empirical runtime APIs.

## Authority / semantic boundaries
### PROJECT_CONFIGURED_DEFAULT usage
The existing `non-fea-configured-default-usage-ledger/v1` remains authoritative. D4 counts:
- method-level usage receipts;
- unique selected target-field applications;
- affected targets;
- selected default/field combinations.

It does not infer configured-default usage from the authored policy itself.

### PRODUCT_DEFAULT usage
`non-fea-product-default-provider/v1.usageRows` represents Product defaults that fill otherwise-empty **Project Data paths**. These are displayed separately from target-level configured-default selections.

`shadowedRows` is retained as the count of Product defaults not applied because existing authority already owns the path.

D4 does not claim a Product-default path fill is a target-level resolver winner.

### Coverage
Coverage comes only from canonical checker requirements:
- `MASS_COVERAGE`
- `FLEXURAL_COVERAGE`
- `SECTION_COVERAGE`

D4 does not recalculate governed-entity coverage from the source model. It validates the checker detail contract (`total`, `covered`, `missing`, `ready`) for internal consistency and derives presentation percentage only from those canonical counts.

Repeated coverage evidence across requested methods must be identical or the observability projection fails closed. It also requires `covered = total - unique(missing)` and `ready = (missing.length === 0)`, matching the checker contract.

### Exceptions
D4 groups the canonical `report.blockers` for presentation while retaining occurrence counts and method IDs. These are labelled **pre-Run readiness exceptions**. They are not represented as post-calculation unallocated-load/equilibrium exceptions.

## Implemented source cut
1. Added `src/workspace/project-data/non-fea-calculation-defaults-observability-model.js`.
2. Extended `non-fea-calculation-effective-values-view.js` so D3 + D4 share one current-input build.
3. Added `scripts/non-fea-calculation-defaults-observability-check.mjs`.
4. Registered the D4 check in `scripts/run-non-fea-checks.mjs`.
5. Added numbered PR recovery records.

No `src/core/non-fea-common-checker/**`, `src/core/non-fea-enrichment/**`, runtime resolver/provider, support-load mechanics, source-axis mechanics, solver, tolerance, workflow, or GitHub workflow file is changed.

## Falsifier design
The focused check is authored to prove, when executable:
- one configured default used by two methods on one target creates two receipts but one target-field selection;
- Product-default path fills remain path-scoped assumptions with no fabricated target ID;
- shadowed Product-default custody remains visible;
- MASS coverage deduplicates consistently across methods;
- incomplete FLEXURAL coverage retains exact missing entity evidence and percentage;
- SECTION coverage remains independently visible;
- repeated checker blockers group for presentation while retaining method IDs/receipt count;
- inconsistent repeated coverage fails closed;
- `ready=true` with a non-empty missing list fails closed;
- `covered` inconsistent with `total - missing` fails closed;
- the D3+D4 view source contains exactly one current-input build call;
- the view uses canonical checker functions and does not mutate the Common Input store, resolve values, seal or execute.

During source review, an initial falsifier assertion incorrectly required Product-default and configured-default counts to be numerically unequal even though both fixture counts happened to be 2. That was corrected: semantic separation is now tested by custody shape (Project Data path vs target IDs), not accidental numeric inequality.

## Validation truth
- #1492 merged-base grounding: PASS_SOURCE_INSPECTION
- Issue #1321 PR-D remaining-item grounding: PASS_SOURCE_INSPECTION
- canonical usage-ledger ownership trace: PASS_SOURCE_INSPECTION
- canonical checker coverage/blocker ownership trace: PASS_SOURCE_INSPECTION
- one-current-input-build architecture trace: PASS_SOURCE_INSPECTION
- Product-default vs configured-default semantic boundary review: PASS_SOURCE_INSPECTION
- focused falsifier source review / defect correction: PASS_SOURCE_INSPECTION
- exact seven-file delta reconciliation: PASS_SOURCE_INSPECTION
- live main drift reconciliation: PASS_SOURCE_INSPECTION (`behind_by=0` at reconciliation)
- reviews / review threads: PASS_SOURCE_INSPECTION (0 / 0 at reconciliation)
- faithful local checkout: BLOCKED_ENVIRONMENT (`Could not resolve host: github.com`)
- focused D4 Node falsifier: NOT_RUN
- `node scripts/run-non-fea-checks.mjs`: NOT_RUN
- `npm run check:imports`: NOT_RUN
- `node scripts/advanced-shell-contract-check.mjs`: NOT_RUN
- `npm run build`: NOT_RUN
- `git diff --check`: NOT_RUN

No NOT_RUN item is represented as PASS.

## Final net file ledger — 7 files
1. `agents/PR1493_workreport.md`
2. `agents/claims/PR1493.yaml`
3. `agents/status/PR1493.yaml`
4. `scripts/non-fea-calculation-defaults-observability-check.mjs`
5. `scripts/run-non-fea-checks.mjs`
6. `src/workspace/project-data/non-fea-calculation-defaults-observability-model.js`
7. `src/workspace/project-data/non-fea-calculation-effective-values-view.js`

Temporary `agents/WIP-1321-default-usage-coverage-summary.yaml` has been removed.

## Reconciliation checkpoint
At source-complete reconciliation before the final recovery-only record updates:
- PR head: `ac70e40524bb93bb9526caaf8897da9623358dba`;
- base/main: `b2e8745a8cdb47850b8f162cea8c16f3f4006e03`;
- compare status: `ahead`;
- behind main: `0`;
- exact changed files: `7`;
- mergeable: `true`;
- draft: `true`;
- reviews: `0`;
- review threads: `0`.

The actual final branch head must be rechecked after these recovery-only updates; the net seven-file boundary must remain unchanged.

## Appendix A — takeover questions
1. Why is `configuredDefaultUsageLedger.rows` authoritative for actual PROJECT_CONFIGURED_DEFAULT usage while the configured-default policy itself is not?
2. Explain the semantic difference between `productDefaultProvider.usageRows` and a target-level effective-value winner.
3. Trace `MASS_COVERAGE` from `analyzeModelCoverage()` through `coverageRequirement()` into the D4 table without introducing a second coverage algorithm.
4. Why does D4 group checker blockers but preserve method IDs and receipt counts?
5. Show why D3 and D4 now perform one current-input build per Step-3 render rather than two resolver builds.
6. Which source change would prove that merely opening Calculation Defaults can seal or execute Common Input, and why would that be a P0 regression?

## EXACT_NEXT_ACTION
Recheck the actual final head after recovery-only updates, confirm exact seven-file diff / zero behind / reviews and threads, update the PR body to source-complete truth, and keep executable qualification NOT_RUN unless a faithful checkout becomes available.
