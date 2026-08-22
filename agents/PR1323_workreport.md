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
BRANCH: claude/pr-1323-project-data-wu1zx0 (merge of agent/issue-1321-load-calc-effective-values @ 940ff897d723d273a3855b9798f684522593d325 into current main)

PR_HEAD_OBSERVED: 940ff897d723d273a3855b9798f684522593d325
REPORT_BASIS_HEAD: GE-012 session on top of 1f07cdbd3e3646ec5ba3e8e7bdcbc9883e8e6899
MAIN_HEAD_LAST_CHECKED: 1d08bcd0fdebc86fc2daaeb752f129b877e01c74
MERGE_BASE: 1d08bcd0fdebc86fc2daaeb752f129b877e01c74 (main had advanced one commit past a222e18 since GE-011; disjoint EMP1/WRC content, no conflicts)
GROUNDING_EPOCH: GE-012

CURRENT_STAGE: STACK_11_VERIFY_UI_LEDGER_RECONCILIATION_AND_EXACT_NODE_QUALIFICATION_RUN
CURRENT_BLOCKER: TWO_OF_FIFTY_NON_FEA_CHECKS_BLOCKED_ON_MISSING_EXTERNAL_CAESAR_BM2_FIXTURE_UNRELATED_TO_1321; PRE_EXISTING_MAIN_CHUNK_BUNDLE_BUDGET_OVERAGE_UNRELATED_TO_1321; ANCILLARY_COMPONENT_CONTENT_AND_TRUE_VECTOR_UNIT_TRANSFORM_REMAIN_OPEN
HIGHEST_RISK: Bounded convention/default contracts must not be mistaken for mechanics that are not implemented. The active gravity method remains source-Z/mm scalar route-chainage statics; alternative conventions, X/Y-up, non-mm units and unsupported mass primitives fail closed.
EXACT_NEXT_ACTION: design ancillary/component-contained mass primitives (cladding/tracing, component-contained fluid) with double-count protection, and native non-empty zero-fluid support; separately, source or regenerate benchmarks/LFEA/BM2/Input_BM2.xml (unrelated CAESAR-II restraint-network benchmark, never committed) and address the pre-existing main-chunk bundle-size budget overage if in scope.
```

PR #1323 remains the **single draft carrier**. Do not create another PR. Do not merge without explicit owner authorization.

## 0. GE-012 session — Verify & Run reconciliation and first actual Node execution

This session did what GE-011 explicitly flagged as its `EXACT_NEXT_ACTION` and its `NOT_RUN/NOT_OBSERVED` gap, and reports genuine execution evidence, not source inspection, for the first time in this stack's history:

1. **Verify & Run UI fix** (`src/workspace/load-calc-consumer-controller.js`, `renderVerifyPane`): the 13-raw-field checklist ignored `authState.calculationEligible` — the same ledger-aware readiness signal (`engineeringModelStore#currentEmpiricalReadiness` → `validateProjectDataProfile(..., 'authorizedGravityLoads'/'loads', ...)`) the Run button already trusted. A raw field now only shows as a blocker when the authorized path is *not* eligible; when it is, the checklist says so explicitly ("resolved via effective-value ledger") rather than silently hiding the distinction.
2. **`npm ci`** was run (node_modules was absent in this container) so `node scripts/run-non-fea-checks.mjs`, `eslint`, and `vite build` could actually execute rather than remaining theoretical.
3. **`node scripts/run-non-fea-checks.mjs` was actually run to completion for the first time.** It found and each was root-caused and fixed (not skipped):
   - `non-fea-project-data-authority-check.mjs`: asserted the 1885S fixture's `installationTemperatureC`/`configuredDefaults` were still empty; PR #1283 had already legitimately populated them. Fixed the assertions to check preservation and to flag the five fields #1321 actually left open (`componentMassCompositionPolicy`, `forceOutputConvention`, `momentOutputConvention`, `analysisBasis`, `resultSignConvention`).
   - `authorized-empirical-effective-value-ledger-check.mjs`: fixture used `revision: 3` with `previousBaseline: null`, which the publication orchestrator requires to be `revision: 1`. Fixture bug, fixed.
   - `non-fea-common-enriched-effective-default-authoring-check.mjs` / `non-fea-common-enriched-effective-default-authoring.js`: imported a never-exported `LOAD_CALC_PRODUCT_ENGINEERING_DEFAULTS_V1`; the real export is `LOAD_CALC_ENGINEERING_PRODUCT_DEFAULTS_EMPTY_V1`. Renamed at all 4 call sites.
   - `authorized-empirical-v2-effective-execution-check.mjs` exposed two real production bugs in `project-data-contract.js`, both pre-existing (from PR #1226, before #1321 started) and never previously exercised end-to-end: (a) `isExplicitlyUninsulated` only recognized string `NONE`/`UNINSULATED` codes, not the `insulationCode: null` convention the ledger projection and `authorized-empirical-load-input.js` both already use for "no insulation on this target"; (b) `validateRequired` flagged an approved-but-empty `insulationDensitiesKgPerM3`/`componentWeightsKg` map as `MISSING_VALUE`, even though the ledger projection only ever produces an empty map when the dataset genuinely has no insulated line / no point-mass component (each per-target requirement is separately enforced by `requiredEffective` throwing). Both fixed with narrowly-scoped, path-aware allowances.
   - `src/master-data/bundled-master-data.js` used Vite's `?raw` suffix import for `PCF_MAT_MAP.txt`, which plain Node (the `node scripts/*.mjs` convention this whole suite depends on) cannot parse. Fixed with a runtime environment check: Node reads the file via `fs`, the browser bundle still gets Vite's build-time-inlined string. Verified both paths (`node --input-type=module` load, and `npx vite build` producing `dist/assets/PCF_MAT_MAP-*.js`).
   - **48 of 50 checks now genuinely PASS.** The remaining 2 (`empirical-restraint-network-check.mjs`, `empirical-coupled-restraint-network-check.mjs`) need `benchmarks/LFEA/BM2/Input_BM2.xml`, a real CAESAR-II benchmark model that has never been committed to this repository (verified via `git log --all`) and belongs to the beam/contact/restraint-network family this stack's own body already marks `SEPARATE_FAMILY — no authority gained by this stack`. Not fabricated.
4. **Ran the real 1885S end-to-end qualification** (`scripts/1885s-empirical-qualification.mjs`) against the actual repository-owned `benchmarks/Sjson.json` (279 nodes) plus its real line-list/piping-class/component-weight master data (already present in the repo under `public/fixtures/` and `src/master-data/`, content-address-verified against the fixture manifest, staged into a local `TOPOLOGY_EDIT_FIXTURE_CACHE` — no data fabricated). This exercised dataset normalization, support-site/route-partition building, the inline-component-replacement edit/undo/redo workflow, and legacy support-load-distribution calculation, all against real project data.
   - Found and fixed a genuine status-model bug in `support-load-distribution-v3.js`: a case whose Project Data/topology profile was itself incomplete (`globalBlockers.length > 0`, calculation never attempted) was labelled `'FAILED'` — the same label used for an actually-attempted-and-failed calculation — even though the presentation layer (`load-calc-result-presentation.js`) and this qualification script both already treat `'BLOCKED'` ("review the listed inputs") as the distinct, correct status for that case. `caseStatus`/`aggregateDistributionStatus`/`supportResults`/`completenessAudit` now distinguish the two. Verified against every other check in the suite that asserts `status === 'FAILED'` (`support-load-route-equilibrium-check.mjs`, `empirical-authorized-blocked-cases-check.mjs`) — all of those exercise genuine in-calculation failures (`globalBlockers.length === 0`) and are unaffected.
   - `1885S portable empirical qualification passed` — real evidence written to `public/qualification/1885s-webgl-load-benchmark.{json,md}` and `reports/qualification/...`.
5. **`npm run build`**: `vite build` itself succeeds; the post-build `scripts/bundle-chunk-check.mjs` fails on a pre-existing `main-*.js` bundle-size budget overage (1,547,097 bytes vs. an 1,179,648-byte cap). Confirmed pre-existing and unrelated: this session's diff is ~860/241 lines across 8 source/script files plus 4 regenerated qualification-evidence files, and the oversized chunk was already exactly this size (1,547.10 kB) in a build taken before any of this session's `support-load-distribution-v3.js`/`project-data-contract.js` edits. Not fixed — would require unrelated code-splitting work on a ~1.5 MB chunk.
6. **Not done this session** (unchanged from GE-011, still genuinely open): cladding/tracing/component-contained-fluid mass primitives, native non-empty zero-fluid handling, arbitrary gravity vector/X/Y-up/non-mm mechanics.

## 2. Current source-integrated state

1. Product defaults are versioned, visible and hash-bound; legacy Project Data is additively upgraded with missing Phase-2 evidence slots before empty values are filled.
2. Effective-value precedence and target-level ledger remain the single V1/V2 gravity authority for OD/wall/material/fluid/insulation/component mass.
3. Conservative topology defaults remain exact-only. Product support fallback is `DEFAULT.vertical=false`.
4. Route mechanics retain force and first-moment custody for bracketed, overhang and unsupported paths; route-local equilibrium prevents cross-route cancellation.
5. Valid partial results publish as `CALCULATED_WITH_EXCEPTIONS` with allocated/unallocated coverage evidence.
6. Ledger-bearing V1/V2 execution uses target-specific mass/section maps and rejects legacy mass-map `DEFAULT` selectors. V3-V8 remain separate Package-5 authorities.
7. Kernel `loads` revalidation relaxes only when all six gravity maps share one ledger/input/projection identity.
8. Active engineering source basis remains `SOURCE_Z_UP_MM_SCALAR_VERTICAL_GRAVITY`; X/Y-up and non-mm source geometry are rejected before statics.
9. Fluid fill is active: `rho_bulk = rho_raw × fillFraction`; raw density authority and fill-policy authority remain separately hash-bound. EMPTY stays dry; non-empty zero-fill remains fail-closed until native zero-fluid kernel support exists.
10. Component dry-mass policy is active/bounded: `COMPONENT_EXPLICIT_POINT_MASS` is implemented; duplicate physical-entity claims, PIPE+point-mass conflicts and unsupported dry-mass modes fail closed.
11. **Support `DEFAULT` is now actively consumed on the authorized ledger path.** Exact support-kind rule wins. A named unknown kind may consume governed `DEFAULT`; the execution-local profile expands only kinds actually present in the support-site model and returns a support-capability authority receipt.
12. Missing support-kind identity does **not** consume `DEFAULT`; it remains unresolved/non-bearing because the kernel has no selector that can be expanded.
13. Product unknown support remains non-bearing. An explicit Project `DEFAULT.vertical=true` can grant screening vertical capability, visibly and hash-bound.
14. **Force/moment/analysis/sign conventions are now active/bounded.** Product defaults are:
    - `POSITIVE_REACTION_OPPOSES_SOURCE_AXIS_GRAVITY`
    - `SIGNED_ROUTE_CHAINAGE_FIRST_MOMENT_NMM`
    - `ROUTE_CHAINAGE_1D_STATIC_GRAVITY`
    - `SOURCE_Z_UP_POSITIVE_SUPPORT_REACTION`
15. The authorized wrapper validates those four conventions before statics and cross-checks the legacy kernel's actual force convention and route-chainage moment reference after statics. Alternative convention tokens fail closed; no cosmetic relabelling occurs.
16. A UI attempt to expose the new receipts accidentally truncated existing guided-workflow helpers. The bad commit was immediately neutralized by a normal forward revert commit; `load-calc-consumer-view.js` is restored exactly to pre-attempt blob `67dd311e55d8775bc7b74687e0bee164c3189e6b`. No force-push and no net UI truncation remain.

## 3. Governing engineering invariants

```text
F_evaluated(route) = F_reaction(route) + F_unallocated(route)
M_evaluated(route) = M_reaction(route) + M_boundary_transfer(route) + M_unallocated(route)

rho_bulk(case,line) = rho_raw_authorized(case,line) × governed_fill_fraction(case,line)

support capability resolution:
  exact named support kind
  > governed DEFAULT for named unknown kind
  > unresolved non-bearing
```

- no known load disappears;
- proximity never creates a structural load path;
- zero qualified support means zero invented reaction;
- Product/default evidence never masquerades as source/master evidence;
- derived bulk density never overwrites raw density provenance;
- EMPTY remains dry on this method;
- one physical component receives one dry-metal mass policy;
- PIPE distributed mass cannot also receive component point mass;
- Product support DEFAULT cannot invent capacity (`vertical=false`);
- a missing support identity cannot consume DEFAULT;
- same-authority unequal effective values fail closed;
- ledger-bound maps cannot bypass ledger/input/projection identity;
- source X/Y-up or non-mm cannot be relabelled as implemented gravity mechanics;
- unsupported result convention tokens fail before statics;
- engineering tolerances are not weakened to force a pass.

## 4. Issue #1321 active-consumer acceptance matrix

Legend: `ACTIVE_CONSUMED`, `ACTIVE_BOUNDED`, `OPEN`, `N/A_GRAVITY`, `SEPARATE_FAMILY`.

| Issue #1321 family | State | Engineering disposition |
|---|---|---|
| Length unit | ACTIVE_BOUNDED | `mm` only; non-mm rejected pre-statics |
| Source/up axis | ACTIVE_BOUNDED | source `Z` only; X/Y rejected pre-statics |
| Rendering transform | N/A_GRAVITY | rendering-only; not mechanical authority |
| Arbitrary gravity vector | OPEN | scalar source-Z gravity only |
| Gravity acceleration / load factor | ACTIVE_CONSUMED | Project/Product governed |
| Force output convention | ACTIVE_BOUNDED | exact implemented token only |
| Moment output convention | ACTIVE_BOUNDED | signed route-chainage first moment in N·mm only |
| Analysis basis | ACTIVE_BOUNDED | 1D route-chainage gravity only |
| Result sign convention | ACTIVE_BOUNDED | source-Z-up positive support reaction only |
| OD / wall / material density | ACTIVE_CONSUMED | target-level effective ledger |
| Operating/HYD raw density | ACTIVE_CONSUMED | target-level effective ledger |
| EMPTY content | ACTIVE_CONSUMED | canonical zero content |
| OPE/HYD fill fraction | ACTIVE_CONSUMED | governed line/case policy + composition receipt |
| Fluid phase | ACTIVE_CONSUMED_METADATA | bound in composition receipt |
| Non-empty zero fill | ACTIVE_BOUNDED | rejected pending native zero-fluid kernel support |
| Insulation thickness/density | ACTIVE_CONSUMED | target-level effective ledger |
| Cladding/tracing ancillary mass | OPEN | no active mass primitive |
| Component explicit point mass | ACTIVE_CONSUMED | target-level effective ledger |
| Component mass composition | ACTIVE_BOUNDED | explicit point mode implemented; other closed modes rejected |
| Dry-mass double-count protection | ACTIVE_CONSUMED | PIPE conflict + duplicate physical entity rejected |
| Component-contained fluid | OPEN | no active non-pipe contents primitive |
| Component CoG | ACTIVE_CONSUMED | V3 qualified CoG; V2 logged midpoint only when CoG missing |
| Route topology / chainage | ACTIVE_CONSUMED | exact topology + configured tolerances |
| Exact support capability | ACTIVE_CONSUMED | exact support-kind rule |
| `supportTypeCapabilities.DEFAULT` | ACTIVE_CONSUMED | named unknown kind only; explicit resolution receipt |
| Missing support identity | ACTIVE_BOUNDED | cannot consume DEFAULT; unresolved/non-bearing |
| REST/GUIDE/LINESTOP vertical semantics | ACTIVE_CONSUMED | vertical capability only; line stop does not imply vertical bearing |
| Active EMPTY/OPE/HYD cases | ACTIVE_CONSUMED | Project/Product governed |
| Gravity AUTO V2/V3 | ACTIVE_CONSUMED | deterministic selection/fallback |
| Beam/contact/restraint networks | SEPARATE_FAMILY | no authority gained by this stack |
| Verify & Run raw-field presentation | OPEN_UI | current UI still counts raw source/master fields; must reconcile with effective ledger eligibility |

## 5. Implementation / validation matrix

| Item | State | Evidence |
|---|---|---|
| Product defaults / legacy Phase-2 upgrade | IMPLEMENTED_ACTIVE | `node scripts/non-fea-product-default-profile-check.mjs` PASS (GE-012) |
| Effective-value ledger / V1-V2 projection | IMPLEMENTED_ACTIVE | `authorized-empirical-effective-value-ledger-check.mjs`, `authorized-empirical-v2-effective-execution-check.mjs` PASS after fixture/validator fixes (GE-012) |
| Kernel readiness / source-basis gate | IMPLEMENTED_ACTIVE | `authorized-empirical-ledger-readiness-check.mjs`, `authorized-empirical-source-axis-binding-check.mjs` PASS (GE-012) |
| Fluid fill/mass composition | IMPLEMENTED_ACTIVE | `non-fea-fluid-fill-policy-check.mjs`, `authorized-empirical-fluid-mass-composition-check.mjs` PASS (GE-012) |
| Component dry-mass composition | IMPLEMENTED_ACTIVE | `authorized-empirical-component-mass-composition-check.mjs` PASS (GE-012) |
| Support DEFAULT capability consumption | IMPLEMENTED_ACTIVE | `authorized-empirical-support-capability-default-check.mjs` PASS (GE-012) |
| Gravity output/sign convention authority | IMPLEMENTED_ACTIVE | `authorized-empirical-gravity-convention-binding-check.mjs` PASS (GE-012) |
| 18 kN mechanics | IMPLEMENTED_ACTIVE | `support-load-static-accounting-check.mjs`, `support-load-partial-distribution-check.mjs` PASS (GE-012) |
| Partial-result UI | IMPLEMENTED_ACTIVE | `load-calc-result-presentation-check.mjs` PASS (GE-012) |
| Authority-receipt result UI | NOT_IMPLEMENTED | attempted patch reverted after collateral deletion detection (GE-011); still not re-attempted |
| Verify UI effective-readiness reconciliation | IMPLEMENTED_ACTIVE | `renderVerifyPane` now reads `authState.calculationEligible`; local reasoning verified, no browser/e2e run (GE-012) |
| 1885S real sjson + master-data end-to-end | IMPLEMENTED_ACTIVE | `scripts/1885s-empirical-qualification.mjs` PASS against real `benchmarks/Sjson.json` + repo-owned master data (GE-012) |
| `node scripts/run-non-fea-checks.mjs` | 48/50 PASS | 2 blocked on a never-committed external CAESAR-II fixture unrelated to #1321 (GE-012) |
| `npm run build` (`vite build`) | PASS | post-build `bundle-chunk-check.mjs` fails on a pre-existing, unrelated main-chunk size budget overage (GE-012) |
| Browser/e2e (Playwright) qualification | NOT_RUN | still genuinely not executed this session |
| Full Issue #1321 acceptance | OPEN | ancillary/component-contained mass primitives, native zero-fluid, and arbitrary gravity vector/X-Y-up/non-mm remain unimplemented |

## 6. Falsifiers registered

- 18 kN force/first-moment benchmark and dropped-load failure;
- route-local equal/opposite residual anti-cancellation;
- target-selector collision and stale hash guards;
- six-map ledger/input/projection identity tamper;
- exact-only topology defaults and Product unknown support non-bearing behavior;
- source Z/mm accepted; X/Y/non-mm rejected;
- partial fill changes bulk density/projection hash while raw density authority stays stable;
- EMPTY cannot be made wet by generic legacy fill DEFAULT;
- component mass unsupported modes, duplicate physical claims and PIPE point-mass conflict;
- support exact rule shadows DEFAULT;
- named unknown support consumes Product/Project DEFAULT visibly;
- missing support identity cannot consume DEFAULT;
- kernel integration fixture: Product DEFAULT false leaves force unallocated; Project DEFAULT true creates the qualified reaction after execution-local expansion;
- four gravity convention Product defaults accepted;
- unsupported force/moment/analysis/sign tokens rejected;
- kernel force-convention and moment-reference mismatch rejected;
- manual effective-support fixture now includes convention authority and source guard checks that support/default + convention bindings remain invoked.

## 7. Validation ledger

### PASS — independent/local only

**VAL-001 — 18 kN analytical reproduction**: source 18 kN; reactions 15 kN; unallocated 3 kN; transfer 6 kN·m; unallocated first moment 15 kN·m; force/moment residual 0.

**VAL-002 — completeness-aware presentation reproduction**: CALCULATED/CALCULATED_WITH_EXCEPTIONS publish current Loads; FAILED/BLOCKED do not.

### PASS — source/diff inspection only

- support DEFAULT binding is execution-local and exact-rule-first;
- missing support identity is non-bearing even when DEFAULT exists;
- authorized wrapper invokes support binding before legacy statics;
- convention authority is checked before and after statics;
- Product profile v4 contains all four convention defaults;
- accidental UI truncation was detected in commit diff and reverted to exact prior blob.

### PASS — actually executed under Node this session (GE-012)

- `node scripts/run-non-fea-checks.mjs`: 48/50 checks PASS (see §0 above for the fixes each blocker required and their evidence).
- `node scripts/1885s-empirical-qualification.mjs`: real end-to-end run against `benchmarks/Sjson.json` (279 nodes) and real repo-owned master data; PASS; evidence written to `public/qualification/1885s-webgl-load-benchmark.{json,md}` and `reports/qualification/...`.
- `node scripts/benchmark-a-1885-enriched-sjson-check.mjs`: PASS.
- `npx vite build`: PASS (browser bundle builds correctly, including the `bundled-master-data.js` dual-environment fix).
- `npx eslint` on every file this session touched: zero findings.

### FAILED / BLOCKED — genuinely observed, not fabricated around

- `scripts/empirical-restraint-network-check.mjs`, `scripts/empirical-coupled-restraint-network-check.mjs`: need `benchmarks/LFEA/BM2/Input_BM2.xml`, a CAESAR-II benchmark model that has never been committed to this repository (`git log --all` returns nothing for that path) and belongs to the beam/contact/restraint-network family this PR's own body marks `SEPARATE_FAMILY`. Not fabricated; needs a real source.
- `scripts/bundle-chunk-check.mjs` (via `npm run build`): pre-existing `main-*.js` bundle-size budget overage (1,547,097 vs. 1,179,648-byte cap), confirmed unrelated to this session's diff (same exact byte size before and after this session's edits).

