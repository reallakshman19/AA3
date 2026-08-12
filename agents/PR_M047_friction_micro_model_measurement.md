# M047 independent CAESAR friction micro-model measurement — F1.7

## Mission

Prepare the independent measurement harness needed to resolve the remaining CAESAR static-friction internals without using BM4_L L7/L13 response values as parameter authority. This batch adds diagnostics and experiment contracts only; it does not run CAESAR, solve L7/L13, or change production mechanics.

## Stack

- Base PR: #1060 — BM4_L friction stiffness unit normalization (F1.6).
- Exact base SHA: `548edf4c1333ef273408ac8711442d7e9fbf36aa`.
- Head branch: `agent/m047-friction-independent-micro-models`.

Future qualified friction work should stack on this PR.

## Measurement seam

`caesar-friction-micro-model-measurement.js` accepts an independent CAESAR micro-model result containing:

- restraint normal direction;
- coefficient of friction;
- final displacement vector;
- final restraint-reaction vector.

It derives, without any BM4_L response fitting:

```text
normal reaction magnitude
mu * normal reaction
projected tangential displacement
projected tangential reaction
|Ft| / (mu*N)
effective tangential stiffness |Ft| / |ut|
reaction/displacement opposition cosine
```

For a sequence of independent runs it also measures:

```text
normal-force relative change
tangential displacement direction change
tangential reaction direction change
friction-limit-ratio change
```

These are measurements only. The module contains no rule that promotes a measured ratio or direction change into solver authority.

## Experiment plan

The pinned plan requires CAESAR II `14.00.00.0910 Build 231113` and defines five experiments:

1. `MM1_STICK_STIFFNESS` — confirm non-sliding tangential stiffness against the independently resolved `1.0e8 N/m` BM4_L-equivalent stiffness.
2. `MM2_SLIDE_PLATEAU` — measure the converged sliding plateau and expose a candidate `|Ft|/(mu*N)` value. Repetition across independent load magnitudes is required before any authority promotion.
3. `MM3_DIRECTION_CHANGE_TRACE` — investigate the documented 15-degree angle control. A CAESAR nonlinear iteration trace is mandatory; final output alone cannot authorize the update semantics.
4. `MM4_NORMAL_FORCE_UPDATE_TRACE` — investigate the documented 0.15 normal-force variation control. A nonlinear iteration trace is mandatory.
5. `MM5_GAP_CONTACT_TRACE` — isolate finite-gap activation/convergence separately from friction. A nonlinear iteration trace and explicit positive-gap definition are mandatory.

## Anti-fitting boundary

The experiment plan explicitly prohibits using:

```text
BM4_L L7 reference response as parameter source
BM4_L L13 reference response as parameter source
BM4_L L15 reference response as parameter source
an assumed Friction Slide Multiplier
tuned comparison tolerances
```

Thus the existing BM4_L reference surface remains a validation target only.

## Synthetic qualification

Local Node qualification exercises the measurement algebra with synthetic, closed-form vectors:

- subcritical stick case: `N=1000 N`, `mu=0.3`, `Ft=100 N`, `ut=1e-6 m` -> measured stiffness `1.0e8 N/m` and friction-limit ratio `1/3`;
- sliding plateau case: `Ft=300 N`, `N=1000 N` -> ratio `1.0`;
- 45-degree rotated sliding case -> measured displacement/reaction direction change `45 deg` with unchanged normal reaction.

Focused module/checker syntax and synthetic measurement tests pass locally.

## What is still required externally

This PR does not claim the experiments were executed in CAESAR. To resolve the remaining blockers, independent micro-model runs must provide exact input custody and the required result/iteration evidence listed in the plan. The direction, normal-force-update, and gap/contact semantics cannot be promoted from final-state output alone.

## Decision

**F1.7 INDEPENDENT MEASUREMENT HARNESS READY — NOT EXECUTED IN CAESAR.**

No additional nonlinear mechanics are authorized by this batch. L7/L13 remain blocked on:

```text
FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED
FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
```

## Non-scope

No PR #1001 modification, no Issue #991 change, no BM4_L L7/L13/L15 solve, no response fitting, no hidden-default assumption, no profile/tolerance/comparator change, no workflow modification, no merge, and no ready-for-review transition.
