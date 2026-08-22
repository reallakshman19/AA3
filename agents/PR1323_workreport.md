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

PR_HEAD_OBSERVED: 63af300790d45539e5386971f7d9385740a0b855
REPORT_BASIS_HEAD: 63af300790d45539e5386971f7d9385740a0b855
MAIN_HEAD_LAST_CHECKED: a222e18c38bd20fb55c1c6c95f724f40e40e8532
MERGE_BASE: a222e18c38bd20fb55c1c6c95f724f40e40e8532
GROUNDING_EPOCH: GE-010

CURRENT_STAGE: STACK_9_FLUID_AND_COMPONENT_MASS_COMPOSITION_SOURCE_INTEGRATED
CURRENT_BLOCKER: EXACT_HEAD_LOAD_CALC_NODE_BROWSER_QUALIFICATION_NOT_OBSERVED; SUPPORT_DEFAULT_AND_OUTPUT_CONVENTION_ACCEPTANCE_REMAIN_OPEN
HIGHEST_RISK: New policy contracts must not outrun implemented mechanics. Partial OPE/HYD fill is now bound; zero-fill non-EMPTY remains fail-closed because the legacy scalar kernel cannot represent zero selected density. Component-contained fluid/cladding/tracing remain open mass primitives.
EXACT_NEXT_ACTION: consume supportTypeCapabilities.DEFAULT explicitly with visible resolution evidence while preserving Product DEFAULT.vertical=false, then bind force/moment/analysis/sign conventions only to values the active scalar gravity mechanics actually implement.
```

PR #1323 remains the **single draft carrier**. Do not create another PR. Do not merge without explicit owner authorization.

## 2. Current source-integrated state

1. Product defaults are versioned, visible and hash-bound; Product/default composition upgrades legacy Project Data with missing Phase-2 evidence slots before filling empties.
2. Conservative topology defaults remain exact-only: 0 mm port match, support grouping and AUTO-carrier coincidence; unknown Product support fallback is `DEFAULT.vertical=false`.
3. Effective-value precedence remains `ACCEPTED_OVERRIDE → SOURCE_EXPLICIT → SOURCE_INHERITED → EXACT_APPROVED_MASTER → CONFIGURED_DERIVATION → PROJECT_POLICY(field-owned) → PROJECT_CONFIGURED_DEFAULT → PRODUCT_DEFAULT`.
4. Newly compiled V1/V2 gravity uses a target-level effective-value ledger and exact execution selectors; legacy mass/section `DEFAULT` selectors are forbidden on the ledger path.
5. Kernel `loads` revalidation relaxes to `authorizedGravityLoads` only when all six projected gravity maps share one authorized ledger/input/projection identity.
6. Active ledger gravity remains bounded to `SOURCE_Z_UP_MM_SCALAR_VERTICAL_GRAVITY`; X/Y-up and non-mm source geometry fail before statics.
7. Support mechanics retain route-local force and first-moment custody for bracketed, overhang and unsupported load paths.
8. Load Calc UI publishes `CALCULATED_WITH_EXCEPTIONS` as current output with coverage/unallocated/transfer evidence.
9. **Fluid fill is now active:** raw OPE/HYD density remains in the effective ledger; projection derives `rho_bulk = rho_raw × fillFraction` with a separate receipt binding raw-density hash and fill-policy hash. Full-fill stays numeric for compatibility; partial-fill uses an auditable selected-density record.
10. Canonical EMPTY stays zero-content. Legacy `{DEFAULT:'LIQUID_FULL'}` may serve OPE/HYD but cannot make EMPTY non-empty.
11. Non-EMPTY zero fill remains explicitly unsupported until the statics kernel has native zero-fluid selection; epsilon density is forbidden.
12. **Component dry-mass policy is now active/bounded:** Product default is `COMPONENT_EXPLICIT_POINT_MASS`. One physical non-pipe entity may receive one dry-mass claim. PIPE + point-mass and duplicate physical-entity claims fail closed.
13. Recognized but unimplemented component modes (`PIPE_DISTRIBUTED_MASS`, `COMPONENT_DERIVED_GEOMETRIC_MASS`, `COMPONENT_EQUIVALENT_LENGTH_MASS`) are rejected rather than silently substituted.
14. Fill and component-mass policies are Project Data validated before execution and are registered as `WEIGHT_AND_GRAVITY` authorities.
15. V3-V8 remain independent Package-5 sealed-enrichment execution authorities; no silent migration has occurred.

## 3. Governing engineering invariants

```text
F_evaluated(route) = F_reaction(route) + F_unallocated(route)
M_evaluated(route) = M_reaction(route) + M_boundary_transfer(route) + M_unallocated(route)

