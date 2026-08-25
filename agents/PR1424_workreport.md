# PR1424 — Load Calc Validate Input progress visibility

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Source issue: #1422
- PR: #1424 (draft)
- Branch: `agent/issue-1422-validate-input-progress`
- Base / merge base: `9887ec1c3eb6184c0d590841b23c04ed449f9414`
- Main last re-grounded: `9887ec1c3eb6184c0d590841b23c04ed449f9414`
- Implementation/test head before this recovery refresh: `280ceeeb7591b3c6ab4da45e14d799b2cc6ff263`
- Report basis head before this recovery-record commit: `182e5f226a5dfc7feb559f1dc52b84bc8b8454e6`
- Divergence before this recovery-record commit: ahead 43 / behind 0
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Merge authority: OWNER_ONLY
- Owner mutation instruction: `Start coding` on 2026-08-25
- Current disposition: IMPLEMENTATION_COMPLETE / ACCEPTANCE_MATRIX_ENCODED / SEMANTIC_DEPENDENCY_AUDITED / THREE_REAL_CAUSE_STATES_DEFINED / REQUIRED_EXECUTION_VALIDATION_NOT_RUN

## Handover in 60 seconds

Issue #1422 is implemented in draft PR #1424 without changing checker readiness, solver/load mechanics, master-data engineering authority, sealing, authorization, execution eligibility, benchmarks, tolerances, or workflows.

The PR now:

1. preserves checker-owned coverage details through workspace status;
2. shows truthful partial progress in the primary Validate Input root-cause list;
3. exposes every unresolved entity/reason directly from that primary list;
4. distinguishes shared causes, single-scope causes, and gate rollups;
5. routes MASS / SECTION / FLEXURAL coverage causes to Enrichment and `MASTER_NOT_READY` to Import Masters;
6. discloses from Enrichment which Validate Input causes staged **and accepted** records can provide evidence for;
7. keeps the calculation BLOCKED until checker `missing.length === 0`;
8. adds a genuine partial MASS browser regression;
9. adds a **non-mass FLEXURAL browser regression using real checker evidence and a real implementation consumption profile**, satisfying #1422's explicit non-mass cross-link acceptance item;
10. adds a dedicated browser regression that asserts three **actual rendered** cause states: shared MASS, single-scope `MASTER_NOT_READY`, and `F_METHOD_READINESS` gate rollup;
11. adds a deterministic anti-drift projection script;
12. pins the checker-consistent reverse dependency boundary: **OD/wall -> SECTION + MASS only; E/I/EI -> FLEXURAL**.

Four late review gaps were found and closed at the test-definition/source level before execution validation:

- **ISS-1422-06:** acceptance overwrote the cause-aware staged message. Fixed in the view after the authoritative store accept; `non-fea-enrichment-store.js` remains unchanged.
- **ISS-1422-07:** the original browser regression proved non-mass reverse disclosure from Enrichment but did not satisfy the issue's explicit E2E requirement for a non-mass Validate Input root-cause link. Added a second real-checker FLEXURAL case.
- **ISS-1422-08:** Enrichment reverse mapping and FLEXURAL guidance overstated the effect of pipe OD/wall evidence. The live checker accepts direct `flexuralRigidityNm2` or `elasticModulusMpa + secondMomentAreaMm4`; it does **not** derive flexural readiness from OD/wall. Mapping, guidance, source anti-drift assertions, and browser assertions now match that contract.
- **ISS-1422-09:** the grouping test asserted the `SINGLE CAUSE` legend label but did not assert a real single-scope cause row. Added `e2e/non-fea-input-check-cause-grouping.spec.js` to assert real shared/single/rollup rows in one production flow.

Two unrelated Enrichment JSDoc blocks accidentally removed during earlier whole-file writes were restored from base. No functionality changed in that cleanup.

Coding/test-definition scope is complete again. Do **not** merge or mark ready-for-review: required real-checkout execution remains `NOT_RUN` because the current environment cannot faithfully materialize the repository/dependency graph. No `NOT_RUN` is represented as PASS.

## Exact repository state at this recovery refresh

