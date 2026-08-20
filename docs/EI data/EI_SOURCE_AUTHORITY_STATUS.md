# EI AVIFF source-master authority status

This register controls **whether a derived CSV/YAML/Markdown transcription may be used as engineering authority**. Presence in `docs/EI data/` does not by itself make a file authoritative.

## Governing source identity

```text
Publication: Energy Institute — Guidelines for the Avoidance of Vibration Induced Fatigue Failure in Process Pipework
Edition:     2nd Edition, 2008
Repository:  reallaksh19/Advanced_Analysis
File:        docs/EI data/EI - AVIFF Guidelines 2nd Edition.pdf
Git blob:    9d3eccc56429411e17c07a579bdebbd13cb0bdc5
```

The PDF blob is identical to the controlled main-guidance blob already pinned by the FIT/AIV source evidence in `reallaksh19/3D_Converters`.

## Current derived-data authority

| Package | Current state | Permitted engineering use |
|---|---|---|
| `EI-P0-FIT/T2-1_support_arrangement.csv` | **VERIFIED** | Controlled FIT T2.2 span/stiffness boundaries within the already-qualified bounded FIT method. |
| `EI-P0-FIT/T2-2_fv_coefficients.csv` | **VERIFIED** | Controlled FIT T2.2 empirical correlation coefficients within the already-qualified bounded FIT method. |
| `EI-P0-FIT/T2-2_source_reference.yaml` | **VERIFIED SUBSET** | FIT source chain, FVF and phase-specific LOF equations explicitly marked verified; quarantined items are not authority. |
| `EI-P0-AIV/T2-5_flowchart.yaml` | **SOURCE-CORROBORATED / D.2.3 REPRODUCED** | Qualification evidence for source PWL, SFF values, trim reduction, 155 dB gates, attenuation, multi-source summation and source-path greatest-discontinuity rule. Production use still requires the downstream gates in the AIV source register. |
| `EI-P0-AIV/T2-6_flowchart.yaml` | **SOURCE-CORROBORATED / D.2.3 REPRODUCED** | Qualification evidence for a/s/B, official-errata `log10(N)`, both FLM1 branches, Weldolet FLM2 branch, duplex FLM3 branch, Lf clamp and LOF mapping. Exact pinned-PDF visual parity and product qualification remain pending. |
| `EI-P0-AIV/T2-6_diameter_ratio_modifier.csv` | **SOURCE-CORROBORATED CALCULATED SAMPLES** | Consistency/benchmark aid for the full FLM1 branch. Not a digitized source table. D.2.3 published FLM1 arithmetic variance remains open. |
| `EI-P0-AIV/T2-6_connection_modifier.csv` | **SOURCE-CORROBORATED WELDOLET SAMPLES** | Calculated sample values for the source-corroborated Weldolet FLM2 formula. Non-Weldolet means no FLM2 application and is governed by the flowchart, not this sample table. |
| `EI-P0-AIV/T2-6_material_modifier.csv` | **SOURCE-CORROBORATED BRANCH LOGIC** | Qualification evidence for Duplex -> apply FLM3; non-Duplex -> no FLM3. It does not classify a project material as Duplex. |
| `EI-P1-IDENTIFICATION/*` | **QUARANTINED / SOURCE OBSERVATIONS ONLY** | None for production applicability/completeness/disposition. See `EI-P1-IDENTIFICATION/AUTHORITY_STATUS.yaml`. |
| `EI_AVIFF_Complete_Master_Register.md` | **REFERENCE COMPILATION, NOT TRUST ROOT** | Navigation/review aid only. Any numerical or workflow statement must defer to the package-specific status above and the governing PDF. |

## Source-corroboration boundary

The AIV T2.5/T2.6 equations are now corroborated against an independently accessible text rendering of the original 2008 guidance and against the same equation chain in later EI subsea guidance, and they reproduce the controlled D.2.3 worked example. This is strong **qualification evidence**, but it is intentionally not represented as exact visual parity against the pinned repository PDF because the current transport cannot render that binary page.

Therefore:

```text
exactPinnedPdfVisualParity = NOT_RUN / TRANSPORT_BLOCKED
sourceEquationCorroboration = PASS
D2_3NumericalReproduction = PASS
screeningAuthorityPromotion = false
designAuthority = false
```

## Fail-closed rules

1. A derived transcription may be consumed only when its own status explicitly permits the intended engineering use.
2. `UNRESOLVED`, `QUARANTINED`, `REFERENCE`, `QUALIFICATION_EVIDENCE_ONLY`, or `WORKED_EXAMPLE_ANCHOR_ONLY` never means production authority.
3. Do not infer missing EI equations, thresholds, score mappings, material classifications, applicability dispositions, or result dispositions from nearby examples.
4. Source-corroborated equations may close transcription gaps for qualification, but production promotion still requires exact applicable gates, implementation parity and release qualification.
5. Source numbering must be preserved as published. Local disambiguation must not invent a replacement EI flowchart identifier.

## PR1288 / PR1289 correction note

Merged PR #1288 supplied the needed source files, but several derived transcriptions were not numerically self-consistent with the controlled EI examples. Draft PR #1289 corrects those defects, keeps the P1 qualitative synthesis quarantined, and records the AIV T2.5/T2.6 equations as source-corroborated qualification evidence without granting screening or design authority.
