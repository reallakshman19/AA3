# PR1306 Work Report — EMP1-05 fail-closed visible A→B→C workspace transaction

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `TAKEOVER_AUTHORITY: WRITE_ALLOWED`
- `WORK_INTENT: IMPLEMENT`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `ISSUE: #1261`
- `PR: #1306`
- `PR_STATE: DRAFT_UNMERGED`
- `BRANCH: agent/emp1-05-visible-abc-workspace-20260821`
- `BASE_MAIN: 564b67a478dd660fbf39e780f289f4739c0e7261`
- `BASE_MAIN_AUTHORITY_PR: #1307`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_SUCCESSOR`
- `CURRENT_STAGE: FAIL_CLOSED_WORKSPACE_TRANSACTION_IMPLEMENTED_AWAITING_EXACT_HEAD_QUALIFICATION`
- `CURRENT_BLOCKER: VALIDATION_NOT_YET_OBSERVED_ON_FINAL_HEAD`
- `GLOBAL_EMP1_C_ROUTE_REGISTERED: false`
- `GAMMA5_PRODUCTION_ROUTE_AUTHORIZED: false`
- `WORKSPACE_C_TRANSACTION_WIRED: true`
- `WORKSPACE_C_PRODUCTION_EXECUTION_WIRED: false`
- `RELEASE_QUALIFIED: false`

## Mission

Provide one engineer-facing EMP.1 transaction across retained A/B mechanics and governed C preparation without weakening the production containment introduced by PR #1307.

The workspace may execute EMP.1.A and EMP.1.B, derive source-bound C custody from their retained evidence, retain current/stale transaction evidence, and explain precisely why C is blocked. It must not call the WRC537 gamma=5 production route or present an eight-location WRC stress result while the cylindrical load-axis/sign authority remains unresolved.

## Superseding ground truth

The original #1306 design started from `main@8fe449d1...`, where the bounded gamma=5 route was treated as production-authorized. While #1306 was in progress, PR #1307 was merged to `main@564b67a478dd660fbf39e780f289f4739c0e7261` and superseded that assumption.

PR #1307 established:

- `EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED=false`;
- registry `registered=false`;
- registry `engineeringUseAuthorized=false`;
- `comparisonQualificationAvailable=true`;
- suspension reason `WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED`;
- production execution throws `EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENDED`;
- global/full-domain EMP.1.C remains false;
- code-compliance authority remains false;
- release qualification remains false.

The unresolved source directions are `V_C`, `V_L`, `M_C`, `M_L`, and `M_t`. This PR does not guess or infer them.

## Implemented workspace seam

### 1. Lightweight run-input/currentness state

`src/workspace/emp1-workbench-run-state.js` owns a UI-independent contract for:

- selected retained load-case identity;
- selected pressure-result identity;
- source-referenced attachment geometry identity/diameter/unit;
- semantic input hashes;
- current/stale classification;
- change-class reconciliation.

Caller-authored WRC `Rm`, `T`, `r0`, gamma, beta, reference coordinates, axes, `Kn`, and `Kb` are not accepted in the route request.

### 2. Product-owned transaction

`src/workspace/emp1-workbench-product-run.js` executes through existing qualified engines/orchestration:

1. run/retain EMP.1.A;
2. refresh B source evidence from the actual A execution;
3. run/retain EMP.1.B;
4. derive source-bound attachment/WRC custody;
5. prepare the governed C source;
6. inspect current production-route authority;
7. while #1307 is authoritative, return a machine-readable blocked C preparation artifact **without invoking production C**.

The blocked artifact retains a distinct semantic hash and prepared source custody, but contains no WRC production stress field.

### 3. Currentness/invalidation

- A document drift invalidates A/B/C transaction evidence.
- B document drift invalidates B/C evidence.
- Attachment geometry is treated as B→C geometry-evidence input; changing it invalidates the retained B geometry-evidence layer and C preparation.
- Load/pressure identity changes invalidate the local-method layer.
- Historical transaction evidence can remain visible as stale, but cannot be rendered as current calculation evidence.

### 4. Controller ownership

`LafeaWorkbenchController` owns:

- normalized EMP.1 run input;
- retained EMP.1 transaction;
- last run failure;
- run serial/concurrency protection.

The heavy product executor remains dynamically imported only when the engineer requests the EMP.1 preparation transaction, avoiding a new static WRC dependency in normal workbench startup.

### 5. Visible product truth

The analytical workspace now exposes:

- C source-binding controls;
- transaction currentness;
- A result hash;
- B retained-evidence hash;
- blocked/prepared-C evidence hash;
- A/B/preparation/production-C invocation counts;
- explicit C production suspension reason;
- global-C/code/release authority states.

The C step itself remains visibly `BLOCKED` and disabled. The preparation controls remain available within the A/B analytical surface.

`renderEmp1CorrelationResultEvidence()` is supplied only when `boundedLocalRouteExecuted===true`; therefore the #1307 suspended transaction cannot appear as a production WRC stress result.

## Authority boundary

### Permitted in this PR

```text
A load/reference mechanics        retained qualified engine
B nominal section screening      retained qualified engine
A→B source refresh               governed existing bridge
C source custody preparation     source-bound, current A/B evidence only
attachment diameter              caller/source referenced, canonical length unit
historical/currentness evidence  retained workspace transaction
```

### Comparison scope retained but NOT production-authorized

```text
shell family            CYLINDRICAL
attachment shape        ROUND
curve variant           ORIGINAL
gamma                   5 exact tabulated comparison point
beta                    0.05 <= beta <= 0.50
differential pressure   0
Kn                      1
Kb                      1
interpolation           false
cross-variant fallback  false
```

### Still false/blocked

- WRC gamma=5 production execution while sign authority is unresolved;
- global/full-domain EMP.1.C;
- non-tabulated gamma;
- nonzero differential pressure / pressure-thrust route;
- non-unity Kn/Kb;
- WRC297;
- code-compliance PASS semantics;
- release qualification.

## Primary falsifiers

1. `EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED` must remain false.
2. Product transaction with valid gamma=5 geometry must invoke A=1, B=1, C-preparation=1, production-C=0.
3. C must retain `BLOCKED` plus `WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED`.
4. No `stresses` production field may be emitted by the blocked C workspace artifact.
5. Caller-authored WRC geometry in the route request must be rejected.
6. Non-canonical attachment units must be rejected.
7. gamma=15 must block before Table-5 production execution.
8. A/B/source-binding hash drift must classify retained transaction as stale.
9. Attachment-diameter change must alter the B→C geometry evidence and C preparation ancestry.
10. UI must not enable the C step or present blocked preparation evidence as a WRC stress result.

## Changed-file ledger relative to current main

| Path | Type | Purpose |
|---|---|---|
| `src/workspace/emp1-workbench-run-state.js` | new | lightweight normalized run-input/currentness contract |
| `src/workspace/emp1-workbench-product-run.js` | new | A/B execution + fail-closed C preparation transaction |
| `src/workspace/emp1-workbench-run-view.js` | new | source binding, currentness, suspension and transaction evidence UI |
| `src/workspace/lafea-workbench-controller.js` | modified | workspace-owned EMP.1 transaction and lazy executor |
| `src/workspace/lafea-workbench-view.js` | modified | transaction projection/tooling and preparation action |
| `src/workspace/lafea-analytical-calc-content.js` | modified | transaction panels; WRC result only after actual production C execution |
| `src/workspace/lafea-guided-workflow-view.js` | modified | visible suspended-C explanation while C remains disabled |
| `src/core/emp1/emp1-public-product-contract.js` | modified | distinguish workspace wiring from production C authorization |
| `scripts/emp1-workbench-product-run-qualification.mjs` | new | transaction/currentness/fail-closed falsifiers |
| `scripts/emp1-public-product-check.mjs` | modified | prove wired workspace cannot override suspended C authority |
| `agents/PR1306_workreport.md` | living handover | current state/evidence |

The #1307 workflow, route, registry, source-guard and PR1307 workreport content was reconciled exactly from current main before the merge-parent commit. Those files are not PR1306 differences relative to current main.

## Main reconciliation

- branch merge-parent commit: `4d51db8530a38983a99011c0b5e988afab37a3a2`;
- second parent: `main@564b67a478dd660fbf39e780f289f4739c0e7261`;
- compare after reconciliation: **0 behind** current main;
- no #1307 production authorization was reverted.

## Validation ledger

| Check | Status | Notes |
|---|---|---|
| current-main grounding | PASS | `main@564b67a478dd...`; #1307 authority re-read |
| main ancestry reconciliation | PASS | compare from `564b67a4...` to merge-parent head: 0 behind |
| #1307 route/registry preservation | PASS | branch files reconciled exactly to current-main suspension state before PR1306-only work |
| source-bound transaction qualification script | NOT_RUN | connector has no local Node execution; no authorized existing workflow currently names the new script |
| public-product exact-head workflow | NOT_RUN | no workflow run observed yet for reconciled head |
| gamma5 suspension exact-head workflow | NOT_RUN | no workflow run observed yet for reconciled head |
| browser/Chromium exact-head | NOT_RUN | existing visible-workbench workflow has not yet produced an observed run for reconciled head |
| production bundle ceiling | NOT_RUN | must not claim prior inherited failure is resolved until exact-head workflow proves it |
| full repository regression | NOT_RUN | not claimed |

## Known validation limitation

The repository's existing workflows cover public-product truth, gamma5 fail-closed authority, build and browser surfaces. The new `scripts/emp1-workbench-product-run-qualification.mjs` is not referenced by an existing authorized workflow. This PR deliberately does not add or broaden workflow policy without separate authorization; therefore that focused script remains `NOT_RUN` unless an existing workflow begins executing it through another suite.

## Historical decision record

The early #1306 implementation attempted to execute the then-authorized bounded gamma=5 route and render eight-location stresses. That design became invalid when #1307 merged. It was not retained as hidden fallback behavior. The successor now prepares C custody and returns a blocked artifact with zero production-C invocations.

## Appendix A — takeover/continuation qualification

1. **Why is a wired C workspace not C production authority?** Workspace wiring owns state, custody and presentation only. Production authority comes from the route registry/method source gate, which #1307 currently sets false.
2. **Which WRC directions block production?** `V_C`, `V_L`, `M_C`, `M_L`, and `M_t` positive directions remain unresolved in the retained source definition.
3. **What may the workspace do while C is suspended?** Execute/retain A and B, derive current source-bound C custody, retain a blocked preparation artifact, and explain the blocker. It may not emit a WRC production stress result.
4. **Why is attachment diameter classified as B→C evidence?** It participates in `geometryEvidence` and therefore in gamma/beta/source-custody ancestry. Reusing an old B geometry-evidence layer after diameter drift would make C custody stale.
5. **What protects against stale results?** Semantic hashes of A document, B document, attachment geometry and local route identity are compared against the retained transaction before it is treated as current.
6. **Why is the C step disabled even though preparation controls exist?** A visible configuration/preparation seam is useful, but the step must not imply executable production C while authority is suspended.
7. **What re-enables WRC stress presentation?** A future, separately qualified route reauthorization after primary-source sign arbitration; only then may `boundedLocalRouteExecuted===true` allow the production C result renderer to receive a stress result.

## Exact next actions

1. Observe exact-head GitHub checks/workflows without altering workflow policy.
2. Inspect any failures and repair PR1306 source only; do not weaken #1307 guards.
3. Refresh this report with exact run IDs/statuses.
4. Keep PR draft/unmerged until required evidence is green and explicit successor merge authority is granted.
