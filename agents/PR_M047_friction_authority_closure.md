# M047 BM4_L friction authority closure — F1.5

## Mission

Close the current independent-authority search for BM4_L static friction and make the unresolved boundary durable. This is evidence only: no friction parameter, gap rule, solver path, comparator, or production mechanics is changed.

## Stack

- Base PR: #1050 — friction execution readiness gate (F1.4).
- Exact base SHA: `3a95e8980fbfe8eef5be5920afe8b9108bea480f`.
- Head branch: `agent/m047-bm4l-friction-authority-closure`.

## What is independently resolved

Official Hexagon documentation establishes the static stiffness-method behavior:

- CAESAR II uses the stiffness method for friction.
- Before sliding, friction reaction is the tangential displacement times friction stiffness.
- The limiting friction magnitude is based on `mu * normal force`.
- When the trial reaches/exceeds that limit, the following iteration uses a constant effort opposite the sliding direction instead of friction stiffness.
- Friction Stiffness default is `1,000,000` in active force/length units.
- Friction Angle Variation default is `15 deg` and is relevant to the first non-sliding-to-sliding transition.
- Friction Normal Force Variation default is `0.15` and governs adjustment of an existing sliding friction force.

Official documentation also establishes that nonlinear restraint status is load-case-specific, that gaps/lift-off can change status, and that nonlinear static cases can require multiple iterations before restraint assumptions converge.

## What remains unresolved

### Friction Slide Multiplier

Hexagon identifies this configuration item only as an **internal friction sliding force multiplier** and instructs users not to adjust it without Support direction. The reviewed official help publishes no numeric value.

The separate friction technical discussion describes the physical sliding resistance using `mu * normal force`. That statement is **not** sufficient authority to assign the hidden internal multiplier a numeric value. In particular this work does not infer `1.0`.

### Exact static state-history semantics

Public documentation supplies important pieces of the stick/slide history, but not a complete reproducible ordering/formulation for all state updates and convergence decisions needed for parity with CAESAR's static solver.

### Exact gap/contact semantics

Public documentation establishes active/inactive gap/lift-off behavior and iterative status changes but does not publish a complete reproducible static gap/contact active-set and convergence algorithm.

F1.3 proved this matters to BM4_L because four friction sites contain positive-gap companions.

## Repository and production-artifact search

The exact Common/Advanced_Analysis repositories were searched for the Slide Multiplier configuration key and phrase. No independent numeric authority was found; the only phrase-level Advanced_Analysis hit is internal documentation describing the same blocker.

The exact Windows/ACE production artifact from run `31513907633`, artifact `9110308571`, was also inspected:

- captured configuration authority contains `FRICT_STIF = 1,000,000`;
- it does not contain a Slide Multiplier value;
- it does not contain exact angle/normal-force/gap algorithm implementations;
- string scans of pristine and working BM4_L ACCDB files expose the model `Friction Coefficient` label but no Slide Multiplier/control text.

Deriving the missing internal value from L13/L7 response data would therefore be response fitting, which remains prohibited.

## Durable prohibitions

The authority manifest and checker pin:

```text
DO_NOT_ASSUME_SLIDE_MULTIPLIER_EQUALS_ONE_FROM_MU_N_DESCRIPTION
DO_NOT_FIT_SLIDE_MULTIPLIER_FROM_L13_OR_L7_RESPONSE
DO_NOT_FIT_CONTACT_STATE_RULES_FROM_REFERENCE_RESPONSE
DO_NOT_TREAT_REFERENCE_DIFFERENTIALS_AS_MECHANICS_AUTHORITY
```

The checker also requires the unresolved numeric Slide Multiplier to remain `null` and requires all three current blocker codes.

## Decision

**F1.5 COMPLETE — BLOCKED, NO NEW MECHANICS.**

Remaining blockers:

```text
FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED
FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
```

L13 and L7 production solving remain unauthorized. Qualified engineering work should stop at #1050/#F1.4 until new independent authority appears, such as an exact CAESAR configuration export/support disclosure or another authoritative source that provides the missing computational values/semantics.

## Non-scope

No PR #1001 modification, no Issue #991 change, no L13/L7 solve, no hidden-default assumption, no response fitting, no tolerance/profile/comparator change, no merge, and no ready-for-review transition.
