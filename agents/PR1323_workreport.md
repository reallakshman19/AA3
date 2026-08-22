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

PR_HEAD_OBSERVED: bef97d453d0044918bdb0bf5008bc0fa053dd199
REPORT_BASIS_HEAD: bef97d453d0044918bdb0bf5008bc0fa053dd199
MAIN_HEAD_LAST_CHECKED: a222e18c38bd20fb55c1c6c95f724f40e40e8532
MERGE_BASE: a222e18c38bd20fb55c1c6c95f724f40e40e8532
GROUNDING_EPOCH: GE-009

CURRENT_STAGE: STACK_8_LEDGER_KERNEL_READINESS_CONTAINED_AND_SOURCE_BASIS_FAIL_CLOSED
CURRENT_BLOCKER: EXACT_HEAD_LOAD_CALC_NODE_BROWSER_QUALIFICATION_NOT_OBSERVED; ACTIVE_FILL_MASS_COMPOSITION_AND_OUTPUT_CONVENTION_ACCEPTANCE_REMAINS_OPEN
HIGHEST_RISK: Issue #1321 includes configurable policies that are present only as contracts today; enabling them without active mechanical consumption would create false authority. V3-V8 remain independent Package-5 paths.
EXACT_NEXT_ACTION: activate or explicitly bound the remaining active gravity policies in this order: fluid fill/mass composition, support DEFAULT capability behavior, then force/moment/sign convention authority. Do not expose X/Y gravity or non-mm source units until a true engineering transform exists.
```

PR #1323 remains the **single draft carrier**. Do not create another PR. Do not merge without explicit owner authorization.

## 2. Current source-integrated state

1. Product defaults are versioned, visible, hash-bound, and fill only empty Project Data evidence fields.
2. Conservative topology Product defaults remove routine empty-profile blockers without inventing geometry:
   - port match tolerance `0 mm`;
   - support-site grouping tolerance `0 mm`;
   - AUTO-carrier coincidence tolerance `0 mm`;
   - branch-scoped exact-port routing; source order forbidden; degree >2 remains blocked;
   - unknown support Product fallback is non-bearing: `DEFAULT.vertical=false`.
3. Equilibrium Product default is `1e-6 N` force / `1e-3 N·mm` moment. This is numerical closure tolerance only, not an allowable.
4. Support-site and route-partition builders compose Product defaults before reading topology policy.
5. Effective-value precedence remains:
   `ACCEPTED_OVERRIDE → SOURCE_EXPLICIT → SOURCE_INHERITED → EXACT_APPROVED_MASTER → CONFIGURED_DERIVATION → PROJECT_POLICY(field-owned) → PROJECT_CONFIGURED_DEFAULT → PRODUCT_DEFAULT`.
6. Newly compiled V1/V2 authorized gravity input carries target-level effective-value provenance. Ledger execution uses exact target-specific selectors; legacy `DEFAULT` selector authority is forbidden on that path.
7. Package readiness and V1/V2 execution use `authorizedGravityLoads` for ledger-bearing input. Historical ledger-less receipts retain legacy `loads` requirements.
8. **Kernel revalidation is contained:** the legacy statics kernel still asks for `loads`, but Project Data validation resolves that request to `authorizedGravityLoads` only when all six gravity maps are approved and bound to one consistent effective-ledger hash, authorized-input hash, and execution-projection hash. Any missing/tampered binding restores full legacy source-sheet requirements.
9. Product-default freshness is re-evaluated before authorization/Run; a changed effective Product profile cannot leave an old authorization current.
10. Support mechanics preserve force and first-moment custody for bracketed, overhang and unsupported loads, with route-local closure.
11. Load Calc UI treats `CALCULATED_WITH_EXCEPTIONS` as a current result and exposes coverage/unallocated/transfer evidence.
12. V3-V8 remain classified as parallel Package-5 sealed-enrichment execution authorities and are not silently migrated into V1/V2.
13. **Source-basis authority is now fail-closed before statics:** active ledger gravity implements `SOURCE_Z_UP_MM_SCALAR_VERTICAL_GRAVITY` only. X/Y source-up and non-mm source geometry are rejected before calculation because the repository has no engineering coordinate/unit transform for this kernel. The existing source→Three.js transform is rendering-only.

## 3. Governing engineering invariants

```text
F_evaluated(route) = F_reaction(route) + F_unallocated(route)
M_evaluated(route) = M_reaction(route) + M_boundary_transfer(route) + M_unallocated(route)
```

- no known load disappears;
- proximity never creates a structural load path;
- zero qualified support means zero invented reaction;
- unknown support is non-bearing unless explicit capability evidence grants vertical authority;
- exact-only topology defaults cannot merge near-but-distinct geometry;
- overhang `F*a` is member/boundary transfer demand, not fabricated REST rotational reaction;
- defaults may fill routine missing evidence only; ambiguity/conflict/staleness remains fail-closed;
- same-authority unequal values fail closed;
- target-level values cannot collapse back to shared catalog/material selector authority;
- ledger-bearing execution cannot regain raw Project Data `DEFAULT` fallback authority;
- ledger-bound mass/section maps cannot bypass their ledger/input/projection binding;
- legacy receipts remain legacy until explicitly migrated;
- X/Y-up or non-mm source data must not be cosmetically relabelled as implemented gravity mechanics;
- engineering tolerances are not weakened to force a pass.

## 4. Issue #1321 active-consumer acceptance matrix

Legend:
- `ACTIVE_CONSUMED`: active gravity mechanics consume governed value.
- `ACTIVE_BOUNDED`: active path explicitly supports a restricted value and rejects unsupported settings.
- `CONTRACT_ONLY`: field/policy exists but current gravity mechanics do not consume it.
- `OPEN`: issue asks for capability not yet implemented.
- `N/A_GRAVITY`: belongs to other method families, not V1/V2 scalar gravity.

| Issue #1321 family | Current state | Engineering disposition |
|---|---|---|
| Length unit | ACTIVE_BOUNDED | only `mm`; non-mm rejected pre-statics |
| Source/up axis | ACTIVE_BOUNDED | only source `Z` up; X/Y rejected pre-statics |
| Rendering coordinate transform | N/A_GRAVITY | explicitly rendering-only; cannot rotate engineering gravity |
| Gravity vector direction | OPEN | scalar source-Z gravity only; no arbitrary vector mechanics |
| Gravity acceleration | ACTIVE_CONSUMED | Product/Project governed |
| Load factor | ACTIVE_CONSUMED | Product/Project governed |
| Force output convention | OPEN | current scalar convention fixed; not yet configurable authority |
| Moment output convention | OPEN | current route first moment in N·mm fixed; not yet configurable authority |
| Analysis plane/basis | OPEN | route chainage statics only; no arbitrary plane selection |
| Result sign convention | OPEN | positive reaction opposes source-axis gravity; fixed today |
| OD / wall | ACTIVE_CONSUMED | target-level effective ledger |
| Material density | ACTIVE_CONSUMED | target-level effective ledger |
| Unit pipe mass/weight | ACTIVE_CONSUMED_DERIVED | annulus × density × length in kernel |
| E / alpha / I / EI / Poisson | N/A_GRAVITY | other Non-FEA methods |
| Operating fluid density | ACTIVE_CONSUMED | exact target-level ledger density |
| Hydro fluid density | ACTIVE_CONSUMED | exact target-level ledger density |
| EMPTY content | ACTIVE_CONSUMED_FIXED | hard-coded zero fluid |
| OPE/HYD fill fraction | CONTRACT_ONLY | `fluidPhaseAndFillState` exists but kernel currently assumes full bore |
| Fluid phase | CONTRACT_ONLY | field exists; gravity uses density only |
| Insulation thickness/density | ACTIVE_CONSUMED | target-level effective ledger |
| Cladding/tracing ancillary mass | OPEN | no active mass primitive |
| Component mass | ACTIVE_CONSUMED | explicit point mass for non-pipe component |
| Component mass composition policy | OPEN | no explicit policy selector yet |
| Dry-mass double-count protection | PARTIAL_STRUCTURAL | pipe and non-pipe mass paths separated by entity type; no explicit policy receipt |
| Component internal fluid | OPEN | non-pipe point-mass path does not add component-contained fluid |
| Component CoG | ACTIVE_CONSUMED | V3 exact qualified CoG; V2 logged midpoint fallback only when CoG missing |
| Route topology / chainage | ACTIVE_CONSUMED | exact topology plus configured tolerances |
| Support capability exact kind | ACTIVE_CONSUMED | vertical support eligibility uses exact type map |
| Support capability `DEFAULT` fallback | CONTRACT_ONLY | Product default is safely non-bearing; kernel does not currently expand DEFAULT to unknown types |
| REST/GUIDE/LINESTOP semantics | ACTIVE_CONSUMED_SCOPE | only vertical-bearing capability used by V1/V2; line stop does not imply vertical support |
| Gap/stiffness/friction/contact | N/A_GRAVITY | Beam/Contact/restraint-network family |
| Active EMPTY/OPE/HYD cases | ACTIVE_CONSUMED | Product/Project governed |
| Temperature/pressure/stress code | N/A_GRAVITY | other methods |
| Gravity AUTO V2/V3 | ACTIVE_CONSUMED | deterministic method selection/fallback |
| Beam/Contact / restraint-network methods | SEPARATE_FAMILY | no authority gained merely by execution |

This matrix is intentionally conservative: a registry/UI field does **not** count as implemented until active mechanics consume it or explicitly reject unsupported values.

## 5. Implementation / validation matrix

| Item | State | Evidence |
|---|---|---|
| Product Project Data defaults | IMPLEMENTED_SOURCE | source inspected; exact repo execution NOT_RUN |
| Conservative topology bootstrap | IMPLEMENTED_SOURCE | builders use effective profile; falsifier registered; NOT_RUN |
| Effective-value target ledger | IMPLEMENTED_SOURCE | source inspected; NOT_RUN |
| V1/V2 ledger execution projection | IMPLEMENTED_SOURCE | guard/collision falsifiers registered; NOT_RUN |
| Ledger-aware package readiness | IMPLEMENTED_SOURCE | source diff inspected; NOT_RUN |
| Ledger-aware **kernel** validation | IMPLEMENTED_SOURCE | six-map consistent evidence gate + tamper falsifier; NOT_RUN |
| Product-default authorization staleness | IMPLEMENTED_SOURCE | live common-input re-evaluation; NOT_RUN |
| Z-up/mm source-basis gate | IMPLEMENTED_SOURCE_ACTIVE_PATH | pre-statics fail-closed gate + falsifier; NOT_RUN |
| 18 kN mechanics | IMPLEMENTED_SOURCE | independent analytical reproduction PASS; exact repo script NOT_RUN |
| Route-local anti-cancellation | IMPLEMENTED_SOURCE | source inspected; exact repo script NOT_RUN |
| Partial-result UI | IMPLEMENTED_SOURCE | local pure classifier reproduction PASS; browser NOT_RUN |
| V3-V8 boundary | CLASSIFIED_NO_SILENT_MIGRATION | source inspection; exact guard NOT_RUN |
| Fill fraction / phase consumption | OPEN | field currently reserved/contract-only |
| Output/sign convention authority | OPEN | fixed mechanics metadata today |
| Full Issue #1321 acceptance | OPEN | continuation required |

## 6. Numerical / authority falsifiers registered

- 18 kN benchmark: 12 kN bracketed → 7.2/4.8 kN; 3 kN overhang → 3 kN + 6 kN·m transfer; 3 kN unsupported → 3 kN unallocated + 15 kN·m first moment; residuals zero.
- dropped unsupported 3 kN must fail custody.
- equal/opposite route moment residuals with aggregate zero must fail route-local closure.
- same selector with different target values must remain distinct.
- ledger execution must reject stale projection/profile/dataset hashes and legacy `DEFAULT` selectors.
- generic load maps without consistent ledger evidence must still fail missing master-source requirements under legacy `loads`.
- all six ledger maps with one consistent ledger/input/projection identity may resolve kernel `loads` validation to `authorizedGravityLoads`.
- tampering one map’s projection identity must restore legacy requirements.
- empty Project Data must build exact-only topology with 0 mm defaults; 0.1 mm-distinct supports must remain distinct.
- unknown Product support capability remains `vertical:false`.
- source Z-up + mm is allowed; X/Y-up and non-mm source units are rejected before statics.
- mismatched kernel `sourceAxisBasis` is rejected before authorized publication.

## 7. Validation ledger

### PASS — independent/local analytical

**VAL-001 — 18 kN analytical reproduction**
- source = 18 kN;
- reactions = 15 kN;
- unallocated = 3 kN;
- transfer = 6 kN·m;
- unallocated first moment = 15 kN·m;
- force and moment residual = 0.

Limitation: independent arithmetic reproduction, not exact repository Node execution.

### PASS — local presentation reproduction

**VAL-002 — completeness-aware Load Calc presentation**
- CALCULATED / CALCULATED_WITH_EXCEPTIONS → current Loads output;
- FAILED/BLOCKED/unknown/missing → no current accepted output.

Limitation: pure classifier reproduction; browser/controller event path NOT_RUN.

### PASS — source/diff inspection only

- `project-data-contract.js` P0 diff only adds evidence-driven ledger workflow resolution;
- `engineering-model-store.js` diff selects ledger-aware package readiness only for ledger-bearing input;
- source geometry remains in engineering coordinates; Three.js transform is rendering-only and explicitly assumes source Z-up;
- dataset geometry parsing performs no general length-unit conversion;
- active source-basis guard therefore correctly fails X/Y and non-mm before statics.

### NOT_RUN / NOT_OBSERVED

- `node scripts/non-fea-gravity-product-default-bootstrap-check.mjs`;
- `node scripts/authorized-empirical-ledger-readiness-check.mjs`;
- `node scripts/authorized-empirical-source-axis-binding-check.mjs`;
- all other new/updated exact repository Node scripts;
- `node scripts/run-non-fea-checks.mjs`;
- build;
- browser/e2e;
- relevant exact-head Load Calc CI.

EMP.1-specific workflow failures observed on an earlier exact head are NOT_APPLICABLE to Issue #1321 qualification.

## 8. Changed-file ledger

GitHub changed-file count at production source basis `bef97d45...`: **58**. Ledger count: **58**. Unexplained: **0**.

1. `agents/PR1323_workreport.md`
2. `agents/claims/PR1323.yaml`
3. `agents/status/PR1323.yaml`
4. `scripts/authorized-empirical-default-staleness-check.mjs`
5. `scripts/authorized-empirical-effective-execution-projection-check.mjs`
6. `scripts/authorized-empirical-effective-execution-projection-collision-check.mjs`
7. `scripts/authorized-empirical-effective-support-guard-check.mjs`
8. `scripts/authorized-empirical-effective-value-ledger-check.mjs`
9. `scripts/authorized-empirical-generation-boundary-check.mjs`
10. `scripts/authorized-empirical-ledger-readiness-check.mjs`
11. `scripts/authorized-empirical-product-default-convergence-check.mjs`
12. `scripts/authorized-empirical-source-axis-binding-check.mjs`
13. `scripts/authorized-empirical-v2-effective-execution-check.mjs`
14. `scripts/empirical-authorized-blocked-cases-check.mjs`
15. `scripts/empirical-gravity-method-selection-check.mjs`
16. `scripts/load-calc-result-presentation-check.mjs`
17. `scripts/non-fea-common-enriched-configured-default-overlay-check.mjs`
18. `scripts/non-fea-common-enriched-effective-default-authoring-check.mjs`
19. `scripts/non-fea-common-enriched-effective-default-composition-check.mjs`
20. `scripts/non-fea-configured-default-scope-priority-check.mjs`
21. `scripts/non-fea-effective-value-resolver-check.mjs`
22. `scripts/non-fea-gravity-product-default-bootstrap-check.mjs`
23. `scripts/non-fea-product-default-profile-check.mjs`
24. `scripts/non-fea-product-engineering-default-profile-check.mjs`
25. `scripts/run-non-fea-checks.mjs`
26. `scripts/support-load-partial-distribution-check.mjs`
27. `scripts/support-load-route-equilibrium-check.mjs`
28. `scripts/support-load-static-accounting-check.mjs`
29. `src/core/common-enriched-properties/field.js`
30. `src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js`
31. `src/workspace/engineering-loads/authorized-empirical-effective-support-load-execution.js`
32. `src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js`
33. `src/workspace/engineering-loads/authorized-empirical-load-execution-v2.js`
34. `src/workspace/engineering-loads/authorized-empirical-load-execution.js`
35. `src/workspace/engineering-loads/authorized-empirical-load-input.js`
36. `src/workspace/engineering-loads/authorized-empirical-source-axis-binding.js`
37. `src/workspace/engineering-loads/empirical-gravity-method-selection.js`
38. `src/workspace/engineering-loads/engineering-support-load-store.js`
39. `src/workspace/engineering-loads/support-load-distribution-v3.js`
40. `src/workspace/engineering-loads/support-load-static-accounting.js`
41. `src/workspace/engineering-model-store.js`
42. `src/workspace/enrichment/authorized-enrichment-consumer-controller.js`
43. `src/workspace/enrichment/non-fea-common-enriched-effective-default-authoring.js`
44. `src/workspace/load-calc-consumer-controller.js`
45. `src/workspace/load-calc-consumer-view.js`
46. `src/workspace/load-calc-result-presentation.js`
47. `src/workspace/non-fea-common-input-runtime.js`
48. `src/workspace/project-data/non-fea-common-enriched-configured-default-overlay.js`
49. `src/workspace/project-data/non-fea-common-enriched-product-default-overlay.js`
50. `src/workspace/project-data/non-fea-configured-default-provider.js`
51. `src/workspace/project-data/non-fea-effective-value-resolver.js`
52. `src/workspace/project-data/non-fea-field-registry.js`
53. `src/workspace/project-data/non-fea-product-default-profile.js`
54. `src/workspace/project-data/non-fea-product-engineering-default-profile.js`
55. `src/workspace/project-data/project-data-contract.js`
56. `src/workspace/project-data/project-data-fields.js`
57. `src/workspace/routes/route-partition-model.js`
58. `src/workspace/support-sites/support-site-model.js`

No `.github/workflows/*` path is changed.

## 9. Repository / review ground truth

- PR #1323: OPEN, DRAFT, mergeable at GE-009 grounding.
- Production source basis: `bef97d453d0044918bdb0bf5008bc0fa053dd199`.
- Base/main: `a222e18c38bd20fb55c1c6c95f724f40e40e8532`; no base drift observed.
- Changed files: 58.
- No issue comments/review comments/submitted reviews observed in latest grounding.
- Merge authorization: **NOT GRANTED**.
- No workflow files modified.
- Metadata-only sync commits after this source basis do not change the production implementation basis.

## 10. Continuation order

1. **Fluid/mass composition:** design a traceable fill-fraction derivation. Existing `fluidPhaseAndFillState` is contract-only and 1885S explicitly labels it reserved for future use; do not silently activate its legacy DEFAULT in a way that makes EMPTY nonempty.
2. **Component mass composition:** define one dry-metal policy per entity/case and decide how component-contained fluid/cladding/tracing are represented without double counting.
3. **Support fallback:** if `supportTypeCapabilities.DEFAULT` is made configurable, consume it explicitly and preserve the Product non-bearing default.
4. **Output conventions:** add governed force/moment/sign/analysis-basis fields only together with active consumers; do not add inert UI controls.
5. **Gravity vector:** arbitrary X/Y/vector gravity requires an engineering coordinate/vector transformation, not metadata rebinding.
6. Execute exact focused/aggregate/browser qualification when a real Load Calc execution channel is available; until then retain NOT_RUN/NOT_OBSERVED.

# Appendix A — Next-agent qualification questionnaire

A takeover agent must answer these from current source before production writes:

1. Why can kernel `validateProjectDataProfile(..., 'loads')` sometimes use `authorizedGravityLoads` requirements?
   - Only when all six gravity maps are approved and share the same authorized effective-ledger, authorized-input and execution-projection identities. Tamper/missing evidence restores legacy requirements.
2. Why are topology Product tolerances 0 mm?
   - They eliminate routine missing configuration while preserving exact topology; they cannot invent approximate connectivity/grouping.
3. What does unknown Product support capability mean?
   - `DEFAULT.vertical=false`; no reaction authority is invented. The current kernel still uses exact support-type keys; DEFAULT consumption is a remaining contract/consumer gap.
4. What gravity source basis is implemented?
   - Source Z-up, mm, scalar vertical gravity only. X/Y and non-mm fail before statics because no engineering transform exists.
5. Is the Three.js coordinate transform a gravity transform?
   - No. It is explicitly `rendering-only` and converts source Z-up to Three.js presentation coordinates.
6. Is fluid fill policy currently active in gravity?
   - No. EMPTY is hard-coded empty; OPE/HYD use full-bore density volume. `fluidPhaseAndFillState` is currently contract-only/reserved.
7. Can V3-V8 be migrated because their version numbers follow V2?
   - No. They are separate Package-5 sealed-enrichment execution authorities with direct kernel calls.
8. What validation may be called PASS now?
   - Independent 18 kN arithmetic reproduction, local pure presentation reproduction, and explicit source/diff inspection only. Exact repository scripts/browser/Load Calc CI remain NOT_RUN/NOT_OBSERVED.
