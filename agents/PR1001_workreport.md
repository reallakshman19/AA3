# PR #1001 Work Report — M047 BM4_L CAESAR/LFEA Parity

**Repository:** `reallaksh19/Advanced_Analysis`  
**Pull request:** #1001 — `M047: clean BM4_L qualification and accepted CAESAR mechanics`  
**Branch:** `agent/m047-bm4l-clean-qualified`  
**Report snapshot head:** `7292177ac77c7d25d456da8d7418d2c5a1417e4c`  
**Qualification run:** `31383626555` — PASS  
**Qualification artifact digest:** `sha256:f0c4a8dbff779be8c5a273310ae95b120a967b416cdfff43411cf5e097edf2c8`  
**Benchmark status:** still FAIL against the final all-row `<10%` target; root-cause work remains active.  
**Issue #991:** intentionally not modified by this workstream.

---

## 1. Task objective

The M047/BM4_L task is to reproduce the linear CAESAR II BM4_L benchmark with LFEA closely enough that all governed comparison rows satisfy the literal acceptance rule for the six selected frictionless linear cases:

- `L2 = W`
- `L3 = T1`
- `L4 = P1`
- `L5 = W + T1 + P1`
- `L6 = W + P1`
- `L14 = L5 - L6 = T1`

The objective covers three result families:

1. restraint forces/moments (`UX/UY/UZ/RX/RY/RZ`),
2. nodal displacement/rotation,
3. source-element global end actions at FROM and TO (`FX/FY/FZ/MX/MY/MZ`).

The work is deliberately **root-cause driven**. Benchmark counts are used as measurements, not as tuning targets. No benchmark reference values, tolerances, rows, signs, or source data are edited to make the comparison look better.

---

## 2. Engineering strategy

### 2.1 Clean-room continuation

PR #1001 was created as a clean continuation from `main`, without reusing the commit ancestry of the earlier experimental branch. Only reviewed final mechanics/evidence content was brought forward. This keeps the permanent diff understandable and prevents one-shot diagnostic experiments from becoming accidental production behavior.

### 2.2 Authority before fitting

Every production mechanics change follows the same rule:

> **External/physical authority → explicit prediction → one-factor change → all six cases → integrity checks → accept or reject.**

Authority comes from, in descending order of relevance:

- the pinned BM4_L ACCDB source,
- pinned CAESAR II reports generated from the same benchmark,
- primary Hexagon/Intergraph documentation for CAESAR behavior,
- reusable structural-mechanics identities already qualified in the LFEA core.

Observed CAESAR result values are not used to fit arbitrary coefficients.

### 2.3 Common-operator decomposition

The selected cases are linear combinations of three primitives: gravity `W`, temperature `T1`, and pressure `P1`. For the frictionless linear model, the same stiffness operator should be used in all six cases.

This gives strong identities such as:

```text
L6  = L2 + L4
L5  = L2 + L3 + L4
L14 = L5 - L6 = L3
```

If a proposed mechanics change accidentally changes the operator by load case, these identities can hide serious implementation errors. PR #1001 therefore retains both structural and **numeric stiffness-ledger hashes** across all six cases.

### 2.4 Recovery identity

Every element end-action report path is checked against the assembled mechanics identity:

```text
q = K u - f_fixed - f_initial
```

The work also proves source-element FROM/TO mapping, descendant-chain continuity, and recovered six-DOF equilibrium. This prevents a solver improvement from being confused with a reporting/sign/mapping change.

---

## 3. Source custody and benchmark authority completed

### 3.1 Pinned ACCDB authority

The immutable source remains:

- Common commit: `45d51ea18624f5775805f399110c1738301c0d90`
- `BM4_L.zip` SHA-256: `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`
- ZIP size: `582488` bytes
- archive member: `BM4_L.ACCDB`
- archive-member SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`

A previously declared ACCDB SHA-256 beginning `e21b...` was proven not to be the archive member defined by the pinned Common commit and ZIP. It is retained as contradicted evidence, not used as source authority.

### 3.2 Authenticated Microsoft ACE provider

The permanent qualification workflow installs and authenticates Microsoft Access Database Engine 2016 x64, verifies the installer and provider signatures, opens the pinned ACCDB read-only, and proves that provider access does not mutate the source bytes.

**Concept:** source-custody evidence is part of mechanics qualification. A result cannot be called a CAESAR parity result if the data source itself is ambiguous or silently transformed.

### 3.3 Pinned CAESAR reports

PR #1001 additionally binds two CAESAR II 14 reports from Common commit `179c4831cf521cf797c13699cfbbd118315c9244`:

- `LFEA/BM4/Miscdata_BM4_L.txt` — Git blob `ef23d224925e4568185a360ecbe1ee62503f15ff`
- `LFEA/BM4/Loadcasereport_BM4_L.txt` — Git blob `be62eeb08af26dddcd59146e21188c108c4600dd`

The diagnostics fetch these exact blobs and fail on mismatch.

These reports are now used to validate:

- selected load-case formulas and friction settings,
- printed thermal expansion bounds,
- welding-tee flexibility/Kb information,
- bend pressure-stiffening factors,
- gravity/pipe-property context.

---

## 4. Qualification/evidence infrastructure completed

### 4.1 Fail-closed M047 workflow

A prior diagnostic integration exposed an important process defect: a Node command could fail inside PowerShell and the workflow could continue to a green result. The permanent workflow was hardened so native command failures terminate qualification.

It also explicitly checks that the augmented diagnostics artifact contains the required Common-report and tee-stiffness sections.

**Concept:** a green CI badge is only evidence if failed evidence-generation commands cannot be ignored.

### 4.2 Numeric operator proof

The original `stiffnessStateHash` was useful as a structural-state identifier but did not change when element matrix values changed. PR #1001 therefore adds an independent numeric hash over every recovery-ledger 12×12 global stiffness matrix.

At the current head all six selected cases share:

- numeric element-stiffness ledger SHA-256: `c393ded51edc81f63ebb85d7d8f5243de47e7a3162582fdf7440b4ad39a4d446`
- combined structural+numeric operator SHA-256: `9422fbda7863c0c4a6080cb8161a3b156522b837026f82346485ee0c9fb5d4c0`

**Concept:** the proof now distinguishes “same model metadata” from “same actual numeric K”.

### 4.3 Recovery and equilibrium proof

For every selected case the retained evidence checks:

- `q = K u - f_fixed - f_initial`,
- source FROM/TO result mapping,
- multi-descendant source-element continuity,
- free-node/restrained-node six-DOF equilibrium,
- common numeric operator across cases.

This establishes that remaining benchmark differences are mechanics differences, not a hidden report-recovery shortcut.

---

## 5. Accepted mechanics layers

## 5.1 B31J smooth-90 bend flexibility

### Concept

For B31.3 2022 with the default B31J method, a smooth 90-degree bend uses the B31J smooth-90 flexibility treatment rather than the older generic bend coefficient. The implementation uses the governed B31J factor rule and keeps pressure stiffening separate.

### Why it matters

Bend flexibility changes the global stiffness distribution and therefore affects gravity, thermal, pressure, and combined cases even when the primitive load itself is unchanged.

### Example

A bend-factor error is not local to one bend result row. It changes load redistribution through neighboring supports and source elements, so the correct test is all six load cases plus common-K/equilibrium checks.

---

## 5.2 CAESAR straight-pipe Timoshenko shear (`kappa = 0.5`)

### Concept

CAESAR pipe-beam formulation authority gives a pipe shear coefficient of `2`. In the LFEA Timoshenko kernel the effective shear area is represented as `kappa * A`, so the equivalent setting is:

```text
kappaY = kappaZ = 0.5
```

This is applied to physically straight pipe spans rather than indiscriminately to every frame-like object.

### Why it matters

Euler-Bernoulli beam stiffness neglects transverse shear deformation. On relatively short/thick piping spans that makes the model too stiff in bending. Timoshenko flexibility corrects the operator rather than scaling the final displacement or force.

### High-signal examples from the root-cause evidence

At node `20090`, `UY`:

```text
CAESAR reference : -197.260
before correction : -446.039
after correction  : -212.432
absolute error    : 248.779 -> 15.172  (~93.9% reduction)
```

For source element 4, TO-end `MZ`:

```text
CAESAR reference : -484.627
before correction : -667.362
after correction  : -493.973
absolute error    : 182.735 -> 9.346  (~94.9% reduction)
```

For source element 4, TO-end `FY`:

```text
CAESAR reference : -265.942
before correction : -335.546
after correction  : -269.479
absolute error    : 69.604 -> 3.537  (~94.9% reduction)
```

These examples are important because the correction changes the stiffness formulation and independently improves displacement, shear force, and bending moment in the expected coupled direction.

---

## 5.3 Finite CAESAR default restraint stiffness

### Concept

A blank CAESAR restraint stiffness is treated as rigid through very large finite default stiffness, not as a mathematical elimination of the DOF. BM4_L uses displayed units `N/cm` for translation and `N.m/deg` for rotation.

The governed defaults map to approximately:

```text
translation: 1.0e12 N/cm      = 1.0e14 N/m
rotation   : 1.0e12 N.m/deg   = 5.729577951e13 N.m/rad
```

### Why it matters

A finite spring and an exactly fixed DOF have nearly identical large-scale structural response, but they are not identical at tiny support displacements/rotations. BM4_L includes literal near-zero rows, so the representation must match CAESAR rather than relying on “close enough to rigid”.

---

## 5.4 Matching-pipe rigid-element shear scope

### Concept

Rigid elements still use pipe-like stiffness construction for their elastic representation. The accepted CAESAR pipe shear behavior is therefore used where the rigid-element authority resolves a matching pipe stiffness section.

The change was scoped rather than applied blindly to bends/reducers/all special components.

### Why it matters

Component type alone is not enough to choose a beam kernel. The physical/stiffness authority for the component determines whether pipe transverse shear belongs in its internal formulation.

---

## 5.5 Directional B31J welding-tee flexibility and Kb proof

### Concept

A B31J tee has different run/branch and in-plane/out-of-plane/torsional flexibility. PR #1001 represents this with directional rotational springs at the existing connected spans, avoiding overlapping duplicate tee elements.

For a directional flexibility factor `k`, the spring uses the CAESAR-compatible characteristic relation based on section rigidity and matching-pipe mean diameter.

The branch flexibility acts at the run outside surface through a rigid offset; the run flexibility acts at the centerline intersection.

### Direct report example

The retained Kb authority check compares LFEA to CAESAR's printed tee stiffness output. Both BM4_L welding tees pass the independent Kb comparison:

- tee `20160`: relative Kb error about `0.034%`
- tee `20295`: relative Kb error about `0.078%`

### Remaining small geometry gap

CAESAR prints branch `FLEXb = 1.323` at tee `20295` using the entered branch diameter. The strict shared B31J applicability layer currently reconciles a tiny nominal OD mismatch and produces about `1.321436`.

The mismatch is only about `0.0159%` in diameter and Kb already passes, so the generic B31J guard was **not** weakened just to reduce a benchmark count. Any future compatibility behavior must remain CAESAR-adapter-local and bounded by explicit nominal-diameter provenance.

---

## 5.6 P1 bend pressure stiffening

### Concept

The previous BM4_L profile interpreted “maximum defined pressure” as including hydrotest pressure. The pinned CAESAR Misc Bend Report provides direct model-specific evidence that the operating bend stiffness is based on `P1`, not the larger hydro pressure.

For bend `20120`, CAESAR prints:

```text
FLEX : 2.898 -> 3.031
SIFi : 1.508 -> 1.582
SIFo : 1.257 -> 1.319
```

Using the governed B31J equations:

- the lower/stiffer endpoints reproduce `P1 = 11.6 MPa`,
- the upper endpoints reproduce the unpressurized values,
- `HYDRO = 22.035 MPa` does not reproduce the printed pair.

### Change

BM4_L bend pressure stiffening was changed from hydro-inclusive `MAX_DEFINED` to `P1` only. Bourdon, straight-pipe pressure strain, thermal strain, gravity, tolerances, and reference data were unchanged.

### Measured result

Against the immediately preceding clean hydro-inclusive state:

```text
objective failures: 494 -> 444
reduction          : 50 rows (~10.1%)
```

L4 source-element end-action failures became `6 -> 0` before the later reducer-cylinder shear change.

### Why this is a strong result

This was not accepted merely because counts improved. The change was accepted because the pinned CAESAR bend-factor report independently selected P1, and the six-case mechanics/equilibrium/operator proofs stayed valid.

---

## 5.7 Timoshenko pipe shear in the ten reducer cylinders

### Concept

Hexagon documents a concentric reducer stiffness model as ten successively changing **pipe cylinders**. The reducer implementation already used ten cylinders but each internal cylinder was Euler-Bernoulli even though ordinary CAESAR pipe spans had already been qualified as Timoshenko with `kappa=0.5`.

The reducer cylinders now use the same governed CAESAR pipe transverse-shear formulation.

### Important scope control

This change did **not** alter:

- the number of cylinders,
- midpoint section sampling,
- reducer geometry interpolation,
- gravity integration,
- thermal strain,
- pressure strain,
- static condensation.

The B-3.23 regression additionally proves that ten uniform Timoshenko cylinders condense to the same full-length uniform Timoshenko pipe. Subdivision therefore does not multiply shear compliance.

### Measured result

Relative to the P1-only state:

```text
objective failures: 444 -> 435
```

Notable count changes:

```text
L2 : 0 / 33 / 6  -> 0 / 29 / 2
L5 : 3 / 59 / 44 -> 3 / 53 / 44
L6 : 0 / 10 / 14 -> 0 / 10 / 12
```

L3/L14 displacement rows improve slightly (`45 -> 43`), while source-end rows move `73 -> 75`. The major thermal residuals are therefore not explained by reducer shear alone.

The new L4 end-action failures are tiny near-zero rows, roughly `0.0015 N` and `0.0021 N.m` absolute. They remain literal failures; no tolerance was changed to hide them.

---

## 6. Current benchmark state

Current governed failure-count triples are **restraint / displacement-rotation / source-end action**:

| Case | Current failures |
|---|---:|
| L2 | `0 / 29 / 2` |
| L3 | `3 / 43 / 75` |
| L4 | `0 / 34 / 6` |
| L5 | `3 / 53 / 44` |
| L6 | `0 / 10 / 12` |
| L14 | `3 / 43 / 75` |

Totals:

```text
restraint            9
displacement/rotation 212
source-end action     214
--------------------------------
total                 435
```

For comparison, the pinned source reproduction before the accepted mechanics layers had:

```text
restraint             32
displacement/rotation 513
source-end action     797
total                1342
```

(`L6` source-end count uses the pinned reproduction value `49`; the issue text had reported `50`.)

Approximate reduction from that pinned reproduction to the current PR state:

- restraint failures: `32 -> 9` (~71.9% reduction)
- displacement/rotation failures: `513 -> 212` (~58.7% reduction)
- source-end failures: `797 -> 214` (~73.1% reduction)
- total literal objective failures: `1342 -> 435` (~67.6% reduction)

The remaining target is still strict: every governed row must satisfy the literal acceptance rule.

---

## 7. Important hypotheses tested and rejected/rule-bounded

### 7.1 Scalar thermal-alpha fitting rejected

The pinned CAESAR Pipe Properties report prints uniform T1 expansion as approximately:

```text
0.0012 mm/mm
```

The current provisional coefficient:

```text
alpha = 1.17e-5 /K
DeltaT = 99 K
alpha * DeltaT = 0.0011583
```

This is inside the report's printed-precision interval. More importantly, the retained audit calculates the scalar strain that each scalable L3 failure would individually require. None of the meaningful scalable L3 failures can all be explained by one scalar alpha within the CAESAR printed interval.

**Conclusion:** exact material-library alpha is still needed for provenance, but alpha fitting is not a defensible next root-cause path.

### 7.2 Bourdon translation-only or rotation-only rejected

BM4_L is governed as `TRANSLATION_AND_ROTATION`. Diagnostic decomposition showed that removing either part makes pressure-case agreement dramatically worse at high-signal rows.

Example at node `20330`, `RZ`:

```text
CAESAR ref       : -6.4575e-6
full mode        : -4.5183e-6
translation only : -7.744e-5
rotation only    : -2.0217e-5
```

Example source element 19 TO `MZ`:

```text
CAESAR ref       : 280.979
full mode        : 285.835
translation only : 19.332
rotation only    : 275.226
```

**Conclusion:** combined Bourdon translation + rotation is physically required; pressure residuals should not be “fixed” by disabling one part.

### 7.3 Bend gravity centroid refinement ruled out as dominant

For the first major bend, replacing chord-midpoint gravity placement with exact arc-segment centroid placement can only move the aggregate gravity moment by roughly `0.17 N.m`, while several remaining historical bend-related discrepancies were multiple N.m or >10 N.

**Conclusion:** this geometric refinement is too small to be the dominant root cause.

### 7.4 Reducer sampling is not fitted

The public reducer documentation confirms ten successively changing cylinders but does not publish whether each cylinder uses start, midpoint, end, or another representative section location.

Current rule remains:

```text
MIDPOINT_LINEAR_INTERPOLATION_CANDIDATE_V1
```

It is explicitly provisional. No sampling fraction has been chosen by minimizing BM4_L error.

### 7.5 Unqualified curved-bend shear approximation remains blocked

Earlier experiments suggested curved-bend transverse/axial flexibility could materially affect the remaining residuals, but a MEC-21-like approximation is not promoted without independently retrievable primary equation authority.

**Conclusion:** promising numerically is not sufficient for production mechanics.

---

## 8. What the remaining error pattern says

The current residual pattern is no longer dominated by the previously identified broad mechanics omissions.

### Pressure case

`L4 = 0 / 34 / 6` is now structurally close. Its six end-action failures after reducer shear are tiny near-zero rows. This strongly reduces the probability that a broad pressure primitive or Bourdon formula error is still driving the benchmark.

### Gravity case

`L2 = 0 / 29 / 2` has only two source-end failures. Total gravity/reaction magnitude was already extremely close to CAESAR. The remaining gravity problem is mainly small/local kinematic distribution, not missing total weight.

### Thermal cases

`L3` and `L14` are identical in the governed linear decomposition and remain the dominant block:

```text
3 restraint / 43 displacement-rotation / 75 source-end
```

Because scalar thermal strain is bounded by the CAESAR report and cannot explain the residual family, the remaining high-value search is an **operator/kinematics problem**, particularly special-component flexibility on the thermal load path.

### Combined cases

`L5` and `L6` include cancellation between primitives. Small primitive mismatches can therefore become large relative errors where the CAESAR combined reference is small. These cases should be interpreted through the primitive `W/T1/P1` evidence rather than tuned directly.

---

## 9. Future roadmap

The roadmap below is ordered by expected information gain and authority quality, not by which change is easiest to code.

### Priority 1 — Resolve curved-bend axial/kinematic formulation

**Why first:** thermal residuals remain dominant, scalar alpha is ruled out, tee Kb is already close, reducer shear is not the main driver, and CAESAR explicitly exposes a distinct Bend Axial Shape behavior.

**Work:**

1. Locate primary Hexagon/Intergraph authority for the actual curved-bend stiffness/shape formulation used with `BEND_AXIAL_SHAPE=YES`.
2. Prefer equations, matrix terms, or a directly reproducible CAESAR factor over secondary descriptions.
3. Expose the actual factor/kinematic quantities assembled by LFEA in retained diagnostics.
4. Run one controlled A/B on all six cases.
5. Require the numeric element-stiffness ledger to remain common across all six cases.

**Accept only if:**

- the formulation is independently authorized,
- high-signal L3/L14 rows move in the predicted direction,
- L2/L4 high-load agreement is not damaged,
- recovery and equilibrium remain exact within governed numerical tolerances.

**Do not:** promote the earlier MEC-21-like candidate merely because it reduces counts.

---

### Priority 2 — Close exact thermal-expansion provenance

**Goal:** replace `[GUESSED] PROVISIONAL` alpha with exact CAESAR material-library authority.

**Needed evidence:** CAESAR Print Alphas / Pipe Properties with sufficient precision for the actual A106 Grade B material and the `21 C -> 120 C` interval, or another primary CAESAR output exposing the exact total strain.

**Expected outcome:** this may make a modest numeric correction, but current evidence says it should not be expected to solve the main L3 family by itself.

**Acceptance rule:** update alpha only from authority, never from benchmark error minimization.

---

### Priority 3 — Resolve reducer section-sampling authority

**Current state:** ten-cylinder count is authoritative; midpoint section sampling is provisional.

**Work:**

1. Search primary CAESAR reducer formulation documentation for the representative cross-section of each cylinder.
2. If documentation is unavailable, look for an independent CAESAR observable that uniquely distinguishes start/mid/end sampling without using the target benchmark result rows as a fitting objective.
3. Keep cylinder shear, condensation, load, thermal, and pressure rules fixed while testing the sampling rule.

**Acceptance rule:** one-factor change only; no fractional sweep selected by minimum BM4_L failure count.

---

### Priority 4 — Resolve tee 20295 nominal-diameter compatibility locally

CAESAR proceeds with the tiny entered branch/run diameter mismatch and prints a branch flexibility factor using the entered branch geometry, while the shared generic B31J calculator correctly enforces formal applicability limits.

**Preferred design:** add any CAESAR-specific “warn-and-proceed within declared nominal-diameter tolerance” behavior only in the ACCDB adapter. Keep the generic B31J calculator fail-closed by default.

**Acceptance evidence:**

- declared tolerance and provenance are explicit,
- tee `20295` factor reproduces the pinned CAESAR print,
- Kb stays within report precision,
- no unrelated B31J caller becomes more permissive.

This is likely a small correction, not the main thermal root cause.

---

### Priority 5 — Classify the remaining near-zero literal failures

The final DOD intentionally treats exact/near-zero rows strictly. These rows must not be suppressed simply because their engineering magnitude is small.

**Work:**

- separate large-engineering residuals from report-precision/near-zero residuals in diagnostics,
- retain the same acceptance tolerance,
- trace each zero row through source report precision, finite restraint motion, recovery cancellation, and numeric formatting,
- fix only a real mechanics/recovery/reporting cause.

This work should happen after the large thermal operator mismatch is reduced so small rows do not distract from higher-value mechanics.

---

### Priority 6 — Final closure and deterministic qualification

Before declaring M047 complete:

1. all nonzero governed rows `<10%`,
2. governed zero-reference absolute gates pass,
3. all 97 nodes × 6 DOFs and all 96 source elements × 12 end-action components remain covered,
4. `L6 = L2 + L4`, `L5 = L2 + L3 + L4`, and `L14 = L3` remain valid,
5. recovered equilibrium passes every selected case,
6. source custody and report blob identities remain pinned,
7. numeric K ledger is common across all six cases,
8. run the final qualification deterministically multiple times and compare retained hashes/results,
9. remove any temporary diagnostics not intended as permanent gates,
10. update the PR description with final authority, counts, known limitations, and exact qualification artifact.

---

## 10. Development rules for future work on PR #1001

To preserve the quality of the current workstream:

1. **Re-fetch the PR head before every write.** The branch has previously moved during investigation.
2. **Never rewrite unknown concurrent changes.** Stack additive commits.
3. **Do not modify Issue #991.** PR #1001 is the working record.
4. **One physical hypothesis per mechanics commit.** Keep unrelated evidence changes separate where practical.
5. **No benchmark fitting.** No pressure scale, alpha scale, flexibility scale, sign flip, tolerance relaxation, or row suppression chosen from target error counts.
6. **Keep rejected experiments out of the permanent diff.** Record conclusions, not one-shot workflows.
7. **A count improvement is not sufficient.** Require physical authority plus the predicted row signature.
8. **A green workflow is not sufficient unless the retained evidence exists.** The workflow now fails closed, and future additions should preserve that property.

---

## 11. Current conclusion

PR #1001 has converted BM4_L from a broad, multi-mechanism mismatch into a much narrower residual problem.

The accepted layers now cover:

- authoritative source custody,
- load-case/report parity,
- B31J smooth-90 bend flexibility,
- straight-pipe Timoshenko shear,
- finite CAESAR restraint stiffness,
- matching-pipe rigid-element shear,
- directional B31J tee flexibility and Kb proof,
- P1-based bend pressure stiffening,
- Timoshenko pipe shear inside CAESAR's ten-cylinder reducer model,
- fail-closed CI evidence,
- numeric common-operator proof,
- assembly-consistent end-action recovery and equilibrium.

The pinned-source total objective failure count has been reduced from approximately `1342` to `435` without changing benchmark references or acceptance tolerances.

The dominant remaining engineering problem is thermal/special-component kinematics, with curved-bend axial/flexibility formulation the highest-value next target. Thermal alpha still needs exact provenance, reducer sampling remains provisional, and a small CAESAR-specific tee geometry compatibility gap remains bounded for later cleanup.

The benchmark is therefore **materially improved and substantially better understood, but not closed**.
