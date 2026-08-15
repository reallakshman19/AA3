# Canonical Elbow Geometry + Mixed ROM Route — Work Report

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- WORK_INTENT: `IMPLEMENT`
- CRITICALITY: `ENGINEERING_CRITICAL`
- Stack PR: `#1148`
- Stack base: PR #1147 branch `agent/empirical-rom-elbow-flexibility-20260815`
- Base exact head at stack creation: `9f134a976232d2bd9ef3f32f1fe7a063e9e0e225`
- Working branch: `agent/empirical-rom-canonical-elbow-geometry-20260815`
- Parent stack: `#1148 -> #1147 -> #1145 -> main`
- Merge authority: `NOT_GRANTED`
- Production authority: `NOT_GRANTED`
- State: `EXPERIMENTAL_CANONICAL_COMPONENT_ROM`

## Handover in 60 seconds

This stack closes the first source-geometry seam for the continuous elbow ROM and extends qualification from one elbow to a two-elbow Z route.

```text
workspace source geometry
+ exact topology graph
        ↓
source-declared bend-centre custody
        ↓
canonical circular elbow authority
        ↓
source endpoint ↔ topology-port binding
+ straight-neighbour tangent continuity
        ↓
canonical straight/elbow component tree
        ↓
PR #1147 analytical component ROM
        ↓
F + thermal reference displacement
        ↓
(F+S)R = target-reference
```

No renderer geometry, long-radius default or global FE stiffness matrix is used.

---

## 1. Canonical elbow geometry authority

File:

`src/workspace/engineering-loads/adapters/canonical-elbow-geometry-authority.js`

Schema:

`empirical-canonical-elbow-geometry-authority/v1`

Required custody:

1. current `analysis-workspace-dataset/v1`;
2. workspace source snapshot matches shared-model source snapshot;
3. current validated piping topology graph matches that shared model;
4. exact/non-ambiguous/non-tolerance topology;
5. one two-port BEND/ELBOW component;
6. source-backed start/end points;
7. source-declared bend centre with qualified semantics;
8. unique source endpoint ↔ topology-port binding;
9. non-degenerate start/centre/end plane;
10. circular-arc closure through the existing continuous elbow kernel;
11. tangent collinearity with connected two-port straight PIPE neighbours.

### 1.1 Centre-of-curvature semantic rule

The generic workspace geometry layer can expose a generic component `center`. Provenance of a point does not prove that its physical meaning is the bend centre of curvature.

This first mechanics qualification therefore accepts only existing source paths whose field name explicitly carries `centrePoint` semantics:

```text
item.centrePoint
nativeParams.centrePoint
```

Current fail-closed exclusions include:

```text
item.center
nativeParams.center
attributes.CENTER
sourceAttributes.CENTER
derived.midpoint
```

These may remain legitimate display or other engineering evidence, but they are not bend-centre mechanics authority until separately qualified.

### 1.2 Plane and sweep

From source-backed points:

```text
r0 = P_start - C
r1 = P_end   - C
n  = normalize(r0 × r1)
```

The existing circular-elbow kernel independently verifies:

- positive radius;
- equal start/end radius within its frozen tolerance;
- both radial vectors in the declared plane;
- positive minor sweep `0 < theta < pi`;
- start/end tangent vectors;
- geometry semantic hash.

The plane-normal sign is determined by the source start→end order.

### 1.3 Tangent continuity

For an elbow endpoint connected to a straight PIPE:

```text
abs(t_elbow · t_straight) ≈ 1
```

with frozen residual tolerance `1e-10`.

Absolute dot is intentional: source/topology component direction is not the rooted solution direction. This check proves physical line collinearity only.

---

## 2. Canonical component ROM route

File:

`src/workspace/engineering-loads/adapters/canonical-component-rom-route.js`

Schema:

`empirical-canonical-component-rom-route/v1`

Current domain:

- one connected acyclic topology region;
- exact non-ambiguous topology only;
- two-port `PIPE` -> `STRAIGHT` analytical component;
- two-port `BEND/ELBOW` -> `CIRCULAR_ELBOW` analytical component;
- every elbow has exactly one current canonical elbow geometry authority;
- every connected elbow endpoint is currently qualified against a straight PIPE neighbour;
- no tee/reducer/valve/rigid component yet.

Exact connected topology ports are collapsed into deterministic analytical route nodes.

This is **topological joint normalization, not FE discretization**.

A topological connection whose physical port coordinates are noncoincident beyond `1e-12 m` fails. No implicit rigid offset is created.

The current tree contract requires:

```text
componentCount = nodeCount - 1
```

---

## 3. Mechanics boundary preserved

This stack does not change PR #1147 mechanics.

```text
unit-load static cut equilibrium
        ↓
straight EA/EI/GJ virtual work
+ continuous elbow EA/EI/GJ virtual work × governed B31J k
        ↓
flexibility matrix F
        ↓
free/reference displacement
        ↓
(F+S)R = target-reference
```

