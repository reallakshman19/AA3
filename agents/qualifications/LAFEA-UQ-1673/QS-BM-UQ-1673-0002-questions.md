# Qualification questions — BM-UQ #1673 / U1

QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1673-LAFEA-UQ-U1-SOURCE-AUTHORITY
QUESTION_SET_ID: QS-BM-UQ-1673-0002
QUESTION_SET_STATUS: CURRENT
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: Issue #1673 plus governing LAFEA roadmaps and current repository contracts
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED

## Q1 — Production trace

Using `validation/lafea-b02-definitions/B02A-nonuniform-bending.json` and `scripts/lib/lafea-b02-production-route.mjs`, reconstruct the deterministic B02A input path into `local-continuum-model/v1` and the domain-first production route.

Required numerical reconstruction:
- E = 200000 MPa
- nu = 0.3
- G = E/[2(1+nu)] = 76923.07692307692 MPa
- rectangle depth = 10 mm
- thickness = 1 mm
- right-edge traction magnitude = 10 MPa = 10 N/mm^2
- edge resultant = 10 N/mm^2 * 10 mm * 1 mm = 100 N

Explain why these are deterministic benchmark definitions and do not themselves authorize stochastic distributions or scatter.

## Q2 — Current unresolved problem / failure isolation

For a future UQ result discrepancy, isolate the first changed boundary among:
1. stochastic source data / distribution choice,
2. correlation/dependency model,
3. sampling/convergence error,
4. numerical/discretization uncertainty,
5. model-form discrepancy,
6. deterministic solver/recovery drift.

Required mechanism checks:
- shear modulus G derived from E and nu may not be independently sampled as a third material primitive unless a separately justified discrepancy model exists;
- a prescribed traction and its analytically derived resultant may not be independently sampled as separate physical uncertainties;
- absence of correlation evidence does not prove zero correlation.

## Q3 — Authority / invariant

State the authority boundary for U1.

A benchmark nominal value, `sourceReference` string, deterministic tolerance, or production FEA result is not statistical evidence. Distribution family, mean, standard deviation/COV, bounds interpreted probabilistically, covariance/correlation, and sample-population metadata require an identified engineering source and provenance. Production output may not generate its own stochastic expected model. U1 may not alter solver, oracle, benchmark tolerance, B03-B06 ordering, release authority or temperature authority.

## Q4 — Independent validation

Before production UQ, independently verify at minimum:

`Y = aX + bY2`

`Var(Y) = a^2 Var(X) + b^2 Var(Y2) + 2ab Cov(X,Y2)`

and a normal linear limit state with known analytical Pf/beta. Require fixed-seed replay, permutation invariance where semantic, and fail-closed rejection of malformed/non-positive-semidefinite covariance matrices.

Falsifier: a UQ engine that passes only against production-generated expected values is not qualified.

## Q5 — Next contribution / minimal patch

LEG-002 safe patch is limited to:
- U1 source registry;
- uncertain-input identity/authority registry;
- correlation/dependency authority registry;
- fail-closed U1 source-authority checker;
- chain/Issue custody.

NO-PATCH boundary:
- no invented numerical scatter or distributions;
- no assumption of zero correlations;
- no reliability target or code allowable;
- no statistical execution authorization;
- no solver/mesh/recovery/oracle/tolerance change;
- no B03 activation;
- no release/temperature authority change.

If source-backed numerical stochastic models are unavailable, record `BLOCKED_SOURCE_AUTHORITY` rather than fabricating them.
