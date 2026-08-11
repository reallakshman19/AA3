# PR #993 Work Report — M047 BM4_L Root-Cause Qualification

**PR:** #993 — `M047: diagnose BM4_L primitive mechanics and end-action lineage`  
**Branch:** `agent/m047-bm4l-root-cause-991`  
**Issue:** #991  
**Status:** Draft / active investigation  
**Report date:** 2026-08-10

---

## 1. Executive summary

PR #993 is a root-cause qualification effort for the BM4_L CAESAR II benchmark. The target is not to make the benchmark look better by changing tolerances or fitting constants; the target is to reproduce the mechanics and reporting conventions that CAESAR actually used, while keeping source custody, equilibrium, primitive-case identities, and result lineage auditable.

The investigation started from the reproducible pre-correction state of **1,342 targeted >10% failures** across L2/L3/L4/L5/L6/L14. The historical PR #988 result contains one additional L6 threshold row (1,343); this report keeps that historical count separate from the reproducible 1,342 baseline.

Four corrections have been retained because each is backed by independent CAESAR/B31J source authority rather than selected from the benchmark residuals:

1. CAESAR II 14 B31J smooth-90 flexibility: `1.3/h`.
2. CAESAR-reported T1 total thermal strain plus `Elastic Modulus = EC` authority.
3. Bend pressure stiffening based on operating P1 = 11.6 MPa, as demonstrated directly by CAESAR's Bend Report FLEX/SIF ranges.
4. B31J tee rotational stiffness using mean diameter rather than outside diameter.

These corrections moved the canonical retained result from **1,342 to 788 failures**, a reduction of **554 failures (~41.3%)**, with recovered six-DOF equilibrium preserved.

A later diagnostic found a much larger potential improvement when ordinary non-bend pipe spans use Timoshenko transverse-shear compliance. A per-section Cowper hollow-circle correction reduced the diagnostic result to about **379 failures**, but this is **not retained** because a CAESAR-II-specific shear-area/correction rule has not yet been established from authoritative CAESAR documentation or exported model settings.

The current engineering position is therefore:

> **788 is the canonical retained state. ~379 is a high-value mechanics candidate, not an accepted correction.**

---

## 2. Objective and acceptance philosophy

Issue #991 requires literal CAESAR-vs-LFEA comparison below 10% for the linear frictionless cases:

- L2 = W
- L3 = T1
- L4 = P1
- L5 = W + T1 + P1
- L6 = W + P1
- L14 = L5 - L6 = T1

The compared result families are:

- restraint reactions: UX/UY/UZ/RX/RY/RZ;
- nodal translations and rotations;
- all source-element global outer-end FX/FY/FZ/MX/MY/MZ actions.

### Core concept: qualify mechanics, do not fit the benchmark

Every retained change must satisfy four conditions:

1. **Independent authority** — a source, equation, CAESAR report, code rule, or model setting explains why the change is correct.
2. **Predicted signature** — the cases and DOFs expected to move are known before examining the comparison count.
3. **Physical invariants** — equilibrium, recovery consistency, and primitive superposition remain valid.
4. **No benchmark fitting** — no reference-value scaling, tolerance changes, hand-tuned constants, or cancellation-driven adjustments.

A lower failure count is evidence only after the mechanics are independently justified.

---

## 3. Source custody and authority

### 3.1 Pinned model source

The model source is retained from Common:

- Common source commit: `45d51ea18624f5775805f399110c1738301c0d90`
- file: `LFEA/BM4/BM4_L.zip`
- Git blob: `df119ae1b8272469b6204036ab1aff21e561dfb8`
- ZIP SHA-256: `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`
- ZIP size: 582,488 bytes
- sole member: `BM4_L.ACCDB`
- pristine extracted ACCDB SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`
- ACCDB size: 5,136,384 bytes

The earlier declared extracted hash `e21b0862...` could not be reproduced. Independent .NET and `tar.exe` extraction both produced `64c05a50...`. A signed Microsoft ACE 2016 reproduction then demonstrated that opening/exporting the database did **not** transform `64c05a50...` into `e21b0862...`.

### Concept

A benchmark cannot be qualified against an input whose identity is unclear. Source custody is therefore a mechanics prerequisite, not administrative overhead.

### Example

The workflow verifies, in order:

```text
Common commit
  -> Git blob
  -> ZIP SHA/size
  -> sole member inventory
  -> extracted ACCDB SHA/size
  -> ACE-backed export
  -> solve
