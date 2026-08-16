# PR #1158 — Independent FEM Acceptance Audit

## Audit status

- PR: #1158
- audit type: independent FEM acceptance + Chromium engine cross-check
- audit initiated from head: `c5cf5baae4e499919e51531a75df977c1b716893`
- corrective source changes through: `fa80f7066c6b424198f38dc3d2ad0efd3646521f`
- merge authority: NOT GRANTED
- release authority: NOT GRANTED
- production browser qualification: NOT_RUN / BLOCKED_EXTERNAL

The shell kernel/formulation files used by the independent mechanics checks were not changed by the corrective Sample commits. The only FEM-model correction made from this audit is the LAFEA.5 demonstration/workflow boundary condition plus regression coverage.

## Chromium execution boundary

Chromium `144.0.7559.96` was available locally and was launched under Xvfb with the Chrome DevTools Protocol. JavaScript mechanics checks were executed in Chromium's V8 runtime through `Runtime.evaluate`.

The environment applies an organizational browser navigation policy that blocks both `file://` and local `127.0.0.1` navigation. Direct GitHub access from the shell is also unavailable. Therefore this audit does **not** claim that the production application page, Playwright path or current screenshots executed locally.

Classification used here:

- `CHROMIUM_INDEPENDENT_PASS`: independent mechanics executed in Chromium V8.
- `SOURCE_INSPECTION`: exact PR source/custody path reviewed.
- `BLOCKED_EXTERNAL / NOT_RUN`: production app / exact-head integrated suite did not execute.

## 1. LAFEA.4 independent shell mechanics

### Exact Sample geometry

Sample basis:

- cylindrical panel radius = `100 mm`;
- axial length = `50 mm`;
- angular span = `60°`;
- 26 nodes;
- 24 TRI3 CST/DKT facets.

Chromium reconstruction results:

- maximum nodal radius error: `1.4210854715202004e-14 mm`;
- minimum triangle area: `218.09693682667967 mm²`;
- minimum element-normal / declared-director alignment: `0.9998941124908627`.

Status: `CHROMIUM_INDEPENDENT_PASS`.

### Uniform pressure resultant

For `p = 1.2 MPa` on the full faceted cylindrical panel:

Analytical resultant for the 60° cylindrical sector:

- force = `[0, 0, 6000] N`;
- moment about global origin = `[0, -150000, 0] N·mm`.

Chromium facet integration reconstructed:

- force = approximately `[0, 1.7e-13, 6000.000000000002] N`;
- maximum force residual ≈ `2.73e-12 N`;
- moment = approximately `[9.1e-13, -150000, -2e-12] N·mm`;
- maximum moment residual ≈ `2.05e-12 N·mm`.

Status: `CHROMIUM_INDEPENDENT_PASS`.

### Constant membrane field and angular refinement

The exact CST kinematics were reconstructed independently for the cylindrical prescribed membrane field.

| Circumferential segments | Max strain error | Max stress error (MPa) |
|---:|---:|---:|
| 2 | 2.2951383e-5 | 5.0442601 |
| 4 | 5.7181117e-6 | 1.25672785 |
| 8 | 1.4283021e-6 | 0.31391255 |
| 16 | 3.5699903e-7 | 0.078461325 |

Successive strain-error refinement ratios:

- 2→4: `4.01380`;
- 4→8: `4.00343`;
- 8→16: `4.00086`.

This is consistent with approximately second-order angular convergence for this kinematic check and exceeds the existing `>3.5` qualification expectation.

Status: `CHROMIUM_INDEPENDENT_PASS`.

### DKT pure-bending reproduction

The exact production DKT interpolation/curvature equations were independently reconstructed in Chromium for two triangles with target curvature:

`[1.2e-4, -0.8e-4, 0.45e-4] 1/mm`.

Across all three fixed DKT integration points, maximum curvature reconstruction error was:

`1.8295911660692887e-19 1/mm`.