- Live `main`: `9887ec1c3eb6184c0d590841b23c04ed449f9414`.
- Implementation/test head: `280ceeeb7591b3c6ab4da45e14d799b2cc6ff263`.
- Report basis head before this commit: `182e5f226a5dfc7feb559f1dc52b84bc8b8454e6`.
- Merge base equals live main.
- Ahead 43 / behind 0 before this recovery-record commit.
- PR is open, draft, mergeable, not merged.
- Effective changed paths are exactly 10.
- Protected `src/core/non-fea-common-checker/index.js` is absent from the PR diff.
- No `.github/workflows/**`, solver/load-distribution, benchmark/tolerance, or engineering master-authority implementation file is changed.
- #1421 remains superseded by #1422.
- Coordination remains SAFE based on the last overlap checks.

## Production trace / first wrong boundary

```text
renderEmpiricalPreflightView()
  -> evaluateCurrentNonFeaInputCheckStatus()
  -> evaluateCurrentNonFeaCommonInput()
  -> NonFeaCommonInputStore.evaluate()
  -> runPreFeaPipingCheck()
  -> createEvaluationContext()
  -> analyzeModelCoverage()
  -> coverageResult()
  -> coverageRequirement()
  -> report.methodRows[].requirements[].details
  -> commonInputStatus()
  -> createNonFeaWorkspaceStatusProjection()
  -> normalizeCommonInput()
  -> status.commonInput.methodRows[]
  -> rootCauseMarkup()
```

On base main, `coverageResult()` already retained `total / covered / missing / ready`; `coverageRequirement()` retained this as structured `details`. The first information-loss boundary was `commonInputStatus()` in `src/workspace/non-fea-analysis-plan-runtime.js`, which reduced method results to `methodId / state / blockerCodes`. The checker was not the missing-data defect.

## Implemented closure

### 1. Structured coverage custody

`src/workspace/non-fea-analysis-plan-runtime.js`

- Retains blocked `MASS_COVERAGE`, `FLEXURAL_COVERAGE`, and `SECTION_COVERAGE` requirement evidence.
- Projects exact checker-owned `requirementId`, `state`, `code`, `total`, `covered`, `missing`, `ready`.
- Does not reinterpret readiness.

`src/core/non-fea-common-checker/workspace-status-projection.js`

- Normalizes `coverageRequirements` on method rows.
- Fails closed on invalid counts, duplicate missing tokens, `ready/missing` contradiction, or state/readiness contradiction.
- Existing gate/lifecycle/seal/authorization/execution semantics remain unchanged.

### 2. Truthful partial progress and direct detail

`src/workspace/non-fea-input-check-view.js`

- Builds display-only progress from structured status evidence.
- MASS coverage is aggregated by entity for presentation because one component can contribute several missing obligations.
- Displays governed total, unique resolved/unresolved entities, raw missing-obligation count, and retained checker `covered` evidence.
- Displays every unresolved entity/reason in a complete scrollable disclosure directly inside the primary cause row.
- If the same coverage code presents inconsistent evidence across method scopes, numeric progress is suppressed and a conflict warning is shown while the calculation remains blocked.

Encoded MASS fixture:

```text
initial:
  governed entities = 3
  checker covered = 0
  unique resolved = 1
  unique unresolved = 2
  missing obligations = 3
  state = BLOCKED

after accepting only PIPE-B operating-fluid evidence:
  governed entities = 3
  checker covered = 1
  unique resolved = 2
  unique unresolved = 1
  missing obligations = 2
  state = BLOCKED
```

### 3. Cause classification

Primary `What needs attention` distinguishes:

- `SHARED CAUSE` — same cause affects 2+ method/data scopes;
- `SINGLE CAUSE` — one scope only;
- `GATE ROLLUP` — derived gate state that clears with underlying causes.

`e2e/non-fea-input-check-cause-grouping.spec.js` now asserts all three as actual rendered rows:

```text
MASS_COVERAGE_INCOMPLETE -> data-cause-kind="shared"
MASTER_NOT_READY          -> data-cause-kind="single"
F_METHOD_READINESS        -> data-rollup="true" + data-cause-kind="rollup"
```

