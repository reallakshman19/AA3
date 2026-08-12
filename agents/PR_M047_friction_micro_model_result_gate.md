# M047 independent friction micro-model result gate — F1.8

## Mission

Make the FM1–FM4 independent CAESAR product experiments machine-ingestible and fail-closed, so future product output can be reviewed without introducing response fitting or silently promoting a hidden parameter.

This batch adds **qualification tooling only**. It changes no solver mechanics, friction coefficient, stiffness, Slide Multiplier, contact rule, comparator, tolerance, reference result, or load case.

## Stack

- Base PR: #1056 — independent BM1 product observations (F1.7).
- Exact base SHA: `73e285001cc150af4e38a7f41bcac442dea3967c`.
- Head branch: `agent/m047-friction-micro-model-result-gate`.

Future qualified friction work should stack on this PR.

## Why this is the current boundary

The connected repositories contain no CAESAR executable or licensed automation hook. The pinned Common corpus contains positive friction only in BM1 and BM4:

- BM1 independently validates stick stiffness and constrains capped/sliding behavior, but does not uniquely identify the hidden Slide Multiplier and does not exercise a friction+gap site;
- BM4/BM4_L is the target benchmark and remains prohibited as a parameter-fitting source.

Therefore the remaining mechanics cannot be resolved truthfully from this environment alone. The correct next external evidence is execution of the FM1–FM4 micro-models on CAESAR II `14.00.00.0910 Build 231113`.

## Result contract

`m047-friction-micro-model-result-contract.json` pins:

```text
CAESAR version/build
mu = 0.3
static friction stiffness = 175,126,835.24647635 N/m
angle variation = 15 deg
normal-force variation = 0.15
```

Every result must retain:

- independent-product provenance;
- exact input/output SHA-256 hashes;
- exact case definition;
- CAESAR version/build;
- coefficient and stiffness custody;
- raw observations;
- a source path that is not BM4/BM4_L.

BM4/BM4_L input or response data are explicitly rejected by the result gate.

## Experiment-specific coverage

### FM1 — slide plateau

At least three observations with controlled normal reaction and tangential sliding are required. The gate computes:

```text
r = |F_t| / (mu * |N|)
```

and reports the ratio series, mean and spread.

It does **not** promote `r` to the Slide Multiplier automatically.

### FM2 — angle update

The result must contain direction changes both below and above the documented `15 deg` threshold. The gate reports the observed update pattern only.

### FM3 — normal-force update

The result must contain normal-force changes both below and above `0.15`. The gate reports the held/recomputed-force pattern only.

### FM4 — gap/contact

The result must include `OPEN`, `CLOSED`, and `REOPENED` phases with gap displacement/reaction plus normal and tangential reactions. The gate reports the active-set sequence only.

## Promotion boundary

Even a structurally complete result is emitted as:

```text
CANDIDATE_PRODUCT_EVIDENCE_REQUIRES_ENGINEERING_REVIEW
```

The checker hard-codes:

```text
checkerMayResolveAuthority = false
parameterFittingPermitted = false
toleranceFittingPermitted = false
productionIntegrationBeforeIndependentReviewPermitted = false
```

Thus no future raw result can automatically authorize L13/L7 or silently enter production mechanics.

## Checker modes

Contract-only:

```text
node scripts/lfea-m047-friction-micro-model-result-check.mjs
```

Expected disposition:

```text
PASS_CONTRACT_ONLY
externalProductExecutionRequired = true
```

Future product-result ingestion:

```text
node scripts/lfea-m047-friction-micro-model-result-check.mjs --result <result.json>
```

A complete result remains candidate evidence pending engineering review.

## Decision

**F1.8 COMPLETE — INDEPENDENT PRODUCT RESULT GATE READY; EXTERNAL CAESAR EXECUTION REQUIRED.**

No qualified mechanics batch remains inside the connected environment until FM1–FM4 are actually executed or equivalent independent CAESAR product evidence is supplied.

Remaining blockers stay:

```text
FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED
FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
```

## Non-scope

No PR #1001 modification, no Issue #991 change, no L13/L7 solve, no hidden-default assumption, no BM4 response fitting, no merge, and no ready-for-review transition.
