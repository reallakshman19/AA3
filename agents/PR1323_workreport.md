# PR1323 — Load Calc unified effective-value resolution Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: Issue #1321
PR_OR_WIP: PR1323
BRANCH: agent/issue-1321-load-calc-effective-values

PR_HEAD_OBSERVED: db32a6e6a4a1a6cdf86e73b4f45f94470e764d60
REPORT_BASIS_HEAD: db32a6e6a4a1a6cdf86e73b4f45f94470e764d60
MAIN_HEAD_LAST_CHECKED: a222e18c38bd20fb55c1c6c95f724f40e40e8532
MERGE_BASE: a222e18c38bd20fb55c1c6c95f724f40e40e8532
GROUNDING_EPOCH: GE-005

CURRENT_STAGE: STACK_4_ACTIVE_V1_V2_EFFECTIVE_VALUE_CUTOVER + COMPLETENESS_AWARE_UI_SOURCE_INTEGRATED
CURRENT_BLOCKER: NO_RELEVANT_EXACT_HEAD_LOAD_CALC_REPOSITORY_OR_BROWSER_EXECUTION_OBSERVED
HIGHEST_RISK: historical V3-V8 package wrappers retain independent enrichment/overlay authority and do not inherit the active V2 effective projection
EXACT_NEXT_ACTION: compose entity-scoped project-configured/product-default candidates into the single effective ledger without collapsing target identity; then classify V3-V8 support before migrating those wrappers.
```

## 2. Handover in 60 Seconds

PR #1323 remains the **single draft carrier** for Issue #1321. Do not create a second PR. Do not merge without explicit owner authorization.

What is now source-integrated:

1. `LOAD_CALC_STANDARD_DEFAULTS_V1` fills only empty Project Data fields and retains product-default ID/basis/version/hash provenance.
2. Gravity AUTO selects V3-CoG only for qualified on-route CoG; missing CoG alone may use logged V2 midpoint fallback; known eccentric/invalid CoG or explicit moment cannot silently fall back.
3. Support-load accounting preserves force and first moment for bracketed, overhang and unsupported known loads. Valid incompleteness is `CALCULATED_WITH_EXCEPTIONS`; invalid/unsolved mechanics are `FAILED`; equilibrium closes per route chainage frame.
4. Effective-value precedence follows Issue #1321: `ACCEPTED_OVERRIDE → SOURCE_EXPLICIT → SOURCE_INHERITED → EXACT_APPROVED_MASTER → CONFIGURED_DERIVATION → PROJECT_POLICY (field-owned only) → PROJECT_CONFIGURED_DEFAULT → PRODUCT_DEFAULT`.
5. Newly compiled authorized empirical inputs carry a target-level `authorized-empirical-effective-value-ledger/v1` with source kind/hash/locator/review custody.
6. V1 and V2 authorized gravity execution consume the same target-level `authorized-empirical-effective-execution-projection/v1` when a ledger exists. The six historical mass/section maps are scrubbed/rebuilt from selected target values and no `DEFAULT` selector is emitted.
7. Execution-local synthetic material/insulation/component selectors preserve distinct reviewed target values even where the original material, insulation or catalog code is shared.
8. The Load Calc view publishes current partial coverage, unallocated force/first moment and boundary-transfer moment.
9. The Load Calc controller now classifies `CALCULATED_WITH_EXCEPTIONS` as **complete with exceptions**, auto-opens Loads, and keeps `FAILED`, legacy `BLOCKED`, unknown and missing statuses non-navigating/fail-closed.

Still unfinished:

- project-configured/product-default **entity-level** candidates are not yet composed into the authorized effective ledger for routine missing OD/wall/density/mass cases;
- `support-load-distribution-v3.js` retains raw Project Data / `DEFAULT` resolution for direct or legacy callers, although ledger-bearing V1/V2 execution neutralizes that path using exact projected maps;
- V3-V8 authorized package wrappers are separate historical Package-5 execution paths and do not inherit the V2 cutover;
- `sourceAxisBasis: 'Z_UP'` remains hard-coded;
- exact repository focused scripts, aggregate, build, browser/e2e and relevant exact-head CI remain NOT_RUN / NOT_OBSERVED.

## 3. Governing Engineering Invariants

```text
F_evaluated(route) = F_reaction(route) + F_unallocated(route)
M_evaluated(route) = M_reaction(route) + M_boundary_transfer(route) + M_unallocated(route)
```

- no known load disappears;
- proximity never creates a support load path;
- zero qualified support means zero invented reaction;
- overhang `F*a` remains member/boundary-transfer demand, not a fabricated rotational REST reaction;
- accepted reviewed override supersedes lower authority exactly as Issue #1321 specifies;
- same-authority unequal candidates fail closed;
- unit mismatch is not silently converted;
- target-specific values must not collapse back to code/catalog-key authority;
- known CoG eccentricity or explicit moment cannot be erased by midpoint fallback;
- engineering tolerances are unchanged.

## 4. Current Implementation / Validation Matrix

| Item | State | Validation |
|---|---|---|
| Product-default provider/profile | IMPLEMENTED | source inspected; exact repo execution NOT_RUN |
| Effective-value precedence / PRODUCT_DEFAULT registry | IMPLEMENTED_SOURCE | source inspected; exact repo execution NOT_RUN |
| Authorized target-level effective ledger | IMPLEMENTED | source inspected; exact repo execution NOT_RUN |
| V1 ledger-only gravity projection | IMPLEMENTED | source inspected; exact repo execution NOT_RUN |
| V2 midpoint + V3-CoG method-lane projection | IMPLEMENTED | source inspected; exact repo execution NOT_RUN |
| Same-selector collision isolation | IMPLEMENTED | falsifier added; exact repo execution NOT_RUN |
| Bracket/overhang/unallocated statics | IMPLEMENTED | independent 18 kN analytical reproduction PASS; repository scripts NOT_RUN |
| Per-route equilibrium anti-cancellation | IMPLEMENTED | source inspected; repository script NOT_RUN |
| Partial-result view | IMPLEMENTED | source inspected; browser NOT_RUN |
| Partial-result controller message/routing | IMPLEMENTED | surgical PR diff verified; local pure presentation reproduction PASS; browser/event path NOT_RUN |
| Entity project/product-default ledger composition | OPEN | NOT_RUN |
| Direct raw resolver containment | PARTIAL | active V1/V2 neutralized; direct/legacy remains |
| V3-V8 authority convergence | OPEN | NOT_RUN |
| Source/up-axis authority | OPEN | NOT_RUN |

## 5. Engineering Item Register

| ID | Severity | Status | Summary |
|---|---:|---|---|
| ISS-001 | HIGH | PARTIALLY_RESOLVED | active V1/V2 no longer decide mass/section values from raw Project Data; direct/legacy distribution still can |
| ISS-002 | HIGH | RESOLVED_SOURCE | force/first-moment custody for bracketed, overhang and unsupported loads |
| ISS-003 | HIGH | RESOLVED_SOURCE | route-local equilibrium prevents cross-route residual cancellation |
| ISS-004 | HIGH | RESOLVED_SOURCE | Issue #1321 effective precedence and PRODUCT_DEFAULT authority registry |
| ISS-005 | HIGH | OPEN | V3-V8 wrappers retain independent Package-5 enrichment/overlay authority |
| ISS-006 | MEDIUM | RESOLVED_SOURCE | controller no longer calls `CALCULATED_WITH_EXCEPTIONS` blocked |
| ISS-007 | HIGH | OPEN | entity-scoped project/product defaults not yet composed into authorized effective ledger |
| ISS-008 | MEDIUM | OPEN | support distribution publishes hard-coded `Z_UP` |
| RISK-001 | CRITICAL | MITIGATED_SOURCE | no-support known loads cannot create reactions |
| RISK-002 | HIGH | MITIGATED_ACTIVE_PATH | same original selectors cannot collapse distinct V1/V2 target values |
| RISK-003 | HIGH | OPEN | historical/direct execution paths can still own different value authority |

## 6. Numerical and Authority Falsifiers

- 18 kN case: 12 kN bracketed → 7.2/4.8 kN; 3 kN overhang → 3 kN + 6 kN·m transfer; 3 kN unsupported → 3 kN unallocated + 15 kN·m first moment; residuals zero.
- dropping the unsupported 3 kN must fail custody.
- equal/opposite route residuals with zero aggregate residual must still fail per-route closure.
- accepted override must beat explicit source.
- unequal same-authority values must block.
- changing a shadowed product default remains hash-visible.
- effective execution emits no six-map `DEFAULT` selector.
- same material/insulation/catalog code may retain different target values.
- missing/ambiguous target identity and unit mismatch fail closed.
- ledger-bearing V2 and V3-CoG method lanes must use the same effective projection even when the compatibility overlay is deliberately wrong.
- UI presentation: `CALCULATED` and `CALCULATED_WITH_EXCEPTIONS` open Loads; `FAILED`, `BLOCKED`, unknown and missing status do not.

## 7. Validation Ledger

### PASS — independent/local analytical

**VAL-001 18 kN analytical reproduction**
- source force 18 kN;
- reaction-resolved force 15 kN;
- unallocated force 3 kN;
- transfer moment 6 kN·m;
- unallocated first moment 15 kN·m;
- force and moment residual = 0.
- limitation: independent reproduction, not exact repository Node execution.

### PASS — local presentation reproduction

**VAL-002 completeness-aware UI classifier**
- `CALCULATED` → opens Loads;
- `CALCULATED_WITH_EXCEPTIONS` → opens Loads with explicit exception message;
- `FAILED` / `BLOCKED` / unknown / missing → do not open Loads.
- limitation: local reproduction of the pure classifier; exact repository script and browser event path remain NOT_RUN.

### PASS — source inspection

- controller PR patch is surgical: one import plus replacement of the old binary calculated/blocked branch;
- active V1/V2 effective projection and collision guards are source-integrated;
- partial-result view exposes coverage/unallocated/transfer evidence.

### NOT_RUN / NOT_OBSERVED

- all new/updated repository Node scripts as exact checkout commands;
- `node scripts/run-non-fea-checks.mjs`;
- build;
- browser/e2e/controller event-path;
- relevant exact-head Load Calc CI.

Visible EMP.1 workflow runs remain NOT_APPLICABLE to this Load Calc qualification.

## 8. Changed-File Ledger

GitHub changed-file count at `db32a6e6...`: **33**; ledger count **33**; unexplained **0**.

Recovery: `agents/PR1323_workreport.md`, `agents/status/PR1323.yaml`, `agents/claims/PR1323.yaml`.

Core/product-default/effective-value: `src/workspace/project-data/non-fea-product-default-profile.js`, `non-fea-field-registry.js`, `non-fea-effective-value-resolver.js`, `src/workspace/non-fea-common-input-runtime.js`.

Authorized empirical execution: `authorized-empirical-effective-value-ledger.js`, `authorized-empirical-effective-execution-projection.js`, `authorized-empirical-load-input.js`, `authorized-empirical-load-execution.js`, `authorized-empirical-load-execution-v2.js`.

Support mechanics/AUTO: `empirical-gravity-method-selection.js`, `engineering-support-load-store.js`, `support-load-static-accounting.js`, `support-load-distribution-v3.js`.

UI: `src/workspace/load-calc-consumer-view.js`, `src/workspace/load-calc-consumer-controller.js`, `src/workspace/load-calc-result-presentation.js`.

Checks: `scripts/non-fea-product-default-profile-check.mjs`, `non-fea-effective-value-resolver-check.mjs`, `authorized-empirical-effective-value-ledger-check.mjs`, `authorized-empirical-effective-execution-projection-check.mjs`, `authorized-empirical-effective-execution-projection-collision-check.mjs`, `authorized-empirical-v2-effective-execution-check.mjs`, `authorized-empirical-product-default-convergence-check.mjs`, `empirical-gravity-method-selection-check.mjs`, `support-load-static-accounting-check.mjs`, `support-load-partial-distribution-check.mjs`, `support-load-route-equilibrium-check.mjs`, `empirical-authorized-blocked-cases-check.mjs`, `load-calc-result-presentation-check.mjs`, `run-non-fea-checks.mjs`.

No `.github/workflows/*` paths changed.

## 9. Repository / Review Ground Truth

- PR #1323: OPEN, DRAFT, mergeable at GE-005 check.
- Main/base: `a222e18c38bd20fb55c1c6c95f724f40e40e8532`; no base drift observed.
- Production head before recovery sync: `db32a6e6a4a1a6cdf86e73b4f45f94470e764d60`.
- Changed files: 33.
- No merge authorization.
- No workflow modification authorization.
- No submitted review or inline review thread was present at the prior review check.

## 10. Continuation Order

1. **Entity default composition:** identify exactly which line/component effective fields may receive project-configured or product-default candidates. Preserve target IDs, scope, evidence and hashes; do not invent universal OD/wall/component-mass values.
2. **Direct resolver containment:** once supported callers are ledger-driven, remove/contain `resolveProjectDataDensity()` and direct six-map re-resolution from production paths.
3. **V3-V8 classification:** determine supported production vs historical compatibility status before changing their enrichment authority contracts.
4. **Axis authority:** derive/publish source vertical axis from governed source/project evidence rather than hard-coded `Z_UP`.
5. **Qualification:** execute focused scripts, aggregate, build/browser and relevant CI when an exact-head execution channel is available.

## Appendix A — Takeover Qualification

A takeover engineer should answer before changing engineering authority:

1. Why is target-level authority required instead of collapsing values back to material/catalog selectors?
2. What is the exact Issue #1321 precedence and where are same-authority conflicts blocked?
3. For the 18 kN benchmark, where do the 3 kN unsupported force and its first moment remain in custody?
4. Why is the overhang `F*a` recorded as boundary/member transfer rather than REST rotational reaction?
5. Why must equilibrium be checked per route chainage frame?
6. Which active execution wrappers currently consume the effective projection, and which historical wrappers do not?
7. What distinction exists between a product default, project-configured default, project policy value, accepted override and source/master evidence?
8. Why must a routine default never invent OD, wall, component mass or support path when no governed value exists?
9. What UI evidence must remain visible for `CALCULATED_WITH_EXCEPTIONS`?
10. Which validations are truly executed versus source-inspected or NOT_RUN?