The `MASTER_NOT_READY` premise is source-grounded rather than guessed: `MasterDataConfigV1.createDefault()` starts `lineList` empty; bundled seeding populates weight/material and asynchronously attempts piping class, but there is no bundled line-list seed. Therefore a fresh browser context without imported line-list rows retains a required master gap.

### 4. Forward navigation

Presentation-owned action map:

- `MASS_COVERAGE_INCOMPLETE` -> Enrichment & Overrides;
- `SECTION_COVERAGE_INCOMPLETE` -> Enrichment & Overrides;
- `FLEXURAL_COVERAGE_INCOMPLETE` -> Enrichment & Overrides;
- live emitted `MASTER_NOT_READY` -> Import Masters.

Issue #1422 says `MASTER_NOT_CURRENT`; live status projection emits `MASTER_NOT_READY`, so the PR follows the live contract.

### 5. Reverse Enrichment feedback and exact dependency boundary

`src/workspace/enrichment/non-fea-enrichment-view.js`

- Adds `Open Validate Input` using the existing delegated `data-load-calc-tab="preflight"` contract.
- Proposal and accepted-record tables disclose which coverage causes each governed field can provide evidence for.
- Generated-master/fitting proposal messages name affected causes where the dependency is statically known.
- Boundary text states these are dependency disclosures only and **only the common checker can clear a blocker**.
- No checker evaluation or readiness authority is moved into Enrichment.

Checker-consistent reverse dependency map after ISS-1422-08:

```text
PIPE_OUTER_DIAMETER   -> SECTION_COVERAGE_INCOMPLETE + MASS_COVERAGE_INCOMPLETE
PIPE_WALL_THICKNESS   -> SECTION_COVERAGE_INCOMPLETE + MASS_COVERAGE_INCOMPLETE
MATERIAL_DENSITY      -> MASS_COVERAGE_INCOMPLETE
UNIT_PIPE_WEIGHT      -> MASS_COVERAGE_INCOMPLETE
fluid evidence        -> MASS_COVERAGE_INCOMPLETE
insulation evidence   -> MASS_COVERAGE_INCOMPLETE
COMPONENT_WEIGHT      -> MASS_COVERAGE_INCOMPLETE
ELASTIC_MODULUS       -> FLEXURAL_COVERAGE_INCOMPLETE
SECOND_MOMENT_AREA    -> FLEXURAL_COVERAGE_INCOMPLETE
FLEXURAL_RIGIDITY     -> FLEXURAL_COVERAGE_INCOMPLETE
```

Why OD/wall do not claim FLEXURAL: live `analyzeModelCoverage()` requires either direct `flexuralRigidityNm2` or both `elasticModulusMpa` and `secondMomentAreaMm4`. No governed OD/wall -> `secondMomentAreaMm4` derivation exists in this common checker/enrichment path. The UI must not promise an effect that the checker will not recognize.

Validate Input guidance now says explicitly: resolve `FLEXURAL_RIGIDITY` directly, or provide both `ELASTIC_MODULUS` and `SECOND_MOMENT_AREA`; OD/wall alone do not satisfy flexural coverage.

Acceptance sequence after ISS-1422-06 closure:

```text
capture proposal record in view
  -> call existing authoritative store accept unchanged
  -> store updates accepted sidecar
  -> view writes cause-aware confirmation message
  -> message states Validate Input must re-evaluate before blocker clearance
```

Single accept and `Accept all unblocked` both retain this feedback. `non-fea-enrichment-store.js` is unchanged.

### 6. Browser regression — MASS partial progress

`e2e/non-fea-input-check-coverage-progress.spec.js`, first test:

- real three-pipe partial fixture;
- one component carries two MASS obligations but counts as one unresolved entity;
- progress changes `1/3 -> 2/3` while checker state stays BLOCKED;
- actual `[data-load-calc-run]` remains disabled;
- primary detail directly exposes entities/reasons;
- grouping legend/rollup asserted;
- MASS -> Enrichment button exercised;
- staged and accepted reverse cause disclosure asserted;
- acceptance confirmation must name `MASS_COVERAGE_INCOMPLETE` and checker re-evaluation requirement;
- a `PIPE_OUTER_DIAMETER` proposal is staged/rejected to assert **SECTION + MASS are present and FLEXURAL is absent**, without accepting new engineering evidence;
- Enrichment -> Validate Input return button exercised.

