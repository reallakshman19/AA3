# PR #1145 — Empirical ROM Compatibility Solver Work Report

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- PR: `#1145`
- WORK_INTENT: `IMPLEMENT`
- CRITICALITY: `ENGINEERING_CRITICAL`
- Base branch: `main`
- Baseline SHA: `c35ae6eb04cf819a2ed4f839f45b3e05fdeccff6`
- Working branch: `agent/empirical-rom-compatibility-20260815`
- ENGINEERING_BASIS_HEAD before report-only reconciliation: `0cbfd4eff25a003de87dcfc8ca5c8ad5b9b11bda`
- Merge authority: not granted; owner authorization required.
- Grounding epoch: `GE-EMPROM-COMP-001`
- Coordination: `SAFE` — open PR #1139 is LAFEA.3 B-bar and does not overlap this empirical ROM core path.

## Handover in 60 Seconds

Mission: implement the next P0 mechanics slice after merged PR #1143 — a first-principles force/reference-structure compatibility solver for multiple bilateral translational restraint coordinates.

Implemented:

1. linear compatibility primitive using `(F + S) R = delta_target - delta_reference`;
2. reciprocity/symmetry gate on the flexibility matrix;
3. Cholesky-style positive-definiteness gate on structural `F` and assembled `(F+S)`;
4. reuse of the existing scaled dense solver with pivot and reciprocal-condition evidence;
5. compatibility residual recovery;
6. structural/support strain-energy closure;
7. rigid or explicitly finite positive support stiffness only;
8. rooted-tree orchestrator that generates `F` from merged 1 N unit-load actions + virtual work;
9. axisymmetric-section gate for the high-level route orchestrator;
10. fail-closed rejection of dependent coordinates, non-reciprocal matrices, negative stiffness, and unsupported gap/contact fields.

No current production restraint-network runtime, profile multiplier, Load Calc dispatch, UI, export, or publication path is modified.

Exact next engineering action after this PR: derive `delta_reference` from governed thermal/applied-load mechanics and bind the redundant coordinates to canonical support/restraint authority. Do not allow manually authored reference displacements into production authority.

## Governing mechanics

The force-method relation is:

```text
(F + S) R = delta_target - delta_reference
```

with recovery:

```text
delta_pipe = delta_reference + F R

delta_support = S R

delta_pipe + delta_support = delta_target
```

where:

- `F`: mechanics-derived structural flexibility matrix in `m/N`;
- `S`: diagonal support flexibility, `0` for rigid and `1/k` for finite linear stiffness;
- `R`: reaction on pipe, positive along declared coordinate direction;
- `delta_reference`: released/reference-structure displacement from separately governed loading;
- `delta_target`: prescribed support/ground movement.

The energy identity checked is:

```text
0.5 R^T (F+S) R = 0.5 R^T (delta_target-delta_reference)
```

## Authority trace

```text
rooted straight-pipe reference structure
  + 1 N translational coordinate cases
  -> static cut equilibrium + moment transport
  -> N/My/Mz/T unit actions
  -> exact virtual-work F
  + explicit rigid/linear support flexibility S
  + reference/target displacement vectors
  -> compatibility solve
  -> reactions + displacement + conditioning + energy evidence
```

### DEC-EMPROM-COMP-001 — Classical force method, no response fitting

The new solver adds support flexibility mechanically on the diagonal and solves the compatibility equations directly. It contains no axial, bending, topology, or component response multiplier.

### DEC-EMPROM-COMP-002 — Independent redundant coordinates required

The structural flexibility matrix must be reciprocal and positive definite. Duplicate/dependent coordinates are rejected rather than stabilized numerically.

### DEC-EMPROM-COMP-003 — Contact remains outside this phase

Only bilateral linear constraints are admitted. Gap/contact/friction fields are not accepted by the compatibility coordinate schema and are not silently converted to springs.

### DEC-EMPROM-COMP-004 — Existing numerical solver retained

The compatibility system uses `solveScaledDenseSystem`; existing pivot scaling and reciprocal-condition behavior are retained. This PR adds its own compatibility/energy acceptance evidence but does not change the linear solver.

### DEC-EMPROM-COMP-005 — Section-axis authority remains restricted

The high-level rooted-tree orchestrator requires `Iy` and `Iz` to agree within `1e-10` relative difference. This enforces the current axisymmetric pipe-only authority because the merged unit-load generator's transverse basis is deterministic, not separately governed principal-axis data.

### DEC-EMPROM-COMP-006 — Reference displacement authority is intentionally not granted

`delta_reference` is accepted by the experimental primitive/orchestrator only as an upstream reference-structure result. This PR does not establish production authority for manually entered reference displacements. The output evidence states:

`UPSTREAM_REFERENCE_STRUCTURE_RESULT_NOT_ESTABLISHED_BY_THIS_PR`

## Changed-file ledger

At engineering head `0cbfd4ef...`:

- `src/core/empirical-piping-mechanics/restraint-compatibility.js` — new low-level compatibility primitive and rooted-tree orchestrator.
- `src/core/empirical-piping-mechanics/contracts.js` — formula IDs `EMP-FLX-010` through `EMP-FLX-013`.
- `src/core/empirical-piping-mechanics/index.js` — exports new schemas/solvers.
- `scripts/empirical-restraint-compatibility-check.mjs` — analytical qualification and fail-closed cases.
- `agents/PR1145_workreport.md` — durable handover ledger.