No `K u = f` global nodal FE route is introduced.

SIF remains separate from flexibility factor.

---

## 4. Independent benchmark A — one-elbow mixed route

Geometry:

```text
P1: (-2,0,0) -> (0,0,0), L=2 m
E1: (0,0,0) -> (1,1,0), centre=(0,1,0), R=1 m, 90 deg
P2: (1,1,0) -> (1,3,0), L=2 m
root=(-2,0,0)
tip =(1,3,0)
```

Properties:

```text
E  = 200 GPa
G  = 76.923076923 GPa
A  = 0.004 m2
Iy = Iz = 8e-6 m4
J  = 1.6e-5 m4
k_in = k_out = 2.5
k_t = 1
```

Frozen independent continuum integration:

```text
F = [
  [ 3.0214810087147528e-5, -1.0064363521234052e-5 ],
  [ -1.0064363521234052e-5, 5.9767023052964523e-6 ]
] m/N
```

Independent component contributions:

```text
Fxx: P1=1.1252500000000001e-5
     E1=1.7295643420480862e-5
     P2=1.6666666666666667e-6

Fxy: P1=-7.5000000000000000e-6
     E1=-2.5643635212340520e-6
     P2=0

Fyy: P1=5.4166666666666670e-6
     E1=5.5753563862978570e-7
     P2=2.5000000000000000e-9
```

For uniform `epsilon_th=0.001`:

```text
u_ref_tip = epsilon*(r_tip-r_root)
          = [0.003, 0.003, 0] m
```

Rigid X/Y tip restraint, independently solving:

```text
F R = -[0.003,0.003]
```

gives:

```text
Rx = -606.8995590818411 N
Ry = -1523.9269614290317 N
```

---

## 5. Independent benchmark B — two-elbow Z route

Geometry:

```text
P1: (-2,0,0) -> (0,0,0)
E1: (0,0,0) -> (1,1,0), centre=(0,1,0), R=1 m, n=+Z
P2: (1,1,0) -> (1,3,0)
E2: (1,3,0) -> (2,4,0), centre=(2,3,0), R=1 m, n=-Z
P3: (2,4,0) -> (4,4,0)
root=(-2,0,0)
tip =(4,4,0)
```

Same properties and component `k` as benchmark A.

Frozen independent continuum integration:

```text
F = [
  [ 5.8671692028862445e-5, -6.5297419648638357e-5 ],
  [ -6.5297419648638357e-5, 8.9879551301699372e-5 ]
] m/N
```

Independent per-component values:

```text
Fxx:
  P1=2.0002500000000000e-5
  E1=3.2692489723565990e-5
  P2=5.4166666666666670e-6
  E2=5.5753563862978570e-7
  P3=2.5000000000000000e-9

Fxy:
  P1=-2.5000000000000000e-5
  E1=-3.0233056127404310e-5
  P2=-7.5000000000000000e-6
  E2=-2.5643635212340520e-6
  P3=0

Fyy:
  P1=3.1666666666666666e-5
  E1=2.7998074547885174e-5
  P2=1.1252500000000001e-5
  E2=1.7295643420480862e-5
  P3=1.6666666666666669e-6
```

For uniform `epsilon_th=0.001`:

```text
u_ref_tip = [0.006, 0.004, 0] m
```

Independent rigid X/Y restraint solution:

```text
Rx = -792.8301758786337 N
Ry = -620.4944717319305 N
```

This benchmark specifically exercises:

- two separately sealed elbow geometry authorities;
- opposite bend-plane normals;
- multi-component route topology;
- reciprocity;
- cumulative free thermal kinematics;
- coupled reaction recovery.

---

## 6. Validation ledger

### VAL-CAN-001 — centre semantic policy

- Status: `PASS / SOURCE_REVIEW`
- Generic center and midpoint are blocked.
- Qualified `centrePoint` paths are explicit.

### VAL-CAN-002 — XY quarter elbow

- Status: `PASS / INDEPENDENT_GEOMETRY`
- `R=1 m`, `theta=pi/2`, `n=+Z`, tangent start `+X`, tangent end `+Y`.

### VAL-CAN-003 — rotated YZ elbow

- Status: `PASS / INDEPENDENT_GEOMETRY`
- `R=1 m`, `theta=pi/2`, `n=+X`, tangent start `+Y`, tangent end `+Z`.

### VAL-CAN-004 — topology-port ordering

- Status: `PASS / SOURCE_REVIEW`
- Source start/end bind by exact position; stored port ordering is not treated as source direction.

### VAL-CAN-005 — negative geometry/custody cases

Frozen fail-closed cases include:

- unqualified generic centre semantics;
- derived midpoint centre;
- source endpoint/topology mismatch;
- unequal radius;
- collinear start/centre/end;
- tangent discontinuity;
- tolerance-enabled topology;
- stale topology/shared-model binding;
- tampered geometry authority hash.

