# ASME B31.3 Chapter IX & BPVC Section VIII Division 3 Master Tables & Documentation

This directory contains the authoritative master data tables, engineering specifications, governance reports, and benchmark suites for **ASME B31.3 Chapter IX High Pressure Fluid Service** piping design invoking **ASME BPVC Section VIII Division 3 Articles KD-2 and KD-3**.

---

## 1. Directory Structure

```text
docs/High Pr/
├── README.md                                    # Master Directory Index & Usage Guide
├── B313_CHAPTER_IX_MASTER_DATA_SPECIFICATION.md # Full Engineering & Mathematical Specification
├── GOVERNANCE_AND_AUDIT_REPORT.md               # Technical Audit, Code Reconciliation & Gate Matrix
│
├── Authority Masters
│   ├── code_source_revision.csv                 # Governed source standards, editions, hashes, locators
│   └── method_manifest.csv                      # Approved bindings between B31.3 methods and VIII-3 sources
│
├── Material Masters
│   ├── material_identity.csv                    # Alloy specifications, UNS numbers, material families
│   └── material_property.csv                    # Temperature-dependent S, Sy, Su, E with explicit interpolation
│
├── Geometry & Product Masters
│   ├── pipe_dimension.csv                       # ASME B36.10M dimensions across full NPS schedules
│   └── pipe_product.csv                         # Product forms with specific minus manufacturing tolerances
│
├── Corrosion & Wall-State Master
│   └── corrosion_model.csv                      # Internal/external corrosion allowances and design life
│
├── Transient Masters
│   ├── cycle_spectrum.csv                       # Governed transient lifecycle spectra
│   ├── operating_state.csv                      # Physical states (P, material T, structural T)
│   └── cycle_transition.csv                     # State-to-state cycle transitions with frequency
│
├── KD / Fatigue Masters
│   ├── fatigue_route.csv                        # KD-2 / KD-3 calculation routes and stress bases
│   ├── fatigue_curve.csv                        # Design fatigue curve definitions and scopes
│   └── fatigue_curve_point.csv                  # Design fatigue curve discrete coordinate points
│
├── Component Masters
│   ├── component_catalog.csv                    # Catalog of piping components (pipe, elbow, tee, reducer, etc.)
│   ├── sif_stress_index.csv                     # ASME B31J stress intensification & flexibility indices
│   └── component_qualification.csv              # 4-tier component fatigue qualification statuses
│
├── Class Masters
│   ├── piping_class.csv                         # Governed piping class definitions (design P, T, life)
│   ├── piping_class_item.csv                    # Piping class item mappings across size ranges
│   └── fatigue_envelope_point.csv               # Governed DeltaP - N fatigue capacity envelope points
│
└── Benchmark & Evidence Masters
    ├── benchmark_case.csv                       # Multi-class verification cases (Classes A, B, C, D, E, F)
    ├── analysis_mapping.csv                     # CAESAR II / FEA solver handoff profiles
    └── approval_record.csv                      # Engineering governance approvals and sign-offs
```

---

## 2. Governed Master Tables Summary

| # | Master CSV File | Primary Key | Description |
|---|---|---|---|
| 1 | [`code_source_revision.csv`](code_source_revision.csv) | `source_id` | Document-level revision custody and hash tracking |
| 2 | [`method_manifest.csv`](method_manifest.csv) | `method_id` | Binding of B31.3 method to VIII-3 source and KD routes |
| 3 | [`material_identity.csv`](material_identity.csv) | `material_id` | Material specification, UNS, grade, family |
| 4 | [`material_property.csv`](material_property.csv) | `material_id, temperature_c` | Temperature-dependent properties with explicit interpolation |
| 5 | [`pipe_dimension.csv`](pipe_dimension.csv) | `dimension_id` | Standard pipe dimensions ($OD, t_{nom}, ID$) |
| 6 | [`pipe_product.csv`](pipe_product.csv) | `product_id` | Manufactured pipe product with mill tolerance |
| 7 | [`corrosion_model.csv`](corrosion_model.csv) | `corrosion_model_id` | Corrosion and erosion allowances and design life |
| 8 | [`cycle_spectrum.csv`](cycle_spectrum.csv) | `spectrum_id` | Lifecycle transient collection |
| 9 | [`operating_state.csv`](operating_state.csv) | `spectrum_id, state_id` | Disambiguated pressure and temperature states |
| 10 | [`cycle_transition.csv`](cycle_transition.csv) | `spectrum_id, cycle_id` | State-to-state transient cycle definitions |
| 11 | [`fatigue_route.csv`](fatigue_route.csv) | `fatigue_route_id` | $S_{alt} \to S_{eq}$ stress route and interpolation rules |
| 12 | [`fatigue_curve.csv`](fatigue_curve.csv) | `fatigue_curve_id` | Design fatigue curve metadata |
| 13 | [`fatigue_curve_point.csv`](fatigue_curve_point.csv) | `fatigue_curve_id, point_no` | $(N, S_a)$ coordinate points on fatigue curves |
| 14 | [`component_catalog.csv`](component_catalog.csv) | `component_id` | Piping component taxonomy and standards |
| 15 | [`sif_stress_index.csv`](sif_stress_index.csv) | `geometry_key, method_id` | B31J SIFs and flexibility factors |
| 16 | [`component_qualification.csv`](component_qualification.csv) | `qualification_id` | Component qualification tier and limitations |
| 17 | [`piping_class.csv`](piping_class.csv) | `class_id` | Piping class high-pressure design envelope |
| 18 | [`piping_class_item.csv`](piping_class_item.csv) | `class_id, component_type, size_from_nps` | Class item component bindings |
| 19 | [`fatigue_envelope_point.csv`](fatigue_envelope_point.csv) | `envelope_id, point_no` | Discrete $\Delta P - N$ allowable points |
| 20 | [`benchmark_case.csv`](benchmark_case.csv) | `benchmark_id` | Test cases with expected results and tolerances |
| 21 | [`analysis_mapping.csv`](analysis_mapping.csv) | `mapping_id` | External solver translation configurations |
| 22 | [`approval_record.csv`](approval_record.csv) | `object_type, object_id` | Verification and approval audit trail |

---

## 3. Engineering Reference Documents
- **Mathematical Specification**: [`B313_CHAPTER_IX_MASTER_DATA_SPECIFICATION.md`](B313_CHAPTER_IX_MASTER_DATA_SPECIFICATION.md)
- **Governance and Audit**: [`GOVERNANCE_AND_AUDIT_REPORT.md`](GOVERNANCE_AND_AUDIT_REPORT.md)
