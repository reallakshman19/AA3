# M047 BM4_L — F2.8 exact product state-trace engineering review

## Mission

Reduce a **gate-passing exact-build CAESAR II L13 state trace** into direct engineering observations that can resolve the remaining friction/contact semantics without choosing mechanics from the BM4_L comparison score.

Stack base:

```text
PR #1079
69ad5414ef8932f0be12b224ee544d0b67f9c985
```

This stage remains review-only. It does not change the production nonlinear solver and cannot publish a new L13 accuracy.

## Direct product/document controls held fixed

```text
mu                           = 0.3
FRICT_NORM_FORCE_VAR         = 0.15
FRICT_ANGLE_VAR              = 15 deg
FRICT_SLIDE_MULT             = 1.0
sliding constant force       = applied on the following iteration after the friction limit is reached
15-degree angle control      = first non-sliding -> sliding transition only
later direction compensation = automatic on subsequent iterations
```

These values/rules are not fitted from BM4_L.

## Review reducer

`reviewBm4lL13StateTraceEvidence()` first requires the F2.7b trace gate to pass. Blocked, incomplete, nonsequential or unconverged evidence produces no engineering review measurements.

For each observed first non-sliding -> sliding transition, the reducer reports:

```text
transition iteration
prior and current normal reaction
prior and current friction resistance
prior |Ft|/(mu|N|)
current |Ft|/(mu|N|)
current sliding-force residual using prior normal force
current sliding-force residual using current normal force
configured first-transition angle = 15 deg
whether a product-observed first-transition direction reference exists
first-transition direction change angle when that reference exists
```

The prior/current residual pair is intentionally reported without an automatic winner or fitting tolerance. A smaller residual is evidence for engineering review, not self-promoting mechanics authority.

For every consecutive SLIDING -> SLIDING pair, the reducer reports:

```text
normal-force relative change
configured threshold = 0.15
whether the exact threshold is exceeded
friction-resistance relative change
current sliding-force residual using prior normal force
current sliding-force residual using current normal force
sliding friction-direction change angle
```

This directly supports review of whether CAESAR retained or refreshed the normal-force basis across iterations.

## Contact/friction event ordering

The reducer pairs gap-contact state changes with friction-state changes at the same node.

If their recorded iterations differ, it reports the iteration-level order directly.

If both are first observed in the same iteration, the reducer checks the optional exact-product `stateEvents[]` preserved by F2.7b.

With matching ordered product events it can report, for example:

```text
CONTACT_SUBITERATION_EVENT_BEFORE_FRICTION_EVENT
FRICTION_SUBITERATION_EVENT_BEFORE_CONTACT_EVENT
```

with the exact captured ordinals.

If the product does not expose that ordering, it reports exactly:

```text
SAME_RECORDED_ITERATION_SUBITERATION_ORDER_UNRESOLVED
```

It does not invent which event committed first.

## First-slide 15-degree evidence

The refined F2.7b worksheet includes the optional field:

```text
firstTransitionReferenceDirectionGlobal
```

When the exact product explicitly exposes the reference direction used on the first non-sliding -> sliding transition, F2.8 computes the observed angle between that reference and the resulting sliding friction direction.

When the product does not expose it, F2.8 retains:

```text
FIRST_SLIDE_15_DEGREE_REFERENCE_DIRECTION_NOT_CAPTURED
```

No direction is reconstructed from BM4_L response error.

## Rich versus sparse product evidence

The focused checker exercises both cases.

A rich synthetic authority-firewall trace with:

```text
explicit first-transition reference direction
explicit ordered contact event ordinal 1
explicit ordered friction event ordinal 2
```

is reduced to direct first-transition direction evidence and:

```text
CONTACT_SUBITERATION_EVENT_BEFORE_FRICTION_EVENT
```

without granting mechanics authority.

The same otherwise-valid trace with those optional fields removed still passes F2.7b, but F2.8 explicitly retains both unresolved evidence codes rather than filling them in.

This proves the optional precision channels improve observability without becoming mandatory assumptions.

## Executable review

After an exact product trace passes F2.7b and is sealed to its raw capture bundle:

```sh
node scripts/lfea-m047-bm4l-l13-state-trace-engineering-review-check.mjs \
  --input=.artifacts/bm4l-l13-state-trace.sealed.json
```

The command exits `2` if the upstream trace gate is blocked. A valid reduction exits `0` and prints the review observations and unresolved evidence. Exit `0` does **not** authorize mechanics or a rescore.

## Authority firewall

Every review result fixes:

```text
uniqueCaesarStateAlgorithmEstablished = false
frictionStateHistorySemanticsAuthorized = false
gapContactSemanticsAuthorized = false
productionMechanicsAuthorized = false
l13RescoreAuthorized = false
responseFittingPermitted = false
```

A separate explicit mechanics-promotion decision is still required after the product evidence uniquely closes the state rules.

## Accuracy

No product state trace has been supplied to this stage yet, so there is no new L13 numerical solve.

```text
historical diagnostic pass 1719
historical diagnostic fail  195
total                       1914
accuracy                     89.8119122257%
```

## Files

Relative to PR #1079 this F2.8 review layer changes exactly five paths:

```text
agents/PR_M047_bm4l_l13_state_trace_engineering_review.md
benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-l13-state-trace-review-contract.json
scripts/lfea-m047-bm4l-l13-state-trace-engineering-review-check.mjs
src/core/nonlinear-restraint-friction/caesar-bm4l-l13-state-trace-engineering-review.js
src/core/nonlinear-restraint-friction/index.js
```

`index.js` is export-only.

No production nonlinear iteration kernel, linear solver, comparator, tolerance, reference response, L7/L15 execution, or score-driven state selection is changed.

## Decision

**F2.8 REVIEW REDUCER READY — A PASSING EXACT-BUILD PRODUCT TRACE CAN NOW BE REDUCED INTO PRIOR-VS-CURRENT `mu*N` BASIS EVIDENCE, 0.15 NORMAL-FORCE UPDATE PAIRS, FIRST-TRANSITION DIRECTION EVIDENCE WHEN EXPLICITLY OBSERVED, SLIDING DIRECTION HISTORY, AND CONTACT/FRICTION ITERATION OR SUB-ITERATION ORDER WITHOUT RESPONSE FITTING. PRODUCT TRACE EVIDENCE IS STILL REQUIRED BEFORE ANY STATE ALGORITHM OR NEW L13 ACCURACY CAN BE PROMOTED.**
