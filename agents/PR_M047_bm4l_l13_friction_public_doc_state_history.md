# M047 BM4_L L13 public-documentation friction state-history diagnostic — F2.2

## Mission

Test whether the publicly documented CAESAR II static-friction controls are sufficient, by themselves, to define a stable reproducible L13 nonlinear iteration on the exact reconstructed BM4_L operator.

This layer is diagnostic evidence only. It does not fit BM4_L, choose a relaxation factor from CAESAR residuals, infer the hidden Slide Multiplier, alter gap/contact state, or publish a nonconverged iterate as an accuracy result.

## Parent baseline

F2.1 / PR #1069 retains the converged physical-Coulomb diagnostic from #1067:

```text
1,719 / 1,914 = 89.8119122257% diagnostic pass
7 STICK / 19 SLIDING
mu = 0.3
friction stiffness = 175126835.24647635 N/m
```

That baseline is not claimed to be CAESAR-equivalent; it remains the only converged L13 diagnostic score.

## Public rules tested

The literal diagnostic uses the independently documented pieces:

- non-sliding tangential force from friction stiffness times tangential displacement;
- transition when the trial force reaches/exceeds `mu*N`;
- replacement by constant opposing sliding effort on the following iteration;
- Friction Normal Force Variation threshold `0.15`;
- first non-sliding-to-sliding angle control treated as special, with later direction compensation applied iteratively.

No numeric CAESAR Friction Slide Multiplier is assigned; the public help does not publish one.

## Result: nonconvergent

On the exact reconstructed 1,938-DOF L6 operator, with gap/contact state frozen to the parent diagnostic state, the literal public-rule replay did not converge in 150 global iterations.

Final trial inventory at iteration 150:

```text
5 STICK
21 SLIDING
```

Across the last 50 iterations:

```text
minimum max DOF change = 0.00144982473854
maximum max DOF change = 0.00314679845211
normal-force basis updates = 261
direction updates = 1050
```

The final ten iterations continue the same oscillatory pattern. Therefore no final L13 result is published from this trial and no 1,914-row accuracy score is calculated from it.

## State-update concentration

The normal-force update churn is concentrated at ordinary friction sites already highlighted by F2.1:

```text
21610  79 updates through iteration 80
20170  77
20090  74
20250  74
21470  65
20350  33
```

Node 20250 transitions to sliding only at iteration 6 in this literal replay. Several sites exhibit very large direction changes, including near-180-degree reversals. These observations diagnose iteration ambiguity/chatter; they do not authorize a different CAESAR state.

## Configuration custody search

The exact retained Windows/ACE artifact from run `31513907633`, artifact `9110308571`, contains no `caesar.cfg`.

A connected-repository search of `Advanced_Analysis` and `Common` found no `caesar.cfg`. A Unicode/ASCII string scan of the pristine and working BM4_L ACCDB files found no Friction Angle Variation, Friction Normal Force Variation, Friction Slide Multiplier, Friction Stiffness control names, or `caesar.cfg` string.

The retained artifact therefore does not supply the exact configuration/state-history information needed to distinguish the missing update/order behavior.

## Engineering conclusion

The Version-14 public documentation is sufficient to establish the qualitative static friction law and threshold controls, but is **not sufficient to uniquely reconstruct a stable exact CAESAR iteration algorithm for BM4_L L13**.

In particular the available evidence does not independently resolve:

- numeric Friction Slide Multiplier;
- exact normal-force update ordering/held-force semantics;
- exact direction update/zero-crossing semantics after the first slide transition;
- exact gap/contact ordering.

Adding under-relaxation can make a generic fixed-point scheme converge, but without independent authority it cannot be called CAESAR-equivalent and its factor must not be selected from BM4_L accuracy.

## Decision

**F2.2 PUBLIC-DOC LITERAL REPLAY NONCONVERGENT — NO NEW MECHANICS PROMOTED.**

The valid numerical L13 diagnostic remains `89.8119122257%` from #1067. Qualified L13 parity remains blocked until one of the following arrives:

1. the exact CAESAR configuration used for the BM4_L run, including the hidden/internal friction controls;
2. a CAESAR nonlinear iteration trace with per-restraint state/normal/sliding-force history;
3. authoritative Hexagon/vendor algorithm documentation sufficient to define the state-update ordering.

## Non-scope

No PR #1001 modification, no Issue #991 change, no L7/L15 execution, no relaxation fitting, no gap-state fitting, no comparator/tolerance change, no gravity/bend/reducer mechanics change, no workflow change, no merge, and no ready-for-review transition.