Status: `CHROMIUM_INDEPENDENT_PASS`.

### LAFEA.4 product-route acceptance limitation

Audit finding: the current visible LAFEA.4 Sample and the compiler pressure check use whole-surface prescribed constraints. Under compiler v1, the only qualified constraint transfer is a whole-surface identical value per DOF, with nonzero local R1/R2 transfer blocked.

This is sufficient to prove:

- retained-mesh pressure load custody;
- pressure orientation/resultant;
- reaction equilibrium;
- meshHash → solverModelHash → execution custody.

It is **not sufficient to prove a nonzero remeshed structural response**, because a stable pressure model needs localized support/edge constraints, and those are intentionally outside compiler v1 authority.

Accordingly:

- LAFEA.4 mesh/execution custody: `SOURCE_IMPLEMENTED / INTEGRATED_RUNTIME_NOT_RUN`;
- LAFEA.4 independent shell formulation checks above: `CHROMIUM_INDEPENDENT_PASS`;
- LAFEA.4 remeshed nonzero displacement/stress product acceptance: `NOT_QUALIFIED`.

Do not solve this by nearest-node constraint transfer. The next qualified feature must introduce persistent geometric EDGE/POINT/FACE sets and re-evaluate membership after remeshing.

## 2. LAFEA.5 independent trunnion workflow mechanics

### Reference-point transfer

Fixture attachment resultant at source point `[5, -3, 2] mm`:

- force = `[120, -80, 60] N`;
- moment at source = `[700, -500, 900] N·mm`.

Transferred to footprint reference `[0,0,0]` using:

`M_ref = M_source + r × F`

Independent expected transferred moment:

`[680, -560, 860] N·mm`.

Status: `CHROMIUM_INDEPENDENT_PASS`.

### Weighted footprint-force reconstruction

Independent Chromium reconstruction of the production six-component minimum-norm footprint fit produced:

- reconstructed force ≈ `[120.00000000000003, -80, 60] N`;
- reconstructed moment ≈ `[680.0000000000001, -560.0000000000002, 860.0000000000003] N·mm`;
- largest resultant residual ≈ `3.41e-13`.

Minimum shell element normal/director alignment for the exact 24-element source mesh was approximately `0.996035`.

Status: `CHROMIUM_INDEPENDENT_PASS`.

## 3. Audit defect found — response-trivial LAFEA.5 Sample

The audit found that the prior default `workflowSource()` used `stableShellTemplate()` with all five DOFs fixed on all 24 nodes.

Consequences:

- distributed attachment forces were nonzero;
- reactions could close the six-component resultant perfectly;
- every displacement remained zero;
- every recovered membrane/bending stress remained zero;
- an `ACCEPTED` shell result therefore proved reaction/load custody but did not demonstrate a structural response.

Classification: `P1 ACCEPTANCE / SAMPLE DEFECT`.

This does **not** invalidate the retained-mesh execution-custody fix and does not demonstrate a defect in the CST/DKT kernel itself.

## 4. Corrective LAFEA.5 Sample boundary

The engineering workflow Sample now uses:

- `Fxx` footprint ring: free structural DOFs;
- `Oxx` outer ring: `UX/UY/UZ/R1/R2 = 0`;
- 60 free DOFs;
- 60 constrained DOFs;
- unchanged 24 nodes / 24 TRI3 connectivity;
- unchanged caller-authored source-mesh adoption.

The original fully-fixed shell contract fixture remains available through `stableShellTemplate()` using its default `ALL_FIXED` boundary mode.

Independent Chromium structural solve for this corrected boundary produced:

- minimum free-system Cholesky pivot: `20947.711834722562`;
- pivot ratio: `0.031297594393644115`;
- maximum displacement: `0.0012512431527712696 mm`;
- maximum von Mises stress: `19.998512807657786 MPa`;
- maximum stress component: `18.479273507076293 MPa`;
- support force ≈ `[-120, 80, -60] N`;
- support moment ≈ `[-680, 560, -860] N·mm`;
- maximum force closure residual ≈ `2.84e-14 N`;
- maximum moment closure residual ≈ `1.14e-12 N·mm`.