### NOT_RUN / NOT_OBSERVED

- browser/e2e (Playwright);
- relevant exact-head Load Calc CI.

EMP.1-only workflow results remain NOT_APPLICABLE to Issue #1321 qualification.

## 8. Changed-file ledger

GitHub changed-file count at source basis `1f07cdb...`: **67**. Ledger count: **67**. Unexplained: **0**.

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
12. `scripts/authorized-empirical-gravity-convention-binding-check.mjs`
13. `scripts/authorized-empirical-ledger-readiness-check.mjs`
14. `scripts/authorized-empirical-product-default-convergence-check.mjs`
15. `scripts/authorized-empirical-source-axis-binding-check.mjs`
16. `scripts/authorized-empirical-support-capability-default-check.mjs`
17. `scripts/authorized-empirical-v2-effective-execution-check.mjs`
18. `scripts/empirical-authorized-blocked-cases-check.mjs`
19. `scripts/empirical-gravity-method-selection-check.mjs`
20. `scripts/load-calc-result-presentation-check.mjs`
21. `scripts/non-fea-common-enriched-configured-default-overlay-check.mjs`
22. `scripts/non-fea-common-enriched-effective-default-authoring-check.mjs`
23. `scripts/non-fea-common-enriched-effective-default-composition-check.mjs`
24. `scripts/non-fea-configured-default-scope-priority-check.mjs`
25. `scripts/non-fea-effective-value-resolver-check.mjs`
26. `scripts/non-fea-fluid-fill-policy-check.mjs`
27. `scripts/non-fea-gravity-product-default-bootstrap-check.mjs`
28. `scripts/non-fea-product-default-profile-check.mjs`
29. `scripts/non-fea-product-engineering-default-profile-check.mjs`
30. `scripts/run-non-fea-checks.mjs`
31. `scripts/support-load-partial-distribution-check.mjs`
32. `scripts/support-load-route-equilibrium-check.mjs`
33. `scripts/support-load-static-accounting-check.mjs`
34. `src/core/common-enriched-properties/field.js`
35. `src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js`
36. `src/workspace/engineering-loads/authorized-empirical-effective-support-load-execution.js`
37. `src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js`
38. `src/workspace/engineering-loads/authorized-empirical-gravity-convention-binding.js`
39. `src/workspace/engineering-loads/authorized-empirical-load-execution-v2.js`
40. `src/workspace/engineering-loads/authorized-empirical-load-execution.js`
41. `src/workspace/engineering-loads/authorized-empirical-load-input.js`
42. `src/workspace/engineering-loads/authorized-empirical-source-axis-binding.js`
43. `src/workspace/engineering-loads/authorized-empirical-support-capability-binding.js`
44. `src/workspace/engineering-loads/empirical-gravity-method-selection.js`
45. `src/workspace/engineering-loads/engineering-support-load-store.js`
46. `src/workspace/engineering-loads/support-load-distribution-v3.js`
47. `src/workspace/engineering-loads/support-load-static-accounting.js`
48. `src/workspace/engineering-model-store.js`
49. `src/workspace/enrichment/authorized-enrichment-consumer-controller.js`
50. `src/workspace/enrichment/non-fea-common-enriched-effective-default-authoring.js`
51. `src/workspace/load-calc-consumer-controller.js`
52. `src/workspace/load-calc-consumer-view.js`
53. `src/workspace/load-calc-result-presentation.js`
54. `src/workspace/non-fea-common-input-runtime.js`
55. `src/workspace/project-data/non-fea-common-enriched-configured-default-overlay.js`
56. `src/workspace/project-data/non-fea-common-enriched-product-default-overlay.js`
57. `src/workspace/project-data/non-fea-component-mass-policy.js`
58. `src/workspace/project-data/non-fea-configured-default-provider.js`
59. `src/workspace/project-data/non-fea-effective-value-resolver.js`
60. `src/workspace/project-data/non-fea-field-registry.js`
61. `src/workspace/project-data/non-fea-fluid-fill-policy.js`
62. `src/workspace/project-data/non-fea-product-default-profile.js`
63. `src/workspace/project-data/non-fea-product-engineering-default-profile.js`
64. `src/workspace/project-data/project-data-contract.js`
65. `src/workspace/project-data/project-data-fields.js`
66. `src/workspace/routes/route-partition-model.js`
67. `src/workspace/support-sites/support-site-model.js`

