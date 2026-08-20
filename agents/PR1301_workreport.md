# PR1301 Work Report — EMP1-03 real `runEmp1()` bounded gamma=5 orchestration

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `ISSUE: #1261`
- `PR: #1301`
- `BRANCH: agent/emp1-03-runemp1-orchestration-issue1261`
- `BASE_MAIN: ddfad5cd12cdbf271509031817ad9590704620c3`
- `VALIDATED_CODE_HEAD_BEFORE_HANDOVER_REFRESH: 24aadc58a7cf99b022419833e07c76aa1f07429f`
- `PR_STATE: DRAFT_UNMERGED`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_PR1301`
- `GLOBAL_EMP1_C_ROUTE_REGISTERED: false`
- `RELEASE_QUALIFIED: false`
- `CURRENT_STAGE: RUNEMP1_GAMMA5_ORCHESTRATION_QUALIFIED`

## Purpose

Connect the already-authorized bounded WRC537 gamma=5 route to the product-owned `runEmp1()` orchestration path without changing WRC equations, coefficient data, workspace/UI routing, gamma=15 route authority, pressure-thrust policy, or Appendix-B stress concentration factors.

## Authority boundary

Authorized bounded route remains exactly:

```text
method                  WRC537_2013_CYLINDRICAL_ORIGINAL_GAMMA5_TABLE5_ZERO_DP
shell family            CYLINDRICAL
attachment shape        ROUND
curve variant           ORIGINAL
gamma                   5 exact source-tabulated value only
beta                    0.05 <= beta <= 0.50
differential pressure   0
Kn                      1
Kb                      1
load reference          WRC_ATTACHMENT_REFERENCE_POINT
interpolation           false
cross-variant fallback  false
```

Still blocked/unregistered:

- global/full-domain EMP.1.C
- gamma=15 production route
- any non-tabulated gamma
- nonzero differential pressure / pressure thrust
- non-unity Kn/Kb
- release qualification / code-compliance acceptance

## Implementation state

### `src/core/emp1/emp1-orchestrator.js`

`runEmp1()` now has an optional `prepareLocalCorrelationSource` seam. When local correlation is required, the prepared source is created before the local-method gate is evaluated. The gate therefore sees the actual bounded runtime source rather than an incomplete caller shell.

The local-correlation resolver receives both:

- `source`: prepared, gate-qualified local source;
- `originalSource`: original caller source for custody/audit separation.

Legacy adapters that do not provide source preparation retain their prior behavior.

### `src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js`

The bounded route adapter:

1. requires an accepted retained EMP.1.A/LAFEA.1 foundation result;
2. verifies the retained result semantic hash;
3. derives zero-dp WRC load custody from the actual A result;
4. derives gamma/beta from runtime geometry;
5. validates the WRC frame before gate execution;
6. rebuilds source SHA, dataset hash, exact-gamma policy and load custody from pinned production authority;
7. invokes the already-authorized gamma=5 route only after `METHOD_QUALIFIED`;
8. adds a deterministic semantic `resultHash` to the C orchestration result so the EMP.1 assessment retains a non-null C parent evidence identity.

No Table-5 equations, signs, curve coefficients or domain limits are changed.

## Qualification assertions

`scripts/emp1-wrc-gamma5-zero-dp-orchestration-qualification.mjs` asserts:

- valid bounded case: A=1, B=1, C=1 invocation;
- WRC loads: `P=-1000`, `Vc=250`, `Vl=-400`, `Mc=500000`, `Ml=-600000`, `Mt=700000`;
- A/B/C result hashes exist and are mutually distinct;
- assessment parent hashes equal the three executed layer hashes;
- no-change reuse: A=0, B=0, C=0;
- `LOCAL_METHOD` invalidation: A=0, B=0, C=1;
- upstream `LOADS`/Fx edit: A=1, B=1, C=1 and all three hashes change; expected `Vl` changes from `-400` to `-401`;
- gamma=15 and beta-high are blocked by the local gate with C invocation count 0;
- nonzero dp, Kn != 1, Kb != 1, reference mismatch, caller authority injection in the route request, retained-layer hash drift and non-orthogonal frame reject before C;
- caller-spoofed authority fields outside the route request are ignored and rebuilt from pinned authority;
- unscoped legacy orchestrator compatibility remains PASS.

## CI integrity

`.github/workflows/emp1-gamma5-main-route.yml` had inherited EMP1-02 scope enforcement on every future PR. This was a false-failure hazard for EMP1-03. The scope check is now restricted to the original EMP1-02 branch, while all gamma=5 engineering re-observations still run on successor PRs.

New workflow `.github/workflows/emp1-03-runemp1-orchestration.yml` runs:

1. strict EMP1-03 changed-file scope guard;
2. independent gamma=5 full Table-5 hand calculation;
3. bounded gamma=5 route qualification;
4. real `runEmp1()` orchestration/currentness qualification;
5. existing EMP.1 core scaffold compatibility.

## Changed-file ledger

| Path | Type | Purpose |
|---|---|---|
| `src/core/emp1/emp1-orchestrator.js` | production | prepare local source before gate; pass prepared/original sources separately |
| `src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js` | production | bounded gamma=5 orchestration adapter and C semantic result hash |
| `src/core/emp1/index.js` | production export | expose bounded orchestration API |
| `scripts/emp1-wrc-gamma5-zero-dp-orchestration-qualification.mjs` | qualification | end-to-end, currentness and falsifier proof |
| `.github/workflows/emp1-03-runemp1-orchestration.yml` | CI | exact EMP1-03 qualification |
| `.github/workflows/emp1-gamma5-main-route.yml` | CI maintenance | scope old EMP1-02 diff guard to its original branch |
| `agents/PR1301_workreport.md` | handover | living recovery/evidence record |

## Validation state

Validated code head `24aadc58a7cf99b022419833e07c76aa1f07429f`:

- PR #1301 opened as draft: PASS
- branch divergence from `main`: 0 behind at validation
- pre-PR changed-file audit: PASS, intended orchestration/CI paths only
- workflow `EMP.1 runEmp1 bounded gamma5 orchestration` run `32386076028`: PASS
  - EMP1-03 strict scope guard: PASS
  - independent gamma=5 full Table-5 hand calculation: PASS
  - bounded gamma=5 route re-observation: PASS
  - real `runEmp1()` orchestration/currentness qualification: PASS
  - EMP.1 core scaffold compatibility: PASS
- workflow `EMP.1 gamma5 bounded route on current main` run `32386076198`: PASS
  - inherited EMP1-02 scope guard correctly skipped on successor branch
  - independent gamma=5 oracle: PASS
  - zero-dp load producer: PASS
  - authorized bounded route/falsifiers: PASS
  - bounded registry/global-route-absence proof: PASS
- workflow `EMP.1 current-main independent baseline` run `32386076303`: PASS
  - inherited EMP1-01 scope guard correctly skipped on successor branch
  - independent gamma=15 baseline re-observation: PASS
- browser/Chromium: `NOT_RUN` — no UI/workspace change
- full repository regression: `NOT_RUN`
- gamma=15 production comparison: `NOT_RUN` — deliberately outside scope
- pressure-thrust qualification: `BLOCKED/NOT_RUN`
- Appendix-B Kn/Kb qualification: `BLOCKED/NOT_RUN`

This commit only refreshes the handover record after the validated code head; it does not modify production or qualification logic.

## Abandon/redesign conditions

Do not extend this PR if any of the following is required to make it pass:

- modifying WRC coefficient data or Table-5 mechanics;
- widening gamma/beta/pressure/Kn/Kb domain;
- trusting caller-authored source/dataset/qualification hashes;
- bypassing EMP.1.A load-custody hashes;
- invoking C before the bounded gate passes;
- changing workspace/UI/public product projection;
- making global EMP.1.C authority true.

If any condition occurs, stop and split/re-qualify rather than expanding EMP1-03.

## Next increment after PR1301

EMP1-04 is the product/workspace integration increment: make the engineer-facing EMP.1 Run action own one source transaction while retaining A/B/C as separate internal evidence layers. UI/public projection must not be changed until PR1301 is exact-head green.

## Appendix A — takeover qualification questions

1. Why must `prepareLocalCorrelationSource` execute before `evaluateEmp1LocalCorrelationGate`, and which out-of-domain cases must therefore produce zero C invocations?
2. Trace the exact custody chain from retained EMP.1.A result hash to zero-dp WRC load package, prepared local source, gate, bounded route and C result hash.
3. Explain why caller-provided source SHA, dataset hash or load custody cannot become engineering authority through this adapter.
4. Demonstrate the invalidation semantics for no change, `LOCAL_METHOD`, and `LOADS`, including which A/B/C calls may be reused and which result hashes must change.
5. State every authority boundary that remains blocked after this PR and why a successful WRC stress calculation is not a code-compliance/release decision.
