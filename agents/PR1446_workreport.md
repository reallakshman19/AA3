# PR1446 — Governed gravity selection to exact runtime-package projection

## Recovery header

```text
repository              = reallaksh19/Advanced_Analysis
issue                   = #1321
PR                      = #1446
branch                  = agent/issue-1321-governed-runtime-package-projection
stacked base PR         = #1440
stacked base exact head = 0209109ddf7835f74885fb3af571167a99e90fbe
live main last checked  = 29c688db4a021db900d1f8c67f56f777f73f4ddc
validation basis head   = b1f78f9bc4623f86e437fdbf99aaa1a8929cc3b6
criticality             = ENGINEERING_CRITICAL
execution mode          = AUTO
merge authority         = OWNER_ONLY / NOT_GRANTED
workflow policy         = owner instructed workflow gating be skipped as a continuation blocker
```

## Mission

Close one narrow Issue #1321 handoff gap without changing production execution:

```text
non-fea-gravity-method-authority/v1
        ↓
empirical-governed-gravity-method-selection/v1
        ↓
exact selected method only
        ↓
authorized-empirical-runtime-package/v2
        ↓
governed-empirical-runtime-package-projection/v1 receipt
```

The projection exists because the bare V2 runtime package binds only the selected executable method. If two different governed AUTO/default/profile states both select the same V2 or V3 method and all ordinary package context is unchanged, the bare package can legitimately be byte/hash identical. The new receipt retains the full governed-selection authority so that distinction is not lost before any future production-currentness integration.

## Ground truth / production boundary

Current production remains on the existing V1 `EngineeringModelStore` / authorized consumer path. The method-aware V2 package/store/controller exist as explicit opt-in infrastructure but are not the ordinary production consumer path.

This PR does **not** modify:

- `src/workspace/engineering-model-store.js`;
- `src/workspace/enrichment/authorized-enrichment-consumer-controller.js`;
- `configured-empirical-method-controller-v2.js`;
- `authorized-empirical-runtime-store-v2.js`;
- `authorized-empirical-runtime-package-v2.js`;
- V2 execution mechanics;
- `support-load-distribution-v3.js`;
- scenario authorization;
- equilibrium/tolerance/solver code;
- UI/release/workflows.

Therefore this PR is not a production AUTO cutover and does not claim one.

## Implemented contract

New file:

`src/workspace/engineering-loads/governed-empirical-runtime-package-v2.js`

Schema:

`governed-empirical-runtime-package-projection/v1`

Creation input is exact:

```text
schema
governedSelection
packageContext
```

`packageContext` is exact and deliberately has **no method field**:

```text
packageId
configuredAt
executionId
executedAt
authorizedInput
bindings
```

The producer:

1. revalidates the governed selection;
2. requires `selection.selectedMethod` to be exactly one of:
   - `CHAINAGE_TRIBUTARY_SPAN_V2`,
   - `CHAINAGE_TRIBUTARY_SPAN_V3_COG`;
3. rejects null/blocked selection before package creation;
4. injects the selected concrete method into the unchanged V2 package seal;
5. returns a semantic receipt containing the full governed selection and the full validated V2 package;
6. revalidation independently checks the selected method still equals the package method;
7. explicitly requires the upstream selector policy to remain `selectionIsNotExecutionAuthorization=true`.

`AUTO` therefore cannot cross the V2 package boundary.

## Focused anti-drift regression

New file:

`scripts/governed-empirical-runtime-package-v2-check.mjs`

It pins:

- AUTO-selected V2 seals exact V2;
- AUTO-selected V3 seals exact V3;
- AUTO never appears in the V2 runtime package method;
- receipt carries no calculation-eligibility or authorization-state field;
- blocked/null governed selection cannot create a package;
- caller cannot inject a method into `packageContext`;
- fully rehashed V3-selection/V2-package mismatch is rejected;
- nested governed-selection hash tampering is rejected;
- two different authority/profile receipts selecting the same method can retain the same bare V2 package hash but must produce different governed projection hashes.

