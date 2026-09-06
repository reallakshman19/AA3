# QS-BM-UQ-REF-CAL-UNC-0001 — qualification questions

STATUS: CURRENT
SCOPE: QSCOPE-1702-LAFEA-UQ-REFERENCE-CALIBRATION-UNCERTAINTY
ISSUE: 1702
PARENT: 1673
PREDECESSOR: 1699 / PR 1700 merged `f62abea09dfc1da1d6412525790bc73a2fa8f6e7`

## Q1 — trace
Trace:
`frozen factor distribution + factor provenance + deterministic holdout IDs/model values + unit + interval definition -> analytical prediction means/SDs -> central interval bounds -> post-construction standardized residual/coverage diagnostics -> retained result`.

Frozen reference:
- `B~Normal(mu=1.05, sigma=0.02)`.
- factor source `SYNTHETIC_REFERENCE_INDEPENDENT_FREEZE`.
- H1..H4 model `[110,140,175,220]`, test `[112,146,187,239]`, unit `REFERENCE_QOI`.
- `Y_i=B*m_i`.
- means `[115.5,147,183.75,231]`.
- SDs `[2.2,2.8,3.5,4.4]`.
- central two-sided normal reference interval, nominal level 0.95, `z=1.959963984540054`.
- lower bounds `[111.18807923401188,141.51210084328784,176.8901260541098,222.37615846802376]`.
- upper bounds `[119.81192076598812,152.48789915671216,190.6098739458902,239.62384153197624]`.
- standardized residuals `[-1.5909090909090908,-0.3571428571428571,0.9285714285714286,1.8181818181818181]`.
- diagnostic coverage `[true,true,true,true]`, fraction 1.0.

Holdout observations are forbidden inputs to factor mean/SD, prediction moments, or interval bounds.

## Q2 — failure isolation
If observed output disagrees with the oracle, isolate in this order:
1. factor family/mean/SD transcription;
2. factor provenance/source binding;
3. holdout semantic ID/model/test/unit binding;
4. propagation equation `Y=B*m`;
5. `|m|*sigma_B` SD scaling;
6. nominal interval level and quantile;
7. interval arithmetic/symmetry;
8. standardized-residual applicability;
9. diagnostic coverage indicator;
10. perturbation causality;
11. production-authority leakage.

Do not alter frozen distribution, quantile, holdout observations, production model, production target, or tolerance to obtain PASS.

## Q3 — authority / invariants
Only isolated reference uncertainty propagation may be authorized.

Preserve:
- `PRODUCTION_CALIBRATION_FACTOR_AUTHORIZED=false`;
- `PRODUCTION_STATISTICAL_EXECUTION_AUTHORIZED=false`;
- active production numeric stochastic-source count `0`;
- `PRODUCTION_SENSITIVITY_AUTHORIZED=false`;
- `PRODUCTION_VALIDATION_ACCEPTANCE_AUTHORIZED=false`;
- production reliability-target authority `NONE`;
- B03 false;
- release false;
- temperature false.

The synthetic `Normal(1.05,0.02^2)` distribution, nominal 0.95 interval, and observed 4/4 coverage are reference-only evidence and cannot become production calibration/coverage authority.

## Q4 — independent validation / falsifiers
Required positive controls:
- exact analytical means and SDs;
- exact interval bounds and symmetry;
- exact semantic holdout permutation;
- post-construction standardized residual and coverage diagnostics;
- zero-factor-SD control: SD=0, interval collapse, standardized residual applicability `NOT_APPLICABLE_ZERO_FACTOR_UNCERTAINTY`;
- holdout-test perturbation changes only residual/coverage diagnostics;
- factor-mean perturbation shifts means/centers but not half-widths for fixed SD;
- factor-SD perturbation changes SD/half-width but not means;
- model perturbation changes its propagated moments/interval deterministically.

Fail closed at minimum for:
1. unsupported factor family;
2. nonfinite factor mean;
3. negative factor SD;
4. nonfinite factor SD;
5. unsupported factor source/provenance;
6. invalid nominal interval level;
7. nonfinite/invalid normal quantile;
8. unsupported interval construction;
9. duplicate holdout ID;
10. missing holdout ID;
11. pair/observation ID mismatch;
12. unit mismatch;
13. nonfinite model value;
14. nonfinite test value;
15. illegal factor mean derived from holdout;
16. illegal factor SD derived from holdout;
17. unsupported standardized-residual convention;
18. missing reference authority;
19. production calibration-factor leakage;
20. production statistical-execution leakage;
21. production stochastic-source leakage;
22. production sensitivity leakage;
23. production validation-acceptance leakage;
24. production reliability-target leakage;
25. B03 leakage;
26. release leakage;
27. temperature leakage.

Falsifier: any expected interval, factor uncertainty, or coverage target derived from implementation output under test or from holdout observations is invalid qualification evidence.

## Q5 — minimal patch
One bounded LEG-001 may add only:
- frozen calibration-factor uncertainty reference definition/oracle;
- narrow analytical propagation/checker utility;
- zero-uncertainty, semantic permutation, and causal perturbation controls;
- structured fail-closed cases;
- append-only chain/material receipt custody.

Not authorized:
- production UQ/calibration registry;
- production factor distribution or correction factor;
- production coverage target/tolerance/oracle;
- solver/mesh/recovery changes;
- benchmark sequencing/program authority changes;
- governing roadmap mutation;
- B03 activation;
- code/reliability target qualification;
- release or temperature changes.

Owner progression command `proceed next` authorizes this single bounded leg after prework synchronization only.
