# LAFEA local-attachment correlation foundation

Status: software-formulation qualification only. No licensed engineering correlation dataset is registered by this change.

## 1. Authority boundary

The correlation core is deliberately separate from the existing LAFEA.1 and LAFEA.2 numerical kernels.

- LAFEA.1 remains the exact load-transfer and elastic thick-cylinder pressure foundation.
- LAFEA.2 remains nominal annular pipe-section screening.
- `src/core/local-attachment-correlation/` consumes retained LAFEA.2 resultants and pressure evidence through an explicit bridge.
- The default engineering correlation registry is empty.
- Synthetic coefficient data has `engineeringUseAuthorized = false` and cannot be promoted into the engineering registry.
- Extrapolation outside the declared coefficient domain is forbidden.

A future engineering method must provide exact method identity, edition, coefficient dataset identity/hash, applicability profile, source reference, source edition, extraction method, license authority and uncertainty terms.

## 2. Source custody

The engineering chain is:

```text
LAFEA.1 source
    -> LAFEA.1 canonical model hash
    -> LAFEA.1 accepted result-payload hash
    -> LAFEA.2 validated source evidence
    -> LAFEA.2 request hash
    -> LAFEA.2 retained result hash
    -> correlation geometry evidence hash
    -> correlation request
    -> coefficient interpolation
    -> component-wise local stress recovery
```

Correlation geometry is created only from an exact validated LAFEA.2 request/result pair. The supplied LAFEA.2 request must reconstruct, its semantic hash must equal the retained LAFEA.2 result's `screeningRequestSemanticHash`, and the hash of its `sourceEvidence` must equal the result's `sourceEvidenceSemanticHash`.

The geometry evidence retains:

- LAFEA.2 source-evidence semantic hash;
- exact LAFEA.1 canonical foundation-model semantic hash;
- exact LAFEA.1 foundation result-payload semantic hash;
- pipe outside diameter and assessed pipe thickness inherited from LAFEA.2 section evidence;
- source references for pipe outside diameter and assessed pipe thickness;
- separately supplied attachment diameter and its source reference;
- its own semantic hash over all of the above.

The correlation request then retains:

- LAFEA.2 screening request semantic hash;
- LAFEA.2 screening result payload semantic hash;
- correlation geometry evidence semantic hash;
- exact `screeningCaseId`;
- exact target-to-`evaluationLocationId` mapping.

This means a numerically identical but differently sourced attachment diameter, LAFEA.1 model, LAFEA.1 result, LAFEA.2 request, or LAFEA.2 result does not silently inherit the previous correlation lineage.

## 3. Dimensionless parameters

The current generic two-axis core evaluates:

```text
x = d / D

y = D / t
```

where:

- `D` = pipe outside diameter;
- `t` = assessed pipe thickness inherited through LAFEA.1/LAFEA.2 custody;
- `d` = attachment diameter from separately source-bound geometry evidence.

The method profile owns the qualified knot ranges. The evaluator does not extrapolate beyond them.

## 4. Load normalization

For force responses:

```text
sigma_basis = F / (D t)
```

For moment responses:

```text
sigma_basis = M / (D^2 t)
```

A method response has an explicit:

- target identity;
- stress component;
- stress class;
- load component;
- load basis;
- coefficient grid.

The contribution is:

```text
stress_contribution = C(x, y) * sigma_basis
```

There is no anonymous global SCF multiplier.

## 5. Bilinear interpolation

For a point inside the four surrounding knots:

```text
wx = (x - x1) / (x2 - x1)
wy = (y - y1) / (y2 - y1)

q_low  = q11 + wx (q21 - q11)
q_high = q12 + wx (q22 - q12)

C = q_low + wy (q_high - q_low)
```

The result retains both axis brackets, exact knots, interpolation weights, four corner coefficients, two intermediate values and final coefficient.

If either parameter is outside the profile domain, the result state is `OUTSIDE_DOMAIN` and no target stress result is produced.

## 6. Stress classes and pressure superposition

Each target stress component retains separate:

```text
membrane
bending
shear
pressure
mechanicalSurface = membrane + bending + shear
totalSurface      = mechanicalSurface + pressure
```

Surface-specific signs belong to the response coefficient dataset. The evaluator does not apply an additional generic `+/- bending` convention after interpolation.

The currently retained tensor is:

