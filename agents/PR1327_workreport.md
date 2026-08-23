# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: CURRENT_MAIN_3EE8C485_INTEGRATED_EXECUTION_PENDING`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: 3ee8c485cdcc57e4204e6bad75d0359782564c0f`
- `CURRENT_MAIN_INTEGRATION_COMMIT: da167df9a77cb127fa5feb71087b9ac73edee7a1`
- `LAST_ENGINEERING_HEAD: da167df9a77cb127fa5feb71087b9ac73edee7a1`
- `EXECUTION_TARGET: resolve git rev-parse HEAD at execution; report-only commits after the integration commit are part of the exact execution tree`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE UNTIL CURRENT-HEAD PRODUCER, INDEPENDENT REVIEW, AND PROPOSAL EVIDENCE ARE EXECUTED GREEN AND REVIEWED`

## Mission
Requalify the bounded WRC 537 (2013) cylindrical ORIGINAL gamma=5, differential-pressure=0 route after source-authority closure, while keeping the production route fail-closed until exact-head evidence is executed and independently reviewed.

This PR contains qualification, evidence-custody, independent-review, bounded-authorization-proposal, and future post-promotion-gate tooling. It does **not** authorize production EMP.1.C.

## Current-main custody — 2026-08-23
The previous authority baseline `main@eb6e4c299132644cfd2bddeb5b86dc458524e35d` became stale when main advanced through PR #1330 and PR #1331.

Current main is:
- `3ee8c485cdcc57e4204e6bad75d0359782564c0f` — PR #1331, Load Calc guided-workflow/status/actionability changes.
- parent `b747c98fdda4043fb97eab552d63f85804e87352` — PR #1330.

Audit result for `eb6e4c2991… -> 3ee8c485…`:
- changes are in Load Calc/LFEA workspace, tests and related documentation;
- zero overlap with the 16 effective #1327 files;
- no EMP.1 source-authority, route, bounded-registry, oracle, dataset or load-producer dependency changes were found.

Integration was therefore performed as a true two-parent merge:
- parent 1: prior #1327 head `7c0bdae44179d4b86ad3539908fe00250f5670c4`;
- parent 2: current main `3ee8c485cdcc57e4204e6bad75d0359782564c0f`;
- merged tree: `4d9a8fbe1359396ccde685654614a89578cce434`;
- integration commit: `da167df9a77cb127fa5feb71087b9ac73edee7a1`.

The merged tree used current main as the base and overlaid the 16 #1327 blobs verbatim. Post-integration compare confirms:
- `behind_by = 0`;
- the effective PR diff remains exactly the same 16 paths;
- no production route, bounded registry, global-C qualification, code-compliance or release-authority file entered the diff.

**Stale-base rule:** any qualification observation or proposed evidence tied to a pre-`da167df9…` tree is non-current and cannot authorize or support promotion. The complete suspended-head evidence chain must be generated against the branch HEAD after this integration and any subsequent report-only bookkeeping.

## Protected bounded engineering scope
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
- gamma other than 5 or non-tabulated gamma;
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

Frozen physical benchmark WRC loads:
- `P = -1000`
- `Vc = 250`
- `Vl = -400`
- `Mc = 500000`
- `Ml = -600000`
- `Mt = 700000`

Recovery locations: `Au, Al, Bu, Bl, Cu, Cl, Du, Dl`.

Frozen stress-intensity vector:
`[72.67281563686576, 66.1800949565413, 66.31741974972616, 61.76250020459521, 60.13784797265036, 57.95382326192188, 65.42702806161043, 61.299618330183876]` MPa.

Tolerance policy: `max(1e-12, max(1, |expected|) * 1e-11)`.

Historical Au ≈72.6728 MPa remains comparison evidence only and is not authorization.

---

# Suspended-head qualification chain

## 1–5. Exact-head observation and evidence custody
Controlled scripts:
- `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`
- `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`
- `scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs`
- `scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs`
- `scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs`

The chain requires:
- exact Git HEAD identity;
- independent post-authority oracle/refreeze with no production imports;
- 6/6 WRC load comparisons;
- 4 stress families × 8 locations = 32 comparisons;
- every tolerance ratio <= 1;
- complete per-row actual/expected/delta/tolerance evidence;
- exact subordinate stdout hashes;
- 10 observation anti-forgery mutations detected;
- production/global/code/release authority false.

Expected statuses include:
- `PASS_EXACT_HEAD_REQUALIFICATION_READY_FOR_REVIEW_ROUTE_STILL_SUSPENDED`
- `PASS_REQUALIFICATION_OBSERVATION_FULL_MATRIX_INTEGRITY_ROUTE_STILL_SUSPENDED`
- `PASS_REQUALIFICATION_OBSERVATION_SUBORDINATE_REPLAY_ROUTE_STILL_SUSPENDED`
- `PASS_REQUALIFICATION_OBSERVATION_ANTI_FORGERY_FALSIFIERS`
- `PASS_EXACT_HEAD_EVIDENCE_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED`

## 6. Workflow-independent local producer
`scripts/emp1-wrc-gamma5-requalification-local-suite.mjs`

Owner direction is to skip GitHub workflow execution. This suite is the preferred execution path. It executes 23 ordered qualification stages, requires a clean checkout, binds an explicit exact HEAD, and rejects source mutation outside its dedicated `.emp1-gamma5-*` evidence directory.

Files after genuine producer PASS:
1. `01-observation.json`
2. `02-replay-receipt.json`
3. `03-falsifier-receipt.json`
4. `04-evidence-manifest.json`
5. `05-local-execution-receipt.json`

Expected final producer status:
`PASS_LOCAL_EXACT_HEAD_REQUALIFICATION_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED`.

## 7–8. Independent review and falsification
- `scripts/emp1-wrc-gamma5-requalification-review-gate.mjs`
- `scripts/emp1-wrc-gamma5-requalification-review-gate-falsifiers.mjs`

The independent reviewer re-executes all 23 producer stages on the same HEAD, requires stdout/stderr hashes to reproduce and regenerated evidence bytes to match. Six coordinated review-layer attacks must be rejected.

Optional outputs:
6. `06-independent-review-receipt.json`
7. `07-independent-review-falsifier-receipt.json`

Expected statuses:
- `PASS_INDEPENDENT_EXACT_HEAD_EVIDENCE_REPLAY_READY_FOR_SEPARATE_AUTHORIZATION_REVIEW_ROUTE_STILL_SUSPENDED`
- `PASS_INDEPENDENT_REVIEW_GATE_ANTI_FORGERY_FALSIFIERS`

---

# Bounded authorization proposal — still non-authorizing

## 9–11. Proposal / check / falsifiers
- `scripts/emp1-wrc-gamma5-bounded-authorization-proposal.mjs`
- `scripts/emp1-wrc-gamma5-bounded-authorization-proposal-check.mjs`
- `scripts/emp1-wrc-gamma5-bounded-authorization-proposal-falsifiers.mjs`

Optional outputs:
8. `08-bounded-authorization-proposal.json`
9. `09-bounded-authorization-proposal-check-receipt.json`
10. `10-bounded-authorization-proposal-falsifier-receipt.json`

Expected statuses:
- `READY_TO_DRAFT_SEPARATE_BOUNDED_AUTHORIZATION_CHANGE_NOT_AUTHORIZED`
- `PASS_BOUNDED_AUTHORIZATION_PROPOSAL_INTEGRITY_NOT_AUTHORIZED`
- `PASS_BOUNDED_AUTHORIZATION_PROPOSAL_ANTI_FORGERY_FALSIFIERS_NOT_AUTHORIZED`

The proposal is explicitly non-authorizing and freezes the only acceptable future bounded promotion contract.

### Future engineering-authority allowlist
Only these three files may carry engineering-authority mutations in a later authorization PR:
1. `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`
2. `src/core/emp1/emp1-c-bounded-route-registry.js`
3. new retained record `validation/emp1/wrc537-2013/gamma5-zero-dp-route-authorization-v1.json`

At most one `agents/PR[0-9]+_workreport.md` is allowed separately as non-authority process metadata.

Explicitly forbidden global-authority files:
- `src/core/emp1/emp1-c-qualification-evidence.generated.js`
- `src/core/emp1/emp1-c-qualification-state.js`
- `validation/emp1/wrc537-2013/emp1-c-method-authorization-v1.json`

### Exact 12 future semantic mutations
Route module:
1. qualification `3b437… -> 9ea591…`;
2. oracle `5daeb3… -> 607711…`;
3. route authorized `false -> true`;
4. requalification suspension `[reason] -> []`;
5. method production use `false -> true`.

Bounded registry:
6. qualification `3b437… -> 9ea591…`;
7. `registered: false -> true`;
8. bounded `engineeringUseAuthorized: false -> true`;
9. active suspension `[reason] -> []`;
10. qualification role -> `POST_SOURCE_AUTHORITY_EXACT_HEAD_BOUNDED_REQUALIFICATION`;
11. `routeRequalificationRequired: true -> false`;
12. remove only `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE` from `remainingBlocked`.

All nonzero-dP, nonunity-SCF, Appendix-B, off-axis, gamma/beta/non-tabulated and global-C blockers remain.

---

# Future post-promotion exact-head gate

Controlled scripts:
- `scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate.mjs`
- `scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate-falsifiers.mjs`

These are intentionally not executable as a PASS on the current suspended route. A later authorization HEAD must:
- descend from an authorization base whose Git tree equals the qualified suspended tree exactly;
- change exactly the three engineering-authority files plus at most one workreport metadata file;
- match byte-for-byte the route/registry result reconstructed from the 12 approved mutations;
- retain global EMP.1.C, code and release authority false;
- rerun the real `runEmp1Wrc537Gamma5ZeroDpRoute()` path;
- reproduce 6/6 WRC loads and 32/32 stresses within tolerance;
- pass 12 post-promotion anti-forgery attacks.

Future outputs only:
11. `11-post-promotion-exact-head-receipt.json`
12. `12-post-promotion-exact-head-falsifier-receipt.json`

Expected future statuses:
- `PASS_POST_PROMOTION_EXACT_HEAD_BOUNDED_ROUTE_AUTHORIZATION_QUALIFIED_GLOBAL_C_STILL_BLOCKED`
- `PASS_POST_PROMOTION_EXACT_HEAD_GATE_ANTI_FORGERY_FALSIFIERS`

---

# Validation truth at current integrated branch

## Source/static state
- current-main overlap audit: `PASS_STATIC_NO_EMP1_OVERLAP`
- true two-parent current-main integration: `COMPLETE`
- post-integration compare: `PASS_0_BEHIND_CURRENT_MAIN`
- effective PR files preserved: `PASS_16_PATHS_UNCHANGED`
- route/registry/global-C/code/release production authority modifications in #1327: `NONE`
- qualification architecture through future post-promotion gate: `AUTHORED`

## Runtime state
The available local execution environment does not contain a complete checkout, and direct GitHub clone fails with `Could not resolve host: github.com`.

Therefore:
- local 23-stage producer on current integrated HEAD: `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`
- files `01`–`05`: `NOT_GENERATED`
- independent review: `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`
- files `06`–`07`: `NOT_GENERATED`
- proposal/check/falsifiers: `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`
- files `08`–`10`: `NOT_GENERATED`
- future post-promotion gate: `NOT_RUN_NOT_APPLICABLE_TO_SUSPENDED_HEAD`
- future files `11`–`12`: `NOT_GENERATED`
- full repository regression: `NOT_RUN`

No unexecuted check is represented as PASS.

## Exact execution sequence when a complete checkout is available
```bash
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

