# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: POST_PROMOTION_EXACT_HEAD_GATE_AND_FALSIFIERS_AUTHORED_EXECUTION_PENDING`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: eb6e4c299132644cfd2bddeb5b86dc458524e35d`
- `CURRENT_MAIN_INTEGRATION_COMMIT: 056ccf15d71e3a7cceca327afae949f442f24489`
- `LAST_ENGINEERING_HEAD: 9f9190c5f4d182bd71c938859fb8e088e8de6e93`
- `CURRENT_REPORT_HEAD: c8ddd70b0620ad6210327028feb3364227cf3dd9`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE UNTIL SUSPENDED-HEAD PRODUCER/REVIEW/PROPOSAL EVIDENCE IS EXECUTED GREEN AND REVIEWED`

## Mission
Requalify the bounded WRC 537 cylindrical original gamma=5, differential-pressure=0 route after source-authority closure, while keeping production fail-closed until exact-head engineering evidence is independently replayed and a separate bounded authorization change is itself requalified on its new head.

This PR contains qualification, evidence-custody, independent-review, bounded-authorization-proposal, and future post-promotion-gate tooling. It does **not** authorize production C.

## Protected bounded scope
The only candidate future production scope is:
- shell family `CYLINDRICAL`;
- attachment shape `ROUND`;
- variant `ORIGINAL`;
- gamma exactly `5`;
- beta `0.05 <= beta <= 0.5`;
- differential pressure exactly `0`;
- stress concentration `Kn=1`, `Kb=1`;
- WRC Table-5 eight shell-juncture recovery points;
- longitudinal-moment figures `1B / 2B` for the eight-point axis-of-symmetry route;
- runtime typed r0, applicability, cylindrical-axis and load-custody evidence mandatory.

Still prohibited:
- nonzero differential pressure;
- nonunity/general Appendix-B SCF;
- off-axis/global-maximum claims;
- gamma other than 5 / non-tabulated gamma;
- beta outside 0.05–0.5;
- extrapolated/cross-variant fallback;
- attachment/nozzle stress claims;
- WRC 297/nozzle-neck methods;
- global EMP.1.C authority;
- code-compliance authority;
- release qualification.

## Controlled identities
- historical active route qualification: `3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e`;
- historical oracle: `5daeb3a84828cf19017e6d1d0a70bd3478929713973948f875f21cec463a80aa`;
- post-authority candidate qualification: `9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7`;
- frozen post-authority physical oracle: `60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18`;
- source PDF SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`;
- bounded dataset hash: `fb440a292f8794430977f60f5365a678a9aff62a4dae3397621902964a0db73c`;
- zero-dp load-producer qualification: `47a9157ba88a5646021fabd41cd803028e1880c8d6f712095afda429f2c2622b`.

Historical Au ≈72.6728 MPa is comparison evidence only and never authorization.

## Current-main custody
`main` remains `eb6e4c299132644cfd2bddeb5b86dc458524e35d`; PR #1327 is `0` commits behind it.

Integrated production history relevant to this PR:
1. PR #1325 merge `1d08bcd0fdebc86fc2daaeb752f129b877e01c74`;
2. PR #1322 merge `b404fb4d01c9e76caba5034071d506b014d2c3f0`, integrated here at `c404557e49bb1d71bb3d62d49aea7591d0a0ede6`;
3. PR #1328 merge `eb6e4c299132644cfd2bddeb5b86dc458524e35d`, integrated here at `056ccf15d71e3a7cceca327afae949f442f24489`.

Stale-base qualification is prohibited. If main advances before suspended-head execution, integrate current main and regenerate the complete evidence chain.

---

# Suspended-head qualification chain

## 1. Exact-head producer observation
`scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`

Requires exact `git rev-parse HEAD == expected SHA` and re-observes the production candidate against the post-authority oracle.

Mandatory evidence:
- six WRC loads `P, Vc, Vl, Mc, Ml, Mt`;
- 4 stress families × 8 locations `Au, Al, Bu, Bl, Cu, Cl, Du, Dl` = 32 comparisons;
- tolerance `max(1e-12, max(1, |expected|) * 1e-11)`;
- candidate/oracle/source/dataset/load-producer/independent-authority hashes;
- all production/global/code/release authority false.

Expected status:
`PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED`.

## 2. Full-matrix verifier
`scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`

Recomputes all six load rows, all 32 stress rows, tolerances, aggregate drift and semantic custody.

Expected status:
`PASS_REQUALIFICATION_OBSERVATION_FULL_MATRIX_INTEGRITY_ROUTE_STILL_SUSPENDED`.

