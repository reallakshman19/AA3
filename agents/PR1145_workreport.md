# PR #1145 — Empirical ROM Compatibility + Thermal Reference Work Report

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- PR: `#1145`
- WORK_INTENT: `IMPLEMENT`
- CRITICALITY: `ENGINEERING_CRITICAL`
- Base branch: `main`
- Baseline SHA: `c35ae6eb04cf819a2ed4f839f45b3e05fdeccff6`
- Working branch: `agent/empirical-rom-compatibility-20260815`
- Current engineering head after thermal custody fix: `e7c7fa285ef295fc59aa1a281952d565c78f92a5`
- Merge authority: not granted; owner authorization required.
- Grounding epoch: `GE-EMPROM-COMP-002`
- Coordination: `SAFE` — open LAFEA/M047 streams do not overlap this empirical ROM core path.

## Handover in 60 Seconds

PR #1145 now contains two experimental ROM mechanics slices:

1. **Mechanics-derived restraint compatibility**
   - classical force/reference-structure relation:
     `(F + S) R = delta_target - delta_reference`;
   - `F` comes from rooted-tree 1 N unit-load actions + exact virtual work;
   - rigid or explicit finite-linear support flexibility only;
   - reciprocity, positive-definiteness, conditioning, compatibility and energy gates.

2. **Mechanics-derived thermal reference displacement**
   - no direct thermal force is injected;
   - per straight segment:
     `epsilon_th = alpha * (T_analysis - T_reference)`;
   - free expansion:
     `DeltaL = epsilon_th * L`;
   - vector increment:
     `Delta u_th = DeltaL * tangent`;
   - rooted path accumulation gives released/reference-structure node movement;
   - projection onto each restraint coordinate gives `delta_reference`;
   - the existing compatibility solver then converts prevented movement into reactions.

This remains a **reduced-order analytical flexibility / force-method model**. It does **not** assemble or solve a global finite-element nodal stiffness matrix.

No current production restraint-network runtime, profile multiplier, Load Calc dispatch, UI, export, report publication path, or method registry is modified.

## Architecture boundary — ROM, not FEA

The governing solution chain is:

```text
canonical straight-pipe route
  + explicit material/temperature data
  -> segment thermal strain
  -> free thermal expansion vectors
  -> rooted reference-tree displacement
  -> restraint-coordinate projection
  -> delta_reference
  + unit-load/virtual-work flexibility F
  + explicit support flexibility S
  + target/support movement
  -> (F+S)R = target-reference
  -> reactions + displacement + conditioning + energy evidence
```

Explicit negative assurance:

```text
global nodal stiffness K: NOT ASSEMBLED
finite-element discretization: NOT USED
Ku=f displacement solve: NOT USED
direct EA*alpha*DeltaT thermal-force injection: NOT USED
response curve fitting: NOT USED
empirical compliance multiplier: NOT USED
```

## Governing compatibility mechanics

```text
(F + S) R = delta_target - delta_reference
```

with:

```text
delta_pipe = delta_reference + F R
delta_support = S R
delta_pipe + delta_support = delta_target
```

where:

- `F`: analytical structural flexibility matrix in `m/N`;
- `S`: diagonal support flexibility, `0` for rigid and `1/k` for explicit finite linear stiffness;
- `R`: reaction on pipe positive along the declared coordinate direction;
- `delta_reference`: released/reference-structure movement;
- `delta_target`: support/ground target movement.

Energy closure:

```text
0.5 R^T (F+S) R = 0.5 R^T (delta_target-delta_reference)
```

## Governing thermal mechanics

For the current qualified experimental domain, each segment has a uniform temperature and one explicitly declared coefficient basis:

```text
CONSTANT_OVER_TEMPERATURE_RANGE
APPROVED_MEAN_BETWEEN_REFERENCE_AND_ANALYSIS
```

The segment strain is:

```text
DeltaT = T_analysis - T_reference
epsilon_th = alpha * DeltaT
```

The free expansion increment is:

```text
DeltaL_th = epsilon_th * L
Delta_u_th = DeltaL_th * t
```

where `t` is the root-oriented undeformed member tangent.

For node `j`:

```text
u_ref_th(j) = sum(Delta_u_th) over the unique root->j path
```

For restraint coordinate `i` with unit direction `d_i`:

```text
delta_reference_i = d_i dot u_ref_th(node_i)
```

That value is passed into the force-method compatibility solve. A fully restrained straight pipe therefore recovers:

```text
R = -EA alpha DeltaT
```

as a **result of compatibility**, not as an applied thermal load.

## Thermal authority limits

Current thermal authority is deliberately narrow:

- uniform temperature per straight segment only;
- explicit `T_reference` and `T_analysis`;
- explicit scalar CTE with declared basis;
- cooling/heating both supported by signed `DeltaT`;
- infinitesimal free axial expansion along the undeformed member tangent.

