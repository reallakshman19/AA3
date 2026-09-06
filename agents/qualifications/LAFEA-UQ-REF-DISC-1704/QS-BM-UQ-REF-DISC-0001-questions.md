# QS-BM-UQ-REF-DISC-0001 — qualification questions

QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1704-LAFEA-UQ-REFERENCE-MODEL-DISCREPANCY
QUESTION_SET_ID: QS-BM-UQ-REF-DISC-0001
QUESTION_SET_STATUS: CURRENT
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: #1673 quantitative UQ ladder + #1704 frozen scope
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED

## Q1 — Production Trace
Reconstruct the full reference data path: frozen factor source `Normal(1.05,0.02^2)` + frozen additive discrepancy source `Normal(-1.5,3^2)` + deterministic H1..H4 model IDs/values + synthetic independence `Cov(B,D)=0` + interval definition -> component moments -> combined mean/variance -> central interval -> post-construction test diagnostics. Calculate H1 by hand: factor variance `110^2*0.02^2=4.84`, discrepancy variance `9`, total `13.84`, SD `3.7202150475476548`, mean `114`, interval `[106.70851249206264,121.29148750793736]`. Explain why holdout tests cannot influence either source distribution.

## Q2 — Current Unresolved Problem / Failure Isolation
If H3 disagrees with the oracle, isolate in this order: source/provenance transcription; H3 ID/unit binding; synthetic covariance/independence plan; factor variance `175^2*0.02^2=12.25`; discrepancy variance `9`; total variance `21.25`; mean `1.05*175-1.5=182.25`; SD `sqrt(21.25)=4.6097722286464435`; interval quantile/arithmetic; standardized residual `(187-182.25)/4.6097722286464435=1.030419674638617`; authority leakage. State which frozen quantities are forbidden to change merely to obtain PASS.

## Q3 — Authority / Invariant
Using live repository evidence, identify every authority that must remain blocked: production model-discrepancy distribution, production calibration factor, production statistical execution, production sensitivity, production validation acceptance, production reliability target, B03, release, temperature, and any production numeric stochastic source. Explain why synthetic `Cov(B,D)=0` is a reference oracle assumption rather than a production independence claim, and why 4/4 interval coverage cannot create a production 95% target.

## Q4 — Independent Validation
Independently reconstruct: factor variance contributions `[4.84,7.84,12.25,19.36]`, discrepancy variance `9`, total variances `[13.84,16.84,21.25,28.36]`, combined means/SDs/intervals, and standardized residuals. Required falsifiers: consistent holdout permutation exact; `mu_D=0,sigma_D=0` reduces exactly to qualified #1702; `sigma_B=0` retains finite discrepancy uncertainty; both SDs zero yields `NOT_APPLICABLE_ZERO_COMBINED_UNCERTAINTY`; holdout-test perturbation cannot alter prediction distributions; discrepancy mean/SD and factor SD perturbations affect only mathematically dependent outputs. Any expected oracle derived from implementation output under test or fitted from holdout tests is invalid evidence.

## Q5 — Next Contribution / Minimal Patch
Propose the smallest safe LEG-001: exactly one frozen discrepancy reference definition/oracle, one narrow analytical combine utility, one checker, plus append-only chain/receipt custody. Required NO-PATCH boundary: no production UQ/discrepancy/calibration registry, production distribution, solver/mesh/recovery, benchmark sequencing, Owner roadmap, B03, reliability/code target, release, temperature, production threshold/tolerance or production oracle mutation. State how material diff inspection and exact-head execution preserve independent qualification and Owner-only merge authority.
