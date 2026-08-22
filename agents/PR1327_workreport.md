# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: QUALIFICATION_GATE_AUTHORED_EXECUTION_ENVIRONMENT_BLOCKED`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: 1d08bcd0fdebc86fc2daaeb752f129b877e01c74`
- `LAST_CODE_HEAD: 1cb4298d31679569df30c91dc7a9c70c476c1f01`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE_UNTIL_EXACT_HEAD_REQUALIFICATION_RECORD_IS_EXECUTED_AND_REVIEWED`

## Assignment
Execute and bind exact-head post-source-authority WRC 537 gamma=5, delta-p=0 route requalification after merged PR #1325. Independent oracle, production candidate comparison, full eight-point/component matrix, exact authority/source/dataset/qualification hashes, and product-path qualification are mandatory before any bounded production-route authorization may be considered.

## Protected boundaries
- Current production route remains suspended by `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`.
- Candidate qualification hash remains `9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7`.
- Historical active qualification remains `3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e` until a later explicit authorization change is separately reviewed.
- Frozen post-authority oracle hash remains `60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18`.
- Historical Au near 72.6728 MPa is comparison evidence only, not authorization.
- This PR does not broaden unsupported scope and does not alter route/registry authorization constants.

## Ground truth audit
The pre-existing chain was already numerically substantial:
- `scripts/emp1-wrc-gamma5-post-authority-independent-refreeze.mjs` independently reconstructs the frozen physical/Table-5 oracle from source-controlled WRC extraction and independent oracle modules, including source/interpretation/sign hashes and the current 1B/2B eight-point longitudinal-moment authority.
- `scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs` asserts `productionImports.length === 0` and imports the post-authority refreeze under the independent-oracle gate.
- `scripts/emp1-wrc-gamma5-post-authority-refreeze-falsifiers.mjs` covers physical/statics, source-arm, force/moment, historical off-axis 1B-1/2B-1, and sign corruptions.
- `scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs` already compares the current production candidate to the frozen post-authority oracle across all 32 stress values and verifies the physical WRC load package, while requiring the live route to remain suspended.
- `scripts/emp1-wrc-gamma5-route-requalification-candidate-check.mjs` binds candidate qualification v2 to current source authorities but intentionally leaves production observation/registration false.

The missing control was one executable exact-head observation tying those independent/production/product checks to the same Git commit and a reviewable evidence record.

## Implemented in PR1327

### 1. Exact-head requalification observation gate
Added `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`.

The gate:
- requires `--expected-head <40-char SHA>` or `EMP1_EXPECTED_HEAD_SHA`;
- verifies `git rev-parse HEAD` exactly matches that SHA;
- verifies candidate v2 semantic hash/status remains pending and non-authorizing;
- executes the independent oracle decoupling gate and captures both decoupling + post-authority refreeze records;
- executes independent post-authority falsifiers;
- executes candidate-binding qualification;
- executes PR #1325 route-authority-currentness falsifiers;
- executes EMP.1 workbench product qualification;
- executes complete source-only sample qualification;
- independently re-observes the production candidate using the frozen physical benchmark;
- verifies 6/6 WRC load components exactly;
- compares 4 stress families x 8 Table-5 locations = 32/32 numerical values;
- records per-comparison actual/expected/delta/tolerance, maximum absolute/relative drift and the governing tolerance ratio;
- uses explicit tolerance policy `max(1e-12, max(1, |expected|) * 1e-11)`;
- records exact source/dataset/load-producer/independent-authority/candidate/oracle hashes;
- hashes subordinate stdout evidence;
- can write a JSON observation via `--write-record` only after every assertion passes;
- explicitly records `authorizationChangeAppliedByThisObservation: false` and leaves production/global/code/release authority false.

Expected PASS status if executable evidence is green:
`PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED`.

### 2. Observation integrity verifier
Added `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`.

It rejects a committed/reviewed observation unless:
- schema/status are exact;
- observed Git commit exists;
- optional expected observed SHA matches;
- optional `--require-observed-head-parent` proves an evidence-only commit directly follows the observed code head;
- observation semantic hash recomputes exactly;
- candidate/oracle/source/dataset/load-producer/independent-authority hashes match controlled artifacts;
- WRC loads are 6/6 with zero drift;
- stresses are 32/32 and `maxToleranceRatio <= 1`;
- subordinate evidence references the correct scripts with SHA-256 stdout hashes;
- PR #1325 product/currentness/sample evidence remains fail-closed;
- observation itself claims no route/global/code/release authorization change;
- live production route is still suspended while the observation is verified.

This separates numerical qualification evidence from any later explicit production-authorization decision.

## Validation evidence
### Static
- Both new scripts were syntax-checked with `node --check` before commit: `PASS_STATIC_SYNTAX`.
- Source review confirms no production/registry authorization constant was changed.

### Hosted exact-head execution
Exact code head: `1cb4298d31679569df30c91dc7a9c70c476c1f01`.

PR-triggered workflow runs were created, including:
- `EMP.1 gamma5 bounded route on current main` run `32586599694`;
- `EMP.1 runEmp1 bounded gamma5 orchestration` run `32586599691`;
- `EMP.1 current-main independent baseline` run `32586599701`.

For run `32586599694`, job `97063788009` reports:
- `status=completed`;
- `conclusion=failure`;
- `steps=null`;
- `logs_url=null`.

A prior exact-head qualification job on commit `bf993fbf39604b2430cb949c65608550cbd00a63` was explicitly rerun via GitHub. The rerun succeeded as an API request but the replacement job again completed with `steps=null` and `logs_url=null` before checkout.

Classification: `NOT_RUN_EXECUTION_ENVIRONMENT`. No repository process executed, so this is neither software FAIL nor PASS.

## Validation classification
- Independent oracle source/decoupling audit: `SOURCE_REVIEW_COMPLETE`, executable run `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Exact-head gate syntax: `PASS_STATIC_SYNTAX`.
- Observation verifier syntax: `PASS_STATIC_SYNTAX`.
- Exact-head 6-load / 32-stress production comparison: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Independent refreeze/falsifiers on PR1327 exact head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Route-authority currentness falsifiers on exact head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Workbench product qualification on exact head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Complete source-only sample qualification on exact head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Full repository regression: `NOT_RUN`.

