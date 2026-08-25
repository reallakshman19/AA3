# WIP-1413 — exact-main LAFEA.3/.4 qualification and registry closure

Issue: #1413  
Repository: `reallaksh19/Advanced_Analysis`

# RECOVERY HEADER — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_CONTINUATION
PR_RECOVERY_STATE: CONTINUE
WORK_INTENT: INVESTIGATE / QUALIFY
CRITICALITY: ENGINEERING_CRITICAL
TAKEOVER_AUTHORITY: READ_ONLY_FOR_ENGINEERING_MUTATION
EXECUTION_MODE: BATCHED_OWNER_DIRECTED
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1413
MERGE_AUTHORITY: OWNER_ONLY
WIP_BRANCH: agent/issue-1413-exact-main-qualification-20260824
LIVE_MAIN_LAST_CHECKED: 9887ec1c3eb6184c0d590841b23c04ed449f9414
GROUNDING_EPOCH: AD-03_AFTER_PR1419_PR1420
CURRENT_STAGE: PRE_EXECUTION_READINESS_AUDIT_COMPLETE; Q0-Q4 execution remains unavailable
CURRENT_BLOCKER: current hosted jobs still fail before runner allocation and local github.com DNS remains unavailable
FIRST_PROVEN_FAILURE_BOUNDARY: INFRASTRUCTURE
ENGINEERING_FAILURE_PROVEN: false
B2_MECHANICS_REPAIR_AUTHORIZED: false
B4_REGISTRY_CLOSURE_AUTHORIZED: false
RUNNER_PROBE_POLICY: BACKOFF_UNTIL_MAIN_MOVES_OR_INDEPENDENT_EXECUTABLE_RUNNER_EVIDENCE
HIGHEST_READINESS_RISK: qualification gate contamination can misclassify a live-contract or unrelated-stage failure as #1413 authority failure unless the packet below is followed exactly
EXACT_NEXT_ACTION: if an executable exact-head environment appears, execute Q0->Q4 using the hardened ownership rules below. If implementation of the two identified validation-isolation repairs is desired before execution, complete Appendix-A/write-authority gating first; do not mutate engineering-sensitive validation while takeover authority is READ_ONLY.
```

This is the single living recovery authority for #1413. Historical detail remains in Issues #1413/#54 and prior report commits.

## 1. Mission and protected boundary

Certify already-merged LAFEA.3/LAFEA.4 **Model -> Mesh -> Analyse -> Output** on one exact current-main SHA. Only after exact-head numerical, custody, product, browser, build and clean-tree qualification may registry/evidence wording be reconciled.

Protected until actual executed evidence proves otherwise:

- no continuum/shell formulation change;
- no solver/pivot/rank/residual change;
- no recovery or local/global transformation change;
- no source/sign/unit or mesh-threshold change;
- no frozen expected-value/tolerance/oracle change;
- no workflow semantic change merely to bypass #54;
- no LAFEA.4 MITC/drilling/thick-shell/contact/weld/code widening;
- no release authority grant.

```text
FIRST_EXECUTED_AUTHORITATIVE_FAILURE_WINS = true
TOLERANCE_WIDENING_AFTER_OBSERVATION = forbidden
FROZEN_EXPECTED_VALUE_REWRITE = forbidden
BENCHMARK_DELETION = forbidden
DISPLAY_NODAL_SMOOTHING_PROMOTION = forbidden
```

## 2. Exact grounding — AD-03 remains current

Current exact `main`:

```text
9887ec1c3eb6184c0d590841b23c04ed449f9414
```

Fresh branch inspection in this batch again found `main` at the same SHA. Therefore no new grounding epoch is created and AD-03 remains current.

AD-03 authority result:

```text
CLASS_A_Q0_Q3_AUTHORITY_DRIFT = false
DIRECT_LAFEA_NUMERICAL_PATH_DRIFT = false
FROZEN_ORACLE_DRIFT = false
#1371_CUSTODY_SCRIPT_DRIFT = false
TARGET_BROWSER_SPEC_DRIFT = false
REGISTRY_DRIFT = false
GLOBAL_PACKAGE_BUILD_SURFACE_DRIFT = true
GLOBAL_APP_SHELL_SURFACE_DRIFT = true
Q4_REQUALIFICATION_REQUIRED = true
OLD_HEAD_Q0_Q4_PASS_REUSE = forbidden
ENGINEERING_MUTATION_AUTHORIZED = false
B4_AUTHORIZED = false
```

Protected seam blobs remain the AD-03 custody values because the exact main SHA is unchanged:

```text
scripts/lafea1371-cross-stage-anti-drift-check.mjs  6f7b26be38254c027e1b7ca8a35c7de8af3fe340
e2e/lafea3-sample-mesh.spec.js                     3bde7e9629938033e42bd08a14e9bc35bf3dbb98
e2e/lafea-shell-sample-mesh.spec.js                ce8e626d5a702978c9735cd3327d3a7c0e2705fb
src/workspace/lafea-stage-registry.js               bb0d506fbf3a6d8291943d6a1da12fdd164c2484
```

## 3. Pre-execution qualification-readiness audit — 2026-08-25

This batch inspected the actual Q0/Q1/Q2/Q3/browser source instead of treating file custody as qualification.

### 3.1 Frozen-oracle anti-circularity — source inspection result

**LAFEA.4 freeze gate:** strong separation.

`scripts/lafea-shell-independent-benchmark-freeze-check.mjs`:

- imports Node built-ins only for the independent checker and explicitly proves that import boundary;
- requires `FROZEN_BEFORE_PRODUCTION_OBSERVATION`;
- prohibits production output choosing geometry, loads/prescribed fields, expected values or acceptance tolerance;
- prohibits moving maxima, nodal projection, cross-element averaging and display interpolation as oracle authority;
- retains two analytical benchmarks plus one primary published reference.

`validation/lafea-shell/frozen-definition-manifest-v1.json` separately records the same anti-circularity boundary and the Batoz/Bathe/Ho primary-reference source qualification.

**LAFEA.3 Kirsch oracle:** independent expected field remains explicit.

`validation/bucket-01/07-kirsch-fixed-probe-oracle.json` records:

```text
source = CLASSICAL_KIRSCH_CLOSED_FORM_INFINITE_PLATE
productionOutputUsed = false
smoothedStressUsed = false
movingMaximumUsed = false
fixed physical probes = retained
fixed tolerances = retained
```

No oracle/tolerance mutation is justified or authorized.

### 3.2 ISS-1413-001 — Q0 LAFEA.3 checker has mixed ownership

`node scripts/lafea-b02-definition-freeze-check.mjs` is **not a pure source/hash freeze checker**.

It correctly verifies frozen manifest identity, original frozen Git blobs, frozen-before-production state and anti-circularity. However it also imports:

```text
../src/workspace/lafea-domain-first-requests.js
createLafeaMeshGenerationIntentV2
```

and calls the live route to require each frozen ladder to remain expressible/executable under the current production mesh-intent contract.

That live-route condition is useful, but it creates a classification hazard:

```text
freeze/hash assertion failure                      -> SOURCE AUTHORITY / HASH
validateRegisteredLadder/live intent failure       -> LIVE PRODUCTION CONTRACT / ROUTE EXPRESSIBILITY
validateRouteExpressibleCantilever failure         -> LIVE PRODUCTION CONTRACT / ROUTE EXPRESSIBILITY
```

A failure in the latter two must **not** be labelled frozen-source corruption merely because it occurs during the Q0 command.

Q2 already exercises the real production B02C route against the frozen analytical definition, so live route expressibility is duplicated downstream rather than being necessary to prove frozen bytes.

Current disposition:

```text
STATUS = OPEN_READINESS_DEFECT
ENGINEERING_MECHANICS_IMPACT = NONE_PROVEN
ORACLE_IMPACT = NONE
TOLERANCE_IMPACT = NONE
WRITE_ACTION_THIS_BATCH = NONE (READ_ONLY authority)
```

Preferred future repair, if write authority is explicitly obtained: split immutable custody from live route-expressibility so each emits an independently classifiable receipt. Do not remove the live route check; relocate/classify it.

### 3.3 Q1/Q2 independence direction is acceptable

Q1 production-under-test scripts intentionally import production solver/mesher/recovery while comparing against independently frozen analytical/reference quantities. That is correct test direction, not oracle circularity.

Examples inspected:

- `lafea-bucket-01-kirsch-fixed-probes-check.mjs` executes production local continuum and retained T6 meshing, while expected stresses are the frozen classical Kirsch field and acceptance uses fixed physical probes;
- `lafea-plane-strain-bbar-lame-check.mjs` executes production B-bar/T6/Q8 paths against frozen Lamé analytical authority and frozen convergence/probe policies;
- `lafea-b02c-production-check.mjs` executes the production B02 route, checks force/moment equilibrium, fixed-probe mapping, authoritative values and frozen convergence limits;
- `lafea-shell-response-acceptance-check.mjs` requires the independent shell freeze + independent benchmark execution before accepting the production trunnion/shell response.

No expected value is generated from the production output in those inspected acceptance paths.

### 3.4 Q3 integrated custody coverage is substantive

`scripts/lafea1371-cross-stage-anti-drift-check.mjs` verifies more than static reporting:

- deterministic replay of source/mesh/artifact/solver/execution hashes;
- viewport retained-mesh identity;
- source-edit invalidation;
- mesh-profile-edit invalidation;
- reissued parent-bound evidence when geometry content stays the same;
- predicted E-edit response:
  - `E 200000 -> 210000 MPa`;
  - force-controlled displacement factor `0.9523809523809523`;
  - stress approximately unchanged.

The final reporting fields remain hard-coded current-state disclosures:

```text
registryWordingChanged = false
registryCleanupState = BLOCKED_PENDING_EXECUTED_EXACT_HEAD_EVIDENCE
frozenOracleMutation = false
releaseAuthorityChanged = false
```

They are acceptable while B4 is blocked. If B4 later changes registry state, those reporting fields must be reconciled so they do not become stale assertions.

### 3.5 ISS-1413-002 — target LAFEA.4 browser proof is contaminated by LAFEA.5

`e2e/lafea-shell-sample-mesh.spec.js` contains one Playwright test that loops over:

```text
['LAFEA.4', 'LAFEA.5']
```

The LAFEA.4 portion itself is strong: it checks source shell parentage, retained mesh, shell orientation, solver model/binding hashes, authoritative solve mesh identity, execution custody, force/moment equilibrium, retained IP/surface stress presentation and lifecycle result readiness.

But because LAFEA.4 and LAFEA.5 share one test result, a later unrelated LAFEA.5 product failure can mark the whole test failed after LAFEA.4 has completed. This is cross-stage gate contamination for Issue #1413.

Current disposition:

```text
STATUS = OPEN_READINESS_DEFECT
LAFEA4_ASSERTION_COVERAGE = STRONG_BY_SOURCE_INSPECTION
ISOLATED_LAFEA4_PLAYWRIGHT_RESULT = NOT_AVAILABLE
WRITE_ACTION_THIS_BATCH = NONE (READ_ONLY authority)
```

Preferred future repair, after Appendix-A/write authorization: split LAFEA.4 and LAFEA.5 into independently reported tests while preserving both regression paths. #1413 Q4B should consume only the isolated LAFEA.4 result; LAFEA.5 remains a separate regression/closure concern.

Until then, if execution becomes available before a split is authorized, retain the full Playwright trace and do **not** call an LAFEA.5-caused overall test failure an LAFEA.4 engineering failure.

### 3.6 Q4 standalone comparator invocation is now exact

Current standalone scripts are source-only Node checks. `package.json` defines:

```text
check:lafea-standalone =
  node scripts/lafea-standalone-boundary-check.mjs &&
  node scripts/lafea-standalone-boundary-self-test.mjs &&
  node scripts/lafea-stage15-neutral-shared-primitives-check.mjs
