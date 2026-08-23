# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: CURRENT_MAIN_INTEGRATED_FULL_MATRIX_GATE_WITH_ARTIFACT_RETENTION_EXECUTION_ENVIRONMENT_BLOCKED`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: eb6e4c299132644cfd2bddeb5b86dc458524e35d`
- `CURRENT_MAIN_INTEGRATION_COMMIT: 056ccf15d71e3a7cceca327afae949f442f24489`
- `LAST_CODE_HEAD: 560e8217a609e164b6a18fe2d5f462896184bb52`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE_UNTIL_EXECUTABLE_EXACT_HEAD_OBSERVATION_IS_GREEN_AND_REVIEWED`

## Assignment
Execute and bind the post-source-authority WRC 537 gamma=5, delta-p=0 requalification to the exact code tree that is actually executed. Independent oracle, production candidate comparison, complete eight-location/component evidence, source/dataset/qualification hashes, PR #1325 authority-currentness/product/sample controls, and exact commit identity are mandatory before bounded production-route authorization can even be considered.

Issue #1326 originally named `main@1d08bcd0fdebc86fc2daaeb752f129b877e01c74` as the starting base. `main` subsequently advanced twice. Exact-head qualification follows current production integration rather than certifying a stale base.

## Protected engineering boundaries
- Current production route remains suspended by `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`.
- Candidate qualification remains `9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7`.
- Historical active qualification remains `3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e`.
- Frozen post-authority independent oracle remains `60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18`.
- Historical Au near 72.6728 MPa is comparison evidence only, not authorization.
- This PR does not broaden into nonzero dP, general Kn/Kb, other gamma, out-of-domain beta, off-axis/global maxima, nozzle/attachment stresses, WRC 297/nozzle-neck, rectangular/lug approximations, code compliance, or release authority.
- A generated observation may prove numerical/product readiness for engineering review; it must not itself change route/global/code/release authorization.

## Current-main integration history

### Original merged base
- `1d08bcd0fdebc86fc2daaeb752f129b877e01c74` — merged PR #1325.

### First main advance
`main` advanced to `b404fb4d01c9e76caba5034071d506b014d2c3f0` via PR #1322.
- 53 commits ahead of `1d08bcd0...`.
- No path overlap with PR #1327 files.
- Integrated in PR branch by merge commit `c404557e49bb1d71bb3d62d49aea7591d0a0ede6`.

### Second main advance
`main` then advanced to `eb6e4c299132644cfd2bddeb5b86dc458524e35d` via PR #1328.
- 205 commits ahead of `b404fb4d...`.
- Changes are load-calculation / support-load / project-data infrastructure and related qualification assets.
- No direct path overlap with the four pre-existing PR #1327 files.
- Because these changes are part of the actual current production tree, exact-head discipline requires them to be included even without direct file conflict.
- Integrated in PR branch by two-parent merge commit `056ccf15d71e3a7cceca327afae949f442f24489`.

The tree at `056ccf15...` is current `main@eb6e4c...` plus the PR #1327 qualification files. After adding artifact retention, comparison `main@eb6e4c... -> 560e8217...` shows:
- `0` commits behind;
- five effective changed files;
- no unrelated main-side file replaced by an older branch copy.

## Ground-truth audit
The repository already contained the numerical building blocks:
- `scripts/emp1-wrc-gamma5-post-authority-independent-refreeze.mjs` reconstructs the frozen physical/Table-5 oracle from source-controlled WRC extraction and independent oracle modules.
- `scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs` enforces zero production-semantic imports and runs the post-authority refreeze.
- `scripts/emp1-wrc-gamma5-post-authority-refreeze-falsifiers.mjs` falsifies statics/load/sign and historical off-axis 1B-1/2B-1 corruption.
- `scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs` compares the current production candidate to the frozen post-authority oracle over six physical WRC load components and all 32 stress values while requiring the route to stay suspended.
- `scripts/emp1-wrc-gamma5-route-requalification-candidate-check.mjs` binds candidate qualification v2 to current authority closure but deliberately records production observation/registration false.

The missing controls were exact-head binding, full reviewable comparison custody, observation integrity verification, and durable CI evidence retention.

## Implemented

### 1. Exact-head requalification gate
Added `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`.

It:
- requires an explicit 40-character expected Git SHA;
- verifies `git rev-parse HEAD` exactly equals the expected SHA;
- validates the frozen oracle and candidate-v2 semantic custody;
- executes independent decoupling/refreeze and independent falsifiers;
- executes candidate-binding qualification;
- executes PR #1325 route-authority-currentness falsifiers;
- executes EMP.1 workbench product qualification;
- executes the complete source-only qualification sample;
- independently re-observes the production candidate;
- requires six physical WRC load comparisons;
- compares four stress families x eight Table-5 locations = 32 numerical comparisons at `Au, Al, Bu, Bl, Cu, Cl, Du, Dl`;
- uses tolerance `max(1e-12, max(1, |expected|) * 1e-11)`;
- retains every load/stress actual, expected, delta, tolerance and ratio;
- records maximum absolute/relative drift and governing tolerance-ratio row;
- retains source, dataset, load-producer, independent-authority, candidate and oracle hashes plus subordinate stdout SHA-256 evidence;
- writes a JSON observation only after all assertions pass;
- explicitly records `authorizationChangeAppliedByThisObservation: false`.

Expected green observation status:
`PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED`.

### 2. Full-matrix observation verifier
Added `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`.

A source audit found the initial observation contract retained aggregate count/max/governing evidence without retaining all 32 rows. That was insufficient because a verifier could trust `stressComparisonsPassed: 32` without independently checking the matrix. The gap was closed.

Current verifier independently requires/recomputes:
- record schema/status and semantic hash;
- observed commit existence and optional expected observed SHA;
- candidate/oracle/source/dataset/producer/independent-authority hashes;
- canonical WRC load order `P, Vc, Vl, Mc, Ml, Mt`;
- six load expected values and zero absolute drift;
- exact 32-row family/location matrix;
- every expected value from the frozen oracle;
- every tolerance, absolute delta, relative delta and tolerance ratio;
- every row `toleranceRatio <= 1`;
- aggregate max absolute/relative drift and governing row;
- retained stress-intensity vector equals the eight stress-intensity rows;
- subordinate evidence identities/status/stdout hashes;
- PR #1325 product/currentness/sample evidence remains fail-closed;
- observation applies no production/global/code/release authorization change;
- live route remains suspended while verification occurs.

Verifier PASS schema/status:
- `emp1-wrc537-gamma5-requalification-observation-check/v2`;
- `PASS_REQUALIFICATION_OBSERVATION_FULL_MATRIX_INTEGRITY_ROUTE_STILL_SUSPENDED`.

### 3. CI entry hook
Updated `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs`.

This script is already the first repository script executed by `.github/workflows/emp1-gamma5-main-route.yml`.

Under `GITHUB_ACTIONS=true` it:
- requires `GITHUB_SHA`;
- invokes the exact-head gate using the exact checked-out SHA;
- writes `validation/emp1/wrc537-2013/.emp1-gamma5-exact-head-observation.generated.json`;
- immediately verifies that record against the same SHA;
- fails if generation or verification fails;
- does not change production authority.

For a pull-request workflow, the observation therefore binds to the exact GitHub-executed PR integration SHA. A separate later merged-main observation is still required before any production authorization promotion.

### 4. Exact observation artifact retention
Updated `.github/workflows/emp1-gamma5-main-route.yml` because durable evidence custody is directly required by issue #1326.

Immediately after the firewall/exact-head gate, the workflow now uses `actions/upload-artifact@v4` with:
- artifact name `emp1-gamma5-exact-head-requalification-${{ github.sha }}`;
- path `validation/emp1/wrc537-2013/.emp1-gamma5-exact-head-observation.generated.json`;
- `if: always()`;
- `if-no-files-found: ignore`;
- retention 30 days.

Semantics:
- if the exact-head gate passes and writes the record, the exact JSON becomes a reviewable artifact named with the observed Git SHA;
- if the gate does not write the record, artifact upload does not fabricate evidence;
- artifact retention does not alter route/global/code/release authority;
- after review, a genuine observation may be committed as controlled evidence; never hand-author a PASS record.

## Validation evidence

### Static/source audit
- Full-matrix evidence contract audit: `COMPLETE`.
- CI recursion audit: `COMPLETE`; gate subordinates do not invoke the firewall hook recursively.
- Current-main integration/diff audit through `main@eb6e4c...`: `COMPLETE`.
- Workflow YAML was accepted by GitHub and generated normal workflow runs on code head `560e8217...`; this proves the workflow revision is syntactically accepted by GitHub, not that repository steps executed.
- No route/registry authorization constant changed.

Prior local `node --check` evidence exists for earlier gate/verifier/hook revisions. The latest current-main-integrated/full-matrix/artifact-retention head has not run in a complete repository process environment. Do not promote source review into executable PASS.

### Hosted execution — retention-aware code head
Exact engineering/code head: `560e8217a609e164b6a18fe2d5f462896184bb52`.

PR-triggered workflow runs include:
- gamma5 bounded route run `32614674321`;
- runEmp1 orchestration run `32614674324`;
- independent WRC source oracle run `32614674309`;
- current-main independent baseline run `32614674409`.

Gamma5 job `97133299941` reports:
- `status=completed`;
- `conclusion=failure`;
- `steps=null`;
- `logs_url=null`.

Artifact query for run `32614674321` returns an empty artifact list. That is expected because no job step executed and therefore no exact-head record was generated or uploaded.

Classification: `NOT_RUN_EXECUTION_ENVIRONMENT`, not software FAIL and not PASS.

### Prior current-main integrated attempt
On integration head `c404557e49bb1d71bb3d62d49aea7591d0a0ede6`:
- gamma5 run `32613763202`;
- initial job `97130896080` -> `steps=null`, `logs_url=null`;
- manual rerun job `97130995726` briefly queued, then completed with `steps=null`, `logs_url=null`.

No checkout or repository command executed.

### Alternate local execution
The available local runtime has no mounted complete `Advanced_Analysis` checkout and cannot resolve `github.com` for a network checkout. The GitHub connector exposes file-level repository access and Actions metadata, but not a complete executable checkout/materialization path.

Classification: `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`.

## Validation classification
- Independent/source static audit: `COMPLETE`.
- Current-main integration/diff audit: `COMPLETE`.
- Full 6-load / 32-stress evidence-contract audit: `COMPLETE`.
- Workflow artifact-retention structure accepted by GitHub: `COMPLETE_STATIC_PLATFORM_PARSE`.
- Exact-head observation execution on `560e8217...`: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Observation full-matrix verifier execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Artifact generation/upload: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Independent refreeze/falsifier execution on exact current head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- 6-load / 32-stress production comparison on exact current head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- PR #1325 authority-currentness/product/sample qualification on exact current head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Full regression: `NOT_RUN`.

No unexecuted check is represented as PASS.

## Changed-file ledger
1. `.github/workflows/emp1-gamma5-main-route.yml` — direct evidence-custody change: uploads a successfully generated exact-head observation artifact named by `github.sha`; no production authority change.
2. `agents/PR1327_workreport.md` — living recovery/evidence/handover record.
3. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs` — exact-commit independent + production + product observation gate with full six-load and 32-stress matrices.
4. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs` — independent observation verifier that recomputes complete matrices and aggregate drift metrics.
5. `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs` — one-way CI hook into exact-head gate + verifier.

## Exact next action
When GitHub Actions or another complete repository runtime actually reaches executable steps:

1. Execute the gamma5 workflow on the then-current PR integration tree.
2. Require the first repository script to generate and verify the exact-head observation against checked-out `GITHUB_SHA`.
3. Confirm the workflow uploads artifact `emp1-gamma5-exact-head-requalification-<observed SHA>`.
4. Download the artifact and run:

```text
node scripts/emp1-wrc-gamma5-requalification-observation-check.mjs \
  --record <downloaded-observation.json> \
  --expected-observed-head <observed-sha>