## 3. Subordinate replay
`scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs`

Reruns independent oracle/refreeze/falsifiers, candidate binding, route-currentness, product qualification and complete sample. Stored subordinate stdout SHA-256/status values must match exactly.

Expected status:
`PASS_REQUALIFICATION_OBSERVATION_SUBORDINATE_REPLAY_ROUTE_STILL_SUSPENDED`.

## 4. Observation anti-forgery
`scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs`

Requires a genuine replay baseline and rejects ten tampered/rehashed observation variants.

Expected status:
`PASS_REQUALIFICATION_OBSERVATION_ANTI_FORGERY_FALSIFIERS`.

## 5. Exact-head evidence manifest
`scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs`

Binds exact HEAD/tree/parents, raw evidence hashes, 6/6 loads, 32/32 stresses and false production/global/code/release authority. For local execution, `GITHUB_ACTIONS=false` forces GitHub-only context fields to null.

Expected status:
`PASS_EXACT_HEAD_EVIDENCE_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED`.

## 6. Workflow-independent local producer
`scripts/emp1-wrc-gamma5-requalification-local-suite.mjs`

Owner direction: skip GitHub workflow execution. The local suite executes 23 ordered stages and rejects any source mutation outside its dedicated `.emp1-gamma5-*` evidence directory.

Files after genuine producer PASS:
1. `01-observation.json`
2. `02-replay-receipt.json`
3. `03-falsifier-receipt.json`
4. `04-evidence-manifest.json`
5. `05-local-execution-receipt.json`

Expected final status:
`PASS_LOCAL_EXACT_HEAD_REQUALIFICATION_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED`.

## 7. Independent 23-stage review replay
`scripts/emp1-wrc-gamma5-requalification-review-gate.mjs`

The five-file producer set is not trusted merely because it is self-consistent. The reviewer re-executes all 23 producer stages on the same exact head, requires stdout/stderr hashes to reproduce, and requires regenerated observation/replay/falsifier/manifest bytes to match.

Optional file:
`06-independent-review-receipt.json`

Expected status:
`PASS_INDEPENDENT_EXACT_HEAD_EVIDENCE_REPLAY_READY_FOR_SEPARATE_AUTHORIZATION_REVIEW_ROUTE_STILL_SUSPENDED`.

## 8. Review-layer falsifiers
`scripts/emp1-wrc-gamma5-requalification-review-gate-falsifiers.mjs`

Requires a genuine independent-review baseline and rejects six coordinated review-layer forgeries. The receipt carries its own `falsifierSemanticHash`.

Optional file:
`07-independent-review-falsifier-receipt.json`

Expected status:
`PASS_INDEPENDENT_REVIEW_GATE_ANTI_FORGERY_FALSIFIERS`.

---

# Bounded authorization proposal — still non-authorizing

## 9. Proposal builder
`scripts/emp1-wrc-gamma5-bounded-authorization-proposal.mjs`

Requires genuine files `01`–`07`, exact suspended HEAD, candidate v2 identity, exact production-source preimages, and broader global EMP.1.C still blocked.

Optional file:
`08-bounded-authorization-proposal.json`

Expected status:
`READY_TO_DRAFT_SEPARATE_BOUNDED_AUTHORIZATION_CHANGE_NOT_AUTHORIZED`.

### Engineering-authority file allowlist
The proposal's three-file allowlist is the **engineering-authority mutation allowlist**:
1. `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`
2. `src/core/emp1/emp1-c-bounded-route-registry.js`
3. new retained record `validation/emp1/wrc537-2013/gamma5-zero-dp-route-authorization-v1.json`

Process metadata is not engineering authority. The post-promotion gate separately permits at most one path matching `agents/PR[0-9]+_workreport.md` and does not count it among the 12 engineering mutations.

### Exact 12 future semantic mutations
Route module:
1. active qualification `3b437... -> 9ea591...`;
2. active oracle `5daeb3... -> 607711...`;
3. route authorized `false -> true`;
4. requalification suspension `[reason] -> []`;
5. method `productionUseAuthorized: false -> true`.

Bounded registry:
6. qualification `3b437... -> 9ea591...`;
7. `registered: false -> true`;
8. bounded `engineeringUseAuthorized: false -> true`;
9. active suspension `[reason] -> []`;
10. qualification role -> `POST_SOURCE_AUTHORITY_EXACT_HEAD_BOUNDED_REQUALIFICATION`;
11. `routeRequalificationRequired: true -> false`;
12. remove only `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE` from `remainingBlocked`.

