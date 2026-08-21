# EMP1-08 WIP — WRC 537 §4.5 cylindrical applicability

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `BRANCH: agent/emp1-08-wrc-45-applicability-20260821`
- `BASE_MAIN: 5a45c8e9d79c732e0426972eef01ead01dca63e9`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_EMP1_08`
- `PRODUCTION_ROUTE_AUTHORIZED: false`

## Finding

The bounded cylindrical WRC path had gamma/beta and r0 controls but did not encode the source applicability statements in WRC 537 §4.5. A known short-cylinder or near-end overturning-moment case could therefore reach Table-5 comparison numerics without an explicit source-limit decision. Table-5 results also lacked a machine-readable statement that the method calculates host-shell stresses only, not nozzle/attachment stresses.

## Planned/implemented repair

- source-ledger entry for §4.5.1–§4.5.3;
- load-conditional applicability evaluator:
  - radial `P`: require `l >= Rm`;
  - overturning `Mc`/`Ml`: require nearest end distance `>= 0.5 Rm`;
  - do not invent §4.5 limits for shear/torsion-only loading;
- known outside-source-limit evidence blocks before Table-5 numerics;
- missing applicability evidence remains comparison-incomplete and production unauthorized;
- WRC stress output declares host cylindrical shell at the attachment-shell juncture only;
- add production suspension reason `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED` until cylinder length/end-distance are independently source-qualified.

## Validation state

- Local repository execution: `NOT_RUN` (container has no GitHub network access).
- JavaScript syntax checks on newly prepared files: PASS locally via `node --check`.
- GitHub Actions: `NOT_RUN` until PR is opened.

## Non-scope

No coefficient data, curve-fit polynomial, Table-5 dimensional stress equation, load-axis sign convention, pressure policy, Kn/Kb rule, gamma/beta bounds, or FEM path is changed.

## Exact next action

Publish the prepared EMP1-08 files, open a PR, run the three EMP.1 workflows, fix any regressions, then replace this WIP with the PR workreport.

## Appendix A

1. Why is the `l >= Rm` rule triggered by radial load rather than blindly applied to all six load components?
2. Which WRC load components trigger the `0.5 Rm` end-distance rule in this implementation and why?
3. What happens when applicability evidence is missing versus explicitly outside the source limit?
4. Why does a §4.5 comparison PASS still not authorize production use?
5. What output fields prevent WRC shell stress from being misrepresented as nozzle stress?
