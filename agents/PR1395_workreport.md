# PR1395 work report — LFEA S6 tee/branch flexibility promotion

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: IN_PROGRESS
PR_RECOVERY_STATE: ACTIVE_DRAFT
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: ACTIVE
SCOPE_AUTHORITY: S6_ONLY_STACKED_ON_PR1348
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/Advanced_Analysis
PR: 1395
PR_URL: https://github.com/reallaksh19/Advanced_Analysis/pull/1395
STACK_BASE_PR: 1348
STACK_BASE_BRANCH: agent/lfea-piping-promotion-s1-bend-tangent-custody-20260823
STACK_BASE_HEAD: 25543a9e6c0e796d63e89841f63e41a4fd3292cc
BRANCH: agent/lfea-piping-promotion-s6-tee-branch-20260824
EXACT_HEAD_WITH_PR_REPORT: 87a27bede26ce548cd88f138b375b9cb20e207c2
CURRENT_STAGE: S6 exact welding-tee mechanics implemented; hosted exact-head execution unavailable
CURRENT_BLOCKER: GitHub Actions completes before step 1; original and rerun jobs both returned zero executed steps
HIGHEST_RISK: falsely promoting a non-welding-tee source, choosing header geometry by element order, or reconstructing a different tee stiffness at solve/recovery than pre-flight authorized
EXACT_NEXT_ACTION: preserve S6 as draft/NOT_RUN, proceed to numerically inert S7 UI/disclosure verification on a separate stack, and re-run S6 qualification when hosted execution becomes available
```

## Assignment and authority

Implement Stage S6 from `docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md` using the existing qualified `classifyBranchLegs()` and `deriveB31JDirectionalBranchEndModifiers()` mechanics. S6 is deliberately stacked directly on PR #1348 and is independent of draft PR #1391 / S5 pressure-Bourdon prerequisite.

No merge is authorized by this work report. PR remains draft until owner instruction.

## Engineering decisions

### DEC-S6-01 — Existing incident spans own tee mechanics

A welding tee does **not** create a duplicate parallel tee element. The three existing incident structural carriers remain the model spans. Directional B31/B31J end springs and the qualified branch run-surface rigid offset modify those carriers in place.

Reason: duplicate tee spans would introduce a parallel stiffness path and double-count junction flexibility.

### DEC-S6-02 — Run/branch classification is topology-driven

Run legs are selected only by the existing `classifyBranchLegs()` direction-vector topology rule. Nominal diameter is not used to choose the run.

A valid exact source must resolve exactly two anti-parallel/collinear run legs and one branch leg under the declared topology tolerance.

### DEC-S6-03 — Exact source eligibility is TYPE=3 welding tee only

`productionTeeSourceEligible(segment)` accepts a TYPE=3 SIF declaration only when its declared node is an endpoint of the segment that carries the declaration.

TYPE=5 weldolets remain outside S6 and retain `GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY` even though the global tee capability is enabled.

An orphan TYPE=3 declaration that names an unrelated node also remains non-exact.

### DEC-S6-04 — Header geometry must be unambiguous

The two run legs must establish one identical run OD and wall thickness before B31/B31J tee factors are calculated. S6 does not choose one run leg's wall by ordering.

The existing BM4_L-qualified 0.001 relative reconciliation remains narrowly applicable only when the **branch OD** is marginally above the run OD for equal-nominal source data. That tolerance is not used to reconcile conflicting run/header definitions.

### DEC-S6-05 — Factor edition authority is explicit and tee-specific

A sealed `lfea-production-branch-factor-authority/v1` record carries the explicit B31/B31J edition and current source-intake identity.

The engineer-facing component control shares the edition choice between bend and tee mechanics, but the bend smooth-90 choice remains bend-only. A tee-only model therefore does not need an irrelevant smooth-90 decision.

No edition is inferred from CAESAR version, filename, geometry, current year or benchmark precedent.

### DEC-S6-06 — Physical branch span begins at the run surface

`deriveB31JDirectionalBranchEndModifiers()` supplies the qualified branch rigid offset. The branch frame's flexible length is resolved from the physical run surface to its remote node; the offset transformation connects that physical span back to the centreline junction DOFs.

Run legs retain null rigid offset.

### DEC-S6-07 — Rigid-offset thermal free state follows M047 ordering

For a temperature case:

1. compile the frame with the tee rotational end springs;
2. use the resulting effective local stiffness;
3. derive the branch run-surface free translation `offset * alpha * DeltaT` from the common run thermal/material authority;
4. transform and add the corresponding initial-strain load after spring condensation.

Run-leg temperatures/material state must agree or the model blocks.

### DEC-S6-08 — Effective stiffness identity is branch-aware

The effective stiffness hash includes:

- mechanical-model stiffness parent;
- production capability profile hash;
- bend factor authority if present;
- branch factor authority if present;
- actual per-element global stiffness hashes;
- branch modifier applied state;
- junction node, leg role and factor-result semantic identity.

Pre-flight, execution, recovery, native support publication and native B31 publication reconstruct the same branch authority and compare currentness.

### DEC-S6-09 — Component overlap blocks

One element cannot simultaneously be owned by a B-3.2 bend component and an S6 tee modifier. Combined bend/tee carrier ownership is unqualified and fails closed.

## Capability state after S6

```text
bendExactMechanics    = true   # inherited from S3 / PR1348
teeExactMechanics     = true   # S6
reducerExactMechanics = false  # S4 remains unpromoted in this stack
pressureStiffening    = false  # S5 separate
pressureAxialThrust   = false  # S5 separate
pressureBourdon       = false  # S5 separate
pressureCodeStress    = true   # pre-existing
```

## Qualification design

### `scripts/lfea-s6-tee-production-authority-check.mjs`

The deterministic check is designed to prove:

1. a junction away from the global origin resolves two run legs and one branch by direction topology;
2. exactly three existing structural carriers are modified and no duplicate tee element exists;
3. directional rotational springs are positive and non-unity mechanics are exercised;
4. branch rigid offset magnitude equals run OD/2 and only the branch receives it;
5. the flexible branch frame starts at the run surface;
6. rigid-offset thermal free growth enters the initial-strain vector;
7. mismatched run thermal states block;
8. TYPE=5 source remains non-exact;
9. orphan TYPE=3 source remains non-exact;
10. mismatched run OD/wall header definition blocks before factor evaluation;
11. a clean three-leg ACCDB fixture passes through governed native pre-flight with exact tee mechanics;
12. pre-flight retains the exact branch factor authority and a post-tee effective stiffness identity distinct from the raw mechanical-model stiffness;
13. runtime reconstruction reproduces the exact pre-flight effective stiffness identity.

### Existing engineering benchmarks re-run by S6 workflow

- `scripts/lfea-b3.21-b31j-phase2-factor-benchmark-check.mjs`
- `scripts/lfea-m047-tee-rigid-thermal-check.mjs`
- `scripts/linear-piping-analysis-consumer-anti-drift-check.mjs`

No expected benchmark value or tolerance was changed by S6.

## Hosted exact-head execution evidence

Workflow `LFEA S6 tee branch promotion`, run `32676191182`, was created for exact head `87a27bede26ce548cd88f138b375b9cb20e207c2`.

- original job `97284632751`: GitHub reports `conclusion=failure`, but `fetch_workflow_job_steps` returned `steps=[]`; job-log retrieval returned HTTP 404 `BlobNotFound`;
- failed-job rerun was explicitly requested and accepted by GitHub;
- rerun job `97284764987`: again completed with `steps=[]` before any declared checkout/setup/syntax/test step executed.

Therefore the correct engineering classification is **NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE**, not PASS and not an S6 assertion FAIL. This is the same pre-step execution condition previously observed on the #1348 promotion workflow.

## Validation ledger

| Check | State | Evidence / note |
|---|---|---|
| Stack base #1348 | PASS — GROUNDED | base head `25543a9e6c0e796d63e89841f63e41a4fd3292cc` |
| Branch ancestry | PASS — GROUNDED | before PR report: 25 commits ahead, 0 behind #1348 |
| S6 source/method review | PASS — SOURCE_INSPECTION | existing B3.21 + M047 mechanics reused; no new empirical branch formula |
| TYPE=5 exclusion | PASS — SOURCE_INSPECTION | eligibility gate requires TYPE=3 |
| orphan TYPE=3 exclusion | PASS — SOURCE_INSPECTION | declaration node must own segment endpoint |
| run header OD/wall ambiguity block | PASS — SOURCE_INSPECTION | exact equality required before factor calculation |
| guarded package `<300` lines | PASS — SOURCE_INSPECTION | largest new production JS at PR creation: `inputxml-production-branch-modifiers.js`, 279 physical lines/additions, below `<300` |
| hidden default-parameter guard review | PASS — SOURCE_INSPECTION | new guarded-package functions use explicit `undefined` handling; no `function ...(x=...)` added |
| S6 deterministic production check | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | run `32676191182`; jobs `97284632751`, `97284764987`; zero executed steps |
| B3.21 factor benchmark | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | same workflow never reached test steps |
| M047 tee rigid-thermal benchmark | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | same workflow never reached test steps |
| linear piping consumer anti-drift | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | same workflow never reached test steps |

## Changed-file ledger

| File | Purpose |
|---|---|
| `.github/workflows/lfea-piping-promotion-s6-tee.yml` | narrow S6 exact-head workflow |
| `agents/PR1395_workreport.md` | living recovery authority |
| `scripts/lfea-s6-tee-production-authority-check.mjs` | S6 deterministic production qualification |
| `src/core/linear-piping-analysis-consumer/inputxml-branch-element-augmentation.js` | branch rigid offset and qualified rigid-thermal free state |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-element-authorities.js` | shared bend/tee/frame stiffness ownership compiler |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-element-authority-support.js` | branch ledger and effective stiffness identity |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js` | pass branch factor authority into runtime compiler |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-frame-authority.js` | compile ordinary or tee-modified frame spans once |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-production-executor.js` | runtime branch authority/currentness plumbing |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-production-recovery.js` | recovery branch authority/currentness plumbing |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-elements.js` | pre-flight branch authority plumbing |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-preflight.js` | retain tee exactness and factor authority in pre-flight |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-preflight-contract.js` | validate/seal tee authority and ledger evidence |
| `src/core/linear-piping-analysis-consumer/inputxml-production-branch-factor-authority.js` | sealed explicit B31/B31J branch edition authority |
| `src/core/linear-piping-analysis-consumer/inputxml-production-branch-modifiers.js` | topology, factor calculation and three-carrier modifiers |
| `src/core/linear-piping-analysis-consumer/production-capability-profile.js` | source-gated `teeExactMechanics=true` |
| `src/lfea/native-b31-case-chain.js` | reconstruct branch-aware elements for B31 publication |
| `src/lfea/native-support-publication-case-chain.js` | reconstruct branch-aware elements for support publication |
| `src/workspace/lfea-bend-factor-authority-control.js` | shared component edition + bend-only smooth90 authority UI |
| `src/workspace/linear-piping-inputxml-prefea.js` | seal branch factor authority into governed native pre-flight |

