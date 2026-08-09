# LAFEA Automatic Meshing — Engineering Method and Qualification Procedure

**Document purpose:** define the engineering method, mathematical basis, authority boundaries, verification/validation/qualification ladder, and change-control rules for LAFEA automatic and retained-mesh refinement.

**Audience:** an FEA engineer who understands basic continuum/shell finite elements but is still learning how to qualify a production mesher rather than merely generate a visually plausible mesh.

**Status:** stable engineering procedure with a dated qualified-baseline appendix. The procedure should change only when the engineering method or authority model changes. Exact producer revisions, PR heads, workflow runs, and current exclusions belong in the baseline appendix.

**Primary governance reference:** `npm run check:lafea-meshing` plus the exact-head workflow `.github/workflows/lafea-meshing-exact-head.yml`.

**Current producer identity at the baseline recorded in this document:**

```text
producerId             = LAFEA_CORE_MESHER
producerRevision       = LAFEA.10.T6Q8.SHELL.V6
qualificationId        = LAFEA-MESH-Q1
qualificationRevision = R7
repeatability intent   = byte-identical canonical mesh
```

---

# 1. Why this document exists

Meshing is easy to underestimate because a bad mesh can look convincing.

A viewport can show triangles or quadrilaterals that appear smooth and regular while the mesh is still unusable because:

- the boundary does not represent the authoritative geometry;
- a hole has been bridged or filled incorrectly;
- quadratic midside nodes do not lie on the physical curved boundary;
- element orientation or Jacobian is invalid;
- the declared element family does not match actual connectivity;
- target-size refinement adds boundary nodes but no interior resolution;
- a mapped mesh is forced through a geometrically singular logical corner;
- node numbering changes between identical runs;
- a producer writes a mesh without proving current source/profile ancestry;
- a stale mesh remains runnable after the geometry changes;
- a quality BLOCK is hidden by changing thresholds;
- a source facet mesh is relabelled as an automatically generated mesh;
- local refinement targets source entities rather than the retained generated mesh;
- a mesh passes element-shape gates but the engineering result has not converged.

The objective of LAFEA meshing qualification is therefore **not**:

- to make the canvas look dense;
- to maximize element count;
- to reproduce another mesher's node numbering;
- to force every geometry into Q8;
- to relax quality thresholds until evidence becomes green;
- to silently approximate unsupported topology;
- to let the producer certify its own lifecycle/release authority.

The objective is:

> **Generate the exact disclosed finite-element topology allowed by the current geometry/profile authority, prove its element semantics and numerical quality independently, prove deterministic canonical reproduction, then let an independent evidence/custody layer decide whether that mesh is current and usable.**

The central debugging rule is:

> **Find the earliest meshing invariant that fails, fix it at the layer that owns that invariant, and rerun the full qualification ladder without weakening any downstream gate.**

---

# 2. Verification, validation, qualification, and convergence are different

These terms must not be used interchangeably.

## 2.1 Verification — “Did the mesher implement its mathematical rules correctly?”

Verification uses independently checkable geometry and numerical invariants.

Examples:

- a line is subdivided to the requested size rule;
- an arc midpoint lies on the analytic circle rather than the chord;
- a square triangulation has exact area;
- a square-with-hole mesh has outer area minus hole area;
- every T6 boundary midside lies on its owning source curve;
- a Delaunay edge recovery leaves constrained boundaries intact;
- a Q8 mapped rectangle has positive Jacobian everywhere;
- a shell UV mesh mapped to 3D remains on the declared plane;
- identical input produces byte-identical canonical nodes/connectivity.

Verification does not require a commercial FEA result.

## 2.2 Validation — “Is this verified meshing method appropriate for the intended FE problem?”

A mathematically correct mesher can still be unsuitable for a target formulation.

Examples:

- boundary-only triangulation can be topologically valid but become increasingly slender when the boundary is refined without interior Steiner points;
- a single-block Coons map can be mathematically defined but nearly singular at a rounded-away logical corner;
- a hole can be meshed with an artificial seam, but the seam may create duplicate topology and poor recombination behavior;
- a shell facet list can be a valid discretization but is not a mesh-independent surface authority from which to claim automatic generation;
- a very coarse hole-bearing shell mesh can be topologically valid but under-resolve a narrow material ligament.

Validation asks whether the verified method has the correct physical/discretization interpretation for LAFEA.3, LAFEA.4, or LAFEA.5.

## 2.3 Qualification — “Do we have enough controlled evidence to authorize this capability?”

Qualification requires all of the following together:

- exact source/domain/geometry/profile custody;
- explicit supported stage and element-family scope;
- verified topology generation;
- verified element-family semantics;
- unchanged governed quality thresholds;
- resource-limit compliance;
- deterministic canonical replay;
- independently rebuilt analysis-mesh evidence;
- current parent-hash ancestry;
- domain-first custody classification;
- public workbench route where applicable;
- exact-head CI evidence;
- unrelated meshing regressions green;
- limitations and falsified hypotheses recorded.

A mesh image, a direct producer return value, or a passing quality scalar alone is not qualification.

## 2.4 Mesh quality — “Are the generated elements geometrically acceptable?”

Mesh quality evaluates element geometry: aspect ratio, Jacobian, minimum angle, warpage, boundary discretization density, and other profile-specific limits.

Quality is necessary but not sufficient.

## 2.5 Convergence — “Is the engineering response sufficiently insensitive to further refinement?”

A quality-PASS mesh is **not** automatically a converged analysis mesh.

For a structural quantity `q`, a normal convergence study compares at least three controlled mesh levels and evaluates a declared response quantity, for example:

\[
\Delta q_i = \frac{|q_i-q_{i-1}|}{\max(|q_i|,q_{floor})}
\]

using the repository's actual convergence profile and quantity-specific limits.

Raw singular peaks are not valid convergence quantities merely because the mesh is finer. Holes, re-entrant corners, point loads, rigid attachment edges, weld toes, and shell discontinuities require engineering judgment and, where applicable, SCL or structural-stress procedures.

**Rule:**

> Mesh-producer qualification proves the mesh-generation capability. Structural-response convergence remains separate evidence.

---

# 3. Current qualified scope

The current registry authority is `src/workspace/lafea-mesh-producer-registry.js`.

## 3.1 Stage/family matrix

| Stage | Qualified automatic families | Qualified retained local refinement | DOF basis used for resource estimate |
|---|---|---|---|
| `LAFEA.3` | `T3`, `T6`, `Q8` | `T3`, `T6` only | 2 DOF/node |
| `LAFEA.4` | `CST_DKT_TRI3_THIN_SHELL_V1` | no | 5 DOF/node |
| `LAFEA.5` | `CST_DKT_TRI3_THIN_SHELL_V1` | no | 5 DOF/node |

The shell five-DOF basis is:

```text
UX, UY, UZ, R1, R2
```

There is no drilling DOF in the qualified local-shell basis.

## 3.2 Resource ceilings

The producer services requests only within the declared ceilings:

```text
maximum nodes          = 200,000
maximum elements       = 100,000
maximum estimated DOFs = 400,000
```

A request above a ceiling is a BLOCK disposition. It is never silently truncated.

## 3.3 LAFEA.3 qualified geometry/strategy envelope

The current continuum producer includes:

- planar analysis geometry;
- line and supported analytic arc boundaries;
- one OUTER loop and qualified HOLE loops through the refined constrained-Delaunay path;
- unstructured T3/T6 automatic generation with interior Steiner refinement;
- true constrained holes without an artificial bridge;
- mapped all-Q8 generation for a valid four-logical-side region;
- logical-side recognition across collinear split-side feature vertices;
- deterministic canonical numbering;
- v2 evidence/custody, render, import, and export path;
- retained T3/T6 local refinement against canonical generated-mesh identities.

## 3.4 Shell qualified geometry envelope

For LAFEA.4 and LAFEA.5 the current external producer includes:

- one mesh-independent planar midsurface patch;
- declared 3D origin plus orthonormal `axisU`, `axisV`;
- shell director defined by `axisU × axisV`;
- straight outer boundary segments;
- zero or more straight-segment, non-nested holes;
- OUTER CCW and HOLE CW in the declared UV basis;
- deterministic planar meshing in UV;
- mapping of generated nodes back to the 3D midsurface;
- `CST_DKT_TRI3_THIN_SHELL_V1` output only;
- 5 DOF/node accounting;
- v2 evidence and domain-first custody;
- public workbench route to `CURRENT_PASS`.

## 3.5 Explicitly unqualified or fail-closed

Do not infer qualification for:

- curved shell midsurfaces;
- multi-patch shell seams;
- shell offset-surface generation;
- shell thickness-transition meshing;
- shell local refinement;
- Q8 local refinement;
- a single-block mapped-Q8 interpretation of a rounded-away/filleted logical corner;
- arbitrary mixed Q8+T6 evidence under a single-family profile;
- any element family not declared by the producer registry;
- LAFEA.6;
- release qualification, code assessment, SCL, fatigue, plasticity, contact, or nonlinear mechanics merely because a mesh exists.

---

# 4. Authority chain — what makes a mesh authoritative

A junior engineer should be able to trace this chain without guessing.

For the governed domain-first route, the conceptual chain is:

```text
CURRENT source authority
→ CURRENT analysis domain
→ CURRENT analysis geometry / shell midsurface evidence
→ canonical mesh profile
→ governed mesh intent / refinement command
→ immutable generation plan
→ qualified producer execution
→ canonical mesh content
→ element-family validation
→ profile-driven quality evaluation
→ v2 analysis-mesh evidence
→ parent-hash revalidation
→ domain-first custody projection
→ CURRENT_PASS retained analysis mesh
→ Discretization / run eligibility
```

The producer participates in this chain but does **not** own the final lifecycle decision.

## 4.1 Producer capability authority

The registry declares:

- producer ID/revision;
- qualification ID/revision;
- authorized stages/families;
- generation modes;
- local-refinement scope;
- resource ceilings;
- governance reference.

Adding a stage or family to the registry is itself a qualification claim.

## 4.2 Mesh profile authority

The canonical mesh profile is the source of truth for the requested family and quality thresholds.

A request must not silently override the profile after the profile hash is bound.

## 4.3 Plan authority

A plan binds the current parents and intended generation configuration. It is an immutable instruction/evidence link, not lifecycle authority.

A plan must not claim that it has already produced an authoritative mesh.

## 4.4 Producer output authority

A producer output contains generated content and lineage fields, but producer output explicitly does not self-promote lifecycle authority.

For shell output this is visible as:

```text
lifecycleAuthority = false
```

## 4.5 Evidence authority

The v2 evidence layer rechecks:

- stage;
- source hash;
- domain hash;
- geometry hash;
- profile hash;
- mesh hash;
- capability hash;
- qualification hash;
- plan hash;
- family compatibility;
- quality status.

A producer cannot bypass this by declaring its own mesh “good.”

## 4.6 Custody authority

Domain-first custody decides whether the retained evidence is current relative to the stage's present parent authorities.

If source/domain/geometry/profile ancestry changes, old generated evidence becomes stale or is invalidated according to the custody contract.

**A generated mesh is authoritative only when the entire chain agrees.**

---

# 5. Producer assertions that are forbidden

The repository intentionally separates producer competence from lifecycle authority.

A mesh producer must not self-assert:

- `lifecycleAuthority = true`;
- release qualification;
- engineering approval beyond its declared producer scope;
- that a plan itself `producesMesh` as lifecycle evidence;
- that a plan owns engineering authority;
- execution authorization outside the registry/qualification record;
- that a quality-BLOCK mesh is acceptable;
- that a different family is “equivalent” to the profile family;
- that a source discretization should be treated as newly generated mesh.

This boundary exists so that a bug in the producer cannot certify itself.

---

# 6. Geometry and topology mathematics

Meshing begins with geometry invariants, not with triangles.

## 6.1 Units

All generated coordinates remain in the declared geometry length unit. Quality quantities are generally dimensionless except angular measures and physical size/ligament values.

Typical dimensional quantities:

- coordinate: `[length]`;
- target element size: `[length]`;
- chord error: `[length]`;
- material ligament: `[length]`;
- aspect ratio: dimensionless;
- scaled Jacobian: dimensionless;
- minimum angle/warpage: degrees.

Do not convert units inside one part of the mesher while leaving the profile or evidence in another unit system.

## 6.2 Loop orientation

For planar loop vertices `(x_i,y_i)`, signed area is based on the shoelace/Green-theorem form:

\[
A_s = \frac{1}{2}\sum_i (x_i y_{i+1}-x_{i+1}y_i)
\]

The qualified convention is:

```text
OUTER : CCW → positive signed area
HOLE  : CW  → negative signed area
```

For shell geometry this orientation is interpreted in the declared right-handed UV basis.

Orientation is validated, not silently normalized, because silently reversing a loop can hide upstream geometry/custody errors.

## 6.3 Material area

For one outer loop and holes:

\[
A_{material}=A_{outer}-\sum_h |A_h|
\]

A qualification fixture should prove that the sum of generated element areas equals the material area within the declared numerical tolerance.

## 6.4 Line geometry

A line from `P0` to `P1` is

\[
P(t)=(1-t)P_0+tP_1,\qquad 0\le t\le1
\]

Boundary subdivision may introduce stations, but exact source endpoints and declared feature vertices remain retained.

## 6.5 Arc geometry

For center `C`, radius `r`, and angular parameter `θ`:

\[
P(\theta)=C+r[\cos\theta,\sin\theta]
\]

For a quadratic boundary, the T6/Q8 midside node on an arc must be evaluated from the analytic curve parameter, not replaced by the straight chord midpoint.

For an angular subspan `Δθ`, the chord sagitta is:

\[
e_c=r\left(1-\cos\frac{\Delta\theta}{2}\right)
\]

This is the type of geometric quantity a curvature/chord-error rule controls.

## 6.6 Shell planar basis

A shell midsurface point is represented by:

\[
X(u,v)=O+u\,e_U+v\,e_V
\]

with:

\[
\|e_U\|=1,\quad \|e_V\|=1,\quad e_U\cdot e_V=0
\]

and director:

\[
n=e_U\times e_V
\]

The current qualified shell mesher does not infer this basis from an existing facet mesh. It receives a mesh-independent geometry authority.

That distinction is critical: **source facets are discretization; origin/axes/loops are geometry authority.**

---

# 7. Element-family semantics