Retain the blockers for nonzero dP, nonunity SCF, Appendix-B, off-axis maximum, gamma/beta/non-tabulated expansion and global EMP.1.C.

### Explicit forbidden global-authority files
- `src/core/emp1/emp1-c-qualification-evidence.generated.js`
- `src/core/emp1/emp1-c-qualification-state.js`
- `validation/emp1/wrc537-2013/emp1-c-method-authorization-v1.json`

## 10. Proposal verifier
`scripts/emp1-wrc-gamma5-bounded-authorization-proposal-check.mjs`

Rebuilds file `08` from current evidence/source and requires deep equality.

Optional file:
`09-bounded-authorization-proposal-check-receipt.json`

Expected status:
`PASS_BOUNDED_AUTHORIZATION_PROPOSAL_INTEGRITY_NOT_AUTHORIZED`.

## 11. Proposal falsifiers
`scripts/emp1-wrc-gamma5-bounded-authorization-proposal-falsifiers.mjs`

Rejects ten proposal attacks including candidate/oracle substitution, global/release escalation, allowlist expansion, removing the oracle update, disabling the post-promotion gate, source-preimage substitution and nonzero-dP expansion.

Optional file:
`10-bounded-authorization-proposal-falsifier-receipt.json`

Expected status:
`PASS_BOUNDED_AUTHORIZATION_PROPOSAL_ANTI_FORGERY_FALSIFIERS_NOT_AUTHORIZED`.

---

# 2026-08-23 current batch — post-promotion exact-head gate

## Engineering/process finding: exact three-file diff conflicted with mandatory handover metadata
The previous proposal correctly restricted **engineering authority** to three files, but a literal three-file Git diff would conflict with Engineering PR Delivery because an authorization PR must retain its living `agents/PR…_workreport.md`.

Resolution:
- the three proposal files remain the only engineering-authority mutation files;
- the post-promotion gate allows at most one non-authority metadata path matching `^agents/PR[0-9]+_workreport\.md$`;
- that metadata path is excluded from the 12 engineering mutations;
- every other changed path is rejected.

No global/code/release authority surface is broadened by this distinction.

## 12. Post-promotion exact-head authorization gate
`scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate.mjs`

This script is intentionally designed for a **future authorization head**, not today's suspended source.

Required invocation inputs:
- `--expected-head <authorization HEAD>`;
- `--authorization-base <base commit>`;
- `--evidence-dir <directory containing files 01–10>`;
- optional `--write-receipt .../11-post-promotion-exact-head-receipt.json`.

### Base-tree anti-drift rule
The authorization-base commit must be an ancestor of the authorization HEAD and its Git tree SHA must equal `08.observedSuspendedTreeSha` exactly.

This permits a squash/merge SHA to differ from the suspended evidence SHA **only when the tree is byte-identical**. Any source drift before authorization invalidates the promotion basis and requires a new suspended-head qualification/proposal cycle.

### Exact changed-file rule
Between authorization base and authorization HEAD:
- all three engineering-authority allowlist files must be changed;
- at most one `agents/PR[0-9]+_workreport.md` metadata file may also change;
- no other path may change.

### Byte-exact source reconstruction
The gate loads route/registry bytes from the authorization base, verifies those base bytes against file `08` source preimages, applies the exact approved textual mutations, and requires the current authorization-head route/registry files to be byte-identical to the reconstructed expected files.

This blocks extra code, hidden fallbacks, unrelated cleanup or a backdoor inserted inside either otherwise-allowed production file.

### Authorized runtime state required
On the authorization HEAD the gate requires:
- active qualification `9ea591...`;
- active oracle `607711...`;
- route authorization true;
- no route requalification suspension;
- method engineering + production use true;
- bounded registry registered + engineering-authorized;
- qualification role `POST_SOURCE_AUTHORITY_EXACT_HEAD_BOUNDED_REQUALIFICATION`;
- `routeRequalificationRequired=false`;
- exact remaining expansion blockers retained;
- global EMP.1.C state still `engineeringUseAuthorized=false` and `runAuthorized=false`;
- code-compliance and release authority remain false.

### Real production-path numerical requalification
The gate executes the real `runEmp1Wrc537Gamma5ZeroDpRoute()` path using the frozen post-authority physical benchmark and source-qualified cylindrical-axis, attachment-OD/r0, applicability and zero-dp load custody.

