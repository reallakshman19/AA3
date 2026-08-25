# WRC 537 2013 — Stress-Intensity Reconstruction Authority

## Status

`BLOCKED_PARTIAL_TABLE5_STRESS_INTENSITY_FORMULA_AUTHORITY_PLANE_STRESS_SEMANTICS_UNQUALIFIED`

The current cylindrical Table-5 implementation computes a mathematically standard plane-stress Tresca quantity from recovered shell stresses. This reconciliation does **not** change that implementation. It recognizes a narrower source fact that is already retained in the repository: WRC Table 5 pp.41–42 contains a **Combined Stress Intensity** post-processing section after algebraic formation of the component stresses.

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

Within that retained Table-5 text, the calculation sequence includes algebraic summation of the normal/shear stress contributions followed by a `COMBINED STRESS INTENSITY` section. The combined formulas operate on the resulting circumferential normal stress, longitudinal normal stress and shear stress (`sigma_phi`, `sigma_x`, `tau`) and retain separate cases for:

- normal stresses with like signs;
- normal stresses with unlike signs;
- zero shear.

This supports the bounded source-order statement:

```text
load-family stress contributions
  -> algebraic component stress totals
  -> Combined Stress Intensity S from sigma_phi, sigma_x and tau
```

It also supports the conclusion that Table 5 presents `S` as post-processing from the formed stress components rather than as an independent directly tabulated input quantity.

## What this does not prove

The retained Table-5 formula text does **not**, by itself, establish every source statement embodied in the current `planeStressTresca()` implementation. The following remain primary-source gated:

- an explicit WRC statement that the stress state is plane stress;
- an explicit WRC statement that the third principal stress is zero;
- exact WRC principal-stress equations;
- the exact primary-source definition `S = twice maximum shear stress / maximum principal-stress difference` unless separately provenance-qualified;
- whether von Mises is prohibited, permitted or discussed as an alternative;
- exact physical inside/outside surface timing and common physical point identity;
- whether the maximum over Au/Al/Bu/Bl/Cu/Cl/Du/Dl is a WRC-defined envelope or only product post-processing;
- any code-acceptance implication.

Mathematical equivalence must not be promoted into an unobserved source statement.

## Current implementation remains unchanged

At each retained shell-juncture recovery point, production currently has:

- circumferential normal stress `sigma_phi`;
- longitudinal normal stress `sigma_x`;
- shell shear stress `tau`.

It then evaluates `planeStressTresca()` using two in-plane principal stresses, `sigma3 = 0`, and the maximum principal-stress difference. This implementation is not modified by this source-governance PR.

The current product envelope remains explicitly limited to the maximum over the eight evaluated Table-5 points and is **not** a global absolute shell maximum.

## Direct-PDF state

Controlled WRC identity remains:

```text
raw PDF SHA-256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
Git blob SHA-1  = ce861233928154145a9257efbbf8dbef3f5a17d1
```

Authenticated GitHub access reaches the exact binary blob, but the connected interface still cannot expose the PDF bytes for page rendering/inspection. Therefore:

`currentTurnDirectPdfObservationState = NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

This is not a source PASS and not an engineering-code FAIL.

## Authority separation

Keep four questions separate:

1. mathematical correctness of current plane-stress Tresca code;
2. retained Table-5 authority for combined-stress-intensity post-processing/order;
3. explicit primary-source authority for plane-stress/principal-stress semantics;
4. downstream code acceptance.

Frozen rule:

`TABLE5_POST_PROCESSING_AUTHORITY_DOES_NOT_ESTABLISH_EXPLICIT_PLANE_STRESS_OR_CODE_ACCEPTANCE`

## Interaction with #1385

PR #1412 reconciled the retained Table-5 sign/reversal subset but intentionally left physical `u/l`, A/B/C/D and common-point semantics blocked. That unresolved physical-location boundary also prevents this PR from claiming complete physical-surface timing for stress-intensity reconstruction.

## Prohibited shortcuts

Until full source closure, do not:

- replace Tresca with von Mises;
- edit `planeStressTresca()` merely because the retained Table-5 expression is mathematically equivalent;
- infer `sigma3 = 0` as an explicit WRC source statement without source proof;
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
