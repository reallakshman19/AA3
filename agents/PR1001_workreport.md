# PR #1001 Work Report — M047 BM4_L CAESAR/LFEA Parity

**Repository:** `reallaksh19/Advanced_Analysis`  
**PR:** #1001 — `M047: clean BM4_L qualification and accepted CAESAR mechanics`  
**Branch:** `agent/m047-bm4l-clean-qualified`  
**Issue:** #991  
**Status:** active; final literal all-row `<10%` target is not yet closed.

**Current execution policy:** after the user instruction on 2026-08-10, do not intentionally trigger or rerun GitHub Actions. New investigation results below are local/offline unless explicitly identified as earlier CI-qualified evidence.

---

## 1. Objective and rules

The governed linear cases are:

```text
L2  = W
L3  = T1
L4  = P1
L5  = W + T1 + P1
L6  = W + P1
L14 = L5 - L6 = T1
```

The objective covers restraint reactions, nodal displacement/rotation, and all source-element global FROM/TO end actions.

The work remains authority-first and root-cause driven. Benchmark counts are measurements, not fitting targets. Do not change references, signs, row selection, source bytes, tolerances, zero gates, or load-case formulas to improve the count. Keep one mechanics proposition per production iteration and retain the recovery identity:

```text
q = K u - f_fixed - f_initial
```

---

## 2. Governed source/report custody

### ACCDB

- Common commit: `45d51ea18624f5775805f399110c1738301c0d90`
- `BM4_L.zip` SHA-256: `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`
- authorized `BM4_L.ACCDB` member SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`

### Exact CAESAR report authority supplied by the user

Pinned Common commit: `179c4831cf521cf797c13699cfbbd118315c9244`.

Use these exact files:

- `https://github.com/reallaksh19/Common/blob/179c4831cf521cf797c13699cfbbd118315c9244/LFEA/BM4/Miscdata_BM4_L.txt`
- `https://github.com/reallaksh19/Common/blob/179c4831cf521cf797c13699cfbbd118315c9244/LFEA/BM4/Loadcasereport_BM4_L.txt`

They identify CAESAR II `14.00.00.0910 (Build 231113)`.

The Load Case Report independently confirms:

```text
L2:  W,        EC, friction multiplier 0
L3:  T1,       EC, friction multiplier 0
L4:  P1,       EC, friction multiplier 0
L5:  W+T1+P1,  EC, friction multiplier 0
L6:  W+P1,     EC, friction multiplier 0
L14: L5-L6,    ALG
```

The Misc report independently provides bend factors, thermal-expansion rows, and tee intersection data. Important Type 2.1 rows are:

```text
Tee node 20160, Srf.Node 20161
D = 254.737 mm, T = 18.263 mm
FLEXb(in-plane) = 1.294
Kb(in-plane) = 1.283E+06 N.m/deg

Tee node 20295, Srf.Node 20296
D = 157.302 mm, T = 10.973 mm
FLEXb(in-plane) = 1.323
Kb(in-plane) = 2.877E+05 N.m/deg
```

The report contains six intersection entries total: the two Type 2.1 tees above plus Type 2.6 entries at nodes `20240`, `21740`, `21800`, and `21850`. In the ACCDB structural topology those Type 2.6 declarations do not resolve as three incident structural legs, so they must not be silently converted into new mechanical tee members merely because they appear in the stress/SIF report.

---

## 3. Accepted mechanics already on the PR

The clean workstream has accepted, with independent authority and qualification evidence:

1. B31J smooth-90 bend flexibility;
2. straight-pipe Timoshenko shear with `kappa=0.5`;
3. finite CAESAR default restraint stiffness;
4. matching-pipe rigid-element shear;
5. directional B31J Type 2.1 tee flexibility with report-parity Kb checks;
6. P1 bend pressure stiffening;
7. Timoshenko shear in the ten reducer cylinders.

These layers reduced the external objective from approximately `1342` failures to **435**.

