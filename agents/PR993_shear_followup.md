# PR #993 — Straight-Pipe Shear Follow-up

## Status

The canonical retained BM4_L mechanics state remains **788 targeted failures** at implementation commit `78652ac554dd4f1f4a6c230b891122bd9386077a`.

No transverse-shear formulation has been promoted into production.

## Why shear is now the leading residual mechanism

The existing ownership diagnostic showed that adding Timoshenko transverse-shear compliance only to bend arc sub-elements changes the 788 state only modestly, while applying it to ordinary non-bend pipe spans produces the large response change:

- bend-only kappa 0.50: `788 -> 764`;
- non-bend-only kappa 0.50: `788 -> 369`.

A section-derived Cowper hollow-circle formulation applied only to ordinary non-bend pipe spans produced approximately `788 -> 379`, with recovered equilibrium passing. The coefficient is derived from section geometry and Poisson ratio rather than selected from BM4 residuals, but this remains a diagnostic candidate until CAESAR-specific stiffness behavior is established.

## Independent non-BM4 discriminator

A new executable discriminator runs the repository's ASME B31.3-2006 Appendix S Example 1 benchmark twice:

1. retained Euler-Bernoulli ordinary straight spans;
2. Cowper hollow-circle Timoshenko ordinary straight spans, with bend components unchanged.

Workflow:

- `.github/workflows/lfea-m047-appendix-s-cowper-ab-v3.yml`
- run `31392224107`
- artifact `9064145746`
- artifact digest `sha256:c64c14a3bb1c9a175fcce9873bde88af07f675b43393e30a80c3a6b2d003fc24`

The independent run does **not** consume any BM4 reference value.

Result:

- derived Appendix-S section Cowper kappa: `0.5311033362153322`;
- retained Euler Appendix-S qualification: PASS;
- Cowper Appendix-S qualification: PASS;
- displacement normalized RMS: `0.1552403197597234 -> 0.1151973670472912`;
- displacement RMS ratio: `0.7420582953293992` (about 25.8% lower);
- max absolute displacement error: `1.028047469436185 mm -> 0.8298578419487583 mm`;
- support normalized RMS: `0.12825418543038203 -> 0.10209039260862303`;
- support RMS ratio: `0.7960004756650921` (about 20.4% lower);
- max absolute normalized support error: `0.31977005354317084 -> 0.2539135585210486`.

### Interpretation

This is independent evidence that ordinary-pipe transverse-shear compliance improves a published non-BM4 piping benchmark while preserving its existing qualification.

It is **not** sufficient to state that CAESAR II 14 uses the Cowper coefficient. It strengthens the general continuum-mechanics case only.

## CAESAR-specific identification harness

The repository now contains a fail-closed inference harness:

- `scripts/lfea-m047-caesar-straight-pipe-shear-inference.mjs`
- pending input packet: `benchmarks/LFEA/CAESAR_ACCDB/bm4l-caesar-straight-pipe-shear-reference.template.json`
- protocol: `agents/PR993_caesar_shear_microbenchmark.md`
- CI: `.github/workflows/lfea-m047-caesar-straight-pipe-shear-inference.yml`

Harness CI run `31391891139` passed:

- syntax validation;
- deterministic inference self-test;
- BM4_L two-section pending-packet validation.

The synthetic self-test generated data using `kappa = 0.535` and independently recovered:

`0.5350000000000105`.

The inference method uses only isolated CAESAR straight-pipe unit-load outputs and section/material inputs. It does not use BM4 reactions, displacements, end actions, or failure counts.

## CAESAR microbenchmark concept

For a straight cantilever under transverse tip force:

```text
delta/P = L^3/(3 E I) + L/(kappa G A)
```

The harness subtracts the analytical Euler bending term from measured CAESAR compliance, verifies that the residual compliance scales linearly with `L`, checks the associated tip rotation against the pure-bending rotation term, and only then infers effective `kappa`.

Two BM4_L pipe sections are specified, each at 4D, 8D, 16D and 32D lengths and in both transverse directions.

## Common-corpus search

The pinned Common corpus was checked for an existing CAESAR 14 case that could replace a fresh micro-run.

- BM1 is a multi-element model with bends, rigids and restraints and has no force/moment load set suitable for this isolation.
- BM2 is a larger multi-element model with bends/rigids/restraints and no force/moment load set suitable for this isolation.
- BM3 includes force/moment loads but is a 24-element system with 6 bends and 5 rigid elements, so its displacement field cannot isolate ordinary straight-pipe shear compliance.
- `LFEA/B31J` contains factor-benchmark JSON, not isolated CAESAR displacement output.
- `LFEA/B31_APPENDIX_D` contains factor-benchmark JSON, not isolated CAESAR displacement output.

Therefore no existing Common artifact supplies the clean length-sweep unit-load evidence required by the inference method.

## Decision gate

The next production mechanics decision requires a fresh **CAESAR II 14.000 straight-pipe microbenchmark run** using the committed protocol/template.

### Promote transverse shear only if

- both BM4_L sections show positive residual shear compliance;
- the residual is linear with cantilever length;
- inferred point kappa values are internally stable;
- both transverse directions agree;
- tip rotations remain consistent with the bending term;
- the inferred CAESAR values are independently reproducible.

If the inferred values are also close to the section-derived Cowper values, implement the ordinary non-bend pipe formulation in core with unit tests, then rerun the six BM4_L cases from the 788 canonical state.

### Reject the Cowper production candidate if

CAESAR is Euler-like or recovers a materially different effective shear formulation. A lower BM4 failure count alone is not grounds for promotion.

## Current conclusion

The shear hypothesis is now supported by two independent numerical signals:

1. very strong BM4 ownership localization to ordinary non-bend pipe spans;
2. improved fit on the independent ASME Appendix S benchmark.

The remaining missing evidence is deliberately narrow: **CAESAR II 14's own isolated straight-pipe transverse stiffness**.

Until that evidence is supplied, the retained BM4_L baseline remains **788** and production transverse shear remains unchanged.