```

The boundary checker emits explicit failure codes including `FORBIDDEN_PRODUCT_OR_COMBINED_DEPENDENCY`.

Frozen comparator base remains:

```text
162c88ee4715bc46c3c768c1086e74e7165bd3fb
```

If current-head boundary check fails with `FORBIDDEN_PRODUCT_OR_COMBINED_DEPENDENCY`, use this exact comparator pattern:

```bash
BASE_WORKTREE="$EVIDENCE_ROOT/standalone-comparator-162c88ee"
git worktree add --detach "$BASE_WORKTREE" 162c88ee4715bc46c3c768c1086e74e7165bd3fb
(
  cd "$BASE_WORKTREE"
  node scripts/lafea-standalone-boundary-check.mjs \
    > "$EVIDENCE_ROOT/standalone-comparator.stdout" \
    2> "$EVIDENCE_ROOT/standalone-comparator.stderr"
)
printf '%s\n' "$?" > "$EVIDENCE_ROOT/standalone-comparator.exit"
git worktree remove --force "$BASE_WORKTREE"
```

Acceptance:

1. current checker passes; or
2. current failure is accepted as inherited only when comparator base fails with the same **first** `FORBIDDEN_PRODUCT_OR_COMBINED_DEPENDENCY` signature.

Head fail/base pass, changed first signature, missing base evidence, or comparator setup failure blocks B4.

## 4. Execution-environment evidence

### Exact-main hosted lane

```text
workflow = Deploy Vite site to GitHub Pages
run = 32802245487
head = 9887ec1c3eb6184c0d590841b23c04ed449f9414
attempt 1 build = 97665263048 -> failure / zero steps
attempt 2 build = 97735600940 -> failure / zero steps
attempt 3 build = 97759560563 -> failure / zero steps
deploy attempt 3 = 97759571665 -> skipped / zero steps
```

### Independent current-base recurrence

Previously retained:

```text
PR1418: 97760481177 / 97760482707 -> runner_id=0 / zero steps
PR1423: 97763991701 / 97763991732 -> zero steps / runner_id=0
PR1424 at 10:42 UTC: 97772854591 / 97772855644 -> runner_id=0 / zero steps
```

Fresh in this batch:

```text
run 32842932171
job 97786205594
workflow = EMP.1 current-main independent baseline
PR = #1424
base = main@9887ec1c3eb6184c0d590841b23c04ed449f9414
created = 2026-08-25T11:33:31Z
conclusion = failure
runner_id = 0
steps = []
```

This is recurrence, not recovery.

### Local environment

Fresh probe this batch:

```bash
git ls-remote https://github.com/reallaksh19/Advanced_Analysis.git refs/heads/main
```

Result:

```text
fatal: unable to access ...
Could not resolve host: github.com
exit = 128
```

Therefore:

```text
Q0 = NOT_RUN
Q1 = NOT_RUN
Q2 = NOT_RUN
Q3 = NOT_RUN
Q4A = NOT_RUN
Q4B = NOT_RUN
Q4C = NOT_RUN
Q4D = NOT_RUN
Q4E = NOT_RUN
B2 = NOT_TRIGGERED
B4 = NOT_AUTHORIZED
B5 = NOT_RUN
FAILURE_ORIGIN = INFRASTRUCTURE
ENGINEERING_FAILURE_PROVEN = false
```

## 5. Multi-agent overlap audit

Repository `agents/MASTER_INDEX.md` is absent on exact main (404), so coordination is by live PR metadata/diffs plus the current WIP report.

High-risk LAFEA overlap PRs remain open/draft and unmerged:

```text
#1270  LAFEA.3 local-refinement/product-mesh      -> re-ground if merged
#1258  B01 B-bar/solver repair                    -> direct Q1 authority overlap if merged
#1259  B02D V2 stacked qualification              -> B02 qualification overlap if merged
#1246  LAFEA.4 TECH-13 refinement/product/build  -> shell/product/build overlap if merged
```

Current source inspection confirms all four remain open drafts.

Safe current-base governance/UI PRs inspected across recent batches:

```text
#1418 EMP.1 physical applicability source governance -> SAFE for current #1413 authority while unmerged
#1423 EMP.1 code-acceptance source governance        -> SAFE for current #1413 authority while unmerged
#1424 non-FEA input/status projection + UI           -> SAFE for current #1413 authority while unmerged
#1426 EMP.1 WRC shell-thickness source governance    -> SAFE for current #1413 authority while unmerged
```

PR #1426 exact changed-file inspection is limited to six EMP.1 source-governance/agent files and does not touch LAFEA.3/.4 mechanics, registry, #1371 custody, target browser specs, Vite/Playwright configs, frozen LAFEA oracles or release authority.

Any merge still changes exact `main` SHA and therefore requires re-grounding even when authority overlap is SAFE.

## 6. Gate classification — hardened

```text
Class A = Q0-Q3 authority-bearing #1413 engineering
Class B = direct LAFEA product/build/browser proof
Class C = repository-wide closure gates
Class D = infrastructure/runtime
```

Additional ownership rule from this audit:

```text
Q0 LAFEA.3 immutable-manifest/blob assertion failure
  -> SOURCE AUTHORITY / HASH

