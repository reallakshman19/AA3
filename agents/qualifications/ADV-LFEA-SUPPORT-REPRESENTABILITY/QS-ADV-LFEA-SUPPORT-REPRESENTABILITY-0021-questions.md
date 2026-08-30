# QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0021

QUESTION_SET_ID: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0021
CHAIN_ID: ADV-LFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: eb6691f4e47f9fc1253927c2bf57d7c32f4aee21
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA
PARENT_QUESTION_SET: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0020

The original issue #1551 qualification remains controlling. This successor adds the dedicated per-feature refusal-model custody required by definition-of-done item 2.

## Q1 — Dedicated refusal trace

Name the three dedicated negative InputXML fixtures and the exact terminal refusal each must retain. Explain why the combined `UnsupportedSupports.xml` is insufficient as the sole negative evidence for CNODE and HANGER even though it contains both refusal codes.

## Q2 — Profile independence

Trace `lfea-support-refusal-fixture-check.mjs` through InputXML intake and pre-flight under both STRICT and APPROXIMATE. State how the check proves that each fixture blocks because of its own feature rather than because another issue #1551 terminal feature contaminates the model.

## Q3 — Deliberate-break mechanics

For rigid skew, rigid CNODE and incomplete HANGER, identify the exact source mutation used by `--deliberate-break`, why that mutation moves the source into a currently representable subset, and why the refusal assertion must then fail. Do not claim the break has been observed unless exact-head runtime evidence exists.

## Q4 — Provenance / authority

Explain why the new dedicated fixtures and their gate improve refusal custody but still cannot clear `DRAFT_SPRING_SUPPORT_NO_REFERENCE`. Distinguish self-authored constitutive/refusal evidence, BM4_L non-regression evidence and the three required external CAESAR support-reference packages.

## Q5 — Definition-of-done state

Give the current status of all six issue #1551 definition-of-done items after EP-0021. Identify which items are source-complete, which remain runtime-blocked, which remain external-reference-blocked, the frozen BM4_L target, the rigid skew/CNODE MPC boundary and the exact merge-authority phrase.
