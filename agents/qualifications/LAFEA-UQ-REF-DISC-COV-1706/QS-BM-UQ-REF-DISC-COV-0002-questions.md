# QS-BM-UQ-REF-DISC-COV-0002 — takeover qualification questions

STATUS: CURRENT
SCOPE: QSCOPE-1706-LAFEA-UQ-REFERENCE-DISC-COV
QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_BASIS_HEAD: 831efbf380cba39d3d3f76b3518daf7fa3207941
QUALIFICATION_PROFILE: GENERAL_ENGINEERING
QUALIFICATION_PROFILE_VERSION: 2
QUESTION_AUTHOR_ID: chatgpt:6f455c8e-2011-4c75-976f-9d17899f5754
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: github:reallaksh19/Advanced_Analysis#1706/Q1-Q5
OWNER_QUALIFICATION_BASELINE_MANIFEST: agents/chains/LAFEA-UQ-REF-DISC-COV-1706/qualification-baselines/QB-ISSUE-1706-A.json
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED
QUESTION_PACK_ACTION: REFRESHED
DISPLAY: SHOW
DISPLAY_BASIS: `proceed next`
CANDIDATE_CONSTRAINT: candidate must differ from QUESTION_AUTHOR_ID and independent verifier; this author must not self-qualify or self-verify.

## Q1 — Production Trace

**Repository anchors:** `validation/lafea-benchmark-data/UQ/reference/UQ-REF-CORRELATED-MODEL-DISCREPANCY-01.json`; `scripts/lib/lafea-uq-reference-correlated-model-discrepancy.mjs`; `scripts/lafea-uq-reference-correlated-model-discrepancy-check.mjs` at `QUALIFICATION_BASIS_HEAD`.

**Domain challenge:** Trace the frozen synthetic source data through the correlated propagation path for H1 without allowing the H1 test observation to influence the prediction distribution.

**Exact repository data required:** factor marginal/source, discrepancy marginal/source, `rho_BD`, `Cov(B,D)`, covariance matrix, H1 pair/provenance, interval convention, residual convention, and production-authority flags.

**Concrete payload:** `B~N(1.05,0.02^2)`, `D~N(-1.5,3^2)`, `rho_BD=0.3`, `Cov(B,D)=0.018`, covariance matrix `[[0.0004,0.018],[0.018,9]]`, H1 `m=110`, `test=112`, `z_0.975=1.959963984540054`, propagation `Y=B*m+D`, cross-term convention `2mCov(B,D)`.

**Required derivation:** Independently derive `Cov(B,D)=rho*sigma_B*sigma_D`, the covariance determinant, H1 factor variance, discrepancy variance, covariance cross-term, combined variance, mean, SD, 95% interval, and standardized residual. Then identify the exact point after which `test=112` may enter the computation.

**Required numerical/technical evidence:** Reproduce `Cov=0.018`, determinant `0.003276`, H1 factor variance `4.84`, discrepancy variance `9`, cross-term `3.96`, total variance `17.8`, mean `114`, SD `4.219004621945797`, interval `[105.73090289037822,122.26909710962178]`, residual `-0.47404546313997725`.

**First authority/ownership boundaries:** frozen fixture/oracle and issue basis own reference inputs; implementation consumes them; holdout test values are diagnostics only; production authorities remain false/NONE.

**Fail if:** any prediction moment/interval is fitted from `test=112`, covariance is inferred from holdouts, or reference execution authority is promoted into production authority.

## Q2 — Current Unresolved Problem / Failure Isolation

**Repository anchors:** same three #1706 material files at `831efbf380cba39d3d3f76b3518daf7fa3207941`, especially `validateCovariancePlan()` and the per-pair variance loop.

**Domain challenge:** Isolate a checker disagreement using an exact H3 reconstruction and a covariance-sign falsifier.

**Exact repository data required:** H3 `m=175`, `test=187`, `sigma_B=0.02`, `sigma_D=3`, `rho=0.3`, `Cov=0.018`; sign-control `rho=-0.3`, `Cov=-0.018`, covariance matrix `[[0.0004,-0.018],[-0.018,9]]`.

**Concrete payload:** positive-covariance equation `Var(Y)=m^2 sigma_B^2 + sigma_D^2 + 2mCov`; sign-reversed control changes only covariance-dependent variance/interval terms, not the mean or marginal variance terms.

**Calculation/reconstruction:** For H3 derive the positive case and sign-reversed case from first principles. Positive case must give factor variance `12.25`, discrepancy variance `9`, cross-term `6.3`, total `27.55`, SD `5.248809388804284`, mean `182.25`, residual `0.9049671360007385`. Sign reversal must give cross-term `-6.3` and total variance `14.95`, with the same mean and marginal variance terms.

