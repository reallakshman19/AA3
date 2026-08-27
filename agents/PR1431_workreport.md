# PR1431 — Load Calc component-contained fluid mass

## Current recovery state

```text
REPOSITORY: reallaksh19/Advanced_Analysis
ISSUE: #1321
PR: #1431
BRANCH: agent/issue-1321-component-contained-fluid
CRITICALITY: ENGINEERING_CRITICAL
EXECUTION_MODE: AUTO
MAIN_HEAD_LAST_CHECKED: 7b2a8119aa5faeee7cc102c894991851019c5a7b
MERGE_BASE: 7b2a8119aa5faeee7cc102c894991851019c5a7b
SYNC_COMMIT: 808254b88aaba40d946f2482bd2517fb7713408b
VALIDATION_BASIS_HEAD: b47930898f3b6d986ccd8936c084260a4d86d0f1
CURRENT_STAGE: IMPLEMENTATION_COMPLETE_REQUIRED_EXECUTION_VALIDATION_NOT_RUN
HANDOVER_READINESS: READY
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
```

## Mission

Add optional case-dependent contained-fluid mass for non-PIPE components while preserving existing dry-mass ownership and line-fluid mechanics.

```text
EMPTY = authorized dry component mass
OPE   = dry mass + optional authorized OPE component-contained fluid mass
HYD   = dry mass + optional authorized HYD component-contained fluid mass
```

All component mass terms remain at the existing component application point/CoG. No content term is applied to PIPE entities.

## Independent oracle

Focused benchmark:

```text
dry component mass = 100 kg
OPE content        =   8 kg
HYD content        =  10 kg

EMPTY = 100 kg
OPE   = 108 kg
HYD   = 110 kg
```

This arithmetic is independent of the implementation. It is encoded in `scripts/authorized-empirical-component-contained-fluid-check.mjs` but the repository script itself remains `NOT_RUN` in the present environment.

## Current v1 authority boundary

Component content is deliberately narrower than dry component mass.

Supported effective authorities in this slice:

```text
PROJECT_CONFIGURED_DEFAULT
PRODUCT_DEFAULT
```

Not advertised for component content in v1:

```text
SOURCE_EXPLICIT
SOURCE_INHERITED
EXACT_APPROVED_MASTER
ACCEPTED_OVERRIDE
```

Reason: the current exact common-enriched COMPONENT candidate assembly has a dedicated dry component-weight resolver but no dedicated component-content source/master/manual-review resolver. Advertising those authorities would create a dead-end path or an authority overclaim.

Shared-model properties `componentFluidWeightOpeKg` and `componentFluidWeightHydKg` therefore remain alias-free. No arbitrary source column can become component-content authority by name matching.

The lower Non-FEA enrichment registry is aligned with this boundary: the two content fields permit `PROJECT_CONFIGURED_DEFAULT` only there. Product engineering defaults enter through the separate Product-default provider/overlay rather than the core enrichment sidecar.

## Production implementation

### 1. Common field custody

`src/core/shared-piping-model/property-specs.js`

Adds alias-free optional component engineering properties:

```text
componentFluidWeightOpeKg
componentFluidWeightHydKg
```

`src/workspace/project-data/non-fea-field-registry.js`

Adds:

```text
COMPONENT_OPERATING_FLUID_WEIGHT -> kg
COMPONENT_HYDRO_FLUID_WEIGHT     -> kg
```

Both are default-eligible for weight methods and resolve only through Project-configured or Product defaults in v1.

`src/core/non-fea-enrichment/index.js`

Registers the two properties but rejects SOURCE/SOURCE_INHERITED/MASTER/ACCEPTED_OVERRIDE authority for them. This keeps the lower registry consistent with the actual common-enriched publication route.

### 2. Common-enriched default publication

`src/workspace/project-data/non-fea-common-enriched-configured-default-overlay.js`

Publishes component-scoped Project defaults as:

