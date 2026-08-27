# PR1495 Work Report — Current Common Input effective gravity/load basis

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_EXACT_MAIN_BASE
TAKEOVER_AUTHORITY: WRITE_ALLOWED_WITHIN_PR1495_SCOPE
EXECUTION_MODE: CONNECTOR_DELIVERY
CRITICALITY: ENGINEERING_CRITICAL
PR: #1495
ISSUE: #1321
BASE_BRANCH: main
BASE_SHA: 93c4f9e3af98e58190951ff94b5b50616950f623
CURRENT_STAGE: SOURCE_COMPLETE_EXECUTION_NOT_RUN_REVIEW_PENDING
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
CURRENT_BLOCKER: faithful checkout failed before checkout because github.com DNS could not be resolved
EXACT_NEXT_ACTION: execute focused gravity/load-basis, support-execution and Run-runtime checks plus aggregate/import/build/diff checks on a faithful checkout; preserve unavailable checks as NOT_RUN; recheck live main, exact eight-file diff, reviews and threads before any merge recommendation.
```

## Mission

Close the Issue #1321 PR-B gap for the two scalar force multipliers used by ordinary current-system support-load Run:

```text
READY Common Input
→ effective Project Data gravity/load entries
→ existing Non-FEA effective-value resolver
→ exact two-row gravity/load execution-basis receipt
→ receipt-bound projected execution profile
→ current qualified mass receipt
→ unchanged massKg × gravityMPerS2 × loadFactor kernel formula
```

This PR does **not** create a second effective-value precedence mechanism. It calls the existing `resolveNonFeaEffectiveValues()` authority resolver for `GRAVITY_ACCELERATION` and `LOAD_FACTOR`.

## Engineering boundary

### Changed behavior

- creates `current-common-input-gravity-load-basis/v1`;
- resolves exactly `GRAVITY_ACCELERATION` and `LOAD_FACTOR` through the existing effective-value resolver;
- retains the actual two-row resolver ledger, selected candidate/row hashes, Common Input hash, seal hash, Project Data profile hash and binding hash;
- validates Product-default gravity/load evidence against the exact built-in default row value, row hash, profile ID/version and profile semantic hash;
- visibly migrates legacy approved project-owned gravity/load entries without an authority token to `PROJECT_POLICY` rather than creating another authority tier;
- passes a receipt-bound projected profile into the existing support-capability projection before the unchanged scalar statics kernel consumes gravity/load values;
- binds the receipt into the current support-load execution contract and its semantic hash.

### Protected invariants

- `src/workspace/engineering-loads/support-load-distribution-v3.js` is unchanged;
- force equation remains exactly `massKg * gravityMPerS2 * loadFactor`;
- support allocation, first-moment accounting, equilibrium and tolerance mechanics are unchanged;
- `src/workspace/project-data/non-fea-effective-value-resolver.js` is unchanged and remains the sole effective-value precedence authority;
- `src/workspace/project-data/non-fea-product-default-profile.js` is unchanged;
- no Product-default values or profile version are changed;
- no source-axis generalization or #1491-owned mechanics are changed;
- no active-load-case authority/presentation or #1486-owned behavior is changed;
- no Common Input checker, resolver, workflow or GitHub Actions file is changed.

## Exact intended changed-file ledger

Implementation/test files:

1. `src/workspace/engineering-loads/current-common-input-gravity-load-basis.js`
2. `src/workspace/engineering-loads/current-common-input-empirical-support-load-execution.js`
3. `scripts/current-common-input-gravity-load-basis-check.mjs`
4. `scripts/current-common-input-empirical-run-runtime-check.mjs`
5. `scripts/run-non-fea-checks.mjs`

Recovery files:

6. `agents/PR1495_workreport.md`
7. `agents/claims/PR1495.yaml`
8. `agents/status/PR1495.yaml`

No other path belongs in this PR. The temporary `agents/WIP-1321-effective-gravity-load-basis.yaml` must be absent from the final diff.

## Inputs / benchmark / common authority context

Required live sources for takeover:

- Issue `#1321`, especially PR-B acceptance item **Gravity/load factor from effective ledger**;
- `src/workspace/project-data/non-fea-field-registry.js` — authority paths and units for `GRAVITY_ACCELERATION` / `LOAD_FACTOR`;
- `src/workspace/project-data/non-fea-effective-value-resolver.js` — governing effective-value precedence and candidate/row contracts;
- `src/workspace/project-data/non-fea-product-default-profile.js` — `PD-GRAVITY` and `PD-LOAD-FACTOR` catalog authority;
- `src/workspace/project-data/project-data-contract.js` — approved evidence-value profile contract;
- `src/workspace/engineering-loads/current-common-input-empirical-mass-projection.js` — exact current mass receipt consumed beside this basis;
- `src/workspace/engineering-loads/authorized-empirical-support-capability-binding.js` — downstream projected-profile seam;
- `src/workspace/engineering-loads/support-load-distribution-v3.js` — protected statics kernel;
- open PR `#1491` — source-axis-general scalar gravity ownership that must not be duplicated;
- open PR `#1486` — active-load-case Method Basis presentation ownership that must not be duplicated;
- `AGENTS.md` — repository delivery/coordination rules.

