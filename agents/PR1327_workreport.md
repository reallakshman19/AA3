# PR1327 Work Report — EMP1-19 exact-head post-authority gamma5 route requalification

## Recovery header
- `HANDOVER_READINESS: READY_PENDING_EXECUTABLE_EVIDENCE`
- `PR_RECOVERY_STATE: WORKFLOW_INDEPENDENT_LOCAL_SUITE_AUTHORED_EXECUTION_PENDING`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: QUALIFY`
- `ISSUE: #1326`
- `PR: #1327`
- `BRANCH: agent/issue-1326-emp1-gamma5-requalification`
- `BASE_MAIN: eb6e4c299132644cfd2bddeb5b86dc458524e35d`
- `CURRENT_MAIN_INTEGRATION_COMMIT: 056ccf15d71e3a7cceca327afae949f442f24489`
- `LAST_ENGINEERING_HEAD: b5154e6e04d480aa9ccd61f9484f212e4da845de`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE_UNTIL_EXACT_HEAD_EVIDENCE_IS_EXECUTED_GREEN_AND_REVIEWED`

## Mission
Requalify the bounded WRC 537 cylindrical gamma=5, delta-p=0 route against the exact executed repository head after source-authority closure. Required evidence includes the frozen independent oracle, physical six-component WRC loads, all 32 Table-5 stress comparisons, current source/dataset/load-producer/candidate hashes, PR #1325 authority-currentness/product/sample controls, subordinate replay, anti-forgery falsifiers, and exact Git identity.

## Protected engineering boundary
- Production route remains suspended by `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`.
- Candidate qualification remains `9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7`.
- Historical active qualification remains `3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e`.
- Frozen post-authority independent oracle remains `60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18`.
- Historical Au ≈72.6728 MPa is comparison evidence only, never authorization.
- Nonzero dP, general Kn/Kb, other gamma/beta domains, off-axis/global maxima, nozzle/attachment stress, WRC 297, code compliance, and release authority remain outside scope.
- No qualification record, replay receipt, falsifier receipt, manifest, local receipt, or CI result may itself change production/global/code/release authority.

## Current-main custody
`main` progressed from merged PR #1325 through PR #1322 and PR #1328. #1327 integrated those production changes and is currently `0` commits behind `main@eb6e4c299132644cfd2bddeb5b86dc458524e35d`.

## Qualification components already authored
1. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`
   - explicit exact HEAD binding;
   - independent source/oracle checks;
   - production candidate comparison;
   - six WRC loads;
   - 4 stress families × 8 locations = 32 rows;
   - controlled tolerance and custody hashes;
   - no authority change.
2. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`
   - recomputes all six load rows, all 32 stress rows, tolerances, aggregate drift, and authority state from controlled sources.
3. `scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs`
   - reruns independent oracle/refreeze/falsifiers, candidate binding, route-authority currentness, product qualification, and complete sample;
   - stored subordinate stdout hashes/statuses must match byte-for-byte.
4. `scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs`
   - requires genuine baseline replay;
   - rejects ten deliberately tampered/rehashed observation variants including numerical drift, authority escalation, forged subordinate hash/status, and sample-authority substitution.
5. `scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs`
   - binds exact HEAD/tree/parents, evidence-file hashes, source/dataset/producer/candidate/oracle hashes, 6/6 loads, 32/32 stresses, and false production/global/code/release authority.

## 2026-08-23 batch — workflow-independent local execution
User direction: **skip GitHub workflow**.

Added:
`scripts/emp1-wrc-gamma5-requalification-local-suite.mjs`

Purpose: execute the entire qualification chain from any complete normal repository checkout without depending on GitHub Actions orchestration.

### Invocation
```text
node scripts/emp1-wrc-gamma5-requalification-local-suite.mjs \
  --expected-head <40-char-exact-git-sha>
