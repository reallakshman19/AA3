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

The fictitious rigid inherits the **run** properties. The production patch should therefore carry a fail-closed common run temperature/material state into the tee modifier rather than silently taking branch properties. For BM4_L the run and branch temperatures happen to agree, so this genericity correction does not change the local 210 result.

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

## 8. W/P-only local investigation after the tee result

The W-only and P1-only families were investigated separately so the thermal-alpha blocker could not hide a second large mechanics error.

### 8.1 Gravity magnitude is not the problem

The LFEA total W load is already within about `1.6 N` of the summed CAESAR vertical restraint reactions. A global gravity or density scale would therefore be a benchmark-fitting move and is rejected.

The pinned Misc `PIPE PROPERTIES #1` rows also reproduce ordinary pipe, insulation, fluid and rigid line weights to the report's printed precision. This strongly bounds mass-magnitude errors.

### 8.2 Uniform Timoshenko load vector is not the problem

The frame-element distributed-load kernel uses the Timoshenko interpolation, but for a uniform transverse line load the equivalent nodal result reduces exactly to the classical `qL/2` and `qL^2/12`, independent of the shear parameter. Therefore the adapter's gravity-vector call cannot explain W parity through an Euler-Bernoulli/Timoshenko load-vector mismatch.

### 8.3 Reducer endpoint Pipe Properties are display properties, not a gravity authority

The Misc report prints the reducer row with From-end pipe properties while the reducer report independently identifies changing inlet/outlet diameters and the CAESAR ten-cylinder model. Treating the printed endpoint line weight as the reducer's full gravity basis would contradict the reducer formulation and spoil total reaction parity.

A mirrored reducer-pair condensation check also found reversal-equivalent stiffness to approximately `9e-16` relative Frobenius error. Reducer orientation/condensation is therefore not a credible source of the remaining zero-rotation asymmetry.

### 8.4 Bend weight placement and bend subdivision are bounded

Replacing distributed arc weight with coarse chord/midpoint alternatives made W parity worse. The existing fine-arc gravity distribution is the correct direction.

A bend-boundary convergence study condensed the retained bend arcs, reproduced the baseline operator to about `3.8e-13`, and varied bend subdivision from `10` through `160` chords per physical bend. L2 remained at **31 failures** with essentially unchanged zero-reference rotation RMS. The remaining W rows are not a bend-mesh convergence problem.

### 8.5 Pressure lane is already narrow

The straight-pipe Bourdon/closed-end pressure formula in the solver matches the governed CAESAR/Hexagon expression already used by the qualified pressure path. A tee fictitious-rigid pressure/Bourdon experiment was low leverage: the CAESAR-rigid interpretation changed only one L4 failure (`40 -> 39` after the thermal tee correction), while treating the fictitious member like ordinary pipe pressure strain regressed badly. Do not bundle a pressure change into the thermal tee patch.

### 8.6 Implication

Broad W/P mechanics changes are currently lower-value and higher-risk than closing exact T1 material expansion authority. After the tee correction, most of the remaining non-thermal failures are literal near-zero rotations or small action rows; they should be treated as a precision/reporting/small-coupling investigation, not an invitation to rescale gravity or stiffness.

---

## 9. Next steps

1. Keep the locally prepared source patch limited to Type 2.1 tee rigid-offset thermal free growth, with inherited run temperature/material authority and no change to K.
2. Continue local static/unit/six-case checks; do not intentionally run Actions.
3. Obtain exact CAESAR thermal strain / Print Alphas for A106 Grade B over `21 C -> 120 C`; update alpha only from authority.
4. Re-profile remaining failures after those two items.
5. For the residual zero-reference family, distinguish report precision/recovery cancellation from real structural coupling before changing mechanics.
6. Keep reducer sampling and Type 2.6 structural interpretation authority-blocked unless direct source evidence resolves them.
7. Address literal near-zero rows last without changing thresholds.

---

## 10. Rejected / forbidden paths

- flexible centerline tee model that removes CAESAR's run-surface convention;
- Kb fitting/scaling;
- inventing mechanical Type 2.6 branches from stress/SIF rows alone;
- generic bend softness;
- MEC-21 bend shear promotion in the tested form;
- residual-fitted axial-shape terms;
- fitted thermal alpha;
- global gravity/density scaling;
- reducer endpoint-line-weight substitution;
- bend midpoint/chord-weight shortcuts;
- bend element-count tuning;
- reducer sampling fitted to BM4_L;
- tolerance/reference/sign/row/source mutation.

---

## 11. Current conclusion

The accepted PR mechanics reduce BM4_L from roughly `1342` to **435** external failures. Local-only follow-up rejects the broad bend-shear path and isolates a much cleaner omission: thermal free growth of the two existing Type 2.1 B31J centerline-to-surface rigid offsets.

