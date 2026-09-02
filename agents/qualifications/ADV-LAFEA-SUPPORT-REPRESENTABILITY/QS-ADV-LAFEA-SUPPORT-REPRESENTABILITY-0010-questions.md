# QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0010 — source-identity case custody

QUESTION_SET_ID: QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0010
CHAIN_ID: ADV-LAFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: 8c6fd3d8ce8e7b6782353a3bf91cf6f340c15120
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA

## Q1 — Production trace

Trace controller lifetime versus source lifetime: show how `selectionExplicit`/`selected` survive while `options.getPreFlight()` moves from source A to source B, and why reused case IDs can make a stale explicit non-H choice appear current on the new hanger model.

Fail if the answer assumes case IDs are globally source-unique or resets all state on every preflight regeneration.

## Q2 — State reconstruction

Reconstruct: source A explicit/applied `IXP-W`; source B newly loaded with the same case IDs plus H-bearing cases and native applied `IXP-W`; source B after H-bearing cases are applied. State selected/applied identities and Run readiness before and after source-identity synchronization.

Fail if source B can inherit source A's explicit case authority, or if applying cases on the same source destroys the user's explicit choice merely because intake identity changed.

## Q3 — Authority / invariant

Explain why the reset key must be the sealed source semantic identity, not `intakeSemanticHash` or requested case IDs. Case selection is presentation custody; source change invalidates that presentation state, while case application on the same source must preserve it.

Fail if source identity is inferred from filenames alone or if presentation code mutates HANGER forces/rates.

## Q4 — Independent validation

Extend the focused hanger case-selection gate with two distinct source semantic hashes sharing the same case IDs. Prove stale explicit state is cleared on source change, same-source regeneration is preserved, and deliberate-break disabling the reset turns the check red.

Fail if the check passes when source B directly runs stale `IXP-W` without a new Load-case decision.

## Q5 — Minimal patch / no-patch boundary

Safe production scope is `lfea-pipeline-case-selection-panel.js` plus the existing focused gate. Analysis-surface, Run panel, intake, physical-case compiler, HANGER mechanics, solver, BM4 parity/reference/tolerance/sign/rows, workflows and owner roadmap are no-patch unless an independent source-audited defect requires a new pre-work endpoint.

PR #1553 remains DRAFT; merge requires exact owner instruction `APPROVED MERGE`.
