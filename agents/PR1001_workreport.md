# PR #1001 Work Report — M047 BM4_L CAESAR/LFEA Parity

**Repository:** `reallaksh19/Advanced_Analysis`  
**Pull request:** #1001 — `M047: clean BM4_L qualification and accepted CAESAR mechanics`  
**Branch:** `agent/m047-bm4l-clean-qualified`  
**Latest fully qualified instrumentation head:** `1ea90ef02d26e2641cce61e161a6f7ea714f86d0`  
**Qualification run:** `31392210270` — PASS  
**Qualification artifact:** `m047-bm4l-qualification-1ea90ef02d26e2641cce61e161a6f7ea714f86d0`  
**Artifact digest:** `sha256:77bbacafb8ee0588c768b22c76d225a46f8f7bc244abdb99482ca8e743f61932`  
**Benchmark status:** still FAIL against the final literal all-row `<10%` target; root-cause work remains active.  
**Issue #991:** one later user-authorized comment links this report; the issue body/state/reference data were not changed by this workstream.

---

## 1. Task objective

The M047/BM4_L task is to reproduce the linear CAESAR II BM4_L benchmark with LFEA closely enough that every governed comparison row satisfies the acceptance rule for six selected frictionless linear cases:

- `L2 = W`
- `L3 = T1`
- `L4 = P1`
- `L5 = W + T1 + P1`
- `L6 = W + P1`
- `L14 = L5 - L6 = T1`

The objective covers:

1. restraint forces/moments,
2. nodal displacement/rotation,
3. source-element global FROM/TO end actions.

The work is deliberately **root-cause driven**. Benchmark counts are measurements, not fitting targets. Reference values, signs, rows, acceptance tolerances, source bytes, and load-case identities are not altered to improve the result.

---

## 2. Engineering method

### 2.1 Clean-room continuation

PR #1001 was opened as a clean continuation from `main`, without reusing the commit ancestry of contaminated PR #992. Accepted mechanics/evidence were independently inspected and reconstructed on the fresh branch. Temporary experimental workflows and retained parameter sweeps from #992 were not copied wholesale.

### 2.2 Authority before fitting

Production mechanics follow this sequence:

> **external/physical authority → falsifiable prediction → one-factor implementation → six-case qualification → operator/recovery/equilibrium proof → accept or reject**

Authority is taken from:

- the pinned BM4_L ACCDB,
- pinned CAESAR II reports for the same benchmark,
- primary CAESAR/Hexagon/Intergraph documentation,
- reusable structural mechanics already qualified in the LFEA core.

CAESAR result rows may identify *where* a model is wrong, but are not used to invent a coefficient.

### 2.3 Linear primitive identities

The selected cases reduce to `W`, `T1`, and `P1`, so the same linear stiffness operator must serve all six cases. Strong identities include:

```text
L6  = L2 + L4
L5  = L2 + L3 + L4
L14 = L5 - L6 = L3
```

The permanent qualification therefore proves a common numeric element-stiffness ledger across every case rather than trusting only metadata.

### 2.4 Recovery identity

Element end actions are checked through:

```text
q = K u - f_fixed - f_initial
```

The retained evidence also checks source-element descendant continuity, FROM/TO mapping, and six-DOF equilibrium. This prevents a reporting/sign shortcut from being mistaken for a mechanics improvement.

---

## 3. Source custody and CAESAR authority

### 3.1 Pinned ACCDB

