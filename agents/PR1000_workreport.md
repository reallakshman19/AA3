# PR #1000 Work Report — M047 BM4_L Qualification

## Scope

This report summarizes the work stacked on draft PR #1000, `M047: isolated BM4_L qualification workstream`, for the BM4_L linear CAESAR ACCDB validation task. The report covers the investigation state through production commit `ed6d61b810ebf311079eefe9d8f31cee0f7795f8`; this report itself is added in a later documentation-only commit.

The governed cases are:

- `L2 = W`
- `L3 = T1`
- `L4 = P1`
- `L5 = W + T1 + P1`
- `L6 = W + P1`
- `L14 = L5 - L6 = T1`

The governed result families are:

1. global restraint reactions,
2. nodal translations and rotations,
3. source-element global end actions at FROM/TO for `FX/FY/FZ/MX/MY/MZ`.

The work is deliberately mechanism-driven. It does not change benchmark references, suppress rows, loosen tolerance, tune sign/scale factors, or fit independent load cases separately.

---

## Source custody and reproducibility

The BM4_L authority chain was pinned before mechanics changes were accepted.

- Common source commit: `45d51ea18624f5775805f399110c1738301c0d90`
- Source archive: `LFEA/BM4/BM4_L.zip`
- ZIP SHA256: `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`
- ZIP member: `BM4_L.ACCDB`
- Exact extracted member SHA256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`

The issue-declared ACCDB hash was found to disagree with the actual byte stream in the pinned ZIP. The qualification therefore treats the pinned Common commit plus ZIP hash as the source-of-truth byte identity and preserves the conflicting declaration as provenance evidence rather than silently substituting another file.

A signed Microsoft Access Database Engine provider was installed in Windows qualification jobs so the ACCDB could be read directly rather than replaced by XML or another derived representation.

---

## Core qualification concept

### 1. Separate system equilibrium from element recovery

Every failed row is treated as a trace through two independent layers:

```text
system solve:
    r_sys = K_global u - F_global

element recovery:
    q_e = k_e u_e - f_fixed,e - f_initial,e