No unexecuted check is represented as PASS.

## Changed-file ledger
1. `agents/PR1327_workreport.md` — living recovery/evidence/handover record.
2. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs` — exact-commit independent + production + product requalification observation gate.
3. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs` — committed observation integrity/review verifier.

## Exact next action
On an environment that actually executes repository processes, from exact PR code head `1cb4298d31679569df30c91dc7a9c70c476c1f01` run:

```text
node scripts/emp1-wrc-gamma5-exact-head-requalification.mjs \
  --expected-head 1cb4298d31679569df30c91dc7a9c70c476c1f01 \
  --write-record validation/emp1/wrc537-2013/gamma5-zero-dp-exact-head-requalification-observation-v1.json
```

Expected only if every gate passes:
- 6/6 physical WRC load comparisons;
- 32/32 stress comparisons;
- independent production imports = 0;
- candidate hash `9ea591...`;
- oracle hash `607711...`;
- product/currentness/sample qualification PASS;
- route still suspended.

Then commit **only** the generated observation record (plus workreport bookkeeping if required) and verify it with:

```text
node scripts/emp1-wrc-gamma5-requalification-observation-check.mjs \
  --record validation/emp1/wrc537-2013/gamma5-zero-dp-exact-head-requalification-observation-v1.json \
  --expected-observed-head 1cb4298d31679569df30c91dc7a9c70c476c1f01
```

Do not switch the historical active qualification hash, register/authorize the route, or remove the requalification suspension inside this evidence-only PR without a separate explicit reviewed authorization decision and validation of the changed production head.

## Open blockers / risks
- `VAL-1327-01`: no environment has executed the exact-head gate yet.
- `VAL-1327-02`: no generated exact-head observation record exists yet.
- `VAL-1327-03`: hosted GitHub runner repeatedly completes before any step starts.
- `RISK-1327-01`: treating authored gates or historical ~72.67 MPa as production authorization would violate the source/qualification separation.
- `RISK-1327-02`: any later route-authorization code change creates a new production head and requires its own product-path validation; the evidence-only observation must not be used as a blanket future-head authorization.

## Appendix A — takeover qualification
1. Why is `git rev-parse HEAD == --expected-head` mandatory for the observation gate?
2. Which independent gate proves the oracle has zero production imports?
3. Which 6 physical WRC components and 32 stress values are compared?
4. What is the exact tolerance formula and what does `maxToleranceRatio <= 1` mean?
5. Which source, dataset, load-producer, independent-authority, candidate and oracle hashes are retained in the observation?
6. Why does the observation say `boundedRoutePromotionReadyForEngineeringReview` but still leave `authorizationChangeAppliedByThisObservation=false`?
7. Why must a committed observation be verified separately from the run that generated it?
8. How does `--require-observed-head-parent` help prove an evidence-only commit followed the observed code head?
9. Which PR #1325 currentness/product/sample checks are rerun by the exact-head gate?
10. Why must a later route-authorization code change be validated as a new production head rather than inheriting this observation blindly?
11. Which route/global/code/release authorities remain false throughout PR #1327?
