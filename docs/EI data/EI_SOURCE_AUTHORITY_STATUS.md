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
| `EI-P0-AIV/T2-5_flowchart.yaml` | **VERIFIED SUBSET** | D.2.3-reproduced source PWL, trim reduction, 155-dB gate and spatial attenuation. Multi-source generalization still requires its own independent gate. |
| `EI-P0-AIV/T2-6_flowchart.yaml` | **PARTIAL / PROMOTION BLOCKED** | Official errata `log10(N)`, under-10 FLM1 relation, D.2.3 weldolet FLM2 and D.2.3 lower LOF branch only. A/S/B and other general branches remain unresolved. |
| `EI-P0-AIV/T2-6_diameter_ratio_modifier.csv` | **VERIFIED CALCULATED SAMPLES FOR D/d < 10 ONLY** | Consistency/benchmark aid for the retained FLM1 relation. Not a digitized source table. `D/d >= 10` remains unresolved here. |
| `EI-P0-AIV/T2-6_connection_modifier.csv` | **VERIFIED WELDOLET PATH ONLY** | Calculated FLM2 samples for the D.2.3-reconciled weldolet relation. Other connection types are not promoted. |
| `EI-P0-AIV/T2-6_material_modifier.csv` | **QUARANTINED** | None. PR1288's general FLM3 abstraction is not source-qualified. |
| `EI-P1-IDENTIFICATION/*` | **QUARANTINED / SOURCE OBSERVATIONS ONLY** | None for production applicability/completeness/disposition. See `EI-P1-IDENTIFICATION/AUTHORITY_STATUS.yaml`. |
| `EI_AVIFF_Complete_Master_Register.md` | **REFERENCE COMPILATION, NOT TRUST ROOT** | Navigation/review aid only. Any numerical or workflow statement must defer to the package-specific status above and the governing PDF. |

## Fail-closed rules

1. A derived transcription may be consumed only when its own status explicitly permits the intended engineering use.
2. `UNRESOLVED`, `QUARANTINED`, `REFERENCE`, or `WORKED_EXAMPLE_ANCHOR_ONLY` never means production authority.
3. Do not infer missing EI equations, thresholds, score mappings, material modifiers, connection modifiers, or result dispositions from nearby examples.
4. Worked-example published values can qualify a bounded benchmark path, but they do not create a general equation where the governing equation has not been source-reconciled.
5. Source numbering must be preserved as published. Local disambiguation must not invent a replacement EI flowchart identifier.

## PR1288 correction note

Merged PR #1288 supplied the needed source files, but several derived transcriptions were not numerically self-consistent with the controlled EI examples. The follow-on correction intentionally **reduces** claimed authority rather than filling source gaps by assumption.
