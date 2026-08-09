# Issue 947 — E36 Component Qualification Record

## Status

**Diagnostic qualification only. No production mechanics change is authorized by this record.**

This record applies to BM4_NL, case `L19 = W + P1`, source element E36 (`20295 -> 21430`) and the current issue-947 qualification branch.

Pinned source:

- `BM4_NL.ACCDB` SHA-256: `85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21`

The purpose of this record is to preserve accepted and falsified hypotheses so that later work does not repeat invalid diagnostics or tune production mechanics to a commercial result.

---

## 1. Geometry correction that invalidated the original tee-only audit

The original tee-20295 constitutive audit treated E36 as one straight branch span. That interpretation is invalid.

E36 carries `BEND_PTR = 7`. The production source component consists of:

1. the B31J branch centerline-to-run-surface rigid kinematic offset at node 20295;
2. a finite incoming straight from the run surface to the bend near tangent;
3. an approximately 90 degree bend with radius 228.6 mm;
4. the bend far point represented by source node 21430.

The production geometry therefore must be used before any E36 constitutive conclusion is accepted.

### Independent equilibrium check

The bend-aware E36 equilibrium audit established:

| Quantity | Value |
|---|---:|
| Branch run-surface offset | 0.08413749695 m |
| Incoming straight length | 1.64426147461 m |
| Bend arc length | 0.35908402592 m |
| Total physically loaded length | 2.00334550053 m |
| Independently calculated E36 gravity weight | 1115.23886878 N |
| CAESAR-inferred end-force resultant | 1115.23516846 N |
| Vertical force closure error | -0.00370032 N |
| Moment closure error about node 20295 | approximately -0.00177 N m |

This closes the inferred CAESAR E36 source action against independent geometry and gravity to engineering-roundoff scale for the benchmark.

**Conclusion:** the old one-straight-span tee audit is withdrawn as constitutive evidence.

Evidence:

- workflow run `31307326083`
- artifact `issue-947-e36-bend-aware-equilibrium-audit`
- artifact digest `sha256:fa468548d5abc90c77e7d8afd458bed257849cc5d3334311ed7840db5a4786c9`

---

## 2. Production-faithful static condensation audit

A new diagnostic reconstructs the actual E36 production descendant chain:

- Timoshenko pipe frame formulation;
- CAESAR pipe shear coefficient mapping `kappa = 0.5`;
- B31J branch run-surface offset;
- B31J branch in-plane rotational spring;
- one incoming straight element;
- eighteen bend-arc chord elements;
- bend flexibility and pressure stiffening;
- gravity equivalent loads;
- incoming-straight closed-end pressure strain;
- cumulative MEC-21 bend pressure free field.

All internal analysis nodes are statically condensed to the source boundary DOFs at 20295 and 21430:

```text
Kc = Kbb - Kbi Kii^-1 Kib

fg,c = fg,b - Kbi Kii^-1 fg,i
fp,c = fp,b - Kbi Kii^-1 fp,i
fB,c = fB,b - Kbi Kii^-1 fB,i

qb = Kc db - fg,c - fp,c - fB,c
```

The diagnostic is not allowed to compare CAESAR displacements until it first reproduces LFEA production E36 source actions using LFEA's own source boundary displacements.

### Production parity gate

The reconstructed descendant ledger matches production, including element IDs, topology, kind, gravity weights, pressure strain declarations and cumulative Bourdon rotation declarations.

Maximum absolute difference between condensed reconstructed E36 source action and production E36 source action:

```text
9.702034731e-9 N or N m
```

**Status: PASS.**

This establishes that the diagnostic is a faithful reduced representation of current production E36 mechanics.

Evidence:

- workflow run `31308238044`
- artifact `issue-947-e36-production-condensation-audit`
- artifact digest `sha256:48d29784d8d5e8f82244fccdb1bb534ac4da2814ecf9f4b871d56ee099c317ba`

---

## 3. CAESAR-displacement injection into the qualified E36 law

With CAESAR source `u, theta` injected into the validated condensed E36 law, the current predicted minus inferred-reference residual is:

```text
FROM:
FX  -68.4265 N
FY  -35.7722 N
FZ   -5.8371 N
MX   -3.3219 N m
MY   -3.9629 N m
MZ  +43.4489 N m

TO:
FX  +68.4265 N
FY  +35.7759 N
FZ   +5.8371 N
MX   -8.1012 N m
MY   +5.2973 N m
MZ  +82.3036 N m
```

Normalized residual L2:

```text
1.6692703659
```

Maximum normalized component:

```text
1.6202398846 at TO:MX
```

