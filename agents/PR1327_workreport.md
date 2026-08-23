# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: CURRENT_MAIN_INTEGRATED_FULL_MATRIX_GATE_EXECUTION_ENVIRONMENT_BLOCKED`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: b404fb4d01c9e76caba5034071d506b014d2c3f0`
- `LAST_CODE_HEAD: c404557e49bb1d71bb3d62d49aea7591d0a0ede6`
- `PR1327_PRE_MAIN_INTEGRATION_CODE_HEAD: 8fe7a13704b2c8362c0ac07e5d638e4391900c56`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE_UNTIL_EXECUTABLE_EXACT_HEAD_OBSERVATION_IS_GREEN_AND_REVIEWED`

## Assignment
Execute and bind the post-source-authority WRC 537 gamma=5, delta-p=0 requalification to the exact code that is executed. Independent oracle, production candidate comparison, complete eight-location/component evidence, authority/source/dataset/qualification hashes, and PR #1325 product-path/currentness controls are mandatory before bounded production-route authorization is considered.

Issue #1326 originally named merged `main@1d08bcd0fdebc86fc2daaeb752f129b877e01c74` as the starting base. `main` subsequently advanced. Exact-head qualification must follow the actual current production integration tree rather than continue certifying a stale base.

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

## Current-main integration — 2026-08-23
After PR #1327 was opened, `main` advanced from `1d08bcd0...` to:
- `b404fb4d01c9e76caba5034071d506b014d2c3f0` — merge of PR #1322, `LFEA: unify engineering session ownership and CAESAR-style review UI`.

Repository comparison `1d08bcd0... -> b404fb4d...` showed:
- `53` commits ahead;
- `0` behind;
- no overlap with the four PR #1327 changed paths;
- the new main changes are LFEA shell/session/UI/presentation paths and do not modify the EMP.1 route/oracle/currentness files owned by this PR.

To prevent stale-base qualification, the PR branch was integrated with current main by constructing merge commit:
- `c404557e49bb1d71bb3d62d49aea7591d0a0ede6`;
- parent 1: prior PR report head `7433f8e80b86f8f2a6e2f4b510dcaa7e13ebff37`;
- parent 2: current `main@b404fb4d01c9e76caba5034071d506b014d2c3f0`;
- tree: current main tree plus the exact four PR #1327 blobs.

Comparison `main@b404fb4d... -> c404557e...` proves:
- PR branch is `0` commits behind current main;
- effective PR diff is exactly four files;
- no unrelated main-side file is replaced by an older PR branch copy.

`c404557e...` is therefore the current exact engineering/integration head to requalify. Later workreport-only commits may advance the branch head without changing this recorded code head.

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
- retains the full 32-row comparison matrix with family, location, actual, oracle expected, absolute delta, relative delta, tolerance, and tolerance ratio;
- retains the full six-row physical WRC load matrix;
- records maximum absolute/relative drift and the governing tolerance-ratio row;
- retains source, dataset, load-producer, independent-authority, candidate and oracle hashes plus subordinate stdout SHA-256 evidence;
- can write an observation record only after every assertion passes;
- explicitly records `authorizationChangeAppliedByThisObservation: false`.

Expected green status:
`PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED`.

### 2. Observation integrity verifier
Added `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`.

A source audit found that the initial version retained only aggregate stress count/max/governing evidence. That was insufficient because a verifier could trust `stressComparisonsPassed: 32` without rechecking all 32 individual rows. The gap is closed.

Current verifier independently requires/recomputes:
- schema/status and semantic hash;
- observed commit existence and optional expected observed SHA;
- candidate/oracle/source/dataset/producer/independent-authority hashes;
- canonical six WRC component order `P, Vc, Vl, Mc, Ml, Mt`;
- each load expected value against the frozen oracle and recomputed absolute delta = 0;
- exact 32-row matrix in canonical family/location order;
- every row oracle expected value, tolerance, absolute delta, relative delta and tolerance ratio;
- every row `toleranceRatio <= 1`;
- aggregate maximum absolute/relative drift and governing row;
- retained stress-intensity vector equals the eight stress-intensity rows;
- subordinate evidence identities/status/stdout hashes;
- product/currentness/sample evidence remains fail-closed;
- observation applies no production/global/code/release authorization change;
- live route remains suspended while verification occurs.

Verifier PASS schema/status:
- schema `emp1-wrc537-gamma5-requalification-observation-check/v2`;
- status `PASS_REQUALIFICATION_OBSERVATION_FULL_MATRIX_INTEGRITY_ROUTE_STILL_SUSPENDED`.

### 3. Existing gamma5 workflow invokes the exact-head gate without YAML changes
Updated `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs`, already the first executable step of `.github/workflows/emp1-gamma5-main-route.yml`.

Under `GITHUB_ACTIONS=true` it:
- requires `GITHUB_SHA`;
- invokes the exact-head gate against the checked-out SHA;
- writes an ephemeral observation in the runner workspace;
- immediately invokes the observation verifier for the same SHA;
- fails if either gate fails;
- does not modify workflow YAML, commit evidence, or alter route authority.

For `pull_request`, this observes the exact tree GitHub executes. A later merged-main observation is still required before any separate production-route promotion.

## Validation evidence

### Static/source audit
- No PR conversation comments are open on #1327 at the latest check.
- Source-level recursion audit: CI hook -> exact-head gate; gate subordinates do not call the firewall hook again.
- Complete-sample JSON shape matches the exact-head parser.
- Full-diff audit identified and fixed the original missing 32-row evidence matrix.
- Current-main integration has no path overlap with the PR's four files and leaves the branch 0 behind current main.
- No route/registry authorization constant changed.

Prior `node --check` evidence exists for the original gate/verifier/hook revisions. The later full-matrix and current-main-integrated revisions have not executed in a complete repository runtime; do not represent them as executable PASS.

### Hosted execution attempts — current main integrated head
Exact integration head: `c404557e49bb1d71bb3d62d49aea7591d0a0ede6`.

PR workflows created for this head include:
- gamma5 route run `32613763202`;
- runEmp1 orchestration run `32613763262`;
- independent oracle run `32613763215`;
- current-main independent baseline run `32613763235`.

Initial gamma5 job `97130896080`:
- `status=completed`;
- `conclusion=failure`;
- `steps=null`;
- `logs_url=null`.

A manual rerun was explicitly requested for that exact current-main-integrated job. Replacement job `97130995726` briefly reported `status=queued`, then completed with:
- `conclusion=failure`;
- `steps=null`;
- `logs_url=null`.

No checkout or repository command executed in either attempt. Classification: `NOT_RUN_EXECUTION_ENVIRONMENT`, not software FAIL and not PASS.

Earlier code/report heads showed the same no-step runner behavior. One prior job rerun also reproduced it.

### Alternate local execution
The available local runtime has no mounted `Advanced_Analysis` repository and no `.git` copy. Network checkout cannot resolve `github.com`. The connector exposes repository content and Actions metadata but no complete repository archive/materialization path.

Classification: `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`.

## Validation classification
- Independent/source static audit: `COMPLETE`.
- Current-main integration/diff audit: `COMPLETE`.
- Full-matrix evidence contract audit: `COMPLETE`.
- Exact-head observation execution on `c404557e...`: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Observation full-matrix verifier execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Independent refreeze/falsifier execution on current head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- 6-load / 32-stress production comparison on current head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- PR #1325 authority-currentness/product/sample qualification on current head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Full regression: `NOT_RUN`.

No unexecuted check is represented as PASS.

## Changed-file ledger
1. `agents/PR1327_workreport.md` — living recovery/evidence/handover record.
2. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs` — exact-commit independent + production + product observation gate; retains full six-load and 32-stress matrices.
3. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs` — observation verifier; recomputes complete matrices and aggregate drift metrics.
4. `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs` — CI-only one-way hook from existing gamma5 workflow into exact-head gate + verifier; no workflow YAML change.

## Exact next action
When GitHub Actions or another complete repository runtime actually reaches executable steps:

1. Execute the existing gamma5 workflow on the then-current PR integration tree; its first script automatically runs the exact-head observation against checked-out `GITHUB_SHA` and verifies the generated ephemeral record.
2. Require the generated observation to contain the complete 6-row WRC load matrix and 32-row stress matrix.
3. Confirm 6/6 load rows, 32/32 stress rows, `maxToleranceRatio <= 1`, independent imports 0, candidate `9ea591...`, oracle `607711...`, and `authorizationChangeAppliedByThisObservation=false`.
4. If `main` advances again before qualification executes, integrate current main first and move the exact validation target forward; never certify a stale base.
5. If #1327 is later approved/merged, repeat exact-head observation on the resulting merged `main` SHA before any route-authority promotion.
6. Commit a generated observation record only after a real executable run; never hand-author a PASS record.
7. Any later production authorization change is a separate reviewed change and must be validated on its own new production head.

For a complete local checkout explicitly at the current integration head, the direct command is:

```text
node scripts/emp1-wrc-gamma5-exact-head-requalification.mjs \
  --expected-head c404557e49bb1d71bb3d62d49aea7591d0a0ede6 \
  --write-record validation/emp1/wrc537-2013/gamma5-zero-dp-exact-head-requalification-observation-v1.json
