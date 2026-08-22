# PR1323 — Load Calc unified effective-value resolution Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED

EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1321
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: Issue #1321
PR_OR_WIP: PR1323
BRANCH: agent/issue-1321-load-calc-effective-values

PR_HEAD_OBSERVED: 4605bf80e68e5aae6b363e0bffdf9bbaae730dc3
REPORT_BASIS_HEAD: 4605bf80e68e5aae6b363e0bffdf9bbaae730dc3
MAIN_HEAD_LAST_CHECKED: a222e18c38bd20fb55c1c6c95f724f40e40e8532
MERGE_BASE: a222e18c38bd20fb55c1c6c95f724f40e40e8532
REPORT_SYNC: CURRENT_TO_PRODUCTION_HEAD

APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-004
CURRENT_TAKEOVER: NONE

CURRENT_STAGE: STACK_4_ACTIVE_V1_V2_EFFECTIVE_VALUE_CUTOVER_SOURCE_INTEGRATED
LAST_COMPLETED_STAGE: ACTIVE AUTHORIZED GRAVITY V1/V2 TARGET-LEVEL EFFECTIVE EXECUTION PROJECTION
CURRENT_BLOCKER: NO RELEVANT EXACT-HEAD LOAD-CALC EXECUTION OBSERVED
HIGHEST_RISK: historical V3-V8 package wrappers still own separate enrichment/overlay authority paths and do not inherit the V2 cutover
LAST_DURABLE_CHECKPOINT: V1/V2 ledger execution projection + selector-collision falsifier + V2/V3 method-lane falsifier registered