- Common commit: `45d51ea18624f5775805f399110c1738301c0d90`
- `BM4_L.zip` SHA-256: `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`
- ZIP size: `582488` bytes
- member: `BM4_L.ACCDB`
- authorized member SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`

The previously declared `e21b...` ACCDB hash is recorded as contradicted by the pinned archive member and is not used as authority.

### 3.2 Microsoft ACE custody

The qualification authenticates the Microsoft ACE installer/provider, opens the ACCDB read-only, and verifies that provider access does not change the authorized member bytes.

### 3.3 Pinned CAESAR reports

Additional report authority is bound at Common commit `179c4831cf521cf797c13699cfbbd118315c9244`:

- `LFEA/BM4/Miscdata_BM4_L.txt` — Git blob `ef23d224925e4568185a360ecbe1ee62503f15ff`
- `LFEA/BM4/Loadcasereport_BM4_L.txt` — Git blob `be62eeb08af26dddcd59146e21188c108c4600dd`

These reports independently confirm the selected case formulas/friction settings and provide model-specific thermal, tee, and bend-factor evidence.

---

## 4. Qualification/evidence infrastructure completed

### 4.1 Fail-closed M047 workflow

A previous diagnostic command failed while PowerShell allowed the job to continue. The permanent workflow was hardened with native-command failure handling and explicit artifact-content assertions.

**Concept:** a green CI badge is evidence only when failed evidence-generation commands cannot be ignored.

### 4.2 Numeric operator proof

The old structural stiffness hash did not distinguish all numeric matrix changes. A permanent proof now hashes every recovery-ledger 12×12 global element stiffness matrix.

On the latest qualified head, all six cases share:

- element-stiffness ledger SHA-256: `c393ded51edc81f63ebb85d7d8f5243de47e7a3162582fdf7440b4ad39a4d446`
- combined structural+numeric operator SHA-256: `9422fbda7863c0c4a6080cb8161a3b156522b837026f82346485ee0c9fb5d4c0`

### 4.3 Recovery and equilibrium proof

Every selected case retains passing evidence for:

- `q = K u - f_fixed - f_initial`,
- source mapping,
- descendant-chain continuity,
- recovered six-DOF equilibrium,
- one common numeric operator.

### 4.4 Bend effective-stiffness and local-residual profiler

Optimization work added permanent instrumentation:

- profiler commit: `6000c0ba10716fcc42330ccdc5eea31256f27029`
- workflow integration head: `1ea90ef02d26e2641cce61e161a6f7ea714f86d0`
- run: `31392210270` — PASS
- artifact: `9064195771`
- artifact digest: `sha256:77bbacafb8ee0588c768b22c76d225a46f8f7bc244abdb99482ca8e743f61932`

The retained `bm4l-bend-effective-stiffness.json`:

1. finds all 12 BM4_L bend arcs from the real L3 recovery ledger;
2. assembles the exact numeric matrices used by production;
3. statically condenses internal arc nodes to one 12×12 near/far operator per bend;
4. transforms each operator into a canonical bend basis: `x=tangent`, `z=bend-plane normal`, `y=z×x`;
5. reports a fixed-near 6×6 far-end stiffness/compliance matrix and unit-DOF probes;
6. decomposes `CAESAR reference - LFEA actual` end-action and nodal-kinematic residuals into axial, in-plane, out-of-plane, torsional and bending modes;
7. requires L3 and L14 decompositions to agree.

The exact retained L3/L14 decomposition difference is `0`, and all 12 bends are present, so this is now a permanent, fail-closed search instrument rather than a local one-off experiment.

**Concept:** instead of asking whether a global change lowers 435 failures, future bend work can ask which *matrix mode* is wrong and whether an externally authorized formulation changes precisely that mode.

---

## 5. Accepted mechanics layers

### 5.1 B31J smooth-90 bend flexibility

The governed B31J smooth-90 treatment is used for 90° bends rather than the older generic bend coefficient. This changes the common stiffness operator, so all six cases are qualified after the change.

### 5.2 Straight-pipe Timoshenko shear (`kappa = 0.5`)

CAESAR pipe-beam authority gives a transverse shear coefficient of `2`; in the LFEA Timoshenko kernel this maps to effective shear area `kappa A` with:

```text
kappaY = kappaZ = 0.5
```

High-signal examples from the earlier root-cause evidence include:

```text
node 20090 UY
reference          -197.260
before             -446.039
after              -212.432
absolute error      248.779 -> 15.172
```

and source element 4 TO `MZ`:

```text
reference          -484.627
before             -667.362
after              -493.973
absolute error      182.735 -> 9.346
```

The same mechanics change improves displacement, force and moment in the expected coupled direction.

### 5.3 Finite CAESAR default restraint stiffness

Blank CAESAR restraint stiffness is represented through the large finite defaults rather than exact mathematical DOF elimination. With BM4_L input units, the governed values are approximately:

```text
translation = 1.0e14 N/m
rotation    = 5.729577951e13 N.m/rad
```

This is especially relevant to literal near-zero support rows.

### 5.4 Matching-pipe rigid-element shear

Rigid element stiffness is based on matching pipe-like stiffness construction. The accepted pipe Timoshenko treatment is therefore used in that authorized rigid stiffness path rather than classifying every `RIGID` as Euler-Bernoulli.

### 5.5 Directional B31J tee flexibility and Kb evidence

Welding tees use directional run/branch flexibility through rotational springs attached to existing spans. The independent CAESAR-report Kb comparisons pass closely:

- tee `20160`: ~`0.034%` relative Kb difference
- tee `20295`: ~`0.078%`

Tee `20295` still has a very small entered nominal diameter mismatch: CAESAR prints branch `FLEXb=1.323`, while the strict generic B31J path reconciles the geometry and obtains about `1.321436`. Because Kb already passes, the generic B31J applicability guard was not weakened merely to improve a benchmark count.

### 5.6 P1 bend pressure stiffening

The pinned CAESAR Misc report directly shows that the bend pressure-stiffening pair corresponds to `P1=11.6 MPa`, not the larger hydro pressure. For bend `20120` CAESAR prints:

```text
FLEX : 2.898 -> 3.031
SIFi : 1.508 -> 1.582
SIFo : 1.257 -> 1.319
```

Changing only the BM4_L bend pressure source from hydro-inclusive `MAX_DEFINED` to `P1` reduced literal objective failures:

```text
494 -> 444
```

This layer was accepted because independent report authority selected P1, not because the count happened to improve.

### 5.7 Timoshenko shear in the ten reducer cylinders

CAESAR describes a concentric reducer stiffness model as ten successively changing pipe cylinders. Those internal cylinders previously used Euler-Bernoulli stiffness even though ordinary CAESAR pipe spans had already been qualified as Timoshenko.

Each reducer cylinder now uses the same governed `kappa=0.5` pipe shear treatment. The ten-cylinder count, midpoint sampling, loads, thermal strain, pressure strain and condensation are unchanged.

The permanent B-3.23 regression proves that ten uniform Timoshenko cylinders condense to one equivalent full-length Timoshenko pipe, preventing subdivision itself from creating artificial extra compliance.

Measured effect:

```text
444 -> 435 literal objective failures
```

---

## 6. Current benchmark state

Current governed triples are **restraint / displacement-rotation / source-end action**:

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
restraint              9
displacement/rotation 212
source-end action     214
total                  435
```

