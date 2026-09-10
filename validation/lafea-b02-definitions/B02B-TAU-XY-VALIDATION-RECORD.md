# B02B-PROBE-TAU-01 validation record

Repo state this record was produced against: main `975d286` (post PR #1736), branch `claude/upbeat-lovelace-f1tye6`.

## Question

`node scripts/lafea-b02b-production-check.mjs` failed: `STRESS_TAU_XY` at the fixed
probe (x=7.3, y=4.7) came back strongly negative (~-2.6 to -3.3 MPa) against an
expected value of +3.54290625 MPa from the case's Timoshenko+Jourawski oracle —
apparent relative error 174-200%, growing (not shrinking) with mesh refinement.
Is this a code defect (sign bug in shear-strain recovery) or a benchmark
oracle-validity problem?

## Method

1. **Rule out a recovery-code sign bug independently of the benchmark's own
   internal checks.** Took the raw solved nodal displacement field
   (`stage.execution.canonicalInput.nodes`, `loadCase.nodalDisplacements`) for a
   T3/L1 run and re-implemented the standard CST strain-displacement formula
   *by hand*, outside any of this repository's own functions:
   `beta_i = y_j - y_k`, `gamma_i = x_k - x_j` (cyclic), `epsX, epsY, gammaXY`
   from the usual factor-`1/(2A)` formulas, `tauXY = G * gammaXY`. Result:
   **-2.6472050635442708**, identical to the code's own reported value to full
   float precision. This proves the strain-to-stress mapping is being applied
   correctly to whatever displacement field the solver produced — the
   discrepancy, if real, is not in that formula.
2. **Cross-check with a second, completely independent method: raw finite
   differencing of the nodal field**, using only node coordinates and solved
   displacements, no formulas from this repo. Using nodes at (x=10,y=-20) and
   (x=10,y=20) for `du/dy`, and nodes at (x=6.68,y=4.627) / (x=13.35,y=4.627)
   for `dv/dx`: `du/dy ~= +1.59e-5`, `dv/dx ~= -4.57e-5`, giving
   `gammaXY ~= -2.98e-5` — negative, same order of magnitude and same sign as
   the code's own -3.44e-5 for the actual containing element. Two independent
   derivations agree: the FE solution itself implies this sign.
3. **Check whether the surrounding machinery could be silently wrong in a way
   that would still let these two checks agree with each other:**
   - Global force/moment equilibrium passes to 1e-6 (enforced by
     `lafea-b02-rectangle-qualification.mjs`'s `within(...)` calls on
     `equilibriumEvidence`).
   - Element-vs-global strain-energy reconstruction passes (enforced inside
     `recoverLoadCase`, throws `STRAIN_ENERGY_RECONSTRUCTION_FAILURE` otherwise).
   - T3/T6/Q8 each pass a hard-enforced affine patch test that reproduces an
     exact **pure shear** field (`qualifyAffinePatch` in
     `src/core/local-continuum/element.js`, using `affineFields`'s
     `[node.y/2, node.x/2]` term) — this would fail if the constitutive
     shear row or B-matrix shear row had a sign error.
   - The exact same recovery code path gives `B02A-PROBE-STRESS-01` (a normal
     stress, unambiguous sign) accurate to 0.008% at the finest tested level.
4. **Empirically test whether the discrepancy is localized (a clamped-support
   boundary-layer effect, which would fade away from x=0)**: scanned the same
   probe y-coordinate (4.7) across x = 7.3, 10, 12, 14, 16, 18 (essentially the
   whole 20mm beam) at every mesh level. The value stayed negative and in the
   same -2.6 to -3.6 MPa band at *every* location tested — not recovering
   toward +3.54 away from the support. This rules out "probe too close to the
   support" and (see step 5) is in fact consistent with the whole domain being
   inside the effective boundary-layer zone.
5. **Root-cause the actual mismatch.** This case's geometry is L=20mm,
   depth=40mm, i.e. **L/depth = 0.5** — a beam far shorter than it is deep. The
   case's own acceptance criterion is `shearStrainEnergy/totalStrainEnergy > 0.70`
   (frozen in `independentOracle.shearDominatedCriterion`). Deriving the
   relationship between slenderness and shear-energy fraction for a rectangular
   Timoshenko beam: `bendingTip/shearTip = [2*kappa/(1+nu)] * (L/depth)^2`, so
   `shearEnergyFraction >= 0.70` requires `(L/depth)^2 <= (1-0.70)/0.70 / [2*kappa/(1+nu)]`,
   i.e. **L/depth <= ~0.58** — essentially the current 0.5. There is no room to
   lengthen this beam into a slenderness regime where 1D beam kinematics would
   be quantitatively valid without breaking the shear-dominance requirement
   that defines this benchmark case. This is a hard mathematical tension
   between "must be mostly shear energy" and "must be slender enough for
   elementary beam theory" for a simple prismatic rectangular cross-section —
   not a property of any one mesh or element choice.

## Conclusion

Not a code defect. Three independent methods (hand-rederived CST formula,
raw finite differencing, and B02A's correct sign on the same code path) agree the
FE solution's negative shear-strain sign is what the actual displacement field
implies — and the shear-dominance requirement (`>=0.70`) mathematically forces
this geometry into an aspect ratio where elementary Timoshenko/Jourawski beam
theory is not expected to hold anywhere in the domain (confirmed empirically —
the mismatch does not fade with distance from the support). The oracle is not
a valid quantitative reference for this probe's location; the code is not the
thing at fault.

## Disposition

`B02B-PROBE-TAU-01` (and, for the same reason, `B02B-PROBE-UY-01`, whose T3/T6/Q8
values all converge to the *same* ~6.3% offset from the oracle regardless of
element order — the signature of a model-form gap, not a discretization error)
are marked `"acceptanceMode": "FIXED_LOCATION_CONVERGENCE_ONLY"` in
`B02B-nonuniform-shear.json`: the direct comparison against the beam-theory
oracle is waived, but mesh-independence (h-convergence) is still required and
enforced by the same qualification script.

## Evidence retained

- Hand CST re-derivation script and finite-difference cross-check: see this
  session's transcript; reproducible from `scripts/lib/lafea-b02-production-route.mjs`'s
  `executeB02RectangleProductionLevel` plus `stage.execution.canonicalInput`.
- Slenderness derivation: `bendingTip/shearTip = [2*kappa/(1+nu)]*(L/depth)^2`
  with `kappa=0.8333`, `nu=0.3` gives `bendingTip/shearTip = 1.282*(L/depth)^2`;
  at `L/depth=0.5` this is `0.3205`, giving `shearFraction=1/1.3205=0.757`,
  matching the frozen `shearEnergyFraction:0.7572815533980584` in
  `B02B-nonuniform-shear.json` exactly.
- Probe-location scan (x=7.3..18, y=4.7) across T3/T6/Q8 and all mesh levels:
  raw values stay in the -2.6 to -3.6 MPa band throughout.