```text
[ sigma_x      tau_x_theta   0       ]
[ tau_x_theta  sigma_theta   0       ]
[ 0            0             sigma_r ]
```

Principal stresses are the two eigenvalues of the x-theta block plus `sigma_r`, sorted descending.

Von Mises is:

```text
sqrt(
  0.5 * [
    (sigma_x - sigma_theta)^2
    + (sigma_theta - sigma_r)^2
    + (sigma_r - sigma_x)^2
  ]
  + 3 * tau_x_theta^2
)
```

## 7. Synthetic hand benchmark

The qualification fixture uses:

```text
D = 300 mm
t = 10 mm
d = 75 mm

d/D = 0.25
D/t = 30
```

Loads:

```text
Fx = 90,000 N
Fy = 30,000 N
Fz = 60,000 N
Mx = 1,800,000 N.mm
My = 9,000,000 N.mm
Mz = 2,700,000 N.mm
```

Normalized stresses:

```text
Fx/(Dt)      = 30 MPa
Fy/(Dt)      = 10 MPa
Fz/(Dt)      = 20 MPa
Mx/(D^2 t)   = 2 MPa
My/(D^2 t)   = 10 MPa
Mz/(D^2 t)   = 3 MPa
```

At the midpoint of the synthetic 2x2 grids the coefficients are:

```text
Fx -> sigma_x membrane      C = 1.5
Fy -> sigma_theta membrane  C = 2.0
Fz -> sigma_x membrane      C = -0.5
Mx -> tau_x_theta shear     C = 1.0
My -> sigma_x bending       C = 5.0
Mz -> sigma_theta bending   C = 3.0
```

Therefore mechanical contributions are:

```text
sigma_x membrane = 1.5(30) - 0.5(20) = 35 MPa
sigma_x bending  = 5(10)              = 50 MPa
sigma_theta membrane = 2(10)          = 20 MPa
sigma_theta bending  = 3(3)           = 9 MPa
tau_x_theta shear    = 1(2)           = 2 MPa
```

The end-to-end fixture chooses exact LAFEA.1 closed-end pressure such that the outer-surface pressure stresses are:

```text
sigma_x pressure     = 15 MPa
sigma_theta pressure = 30 MPa
sigma_r pressure     = 0 MPa
```

For `ro = 150 mm`, `ri = 140 mm`, the required internal pressure is:

```text
p = 15 (ro^2 - ri^2) / ri^2
  = 2.2193877551020407 MPa
```

Total target stress is therefore:

```text
sigma_x      = 35 + 50 + 15 = 100 MPa
sigma_theta  = 20 + 9  + 30 = 59 MPa
sigma_r      = 0 MPa
tau_x_theta  = 2 MPa
```

Principal stresses:

```text
sigma_1 = 100.09732992404598 MPa
sigma_2 = 58.90267007595402 MPa
sigma_3 = 0 MPa
```

Von Mises:

```text
sigma_vm = 87.13782186857783 MPa
```

The arithmetic qualification tolerance is `1e-10 MPa` in the hand-check script. This is a software-reconstruction tolerance, not an engineering accuracy claim for a future empirical method.

## 8. Negative qualification cases

The retained scripts also require:

- exact-knot evaluation;
- six independent load-component tests;
- out-of-domain `d/D` rejection;
- out-of-domain `D/t` rejection;
- missing target pressure rejection;
- coefficient-dataset hash tamper rejection;
- geometry-evidence hash tamper rejection;
- mismatched/forged LAFEA.2 request rejection before geometry adoption;
- mismatch between LAFEA.2 request source evidence and retained LAFEA.2 result rejection;
- missing LAFEA.2 point identity rejection;
- current repository LAFEA.2 sample (`D/t = 100`) rejection against the synthetic `20 <= D/t <= 40` domain;
- synthetic profile rejection by the engineering method registry.

## 9. Required next step for a real engineering method

Do not change the evaluator to make a real benchmark pass. Add a separate method profile/dataset only after the exact source and edition are selected and the coefficient data is legally available for implementation.

The production dataset must define every response coefficient by target, stress component, stress class and load component, together with the applicable dimensionless axes and uncertainty information. It must then pass the same exact-knot, interpolation, boundary, sign-reversal, load-isolation, pressure-superposition, source-custody and independent hand-calculation gates before it can be registered for engineering use.
