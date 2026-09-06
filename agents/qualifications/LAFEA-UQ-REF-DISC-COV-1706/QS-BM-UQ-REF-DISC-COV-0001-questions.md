# QS-BM-UQ-REF-DISC-COV-0001 — qualification questions

STATUS: CURRENT
SCOPE: QSCOPE-1706-LAFEA-UQ-REFERENCE-DISC-COV
DISPLAY: SUPPRESSED_BY_OWNER_COMMAND
DISPLAY_BASIS: `merge, proceed next, no Qs`

## Q1 — Production Trace
Trace `frozen factor marginal + frozen discrepancy marginal + frozen synthetic covariance + deterministic model IDs/values -> component variance terms -> covariance cross-term -> combined moments -> reference interval -> post-construction diagnostics`. Holdout observations cannot generate marginals, covariance/rho, expected moments, or interval oracle.

## Q2 — Current Unresolved Problem / Failure Isolation
If a future checker disagrees, isolate in this order: marginal source transcription; covariance/rho transcription; matrix symmetry/positive-definiteness; semantic ID/unit binding; cross-term sign and factor `2mCov`; component variance arithmetic; total variance; interval quantile/arithmetic; residual applicability; perturbation causality; authority leakage. Frozen marginals, covariance/rho, observations, interval quantile, and production model must never be changed merely to obtain PASS.

## Q3 — Authority / Invariant
Only synthetic reference correlated propagation may eventually be authorized. Preserve production model-discrepancy, calibration, statistical, sensitivity, validation and code/design-basis authority false; active production numeric stochastic-source count 0; reliability-target authority NONE; B03 false; release false; temperature false. `rho_BD=0.3` is synthetic verification evidence only and is not a production correlation claim.

## Q4 — Independent Validation
Future positive evidence must independently reconstruct covariance matrix `[[0.0004,0.018],[0.018,9]]`, determinant `0.003276`, exact cross-terms `[3.96,5.04,6.3,7.92]`, total variances `[17.8,21.88,27.55,36.28]`, means, SDs, intervals and residuals frozen in IB-0001. Controls must include `rho=0` exact reduction to #1704, covariance-sign causality, consistent semantic permutation, zero-discrepancy-SD covariance compatibility, and zero-combined-uncertainty `NOT_APPLICABLE`. Fail-closed evidence must cover non-symmetric/inconsistent/non-PD covariance, `|rho|>=1`, unsupported sources/distributions/plans, semantic/provenance defects, holdout-derived parameters, missing reference authority, and all production-authority leakage channels. Falsifier: expected covariance effects generated from the implementation under test or fitted from holdout observations are invalid qualification evidence.

## Q5 — Next Contribution / Minimal Patch
PR #1705 is merged as `8da6ae56f6f8632892ec532fbfe2534552355374`; Owner command `merge, proceed next, no Qs` authorizes exactly one bounded material LEG-001 after public endpoint synchronization. The leg may add only the frozen correlated reference fixture, narrow covariance-aware analytical combine/checker utility, reduction/invariance/causality controls, structured fail-closed cases, and append-only custody. No production registry/distribution, solver/mesh/recovery, benchmark sequencing, Owner-roadmap mutation, code/design-basis authority, B03, reliability target, release, temperature, production coverage target/tolerance, or production oracle mutation is authorized.
