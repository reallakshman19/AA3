# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: LOCAL_PRODUCER_REVIEW_AND_BOUNDED_AUTHORIZATION_PROPOSAL_AUTHORED_EXECUTION_PENDING`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: eb6e4c299132644cfd2bddeb5b86dc458524e35d`
- `CURRENT_MAIN_INTEGRATION_COMMIT: 056ccf15d71e3a7cceca327afae949f442f24489`
- `LAST_ENGINEERING_HEAD: a12a7cc0bdf90ce92adf6e09c54650f0d17782bf`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE_UNTIL EXACT_HEAD PRODUCER, INDEPENDENT REVIEW, AND PROPOSAL EVIDENCE ARE EXECUTED GREEN AND REVIEWED`

## Mission
Requalify the bounded WRC 537 cylindrical original gamma=5, differential-pressure=0 route after source-authority closure, while keeping the route fail-closed until executable exact-head evidence is independently replayed and a separate bounded authorization change is reviewed.

This PR is qualification, evidence-custody, review, and authorization-preparation tooling. It does **not** authorize production C.

## Protected engineering boundary
The only candidate future production scope remains:
- shell family: `CYLINDRICAL`;
- attachment shape: `ROUND`;
- variant: `ORIGINAL`;
- gamma: exactly `5`;
- beta: `0.05 <= beta <= 0.5`;
- differential pressure: exactly `0`;
- stress concentration: `Kn=1`, `Kb=1`;
- recovery: WRC Table-5 eight shell-juncture points;
- longitudinal moment figures: `1B / 2B` for the eight-point axis-of-symmetry route;
- runtime typed r0/applicability/axis/load custody remains mandatory.

Still prohibited:
- nonzero differential pressure;
- nonunity/general Appendix-B SCF;
- off-axis/global maximum claims;
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

Historical Au ≈72.6728 MPa remains comparison evidence only.

## Current-main custody
`main` remains `eb6e4c299132644cfd2bddeb5b86dc458524e35d` and #1327 is currently `0` commits behind it.

Earlier main advances were integrated before the qualification tooling was extended:
1. PR #1325 merge `1d08bcd0fdebc86fc2daaeb752f129b877e01c74`;
2. PR #1322 merge `b404fb4d01c9e76caba5034071d506b014d2c3f0`, integrated into #1327 at `c404557e49bb1d71bb3d62d49aea7591d0a0ede6`;
3. PR #1328 merge `eb6e4c299132644cfd2bddeb5b86dc458524e35d`, integrated into #1327 at `056ccf15d71e3a7cceca327afae949f442f24489`.

Stale-base qualification is prohibited. If main advances before execution, integrate current main first.

---

# Qualification chain

## 1. Exact-head producer observation
`scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`

Requires exact `git rev-parse HEAD == expected SHA` and re-observes the production candidate against the post-authority independent oracle.

Mandatory numerical evidence:
- six WRC loads: `P, Vc, Vl, Mc, Ml, Mt`;
- four stress families × eight locations `Au, Al, Bu, Bl, Cu, Cl, Du, Dl` = 32 comparisons;
- tolerance `max(1e-12, max(1, |expected|) * 1e-11)`;
- complete actual/expected/delta/tolerance/tolerance-ratio rows;
- candidate/oracle/source/dataset/load-producer/independent-authority hashes;
- subordinate stdout hashes;
- all production/global/code/release authority false.

Expected genuine status:
`PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED`.

## 2. Full-matrix verifier
`scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`

Recomputes:
- all six WRC load rows;
- all 32 stress comparisons;
- per-row tolerance and ratio;
- stress-intensity vector;
- maxima/governing row;
- semantic hash;
- controlled source/qualification hashes;
- fail-closed authority state.

Expected genuine status:
`PASS_REQUALIFICATION_OBSERVATION_FULL_MATRIX_INTEGRITY_ROUTE_STILL_SUSPENDED`.

## 3. Subordinate evidence replay
`scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs`

Reruns and requires byte-identical stdout SHA-256/status custody for:
- independent oracle decoupling/refreeze;
- independent oracle falsifiers;
- candidate binding;
- route-authority currentness falsifiers;
- product qualification;
- complete sample.

Expected genuine status:
`PASS_REQUALIFICATION_OBSERVATION_SUBORDINATE_REPLAY_ROUTE_STILL_SUSPENDED`.

## 4. Observation anti-forgery falsifiers
`scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs`

Requires a genuine replay baseline, then rejects ten tampered/rehashed observation variants.

Expected genuine status:
`PASS_REQUALIFICATION_OBSERVATION_ANTI_FORGERY_FALSIFIERS`.

## 5. Evidence manifest
`scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs`

Binds exact HEAD/tree/parents, evidence-file hashes, candidate/oracle/source/dataset/load-producer identities, 6/6 loads, 32/32 stresses, tolerance result, and false production/global/code/release authority.

For local execution (`GITHUB_ACTIONS=false`), all GitHub-only execution-context fields are forced to `null`; stale shell `GITHUB_*` variables cannot perturb local evidence identity.

Expected genuine status:
`PASS_EXACT_HEAD_EVIDENCE_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED`.

---

# Workflow-independent local producer

## 6. One-command local suite
`scripts/emp1-wrc-gamma5-requalification-local-suite.mjs`

Owner direction for the current batches: skip GitHub workflow execution.

The local suite requires a complete clean repository checkout, explicit exact HEAD, and a tightly constrained generated evidence directory directly under:
`validation/emp1/wrc537-2013/`.

Default:
`validation/emp1/wrc537-2013/.emp1-gamma5-local-requalification/`

It executes 23 ordered stages:
1. exact-head observation;
2. full-matrix verifier;
3. independent-oracle import firewall;
4. independent oracle decoupling;
5. independent oracle falsifiers;
6. post-authority oracle falsifiers;
7. full Table-5 independent hand calculation;
8. r0 outside-radius custody;
9. r0 source authority;
10. r0 unit coherence;
11. candidate qualification binding;
12. workbench product qualification;
13. cylindrical applicability;
14. eight-point extrema scope;
15. unity SCF authority;
16. longitudinal-moment curve selection;
17. zero-dp load producer;
18. cylindrical axis authority;
19. suspended production-candidate comparison;
20. public-product truth;
21. subordinate replay;
22. ten observation anti-forgery falsifiers;
23. evidence manifest.

It rejects source mutation outside the evidence directory after every stage and records deterministic stdout/stderr hashes. Wall-clock timestamps are excluded from semantic receipt identity.

Files produced after a genuine producer PASS:
1. `01-observation.json`
2. `02-replay-receipt.json`
3. `03-falsifier-receipt.json`
4. `04-evidence-manifest.json`
5. `05-local-execution-receipt.json`

Expected final status:
`PASS_LOCAL_EXACT_HEAD_REQUALIFICATION_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED`.

---

# Independent review layer

## 7. Independent review gate
`scripts/emp1-wrc-gamma5-requalification-review-gate.mjs`

The five-file producer package is not trusted solely because its internal hashes are consistent.

The independent review gate:
- validates raw file hashes/byte counts and semantic hashes;
- verifies exact HEAD/tree/parents;
- reruns all 23 producer stages on the same HEAD;
- requires all 23 stdout/stderr hashes to reproduce;
- requires regenerated observation, replay receipt, falsifier receipt and manifest to be byte-identical to the stored producer evidence.

Optional file:
`06-independent-review-receipt.json`

Expected genuine status:
`PASS_INDEPENDENT_EXACT_HEAD_EVIDENCE_REPLAY_READY_FOR_SEPARATE_AUTHORIZATION_REVIEW_ROUTE_STILL_SUSPENDED`.

`evidenceEligibleForSeparateAuthorizationReview=true` means review eligibility only. It does not authorize the route.

## 8. Independent-review falsifiers
`scripts/emp1-wrc-gamma5-requalification-review-gate-falsifiers.mjs`

Requires the genuine independent-review baseline first, then rejects six coordinated review-layer forgeries:
1. local-suite semantic-hash corruption;
2. local-suite authorization escalation with rehash;
3. local manifest GitHub-context pollution with coordinated rehash;
4. producer stdout-hash substitution with local rehash;
5. manifest stress-count downgrade with coordinated rehash;
6. stored-observation authority escalation.

The receipt now carries `falsifierSemanticHash`; downstream proposal tooling validates it rather than recursively rerunning the entire 23-stage engineering suite.

Optional file:
`07-independent-review-falsifier-receipt.json`

Expected genuine status:
`PASS_INDEPENDENT_REVIEW_GATE_ANTI_FORGERY_FALSIFIERS`.

---

# 2026-08-23 next batch — bounded authorization proposal, still non-authorizing

## Engineering finding: historical route oracle is stale for promotion
The production route module currently retains:
- active qualification `3b437...`;
- benchmark hash `5daeb3...`;
- route authorization `false`;
- requalification suspension reason.

Candidate qualification v2 explicitly states:
- successor qualification `9ea591...`;
- post-authority benchmark/oracle `607711...`;
- historical oracle `5daeb3...` is superseded because of post-EMP1-12..15 source-authority closure and the `1B-1/2B-1 -> 1B/2B` refreeze.

Therefore a later authorization cannot be a boolean-only patch. The oracle and qualification identities must also move to the post-authority values.

## Engineering finding: bounded route authority is not global EMP.1.C authority
`src/core/emp1/emp1-c-qualification-state.js` and retained generated qualification evidence still describe the broader global EMP.1.C program, which remains blocked on unresolved/general WRC dataset/runtime/CAUx items.

That broader state must remain untouched by bounded gamma5 authorization.

### Explicit forbidden global authority files
- `src/core/emp1/emp1-c-qualification-evidence.generated.js`
- `src/core/emp1/emp1-c-qualification-state.js`
- `validation/emp1/wrc537-2013/emp1-c-method-authorization-v1.json`

## 9. Bounded authorization proposal builder
`scripts/emp1-wrc-gamma5-bounded-authorization-proposal.mjs`

Requires genuine files `01`–`07`, exact suspended HEAD, self-verifying producer/review/falsifier receipts, exact review-falsifier names, candidate v2 identity, and exact current source preimages.

It also requires the broader global C qualification state to remain blocked.

Optional file:
`08-bounded-authorization-proposal.json`

Expected status:
`READY_TO_DRAFT_SEPARATE_BOUNDED_AUTHORIZATION_CHANGE_NOT_AUTHORIZED`.

The proposal is explicitly `proposalIsAuthorization=false`.

### Exact future file allowlist
Only a later, separately reviewed bounded authorization change may touch:
1. `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`
2. `src/core/emp1/emp1-c-bounded-route-registry.js`
3. new retained record `validation/emp1/wrc537-2013/gamma5-zero-dp-route-authorization-v1.json`

No other production/global/code/release authority file is permitted by this proposal.

### Exact 12 future semantic mutations
Route module:
1. `EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256`: `3b437... -> 9ea591...`;
2. `FULL_TABLE5_ORACLE_HASH`: `5daeb3... -> 607711...`;
3. `EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED`: `false -> true`;
4. `EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS`: `[REQUALIFICATION_REQUIRED] -> []`;
5. `EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.productionUseAuthorized`: `false -> true`.

Bounded registry:
6. `EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256`: `3b437... -> 9ea591...`;
7. route `registered`: `false -> true`;
8. bounded `engineeringUseAuthorized`: `false -> true`;
9. active `suspensionReasons`: `[REQUALIFICATION_REQUIRED] -> []`;
10. qualification role: historical pre-EMP1-12..15 -> post-source-authority exact-head bounded requalification;
11. `routeRequalificationRequired`: `true -> false`;
12. `remainingBlocked`: remove only `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`; retain nonzero-dP, nonunity-SCF, Appendix-B, off-axis, gamma/beta/non-tabulated and global-C blockers.

The new retained authorization record is required to reference the proposal semantic hash and files `01`–`07`.

## 10. Proposal integrity verifier
`scripts/emp1-wrc-gamma5-bounded-authorization-proposal-check.mjs`

Rebuilds the canonical proposal from current source + evidence and requires deep equality with stored file `08`.

Optional file:
`09-bounded-authorization-proposal-check-receipt.json`

Expected status:
`PASS_BOUNDED_AUTHORIZATION_PROPOSAL_INTEGRITY_NOT_AUTHORIZED`.

## 11. Proposal anti-forgery falsifiers
`scripts/emp1-wrc-gamma5-bounded-authorization-proposal-falsifiers.mjs`

Requires a genuine proposal-check baseline, then rejects ten proposal-layer attacks:
1. proposal semantic-hash corruption;
2. candidate-qualification substitution;
3. retention of historical oracle instead of post-authority oracle;
4. global EMP.1.C authority escalation;
5. release-authority escalation;
6. injection of a global qualification file into the future allowlist;
7. removal of the required post-authority-oracle mutation;
8. disabling the post-promotion exact-head gate;
9. route-source preimage hash substitution;
10. nonzero-dP scope expansion.

Optional file:
`10-bounded-authorization-proposal-falsifier-receipt.json`

Expected status:
`PASS_BOUNDED_AUTHORIZATION_PROPOSAL_ANTI_FORGERY_FALSIFIERS_NOT_AUTHORIZED`.

## Runtime architecture note
The engineering numerics are deliberately **not** recursively replayed inside proposal falsifiers.

Correct layering is:
1. producer executes 23 stages once;
2. independent reviewer re-executes all 23 stages and proves byte/hash identity;
3. review falsifiers challenge the reviewer;
4. proposal layer verifies self-verifying files `01`–`07`, candidate identity, current source preimages and exact promotion scope;
5. proposal verifier/falsifiers operate on the deterministic proposal contract.

This preserves strong custody without making ten proposal falsifiers trigger thousands of repeated engineering calculations.

---

# Post-promotion rule
Even files `08`–`10` passing does **not** authorize production.

A separate authorization change would create a different Git HEAD. Therefore:
- the authorization head must differ from the suspended evidence head;
- the future change must be restricted to the exact allowlist/mutations above plus retained authorization record;
- a dedicated post-promotion exact-head qualification must run on that new authorization head;
- promotion may not be called complete merely because this proposal exists;
- global EMP.1.C, code and release authority must remain false after the bounded route is enabled.

This post-promotion gate is a successor concern; #1327 does not apply the authorization patch.

---

# Validation truth

## Static/source review
- current-main integration: `COMPLETE_STATIC`;
- six-load/32-row contract: `COMPLETE_STATIC`;
- workflow-independent producer architecture: `COMPLETE_STATIC`;
- independent 23-stage reviewer architecture: `COMPLETE_STATIC`;
- review-layer falsifier design: `COMPLETE_STATIC`;
- review falsifier semantic receipt: `COMPLETE_STATIC`;
- historical-vs-post-authority oracle audit: `COMPLETE_STATIC`;
- bounded-vs-global EMP.1.C authority audit: `COMPLETE_STATIC`;
- exact 12-mutation future promotion contract: `COMPLETE_STATIC`;
- future three-file allowlist/global-file denylist: `COMPLETE_STATIC`;
- proposal verifier/falsifier design: `COMPLETE_STATIC`;
- no production route/registry/global C/code/release file modified by the current batch: `COMPLETE_STATIC`.

## Runtime
The available execution environment still does not contain a complete executable repository checkout.

Therefore:
- files `01`–`05`: `NOT_GENERATED`;
- local producer PASS: `NOT_RUN_EXECUTION_ENVIRONMENT`;
- file `06`: `NOT_GENERATED`;
- independent review PASS: `NOT_RUN_EXECUTION_ENVIRONMENT`;
- file `07`: `NOT_GENERATED`;
- six review falsifiers: `NOT_RUN_EXECUTION_ENVIRONMENT`;
- file `08`: `NOT_GENERATED`;
- proposal builder: `NOT_RUN_EXECUTION_ENVIRONMENT`;
- file `09`: `NOT_GENERATED`;
- proposal verifier: `NOT_RUN_EXECUTION_ENVIRONMENT`;
- file `10`: `NOT_GENERATED`;
- proposal falsifiers: `NOT_RUN_EXECUTION_ENVIRONMENT`;
- full repository regression: `NOT_RUN`.

No unexecuted check is represented as PASS.

---

# Exact execution sequence when a complete checkout is available

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

Accept only if all expected statuses are genuine and production/global/code/release authority remains false on this suspended head.

---

# Changed-file ledger
Effective PR files at the end of this batch:
1. `.github/workflows/emp1-gamma5-main-route.yml` — earlier evidence retention only; not changed in the current local/review/proposal batches.
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

No production route, bounded registry, global C qualification, code-compliance, or release-authority file is changed in #1327.

---

# Open blockers / risks
- `VAL-1327-01`: workflow-independent producer has not executed on a complete checkout.
- `VAL-1327-02`: no genuine files `01`–`05` exist.
- `VAL-1327-03`: independent review and six review falsifiers have not executed.
- `VAL-1327-04`: no genuine files `06`–`07` exist.
- `VAL-1327-05`: bounded authorization proposal/check/falsifiers have not executed.
- `VAL-1327-06`: no genuine files `08`–`10` exist.
- `VAL-1327-07`: post-promotion exact-head gate is required before a later authorization can be considered complete.
- `RISK-1327-01`: historical numerical agreement must not be represented as current route authorization.
- `RISK-1327-02`: `5daeb3...` is a historical oracle and must not survive as the active benchmark identity in a later post-authority authorization patch.
- `RISK-1327-03`: bounded gamma5 authority must never mutate or imply global EMP.1.C qualification.
- `RISK-1327-04`: a proposal or review receipt is not a signature/authorization; retained evidence and exact-head source custody remain mandatory.
- `RISK-1327-05`: evidence from the suspended head cannot by itself certify the later authorization head.

---

# Appendix A — takeover qualification
1. Why is candidate qualification `9ea591...` different from historical active `3b437...`?
2. Why must the active benchmark change from `5daeb3...` to `607711...` in a later bounded authorization?
3. Which six WRC components and 32 stress rows are mandatory?
4. What does `maxToleranceRatio <= 1` prove?
5. Why is the local producer restricted to one generated evidence directory?
6. How does the producer prove no source mutation occurs?
7. Which 23 stages are independently replayed by the review gate?
8. Why must stdout/stderr hashes and generated evidence bytes reproduce exactly?
9. Which six coordinated review-layer forgeries are required?
10. Why does the review-falsifier receipt carry its own semantic hash?
11. Why does the proposal layer not recursively rerun all engineering numerics for each proposal falsifier?
12. Which three files are allowed in a future bounded authorization change?
13. Which global EMP.1.C files are explicitly forbidden?
14. What are the exact 12 permitted future semantic mutations?
15. Why is `proposalIsAuthorization=false` mandatory?
16. Why must files `08`–`10` remain non-authorizing?
17. Why must the future authorization head be separately exact-head qualified?
18. Which authority flags must remain false even after bounded route authorization?
