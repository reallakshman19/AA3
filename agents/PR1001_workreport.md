# PR #1001 Work Report — M047 BM4_L CAESAR/LFEA Parity

**Repository:** `reallaksh19/Advanced_Analysis`  
**PR:** #1001 — `M047: clean BM4_L qualification and accepted CAESAR mechanics`  
**Branch:** `agent/m047-bm4l-clean-qualified`  
**Issue:** #991  
**Status:** active; final literal all-row `<10%` target remains open.

**Execution policy:** per user instruction, do not intentionally trigger or rerun GitHub Actions. New investigation results below are local/offline unless explicitly described as earlier CI-qualified evidence.

---

## 1. Governed objective

Selected linear cases:

```text
L2  = W
L3  = T1
L4  = P1
L5  = W + T1 + P1
L6  = W + P1
L14 = L5 - L6 = T1
```

The objective covers restraint reactions, nodal displacement/rotation, and all source-element global FROM/TO end actions. Keep the literal acceptance rules, source bytes, references and row set unchanged.

Permanent mechanics/recovery identity:

```text
q = K u - f_fixed - f_initial
```

No benchmark-derived coefficient may be promoted. One physical mechanism per controlled production iteration.

---

## 2. Source/report custody

### ACCDB

- Common commit `45d51ea18624f5775805f399110c1738301c0d90`
- `BM4_L.zip` SHA-256 `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`
- authorized `BM4_L.ACCDB` member SHA-256 `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`

### Exact CAESAR reports supplied by the user

Pinned Common commit `179c4831cf521cf797c13699cfbbd118315c9244`:

- `https://github.com/reallaksh19/Common/blob/179c4831cf521cf797c13699cfbbd118315c9244/LFEA/BM4/Miscdata_BM4_L.txt`
- `https://github.com/reallaksh19/Common/blob/179c4831cf521cf797c13699cfbbd118315c9244/LFEA/BM4/Loadcasereport_BM4_L.txt`

They identify CAESAR II `14.00.00.0910 (Build 231113)`.

The Load Case Report confirms EC and zero friction for L2-L6 and the exact formulas above; L14 is an ALG `L5-L6` case.

The Misc report provides the benchmark-specific bend, tee and thermal-expansion evidence. The two structural Type 2.1 tee rows are:

```text
Tee 20160, Srf.Node 20161
D = 254.737 mm, T = 18.263 mm
FLEXb(in-plane) = 1.294
Kb(in-plane) = 1.283E+06 N.m/deg

Tee 20295, Srf.Node 20296
D = 157.302 mm, T = 10.973 mm
FLEXb(in-plane) = 1.323
Kb(in-plane) = 2.877E+05 N.m/deg
```

The report also lists Type 2.6 stress/SIF intersections at 20240, 21740, 21800 and 21850. Those do not resolve as three-leg structural tee modifiers in the ACCDB topology and must not be turned into invented mechanical branch members.

---

## 3. Accepted mechanics baseline

Accepted layers on the clean PR include:

1. B31J smooth-90 bend flexibility;
2. straight-pipe Timoshenko shear with `kappa=0.5`;
3. finite CAESAR default restraint stiffness;
4. matching-pipe rigid-element shear;
5. directional Type 2.1 B31J tee flexibility with independent Kb parity;
6. P1 bend pressure stiffening;
7. Timoshenko shear in the ten reducer cylinders.

These reduced the governed external objective from roughly `1342` to **435** failures.

Baseline external totals:

| Case | failures |
|---|---:|
| L2 | 31 |
| L3 | 121 |
| L4 | 40 |
| L5 | 100 |
| L6 | 22 |
| L14 | 121 |
| **Total** | **435** |

---

## 4. Bend hypothesis disposition

The retained bend profiler and subsequent local/offline CAUx/MEC-21 reconstruction now reject the previously suspected broad bend-shear correction.

After correcting endpoint-coordinate conventions and coupling candidate stiffness with its corresponding thermal free state:

- continuous curved bending alone was almost neutral;
- MEC-21 transverse shear regressed L3;
- the derived axial-shape TRUE candidate regressed it further;
- predeclared bend 1/source 5 and bend 9/source 43 moved mostly opposite the CAESAR-required action correction.

Therefore generic bend softness, MEC-21 shear promotion in the tested form, and residual-fitted axial-shape coefficients are rejected.

---

## 5. Type 2.1 tee topology and actual analysis carriers

The solver correctly identifies two structural Type 2.1 tee junctions:

```text
node 20160: incident sources 9, 12, 13
  run = 9 / 13
  branch = source 12
  junction end = J
  analysis carrier = ACCDB.E12

node 20295: incident sources 17, 18, 36
  run = 17 / 18
  branch = source 36
  junction end = I
  source 36 is also a bend
  tee modifier carrier = ACCDB.E36.STRAIGHT
```

The second carrier detail is critical. An intermediate offline replay selected only `ACCDB.E<sourceId>` and therefore missed the tee modifier on bend source 36's incoming straight. That partial replay produced `435 -> 284`; **284 is retired as incomplete carrier coverage**.

---

## 6. B31J fictitious-rigid thermal free growth — final local qualification

The production Type 2.1 tee model already places the branch at the CAESAR run surface through a rigid offset and applies the directional branch spring there. The rigid offset is currently homogeneous kinematics only; it carries no independent thermal free displacement.

Single-factor hypothesis:

> preserve surface location, Kb, stiffness K, pressure mechanics, weight and all bend mechanics; add only thermal free growth of the existing centerline-to-surface rigid offset.

