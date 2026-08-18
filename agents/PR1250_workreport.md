# PR1250 — LAFEA B01 Near-Incompressible Sparse Solver Qualification

## Current state

- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1250
- Branch: `agent/lafea-b01-solver-qualification-20260818`
- Intent: engineering-critical prerequisite repair split from TECH-13 carrier #1249
- Merge authority: owner explicitly authorized on 2026-08-18
- Current `main` authority rechecked: `134b43c4cd09139d3b6067223576ccdad653f07e`
- Trust root / TECH-13 authority: out of scope and unchanged
- Solver acceptance thresholds: unchanged
- sparse iteration budget: unchanged
- production solver candidate: symmetric Jacobi equilibration followed by CG on the scaled SPD system
- production-code reference head before latest diagnostic-carrier-only edits: `af3a0473f8161eceddc2f4e54c0fd4ec811d4b62`
- current branch head contains diagnostic workflow edits only above those production bytes; no diagnostic result may be treated as production authority until promoted and requalified.

## Current governing failure

The earlier T6/L3/ν=0.4999 failure is closed by symmetric Jacobi equilibration. The current full-matrix blocker is the finer case:

```text
elementType: T6
levelId: L4
poissonRatio: 0.4999
distortionId: REGULAR
iterationLimit: 50000
exact original-coordinate residual: 3.725290298461914e-9
qualified internal target:          1.5439099506948204e-9
state: FAIL
```

At production-code head `af3a0473f8161eceddc2f4e54c0fd4ec811d4b62`, workflow run `32158946070` retained artifact `9333597264`. The final integrated qualification exits 1 only on the production Lamé matrix. The same artifact records PASS for deterministic mesh controls, registered 54-case base matrix, 270-case metamorphic matrix, 16-case fail-closed matrix, independent oracle, shared unit contract, prior T6/Q8/imposed-displacement/solver controls, and the frozen ν=0.3 Lamé diagnostic.

## Numerical representation under qualification

With `D = diag(A)`, sparse production solves

```text
A_hat y = b_hat
A_hat = D^(-1/2) A D^(-1/2)
b_hat = D^(-1/2) b
x = D^(-1/2) y
```

using CG. In exact arithmetic this is Jacobi-preconditioned CG. Recurrence `A*p` remains on the ordinary CSR product; exact residual custody uses compensated CSR summation in original coordinates. Solver evidence remains `DETERMINISTIC_JACOBI_PCG` / `SYMMETRIC_JACOBI_EQUILIBRATED_CG` / `JACOBI`.

## Protected invariants

- constitutive and B-bar formulation unchanged;
- stiffness and pressure-load equations unchanged;
- free-DOF acceptance tolerance unchanged;
- reaction-equilibrium tolerance unchanged;
- internal convergence target remains `freeDofResidualTolerance / 10`;
- iteration cap remains `min(50000, max(1000, 16*N))`;
- matrix remains SPD authority for CG;
- final convergence is checked in original physical coordinates;
- no benchmark expected value changed;
- no mesh-quality threshold changed;
- T6 curved-element quality remains governed by high-order scaled Jacobian rather than the straight-corner angle surrogate;
- no release or TECH-13 trust-root authority changed.

## Retained prerequisite corrections

1. remove the invalid unconditional residual replacement that retained stale conjugate state;
2. compensated PCG scalar products;
3. compensated solution accumulation;
4. compensated recursive-residual accumulation;
5. compensated exact-residual CSR summation;
6. symmetric Jacobi equilibration for the sparse SPD system;
7. T6 quality-domain correction: straight-corner minimum-angle surrogate applies only to straight-sided triangular formulations;
8. frozen Lamé diagnostic retains explicit case observability.

## Rejected / non-promoted numerical candidates

| Candidate | Governing observation | Disposition |
|---|---:|---|
| compensated global CSR recurrence action | worsened prior residual to about `2.29338e-8` | rejected/reverted |
| compensated sparse assembly | prior governing residual `2.6775524020195007e-8` | rejected/reverted |
| unconditional/full reliable restart | ν=0.3 reaction-equilibrium regression | rejected/reverted |
| drift-triggered restart | residual `0.5968922979591298` | rejected/reverted |
| target-only reliable restart | advanced convergence but exposed reaction imbalance dominated by aggregate free residual | diagnostic only; not promoted |
| SGS-PCG | residual `3.344212018419057e-9` on earlier case | rejected/reverted |
| IC(0)-PCG | negative IC(0) pivot square `-11758995.159897372` at row 722 | rejected; no shift introduced |
| skyline Cholesky + refinement | reaction-equilibrium failure persisted | rejected |
| nodal block-SGS PCG | L4 residual `6.170012056827545e-9` | rejected |
| two-level six-mode affine coarse space | L4 residual `3.6088749766349792e-9` | insufficient; rejected |
| post-cap minimum-residual exact-residual correction | `3.725290298461914e-9 -> 2.0954757928848267e-9`; one accepted step, then stagnation | insufficient; not promoted |
| normalized/scaled sparse defect correction | correction solve diverged to `1.497543416917324e-5` | rejected |

## Reaction-residual RCA retained as evidence

When a target-only reliable update advanced a fine case to the reaction gate, residual decomposition showed that the apparent reaction imbalance was overwhelmingly the sum of free-DOF residuals, not loss of translational nullspace in assembled stiffness. Representative B01 decomposition:

```text
external reaction imbalance:  UX +5.8949e-8, UY -6.9782e-8
summed free residual:          UX -5.8956e-8, UY +6.9755e-8
K translational-nullspace remainder:
                              UX -6.53e-12, UY -2.67e-11
```

Therefore reaction-total compensation, compensated final `K*x`, and compensated sparse assembly are not accepted substitutes for solving the free system more accurately.

## Active falsifier

A runner-only error-free-product / double-double sparse row dot is being tested **only for the exact residual oracle**. Purpose: determine whether the remaining `3.725e-9` floor is product-rounding in the authoritative `K*x` cancellation rather than unresolved Krylov error. The CG recurrence, matrix, iteration limit, internal target, engineering tolerances, benchmark, and production source are unchanged by this diagnostic.

Disposition rule:
- if double-double exact residual remains above `1.5439099506948204e-9`, reject residual-evaluation precision as the primary cause;
- if it falls below target, qualify the arithmetic authority independently before any production promotion.

## Validation state

- Registered base matrix: **PASS (54/54)**
- Metamorphic matrix: **PASS (270/270)**
- Fail-closed matrix: **PASS (16/16)**
- Frozen ν=0.3 Lamé L1-L4 diagnostic: **PASS**
- Full near-incompressible production Lamé matrix: **FAIL** at T6/L4/ν=0.4999/REGULAR
- Exact-head merge qualification: **FAIL**
- Merge: **BLOCKED**

## Merge gate

Do not merge while the full B01 matrix is red. After a candidate closes the L4 governing case, it must be promoted into source, all temporary diagnostic workflows must be removed, the workreport updated, and the cleanup-bearing exact head must rerun:

1. full B01 integrated qualification;
2. registered 54-case base matrix;
3. 270-case metamorphic matrix;
4. 16-case fail-closed matrix;
5. focused Lamé diagnostic;
6. relevant workbench/build collateral checks.

Only that exact cleanup head is eligible for merge. After #1250 merges, re-ground #1254 B02D V2 on the new `main` and rerun its frozen pre-observation and full production-response/convergence gates before any B02D merge.