```text
component.fluidWeightOpeKg  kg
component.fluidWeightHydKg  kg
```

`src/workspace/project-data/non-fea-common-enriched-product-default-overlay.js`

Publishes the same fields from an explicitly supplied versioned Product engineering-default table. The shipped Product engineering-default table remains empty, so no universal contained-fluid assumption is introduced.

### 3. Authorized effective-value projection

`src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js`

Allows the two component-content fields in the authorized effective-value ledger.

`src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js`

For each non-PIPE component binding:

```text
COMPONENT_WEIGHT                    -> required dry point mass
COMPONENT_OPERATING_FLUID_WEIGHT    -> optional OPE content
COMPONENT_HYDRO_FLUID_WEIGHT        -> optional HYD content
```

Dry and contained-fluid maps remain separate:

```text
componentWeightsKg
componentOperatingFluidWeightsKg
componentHydroFluidWeightsKg
```

The synthetic selector is execution-local:

```text
EFFECTIVE_COMPONENT:<targetId>
```

Each selected content value produces a semantic receipt containing target, physical entity, load case, rule, selected content mass, selected effective-value semantic hash and composition semantic hash.

Absence remains absence. An explicit governed zero remains an exact selected value and is not converted to missing evidence.

### 4. Exactly-once kernel composition

`src/workspace/engineering-loads/support-load-distribution-v3.js`

PIPE path is unchanged.

For non-PIPE entities:

```text
EMPTY -> dry component mass only
OPE   -> dry + authorized OPE content when exact selector exists
HYD   -> dry + authorized HYD content when exact selector exists
```

The component selector is carried from the dry-mass lookup so content cannot use a different physical selector.

## Authority-bypass defect found and repaired

During source reconciliation, the first implementation of `componentCaseMass()` accepted a content map when its Project Data entry was merely `approved=true` with any non-empty source label. Authorized V2 execution already projected ledger evidence, but a direct kernel caller could construct an approved raw Project Data map and bypass the Issue #1321 unified effective-value authority.

This was treated as a real engineering-authority defect and repaired before closure.

Current kernel acceptance requires all of the following:

1. content entry source is exactly `AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER`;
2. content composition rule is exactly `COMPONENT_CASE_MASS=DRY_POINT_MASS+OPTIONAL_AUTHORIZED_CONTAINED_FLUID`;
3. ledger, authorized-input, effective-projection, baseline and handoff identities are present;
4. exact selector content receipt exists;
5. receipt load case and contained-fluid mass match the executed map value;
6. content semantic and composition hashes are present;
7. dry component-weight entry is also approved and ledger-projected;
8. dry entry carries `ONE_DRY_MASS_POLICY_PER_PHYSICAL_COMPONENT`;
9. dry and content entries have identical ledger/input/projection/baseline/handoff identities;
10. dry receipt and content receipt name the same target and physical entity;
11. dry receipt mass equals the base component mass.

Failure produces fatal `UNAUTHORIZED_COMPONENT_CONTENT_MASS` rather than silently using the value.

## Falsifiers encoded

`scripts/authorized-empirical-component-contained-fluid-check.mjs` defines the following executable falsifiers:

- `100 / 108 / 110 kg` independent case arithmetic;
- missing content remains dry-only;
- explicit zero adds exactly zero while retaining evidence;
- negative content is rejected before gravity execution;
- content cannot mutate `componentWeightsKg`;
- content cannot change PIPE mass;
- content cannot change component application chainage;
- content cannot change normalized support allocation fractions;
- valid cases must close equilibrium;
- an unapproved content entry must fail;
- an approved raw Project Data content entry without ledger evidence must fail with `UNAUTHORIZED_COMPONENT_CONTENT_MASS`;
- a content map whose mass differs from its semantic receipt must fail with `UNAUTHORIZED_COMPONENT_CONTENT_MASS`.

`scripts/non-fea-component-content-default-authority-check.mjs` defines:

- alias-free property custody;
- exact workspace authority path `[PROJECT_CONFIGURED_DEFAULT, PRODUCT_DEFAULT]`;
- lower enrichment rejection of SOURCE_EXPLICIT, SOURCE_INHERITED, EXACT_APPROVED_MASTER and ACCEPTED_OVERRIDE for the new fields;
- Project-configured 8/10 kg publication;
- explicit zero publication;
- versioned Product-default 8/10 kg publication.

Both checks are owned by `scripts/run-non-fea-checks.mjs`.

## Protected invariants

No change is authorized or intended to:

- reinterpret `COMPONENT_WEIGHT` as wet/total mass;
- derive component content from line OD/ID, line fluid density or equivalent length;
- add component content to PIPE entities;
- introduce a universal component-content default;
- change component dry-mass composition policy;
- change component CoG/application-point authority;
- change line fluid/fill mechanics;
- change support eligibility, statics or allocation;
- change force/moment equilibrium logic or tolerances;
- change solver/formulation/recovery;
- change workflows.

## Main synchronization / coordination

Original merge base was #1430 main:

`a8631581eb440fc69e0164f0a397086bf53bbb52`

While #1431 was active, `main` advanced by two unrelated commits to:

`7b2a8119aa5faeee7cc102c894991851019c5a7b`

The intervening main paths were EMP.1/WRC source-governance records and LAFEA.3 Mesh Workspace v3 pre-authority work. No #1431 production path overlapped.

A deterministic two-parent synchronization commit was created:

`808254b88aaba40d946f2482bd2517fb7713408b`

Its tree was based on the exact current-main tree and overlaid only the 15 exact #1431 blobs. Branch ref update was a normal fast-forward, not forced.

Post-sync compare:

```text
main = 7b2a8119aa5faeee7cc102c894991851019c5a7b
status = ahead
behind_by = 0
merge_base = 7b2a8119aa5faeee7cc102c894991851019c5a7b
changed paths = 15 expected paths
```

## Changed-file ledger

Production/contracts:

1. `src/core/shared-piping-model/property-specs.js`
2. `src/core/non-fea-enrichment/index.js`
3. `src/workspace/project-data/non-fea-field-registry.js`
4. `src/workspace/project-data/non-fea-common-enriched-configured-default-overlay.js`
5. `src/workspace/project-data/non-fea-common-enriched-product-default-overlay.js`
6. `src/workspace/project-data/project-data-fields.js`
7. `src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js`
8. `src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js`
9. `src/workspace/engineering-loads/support-load-distribution-v3.js`

Qualification:

10. `scripts/authorized-empirical-component-contained-fluid-check.mjs`
11. `scripts/non-fea-component-content-default-authority-check.mjs`
12. `scripts/run-non-fea-checks.mjs`

Recovery:

13. `agents/PR1431_workreport.md`
14. `agents/claims/PR1431.yaml`
15. `agents/status/PR1431.yaml`

No `.github/workflows/**` path is changed.

## Validation ledger

| Gate | Status | Basis |
|---|---|---|
| live repository grounding | PASS | GitHub source inspection |
| predecessor #1430 merged | PASS | live repository |
| main drift overlap | PASS — none in #1431 production paths | compare inspection |
| current-main branch sync | PASS | post-sync compare, behind 0 |
| 15-path changed ledger | PASS | post-sync compare |
| dry component-mass ownership preserved | PASS | source/diff inspection |
| PIPE fluid path preserved | PASS | source/diff inspection |
| application-point/CoG path preserved | PASS | source/diff inspection |
| support allocation/equilibrium path preserved | PASS | source/diff inspection |
| v1 content authority narrowed to Project/Product defaults | PASS | source inspection |
| direct-kernel raw-approved bypass | PASS — defect proven and repaired | source/control-flow inspection |
| independent 100/108/110 arithmetic | PASS | analytical arithmetic |
| focused component-content Node check | NOT_RUN | faithful checkout unavailable |
| focused default-authority Node check | NOT_RUN | faithful checkout unavailable |
| canonical `run-non-fea-checks.mjs` | NOT_RUN | faithful checkout unavailable |
| imports | NOT_RUN | faithful checkout unavailable |
| build | NOT_RUN | faithful checkout unavailable |
| local clone retry | FAIL_ENVIRONMENT | `Could not resolve host: github.com` |
| exact-head combined status contexts | EMPTY | no commit status contexts |
| hosted run observation | NOT_RUN_PRE_STEP_HOSTED_RUNNER_ALLOCATION | run `32917851396`, job `98025211360`, zero steps |