### 7. Browser regression — real non-mass FLEXURAL forward/reverse link

Issue #1422 final acceptance matrix explicitly requires an E2E assertion for at least one non-mass coverage cause. The second test uses `PARTIAL_FLEXURAL_PACKAGE`:

- PIPE-A and PIPE-B carry direct `EI_N_M2`;
- PIPE-C deliberately omits `EI_N_M2` and has no E+I derivation evidence;
- all three carry direct mass/OPE/HYD evidence so MASS is not the intended test gap;
- repository property specs confirm `EI_N_M2 -> flexuralRigidityNm2`;
- the real checker therefore owns `FLEXURAL_COVERAGE_INCOMPLETE` for PIPE-C.

The app's current guided UI has no user-facing producer for `EMPIRICAL_LOAD_CALC_SCENARIO_EVENTS.CONFIGURE_REQUESTED`; default support-load implementation consumes only `WEIGHT_AND_GRAVITY` and `SUSTAINED_REACTIONS`, neither of which requires FLEXURAL coverage. To exercise the real non-mass presentation path without fabricating blockers, the test uses a narrow browser test seam:

```text
nonFeaCommonInputStore.configure(
  WEIGHT_AND_GRAVITY,
  SUSTAINED_REACTIONS,
  SUSTAINED_MEMBER_ACTIONS,
  VERTICAL_CONTACT
)

empiricalLoadCalcScenarioStore.getProposal() ->
  { method: 'EMPIRICAL_BEAM_CONTACT_V1' }
```

This is grounded to live production contracts:

- `EMPIRICAL_BEAM_CONTACT_V1` really consumes those four common methods;
- `SUSTAINED_MEMBER_ACTIONS` and `VERTICAL_CONTACT` really require `FLEXURAL_COVERAGE`;
- `empiricalLoadCalcScenarioStore` is an ordinary exported class instance and is not frozen/sealed;
- browser-side dynamic imports from `/src/...` are an existing repository Playwright pattern.

The seam changes only which real implementation consumption profile the view treats as active. It does **not** fabricate a blocker, coverage row, entity ID, or checker result. The actual preflight checker evaluates the requested real methods against the real fixture.

Assertions:

```text
FLEXURAL_COVERAGE_INCOMPLETE visible as shared cause
coverage total = 3
resolved = 2
unresolved = 1
missing obligations = 1
PIPE-C shown directly in entity detail
Calculation remains BLOCKED
Open Enrichment & Overrides -> real Enrichment pane visible
stage direct FLEXURAL_RIGIDITY for PIPE-C
FLEXURAL reverse cause visible
SECTION reverse cause absent
MASS reverse cause absent
```

This closes the explicit non-mass E2E cross-link acceptance item at the test-definition level; execution remains NOT_RUN.

### 8. Browser regression — three actual cause states

`e2e/non-fea-input-check-cause-grouping.spec.js` exists solely to close the final acceptance-matrix ambiguity around the grouping legend. It does not inject a fake status projection. It uploads a real small piping model and lets the normal preflight/status path render causes.

Assertions:

```text
shared MASS cause visible and labeled SHARED CAUSE
single MASTER_NOT_READY cause visible and labeled SINGLE CAUSE
MASTER_NOT_READY exposes Open Import Masters
F_METHOD_READINESS is rendered as GATE ROLLUP
all three legend definitions are visible
Run remains disabled
```

Execution remains NOT_RUN.

### 9. Deterministic anti-drift check

`scripts/non-fea-input-check-coverage-projection-check.mjs`

