# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: QUALIFICATION_CHAIN_COMPLETE_EXTERNAL_CI_BLOCKER_54`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `EXTERNAL_BLOCKER: #54 — Infrastructure gate: GitHub Actions jobs fail before step creation`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: eb6e4c299132644cfd2bddeb5b86dc458524e35d`
- `CURRENT_MAIN_INTEGRATION_COMMIT: 056ccf15d71e3a7cceca327afae949f442f24489`
- `LAST_ENGINEERING_HEAD: 61f5a52cfb797732bc0b37489bfc647fe94779e5`
- `LATEST_EXECUTION_OBSERVED_HEAD: fc9f6b346bb2aa01f77fdb7cd55834e6857e4b98`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE_UNTIL_EXACT_HEAD_FULL_EVIDENCE_BUNDLE_IS_EXECUTED_GREEN_AND_REVIEWED`

## Mission
Execute the post-source-authority WRC 537 gamma=5, delta-p=0 requalification on the exact code tree actually executed. Evidence must bind the independent oracle, bounded production candidate, six WRC loads, complete 32-row Table-5 stress matrix, source/dataset/qualification hashes, PR #1325 authority-currentness/product/sample controls, exact Git identity, subordinate replay, anti-forgery evidence, and a durable reviewable bundle.

Issue #1326 began from merged `main@1d08bcd0...`, but main advanced during the work. Stale-base qualification is prohibited.

## Protected engineering boundary
- Production route remains suspended by `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`.
- Candidate qualification remains `9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7`.
- Historical active qualification remains `3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e`.
- Frozen post-authority independent oracle remains `60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18`.
- Historical Au near 72.6728 MPa is comparison evidence only, never authorization.
- Unsupported nonzero dP, general Kn/Kb, other gamma, out-of-domain beta, off-axis/global maxima, nozzle/attachment stresses, WRC 297/nozzle-neck, rectangular/lug approximation, code compliance, and release authority remain outside scope.
- No observation, replay receipt, falsifier receipt, manifest, artifact, or CI PASS may itself change production/global/code/release authority.

## Current-main custody
Main progression incorporated into this PR:
1. `1d08bcd0fdebc86fc2daaeb752f129b877e01c74` — merged PR #1325.
2. `b404fb4d01c9e76caba5034071d506b014d2c3f0` — PR #1322; integrated in #1327 at `c404557e49bb1d71bb3d62d49aea7591d0a0ede6`.
3. `eb6e4c299132644cfd2bddeb5b86dc458524e35d` — PR #1328; integrated in #1327 at `056ccf15d71e3a7cceca327afae949f442f24489`.

Latest checks show main remains `eb6e4c2991...`; #1327 is based on that production tree and there are no open PR conversation comments, submitted reviews, or review threads.

## Qualification chain

### A. Exact-head observation gate
`scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`

Requires exact `git rev-parse HEAD == expected SHA`, then reruns independent decoupling/refreeze/falsifiers, candidate binding, PR #1325 currentness/product/sample controls, and re-observes the bounded production candidate.

Mandatory numerical evidence:
- six WRC components `P, Vc, Vl, Mc, Ml, Mt`;
- four stress families x eight locations `Au, Al, Bu, Bl, Cu, Cl, Du, Dl` = 32 rows;
- tolerance `max(1e-12, max(1, |expected|) * 1e-11)`;
- actual/expected/delta/tolerance/tolerance-ratio custody for every row;
- source/dataset/load-producer/independent-authority/candidate/oracle hashes;
- subordinate stdout SHA-256 hashes;
- explicit no-authorization-change fields.

Expected green status:
`PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED`.

### B. Full-matrix observation verifier
`scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`

Recomputes semantic hash, controlled hashes, six WRC rows, all 32 stress rows, tolerances, maxima/governing row, stress-intensity vector, fail-closed sample/currentness/product fields, and no-authorization-change state.

Expected green status:
`PASS_REQUALIFICATION_OBSERVATION_FULL_MATRIX_INTEGRITY_ROUTE_STILL_SUSPENDED`.

### C. CI exact-head entry hook
`scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs`

Under GitHub Actions, uses checked-out `GITHUB_SHA`, generates the exact-head observation, immediately runs the full-matrix verifier, and fails closed if either fails.

### D. Subordinate evidence replay
`scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs`

Reason: a stored subordinate hash/status is not trustworthy merely because it looks like SHA-256/PASS. Replay requires the exact observed HEAD and reruns:
- independent oracle decoupling/refreeze;
- post-authority independent falsifiers;
- candidate binding;
- route-authority currentness falsifiers;
- workbench product qualification;
- complete qualification sample.

It requires byte-identical stdout SHA-256 and exact stored/replayed statuses/schemas. Complete-sample production count, reportability, and route-authority hash must also match.

Expected green status:
`PASS_REQUALIFICATION_OBSERVATION_SUBORDINATE_REPLAY_ROUTE_STILL_SUSPENDED`.

### E. Ten anti-forgery falsifiers
`scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs`

A genuine baseline replay must pass first. Then ten temporary tampered/rehashed records must be rejected:
1. semantic-hash corruption;
2. candidate qualification substitution;
3. physical WRC load drift;
4. stress-oracle substitution;
5. coherent out-of-tolerance stress with recomputed fields;
6. stress-matrix row deletion;
7. authorization escalation;
8. valid-looking subordinate stdout-hash substitution;
9. PASS-looking subordinate-status forgery;
10. complete-sample route-authority-hash substitution.

Expected green status:
`PASS_REQUALIFICATION_OBSERVATION_ANTI_FORGERY_FALSIFIERS`.

### F. Exact-head evidence manifest
`scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs`

Created only after the entire existing gamma5 workflow suite, replay, and all ten falsifiers pass. It binds:
- exact HEAD;
- Git tree SHA;
- all parent SHAs;
- GitHub event/ref/base/head/run context where available;
- raw SHA-256 of observation/replay/falsifier receipts;
- observation semantic hash;
- candidate/oracle/source/dataset/load-producer hashes;
- 6/6 load count;
- 32/32 stress count;
- max tolerance ratio;
- replay/falsifier PASS counts;
- false production/global/code/release authority.

Expected green status:
`PASS_EXACT_HEAD_EVIDENCE_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED`.

### G. Workflow sequencing / retained bundle
`.github/workflows/emp1-gamma5-main-route.yml`

Final order:
1. checkout full history;
2. setup Node;
3. exact-head gate + immediate base verifier via the existing firewall entry;
4. complete pre-existing gamma5 qualification suite;
5. preserve public-product truth;
6. replay subordinate evidence;
7. run ten anti-forgery falsifiers;
8. build exact-head manifest;
9. upload the bundle with `if: always()`.

Artifact name:
`emp1-gamma5-exact-head-requalification-${{ github.sha }}`

Possible files:
- `.emp1-gamma5-exact-head-observation.generated.json`;
- `.emp1-gamma5-exact-head-replay.generated.json`;
- `.emp1-gamma5-exact-head-falsifiers.generated.json`;
- `.emp1-gamma5-exact-head-evidence-manifest.generated.json`.

A partial artifact is diagnostic only. Only a manifest-bearing bundle created after the full chain passes is review-ready.

## Repository-wide CI infrastructure blocker — Issue #54
Issue #54 predates this PR and tracks the same failure mode: GitHub Actions creates a failed job before `actions/checkout`, with no steps and no logs.

Fresh evidence added to #54 on 2026-08-23:

### PR #1327 — current engineering-critical reproducer
- observed batch/report head: `fc9f6b346bb2aa01f77fdb7cd55834e6857e4b98`;
- gamma5 run `32619349572`;
- job `97145000793`;
- `conclusion=failure`;
- `steps=null` / step list empty;
- `logs_url=null`;
- artifact list empty because no step executed.

Earlier manual rerun on current-main-integrated #1327 head:
- run `32613763202`;
- replacement job `97130995726`;
- briefly queued, then completed with no steps/logs.

### Unrelated design-only control — PR #1320
PR #1320 changes design/handover documents rather than EMP.1 production logic.
- head `bcc3734afa14ac0ac28e8696fee0dda2e32890a8`;
- gamma5 run `32549729043`;
- job `96974376415`;
- identical `failure / steps=null / logs_url=null`.

### Unrelated production control — merged PR #1328
PR #1328 independently ran its Node/Vite qualification in another complete environment, yet GitHub-hosted gamma5 CI still died before checkout.
- head `c55a7f832a29b1051c603375520094395874e486`;
- gamma5 run `32590803050`;
- job `97074221802`;
- identical `failure / steps=null / logs_url=null`.

Conclusion: the hosted failure is repository-wide infrastructure. It is not caused by #1327's exact-head gate, replay, falsifiers, manifest, or artifact steps. Issue #54 is the correct remediation owner.

No further #1327 qualification-code change is justified solely to work around a runner that never reaches checkout.

## Validation truth

### Static/source state
- Current-main integration/diff audit: `COMPLETE_STATIC`.
- Six-load/32-row evidence contract audit: `COMPLETE_STATIC`.
- CI recursion/source-flow audit: `COMPLETE_STATIC`.
- Replay/falsifier/manifest architecture: `COMPLETE_STATIC`.
- Final workflow ordering prevents manifest creation before the complete gamma5 suite passes.
- No production route/registry authorization constant changed.

### Runtime state
- Exact-head observation gate: `AUTHORED / NOT_RUN_EXECUTION_ENVIRONMENT`.
- Full-matrix verifier: `AUTHORED / NOT_RUN_EXECUTION_ENVIRONMENT`.
- Existing gamma5 suite on final observed head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Subordinate replay: `AUTHORED / NOT_RUN_EXECUTION_ENVIRONMENT`.
- Ten anti-forgery falsifiers: `AUTHORED / NOT_RUN_EXECUTION_ENVIRONMENT`.
- Evidence manifest: `AUTHORED / NOT_RUN_EXECUTION_ENVIRONMENT`.
- Evidence artifact generation: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Full regression: `NOT_RUN`.

No unexecuted check is represented as PASS.

### Alternate local execution
The available local runtime has no complete mounted `Advanced_Analysis` checkout and cannot resolve `github.com` for network checkout. Connector access is file/object level rather than a full executable repository runtime.

Classification: `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`.

## Changed-file ledger
1. `.github/workflows/emp1-gamma5-main-route.yml` — full-suite-before-manifest ordering and retained evidence bundle.
2. `agents/PR1327_workreport.md` — living handover/evidence/dependency record.
3. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs` — exact-head observation gate.
4. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs` — full six-load/32-row verifier.
5. `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs` — CI gate/verification entry hook.
6. `scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs` — exact-head subordinate evidence replay.
7. `scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs` — ten tamper/forgery detections.
8. `scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs` — HEAD/tree/parents/raw-file-hash evidence manifest.

## Exact next action
The next action is **not additional qualification coding**.

1. Resolve repository infrastructure blocker #54 so a GitHub Actions job reaches checkout and produces executable steps/logs, or obtain another complete repository runtime.
2. Recheck `main`; if it moved, integrate current main before execution.
3. Execute the gamma5 workflow on that exact integration tree.
4. Require exact-head observation + full-matrix verifier PASS.
5. Require every pre-existing gamma5 workflow check PASS.
6. Require subordinate replay PASS with byte-identical stdout hashes.
7. Require all ten tamper/forgery cases detected.
8. Require evidence manifest PASS.
9. Require SHA-named artifact containing all four JSON files.
10. Independently review HEAD/tree/parents, raw-file hashes, source/dataset/producer/candidate/oracle hashes, 6/6 loads, 32/32 stresses, and `maxToleranceRatio <= 1`.
11. Confirm production/global/code/release authority remains false.

If #1327 later merges, repeat exact-head qualification on the resulting merged-main SHA before any separate production-route authorization change.

## Open blockers / risks
- `VAL-1327-01`: exact-head/full-suite/replay/falsifier/manifest chain has not executed.
- `VAL-1327-02`: no genuine generated observation/replay/falsifier/manifest receipt exists.
- `VAL-1327-03`: no complete four-file evidence artifact exists.
- `VAL-1327-04`: repository infrastructure issue #54 prevents hosted jobs reaching checkout/steps/logs.
- `VAL-1327-05`: local runtime cannot materialize a complete executable checkout.
- `RISK-1327-01`: historical numerical agreement or authored qualification code must not be presented as production authorization.
- `RISK-1327-02`: PR synthetic-merge evidence cannot authorize a later distinct merged-main/authorization head.
- `RISK-1327-03`: semantic hash alone is insufficient against a deliberately rehashed forged payload; replay + falsifiers are authored to close this weakness but remain NOT_RUN.
- `RISK-1327-04`: partial artifacts are diagnostic only; manifest-bearing full bundle is required for engineering review.

## Appendix A — takeover qualification
1. Why must exact-head qualification follow current main rather than the issue's original base?
2. Which six WRC loads and 32 stress rows are mandatory?
3. What is the tolerance formula and meaning of `maxToleranceRatio <= 1`?
4. Why is semantic-hash verification alone insufficient against a rehashed forgery?
5. Which subordinate scripts are replayed byte-for-byte?
6. What are the ten anti-forgery mutations?
7. Why must baseline replay pass before mutation testing?
8. Why are replay/falsifiers/manifest positioned after the existing gamma5 suite?
9. What exact Git identity does the manifest retain?
10. Which four files define a complete evidence artifact?
11. Why is a partial artifact diagnostic only?
12. Which authority flags must remain false throughout #1327?
13. Why does issue #54, not more #1327 code, own the current executable blocker?
14. Why must any later production authorization head be separately requalified?