Element labels are not cosmetic metadata.

## 7.1 T3

A T3 is a three-node linear triangle.

Its geometric topology is defined by three corner nodes. A shell `CST_DKT_TRI3_THIN_SHELL_V1` similarly receives three geometric corner nodes, although its structural DOF/formulation authority is separate from the mesh producer.

## 7.2 T6

A T6 has three corner nodes plus three midside nodes.

Using barycentric coordinates `L1,L2,L3`, the quadratic triangle shape functions are:

\[
N_1=L_1(2L_1-1),\quad
N_2=L_2(2L_2-1),\quad
N_3=L_3(2L_3-1)
\]

\[
N_4=4L_1L_2,\quad
N_5=4L_2L_3,\quad
N_6=4L_3L_1
\]

Therefore a curved boundary is represented incorrectly if a boundary midside node is moved from the analytic curve to the chord simply for convenience.

Current production behavior retains analytic boundary ownership and uses straight midpoints only for interior edges where the geometry is not curved.

## 7.3 Q8

Q8 is an eight-node serendipity quadrilateral.

The mapping is isoparametric:

\[
x(\xi,\eta)=\sum_{i=1}^{8}N_i(\xi,\eta)x_i,
\qquad
y(\xi,\eta)=\sum_{i=1}^{8}N_i(\xi,\eta)y_i
\]

and the Jacobian is derived from `∂(x,y)/∂(ξ,η)`.

A Q8 evidence profile means every retained element in that mesh must actually have Q8 topology. Unpaired T6 triangles cannot be relabelled or padded to make a Q8 request appear successful.

## 7.4 Single-family evidence rule

The canonical profile currently declares one continuum element family.

Therefore the production policy is:

> **Q8 is all-Q8 or explicit rejection.**

If an unstructured Q8 request cannot be fully recombined, generation fails with a truthful reason such as:

```text
LAFEA_MESH_ENGINE_Q8_FULL_RECOMBINATION_REQUIRED
```

This is preferable to a mixed mesh whose evidence says “Q8” while containing T6.

---

# 8. Mapped Q8 strategy

Mapped Q8 is appropriate only when the region has a valid four-logical-side topology.

## 8.1 Logical sides, not raw segment count

A physical side may contain multiple collinear source segments because of:

- a load-application vertex;
- a support/feature station;
- source-model splitting;
- an explicit geometry feature.

Those source vertices must be preserved without incorrectly converting the region into a five-sided topology.

The logical-side recognizer therefore groups side chains using genuine tangent discontinuities/hard corners rather than simply requiring exactly four raw segments.

A split side can remain one logical side while retaining the internal feature vertex.

## 8.2 Opposite-side discretization

A mapped grid requires compatible station counts on opposite logical sides. The implementation deterministically equalizes the discretization needed for the structured map.

A mismatch is not silently distorted into a map.

## 8.3 Transfinite/Coons map

Conceptually a four-sided Coons patch is:

\[
R(\xi,\eta)=
(1-\eta)C_0(\xi)+\eta C_1(\xi)
+(1-\xi)D_0(\eta)+\xi D_1(\eta)-B(\xi,\eta)
\]

where `B` subtracts the bilinear corner blending counted twice.

A valid map requires four genuine logical corners with a non-degenerate local parameterization.

## 8.4 Why a rounded-away corner is not a fake mapped corner

During qualification, a geometry with only three genuine hard corners plus a filleted smooth transition was temporarily interpreted as four sides by introducing a synthetic smooth split.

The resulting mapped Q8 included a near-singular element with minimum scaled Jacobian approximately:

```text
0.0005559769
```

This was correctly rejected.

The root cause was not “insufficient threshold.” At a fake Coons corner, adjacent logical tangents can become collinear, producing a singular or nearly singular parameterization.

The accepted rule is:

> A mapped region requires four genuine non-tangent logical corners.

If rounded-corner Q8 is required later, it needs a qualified **multi-block decomposition**, not a synthetic single-block corner.

---

# 9. Unstructured constrained-Delaunay T6 strategy

The unstructured production path is intentionally deterministic.

## 9.1 Why boundary-only refinement failed

The original path triangulated only the boundary ring.

If the boundary has more and more nodes but the interior has none, every triangle still spans a significant fraction of the domain. The characteristic base decreases while triangle altitude may remain domain-scale, creating slivers.

That is why refining target boundary spacing originally made quality worse.

The fix was not to tighten thresholds or add still more boundary nodes. The fix was **interior point insertion**.

## 9.2 Initial triangulation

For a simple outer polygon:

1. deterministic ear clipping produces a valid initial triangulation;
2. boundary edges are marked constrained;
3. Lawson flips act only on eligible interior edges;
4. the final corner triangulation is upgraded to T6 where required.

The scan and edge orders are deterministic.

## 9.3 Interior Steiner lattice

The qualified refinement uses a staggered triangular/equilateral lattice with row spacing:

\[
h_y = h\frac{\sqrt3}{2}
\]

where `h` is the target element length.

Candidates are filtered by:

- material-domain inclusion;
- boundary clearance;
- existing-point clearance;
- deterministic sort/order.

A candidate strictly inside one triangle performs a `1 → 3` split.

A candidate exactly on an unconstrained shared edge performs a deterministic `2 → 4` split.

Constrained boundary edges are never split accidentally by the generic interior insertion rule.

## 9.4 Lawson restoration

After insertion, constrained Lawson flips restore the local Delaunay condition without flipping protected boundary/hole edges.

One flip is applied at a time before rebuilding edge ownership. This avoids stale edge-to-triangle indexing after topology mutation.

## 9.5 Refinement acceptance behavior

A proper size ladder must show that reducing target size increases interior resolution without introducing blockers.

The permanent 200 × 120 mm T6 ladder qualified target sizes:

```text
60 → 30 → 15 → 8 mm
```

with zero blocking elements and monotonic density response under the governed profile.

The point of the ladder is not the exact counts; it proves that the size parameter controls interior resolution rather than merely boundary segmentation.

---

# 10. Hole meshing

Hole meshing is a topology problem before it is a quality problem.

## 10.1 Rejected approach — artificial bridge/seam

One common technique cuts a bridge from the outer boundary to a hole, turning a multiply connected region into a simple polygon.

It is easy to implement, but it creates extra seam topology that must later be welded or specially interpreted. It also interacts badly with recombination and can produce duplicated boundary ownership.

This approach was not chosen for the governed production path.

## 10.2 Qualified approach — true constrained hole boundary

The refined constrained-Delaunay path performs:

1. triangulate the outer material envelope;
2. discretize each HOLE loop;
3. insert every hole boundary corner as a true triangulation vertex;
4. recover every consecutive hole boundary edge by deterministic flipping;
5. mark recovered hole edges as constrained;
6. remove triangles whose centroids lie in the cavity;
7. verify hole boundary ownership;
8. seed interior material points only in material;
9. optionally add the qualified bounded material-side transition front where needed;
10. restore constrained Delaunay;
11. upgrade to the requested qualified triangle family.

No artificial seam is introduced.

## 10.3 Analytic curved-hole ownership

For a circular or arc boundary, the constrained corner chord defines topology, but T6 midside geometry remains owned by the analytic curve.

That allows a circular-hole midside to lie on the true radius rather than the polygonal chord.