```

A failure at an earlier custody stage blocks the later solve rather than silently substituting XML or a sibling archive.

### 3.2 Added CAESAR reports

Common commit `179c4831cf521cf797c13699cfbbd118315c9244` adds:

- `LFEA/BM4/Miscdata_BM4_L.txt`
- `LFEA/BM4/Loadcasereport_BM4_L.txt`

The BM4_L ACCDB archive itself is unchanged. These reports became important authority for thermal strain, elastic-modulus selection, bend FLEX/SIF ranges, and tee FLEX/K values.

---

## 4. Baseline and numerical integrity

### 4.1 Reproducible pre-correction baseline

| Case | Restraint | Disp/rot | End actions | Total |
| --- | ---: | ---: | ---: | ---: |
| L2 | 4 | 115 | 142 | 261 |
| L3 | 9 | 98 | 179 | 286 |
| L4 | 6 | 66 | 86 | 158 |
| L5 | 3 | 72 | 162 | 237 |
| L6 | 1 | 64 | 49 | 114 |
| L14 | 9 | 98 | 179 | 286 |
| **Total** | **32** | **513** | **797** | **1,342** |

### 4.2 Numerical integrity checks established before mechanics tuning

The investigation first cleared the result pipeline:

```text
assembly -> solve -> element recovery -> transform/sign -> source mapping -> comparison
```

The following were established:

- six-DOF recovered equilibrium passes controlled runs;
- element recovery follows `q = K*u - f_fixed - f_initial`;
- independent local and assembled-global element recovery agree to numerical noise;
- source-element first/last descendant mapping produces zero mapping delta on failed end-action rows;
- primitive identities are preserved:
  - `L6 = L2 + L4`
  - `L5 = L2 + L3 + L4`
  - `L14 = L3` physically;
- source/result coverage is deterministic.

### Concept

Before changing mechanics, prove that an error is not merely introduced by reporting or result recovery. Otherwise the project can waste time “fixing” stiffness to compensate for a sign, transform, or source-mapping error.

---

## 5. Gravity qualification — L2

L2 was investigated first because it is the clean W primitive.

### Findings

- Total vertical reaction already agreed extremely closely with CAESAR: approximately 93.512 kN vs 93.511 kN.
- Gravity resultants reconstructed from CAESAR end actions matched source-element physical weights.
- Bend gravity first moments/centroids agreed to small absolute moment residuals.
- Apparent straight-span free-body anomalies were explained by CAESAR bend tangent/far-point node geometry: bend construction relocates analysis stations to tangent points.
- Bend mesh refinement from roughly 5° to 2.5° to 1.25° did not materially change the mismatch count (`261 / 261 / 260`).

### Concept

If the total applied gravity is already right, rescaling weight is physically unjustified. The remaining error must be sought in stiffness, geometry, support behavior, or load moment arm — not in a convenient gravity multiplier.

### Example

A straight span adjacent to a bend initially appeared to place its gravity resultant outside the physical source length. After using the tangent-adjusted analysis length, the free-body moment balanced. That converted an apparent load-placement bug into a geometry-convention clarification.

**Outcome:** gravity magnitude/ownership and bend tangent geometry are cleared as dominant causes.

---

## 6. Retained correction 1 — B31J smooth 90° flexibility

### Authority

For CAESAR II 14, B31.3-2022, with B31J applied by default, the smooth 90° bend flexibility expression is `1.3/h` rather than the older `1.65/h` form.

### Retained change

The BM4_L profile authority was changed from unresolved/OFF to resolved/ON for the smooth-90 correction.

Retained commit:

`b03350a11c5e44791c815830cedd5627fbe63ea4`

### Result

```text
1,342 -> 828
```

### Concept

This was retained because the CAESAR version/code combination independently establishes the coefficient. The large numerical improvement is supporting evidence, not the reason for the change.

### Example

On L2 the first A/B produced:

```text
261 total -> 243
end actions: 142 -> 110
restraints:   4 -> 3
disp/rot:   115 -> 130
```

The mixed result was initially not retained because authority was unresolved. Once CAESAR 14/B31J authority was established, the same change became valid even though some displacement rows regressed.

---

## 7. Retained correction 2 — CAESAR thermal strain and EC authority

### Authority from Common reports

`Miscdata_BM4_L.txt` reports total expansion strain:

- T1 = `0.0012`
- T2 = `0.0008`
- T3 = `-0.0002` mm/mm

`Loadcasereport_BM4_L.txt` reports `Elastic Modulus: EC` for L2-L6; L14 is algebraic `L5-L6`.

### Retained representation

For T1, the current adapter represents CAESAR's reported total strain by a clearly marked derived equivalent over the 21°C -> 120°C interval:

```text
alpha_equivalent = 0.0012 / (120 - 21)
```

This is **not** claimed as a universal A106-B CTE. It is a representation of the source-reported T1 total expansion strain.

Retained commit:

`6872d024ca51eb073c6d30279fa8fab5c984a358`

### Predicted signature

Only thermal-bearing cases were allowed to change:

- L3 changes;
- L14 changes identically to L3;
- L5 changes through its T1 component;
- L2/L4/L6 must remain unchanged.

That signature passed.

### Result

```text
828 -> 811
```

### Concept

Use total expansion strain reported by CAESAR rather than inventing a material coefficient. This preserves CAESAR's material-database behavior and keeps the authority tied to the actual model report.

---

## 8. Retained correction 3 — bend pressure stiffening uses P1

### Discovery

BM4_L contains:

- operating P1 = 11,600 kPa;
- hydro pressure = 22,035 kPa.

The previous implementation used a `MAX_DEFINED` rule that included hydro, making every bend too pressure-stiffened.

### Direct CAESAR-factor qualification

`Miscdata_BM4_L.txt` contains CAESAR bend FLEX/SIF ranges for all 12 bends.

For every bend:

- zero pressure reproduces the reported FLEX/SIF maximum;
- P1 = 11.6 MPa reproduces the reported pressure-stiffened minimum;
- hydro = 22.035 MPa produces a factor that is too stiff.

### Example — bend node 20120

```text
CAESAR FLEX range:        2.898 -> 3.031
LFEA at P1:               ~2.89817
LFEA at zero pressure:    ~3.03097
old hydro/max rule:       ~2.78828
```

That is direct mechanics evidence, independent of the benchmark failure count.

Retained commit:

`67dd899cb22650a02ffa763a66eec1e5806ba4b9`

### A/B result from 811

| Case | Before | P1 | Delta |
| --- | ---: | ---: | ---: |
| L2 | 243 | 225 | -18 |
| L3 | 115 | 131 | +16 |
| L4 | 126 | 120 | -6 |
| L5 | 125 | 98 | -27 |
| L6 | 87 | 88 | +1 |
| L14 | 115 | 131 | +16 |
| **Total** | **811** | **793** | **-18** |

### Concept

A source-backed correction can legitimately worsen some benchmark rows. Here, thermal rows regressed because the prior over-stiffening was masking another discrepancy. The correct factor is retained because the CAESAR Bend Report proves it.

---

## 9. Retained correction 4 — B31J tee mean-diameter rotational stiffness

### Authority

The CAESAR Misc report provides exact tee/intersection FLEX and K values. B31J characteristic diameters are mean diameters:

```text
D = Do - T
d = do - t
```

Production already calculated the two active Type 2.1 welding-tee FLEX values correctly, but converted FLEX to rotational spring stiffness with outside diameter.

The spring relation is:

```text
K = EI / (k * d)
```

where `d` must be the matching-pipe mean diameter.

### Examples

Node 20160:

```text
LFEA FLEX:            1.29388
CAESAR FLEX:          1.294
OD-based K:           ~1.198E6 N.m/deg
mean-diameter K:      ~1.283E6 N.m/deg
CAESAR K:             1.283E6 N.m/deg
```

Node 20295:

```text
LFEA FLEX:            1.32144
CAESAR FLEX:          1.323
OD-based K:           ~2.692E5 N.m/deg
mean-diameter K:      ~2.879E5 N.m/deg
CAESAR K:             2.877E5 N.m/deg
```

The Type 2.6 intersections are correctly not given active B31J flexibility because CAESAR reports their user-overridden FLEX as 1.000.

Production fix commit:

`78652ac554dd4f1f4a6c230b891122bd9386077a`

### Result

```text
793 -> 788
```

The small numerical improvement is secondary; direct reproduction of CAESAR's K values is the qualifying evidence.

---

## 10. Canonical retained state — 788

The canonical retained benchmark is pinned to exact implementation/profile commit:

`78652ac554dd4f1f4a6c230b891122bd9386077a`

with Common authority commit `179c4831cf521cf797c13699cfbbd118315c9244` and pristine ACCDB `64c05a50...`.

| Case | Restraint | Disp/rot | End actions | Total |
| --- | ---: | ---: | ---: | ---: |
| L2 | 3 | 124 | 100 | 227 |
| L3 | 4 | 49 | 76 | 129 |
| L4 | 5 | 50 | 65 | 120 |
| L5 | 0 | 46 | 51 | 97 |
| L6 | 2 | 58 | 26 | 86 |
| L14 | 4 | 49 | 76 | 129 |
| **Total** | **18** | **376** | **394** | **788** |

Canonical run:

- run `31374871802`
- artifact `9057530558`
- artifact digest `sha256:44476eab1bcea158218f1277ff22e8c630e96497a95dfdf4f766131caf622e88`

Net retained improvement:

```text
1,342 -> 788
554 fewer targeted failures
~41.3% reduction
```

No tolerance or CAESAR reference values were changed.

---

## 11. Important rejected or cleared hypotheses

Rejecting plausible-but-wrong mechanisms is a major part of the work. Each rejection reduces the search space and prevents future benchmark fitting.

| Hypothesis | Result | Decision / concept |
| --- | --- | --- |
| Disable directional B31J tee flexibility | L2 `261 -> 275` | Reject; active tee flexibility is required. |
| Finite restraint stiffness using governed 1E12 displayed-unit values | L2 `261 -> 261` | Not explanatory at this scale. |
| Replace bend `EI/k` behavior with symmetric rotational end compliance | L2 `261 -> 263` | Reject that spring construction. |
| Refine bend mesh | `261 / 261 / 260` | Chord discretization is converged; more segments are not the fix. |
| Remove rotational Bourdon | L4 `158 -> 1,358` | Rotational Bourdon is essential. |
| Remove reducer P1 elongation | L4 `158 -> 325` | Reducer pressure elongation is required. |
| Use Pmax without hydro before factor authority was known | worsened L2/L4 on old state | Count alone was misleading; later CAESAR FLEX evidence proved P1 is physically correct. |
| Extra uniform bend axial translation added to MEC-21 field | old-state L4 `158 -> 499` | Reject. |
| Same combined Bourdon translation retested from canonical 788 | `788 -> 1,327` | Strong reject; it double-counts the bend translation already represented by MEC-21 opening. |

### Canonical 788 Bourdon retest detail

The retest changed only pressure-bearing cases:

| Case | 788 baseline | Combined translation variant |
| --- | ---: | ---: |
| L2 | 227 | 227 |
| L3 | 129 | 129 |
| L4 | 120 | 448 |
| L5 | 97 | 123 |
| L6 | 86 | 271 |
| L14 | 129 | 129 |
| **Total** | **788** | **1,327** |

Equilibrium still passed; therefore the regression is a mechanics-modeling error, not numerical instability.

The comparison workflow's final L3/L14 JSON-equality assertion failed because it compared complete case objects rather than normalized physical fields. The actual targeted counts remained equal (`129/129`), and the decisive result is the large pressure-case regression.

---

## 12. Residual localization after the retained corrections

After reaching 788, the remaining failures were clustered by source topology and distance from bends.

### Findings

- roughly **72% of L3/L14 failures** are within four source-element hops of a bend;
- roughly **60% of L2 failures** are within four hops of a bend;
- L4 residuals after later diagnostics become heavily rotation-dominated rather than force-equilibrium dominated;
- direct scalar bend FLEX/SIF and tee FLEX/K values are now reproduced, so the residual cannot be explained by simply changing those scalar factors again.

### Concept

Topology localization distinguishes:

- a special fitting/bend formulation problem;
- a global ordinary-pipe element formulation problem;
- a downstream propagation effect.

This is more informative than ranking rows by percent error alone.

---

## 13. High-value diagnostic candidate — ordinary-pipe transverse shear

This is the strongest unresolved mechanics signal in the current investigation.

### 13.1 Constant-kappa discriminators

With the canonical 788 state retained, diagnostic Timoshenko variants produced approximately:

```text
kappa = 0.50, all applicable frame elements: 788 -> 386
kappa = 0.53, all applicable frame elements: 788 -> 376
```

All six recovered-equilibrium checks remained closed.

### 13.2 Ownership split

To determine whether this was really a bend issue, the same compliance was split by element ownership:

```text
bend arcs only:       788 -> 764
non-bend pipe only:   788 -> 369
```

### Interpretation

The missing compliance is overwhelmingly associated with **ordinary pipe/frame spans**, not the B31J bend scalar FLEX implementation.

Adding ordinary transverse-shear compliance to bend arc sub-elements is actually slightly counterproductive, consistent with partial double counting because the bend package already has flexibility corrections.

### 13.3 Cowper hollow-circle candidate

Instead of selecting 0.50/0.53 from benchmark performance, a continuum-mechanics value was derived independently for a hollow circular section using Cowper's Timoshenko correction:

```text
kappa = 6(1+nu)(1+a^2)^2 /
        ((7+6nu)(1+a^2)^2 + (20+12nu)a^2)
