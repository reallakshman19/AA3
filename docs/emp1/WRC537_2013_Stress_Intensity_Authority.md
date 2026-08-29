# WRC 537 2013 — Stress-Intensity Reconstruction Authority

## Status

`BLOCKED_PARTIAL_PRIMARY_STRESS_INTENSITY_DEFINITION_AND_MAXIMUM_SHEAR_THEORY_QUALIFIED_EXPLICIT_PLANE_STRESS_RECONSTRUCTION_UNQUALIFIED`

This source-governance leg does **not** change the cylindrical Table-5 production implementation. It strengthens only two WRC source statements that are directly visible in a readable rendering of the WRC text:

1. General Nomenclature defines `S` as **stress intensity = twice maximum shear stress**.
2. The cylindrical-shell Table-5 discussion states that **Maximum Shear Theory** is used to determine equivalent stress intensities.

These statements strengthen the meaning of `S`; they do not, by themselves, source-qualify every implementation step inside `planeStressTresca()`.

## Source custody

Controlled WRC identity remains:

```text
Document: WRC Bulletin 537, 2013
raw PDF SHA-256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
Git blob SHA-1  = ce861233928154145a9257efbbf8dbef3f5a17d1
```

Direct rendering of that pinned PDF remains unavailable through the connected GitHub binary transport:

`currentTurnDirectPdfObservationState = NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

A readable external rendering of the WRC primary text was observed at:

`https://studylib.net/doc/27776645/wrc-537`

Custody classification:

`PRIMARY_TEXT_OBSERVED_EXTERNAL_RENDERING_BYTE_IDENTITY_TO_PINNED_PDF_UNPROVEN`

Therefore the text itself is observed, but byte identity between that external rendering and the controlled pinned PDF is **UNPROVEN**. This leg does not upgrade that custody fact.

## Newly qualified primary-text statements

### 1. General Nomenclature

Source locator:

```text
WRC 537
1 NOMENCLATURE
1.1 General Nomenclature
symbol: S
```

Observed definition: `S` is stress intensity equal to twice maximum shear stress.

Qualified claim:

`explicitStressIntensityEqualsTwiceMaximumShearDefinitionQualified = true`

### 2. Cylindrical Table-5 discussion

Source locator:

```text
WRC 537 cylindrical-shell discussion
after the sign-convention / Table-5 setup
immediately before 4.2 Parameters
```

The text states that Maximum Shear Theory is used to determine equivalent stress intensities.

Qualified claim:

`maximumShearTheoryEquivalentStressIntensityQualified = true`

## Previously qualified retained Table-5 order

The retained Table-5 transcription remains:

`docs/emp1/WRC537_2013_Tables_and_Charts.md`

Source locator:

```text
Document: WRC 537
Edition: 2013
Table: Table 5 — Computation Sheet for Local Stresses in Cylindrical Shells
Pages: 41–42
```

It supports this bounded calculation order:

```text
load-family stress contributions
  -> algebraic component stress totals
  -> Combined Stress Intensity S from sigma_phi, sigma_x and tau
```

The retained Table-5 text includes algebraic shear summation and separate combined-stress-intensity cases for like-sign normal stresses, unlike-sign normal stresses, and zero shear.

## What remains unqualified

The new primary-text statements do **not** establish all details of the current product reconstruction. The following remain source-gated:

- an explicit WRC statement that the shell stress state is plane stress for this reconstruction;
- an explicit WRC instruction that the third principal stress is `sigma3 = 0`;
- exact WRC principal-stress equations matching the product implementation;
- an explicit WRC maximum-principal-stress-difference equation for this exact shell state, even though `2 * tau_max` and maximum principal difference are mathematically equivalent;
- whether von Mises is prohibited, permitted, or offered as an alternative;
- exact physical inside/outside surface timing and common physical point identity;
- whether the maximum over Au/Al/Bu/Bl/Cu/Cl/Du/Dl is a WRC-defined envelope rather than product post-processing;
- any code-acceptance implication.

Mathematical equivalence is not a substitute for direct source wording.

## Current implementation remains unchanged

At each retained shell-juncture recovery point, production forms:

- circumferential normal stress `sigma_phi`;
- longitudinal normal stress `sigma_x`;
- shell shear stress `tau`.

It then evaluates `planeStressTresca()` with two in-plane principal stresses, `sigma3 = 0`, and the maximum absolute principal-stress difference. That remains implementation behavior, not newly created source authority.

The product envelope remains expressly limited to the maximum over the eight evaluated Table-5 points. It is **not** promoted to a global absolute shell maximum.

## Independent mathematical checks

These checks validate arithmetic only; they are not source-custody evidence.

For `(sigmaPhi, sigmaX, tau) = (100, 40, 30) MPa`:

```text
d  = sqrt((100 - 40)^2 + 4(30)^2)
   = 84.85281374 MPa
p1 = 112.42640687 MPa
p2 = 27.57359313 MPa
p3 = 0 MPa
S  = max(|p1-p2|, |p2-p3|, |p3-p1|)
   = 112.42640687 MPa
```

For pure shear `(0, 0, 25) MPa`, the mathematical principal stresses are `+25`, `-25`, and `0 MPa`, giving `S = 50 MPa = 2 * tau_max`. This agrees with the WRC definition but does not prove the product-specific `sigma3 = 0` assumption as a primary-source instruction.

## Authority separation

Keep these planes separate:

1. mathematical correctness of current Tresca reconstruction;
2. primary WRC definition of `S` and Maximum Shear Theory selection;
3. retained Table-5 source order for combined-stress-intensity post-processing;
4. explicit plane-stress / principal-equation source authority;
5. downstream code acceptance and release authority.

Frozen rule:

`PRIMARY_STRESS_INTENSITY_DEFINITION_DOES_NOT_ESTABLISH_EXPLICIT_PLANE_STRESS_PRINCIPAL_EQUATIONS_OR_CODE_ACCEPTANCE`

## Interaction with #1385

The physical `u/l`, A/B/C/D, surface and common-point semantics remain separately governed by #1385. This #1383 increment does not close those physical-location questions.

## Prohibited shortcuts

Do not:

- replace Tresca with von Mises;
- edit `planeStressTresca()` merely because the WRC definition is consistent with the current arithmetic;
- infer explicit `sigma3 = 0` or product principal-stress equations from the phrase `twice maximum shear stress`;
- promote mathematical equivalence into an unobserved primary-source equation;
- take absolute values/envelopes before source-authorized algebraic component formation;
- relabel the eight-point envelope as the global shell maximum;
- treat stress intensity as code compliance.

## Fail-closed state

```text
fullPrimaryStressIntensityReconstructionAuthority = false
explicitPlaneStressSourceAuthority                = false
vonMisesAlternativeAuthority                      = false
globalMaximumAuthority                            = false
codeComplianceAuthority                           = false
releaseAuthority                                  = false
```

No production stress equation, route registry, WRC coefficient data, gamma/beta domain, pressure mechanics, SCF logic, UI, workflow, tolerance, oracle, evidence or release behavior is changed.