Baseline external triples were:

| Case | restraint / displacement-rotation / source-end action | total |
|---|---:|---:|
| L2 | `0 / 29 / 2` | 31 |
| L3 | `3 / 43 / 75` | 121 |
| L4 | `0 / 34 / 6` | 40 |
| L5 | `3 / 53 / 44` | 100 |
| L6 | `0 / 10 / 12` | 22 |
| L14 | `3 / 43 / 75` | 121 |
| **Total** |  | **435** |

The artifact also compares derived incident-equilibrium rows; including those gives a larger all-comparison count. The durable benchmark headline is the 435 external objective rows.

---

## 4. Bend investigation: current disposition

The permanent bend profiler condenses all 12 production bend chains and decomposes L3/L14 action/kinematic residuals.

Later local/offline work reproduced the Intergraph/CAUx MEC-21 FALSE planar flexibility fixture, reconstructed the correct two-node reaction convention, and used exact ACCDB-derived bend `A/G/OD/t` rather than residual-fitted coefficients.

After correcting the endpoint coordinate convention and coupling stiffness with the corresponding thermal free state:

- continuous curved bending alone was nearly neutral;
- MEC-21 transverse shear regressed L3 substantially;
- adding the derived axial-shape TRUE contribution regressed it further;
- predeclared bend 1/source 5 and bend 9/source 43 correction vectors moved mostly opposite the CAESAR-required direction.

Therefore generic bend softness, MEC-21 shear promotion in the tested form, and the derived TRUE candidate are **rejected for production promotion**.

---

## 5. Tee residual clustering and corrected branch ownership

After the bend rejection, L3 residual clustering showed a high-value mismatch family around the two Type 2.1 B31J tee neighborhoods.

The current solver correctly identifies two mechanical tee junctions:

```text
node 20160: incident sources 9, 12, 13
  run = 9 / 13
  branch = source 12
  branch junction end = J

node 20295: incident sources 17, 18, 36
  run = 17 / 18
  branch = source 36
  branch junction end = I
```

This branch ownership is important. An earlier exploratory local notebook mistakenly applied the 20160 branch correction to source 13; that produced an incorrect `435 -> 210` headline. That result is retired.

---

## 6. B31J fictitious-rigid thermal free growth — corrected local result

The production Type 2.1 tee representation already applies the branch at the CAESAR run surface through a rigid offset and applies the directional branch rotational spring there. The rigid offset is currently homogeneous kinematics only; it has no independent thermal free movement.

The single-factor hypothesis is:

> keep the current surface location, Kb, stiffness operator, pressure mechanics and weights unchanged; add only the thermal free translation of the existing centerline-to-surface rigid offset.

For thermal strain `epsilon` and existing surface offset vector `r_surface`:

```text
g_thermal = epsilon * r_surface
```

In the current joint-coordinate formulation this is an inhomogeneous rigid-offset free state. It changes `f_initial` but **not K**.

### Exact local/offline reassembly check

The local checker reassembles the retained 322 analysis-element matrices and load vectors from the qualified artifact, adds the governed finite support springs, and reproduces the baseline solver displacement vector to approximately `1e-11 m/rad` maximum difference. It then applies only the tee rigid thermal free-state term on source 12 and source 36.

Correct external result:

| Case | baseline | tee rigid thermal growth only |
|---|---:|---:|
| L2 | 31 | 31 |
| L3 | 121 | **59** |
| L4 | 40 | 40 |
| L5 | 100 | **73** |
| L6 | 22 | 22 |
| L14 | 121 | **59** |
| **Total** | **435** | **284** |

The signature is physically selective:

- W-only L2 is unchanged;
- P1-only L4 is unchanged;
- W+P1 L6 is unchanged;
- only T1-containing cases move materially;
- L3 and L14 remain identical;
- the numeric stiffness operator is unchanged.

