# M047 Stage 2 — prequalification corrections

Issue: #1083

This note records source-derived corrections that supersede stale statements in the original Stage 2 technical narrative. It intentionally does **not** edit generated benchmark artifacts under `reports/`; those must be regenerated from the pinned real ACCDB by the production/tuning commands before they are cited as evidence.

## 1. Friction stiffness authority

`FRICT_STIF = 1.0E6` is CAESAR's internal English friction-stiffness value in lb/in, not a displayed N/cm value.

The pinned BM4_L ACCDB carries `INPUT_UNITS.CTRANS = 1.751270055770874`, which converts lb/in to N/cm. Therefore the governed SI value is:

```text
1.0E6 lb/in
× 1.751270055770874 (N/cm per lb/in)
× 100 cm/m
= 1.751270055770874e8 N/m
```

The solver authority must use the ACCDB `CTRANS` value and fail closed if the conversion authority is absent or invalid. Any generated configuration artifact still reporting `1.0e8 N/m` is stale and must be regenerated rather than hand-edited.

The real L13 reference independently corroborates the same stiffness at sub-cap restraints 20550, 22310 and 20250 via `|F_t| / |u_t| ≈ 1.7513e8 N/m`.

## 2. Friction direction gate

The friction-direction gate must use the **current elastic tangential stretch/current drag direction**, not the accumulated slip path or total historical tangential displacement.

For the return-mapped form, with slip offset `u_slip`, define the elastic stretch

```text
u_elastic = u_t - u_slip
```

and require a sliding/capped friction force to oppose that current elastic drag. The accumulated slip is path history and can rotate as other supports change state; using it as the direction gate can reject a valid converged elasto-plastic state.

A restraint that slid earlier but subsequently locks below the Coulomb cap is elastic again; sliding cap/direction equality must not be imposed solely because accumulated slip is nonzero.

## 3. Per-restraint normal force and friction site

Friction is resolved per `INPUT_RESTRAINTS` row, not merely per physical node.

For restraint `j` with signed normal unit vector `n_j`:

```text
N_j = R_j · n_j
capacity_j = mu_eff,j × |N_j|
```

A co-located `GUI` or `LIM` restraint does not contribute its reaction to this support's Coulomb capacity. A co-located restraint can, however, remove a direction from the available tangential subspace.

Blank `FRIC_COEF` rows are frictionless. The participating model rows carrying 0.3 remain distinct from the load-case friction multiplier.

## 4. Configuration resolution

Required authority order, lowest to highest:

```text
overall/global default < individual-file setting < load-case setting < model input
```

Keep these quantities separate:

```text
model coefficient: FRIC_COEF / model mu
load-case quantity: FRICTION_MULTIPLIER
effective friction: model coefficient × friction multiplier
```

For L13, L7 and L1 the multiplier is 1.0. For non-friction controls it is 0. L15 is a derived algebraic combination and has no independent nonlinear friction solve, so `FRICT_STIF`, initialization, active-set settings and a case-specific friction multiplier are not governing mechanics for L15.

## 5. L15 nonlinear boundary

L7 and L13 must each converge as independent nonlinear primitive states. Only then is L15 formed algebraically:

```text
L15 = L7 - L13
```

Linear superposition inside L7 or L13 is invalid because friction changes support state, normal reaction and Coulomb capacity. L15 itself must never be iterated as a third nonlinear state.

## 6. L1 authority status

The earlier `HYDROTEST_AUTHORITY_UNRESOLVED` narrative is superseded by the later Stage 2 declaration: `WW` uses 1000 kg/m3 test fluid at ambient temperature and `HP` binds to the ACCDB `HYDRO_PRESSURE` field. This removes the authority blocker but does not by itself qualify L1; L1 still requires a real-file converged run and the same physics/equilibrium evidence as the other primitive friction cases.

## 7. R1 reference-resolution classification

Before publishing tangential percentage comparisons, classify reference rows against the force uncertainty implied by the printed displacement resolution.

For a printed displacement resolution of 0.001 mm, half-resolution is 0.0005 mm = `5e-7 m`. At nominal BM4_L friction stiffness:

```text
1.751270055770874e8 N/m × 5e-7 m = 87.5635027885437 N
```

This is a **comparison-scope diagnostic**, not a widened tolerance. Rows whose reference tangential force is at or below the derived floor must be reported as resolution-limited separately; all other rows remain subject to the existing comparison criteria.

The committed L13 tuning evidence contains a 4.9588 N reference tangential force at restraint `21930:REST_PTR21:TYPE3:UY`, which is clearly below the 87.56 N floor under a 0.001 mm printed resolution. The existing Stage 2 measured report states that 22 of 23 L13 friction restraints are above the approximately 88 N floor.

## 8. Required regeneration / validation

After adopting these corrections:

1. run `node scripts/lfea-m047-stage2-control-regression.mjs` and preserve L2-L6/L14 unchanged;
2. run the real pinned ACCDB through `node scripts/lfea-m047-stage2-production-run.mjs`;
3. regenerate the resolved-configuration evidence so `FRICT_STIF` reports `1.751270055770874e8 N/m` from ACCDB `CTRANS`;
4. regenerate the L13 friction ledger with the current-elastic-drag direction gate;
5. publish the R1 resolution classification without moving the literal comparison tolerance;
6. continue one-mechanic-per-iteration with R2, then R3, then R4.

No universal CAESAR parity is claimed by this correction record.