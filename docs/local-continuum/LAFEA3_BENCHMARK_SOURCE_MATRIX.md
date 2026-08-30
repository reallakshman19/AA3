# LAFEA.3 benchmark source qualification matrix

Status: **claim-level source custody for Issue #1535**  
Scope: LAFEA.3 internal continuum benchmark oracles only.  
Authority boundary: this document records external engineering provenance; it does **not** change production equations, benchmark expected values, tolerances, release authority, or code-assessment authority.

## Custody rule

Each benchmark below separates:

1. the **external engineering claim** that is independently published;
2. the **repository adaptation/BVP** actually executed;
3. the independently reconstructable expected quantity used by the check;
4. any difference between the published source problem and the repository fixture.

A source is not treated as an exact benchmark match when geometry, material, formulation, loading, or numerical values differ.

## Qualified claims

| Claim ID | Repository benchmark | External source and exact locator | Qualified external claim | Repository adaptation / independent reconstruction | Disposition |
|---|---|---|---|---|---|
| `LAFEA3-SRC-PATCH-01` | `scripts/lafea.3-benchmark-cont-patch-01-check.mjs` | R. H. MacNeal & R. L. Harder, “A proposed standard set of problems to test finite element accuracy,” *Finite Elements in Analysis and Design*, Vol. 1, No. 1, 1985, pp. 3–20, DOI `10.1016/0168-874X(85)90003-4`; plate patch test **Fig. 2, p. 6**; membrane displacement field and theoretical constant strain/stress solution **Table 2(a), p. 10**. | A conforming membrane element patch subjected to an affine displacement field must reproduce the corresponding constant strain/stress state; distorted/internal nodes are part of a genuine patch-test exercise. | The repository uses a different, deliberately simple two-Q8 100×100 mm patch. Its expected values are independently reconstructed from `ux=epsX*x`, `uy=epsY*y` and the plane-stress constitutive matrix; MacNeal–Harder is mechanism/method authority, **not an identical numerical fixture**. | `QUALIFIED_METHOD_SOURCE / ADAPTED_BVP` |
| `LAFEA3-SRC-KIRSCH-01` | `scripts/lafea.3-benchmark-cont-hole-01-check.mjs` | R. E. Goodman, *Introduction to Rock Mechanics*, 2nd ed., Wiley, 1989, Chapter 7 §7.2 “Openings in Competent Rock,” **pp. 228–229, Eqs. (7.1a–c)** (Kirsch stresses around a circular opening). Original source also retained: G. Kirsch, “Die Theorie der Elastizität und die Bedürfnisse der Festigkeitslehre,” *Zeitschrift des Vereines deutscher Ingenieure*, Vol. 42, 1898, pp. 797–807. | The Kirsch elastic field contains radial, hoop and shear terms proportional to `a²/r²` and `a⁴/r⁴`; for remote uniaxial tension the hole-edge hoop stress at `r=a, theta=90°` is `3*S`. | For `a=10 mm`, `R=100 mm`, `S=50 MPa`, the repository applies the **exact Kirsch traction on the finite truncation boundary**, not a uniform 50 MPa radial traction. Independent checks: `sigma_theta(a,90°)=150 MPa`; at `R=100 mm`, `sigma_rr(0°)=48.7575 MPa`, `sigma_rtheta(0°)=0`, `sigma_rr(90°)=0.7425 MPa`, `sigma_rtheta(90°)=0`. | `QUALIFIED_EQUATION_SOURCE / EXACT_ANALYTICAL_ORACLE` |
| `LAFEA3-SRC-LAME-01` | `scripts/lafea.3-benchmark-cont-cyl-01-check.mjs` | K. L. Richards, *Design Engineer's Handbook*, 1st ed., CRC Press, 2012, Chapter 6 “Thick Cylinders,” **p. 157, Eqs. (6.3)–(6.4)** (`sigma_r=a+b/r²`, `sigma_c=a-b/r²` under that source's sign/constant convention), and **§6.3, p. 158** for the internally pressurized-cylinder boundary conditions. Independent FE-family cross-reference: MacNeal & Harder (1985), **Fig. 10, p. 10**, thick-walled-cylinder benchmark. | Elastic thick-cylinder radial and hoop stresses have the Lamé `constant ± constant/r²` form, with the constants fixed by radial-pressure boundary conditions. | Repository sign convention is tension-positive and writes `sigma_r=A-B/r²`, `sigma_theta=A+B/r²`. Repository BVP: `Ri=50 mm`, `Ro=100 mm`, `Pi=10 MPa`, `Po=0`. Independent constants: `A=Pi*Ri²/(Ro²-Ri²)=10/3 MPa`; `B=Pi*Ri²*Ro²/(Ro²-Ri²)=33333.333333 MPa·mm²`. Therefore `sigma_r(Ri)=-10 MPa`, `sigma_r(Ro)=0`, `sigma_theta(Ri)=16.6666667 MPa`, `sigma_theta(Ro)=6.6666667 MPa`. MacNeal–Harder Fig. 10 is a separate FE benchmark family reference with different radii/material/formulation, not the exact fixture. | `QUALIFIED_CLASSICAL_ORACLE / ADAPTED_FE_BENCHMARK_FAMILY` |