## 10.4 Hole-front grading

The current interior-refinement revision is:

```text
LAFEA.10.CDT-HOLES-TRI.V3
```

A bounded two-layer material-side front is available for hole boundaries whose local constrained spacing is materially finer than the global interior target.

The front is **conditional**. Straight hole edges already discretized near the global target do not receive an unnecessary second lattice.

This matters because unconditional front insertion can create its own phase/clearance defects.

## 10.5 Canonical circular-hole qualification

The MP2 square-with-circular-hole qualification demonstrated, among other checks:

- true cavity exclusion;
- exact circular boundary ownership;
- no generated node or element centroid in the hole;
- zero blocking elements;
- minimum scaled Jacobian about `0.2633866`;
- maximum aspect ratio about `4.7617`;
- deterministic replay;
- v2 evidence PASS;
- domain-first `CURRENT_PASS` custody.

The exact values are evidence for that fixture, not universal quality targets.

---

# 11. Shell meshing

Shell meshing has an additional geometry/kinematics ownership problem.

## 11.1 Why existing shell facets could not simply become the “automatic mesher”

Before P2-8, LAFEA.4/.5 had source/caller shell discretization, while the local-shell solver explicitly declared:

```text
NO_AUTOMATIC_OR_ADAPTIVE_MESHING
```

Relabelling existing facets as generated mesh would have made a false provenance claim.

The correct prerequisite was a mesh-independent shell midsurface authority.

## 11.2 External producer boundary

The current shell flow is:

```text
mesh-independent planar midsurface evidence
→ UV planar geometry
→ qualified external planar mesher
→ generated 2D nodes/connectivity
→ map nodes to 3D midsurface
→ compile TRI3 shell connectivity
→ v2 analysis-mesh evidence
→ custody
→ later local-shell model assembly/solve
```

The solver remains a solver. It does not become a meshing authority.

## 11.3 3D mapping

Each generated UV node `(u,v)` maps to:

\[
X=O+u e_U+v e_V
\]

The current shell producer then converts generated planar triangles to:

```text
CST_DKT_TRI3_THIN_SHELL_V1
```

using the first three geometric corner nodes of each planar triangle.

## 11.4 Planar shell sizing qualification

On the qualified tilted 3D patch, both LAFEA.4 and LAFEA.5 showed:

| target | nodes | elements | estimated DOF | median characteristic length |
|---:|---:|---:|---:|---:|
| 30 mm | 46 | 68 | 230 | 30 mm |
| 15 mm | 161 | 276 | 805 | 15 mm |

Both levels passed unchanged mesh-quality gates.

This proves that target-size refinement survives UV→3D mapping and that stage-aware DOF accounting is active.

---

# 12. Shell holes and material-ligament qualification

A hole-bearing shell patch introduces narrow material ligaments between boundaries.

A topology can be valid while a requested target size is too coarse to represent the ligament robustly.

## 12.1 Governing envelope

The current shell-hole policy requires at least two nominal element lengths across the minimum material ligament:

\[
h_{target}\le\frac{L_{lig,min}}{2}
\]

or, equivalently:

\[
N_{nominal,ligament}=\frac{L_{lig,min}}{h_{target}}\ge2
\]

The plan records:

- `minimumMaterialLigament`;
- `maximumQualifiedTargetElementLength`;
- `minimumElementsAcrossLigament`.

A request outside the envelope fails **before meshing** with:

```text
LAFEA_SHELL_HOLE_TARGET_TOO_COARSE_FOR_LIGAMENT
```

## 12.2 Why this was preferred to post-generation “quality repair”

Qualification temporarily investigated a quality-driven edge-splitting repair for blocked shell-hole meshes.

That direction was rejected because:

- it was computationally expensive;
- it obscured the meaning of the requested global size;
- it could become an uncontrolled adaptive algorithm;
- it attempted to rescue an under-resolved physical ligament after the fact.

The final implementation removes that experiment entirely.

The accepted behavior is explicit: if the declared target is outside the qualified ligament envelope, reject it before generation.

## 12.3 Permanent shell-hole ladder

### One rectangular hole

```text
minimum ligament = 50 mm
maximum qualified target = 25 mm
```

Rejected before meshing:

```text
40, 30 mm
```

Qualified:

| target | nodes | elements | estimated DOF | blockers |
|---:|---:|---:|---:|---:|
| 25 | 100 | 152 | 500 | 0 |
| 20 | 140 | 226 | 700 | 0 |
| 15 | 233 | 392 | 1165 | 0 |
| 10 | 471 | 834 | 2355 | 0 |

### Two disjoint rectangular holes

```text
minimum ligament = 45 mm
maximum qualified target = 22.5 mm
```

Rejected before meshing:

```text
40, 30, 25 mm
```

Qualified:

| target | nodes | elements | estimated DOF | blockers |
|---:|---:|---:|---:|---:|
| 20 | 152 | 246 | 760 | 0 |
| 15 | 244 | 408 | 1220 | 0 |
| 10 | 485 | 856 | 2425 | 0 |

Every qualified level must also replay deterministically.

## 12.4 Shell-hole topology exclusions

The current shell-hole contract rejects:

- reversed hole orientation;
- hole outside the OUTER loop;
- nested holes;
- multiple OUTER loops;
- wrong topology class;
- non-planar midsurface authority;
- unsupported curved midsurface/seam interpretation.

---

# 13. Retained-mesh local refinement

Local refinement must target the **retained generated mesh**, not source geometry IDs.

## 13.1 Why the legacy target namespace was unsafe

The source stage document and the generated v2 mesh can have different node/element identities.

If a refinement command names a source element while the retained generated mesh uses canonical IDs such as `N...`/`E...`, the command can silently target the wrong topology.

The qualified route therefore starts from retained mesh identity.

## 13.2 Parent binding

A refinement command binds exact:

```text
parent artifactHash
parent meshHash
```

and canonical retained target IDs.

A later/stale parent must not be silently substituted.

## 13.3 Qualified family and target envelope

Current local refinement is limited to LAFEA.3 `T3`/`T6` parents.

The local target must satisfy:

\[
0.25h_g\le h_l<h_g
\]

where:

- `h_g` = global target size;
- `h_l` = requested local target size.

Q8 local refinement remains fail-closed because a conforming quadrilateral local-refinement rule has not been qualified.

Shell local refinement remains fail-closed.

## 13.4 Influence field

The plan resolves NODE or ELEMENT target IDs to physical coordinates before hashing the plan.

The current influence radius is governed by the policy, including a global-size factor and local-size lower bound.

The local point field uses a deterministic target-centered triangular lattice. Boundary and point clearances are explicit policy values rather than hidden heuristics.

## 13.5 Atomic custody replacement

Refinement is previewed first.

The retained parent is replaced only after the child:

- actually changes the mesh;
- stays within resource ceilings;
- builds valid v2 evidence;
- has qualification PASS;
- retains current lineage.

If an unknown target, stale parent, excessive refinement ratio, resource failure, or quality BLOCK occurs, the original retained parent remains unchanged.

## 13.6 Qualification witness

The qualified 200 × 120 mm T6 witness used:

```text
global target = 30 mm
local target  = 15 mm
one retained central element target
```

Evidence:

| quantity | parent | refined |
|---|---:|---:|
| nodes | 159 | 403 |
| elements | 68 | 190 |
| local corner count in influence region | 12 | 73 |

Additional retained evidence:

```text
local Steiner points inserted = 61
quality = PASS
blocking elements = 0
byte-identical replay = PASS
invalid-target rejection preserves parent = PASS
Q8 request = explicit rejection
```

---

# 14. Mesh quality mechanics

The profile is the numerical authority. This document explains the metrics but must not be used to override the canonical profile.

## 14.1 Aspect ratio

For the current analysis-mesh evidence implementation, a simple edge-based aspect ratio is:

\[
AR=\frac{L_{max}}{L_{min}}
\]

A zero-length edge is degenerate and rejected.

The generic §10.3 quality regression verifies the canonical metric behavior with:

```text
warning at AR = 3
block   at AR = 10
```

However, a specific canonical mesh profile may declare a different warning threshold. The profile fields are the authority used by v2 evidence.

## 14.2 Minimum triangle angle

For two edges `a`,`b` meeting at a triangle corner:

\[
\theta=\cos^{-1}\left(\frac{a\cdot b}{\|a\|\|b\|}\right)
\]

The generic core quality regression checks:

```text
warning at/below 25° band boundary
block at/below 10°
```

This metric is a useful independent shape diagnostic even where the retained v2 evidence currently aggregates only aspect ratio and scaled Jacobian.

## 14.3 Scaled Jacobian

For a 2D triangle corner with outgoing edge vectors `a` and `b`:

\[
J_s=\frac{a_xb_y-a_yb_x}{\|a\|\|b\|}
\]

For a planar 3D triangle magnitude-based shell shape check:

\[
J_s=\frac{\|a\times b\|}{\|a\|\|b\|}
\]

For isoparametric T6/Q8, the implementation evaluates the applicable element Jacobian measure at governed sample/integration locations.

A non-positive planar Jacobian is always blocking.

The generic core regression checks:

```text
warning = 0.5
block   = 0.2
```

Again, the canonical profile's declared warning/block fields are the evidence authority for a particular generated mesh.

## 14.4 Shell warpage

For a quadrilateral shell, warpage can be measured from the angle between normals of constituent triangles.

The generic §10.3 regression checks:

```text
warning = 5°
block   = 15°
```

Current automatic shell output is TRI3, so quad warpage is not a generated-element metric for that producer family. The generic gate remains important for other supported mesh surfaces and future scope.

## 14.5 Hole/attachment boundary density

The generic quality library contains explicit boundary-count checks, including canonical checks such as:

```text
hole circumference production : at least 16 quadratic edges
hole circumference code/SCL   : at least 24 quadratic edges
attachment/weld closed edge    : at least 12 elements
```

Do not assume every producer path automatically invokes every generic metric. The applicable profile/workflow must explicitly bind the check.

## 14.6 Shell size-to-thickness guidance

The generic mesh-quality check includes a default shell size-to-thickness band around attachments:

```text
0.5 t ≤ h ≤ 2 t
```

Outside that band is currently a warning in the generic quality rule, not automatic proof of failure.

## 14.7 Quality aggregation

Per-metric and per-element status follows:

```text
BLOCK > WARNING > OK
```

The evidence retains blocking/warning element IDs.

A BLOCK is never softened to PASS by the producer.

---

# 15. Quality thresholds must never be tuned to rescue a candidate

When a new strategy produces blocking elements, the permitted engineering responses are:

1. prove the geometry/topology is wrong and fix it;
2. improve the algorithm while preserving the stated target/profile meaning;
3. narrow the qualified envelope and reject unsupported requests;
4. if the profile itself was wrong, change it only through a separately justified profile-governance decision with independent evidence.

Not permitted:

- increase the aspect-ratio block limit because one fixture is poor;
- lower the minimum Jacobian limit because a map is singular;
- change a warning to OK in the presentation layer;
- omit blocking elements from evidence;
- round a bad metric until it crosses the threshold.

The shell-hole qualification is a good example: the final fix was a **ligament-controlled request envelope**, not a weaker Jacobian threshold.

---

# 16. Determinism and canonicalization

The producer's repeatability requirement is stronger than “looks the same twice.”

The intended invariant is:

> Same canonical parents + same canonical profile + same producer revision ⇒ byte-identical canonical mesh content.

## 16.1 Deterministic requirements

A qualified implementation should avoid:

- `Math.random()`;
- time-based seeds;
- process-dependent ordering;
- unordered winner selection;
- async/parallel mutation of topology without a canonical reduction order;
- sort comparators with unresolved ties;
- tolerance-based first-match welding where insertion order chooses the surviving node;
- floating-point reductions whose association order changes across runs.

## 16.2 Canonical ordering

IDs and connectivity should be derived from a total deterministic ordering.

Where sort keys can tie, a deterministic secondary/tertiary key must exist.

## 16.3 Exact shared-coordinate behavior

Exact-equality node welding is deterministic only while shared coordinates are generated by the same canonical expressions over the same operands.

A refactor that computes one nominally identical point through a different floating-point association can break this property.

Therefore deterministic replay tests are required after apparently harmless geometry refactors.

## 16.4 Metadata must not control numerics

Source IDs, display labels, profile names, or geometry names must not change triangulation when the physical canonical geometry/profile values are unchanged, except where those IDs are explicitly part of a stable tie-break contract.

A metadata-dependent topology difference is a determinism/authority defect, not a feature.

## 16.5 Determinism scope

Test both:

- repeated runs in one process;
- independent process invocations.

The repository's determinism check exists specifically because in-process equality alone can miss process-order effects.

---

# 17. The meshing evidence ladder

Every new meshing capability or algorithmic change should climb this ladder in order.

## Level 0 — Freeze custody and implementation identity

Record:

- repository exact-head SHA;
- source hash;
- domain hash;
- geometry/midsurface hash;
- mesh profile identity/hash;
- producer ID/revision;
- qualification ID/revision/hash;
- generation mode;
- stage/family;
- governing workflow/script versions.

If these are not frozen, two runs cannot be meaningfully compared.

## Level 1 — Geometry/topology verification

Prove independently:

- loop closure;
- outer/hole orientation;
- no unresolved references;
- no orphan/multi-owned boundary entities;
- correct material area;
- supported hole containment/nesting rules;
- shell basis normalization/orthogonality where applicable.

A topology failure does not proceed to triangulation.

## Level 2 — Boundary discretization verification

Prove:

- endpoint retention;
- feature-vertex retention;
- target-size behavior;
- arc/chord error behavior;
- analytic midside placement;
- deterministic station ordering.

## Level 3 — Core topology-generation verification

For the selected strategy prove:

- exact area coverage;
- no overlaps;
- no cavity fill;
- no missing material;
- constrained-edge ownership;
- manifold edge ownership;
- positive orientation;
- strategy-specific invariants.

Examples:

- mapped four-side compatibility;
- constrained Delaunay protected boundaries;
- hole edge recovery;
- local refinement boundary preservation.

## Level 4 — Element-family semantics

Prove that every element's declared type matches its actual node topology and the bound profile.

This is where the all-Q8-or-reject rule belongs.

## Level 5 — Quality qualification

Evaluate the actual generated coordinates/connectivity with the canonical profile.

Require:

