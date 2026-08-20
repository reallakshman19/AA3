# Energy Institute (EI) AVIFF 2nd Edition — Engineering Data Register

This directory contains source documents, controlled transcriptions, worked-example evidence, and derived engineering-data candidates for the **Energy Institute Guidelines for the Avoidance of Vibration Induced Fatigue Failure in Process Pipework (2nd Edition)**.

**Important:** presence in this directory does **not** automatically grant engineering authority. Read [`EI_SOURCE_AUTHORITY_STATUS.md`](./EI_SOURCE_AUTHORITY_STATUS.md) before consuming any CSV/YAML/Markdown method data.

The governing PDF currently pinned in this repository is:

```text
docs/EI data/EI - AVIFF Guidelines 2nd Edition.pdf
Git blob: 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
```

---

## Document Index

| Document / Folder | Mechanism / Scope | EI Reference | Priority | Current authority note |
| :--- | :--- | :--- | :---: | :--- |
| [`EI-P0-FIT/`](./EI-P0-FIT/) | Flow Induced Turbulence (FIT) | Module T2.2 | **P0** | T2-1 span boundaries and T2-2 correlation coefficients are verified for the qualified bounded FIT method. `T2-2_source_reference.yaml` marks verified vs quarantined sections explicitly. |
| [`EI-P0-AIV/`](./EI-P0-AIV/) | Acoustic Induced Vibration (AIV) | Module T2.7 | **P0** | **Partial source reconciliation.** T2-5 D.2.3 path and selected T2-6 equations are verified; A/S/B, general material treatment and other branches remain blocked. |
| [`P0_SBC_Master_Data.md`](./P0_SBC_Master_Data.md) | Small Bore Connections (SBC) | Module T3 | **P0** | Existing digitized tables/curves; retain package-specific source review before production promotion. |
| [`EI-P1-IDENTIFICATION/`](./EI-P1-IDENTIFICATION/) | Qualitative Assessment / mechanism identification | TM-01, Ch. 3 | **P1** | **QUARANTINED_NOT_ENGINEERING_AUTHORITY.** PR1288 introduced synthetic scoring/multiplier logic. See `AUTHORITY_STATUS.yaml`. |
| [`P1_Valve_Transient_and_Cavitation.md`](./P1_Valve_Transient_and_Cavitation.md) | Valve Transient & Cavitation/Flashing | T2.8, T2.9 | **P1** | Reference candidate only until its numerical/flowchart content is directly source-reconciled. Do not treat local flowchart renaming as an EI identifier. |
| [`P1_Thermowell_Assessment.md`](./P1_Thermowell_Assessment.md) | Thermowell Quantitative Assessment | Module T4 | **P1** | Reference candidate; source-specific qualification required before production authority. |
| [`P2_Pulsation_and_Specialist_Mechanisms.md`](./P2_Pulsation_and_Specialist_Mechanisms.md) | Pulsation, Rotating Stall, Deadlegs, Corrugation & Slug | T2.4, T2.5, T2.6, specialist material | **P2** | Reference candidate; not promoted by the P0 FIT/AIV correction. |
| [`Appendix_B_Defaults_and_Fluid_Properties.md`](./Appendix_B_Defaults_and_Fluid_Properties.md) | Fluid properties / defaults | Appendix B, T2.3 | Baseline | Reference data; explicit project data retains precedence and defaults may not silently overwrite project inputs. |
| [`EI_AVIFF_Complete_Master_Register.md`](./EI_AVIFF_Complete_Master_Register.md) | Consolidated compilation | Multiple modules | Reference | **Not a trust root.** It contains historical/derived transcriptions and must defer to `EI_SOURCE_AUTHORITY_STATUS.md` and the governing PDF. |
| [`EI_AVIFF_Guidelines_2nd_Edition_Examples.md`](./EI_AVIFF_Guidelines_2nd_Edition_Examples.md) | Worked-example transcription | Appendix D | Evidence | Published-example evidence and source cross-check aid; examples do not automatically establish general equations. |
| [`woodEI.md`](./woodEI.md) | Derived screening report | Worked-example/project output | Evidence | Derived result evidence only; not interchangeable with governing EI source or method authority. |

---

## Master Data Governance Rules

1. **Source precedence**
   - Explicit project engineering inputs take precedence over optional defaults.
   - Governing EI source text/figures take precedence over derived CSV/YAML/Markdown transcriptions.
   - Derived files may be consumed only for the engineering use explicitly allowed by their authority status.

2. **No inferred authority**
   - Do not invent or interpolate missing EI equations, thresholds, score mappings, material modifiers, connection modifiers, result dispositions, or flowchart identifiers.
   - A worked-example value may qualify a bounded benchmark path; it does not establish a general method by itself.

3. **Fail closed on unresolved source semantics**
   - `UNRESOLVED`, `QUARANTINED`, `REFERENCE`, `WORKED_EXAMPLE_ANCHOR_ONLY`, or similar states are not production authority.
   - Missing or unresolved method data must surface as a blocker rather than being replaced by an arbitrary LOF or hidden default.

4. **Deterministic digitized data**
   - Where a curve/table has been source-qualified for interpolation, interpolation/extrapolation behavior must be separately governed and bounded.
   - Do not extrapolate beyond a qualified source envelope without an explicit engineering rule.

5. **Traceability**
   - Every promoted master must retain source document identity, locator, transcription/reconciliation state and validation evidence.