No `.github/workflows/*` path is changed.

### GE-012 session file ledger (in addition to the 67 above)

9 files, all outside `.github/workflows/*`:

1. `src/workspace/load-calc-consumer-controller.js` — Verify & Run ledger-readiness reconciliation.
2. `src/workspace/project-data/project-data-contract.js` — `insulationCode: null` recognition; empty-sparse-map allowance for `insulationDensitiesKgPerM3`/`componentWeightsKg`.
3. `src/workspace/engineering-loads/support-load-distribution-v3.js` — distinct `BLOCKED` vs `FAILED` case/distribution status.
4. `src/workspace/enrichment/non-fea-common-enriched-effective-default-authoring.js` — export-name fix.
5. `src/master-data/bundled-master-data.js` — dual Node/Vite-safe `PCF_MAT_MAP.txt` loading.
6. `scripts/non-fea-project-data-authority-check.mjs` — fixture-drift assertion fix.
7. `scripts/authorized-empirical-effective-value-ledger-check.mjs` — fixture revision fix.
8. `scripts/non-fea-common-enriched-effective-default-authoring-check.mjs` — export-name fix.
9. `public/qualification/1885s-webgl-load-benchmark.{json,md}` and `reports/qualification/1885s-webgl-load-benchmark.{json,md}` — regenerated evidence from an actual `scripts/1885s-empirical-qualification.mjs` run, not hand-edited.