- no blocking elements for a custody-eligible candidate;
- all blocking/warning IDs retained;
- no threshold relaxation;
- appropriate size/ligament/warpage/boundary-count rules for the qualified scope.

## Level 6 — Determinism/canonical bytes

Replay the same canonical request and compare canonical mesh bytes/hash.

Repeat across a separate process where applicable.

## Level 7 — Evidence and custody

Do not trust the direct producer return.

Build v2 evidence and prove:

- parent hashes match;
- mesh hash recomputes;
- profile family matches;
- quality recomputes;
- capability/qualification/plan hashes match;
- lifecycle projection becomes current only through custody.

## Level 8 — Product/workbench route

Where the capability is user-facing, drive the governed public route:

```text
Discretization
→ bind profile
→ plan/generate or refine
→ retain evidence
→ render/export/import
→ run eligibility
```

A core library test is not enough if the UI route is unreachable.

## Level 9 — Exact-head and unrelated regression

Finally:

- verify exact candidate SHA;
- clean dependency install;
- run dedicated new qualification;
- run existing stage/refinement/custody gates;
- run `npm run check:lafea-meshing`;
- retain workflow evidence;
- confirm no temporary diagnostic/probe code remains.

Only then may the capability/revision be recorded as qualified.

---

# 18. Falsification-first engineering

Before changing production meshing behavior, write a hypothesis that can fail.

Bad hypothesis:

> “The Delaunay mesher needs more refinement.”

Good hypothesis:

> “Quality degrades as target size decreases because only the boundary is refined; if true, introducing deterministic interior Steiner points should make a 60→30→15→8 size ladder increase interior density without increasing blocking elements.”

A strong hypothesis predicts a signature before production code changes.

---

# 19. Accepted and falsified meshing hypotheses from the qualification program

These examples are part of the engineering knowledge base. Rejected ideas should remain documented so they are not rediscovered and reintroduced later.

## 19.1 Boundary-only refinement — REJECTED

**Observation:** smaller target size produced more slivers.

**Cause:** boundary node count increased while there were no interior vertices.

**Rejected response:** refine the boundary even more or weaken quality gates.

**Accepted response:** deterministic interior Steiner refinement plus constrained Lawson restoration.

## 19.2 Cartesian interior seeding — REJECTED during refinement development

A simple Cartesian seed field did not produce a sufficiently robust quality envelope.

The qualified path uses a staggered triangular/equilateral lattice with deterministic clearance rules.

## 19.3 Hole bridge/seam — REJECTED for governed production

A bridge could reuse simple-polygon triangulation but would create artificial topology and complicate recombination/welding.

**Accepted response:** true constrained hole boundaries with edge recovery and cavity removal.

## 19.4 Unconditional hole-front grading — NARROWED

Hole-front layers improved a fine curved-hole/coarse-interior transition, but applying a front to every straight hole edge created unnecessary phase sensitivity.

**Accepted response:** V3 conditional front only when local constrained hole spacing is materially finer than the global target.

## 19.5 Partial Q8 recombination accepted as Q8 — REJECTED

Partial recombination naturally leaves T6 triangles.

The evidence profile declares one continuum family.

**Rejected responses:** relabel T6 as Q8, pad node lists, or loosen family validation.

**Accepted response:** full Q8 or explicit rejection.

## 19.6 Synthetic smooth corner for single-block mapped Q8 — REJECTED

A filleted-away corner was temporarily split into a synthetic logical corner.

The resulting near-zero scaled Jacobian falsified the single-block assumption.

**Accepted response:** require four genuine hard logical corners. Future rounded-corner Q8 requires multi-block qualification.

## 19.7 Source shell facets as generated shell mesh — REJECTED

Existing source discretization is not mesh-independent geometry authority.

**Accepted response:** create a separate midsurface authority and external producer.

## 19.8 Source entity IDs as local-refinement targets — REJECTED

Generated mesh IDs live in a different topology namespace.

**Accepted response:** bind exact retained mesh `artifactHash + meshHash` and target retained canonical NODE/ELEMENT IDs.

## 19.9 Post-generation shell-hole quality repair — REJECTED

A deterministic longest-edge repair experiment was evaluated but was too expensive and blurred the meaning of the requested size.

**Accepted response:** explicit minimum-ligament qualification envelope and pre-mesh fail-closed rejection.

## 19.10 Threshold relaxation — REJECTED by governance rule

No accepted meshing fix in this program is based on weakening quality thresholds.

---

# 20. KEEP / REJECT / REVERT rule for meshing changes

Every candidate ends in one of three states.

## KEEP

Use only when:

- the hypothesis is independently verified;
- topology/area/boundary invariants pass;
- declared family matches actual topology;
- quality passes unchanged profile gates;
- determinism passes;
- evidence/custody passes;
- the intended product route passes;
- unrelated meshing regressions remain green;
- the qualified scope remains truthful.

## REJECT BEFORE PRODUCTION

Use when a canonical fixture or local proof falsifies the idea before production behavior should change.

Examples:

- synthetic mapped fillet creates singular Jacobian;
- proposed mixed-family workaround falsifies element semantics;
- source facet “producer” violates geometry/discretization authority.

## REVERT AFTER INTEGRATED QUALIFICATION

Use when a locally plausible change passes some direct checks but fails the full evidence ladder or worsens another qualified envelope.

A revert is not wasted work. It is retained falsification evidence.

---

# 21. Junior-engineer qualification workflow

Use this sequence for any meshing change.

## Phase A — Freeze the problem

- [ ] Record exact branch/head SHA.
- [ ] Record stage and element family.
- [ ] Record source/domain/geometry hashes.
- [ ] Record profile identity/hash.
- [ ] Record producer/qualification revision.
- [ ] Record generation mode.
- [ ] Confirm the requested capability is inside the declared stage/family registry.

## Phase B — Prove geometry authority

- [ ] Units are consistent.
- [ ] All referenced vertices/segments/loops resolve.
- [ ] Loops close end-to-end.
- [ ] Exactly the supported number of OUTER loops exists.
- [ ] OUTER orientation is CCW.
- [ ] HOLE orientation is CW.
- [ ] Holes are inside the outer region.
- [ ] Unsupported nested holes/seams/curvature are rejected rather than approximated.
- [ ] Shell `axisU`/`axisV` are unit and orthogonal where applicable.

## Phase C — Prove boundary discretization

- [ ] Source endpoints retained.
- [ ] Feature vertices retained.
- [ ] Target-size segmentation behaves monotonically.
- [ ] Arc chord-error rule is satisfied.
- [ ] Quadratic boundary midsides lie on analytic curves.
- [ ] Station ordering is deterministic.

## Phase D — Prove core triangulation/mapping

- [ ] Total area equals material area.
- [ ] No overlap/gap.
- [ ] Hole cavities remain empty.
- [ ] Constrained boundaries remain present.
- [ ] Interior edges are manifold.
- [ ] Mapped side counts are compatible.
- [ ] Element orientation/Jacobian is positive.
- [ ] Smaller target increases interior density.

## Phase E — Prove element semantics

- [ ] T3 has 3-node topology.
- [ ] T6 has 6-node topology and correct midside ownership.
- [ ] Q8 has 8-node topology.
- [ ] Shell output is exactly the qualified TRI3 family.
- [ ] No mixed family is hidden under a single-family profile.

