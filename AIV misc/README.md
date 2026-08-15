# AIV Master Database & Reference Data Register

*Directory: `F:\CODE-6\Advanced_Analysis\docs\EI data\AIV misc`*

---

## Overview

This directory contains the authoritative **Phase-1 Master Database** and validation tools for the **Acoustic Induced Vibration (AIV)** and Piping Vibration Integrity assessment system.

All data are maintained in flat, controlled `.csv` tables adhering strictly to universal engineering standards, stable textual keys, and canonical SI unit conversions.

---

## File Inventory

| File / Folder | Type | Description |
| :--- | :---: | :--- |
| [`masters/M_PIPE_DIMENSION.csv`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/AIV%20misc/masters/M_PIPE_DIMENSION.csv) | Master CSV (137 rows) | ASME B36.10M & ASME B36.19M pipe dimensional standards (OD, WT, ID) across NPS 1/2" to 24". |
| [`masters/M_PIPING_CLASS.csv`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/AIV%20misc/masters/M_PIPING_CLASS.csv) | Master CSV (34 rows) | Project Piping Material Specifications mapping NPS, Schedule, Material, and branch types. |
| [`masters/M_MATERIAL.csv`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/AIV%20misc/masters/M_MATERIAL.csv) | Master CSV (17 rows) | ASTM/ASME material specifications with controlled `IsDuplex`, `IsStainless`, `IsCarbonSteel` flags. |
| [`masters/M_COMPONENT_TYPE.csv`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/AIV%20misc/masters/M_COMPONENT_TYPE.csv) | Master CSV (20 rows) | Component taxonomy mapping CAD/model types to `AivAssessmentType`. |
| [`masters/M_SOURCE_DEVICE_TYPE.csv`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/AIV%20misc/masters/M_SOURCE_DEVICE_TYPE.csv) | Master CSV (11 rows) | Acoustic excitation source devices (PSVs, Control Valves, Restriction Orifices). |
| [`masters/M_UNIT.csv`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/AIV%20misc/masters/M_UNIT.csv) | Master CSV (27 rows) | Canonical SI conversion factors, offsets, and explicit pressure basis tracking. |
| [`masters/M_DOCUMENT_SOURCE.csv`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/AIV%20misc/masters/M_DOCUMENT_SOURCE.csv) | Master CSV (15 rows) | Controlled document authority and standards provenance register. |
| [`AIV_Master_DB_Architecture.md`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/AIV%20misc/AIV_Master_DB_Architecture.md) | Documentation | Comprehensive database architecture, relational join diagrams, and query recipes. |
| [`validate_aiv_masters.py`](file:///F:/CODE-6/Advanced_Analysis/docs/EI%20data/AIV%20misc/validate_aiv_masters.py) | Python Script | Automated validation test suite verifying PK uniqueness, FK referential integrity, and join chains. |

---

## Verification

To run the automated verification suite:

```powershell
python "F:\CODE-6\Advanced_Analysis\docs\EI data\AIV misc\validate_aiv_masters.py"
```