Not established in this PR:

- temperature-dependent `alpha(T)` numerical integration;
- code/material-table adapter authority for CTE selection;
- through-wall or circumferential thermal gradients;
- thermal bowing/curvature;
- elbow/tee/reducer thermal component kinematics;
- pressure stiffening, pressure thrust or Bourdon effects;
- nonlinear geometry;
- gaps/contact/friction;
- closed-loop reference-structure release policy.

No hidden default ambient temperature, CTE, or guessed material coefficient is permitted.

## Key decisions

### DEC-EMPROM-COMP-001 — Classical force method

Reactions are solved from analytical flexibility and compatibility. No fitted response multipliers enter the new path.

### DEC-EMPROM-COMP-002 — Independent coordinates required

The structural flexibility matrix must be reciprocal and positive definite. Duplicate/dependent coordinates fail closed rather than being numerically stabilized.

### DEC-EMPROM-COMP-003 — Contact remains separate

Only bilateral linear coordinates are admitted. Gap/contact/friction are not approximated as linear springs.

### DEC-EMPROM-COMP-004 — Existing scaled dense solver retained

`solveScaledDenseSystem` remains the numerical linear-equation primitive; its pivot/rank/conditioning behavior is unchanged.

### DEC-EMPROM-COMP-005 — Axisymmetric section authority

The high-level compatibility route remains axisymmetric-section-only until separate principal-axis custody exists.

### DEC-EMPROM-THM-001 — Thermal strain precedes thermal reaction

The thermal ROM derives free strain/expansion first. `EA*alpha*DeltaT` is never injected as the primary thermal load.

### DEC-EMPROM-THM-002 — Explicit coefficient basis

A scalar CTE must be declared either constant over the exact temperature range or an approved mean between the declared reference and analysis temperatures. A guessed/generic coefficient basis is rejected.

### DEC-EMPROM-THM-003 — No implicit alpha(T) claim

This phase does not claim temperature-dependent CTE integration. That requires a separately governed material function/table and qualification.

### DEC-EMPROM-THM-004 — No FEA route

The thermal compatibility wrapper explicitly records:

- `solutionClass: ANALYTICAL_FLEXIBILITY_FORCE_METHOD_ROM`;
- `globalNodalStiffnessMatrixAssembled: false`;
- `finiteElementRouteUsed: false`;
- `directThermalForceInjected: false`.

### DEC-EMPROM-THM-005 — Caller ownership preserved

Wrapper preparation clones nested property, thermal and direction inputs before deep-freezing internal custody. Caller-owned inputs are not frozen/mutated.

## Changed-file ledger

Compared with baseline `c35ae6eb...`, current intended files are:

- `src/core/empirical-piping-mechanics/restraint-compatibility.js`
- `src/core/empirical-piping-mechanics/thermal-reference.js`
- `src/core/empirical-piping-mechanics/thermal-restraint-compatibility.js`
- `src/core/empirical-piping-mechanics/contracts.js`
- `src/core/empirical-piping-mechanics/index.js`
- `scripts/empirical-restraint-compatibility-check.mjs`
- `scripts/empirical-thermal-reference-compatibility-check.mjs`
- `agents/PR1145_workreport.md`

No existing production restraint-network runtime/profile file is changed.

## Validation ledger

### VAL-EMPROM-COMP-001 — compatibility analytical execution

- STATUS: `PASS`
- OBSERVATION: `LOCAL_EXECUTION`
- ORACLE: `ANALYTICAL / INDEPENDENT_REPRODUCTION`

Cases previously executed:

1. rigid axial restraint:
   - `L=5 m`, `E=200 GPa`, `A=0.004 m2`, `delta_reference=0.004 m`;
   - expected `R=-640000 N`;
   - observed within numerical tolerance.
2. finite support stiffness:
   - `k=1e8 N/m`;
   - expected `R=-246153.84615384616 N`;
   - observed within numerical tolerance.
3. coupled 2-coordinate L-route;
4. coupled 3-coordinate L-route with out-of-plane bending/torsion;
5. prescribed settlement;
6. reciprocity violation rejection;
7. dependent/singular coordinate rejection;
8. negative support-stiffness rejection;
9. unsupported gap-field rejection;
10. compatibility closure;
11. energy closure.

### VAL-EMPROM-THM-001 — thermal reference analytical execution

- STATUS: `PASS`
- OBSERVATION: `LOCAL_EXECUTION`
- ORACLE: `ANALYTICAL / INDEPENDENT_REPRODUCTION`
- Exact thermal-reference source logic was executed in an isolated ES-module harness.

Cases:

1. straight route:
   - `L=10 m`;
   - `alpha=12e-6 /K`;
   - `DeltaT=100 K`;
   - expected free expansion `0.012 m`;
   - observed `0.012 m`.
