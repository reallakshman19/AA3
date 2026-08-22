# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: EXACT_HEAD_GATE_FULL_MATRIX_WIRED_EXECUTION_ENVIRONMENT_BLOCKED`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: 1d08bcd0fdebc86fc2daaeb752f129b877e01c74`
- `LAST_CODE_HEAD: 8fe7a13704b2c8362c0ac07e5d638e4391900c56`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE_UNTIL_EXECUTABLE_EXACT_HEAD_OBSERVATION_IS_GREEN_AND_REVIEWED`

## Assignment
Execute and bind the post-source-authority WRC 537 gamma=5, delta-p=0 requalification to the exact code that is executed. Independent oracle, production candidate comparison, complete eight-location/component evidence, authority/source/dataset/qualification hashes, and PR #1325 product-path/currentness controls are mandatory before bounded production-route authorization is considered.

## Protected engineering boundaries
- Current production route remains suspended by `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`.
- Candidate qualification remains `9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7`.
- Historical active qualification remains `3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e`.
- Frozen post-authority independent oracle remains `60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18`.
- Historical Au near 72.6728 MPa is comparison evidence only, not authorization.
- No route/registry authorization constants, global EMP.1.C authority, code-compliance authority, or release authority are changed in this PR.
- Unsupported nonzero dP, general Kn/Kb, other gamma, out-of-domain beta, off-axis/global maxima, nozzle/attachment stresses, WRC 297/nozzle-neck, rectangular/lug and release/code scope remain blocked.

## Ground-truth audit
The repository already contained the engineering/numerical building blocks:
- `scripts/emp1-wrc-gamma5-post-authority-independent-refreeze.mjs` reconstructs the frozen physical/Table-5 oracle from source-controlled WRC extraction and independent oracle modules.
- `scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs` enforces zero production-semantic imports and runs the post-authority refreeze.
- `scripts/emp1-wrc-gamma5-post-authority-refreeze-falsifiers.mjs` falsifies statics/load/sign and historical off-axis 1B-1/2B-1 corruption.
- `scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs` already compares the current production candidate to the frozen post-authority oracle over 6 physical WRC load components and all 32 stress values while requiring the route to stay suspended.
- `scripts/emp1-wrc-gamma5-route-requalification-candidate-check.mjs` binds candidate qualification v2 to current authority closure but deliberately records production observation/registration false.

The missing control was one executable exact-head observation binding the independent, production and product-path checks to one Git commit and a separately verifiable record.

## Implemented

### 1. Exact-head requalification gate
Added `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`.

It:
- requires an explicit 40-character expected Git SHA and verifies `git rev-parse HEAD` exactly;
- validates the frozen oracle and candidate-v2 semantic custody;
- executes independent decoupling/refreeze and independent falsifiers;
- executes candidate-binding qualification;
- executes PR #1325 route-authority-currentness falsifiers, workbench product qualification, and complete source-only sample qualification;
- independently re-observes the production candidate;
- requires 6/6 physical WRC load comparisons;
- compares 4 stress families x 8 Table-5 locations = 32/32 values at `Au, Al, Bu, Bl, Cu, Cl, Du, Dl`;
- uses tolerance `max(1e-12, max(1, |expected|) * 1e-11)`;
- retains the **full 32-row comparison matrix** with family, location, actual, oracle expected, absolute delta, relative delta, tolerance, and tolerance ratio;
- retains the full six-row physical WRC load matrix;
- records maximum absolute/relative drift and the governing tolerance-ratio row;
- retains source, dataset, load-producer, independent-authority, candidate and oracle hashes plus subordinate stdout SHA-256 evidence;
- can write an observation record only after every assertion passes;
- explicitly records `authorizationChangeAppliedByThisObservation: false`.

Expected green status:
`PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED`.

### 2. Observation integrity verifier
Added `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`.

The verifier was strengthened after source audit found that the first version trusted the aggregate `stressComparisonsPassed: 32` without retaining/rechecking the 32 individual rows.

Current verifier requires and independently checks:
- schema/status and semantic hash;
- observed commit existence and optional expected observed SHA;
- candidate/oracle/source/dataset/producer/independent-authority hashes;
- canonical six WRC component order `P, Vc, Vl, Mc, Ml, Mt`;
- each load row expected value against the frozen oracle and recomputed absolute delta = 0;
- exact 32-row matrix in canonical family/location order;
- each row oracle expected value, tolerance, absolute delta, relative delta and tolerance ratio recomputed from the frozen oracle;
- every row `toleranceRatio <= 1`;
- aggregate maximum absolute/relative drift and governing row recomputed from the 32 rows;
- retained stress-intensity vector agrees with the eight stress-intensity rows;
- subordinate evidence identities/status/stdout hashes are present;
- product/currentness/sample evidence remains fail-closed;
- observation applies no production/global/code/release authorization change;
- live route remains suspended while verification occurs.

Verifier PASS schema/status is now:
- schema `emp1-wrc537-gamma5-requalification-observation-check/v2`;
- status `PASS_REQUALIFICATION_OBSERVATION_FULL_MATRIX_INTEGRITY_ROUTE_STILL_SUSPENDED`.

### 3. Existing gamma5 workflow invokes the exact-head gate without YAML changes
Updated `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs`, already the first executable step of `.github/workflows/emp1-gamma5-main-route.yml`.

Under `GITHUB_ACTIONS=true` it:
- requires `GITHUB_SHA`;
- invokes the exact-head gate using the checked-out SHA;
- writes an ephemeral observation in the runner workspace;
- immediately invokes the observation verifier for that same SHA;
- fails if either gate fails;
- does not modify workflow YAML, commit evidence, or alter route authority.

For `pull_request`, this is evidence for the exact tree GitHub executes. A later merged-main observation is still required before any separate production-route promotion.

## Validation evidence

### Static/source audit
- No review threads or PR comments are open on #1327.
- Source-level recursion audit: CI hook -> exact-head gate; gate subordinates do not call the firewall hook again.
- Complete-sample JSON shape matches the exact-head parser.
- Full-diff audit identified and fixed the original missing 32-row evidence matrix.
- No route/registry authorization constant changed.

Prior `node --check` evidence exists for the original gate/verifier/hook revisions. The new full-matrix changes have not executed in a complete repository runtime; do not represent them as executable PASS.

### Hosted execution attempts
Current engineering/code head: `8fe7a13704b2c8362c0ac07e5d638e4391900c56`.

PR-triggered workflow runs were created, including:
- gamma5 route run `32588805852`;
- runEmp1 orchestration run `32588805872`;
- independent oracle run `32588805904`;
- current-main independent baseline run `32588805861`.

Gamma5 job `97069242712` reports:
- `status=completed`;
- `conclusion=failure`;
- `steps=null`;
- `logs_url=null`.

The exact-head full-matrix gate therefore did **not** execute. Classification remains `NOT_RUN_EXECUTION_ENVIRONMENT`, not software FAIL and not PASS.

Earlier code/report heads showed the same runner behavior. A manual GitHub job rerun also created a replacement job that terminated before checkout with `steps=null` and `logs_url=null`.

### Alternate local execution
The available local runtime has no mounted `Advanced_Analysis` repository and no `.git` copy. Network checkout cannot resolve `github.com`. The connector exposes repository content and Actions metadata but no complete repository archive/materialization path.

Classification: `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`.

## Validation classification
- Independent/source static audit: `COMPLETE`.
- Full-matrix evidence contract audit: `COMPLETE`.
- Exact-head observation execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Observation full-matrix verifier execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Independent refreeze/falsifier execution on current head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- 6-load / 32-stress production comparison on current head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- PR #1325 authority-currentness/product/sample qualification on current head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Full regression: `NOT_RUN`.

No unexecuted check is represented as PASS.

## Changed-file ledger
1. `agents/PR1327_workreport.md` — living recovery/evidence/handover record.
2. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs` — exact-commit independent + production + product observation gate; now retains full six-load and 32-stress matrices.
3. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs` — observation verifier; now recomputes the complete matrices and aggregate drift metrics.
4. `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs` — CI-only one-way hook from the existing gamma5 workflow into the exact-head gate + verifier; no workflow YAML change.

## Exact next action
When GitHub Actions or another complete repository runtime actually reaches executable steps:

1. Run the existing gamma5 workflow; its first script automatically runs the exact-head gate against the checked-out `GITHUB_SHA` and verifies the generated ephemeral record.
2. Require the generated observation to contain the complete 6-row WRC load matrix and 32-row stress matrix.
3. Confirm 6/6 load rows, 32/32 stress rows, `maxToleranceRatio <= 1`, independent imports 0, candidate `9ea591...`, oracle `607711...`, and `authorizationChangeAppliedByThisObservation=false`.
4. If #1327 is later approved/merged, repeat exact-head observation on the resulting merged `main` SHA before any route-authority promotion.
5. Commit a generated observation record only after a real executable run; never hand-author a PASS record.
6. Any later production authorization change is a separate reviewed change and must be validated on its own new production head.

## Open blockers / risks
- `VAL-1327-01`: no environment has executed the current exact-head full-matrix gate.
- `VAL-1327-02`: no genuine generated exact-head observation exists.
- `VAL-1327-03`: GitHub hosted jobs repeatedly terminate before checkout/steps/logs.
- `VAL-1327-04`: local runtime cannot fetch/materialize the complete repository.
- `RISK-1327-01`: authored qualification code and historical ~72.67 MPa must not be interpreted as production authorization.
- `RISK-1327-02`: a PR execution observation must not be reused as proof for a later distinct merged-main/authorization head.
- `RISK-1327-03`: aggregate PASS counters without the full matrix are insufficient evidence; this gap is now closed in source but still requires executable validation.

## Appendix A — takeover qualification
1. Why must `git rev-parse HEAD` equal the explicit expected SHA before observation generation?
2. Which gate proves the independent oracle has zero production-semantic imports?
3. Which six WRC components are retained and independently checked?
4. Which four stress families and eight Table-5 locations form the 32-row matrix?
5. What is the exact tolerance formula and what does `maxToleranceRatio <= 1` mean?
6. Why is retaining only `stressComparisonsPassed: 32` insufficient evidence?
7. Which source/dataset/producer/independent-authority/candidate/oracle hashes are retained?
8. Why may the observation say `boundedRoutePromotionReadyForEngineeringReview=true` while `authorizationChangeAppliedByThisObservation=false`?
9. Why is the generated observation verified separately?
10. Why is the CI hook placed in an existing workflow entry script instead of changing workflow YAML?
11. Which PR #1325 currentness/product/sample controls are rerun by the gate?
12. Why does a later route-authorization change require validation as a new exact production head?
13. Which production/global/code/release authorities remain false throughout #1327?