**Required derivation:** Show the arithmetic and then map any mismatch to the earliest boundary in this order: source transcription -> rho/covariance consistency -> matrix symmetry/PD -> semantic ID/unit binding -> `2mCov` sign/factor -> component arithmetic -> variance sum -> interval/residual arithmetic -> causality -> authority leakage.

**Predicted intermediate values:** `rho*sigma_B*sigma_D=0.018`; determinant remains `0.003276` under sign reversal; H3 cross-terms `+6.3/-6.3`; H3 totals `27.55/14.95`.

**First wrong boundary:** must be identified from evidence; do not jump directly to the final interval or change frozen inputs.

**Falsifier:** if changing only the covariance sign changes propagated mean, factor variance, or discrepancy variance, the implementation violates the authorized causal structure.

**Fail if:** the candidate tunes marginals/rho/test data/quantile to obtain PASS, omits the factor 2, or accepts an indefinite/inconsistent covariance matrix.

## Q3 — Authority / Invariant

**Repository anchors:** #1706 fixture authority fields; `validateAuthority()` in `scripts/lib/lafea-uq-reference-correlated-model-discrepancy.mjs`; `agents/chains/LAFEA-UQ-REF-DISC-COV-1706/issue-basis/IB-0001.md`; parent #1673 authority boundary.

**Domain challenge:** Prove exactly what the reference path authorizes and what it cannot authorize.

**Exact repository data required:** `referenceCorrelatedModelDiscrepancyExecutionAuthorized=true`; production correlation/model-discrepancy/calibration/statistical/sensitivity/validation/code-design flags all `false`; production numeric stochastic-source count `0`; reliability-target authority `NONE`; B03/release/temperature `false`; production blocker `ENGINEERING_POPULATION_APPLICABILITY_REQUIRED`.

**Concrete payload:** synthetic `rho_BD=0.3` and `Cov(B,D)=0.018`; observed holdout diagnostic coverage `4/4=1.0`; universal production coverage target `null`.

**Required derivation:** Trace these fields through fixture -> `authorityFromCorrelatedReferenceCase()` -> `validateAuthority()`. Explain why neither `rho=0.3` nor `4/4` can become a production correlation model, coverage target, calibration distribution, validation acceptance criterion, reliability target, or release authority.

**Authority/source trace:** Owner issue/Issue Basis -> frozen synthetic fixture -> reference checker. No production source/oracle authority is created.

**Protected invariant:** production authorities stay false/NONE and source count stays 0 regardless of reference PASS/FAIL.

**First wrong boundary:** the first fixture/helper/checker location that would permit an authority flag or production target to become permissive.

**Falsifier:** setting any production authority true, changing source count above 0, or using holdouts to estimate rho/covariance must fail closed.

**Invalid shortcut:** treating `referenceCorrelatedModelDiscrepancyExecutionAuthorized=true` as production statistical authority.

**Fail if:** authority separation is described only conceptually without exact fields/anchors, or diagnostic coverage is represented as production evidence.

## Q4 — Independent Validation

**Repository anchors:** frozen #1706 fixture; predecessor #1704 independent-discrepancy reference; predecessor #1702 factor-only calibration reference. The implementation under test is not the oracle.

**Domain challenge:** Construct an independent analytical oracle for all four holdouts and prove both predecessor reductions.

**Exact repository data required:** `m=[110,140,175,220]`, tests `[112,146,187,239]`, `mu_B=1.05`, `sigma_B=0.02`, `mu_D=-1.5`, `sigma_D=3`, `rho=0.3`, `Cov=0.018`, matrix `[[0.0004,0.018],[0.018,9]]`, `z=1.959963984540054`.

**Concrete payload:** expected covariance determinant `0.003276`; cross-terms `[3.96,5.04,6.3,7.92]`; total variances `[17.8,21.88,27.55,36.28]`; means `[114,145.5,182.25,229.5]`. Independence control is `rho=0`, `Cov=0`, matrix `[[0.0004,0],[0,9]]`. Factor-only control also sets discrepancy mean/SD and covariance to zero.

**Calculation/reconstruction:** By hand/independent arithmetic compute determinant/PD, every factor variance, discrepancy variance, cross-term, total variance, SD, interval and residual. Then set `rho=0` and show exact reduction to #1704 combined variances `[13.84,16.84,21.25,28.36]`. Finally set discrepancy mean/SD and covariance to zero and show #1702 means `[115.5,147,183.75,231]` and SDs `[2.2,2.8,3.5,4.4]`.

