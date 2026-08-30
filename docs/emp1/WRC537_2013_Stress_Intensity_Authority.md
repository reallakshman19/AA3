# WRC 537 2013 — Stress-Intensity Reconstruction Authority

## Status

`BLOCKED_PARTIAL_PRIMARY_STRESS_INTENSITY_DEFINITION_AND_MAXIMUM_SHEAR_THEORY_QUALIFIED_PLANE_STRESS_AND_PRINCIPAL_RECONSTRUCTION_UNQUALIFIED`

The current cylindrical Table-5 implementation remains unchanged. This source-governance increment strengthens only the WRC meaning of stress intensity and the theory used to form equivalent stress intensities; it does **not** convert the product's particular plane-stress reconstruction into newly qualified primary-source authority.

## Primary-text increment

Controlled repository source identity remains:

```text
Document: WRC 537, 2013
raw PDF SHA-256: 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
Git blob SHA-1:  ce861233928154145a9257efbbf8dbef3f5a17d1
```

The connected environment still cannot render the pinned repository PDF directly. Therefore:

```text
pinned PDF direct-page observation = NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
```

A readable external rendering of the WRC primary text was observed. Its byte identity to the pinned repository PDF is **UNPROVEN**, so the observation is recorded as primary-text evidence with separate byte custody rather than as a direct observation of the pinned bytes.

Observed locators and bounded claims:

1. **General Nomenclature §1.1, p.1** — `S` is defined as "stress intensity = twice maximum shear stress".
2. **Cylindrical-shell §4.1 / Table-5 setup, pp.11–12** — the procedure states that **Maximum Shear Theory** is used to determine equivalent stress intensities.
3. **Cylindrical torsional pure-shear discussion, §4.3.4** — when only shear is present, equivalent stress intensity is twice the calculated shear stress.

These observations source-qualify the bounded proposition:

```text
WRC stress intensity S
  = twice maximum shear stress
and
WRC equivalent stress intensity in the cylindrical procedure
  uses Maximum Shear Theory
```

They do not, by themselves, source-qualify the implementation-specific assumption `sigma3 = 0` or the exact product principal-stress algorithm.

## Retained Table-5 combined-stress-intensity post-processing

Retained source transcription:

`docs/emp1/WRC537_2013_Tables_and_Charts.md`

Source locator:

```text
Document: WRC 537
Edition: 2013
Table: Table 5 — Computation Sheet for Local Stresses in Cylindrical Shells
Pages: 41–42
```

The retained Table-5 text forms the combined stress intensity only after algebraic formation of the circumferential normal stress, longitudinal normal stress and shear stress (`sigma_phi`, `sigma_x`, `tau`). It retains separate cases for like-sign normal stresses, unlike-sign normal stresses and zero shear.

The bounded source sequence is therefore:

```text
load-family stress contributions
  -> algebraic component stress totals
  -> Combined Stress Intensity S from sigma_phi, sigma_x and tau
```

Table 5 presents `S` as post-processing from the formed stress components rather than an independent directly tabulated input quantity.

## What remains unqualified

The new primary-text observations do **not** establish every semantic detail embodied in `planeStressTresca()`.

The following remain primary-source gated:

- an explicit WRC statement that the general cylindrical Table-5 combined-stress state is plane stress;
- an explicit WRC instruction to use `sigma3 = 0` for that reconstruction;
- verbatim WRC principal-stress equations matching the product implementation;
- exact physical inside/outside surface timing and common physical point identity;
- whether von Mises is prohibited, permitted or offered as an alternative;
- whether the product maximum over Au/Al/Bu/Bl/Cu/Cl/Du/Dl is a WRC-defined envelope;
- any code-acceptance implication.

General Maximum Shear Theory authority must not be promoted into an unobserved product-specific `sigma3 = 0` statement.

## Current implementation remains unchanged

At each retained shell-juncture recovery point, production currently has:

- circumferential normal stress `sigma_phi`;
- longitudinal normal stress `sigma_x`;
- shell shear stress `tau`.

It then evaluates `planeStressTresca()` using two in-plane principal stresses, `sigma3 = 0`, and the maximum principal-stress difference. This source leg does not modify that mathematics.

The current product envelope remains explicitly limited to the maximum over the eight evaluated Table-5 points and is **not** a global absolute shell maximum.

## Authority separation

Keep four authority planes separate:

1. mathematical reproducibility of current plane-stress Tresca code;
2. primary WRC authority that `S` means twice maximum shear and that Maximum Shear Theory is used for equivalent stress intensity;
3. explicit WRC authority for the exact plane-stress/principal-stress implementation details;
4. downstream code acceptance and professional release.

Frozen rule for this bounded increment:

`PRIMARY_MAXIMUM_SHEAR_DEFINITION_DOES_NOT_ESTABLISH_EXPLICIT_PLANE_STRESS_OR_CODE_ACCEPTANCE`

## Interaction with #1385

The retained Table-5 sign/reversal subset does not yet close physical `u/l`, A/B/C/D and common-point semantics. That unresolved physical-location boundary also prevents this source leg from claiming complete physical-surface timing for stress-intensity reconstruction.

## Prohibited shortcuts

Until the remaining source gates close, do not:

- replace Tresca with von Mises;
- edit `planeStressTresca()` merely because WRC's maximum-shear definition is now source-qualified;
- infer `sigma3 = 0` as an explicit WRC Table-5 source rule without direct proof;
- take absolute values/envelopes before algebraic component formation unless source-authorized;
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

No production stress equation, route registry, WRC coefficient data, gamma/beta domain, pressure mechanics, SCF logic, UI, workflow, tolerance, oracle or release behavior is changed.
