# PR #1001 Work Report — M047 BM4_L CAESAR/LFEA Parity

**Repository:** `reallaksh19/Advanced_Analysis`  
**Pull request:** #1001 — `M047: clean BM4_L qualification and accepted CAESAR mechanics`  
**Branch:** `agent/m047-bm4l-clean-qualified`  
**Issue:** #991  
**Status:** active; benchmark still fails the final literal all-row `<10%` target.  
**Workflow policy after 2026-08-10 15:32 UTC:** local/offline checks only unless the user explicitly authorizes GitHub Actions. No later investigation described below relies on a newly triggered Actions qualification.

---

## 1. Objective and non-negotiable rules

M047/BM4_L must reproduce the selected linear CAESAR II benchmark closely enough that every governed comparison row satisfies the literal acceptance rule for:

- `L2 = W`
- `L3 = T1`
- `L4 = P1`
- `L5 = W + T1 + P1`
- `L6 = W + P1`
- `L14 = L5 - L6 = T1`

The objective covers restraint forces/moments, nodal displacement/rotation, and source-element global FROM/TO end actions.

The work remains root-cause driven. Benchmark counts are measurements, not fitting targets. Do not mutate references, signs, row selection, source bytes, tolerances, case formulas, or zero-reference gates to improve the result. One physical hypothesis is changed per controlled iteration. A numerical improvement is promotable only when its physical mechanism is independently authoritative and its predicted component/case signature matches the observed movement.

The permanent recovery identity is:

```text
q = K u - f_fixed - f_initial
```

and the selected linear identities are:

```text
L6  = L2 + L4
L5  = L2 + L3 + L4
L14 = L5 - L6 = L3
```

---

## 2. Governed source custody

### 2.1 ACCDB

Pinned BM4_L source:

- Common commit: `45d51ea18624f5775805f399110c1738301c0d90`
- `BM4_L.zip` SHA-256: `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`
- ZIP size: `582488` bytes
- member: `BM4_L.ACCDB`
- authorized member SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`

The earlier `e21b...` ACCDB hash is contradicted by the pinned archive member and is not used as authority. The retained read-only Microsoft ACE workflow proved source access does not mutate the authorized member bytes.

### 2.2 Exact pinned CAESAR reports supplied by the user

Use these two files directly as benchmark-specific CAESAR authority:

- `https://github.com/reallaksh19/Common/blob/179c4831cf521cf797c13699cfbbd118315c9244/LFEA/BM4/Miscdata_BM4_L.txt`
- `https://github.com/reallaksh19/Common/blob/179c4831cf521cf797c13699cfbbd118315c9244/LFEA/BM4/Loadcasereport_BM4_L.txt`

Pinned Common commit: `179c4831cf521cf797c13699cfbbd118315c9244`.

The reports identify CAESAR II `Ver.14.00.00.0910 (Build 231113)` and independently establish:

```text
L2  W          EC, friction multiplier 0
L3  T1         EC, friction multiplier 0
L4  P1         EC, friction multiplier 0
L5  W+T1+P1    EC, friction multiplier 0
L6  W+P1       EC, friction multiplier 0
L14 L5-L6      ALG combination
```

The Misc report provides bend factor pairs and tee intersection data. Important rows include:

```text
Tee 20160, Type 2.1
Srf.Node 20161
D = 254.737 mm, T = 18.263 mm
FLEXb in-plane = 1.294
Kb in-plane = 1.283E+06 N.m/deg

Tee 20295, Type 2.1
Srf.Node 20296
D = 157.302 mm, T = 10.973 mm
FLEXb in-plane = 1.323
Kb in-plane = 2.877E+05 N.m/deg
```

The same report also prints Type 2.6 branch entries whose branch flexibility is unity and prints the governed bend SIF/flexibility pairs.

---

## 3. Accepted mechanics already on PR #1001

The clean PR reconstructed accepted mechanics without reusing contaminated PR #992 ancestry.

### 3.1 B31J smooth-90 bend flexibility

The governed smooth-90 treatment is used rather than the older generic bend coefficient when the profile authority enables it.

### 3.2 Straight-pipe Timoshenko shear

CAESAR pipe-beam authority maps the shear coefficient of 2 into the LFEA kernel as:

```text
kappaY = kappaZ = 0.5
```

This removed large straight-pipe response errors. One retained high-signal example was node `20090 UY`, where the support result moved from roughly `-446.039 N` to `-212.432 N` against a `-197.260 N` reference.

### 3.3 Finite CAESAR default restraint stiffness

Blank CAESAR restraint stiffness is represented through the large finite defaults rather than exact DOF elimination. In BM4_L displayed units this resolves approximately to:

```text
translation = 1.0e14 N/m
rotation    = 5.729577951e13 N.m/rad
```

### 3.4 Matching-pipe rigid-element shear

The qualified CAESAR rigid-element path uses matching-pipe-style stiffness with the accepted Timoshenko treatment. The repository authority for rigid stiffness uses ten times the entered wall thickness for the stiffness section, separate from physical weight treatment.

### 3.5 Directional B31J tee flexibility and Kb parity

Welding tees use directional rotational springs and CAESAR surface-node geometry. Independent report comparison showed close elementary Kb parity:

- tee `20160`: about `0.034%` relative difference
- tee `20295`: about `0.078%` relative difference

The tiny tee-20295 nominal geometry mismatch is not used to relax the generic B31J calculator.

### 3.6 P1 bend pressure stiffening

The pinned Misc report selected P1 as the benchmark-specific bend pressure-stiffening pressure. This reduced the governed external objective from approximately `494 -> 444`.

### 3.7 Reducer-cylinder Timoshenko shear

The ten-cylinder concentric reducer model uses the same qualified pipe shear formulation in each cylinder. The ten-cylinder count is authoritative; the exact representative section sampling location remains provisional. This layer reduced the objective approximately `444 -> 435`.

---

## 4. Last CI-qualified retained state before local-only mode

The last fully checked instrumentation state before the no-Actions instruction retained the permanent source/recovery/operator evidence and the external benchmark at **435 failures**.

Current governed external triples at that baseline were:

| Case | restraint / displacement-rotation / source-end action |
|---|---:|
| L2 | `0 / 29 / 2` |
| L3 | `3 / 43 / 75` |
| L4 | `0 / 34 / 6` |
| L5 | `3 / 53 / 44` |
| L6 | `0 / 10 / 12` |
| L14 | `3 / 43 / 75` |

Totals:

```text
restraint               9
displacement/rotation  212
source-end action      214
external total         435
```

A qualification artifact also contains derived incident-equilibrium comparison rows; including those produces 505 comparison failures. The durable project headline remains **435 external objective failures**.

---

## 5. Bend instrumentation and what it actually proved

Permanent instrumentation condenses all 12 production bend chains to effective near/far operators and decomposes L3/L14 residuals into physical modes. L3/L14 decompositions agree exactly.

Originally this made the curved-bend operator look like the dominant remaining mechanism. Bend 1/source 5 had a large local correction, about `3.48 kN` axial plus `465 N.m` in-plane bending, and bend 9/source 43 was selected as the independent falsification case.

Additional diagnostic-only work then established:

1. an Intergraph/CAUx MEC-21 `BEND_AXIAL_SHAPE=FALSE` planar flexibility fixture can be reproduced;
2. the centroidal `R/(EA)` axial contribution can be derived independently by Castigliano;
3. BM4_L bend source values yield MEC-21 shear factors from exact ACCDB-derived section/material data rather than residual fitting;
4. the CAUx two-node matrix and published unit-displacement reaction columns can be reproduced when the correct tangent frames and rigid-body moment arm are used.

### 5.1 Rejected bend promotion

Once stiffness and thermal free movement were coupled consistently and the coordinate convention was corrected, the result was decisive:

- continuous curved bending alone was almost neutral/slightly beneficial;
- adding MEC-21 transverse shear regressed L3 strongly;
- adding the derived axial-shape TRUE contribution regressed it further;
- at predeclared bends 1 and 9 the MEC-21 shear/TRUE action corrections pointed mostly opposite the CAESAR-required correction vector.

Therefore:

**MEC-21 transverse shear and the derived TRUE axial-shape matrix are rejected for BM4_L production promotion in their tested form.**

Do not revive them because an earlier, coordinate-inconsistent diagnostic appeared promising.

---

