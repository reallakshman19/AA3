# Canonical Elbow Geometry + Mixed ROM Route — Work Report

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- WORK_INTENT: `IMPLEMENT`
- CRITICALITY: `ENGINEERING_CRITICAL`
- Stack base: PR #1147 exact head `9f134a976232d2bd9ef3f32f1fe7a063e9e0e225`
- Base branch: `agent/empirical-rom-elbow-flexibility-20260815`
- Working branch: `agent/empirical-rom-canonical-elbow-geometry-20260815`
- Parent stack: PR #1147 → PR #1145 → `main`
- Merge authority: `NOT_GRANTED`
- Production authority: `NOT_GRANTED`
- State: `EXPERIMENTAL_CANONICAL_COMPONENT_ROM`

## Handover in 60 seconds

This stack closes the first major geometry-custody seam identified by the continuous elbow ROM.

It establishes:

```text
workspace source geometry
  + exact topology graph
  + explicit source bend centre
        ↓
canonical elbow geometry authority
        ↓
source endpoint ↔ topology port binding
        ↓
source-derived bend plane + circular-arc closure
        ↓
straight-neighbour tangent continuity
        ↓
canonical straight/elbow component route
        ↓
existing analytical component ROM
```

It does not consume viewport/resolved-render geometry and does not infer a long-radius bend.

## Scope delivered

### 1. Canonical elbow geometry authority

File:

`src/workspace/engineering-loads/adapters/canonical-elbow-geometry-authority.js`

Schema:

`empirical-canonical-elbow-geometry-authority/v1`

The authority requires:

- current `analysis-workspace-dataset/v1`;
- current exact `piping-port-topology-graph` bound to the same shared model;
- one two-port BEND/ELBOW component;
- source-backed start and end points;
- an explicit source-declared bend centre;
- exact endpoint binding to the component's topology ports;
- a non-degenerate source start/centre/end plane;
- equal-radius circular geometry through the existing continuous elbow kernel;
- tangent collinearity with connected straight PIPE neighbours.

### 2. Bend-centre semantic custody

A generic component `center` is not automatically a centre of curvature.

The generic workspace geometry evidence contract can expose several forms of explicit centre. This first mechanics qualification admits only existing source paths that explicitly use the semantic name `centrePoint`:

```text
item.centrePoint
nativeParams.centrePoint
```

It explicitly rejects:

```text
item.center
nativeParams.center
derived.midpoint
attributes.CENTER
sourceAttributes.CENTER
```

until those source semantics receive a separate qualification.

This restriction is intentional and fail-closed. Provenance alone does not prove physical meaning.

### 3. Plane and sweep authority

The bend plane is derived only from the source-backed points:

```text
r_start = P_start - C
r_end   = P_end   - C
n       = normalize(r_start × r_end)
```

The existing continuous-elbow kernel then independently checks:

- positive radius;
- equal start/end radius within the frozen relative tolerance;
- radial vectors lying in the declared plane;
- positive minor sweep strictly below 180 degrees;
- deterministic start/end tangents;
- semantic geometry hash.

No ORI parser, renderer centre inference, chord subdivision or `1.5D` assumption is used.

### 4. Straight-neighbour tangent continuity

For an elbow endpoint connected to a two-port straight PIPE:

```text
abs(t_elbow · t_straight) ≈ 1
```

is required with frozen collinearity residual tolerance `1e-10`.

The absolute dot product intentionally checks line collinearity rather than source orientation sign. Rooted route orientation is established later by the force-method route.

### 5. Canonical mixed component route

File:

`src/workspace/engineering-loads/adapters/canonical-component-rom-route.js`

Schema:

`empirical-canonical-component-rom-route/v1`

Current domain:

- connected acyclic topology region;
- exact, non-ambiguous topology only;
- two-port straight PIPE;
- two-port circular BEND/ELBOW with exactly one current canonical elbow geometry authority;
- connected elbow endpoints must currently qualify against straight PIPE neighbours;
- no tee/reducer/valve/rigid component in this phase;
- no tolerance-created joints;
- no finite-element discretization.

Exact connected topology ports are collapsed into deterministic route nodes. A connection whose port coordinates are not coincident within `1e-12 m` blocks rather than creating an implicit rigid link.

The route requires:

```text
componentCount = nodeCount - 1
```

for the current tree domain.

## Mechanics boundary

This stack does not change the analytical solver from PR #1147.