With correct branch ownership **and correct analysis-carrier coverage**, the final offline result is **435 -> 210**. The intermediate 284 number is explicitly retired because it omitted the source-36 bend incoming-straight tee carrier.

The candidate leaves K unchanged, preserves equilibrium and linear identities, and affects only T1-containing cases as predicted. It is the next production mechanics patch. Exact CAESAR thermal-expansion provenance is the next authority blocker after that.

The W/P-only follow-up has additionally bounded several tempting but unproductive paths: global gravity scaling, reducer endpoint weight substitution, reducer reversal asymmetry, bend point-weight approximations, bend mesh refinement and broad pressure/Bourdon changes. Do not repeat those searches without new independent authority.

---

## 12. Handover — start here for the next agent

### 12.1 Repository state and execution policy

- Work only on PR `#1001`, branch `agent/m047-bm4l-clean-qualified`.
- Do **not** modify Issue #991 unless the user explicitly asks.
- Do **not** intentionally trigger or rerun GitHub Actions while the user's no-Actions instruction remains in force.
- Documentation-only branch updates have been allowed by the user; core solver changes are being held locally because a push would auto-start PR workflows.
- Re-fetch the PR head and target file SHA before every write. Never assume the branch has not moved.
- Do not force-push or rewrite unknown branch history.

### 12.2 What is locally ready but not pushed

The next production patch is a single-factor change in the ACCDB linear solver:

```text
B31J Type 2.1 fictitious centerline-to-surface rigid offset
+ thermal free translation epsilon * r_surface
+ inherited run temperature/material state
+ no change to stiffness K
```

The implementation must attach to the **actual tee-modified analysis carrier**, not a guessed source element name. BM4_L requires both:

```text
ACCDB.E12
ACCDB.E36.STRAIGHT
```

The sign/order proof is already closed locally. The free-state term must be consistent with:

```text
q = K u - f_fixed - f_initial
```

and with the existing local -> global -> rigid-offset transformation order.

### 12.3 Promotion evidence already obtained locally

At the current provisional thermal strain:

```text
external failures: 435 -> 210
L2: 31 -> 31
L3: 121 -> 37
L4: 40 -> 40
L5: 100 -> 43
L6: 22 -> 22
L14: 121 -> 37
```

Required invariants remain clean:

- K unchanged;
- L3 = L14 exactly;
- L6 = L2 + L4 to numerical roundoff;
- L5 = L2 + L3 + L4 to numerical roundoff;
- recovered equilibrium remains many orders inside the governed gates.

Any implementation that does not reproduce this **selective** signature should be treated as a sign/carrier/ownership bug before mechanics are reconsidered.

### 12.4 Highest-priority authority blocker

The exact CAESAR material-library T1 expansion for A106 Grade B from `21 C` to `120 C` is still unresolved. The Misc report only prints `0.0012 mm/mm` to four decimal places. Do not promote `~0.001208-0.001210` merely because a local sweep improves counts.

Acceptable authority would be, in descending preference:

1. CAESAR Print Alphas / material-library output for the exact model/version;
2. another direct CAESAR export that exposes full-precision total expansion used by T1;
3. primary material-library documentation demonstrably identical to CAESAR II 14's material 106 implementation.

A benchmark-derived coefficient, a rounded report value treated as exact, or a generic handbook CTE is not sufficient for promotion.

### 12.5 What not to re-investigate without new evidence

The following have already been falsified or bounded locally:

- generic bend softness;
- MEC-21 bend transverse shear in the tested form;
- derived Bend Axial Shape TRUE candidate;
- flexible-centerline tee replacement;
- Kb scaling;
- global gravity/density scaling;
- reducer endpoint line weight as full reducer gravity;
- reducer reversal/condensation asymmetry;
- bend midpoint/chord gravity placement;
- bend subdivision from 10 through 160 chords;
- ordinary-pipe pressure strain as fictitious-rigid pressure behavior.

### 12.6 Road map after exact alpha

Once authoritative thermal strain is obtained:

1. change **only** thermal expansion authority/value;
2. replay the locally prepared tee free-growth patch with that exact strain;
3. rerun all six primitive/composite cases locally;
4. verify common K, recovery identity, six-DOF equilibrium and superposition;
5. re-cluster the remaining external failures into nonzero-reference versus zero-reference rows;
6. only then decide whether another mechanics change is justified;
7. prioritize the zero-reference rotation family as a reporting/recovery/symmetry investigation before changing global stiffness;
8. keep Type 2.6 and reducer sampling blocked until direct structural/source authority appears;
9. when the user authorizes Actions again, push the single-factor tee patch first and qualify it independently before any alpha commit;
10. final closure still requires every governed external row to meet the literal `<10%` / zero-absolute gates without changing references or tolerances.

---

## 13. Agent qualification — 10 tough questions before further implementation