rho_bulk(case,line) = rho_raw_authorized(case,line) × governed_fill_fraction(case,line)
```

- no known load disappears;
- proximity never creates a structural load path;
- zero qualified support means zero invented reaction;
- unknown support remains non-bearing unless explicit capability policy grants vertical authority;
- Product/default evidence never masquerades as source/master evidence;
- derived bulk fluid density never overwrites raw authorized density provenance;
- EMPTY is dry unless the method is explicitly redesigned;
- one physical component may have only one active dry-metal mass policy;
- PIPE distributed mass cannot also receive component point-mass authority;
- unsupported dry-mass modes remain blocked;
- same-authority unequal values fail closed;
- ledger-bound maps cannot bypass ledger/input/projection identity;
- X/Y-up or non-mm source data cannot be cosmetically relabelled as implemented gravity mechanics;
- engineering tolerances are not weakened to force a pass.

## 4. Issue #1321 active-consumer acceptance matrix

Legend: `ACTIVE_CONSUMED`, `ACTIVE_BOUNDED`, `OPEN`, `N/A_GRAVITY`, `SEPARATE_FAMILY`.

| Issue #1321 family | State | Engineering disposition |
|---|---|---|
| Length unit | ACTIVE_BOUNDED | `mm` only; non-mm rejected pre-statics |
| Source/up axis | ACTIVE_BOUNDED | source `Z` only; X/Y rejected pre-statics |
| Rendering transform | N/A_GRAVITY | rendering-only; not engineering gravity |
| Arbitrary gravity vector | OPEN | scalar source-Z gravity only |
| Gravity acceleration / load factor | ACTIVE_CONSUMED | Project/Product governed |
| Force/moment/analysis/sign output convention | OPEN | fixed mechanics metadata today; next slice |
| OD / wall / material density | ACTIVE_CONSUMED | target-level effective ledger |
| Operating/HYD raw density | ACTIVE_CONSUMED | target-level effective ledger |
| EMPTY content | ACTIVE_CONSUMED | canonical zero content |
| OPE/HYD fill fraction | ACTIVE_CONSUMED | line+case > case > default governed fill policy; derived bulk-density receipt |
| Fluid phase | ACTIVE_CONSUMED_METADATA | phase is bound in composition receipt; density remains mechanical primitive |
| Non-empty zero fill | ACTIVE_BOUNDED | rejected until native zero-fluid kernel support exists |
| Insulation thickness/density | ACTIVE_CONSUMED | target-level effective ledger |
| Cladding/tracing ancillary mass | OPEN | no mass primitive |
| Component explicit point mass | ACTIVE_CONSUMED | effective ledger + composition receipt |
| Component mass composition | ACTIVE_BOUNDED | explicit point-mass mode implemented; other closed modes rejected |
| Dry-mass double-count protection | ACTIVE_CONSUMED | PIPE conflict + duplicate physical-entity claim rejected |
| Component-contained fluid | OPEN | no non-pipe contained-fluid primitive |
| Component CoG | ACTIVE_CONSUMED | V3 qualified CoG; V2 logged midpoint fallback only when CoG missing |
| Route topology / chainage | ACTIVE_CONSUMED | exact topology + configured tolerances |
| Exact support capability | ACTIVE_CONSUMED | exact type lookup |
| `supportTypeCapabilities.DEFAULT` | OPEN | Product fallback exists but active lookup still exact-key only; next slice |
| REST/GUIDE/LINESTOP vertical semantics | ACTIVE_CONSUMED | vertical capability only; line stop does not imply vertical bearing |
| Active EMPTY/OPE/HYD cases | ACTIVE_CONSUMED | Project/Product governed |
| Gravity AUTO V2/V3 | ACTIVE_CONSUMED | deterministic selection/fallback |
| Beam/contact/restraint networks | SEPARATE_FAMILY | no authority gained by this PR stack |

## 5. Implementation / validation matrix

| Item | State | Evidence |
|---|---|---|
| Product defaults / legacy Phase-2 upgrade | IMPLEMENTED_SOURCE | source + falsifier registered; exact repo execution NOT_RUN |
| Effective-value target ledger / V1-V2 projection | IMPLEMENTED_SOURCE | source inspected; exact checks NOT_RUN |
| Ledger-aware package/kernel readiness | IMPLEMENTED_SOURCE | six-map identity gate; NOT_RUN |
| Z-up/mm source-basis gate | IMPLEMENTED_SOURCE_ACTIVE_PATH | pre-statics guard; NOT_RUN |
| Fluid fill/mass composition | IMPLEMENTED_SOURCE_ACTIVE_PATH | raw-density + fill-policy receipts; NOT_RUN |
| Component dry-mass composition/double-count guard | IMPLEMENTED_SOURCE_ACTIVE_PATH | explicit-point mode + conflicts; NOT_RUN |
| 18 kN mechanics | IMPLEMENTED_SOURCE | independent analytical reproduction PASS; exact script NOT_RUN |
| Route-local anti-cancellation | IMPLEMENTED_SOURCE | source inspected; NOT_RUN |
| Partial-result UI | IMPLEMENTED_SOURCE | local pure classifier reproduction PASS; browser NOT_RUN |
| Support DEFAULT consumption | OPEN | next stack |
| Output/sign convention authority | OPEN | next stack |
| Full Issue #1321 acceptance | OPEN | continuation required |

## 6. Falsifiers registered

- 18 kN benchmark and dropped-load custody failure;
- route-local equal/opposite moment residual anti-cancellation;
- same selector/different target effective-value collision;
- stale projection/profile/dataset hashes and legacy load-map DEFAULT rejection;
- six-map ledger/input/projection identity tamper restores legacy requirements;
- exact-only topology defaults and unknown Product support non-bearing behavior;
- source Z-up/mm accepted; X/Y/non-mm rejected;
- full-fill compatibility and partial-fill `rho_raw × fraction` projection with stable raw-density hash;
- fill-policy change changes projection hash without changing raw-density authority;
- generic legacy `DEFAULT: LIQUID_FULL` cannot make EMPTY non-empty;
- non-empty zero-fill fails closed;
- component explicit-point policy accepted;
- unsupported component mass mode rejected;
- duplicate dry-mass claims on one physical entity rejected;
- PIPE + component point-mass dry-mass conflict rejected;
- legacy Project Data lacking new Phase-2 policy slots is additively upgraded before Product defaults.

## 7. Validation ledger

### PASS — independent/local only

**VAL-001 — 18 kN analytical reproduction**: source 18 kN; reactions 15 kN; unallocated 3 kN; transfer 6 kN·m; unallocated first moment 15 kN·m; force/moment residual 0.

**VAL-002 — completeness-aware presentation reproduction**: CALCULATED/CALCULATED_WITH_EXCEPTIONS publish current Loads; FAILED/BLOCKED do not.

### PASS — source/diff inspection only

- effective fluid composition preserves raw density provenance and separately binds fill policy;
- component mass projection enforces one dry-mass policy claim per physical non-pipe entity;
- Product-default provider upgrades legacy Phase-2 shape before filling empty evidence;
- source basis remains source-Z/mm only.

### NOT_RUN / NOT_OBSERVED

- `node scripts/non-fea-fluid-fill-policy-check.mjs`;
- `node scripts/authorized-empirical-fluid-mass-composition-check.mjs`;
- `node scripts/authorized-empirical-component-mass-composition-check.mjs`;
- all other new/updated exact repository Node scripts;
- `node scripts/run-non-fea-checks.mjs`;
- build;
- browser/e2e;
- relevant exact-head Load Calc CI.

EMP.1-only workflow results are NOT_APPLICABLE to Issue #1321 qualification.

## 8. Changed-file ledger

GitHub changed-file count at source basis `63af300...`: **63**. Ledger count: **63**. Unexplained: **0**.

1. `agents/PR1323_workreport.md`
2. `agents/claims/PR1323.yaml`
3. `agents/status/PR1323.yaml`
4. `scripts/authorized-empirical-component-mass-composition-check.mjs`
5. `scripts/authorized-empirical-default-staleness-check.mjs`
6. `scripts/authorized-empirical-effective-execution-projection-check.mjs`
7. `scripts/authorized-empirical-effective-execution-projection-collision-check.mjs`
8. `scripts/authorized-empirical-effective-support-guard-check.mjs`
9. `scripts/authorized-empirical-effective-value-ledger-check.mjs`
10. `scripts/authorized-empirical-fluid-mass-composition-check.mjs`
11. `scripts/authorized-empirical-generation-boundary-check.mjs`
12. `scripts/authorized-empirical-ledger-readiness-check.mjs`
13. `scripts/authorized-empirical-product-default-convergence-check.mjs`
14. `scripts/authorized-empirical-source-axis-binding-check.mjs`
15. `scripts/authorized-empirical-v2-effective-execution-check.mjs`
16. `scripts/empirical-authorized-blocked-cases-check.mjs`
17. `scripts/empirical-gravity-method-selection-check.mjs`
18. `scripts/load-calc-result-presentation-check.mjs`
19. `scripts/non-fea-common-enriched-configured-default-overlay-check.mjs`
20. `scripts/non-fea-common-enriched-effective-default-authoring-check.mjs`
21. `scripts/non-fea-common-enriched-effective-default-composition-check.mjs`
22. `scripts/non-fea-configured-default-scope-priority-check.mjs`
23. `scripts/non-fea-effective-value-resolver-check.mjs`
24. `scripts/non-fea-fluid-fill-policy-check.mjs`
25. `scripts/non-fea-gravity-product-default-bootstrap-check.mjs`
26. `scripts/non-fea-product-default-profile-check.mjs`
27. `scripts/non-fea-product-engineering-default-profile-check.mjs`
28. `scripts/run-non-fea-checks.mjs`
29. `scripts/support-load-partial-distribution-check.mjs`
30. `scripts/support-load-route-equilibrium-check.mjs`
31. `scripts/support-load-static-accounting-check.mjs`
32. `src/core/common-enriched-properties/field.js`
33. `src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js`
34. `src/workspace/engineering-loads/authorized-empirical-effective-support-load-execution.js`
35. `src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js`
36. `src/workspace/engineering-loads/authorized-empirical-load-execution-v2.js`
37. `src/workspace/engineering-loads/authorized-empirical-load-execution.js`
38. `src/workspace/engineering-loads/authorized-empirical-load-input.js`
39. `src/workspace/engineering-loads/authorized-empirical-source-axis-binding.js`
40. `src/workspace/engineering-loads/empirical-gravity-method-selection.js`
41. `src/workspace/engineering-loads/engineering-support-load-store.js`
42. `src/workspace/engineering-loads/support-load-distribution-v3.js`
43. `src/workspace/engineering-loads/support-load-static-accounting.js`
44. `src/workspace/engineering-model-store.js`
45. `src/workspace/enrichment/authorized-enrichment-consumer-controller.js`
46. `src/workspace/enrichment/non-fea-common-enriched-effective-default-authoring.js`
47. `src/workspace/load-calc-consumer-controller.js`
48. `src/workspace/load-calc-consumer-view.js`
49. `src/workspace/load-calc-result-presentation.js`
50. `src/workspace/non-fea-common-input-runtime.js`
51. `src/workspace/project-data/non-fea-common-enriched-configured-default-overlay.js`
52. `src/workspace/project-data/non-fea-common-enriched-product-default-overlay.js`
53. `src/workspace/project-data/non-fea-component-mass-policy.js`
54. `src/workspace/project-data/non-fea-configured-default-provider.js`
55. `src/workspace/project-data/non-fea-effective-value-resolver.js`
56. `src/workspace/project-data/non-fea-field-registry.js`
57. `src/workspace/project-data/non-fea-fluid-fill-policy.js`
58. `src/workspace/project-data/non-fea-product-default-profile.js`
59. `src/workspace/project-data/non-fea-product-engineering-default-profile.js`
60. `src/workspace/project-data/project-data-contract.js`
61. `src/workspace/project-data/project-data-fields.js`
62. `src/workspace/routes/route-partition-model.js`
63. `src/workspace/support-sites/support-site-model.js`

No `.github/workflows/*` path is changed.

## 9. Repository / review ground truth

- PR #1323: OPEN, DRAFT, mergeable at GE-010 grounding.
- Production source basis: `63af300790d45539e5386971f7d9385740a0b855`.
- Base/main: `a222e18c38bd20fb55c1c6c95f724f40e40e8532`; no base drift observed.
- Changed files: 63.
- No comments/reviews were observed in the last explicit PR discussion grounding before this report refresh.
- Merge authorization: **NOT GRANTED**.
- No workflow files modified.

## 10. Continuation order

1. **Support fallback:** explicitly resolve exact support type then `DEFAULT`; preserve Product `DEFAULT.vertical=false`; publish/audit fallback use so a Project `DEFAULT.vertical=true` assumption cannot be invisible.
2. **Output conventions:** introduce governed force, moment, analysis-basis and sign policy only with an active pre-statics validator and output metadata consumer. Unsupported conventions must fail closed.
3. **Ancillary/component contents:** add cladding/tracing/component-contained-fluid only when explicit mass primitives and double-count rules exist.
4. **Gravity vector/unit transforms:** remain blocked until true engineering transformations exist.
5. Exact focused/aggregate/browser qualification remains NOT_RUN/NOT_OBSERVED until actually executed.

# Appendix A — Next-agent qualification questionnaire

1. Why can kernel `validateProjectDataProfile(...,'loads')` sometimes use `authorizedGravityLoads`?
   - Only when all six projected gravity maps carry one consistent ledger/input/projection identity.
2. What gravity source basis is implemented?
   - Source Z-up, mm, scalar vertical gravity only.
3. Is Three.js transform mechanical authority?
   - No; rendering-only.
4. How is partial fluid fill implemented?
   - Raw authorized density remains unchanged; execution derives bulk density using governed fill fraction and binds both hashes in a composition receipt.
5. Can generic `DEFAULT: LIQUID_FULL` make EMPTY wet?
   - No; EMPTY stays canonical dry unless explicitly redesigned.
6. What component dry-mass mode is implemented?
   - `COMPONENT_EXPLICIT_POINT_MASS` only. Other closed modes are recognized but rejected.
7. What prevents component dry-mass double counting?
   - PIPE entities cannot receive component point mass and one physical non-pipe entity cannot receive multiple component dry-mass claims.
8. Is `supportTypeCapabilities.DEFAULT` active?
   - Not yet at this source basis; exact-key support capability is active and DEFAULT consumption is the next slice.
9. What validation may be called PASS?
   - Independent 18 kN arithmetic, local pure presentation reproduction, and explicit source/diff inspection only. Exact repository scripts/build/browser/Load Calc CI remain NOT_RUN/NOT_OBSERVED.