Status: `CHROMIUM_INDEPENDENT_PASS` for the corrected mechanics.

## 5. Regression changes resulting from audit

Added/updated:

- `scripts/lafea.5-fixtures.mjs`
  - `workflowSource()` defaults to `OUTER_RING_FIXED`;
  - `stableShellTemplate()` defaults to retained `ALL_FIXED` contract behavior;
  - unsupported boundary modes fail closed.
- `scripts/lafea-shell-response-acceptance-check.mjs`
  - requires 12 fixed O-ring nodes / 60 constrained DOFs;
  - requires nonzero displacement and von Mises stress;
  - requires Cholesky solve and force/moment equilibrium;
  - checks exact transferred resultant;
  - proves all-fixed contract fixture remains available and response-trivial by design.
- `e2e/lafea-shell-sample-mesh.spec.js`
  - requires the visible LAFEA.5 Sample boundary to be outer-ring-only;
  - after Run, requires nonzero displacement/stress plus force/moment equilibrium;
  - retains exact mesh/solver/lifecycle hash-custody assertions.
- `.github/workflows/lafea-visible-workbench.yml`
  - syntax-checks and executes the response acceptance checker before browser proof.

## 6. Acceptance matrix

| Gate | LAFEA.4 | LAFEA.5 |
|---|---|---|
| Exact source geometry | Chromium independent PASS | Chromium independent PASS |
| Shell normal/director orientation | Chromium independent PASS | Chromium independent PASS |
| Load/resultant reconstruction | Chromium independent PASS | Chromium independent PASS |
| Reference-point transfer | N/A | Chromium independent PASS |
| CST membrane field/refinement | Chromium independent PASS | Kernel authority shared |
| DKT pure bending | Chromium independent PASS | Kernel authority shared |
| Nonzero structural response in current product Sample | **NOT QUALIFIED — geometric BC mapping missing** | Chromium independent PASS after correction |
| Retained source mesh preservation | N/A generated mesh | Source architecture implemented |
| meshHash → solver execution custody | Source architecture implemented | Source architecture implemented |
| Current exact-head Node/CI execution | BLOCKED_EXTERNAL / NOT_RUN | BLOCKED_EXTERNAL / NOT_RUN |
| Current production Chromium/Playwright page | BLOCKED_EXTERNAL / NOT_RUN | BLOCKED_EXTERNAL / NOT_RUN |
| Current screenshots | NOT CLAIMED | NOT CLAIMED |

## 7. Required closure before merge

1. GitHub Actions capacity must be restored or an equivalent exact-head executable environment supplied.
2. Run all shell compiler/custody checks, including `lafea-shell-response-acceptance-check.mjs`.
3. Run production Playwright Chromium Sample → mesh/adopt → Run path.
4. Require LAFEA.5 nonzero displacement/stress and equilibrium in the real application state.
5. Require exact meshHash/solverModelHash/execution/lifecycle binding in the real application state.
6. Capture real application screenshots only after assertions pass.
7. Keep LAFEA.4 response-level remesh qualification explicitly limited until qualified geometric BC/load mapping is implemented.

## Conclusion

The independent mechanics audit materially strengthens PR #1158:

- the shell formulation/resultant mathematics checked independently is consistent with the intended equations;
- the LAFEA.5 Sample had a genuine response-trivial boundary-condition defect and has been corrected source-side;
- the correction produces a stable, nonzero shell response with tight global equilibrium in Chromium;
- the LAFEA.4 compiler remains correctly fail-closed but cannot yet claim nonzero remeshed response qualification;
- production exact-head browser/CI evidence is still mandatory before merge readiness can be promoted.
