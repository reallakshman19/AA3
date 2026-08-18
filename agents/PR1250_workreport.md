# PR1250 — LAFEA B01 Near-Incompressible Sparse Solver Qualification

## Current state

- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1250
- Branch: `agent/lafea-b01-solver-qualification-20260818`
- Intent: engineering-critical prerequisite repair split from TECH-13 carrier #1249
- Merge authority: owner explicitly authorized on 2026-08-18
- Trust root / TECH-13 authority: out of scope and unchanged
- Solver acceptance thresholds: unchanged
- PCG iteration budget: unchanged
- Current production candidate: symmetric Jacobi equilibration followed by CG on the scaled SPD system

## Frozen governing case

```text
elementType: T6
levelId: L3
poissonRatio: 0.4999
distortionId: REGULAR
free system size: 2660 DOF
iterationLimit: 42560 = 16*N
public free-DOF acceptance gate: 2.102108772439442e-8
qualified internal target:        2.102108772439442e-9
```

## Root cause

The later sparse-PCG regression originally introduced unconditional exact-residual replacement while retaining stale conjugate state. Restoring the previously qualified reliable-residual semantics removed the reaction-equilibrium regression but exposed a longstanding finite-precision stagnation of the algebraically equivalent Jacobi-PCG recurrence on the near-incompressible T6/L3 case.

Arithmetic-only stabilization reduced the governing exact residual from approximately `1.97906e-8` to `4.627509042620659e-9` without altering any engineering acceptance criterion, but still missed the qualified internal target.

The production candidate therefore changes the numerical representation of the same Jacobi-preconditioned SPD problem, not its physics or tolerance: with `D = diag(A)`, solve

```text
A_hat y = b_hat
A_hat = D^(-1/2) A D^(-1/2)
b_hat = D^(-1/2) b
x = D^(-1/2) y
```

using ordinary CG. In exact arithmetic this is symmetric Jacobi preconditioning. The final and periodic convergence authority remains the exact residual in original coordinates, `b - A*x`.

## Protected invariants

- constitutive / B-bar formulation unchanged;
- stiffness and pressure-load equations unchanged;
- free-DOF acceptance tolerance unchanged;
- internal convergence target remains `freeDofResidualTolerance / 10`;
- iteration cap remains `min(50000, max(1000, 16*N))`;
- preconditioner identity remains `JACOBI`;
- matrix remains symmetric positive definite authority for CG;
- final residual is checked in original physical coordinates;
- no benchmark expected value changed;
- no mesh-quality threshold changed;
- no release or TECH-13 trust-root authority changed.

## Retained prerequisite corrections

1. restore reliable-residual recurrence semantics after the invalid unconditional residual replacement;
2. compensated scalar products;
3. compensated solution accumulation;
4. compensated recursive-residual accumulation;
5. compensated exact-residual CSR evaluation;
6. T6 mesh-quality domain correction: straight-corner minimum-angle surrogate applies only to straight-sided T3/CST_DKT_TRI3; curved T6 remains governed by high-order scaled Jacobian;
7. Lamé diagnostic reports the exact first failing L3 element/nu/distortion point.

## Rejected candidates

| Candidate | Governing observation | Disposition |
|---|---:|---|
| compensated global CSR action | residual worsened to about `2.29338e-8` | rejected/reverted |
| compensated sparse assembly | residual `2.6775524020195007e-8` | rejected/reverted |
| unconditional/full reliable restart | ν=0.3 reaction-equilibrium regression | rejected/reverted |
| compensated direction update | no numerical benefit | removed |
| compensated recurrence `Ap` | residual `7.821654435247183e-9` | rejected/reverted |
| drift-triggered PCG restart | residual `0.5968922979591298` | rejected/reverted |
| SGS-PCG | residual `3.344212018419057e-9`, still above target | rejected/reverted |
| IC(0)-PCG | negative IC(0) pivot square `-11758995.159897372` at row 722 | rejected/removed; no diagonal shift introduced |
| skyline Cholesky | reaction-equilibrium failure; persisted with qualified-style iterative refinement on ν=0.4999/MODERATE | rejected/removed |

## Symmetric-Jacobi-equilibration evidence

Diagnostic head `5cd2f22c10b2e7ccfa93710e64b714dad3be5834`:
- frozen four-level ν=0.3 Lamé diagnostic: PASS;
- full L3 sweep including ν=0.4999 regular/moderate: PASS (`firstL3SolverFailure = null`);
- no target/cap/tolerance change.

Production-wired code head before this workreport update: `9f0045b7a8a0fc0c0d036d5f771eeecd105e406f`.
At that head:
- B01 metamorphic matrix: PASS;
- B01 fail-closed matrix: PASS;
- final exact-head integrated B01: running at time of this record; do not infer PASS until the propagation step is green.

## Merge gate

Do not merge this PR from an obsolete base. After the production-wired exact-head matrix passes, reconstruct the same B01 file set on the then-current `main`, rerun exact-head B01, metamorphic, fail-closed, and relevant workbench/build checks, and merge only that current-main-qualified head.
