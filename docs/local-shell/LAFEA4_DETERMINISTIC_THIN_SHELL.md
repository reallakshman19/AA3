# LAFEA.4 deterministic 2.5D thin-shell kernel

## Authority and contracts

This package implements Issue #157 as a framework-independent, small-model, linear thin-shell kernel.

```text
local-shell-model/v1
local-shell-result/v1
CST_DKT_TRI3_THIN_SHELL_V1
LINEAR_2_5D_THIN_SHELL_CST_DKT_ONLY
```

Each node has five active DOFs in canonical order: `UX`, `UY`, `UZ`, `R1`, `R2`. `R1` and `R2` are infinitesimal rotations about the explicitly declared nodal tangent bases. There is no drilling DOF, drilling penalty, transverse-shear stiffness, shear-correction factor, or thick-shell claim.

Canonical units are mm, N, N*mm, MPa, radian, strain, and inverse-mm curvature. Contracts are closed and exact-key validated. The boundary rejects non-finite or coerced values, symbols, functions, cycles, accessors, non-enumerable properties, sparse arrays, custom arrays, and non-plain objects. Canonical models and results are caller-isolated, deeply immutable, code-unit ordered, negative-zero normalized, JSON-safe, and protected by reconstructable semantic hashes.

## Nodal bases and facet frames

Every node declares a director and two rotation bases satisfying:

```text
|d| = |b1| = |b2| = 1
b1 dot d = b2 dot d = b1 dot b2 = 0
b1 cross b2 = d
```

These relations are qualified without silently normalizing, flipping, or orthogonalizing caller evidence.

Triangles are normalized to a deterministic counter-clockwise cyclic order. For canonical nodes 1 through 3:

```text
ex = normalize(x2-x1)
ez = normalize((x2-x1) cross (x3-x1))
ey = ez cross ex
```

The kernel retains the canonical frame, area, director alignment, local coordinates, transformation, and qualification residuals. Degenerate, near-zero-area, duplicate, unresolved, disconnected, or director-incoherent facets fail closed.

## CST membrane formulation

Engineering membrane strain and stress use:

```text
epsilon0 = [epsilonX, epsilonY, gammaXY]^T
sigma0   = [sigmaX, sigmaY, tauXY]^T
```

For isotropic plane stress:

```text
Dm = E/(1-nu^2) * [[1,nu,0],[nu,1,0],[0,0,(1-nu)/2]]
Km = area * Bm^T * (t Dm) * Bm
```

`Bm` is the exact constant-strain triangle matrix. Membrane stiffness scales with `E` and `t`.

## Classic DKT bending formulation

The bending identity is `DKT_CLASSIC_TRI3_V1`. Local bending DOFs are `[w, thetaX, thetaY]` at each vertex. Vertex rotations are augmented by edge-midpoint rotations derived from the Kirchhoff edge constraint. The six-node quadratic rotation interpolation is differentiated to form:

```text
kappa = [kappaX, kappaY, kappaXY]^T = Bb qb
```

The fixed three-point degree-two barycentric rule is:

```text
(2/3,1/6,1/6), weight 1/3
(1/6,2/3,1/6), weight 1/3
(1/6,1/6,2/3), weight 1/3
```

At each point:

```text
Db = t^3/12 * Dm
Kb += area * weight * Bb^T * Db * Bb
```

There is no integration switch, reduced integration, transverse-shear term, or post-hoc stiffness symmetrization. Bending stiffness scales with `E t^3`. Rigid transverse translation and infinitesimal rigid shell rotation qualify to zero strain, curvature, and energy.

## Five-DOF transformation

Translations are projected onto the element frame. Nodal tangent rotations are mapped into the two element tangent rotations using a deterministic rigid-motion-preserving least-squares map. Evidence includes the tangent sampling matrix, Gram eigenvalues, rank threshold, pseudoinverse, rotation mapping, complete transformation, and rigid-reproduction residual.

