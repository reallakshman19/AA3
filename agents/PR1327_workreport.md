# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: LOCAL_PRODUCER_AND_INDEPENDENT_REVIEW_CHAIN_AUTHORED_EXECUTION_PENDING`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: eb6e4c299132644cfd2bddeb5b86dc458524e35d`
- `CURRENT_MAIN_INTEGRATION_COMMIT: 056ccf15d71e3a7cceca327afae949f442f24489`
- `LAST_ENGINEERING_HEAD: f0c63281c8a61f2fa9f5d5a2fbb7a1b237148cd1`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE_UNTIL EXACT_HEAD PRODUCER EVIDENCE AND INDEPENDENT REVIEW REPLAY ARE EXECUTED GREEN AND REVIEWED`

## Mission
Requalify the bounded WRC 537 cylindrical gamma=5, delta-p=0 route against the exact executed repository head after source-authority closure. Required evidence includes the frozen independent oracle, six physical WRC load components, all 32 Table-5 stress comparisons, controlled source/dataset/load-producer/candidate hashes, PR #1325 authority-currentness/product/sample controls, subordinate replay, anti-forgery falsifiers, exact Git identity, and an independently replayed review decision record.

## Protected engineering boundary
- Production route remains suspended by `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`.
- Candidate qualification remains `9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7`.
- Historical active qualification remains `3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e`.
- Frozen post-authority independent oracle remains `60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18`.
- Historical Au ≈72.6728 MPa is comparison evidence only, never authorization.
- Nonzero dP, general Kn/Kb, other gamma/beta domains, off-axis/global maxima, nozzle/attachment stress, WRC 297, code compliance, and release authority remain outside scope.
- No observation, verifier, replay receipt, falsifier receipt, manifest, local execution receipt, independent review receipt, or review-falsifier receipt may itself change production/global/code/release authority.

## Current-main custody
`main` is still `eb6e4c299132644cfd2bddeb5b86dc458524e35d`. #1327 is `0` commits behind current main. No stale-base integration is required for this batch.

## Core qualification chain
1. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`
   - exact HEAD binding;
   - six WRC loads `P, Vc, Vl, Mc, Ml, Mt`;
   - four stress families × eight locations `Au, Al, Bu, Bl, Cu, Cl, Du, Dl` = 32 comparisons;
   - controlled tolerance and source/hash custody;
   - route remains suspended.
2. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`
   - independently recomputes six load rows, 32 stress rows, tolerances, maxima, semantic hash and authority state.
3. `scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs`
   - reruns independent oracle/refreeze/falsifiers, candidate binding, route-authority currentness, product qualification and complete sample;
   - requires byte-identical subordinate stdout SHA-256/status custody.
4. `scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs`
   - requires genuine baseline replay;
   - rejects ten deliberately tampered/rehashed observation variants.
5. `scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs`
   - binds HEAD/tree/parents, raw evidence-file hashes, source/dataset/producer/candidate/oracle hashes, 6/6 loads, 32/32 stresses and all false authority flags.

## Workflow-independent producer execution
`scripts/emp1-wrc-gamma5-requalification-local-suite.mjs`

One complete clean checkout can execute the full qualification without GitHub Actions:

```text
HEAD_SHA=$(git rev-parse HEAD)
node scripts/emp1-wrc-gamma5-requalification-local-suite.mjs \
  --expected-head "$HEAD_SHA"
