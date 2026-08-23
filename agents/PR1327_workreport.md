# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: FULL_SUITE_REPLAY_FALSIFIER_MANIFEST_AUTHORED_RUNNER_BLOCKED`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: eb6e4c299132644cfd2bddeb5b86dc458524e35d`
- `CURRENT_MAIN_INTEGRATION_COMMIT: 056ccf15d71e3a7cceca327afae949f442f24489`
- `LAST_ENGINEERING_HEAD: 61f5a52cfb797732bc0b37489bfc647fe94779e5`
- `LATEST_EXECUTION_OBSERVED_HEAD: fc9f6b346bb2aa01f77fdb7cd55834e6857e4b98`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE_UNTIL_EXACT_HEAD_FULL_EVIDENCE_BUNDLE_IS EXECUTED_GREEN_AND_REVIEWED`

## Mission
Execute the post-source-authority WRC 537 gamma=5, delta-p=0 requalification on the exact code tree actually executed. Required evidence must bind the independent oracle, bounded production candidate, six WRC loads, complete 32-row Table-5 stress matrix, source/dataset/qualification hashes, PR #1325 currentness/product/sample controls, exact Git identity, and durable reviewable evidence.

Issue #1326 began at `main@1d08bcd0...`, but current main later moved. Stale-base qualification is prohibited.

## Protected engineering boundary
- Production route remains suspended by `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`.
- Candidate qualification remains `9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7`.
- Historical active qualification remains `3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e`.
- Frozen post-authority independent oracle remains `60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18`.
- Historical Au near 72.6728 MPa is comparison evidence only, never authorization.
- Unsupported nonzero dP, general Kn/Kb, other gamma, out-of-domain beta, off-axis/global maxima, nozzle/attachment stresses, WRC 297/nozzle-neck, rectangular/lug approximation, code compliance, and release authority remain outside scope.
- No observation, replay receipt, falsifier receipt, manifest, artifact, or CI PASS may itself change route/global/code/release authority.

## Current-main custody
Main progression incorporated into this PR:
1. `1d08bcd0...` — merged PR #1325.
2. `b404fb4d...` — PR #1322; integrated at `c404557e49bb1d71bb3d62d49aea7591d0a0ede6`.
3. `eb6e4c299132644cfd2bddeb5b86dc458524e35d` — PR #1328; integrated at `056ccf15d71e3a7cceca327afae949f442f24489`.

Latest comparison at engineering completion:
- branch is `0` behind `main@eb6e4c2991...`;
- effective PR diff is eight files;
- latest main check still reports `eb6e4c2991...`;
- no PR conversation comments, submitted reviews, or review threads are open.

## Qualification chain

### A. Exact-head observation gate
`scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`

Requires exact `git rev-parse HEAD == expected SHA`, then reruns independent decoupling/refreeze/falsifiers, candidate binding, PR #1325 currentness/product/sample controls, and re-observes the bounded production candidate.

Mandatory numerical evidence:
- six WRC components: `P, Vc, Vl, Mc, Ml, Mt`;
- four stress families x eight locations `Au, Al, Bu, Bl, Cu, Cl, Du, Dl` = 32 rows;
- tolerance `max(1e-12, max(1, |expected|) * 1e-11)`;
- complete actual/expected/delta/tolerance/tolerance-ratio custody;
- source/dataset/load-producer/independent-authority/candidate/oracle hashes;
- subordinate stdout SHA-256 hashes;
- explicit no-authorization-change fields.

Expected observation status:
`PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED`.

### B. Full-matrix observation verifier
`scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`

Recomputes the semantic hash, controlled hashes, six WRC rows, all 32 stress rows, tolerance ratios, maxima/governing row, stress-intensity vector, fail-closed sample/currentness/product fields, and no-authorization-change state.

Expected status:
`PASS_REQUALIFICATION_OBSERVATION_FULL_MATRIX_INTEGRITY_ROUTE_STILL_SUSPENDED`.

### C. CI exact-head hook
`scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs`

Under GitHub Actions it uses exact checked-out `GITHUB_SHA`, generates the observation, immediately runs the full-matrix verifier, and fails closed if either fails.

### D. Subordinate evidence replay — batch addition
`scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs`

Reason for addition: the base verifier could prove that a stored subordinate hash looked like a SHA-256 and a status looked like PASS, but that alone did not prove the stored hash/status came from rerunning the controlled subordinate script.

Replay therefore requires the exact observed HEAD and reruns:
- independent oracle decoupling/refreeze;
- post-authority independent falsifiers;
- candidate binding;
- route-authority currentness falsifiers;
- workbench product qualification;
- complete qualification sample.

It requires byte-identical stdout SHA-256 and exact stored/replayed statuses/schemas. Complete-sample production count, reportability, and route-authority hash must also match.

Expected status:
`PASS_REQUALIFICATION_OBSERVATION_SUBORDINATE_REPLAY_ROUTE_STILL_SUSPENDED`.

### E. Ten anti-forgery falsifiers — batch addition
`scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs`

A genuine baseline replay must pass first. Then ten temporary tampered records must all be rejected. Except for deliberate semantic-hash corruption, mutations recompute the observation semantic hash so detection cannot rely only on a stale hash.

Required detections:
1. semantic-hash corruption;
2. candidate qualification substitution;
3. physical WRC load drift;
4. stress-oracle substitution;
5. coherent out-of-tolerance stress with recomputed row/aggregate fields;
6. stress-matrix row deletion;
7. authorization escalation;
8. valid-looking subordinate stdout-hash substitution;
9. PASS-looking subordinate-status forgery;
10. complete-sample route-authority-hash substitution.

Expected status:
`PASS_REQUALIFICATION_OBSERVATION_ANTI_FORGERY_FALSIFIERS`.

### F. Exact-head evidence manifest — batch addition
`scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs`

Created only after the entire pre-existing gamma5 workflow suite, replay, and all ten falsifiers pass. It binds:
- exact HEAD;
- Git tree SHA;
- all parent SHAs;
- GitHub event/ref/base/head/run context where present;
- raw SHA-256 of observation, replay receipt, and falsifier receipt;
- observation semantic hash;
- candidate/oracle/source/dataset/load-producer hashes;
- 6/6 load count;
- 32/32 stress count;
- max tolerance ratio;
- replay/falsifier PASS counts;
- false production/global/code/release authority.

Expected status:
`PASS_EXACT_HEAD_EVIDENCE_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED`.

### G. Workflow sequencing / retained bundle
`.github/workflows/emp1-gamma5-main-route.yml`

Final order:
1. checkout full history;
2. setup Node;
3. exact-head gate + immediate base verifier via existing firewall entry;
4. run the complete pre-existing gamma5 workflow suite;
5. preserve public-product truth;
6. replay subordinate evidence;
7. run all ten anti-forgery falsifiers;
8. build exact-head manifest;
9. upload bundle with `if: always()`.

This order is deliberate: a complete manifest cannot exist merely because the first gate passed. Every earlier gamma5 workflow check must also pass.

Artifact name:
`emp1-gamma5-exact-head-requalification-${{ github.sha }}`

Possible retained files:
- `.emp1-gamma5-exact-head-observation.generated.json`;
- `.emp1-gamma5-exact-head-replay.generated.json`;
- `.emp1-gamma5-exact-head-falsifiers.generated.json`;
- `.emp1-gamma5-exact-head-evidence-manifest.generated.json`.

A partial artifact is diagnostic only. Only a manifest-bearing bundle created after the full workflow chain may be called ready for engineering review.

## Validation truth

### Static/source review
- Current-main integration/diff audit: `COMPLETE_STATIC`.
- Six-load/32-row evidence contract audit: `COMPLETE_STATIC`.
- CI recursion/source-flow audit: `COMPLETE_STATIC`.
- Replay propagates the same process environment and `EMP1_EXACT_HEAD_PARENT_SHA` custody used by the observation gate.
- Tampered fixtures are temporary and removed; no forged PASS record is committed.
- Final workflow ordering prevents manifest creation before the complete existing gamma5 suite passes.
- No production route/registry authorization constant changed.

The new replay/falsifier/manifest scripts have not executed in a complete repository runtime. They are `AUTHORED / NOT_RUN_EXECUTION_ENVIRONMENT`, not PASS.

### Final hosted execution observed
Final branch/report head observed: `fc9f6b346bb2aa01f77fdb7cd55834e6857e4b98`.

GitHub created normal PR-triggered runs including:
- gamma5 bounded route run `32619349572`;
- runEmp1 orchestration run `32619349589`;
- independent WRC source oracle run `32619349613`;
- current-main independent baseline run `32619349562`.

Gamma5 job `97145000793`:
- `status=completed`;
- `conclusion=failure`;
- `steps=null`;
- `logs_url=null`.

Artifact list for run `32619349572`: empty.

Therefore no checkout, Node setup, repository script, observation generation, replay, falsifier, manifest, or artifact upload executed.

Classification:
`NOT_RUN_EXECUTION_ENVIRONMENT` — not software PASS and not repository-script FAIL.

### Earlier infrastructure evidence
The same no-step behavior occurred repeatedly on earlier PR heads, including an explicit manual rerun that briefly queued and then terminated with `steps=null`, `logs_url=null`.

### Alternate local execution
No complete mounted checkout is available locally and network checkout cannot resolve `github.com`. Connector access is file-level, not a complete executable runtime.

Classification:
`NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`.

## Changed-file ledger
1. `.github/workflows/emp1-gamma5-main-route.yml` — full-suite-before-manifest ordering and retained four-file evidence bundle.
2. `agents/PR1327_workreport.md` — living handover/evidence record.
3. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs` — exact-head observation gate.
4. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs` — full six-load/32-row verifier.
5. `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs` — CI gate/verification entry hook.
6. `scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs` — exact-head subordinate evidence replay.
7. `scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs` — ten tamper/forgery detections.
8. `scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs` — HEAD/tree/parents/raw-file-hash evidence manifest.

## Validation classification
- Current-main integration: `COMPLETE_STATIC`.
- Exact-head observation contract: `COMPLETE_STATIC`.
- Full-matrix verifier: `AUTHORED`; runtime `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Subordinate replay: `AUTHORED`; runtime `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Ten anti-forgery falsifiers: `AUTHORED`; runtime `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Evidence manifest: `AUTHORED`; runtime `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Full gamma5 suite on final observed head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Evidence artifact generation: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Full regression: `NOT_RUN`.

No unexecuted check is represented as PASS.

## Exact next action
When a real executable environment becomes available:
1. If `main` moved, integrate it first.
2. Run the gamma5 workflow on the exact integration tree.
3. Require exact-head observation + full-matrix verifier PASS.
4. Require every existing gamma5 workflow check PASS.
5. Require subordinate replay PASS with exact stdout hashes.
6. Require all ten tamper/forgery cases detected.
7. Require manifest PASS.
8. Require SHA-named artifact containing all four JSON files.
9. Download artifact and independently compare manifest raw-file hashes, HEAD/tree/parents, candidate/oracle/source/dataset/load-producer hashes, 6/6 loads, 32/32 stresses, and `maxToleranceRatio <= 1`.
10. Confirm production/global/code/release authority remains false.

If PR #1327 later merges, repeat exact-head qualification on the resulting merged-main SHA before any separate production-route authorization change.

## Open blockers / risks
- `VAL-1327-01`: final exact-head/full-suite/replay/falsifier/manifest chain has not executed.
- `VAL-1327-02`: no genuine generated observation exists.
- `VAL-1327-03`: no genuine replay/falsifier/manifest receipt exists.
- `VAL-1327-04`: no complete four-file evidence artifact exists.
- `VAL-1327-05`: hosted jobs terminate before checkout/steps/logs.
- `VAL-1327-06`: local runtime cannot materialize the complete checkout.
- `RISK-1327-01`: historical numerical agreement or authored qualification code must not be presented as production authorization.
- `RISK-1327-02`: PR synthetic-merge evidence cannot authorize a later distinct merged-main/authorization head.
- `RISK-1327-03`: semantic hash alone is insufficient against a deliberately rehashed forged payload; replay + falsifiers close this source-level weakness but remain NOT_RUN.
- `RISK-1327-04`: partial artifacts are diagnostic only; manifest-bearing full bundle is required for engineering review.

## Appendix A — takeover qualification
1. Why must exact-head qualification follow current main rather than the issue's original base?
2. Which six WRC loads and 32 stress rows are mandatory?
3. What is the tolerance formula and meaning of `maxToleranceRatio <= 1`?
4. Why is semantic-hash verification alone insufficient against a rehashed forgery?
5. Which subordinate scripts are replayed byte-for-byte?
6. Which valid-looking stored fields are specifically protected by replay?
7. What are the ten anti-forgery mutations?
8. Why must the baseline replay pass before mutation testing?
9. Why are replay/falsifiers/manifest positioned after the full existing gamma5 workflow suite?
10. What exact Git identity does the manifest retain?
11. Which four files define a complete evidence artifact?
12. Why is a partial artifact diagnostic only?
13. Which authority flags must remain false throughout #1327?
14. Why must any later production authorization head be separately requalified?
