# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: CURRENT_MAIN_FULL_SUITE_REPLAY_FALSIFIER_MANIFEST_AUTHORED_EXECUTION_ENVIRONMENT_BLOCKED`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: eb6e4c299132644cfd2bddeb5b86dc458524e35d`
- `CURRENT_MAIN_INTEGRATION_COMMIT: 056ccf15d71e3a7cceca327afae949f442f24489`
- `LAST_CODE_HEAD: 61f5a52cfb797732bc0b37489bfc647fe94779e5`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE_UNTIL_EXACT_HEAD_FULL_EVIDENCE_BUNDLE_IS_EXECUTED_GREEN_AND_REVIEWED`

## Assignment
Execute and bind the post-source-authority WRC 537 gamma=5, delta-p=0 requalification to the exact code tree actually executed. Required evidence includes independent oracle custody, production candidate comparison, six WRC loads, complete 32-row Table-5 stress matrix, current source/dataset/qualification hashes, PR #1325 currentness/product/sample controls, exact Git identity, and durable reviewable evidence.

Issue #1326 originally named `main@1d08bcd0fdebc86fc2daaeb752f129b877e01c74`. Main subsequently advanced. Stale-base qualification is not accepted.

## Protected engineering boundary
- Production route remains suspended by `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`.
- Candidate qualification remains `9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7`.
- Historical active qualification remains `3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e`.
- Frozen post-authority independent oracle remains `60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18`.
- Historical Au near 72.6728 MPa is comparison evidence only, not authorization.
- This PR does not broaden into nonzero dP, general Kn/Kb, other gamma, out-of-domain beta, off-axis/global maxima, nozzle/attachment stresses, WRC 297/nozzle-neck, rectangular/lug approximation, code compliance, or release authority.
- No observation, receipt, manifest, artifact, or workflow PASS may itself change route/global/code/release authority.

## Current-main integration custody
Main progression relevant to this PR:
1. `1d08bcd0...` — PR #1325 merged base.
2. `b404fb4d...` — PR #1322; 53 commits later. Integrated into PR #1327 at `c404557e49bb1d71bb3d62d49aea7591d0a0ede6`.
3. `eb6e4c299132644cfd2bddeb5b86dc458524e35d` — PR #1328; 205 commits after `b404fb4d...`. Integrated at `056ccf15d71e3a7cceca327afae949f442f24489`.

Latest comparison before this report update:
- `main@eb6e4c2991... -> PR head`: `0` behind;
- current main has not advanced beyond `eb6e4c2991...` at the latest check;
- no review comments, submitted reviews, or review threads are open on PR #1327.

## Existing numerical qualification assets retained
The repository already contained the controlled engineering building blocks:
- post-authority independent refreeze;
- independent-oracle decoupling check;
- post-authority oracle falsifiers;
- production candidate vs frozen oracle comparison;
- candidate-v2 qualification binding;
- authority-currentness/product/sample checks.

PR #1327 does not replace those assets. It binds and replays them on one exact Git tree and packages the resulting evidence.

## Implemented qualification chain

### 1. Exact-head observation gate
`scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`

Requires an explicit 40-character SHA and exact `git rev-parse HEAD` match, then:
- validates frozen oracle and candidate-v2 semantic custody;
- runs independent decoupling/refreeze and independent falsifiers;
- runs candidate binding;
- runs PR #1325 currentness, product qualification, and complete sample controls;
- re-observes the production candidate;
- requires six physical WRC loads;
- requires four stress families x eight locations = 32 rows at `Au, Al, Bu, Bl, Cu, Cl, Du, Dl`;
- applies tolerance `max(1e-12, max(1, |expected|) * 1e-11)`;
- retains every actual/expected/delta/tolerance/tolerance-ratio value;
- retains source/dataset/load-producer/independent-authority/candidate/oracle hashes and subordinate stdout hashes;
- writes a record only after every assertion passes;
- leaves production/global/code/release authority false.

Expected observation status:
`PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED`.

### 2. Full-matrix record verifier
`scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`

Independently recomputes and verifies:
- observation semantic hash;
- exact observed commit identity;
- candidate/oracle/source/dataset/producer/independent-authority hashes;
- WRC component order `P, Vc, Vl, Mc, Ml, Mt`;
- six zero-drift load rows;
- exact 32-row family/location matrix;
- frozen-oracle expected values;
- tolerance, absolute/relative delta, and tolerance ratio for every row;
- `maxToleranceRatio <= 1`;
- aggregate maxima and governing row;
- stress-intensity vector consistency;
- fail-closed product/currentness/sample fields;
- no authorization change.

Expected verifier status:
`PASS_REQUALIFICATION_OBSERVATION_FULL_MATRIX_INTEGRITY_ROUTE_STILL_SUSPENDED`.

### 3. CI exact-head hook
`scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs`

Under `GITHUB_ACTIONS=true`, the existing first gamma5 repository step:
- requires `GITHUB_SHA`;
- runs the exact-head gate against the checked-out SHA;
- writes `.emp1-gamma5-exact-head-observation.generated.json`;
- immediately runs the full-matrix verifier against the same SHA;
- fails closed on either failure.

### 4. Subordinate evidence replay — added in this batch
`scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs`

Reason: the observation verifier previously checked subordinate stdout hashes mainly for schema/shape/PASS-looking status. A forged record could theoretically substitute another valid-looking 64-hex hash or `PASS_*` status and recompute the observation semantic hash.

The replay check closes that gap by requiring the exact observed HEAD, first requiring the base full-matrix verifier to PASS, then rerunning on the same head:
- independent oracle decoupling/refreeze;
- post-authority independent falsifiers;
- candidate binding;
- route-authority currentness falsifiers;
- workbench product qualification;
- complete qualification sample.

It requires byte-identical stdout SHA-256 values and exact stored/replayed statuses/schemas. Complete-sample production count, reportability, and route-authority hash must also match.

Expected replay status:
`PASS_REQUALIFICATION_OBSERVATION_SUBORDINATE_REPLAY_ROUTE_STILL_SUSPENDED`.

### 5. Anti-forgery mutation suite — added in this batch
`scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs`

The suite first requires the genuine baseline record to pass the replay check, then creates ten temporary mutated records. Except for the deliberate semantic-hash corruption case, mutations recompute the record semantic hash so the test proves deeper engineering/evidence guards rather than only hash mismatch detection.

Required detections:
1. semantic-hash corruption;
2. candidate-qualification substitution with rehashed payload;
3. physical WRC load drift with rehashed payload;
4. stress-oracle substitution with rehashed payload;
5. coherent out-of-tolerance stress with recomputed row/aggregate fields and rehashed payload;
6. stress-matrix row deletion with rehashed payload;
7. authorization escalation with rehashed payload;
8. valid-looking subordinate stdout-hash substitution with rehashed payload;
9. PASS-looking subordinate-status forgery with rehashed payload;
10. complete-sample route-authority-hash substitution with rehashed payload.

All ten must be rejected by the replay/full-matrix verification chain.

Expected falsifier status:
`PASS_REQUALIFICATION_OBSERVATION_ANTI_FORGERY_FALSIFIERS`.

### 6. Exact-head evidence manifest — added in this batch
`scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs`

The manifest is created only after the full gamma5 suite, replay check, and anti-forgery suite pass. It binds:
- exact observed HEAD;
- exact Git tree SHA;
- all Git parent SHAs;
- GitHub event/ref/base/head/run identity where available;
- raw SHA-256 of the observation file;
- raw SHA-256 of the replay receipt;
- raw SHA-256 of the falsifier receipt;
- observation semantic hash;
- candidate/oracle/source/dataset/load-producer hashes;
- 6/6 load count;
- 32/32 stress count;
- governing tolerance ratio;
- replay/falsifier PASS counts;
- explicit false production/global/code/release authority.

Expected manifest status:
`PASS_EXACT_HEAD_EVIDENCE_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED`.

### 7. Full workflow sequencing and durable bundle
`.github/workflows/emp1-gamma5-main-route.yml`

Final sequence is intentionally:
1. checkout full history;
2. setup Node;
3. exact-head gate + immediate base verifier via existing firewall entry;
4. run the complete pre-existing gamma5 qualification suite;
5. preserve public-product truth;
6. replay subordinate evidence and write replay receipt;
7. run ten anti-forgery falsifiers and write falsifier receipt;
8. build exact-head evidence manifest;
9. upload the evidence bundle with `if: always()`.

The manifest is therefore impossible to create merely because the first exact-head gate passed; every existing gamma5 workflow check before it must also pass.

Artifact name:
`emp1-gamma5-exact-head-requalification-${{ github.sha }}`

Retained files when available:
- `.emp1-gamma5-exact-head-observation.generated.json`;
- `.emp1-gamma5-exact-head-replay.generated.json`;
- `.emp1-gamma5-exact-head-falsifiers.generated.json`;
- `.emp1-gamma5-exact-head-evidence-manifest.generated.json`.

Retention: 30 days.

`if-no-files-found: ignore` does not create PASS evidence; it only permits diagnostic retention logic when an earlier step failed before generating files.

## Validation truth

### Source/static audit
- Current-main integration/diff audit: `COMPLETE`.
- Full six-load/32-stress contract audit: `COMPLETE`.
- CI recursion audit: `COMPLETE`; no replay/gate recursion path found.
- Replay environment matches gate custody by propagating `EMP1_EXACT_HEAD_PARENT_SHA` and the current process environment.
- Anti-forgery mutations are temporary and removed after execution; no forged PASS record is committed.
- Workflow ordering now prevents complete manifest creation before the full existing gamma5 suite passes.
- Workflow revisions have been accepted by GitHub on prior heads and generated normal workflow runs.
- No route/registry authorization constant changed.

The newly added replay/falsifier/manifest scripts have **not** executed in a complete repository runtime. Their status is `AUTHORED / NOT_RUN_EXECUTION_ENVIRONMENT`, never PASS.

### Hosted Actions blocker
Latest workflow attempt before this batch, on code head `695614b14ff86cb0acd6fc588fdfe16974fead6c`:
- gamma5 run `32619264816`;
- job `97144797989`;
- `status=completed`;
- `conclusion=failure`;
- `steps=null`;
- `logs_url=null`.

The job terminated before checkout or any repository command. Classification remains:
`NOT_RUN_EXECUTION_ENVIRONMENT`.

The final reordered batch head `61f5a52cfb797732bc0b37489bfc647fe94779e5` had not yet produced a workflow-run record at the first immediate query; do not infer PASS or FAIL from absence of a run record.

### Alternate local execution
No complete mounted `Advanced_Analysis` checkout is available in the local runtime, and network checkout cannot resolve `github.com`. Connector access is file-level, not an executable complete checkout.

Classification:
`NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`.

## Validation classification
- Current-main integration: `COMPLETE_STATIC`.
- Observation contract: `COMPLETE_STATIC`.
- Full-matrix verifier: `AUTHORED`; execution `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Subordinate replay: `AUTHORED`; execution `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Ten anti-forgery falsifiers: `AUTHORED`; execution `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Evidence manifest: `AUTHORED`; execution `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Full gamma5 suite on final batch head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Artifact bundle generation: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Full regression: `NOT_RUN`.

No unexecuted check is represented as PASS.

## Changed-file ledger
1. `.github/workflows/emp1-gamma5-main-route.yml` — full-suite-before-manifest sequencing and four-file evidence-bundle retention.
2. `agents/PR1327_workreport.md` — living recovery/evidence/handover record.
3. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs` — exact-head observation gate.
4. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs` — full six-load/32-row verifier.
5. `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs` — CI gate/verification entry hook.
6. `scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs` — exact-head replay of stored subordinate evidence hashes/statuses.
7. `scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs` — ten anti-forgery/tamper detections.
8. `scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs` — SHA/tree/parent/file-hash evidence manifest.

## Exact next action
When an executable environment becomes available, do **not** bypass the workflow chain with a hand-authored record.

Run the gamma5 workflow on the then-current PR integration tree and require, in order:
1. exact-head observation generation + full-matrix verifier PASS;
2. every existing gamma5 workflow check PASS;
3. subordinate replay PASS with exact stdout hashes;
4. all 10 anti-forgery mutations detected;
5. evidence manifest PASS;
6. artifact bundle present with four generated JSON files.

Then download the artifact and review:
- observed HEAD/tree/parents;
- observation/replay/falsifier file SHA-256 values against manifest;
- candidate `9ea591...`;
- oracle `607711...`;
- six load rows;
- 32 stress rows;
- `maxToleranceRatio <= 1`;
- zero production-semantic imports in independent oracle evidence;
- no production/global/code/release authorization change.

If `main` advances before executable qualification, integrate current main first and move the exact-head target forward.

If #1327 later merges, repeat exact-head qualification on the resulting merged-main SHA before any separate production-route authorization change.

## Open blockers / risks
- `VAL-1327-01`: final exact-head/full-suite/replay/falsifier/manifest chain has not executed.
- `VAL-1327-02`: no genuine generated exact-head observation exists.
- `VAL-1327-03`: no genuine replay/falsifier/manifest receipt exists.
- `VAL-1327-04`: no complete four-file evidence artifact exists.
- `VAL-1327-05`: GitHub hosted jobs repeatedly terminate before checkout/steps/logs.
- `VAL-1327-06`: local runtime cannot materialize a complete executable checkout.
- `RISK-1327-01`: authored controls or historical ~72.67 MPa must never be presented as production authorization.
- `RISK-1327-02`: a PR synthetic-merge observation cannot authorize a later distinct merged-main/authorization head.
- `RISK-1327-03`: semantic hash alone is insufficient if a forged payload can be rehashed; replay + mutation detection now address that source-level risk but remain NOT_RUN.
- `RISK-1327-04`: partial artifact contents are diagnostic only. Only a manifest-bearing bundle created after the full suite may be called ready for engineering review.

## Appendix A — takeover qualification
1. Why is current-main integration mandatory for exact-head qualification?
2. Why is the historical Au ~72.67 MPa not authorization?
3. Which six WRC components and which 32 stress rows are mandatory?
4. What is the tolerance formula and meaning of `maxToleranceRatio <= 1`?
5. Why is observation semantic hash verification alone insufficient against a rehashed forgery?
6. Which subordinate scripts are replayed byte-for-byte?
7. Which three stored subordinate fields were specifically vulnerable to valid-looking substitution before replay (stdout hash, PASS-looking status, sample route-authority hash)?
8. What are the ten anti-forgery mutations and why is the baseline replay required first?
9. Why must replay/falsifiers/manifest run after the full existing gamma5 workflow suite rather than immediately after observation generation?
10. What exact Git identity is retained by the manifest?
11. Which files must exist in the final evidence artifact?
12. Why is a partial artifact diagnostic only?
13. Which PR #1325 currentness/product/sample controls remain in the exact-head gate?
14. Which authority flags must remain false throughout PR #1327?
15. Why must any later production authorization change be validated again on its own exact production head?