```text
Ke = T^T (Km direct-sum Kb) T
```

## Loads and solution

Each explicit load case lists nodal global forces, nodal tangent moments, and uniform element-normal pressures. For pressure:

```text
Fi = Fj = Fk = pressure * area * signedNormal / 3
```

Thickness does not multiply pressure force. Pressure sense is explicit and no pipe end-cap load is inferred.

Global DOFs are ordered by node ID in code-unit order and then `UX`, `UY`, `UZ`, `R1`, `R2`. Prescribed values use exact matrix partitioning, never penalty stiffness. A deterministic dense Cholesky factorization is executed only when free DOFs exist. Singular, indefinite, under-constrained, residual-failing, and energy-failing cases are rejected.

Reactions use `R = Kq - F`. Accepted evidence includes free and constrained DOF identities, pivots and pivot ratios, free residuals, force equilibrium, moment equilibrium about the global origin, element energy, global energy, and work including prescribed-DOF reactions.

## Stress recovery

At every fixed DKT integration point:

```text
epsilon(z) = epsilon0 + z kappa
sigma(z)   = Dm epsilon(z)
```

Recovery surfaces are exactly:

```text
BOTTOM:     z = -t/2
MIDSURFACE: z = 0
TOP:        z = +t/2
```

Membrane, bending, and combined strain and stress remain separate. Principal stresses, maximum in-plane shear, and plane-stress three-dimensional von Mises are reconstructed from the same element, load case, integration point, and surface. The kernel emits no nodal, averaged, smoothed, extrapolated, or contour-authority stress and no transverse-normal or transverse-shear stress claim.

## Result frame convention

Element membrane strain, curvature, membrane stress, and recovered combined stress are reported in that element's retained local `ex`/`ey` frame from `meshEvidence.elements[*].localFrame`; they are not global-X/global-Y tensor components. This applies independently to every facet, so two elements representing one uniform global field can legitimately report different component triples when their local frames are rotated relative to one another.

A global analytical oracle must therefore be transformed into each element frame before component-wise comparison. Engineering strain and curvature triples use the engineering-shear/twist convention `[epsilonX, epsilonY, gammaXY]` / `[kappaX, kappaY, kappaXY]`; stress triples use `[sigmaX, sigmaY, tauXY]`. Directional global quantities such as hoop or axial stress/strain must likewise be projected through the retained local frame before comparison. Frame-invariant scalars such as in-plane principal values and von Mises may be compared without rotating the scalar itself.

Qualification scripts must treat `meshEvidence.elements[*].localFrame` as the frame authority. A component-wise comparison between an element-local result and an unrotated global closed-form tensor is an invalid oracle except for the special case where the element frame is aligned with the global frame.

## Qualification and certification

Independent scale-aware rules govern basis quality, area, director alignment, constitutive and stiffness symmetry, rigid motion, transformation rank, Cholesky pivots, free residuals, force and moment equilibrium, energy, membrane patches, and bending patches.

```bash
npm run check:lafea-core
```

That aggregate covers contracts, containment, immutability, hashes, geometry, bases, CST fields, DKT curvature, transformation, assembly, solver, nodal forces and moments, pressure, recovery, energy, repeated-byte identity, permutation invariance, negative-zero elimination, source hygiene, cylindrical rigid motion, angular-refinement convergence, open-strip bending symmetry, and exact represented-area pressure-resultant reconstruction across LAFEA.1 through LAFEA.5. It is paired in CI (`.github/workflows/lafea4-shell-pr-validation.yml`) with `npm run check:lafea-solver`, `npm run check:imports`, and `npm run build`; run all four locally before treating a LAFEA.4 change as release-qualified.

Cylindrical equilibrium checks are exact for represented faceted area. Cylinder membrane stress is reported only as deterministic angular-refinement convergence evidence; no coarse-mesh exact cylinder-stress claim is made.
