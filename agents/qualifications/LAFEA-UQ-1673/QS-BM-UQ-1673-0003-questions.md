# Qualification questions — BM-UQ #1673 / U1 candidate-source selection

QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1673-LAFEA-UQ-U1-CANDIDATE-SOURCE-SELECTION
QUESTION_SET_ID: QS-BM-UQ-1673-0003
QUESTION_SET_STATUS: CURRENT
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: Issue #1673, retained U0/U1 contracts, B02A definition, JCSS candidate reliability references
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED

## Q1 — Applicability trace

Reconstruct the difference between the deterministic B02A material definition and an external statistical prior.

B02A fixes E = 200000 MPa and nu = 0.3 but does not identify a material grade/specification, manufacturing process, product form, heat/lot population or inspection basis. A JCSS structural-steel example provides a lognormal modulus-of-elasticity model with mean 200000 MPa and COV 0.03. Explain why numerical agreement of the mean does not prove applicability to B02A.

Required result: external data may be retained as a candidate reference prior while `numericStochasticParameterAuthority` remains false until the source population matches an explicitly identified engineering context.

## Q2 — Source conflict / selection isolation

If two credible sources provide different distributions or scatter for the same physical input, do not average, choose the smaller COV, or select the source that yields a favorable result. Isolate differences in material grade, product form, manufacturing route, temperature, test method, population, age and quality-control regime. Retain both as candidates if necessary and require an explicit applicability decision.

## Q3 — Authority invariant

A candidate prior is not a production stochastic model. Candidate numerical values must never populate `uncertainty-models.json` active fields unless:
1. the deterministic model's material/load/geometry/boundary context is identified;
2. the candidate source population is demonstrably applicable or an explicit engineering prior-selection authority is recorded;
3. source provenance and any transformation are retained;
4. dependency/correlation assumptions are separately authorized.

No benchmark nominal value, observed FEA response or matching mean may satisfy this gate.

## Q4 — Independent validation

For any adopted future lognormal prior specified by arithmetic mean m and COV v, independently reconstruct the log-space parameters:

sigma_ln^2 = ln(1 + v^2)
mu_ln = ln(m) - 0.5 sigma_ln^2

and verify reconstructed arithmetic mean and variance. Reject non-positive means, negative COV, unsupported unit conversions, or hidden truncation. For any normal geometric prior, verify dimensional units and any physical truncation separately rather than assuming unbounded normal support is always acceptable.

## Q5 — Minimal patch

LEG-003 is limited to:
- retain candidate external source metadata and exact cited numerical prior(s);
- retain an applicability/source-selection requirement matrix;
- add a fail-closed checker proving candidate priors cannot activate production stochastic execution;
- update source-registry metadata and chain/Issue custody.

NO-PATCH boundary:
- do not populate active U1 stochastic input fields;
- do not declare B02A to be structural steel without source authority;
- do not invent material grade, fabrication tolerance, load distribution, boundary-condition variability or correlations;
- do not start U2 sensitivity;
- do not select Pf/beta targets or code allowables;
- do not change solver/mesh/recovery/oracle/tolerances, B03 ordering, release or temperature authority.