2. fully restrained straight identity:
   - `E=200 GPa`, `A=0.004 m2`;
   - expected `R=-EA alpha DeltaT=-960000 N`;
   - independent force-method oracle recovered `-960000 N`.
3. L-route:
   - `3 m` X leg + `2 m` Y leg;
   - `epsilon=0.001`;
   - expected tip vector `[0.003, 0.002, 0] m`;
   - coordinate projections matched.
4. branch isolation:
   - sibling-branch thermal expansion did not enter the unrelated node path.
5. nonuniform segment temperatures:
   - path accumulation matched exact segment-by-segment sums.
6. cooling:
   - sign reversal recovered correctly.
7. direct `thermalForceN` field:
   - rejected by exact schema.
8. guessed CTE basis:
   - rejected.
9. non-unit coordinate direction:
   - rejected.
10. cyclic route:
   - rejected by tree-domain gate.

Observed result:

```text
PASS: rooted-tree thermal reference analytical checks
```

### VAL-EMPROM-THM-002 — source syntax

- STATUS: `PASS`
- OBSERVATION: `LOCAL_EXECUTION`

`node --check` passed for:

- `thermal-reference.js`;
- `thermal-restraint-compatibility.js`;
- `empirical-thermal-reference-compatibility-check.mjs`.

### VAL-EMPROM-THM-003 — caller-custody review

- STATUS: `PASS`
- OBSERVATION: `SOURCE_INSPECTION`
- Initial wrapper review found nested caller objects would be frozen by internal deep-freeze.
- Fixed before qualification by structured-cloning nested `properties`, `thermal`, and `direction` inputs.
- No mechanics equation changed.

### VAL-EMPROM-COMP-003 — committed compatibility end-to-end script

- STATUS: `NOT_RUN`
- OBSERVATION: `NOT_OBSERVED`
- The repository script exercises:
  `rooted-tree unit actions -> virtual-work F -> compatibility solve`.
- Full repository import-graph execution is not available in the current connector environment.

### VAL-EMPROM-THM-004 — committed thermal end-to-end script

- STATUS: `NOT_RUN`
- OBSERVATION: `NOT_OBSERVED`
- The committed script exercises:
  `temperature/CTE -> thermal reference -> unit-load virtual-work F -> compatibility reaction`.
- It includes the `-960000 N` fully restrained straight-pipe benchmark.
- Full repository import-graph execution is not available in the current connector environment.

### VAL-EMPROM-SCOPE-001 — source-scope negative assurance

- STATUS: `PASS`
- OBSERVATION: `SOURCE_INSPECTION`
- Branch remained `behind_by: 0` at the thermal implementation checkpoint.
- Delta is limited to the eight intended files listed above.
- Existing V1/V2 production runtime/profile behavior is unchanged.

### VAL-EMPROM-REG-001 — full repository regression

- STATUS: `NOT_RUN`
- OBSERVATION: `NOT_OBSERVED`

### VAL-EMPROM-CI-001 — exact-head GitHub Actions/statuses

- STATUS: `PENDING_RECONCILIATION`
- Empty workflow/status lists must not be called PASS.

## Remaining risks / authority seams

### RISK-EMPROM-001 — canonical temperature/CTE custody

The thermal mechanics now derive `delta_reference`, but production authority still needs an adapter from canonical line/component/material/load-case sources to:

- reference temperature;
- operating/analysis temperature;
- approved CTE basis/value.

No manual/guessed scalar may be promoted to production authority.

### RISK-EMPROM-002 — canonical support/restraint custody

Compatibility coordinates must still be bound to canonical restraint IDs, axes, support stiffness and prescribed support/ground movements.

### RISK-EMPROM-003 — contact/gaps

Bilateral linear only. Gap/contact/friction requires a separately qualified active-set layer.

### RISK-EMPROM-004 — component flexibility

Straight prismatic members only in this new route. Elbow/tee/reducer flexibility remains separate.

### RISK-EMPROM-005 — thermal gradients / alpha(T)

No thermal-gradient bending or temperature-dependent CTE integration is established.

### RISK-EMPROM-006 — production integration

The new solver is not registered as a production calculation method and cannot publish authoritative engineering load results.

## PR / release disposition

- PR #1145: `OPEN / DRAFT`.
- New mechanics state: `EXPERIMENTAL_CORE_ONLY`.
- Production registration: `NOT_REQUESTED / NOT_GRANTED`.
- Existing production behavior: unchanged.
- Merge authority: not granted.
- EXACT_NEXT_ACTION:
  1. bind thermal inputs to canonical load-case/material authority;
  2. bind compatibility coordinates to canonical support/restraint custody;
  3. independently execute committed repository scripts/full regression when infrastructure permits;
  4. only then plan gap/contact and component-flexibility phases.
