# PR1449 — Governed V2 runtime currentness

## Recovery header

```text
repository              = reallaksh19/Advanced_Analysis
issue                   = #1321
PR                      = #1449
branch                  = agent/issue-1321-governed-v2-currentness
stacked base PR         = #1440
stacked base exact head = 8637638188d5478d01b0001ee9f8cd740bbb2180
predecessor #1446       = squash-merged into #1440 at 8637638188d5478d01b0001ee9f8cd740bbb2180
live main last checked  = 29c688db4a021db900d1f8c67f56f777f73f4ddc
implementation basis    = 993eb265dc92863d38fc715a5c96663eca5b24ce
criticality             = ENGINEERING_CRITICAL
execution mode          = AUTO
merge authority         = OWNER_ONLY / NOT_GRANTED
workflow policy         = owner instructed workflow gating be skipped as continuation blocker
```

## Mission

Bind the governed gravity-selection/runtime-package receipt into the existing opt-in V2 runtime currentness path without cutting production `EngineeringModelStore` over to V2.

```text
governed runtime-package projection
        ↓
configureGoverned()
        ↓
AuthorizedEmpiricalRuntimeStoreV2 retains exact governed receipt
        ↓
refreshGoverned(current bindings, current governed receipt)
        ↓
CURRENT only when both bindings and governed receipt remain current
```

## Implementation

### Runtime store

`authorized-empirical-runtime-store-v2.js` now adds an explicit governed mode:

- `configureGoverned(projection, currentBindings)`;
- `refreshGoverned(currentBindings, currentProjection)`;
- `getGovernedProjection()`.

The existing `configure()/refresh()/requireCurrentPackage()/recordExecution()` bare-V2 path remains supported.

When the store was configured through governed mode, calling legacy `refresh()` without a current governed receipt fails closed by marking the authorization stale with:

`GOVERNED_PROJECTION_CURRENTNESS_REQUIRED`.

This prevents a caller from bypassing governed currentness merely by using the older refresh path.

Changed governed receipt with unchanged bare V2 package/method produces:

`GOVERNED_PROJECTION_CHANGED`.

The configured package is not silently replaced and refresh does not create a new authorization.

### Configured V2 controller

`configured-empirical-method-controller-v2.js` adds:

- `configureGoverned()`;
- `refreshGoverned()`;
- `executeGoverned()`;
- `getGovernedProjection()`.

All reuse the same current dataset/profile/support-site/route/master binding calculation and the same `projectAuthorizedEmpiricalExecutionV2Request()` execution path. No catch-and-retry V3→V2 behavior is added.

A stale governed receipt blocks before `calculateAuthorizedV2()`.

### Profile cross-binding hardening

During currentness audit, predecessor #1446 exposed a real authority gap: a governed method selection could be valid for Project Data profile A while its runtime package was bound to profile B.

`governed-empirical-runtime-package-v2.js` now requires:

```text
governedSelection.gravityMethodAuthority.projectDataSemanticHash
== runtimePackage.bindings.projectDataProfileSemanticHash
```

Mismatch fails with:

`EMPIRICAL_GOVERNED_RUNTIME_PROFILE_BINDING_MISMATCH`.

This means changed effective Product/default/profile identity is already caught by ordinary runtime binding currentness; governed receipt currentness independently protects selector/audit/policy evidence not represented by the bare package.

## Qualification definitions

### Updated predecessor regression

`scripts/governed-empirical-runtime-package-v2-check.mjs`

- now binds the package to the same effective Project Data profile;
- adds a mismatched-profile falsifier;
- replaces the invalid old same-package/different-profile fixture with a valid same-profile/same-method/different-component-audit receipt fixture.

Expected:

```text
bare V2 package hash       = SAME
governed projection hash   = DIFFERENT
```

### New currentness regression

`scripts/governed-empirical-runtime-currentness-v2-check.mjs`

Pins:

- governed V2 configure => `AUTHORIZED_CURRENT`;
- exact current governed receipt remains current;
- same bare V2 package + same method + changed governed selection receipt => `AUTHORIZED_STALE`;
- V2→V3 governed selection => stale;
- missing current governed receipt => stale;
- legacy `refresh()` cannot bypass governed mode;
- legacy `execute()` cannot bypass governed mode;
- ordinary bare-V2 configure/refresh remains current;
- stale controller execution stops before `calculateAuthorizedV2()`.

Registered in `scripts/run-authorized-empirical-load-execution-checks.mjs`.

## Protected boundaries

No change to:

- `src/workspace/engineering-model-store.js`;
- `src/workspace/enrichment/authorized-enrichment-consumer-controller.js`;
- support-load mechanics;
- method-selection fallback policy;
- equilibrium/tolerances;
- solver/benchmark values;
- scenario/UI/release;
- `.github/workflows/**`.

This remains opt-in V2 infrastructure. It is not the ordinary production Run-path cutover.

## Validation truth

Source and exact patch inspection: PASS.

Final source reconciliation at implementation basis `993eb265dc92863d38fc715a5c96663eca5b24ce` showed exactly 9 expected paths, 11 commits ahead and 0 behind the stacked #1440 base. A fresh local checkout attempt then failed before repository materialization with:

`Could not resolve host: github.com`

Required executable checks:

```bash
node scripts/governed-empirical-runtime-package-v2-check.mjs
node scripts/governed-empirical-runtime-currentness-v2-check.mjs
node scripts/run-authorized-empirical-load-execution-checks.mjs
npm run check:imports
npm run build
git diff --check
```

Current status: **NOT_RUN_REAL_CHECKOUT_UNAVAILABLE**. No NOT_RUN is represented as PASS. Per owner instruction, workflow gating is skipped as a continuation blocker and no workflow mutation is introduced.

## Appendix A

- A1 authority/currentness trace: PASS by source inspection.
- A2 failure isolation / falsifiers: PASS by source inspection.
- A3 protected invariants: PASS by exact patch inspection.
- A4 independent executable validation: FAIL / NOT_RUN.
- A5 handover/minimality: PASS by source inspection.

`APPENDIX_A_QUALIFIED = false` because A4 is not executed.

## Changed-file ledger

Expected net paths:

1. `src/workspace/engineering-loads/authorized-empirical-runtime-store-v2.js`
2. `src/workspace/engineering-loads/configured-empirical-method-controller-v2.js`
3. `src/workspace/engineering-loads/governed-empirical-runtime-package-v2.js`
4. `scripts/governed-empirical-runtime-package-v2-check.mjs`
5. `scripts/governed-empirical-runtime-currentness-v2-check.mjs`
6. `scripts/run-authorized-empirical-load-execution-checks.mjs`
7. `agents/PR1449_workreport.md`
8. `agents/claims/PR1449.yaml`
9. `agents/status/PR1449.yaml`

No workflow file is authorized.

## Next-agent expert questionnaire

1. Why is Project Data profile cross-binding required before governed currentness can be trusted?
2. Explain why a Product/default profile hash change is now caught by ordinary package bindings, while changed selector/audit evidence may still require governed-receipt currentness.
3. Why must legacy `refresh()` fail closed after governed configuration?
4. Show the exact state/reason when a same-method governed receipt changes.
5. Prove that `executeGoverned()` cannot fall back from V3 to V2 or silently re-authorize.

## Exact next action

Run the focused and aggregate checks in a faithful checkout. If genuine green execution is obtained, the next separate slice may design the ordinary production consumer cutover to the governed V2 path. Do not merge PR1449 without explicit current-turn owner authorization.
