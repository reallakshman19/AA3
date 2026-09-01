# QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0016 — corrected-chain continuation

QUESTION_SET_ID: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0016
CHAIN_ID: ADV-LFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: 487bee955cd2a9cb35ac67542f4be8de949cd003
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA
MIGRATED_FROM_QUESTION_SET: QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0015
QUESTION_SEMANTICS_CHANGED: FALSE
REASK_REQUIRED_FOR_PROCEED_NEXT: FALSE

This question set preserves the engineering qualification scope of legacy QS-0015 under the corrected LFEA chain identity. The Owner command is `proceed next`; under the live Common issue-control-plane policy, unchanged qualification questions are reused rather than re-asked.

## Q1 — Retained reference custody

Enumerate the governed LFEA benchmark/reference families and identify which ones retain raw CAESAR job/output custody. Prove why BM4_L cannot qualify hanger, finite CNODE or skew support, why SPRING_DRAFT cannot clear DRAFT, and why the BM4_NL profile is not sufficient support-reference authority.

Fail if a self-authored fixture, a profile without qualified raw support custody, or BM4_L is promoted as positive support evidence.

## Q2 — Controlled CAESAR observables

For each required external reference, state the exact source values and the quantity that proves the support is mechanically used:

- skew: `k = 1000 N/mm`, `n = (0.6,0.8,0)`, projected displacement and vector spring action;
- CNODE: node 30 to node 40, `k = 100000 N/mm`, `n = (0.6,0.8,0)`, relative projected displacement and equal/opposite internal actions;
- HANGER: node 40, `1750 N/mm`, theoretical cold load `4500 N`, count 1, separate `W` and `W+H` response.

Explain why preload belongs to the load vector and must not alter the spring stiffness matrix.

Fail if evidence only proves the record is carried, if CNODE is treated as a ground support, or if HANGER preload is embedded in `K`.

## Q3 — Live-main coordination

Re-ground PR #1553 against `main@541e5ad6078e811c55e1c426f1e8ca7a34356a61`. Compare the live-main movement to #1553 changed paths and state the coordination classification.

Fail if an unrelated EMP/WRC merge is used to justify a rebase, support-mechanics rewrite, UI rewrite or authority broadening without overlapping files or semantics.

## Q4 — Exact-head runtime truth

Trace the latest exact-head/runtime probes, including the governance-only current-head workflow instance, and record whether any executable repository step was created. Classify absent steps and skipped BM4 correctly.

Fail if `steps=[]` is called an engineering FAIL or PASS, or if skipped BM4 is treated as non-regression evidence.

## Q5 — Promotion / merge decision

State separately:

- finite skew implementation state;
- finite CNODE implementation state;
- predefined Y-vertical HANGER implementation state;
- rigid skew/CNODE MPC deferral;
- external CAESAR reference qualification state;
- exact-head repository runtime state;
- BM4_L non-regression state;
- disclosure code and UI custody;
- PR Draft state and merge authority.

Fail if `DRAFT_SPRING_SUPPORT_NO_REFERENCE` is cleared before external CAESAR evidence, if NOT_RUN is promoted to PASS, or if merge is authorized without exact Owner phrase `APPROVED MERGE`.