- partial/nearly-resolved states keep the same blocker code and remain BLOCKED;
- different missing evidence changes status semantic identity;
- rejects readiness promotion while evidence is missing;
- rejects state/readiness contradiction;
- rejects duplicate missing evidence;
- pins `coverageResult(): ready: normalized.length === 0`;
- pins MASS/SECTION/FLEXURAL owner routes;
- pins OD/wall -> SECTION + MASS and explicitly rejects OD -> FLEXURAL drift;
- pins E/I/EI -> FLEXURAL;
- pins Enrichment's no-readiness-authority boundary.

## Protected invariants

Unchanged by PR #1424:

- `coverageResult().ready === (missing.length === 0)`.
- `coverageRequirement()` READY/BLOCKED semantics.
- Common method readiness.
- Qualification profile semantics.
- Common-input sealing.
- Calculation authorization/execution eligibility.
- Solver/load-distribution mechanics.
- Engineering master-data authority.
- Benchmark values/tolerances/expected results.
- Workflow definitions.

## Engineering rationale

Partial progress is workflow information, not an acceptance criterion. A single unresolved component can dominate self-weight or support reaction, and missing fluid/insulation evidence can materially change distributed load. Therefore a partial count must remain BLOCKED until every required evidence obligation is resolved.

Falsifier: two complete components plus one heavy valve without `COMPONENT_WEIGHT`. If `2 of 3 resolved` enables Run or changes MASS to READY, the implementation is invalid.

## Failure isolation order

If displayed progress disagrees with accepted enrichment evidence:

1. `resolveNonFeaEnrichment` — did accepted evidence reach the ledger?
2. `analyzeModelCoverage` — did the enriched model satisfy the exact checker requirement?
3. presentation — is correct structured evidence displayed incorrectly?

Do not change UI counts/readiness to conceal an upstream discrepancy.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| live main exact head | PASS | `9887ec1c3eb6184c0d590841b23c04ed449f9414` | GitHub source inspection |
| branch divergence | PASS | ahead 43 / behind 0 before this recovery-record commit | GitHub compare |
| changed-path reconciliation | PASS | exactly 10 expected paths | GitHub compare |
| protected checker `index.js` unchanged | PASS | absent from PR file list | GitHub compare |
| protected solver/load/workflow paths unchanged | PASS | absent from PR file list | GitHub compare |
| reverse dependency semantic audit | PASS_SOURCE_INSPECTION | checker requires direct EI or E+I; OD/wall mapping corrected to SECTION+MASS only | checker/enrichment source inspection |
| Enrichment incidental-doc cleanup | PASS_DIFF_INSPECTION | base JSDoc for master proposal and fitting review restored | PR patch |
| `EI_N_M2` fixture alias | PASS_SOURCE_INSPECTION | production property spec maps to `flexuralRigidityNm2` | source inspection |
| beam/contact method consumption | PASS_SOURCE_INSPECTION | real implementation consumes member-actions/contact methods requiring flexural coverage | source inspection |
| browser dynamic-import seam precedent | PASS_SOURCE_INSPECTION | existing repository Playwright specs use `/src/...` dynamic imports | source inspection |
| cross-tab event integration | PASS_SOURCE_INSPECTION | delegated `data-load-calc-tab`; preflight/enrichment panes exist | source inspection |
| acceptance-time feedback diagnosis/fix | PASS_SOURCE_INSPECTION | view preserves causes after authoritative accept; store unchanged | source/diff inspection |
| grouping three-real-state definition | PASS_SOURCE_INSPECTION | dedicated spec asserts real shared MASS, single MASTER_NOT_READY, F_METHOD_READINESS rollup | test/source inspection |
| grouping single-scope bootstrap premise | PASS_SOURCE_INSPECTION | lineList starts empty and is not bundled; required master gap remains in fresh context | master-data-controller source inspection |
| #1422 acceptance-matrix test definitions | PASS_SOURCE_INSPECTION | partial progress, direct detail, real 3-state grouping, MASS and non-mass cross-link cases encoded | source inspection |
| reconstructed coverage normalization/presentation | PASS_RECONSTRUCTED_LOCAL | exact new logic produced `1/3 -> 2/3` unique progress and rejected readiness/state contradictions | local reconstruction |
| faithful checkout transport | FAIL_ENVIRONMENT | shell git DNS fails; GitHub archive/raw download bridge unavailable | environment/connector inspection |
| local package cache | FAIL_ENVIRONMENT | no project checkout/node_modules or npm package cache found | local filesystem inspection |
| exact-head combined commit statuses | NONE | no classic commit statuses reported at last check | GitHub inspection |
| exact-head automatic workflows | NOT_APPLICABLE_TO_1422 | unrelated EMP.1/LFEA workflows run because workreport path triggers them; they execute none of #1422's required commands | workflow/source inspection |
| focused projection script in real checkout | NOT_RUN | no faithful checkout | NONE |
| advanced shell contract | NOT_RUN | no faithful checkout | NONE |
| focused coverage/grouping E2E | NOT_RUN | no faithful checkout/dependency graph | NONE |
| existing input-check E2E | NOT_RUN | no faithful checkout/dependency graph | NONE |
| workspace contracts | NOT_RUN | no faithful checkout/dependency graph | NONE |

