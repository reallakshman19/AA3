# PR1250 — LAFEA B01 Near-Incompressible Sparse Solver Qualification

## Current state

- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1250
- Branch: `agent/lafea-b01-solver-qualification-20260818`
- Intent: engineering-critical prerequisite repair split from TECH-13 carrier #1249
- Merge authority: owner explicitly authorized on 2026-08-18
- Current `main` authority: `134b43c4cd09139d3b6067223576ccdad653f07e`
- Trust root / TECH-13 authority: out of scope and unchanged
- Solver acceptance thresholds: unchanged
- sparse iteration budget: unchanged
- merge state: BLOCKED until full exact-head matrix is green

## Governing case

```text
elementType: T6
levelId: L4
poissonRatio: 0.4999
distortionId: REGULAR
iterationLimit: 50000
baseline exact original-coordinate residual: 3.725290298461914e-9
qualified internal target:                  1.5439099506948204e-9
```

At production reference head `af3a0473f8161eceddc2f4e54c0fd4ec811d4b62`, run `32158946070` / artifact `9333597264` records PASS for deterministic mesh controls, registered 54-case base matrix, 270-case metamorphic matrix, 16-case fail-closed matrix, independent oracle, shared unit contract, prior T6/Q8/imposed-displacement/solver controls, and the frozen ν=0.3 Lamé diagnostic. The integrated production Lamé matrix remains the only merge blocker.

## Numerical representation under qualification

Sparse production uses symmetric Jacobi equilibration:

```text
A_hat y = b_hat
A_hat = D^(-1/2) A D^(-1/2)
b_hat = D^(-1/2) b
x = D^(-1/2) y
```

with CG. In exact arithmetic this is Jacobi-preconditioned CG. Solver evidence remains `DETERMINISTIC_JACOBI_PCG` / `SYMMETRIC_JACOBI_EQUILIBRATED_CG` / `JACOBI`.

## Protected invariants

- constitutive and B-bar formulation unchanged;
- stiffness and pressure-load equations unchanged;
- free-DOF and reaction-equilibrium tolerances unchanged;
- internal target remains `freeDofResidualTolerance / 10`;
- iteration cap remains `min(50000, max(1000, 16*N))`;
- no benchmark expected value changed;
- no mesh-quality threshold changed;
- no release or TECH-13 trust-root authority changed.

## Retained prerequisite corrections

1. remove invalid unconditional residual replacement with stale conjugate state;
2. compensated PCG scalar products;
3. compensated solution and recursive-residual accumulation;
4. compensated original-coordinate residual evaluation;
5. symmetric Jacobi equilibration;
6. T6 quality-domain correction: straight-corner minimum-angle surrogate is not applied to curved T6;
7. frozen Lamé diagnostic now explicitly gates T6/L4/ν=0.4999/REGULAR.

## Rejected / non-promoted candidates

| Candidate | Governing observation | Disposition |
|---|---:|---|
| compensated recurrence CSR action | worsened prior residual | rejected/reverted |
| compensated sparse assembly | prior governing residual `2.6775524020195007e-8` | rejected/reverted |
| unconditional / drift reliable restart | regression; drift variant reached `0.5968922979591298` | rejected |
| SGS-PCG | earlier residual `3.344212018419057e-9` | insufficient |
| IC(0)-PCG | negative IC(0) pivot square `-11758995.159897372` row 722 | rejected; no shift |
| skyline Cholesky + refinement | reaction-equilibrium failure | rejected |
| nodal block-SGS PCG | L4 residual `6.170012056827545e-9` | rejected |
| six-mode affine coarse space | L4 residual `3.6088749766349792e-9` | insufficient |
| post-cap minimum-residual correction | `3.725290298461914e-9 -> 2.0954757928848267e-9`; then stagnated | insufficient alone |
| normalized sparse defect correction | diverged to `1.497543416917324e-5` | rejected |
| double-double terminal residual only | `3.725290298461914e-9 -> 2.908975580188456e-9` | real product-rounding contribution, insufficient alone |
| DD terminal residual + bounded minimum-residual correction | cleared internal convergence but failed reaction equilibrium | not promotable |
| DD solver/equilibrium authority alignment | free residual sums ~`1e-9`, but exposed full-stiffness translational-nullspace defect `UX=-7.270422894133344e-8`, `UY=-4.693094705468879e-8` | diagnostic; identifies new owning defect |

## Updated RCA — stiffness translational nullspace

Earlier binary64 reaction recovery could make the governing reaction imbalance appear to be dominated by summed free residual. After DD terminal residual plus bounded correction drove the free system materially closer, and full equilibrium recovery was evaluated with the same accurate row product, the governing decomposition became:

```text
external reaction imbalance:
  UX = -7.357309073086071e-8
  UY = -4.7548454062962264e-8
summed free residual:
  UX =  8.688617895272798e-10
  UY =  6.175070082734687e-10
stored full-K translational-nullspace defect:
  UX = -7.270422894133344e-8
  UY = -4.693094705468879e-8
reaction limit = 2.427520890326532e-8
```

Therefore the present dominant defect is no longer the iterative solver. The stored global stiffness does not preserve the exact rigid translations to reaction-gate accuracy when the near-incompressible T6 B-bar local stiffnesses are assembled. The next qualification owner is element stiffness/nullspace preservation.

## Active falsifier

Runner-only candidate on B-bar T6 local stiffness:

```text
K_e' = P^T K_e P
```

where `P` removes only the two rigid translations for the 12-DOF T6 element. The candidate uses compensated 12x12 products and preserves symmetry. It does not change constitutive coefficients, B-bar equations, Gauss points, thickness, mesh, loads, solver target/cap, or qualification tolerances.

Acceptance requirement: exact T6/L4/ν=0.4999/REGULAR must return `ACCEPTED`; if reaction still fails, the diagnostic must quantify remaining free residual and stored-K nullspace contributions. A PASS here is only a focused falsifier; source promotion would still require rigid-body/affine-patch controls, full B01 integrated matrix, 54/270/16 matrices, and collateral workbench/build checks.

## Validation state

- Registered base matrix: **PASS (54/54)** on production reference head
- Metamorphic matrix: **PASS (270/270)** on production reference head
- Fail-closed matrix: **PASS (16/16)** on production reference head
- Frozen ν=0.3 Lamé diagnostic: **PASS**
- T6/L4/ν=0.4999/REGULAR: **FAIL** on current production source
- Active local-stiffness nullspace projection: **IN PROGRESS / NOT YET OBSERVED**
- Merge: **BLOCKED**

## Merge gate

Do not merge while the full B01 matrix is red. If a local-stiffness repair closes the governing case, promote only the qualified mechanism, remove all temporary workflows, update this report, and rerun on the cleanup-bearing exact head:

1. full integrated B01 qualification;
2. registered 54-case base matrix;
3. 270-case metamorphic matrix;
4. 16-case fail-closed matrix;
5. focused Lamé diagnostic including L4;
6. rigid-body / affine-patch / T6-Q8 controls;
7. relevant workbench/build collateral checks.

Only that exact cleanup head is eligible for merge. After #1250 merges, re-ground #1254 B02D V2 on new `main` and rerun frozen mesh plus full response/convergence gates before B02D merge.
