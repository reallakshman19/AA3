# M047 BM4_L L13 physical Coulomb fixed-point numerical proof — F2.3

## Mission

Determine whether the current `89.8119122257%` L13 diagnostic is materially dependent on the numerical damping used by the generic physical-Coulomb fixed-point solver.

This is a numerical verification layer only. Damping is not a CAESAR parameter and is not selected from BM4_L reference accuracy.

## Fixed problem

All converged runs use exactly the same mechanics and data:

- exact reconstructed L6 1,938-DOF structural operator;
- `mu=0.3`;
- independently validated static friction stiffness `175126835.24647635 N/m`;
- parent retained fixed contact/gap state;
- stick response `-k_f u_t` while below the Coulomb limit;
- sliding force opposing tangential displacement with magnitude `mu*N`;
- no BM4_L residual or CAESAR response value enters the iteration law.

## Damping independence

Three independently chosen numerical damping factors converge:

| Damping | Iterations | Final state |
|---:|---:|---|
| 0.10 | 188 | 7 STICK / 19 SLIDING |
| 0.15 | 125 | 7 STICK / 19 SLIDING |
| 0.20 | 93 | 7 STICK / 19 SLIDING |

Relative to the 0.20 result:

- damping 0.10 maximum absolute DOF difference: `8.1959818706e-13`;
- damping 0.15 maximum absolute DOF difference: `3.1072486164e-13`;
- maximum sliding-force-vector differences are only `1.06184e-5 N` and `3.72563e-6 N` respectively;
- all three runs have the identical 26-site state map.

The converged state also differs from the original F2.0/PR #1067 diagnostic displacement vector by only `6.6817764429e-12` maximum component, so the governed `89.8119122257%` diagnostic result is retained.

## Physical residual closure

At the converged fixed point:

```text
max global nonlinear equilibrium residual  = 2.3858156e-6
RMS global equilibrium residual            = 1.6275641e-7
max sliding Coulomb vector-law residual    = 7.3317286e-6 N
max sliding |Ft|-muN magnitude residual    = 5.7893426e-6 N
minimum STICK reserve below Coulomb limit  = 361.920334 N
```

The seven stick nodes are unchanged:

`20030, 20250, 20390, 20550, 21480, 21930, 22310`.

## Negative controls

Damping `0.25` and `0.30` do not converge within 600 iterations and end in oscillatory 20-sliding-site trial states. They are retained only as numerical negative controls and receive no accuracy score.

This does not make `0.10`, `0.15`, or `0.20` CAESAR values. It demonstrates only that the stable physical fixed point is independent of damping over the convergent interval.

## Engineering conclusion

**The current 10.1881% L13 diagnostic miss is not explained by the damping used to obtain the physical Coulomb solution.**

F2.2 separately showed that a literal interpretation of the public CAESAR state-history controls does not converge and that the exact configuration/update ordering is absent from retained custody. Together F2.2 and F2.3 isolate the remaining discrepancy to CAESAR-specific state/history/contact semantics rather than to the linear operator, friction-stiffness unit, or fixed-point damping choice.

## Decision

**F2.3 PHYSICAL COULOMB FIXED POINT NUMERICALLY PROVED — NO CAESAR MECHANICS PROMOTION.**

The retained numerical L13 diagnostic remains:

```text
1719 / 1914 = 89.8119122257%
```

Qualified L13 accuracy is still blocked. L7 remains deferred.

## Non-scope

No PR #1001 modification, no Issue #991 change, no L7/L15 execution, no fitted damping, no Slide Multiplier inference, no gap-state selection, no comparator/tolerance change, no production solver/profile/workflow change, no merge, and no ready-for-review transition.