Pinned reproduction before the accepted layers was approximately:

```text
restraint              32
displacement/rotation 513
source-end action     797
total                 1342
```

So the clean workstream has reduced the literal total by about `67.6%` without modifying references or tolerances.

---

## 7. Bend-profiler findings: what to optimize next

The new profiler changes the search strategy substantially.

### 7.1 Largest bend residuals by L3 far-end moment correction

| Rank | Bend | Source | Force correction norm | Moment correction norm |
|---:|---|---:|---:|---:|
| 1 | `ACCDB-BEND-1` | 5 | `3483.54 N` | `486.40 N.m` |
| 2 | `ACCDB-BEND-9` | 43 | `546.28 N` | `485.21 N.m` |
| 3 | `ACCDB-BEND-3` | 20 | `367.03 N` | `324.89 N.m` |
| 4 | `ACCDB-BEND-2` | 19 | `367.03 N` | `258.27 N.m` |
| 5 | `ACCDB-BEND-11` | 85 | `52.41 N` | `151.75 N.m` |
| 6 | `ACCDB-BEND-12` | 88 | `65.47 N` | `122.37 N.m` |

For source 5 / bend 1, the local far-end correction is approximately:

```text
axial force                  -3482.50 N
in-plane shear                  +76.53 N
out-of-plane shear              -37.41 N
torsion                        -140.94 N.m
out-of-plane bending moment     -19.80 N.m
in-plane bending moment        +465.12 N.m
```

