# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: CURRENT_MAIN_INTEGRATED_CURRENT_HEAD_RUNNER_PRECHECKOUT_BLOCKED`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: 3ee8c485cdcc57e4204e6bad75d0359782564c0f`
- `CURRENT_MAIN_INTEGRATION_COMMIT: da167df9a77cb127fa5feb71087b9ac73edee7a1`
- `LAST_ENGINEERING_HEAD: da167df9a77cb127fa5feb71087b9ac73edee7a1`
- `REPORT_HEAD: resolve current branch HEAD; report-only commits are intentionally not self-pinned`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE UNTIL CURRENT-HEAD PRODUCER, INDEPENDENT REVIEW, AND PROPOSAL EVIDENCE ARE EXECUTED GREEN AND REVIEWED`

## Mission
Requalify the bounded WRC 537 (2013) cylindrical ORIGINAL gamma=5, differential-pressure=0 route after source-authority closure while keeping production fail-closed until exact-head evidence is executed and independently reviewed.

This PR contains qualification, evidence-custody, independent-review, bounded-authorization-proposal, and future post-promotion-gate tooling. It does **not** authorize production EMP.1.C.

## Current-main custody
Current main remains:
- `3ee8c485cdcc57e4204e6bad75d0359782564c0f` — PR #1331.
- parent `b747c98fdda4043fb97eab552d63f85804e87352` — PR #1330.

The advance from the previous base was audited as Load Calc/LFEA workspace/tests/docs only, with zero overlap with the 16 effective #1327 paths and no EMP.1 source-authority, route, bounded-registry, oracle, dataset, or load-producer dependency change.

Current main was integrated by true two-parent merge:
- parent 1: prior #1327 head `7c0bdae44179d4b86ad3539908fe00250f5670c4`;
- parent 2: `main@3ee8c485cdcc57e4204e6bad75d0359782564c0f`;
- merged tree: `4d9a8fbe1359396ccde685654614a89578cce434`;
- integration commit: `da167df9a77cb127fa5feb71087b9ac73edee7a1`.

Post-integration custody:
- `behind_by = 0` against current main;
- effective PR diff remains exactly 16 paths;
- no production route, bounded registry, global-C qualification, code-compliance, or release-authority file entered the diff.

**Stale-base rule:** any evidence tied to a pre-`da167df9…` tree is non-current. Exact-head qualification must bind the actual branch HEAD at execution time, including report-only bookkeeping commits.

## Protected bounded engineering scope
Candidate future authority is limited to:
- shell `CYLINDRICAL`;
- attachment `ROUND`;
- WRC variant `ORIGINAL`;
- gamma exactly `5`;
- beta `0.05 <= beta <= 0.5`;
- differential pressure exactly `0`;
- `Kn=1`, `Kb=1`;
- Table-5 eight shell-juncture locations `Au, Al, Bu, Bl, Cu, Cl, Du, Dl`;
- longitudinal moment figures `1B / 2B`;
- typed r0, applicability, cylindrical-axis and load-custody evidence mandatory.

Still prohibited: nonzero dP; nonunity/general Appendix-B SCF; off-axis/global maxima; other/non-tabulated gamma; beta outside range; extrapolated/cross-variant fallback; attachment/nozzle stress; WRC 297; global EMP.1.C authority; code-compliance authority; release qualification.

## Controlled identities
- historical active route qualification: `3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e`;
- historical oracle: `5daeb3a84828cf19017e6d1d0a70bd3478929713973948f875f21cec463a80aa`;
- candidate qualification: `9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7`;
- post-authority physical oracle: `60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18`;
- source PDF SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`;
- dataset hash: `fb440a292f8794430977f60f5365a678a9aff62a4dae3397621902964a0db73c`;
- load-producer qualification: `47a9157ba88a5646021fabd41cd803028e1880c8d6f712095afda429f2c2622b`.

Frozen physical WRC loads:
- `P=-1000`, `Vc=250`, `Vl=-400`, `Mc=500000`, `Ml=-600000`, `Mt=700000`.

Frozen stress-intensity vector, MPa:
`[72.67281563686576, 66.1800949565413, 66.31741974972616, 61.76250020459521, 60.13784797265036, 57.95382326192188, 65.42702806161043, 61.299618330183876]`.

Tolerance: `max(1e-12, max(1, |expected|) * 1e-11)`.

Historical Au ≈72.6728 MPa is comparison evidence only, never authorization.

## Suspended-head evidence chain
### Producer / custody
Controlled scripts:
- `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`
- `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`
- `scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs`
- `scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs`
- `scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs`
- `scripts/emp1-wrc-gamma5-requalification-local-suite.mjs`