## 6. Residual clustering after bend rejection

Clustering the remaining L3 source-action failures showed the dominant large errors were not on bend source elements:

- only about 14/75 L3 action failures were bend-source rows;
- a high-value cluster was tee-adjacent, especially around welding tee 20160 and its run/branch spans.

This moved the investigation from bend stiffness to B31J surface-node kinematics.

---

## 7. Tee geometry experiments and the benchmark-fitting trap

A deliberately diagnostic centerline model—removing the surface rigid offset and using the full centerline branch span while keeping Kb unchanged—improved L3 dramatically. Applying it to both Type 2.1 welding tees produced roughly `121 -> 48` external L3 failures.

That candidate is **rejected** because it contradicts CAESAR's B31J surface-node/fictitious-rigid convention. A large count improvement is not authority.

Kb scaling was also tested diagnostically and was essentially flat; the large improvement did not come from rotational Kb magnitude.

---

## 8. High-value newly isolated mechanism: thermal growth of the B31J fictitious rigid

The production tee representation currently applies the centerline-to-run-surface member as an exact rigid offset. That carries stiffness kinematics but no independent free thermal growth.

CAESAR's B31J geometry uses a fictitious rigid member from the centerline node to the Surface Node. The repository already contains a qualified CAESAR rigid-element authority in which rigid members participate in thermal expansion, while rigid weight handling is separate.

This suggested a single-factor test:

> keep the existing tee stiffness operator, surface location, Kb values, source geometry and all W/P mechanics unchanged; add only the thermal free movement of the existing centerline-to-surface rigid offset.

For a thermal strain `epsilon`, the extra free translation at the branch surface is the rigid-offset vector scaled by strain:

```text
g_thermal = epsilon * r_surface
```

and must enter the element free-state/initial-load relation consistently; it is not a stiffness change.

### 8.1 Offline result of thermal-growth-only isolation

Using only this inhomogeneous rigid-offset thermal movement, with **no change to K**, produced approximately:

| Case | baseline external | tee rigid thermal growth only |
|---|---:|---:|
| L2 = W | 31 | 31 |
| L3 = T1 | 121 | 37 |
| L4 = P1 | 40 | 40 |
| L5 = W+T1+P1 | 100 | 43 |
| L6 = W+P1 | 22 | 22 |
| L14 = T1 | 121 | 37 |
| **Total** | **435** | **210** |

This is a strong mechanism signature:

- W-only response is unchanged;
- P1-only response is unchanged;
- T1 and every combination containing T1 improve strongly;
- the common stiffness operator remains unchanged;
- L3/L14 identity remains preserved.

A separate finite-10x-wall rigid-stiffness experiment showed that stiffness is a second-order effect here. The major improvement comes from the **thermal free growth**, so the production iteration must add thermal growth alone first rather than combine it with a new stiffness representation.

### 8.2 Interpretation of remaining L3 actions

After the thermal-growth-only correction, the large L3 source-action mismatch family largely disappears. The remaining action failures are predominantly literal near-zero/threshold-scale rows; in the offline reconstruction the largest remaining force miss was below 1 N and the largest remaining moment miss was around the sub-1-N.m scale.

This materially changes the search problem: after tee thermal growth, another broad stiffness change is not justified by the remaining L3 action evidence.

---

## 9. Load-case decomposition after tee thermal growth

The pinned CAESAR references satisfy the expected linear identities to report precision. Remaining L5 errors are not combination-semantics errors.

For major residual rows, the signed L5 error is dominated by the remaining T1 error. Example diagnostic decomposition at node 20350 UY was approximately:

```text
W contribution error     +1.8 N
T1 contribution error  +190.9 N
P1 contribution error   -1.35 N
```

so the residual L5 mismatch is primarily thermal, not hidden W/P superposition behavior.

---

## 10. Thermal-expansion authority is now the next blocker

The current profile still uses:

```text
alpha = 1.17e-5 /K
DeltaT = 120 C - 21 C = 99 K
strain = 0.0011583
```

and classifies it as `[GUESSED] PROVISIONAL` because exact CAESAR material-library thermal strain / Print Alphas evidence has not been retained.

Before the tee correction, scalar alpha could not explain the dominant mixed mechanical residual. **After** the tee thermal-growth mechanism is included, thermal-strain precision becomes high leverage.