Hosted observation is from an unrelated EMP.1 workflow automatically attached to validation-basis head `b4793089...`; it is not #1431 qualification. The run concluded failure before any step executed, so it is not evidence of an engineering regression. Other automatically attached runs were also unrelated EMP.1/LFEA workflows. No focused #1431 or canonical Non-FEA command was observed executing.

`NOT_RUN` is not represented as PASS.

## Appendix A — takeover qualification

A1 — Production trace: PASS by current source inspection.

A2 — Failure isolation: PASS. Missing component-contained-fluid case mass was isolated without changing dry or PIPE mass ownership; an additional direct-kernel authority bypass was discovered and repaired.

A3 — Authority/invariant reasoning: PASS. V1 authority is deliberately narrowed, shared properties remain alias-free, and kernel consumption is ledger/receipt cross-bound.

A4 — Independent execution validation: **FAIL / NOT QUALIFIED**. The independent arithmetic and executable falsifiers exist, but the focused scripts and aggregate suite have not executed in a faithful current repository checkout.

A5 — Minimal patch / next-commit reasoning: PASS by source/diff inspection; no further production mechanics should be added absent an evidenced test failure.

```text
APPENDIX_A_QUALIFIED = false
blocking question = A4
score = not claimed while mandatory execution is NOT_RUN
```

## Handover questionnaire

Incoming engineer must be able to answer from live repository evidence:

1. Why is `COMPONENT_WEIGHT` still dry mass and where is the double-count guard enforced?
2. Why are OPE/HYD component content stored in separate maps rather than modifying dry weight?
3. What exact selector binds dry and content mass to one physical component?
4. Why are SOURCE/MASTER/ACCEPTED_OVERRIDE content authorities deliberately not advertised in v1?
5. How do Project and Product defaults reach common-enriched COMPONENT fields?
6. What evidence proves a kernel content map came from the authorized effective-value ledger rather than arbitrary approved Project Data?
7. Which five identity hashes must dry and content receipts share?
8. How does the 100/108/110 benchmark falsify double count or wrong case composition?
9. Why does explicit zero differ semantically from absent content?
10. Which exact commands remain NOT_RUN and why?

## Required next execution

From a faithful checkout of the reconciled branch:

```bash
node scripts/non-fea-component-content-default-authority-check.mjs
node scripts/authorized-empirical-component-contained-fluid-check.mjs
node scripts/run-non-fea-checks.mjs
npm run check:imports
npm run build
git diff --check
```

If a check fails, isolate the failure before modifying production. Do not weaken ledger/receipt authority merely to satisfy a fixture.

## Merge disposition

```text
PR STATE: DRAFT
MERGE AUTHORITY: OWNER_ONLY
CURRENT OWNER MERGE AUTHORITY: NOT_GRANTED
REQUIRED EXECUTION VALIDATION: NOT_RUN
DISPOSITION: DO NOT MERGE
```

## EXACT_NEXT_ACTION

Run the two focused component-content checks, canonical Non-FEA aggregate, imports/build and diff check in a faithful current checkout. Repair only evidenced failures. If execution remains unavailable, keep #1431 draft and validation-blocked; do not infer PASS and do not merge.