The resulting route is consumed by the existing component ROM:

```text
unit-load cut equilibrium
        ↓
straight EA/EI/GJ virtual work
+ continuous elbow EA/EI/GJ virtual work × governed B31J k
        ↓
F
        ↓
thermal/reference movement
        ↓
(F+S)R = target-reference
```

No global nodal stiffness matrix is introduced.

## Frozen independent mixed-route benchmark

Geometry:

```text
P1: (-2,0,0) -> (0,0,0)      straight, L=2 m
E1: (0,0,0) -> (1,1,0)       R=1 m, 90 deg, centre=(0,1,0)
P2: (1,1,0) -> (1,3,0)       straight, L=2 m
root = (-2,0,0)
tip  = (1,3,0)
```

Properties:

```text
E  = 200 GPa
G  = 76.923076923 GPa
A  = 0.004 m2
Iy = Iz = 8e-6 m4
J  = 1.6e-5 m4
elbow k_in = k_out = 2.5
elbow k_t = 1
```

Independent direct continuum integration, performed outside repository code before repository execution, gives the tip X/Y flexibility matrix:

```text
F = [
  [ 3.0214810087147528e-5, -1.0064363521234052e-5 ],
  [ -1.0064363521234052e-5, 5.9767023052964523e-6 ]
] m/N
```

Component contributions used by the independent oracle:

```text
Fxx:
  P1 = 1.1252500000000001e-5
  E1 = 1.7295643420480862e-5
  P2 = 1.6666666666666667e-6

Fxy:
  P1 = -7.5000000000000000e-6
  E1 = -2.5643635212340520e-6
  P2 = 0

Fyy:
  P1 = 5.4166666666666670e-6
  E1 = 5.5753563862978570e-7
  P2 = 2.5000000000000000e-9
```

The matrix is symmetric and positive definite for the frozen benchmark.

For uniform thermal strain:

```text
epsilon_th = 0.001
```

free tip translation follows the kinematic identity:

```text
u_ref = epsilon_th * (r_tip-r_root)
      = [0.003, 0.003, 0] m
```

For rigid X/Y tip coordinates:

```text
F R = -[0.003, 0.003]
```

Independent direct matrix inversion gives reaction on pipe:

```text
Rx = -606.8995590818411 N
Ry = -1523.9269614290317 N
```

These values are frozen in `scripts/empirical-canonical-mixed-route-check.mjs` before repository execution.

## Validation ledger

### VAL-CAN-ELB-001 — source centre semantic policy

- STATUS: `PASS / SOURCE_REVIEW`
- `centrePoint` source semantics admitted.
- generic `center` and derived midpoint explicitly rejected.

### VAL-CAN-ELB-002 — XY quarter-circle geometry oracle

- STATUS: `PASS / INDEPENDENT_GEOMETRY`
- Expected:
  - `R = 1 m`
  - `angle = pi/2`
  - `arc length = pi/2 m`
  - plane normal `+Z`
  - start tangent `+X`
  - end tangent `+Y`.

### VAL-CAN-ELB-003 — rotated YZ geometry oracle

- STATUS: `PASS / INDEPENDENT_GEOMETRY`
- Expected:
  - plane normal `+X`
  - start tangent `+Y`
  - end tangent `+Z`
  - same radius/angle.

This proves the custody formulation is not hard-coded to XY geometry.

### VAL-CAN-ELB-004 — endpoint/topology binding

- STATUS: `PASS / SOURCE_REVIEW`
- Port storage order is not source start/end authority; the adapter uniquely binds source endpoints to exact topology positions and permits the two stored topology ports to appear in either order.

### VAL-CAN-ELB-005 — tangent continuity

- STATUS: `PASS / INDEPENDENT_GEOMETRY`
- Collinear straight neighbours pass irrespective of direction sign.
- A deliberately skewed straight neighbour is a frozen fail-closed case.

### VAL-CAN-ELB-006 — mixed route flexibility

- STATUS: `PASS / INDEPENDENT_CONTINUUM_ORACLE`
- Frozen expected matrix shown above.
- Independent reciprocity holds exactly to floating integration accuracy.

### VAL-CAN-ELB-007 — mixed route thermal compatibility

- STATUS: `PASS / INDEPENDENT_MATRIX_ORACLE`
- Free displacement `[3 mm, 3 mm]`.
- Rigid-restraint reactions `[-606.899559, -1523.926961] N`.

