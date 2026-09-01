# QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0011 — default/applied case identity

QUESTION_SET_ID: QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0011
CHAIN_ID: ADV-LAFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: 8def0c142df4976a2854ce2b79669853daada02f
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA

## Q1 — Production trace

Trace untouched hanger case selection from `defaultLfeaPipelineCaseIds()` through `getSelectedCaseIds()` and `getRunCaseCustody()`. Show why `appliedCaseIds.some(...)` can approve Run when the displayed H-bearing default family and the sealed applied set are not identical.

Fail if the answer treats one matching H case as sufficient custody for a multi-case displayed selection.

## Q2 — State reconstruction

For H-bearing defaults `WH/WPH/WTH/WPTH`, reconstruct Run custody for applied sets: `W`; `WH`; full four-case H family; H-family subset; H-family superset. Distinguish untouched/default selection from explicit selection.

Fail if any untouched subset or superset is ready while the UI displays a different selected set.

## Q3 — Authority / invariant

Explain why exact set equality is presentation custody, not numerical authority. The predicate compares case identities only and must not alter load primitives, HANGER preload, spring rate or solver execution.

Fail if the fix rewrites requested cases or constructs H loads.

## Q4 — Independent validation

Extend the focused hanger case-selection gate so `WH`-only applied state is blocked while four H defaults display, full H-family applied state is ready, and deliberate-break restoring any-H acceptance turns the check red.

Fail if the check can pass with selected/applied case sets differing.

## Q5 — Minimal patch / no-patch boundary

Safe production scope is the untouched/default branch of `getRunCaseCustody()` and the existing focused check. Explicit-selection logic, source-identity reset, intake, physical-case compiler, HANGER mechanics, solver, BM4 parity/reference/tolerance/sign/rows, workflows and owner roadmap are no-patch.

PR #1553 remains DRAFT; merge requires exact owner instruction `APPROVED MERGE`.