This gives a much stronger physical signature than a global failure count.

### 7.2 Aggregate absolute L3 far-end action corrections over all 12 bends

```text
AXIAL_FORCE                     5078.00 N
IN_PLANE_SHEAR                  2079.20 N
OUT_OF_PLANE_SHEAR               573.44 N
TORSION                           422.92 N.m
OUT_OF_PLANE_BENDING_MOMENT       456.99 N.m
IN_PLANE_BENDING_MOMENT          1587.11 N.m
```

The largest force-mode mismatch is axial, followed by in-plane shear. The dominant bending-moment mismatch is in-plane.

### 7.3 Aggregate far-node kinematic corrections

```text
AXIAL_TRANSLATION                 0.002387 m
IN_PLANE_TRANSLATION              0.002454 m
OUT_OF_PLANE_TRANSLATION          0.002126 m
TORSIONAL_ROTATION                0.000317 rad
OUT_OF_PLANE_BENDING_ROTATION     0.000548 rad
IN_PLANE_BENDING_ROTATION         0.000731 rad
```

The thermal residual is therefore not a single scalar expansion error; it is a coupled curved-component displacement/action signature.

### 7.4 Existing bend operator already contains strong coupling

For bend 1, the fixed-near compliance matrix shows normalized coupling magnitudes approximately:

```text
UX <-> UY   0.8926
UY <-> RZ   0.8902
UX <-> RZ   0.7342
UZ <-> RY   0.7169
```

Other major bends show nearly the same axial/in-plane translation coupling magnitude (`~0.89`).

**Key conclusion:** the next question is **not** “does the current bend have axial/in-plane coupling?” It clearly does. The high-value question is whether CAESAR's `BEND_AXIAL_SHAPE=YES` uses a different curved-beam shape/compliance magnitude or additional matrix terms from the segmented straight-frame-chain approximation.

That distinction prevents a low-information experiment such as adding an arbitrary global bend softness multiplier.

---

## 8. Important hypotheses tested and rejected/bounded

### 8.1 Scalar thermal alpha is not the main solution

The CAESAR report prints T1 total strain as `0.0012 mm/mm`. Current provisional alpha gives:

```text
1.17e-5 /K * 99 K = 0.0011583
```

which is inside the report's printed interval. The retained audit shows that no single scalar strain inside that interval explains the meaningful L3 residual family. Exact alpha is still needed for provenance, but benchmark fitting of alpha is rejected.

### 8.2 Bourdon partial modes rejected

Removing either translation or rotation from the required combined Bourdon mode makes high-signal pressure rows much worse. `TRANSLATION_AND_ROTATION` remains governed.

### 8.3 Bend gravity centroid refinement is too small

Exact arc centroid versus chord-midpoint placement produces a very small gravity moment shift relative to the remaining large residuals. It is not the dominant root cause.

### 8.4 Reducer section sampling remains provisional

The ten-cylinder count is authoritative, but the public documentation does not identify the exact representative section position in each tenth. `MIDPOINT_LINEAR_INTERPOLATION_CANDIDATE_V1` remains marked provisional and is not tuned against BM4_L.

### 8.5 MEC-21-like curved-bend shear remains authority-blocked

Earlier numerical experiments were promising, but no independently retrievable primary equation authority has yet justified promotion. It remains diagnostic only.

---

## 9. Future roadmap

The profiler is now complete, so the roadmap moves from broad experiments to matrix-level authority.

### Priority 1 — Obtain authoritative curved-bend axial-shape/matrix equations

**Target question:** what exact stiffness/compliance terms does CAESAR use when `BEND_AXIAL_SHAPE=YES`, especially in the axial/in-plane subspace?

**Work:**

1. locate primary Hexagon/Intergraph/CAESAR bend axial-shape or equivalent curved-beam equations;
2. map the equations to the profiler's canonical six-DOF endpoint basis;
3. implement them first in an isolated bend matrix/unit test, not in BM4_L;
4. compare matrix-block direction and magnitude against the retained production bend operator;
5. only then run a one-factor BM4_L A/B.