Q0 LAFEA.3 validateRegisteredLadder or live mesh-intent failure
  -> LIVE PRODUCTION CONTRACT / ROUTE EXPRESSIBILITY
  -> not frozen-source corruption

Q4B shell spec failure caused only after entering LAFEA.5 branch
  -> EXTERNAL/ADJACENT STAGE PRODUCT BLOCKER
  -> not LAFEA.4 engineering failure
```

General rules:

```text
Class D failure -> NOT_RUN, never engineering FAIL
unrelated Class C failure -> EXTERNAL_REPOSITORY_GATE_BLOCKER, blocks B4 but does not trigger B2
Class A first executed authoritative failure -> stop and localize first wrong boundary
Class B failure after Class A PASS -> map/presentation/build-browser first unless traced to mechanics
```

## 7. Hardened exact-head execution packet

Execute only when a real exact-head environment exists.

### Epoch

```bash
export QUAL_HEAD="<exact current main SHA>"
export EVIDENCE_ROOT="${RUNNER_TEMP:-/tmp}/issue-1413-${QUAL_HEAD}"
mkdir -p "$EVIDENCE_ROOT"
test "$(git rev-parse HEAD)" = "$QUAL_HEAD"
test -z "$(git status --porcelain=v1 --untracked-files=all)"
git diff --check
node --version
npm --version
npm ci
```

Target Node: 22.

### Q0 — frozen custody plus mixed-owner classification

```bash
node scripts/lafea-b02-definition-freeze-check.mjs
node scripts/lafea-shell-independent-benchmark-freeze-check.mjs
```

For the first command, retain stack/assertion location. Apply the ownership split in Section 6; do not automatically call every failure SOURCE/HASH.

### Q1 — independent numerical authority

```bash
LAFEA_BUCKET_01_KIRSCH_PROBE_REPORT_PATH="$EVIDENCE_ROOT/kirsch-fixed-probes.json" \
  node scripts/lafea-bucket-01-kirsch-fixed-probes-check.mjs