A successor agent should answer all ten questions satisfactorily **before editing production `src/**` mechanics**. A weak answer means the agent has not yet understood the handover deeply enough to continue safely.

### Q1. Why is `435 -> 210` evidence for a missing tee thermal free state rather than benchmark fitting?

A qualifying answer must explain all of the following: the mechanism came from CAESAR's B31J Surface-Node/fictitious-rigid model rather than a fitted coefficient; K is unchanged; only T1-containing cases move; W/P-only cases remain unchanged; L3/L14 identity and linear superposition remain intact; and the sign was independently checked through the recovery convention.

### Q2. What are the two actual analysis carriers, and why is source-ID-only lookup unsafe?

A qualifying answer must identify `ACCDB.E12` and `ACCDB.E36.STRAIGHT`, explain that source 36 is also a bend, and show why choosing `ACCDB.E36` or only `ACCDB.E<sourceId>` misses the incoming-straight tee modifier. It should also explain why the retired 284 result was a carrier-coverage bug rather than a competing mechanics result.

### Q3. Derive the correct free-state load sign through the tee rigid-offset transformation.

A qualifying answer must start from `q = K u - f_fixed - f_initial`, identify the free generalized movement `g`, explain why the extra initial-load contribution is equivalent to `-K g` in the assembled generalized coordinates, and preserve the production order from local constitutive coordinates through global physical-end coordinates and the rigid-offset map. The answer must state how an opposite-sign implementation would be falsified.

### Q4. Which properties should the fictitious rigid inherit, and how should the implementation fail closed?

A qualifying answer must state that the automatic fictitious rigid inherits **run** properties, not arbitrary branch properties. It should propose how to carry common run temperature/material information into the tee modifier and what to do if the two run legs disagree rather than silently selecting one.

### Q5. What evidence is sufficient to replace the provisional thermal expansion coefficient?

A qualifying answer must distinguish exact CAESAR Print-Alphas/material-library authority from the rounded `0.0012` report and from a benchmark-minimizing sweep. It must explicitly reject promoting `~1.22e-5/K` solely because it reduces failures and explain what source would make the value promotable.

### Q6. After authoritative alpha is obtained, what is the correct one-factor qualification sequence?

A qualifying answer must keep the tee free-growth and alpha changes separable, state which one is applied first and why, rerun all six cases, and verify common K, `q = Ku - f_fixed - f_initial`, six-DOF equilibrium, L3=L14, L6=L2+L4 and L5=L2+L3+L4. It must not jump directly to a global failure count.

### Q7. Why was MEC-21 bend transverse shear rejected even though the equation itself had primary authority?

A qualifying answer must distinguish **formula authority** from **model applicability/signature parity**. It should mention the validated CAUx/MEC-21 fixture, correct tangent-frame/two-node reconstruction, and the fact that the authoritative shear/TRUE candidates moved the predeclared bend-1/source-5 and bend-9/source-43 corrections mostly opposite the CAESAR-required direction while worsening L3. It should state what genuinely new evidence would be required to reopen the bend path.

### Q8. Why must the Type 2.6 report rows not be converted into structural tee modifiers today?

A qualifying answer must explain that the Misc report is a stress/SIF/intersection report, while the ACCDB topology does not resolve those four Type 2.6 rows as the same kind of three-leg structural modifier used for the two Type 2.1 tees. The answer must name the missing authority needed to promote them: direct topology/analysis-node evidence or explicit CAESAR structural treatment, not merely SIF presence.

### Q9. How should the remaining zero-reference rotations be investigated without weakening the benchmark?

A qualifying answer must keep the existing zero-reference absolute gates unchanged and separate reporting precision, recovery cancellation, coordinate/symmetry effects and real structural coupling. It should use source-family decomposition and signed sensitivities as diagnostics, not fit global stiffness/weight. It should also know that global gravity scaling, reducer reversal, bend point-weight variants and bend subdivision have already been bounded or rejected.

### Q10. What exact conditions must be met before the next mechanics change is pushed and called qualified?

A qualifying answer must require: independent physical/source authority; a predeclared local falsification signature; one mechanism per commit; no fitted coefficient; correct carrier coverage; unchanged benchmark references/tolerances; local syntax/unit/six-case checks under the current no-Actions policy; common-operator/recovery/equilibrium/superposition proof; explicit rollback criteria; and, once the user re-authorizes Actions, exact-head CI evidence before declaring repository-level qualification.

### Qualification standard

The agent is ready to continue only if its answers demonstrate that it can distinguish:

```text
authority from correlation,
source element from analysis carrier,
stiffness from free state,
reporting rows from structural topology,
and diagnostic sensitivity from promotable mechanics.
```

If any of those distinctions are blurred, stop implementation and re-read Sections 4-13 before modifying production mechanics.