A genuine producer PASS requires exact HEAD/tree/parents, 6/6 WRC loads, 32/32 stress comparisons, all tolerance ratios <=1, exact subordinate stdout hashes, 10/10 observation falsifiers, no source mutation, and false production/global/code/release authority.

Expected files:
1. `01-observation.json`
2. `02-replay-receipt.json`
3. `03-falsifier-receipt.json`
4. `04-evidence-manifest.json`
5. `05-local-execution-receipt.json`

Expected producer status:
`PASS_LOCAL_EXACT_HEAD_REQUALIFICATION_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED`.

### Independent review
Controlled scripts:
- `scripts/emp1-wrc-gamma5-requalification-review-gate.mjs`
- `scripts/emp1-wrc-gamma5-requalification-review-gate-falsifiers.mjs`

The review gate re-executes all 23 producer stages on the same exact HEAD and requires stdout/stderr hashes and regenerated evidence bytes to reproduce. Six coordinated review-layer attacks must be rejected.

Expected files:
6. `06-independent-review-receipt.json`
7. `07-independent-review-falsifier-receipt.json`

### Bounded authorization proposal — non-authorizing
Controlled scripts:
- `scripts/emp1-wrc-gamma5-bounded-authorization-proposal.mjs`
- `scripts/emp1-wrc-gamma5-bounded-authorization-proposal-check.mjs`
- `scripts/emp1-wrc-gamma5-bounded-authorization-proposal-falsifiers.mjs`

Expected files:
8. `08-bounded-authorization-proposal.json`
9. `09-bounded-authorization-proposal-check-receipt.json`
10. `10-bounded-authorization-proposal-falsifier-receipt.json`

The proposal remains explicitly non-authorizing.

## Future bounded authorization contract
Only these three files may carry engineering-authority mutations in a later authorization PR:
1. `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`
2. `src/core/emp1/emp1-c-bounded-route-registry.js`
3. new retained `validation/emp1/wrc537-2013/gamma5-zero-dp-route-authorization-v1.json`

At most one `agents/PR[0-9]+_workreport.md` may additionally change as non-authority process metadata.

Exact future engineering mutations are frozen to 12: qualification/oracle promotion; route authorization; clearing only the requalification suspension; method production-use authorization; bounded registry qualification/registration/engineering authority; updated qualification role; `routeRequalificationRequired=false`; and removal of only the requalification blocker from `remainingBlocked`.

Forbidden global-authority files remain:
- `src/core/emp1/emp1-c-qualification-evidence.generated.js`
- `src/core/emp1/emp1-c-qualification-state.js`
- `validation/emp1/wrc537-2013/emp1-c-method-authorization-v1.json`

## Future post-promotion exact-head gate
Controlled scripts:
- `scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate.mjs`
- `scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate-falsifiers.mjs`

These are not applicable as PASS on the current suspended route. A future authorization HEAD must descend from a byte-identical qualified base tree, contain only the approved engineering mutations plus optional workreport metadata, reproduce 6/6 loads and 32/32 stresses through the real production path, keep global/code/release authority false, and reject 12 post-promotion attacks.

Future files only:
11. `11-post-promotion-exact-head-receipt.json`
12. `12-post-promotion-exact-head-falsifier-receipt.json`

## Validation truth — 2026-08-23 current-head refresh
### Source/static state
- current main: `3ee8c485cdcc57e4204e6bad75d0359782564c0f`
- current-main integration: `COMPLETE`
- branch comparison: `PASS_0_BEHIND_CURRENT_MAIN`
- effective PR paths: `PASS_16_PATHS`
- PR comments: `0`
- submitted reviews: `0`
- review threads: `0`
- production route/registry/global-C/code/release authority modifications: `NONE`

### Current-head automatic GitHub Actions observation
The prior report head `e6f55bbe941ccd458abb4d8ae2ee6ed050a5094a` automatically received four pull-request workflow runs:
- `32633206331` — EMP.1 current-main independent baseline — `failure`
- `32633206336` — EMP.1 runEmp1 bounded gamma5 orchestration — `failure`
- `32633206348` — EMP.1 independent WRC source oracle — `failure`
- `32633206370` — EMP.1 gamma5 bounded route on current main — `failure`

The gamma5 job was `97179001067` and reported:
- status `completed`;
- conclusion `failure`;
- `steps = null`;
- `logs_url = null`;
- artifacts for run `32633206370` = `[]`.

Classification: `NOT_RUN_EXECUTION_ENVIRONMENT_PRECHECKOUT`.

