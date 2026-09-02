# QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0008 — HANGER load-case custody

QUESTION_SET_ID: QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0008
CHAIN_ID: ADV-LAFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: f357c4930bb17bfbc7a3a5d9570ed368a45b1d54
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA

## Q1 — Production trace

Trace a predefined HANGER cold load from `collectInputXmlHangerPreloads()` through `addHangerPreloadCases()` / `compileInputXmlLinearPhysicalCases()` into `physicalCases`, then through `LfeaPipelineCaseSelectionPanelController.availableCases()` / `getSelectedCaseIds()` and `buildInputXmlRunRequestCase()`. Identify the exact current predicate that causes H-bearing cases to be omitted from the default selection.

Fail if the answer stops at case creation, does not reach the user-selection/run-request surface, or treats UI default selection as numerical authority.

## Q2 — State reconstruction

For a model with only `W/WP/WT/WPT`, reconstruct the default selected case IDs. Then add the four H-bearing counterparts `WH/WPH/WTH/WPTH` and reconstruct the intended default set. Prove that explicit user checkbox selection remains authoritative after the default policy changes.

Fail if a no-H model changes behavior, if H-bearing and non-H variants are both silently defaulted together, or if explicit user selection is overwritten.

## Q3 — Authority / invariant

Explain why preferring H-bearing cases when a qualified predefined hanger exists is load-case custody rather than new hanger numerical authority. Identify the files that already own spring rate, theoretical cold load, multiplicity and physical primitive construction, and state why `lfea-pipeline-case-selection-panel.js` must not recompute any of them.

Fail if UI code derives rate/load/count, invents H from source fields, changes `W/WP/WT/WPT` physical definitions, or promotes self-authored evidence out of DRAFT.

## Q4 — Independent validation

Define a focused deterministic check proving: (1) legacy-only cases default exactly to the four legacy standard roles; (2) presence of H-bearing standard cases changes the default to the four H-bearing roles only; (3) base cases remain visible/selectable; (4) explicit user selection overrides the default; and (5) H-case labels/categories are stable. Define a deliberate break that removes H-case preferred classification/defaulting and must turn the check red.

Fail if the check can pass while the UI still defaults to non-H cases for a hanger model, or if deliberate-break behavior is only asserted conceptually rather than executable.

## Q5 — Minimal patch / no-patch boundary

State the minimum files needed to close this case-custody defect. The safe boundary is the case-selection presentation/default policy plus one focused check registered in the existing spring-draft aggregate. No solver, compiler, hanger-rate/preload mechanics, BM4 parity harness, code allowables, roadmap or workflow changes are authorized.

Fail if the patch expands numerical authority or changes the PR from DRAFT / merge state without exact owner instruction `APPROVED MERGE`.
