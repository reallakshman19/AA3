# PR1396 work report — LFEA S7 UI/disclosure + integration anti-drift verification

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_DRAFT
PR_RECOVERY_STATE: HEALTHY_DRAFT_RUNTIME_NOT_RUN
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: ACTIVE
SCOPE_AUTHORITY: S7_NUMERICALLY_INERT_INTEGRATION_VERIFICATION_STACKED_ON_PR1395
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/Advanced_Analysis
PR: 1396
PR_URL: https://github.com/reallaksh19/Advanced_Analysis/pull/1396
STACK_BASE_PR: 1395
STACK_BASE_HEAD: 2b4b4762973c84690b636eab8abe918e307d5dab
BRANCH: agent/lfea-piping-promotion-s7-ui-disclosure-20260824
CODE_HEAD_VALIDATION_BASIS: f936cd58519240975603e80c6b4babb658faef2f
MAIN_HEAD_LAST_GROUNDED: e985b50d81d0d241db27313562c8cc12cd7cc27d
CURRENT_STAGE: S7 UI/disclosure, promotion anti-drift, and carried-forward S0 capability guard implemented without production src changes
NUMERICAL_MUTATION_ALLOWED: false
CURRENT_BLOCKER: GitHub Actions completes before checkout/step 1; all exact-head execution remains NOT_RUN
HIGHEST_RISK: merging a promoted capability stack after losing source-specific eligibility, builder reachability, single-owner mechanics, or the original S0 disclosure guard
EXACT_NEXT_ACTION: keep draft; recover executable CI under issue #54, then qualify #1348/#1395/#1396 in ancestry order before any owner-authorized merge
```

## Assignment and stage authority

Stage S7 from `docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md` is numerically inert. The same plan requires promotion-wide anti-drift after S7. Integration review also found that the older S0-only PR #1341 contained one unique capability guard that had not been carried into #1348. This PR now carries that guard forward, adapted to the current S3/S6 source-gated semantics.

No production `src/` file is modified by this PR. No merge is authorized by this report.

## Effective S7 / integration diff

Against PR #1395 head `2b4b4762973c84690b636eab8abe918e307d5dab`, the changed-file surface is six verification/recovery files:

1. `.github/workflows/lfea-piping-promotion-s7-ui.yml`
2. `agents/PR1396_workreport.md`
3. `scripts/lfea-s7-component-ui-disclosure-check.mjs`
4. `scripts/lfea-piping-component-promotion-anti-drift-check.mjs`
5. `scripts/lfea-production-capability-profile-check.mjs`
6. `scripts/linear-piping-analysis-consumer-check.mjs`

There is no production `src/` change. Any numerical movement attributable to S7 is a falsifier.

## S7 governed disclosure verification

`scripts/lfea-s7-component-ui-disclosure-check.mjs` verifies the governed data path rather than rendered wording:

- source-qualified TYPE=3 welding tee clears `MODEL_TEE_EXACT_MECHANICS_UNAVAILABLE`;
- TYPE=5 weldolet retains the tee approximation finding;
- source-qualified exact bend clears `MODEL_BEND_EXACT_MECHANICS_UNAVAILABLE`;
- unresolved bend/tee plain-language and suggested-action mappings remain registered;
- SOURCE and ANALYSIS geometry remain separate authority records;
- bend retopology may increase ANALYSIS nodes/spans without changing SOURCE identity/count evidence.

## Promotion-wide anti-drift

`scripts/lfea-piping-component-promotion-anti-drift-check.mjs` locks the implemented S1-S7 architecture.

### S2 custody

- structural bindings use conditioned `segment.startNodeId` / `segment.endNodeId`;
- source-parent endpoints may not return to the structural binding path;
- `retopologiseDeclaredBends`, `requireBendRetopologyBindingsResolved` and `requireExplainedConditioning` remain reachable.

### S3 exact bend

When `bendExactMechanics=true`:

- governed production element authority reaches `compileInputXmlProductionBendComponents`;
- the bend path reaches `compilePipingComponent`;
- source tangent/arc eligibility remains mandatory;
- factor basis remains `ARC_GEOMETRY_EXCLUDED_V1`;
- S3 still rejects pressure-corrected factors;
- component convergence and double-count/single-owner evidence remain required.

### S6 exact welding tee

When `teeExactMechanics=true`:

- governed element authority reaches `compileInputXmlProductionBranchModifiers`;
- branch roles use `classifyBranchLegs`;
- directional flexibility uses `deriveB31JDirectionalBranchEndModifiers`;
- TYPE=3 is the exact source eligibility and TYPE=5 is not widened;
- bend/tee overlap and run OD/wall ambiguity remain fail-closed;
- one element cannot receive both bend-component and tee-modifier ownership.

### S4/S5 locked state

The integrated stack deliberately requires:

```text
reducerExactMechanics = false
pressureStiffening = false
pressureAxialThrust = false
pressureBourdon = false
```

A future qualified S4/S5 numerical PR must intentionally revise this guard in the same stage. An accidental flag flip fails.

## S0 guard carry-forward / PR #1341 audit

PR #1341 changed seven files. Its four production/disclosure files are already represented and evolved in #1348/#1395:

- `production-capability-profile.js`
- `inputxml-feature-inventory.js`
- `generic-inputxml-solve-case.js`
- `inputxml-linear-preparation-load-authorities.js`

The integration audit found one unique functional guard missing from the promoted stack:

- `scripts/lfea-production-capability-profile-check.mjs`
- plus its import from `scripts/linear-piping-analysis-consumer-check.mjs`.

This PR now carries that protection forward, updated for current truth:

- bend exact implementation capability = true, but unqualified bend source still discloses approximation;
- tee exact implementation capability = true, but TYPE=5 still discloses approximation;
- reducer and S5 pressure mechanics remain false;
- all capability consumers must use shared pressure-disclosure authority;
- enabled bend and tee capabilities require retained benchmark scripts and governed production builder reachability;
- the capability check must remain wired into `check:linear-piping-analysis-consumer` through the aggregate script.

**Disposition of #1341:** functionally subsumed on the #1396 descendant stack by source inspection, but still open/draft and owner-controlled. This report does not close, merge, or supersede #1341 administratively.

## Persistent workflow coverage

`.github/workflows/lfea-piping-promotion-s7-ui.yml` now triggers on the S7/integration scripts, geometry adapters, aggregate consumer check and governed linear-piping consumer directory. It declares:

1. syntax checks for S7, promotion and capability guards plus consumer aggregate;
2. production capability profile guard;
3. governed linear-piping consumer aggregate;
4. S7 UI disclosure verification;
5. promotion-wide engineering anti-drift;
6. existing linear-piping consumer anti-drift;
7. existing common Error Check contract;
8. existing Model Review geometry contract.

## CI / Issue #54 evidence

The repository-wide pre-step infrastructure failure remains active and has been consolidated into Issue #54.

### Prior promotion-wide guard run

```text
run: 32680483733
job: 97296191210
code head: f41231c6b1d4d263a2826001c8750183cd0b6043
steps: []
```

### Carried-forward S0 guard run

```text
run: 32680966223
job: 97297487753
code head: f936cd58519240975603e80c6b4babb658faef2f
steps: []
```

Both jobs completed before checkout. This is:

```text
NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE
SOURCE_FAILURE_PROVEN: false
PASS_PROVEN: false
```

Issue #54 now contains the LFEA piping S1-S7 reproductions. The documented B7H self-hosted route is deliberately bounded to a different `C2D-LUG-PINHOLE -> LAFEA.3` pilot and has not been silently repurposed for piping qualification.

## Validation ledger

| Check | State | Evidence / note |
|---|---|---|
| Stack base #1395 | PASS — GROUNDED | exact base head `2b4b4762973c84690b636eab8abe918e307d5dab` |
| Effective integration scope | PASS — DIFF_INSPECTION | six files, no production `src/` modification |
| S2 conditioned-endpoint custody | PASS — SOURCE_INSPECTION | current structural preparation |
| S3 builder/source/double-count path | PASS — SOURCE_INSPECTION | current bend compiler + element authority |
| S6 TYPE=3/topology/single-owner path | PASS — SOURCE_INSPECTION | current branch compiler + element authority |
| S4/S5 capability state | PASS — SOURCE_INSPECTION | all blocked flags false |
| #1341 production/disclosure implementation carry-forward | PASS — SOURCE_INSPECTION | equivalent/evolved shared profile consumers present |
| #1341 unique capability guard carry-forward | PASS_AFTER_FIX — SOURCE_INSPECTION | adapted guard added and aggregate import restored |
| S7 governed disclosure execution | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | no checkout |
| capability guard execution | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | run 32680966223 / job 97297487753 |
| consumer aggregate execution | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | same job did not start |
| promotion anti-drift execution | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | no checkout |
| existing consumer/Error Check/geometry contracts | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | no checkout |

## Stack and merge sequencing

Current safe ancestry/order when qualification and owner authorization eventually exist:

```text
#1348  S1-S3 + evolved S0 capability implementation
  -> #1395  S6 TYPE=3 tee/branch
     -> #1396  S7 + global promotion/S0 carry-forward guards
