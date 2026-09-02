# QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0004

QUALIFICATION_PROTOCOL_VERSION: 3
QUESTION_SET_ID: QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0004
CHAIN_ID: ADV-LAFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: f47fbb6053417edbc5898f4a0becdef316f45205
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA

## Q1 — Production trace
Trace one predefined InputXML HANGER from `SPRING_RATE`, `COLD_LOAD`, `NUM_HANGERS`, node and vertical-axis authority through retained source evidence, structural spring declaration, physical preload primitive, load-case construction and global `K/F` assembly. Distinguish the existing `PARTIAL_RELEASE_SPRING → LINEAR_SPRING` rate path from the existing `NODAL_FORCE_MOMENT` preload path.

## Q2 — Numerical reconstruction
For the issue fixture values `SPRING_RATE=1750 N/mm`, `COLD_LOAD=4500 N`, `NUM_HANGERS=1`, reconstruct the exact location rate in N/m and preload in N. Then repeat for `NUM_HANGERS=2` and show why both values double under Hexagon's documented per-hanger semantics. State the force vector for a Y-vertical predefined hanger.

## Q3 — Authority / invariant
Prove the tangent invariant `ΔR = k Δq` is independent of the preload and that cold load belongs to `F`, not `K`. Identify the authoritative Hexagon basis for per-hanger rate/load and multiplicity, the Y-vs-Z vertical-axis boundary, and the invalid shortcut of silently assuming an unresolved vertical orientation.

## Q4 — Independent validation
Show separate analytical evidence for rate conversion/multiplicity and preload-vector contribution. Demonstrate a focused self-authored exercise where the hanger carries a material load share, plus deliberate-break failures for (a) dropped multiplicity, (b) preload incorrectly placed in stiffness/omitted from `H`, and (c) unresolved source units/orientation. Confirm self-authored evidence remains DRAFT.

## Q5 — Minimal patch boundary
Name exact parser/inventory/structural/physical/UI/test files changed for the qualified predefined-HANGER subset; list retained refusal codes for missing rate/cold load, invalid multiplicity and unresolved vertical-axis authority; identify rollback/NO-PATCH conditions. Confirm no hanger sizing/design algorithm, reducer mechanics, BM4 parity tuning, code authority or workflow change is introduced.