The focused regression is owned by:

`scripts/run-authorized-empirical-load-execution-checks.mjs`

This is the existing aggregate that already owns V2 runtime-package and configured-controller checks.

## Engineering falsifier

The strongest falsifier for the reason this receipt exists is:

```text
same V2 package context
+ same selected executable method
+ different governed effective-profile authority
```

Expected:

```text
bare V2 package semantic hash            = SAME
new governed projection semantic hash    = DIFFERENT
```

If the new receipt hash does not change, the implementation has failed to retain selection authority and must not be promoted.

A second hard falsifier is a fully rehashed receipt containing:

```text
governed selected method = V3
runtime package method   = V2
```

Expected result:

`EMPIRICAL_GOVERNED_RUNTIME_METHOD_MISMATCH`

## Coordination / exact diff

No separate open PR matching the new governed runtime-package projection path was found. PR #1440 is the intentional upstream base.

Exact stacked reconciliation at validation basis head:

```text
base / merge base = 0209109ddf7835f74885fb3af571167a99e90fbe
head              = b1f78f9bc4623f86e437fdbf99aaa1a8929cc3b6
ahead / behind    = 6 / 0
changed paths     = exactly 6
reviews           = 0
review threads    = 0
```

The six paths are exactly the ledger below. No protected production execution path and no `.github/workflows/**` path appears.

## Validation truth

A bounded local checkout retry was performed after source completion:

```text
git clone --depth 1 --branch agent/issue-1321-governed-runtime-package-projection \
  https://github.com/reallaksh19/Advanced_Analysis.git
```

Result:

`fatal: unable to access ... Could not resolve host: github.com`

Classification:

`FAIL_ENVIRONMENT_DNS_GITHUB`

This is not an engineering regression and is not a test PASS. Per owner instruction, no workflow mutation is introduced to manufacture execution evidence.

Required commands remain:

```bash
node scripts/governed-empirical-runtime-package-v2-check.mjs
node scripts/run-authorized-empirical-load-execution-checks.mjs
npm run check:imports
npm run build
git diff --check
```

Current status for each command: **NOT_RUN_REAL_CHECKOUT_UNAVAILABLE**.

No NOT_RUN is represented as PASS.

## Appendix A

- A1 production/authority trace: PASS by source inspection.
- A2 failure isolation / independent falsifiers: PASS by source design.
- A3 protected invariants: PASS by exact changed-path source inspection.
- A4 independent executable validation: **FAIL / NOT_RUN**.
- A5 minimal patch and single falsifier: PASS by source inspection.

`APPENDIX_A_QUALIFIED = false` because A4 does not meet the minimum qualification threshold.

## Changed-file ledger

Exact net successor paths:

1. `src/workspace/engineering-loads/governed-empirical-runtime-package-v2.js`
2. `scripts/governed-empirical-runtime-package-v2-check.mjs`
3. `scripts/run-authorized-empirical-load-execution-checks.mjs`
4. `agents/PR1446_workreport.md`
5. `agents/claims/PR1446.yaml`
6. `agents/status/PR1446.yaml`

No `.github/workflows/**` path is allowed.

## Next-agent expert questionnaire

1. Why is the full governed-selection receipt retained when the V2 package already contains `method`?
2. Demonstrate the same-method/different-authority falsifier and explain why equal bare-package hashes are expected.
3. Prove that AUTO cannot cross this projection into the V2 runtime package.
4. Identify the exact existing module that still owns execution authorization/currentness and explain why this PR does not replace it.
5. What would be required for a later production cutover to invalidate authorization when the effective Product-default/profile authority changes but selected method remains the same?

A next agent who cannot answer all five from source should not perform production cutover work.

## Exact next action

Execute the focused and aggregate checks from a faithful checkout. Only after genuine green execution should a separate PR design the production consumer/currentness integration. Do not merge #1446 without explicit current-turn owner authorization.