```

## Open blockers / risks
- `VAL-1327-01`: no environment has executed the current-main-integrated exact-head full-matrix gate.
- `VAL-1327-02`: no genuine generated exact-head observation exists.
- `VAL-1327-03`: GitHub hosted jobs repeatedly terminate before checkout/steps/logs, including a manual rerun on the current integration head.
- `VAL-1327-04`: local runtime cannot fetch/materialize the complete repository.
- `RISK-1327-01`: authored qualification code and historical ~72.67 MPa must not be interpreted as production authorization.
- `RISK-1327-02`: a PR execution observation must not be reused as proof for a later distinct merged-main/authorization head.
- `RISK-1327-03`: aggregate PASS counters without the full matrix are insufficient evidence; source gap is closed but executable validation remains required.
- `RISK-1327-04`: continuing qualification on the original `1d08bcd0...` base after main moved would create stale evidence; current-main integration closes this risk for the present head.

## Appendix A — takeover qualification
1. Why must exact-head qualification follow current main when the original issue base has since advanced?
2. What proves `c404557e...` contains current `main@b404fb4d...` plus only the four PR #1327 paths?
3. Why must `git rev-parse HEAD` equal the explicit expected SHA before observation generation?
4. Which gate proves the independent oracle has zero production-semantic imports?
5. Which six WRC components are retained and independently checked?
6. Which four stress families and eight Table-5 locations form the 32-row matrix?
7. What is the exact tolerance formula and what does `maxToleranceRatio <= 1` mean?
8. Why is retaining only `stressComparisonsPassed: 32` insufficient evidence?
9. Which source/dataset/producer/independent-authority/candidate/oracle hashes are retained?
10. Why may the observation say `boundedRoutePromotionReadyForEngineeringReview=true` while `authorizationChangeAppliedByThisObservation=false`?
11. Why is the generated observation verified separately?
12. Why is the CI hook placed in an existing workflow entry script instead of changing workflow YAML?
13. Which PR #1325 currentness/product/sample controls are rerun by the gate?
14. Why does a later route-authorization change require validation as a new exact production head?
15. Which production/global/code/release authorities remain false throughout #1327?