```

5. Require six load rows, 32 stress rows, `maxToleranceRatio <= 1`, independent production imports = 0, candidate `9ea591...`, oracle `607711...`, and `authorizationChangeAppliedByThisObservation=false`.
6. If `main` advances before execution, integrate current main first and move the qualification target forward; never certify a stale base.
7. If PR #1327 is later approved/merged, repeat exact-head observation on the resulting merged-main SHA before any route-authority promotion.
8. Commit a generated observation record only after a real executable run and review. Never hand-author a PASS record.
9. Any later production authorization change must be a separate reviewed change validated on its own exact production head.

For a complete checkout explicitly at current code head `560e8217a609e164b6a18fe2d5f462896184bb52`, the direct command is:

```text
node scripts/emp1-wrc-gamma5-exact-head-requalification.mjs \
  --expected-head 560e8217a609e164b6a18fe2d5f462896184bb52 \
  --write-record validation/emp1/wrc537-2013/gamma5-zero-dp-exact-head-requalification-observation-v1.json
```

## Open blockers / risks
- `VAL-1327-01`: no environment has executed the current exact-head full-matrix gate.
- `VAL-1327-02`: no genuine generated exact-head observation exists.
- `VAL-1327-03`: no exact-head observation artifact exists because hosted jobs terminate before checkout/steps/logs.
- `VAL-1327-04`: local runtime cannot fetch/materialize a complete executable checkout.
- `RISK-1327-01`: authored qualification code and historical ~72.67 MPa must not be interpreted as production authorization.
- `RISK-1327-02`: a PR synthetic integration observation must not be reused as proof for a later distinct merged-main/authorization head.
- `RISK-1327-03`: aggregate PASS counters without the full matrix are insufficient; source contract is fixed but still requires execution.
- `RISK-1327-04`: stale-base qualification is invalid; repeated main integration is mandatory while this PR remains open.
- `RISK-1327-05`: artifact retention is transitional evidence custody, not permanent authorization. A reviewed genuine record must be committed or otherwise controlled before future promotion.

## Appendix A — takeover qualification
1. Why must exact-head qualification follow current `main` when the issue’s original base has advanced?
2. What does `CURRENT_MAIN_INTEGRATION_COMMIT=056ccf15...` contain?
3. Why must `git rev-parse HEAD` equal the explicit expected SHA before observation generation?
4. Which gate proves the independent oracle has zero production-semantic imports?
5. Which six WRC components are retained and independently checked?
6. Which four stress families and eight Table-5 locations form the 32-row matrix?
7. What is the tolerance formula and what does `maxToleranceRatio <= 1` mean?
8. Why is `stressComparisonsPassed: 32` without the 32 rows insufficient engineering evidence?
9. Which source/dataset/producer/independent-authority/candidate/oracle hashes are retained?
10. Why may an observation be ready for engineering review while `authorizationChangeAppliedByThisObservation=false`?
11. Why is the generated observation verified separately after generation?
12. Why was the workflow YAML change justified in this PR?
13. What exactly does the artifact name bind to, and why is that useful for custody?
14. Why does `if-no-files-found: ignore` not weaken the gate?
15. Which PR #1325 authority-currentness/product/sample controls are rerun?
16. Why does a later production authorization change require validation as a new exact production head?
17. Which production/global/code/release authorities remain false throughout PR #1327?
