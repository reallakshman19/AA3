# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: EXACT_HEAD_GATE_WIRED_EXECUTION_ENVIRONMENT_BLOCKED`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: 1d08bcd0fdebc86fc2daaeb752f129b877e01c74`
- `LAST_CODE_HEAD: 1c826c020fac0d724042a1cf036b53d88478785b`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE_UNTIL_EXECUTABLE_EXACT_HEAD_OBSERVATION_IS_GREEN_AND_REVIEWED`

## Assignment
Execute and bind the post-source-authority WRC 537 gamma=5, delta-p=0 requalification to the exact code that is executed. Independent oracle, production candidate comparison, full eight-point/component matrix, authority/source/dataset/qualification hashes, and PR #1325 product-path/currentness controls are mandatory before any bounded production-route authorization is considered.

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
- `scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs` compares the current production candidate to the frozen post-authority oracle over 6 physical WRC load components and all 32 stress values while requiring the live route to stay suspended.
- `scripts/emp1-wrc-gamma5-route-requalification-candidate-check.mjs` binds candidate qualification v2 to current authority closure but deliberately records production observation/registration false.

The missing control was a single executable exact-head observation binding the independent, production and product-path checks to one Git commit and a separately verifiable record.

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
- requires 6/6 physical WRC load comparisons and 32/32 stress comparisons across `Au, Al, Bu, Bl, Cu, Cl, Du, Dl` for circumferential, longitudinal, shear and stress intensity;
- records actual/expected/delta/tolerance and governing drift;
- uses tolerance `max(1e-12, max(1, |expected|) * 1e-11)`;
- retains source, dataset, load-producer, independent-authority, candidate and oracle hashes plus subordinate stdout SHA-256 evidence;
- can write an observation record only after all assertions pass;
- explicitly records `authorizationChangeAppliedByThisObservation: false`.

Expected green status:
`PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED`.

### 2. Observation integrity verifier
Added `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`.

It rejects a generated/committed observation unless:
- schema/status and semantic hash are exact;
- observed commit exists and optional expected observed SHA matches;
- candidate/oracle/source/dataset/producer/independent-authority hashes match controlled artifacts;
- physical loads are 6/6 with zero drift;
- stresses are 32/32 with `maxToleranceRatio <= 1`;
- subordinate evidence script identities/status/stdout hashes are present;
- product/currentness/sample evidence remains fail-closed;
- observation itself applies no production/global/code/release authorization change;
- live route remains suspended while verification occurs.

### 3. Existing gamma5 workflow now invokes the exact-head gate without YAML changes
Updated `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs`, which is already the first executable step of `.github/workflows/emp1-gamma5-main-route.yml`.

Behavior:
- normal/local execution remains the existing oracle import firewall;
- only when `GITHUB_ACTIONS=true`, it requires `GITHUB_SHA`;
- invokes the exact-head requalification gate using the exact checked-out `GITHUB_SHA`;
- writes an ephemeral observation record inside the runner workspace;
- immediately runs the observation integrity verifier against the same SHA;
- propagates gate/verifier stdout and fails the workflow if either fails;
- does not modify workflow YAML, commit the generated evidence, or alter route authority.

For `pull_request`, `GITHUB_SHA` is the exact synthetic merge commit checked out by GitHub Actions. This is valid evidence for the exact executed PR merge tree, but it is not a substitute for a later observation on the final merged `main` commit before production authorization promotion.

## Validation evidence

### Static
- Exact-head gate: prior `node --check` = `PASS_STATIC_SYNTAX`.
- Observation verifier: prior `node --check` = `PASS_STATIC_SYNTAX`.
- New CI hook in import-firewall script: local isolated `node --check` = `PASS_STATIC_SYNTAX`.
- Source review: no route/registry authorization constant changed.

### Hosted execution attempts
Previous exact code head `1cb4298d31679569df30c91dc7a9c70c476c1f01`:
- gamma5 run `32586599694`, job `97063788009` -> `steps=null`, `logs_url=null`.
- prior job on `bf993fbf...` was explicitly rerun; replacement job again completed before checkout with `steps=null`, `logs_url=null`.

Current CI-wired exact code head `1c826c020fac0d724042a1cf036b53d88478785b`:
- `EMP.1 gamma5 bounded route on current main` run `32587898940`;
- job `97066970454` -> `status=completed`, `conclusion=failure`, `steps=null`, `logs_url=null`.

Therefore the newly wired exact-head gate did **not** execute. Classification is `NOT_RUN_EXECUTION_ENVIRONMENT`, not software FAIL and not PASS.

### Alternate local execution
The available local runtime cannot resolve `github.com`; `git ls-remote` fails before checkout. The GitHub connector exposes repository files and Actions artifacts, but no repository archive/materialization capability. Therefore a complete exact repository cannot be materialized into the local runtime through available tools.

Classification: `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`.

## Validation classification
- Independent/source static audit: `COMPLETE`.
- Exact-head gate syntax: `PASS_STATIC_SYNTAX`.
- Observation-verifier syntax: `PASS_STATIC_SYNTAX`.
- Existing-workflow CI hook syntax: `PASS_STATIC_SYNTAX`.
- Exact-head observation execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Independent refreeze/falsifier execution on current head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- 6-load / 32-stress production comparison on current head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- PR #1325 authority-currentness/product/sample qualification on current head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Full regression: `NOT_RUN`.

No unexecuted check is represented as PASS.

## Changed-file ledger
1. `agents/PR1327_workreport.md` — living recovery/evidence/handover record.
2. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs` — exact-commit independent + production + product observation gate.
3. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs` — observation integrity verifier.
4. `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs` — CI-only one-way hook from the existing gamma5 workflow into the exact-head gate + verifier; no workflow YAML change.

## Exact next action
When GitHub Actions or another complete repository runtime actually reaches executable steps:

1. On the PR workflow, the existing gamma5 job now automatically executes the exact-head observation using its checked-out `GITHUB_SHA`, writes the ephemeral record, and verifies it in the same step.
2. Capture the exact observation JSON/stdout and confirm 6/6 physical loads, 32/32 stresses, independent imports 0, candidate `9ea591...`, oracle `607711...`, and `authorizationChangeAppliedByThisObservation=false`.
3. If PR #1327 is later approved/merged, repeat the exact-head observation on the resulting **merged main commit** before any route-authority promotion.
4. Commit a generated observation record only after a real executable run. Never hand-author a PASS record.
5. Any later production authorization change must be a separate reviewed change and must itself be validated on its new exact production head.

## Open blockers / risks
- `VAL-1327-01`: no environment has executed the exact-head gate.
- `VAL-1327-02`: no genuine generated exact-head observation record exists.
- `VAL-1327-03`: GitHub hosted jobs repeatedly terminate before checkout/steps/logs.
- `VAL-1327-04`: local runtime cannot fetch/materialize the repository.
- `RISK-1327-01`: authored qualification code and historical ~72.67 MPa must not be interpreted as production authorization.
- `RISK-1327-02`: a PR synthetic merge-head observation must not be reused as proof for a later distinct merged-main/authorization head.

## Appendix A — takeover qualification
1. Why must `git rev-parse HEAD` equal the explicit expected SHA before any observation is accepted?
2. What does `GITHUB_SHA` identify on a pull-request workflow, and why is a later merged-main observation still required?
3. Which gate proves the independent oracle has zero production-semantic imports?
4. Which 6 WRC loads and 32 stress comparisons are mandatory?
5. What is the exact tolerance formula and meaning of `maxToleranceRatio <= 1`?
6. Which source/dataset/producer/independent-authority/candidate/oracle hashes are retained?
7. Why may the observation say `boundedRoutePromotionReadyForEngineeringReview=true` while `authorizationChangeAppliedByThisObservation=false`?
8. Why is the observation verified separately after generation?
9. Why is the CI hook placed in the existing import-firewall entry script rather than modifying workflow YAML?
10. Which PR #1325 currentness/product/sample controls are rerun by the gate?
11. Why does a later route-authorization code change require validation as a new exact production head?
12. Which production/global/code/release authorities remain false throughout PR #1327?
