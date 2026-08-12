# M047 BM4_L — F2.7b exact-build L13 state-trace evidence gate

## Mission

Turn the remaining F2.7 product-state blocker into a deterministic, fail-closed evidence intake path. This stage does **not** guess CAESAR II nonlinear ordering and does not change the production nonlinear solver.

Stack base:

```text
PR #1076
97c2de08ed2e83ec77d68e61823fe0f2e9a0a34a
```

## Why this is the next qualified step

The retained exact-build package was exhausted in F2.7. Final XML and ACCDB results do not retain active-boundary or nonlinear iteration history.

Official CAESAR II Version 14 documentation does, however, establish that the live Incore Solver exposes:

- current iteration count;
- nonlinear restraint convergence/status information;
- individual nonlinear-restraint status navigation;
- Active Boundary Conditions showing active directional supports, assumed-closed gaps, and friction resistance handling.

Official friction documentation also directly establishes:

```text
stiffness method before breakaway
maximum friction = mu * normal force
constant opposing sliding force replaces friction stiffness on the following iteration
Friction Angle Variation = 15 deg, used on first non-sliding -> sliding transition
Friction Normal Force Variation = 0.15
Friction Slide Multiplier = internal multiplier; pinned exact cfg value = 1.0
```

Those statements still do not publish the full hidden update/commit ordering. Therefore the correct next step is to capture the exact product state sequence rather than infer it from L13 error.

## Exact product custody required

The gate accepts only:

```text
product  CAESAR II 14.00.00.0910 Build 231113
case     BM4_L L13
ACCDB    64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8
capture  Incore Solver + Active Boundary Conditions
         OR an equivalent exact-build product state trace
trace    file name + SHA-256
```

Any evidence explicitly selected from final BM4_L response accuracy is rejected.

## Required iteration coverage

Every captured nonlinear iteration must include all 26 friction sites:

```text
20030 20090 20170 20250 20350 20390 20440 20520 20550
20580 20710 21470 21480 21610 21740 21800 21860 21930
22020 22070 22120 22140 22220 22260 22310 22370
```

and all six positive-gap rows, keyed by node, physical direction and gap magnitude:

```text
GAP:20030:0,0,-1:25
GAP:20390:-1,0,0:5
GAP:21480:0,0,1:25
GAP:21480:1,0,0:10
GAP:21640:1,0,0:10
GAP:22310:0,0,-1:10
```

This avoids ACCDB/InputXML class-label conflation.

## Required per-iteration evidence

Each iteration carries:

```text
iteration
converged
unconvergedRestraintCount
restraints[]
```

Friction rows require:

```text
restraintKey
contactState
frictionState = STICK | SLIDING
normalReactionN
frictionResistanceN
frictionDirectionGlobal when sliding
```

Gap rows require at minimum:

```text
restraintKey
contactState
```

The trace must start at iteration 1, remain sequential, contain at least two iterations, and end in a converged iteration.

## Derived evidence — no fitting

Once a trace passes custody/completeness, the gate derives only direct differences between observed consecutive iterations:

```text
contact-state change iteration
STICK/SLIDING change iteration
normal-force relative change
friction-resistance relative change
sliding-direction change angle
```

These measurements are intended to answer the exact unresolved questions:

1. when OPEN/CLOSED/REOPENED states commit;
2. whether contact changes precede or follow friction-state changes;
3. when STICK becomes SLIDING relative to the threshold-crossing iterate;
4. how the first 15-degree transition rule is applied;
5. how later friction direction reversals are updated;
6. whether the 0.15 normal-force rule is evaluated before or after the sliding-force update.

## Authority firewall

A passing gate returns:

```text
stateTraceMeasurementAuthorized = true
engineeringReviewRequired = true
frictionStateHistorySemanticsAuthorized = false
gapContactSemanticsAuthorized = false
productionMechanicsAuthorized = false
l13RescoreAuthorized = false
```

Only a separate F2.8 engineering review may promote a uniquely supported algorithm.

## Accuracy

No numerical L13 result changes in F2.7b.

```text
historical diagnostic pass 1719
historical diagnostic fail  195
total                       1914
accuracy                     89.8119122257%
```

A state-trace intake tool is not an accuracy improvement by itself.

## Files

Relative to corrected Fix 1 / PR #1076 this stage adds or modifies exactly five files:

```text
agents/PR_M047_bm4l_l13_state_trace_evidence_gate.md
benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-l13-state-trace-contract.json
scripts/lfea-m047-bm4l-l13-state-trace-evidence-check.mjs
src/core/nonlinear-restraint-friction/caesar-bm4l-l13-state-trace-evidence-gate.js
src/core/nonlinear-restraint-friction/index.js
```

No production nonlinear iteration kernel, linear solver, comparator, tolerance, CAESAR reference rows, PR #1001, or Issue #991 is changed.

## Decision

**F2.7B STATE-TRACE INTAKE READY. THE REPOSITORY CAN NOW ACCEPT AND REDUCE THE EXACT-BUILD PRODUCT TRACE REQUIRED TO CLOSE THE TWO REMAINING NONLINEAR SEMANTIC BLOCKERS WITHOUT RESPONSE FITTING. L13 REMAINS 1719/1914 = 89.8119% UNTIL SUCH EVIDENCE IS CAPTURED, REVIEWED, AND THEN IMPLEMENTED IN A SEPARATE F2.8 BATCH.**
