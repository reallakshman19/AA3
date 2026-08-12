# M047 BM4_L friction execution readiness — F1.4

## Mission

Create a fail-closed execution gate between the qualified frictionless BM4_L solver and the still-incomplete nonlinear friction stack. This PR decides only **which route is authorized**; it does not execute a new BM4_L nonlinear solve.

## Stack

- Base PR: #1049 — friction/gap source mapping (F1.3).
- Exact base SHA: `449750b260c98b935901033d8689b697d3349561`.
- Head branch: `agent/m047-bm4l-friction-readiness-gate`.

## Zero-friction route

Cases with load-case friction multiplier exactly zero return immediately as:

```text
READY_LINEAR_BYPASS
route = QUALIFIED_LINEAR_SOLVER
```

The readiness function does not inspect the friction source map or any nonlinear authority fields for this route. This protects the existing production-qualified L2/L3/L4/L5/L6 behavior from incomplete friction work and preserves the exact zero-friction identity.

## Positive-friction route

A positive-friction case may reach `READY_NONLINEAR_INTEGRATION` only when independent authority is present for:

- positive-friction source map;
- friction stiffness;
- Friction Angle Variation;
- Friction Normal Force Variation;
- numeric Friction Slide Multiplier;
- exact friction state-history semantics;
- exact gap/contact state semantics when the source map contains positive-gap companions.

Authority marked `RESPONSE_FITTED`, or whose source explicitly says response-fitted, is rejected.

## Current BM4_L decision

Resolved independently:

```text
Friction Stiffness               1,000,000
Friction Angle Variation         15 deg
Friction Normal Force Variation  0.15
```

Still unresolved:

```text
FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED
FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
```

Therefore:

```text
L2 L3 L4 L5 L6 -> READY_LINEAR_BYPASS
L7 L13          -> BLOCKED_AUTHORITY
```

The L7/L13 gap/contact blocker is required because F1.3 proved BM4_L contains four friction sites with positive-gap companions.

## External CAESAR basis

Hexagon documents nonlinear restraints as load-case-specific: the restraint configuration is determined independently for each load case from the loads present. It also documents that gaps/lift-off can change restraint status and that nonlinear static cases can require multiple solutions/iterations before the restraint assumptions converge.

Those statements justify requiring explicit state-history/contact authority, but they do not publish enough detail to implement CAESAR's exact static gap/contact iteration. This PR therefore blocks rather than invents that behavior.

## Focused local qualification

Node 22.16.0:

```text
node --check src/core/nonlinear-restraint-friction/friction-execution-readiness.js
PASS
node --check scripts/lfea-m047-friction-execution-readiness-check.mjs
PASS
node scripts/lfea-m047-friction-execution-readiness-check.mjs
PASS
```

The checker verifies the five friction-zero linear bypass cases, current L7/L13 blockers, a synthetic fully-authorized nonlinear route, missing source-map failure, and rejection of response-fitted authority.

## Decision

**F1.4 READINESS GATE COMPLETE — BM4_L PRODUCTION FRICTION STILL BLOCKED.**

No L13/L7 production execution is authorized by this PR. The next batch is authority closure: search official/local source surfaces for the numeric Slide Multiplier and exact static friction/gap state-history semantics. If those cannot be independently resolved, mechanics work must stop at this gate.

## Non-scope

No PR #1001 modification, no Issue #991 change, no comparator/profile/tolerance edit, no L13/L7 solve, no parameter fitting, no merge, and no ready-for-review transition.