This is not an engineering-code FAIL and not a qualification PASS. No checkout, Node setup, repository command, exact-head producer, independent replay, falsifier, evidence manifest, or artifact generation is evidenced. No rerun was requested or triggered in this batch.

### Local execution state
The available runtime still does not contain a complete checkout, and direct clone previously failed with `Could not resolve host: github.com`.

Therefore:
- local 23-stage producer: `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`
- files `01`–`05`: `NOT_GENERATED`
- independent review/falsifiers: `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`
- files `06`–`07`: `NOT_GENERATED`
- proposal/check/falsifiers: `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`
- files `08`–`10`: `NOT_GENERATED`
- future post-promotion gate: `NOT_RUN_NOT_APPLICABLE_TO_SUSPENDED_HEAD`
- files `11`–`12`: `NOT_GENERATED`
- full repository regression: `NOT_RUN`

No unexecuted check is represented as PASS.

## Changed-file ledger
Effective PR diff remains exactly 16 paths:
1. `.github/workflows/emp1-gamma5-main-route.yml`
2. `agents/PR1327_workreport.md`
3. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`
4. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`
5. `scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs`
6. `scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs`
7. `scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs`
8. `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs`
9. `scripts/emp1-wrc-gamma5-requalification-local-suite.mjs`
10. `scripts/emp1-wrc-gamma5-requalification-review-gate.mjs`
11. `scripts/emp1-wrc-gamma5-requalification-review-gate-falsifiers.mjs`
12. `scripts/emp1-wrc-gamma5-bounded-authorization-proposal.mjs`
13. `scripts/emp1-wrc-gamma5-bounded-authorization-proposal-check.mjs`
14. `scripts/emp1-wrc-gamma5-bounded-authorization-proposal-falsifiers.mjs`
15. `scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate.mjs`
16. `scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate-falsifiers.mjs`

No production route, bounded registry, global EMP.1.C qualification, code-compliance, or release-authority file is changed.

## Open blockers / risks
- `VAL-1327-01`: current branch has not executed the 23-stage local producer.
- `VAL-1327-02`: files `01`–`05` do not exist as genuine current-head evidence.
- `VAL-1327-03`: independent review/falsifiers have not executed; files `06`–`07` absent.
- `VAL-1327-04`: proposal/check/falsifiers have not executed; files `08`–`10` absent.
- `VAL-1327-05`: future post-promotion evidence is not applicable to the suspended route.
- `ENV-1327-01`: local runtime cannot obtain a complete checkout through direct GitHub clone.
- `ENV-1327-02`: automatically triggered current-head GitHub jobs still terminate before step materialization (`steps=null`, `logs_url=null`).
- `RISK-1327-01`: pre-integration evidence must never be represented as current.
- `RISK-1327-02`: historical numerical agreement must not be represented as authorization.
- `RISK-1327-03`: historical oracle `5daeb3…` must not survive as the active benchmark identity after future bounded authorization.
- `RISK-1327-04`: bounded gamma5 authority must never imply global EMP.1.C, code, or release authority.

## Next valid transition
Do **not** add more qualification code merely because execution is unavailable.

At the next handoff:
1. resolve current `main` and branch HEAD;
2. if main moved, integrate it before execution;
3. otherwise execute the existing local 23-stage suite in a complete checkout;
4. require genuine files `01`–`10` and exact-head independent review before drafting any bounded authorization change;
5. keep PR draft and production authority false until that evidence is green and reviewed.

## Appendix A — takeover qualification
1. Why must current main be integrated before every exact-head run?
2. Why is evidence from a byte-identical but older Git commit still non-current under this custody model?
3. Which six WRC load components and 32 stress rows are mandatory?
4. What does `maxToleranceRatio <= 1` prove?
5. Why must the independent reviewer rerun all 23 producer stages?
6. What distinguishes files `01`–`05`, `06`–`07`, and `08`–`10`?
7. Why is proposal file `08` non-authorizing?
8. Why must candidate qualification `9ea591…` replace historical `3b437…` in a later authorization?
9. Why must oracle `607711…` replace historical `5daeb3…`?
10. Which three files may carry future engineering-authority mutations?
11. Why may a workreport coexist without broadening engineering authority?
12. Which global/code/release claims remain forbidden?
13. Why are current automatic workflow failures classified `NOT_RUN_EXECUTION_ENVIRONMENT_PRECHECKOUT` rather than engineering FAIL?
14. Why does `steps=null` prevent claiming any repository command executed?
15. Why must the future authorization HEAD be exact-head requalified again after the 12 bounded mutations?
16. Which authority flags must remain false even after bounded gamma5 authorization?