It requires:
- state `EVALUATED_AUTHORIZED_BOUNDED_GAMMA5_ZERO_DP_ROUTE`;
- 6/6 WRC loads exactly equal to the frozen physical oracle;
- all 32 Table-5 stress comparisons within `max(1e-12, max(1, |expected|) * 1e-11)`;
- post-authority `1B / 2B` curve map;
- global EMP.1.C authority false.

It also reruns independent oracle decoupling/refreeze and post-authority oracle falsifiers on the authorization HEAD.

Optional file:
`11-post-promotion-exact-head-receipt.json`

Expected future genuine status:
`PASS_POST_PROMOTION_EXACT_HEAD_BOUNDED_ROUTE_AUTHORIZATION_QUALIFIED_GLOBAL_C_STILL_BLOCKED`.

The gate does not mutate authorization. Its receipt states `authorizationChangeAppliedByThisGate=false`.

## Required retained authorization record contract
A future authorization patch must create:
`validation/emp1/wrc537-2013/gamma5-zero-dp-route-authorization-v1.json`

Required schema/status:
- schema `emp1-wrc537-gamma5-bounded-route-authorization/v1`;
- status `BOUNDED_AUTHORIZATION_CHANGE_APPLIED_PENDING_POST_PROMOTION_EXACT_HEAD_QUALIFICATION`;
- `authorizationChangeApplied=true`;
- self-verifying `authorizationRecordSemanticHash`.

It must bind:
- proposal/check/falsifier semantic hashes;
- qualified suspended HEAD/tree;
- authorization-base HEAD/tree;
- candidate qualification `9ea591...`;
- post-authority oracle `607711...`;
- exact bounded scope;
- the three engineering-authority files;
- `approvedSemanticMutationCount=12`;
- non-authority workreport metadata policy;
- false global/code/release and expansion authority;
- raw SHA-256 for files `01` through `10`.

Its post-promotion field remains pending in source:
- `required=true`;
- `completed=false`;
- `observedHeadSha=null`;
- `receiptSemanticHash=null`;
- expected gate schema `emp1-wrc537-gamma5-post-promotion-exact-head-gate/v1`;
- expected receipt file `11-post-promotion-exact-head-receipt.json`.

This avoids a self-referential commit-hash problem: the retained source record does not pretend to certify its own final Git SHA.

## 13. Post-promotion gate falsifiers
`scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate-falsifiers.mjs`

A genuine future gate baseline must pass first. The suite then rejects 12 attacks:
1. authorization-record semantic-hash corruption;
2. proposal-hash substitution with record rehash;
3. authorization-base-tree substitution with rehash;
4. global EMP.1.C escalation with rehash;
5. code-compliance escalation with rehash;
6. suspended-evidence hash substitution with rehash;
7. disabling post-promotion qualification in the record;
8. broadening the non-authority workreport metadata pattern;
9. proposal global-authority escalation with rehash;
10. proposal post-promotion-gate disablement with rehash;
11. extra logic injected into the otherwise-allowed route source;
12. nonzero-dp expansion in the otherwise-allowed registry source.

Test-only source/record overrides are accepted only when `EMP1_POST_PROMOTION_FALSIFIER_MODE=true`; normal qualification cannot use them.

Optional future file:
`12-post-promotion-exact-head-falsifier-receipt.json`

Expected future genuine status:
`PASS_POST_PROMOTION_EXACT_HEAD_GATE_ANTI_FORGERY_FALSIFIERS`.

---

# Validation truth

## Static/source review
- suspended-head 6-load/32-stress producer: `COMPLETE_STATIC`;
- workflow-independent 23-stage producer: `COMPLETE_STATIC`;
- independent 23-stage reviewer: `COMPLETE_STATIC`;
- observation/review/proposal anti-forgery layers: `COMPLETE_STATIC`;
- historical-vs-post-authority qualification/oracle transition: `COMPLETE_STATIC`;
- bounded-vs-global EMP.1.C authority separation: `COMPLETE_STATIC`;
- exact 12-mutation future promotion contract: `COMPLETE_STATIC`;
- three-file engineering-authority allowlist + one constrained workreport metadata path: `COMPLETE_STATIC`;
- post-promotion base-tree equality rule: `COMPLETE_STATIC`;
- byte-exact route/registry reconstruction: `COMPLETE_STATIC`;
- retained authorization-record contract: `COMPLETE_STATIC`;
- post-promotion real production-path 6/32 numerical gate: `COMPLETE_STATIC`;
- 12 post-promotion falsifiers: `COMPLETE_STATIC`;
- no production route/registry/global C/code/release file modified by this batch: `COMPLETE_STATIC`.

