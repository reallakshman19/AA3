# Energy Institute (EI) AVIFF 2nd Edition — Master Engineering Data Register

This directory contains the controlled, digitized master dataset and decision logic extracted from the **Energy Institute Guidelines for the Avoidance of Vibration Induced Fatigue Failure in Process Pipework (2nd Edition)** for implementation in the **Vibration Integrity App**.

---

## Document Index

| Document / Folder | Mechanism / Scope | EI Reference | Priority | Key Contents |
| :--- | :--- | :--- | :---: | :--- |
| [`EI-P0-FIT/`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/EI-P0-FIT) | Flow Induced Turbulence (FIT) | Module T2.2 | **P0** | `T2-1_support_arrangement.csv`, `T2-1_support_arrangement_source.md`, `T2-2_fv_coefficients.csv`, `T2-2_source_reference.yaml`. |
| [`EI-P0-AIV/`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/EI-P0-AIV) | Acoustic Induced Vibration (AIV) | Module T2.7 | **P0** | `T2-5_flowchart.yaml` (source PWL & attenuation), `T2-6_flowchart.yaml` (discontinuity LOF), `T2-6_diameter_ratio_modifier.csv` ($FLM_1$), `T2-6_connection_modifier.csv` ($FLM_2$), `T2-6_material_modifier.csv` ($FLM_3$), `T2-7_method_source_register.yaml`. |
| [`P0_SBC_Master_Data.md`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/P0_SBC_Master_Data.md) | Small Bore Connections (SBC) | Module T3 | **P0** | Tables T3-1, T3-2, T3-3; Full digitized curve datasets for Figures T3-1, T3-2, T3-3, T3-4; Generic User Engineering Data schema. |
| [`EI-P1-IDENTIFICATION/`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/EI-P1-IDENTIFICATION) | Qualitative Assessment & Scoring | Module TM-01, Ch. 3 | **P1** | `T1-1_excitation_factors.csv`, `T1-2_condition_operational_factors.csv`, `T1-1_combination_flowchart.yaml`, `T1-2_existing_plant_flowchart.yaml`, `Table_3-1_disposition.csv`. |
| [`P1_Valve_Transient_and_Cavitation.md`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/P1_Valve_Transient_and_Cavitation.md) | Valve Transient & Cavitation/Flashing | Module T2.8, T2.9 | **P1** | Fast valve closure Joukowsky surge formulations, valve closure factor $\phi$ table, valve pressure-recovery factor $F_L$ register, Flowcharts T2-7 & T2-9, Flowchart T2-6b (Surge). |
| [`P1_Thermowell_Assessment.md`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/P1_Thermowell_Assessment.md) | Thermowell Quantitative Assessment | Module T4 | **P1** | Table T4-1 wall thickness modifier $F_M$ (plain & 4-way gusseted), 3-way geometry taxonomy (straight, tapered, stepped), natural frequency $f_n$ formulas, vortex shedding $F_v$, and Flowchart T4-1. |
| [`P2_Pulsation_and_Specialist_Mechanisms.md`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/P2_Pulsation_and_Specialist_Mechanisms.md) | Pulsation, Rotating Stall, Deadlegs, Corrugation & Slug | Module T2.4, T2.5, T2.6, Subsea E4.3 | **P2** | Flowchart T2-2 (Recip/PD), Flowchart T2-3 (Rotating Stall), Flowchart T2-4 (Deadleg branch acoustic resonance), Subsea corrugation singing, and Slug flow transient screening. |
| [`Appendix_B_Defaults_and_Fluid_Properties.md`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/Appendix_B_Defaults_and_Fluid_Properties.md) | Fluid Properties & Baseline Defaults | Appendix B, Module T2.3 | **Optional / Baseline** | Speeds of sound in common liquids, Reynolds number formulations, gas dynamic viscosities vs temperature, specific heat ratios ($\gamma$), water vapor pressure, and mechanical excitation baseline LOFs (Table T2-3). |
| [`EI_AVIFF_Complete_Master_Register.md`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/EI_AVIFF_Complete_Master_Register.md) | Consolidated Master Register | All Modules | **All** | Single comprehensive compilation of all tables, formulas, digitized curve coordinates, decision flowcharts, and worked examples from P0 to P2. |

---

## Master Data Governance Rules

1. **Deterministic Coordinate Matching**:
   - For user-supplied or lookup-blocked data, the resolver matches exact nominal diameter $X$ (inches) and modified span length $Y$ (meters).
   - No arbitrary un-governed extrapolation is permitted outside calibrated bounds.
2. **Authority Hierarchy**:
   - Explicit project data $\succ$ Governed EI Master Data tables/curves $\succ$ Appendix B defaults.
   - Appendix B defaults remain optional fallbacks and must never silently overwrite explicit client project definitions.
3. **Fail-Closed Principle**:
   - If machine type, aerodynamic characteristic, or acoustic study verification is missing or indeterminate, LOF defaults to `1.0` (fail-closed) until qualified.