EXACT_NEXT_ACTION: fix guided UI partial-status message/routing, then reconcile whether V3-V8 are supported production lanes or historical compatibility packages before changing their authority contracts.
```

## 2. Handover in 60 Seconds

PR #1323 is the single draft carrier for Issue #1321. Do not create a second PR and do not merge without owner authorization.

### What is now true

1. **Product defaults** are versioned, non-destructive, evidence-bearing and hash-bound. They fill empty Project Data only and never masquerade as source evidence.
2. **AUTO gravity selection** distinguishes qualified CoG, missing-CoG midpoint fallback, and known eccentric/invalid/moment cases that must not fall back.
3. **Support-load mechanics** preserve force and first moment for bracketed, overhang and unsupported routes; valid incompleteness publishes `CALCULATED_WITH_EXCEPTIONS`; invalid/unsolved mechanics are `FAILED`; equilibrium is checked per route.
4. **Effective-value precedence** is now aligned to Issue #1321 at the composition seam: `ACCEPTED_OVERRIDE → SOURCE_EXPLICIT → SOURCE_INHERITED → EXACT_APPROVED_MASTER → CONFIGURED_DERIVATION → PROJECT_POLICY (only where field-owned) → PROJECT_CONFIGURED_DEFAULT → PRODUCT_DEFAULT`.
5. **`PRODUCT_DEFAULT` is first-class in the field registry** only on fields where explicitly permitted.
6. **Authorized empirical input now carries a target-level effective-value ledger** built from the authorized common-enriched baseline with source kind/hash/locator/review custody preserved.
7. **V1 authorized gravity execution** uses `authorized-empirical-effective-execution-projection/v1` whenever the input carries the ledger. The six legacy mass/section maps are rebuilt from selected target values with no `DEFAULT` selector.
8. **V2 authorized execution now uses that same projection** for both `CHAINAGE_TRIBUTARY_SPAN_V2` and `CHAINAGE_TRIBUTARY_SPAN_V3_COG`. Historical ledger-less receipts retain the compatibility overlay and historical hash projection.
9. **Target specificity is preserved.** Synthetic execution-local material/insulation/component selectors prevent two lines/components that share an original code/catalog key from collapsing distinct reviewed effective values.
10. A temporary parallel calculation-view/context implementation was created during investigation, then removed after detecting the existing execution projection. Effective diff contains one production projection seam, not two.

### What remains unfinished

- `support-load-distribution-v3.js` still contains the historical direct Project Data resolver and `DEFAULT` fallback for callers that bypass authorized execution. The active ledger-bearing V1/V2 paths neutralize this by supplying scrubbed exact maps, but direct/legacy calls remain compatibility debt.
- Historical `authorized-empirical-load-execution-v3.js` through V8 do **not** inherit V2; V3 starts a separate Package-5A component-weight overlay path. Do not bulk-edit them until production support/authority semantics are classified.
- The common-enriched baseline effective ledger currently carries published source/master/review/derivation values. Project-configured/product-default entity candidates still need deliberate composition where Issue #1321 expects routine missing values to resolve.
- `sourceAxisBasis: 'Z_UP'` remains hard-coded in support distribution/support results.
- `load-calc-consumer-controller.js::handleEngineeringChange` still labels `CALCULATED_WITH_EXCEPTIONS` as blocked and does not auto-open Loads, although the view now renders current partial coverage/unallocated/transfer evidence.
- exact focused scripts, aggregate suite, build, browser/e2e and relevant exact-head CI remain NOT_RUN/NOT_OBSERVED.

## 3. Governing Engineering Invariants

```text
F_evaluated(route) = F_reaction(route) + F_unallocated(route)
M_evaluated(route) = M_reaction(route) + M_boundary_transfer(route) + M_unallocated(route)
```

- no known load disappears;
- zero qualified support means zero invented reaction;
- overhang `F*a` remains member/boundary-transfer demand, not a fabricated rotational REST reaction;
- known CoG eccentricity or explicit moment cannot be erased by midpoint fallback;
- accepted reviewed override supersedes source exactly as Issue #1321 specifies;
- lower authority cannot displace a higher-authority effective value;
- same-authority unequal values fail closed;
- unit mismatch is not silently converted by the resolver/projection;
- target-specific values cannot be collapsed back to material/catalog-key authority;
- engineering tolerances are unchanged.

## 4. Current Implementation State

| Work item | State | Active integration | Validation state |
|---|---|---|---|
| Product-default profile/provider | IMPLEMENTED | common input + authorized profile | source inspected; exact runtime NOT_RUN |
| Issue #1321 effective precedence | IMPLEMENTED_SOURCE | field registry + effective resolver | source inspected; exact runtime NOT_RUN |
| Target-level authorized effective ledger | IMPLEMENTED | newly compiled authorized input | source inspected; exact runtime NOT_RUN |
| Ledger-only V1 gravity projection | IMPLEMENTED | active V1 | source inspected; exact runtime NOT_RUN |
| Ledger-only V2/V3-method projection | IMPLEMENTED | active V2 wrapper | source inspected; exact runtime NOT_RUN |
| Selector-collision isolation | IMPLEMENTED | execution projection | falsifier added; exact runtime NOT_RUN |
| AUTO method selector | IMPLEMENTED | support-load store | source inspected; exact runtime NOT_RUN |
| Static/route-local support accounting | IMPLEMENTED | support distribution | independent analytical reproduction PASS; exact scripts NOT_RUN |
| Partial-result Load Calc view | IMPLEMENTED | view | source inspected; browser NOT_RUN |
| Partial-result controller message/routing | OPEN | controller remains legacy | NOT_RUN |
| Direct support-distribution raw resolver removal | PARTIAL | active V1/V2 bypass neutralized; direct/legacy callers remain | NOT_RUN |
| V3-V8 package authority convergence | OPEN | separate historical wrappers | NOT_RUN |
| Source/up-axis effective value | OPEN | support distribution still `Z_UP` | NOT_RUN |

## 5. Engineering Item Register

| ID | Type | Severity | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | ISS | HIGH | PARTIALLY_RESOLVED | active V1/V2 no longer obtain mass/section values from raw Project Data; direct legacy distribution still can |
| ISS-002 | ISS | HIGH | RESOLVED_SOURCE | bracketed/overhang/unallocated force and moment custody implemented |
| ISS-003 | ISS | HIGH | RESOLVED_SOURCE | route-local equilibrium prevents cross-route residual cancellation |
| ISS-004 | ISS | HIGH | RESOLVED_SOURCE | effective resolver precedence and first-class PRODUCT_DEFAULT registry aligned to #1321 |
| ISS-005 | ISS | HIGH | OPEN | V3-V8 package wrappers retain independent enrichment/overlay authority paths and legacy status contracts |
| ISS-006 | ISS | MEDIUM | OPEN | controller presents `CALCULATED_WITH_EXCEPTIONS` as blocked |
| ISS-007 | ISS | HIGH | OPEN | entity-level project/product configured defaults are not yet composed into the authorized baseline ledger for all routine-missing cases |
| ISS-008 | ISS | MEDIUM | OPEN | support distribution publishes hard-coded `Z_UP` |
| RISK-001 | RISK | CRITICAL | MITIGATED_SOURCE | zero-support loads cannot create reactions |
| RISK-002 | RISK | HIGH | MITIGATED_ACTIVE_PATH | same original material/insulation/catalog selectors cannot collapse distinct active V1/V2 effective values |
| RISK-003 | RISK | HIGH | OPEN | direct/historical execution paths can still own different value authority |
| DEC-001 | DEC | HIGH | ACTIVE | one production target-level projection seam; duplicate adapter removed |
| DEC-002 | DEC | HIGH | ACTIVE | historical ledger-less receipts remain readable/valid under old hash projection |
| DEC-003 | DEC | HIGH | ACTIVE | unit-preserving resolver; explicit consumer unit checks, no silent mm↔m conversion |
| DEC-004 | DEC | HIGH | ACTIVE | V3-V8 will be reconciled deliberately, not by global status/overlay replacement |

## 6. Numerical / Authority Falsifiers Encoded

- 18 kN mechanics: 12 kN bracketed → 7.2/4.8 kN; 3 kN overhang → 3 kN + 6 kN·m transfer; 3 kN unsupported → 3 kN unallocated + 15 kN·m first moment; zero residual.
- dropping unsupported 3 kN must fail force/moment custody.
- equal/opposite route moment residuals with zero aggregate residual must still fail per-route closure.
- accepted override must beat explicit source under Issue #1321 precedence.
- unequal same-authority candidates must block.
- changing a shadowed product default remains semantic-hash-visible.
- execution projection emits no `DEFAULT` selector for the six mass/section maps.
- same original material code may resolve to different target densities without collision.
- same original insulation code may resolve to different target densities without collision.
- same original component catalog key may resolve to different target masses without collision.
- missing/ambiguous component target identity and unit mismatch fail closed.
- V2 and V3-CoG method lanes must use the same effective execution projection for ledger-bearing input; a deliberately wrong compatibility overlay must not drive the calculation.

## 7. Validation Ledger

### PASS — independently observed

**VAL-001 18 kN analytical reproduction**
- Observation: local arithmetic execution independent of repository runtime.
- Oracle: analytical statics/accounting.
- Result: 18 kN source = 15 kN reaction-resolved + 3 kN unallocated; transfer moment 6 kN·m; unallocated first moment 15 kN·m; force/moment residuals zero.
- Limitation: not the exact repository Node script.

### PASS — source inspection / implementation-coupled

- product defaults do not overwrite populated Project Data;
- Issue #1321 authority precedence is encoded in effective resolver/registry;
- execution projection rebuilds all six mass/section maps and emits no `DEFAULT` key;
- target-specific synthetic selectors prevent material/insulation/catalog collision;
- V1 and V2 ledger-bearing execution wrappers select projected dataset/profile;
- V2 receipt hashes optionally bind `effectiveExecutionProjectionSemanticHash` while historical receipts retain legacy projection;
- CoG authority audit does not use `CATALOG_KEY`, so cloned execution-only component selector cannot alter CoG classification.

### NOT_RUN / NOT_OBSERVED

- `node scripts/non-fea-effective-value-resolver-check.mjs`
- `node scripts/authorized-empirical-effective-value-ledger-check.mjs`
- `node scripts/authorized-empirical-effective-execution-projection-check.mjs`
- `node scripts/authorized-empirical-effective-execution-projection-collision-check.mjs`
- `node scripts/authorized-empirical-v2-effective-execution-check.mjs`
- product-default/AUTO/static/partial/route-local focused scripts
- `node scripts/run-non-fea-checks.mjs`
- build
- browser/e2e
- relevant exact-head CI.

Visible unrelated EMP.1 workflow runs are NOT_APPLICABLE to this Load Calc qualification.

## 8. Changed-File Ledger

GitHub changed-file count at `4605bf80...`: **30**. Ledger count: **30**. Unexplained: **0**.

1. `agents/PR1323_workreport.md` — living recovery report
2. `agents/claims/PR1323.yaml` — coordination claim
3. `agents/status/PR1323.yaml` — machine recovery state
4. `scripts/authorized-empirical-effective-execution-projection-check.mjs` — ledger-only execution/numerical projection falsifier
5. `scripts/authorized-empirical-effective-execution-projection-collision-check.mjs` — same-selector target-collision falsifier
6. `scripts/authorized-empirical-effective-value-ledger-check.mjs` — baseline-to-effective-ledger authority falsifier
7. `scripts/authorized-empirical-product-default-convergence-check.mjs` — product-default authorized-profile convergence
8. `scripts/authorized-empirical-v2-effective-execution-check.mjs` — V2/V3-method ledger execution falsifier
9. `scripts/empirical-authorized-blocked-cases-check.mjs` — exception vs failure matrix
10. `scripts/empirical-gravity-method-selection-check.mjs` — AUTO selector falsifier
11. `scripts/non-fea-effective-value-resolver-check.mjs` — precedence/conflict/hash falsifier
12. `scripts/non-fea-product-default-profile-check.mjs` — product-default authority/hash falsifier
13. `scripts/run-non-fea-checks.mjs` — aggregate registration
14. `scripts/support-load-partial-distribution-check.mjs` — 18 kN full production fixture
15. `scripts/support-load-route-equilibrium-check.mjs` — route anti-cancellation fixture
16. `scripts/support-load-static-accounting-check.mjs` — static analytical fixture
17. `src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js` — target-level ledger-to-gravity projection
18. `src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js` — baseline authority adapter/ledger
19. `src/workspace/engineering-loads/authorized-empirical-load-execution-v2.js` — V2/V3-method effective projection cutover + legacy receipt compatibility
20. `src/workspace/engineering-loads/authorized-empirical-load-execution.js` — V1 effective projection cutover/status compatibility/product defaults
21. `src/workspace/engineering-loads/authorized-empirical-load-input.js` — effective ledger bound into newly compiled authorized input
22. `src/workspace/engineering-loads/empirical-gravity-method-selection.js` — AUTO receipt/policy
23. `src/workspace/engineering-loads/engineering-support-load-store.js` — AUTO integration
24. `src/workspace/engineering-loads/support-load-distribution-v3.js` — completeness/status/route-local accounting
25. `src/workspace/engineering-loads/support-load-static-accounting.js` — statics kernel
26. `src/workspace/load-calc-consumer-view.js` — current partial-result coverage/unallocated/transfer presentation
27. `src/workspace/non-fea-common-input-runtime.js` — non-destructive product-default effective Project Data path
28. `src/workspace/project-data/non-fea-effective-value-resolver.js` — canonical effective-value composition seam
29. `src/workspace/project-data/non-fea-field-registry.js` — first-class authority paths including PRODUCT_DEFAULT
30. `src/workspace/project-data/non-fea-product-default-profile.js` — product-default provider/profile

No `.github/workflows/*` paths changed.

## 9. Repository / Review Ground Truth

- PR #1323: OPEN, DRAFT, mergeable at last check.
- Base/main: `a222e18c38bd20fb55c1c6c95f724f40e40e8532`; no base drift observed.
- Production head used for this report: `4605bf80e68e5aae6b363e0bffdf9bbaae730dc3`.
- Changed files: 30.
- No merge authorization has been given.
- No workflow modification authorization has been given.

## 10. Exact Continuation Order

1. **UI correctness:** change `load-calc-consumer-controller.js::handleEngineeringChange` so `CALCULATED_WITH_EXCEPTIONS` is “complete with exceptions,” auto-opens Loads, and `FAILED` remains failure. Add a focused presentation/controller falsifier.
2. **Classify V3-V8:** determine which are live supported production packages and which are historical compatibility artifacts. Do not bulk-replace authority/status semantics.
3. **Entity default composition:** extend the one effective ledger so project-configured/product defaults can resolve routine missing entity values without rebuilding authority independently in consumers. Preserve exact target scope and hashes.
4. **Direct support distribution:** once all supported callers have an effective ledger, remove/contain `resolveProjectDataDensity()` and raw map precedence from the direct kernel.
5. **Axis:** replace hard-coded `Z_UP` with effective source/project axis authority and stale/hash binding.
6. **Qualification:** execute focused checks, aggregate, build/browser/e2e and relevant exact-head CI. Record observed evidence only.

# Appendix A — Takeover Qualification

A takeover agent must answer these before changing engineering-critical source:

1. What exact authority order does Issue #1321 require, and why is `ACCEPTED_OVERRIDE` above explicit source in this task?
2. Why can target-level material/component values not safely be collapsed back into a map keyed only by material code or catalog key?
3. For a 12 kN load at x=4 m between supports x=0 and x=10 m, what reactions are required and what equilibrium equations prove them?
4. For a 3 kN load at x=12 m with only a qualified support at x=10 m, what vertical reaction and signed transfer moment are retained? Why is the REST not claimed as a rotational anchor?
5. For a known 3 kN branch load with no qualified vertical support, what must remain in the result and what must never be invented?
6. Why is aggregate first-moment closure insufficient when different route chainage origins exist?
7. Under what exact CoG condition may AUTO select V2 midpoint fallback, and under what known-eccentric cases must it refuse?
8. What does `authorized-empirical-effective-execution-projection/v1` scrub and rebuild, and why must it emit no `DEFAULT` selector?
9. How does the projection preserve two same-catalog valves with different reviewed masses without mutating source data?
10. Why does changing execution-only `CATALOG_KEY` on the cloned dataset not change CoG authority?
11. Which active execution wrappers now consume the ledger projection, and which historical V3-V8 wrappers still own separate authority paths?
12. Which validations in this report are independently observed PASS, and which exact repository tests remain NOT_RUN?

Any answer that proposes proximity-based support assignment, silent midpoint fallback for known eccentricity, source-first precedence contrary to #1321, hidden unit conversion, or treating NOT_RUN as PASS fails takeover qualification.