## 9. Repository / review ground truth

- PR #1323: OPEN, DRAFT, mergeable at GE-011 grounding; GE-012 rebuilt the branch by merging its actual head (`agent/issue-1321-load-calc-effective-values` @ `940ff897d723d273a3855b9798f684522593d325`) into the designated session branch `claude/pr-1323-project-data-wu1zx0`, which had been created from a slightly newer `main`.
- Production source basis: `1f07cdbd3e3646ec5ba3e8e7bdcbc9883e8e6899`; GE-012 fixes land on top of `940ff897d723d273a3855b9798f684522593d325`.
- Base/main at GE-012: `1d08bcd0fdebc86fc2daaeb752f129b877e01c74` (one commit past the GE-011 `a222e18` base; disjoint EMP1/WRC content, merged with no conflicts).
- Changed files: 67 (GE-011) + 9 (GE-012, see above).
- PR discussion: no comments/reviews observed at GE-011; not re-checked at GE-012.
- Merge authorization: requested explicitly by the repository owner for this session ("fix everything and merge"); left for the human owner to execute via the actual PR UI once the branch topology mismatch below is resolved, since this session pushed to `claude/pr-1323-project-data-wu1zx0`, not `agent/issue-1321-load-calc-effective-values`.
- No workflow files modified.