The transitional `agents/WIP-S6TEE_workreport.md` has been deleted after PR #1395 allocation. `agents/PR1395_workreport.md` is the sole S6 recovery authority.

## Known exclusions / non-claims

- TYPE=5 weldolet exact flexibility is **not** authorized.
- non-three-leg/ambiguous junction topology is not approximated as exact.
- a source tee overlapping bend-owned retopology is not combined silently.
- reducer exact mechanics remain outside this PR.
- pressure stiffening, axial thrust and Bourdon mechanics remain outside this PR.
- S6 does not authorize new SIF/code-stress treatment beyond existing B31 application authority; this stage promotes structural junction flexibility.
- S6 exact-head runtime qualification is **not established** while hosted jobs execute zero steps.

## Appendix A — expert takeover questionnaire

A takeover engineer should be able to answer all of the following before changing S6 mechanics:

1. Why must tee run/branch roles come from direction topology rather than pipe diameter?
2. Why are the three incident existing spans the correct S6 carriers, and what double-count error would a duplicate tee element create?
3. What makes TYPE=3 welding tee source eligible, and why do TYPE=5 and orphan TYPE=3 records remain non-exact after `teeExactMechanics=true`?
4. Why must both run legs establish one header OD and wall thickness before factor evaluation?
5. What is the narrow purpose and source of the 0.001 branch-OD reconciliation tolerance, and why must it not reconcile conflicting run/header sections?
6. Which record is the explicit B31/B31J branch edition authority, and why is bend smooth-90 not part of it?
7. How does `deriveB31JDirectionalBranchEndModifiers()` map flexibility to local rotational end springs?
8. Why does the branch flexible span begin at run OD/2 from the centreline junction while run legs remain centreline spans?
9. In what order are tee spring condensation, rigid-offset thermal free translation, local/global transformation and offset transformation applied?
10. What source evidence proves both run legs share the same thermal/material authority, and what happens when they do not?
11. Which hash/currentness records ensure runtime/recovery cannot silently rebuild a different tee stiffness than pre-flight qualified?
12. Why must bend-component + tee-modifier overlap block rather than pick one authority?
13. Why are run `32676191182` and its rerun classified NOT_RUN rather than engineering FAIL?
14. What is explicitly NOT promoted by S6 (TYPE=5, reducer, pressure stiffening/thrust/Bourdon)?
15. If a benchmark moves, what evidence is required instead of editing expected values or widening tolerance?