Local syntax-only parsing of the two newly authored scripts was performed before repository write. No engineering execution occurred.

## Runtime
The available environment still does not contain a complete executable repository checkout.

Current suspended head:
- files `01`–`05`: `NOT_GENERATED`;
- local producer: `NOT_RUN_EXECUTION_ENVIRONMENT`;
- files `06`–`07`: `NOT_GENERATED`;
- independent review/falsifiers: `NOT_RUN_EXECUTION_ENVIRONMENT`;
- files `08`–`10`: `NOT_GENERATED`;
- proposal/check/falsifiers: `NOT_RUN_EXECUTION_ENVIRONMENT`.

Future-only authorization evidence:
- retained authorization record: `NOT_CREATED_BY_THIS_PR`;
- file `11`: `NOT_GENERATED`;
- post-promotion gate: `NOT_RUN_NOT_APPLICABLE_TO_SUSPENDED_HEAD`;
- file `12`: `NOT_GENERATED`;
- post-promotion falsifiers: `NOT_RUN_NOT_APPLICABLE_TO_SUSPENDED_HEAD`.

Full repository regression: `NOT_RUN`.

No unexecuted check is represented as PASS.

---

# Exact suspended-head execution sequence when a complete checkout is available

```text
HEAD_SHA=$(git rev-parse HEAD)
EVIDENCE_DIR=validation/emp1/wrc537-2013/.emp1-gamma5-local-requalification

node scripts/emp1-wrc-gamma5-requalification-local-suite.mjs \
  --expected-head "$HEAD_SHA"

node scripts/emp1-wrc-gamma5-requalification-review-gate.mjs \
  --expected-head "$HEAD_SHA" \
  --evidence-dir "$EVIDENCE_DIR" \
  --write-receipt "$EVIDENCE_DIR/06-independent-review-receipt.json"

node scripts/emp1-wrc-gamma5-requalification-review-gate-falsifiers.mjs \
  --expected-head "$HEAD_SHA" \
  --evidence-dir "$EVIDENCE_DIR" \
  --write-receipt "$EVIDENCE_DIR/07-independent-review-falsifier-receipt.json"

node scripts/emp1-wrc-gamma5-bounded-authorization-proposal.mjs \
  --expected-head "$HEAD_SHA" \
  --evidence-dir "$EVIDENCE_DIR" \
  --write-proposal "$EVIDENCE_DIR/08-bounded-authorization-proposal.json"

node scripts/emp1-wrc-gamma5-bounded-authorization-proposal-check.mjs \
  --expected-head "$HEAD_SHA" \
  --evidence-dir "$EVIDENCE_DIR" \
  --proposal "$EVIDENCE_DIR/08-bounded-authorization-proposal.json" \
  --write-receipt "$EVIDENCE_DIR/09-bounded-authorization-proposal-check-receipt.json"

node scripts/emp1-wrc-gamma5-bounded-authorization-proposal-falsifiers.mjs \
  --expected-head "$HEAD_SHA" \
  --evidence-dir "$EVIDENCE_DIR" \
  --proposal "$EVIDENCE_DIR/08-bounded-authorization-proposal.json" \
  --write-receipt "$EVIDENCE_DIR/10-bounded-authorization-proposal-falsifier-receipt.json"
```

Accept files `01`–`10` only if every expected status is genuine and the source remains suspended with global/code/release authority false.

# Future post-promotion execution sequence
After a separately reviewed authorization patch has applied only the 12 approved engineering mutations + retained authorization record (+ at most one workreport metadata file):

```text
AUTH_HEAD=$(git rev-parse HEAD)
AUTH_BASE=<exact base commit whose tree equals 08.observedSuspendedTreeSha>
EVIDENCE_DIR=<directory containing genuine files 01-10>

node scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate.mjs \
  --expected-head "$AUTH_HEAD" \
  --authorization-base "$AUTH_BASE" \
  --evidence-dir "$EVIDENCE_DIR" \
  --write-receipt "$EVIDENCE_DIR/11-post-promotion-exact-head-receipt.json"

node scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate-falsifiers.mjs \
  --expected-head "$AUTH_HEAD" \
  --authorization-base "$AUTH_BASE" \
  --evidence-dir "$EVIDENCE_DIR" \
  --write-receipt "$EVIDENCE_DIR/12-post-promotion-exact-head-falsifier-receipt.json"
```

