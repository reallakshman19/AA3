# QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0027

QUESTION_SET_ID: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0027
CHAIN_ID: ADV-LFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_SCOPE_ID: QSCOPE-1551-TERMINAL-REFUSAL-CLASSIFIERS
QUALIFICATION_BASIS_HEAD: 5506b8d90710a310120732fb17b85a2c2b13490f
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
PARENT_QUESTION_SET: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0026

The original issue #1551 five-question engineering challenge remains the no-downgrade floor. This successor adds exact runtime evidence for the three retained terminal-refusal classifiers only; it does not promote native preflight or feature production mechanics.

## Q1 — Production trace

From each retained fixture, trace the exact classifier owner and disposition path that produces `MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED`, `MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED`, and `MODEL_HANGER_PREDEFINED_DATA_INCOMPLETE`. Include the CAESAR restraint TYPE correction path for raw numeric TYPE `2.000000`.

## Q2 — Failure isolation

Using the exact fixture payloads, explain why rigid CNODE node 30→40 with no finite stiffness is refused, why rigid skew `[0.6,0.8,0]` with no finite stiffness is refused, and why HANGER rate `1750` with one hanger but unset cold load is incomplete. Distinguish these classifier failures from solver/mechanism failures.

## Q3 — Authority / invariant

Prove why a finite CNODE spring and finite skew spring can be represented by exact linear spring stiffness, while rigid CNODE and rigid skew require an exact MPC/constraint equation rather than penalty stiffness. State why self-authored fixtures cannot clear `DRAFT_SPRING_SUPPORT_NO_REFERENCE`.

## Q4 — Independent validation

Reconstruct the ten-file exact runtime closure and the four observed falsifiers. Explain why adding CNODE stiffness, axis-aligning skew, or supplying HANGER cold load must make the retained terminal-refusal assertion fail, and why that red evidence proves classifier custody without proving native preflight or solve behavior.

## Q5 — Next contribution / minimal patch

Identify the smallest next promotion step that increases issue #1551 evidence without changing solver formulation, assembly, recovery, tolerances, BM4 oracle authority, or external-reference policy. Preserve the remaining NOT_RUN native-preflight/refusal, finite feature production-mechanics, aggregate/import/lint/diff and BM4_L gates; preserve DRAFT and exact Owner merge trigger `APPROVED MERGE`.
