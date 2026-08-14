# M047 Stage 2 — S1 state-path / re-lock experiment

Issue: #1083

Status: **STAGED — NOT_RUN against the pinned real ACCDB in this environment.**

S1 is an independent fallback experiment from the measured B0 production solver. It is deliberately **not composed with D1**, because D1 has not yet been measured and Issue #1083 permits only one declared mechanics change per loop iteration.

## Question

Five L13 restraints in the committed B0 artifact are sliding in CAESAR but end `LOCKED_AFTER_SLIP` in the current return-map solver:

- 21860
- 21610
- 20710
- 21470
- 22020

S1 asks one narrow question: **is re-locking after breakaway the source of that mismatch?**

## One mechanics change

Production B0 transition:

```text
if trial > cap + boundary       -> SLIDE
else if trial < cap-boundary-h  -> STICK
else                            -> retain previous state
```

S1 transition:

```text
if previous state == SLIDE      -> SLIDE
else if trial > cap + boundary  -> SLIDE
else if trial < cap-boundary-h  -> STICK
else                            -> retain previous state
```

Once a restraint breaks away in a primitive static case, S1 does not permit it to re-lock during that case.

This is a **diagnostic hypothesis**, not a claim about undocumented CAESAR iteration internals.

## Frozen mechanics

S1 keeps all of these identical to B0:

- friction-force direction;
- `FRICT_STIF = 1.751270055770874e8 N/m`;
- Coulomb cap magnitude `mu |N|`;
- per-restraint normal basis `|R dot n|`;
- initial breakaway boundary and hysteresis values;
- retained tangential spring + return-mapped slip-offset formulation;
- slip acceleration;
- displacement, reaction, cap, residual and equilibrium convergence limits;
- qualified linear element/load/restraint/recovery mechanics;
- comparison tolerances and reference values.

The experiment harness applies the change ephemerally and fingerprints the transformed solver. The production solver source is not edited.

## Expected discriminating behavior

The experiment is intentionally asymmetric:

- it directly targets the five CAESAR-sliding / solver-relocked restraints listed above;
- it **does not** solve the four opposite mismatches where B0 over-mobilises CAESAR-stuck restraints (22260, 20520, 21740, 20170);
- if those four remain wrong while the five re-lock mismatches improve, state-path memory is confirmed as a separate mechanism rather than a universal friction fix;
- if the five do not improve, the re-lock hypothesis is rejected.

## Required real-file run

```bash
node scripts/lfea-m047-stage2-control-regression.mjs \
  --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB \
  --baseline-root /tmp/previous-main

node scripts/lfea-m047-stage2-friction-s1-no-relock.mjs \
  --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB \
  --case L13 \
  --out reports/lfea-m047-stage2-friction-iteration-L13-S1.json

node scripts/lfea-m047-stage2-accuracy-rca.mjs \
  --iteration reports/lfea-m047-stage2-friction-iteration-L13-S1.json \
  --print-resolution-mm 0.001 \
  --out reports/lfea-m047-stage2-accuracy-rca-S1.json
```

The output artifact is evidence only when its source hash is the pinned member SHA-256:

```text
64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8
```

## Acceptance boundary

S1 may be retained as a useful mechanics candidate only if all of the following are true in the real-file run:

1. L2–L6/L14 controls remain bit-identical and equilibrium PASS.
2. L13 converges under the existing nonlinear convergence gates; no gate or tolerance is weakened.
3. Physical nodal equilibrium remains PASS.
4. Normal reactions remain 23/23 within ±10%; the already-qualified normal-force behavior is not traded away.
5. The five premature re-lock restraints move toward the CAESAR sliding state without manual node exceptions.
6. Tangential vector behavior is reported for all 23 restraints, not only the targeted five.
7. No generated evidence file is hand-edited.

A better state count by itself is not qualification. If vector accuracy or equilibrium degrades, S1 is rejected even if the five labels match.

## Relationship to D1

D1 and S1 are independent experiments from B0 at this stage. Do **not** run a D1+S1 combination and call it one iteration.

If D1 is later measured and accepted, the next valid sequential experiment is a new labelled variant whose baseline is the accepted D1 artifact and whose sole additional change is S1 state-path memory. That run must have its own real-ACCDB artifact.