```

The producer runs 23 ordered stages and creates, by default:

`validation/emp1/wrc537-2013/.emp1-gamma5-local-requalification/`

1. `01-observation.json`
2. `02-replay-receipt.json`
3. `03-falsifier-receipt.json`
4. `04-evidence-manifest.json`
5. `05-local-execution-receipt.json`

Producer PASS status, if genuinely executed:
`PASS_LOCAL_EXACT_HEAD_REQUALIFICATION_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED`

The producer requires exact 40-character HEAD identity, a clean source tree after tightly bounded evidence-directory cleanup, no source mutation outside the evidence directory, 6/6 loads, 32/32 stresses, `maxToleranceRatio <= 1`, 10/10 observation falsifiers, exact Git tree/parents, raw file hashes/byte counts and false production/global/code/release authority.

## 2026-08-23 batch — independent review-readiness chain
User direction remains to proceed in batches and not depend on GitHub workflow execution.

### A. Local manifest reproducibility hardening
Updated:
`scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs`

Finding: a workflow-independent local run previously copied ambient `GITHUB_EVENT_NAME`, `GITHUB_REF`, `GITHUB_RUN_ID`, etc. into the manifest even when `GITHUB_ACTIONS=false`. A shell containing stale GitHub environment variables could therefore produce a different manifest for identical engineering inputs.

Fix:
- `executionContext.githubActions` remains the controlling discriminator;
- when false, every GitHub-only context field is forced to `null`;
- when true, the existing GitHub context remains retained.

This improves deterministic local evidence custody without changing numerical calculations or engineering authority.

### B. Independent exact-head review gate
Added:
`scripts/emp1-wrc-gamma5-requalification-review-gate.mjs`

Purpose: prevent a later authorization decision from accepting a five-file producer bundle merely because its internal hashes are self-consistent.

Invocation after a genuine producer PASS:

```text
HEAD_SHA=$(git rev-parse HEAD)
EVIDENCE_DIR=validation/emp1/wrc537-2013/.emp1-gamma5-local-requalification
node scripts/emp1-wrc-gamma5-requalification-review-gate.mjs \
  --expected-head "$HEAD_SHA" \
  --evidence-dir "$EVIDENCE_DIR" \
  --write-receipt "$EVIDENCE_DIR/06-independent-review-receipt.json"