A diagnostic-only post-tee sweep indicates that scaling T1 by roughly `1.043-1.045` would move total strain to about `0.001208-0.001210` and could reduce the external total from roughly `210` toward `150`, with L5 falling substantially. This is consistent with the Misc report's printed `0.0012` strain precision, but it is **not promotable authority**.

Do not set alpha or total strain from that sweep. Obtain sufficiently precise CAESAR Print Alphas/material-library total strain for the exact `21 C -> 120 C` interval first.

---

## 11. Current promotion decision

### Promotable next mechanics change

**B31J fictitious-rigid thermal free growth only.**

Implementation requirements:

1. preserve the existing CAESAR B31J Surface Node/run-surface location;
2. preserve current directional Kb springs and their qualified values;
3. preserve the current common stiffness matrix/operator;
4. add the centerline-to-surface rigid member's thermal free translation from source thermal strain and the existing surface offset vector;
5. do not add rigid weight;
6. do not add pressure/Bourdon behavior in the same commit;
7. recover actions through the unchanged `q = Ku - f_fixed - f_initial` convention;
8. locally verify all six cases, equilibrium, source mapping and L3/L14 identity before any further mechanics change.

### Explicitly rejected / still blocked

- flexible centerline tee replacement — rejected by CAESAR geometry authority;
- Kb fitting/scaling — rejected; report-parity Kb is already close;
- generic bend softness — forbidden;
- MEC-21 bend shear promotion in tested form — rejected by falsification cases;
- derived axial-shape TRUE matrix in tested form — rejected for BM4_L promotion and still lacks direct TRUE authority;
- fitted thermal alpha/strain — forbidden;
- reducer sampling tuning — authority blocked;
- tolerance/row/reference changes — forbidden.

---

## 12. Next roadmap

1. **Implement and locally test tee fictitious-rigid thermal growth only.**
2. **Acquire exact CAESAR thermal-expansion authority** for A106 Grade B, 21 C -> 120 C. Replace the provisional alpha only from that authority.
3. Re-profile the remaining failures after those two items. Expect the remaining L3 source-action family to be predominantly near-zero precision/threshold rows rather than mechanics-scale discrepancies.
4. Revisit reducer sampling only if an external CAESAR authority identifies the representative section location.
5. Resolve tee 20295 nominal-geometry compatibility only if still material after thermal closure; keep it adapter-local and fail-closed.
6. Address literal zero-reference rows last without changing acceptance thresholds.
7. Run GitHub Actions only when explicitly authorized by the user; until then use local/offline checks and report their provenance separately from CI-qualified evidence.

---

## 13. Rules for future agents

1. Re-fetch PR head before every write; stack additive commits and never force-push unknown history.
2. Do not modify Issue #991 unless the user explicitly asks.
3. Keep one physical hypothesis per mechanics commit.
4. Do not fit alpha, flexibility, pressure, sampling, signs or tolerances to benchmark outputs.
5. Separate `external objective` failures from derived equilibrium-comparison rows when reporting counts.
6. Preserve source/report custody and exact pinned Common references.
7. Count improvement alone is never acceptance; require authority and predicted signature.
8. Do not trigger or rerun GitHub Actions while the user has requested local-only checking.

---

## 14. Current conclusion

The clean workstream reduced the external BM4_L objective from approximately `1342` failures to `435` with qualified pipe/reducer/rigid/support/bend/tee mechanics. The later local-only investigation then falsified the previously dominant MEC-21 bend-shear hypothesis and identified a stronger, authority-consistent omission in the B31J tee surface-node kinematics: **thermal free growth of the fictitious centerline-to-surface rigid member**.

Adding that one free-state mechanism locally, without changing stiffness or Kb, reduces the external benchmark approximately `435 -> 210` and specifically improves T1-containing cases while leaving W/P primitives essentially unchanged. That is the next production change.

After it, exact CAESAR thermal-expansion provenance becomes the dominant authority gap. A fitted alpha remains prohibited even though diagnostic sensitivity shows it could materially reduce the remaining error.

The benchmark is not closed, but the next two steps are now sharply defined: **tee fictitious-rigid thermal growth first; exact Print Alphas authority second.**