Chromium exists locally at `/usr/bin/chromium`; browser absence is not the blocker. The blocker is faithful repository/dependency materialization.

The existing Pages workflow would execute `npm run build`, which transitively runs `node scripts/advanced-shell-contract-check.mjs`, but it is `push: main` / `workflow_dispatch` only. The connected GitHub interface exposes no workflow-dispatch operation. Merging or modifying a protected workflow merely to manufacture validation is prohibited.

A partial connector-reconstructed tree is also not treated as an advanced-shell PASS because that script asserts filesystem absences; an incomplete tree could falsely satisfy those assertions.

## Appendix A status

### A1 — Production trace

PASS by live source inspection.

### A2 — Current failure isolation

Repository-retained #1419 evidence records mass-gap progress `148 -> 88 -> 45 -> 31 -> 5` while the old root cause remained structurally unchanged. PR #1424 defines real partial MASS and FLEXURAL browser cases. Fresh browser execution remains NOT_RUN.

### A3 — Authority / invariant

PASS. Partial evidence must not authorize calculation. Falsifier documented above.

### A4 — Independent validation

FAIL / NOT QUALIFIED in this environment. Required real-checkout commands remain NOT_RUN. Source inspection and reconstructed local execution are supplementary only.

### A5 — Minimal patch / falsifier

PASS by source inspection. Structured evidence is preserved/presented without touching checker readiness. Falsifier: different missing sets render identical progress, or any missing state becomes runnable.

### Qualification verdict

`APPENDIX_A_QUALIFIED = false` because A4 remains below the required minimum. Owner `Start coding` authorized mutation only; it is not validation authority.

## Active ledger

- ISS-1422-01 — IMPLEMENTED / execution validation pending: structured coverage projection.
- ISS-1422-02 — IMPLEMENTED / execution validation pending: primary entity/reason detail.
- ISS-1422-03 — IMPLEMENTED / execution validation pending: shared/single/rollup distinction.
- ISS-1422-04 — IMPLEMENTED / execution validation pending: coverage owner navigation.
- ISS-1422-05 — IMPLEMENTED / execution validation pending: Enrichment reverse disclosure.
- ISS-1422-06 — CLOSED / execution validation pending: acceptance message overwrite fixed in view; store unchanged.
- ISS-1422-07 — CLOSED / execution validation pending: explicit non-mass E2E cross-link encoded with real FLEXURAL checker evidence.
- ISS-1422-08 — CLOSED / execution validation pending: OD/wall -> FLEXURAL overclaim removed; mapping/guidance/tests now match checker E/I/EI semantics.
- ISS-1422-09 — CLOSED / execution validation pending: real single-scope cause assertion added; grouping acceptance now covers actual shared/single/rollup rows.
- RISK-1422-01 — MITIGATED: unique entities separated from raw obligations.
- RISK-1422-02 — MITIGATED_BY_CONTRACT: status identity changes with coverage evidence without changing readiness.
- RISK-1422-03 — OPEN: browser/workspace regressions are encoded but not executed in a faithful checkout.
- RISK-1422-04 — OPEN: unrelated automatic workflows provide no #1422 validation evidence.
- RISK-1422-05 — OPEN: dedicated grouping spec premise is source-grounded but execution remains required.
- DEC-1422-01 — checker readiness semantics immutable.
- DEC-1422-02 — unique-entity progress is presentation-only.
- DEC-1422-03 — use live `MASTER_NOT_READY`, not stale issue token.
- DEC-1422-04 — Enrichment mapping is dependency disclosure, not readiness authority.
- DEC-1422-05 — acceptance feedback stays in view; store is not coupled to UI blocker taxonomy.
- DEC-1422-06 — non-mass E2E uses a real checker fixture + real implementation consumption profile; only active-profile selection is a test seam.
- DEC-1422-07 — reverse cause mapping follows checker-observable evidence semantics; do not infer unstated engineering derivations from field relationships.
- DEC-1422-08 — grouping acceptance requires real cause rows, not only legend copy.

