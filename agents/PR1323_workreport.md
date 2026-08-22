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

PR_HEAD_OBSERVED: b90adda0f275636426293ad4a30a6346a57373c0
REPORT_BASIS_HEAD: b90adda0f275636426293ad4a30a6346a57373c0
MAIN_HEAD_LAST_CHECKED: a222e18c38bd20fb55c1c6c95f724f40e40e8532
MERGE_BASE: a222e18c38bd20fb55c1c6c95f724f40e40e8532
GROUNDING_EPOCH: GE-008

CURRENT_STAGE: STACK_7_ZERO_ROUTINE_BLOCKER_GRAVITY_BOOTSTRAP_AND_LEDGER_READINESS_SOURCE_INTEGRATED
CURRENT_BLOCKER: EXACT_HEAD_LOAD_CALC_NODE_BROWSER_QUALIFICATION_NOT_OBSERVED; FULL_ISSUE1321_CONFIGURABLE_FAMILY_ACCEPTANCE_REMAINS_OPEN
HIGHEST_RISK: wider Issue #1321 method/scenario/contact/mass-composition families are not yet fully audited for active consumption; V3-V8 remain independent Package-5 execution authorities outside the active V1/V2 chain.
EXACT_NEXT_ACTION: audit the remaining Issue #1321 configurable families against active consumers, beginning gravity vector/sign/output conventions and mass/fill composition; implement only settings that are consumed, and keep unsupported mechanics explicit rather than inventing authority.
```

PR #1323 remains the **single draft carrier**. Do not create a second PR. Do not merge without explicit owner authorization.

## 2. Current source-integrated state

1. Product/default authority is explicit and hash-bound. `LOAD_CALC_STANDARD_DEFAULTS_V1` fills only empty Project Data evidence fields; populated evidence shadows Product defaults.
2. Conservative topology Product defaults now remove routine empty-profile blockers without inventing connectivity:
   - port match tolerance = `0 mm`;
   - support-site grouping tolerance = `0 mm`;
   - AUTO-carrier coincidence tolerance = `0 mm`;
   - route partition = branch-scoped connected components using exact port topology; source order forbidden; degree >2 remains blocked;
   - unknown support capability = `{ vertical: false }`, therefore no invented support reaction.
3. Numerical equilibrium Product default is `forceN = 1e-6 N`, `momentNmm = 1e-3 N·mm`. This is floating-point closure tolerance, not an engineering allowable.
4. `buildSupportSiteModel()` and `buildRoutePartitionModel()` compose the same Product-default profile internally before reading topology policy. Empty stored Project Data therefore does not block exact-only derived topology.
5. Gravity field ownership is reconciled: topology tolerances/rules/equilibrium admit `PRODUCT_DEFAULT`; `SUPPORT_TYPE_CAPABILITIES` is explicitly consumed by `WEIGHT_AND_GRAVITY` as well as restraint/contact methods.
6. Effective-value precedence remains:
   `ACCEPTED_OVERRIDE → SOURCE_EXPLICIT → SOURCE_INHERITED → EXACT_APPROVED_MASTER → CONFIGURED_DERIVATION → PROJECT_POLICY(field-owned) → PROJECT_CONFIGURED_DEFAULT → PRODUCT_DEFAULT`.
7. Newly compiled V1/V2 authorized gravity input retains target-level effective-value provenance. Ledger-bearing execution rebuilds exact target maps and forbids legacy `DEFAULT` selector fallback.
8. Ledger-bearing V1/V2 package readiness and execution both use `authorizedGravityLoads`, so already-authorized exact load maps no longer re-demand line-list, piping-class or component-weight source sheets. Historical ledger-less execution still uses legacy `loads` validation.
9. Product-default changes are checked against live common-input authority before authorization/Run; the production consumer no longer relies on a snapshot-only `requireReadyMethods` provider.
10. Active ledger-bearing source-axis publication is rebound from governed `sourcesAndUnits.sourceUpAxis`; invalid/unapproved axis authority fails before authorized result publication.
11. Support mechanics retain bracketed, overhang and unsupported load custody, including signed `F·a`, explicit unallocated force/first moment, and route-local equilibrium.
12. `CALCULATED_WITH_EXCEPTIONS` is a current result in the Load Calc UI; coverage, unallocated force/moment and transfer-moment demand remain visible.
13. V3-V8 are classified, not silently migrated: they are parallel Package-5 sealed-enrichment execution contracts with direct gravity-kernel calls and are not accepted by the active V1/V2 runtime stores.

## 3. Governing engineering invariants

```text
F_evaluated(route) = F_reaction(route) + F_unallocated(route)
M_evaluated(route) = M_reaction(route) + M_boundary_transfer(route) + M_unallocated(route)
```

- no known load disappears;
- proximity never creates a structural load path;
- zero qualified support means zero invented reaction;
- unknown support type is non-bearing unless governed evidence says otherwise;
- exact-only topology Product defaults cannot merge near-but-distinct geometry;
- overhang `F*a` is boundary/member-transfer demand, not a fabricated REST moment reaction;
- defaults may replace routine missing evidence only; ambiguity/conflict/stale evidence remains fail-closed;
- Product configured policy never masquerades as source/master evidence;
- Project configured default outranks Product default;
- same-authority unequal candidates fail closed;
- target-level values cannot collapse back to catalog/material selector authority;
- ledger-bearing execution cannot re-enter raw Project Data `DEFAULT` fallback authority;
- ledger-bearing readiness cannot re-demand obsolete master-source sheets after exact target authorization;
- legacy execution contracts retain legacy validation until explicitly migrated;
- engineering tolerances are not weakened to make a failed equilibrium pass.

## 4. Implementation / validation matrix

| Item | State | Evidence |
|---|---|---|
| Product Project Data defaults | IMPLEMENTED_SOURCE | hash/provenance contract; exact repo execution NOT_RUN |
| Conservative topology bootstrap defaults | IMPLEMENTED_SOURCE | builders consume effective profile; falsifier registered; NOT_RUN |
| Equilibrium closure default | IMPLEMENTED_SOURCE | Product policy `1e-6 N / 1e-3 N·mm`; NOT_RUN |
| Gravity registry ownership reconciliation | IMPLEMENTED_SOURCE | source diff inspected; NOT_RUN |
| Effective-value target ledger | IMPLEMENTED_SOURCE | source inspected; NOT_RUN |
| V1/V2 ledger-only execution projection | IMPLEMENTED_SOURCE | guard + selector-collision falsifiers registered; NOT_RUN |
| Ledger-aware pre-execution readiness | IMPLEMENTED_SOURCE | V1/V2 ledger path uses `authorizedGravityLoads`; falsifier registered; NOT_RUN |
| Product-default authorization staleness | IMPLEMENTED_SOURCE | live common-input re-evaluation restored; falsifier registered; NOT_RUN |
| Source/up-axis binding | IMPLEMENTED_SOURCE_ACTIVE_PATH | governed binding + falsifier; NOT_RUN |
| 18 kN partial mechanics | IMPLEMENTED_SOURCE | independent analytical reproduction PASS; exact repo script NOT_RUN |
| Route-local anti-cancellation | IMPLEMENTED_SOURCE | source inspected; exact repo script NOT_RUN |
| Partial-result UI | IMPLEMENTED_SOURCE | local pure classifier reproduction PASS; browser NOT_RUN |
| V3-V8 boundary | CLASSIFIED_NO_SILENT_MIGRATION | source inspection; exact guard NOT_RUN |
| Common-enriched Product engineering defaults | IMPLEMENTED_CONTRACT | shipped entity table empty by design; no invented OD/wall/mass |
| Production common-enriched candidate-authoring caller | OPEN_BOUNDARY | no existing caller found |
| Full Issue #1321 configurable-family acceptance | OPEN | further consumer-by-consumer audit required |

## 5. Engineering register

| ID | Severity | Status | Summary |
|---|---:|---|---|
| ISS-001 | HIGH | RESOLVED_ACTIVE_PATH | V1/V2 ledger gravity cannot regain raw Project Data selector authority |
| ISS-002 | HIGH | RESOLVED_SOURCE | bracketed/overhang/unsupported force and moment custody |
| ISS-003 | HIGH | RESOLVED_SOURCE | route-local closure prevents cross-route cancellation |
| ISS-004 | HIGH | RESOLVED_SOURCE | effective precedence + first-class PRODUCT_DEFAULT |
| ISS-005 | HIGH | CLASSIFIED | V3-V8 are independent Package-5 authorities outside active stores |
| ISS-006 | MEDIUM | RESOLVED_SOURCE | `CALCULATED_WITH_EXCEPTIONS` no longer presented as blocked |
| ISS-007 | HIGH | OPEN_BOUNDARY | no existing production common-enriched candidate-authoring caller |
| ISS-008 | MEDIUM | RESOLVED_ACTIVE_PATH | governed source-axis rebinding for V1/V2 |
| ISS-009 | HIGH | RESOLVED_SOURCE | configured-default scope precedence corrected |
| ISS-010 | HIGH | RESOLVED_SOURCE | empty Project Data no longer blocks exact-only support/route topology |
| ISS-011 | HIGH | RESOLVED_ACTIVE_PATH | ledger-authorized readiness no longer re-demands absent master-source sheets |
| ISS-012 | HIGH | OPEN | remaining Issue #1321 configurable families require active-consumer audit |
| RISK-001 | CRITICAL | MITIGATED_SOURCE | no-support/unknown-support cannot create reaction authority |
| RISK-002 | HIGH | MITIGATED_ACTIVE_PATH | target selector collisions isolated |
| RISK-003 | HIGH | CONTAINED | V3-V8/direct legacy authority remains separate |
| RISK-004 | HIGH | MITIGATED_SOURCE | defaults cannot mask ambiguity/conflict/staleness |
| RISK-005 | HIGH | OPEN | exact Load Calc runtime/browser qualification not observed |

## 6. Falsifiers registered

- 18 kN: 12 kN bracketed → 7.2/4.8 kN; 3 kN overhang → 3 kN + 6 kN·m transfer; 3 kN unsupported → 3 kN unallocated + 15 kN·m first moment; residuals zero.
- dropping unsupported 3 kN must fail force and first-moment custody.
- equal/opposite route moment residuals with aggregate zero must fail route-local closure.
- same selector with distinct target values must remain distinct.
- ledger execution must reject any six-map `DEFAULT` selector or stale projection/profile/dataset hash.
- invalid/unapproved X/Y/Z up-axis authority must fail publication.
- Product-default change must change Product/effective hashes and be re-evaluated before authorization/Run.
- empty Project Data must build exact-only route/support topology using 0 mm tolerances.
- two supports separated by 0.1 mm must remain two physical sites under the 0 mm Product default.
- unknown support capability Product default must remain `vertical:false`.
- ledger `authorizedGravityLoads` must accept authorized load maps without line-list/piping-class/component-weight source sheets; legacy `loads` must still reject that same missing-source condition.

## 7. Validation ledger

### PASS — independent/local analytical

**VAL-001 — 18 kN analytical reproduction**
- source = 18 kN;
- reactions = 15 kN;
- unallocated = 3 kN;
- boundary transfer = 6 kN·m;
- unallocated first moment = 15 kN·m;
- force residual = 0;
- moment residual = 0.

Limitation: independent arithmetic reproduction, not exact repository Node execution.

### PASS — local presentation reproduction

**VAL-002 — Load Calc result classifier**
- `CALCULATED` and `CALCULATED_WITH_EXCEPTIONS` open current Loads output;
- FAILED/BLOCKED/unknown/missing do not.

Limitation: pure local reproduction; exact browser/controller path NOT_RUN.

### PASS — source inspection

- registry diff contains only intended authority/method ownership changes;
- `engineering-model-store.js` diff contains only conditional `authorizedGravityLoads` vs legacy `loads` selection;
- V1/V2 execution uses the same ledger-aware workflow when an effective ledger exists;
- topology builders compose Product defaults internally;
- active runtime stores remain V1/V2 only.

### NOT_RUN / NOT_OBSERVED

- all exact repository Node scripts added/updated by this PR;
- `node scripts/run-non-fea-checks.mjs`;
- build;
- browser/e2e;
- exact-head Load Calc CI.

At exact production head `b90adda0...`, three GitHub Actions runs were observed, all EMP.1-specific and all failed. They are **NOT_APPLICABLE** to Issue #1321 Load Calc qualification and are not counted as PASS/FAIL evidence for this workstream.

## 8. Changed-file ledger

GitHub changed-file count at production basis `b90adda0...`: **57**. Ledger count: **57**. Unexplained: **0**.

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
55. `src/workspace/project-data/project-data-fields.js`
56. `src/workspace/routes/route-partition-model.js`
57. `src/workspace/support-sites/support-site-model.js`

No `.github/workflows/*` file is changed.

## 9. Repository/review ground truth

- PR #1323: OPEN, DRAFT, mergeable at GE-008 grounding.
- Production basis: `b90adda0f275636426293ad4a30a6346a57373c0`.
- Base/main: `a222e18c38bd20fb55c1c6c95f724f40e40e8532`; no base drift observed.
- Review timeline: no issue comments, inline review comments, or submitted reviews observed.
- Merge authorization: **NOT GRANTED**.
- Workflow modification authorization: **NOT GRANTED / NOT REQUIRED**; no workflow file changed.

## 10. Continuation order

1. Build an Issue #1321 acceptance matrix that marks each requested field/policy as `ACTIVE_CONSUMED`, `CONTRACT_ONLY`, `NOT_IMPLEMENTED`, or `NOT_APPLICABLE_TO_ACTIVE_METHOD`.
2. Next active gravity slice: gravity vector direction, force/moment/sign conventions, and mass/fill composition policy. Do not add unused UI settings.
3. Then audit support/contact and scenario policy families against Beam/Contact and restraint-network active consumers.
4. Keep V3-V8 quarantined from V1/V2 authority unless an explicit migration contract is designed and falsified.
5. Execute exact focused/aggregate/browser qualification when an exact Load Calc execution channel is available; until then retain `NOT_RUN / NOT_OBSERVED`.

# Appendix A — Next-agent qualification questionnaire

A takeover agent must answer these from current source before production writes:

1. **Why does ledger-bearing package readiness use `authorizedGravityLoads` while legacy receipts use `loads`?**
   - Required answer: exact target-level load values are already authorized by the effective ledger, so source-sheet presence must not be re-demanded; legacy receipts lack that ledger and retain historical source validation.
2. **Why are topology Product tolerances exactly 0 mm?**
   - Required answer: 0 mm removes missing-configuration blockers while preserving exact topology; it cannot invent approximate connectivity or merge distinct support coordinates.
3. **What does unknown support capability mean?**
   - Required answer: `DEFAULT.vertical=false`; unknown support cannot receive an invented vertical reaction, so known load remains unallocated/exception evidence as necessary.
4. **What are the equilibrium Product defaults and what are they not?**
   - Required answer: `1e-6 N` and `1e-3 N·mm`; numerical closure tolerances only, not code allowables or acceptance limits.
5. **Can V3-V8 be changed to inherit V2 because the names are sequential?**
   - Required answer: no. They are separate Package-5 sealed-enrichment authority contracts with direct solver calls and are outside the active V1/V2 runtime-store chain.
6. **What validation may be called PASS now?**
   - Required answer: only the independent 18 kN arithmetic reproduction, local pure presentation reproduction, and explicit source inspections stated above. Exact repository Node/browser/Load Calc CI remains NOT_RUN/NOT_OBSERVED.