### VAL-CAN-ELB-008 — committed repository scripts

Committed:

```text
scripts/empirical-canonical-elbow-geometry-check.mjs
scripts/empirical-canonical-mixed-route-check.mjs
```

Repository import-graph execution:

- STATUS: `NOT_RUN / INFRASTRUCTURE_BLOCKED`
- Current execution environment has no local repository checkout and `gh` is not installed (`gh: command not found`).
- GitHub connector source access was sufficient for implementation/review but cannot execute the repository test graph.
- Do not report the committed scripts as PASS until executed on the exact head.

## Negative assurance

This stack does **not**:

- modify PR #1147 continuous elbow mechanics equations;
- modify PR #1145 compatibility/thermal equations;
- consume renderer/resolved viewport geometry;
- accept generic component centre as bend centre;
- infer `1.5D` bend radius;
- infer missing topology by tolerance;
- insert an implicit rigid link for noncoincident connected ports;
- introduce global FE stiffness assembly;
- modify production empirical V1/V2 methods;
- alter Load Calc dispatch/UI/publication/export;
- implement support-station splitting on mixed components;
- implement weight/gravity load reference displacement;
- implement tee/reducer/valve component mechanics;
- solve gap/contact/friction;
- add pressure thrust or Bourdon effects;
- register a production method.

## Changed-file ledger relative to PR #1147 base

Expected current files:

```text
agents/PR_CANONICAL_ELBOW_GEOMETRY_workreport.md
scripts/empirical-canonical-elbow-geometry-check.mjs
scripts/empirical-canonical-mixed-route-check.mjs
src/workspace/engineering-loads/adapters/canonical-elbow-geometry-authority.js
src/workspace/engineering-loads/adapters/canonical-component-rom-route.js
```

## Remaining seams

1. Execute committed scripts against an actual exact-head checkout.
2. Extend canonical property/thermal/support custody from PR #1145 onto the mixed straight/elbow route without duplicating authority logic.
3. Add support-station splitting for supports landing inside straight spans while preserving elbow geometry as one continuous component.
4. Add two-elbow Z-route and U-route independent benchmarks.
5. Add source-specific qualifications for additional explicit bend-centre representations where their semantics are authoritative.
6. Generalize temperature expansion beyond the current scalar/approved-mean basis.
7. Add governed weight/distributed/point-load reference-displacement formulation.
8. Only after the above, proceed to unilateral gap/contact mechanics.

## Current disposition

- canonical source-backed elbow geometry: `IMPLEMENTED_EXPERIMENTALLY`
- canonical straight/elbow route: `IMPLEMENTED_EXPERIMENTALLY`
- independent geometry oracle: `PASS`
- independent mixed-route continuum oracle: `PASS`
- repository scripts: `NOT_RUN / INFRASTRUCTURE_BLOCKED`
- production integration: `NOT_GRANTED`
- merge authority: `NOT_GRANTED`

---

# Appendix A — next-agent expert questionnaire

A takeover agent should answer these before changing mechanics or source authority.

1. Why is an explicit source `center` not sufficient evidence that a point is the bend centre of curvature? Which currently admitted source paths establish that semantic distinction?
2. Show how the plane normal is constructed from source-backed points and explain why its sign fixes the positive minor sweep convention.
3. For a 90 degree XY elbow with centre `(0,1,0)`, start `(0,0,0)`, and end `(1,1,0)`, derive the start/end tangent vectors.
4. Explain why tangent continuity uses `abs(t_elbow dot t_straight)` rather than requiring `+1`.
5. Why does an exact topological connection with noncoincident physical coordinates fail rather than become a rigid offset automatically?
6. Explain why route nodes created by joint collapse are not finite-element discretization.
7. Derive the mixed-route force-method equation and explain which data generate `F`, `S`, `delta_reference`, and `delta_target`.
8. Reproduce independently the frozen mixed-route matrix and reactions without calling the repository implementation.
9. Explain why B31J flexibility factor `k` is admitted into elbow strain energy while SIF is not a stiffness multiplier.
10. State the current axisymmetry assumption and why a non-axisymmetric section requires separate principal-axis custody.
11. Identify which geometry evidence may be used for display but remains prohibited as mechanics authority.
12. List every validation item in this report that is independent engineering validation versus repository software execution, and do not conflate `PASS` with `NOT_RUN`.