The governing normalized component is driven by a near-zero reference moment and the benchmark moment scale floor. The dimensional mismatch is approximately 8.10 N m at that DOF.

This residual is real, but it is orders of magnitude smaller than the invalid straight-E36 audit that produced tens-of-kN apparent errors.

---

## 4. Falsified hypothesis — add uniform bend chord pressure elongation to Trans+Rot

### Hypothesis

Treat CAESAR's translational Bourdon description as an additional uniform closed-end pressure axial strain integrated around the bend centerline, on top of the current MEC-21 translation-and-rotation field.

For uniform strain `epsilon_p`:

```text
delta_u_bend = integral(epsilon_p t ds)
             = epsilon_p (x_far - x_near)
```

For E36:

```text
epsilon_p = 7.3593818165e-5
```

The 90-degree near-to-far chord gives approximately:

```text
delta UX = 1.6823546159e-5 m
delta UY = 1.6823546159e-5 m
```

with no additional end rotation.

The candidate was converted to an equivalent source initial load with the already-qualified condensed stiffness:

```text
f0,candidate = Kc d_free
```

### Result

| Metric | Current full MEC-21 | + additional bend chord strain |
|---|---:|---:|
| Normalized residual L2 | 1.6693 | 4.2555 |
| Maximum normalized residual | 1.6202 | 2.9622 |
| Representative FY residual magnitude | 35.8 N | approximately 3688.5 N |

The candidate moves the signed force and moment residual strongly away from the reference.

**Decision: REJECTED / FALSIFIED.**

Do not add uniform bend chord pressure strain on top of the current translation-and-rotation MEC-21 field.

Evidence:

- workflow run `31308346834`
- artifact `issue-947-e36-bend-translation-candidate`
- artifact digest `sha256:e44c175dcf371c12a2bc4f72eb91bb1b3669ee5f5a838bedba41c1ad788ae511`

---

## 5. MEC-21 translation/rotation basis split

The current MEC-21 free field was decomposed diagnostically while all other E36 authorities were held fixed.

The variants are **not** proposed production laws. Their purpose is only to determine whether deleting either generalized-displacement component explains the CAESAR residual.

| Variant | Normalized residual L2 | Maximum normalized residual | Governing DOF |
|---|---:|---:|---|
| FULL | **1.6693** | **1.6202** | TO:MX |
| NONE | 4.4588 | 3.2220 | TO:MZ |
| ROTATION_ONLY | 12.3148 | 9.4754 | TO:FY |
| TRANSLATION_ONLY | 14.6152 | 10.2717 | TO:FY |

Translation-only and rotation-only produce large opposing generalized-load effects. The coupled full MEC-21 field is much closer to the inferred CAESAR E36 action than either isolated component or no MEC-21 field.

**Decision:** retain the full coupled MEC-21 field as the current authority. The split provides no evidence for deleting either component.

Evidence:

- workflow run `31308532635`
- artifact `issue-947-e36-mec21-split-audit`
- artifact digest `sha256:9c55a31838c8050be1bdb969102130b72e27dc1d639a61f4472c8e2f4bb64779`

---

## 6. Current engineering conclusion

The following hypotheses are now closed for E36:

- **one straight tee branch model:** falsified because it omits the real bend geometry;
- **missing gravity on a fictitious tee rigid zone as the E36 force root cause:** falsified by bend-aware weight/equilibrium closure;
- **additional uniform bend chord pressure elongation on top of current Trans+Rot MEC-21:** falsified;
- **remove MEC-21 translation:** not supported;
- **remove MEC-21 rotation:** not supported;
- **remove all MEC-21 bend pressure free movement:** not supported.

The remaining E36 residual should therefore not be used to justify an unqualified pressure-load change.

The next localization step is to re-run the failing plain-source constitutive scan using **production analysis geometry**, particularly moving source intersection nodes downstream of bends to their true FAR/tangent-end positions. Only after that corrected scan identifies the first plain element whose `K d - f_eq - f0` law itself fails should a new stiffness or component hypothesis be opened.

---

## 7. Change-control rule

No E36 production change is authorized from this record.

Any future E36 candidate must satisfy all of the following before implementation:

1. independent physical or vendor-document authority;
2. exact production geometry and source-load ownership;
3. production-parity diagnostic gate;
4. signed residual-vector explanation under CAESAR displacements;
5. canonical component benchmark or limiting case;
6. L19 whole-model comparison without tolerance changes;
7. residual/equilibrium certification;
8. deterministic replay and unrelated regressions;
9. L20 only after the L19 gate is satisfied.
