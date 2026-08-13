# M047 Stage 2 — L1 hydrotest basis findings and next measured batches

Status: **H1 linear mechanism measured on the real pinned ACCDB; full nonlinear promotion gate still open. H2 is the next independent discriminator. No production promotion in this note.**

Entering baseline: production friction solver `CAESAR-ACCDB-FRICTION-SOLVER-R2` (D1), real L1 converged under the governed 800-iteration ceiling, but only 8/23 friction-restraint normals were within ±10%. The nonlinear friction law therefore stays frozen while the `WW+HP` linear basis is corrected and qualified.

## Frozen rules for these batches

- Real pinned `BM4_L.ACCDB` is the only accuracy source.
- Run controls before any promotion.
- One mechanics change per batch.
- D1 direction, Coulomb cap, friction stiffness, convergence gates, tolerances and comparison rules do not move.
- An experiment script may synthesize one input mutation to discriminate a mechanism; that mutation is not source truth and cannot itself be promoted.
- Accuracy numbers are not published unless the corresponding real-file artifact is committed under `reports/`.

## H1 — HYD insulation exclusion: linear mechanism established

**Finding.** The current ordinary-span `physicalLineWeight()` always adds `INSUL_THICK × INSUL_DENSITY`, including when `WW` has selected the hydrotest contents-density override. Rigid and reducer gravity paths likewise receive the model insulation declaration.

CAESAR II v14 documents `Include Insulation in Hydrotest=False` as the default and states that a HYD `WW` case excludes insulation/cladding when the setting is False. The dedicated real-file diagnostic inspected the pinned ACCDB: `INPUT_CONTROL` contains no field for this setting, all 96 basic-element rows carry nonzero insulation thickness/density, refractory/cladding thicknesses are zero, and no higher-authority override was found in the declared BM4_L source set.

The real pinned-ACCDB counterfactual is already committed in `reports/lfea-m047-stage2-l1-ww-linear-diagnostic.md`. With friction disabled only to isolate the linear `WW+HP` basis, excluding hydrotest insulation changed the modeled L1 gravity total from `111411.953099 N` to `95515.624630 N` and changed friction-site normal agreement from **5/23 to 18/23 within ±10%**. Absolute normal error improved at **20/23** sites. This is a linear discriminator, not nonlinear L1 qualification.

The report therefore classifies H1 as a **source-backed missing L1 linear mechanic**. The remaining H1 gate is not discovery; it is production qualification under the unchanged nonlinear solver.

**Full nonlinear qualification harness:** `scripts/lfea-m047-stage2-l1-hydrotest-insulation-experiment.mjs`

The variant changes exactly one extracted field before package construction: every nonzero `INPUT_BASIC_ELEMENT_DATA.INSUL_THICK` becomes zero. HP, test-water density and all nonlinear mechanics remain unchanged. The record carries `promotionEligible: false` so the experiment itself cannot promote production.

Run:

```bash
node scripts/lfea-m047-stage2-l1-hydrotest-insulation-experiment.mjs \
  --accdb <BM4_L.ACCDB> \
  --out reports/lfea-m047-stage2-l1-h1-hydrotest-insulation.json
```

Promotion requires all of the following on the real file: frozen controls pass, H1 L1 converges under the governed 800-iteration ceiling, recovered equilibrium passes, determinism is demonstrated, and the committed artifact supports the mechanic. Only then should the profile/production solver gain an explicit hydrotest-insulation authority.

## H2 — WW contents-density routing is inconsistent by element type

**Finding.** The current L1 hydrotest water substitution is not routed through every gravity builder:

- ordinary frame spans call `physicalLineWeight(..., caseMode.contentsDensityKgPerM3)` and therefore use the declared 1000 kg/m³ hydrotest density;
- `buildRigidElement()` passes `density(row.FLUID_DENSITY)` to the CAESAR rigid-element gravity authority;
- `buildReducerElement()` passes `density(row.FLUID_DENSITY)` to the condensed-reducer gravity authority.

Therefore one `WW` case can currently use hydrotest water on ordinary spans while retaining operating-fluid density on rigid/reducer source elements. The rigid-element authority explicitly adds fluid weight to entered rigid weight when physical rigid weight is active, so this routing difference can enter equilibrium directly.

The pinned BM4 source model declares 20 rigid elements, many with nonzero entered rigid weights, so the rigid branch is exercised by L1. No explicit reducer declarations are present in the pinned InputXML; reducer routing is the same structural defect but is not part of the BM4_L measurement claim.

**Experiment:** `scripts/lfea-m047-stage2-l1-hydrotest-fluid-routing-experiment.mjs`

The variant changes exactly one extracted field and only on rigid/reducer source rows: `FLUID_DENSITY` is set to the profile's declared hydrotest water density in the ACCDB storage basis. `HYDRO_PRESSURE`, `INSUL_THICK`, D1 and all solver gates stay invariant. The record carries `promotionEligible: false`.

Run from the unchanged D1 baseline, not from an H1-modified baseline:

```bash
node scripts/lfea-m047-stage2-l1-hydrotest-fluid-routing-experiment.mjs \
  --accdb <BM4_L.ACCDB> \
  --out reports/lfea-m047-stage2-l1-h2-hydrotest-fluid-routing.json
```

If H2 materially repairs normals, production should route `caseMode.contentsDensityKgPerM3` into the rigid/reducer gravity requests directly rather than mutating source rows. H2 must be judged separately and must not inherit H1 until H1 is independently promoted.

## Pressure-path audit — rejected as the L1 basis defect

The HP side is already routed consistently in the current solver:

- L1 resolves `pressureField = HYDRO_PRESSURE`;
- straight-pipe closed-end pressure strain reads `caseMode.pressureField`;
- rigid Bourdon pressure reads `caseMode.pressureField`;
- reducer pressure free elongation reads `caseMode.pressureField`;
- bend pressure stiffening explicitly overrides the profile's ordinary `P1` source when the active case pressure field is `HYDRO_PRESSURE`.

So the earlier possibility that L1 bends were accidentally stiffened with operating P1 is rejected by code inspection and should not consume a measurement batch.

## Required batch order from here

1. Keep production D1/R2 frozen and run the frozen controls.
2. Complete H1's full governed nonlinear L1 baseline/variant run and commit the real-file artifact. The linear H1 discriminator is already complete and should not be repeated as discovery work.
3. Return to the unchanged production baseline and run H2 independently; commit its real-file artifact.
4. Promote at most one supported mechanic at a time, re-run controls, equilibrium, determinism and L1 after each promotion.
5. Re-run the L1 linear residual audit after H1/H2 decisions; the five H1-linear outliers, especially 21610, remain separate and must not be hidden by aggregate pass counts.
6. Only after the L1 normal basis is qualified resume L1 friction/regime attribution.
7. Keep R7 (case-history dependence) separate for the L13/L7 tangential gap; do not use L1 to tune R7 while its linear basis remains unresolved.

## Sources retained by the branch

- `reports/lfea-m047-stage2-l1-ww-linear-diagnostic.md`
- `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json`
- `src/core/fea-benchmarks/caesar-accdb-linear-solve.js`
- `src/core/linear-fea-rigid-element/rigid-element.js`
- pinned `Common/LFEA/BM4/Loadcasereport_BM4_L.txt`
- pinned `Common/LFEA/BM4/Miscdata_BM4_L.txt`
- pinned `Common/LFEA/BM4/InputXML_BM4.xml`
- Hexagon CAESAR II v14 help: `Include Insulation in Hydrotest`, `Loads Defined in Input`