node scripts/lafea-plane-strain-bbar-lame-check.mjs
node scripts/lafea4-shell-independent-benchmark-check.mjs
```

### Q2 — production numerical acceptance

```bash
node scripts/lafea-b02c-production-check.mjs
node scripts/lafea-shell-response-acceptance-check.mjs
```

### Q3 — Model -> Mesh -> Analyse -> Output custody

```bash
node scripts/lafea1371-pr-b-merge-order-guard.mjs
node scripts/lafea3-sample-generate-retain-check.mjs
node scripts/lafea3-visible-continuum-preflight-check.mjs
node scripts/lafea-shell-sample-parent-check.mjs
node scripts/lafea-shell-compiled-execution-check.mjs
node scripts/lafea4-sample-pressure-output-check.mjs
node scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

Controls:

```text
LAFEA.3: T6 target 30 mm; DOMAIN_FIRST_COMPILED_SOLVER_MODEL; QUALIFIED/ACCEPTED; 2 load cases; retained recovery/output.
E 200000 -> 210000 MPa => force-controlled displacement factor 0.9523809523809523; stress approximately unchanged.

LAFEA.4 sample: p=1.2 MPa, R=100 mm, L=50 mm, span=60 deg.
applied force [0,0,+6000] N; applied moment [0,-150000,0] N.mm.
fully fixed reaction [0,0,-6000] N; support moment [0,+150000,0] N.mm.
```