```

Parallel blocked prerequisites:

- #1386 — S4 reducer prerequisite; exact S4 needs current-version CAESAR section sampling, gravity ownership and response parity.
- #1391 — S5 pressure/Bourdon prerequisite on #1348; exact S5 needs isolated numerical parity and per-case Elbow Stiffening Pressure authority.

PR #1341 is functionally carried forward by the descendant stack but remains an open owner-controlled coordination item. No administrative action is authorized here.

## Non-claims

- Source inspection is not runtime PASS.
- S7 does not qualify S2/S3/S6 numerics.
- S7 does not promote reducer or pressure mechanics.
- The hosted Actions outage is not repaired.
- No benchmark was re-baselined, no tolerance widened, and no engineering guard weakened.

# APPENDIX A — expert takeover questionnaire

1. Why must conditioned structural endpoints come from produced spans rather than source parents after S2?
2. Why can `bendExactMechanics=true` coexist with unresolved bends still disclosed approximate?
3. Explain `ARC_GEOMETRY_EXCLUDED_V1` and the single-application bend flexibility proof.
4. Why is TYPE=5 excluded from S6 despite global `teeExactMechanics=true`?
5. Why must bend/tee dual ownership of one structural carrier block?
6. Which exact S0 guard was missing from #1348 and how was it adapted on #1396?
7. Why does the capability guard require both benchmark presence and production builder reachability?
8. Why are S4/S5 flags asserted false by the global guard today?
9. Why is a job with `steps=[]` NOT_RUN rather than engineering FAIL?
10. State the safe stack merge order and explain why #1341 is functionally subsumed but not administratively closed.