Accept only genuine current-HEAD evidence. Do not reuse evidence from a pre-integration tree.

---

# Changed-file ledger
Effective PR files after integration remain exactly 16:
1. `.github/workflows/emp1-gamma5-main-route.yml` — earlier evidence retention only; current owner direction is to skip GitHub workflow execution.
2. `agents/PR1327_workreport.md` — living handover/evidence/custody record.
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
15. `scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate.mjs`.
16. `scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate-falsifiers.mjs`.

No production route, bounded registry, global EMP.1.C qualification, code-compliance or release-authority file is changed in #1327.

# Open blockers / risks
- `VAL-1327-01`: current integrated branch has not executed the 23-stage local producer.
- `VAL-1327-02`: no genuine files `01`–`05` exist on the current integrated head.
- `VAL-1327-03`: independent review/falsifiers have not executed; files `06`–`07` absent.
- `VAL-1327-04`: proposal/check/falsifiers have not executed; files `08`–`10` absent.
- `VAL-1327-05`: future post-promotion evidence is not applicable to the suspended route.
- `ENV-1327-01`: direct clone unavailable in current runtime because `github.com` DNS resolution fails.
- `RISK-1327-01`: stale pre-`da167df9…` evidence must never be represented as current evidence.
- `RISK-1327-02`: historical numerical agreement must not be represented as authorization.
- `RISK-1327-03`: historical oracle `5daeb3…` must not survive as active benchmark identity in a future post-authority authorization.
- `RISK-1327-04`: bounded gamma5 authority must never imply global EMP.1.C, code or release authority.

# Appendix A — takeover qualification
1. Why did `main@3ee8c485…` have to be integrated before any exact-head run?
2. What proves PR #1330/#1331 had no EMP.1 overlap?
3. Why is `da167df9…` an engineering integration commit while later workreport commits are execution-tree bookkeeping?
4. Why is pre-integration evidence stale even when the EMP.1 blobs themselves are unchanged?
5. Which six WRC load components and 32 stress rows are mandatory?
6. What does `maxToleranceRatio <= 1` prove?
7. Why must the independent reviewer re-execute all 23 producer stages?
8. Which files `01`–`10` must exist before a separate authorization change can be drafted?
9. Why is candidate qualification `9ea591…` different from active historical `3b437…`?
10. Why must the active oracle change from `5daeb3…` to `607711…` in a later authorization?
11. Which three files may carry future engineering-authority mutations?
12. Why may one workreport file be present without broadening engineering authority?
13. What are the exact 12 allowed future mutations?
14. Which global EMP.1.C files and claims remain forbidden?
15. Why must a future authorization HEAD be independently exact-head qualified again?
16. Which authority flags must remain false even after bounded route authorization?
17. Why is the current runtime classification `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE` rather than PASS or FAIL?