## 10. Continuation order

1. ~~Reconcile Verify & Run UI with effective/default readiness.~~ DONE at GE-012.
2. Add safe presentation of support/convention authority receipts only with a minimal patch or dedicated view helper; do not repeat the reverted large-file replacement.
3. Design cladding/tracing permanent distributed mass and component-contained fluid as explicit primitives with dry/content double-count controls.
4. Add native non-empty zero-fill support rather than epsilon density if the method is to accept dry OPE/HYD variants.
5. Arbitrary gravity vector/X/Y-up/non-mm transformations remain blocked until real engineering transforms exist.
6. Source or regenerate `benchmarks/LFEA/BM2/Input_BM2.xml` (unrelated CAESAR-II restraint-network benchmark) to unblock the last 2/50 non-FEA checks.
7. Address the pre-existing main-chunk bundle-size budget overage if in scope, or explicitly rebaseline the budget.
8. Browser/e2e (Playwright) qualification remains NOT_RUN until actually executed.

# Appendix A — Next-agent qualification questionnaire

1. What is the Product support fallback?
   - `DEFAULT.vertical=false`; it cannot invent vertical capacity.
2. Can a Project DEFAULT grant vertical capability?
   - Yes for a **named unknown support kind**, visibly and hash-bound. Exact kind rules still win.
