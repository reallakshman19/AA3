# QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0019

QUESTION_SET_ID: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0019
CHAIN_ID: ADV-LFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: 4ba6bedaf6c5aef27a12626a2663fa48226a8236
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA
PARENT_QUESTION_SET: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0018

The original issue #1551 qualification remains controlling. This successor adds the mixed fixed + directional spring reaction-presentation custody established in EP-0019. Correct numbers without the production ownership trace do not demonstrate qualification.

## Q1 — Production support trace

Trace finite skew, finite CNODE and predefined HANGER from InputXML source classification through structural declaration, mechanical-model contract, global assembly, solver qualification/reaction custody, retained result and visible LFEA Output. Identify which support actions are external ground actions and which are internal two-node actions. State why rigid skew/CNODE remain refused rather than approximated.

## Q2 — Mixed fixed + skew reaction decomposition

For a valid node carrying rigid UX plus a grounded directional spring `n=(0.6,0.8,0)`, explain exactly why raw `execution.reactions` may contain more than one UX support contribution. Identify the two production paths that create them and explain why the spring contribution can be nonzero even though the node's UX displacement is exactly zero.

## Q3 — Presentation custody versus numerical authority

Prove why summing same-node/same-DOF retained support contributions in `nodalResult()` and `nodeResultRows()` is presentation custody rather than new FEA mechanics. Name every downstream engineer-facing quantity corrected by the workspace view-model change and every solver quantity deliberately left unchanged.

## Q4 — Fail-closed and negative controls

Describe the retained negative controls for unresolved spring units, rigid skew, rigid CNODE, incomplete/malformed HANGER, blocked solver execution, and the mixed-support presentation deliberate break. State which are source-proven versus runtime-observed on the current head, without converting `NOT_RUN_RUNTIME` into PASS or FAIL.

## Q5 — Promotion gate

State the exact remaining promotion sequence and why none of the self-authored spring/mixed-support fixtures can clear `DRAFT_SPRING_SUPPORT_NO_REFERENCE`. Include the frozen BM4_L values, the three required controlled CAESAR feature references, current runtime blocker, and the exact merge-authority phrase.