### Q4A — issue-local source/build

```bash
npm run check:lafea-core
npm run check:lafea-workbench
npm run check:lafea-standalone
npx vite build --config vite.lafea.config.js
node scripts/lafea-standalone-build-artifact-check.mjs
```

If the standalone boundary fails with `FORBIDDEN_PRODUCT_OR_COMBINED_DEPENDENCY`, execute the exact comparator procedure in Section 3.6 before classifying it.

### Q4B — targeted Chromium before Stage-17

```bash
export PLAYWRIGHT_BROWSERS_PATH=0
npx playwright install --with-deps chromium
CI=1 node node_modules/playwright/cli.js test \
  --config=playwright.lafea-visible.config.js \
  e2e/lafea3-sample-mesh.spec.js \
  e2e/lafea-shell-sample-mesh.spec.js
```

Retain `test-results/**`, `playwright-report/**` and traces immediately.

Qualification caveat: `lafea-shell-sample-mesh.spec.js` is not isolated to LAFEA.4. Until a split is authorized and implemented, inspect the failure stage from trace/logs and do not misclassify a later LAFEA.5 failure as LAFEA.4 engineering failure.

### Q4C — broad repository closure

```bash
npm run check:imports
npm run syntax:strict
node scripts/full-check.mjs
npm run build
```