Recovered equilibrium in the offline reassembly remains far inside the governed limits. Maximum residuals are roughly `4e-5 N` force and `1.4e-5 N.m` moment in the modified thermal combinations, versus gates of `5 N` and `0.5 N.m`.

Linear identities remain at numerical roundoff:

```text
L14 - L3              = 0
L6 - (L2 + L4)        ~ 2e-6 absolute worst exposed component
L5 - (L2 + L3 + L4)   ~ 3e-5 absolute worst exposed component
```

High-signal source/end rows around the 20160 neighborhood move strongly toward CAESAR. The mechanism also improves remote bend/source rows because the tee free state changes the global thermal load path without changing stiffness.

### Promotion status

This is the strongest current production candidate. The source patch should add only this free-state term to existing Type 2.1 tee modifiers. Do **not** simultaneously change Kb, tee stiffness, pressure/Bourdon, Type 2.6 topology, or bend mechanics.

Because the user requested no GitHub Actions usage, the core source change is being prepared/checked locally rather than pushed while PR workflows would auto-start.

---

## 7. Thermal-expansion authority after the tee correction

The Misc report prints T1 thermal expansion as:

```text
0.0012 mm/mm
```

for all 96 elements, with four decimal places. That only bounds the exact value approximately to:

```text
0.00115 <= strain < 0.00125
```

The current provisional profile uses:

```text
alpha = 1.17e-5 /K
DeltaT = 99 K
strain = 0.0011583
```

and remains `[GUESSED] PROVISIONAL` pending exact CAESAR material-library / Print Alphas authority.

After the corrected tee thermal-growth candidate, thermal-strain precision becomes more important. A diagnostic-only sweep within the report's printed interval gives a best external count of about **200** near:

```text
strain ~= 0.00121175
alpha  ~= 1.224e-5 /K
```

with representative counts near that point:

```text
L2  31
L3  37
L4  40
L5  33
L6  22
L14 37
```

This is **not promotable** because the coefficient would be chosen from benchmark minimization. The pinned Common BM4 directory contains no separate full-precision Print-Alphas report, so exact alpha remains an authority blocker.

---

## 8. Current next steps

1. **Production patch:** implement only Type 2.1 B31J fictitious-rigid thermal free growth on the existing rigid offset; keep K unchanged.
2. **Local validation:** rerun the offline six-case reassembly, source action recovery, equilibrium and superposition checks against the patch semantics.
3. **Do not push core source while no-Actions policy is active** if doing so would auto-trigger PR workflows.
4. **Acquire exact CAESAR thermal strain / Print Alphas** for A106 Grade B over `21 C -> 120 C`; replace the provisional alpha only from authority.
5. Re-profile remaining failures after those two changes.
6. Keep reducer sampling and Type 2.6 stress-intersection topology authority-blocked unless direct source evidence resolves them.
7. Address literal near-zero rows last without changing thresholds.

---

## 9. Explicitly rejected / forbidden paths

- flexible centerline tee replacement that removes CAESAR's run-surface convention;
- Kb fitting or scaling;
- inventing structural Type 2.6 branch members from the stress/SIF report alone;
- generic bend softness;
- MEC-21 bend shear promotion in the tested form;
- residual-fitted axial-shape terms;
- fitted thermal alpha;
- reducer sampling fitted to BM4_L;
- tolerance, reference, sign, row or source mutation.

---

## 10. Current conclusion

PR #1001 has reduced the external BM4_L objective from roughly `1342` to `435` with accepted mechanics and source custody intact. The later local-only work rejects the previously suspected broad bend-shear correction and identifies a narrower, authority-consistent Type 2.1 tee free-state omission.

The corrected local result for **B31J fictitious-rigid thermal free growth** is **435 -> 284**, not 210. It changes only T1-containing cases, leaves the stiffness operator unchanged, preserves L3/L14 identity and equilibrium, and is the next production mechanics change.

After that change, exact CAESAR thermal-expansion provenance becomes the highest-leverage authority gap. The benchmark remains open, but the next mechanics and authority steps are now sharply separated.