```

The review gate first verifies the stored five-file package:
- local-suite schema/status/semantic hash;
- exact HEAD/tree/parents;
- exactly 23 unique producer steps;
- clean-before-execution and no-source-mutation claims;
- manifest schema/status/semantic hash;
- local manifest has `githubActions=false` and all GitHub-only fields null;
- local-receipt raw hashes/byte counts match actual files;
- local receipt and manifest qualification summaries match;
- 6 loads / 32 stresses / 10 observation falsifiers;
- all authority flags false.

It then independently re-executes all 23 producer stages on the same HEAD. Generated observation, replay receipt, falsifier receipt and manifest must be byte-identical to the stored package, and every producer stdout/stderr SHA-256 must match `05-local-execution-receipt.json`.

Only then may it emit:
`PASS_INDEPENDENT_EXACT_HEAD_EVIDENCE_REPLAY_READY_FOR_SEPARATE_AUTHORIZATION_REVIEW_ROUTE_STILL_SUSPENDED`

and optional:
`06-independent-review-receipt.json`

`evidenceEligibleForSeparateAuthorizationReview=true` means only that evidence may be reviewed in a later, separate authorization change. It does **not** authorize production C.

### C. Review-layer anti-forgery falsifiers
Added:
`scripts/emp1-wrc-gamma5-requalification-review-gate-falsifiers.mjs`

A genuine independent review baseline must PASS first. It then copies the producer evidence to temporary directories and requires rejection of six review-layer attacks:
1. local-suite semantic-hash corruption;
2. local-suite production-authorization escalation with recomputed local semantic hash;
3. forged local GitHub execution context with coordinated manifest/local-receipt rehashing;
4. producer-step stdout hash substitution with recomputed local semantic hash;
5. manifest stress-count downgrade with coordinated manifest/local-receipt rehashing;
6. stored-observation authority escalation.

A genuine successful falsifier execution would emit:
`PASS_INDEPENDENT_REVIEW_GATE_ANTI_FORGERY_FALSIFIERS`

and optional:
`07-independent-review-falsifier-receipt.json`

Review falsifiers also preserve all authority flags false.

## Complete intended evidence progression
A production-route authorization decision must not begin from source inspection alone. The intended sequence is now:

1. exact candidate HEAD selected;
2. local producer executes 23 stages;
3. files `01`–`05` exist with exact producer PASS;
4. independent review gate re-executes all 23 stages and requires exact byte/stdout/stderr identity;
5. `06-independent-review-receipt.json` records review readiness;
6. review-layer falsifiers prove the review gate rejects coordinated forged evidence;
7. optional `07-independent-review-falsifier-receipt.json` records those detections;
8. engineer reviews the package;
9. only a **separate later change** may consider changing production route authorization;
10. any authorization change has its own exact-head qualification obligation.

## Validation truth
### Static/source
- Current-main custody: `COMPLETE_STATIC`; 0 behind main.
- Six-load/32-row qualification contract: `COMPLETE_STATIC`.
- Workflow-independent producer design: `COMPLETE_STATIC`.
- Local manifest GitHub-context normalization: `COMPLETE_STATIC`.
- Independent review-gate producer/reviewer separation: `COMPLETE_STATIC`.
- Review-layer falsifier design: `COMPLETE_STATIC`.
- No production route/registry authorization constant changed.
- No `.github/workflows/*` file changed in this batch.

### Runtime
- Producer 23-stage local suite on latest engineering head: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Five-file producer evidence set: `NOT_GENERATED`.
- Independent review gate: `AUTHORED / NOT_RUN_EXECUTION_ENVIRONMENT`.
- `06-independent-review-receipt.json`: `NOT_GENERATED`.
- Six review-layer falsifiers: `AUTHORED / NOT_RUN_EXECUTION_ENVIRONMENT`.
- `07-independent-review-falsifier-receipt.json`: `NOT_GENERATED`.
- Full regression: `NOT_RUN`.

No unexecuted check is represented as PASS.

## Changed-file ledger
Effective PR files now total 11:
1. `.github/workflows/emp1-gamma5-main-route.yml` — earlier batch only; not touched by the current local/review batches.
2. `agents/PR1327_workreport.md` — living handover/evidence record.
3. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`.
4. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`.
5. `scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs`.
6. `scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs`.
7. `scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs` — local-context determinism hardening included.
8. `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs`.
9. `scripts/emp1-wrc-gamma5-requalification-local-suite.mjs` — workflow-independent 23-stage producer.
10. `scripts/emp1-wrc-gamma5-requalification-review-gate.mjs` — independent 23-stage review replay.
11. `scripts/emp1-wrc-gamma5-requalification-review-gate-falsifiers.mjs` — six review-layer adversarial detections.

## Exact next action
On a complete clean checkout of the then-current #1327 engineering head:

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
```

Accept review readiness only if producer PASS, independent review PASS and all six review-layer attacks are detected. Confirm 6/6 loads, 32/32 stresses, `maxToleranceRatio <= 1`, exact HEAD/tree/parents, exact producer/reviewer hashes and all production/global/code/release authority false.

If `main` advances before execution, integrate current main first. A later production authorization change remains separate and must be qualified on its own exact head.

## Open blockers / risks
- `VAL-1327-01`: producer suite has not executed in a complete checkout.
- `VAL-1327-02`: files `01`–`05` do not yet exist as genuine evidence.
- `VAL-1327-03`: independent review replay has not executed; file `06` does not exist.
- `VAL-1327-04`: review-layer falsifiers have not executed; file `07` does not exist.
- `VAL-1327-05`: GitHub Actions issue #54 remains a separate hosted-infrastructure defect, but hosted workflow execution is not required by the new local chain.
- `RISK-1327-01`: authored source logic must never be presented as executable PASS.
- `RISK-1327-02`: internally rehashed evidence is not sufficient; independent re-execution is mandatory.
- `RISK-1327-03`: evidence from one commit cannot authorize a later different production head.
- `RISK-1327-04`: `evidenceEligibleForSeparateAuthorizationReview` is not production authorization.

## Appendix A — takeover qualification
1. Why must the producer and independent reviewer run on the exact same 40-character HEAD?
2. Which six WRC loads and 32 stress rows remain mandatory?
3. Why is a self-consistent five-file producer bundle insufficient by itself?
4. Which 23 producer stages are independently re-executed by the review gate?
5. Which four generated engineering files must be byte-identical under independent replay?
6. Why must all 23 stdout/stderr hashes match the local execution receipt?
7. Why are GitHub-only manifest fields null when `GITHUB_ACTIONS=false`?
8. Which six coordinated review-layer forgeries must be rejected?
9. What does `evidenceEligibleForSeparateAuthorizationReview=true` mean, and what does it explicitly not mean?
10. Which authority flags remain false through files `01`–`07`?
11. Why must a later production authorization patch be a separate reviewed exact-head change?
12. What is the action if `main` advances before execution?
