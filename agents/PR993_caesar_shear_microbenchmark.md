# PR #993 — CAESAR II 14 Straight-Pipe Shear Microbenchmark

## Purpose

This protocol resolves the largest remaining BM4_L formulation question without fitting BM4 reference residuals:

> Does CAESAR II 14 ordinary metallic straight-pipe stiffness include resolvable transverse-shear compliance, and if so what effective shear correction / shear area does it imply?

The retained BM4_L state remains **788 targeted failures**. A diagnostic Cowper/Timoshenko ordinary-pipe formulation previously reduced the BM4_L count to roughly 379, but that result is not authority because the coefficient was not established from CAESAR itself.

This microbenchmark is designed to turn that candidate into a binary, independently measurable CAESAR stiffness property.

## Why this test works

For a straight cantilever of length `L`, transverse tip force `P`, elastic modulus `E`, second moment `I`, shear modulus `G`, gross section area `A`, and Timoshenko shear correction `kappa`:

```text
tip displacement / P = L^3/(3 E I) + L/(kappa G A)
```

The first term is Euler bending compliance and scales with `L^3`.
The second term is transverse-shear compliance and scales with `L`.

The corresponding cross-section bending rotation is expected from pure bending:

```text
tip rotation / P = L^2/(2 E I)
```

Therefore multiple otherwise-identical CAESAR jobs at different lengths allow the two effects to be separated without using any BM4 displacement, reaction, or element-action target.

The repository inference harness subtracts the analytical Euler bending term from CAESAR's measured tip compliance. It then checks whether the remaining compliance is linear in `L`. Only after that check does it infer effective `kappa`.

## Model protocol

Use **CAESAR II 14.000**.

Create one straight PIPE element along global X:

```text
node 10 ---------------- node 20
ANCHOR                     FREE
             +Y or +Z tip force F1
```

Required model conditions:

- node 10 fully anchored;
- node 20 free;
- one straight pipe element only;
- no bend, reducer, rigid element, tee, expansion joint, spring, or intermediate node;
- no weight;
- no temperature load;
- no pressure load;
- no support other than node 10 anchor;
- one transverse force `F1 = 10,000 N` at node 20;
- load case `L1 = F1`;
- use the same ordinary-pipe material state / EC convention as BM4_L;
- retain the job's actual shear-modulus / Poisson authority; do not substitute a value derived from BM4 residuals.

Run both transverse directions for the circular section:

- `FY` -> record node-20 `DY` and the associated bending rotation;
- `FZ` -> record node-20 `DZ` and the associated bending rotation.

Using both directions detects accidental local-axis or global-axis formulation asymmetry.

## BM4_L sections and lengths

The committed input packet is:

`benchmarks/LFEA/CAESAR_ACCDB/bm4l-caesar-straight-pipe-shear-reference.template.json`

It covers both principal BM4_L ordinary-pipe sections.

### Section A — OD 273 mm / wall 18.263 mm

Run lengths:

- 4D = 1.092 m
- 8D = 2.184 m
- 16D = 4.368 m
- 32D = 8.736 m

### Section B — OD 168.3 mm / wall 10.973 mm

Run lengths:

- 4D = 0.6732 m
- 8D = 1.3464 m
- 16D = 2.6928 m
- 32D = 5.3856 m

The diameter-scaled sequence gives the same slenderness progression for both sections. The shorter specimens amplify shear compliance; the longer specimens anchor the `L^3` bending term.

## Data to record

For each run copy the template and fill:

- exact `elasticModulusPa` used by CAESAR;
- exact `poissonRatio` used by CAESAR;
- exact `shearModulusPa` if CAESAR exposes or overrides it; otherwise leave the field absent/null and the harness derives isotropic `E/[2(1+nu)]` explicitly;
- `tipDisplacementM` from the free-node transverse displacement output;
- `tipRotationRad` from the corresponding bending rotation output.

Retain the CAESAR output/report used to populate the JSON as source evidence.

Do not round the copied displacement/rotation more than CAESAR's output format requires.

## Inference command

After filling a copy of the template:

```text
node scripts/lfea-m047-caesar-straight-pipe-shear-inference.mjs \
  --input <filled-reference.json> \
  --out <inference-report.json> \
  --require-timoshenko
```

The harness is also self-tested independently:

```text
node scripts/lfea-m047-caesar-straight-pipe-shear-inference.mjs --self-test
```

The deterministic self-test uses synthetic `kappa = 0.535` data and must recover the same value.

## Decision gate

A section can be classified `CONSISTENT_WITH_TIMOSHENKO_TRANSVERSE_SHEAR` only when:

1. at least three distinct lengths are present;
2. the measured total compliance exceeds the Euler bending compliance by a positive amount;
3. the residual shear compliance is approximately linear in `L`;
4. pointwise inferred kappa values are mutually consistent;
5. tip rotations remain consistent with the pure-bending rotation term;
6. inferred kappa is finite and physically positive.

Default diagnostic tolerances in the template are:

- rotation relative error <= 3%;
- residual-compliance linear-fit relative RMSE <= 5%;
- point-kappa coefficient of variation <= 8%.

These are **authority-quality checks for the microbenchmark**, not changes to issue #991's literal 10% BM4 acceptance threshold.

## Comparison to the Cowper candidate

For each section the inference report independently calculates the hollow-circle Cowper value from section geometry and Poisson ratio, then reports the relative difference between:

- `kappa_inferred_from_CAESAR`, and
- `kappa_Cowper_from_section_theory`.

The Cowper value is not used to derive the CAESAR value.

For the BM4_L geometries at `nu = 0.3`, the previously calculated theoretical values are approximately:

- OD 273 / t 18.263: `kappa ~ 0.53498`;
- OD 168.3 / t 10.973: `kappa ~ 0.53475`.

These are comparison targets only. The CAESAR inference stands on its own.

## Promotion rule

### If both sections independently recover a stable kappa close to the same section-derived theory

Then ordinary non-bend metallic pipe transverse shear becomes a defensible production-correction candidate. Implement it in the core frame profile with unit tests, keep bend-component sub-elements on their separately qualified bend formulation, and rerun the six BM4_L cases from the canonical 788 state.

### If CAESAR is Euler-like

Reject the Cowper BM4 improvement as a cancellation / wrong-model candidate even though it lowers the count. Leave production straight-pipe shear disabled and continue residual localization elsewhere.

### If the result is inconsistent

Do not fit kappa. Check model construction, E/G authority, load direction, element count, output precision, and repeat the microbenchmark.

## Current evidence boundary

Hexagon CAESAR documentation states that material shear modulus is used to develop the stiffness matrix. The accessible documentation does not establish the ordinary metallic-pipe effective shear area / correction coefficient used by CAESAR II 14.

Therefore this microbenchmark is intentionally an empirical **software-mechanics identification test**, not a benchmark fit: it measures a property of an isolated CAESAR straight-pipe element and never consumes BM4 reference errors.

## Repository artifacts

- inference harness: `scripts/lfea-m047-caesar-straight-pipe-shear-inference.mjs`
- pending CAESAR packet: `benchmarks/LFEA/CAESAR_ACCDB/bm4l-caesar-straight-pipe-shear-reference.template.json`
- harness CI: `.github/workflows/lfea-m047-caesar-straight-pipe-shear-inference.yml`
- independent non-BM4 discriminator runner: `scripts/lfea-m047-appendix-s-cowper-ab.mjs`
- work report: `agents/PR993_workreport.md`

No production mechanics are changed by this protocol.