A bounded authorization may be considered qualified only if files `11` and `12` are genuine PASS evidence for the exact authorization head and global/code/release authority remain false.

---

# Changed-file ledger
Effective PR files after the current batch:
1. `.github/workflows/emp1-gamma5-main-route.yml` — earlier evidence retention only; untouched by current local/review/proposal/post-promotion batches.
2. `agents/PR1327_workreport.md` — living handover/evidence record.
3. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`.
4. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`.
5. `scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs`.
6. `scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs`.
7. `scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs`.
8. `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs`.
9. `scripts/emp1-wrc-gamma5-requalification-local-suite.mjs`.
10. `scripts/emp1-wrc-gamma5-requalification-review-gate.mjs`.
11. `scripts/emp1-wrc-gamma5-requalification-review-gate-falsifiers.mjs`.
12. `scripts/emp1-wrc-gamma5-bounded-authorization-proposal.mjs`.
13. `scripts/emp1-wrc-gamma5-bounded-authorization-proposal-check.mjs`.
14. `scripts/emp1-wrc-gamma5-bounded-authorization-proposal-falsifiers.mjs`.
15. `scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate.mjs` — future authorization-head source/diff/runtime qualification gate.
16. `scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate-falsifiers.mjs` — 12 future authorization-head anti-forgery/source-expansion falsifiers.

No production route, bounded registry, global C qualification, code-compliance, or release-authority file is changed in #1327.

---

# Open blockers / risks
- `VAL-1327-01`: suspended-head local producer has not executed in a complete checkout.
- `VAL-1327-02`: no genuine files `01`–`05` exist.
- `VAL-1327-03`: independent review and six review falsifiers have not executed.
- `VAL-1327-04`: no genuine files `06`–`07` exist.
- `VAL-1327-05`: proposal/check/falsifiers have not executed.
- `VAL-1327-06`: no genuine files `08`–`10` exist.
- `VAL-1327-07`: post-promotion gate is authored but intentionally not applicable while source remains suspended.
- `VAL-1327-08`: no retained authorization record or files `11`–`12` exist because #1327 does not authorize the route.
- `RISK-1327-01`: historical numerical agreement must not be represented as current route authorization.
- `RISK-1327-02`: historical oracle `5daeb3...` must not remain active after post-authority promotion.
- `RISK-1327-03`: bounded gamma5 authority must never mutate or imply global EMP.1.C qualification.
- `RISK-1327-04`: a proposal/review/gate receipt is evidence, not a source mutation or code-compliance approval.
- `RISK-1327-05`: suspended-head evidence cannot by itself certify a later authorization head.
- `RISK-1327-06`: any base-tree drift before authorization invalidates the promotion basis and requires a new suspended-head qualification cycle.
- `RISK-1327-07`: workreport metadata is permitted only as non-authority process evidence; no other metadata or source path may piggyback on authorization.

---

# Appendix A — takeover qualification
1. Why is candidate qualification `9ea591...` different from historical active `3b437...`?
2. Why must the active oracle move from `5daeb3...` to `607711...` during bounded promotion?
3. Which six WRC load components and 32 stress rows are mandatory?
4. What does `maxToleranceRatio <= 1` prove?
5. Which 23 stages are independently replayed by the review gate?
6. Why must producer stdout/stderr hashes and generated evidence bytes reproduce exactly?
7. Which six coordinated review-layer forgeries are required?
8. Why does the proposal layer not recursively rerun engineering numerics for every proposal falsifier?
9. What are the exact 12 permitted bounded authorization mutations?
10. Which three files carry engineering authority in a future promotion?
11. Why is one `agents/PR[0-9]+_workreport.md` allowed without expanding the engineering-authority allowlist?
12. Which global EMP.1.C files remain explicitly forbidden?
13. Why is `proposalIsAuthorization=false` mandatory?
14. Why must the future authorization base tree equal the qualified suspended tree, even if commit SHA differs after squash?
15. How does byte-exact route/registry reconstruction prevent hidden extra logic inside allowed files?
16. Why must the retained authorization record remain `PENDING_POST_PROMOTION_EXACT_HEAD_QUALIFICATION` rather than embed its own final HEAD SHA?
17. Which runtime source authorities are rebuilt before the real production route call?
18. What exact production state must `runEmp1Wrc537Gamma5ZeroDpRoute()` return after promotion?
19. Which 12 post-promotion attacks must the future falsifier suite detect?
20. Which authority flags must remain false even after bounded route authorization?
21. Why do files `11` and `12` qualify only the exact authorization head on which they were generated?