### VAL-CAN-006 — one-elbow mixed route

- Status: `PASS / INDEPENDENT_CONTINUUM_AND_MATRIX_ORACLE`
- Frozen F, free thermal displacement and reactions shown above.

### VAL-CAN-007 — two-elbow Z route

- Status: `PASS / INDEPENDENT_CONTINUUM_AND_MATRIX_ORACLE`
- Frozen F, free thermal displacement and reactions shown above.

### VAL-CAN-008 — repository execution

Committed scripts:

```text
scripts/empirical-canonical-elbow-geometry-check.mjs
scripts/empirical-canonical-mixed-route-check.mjs
scripts/empirical-canonical-z-route-check.mjs
```

Execution status:

- `NOT_RUN / INFRASTRUCTURE_BLOCKED`
- no local checkout is available in the execution container;
- `gh` is not installed (`gh: command not found`);
- connector source access cannot execute the repository import graph.

Do not convert these committed scripts to PASS until run on the exact PR head.

---

## 7. Changed-file ledger relative to PR #1147

```text
agents/PR_CANONICAL_ELBOW_GEOMETRY_workreport.md
scripts/empirical-canonical-elbow-geometry-check.mjs
scripts/empirical-canonical-mixed-route-check.mjs
scripts/empirical-canonical-z-route-check.mjs
src/workspace/engineering-loads/adapters/canonical-elbow-geometry-authority.js
src/workspace/engineering-loads/adapters/canonical-component-rom-route.js
```

No other file is intended in this stack.

---

## 8. Negative assurance

This stack does **not**:

- modify PR #1147 continuous elbow equations;
- modify PR #1145 compatibility equations;
- consume renderer/resolved viewport geometry;
- infer a `1.5D` elbow radius;
- accept a generic component centroid as bend centre;
- infer topology by tolerance;
- create an implicit rigid offset for noncoincident connected ports;
- use SIF as stiffness;
- assemble a global FE stiffness matrix;
- alter production empirical V1/V2 methods;
- register a production method;
- alter Load Calc/UI/publication/export;
- split supports inside mixed straight spans yet;
- implement weight/gravity reference displacements;
- implement tee/reducer/valve mechanics;
- solve gap/contact/friction;
- add pressure thrust or Bourdon effects.

---

## 9. Remaining seams / recommended next order

1. Execute the three committed scripts on an exact-head checkout.
2. Add a U-route / out-of-plane mixed-route qualification case.
3. Reuse/refactor PR #1145 material, temperature, restraint and support-movement custody for the canonical mixed route **without duplicating authority logic**.
4. Add support-station splitting inside straight spans while leaving each elbow as one continuous analytical component.
5. Add general non-baseline thermal expansion using authoritative total expansion or `integral alpha(T)dT`.
6. Add governed self-weight, fluid/insulation mass and point component loads as reference-displacement/load terms.
7. Only after those are qualified, proceed to unilateral rest/guide/line-stop gap mechanics.

---

## 10. Disposition

- canonical source-backed elbow geometry: `IMPLEMENTED_EXPERIMENTALLY`
- canonical straight/elbow route: `IMPLEMENTED_EXPERIMENTALLY`
- one-elbow mixed benchmark: `PASS / INDEPENDENT_ORACLE`
- two-elbow Z benchmark: `PASS / INDEPENDENT_ORACLE`
- repository scripts: `NOT_RUN / INFRASTRUCTURE_BLOCKED`
- production cutover: `NOT_GRANTED`
- merge authority: `NOT_GRANTED`

---

# Appendix A — next-agent expert questionnaire

A takeover agent should answer these before modifying this stack.

1. Why does source provenance of a generic `center` field not prove centre-of-curvature semantics?
2. Which exact source paths are currently admitted as bend-centre authority and why is the set deliberately narrow?
3. Derive `n = normalize((Pstart-C) x (Pend-C))` and the XY benchmark tangents.
4. Why is tangent continuity based on `abs(t_elbow dot t_straight)` rather than signed `+1`?
5. Why must a topologically connected but physically noncoincident joint fail rather than become an implicit rigid link?
6. Explain why exact port joint collapse is topology normalization and not finite-element discretization.
7. Reproduce benchmark A's flexibility matrix independently from straight-member and continuous-elbow virtual work.
8. Reproduce benchmark B and explain the opposite `+Z/-Z` plane-normal custody.
9. Explain why B31J `k` enters elbow energy while SIF does not enter stiffness.
10. State the current axisymmetric-section assumption and the missing principal-axis authority for non-axisymmetric sections.
11. Identify every validation item above that is independent engineering validation versus repository software execution.
12. State why `NOT_RUN / INFRASTRUCTURE_BLOCKED` must not be relabelled PASS even when independent analytical oracles pass.