## Phase F — Prove quality

- [ ] Use canonical profile thresholds.
- [ ] Record worst aspect ratio.
- [ ] Record minimum scaled Jacobian.
- [ ] Record blocking/warning element IDs.
- [ ] Apply applicable angle/warpage/boundary-count/size-thickness rules.
- [ ] Do not change thresholds during candidate evaluation.

## Phase G — Prove determinism

- [ ] Same-process replay is byte-identical.
- [ ] Independent-process replay is byte-identical where governed.
- [ ] Total ordering/tie breaks are explicit.
- [ ] No random/time/async topology dependence.

## Phase H — Prove evidence/custody

- [ ] Recompute mesh hash.
- [ ] Build v2 evidence through the public evidence authority.
- [ ] Parent hashes match current stage state.
- [ ] Profile hash matches.
- [ ] Capability/qualification/plan hashes match.
- [ ] BLOCK stays blocked.
- [ ] Current valid evidence reaches the expected custody state.

## Phase I — Prove product route

- [ ] Profile can be bound from Discretization.
- [ ] Generation/refinement action is reachable only when authorized.
- [ ] Generated v2 mesh renders.
- [ ] Export/re-import preserves governed evidence.
- [ ] Stale geometry/profile invalidates the retained mesh.
- [ ] Failed refinement preserves the parent atomically.

## Phase J — Exact-head qualification

- [ ] Clean `npm ci`.
- [ ] Exact SHA verification.
- [ ] Dedicated new qualification script.
- [ ] DOF-policy gate.
- [ ] governed meshing-intent gate.
- [ ] retained local-refinement regression.
- [ ] shell producer/workbench regressions where applicable.
- [ ] shell-hole ladder where applicable.
- [ ] P2-11 health classifier.
- [ ] full `npm run check:lafea-meshing`.
- [ ] remove temporary probes/diagnostics.
- [ ] record workflow run ID and exact head.

---

# 22. Review evidence required for a mesher change

A review-ready change should answer all of the following.

## Geometry

1. What geometry/topology class changed?
2. What orientation convention applies?
3. What units apply?
4. Are analytic curves retained or approximated?
5. What happens to holes/seams/features?

## Algorithm

1. Which meshing strategy executes?
2. What is the size field?
3. What points can be inserted?
4. Which edges are constrained?
5. What operations can mutate connectivity?
6. What guarantees termination/fail-closed behavior?

## Element semantics

1. What family is produced?
2. What exact node ordering is used?
3. How are midside nodes positioned?
4. Can the algorithm produce mixed families?
5. If yes, is that explicitly represented by the profile/evidence contract? If not, reject.

## Quality

1. What profile thresholds are used?
2. Worst aspect ratio?
3. Minimum scaled Jacobian?
4. Blocking element count?
5. Applicable angle/warpage/boundary-density checks?
6. Was any threshold changed? If yes, why is that a separate governed decision?

## Determinism

1. Are all scans/sorts total and deterministic?
2. Are point insertion and edge-flip orders deterministic?
3. Can metadata alter numerical topology?
4. Does independent-process replay match?

## Authority

1. What source/domain/geometry/profile hashes are bound?
2. What producer/qualification revision owns the behavior?
3. Does the output falsely assert lifecycle/release authority?
4. Does independent evidence revalidate the output?
5. Does stale-parent invalidation work?

## Product

1. Is the UI/public route reachable?
2. Is the generated mesh visible?
3. Can evidence be exported/imported?
4. Can the mesh become run-eligible only through custody?

## Change control

1. What hypothesis was tested?
2. What independent falsification case exists?
3. What candidate was rejected or reverted?
4. What limitations remain?

---

# 23. Common mistakes to avoid

## Mistake 1 — “More boundary nodes means a finer mesh”

Not necessarily. Without interior points, it can mean thinner triangles.

## Mistake 2 — Treating mesh density as mesh quality

A dense mesh can contain poor or inverted elements.

## Mistake 3 — Treating quality PASS as convergence

A good element shape does not prove the engineering response is mesh-independent.

## Mistake 4 — Relabelling element topology

A T6 does not become Q8 because a profile asked for Q8.

## Mistake 5 — Forcing a mapped strategy onto invalid logical topology

A single-block map needs valid logical corners and side compatibility.

## Mistake 6 — Reversing loops silently

Orientation is part of geometry authority and must be explicit.

## Mistake 7 — Hiding a hole with a seam without declaring the seam

Artificial topology changes must never be invisible.

## Mistake 8 — Using source mesh IDs for generated-mesh refinement

Always refine the exact retained parent topology.

## Mistake 9 — Letting a producer certify itself

Generation and lifecycle authority are separate.

## Mistake 10 — Retaining a stale mesh after geometry/profile changes

Parent hashes must invalidate old evidence.

## Mistake 11 — “Fixing” a blocker by changing quality thresholds

Fix the mesh or narrow the scope.

## Mistake 12 — Claiming shell automatic meshing by passing through source facets

Mesh-independent surface authority is required.

## Mistake 13 — Changing several meshing mechanisms at once

One change should have one falsifiable mechanism whenever practical.

## Mistake 14 — Leaving temporary probes in the qualified head

Diagnostic code is useful during investigation but must be removed unless it becomes a deliberate permanent qualification.

---

# 24. Exact-head qualification and CI ownership

The exact-head workflow exists because branch-level success can otherwise be ambiguous after a branch moves.

The workflow must first verify:

```text
git HEAD == intended candidate SHA
```

Only then is a green run valid evidence for that candidate.

The current meshing program uses a combination of dedicated and aggregate gates, including:

- `scripts/lafea-mesh-dof-policy-check.mjs`;
- `scripts/lafea-meshing-system-check.mjs`;
- `scripts/lafea-retained-mesh-refinement-check.mjs`;
- `scripts/lafea-shell-mesh-producer-check.mjs`;
- `scripts/lafea-shell-workbench-route-check.mjs`;
- `scripts/lafea-shell-hole-ladder-check.mjs`;
- `scripts/lafea-shell-hole-mesh-check.mjs`;
- `scripts/lafea-p2-11-triage.mjs`;
- `npm run check:lafea-meshing`.

The aggregate currently exercises core contracts such as:

- topology;
- healing preview/accept;
- mesh-quality metrics;
- convergence-contract semantics;
- minimum mesh-level requirements;
- T6 generation;
- Q8 recombination;
- mapped meshing;
- quality-panel rendering;
- determinism;
- producer binding.

A future capability may require additional dedicated gates. Do not remove an existing independent gate merely because a new aggregate appears to cover similar code.

---

# 25. Recommended qualification order for future shell extensions

The current remaining shell exclusions are not equal in difficulty.

## 25.1 Curved midsurface

A curved shell surface requires new authority for:

- surface parameterization `X(u,v)` beyond a plane;
- director/normal definition and continuity;
- curvature-sensitive boundary/interior size rules;
- UV distortion controls;
- mapping Jacobian and orientation;
- 3D element-quality interpretation;
- possibly patch charts when one parameterization is insufficient.

Before implementation, define the mesh-independent curved-surface contract and its error/curvature controls.

## 25.2 Multi-patch seams

Seams require explicit ownership of:

- coincident boundary equivalence;
- node merge versus tied interface;
- orientation compatibility;
- non-manifold prevention;
- element-size transition across patches;
- deterministic seam numbering;
- custody when one patch changes.

## 25.3 Offset-surface generation

Offset surfaces require:

\[
X_{off}=X_{mid}+d\,n
\]

with a qualified normal field and explicit treatment of:

- sign;
- thickness/offset ownership;
- corners;
- self-intersection;
- curvature radius limits;
- source versus generated geometry custody.

## 25.4 Thickness-transition meshing

A varying thickness field requires a separate sizing/transition policy and must not silently alter shell formulation assumptions.

## 25.5 Shell local refinement

Only after shell retained-mesh identity and conforming shell refinement rules are defined should `manualRefinementQualified` be enabled for LAFEA.4/.5.

## 25.6 Multi-block Q8 for rounded corners

The current single-block mapped strategy deliberately rejects rounded-away logical corners.

A future implementation should first define deterministic block decomposition and interface compatibility, then qualify each block Jacobian and the assembled topology.

---

# 26. Stable method versus changing current status

This file should remain primarily a **method**.

When the producer revision changes, avoid rewriting the engineering principles merely to update one node count.

Instead update the baseline section below or generate a separate machine-readable qualification manifest containing:

```text
exact head SHA
producer ID/revision
qualification revision
source fixture hashes
profile hashes
required scripts
workflow run IDs
expected deterministic hashes
qualified stage/family scopes
explicit exclusions
```

CI can then fail closed when a required evidence item is missing.

---

# 27. Current qualified baseline — 2026-08-09

This section records the qualification program that produced the current meshing authority. It is historical evidence, not a replacement for the procedure above.

## 27.1 P0 — usable end-to-end producer

Draft PR `#959` established:

- all-Q8-or-reject family behavior;
- explicit UI mesh-profile binding;
- generated v2 mesh rendering;
- v2 evidence import/export/recovery;
- exact-head workflow;
- clean lockfile/npm install baseline.

Exact-head run:

```text
31294441407 — PASS
```

## 27.2 P1-5 — interior constrained-Delaunay refinement

Draft PR `#960` established deterministic interior Steiner refinement and the permanent size ladder.

Exact-head run:

```text
31295160181 — PASS
```

## 27.3 P1-6 — true constrained holes

Draft PR `#962` established constrained hole boundaries, cavity removal, analytic curved-boundary ownership, and the qualified hole-front grading behavior.

Exact-head run:

```text
31296365266 — PASS
```

## 27.4 P1-7 — logical four-side mapped Q8

Draft PR `#963` established logical side chains across split feature vertices and deliberately rejected false mapped fillet corners.

Exact-head run:

```text
31297030332 — PASS
```

## 27.5 P2-13 — stage-aware DOF policy

Draft PR `#964` removed the global hard-coded two-DOF assumption and qualified:

```text
LAFEA.3 = 2 DOF/node
LAFEA.4 = 5 DOF/node
LAFEA.5 = 5 DOF/node
```

Exact-head run:

```text
31297221608 — PASS
```

## 27.6 P2-10 — legacy canvas intent retirement

Draft PR `#965` removed the orphaned `LafeaMeshingCommand.v1` canvas command and retained the governed meshing-intent path.

Exact-head run:

```text
31297503274 — PASS
```

## 27.7 P2-11 — check triage

Draft PR `#966` separated seven real standalone health checks from six context-bound historical exact-diff guards and retained the permanent classifier.

Final exact-head qualification run:

```text
31300307745 — PASS
```

## 27.8 P2-9 — retained T3/T6 local refinement

Draft PR `#967` qualified retained generated-mesh identity, local target fields, deterministic regeneration, and atomic custody replacement.

Exact-head:

```text
f5dabb0d55ee40c35590ac4b8a1ad886b3832450
```

Workflow:

```text
31300960270 — PASS
```

## 27.9 P2-8 — planar shell producer

Draft PR `#968` introduced the mesh-independent planar shell midsurface authority and external TRI3 producer for LAFEA.4/.5.

Exact-head:

```text
ae35920b385256709f6355ebee3bc8494dce88fd
```

Workflow:

```text
31303705068 — PASS
```

## 27.10 Planar shell holes

Draft PR `#971` extended the shell midsurface topology to straight-segment, non-nested holes and added the material-ligament qualification envelope.

Exact-head:

```text
e7888a28fbeb7f7c6768c936f8ee42ba1ac8b61c
```

Workflow:

```text
31307039445 — PASS
```

That run passed:

- exact SHA verification;
- clean `npm ci`;
- stage-aware DOF policy;
- governed canvas meshing intent;
- retained-mesh local-refinement regression;
- planar shell producer mechanics;
- shell workbench custody/Discretization route;
- shell-hole material-ligament ladder;
- shell-hole topology and LAFEA.4/.5 custody route;
- P2-11 check classification;
- full `npm run check:lafea-meshing`.

## 27.11 Current registry snapshot

```text
producerId             = LAFEA_CORE_MESHER
producerRevision       = LAFEA.10.T6Q8.SHELL.V6
qualificationId        = LAFEA-MESH-Q1
qualificationRevision = R7
qualityPolicy          = LAFEA_MESH_PROFILE_QUALITY_GATES_V1
generationModes        = AUTOMATIC_MESH, REFINEMENT_REGENERATION
```

Current bound families:

```text
LAFEA.3 : Q8, T3, T6
LAFEA.4 : CST_DKT_TRI3_THIN_SHELL_V1
LAFEA.5 : CST_DKT_TRI3_THIN_SHELL_V1
```

Current local refinement:

```text
LAFEA.3 T3/T6 only
```

---

# 28. Final engineering mindset

A junior FEA engineer should retain these principles.

1. **Geometry authority comes before mesh topology.** A beautiful mesh on the wrong geometry is wrong.
2. **Element family is physical/numerical semantics, not a display label.**
3. **Boundary refinement without interior refinement can make an unstructured mesh worse.**
4. **A hole is a constrained topology boundary, not empty paint in the viewport.**
5. **Mapped Q8 requires a valid parameterization; never invent a corner to force the strategy.**
6. **Quality PASS is not response convergence.**
7. **Determinism is an engineering requirement because evidence hashes and custody depend on it.**
8. **The producer does not certify itself.** Independent evidence and custody decide whether a mesh is current and usable.
9. **Reject unsupported requests explicitly rather than approximating silently.**
10. **Retain falsified hypotheses.** They prevent old mistakes from returning under a new name.
11. **Make the smallest defensible change at the layer that owns the failed invariant.**
12. **Exact-head evidence matters.** Qualification belongs to a commit, not to a moving branch name.

The desired end state is not merely:

```text
mesh displayed
+ no crash
= done
```

It is:

```text
source/domain/geometry/profile are current and frozen
+ topology is mathematically valid
+ requested family matches actual connectivity
+ geometry is represented with the declared fidelity
+ quality passes unchanged governed limits
+ sizing/refinement behaves predictably
+ canonical replay is deterministic
+ resource limits are respected
+ independent v2 evidence validates the mesh
+ custody classifies it CURRENT_PASS
+ public product route behaves consistently
+ exact-head regressions are green
+ limitations and falsified ideas are explicit
= qualified LAFEA meshing capability
```

That is the standard to apply before extending the producer to the next geometry or element family.