### Q4D — full Stage-17 integration

```bash
CI=1 node scripts/lafea-stage17-browser-run.mjs
```

### Q4E — exact-head clean tree

```bash
git diff --check
test -z "$(git status --porcelain=v1 --untracked-files=all)"
test "$(git rev-parse HEAD)" = "$QUAL_HEAD"
```

For every executed command retain exact SHA, command, exit, status, gate class, observation origin, oracle class, stdout/stderr or hash, artifacts and first wrong intermediate if any.

## 8. Active register

```text
ISS-1413-001 P1 OPEN — LAFEA.3 Q0 freeze checker mixes immutable custody with live mesh-intent route expressibility; classification must be split.
ISS-1413-002 P1 OPEN — LAFEA.4 target browser spec shares one Playwright result with LAFEA.5, permitting adjacent-stage failure contamination.
RISK-1413-001 P0 ACTIVE — unexecuted source readiness must not be promoted to qualification PASS.
RISK-1413-002 P0 ACTIVE — unrelated Class-C/adjacent-stage failure must not trigger B2 mechanics repair.
DEC-1413-001 P0 ACTIVE — no mechanics/oracle/tolerance mutation before first actual engineering failure.
DEC-1413-002 P1 ACTIVE — record the two gate-isolation defects now; do not mutate engineering-sensitive validation while takeover authority is READ_ONLY.
DEC-1413-003 P1 ACTIVE — standalone inherited-boundary acceptance requires same first failure signature on frozen comparator base.
DEBT-1413-001 P0 OPEN — exact-head execution blocked by #54 and local DNS.
```

## 9. B4/B5 remain precomputed but locked

B4 is authorized only after Q0-Q4E PASS on one exact head with no unresolved closure blocker.

Predicted narrow B4 technical write set:

```text
src/workspace/lafea-stage-registry.js
scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

No mechanics/oracle/tolerance/workflow/browser-spec change belongs in B4. Any validation-isolation repair for ISS-1413-001/002 must be separately justified and qualified before B4; do not hide it inside registry closure.

After any B4 PR, B5 must re-ground then-current main and rerun the complete packet on the closure PR exact head before any merge request. Merge remains owner-only.

## 10. Changed-file ledger — #1413 workstream

Only:

```text
agents/WIP-1413-exact-main-qualification-20260824_workreport.md
```

No production source, solver, mesher, recovery, benchmark, oracle, tolerance, registry, workflow, browser spec or product source has been modified by this workstream.