Focused falsifiers/benchmarks:

- `scripts/current-common-input-gravity-load-basis-check.mjs`;
- `scripts/current-common-input-empirical-support-load-execution-check.mjs`;
- `scripts/current-common-input-empirical-run-runtime-check.mjs`;
- aggregate `scripts/run-non-fea-checks.mjs`.

## Source-review findings

The focused basis falsifier covers:

- exact Product-default gravity = `9.80665 m/s²` and load factor = `1` with Product-default custody;
- explicit `PROJECT_POLICY` values remain project policy;
- legacy approved project-owned values migrate visibly to `PROJECT_POLICY`;
- forged Product-default value with reused evidence fails closed;
- unsupported authority (for example `EXACT_APPROVED_MASTER`) fails closed for these project-owned fields;
- zero/non-positive force multipliers fail closed;
- receipt bound to a foreign/stale Common Input semantic identity fails closed;
- raw statics kernel remains ignorant of the new current-system receipt and retains the existing force formula.

The receipt validator additionally recomputes:

- outer receipt semantic hash;
- effective ledger semantic hash;
- each resolution-row semantic hash;
- each selected-candidate semantic hash;
- selected projection ↔ ledger equality;
- execution-basis binding semantic hash;
- projected profile semantic hash and per-entry receipt binding.

## Validation truth

A faithful checkout was attempted with:

```text
git clone --depth 1 --branch agent/issue-1321-effective-gravity-load-basis https://github.com/reallaksh19/Advanced_Analysis.git
```

It failed before checkout with:

```text
fatal: unable to access 'https://github.com/reallaksh19/Advanced_Analysis.git/': Could not resolve host: github.com
```

Therefore the following are **NOT_RUN**:

```text
node scripts/current-common-input-gravity-load-basis-check.mjs
node scripts/current-common-input-empirical-support-load-execution-check.mjs
node scripts/current-common-input-empirical-run-runtime-check.mjs
node scripts/run-non-fea-checks.mjs
npm run check:imports
node scripts/advanced-shell-contract-check.mjs
npm run build
git diff --check
```

Source/diff inspection is not executable PASS evidence. GitHub workflow state is not a merge gate per owner instruction and is not substituted for the unavailable execution suite.

## Appendix A — five-question implementation takeover gate

Incoming agent must answer these from the **live repository** before extending or merging this PR:

1. What are the exact current `main` SHA, PR #1495 head SHA, ahead/behind counts and eight changed paths? Identify any path outside the declared ledger and explain why it blocks merge.
2. Trace `commonInput.projectDataProfile` → `createNonFeaEffectiveValueCandidate()` → `resolveNonFeaEffectiveValues()` → `current-common-input-gravity-load-basis/v1` → projected profile → support-capability binding → qualified-mass statics. Which hashes prevent a stale/foreign basis or forged Product-default row from being accepted?
3. For gravity and load factor, distinguish `PRODUCT_DEFAULT`, explicit `PROJECT_POLICY`, and legacy approved project-owned evidence. Why is legacy migration to `PROJECT_POLICY` visible rather than a new precedence tier, and why is `EXACT_APPROVED_MASTER` rejected here?
4. Prove from the exact diff that the numerical equation, allocation mechanics, first-moment accounting, equilibrium, tolerances and source-axis mechanics are unchanged. Name the protected statics file and explain why #1491 is not overlapped.
5. Which executable checks must run before qualification can be claimed? If checkout/import/build execution is unavailable, exactly how must that state be reported, and why is GitHub workflow state not equivalent evidence?

Takeover target: all five answers must name current functions/files/SHAs and the exact receipt/authority boundary; generic answers are insufficient.