**Required derivation:** explicitly use `Cov=rho*sigma_B*sigma_D` and `Var(Bm+D)=m^2 Var(B)+Var(D)+2mCov(B,D)`; derive intervals/residuals from the combined SD only.

**Independent oracle:** analytical hand reconstruction from the frozen distributions/equations and predecessor qualified references; never copy expected values from current checker output.

**Required numerical/technical evidence:** reproduce full #1706 vectors: SDs `[4.219004621945797,4.6776062254106,5.248809388804284,6.023288138550239]`, lower `[105.73090289037822,136.33206026433487,171.9625226362279,217.69457217993423]`, upper `[122.26909710962178,154.66793973566513,192.5374773637721,241.30542782006577]`, residuals `[-0.47404546313997725,0.10689228120225319,0.9049671360007385,1.5772116129059335]`.

**Units/sign/tolerance:** unit `REFERENCE_QOI`; covariance cross-term sign follows covariance sign; numeric comparison tolerance may be software-level but must not redefine the frozen engineering/statistical oracle.

**Falsifier:** expected covariance effects or intervals generated from the implementation under test, or fitted from holdouts, are invalid qualification evidence. Zero discrepancy SD with nonzero rho/covariance is also invalid.

**Fail if:** determinant/PD is not checked, reductions are approximate instead of exact within reconstruction tolerance, or the implementation output is used as the independent oracle.

## Q5 — Next Contribution / Minimal Patch

**Repository anchors:** #1706 EP-0002/LEG-001, PR #1707, the three material files, owner command history, and current K7 `NOT_RUN` state.

**Domain challenge:** Define the smallest safe action after takeover qualification without converting a validation result into unauthorized material scope.

**Exact repository data required:** PR #1705 merged as `8da6ae56f6f8632892ec532fbfe2534552355374`; LEG-001 material head `f6b692b3c234675532f645c6de6d4468960239ba`; qualification basis `831efbf380cba39d3d3f76b3518daf7fa3207941`; K7 checker `node scripts/lafea-uq-reference-correlated-model-discrepancy-check.mjs` is `NOT_RUN`; live-main drift must be reconciled only after independent takeover PASS.

**Concrete payload:** allowed material domain remains only the frozen correlated reference fixture, narrow covariance-aware analytical/checker utility, reduction/invariance/causality controls, and structured fail-closed cases. Solver/mesh/recovery, production UQ registries/distributions, Owner roadmaps, code/design basis, B03, reliability target, production tolerance/coverage target, release and temperature authority are protected.

**Required derivation:** State the decision tree for K7: (a) if the exact-head checker PASSes after qualification/reconciliation, no material patch is justified; retain PASS evidence and reconcile only. (b) if it FAILs, isolate the first wrong boundary using Q2/Q4 before proposing any patch. (c) if the frozen oracle/source/authority itself is contradicted, stop for Owner/source authority rather than editing it to pass.

**Safe patch boundary:** only a demonstrably defective implementation/checker location inside the already authorized reference-only domain; frozen independent oracle values and production authority boundaries are not patch targets merely because execution fails.

**Expected before/after evidence:** before = K7 `NOT_RUN` or reproducible FAIL with first wrong boundary; after = exact final-head checker PASS plus preserved predecessor reductions, covariance-sign causality, 63 fail-closed negatives, and all production authorities unchanged.

**Protected unchanged domains:** solver formulation, mesh/recovery, production statistical models, production source count, reliability/code/design-basis authority, roadmaps, B03, release, temperature, and frozen holdout-derived-parameter prohibitions.

**Validation required:** exact final-head checker; independent Q4 reconstruction; `rho=0` reduction to #1704; factor-only reduction to #1702; covariance-sign control; zero-combined applicability; fail-closed matrix; truthful PR/check/review state.

**Negative test:** an inconsistent covariance such as `rho=0.3`, `sigma_B=0.02`, `sigma_D=3` but `Cov=0.012` must fail as `CORRELATION_COVARIANCE_MISMATCH`; a non-symmetric matrix must fail as `NON_SYMMETRIC_COVARIANCE_MATRIX`.

**Rollback/falsifier boundary:** any proposed patch that changes frozen inputs/oracle merely to make the checker pass, weakens a negative case, or grants production authority is invalid and must be abandoned.

**No-patch condition:** checker PASS with independent oracle agreement, or failure located in unsupported/unauthorized source/oracle/production assumptions rather than an implementation defect.

**Fail if:** the candidate treats K7 execution itself as permission to broaden material scope, patches before isolating the failure, or claims merge/release authority from PASS.
