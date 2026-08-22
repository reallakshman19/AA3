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

PR_HEAD_OBSERVED: 5ca4f6d2a6738f4de21f57f1a9a591e1a53ec837
REPORT_BASIS_HEAD: 5ca4f6d2a6738f4de21f57f1a9a591e1a53ec837
MAIN_HEAD_LAST_CHECKED: a222e18c38bd20fb55c1c6c95f724f40e40e8532
MERGE_BASE: a222e18c38bd20fb55c1c6c95f724f40e40e8532
GROUNDING_EPOCH: GE-006

CURRENT_STAGE: STACK_4_PRE_READINESS_PROJECT_PRODUCT_EFFECTIVE_DEFAULT_AUTHORING_SOURCE_INTEGRATED
CURRENT_BLOCKER: NO_EXISTING_WORKSPACE_COMMON_ENRICHED_CANDIDATE_AUTHORING_CALLER_FOUND; EXACT_HEAD_LOAD_CALC_RUNTIME_QUALIFICATION_NOT_OBSERVED
HIGHEST_RISK: historical V3-V8 package wrappers and direct support-distribution callers retain independent/raw value-resolution authority outside the active V1/V2 target-level ledger path
EXACT_NEXT_ACTION: contain direct raw Project Data/DEFAULT re-resolution in support-load-distribution-v3.js for ledger-driven callers, then classify V3-V8 production support before any authority migration.
```

## 2. Handover in 60 Seconds

PR #1323 remains the **single draft carrier** for Issue #1321. Do not create another PR. Do not merge without explicit owner authorization.

Source-integrated state:

1. `LOAD_CALC_STANDARD_DEFAULTS_V1` supplies only safe project-level screening defaults and never overwrites populated Project Data.
2. A separate versioned product engineering table contract now exists for OD/wall/density/insulation/component mass, but the shipped `LOAD_CALC_PRODUCT_ENGINEERING_DEFAULTS_V1` table is **empty by design**. No entity engineering value is invented by the application.
3. Issue #1321 configured-default scope precedence is explicit; raw key-count specificity no longer lets broad `system+zone` authority outrank exact entity/POS/line/branch or class/type+NB authority.
4. Common-enriched fields can carry `PROJECT_CONFIGURED_DEFAULT` and `PRODUCT_DEFAULT` provenance honestly.
5. Project configured defaults can replace only absent/`BLOCKED_MISSING` common-enriched fields before EMPIRICAL_LOADS readiness. They cannot mask ambiguity, conflict or stale-source evidence.
6. Product engineering defaults use the same fail-closed pre-readiness rules and are applied only **after** Project configured defaults, giving deterministic `PROJECT_CONFIGURED_DEFAULT > PRODUCT_DEFAULT` behavior.
7. A component-scoped value can promote to one LINE value only when every exact source component on that line is covered and the selected value/unit/default authority is identical. Partial/mixed line coverage blocks; no averaging or first-pick behavior is permitted.
8. `non-fea-common-enriched-effective-default-authoring/v1` is now the single pre-publication authoring seam:
   `exact source/master candidate → Project configured defaults → Product defaults → final candidate`.
   It explicitly grants **no publication authority**.
9. Repository inspection found no existing workspace common-enriched candidate-authoring/publication caller to patch. The current `src/workspace/enrichment` paths are consumer/runtime/staged-json paths. Therefore the new authoring seam is source-integrated but **not claimed as runtime-called**.
10. Newly compiled authorized V1/V2 gravity inputs retain target-level effective-value provenance and execution uses the same target-level effective projection.
11. Support-load mechanics preserve bracketed, overhang and unsupported load custody, including per-route force/first-moment closure.
12. Load Calc UI treats `CALCULATED_WITH_EXCEPTIONS` as a current result and exposes coverage/unallocated/transfer-moment evidence.

Still unfinished:

- no existing production common-enriched authoring caller was found to invoke the new pre-publication composer; publication hookup remains an explicit architecture boundary rather than an invented call path;
- `support-load-distribution-v3.js` retains direct raw Project Data / legacy `DEFAULT` re-resolution for direct/legacy callers, although ledger-bearing V1/V2 execution neutralizes those maps using the exact effective projection;
- V3-V8 authorized package wrappers remain separate historical Package-5 authority paths and do not inherit V2;
- `sourceAxisBasis: 'Z_UP'` remains hard-coded where source/project axis authority should eventually flow;
- exact repository focused scripts, aggregate, build, browser/e2e and relevant exact-head Load Calc CI remain NOT_RUN / NOT_OBSERVED.

## 3. Governing Engineering Invariants

```text
F_evaluated(route) = F_reaction(route) + F_unallocated(route)
M_evaluated(route) = M_reaction(route) + M_boundary_transfer(route) + M_unallocated(route)
```

- no known load disappears;
- proximity never creates a support load path;
- zero qualified support means zero invented reaction;
- overhang `F*a` is boundary/member-transfer demand, not fabricated REST rotational reaction;
- accepted reviewed override supersedes lower authority exactly as Issue #1321 specifies;
- Project configured default supersedes Product default;
- same-authority unequal candidates fail closed;
- Product engineering defaults require explicit versioned/hash-bound rows; the shipped table is empty;
- defaults may replace routine missing data only, not ambiguity/conflict/stale evidence;
- component-level defaults cannot be collapsed to a LINE value without full exact-line coverage and identical authority;
- units are never silently converted by the authority resolver;
- target-specific values must not collapse back to code/catalog-key authority;
- known CoG eccentricity or explicit moment cannot be erased by midpoint fallback;
- engineering tolerances remain unchanged.

## 4. Current Implementation / Validation Matrix

| Item | State | Validation |
|---|---|---|
| Project-level product-default profile/provider | IMPLEMENTED_SOURCE | source inspected; exact repo execution NOT_RUN |
| Product engineering-default table/profile/provider | IMPLEMENTED_SOURCE | shipped entity table empty; falsifier added; exact repo execution NOT_RUN |
| Issue #1321 configured-default scope precedence | IMPLEMENTED_SOURCE | falsifier added; exact repo execution NOT_RUN |
| Project configured-default pre-readiness overlay | IMPLEMENTED_SOURCE | fail-closed overlay + falsifier; exact repo execution NOT_RUN |
| Product default pre-readiness overlay | IMPLEMENTED_SOURCE | Project > Product composition + hash custody; exact repo execution NOT_RUN |
| Single pre-publication effective-default authoring seam | IMPLEMENTED_SOURCE | end-to-end falsifier added; no production caller found; exact repo execution NOT_RUN |
| Common-enriched default provenance kinds | IMPLEMENTED_SOURCE | PROJECT_CONFIGURED_DEFAULT + PRODUCT_DEFAULT explicit |
| Effective-value precedence / target ledger | IMPLEMENTED_SOURCE | source inspected; exact repo execution NOT_RUN |
| V1 ledger-only gravity projection | IMPLEMENTED_SOURCE | source inspected; exact repo execution NOT_RUN |
| V2 midpoint + V3-CoG projection | IMPLEMENTED_SOURCE | source inspected; exact repo execution NOT_RUN |
| Same-selector collision isolation | IMPLEMENTED_SOURCE | falsifier added; exact repo execution NOT_RUN |
| Bracket/overhang/unallocated statics | IMPLEMENTED_SOURCE | independent 18 kN analytical reproduction PASS; repository scripts NOT_RUN |
| Per-route equilibrium anti-cancellation | IMPLEMENTED_SOURCE | source inspected; repository script NOT_RUN |
| Partial-result UI | IMPLEMENTED_SOURCE | local pure presentation reproduction PASS; browser NOT_RUN |
| Production authoring caller hookup | OPEN_BOUNDARY | no existing workspace candidate authoring caller found |
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
| ISS-006 | MEDIUM | RESOLVED_SOURCE | controller no longer labels `CALCULATED_WITH_EXCEPTIONS` blocked |
| ISS-007 | HIGH | RESOLVED_SOURCE_BOUNDARY_OPEN | Project/Product entity-default composition and authoring seam exist; no production candidate-authoring caller exists to invoke it |
| ISS-008 | MEDIUM | OPEN | support distribution publishes hard-coded `Z_UP` |
| ISS-009 | HIGH | RESOLVED_SOURCE | broad scope key count can no longer outrank Issue #1321 exact scope precedence |
| RISK-001 | CRITICAL | MITIGATED_SOURCE | no-support known loads cannot create reactions |
| RISK-002 | HIGH | MITIGATED_ACTIVE_PATH | same original selectors cannot collapse distinct V1/V2 target values |
| RISK-003 | HIGH | OPEN | historical/direct execution paths can still own different value authority |
| RISK-004 | HIGH | MITIGATED_SOURCE | defaults cannot hide ambiguous/conflicting/stale common-enriched evidence |

## 6. Numerical and Authority Falsifiers

- 18 kN mechanics: 12 kN bracketed → 7.2/4.8 kN; 3 kN overhang → 3 kN + 6 kN·m transfer; 3 kN unsupported → 3 kN unallocated + 15 kN·m first moment; residuals zero.
- dropping unsupported 3 kN must fail custody.
- equal/opposite route residuals with aggregate zero must fail per-route closure.
- accepted override beats explicit source.
- unequal same-authority values block.
- exact line/entity scope beats broader multi-key geography; piping-class+NB beats component-type+NB as Issue #1321 specifies.
- Project configured default beats Product default for the same missing field.
- Product default may fill only fields still missing after Project composition.
- shipped product engineering table creates zero entity engineering records.
- changed applied Product default changes row/profile/candidate/authoring semantic identity.
- partial/mixed component coverage cannot be promoted to one LINE value.
- defaults cannot mask `BLOCKED_AMBIGUOUS`, `BLOCKED_CONFLICT`, or `BLOCKED_STALE_SOURCE`.
- effective execution emits no six-map `DEFAULT` selector for ledger-bearing V1/V2.
- same material/insulation/catalog code may retain different target values.
- UI: `CALCULATED` and `CALCULATED_WITH_EXCEPTIONS` open Loads; FAILED/BLOCKED/unknown/missing do not.

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
- FAILED/BLOCKED/unknown/missing → do not open Loads.
- limitation: local reproduction of pure classifier; repository script/browser event path NOT_RUN.

### PASS — source inspection only

- pre-readiness Project and Product overlay contracts are source-integrated;
- product field provenance retains separate selected-row and product-profile semantic hashes;
- the shipped entity engineering product table is empty;
- the single authoring seam fixes the order exact candidate → Project → Product and grants no publication authority;
- direct inspection of `src/workspace/enrichment` found consumer/runtime/staged-json paths but no existing common-enriched candidate-authoring caller to patch.

### NOT_RUN / NOT_OBSERVED

- all new/updated repository Node scripts as exact checkout commands, including scope, Project overlay, Product table, Project/Product precedence and authoring seam checks;
- `node scripts/run-non-fea-checks.mjs`;
- build;
- browser/e2e/controller event path;
- relevant exact-head Load Calc CI.

Visible unrelated EMP.1 workflow runs are NOT_APPLICABLE to this Load Calc qualification.

## 8. Changed-File Ledger

GitHub changed-file count at production basis `5ca4f6d2...`: **44**; ledger count **44**; unexplained **0**.

1. `agents/PR1323_workreport.md`
2. `agents/claims/PR1323.yaml`
3. `agents/status/PR1323.yaml`
4. `scripts/authorized-empirical-effective-execution-projection-check.mjs`
5. `scripts/authorized-empirical-effective-execution-projection-collision-check.mjs`
6. `scripts/authorized-empirical-effective-value-ledger-check.mjs`
7. `scripts/authorized-empirical-product-default-convergence-check.mjs`
8. `scripts/authorized-empirical-v2-effective-execution-check.mjs`
9. `scripts/empirical-authorized-blocked-cases-check.mjs`
10. `scripts/empirical-gravity-method-selection-check.mjs`
11. `scripts/load-calc-result-presentation-check.mjs`
12. `scripts/non-fea-common-enriched-configured-default-overlay-check.mjs`
13. `scripts/non-fea-common-enriched-effective-default-authoring-check.mjs`
14. `scripts/non-fea-common-enriched-effective-default-composition-check.mjs`
15. `scripts/non-fea-configured-default-scope-priority-check.mjs`
16. `scripts/non-fea-effective-value-resolver-check.mjs`
17. `scripts/non-fea-product-default-profile-check.mjs`
18. `scripts/non-fea-product-engineering-default-profile-check.mjs`
19. `scripts/run-non-fea-checks.mjs`
20. `scripts/support-load-partial-distribution-check.mjs`
21. `scripts/support-load-route-equilibrium-check.mjs`
22. `scripts/support-load-static-accounting-check.mjs`
23. `src/core/common-enriched-properties/field.js`
24. `src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js`
25. `src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js`
26. `src/workspace/engineering-loads/authorized-empirical-load-execution-v2.js`
27. `src/workspace/engineering-loads/authorized-empirical-load-execution.js`
28. `src/workspace/engineering-loads/authorized-empirical-load-input.js`
29. `src/workspace/engineering-loads/empirical-gravity-method-selection.js`
30. `src/workspace/engineering-loads/engineering-support-load-store.js`
31. `src/workspace/engineering-loads/support-load-distribution-v3.js`
32. `src/workspace/engineering-loads/support-load-static-accounting.js`
33. `src/workspace/enrichment/non-fea-common-enriched-effective-default-authoring.js`
34. `src/workspace/load-calc-consumer-controller.js`
35. `src/workspace/load-calc-consumer-view.js`
36. `src/workspace/load-calc-result-presentation.js`
37. `src/workspace/non-fea-common-input-runtime.js`
38. `src/workspace/project-data/non-fea-common-enriched-configured-default-overlay.js`
39. `src/workspace/project-data/non-fea-common-enriched-product-default-overlay.js`
40. `src/workspace/project-data/non-fea-configured-default-provider.js`
41. `src/workspace/project-data/non-fea-effective-value-resolver.js`
42. `src/workspace/project-data/non-fea-field-registry.js`
43. `src/workspace/project-data/non-fea-product-default-profile.js`
44. `src/workspace/project-data/non-fea-product-engineering-default-profile.js`

No `.github/workflows/*` paths changed.

## 9. Repository / Review Ground Truth

- PR #1323 at GE-006 source check: OPEN, DRAFT, mergeable.
- Base/main: `a222e18c38bd20fb55c1c6c95f724f40e40e8532`; no base drift observed.
- Production basis head: `5ca4f6d2a6738f4de21f57f1a9a591e1a53ec837`.
- Changed files: 44.
- No merge authorization.
- No workflow modification authorization.
- No new submitted review/inline thread was observed in the prior review grounding; review state was not re-qualified by runtime evidence in this increment.

## 10. Continuation Order

1. **Direct resolver containment:** audit `support-load-distribution-v3.js` for raw Project Data and `DEFAULT` lookups that remain reachable after a target-level effective projection exists. Remove/contain only the bypasses that can be proven redundant for ledger-driven callers; preserve explicit legacy compatibility where required.
2. **V3-V8 classification:** determine which wrappers remain production-supported versus historical compatibility before changing their authority contracts.
3. **Publication authoring hookup:** if/when a real common-enriched candidate authoring caller is introduced, invoke `authorCommonEnrichedCandidateWithEffectiveDefaults()` before publication/readiness. Do not fabricate a publication path solely for this PR.
4. **Axis authority:** derive/publish source vertical axis from governed source/project evidence rather than hard-coded `Z_UP`.
5. **Qualification:** execute focused scripts, aggregate, build/browser and relevant exact-head CI when an exact-head execution channel exists.

## Appendix A — Takeover Qualification

A takeover engineer should answer before changing engineering authority:

1. Why are Project/Product defaults applied after exact source/master candidate assembly but before publication/readiness?
2. What is the Issue #1321 authority order, including Project vs Product defaults?
3. Why can a component-scoped OD/wall/density default become a LINE value only with full exact-line coverage and identical selected authority?
4. Why is the shipped product engineering table empty?
5. Which common-enriched blocked states may defaults replace, and which must remain fail-closed?
6. Why does the authoring composer grant no publication authority?
7. Which active execution wrappers consume the effective projection, and which historical wrappers do not?
8. For the 18 kN benchmark, where do unsupported force and overhang first moment remain in custody?
9. What remains bypassable in direct/legacy `support-load-distribution-v3.js` callers?
10. Which validations are truly executed versus source-inspected or NOT_RUN?