For source thermal strain `epsilon` and existing surface-offset vector `r_surface`:

```text
g_thermal = epsilon * r_surface
```

This is an inhomogeneous rigid-offset free state. It changes `f_initial`; **K remains unchanged**.

At the current provisional strain `epsilon = 0.0011583`, the two free movements are only:

```text
tee 20160: |g| = 0.15810795 mm
tee 20295: |g| = 0.09745646 mm
```

### Algebra/sign proof

The local checker verified both tee carriers through the exact production transform order:

```text
local constitutive K
-> global physical-end K
-> rigid-offset H^T K H
```

For each carrier, the source-order free-state expression

```text
f_extra_local = -K_local g_local
f_extra_joint = H^T T^T f_extra_local
```

matches directly applying `-K_joint g_joint` with maximum absolute difference `0` in IEEE-754 arithmetic for the retained matrices. The opposite sign regresses the benchmark sharply.

### Full six-case offline reassembly

The checker reassembles the retained 322 analysis-element matrices/load vectors plus governed finite restraint springs and reproduces baseline raw solver displacement to about `1e-11 m/rad` maximum difference before applying the new free state.

With both real tee carriers (`ACCDB.E12` and `ACCDB.E36.STRAIGHT`) included:

| Case | baseline | tee rigid thermal growth |
|---|---:|---:|
| L2 | 31 | 31 |
| L3 | 121 | **37** |
| L4 | 40 | 40 |
| L5 | 100 | **43** |
| L6 | 22 | 22 |
| L14 | 121 | **37** |
| **Total** | **435** | **210** |

The signature is exactly selective for a thermal-only free-state mechanism:

- L2/W unchanged;
- L4/P1 unchanged;
- L6/W+P1 unchanged;
- only T1-containing cases move materially;
- L3 = L14 remains exact;
- numeric stiffness K is unchanged.

Recovered equilibrium remains far inside the governed gates. Maximum modified-case residuals are approximately `4e-5 N` force and `8e-6 N.m` moment versus `5 N` and `0.5 N.m` gates.

Superposition remains numerical-roundoff clean:

```text
L14 - L3             = 0
L6 - (L2 + L4)       ~ 2.4e-6 worst exposed component
L5 - (L2+L3+L4)      ~ 2.3e-5 worst exposed component
```

This is the next production mechanics change.

### Production implementation boundary

Implement the free state generically on the **actual analysis element carrying a non-null tee rigid offset**, not by source-element ID. This automatically covers ordinary branch source 12 and the bend incoming-straight carrier for source 36 without benchmark-specific branching.

Do not combine this commit with finite-rigid stiffness, Kb changes, Type 2.6 topology, Bourdon, bend mechanics, or thermal-alpha changes.

Because pushing the core file would cause PR workflows to start, the source change remains locally prepared while the user has requested no Actions usage.

---

## 7. Thermal-expansion authority becomes the next blocker

The Misc report prints T1 thermal expansion as `0.0012 mm/mm` for all 96 elements, rounded to four decimals. It therefore bounds but does not uniquely identify the exact material-library strain.

Current provisional profile:

```text
alpha = 1.17e-5 /K
DeltaT = 99 K
strain = 0.0011583
status = [GUESSED] PROVISIONAL
```

The pinned BM4 directory contains no separate full-precision Print-Alphas report.

After the two-tee thermal free-state correction, diagnostic sensitivity becomes high leverage. A sweep restricted to the printed `0.0012` rounding interval reaches approximately **150 external failures** near:

```text
strain ~= 0.001208 to 0.001210
alpha  ~= 1.22e-5 /K
```

Representative diagnostic counts near scale `1.043-1.045` are:

```text
L2  31
L3  22
L4  40
L5  13
L6  22
L14 22
total 150
```

This coefficient is **not promotable** because selecting it from benchmark minimization would be fitting. Exact CAESAR material-library / Print-Alphas authority remains required.

---

## 8. Next steps

1. Keep the locally prepared source patch limited to Type 2.1 tee rigid-offset thermal free growth.
2. Continue local static/unit/six-case checks; do not intentionally run Actions.
3. Obtain exact CAESAR thermal strain / Print Alphas for A106 Grade B over `21 C -> 120 C`; update alpha only from authority.
4. Re-profile remaining failures after those two items.
5. Keep reducer sampling and Type 2.6 structural interpretation authority-blocked unless direct source evidence resolves them.
6. Address literal near-zero rows last without changing thresholds.

---

## 9. Rejected / forbidden paths

- flexible centerline tee model that removes CAESAR's run-surface convention;
- Kb fitting/scaling;
- inventing mechanical Type 2.6 branches from stress/SIF rows alone;
- generic bend softness;
- MEC-21 bend shear promotion in the tested form;
- residual-fitted axial-shape terms;
- fitted thermal alpha;
- reducer sampling fitted to BM4_L;
- tolerance/reference/sign/row/source mutation.

---

## 10. Current conclusion

The accepted PR mechanics reduce BM4_L from roughly `1342` to **435** external failures. Local-only follow-up rejects the broad bend-shear path and isolates a much cleaner omission: thermal free growth of the two existing Type 2.1 B31J centerline-to-surface rigid offsets.

With correct branch ownership **and correct analysis-carrier coverage**, the final offline result is **435 -> 210**. The intermediate 284 number is explicitly retired because it omitted the source-36 bend incoming-straight tee carrier.

The candidate leaves K unchanged, preserves equilibrium and linear identities, and affects only T1-containing cases as predicted. It is the next production mechanics patch. Exact CAESAR thermal-expansion provenance is the next authority blocker after that.