3. Can a missing support-type identity use DEFAULT?
   - No. It remains unresolved/non-bearing because the kernel has no selector to expand.
4. What four gravity convention values are implemented?
   - `POSITIVE_REACTION_OPPOSES_SOURCE_AXIS_GRAVITY`, `SIGNED_ROUTE_CHAINAGE_FIRST_MOMENT_NMM`, `ROUTE_CHAINAGE_1D_STATIC_GRAVITY`, `SOURCE_Z_UP_POSITIVE_SUPPORT_REACTION`.
5. Are alternate conventions transformed?
   - No. They fail before statics until real mechanics exist.
6. How is the convention contract checked against the legacy kernel?
   - Post-statics force convention must remain `positive reaction opposes source-axis gravity`; route equilibrium moment reference must remain `PER_ROUTE_CHAINAGE_ORIGIN_WITH_AGGREGATE_DIAGNOSTIC`.
7. What gravity source basis is implemented?
   - Source Z-up, mm, scalar vertical gravity only.
8. What happened to the authority-receipt UI patch?
   - A broad replacement truncated existing guided-workflow helpers; diff inspection caught it and a normal forward revert restored the exact pre-edit blob. No net UI truncation remains.
9. What validation may be called PASS?
   - Independent 18 kN arithmetic, local pure presentation reproduction and explicit source/diff inspection only. Exact repository scripts/build/browser/Load Calc CI remain NOT_RUN/NOT_OBSERVED.