## Changed-file ledger

1. `agents/PR1424_workreport.md` — living recovery/evidence record.
2. `agents/claims/PR1424.yaml` — active validation-pending claim.
3. `agents/status/PR1424.yaml` — machine-readable delivery state.
4. `src/workspace/non-fea-analysis-plan-runtime.js` — checker coverage evidence projection.
5. `src/core/non-fea-common-checker/workspace-status-projection.js` — fail-closed coverage normalization.
6. `src/workspace/non-fea-input-check-view.js` — progress/detail/grouping/forward navigation and checker-consistent FLEXURAL guidance.
7. `src/workspace/enrichment/non-fea-enrichment-view.js` — exact reverse dependency/acceptance feedback/navigation.
8. `scripts/non-fea-input-check-coverage-projection-check.mjs` — focused anti-drift contract.
9. `e2e/non-fea-input-check-coverage-progress.spec.js` — MASS partial + non-mass FLEXURAL browser regressions.
10. `e2e/non-fea-input-check-cause-grouping.spec.js` — real shared/single/rollup browser regression and MASTER_NOT_READY owner-action assertion.

No protected source path is in this ledger.

## Next-agent expert questionnaire

1. What are current main, PR head, merge base, and ahead/behind counts? Any new overlapping claim/PR?
2. Is `src/core/non-fea-common-checker/index.js` still absent from the PR diff, and is `ready: normalized.length === 0` unchanged?
3. Why can MASS checker `covered` differ from displayed unique resolved entities?
4. Which status field carries coverage evidence and what contradictions does its normalizer reject?
5. Which blocker codes route to Enrichment/Import Masters, and why is `MASTER_NOT_READY` used?
6. Why does Enrichment say an accepted record *provides evidence for* a cause rather than saying it cleared the cause?
7. Trace single-record acceptance and prove the engineering store remains unchanged.
8. Explain why OD/wall map to SECTION+MASS but not FLEXURAL, and name the exact evidence combinations the checker accepts for FLEXURAL.
9. Explain why the FLEXURAL Playwright blocker is checker-generated rather than fabricated.
10. Prove the grouping test's `MASTER_NOT_READY` row is a real production state and explain why line-list authority is still missing in a fresh context.
11. Run and paste exact outputs of the required commands below. Do not inherit `NOT_RUN` as PASS.
12. If a test fails, record exact output and isolate enrichment -> checker -> rendering before changing expected values.

## Required next commands in a faithful real checkout

```bash
node scripts/non-fea-input-check-coverage-projection-check.mjs
node scripts/advanced-shell-contract-check.mjs
npm run check:e2e -- e2e/non-fea-input-check-coverage-progress.spec.js e2e/non-fea-input-check-cause-grouping.spec.js
npm run check:e2e -- e2e/non-fea-input-check-load-calc.spec.js
npm run check:workspace-contracts
```

`run-playwright.mjs` forwards all CLI arguments after the script name to Playwright, so the two focused specs can be executed in one required focused-E2E command.

## EXACT_NEXT_ACTION

Obtain a faithful checkout of PR #1424, re-ground main/overlap, run the five commands above verbatim, record exact outputs in this workreport, and fix only evidenced failures. Mark review-ready only if all required validation is genuinely green. Do not merge without owner authority.