## Numerical reconstructions retained by custody

### Patch constitutive oracle

Repository values:

```text
epsX = 0.001
epsY = -0.0003
E = 200000 MPa
nu = 0.3
plane stress
```

With

```text
D11 = E/(1-nu^2)
sigmaX = D11*(epsX + nu*epsY)
sigmaY = D11*(epsY + nu*epsX)
tauXY = 0
```

the expected stress is derived independently from the imposed affine field. No production result is used as its own oracle.

### Kirsch finite-boundary oracle

For `a/R=0.1` and `S=50 MPa`:

```text
sigma_rr(R,theta) = 25*(1-0.01)
                  + 25*(1-4*0.01+3*0.0001)*cos(2*theta)

sigma_rtheta(R,theta) = -25*(1+2*0.01-3*0.0001)*sin(2*theta)
```

Thus the finite circular boundary retains angle-dependent normal/shear traction. Replacing it with a uniform far-field traction changes the finite BVP and is not an equivalent benchmark.

At the hole edge:

```text
sigma_theta(a,90deg) = 3*S = 150 MPa
Kt = 3
```

### Lamé cylinder oracle

For internal pressure only, in the repository's tension-positive convention:

```text
A = Pi*Ri^2/(Ro^2-Ri^2)
B = Pi*Ri^2*Ro^2/(Ro^2-Ri^2)
sigma_r(r) = A - B/r^2
sigma_theta(r) = A + B/r^2
```

The benchmark compares the full Q8 Gauss-point field after Cartesian-to-polar stress transformation; the published analytical form and boundary conditions, not the FE output, own the expected field.

## Explicit non-equivalences

- MacNeal–Harder Fig. 2/Table 2 does **not** have the same dimensions/material/strain amplitudes as `CONT-PATCH-01`; it qualifies the patch-test mechanism and affine-field expectation.
- MacNeal–Harder Fig. 10 is plane strain with a nearly incompressible material and radii 3/9 under unit pressure; `CONT-CYL-01` is a different quarter-annulus fixture. The exact repository oracle is the classical Lamé field above.
- Richards uses a compressive-positive radial/circumferential convention in the derivation; the repository uses tension-positive stress and maps the constants/signs explicitly. The physical radial boundary conditions remain `sigma_r(Ri)=-Pi`, `sigma_r(Ro)=0` for internal pressure only.
- Kirsch’s infinite-plate solution is reproduced on the repository’s truncated `R=10a` domain by applying the exact analytical traction at that boundary. A uniform 50 MPa traction on that circular truncation is a different finite BVP.
- None of these sources grants application-template release, code compliance, or production authorization.

## Repository custody

| Benchmark | Oracle owner | Production output may modify oracle? |
|---|---|---|
| `CONT-PATCH-01` | affine kinematics + linear-elastic plane-stress constitutive relation; MacNeal–Harder patch-test provenance | **NO** |
| `CONT-HOLE-01` | Kirsch analytical equations | **NO** |
| `CONT-CYL-01` | Lamé analytical equations | **NO** |

Any future change to one of these benchmark equations, expected values, source locators, or tolerances is an **oracle/source-governance change**, not an ordinary implementation refactor, and requires a separately justified qualification boundary.