```

where `a = Ri/Ro`.

For the principal BM4_L pipe sections, the values are approximately:

```text
0.53498
0.53475
```

A per-section, non-bend-pipe Cowper A/B produced approximately:

```text
788 -> 379
```

with recovered equilibrium passing.

### Why this is NOT retained

The Cowper equation is independent beam theory, but no accessible CAESAR II 14 authority has yet established that CAESAR's metallic pipe element uses this exact shear-area/correction convention.

The current rule is therefore:

> Do not turn a strong benchmark correlation into a CAESAR compatibility claim without CAESAR-specific authority.

The production/canonical state remains 788.

---

## 14. Other source-backed formulation checks completed

### Rigid elements

CAESAR documents rigid-element stiffness using the pipe inside diameter and an effective wall thickness of 10 times the entered wall thickness. The current rigid package already follows this rule, including finite-length frame behavior. This path is cleared at implementation level.

### Tee surface flexibility

The two active Type 2.1 tees already reproduce CAESAR FLEX values and, after the mean-diameter correction, reproduce CAESAR rotational K. Work is continuing on exact surface-node geometry/offset verification because the Misc report exposes CAESAR surface nodes directly.

### Bend axial shape

`BEND_AXIAL_SHAPE=YES` is a real CAESAR behavior. However:

- public documentation explains the behavior qualitatively;
- no implementable full axial-shape/bend stiffness equation has been established;
- BM4_L bends are 90°, while CAESAR documentation highlights the axial-shape effect particularly for 45° and smaller bends.

No residual-derived axial-shape formula will be added.

---

## 15. Engineering concepts demonstrated by this work

### 15.1 Primitive-case diagnosis

Use W, T1, and P1 as independent physical primitives. Combination cases are validation, not tuning targets.

Example:

```text
If a pressure-only change alters L2 or L3, reject it.
If a thermal-only change alters L4 or L6, reject it.
If L14 stops reproducing T1 physics, reject it.
```

### 15.2 Delta signatures

A proposed change should have a predicted topology and case signature before it is run.

Example: the T1 authority update was expected to change L3/L14 and the T1 portion of L5 while leaving L2/L4/L6 untouched. It did exactly that.

### 15.3 Independent factor reconstruction

Whenever CAESAR reports an intermediate mechanics value, reproduce that value directly before judging full-model results.

Examples:

- bend FLEX at node 20120 proved P1 pressure stiffening;
- tee FLEX/K at nodes 20160 and 20295 proved mean-diameter stiffness.

### 15.4 Free-body and equilibrium first

A model can have poor benchmark agreement while still satisfying internal equilibrium. Conversely, a lower percent error with broken equilibrium is not a valid improvement.

Every retained run keeps equilibrium as a hard gate.

### 15.5 Correctness can increase some errors

A source-backed correction may expose a second error that was previously canceled.

Example: changing bend stiffening from hydro-driven to CAESAR's P1 factor improved the total count but worsened L3/L14. It was still retained because CAESAR's reported bend factors directly prove P1 is correct.

### 15.6 No benchmark-derived constants

A dramatic sensitivity is not enough.

Example: non-bend Timoshenko/Cowper compliance can reduce the total from 788 to around 379, but it remains diagnostic until CAESAR's actual shear convention is established.

---

## 16. Current known boundaries

### Source-resolved

- pristine BM4_L ACCDB identity;
- CAESAR II 14 / B31.3-2022 smooth-90 `1.3/h` behavior;
- T1 total expansion strain `0.0012`;
- EC selection for L2-L6;
- L14 algebraic relation;
- bend pressure-stiffening factor range matching P1;
- active tee FLEX and mean-diameter K;
- rigid-element 10x wall stiffness rule;
- rotational Bourdon necessity;
- reducer P1 elongation necessity.

### Cleared as dominant causes

- report/source-element mapping;
- local/global recovery transform;
- gravity total magnitude;
- gravity source ownership;
- bend gravity centroid/first moment;
- bend mesh density;
- finite-restraint stiffness at the governed large values;
- disabling tee flexibility;
- adding an independent uniform bend axial translation on top of MEC-21.

### Still unresolved

- exact CAESAR II 14 transverse-shear formulation/shear area for ordinary metallic pipe elements;
- whether CAESAR's pipe element uses a Cowper-like hollow-circle correction or a different convention;
- full implementable `BEND_AXIAL_SHAPE=YES` formulation;
- any remaining bend/pressure kinematic detail after ordinary-pipe shear is resolved;
- final closure of all literal >10% rows.

---

## 17. Future roadmap

### Phase A — finish source-verifiable geometry checks

1. Reconstruct the exact CAESAR tee surface-node coordinates from `Miscdata_BM4_L.txt`.
2. Compare them against generated LFEA branch surface nodes and rigid offsets.
3. Verify both Type 2.1 tees independently.
4. Retain a geometry change only if the source coordinates prove a mismatch.

**Expected outcome:** either clear tee surface geometry completely or obtain a source-backed local correction.

### Phase B — obtain CAESAR transverse-shear authority

This is the highest-value roadmap item.

Preferred authority paths, in order:

1. CAESAR II 14 Technical Reference / Applications Guide statement of shear area or Timoshenko correction for metallic pipe.
2. Versioned Hexagon documentation or knowledge-base material that states the formulation.
3. A controlled CAESAR II 14 micro-model whose analytical response isolates transverse shear, with exact input and output retained as an authority artifact.

A useful micro-model would be a straight cantilever pipe with a transverse tip force, no bends/fittings, known E/G/section dimensions, and enough length variants to separate Euler bending from shear deflection:

```text
delta_total = P L^3 / (3 E I) + P L / (kappa G A)
```

Multiple lengths allow the `L^3` bending term and `L` shear term to be separated without fitting BM4_L itself.

If CAESAR's isolated result yields a shear coefficient consistent with Cowper, that becomes independent authority for the large 788 -> ~379 candidate.

### Phase C — implement ordinary-pipe shear only if authority is established

If Phase B resolves the convention:

1. implement per-section shear correction from physical section/material data;
2. apply it to ordinary flexible pipe spans;
3. do **not** automatically apply the same compliance to B31J bend sub-elements unless authority requires it;
4. run unit tests for straight-frame shear behavior;
5. rerun L2/L3/L4 first;
6. rerun all six BM4_L cases;
7. verify equilibrium, recovery, and primitive identities;
8. run broader LFEA regressions to detect cross-benchmark leakage.

The diagnostic ownership split predicts the main improvement should occur in non-bend pipe response.

### Phase D — reassess residual topology after the shear decision

After either retaining or rejecting the authoritative shear formulation:

1. regenerate the failure cluster by topology and DOF;
2. rank failures by absolute engineering magnitude as well as literal percent error;
3. inspect the first node/element where the CAESAR-vs-LFEA displacement field diverges;
4. distinguish local generation from downstream propagation.

Do not keep using the current 788 topology after a major global compliance change; the residual map must be regenerated.

### Phase E — pressure-specific residuals

If L4 retains a rotation-dominated residual after ordinary-pipe formulation is settled:

1. trace MEC-21 bend opening rotations by bend plane and tangent orientation;
2. compare source-reported zero global rotations with propagated LFEA rotations;
3. verify local-to-global rotation basis construction at every bend transition;
4. use free-state vectors rather than changing pressure magnitude.

The combined-uniform-translation path is already rejected and should not be revisited unless new authority changes the formulation itself.

### Phase F — bend axial shape only with implementable authority

If a meaningful residual remains concentrated in bends:

1. obtain the CAESAR/Hexagon formula, implementation note, or an independent qualification model that isolates Bend Axial Shape;
2. implement the mode without reference-value fitting;
3. validate against the isolated model first;
4. then run BM4_L.

Do not derive the axial-shape formulation from BM4_L error rows.

### Phase G — acceptance closure

For every final retained mechanics change:

```text
before -> after
fixed rows
new regressions
case signature
absolute-error distribution
equilibrium status
recovery consistency
primitive identities
broader benchmark regressions
```

Issue #991 is complete only when the literal <10% gate is satisfied for the required families/cases or when a remaining source-authority blocker is explicitly documented.

### Phase H — PR cleanup and handoff

Before PR #993 is made ready for review:

1. separate permanent tests/gates from disposable A/B workflows;
2. remove or manual-only old one-off workflows that create CI noise;
3. keep evidence artifacts/run IDs in this report or a compact qualification report;
4. make the retained production diffs easy to review;
5. update the canonical baseline only from an exact implementation commit, never a moving PR merge ref;
6. keep issue #991 untouched unless explicitly requested otherwise.

---

## 18. Suggested next immediate action

The next immediate engineering task is:

> **Finish the exact B31J tee surface-node geometry comparison, then focus on obtaining independent CAESAR II 14 transverse-shear authority.**

Reasoning:

- scalar bend FLEX/SIF is now directly matched;
- tee FLEX/K is now directly matched;
- gravity and result mapping are cleared;
- bend-only shear has weak effect (`788 -> 764`);
- non-bend shear has very large effect (`788 -> 369` diagnostic);
- Cowper-derived non-bend shear gives about `788 -> 379` without a fitted coefficient;
- however, CAESAR-specific authority is still missing, so production must remain at 788 until that gap is closed.

---

## 19. Key reproducibility references

### Retained mechanics/profile commits

- smooth-90 authority: `b03350a11c5e44791c815830cedd5627fbe63ea4`
- T1 strain + EC authority: `6872d024ca51eb073c6d30279fa8fab5c984a358`
- P1 bend stiffening authority: `67dd899cb22650a02ffa763a66eec1e5806ba4b9`
- tee mean-diameter production fix / canonical retained implementation: `78652ac554dd4f1f4a6c230b891122bd9386077a`

### Important retained artifacts

- direct bend-factor evidence: run `31373312577`, artifact `9056951290`
- P1 A/B: run `31373578447`, artifact `9057075962`
- tee mean-diameter A/B: run `31374468031`, artifact `9057399071`
- canonical 788 run: `31374871802`, artifact `9057530558`

### Latest Bourdon rejection evidence

- combined Trans+Rot retest workflow run: `31380476884`
- artifact: `9059696344`
- artifact digest: `sha256:2bac2b080d6f649dee7e264cb45a11d683695f2fa5b978d6582f24d33b3e131d`
- result: `788 -> 1,327`, therefore rejected.

---

## 20. Final status at this report revision

**Canonical retained state: 788 targeted failures.**

The retained corrections are source-backed and preserve equilibrium. The investigation has reduced the original reproducible mismatch count by **554 rows (~41.3%)** without changing comparison tolerances, CAESAR reference values, source input bytes, gravity scaling, or benchmark-specific fitting constants.

The most important unresolved technical question is now ordinary-pipe transverse-shear formulation. Diagnostics indicate that resolving it correctly could remove a large fraction of the remaining mismatch, but it will not be promoted until CAESAR-specific authority is established.

PR #993 remains the active evidence/implementation stack. Issue #991 remains untouched.