The temporary `agents/WIP-empirical-rom-compatibility-20260815_workreport.md` is superseded by this report and is removed in a report-only commit.

No `empirical-restraint-network-runtime.js`, coupled runtime/profile, method registry, Load Calc consumer, UI, or workflow file is changed.

## Validation ledger

### VAL-EMPROM-COMP-001 — compatibility primitive analytical execution

- STATUS: `PASS`
- OBSERVATION: `LOCAL_EXECUTION`
- ORACLE: `ANALYTICAL / INDEPENDENT_REPRODUCTION`
- Runtime: isolated Node harness using the published compatibility primitive logic and the repository's scaled-solver algorithm.
- Result: `PASS: empirical restraint compatibility analytical checks`.

Cases:

1. rigid axial restraint:
   - `L = 5 m`, `E = 200 GPa`, `A = 0.004 m²`, `delta_reference = 0.004 m`;
   - `F = L/(EA)`;
   - expected reaction `R = -delta/F = -640000 N`;
   - observed exact expected reaction within numerical tolerance.
2. finite support stiffness:
   - `k = 1e8 N/m`;
   - expected `R = -delta/(F + 1/k) = -246153.84615384616 N`;
   - observed exact expected reaction within numerical tolerance.
3. coupled 2-DOF analytical L-route:
   - independent closed-form `Fxx`, `Fyy`, `Fxy`;
   - imposed reference generalized loads `[1200, -450] N`;
   - expected redundant reactions `[-1200, +450] N`;
   - observed exact expected reactions within tolerance.
4. coupled 3-DOF L-route:
   - includes out-of-plane bending plus root-leg torsion;
   - imposed reference generalized loads `[900, -300, 725] N`;
   - expected reactions `[-900, +300, -725] N`;
   - observed exact expected reactions within tolerance.
5. prescribed settlement:
   - independent closed-form 2x2 inverse oracle;
   - recovered reactions matched independent inverse.
6. reciprocity violation: rejected.
7. dependent/singular coordinates: rejected by positive-definiteness gate.
8. negative support stiffness: rejected.
9. unsupported `gapM` field: rejected by exact schema.
10. compatibility closure: PASS.
11. energy closure: PASS.

### VAL-EMPROM-COMP-002 — source syntax

- STATUS: `PASS`
- OBSERVATION: `LOCAL_EXECUTION`
- ORACLE: `NONE`
- `node --check` passed on the new compatibility source and committed analytical check script content.

### VAL-EMPROM-COMP-003 — committed end-to-end route integration

- STATUS: `NOT_RUN`
- OBSERVATION: `NOT_OBSERVED`
- ORACLE: `ANALYTICAL + IMPLEMENTATION_COUPLED`
- The committed script exercises the actual repository path:
  `rooted-tree unit actions -> virtual-work F -> compatibility solve`
  for a 3 m + 2 m L-route with independent closed-form axial/bending/torsional coefficients.
- Limitation: no full local repository checkout is available in this connector execution environment.

### VAL-EMPROM-COMP-004 — source-scope negative assurance

- STATUS: `PASS`
- OBSERVATION: `SOURCE_INSPECTION`
- ORACLE: `NONE`
- Compare against baseline `c35ae6eb...` shows only intended mechanics/formula/export/check/report files.
- No existing production restraint-network runtime/profile file is changed.
- Branch was `behind_by: 0` immediately before draft PR allocation.

### VAL-EMPROM-COMP-005 — full repository regression

- STATUS: `NOT_RUN`
- OBSERVATION: `NOT_OBSERVED`
- ORACLE: `IMPLEMENTATION_COUPLED`
- No full local checkout available.

### VAL-EMPROM-COMP-006 — exact-head GitHub Actions / statuses

- STATUS: `NOT_RUN` pending final report-only reconciliation head inspection.
- Empty workflow/status lists, if observed, must not be called PASS.

## Risks / open work

### RISK-EMPROM-COMP-001 — upstream reference-displacement authority

The solver can consume `delta_reference`, but this PR does not derive it from thermal strain, weight, imposed movement, or other governed load mechanics. Production integration must close this authority seam first.

### RISK-EMPROM-COMP-002 — contact/gap interaction

The solver is bilateral linear only. A finite gap or unilateral restraint requires a separately qualified active-set/contact layer; it must not be represented as a linear spring by default.

### RISK-EMPROM-COMP-003 — component flexibility absent

The route orchestrator still uses straight prismatic mechanics only. Elbow/tee/reducer flexibility remains a separate qualification phase.

### RISK-EMPROM-COMP-004 — closed geometric loops remain blocked

The reference structure is a connected acyclic pipe tree. Closed piping geometry requires a deliberate reference-structure release formulation and independent qualification before acceptance.

### RISK-EMPROM-COMP-005 — production integration deliberately absent

The new solver is not registered as a calculation method and cannot publish engineering load results. This protects production authority while qualification remains incomplete.

## PR / release disposition

- PR #1145: `OPEN / DRAFT`.
- New mechanics state: `EXPERIMENTAL_CORE_ONLY`.
- Production registration: `NOT_REQUESTED / NOT_GRANTED`.
- Existing production behavior: unchanged.
- Merge authority: not granted.
- EXACT_NEXT_ACTION: close the upstream `delta_reference` authority seam using governed thermal/applied-load reference-structure mechanics, then bind coordinates to canonical restraint custody before any production qualification/cutover.