```

Optional output directory is allowed only as one dedicated hidden `.emp1-gamma5-*` directory directly under:
`validation/emp1/wrc537-2013/`.

### Fail-closed entry rules
The local suite:
- requires an explicit 40-character expected SHA;
- requires `git rev-parse HEAD` to equal that SHA exactly;
- permits pre-existing dirtiness only inside the selected dedicated generated-evidence directory;
- deletes only that tightly constrained `.emp1-gamma5-*` directory;
- then requires the repository to be completely clean before engineering execution starts;
- forces `GITHUB_ACTIONS=false`, so the run is workflow-independent;
- checks after every subordinate step that no tracked/source mutation occurred outside the evidence directory.

### Execution sequence
The single command executes, in order:
1. exact-head observation generation;
2. full-matrix observation verifier;
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
15. unity stress-concentration authority;
16. longitudinal-moment curve selection;
17. qualified zero-dp upstream load producer;
18. cylindrical WRC axis authority;
19. suspended production-candidate comparison;
20. public-product truth;
21. subordinate evidence replay;
22. ten anti-forgery falsifiers;
23. exact-head evidence manifest.

Every executed step is retained in the final local receipt with deterministic stdout/stderr SHA-256 and exit status. Wall-clock timestamps are deliberately excluded from the semantic receipt so repeated identical runs are reproducible.

### Generated evidence set
Default directory:
`validation/emp1/wrc537-2013/.emp1-gamma5-local-requalification/`

Files:
1. `01-observation.json`
2. `02-replay-receipt.json`
3. `03-falsifier-receipt.json`
4. `04-evidence-manifest.json`
5. `05-local-execution-receipt.json`

Final local receipt schema:
`emp1-wrc537-gamma5-local-requalification-suite/v1`

A genuine successful execution would end with:
`PASS_LOCAL_EXACT_HEAD_REQUALIFICATION_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED`

That status is **not currently claimed** because this environment has not executed the script in a complete checkout.

### Final local-receipt assertions
Before writing PASS, the orchestrator independently requires:
- observation/replay/falsifier/manifest all bind the same exact HEAD;
- no authority-change flag is true;
- production/global/code/release authority all remain false;
- physical load count = 6;
- stress comparison count = 32;
- `0 <= maxToleranceRatio <= 1`;
- anti-forgery falsifier count = 10;
- exact Git tree and parent SHAs retained;
- raw SHA-256 and byte count retained for each primary evidence file;
- evidence-bundle semantic hash retained;
- no source mutation outside the evidence directory.

## Why this batch matters
The engineering qualification path is no longer operationally coupled to GitHub Actions. Issue #54 may still block hosted CI, but a complete engineer-controlled checkout can now produce the same fail-closed evidence chain with one deterministic command. This does not bypass qualification; it removes the hosted-workflow scheduler as a prerequisite for executing it.

## Validation truth
### Static/source review
- Workflow-independent suite architecture: `COMPLETE_STATIC`.
- Exact-head binding: `COMPLETE_STATIC`.
- Dedicated-output cleanup boundary: `COMPLETE_STATIC`.
- Source-mutation guard: `COMPLETE_STATIC`.
- Deterministic receipt design: `COMPLETE_STATIC`.
- No new production route/registry authorization change: `COMPLETE_STATIC`.
- No `.github/workflows/*` file changed in this batch.

### Runtime
- New local suite execution on engineering head `b5154e6e...`: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Exact 6-load/32-stress numerical comparison through the new orchestrator: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Replay through new orchestrator: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Ten falsifiers through new orchestrator: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Five-file local evidence set: `NOT_GENERATED`.
- Full regression: `NOT_RUN`.

No unexecuted check is represented as PASS.

## Changed-file ledger
Effective PR files now include:
1. `.github/workflows/emp1-gamma5-main-route.yml` — earlier retained evidence sequencing; **not touched by this batch**.
2. `agents/PR1327_workreport.md` — living handover/evidence record.
3. `scripts/emp1-wrc-gamma5-exact-head-requalification.mjs`.
4. `scripts/emp1-wrc-gamma5-requalification-observation-check.mjs`.
5. `scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs`.
6. `scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs`.
7. `scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs`.
8. `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs`.
9. `scripts/emp1-wrc-gamma5-requalification-local-suite.mjs` — new workflow-independent one-command orchestrator.

## Exact next action
On any complete clean checkout at the then-current #1327 engineering head:

```text
HEAD_SHA=$(git rev-parse HEAD)
node scripts/emp1-wrc-gamma5-requalification-local-suite.mjs \
  --expected-head "$HEAD_SHA"
```

Then independently inspect all five generated JSON files. Accept the execution only if:
- local suite final status is the exact PASS status above;
- manifest and local receipt bind the same HEAD/tree/parents;
- 6/6 WRC loads and 32/32 stress rows are present;
- `maxToleranceRatio <= 1`;
- replay hashes are exact;
- 10/10 falsifiers are detected;
- production/global/code/release authority remain false;
- no source files were modified during qualification.

If `main` advances before execution, integrate current main first and execute on the resulting exact head. Any later production authorization change remains a separate reviewed change requiring qualification on its own exact head.

## Open blockers / risks
- `VAL-1327-01`: workflow-independent local suite has not yet executed in a complete checkout.
- `VAL-1327-02`: no genuine five-file local evidence set exists yet.
- `VAL-1327-03`: hosted GitHub Actions remains separately blocked by repository issue #54, but is no longer the only execution route.
- `RISK-1327-01`: authored qualification logic must not be represented as executable PASS.
- `RISK-1327-02`: historical numerical agreement must not be represented as route authorization.
- `RISK-1327-03`: generated evidence from one head cannot authorize a later different production head.
- `RISK-1327-04`: local evidence directory cleanup is intentionally restricted to one dedicated hidden `.emp1-gamma5-*` directory to protect controlled validation assets.

## Appendix A — takeover qualification
1. Why is an explicit expected 40-char SHA mandatory?
2. Why does the local suite clean only a dedicated hidden evidence directory?
3. How does it prove no source mutation occurs during qualification?
4. Which 23 execution stages are run by the single command?
5. Which five evidence files must exist after a genuine PASS?
6. Why are timestamps excluded from the semantic local receipt?
7. Which six WRC load components and 32 stress rows remain mandatory?
8. Why must replay hashes match byte-for-byte?
9. Which ten anti-forgery mutations must be detected?
10. Why does workflow-independent execution not relax engineering qualification?
11. Which authority flags must remain false throughout #1327?
12. Why must a later authorization head be separately requalified?
