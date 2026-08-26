# PR1362 Work Report — EMP1-26 host-shell versus attachment stress boundary

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: IMPLEMENT`
- `MUTATION_AUTHORITY: WRITE_ALLOWED`
- `PR: #1362`
- `ISSUE: #1361`
- `BRANCH: agent/emp1-26-host-vs-attachment-scope`
- `BASE_MAIN: c81f1ba5ba522d7481de2b4146359b2ede792b8f`
- `PRODUCTION_NUMERICAL_METHOD_CHANGED: false`
- `WRC297_ENGINEERING_AUTHORITY: false`
- `NOZZLE_ATTACHMENT_STRESS_AUTHORITY: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Handover in 60 seconds

This PR freezes only the result-domain/method boundary already implied by qualified WRC 537 §4.5.3 custody: current WRC 537 cylindrical results are host-shell stresses at the attachment-shell juncture. They are not nozzle-wall, attachment-wall, nozzle-neck, weld or reinforcement-pad stresses.

WRC 297 is recorded only as a candidate separate method family. No authorized WRC 297 technical source package has been qualified in this workstream; therefore no WRC 297 equation, coefficient, applicability limit, interpolation rule, benchmark or production implementation is introduced.

## Engineering decision

Fail closed against these false equivalences:

- WRC 537 host-shell stress == nozzle/attachment stress;
- WRC 537 + Appendix-B SCF == WRC 297;
- similar geometry == authority to transfer method results;
- public method description == technical implementation authority;
- stress calculation == code compliance/release acceptance.

## Changed-file ledger

1. `validation/emp1/wrc537-2013/host-shell-vs-attachment-stress-boundary-v1.json`
2. `docs/emp1/WRC537_Host_Shell_vs_Attachment_Stress_Authority.md`
3. `scripts/emp1-wrc537-host-vs-attachment-scope-check.mjs`
4. `agents/PR1362_workreport.md`

No `.github/workflows/*`, production evaluator, route registry, UI, coefficient/oracle/tolerance, gamma/beta, pressure, SCF or off-axis/global-maximum files are intentionally changed.

## Validation truth

- Repository/source interpretation: `PASS_SOURCE_GOVERNANCE_BOUNDARY`.
- Exact-head Node execution: `NOT_RUN` in the current connected environment; no runtime PASS is claimed.
- Production numerical comparison: `NOT_RUN_NOT_APPLICABLE` because no numerical production method changes.

## Remaining gates

A future nozzle/attachment method requires independent source custody and qualification covering exact edition/source digest, geometry, loads/reference, parameter domains, equations/coefficient data, stress/recovery definitions, interpolation/extrapolation, exclusions and independent benchmarks/hand calculations.

## Appendix A — takeover qualification

1. Why does WRC 537 §4.5.3 prevent relabeling the current Table-5 result as nozzle-wall stress?
2. Why is an Appendix-B stress concentration factor insufficient to create WRC 297 authority?
3. What source package must exist before a WRC 297 numerical implementation is admissible?
4. Which stress bodies/locations remain explicitly unauthorized by this PR?
5. Why are code compliance and release acceptance separate from calculation-method authority?
6. Which production files must remain untouched while this workstream is source-governance-only?