**Acceptance:** external authority + predicted local mode movement + common numeric K + recovery/equilibrium PASS. No fitted bend scale.

### Priority 2 — Use bend 1 / source 5 as the first high-signal falsification case

Any candidate axial-shape formulation should predict the direction of the large `~3.48 kN` axial and `~465 N.m` in-plane moment correction on source 5 before looking at global counts. Bend 9/source 43 is a second independent in-plane moment/shear check.

A candidate that improves total counts but moves these targeted local modes in the wrong direction should be rejected.

### Priority 3 — Close exact thermal-expansion provenance

Obtain sufficiently precise CAESAR material-library total strain/Print Alphas for A106 Grade B at `21 C -> 120 C`. Update alpha only from authority. This is provenance work and may make a modest numerical correction, but existing evidence says it cannot explain the dominant residual family alone.

### Priority 4 — Resolve reducer sampling authority

If primary CAESAR documentation or an independent observable identifies start/mid/end sampling for the ten cylinders, change only that rule and qualify it. Never select a fractional sampling position by minimizing BM4_L errors.

### Priority 5 — Resolve tee 20295 compatibility locally

If needed, represent CAESAR's tiny nominal run/branch diameter tolerance only in the ACCDB adapter with explicit provenance. Keep the generic B31J calculator fail-closed.

### Priority 6 — Near-zero literal rows

After large mechanical residuals are closed, trace the remaining near-zero rows through report precision, finite-restraint motion, recovery cancellation and numeric formatting. Keep the governed acceptance thresholds unchanged.

### Priority 7 — Final deterministic closure

Before completion:

1. every nonzero governed row `<10%`;
2. zero-reference absolute gates pass;
3. all 97 nodes × 6 DOFs and 96 source elements × 12 end components remain covered;
4. linear identities hold;
5. equilibrium/recovery/source mapping pass;
6. ACCDB/report custody remains pinned;
7. numeric K is common across all six cases;
8. repeat final qualification deterministically and compare hashes/results;
9. remove any one-shot diagnostics not intended as permanent evidence;
10. update PR/issue handoff with exact final authority and artifact IDs.

---

## 10. Rules for future agents on PR #1001

1. Re-fetch PR head before every write; concurrent agents have moved the branch before.
2. Stack additive commits; do not rewrite unknown history or force-push.
3. Do not modify Issue #991 unless the user explicitly asks. A user-authorized report-link comment already exists.
4. Keep one physical hypothesis per mechanics commit.
5. Do not fit pressure, alpha, flexibility, sampling fractions, signs or tolerances to benchmark output.
6. Keep rejected one-shot workflows/parameter sweeps out of the permanent diff.
7. Count improvement alone is not acceptance; require physical authority and the predicted local signature.
8. Any new diagnostic used for acceptance must fail closed and be retained in the qualification artifact.
9. Preserve the permanent M047 workflow and the clean-room source/report custody rules.

---

## 11. Current conclusion

PR #1001 has reduced BM4_L from a broad multi-mechanism mismatch to a much narrower special-component/operator problem. Literal objective failures have fallen from about `1342` to `435` while preserving source custody, benchmark references and acceptance tolerances.

The accepted mechanics now cover smooth-90 B31J behavior, straight/rigid/reducer pipe shear where independently authorized, finite restraint defaults, directional tee flexibility/Kb, and P1 bend pressure stiffening. The qualification also proves the common numeric operator, recovery identity and equilibrium.

The new bend effective-stiffness profiler is the key optimization milestone: it shows that the remaining thermal mismatch is concentrated in axial/in-plane curved-bend modes and that the existing segmented bend already contains strong axial/in-plane coupling. The next defensible production change therefore requires authoritative CAESAR curved-bend axial-shape/matrix equations—not a generic softness factor or benchmark-fitted coefficient.

The benchmark is **materially improved and substantially better understood, but not closed**.
