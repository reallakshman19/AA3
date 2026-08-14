# M047 Stage 2 — D1 direction-law experiment

Issue: #1083  
Stacked PR: #1102

## Purpose

D1 tests one mechanics hypothesis only: when a friction restraint is sliding, orient the capped Coulomb force opposite the **current total relative tangential displacement** rather than opposite the return-map elastic stretch.

The experiment is motivated by the committed real BM4_L L13 evidence: at multiple two-direction friction restraints, the CAESAR reference friction vector is anti-parallel to the reference total tangential displacement, while the current return-map implementation is anti-parallel to `u_t - u_slip` by construction.

D1 does **not** change:

- `FRICT_STIF` or its ACCDB `CTRANS` conversion;
- coefficient of friction or load-case multiplier;
- normal-force basis `|R·n|`;
- Coulomb cap magnitude `mu|N|`;
- stick/slide state boundaries or hysteresis;
- retained-spring return-map formulation;
- acceleration or convergence limits;
- qualified linear W/P1/thermal/pressure/restraint/recovery mechanics;
- comparison thresholds or acceptance rules.

## D1 law

For a restraint classified `SLIDE` with non-zero total tangential motion:

```text
F_cap = -mu|N| * u_t / |u_t|
u_slip,new = u_t + F_cap / k_f
```

The retained-spring force then satisfies:

```text
-k_f (u_t - u_slip,new) = F_cap
```

so only the direction used for the capped force is changed.

If a restraint is classified sliding but `|u_t|` is below the declared zero-motion floor, D1 does not invent a direction. The existing direction gate remains fail-closed.

## Implementation boundary

`scripts/lfea-m047-stage2-friction-d1-total-direction.mjs` is an **experiment harness**, not the production solver.

At runtime it:

1. reads the current production friction solver source;
2. requires exact single matches for the four D1 source substitutions;
3. creates a temporary sibling solver module with the D1 direction law;
4. creates a temporary tuning-loop module that imports that solver;
5. runs the normal Stage 2 tuning iteration against the supplied real ACCDB;
6. records a distinct D1 solver profile ID and SHA-256 fingerprint of the transformed solver;
7. deletes the temporary modules.

Any source drift that makes a substitution ambiguous or absent stops the experiment before solving.

## Required real-file execution

Run the existing frozen controls first:

```bash
node scripts/lfea-m047-stage2-control-regression.mjs \
  --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB \
  --baseline-root /tmp/previous-main
```

Then run D1:

```bash
node scripts/lfea-m047-stage2-friction-d1-total-direction.mjs \
  --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB \
  --case L13 \
  --out reports/lfea-m047-stage2-friction-iteration-L13-D1.json
```

Re-run the RCA diagnostic against D1:

```bash
node scripts/lfea-m047-stage2-accuracy-rca.mjs \
  --iteration reports/lfea-m047-stage2-friction-iteration-L13-D1.json \
  --print-resolution-mm 0.001 \
  --out reports/lfea-m047-stage2-accuracy-rca-D1.json
```

## Acceptance / rejection decision

D1 is worth promoting into the production solver only if the real-file run satisfies all of the following simultaneously:

- L13 converges with every existing nonlinear physics gate passing;
- recovered physical equilibrium remains PASS;
- the frozen L2-L6/L14 controls remain unchanged;
- normal-reaction parity does not materially regress from the B0 result (23/23 within ±10%, worst 7.49%);
- tangential vector parity improves materially over B0 (4/23 within ±10%) without a compensating collapse in magnitude parity;
- the improvement is distributed across the previously identified two-direction direction-error restraints, not created by one exceptional node;
- repeated nominal D1 runs are deterministic.

If D1 improves vector orientation but creates non-convergence or equilibrium failure, it remains diagnostic evidence only. Do not weaken a gate to retain the accuracy gain.

## Next RCA after D1 measurement

If D1 succeeds, promote the direction law and then move to **S1 state-path/re-lock behavior**. The nine genuine final constitutive-state mismatches from B0 split into four over-mobilised restraints and five prematurely re-locked restraints; that topology should be re-measured after D1 before changing the state-path mechanic.

If D1 does not improve the real equilibrium solution, reject it and return to the state-path hypothesis without changing tolerances.