```

This distinction matters because a model can have a correct global solve but an incorrect recovery transformation, or correct recovery arithmetic but the wrong physical element formulation.

Interpretation used throughout the work:

- bad system residual -> assembly or solve defect,
- good system residual + bad recovered equilibrium -> recovery/load/transform defect,
- both equilibrate but CAESAR end action is wrong -> mechanics/model formulation defect,
- physical raw end action correct but reported row wrong -> sign, transform, offset transport, unit, or reporting defect.

### Example

The source-element replay tooling statically condenses all analysis descendants of one CAESAR source element, imposes endpoint motions, and recomputes the source end actions.

If LFEA endpoint motions replay the LFEA source action exactly, recovery is proved. If CAESAR endpoint motions still do not reproduce the CAESAR source action, the mismatch has been localized inside that source element's stiffness/load formulation rather than the global solver.

This approach was especially useful for bends and rigid elements.

---

### 2. Preserve load-case identities

The six governed cases are not independent tuning targets. The following identities are treated as invariants:

```text
L6 = L2 + L4
L5 = L2 + L3 + L4
L14 = L5 - L6 = L3
```

A physical change must therefore have a coherent primitive-case signature. For example, a gravity-only mechanism should originate in `L2` and propagate into `L5/L6`; a pressure mechanism should originate in `L4` and propagate into `L5/L6`; a thermal mechanism should reproduce in both `L3` and `L14`.

---

### 3. One physical mechanism per A/B iteration

Each accepted or rejected experiment follows this pattern:

1. state one physical hypothesis,
2. predict which primitive case, topology, and components should move,
3. change only that mechanism,
4. rerun the affected replay plus all six governed cases when appropriate,
5. require equilibrium/recovery invariants,
6. retain only if the physical signature is credible,
7. reject and revert otherwise.

Failure-count reduction alone is not an acceptance criterion.

---

## Work completed

## A. Baseline parity and recovery proof

The qualification first established that the fresh branch reproduced the prior numerical baseline rather than starting from an accidental hidden improvement.

Key results:

- all governed rows were traced through the same source model,
- common stiffness-state checks were added,
- six-DOF recovered equilibrium checks were retained,
- source FROM/TO mapping and local/global transformation were proved,
- per-element matrices, fixed loads, initial loads, and recovered actions were exposed in diagnostic workflows when needed.

The original metadata reported 50 L6 end-action failures, while the immutable implementation/source replay produced 49. That discrepancy was classified as metadata inconsistency, not numerical progress.

---

## B. Accepted: B31J smooth-90 bend flexibility correction

### Concept

For B31.3 2022 with B31J enabled, CAESAR applies the B31J smooth 90-degree flexibility relationship rather than the legacy B31.3 value.

The correction used the B31J smooth-90 factor `1.3/h` in the governed bend formulation.

### Why it was accepted

- independent CAESAR/B31J authority,
- expected bend-local topology signature,
- no tolerance/reference changes,
- all recovery/equilibrium gates remained valid.

### Example impact

The correction substantially reduced the initial bend-dominated errors. It also made later source replay much more diagnostic because the remaining discrepancies were no longer dominated by the legacy smooth-90 factor.

---

## C. Accepted: CAESAR straight-pipe transverse shear

### Concept

CAESAR's straight-pipe stiffness formulation uses a transverse shear divisor of 2:

```text
phi_CAESAR = 12 E I / [ G (A/2) L^2 ]
```

The LFEA Timoshenko kernel uses:

```text
phi_LFEA = 12 E I / [ G (kappa A) L^2 ]
```

Therefore the exact mapping is:

```text
kappa = 0.5
```

This was applied only to physical straight-pipe spans, including `FRAME` and `BEND_INCOMING_STRAIGHT`, not to bend arcs, reducers, or rigids until separate authority was established.

### Example impact

After the already accepted smooth-90 correction, the straight-pipe shear correction changed the six-case mismatch counts from:

- restraints: `16 -> 8`,
- displacement/rotation: `375 -> 242`,
- end actions: `437 -> 254`.

High-value L2 examples included:

- node 20090 `UY` absolute error reduced by about 93.9%,
- source E4 TO `MZ` reduced by about 94.9%,
- source E4 TO `FY` reduced by about 94.9%,
- source E5 FROM `MZ` reduced by about 94.9%,
- source E5 FROM `FY` reduced by about 93.5%.

These improvements matched the predicted short/medium straight-span shear signature and were not used as a fitted coefficient search; `kappa=0.5` came from the CAESAR formulation itself.

---

## D. Accepted: MEC-21 bend-arc transverse shear

### Concept

Bend arcs are not straight pipe and were kept out of the straight-pipe shear authority. A separate MEC-21 bend formulation was qualified for bend-arc transverse shear using the annular shear coefficient mapped into the same Timoshenko kernel.

### Why it matters

This preserved a clean separation:

- straight pipe: CAESAR `A/2` shear area,
- bend arc: MEC-21 annular bend shear mapping,
- reducer: separately condensed tapered-section authority,
- rigid: separately governed artificial rigid section.

The split prevents one successful coefficient from being spread across unrelated components merely because it lowers benchmark errors.

---

## E. Retained: combined Bourdon translation + rotation

### Concept

The pressure-only case was decomposed into three diagnostic variants:

1. translation + rotation,
2. translation only,
3. rotation only.

### Result

For `L4 = P1`, the governed combined formulation was dramatically closer to CAESAR:

- combined: `0 restraint / 36 displacement / 6 end-action` failures at the decomposition stage,
- translation only: `47 / 375 / 973`,
- rotation only: `27 / 208 / 367`.

### Examples

At node 20330:

- `RZ` reference `-6.4575e-6`
  - combined `-4.5183e-6`
  - translation-only `-7.7445e-5`
  - rotation-only `-2.0217e-5`

For E19 TO `MZ`:

- reference `280.9788 N*m`
- combined `285.8348 N*m`
- translation-only `19.3322 N*m`
- rotation-only `275.2263 N*m`

Conclusion: neither Bourdon component may be removed. The remaining pressure residual must be sought in other pressure mechanics such as thrust/effective area, pressure stiffening, reducer pressure behavior, or rigid pressure behavior.

---

## F. Accepted: CAESAR rigid-element transverse shear

### Concept

CAESAR's documented rigid element is not an infinite constraint. Its stiffness is formed from the pipe inside diameter with the entered wall thickness multiplied by 10. Long rigids may bend.

The rigid section is therefore an artificial pipe section:

```text
ID_rigid = ID_entered_pipe
wall_rigid = 10 * wall_entered
OD_rigid = ID_rigid + 2 * wall_rigid
```

The straight-pipe CAESAR matrix still carries the same transverse shear divisor 2, so the artificial rigid section also maps to `kappa=0.5`.

The accepted implementation now applies that pipe shear profile to `RIGID` in the benchmark assembly and makes the reusable rigid authority's local stiffness matrix use the same shear formulation.

### Important implementation lesson

An early A/B changed only the reusable rigid authority matrix and produced no BM4_L difference. Investigation showed that the benchmark adapter rebuilt the rigid through `buildFrameElement`, while its pipe-shear profile classifier excluded `RIGID`.

That was a useful architecture finding: authority and assembly could disagree while tests still passed locally. The promoted correction updates both paths so the reusable rigid definition and benchmark assembly stay consistent.

### Source replay example

Using CAESAR endpoint motions, normalized rigid replay errors changed approximately as follows:

| Source | Before force | After force | Before moment | After moment |
|---|---:|---:|---:|---:|
| 76 | 151.6 | 5.37 | 16.06 | 0.57 |
| 77 | 4.05 | 0.061 | 5.05 | 0.076 |
| 78 | 4.56 | 0.404 | 5.42 | 0.480 |
| 79 | 79.1 | 3.69 | 18.88 | 7.16 |

The middle rigids nearly close; edge rigids improve by orders of magnitude but retain a separate residual.

### Six-case qualification

The final six-case A/B passed all recovered-equilibrium and reusable/core gates, with gravity unchanged.

Mismatch-count changes were intentionally modest:

- `L2`: `0/34/4 -> 0/33/4`
- `L3`: `6/57/87 -> 6/56/87`
- `L4`: `0/33/0 -> 0/33/0`
- `L5`: `3/64/44 -> 3/63/44`
- `L6`: `0/11/12 -> 0/10/12`
- `L14`: `6/57/87 -> 6/56/87`

The correction was retained because the coefficient came from independent CAESAR authority and the local replay signature was strong, not because it optimized counts.

### Explicit non-success example

Node 22140 `RX` was not fixed by the rigid shear correction and slightly worsened:

- reference: about `2.0458e-6 rad`
- pre-correction: about `7.1372e-7 rad`
- post-correction: about `6.4148e-7 rad`

That row is therefore explicitly excluded as an acceptance argument. It remains part of the next root-cause investigation.

---

## G. Rejected or ruled-out hypotheses

### Pressure maximum excluding hydro pressure

A candidate using only `PRESSURE1..9` for Pmax instead of including hydro pressure produced mixed changes and worsened paired bend moments. It was rejected and not promoted.

### Gravity magnitude / bend gravity centroid

The L2 total vertical reaction already matched CAESAR at roughly 0.002%. Source-by-source gravity weights also matched closely.

For the first high-signal bend, source 5:

- CAESAR source resultant weight: about `2008.3516 N`,
- LFEA: about `2008.3594 N`,
- inferred CAESAR x-centroid and exact LFEA curved-arc centroid differed only by micrometres.

Therefore source-5 error was not caused by gravity magnitude or lever arm.

### Uniform rigid-weight placement as the remaining edge-rigid defect

With the accepted rigid shear active, inverse replay of sources 76 and 79 would require large self-equilibrated horizontal force pairs to reproduce CAESAR exactly. A uniform gravity line load cannot generate those pairs.

The raw ACCDB also confirms user-entered rigid weight and length, and CAESAR reports rigid weight on a line-weight basis. The remaining edge-rigid error is therefore not being treated as a gravity-weight tuning target.

### `Rigid Type = Flange` as a special stiffness law

The two edge rigids are labeled `Flange`, while the two middle rigids are `Unspecified`. However, CAESAR documentation treats Rigid Type as graphical/database metadata rather than a different structural stiffness law. No flange-only stiffness rule will be invented from that correlation.

---

## Current mechanics state

The current accepted physical formulation includes:

- B31J smooth-90 bend flexibility,
- CAESAR straight-pipe transverse shear with `kappa=0.5`,
- MEC-21 bend-arc transverse shear,
- combined Bourdon translation and rotation,
- pressure-stiffening qualification already retained in the PR evidence,
- topology-qualified directional B31J tee flexibility,
- CAESAR rigid artificial-section stiffness with straight-pipe transverse shear,
- ten-cylinder reducer condensation authority,
- common global stiffness operator across the governed linear cases,
- six-DOF recovered equilibrium verification.

The current production head for this mechanics state is:

```text
ed6d61b810ebf311079eefe9d8f31cee0f7795f8
```

---

## Remaining known problem areas

### 1. Edge-rigid stiffness/kinematics, sources 76 and 79

This is the immediate next local-mechanics problem.

Observed signature:

- sources 76/77 have the same pipe section and axis,
- sources 79/78 have the same pipe section in the orthogonal direction,
- the approximately 149 mm edge rigids retain large replay residuals,
- the approximately 300 mm middle rigids nearly close after rigid shear.

This length-sensitive signature suggests a missing short-rigid stiffness/kinematic detail, not a special `Flange` material law and not rigid gravity magnitude.

The next discriminator should compare the exact CAESAR rigid matrix terms against the assembled artificial-section matrix, especially the shear-area basis and short-member coupling terms, without changing weights or benchmark rows.

### 2. Reducer source 75

The rigid-region replay also localized a nontrivial incompatibility in the reducer immediately adjacent to the rigid chain. Reducer mechanics should be revisited only after the remaining rigid edge behavior is separated, so one mechanism is not allowed to compensate another.

### 3. Pressure primitive after rigid closure

Once rigid/reducer local stiffness is stable, return to `L4 = P1` mechanisms in this order:

1. effective pressure area / pressure thrust,
2. bend pressure-stiffening magnitude and application,
3. reducer pressure behavior,
4. rigid pressure behavior.

The combined Bourdon field is already retained and should not be decomposed again unless new authority contradicts it.

### 4. Thermal primitive remains authority-limited

`L3` and `L14` still share a provisional thermal expansion coefficient. The current coefficient `11.7e-6/K` is marked guessed/provisional pending authoritative CAESAR 14 material/alpha output for A106 Gr B over the actual 21 C to 120 C range.

Thermal rows should not be used to fit a shared mechanics coefficient while alpha remains unresolved.

### 5. Tee effective coupling remains a possible shared-stiffness follow-up

The topology-qualified tee work currently uses directional B31J end springs. CAESAR/B31J documentation discusses simultaneous/effective run and branch stiffness coupling. If thermal/shared-stiffness residuals remain after rigid/reducer closure, the tee formulation should be audited for effective simultaneous coupling rather than independent elementary springs.

---

## Future roadmap

### Phase 1 — Finish the rigid-region local mechanics

1. Re-run source replay on 76–79 from the committed rigid-shear head.
2. Extract exact local/global axes, geometry, section properties, `phi` terms, and matrix sub-blocks.
3. Compare short edge rigids against long middle rigids using dimensionless stiffness terms rather than benchmark percentage error.
4. Test one authority-backed short-rigid kinematic/shear hypothesis at a time.
5. Require:
   - LFEA self replay closes,
   - CAESAR endpoint replay improves in the predicted rigid sources,
   - gravity resultant and first moment remain unchanged,
   - six-DOF equilibrium passes,
   - no unrelated primitive-case signature appears.

### Phase 2 — Requalify reducer source 75

1. Replay reducer source 75 at CAESAR endpoint motions.
2. Compare the ten-cylinder condensed local matrix to CAESAR source actions.
3. Audit tapered-section shear, axial, and bending condensation independently.
4. Preserve reducer gravity and pressure mechanisms as separate A/B dimensions.

### Phase 3 — Close remaining P1 mechanics

Use `L4` as the primitive discriminator and propagate accepted changes through `L5/L6` using the load-case identities.

Prioritized order:

```text
pressure thrust / effective area
-> bend pressure stiffening
-> reducer pressure behavior
-> rigid pressure behavior
```

### Phase 4 — Resolve thermal material authority

Acquire authoritative CAESAR 14 alpha/material output for the model temperature range, replace the provisional coefficient with a source-backed value, then rerun `L3` and `L14` together.

### Phase 5 — Final qualification and cleanup

1. Run all six governed cases from the exact committed head.
2. Prove:
   - `L6 = L2 + L4`,
   - `L5 = L2 + L3 + L4`,
   - `L14 = L3`,
   - one common stiffness operator where physically required,
   - system equilibrium,
   - element recovered equilibrium,
   - source FROM/TO lineage,
   - deterministic output.
3. Remove temporary diagnostic workflows whose evidence has been captured.
4. Retain permanent authority checks and accepted A/B evidence JSON.
5. Stop on physical correctness rather than forcing every near-zero benchmark row to look numerically attractive by tuning.

---

## Key evidence files on PR #1000

The PR contains permanent and diagnostic evidence including, among others:

- `benchmarks/LFEA/CAESAR_ACCDB/bm4l-fresh-smooth90-straight-shear-sequence.json`
- `benchmarks/LFEA/CAESAR_ACCDB/bm4l-fresh-straight-shear-ab.json`
- `benchmarks/LFEA/CAESAR_ACCDB/bm4l-production-mec21-bend-shear-qualification.json`
- `benchmarks/LFEA/CAESAR_ACCDB/bm4l-pressure-stiffening-p1-qualification.json`
- `benchmarks/LFEA/CAESAR_ACCDB/bm4l-bend-bourdon-translation-rejection.json`
- `benchmarks/LFEA/CAESAR_ACCDB/bm4l-tee-authority-audit.json`
- `benchmarks/LFEA/CAESAR_ACCDB/bm4l-rigid-shear-ab.json`
- `scripts/lfea-m047-caesar-straight-pipe-shear-authority-check.mjs`
- `scripts/lfea-m047-mec21-bend-shear-authority-check.mjs`
- `scripts/lfea-m047-caesar-rigid-shear-authority-check.mjs`

These files are intended to make the accepted mechanics reviewable without relying on a narrative claim or on final failure counts alone.

---

## Summary

The major progress in PR #1000 is not a benchmark-fit sequence; it is a progressively better identification of which CAESAR physical formulation each source topology is using.

The strongest accepted improvements so far are:

1. correct B31J smooth-90 flexibility,
2. CAESAR straight-pipe shear area `A/2`,
3. separate MEC-21 bend-arc shear treatment,
4. retention of combined Bourdon translation + rotation,
5. CAESAR rigid artificial-section shear using the same pipe matrix.

The present blocker is localized rather than global: short edge rigids 76/79 and the adjacent reducer retain local CAESAR-endpoint replay incompatibility. That is the next target, followed by the remaining pressure primitive mechanisms and finally the thermal material-authority closure.
