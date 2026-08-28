# PR #1514 Work Report — Load Calc effective Common Input projection authority

## Current state

```text
PR                         #1514
branch                     agent/issue-1321-effective-projection-authority
initial exact base         1377eddabc8f23e2ea6489ee8aca4cc5b26671b9
source-complete material   c35c4a40e863470d02fcdc6839c7b076ece9ea8a
state                      SOURCE_COMPLETE_EXECUTION_NOT_RUN
merge authority            OWNER_ONLY_NOT_GRANTED
```

Issue: #1321 — zero-blocker configurable-default architecture with unified effective-value resolution.

Relay chain: `LOAD-CALC-1321-EFFECTIVE-PROJECTION-AUTHORITY`.

Engineering delivery policy: Common `engineering-pr-delivery-v2`, inherited pinned basis `10d667ce715bb52e1f73035c6fa326db77d0f9dd`.

## Engineering problem

The repository already had the governing Issue #1321 effective precedence in:

`src/workspace/project-data/non-fea-effective-value-resolver.js`

```text
ACCEPTED_OVERRIDE
> SOURCE_EXPLICIT
> SOURCE_INHERITED
> EXACT_APPROVED_MASTER
> CONFIGURED_DERIVATION
> PROJECT_POLICY
> PROJECT_CONFIGURED_DEFAULT
> PRODUCT_DEFAULT
```

However ordinary Common Input built and sealed the enriched shared model directly from the legacy CORE selected winner:

```text
resolveNonFeaEnrichment()
  -> legacy CORE source-first selected row
createNonFeaEnrichedProjection()
  -> existing source property cannot be replaced by non-source candidate
seal Common Input enrichedModel
  -> empirical mass projection / Run consumes that model
```

The existing focused effective-resolver regression already documents the intentional divergence: a reviewed `ACCEPTED_OVERRIDE` can supersede `SOURCE_EXPLICIT` in the #1321 effective resolver even though legacy CORE still selects the source candidate.

Therefore the defect was a **projection/consumption bypass**, not the absence of a precedence table.

## Implemented design

### 1. Effective projection bridge

New:

`src/workspace/project-data/non-fea-effective-common-input-projection.js`

Responsibilities:

- accepts only a valid, READY CORE candidate-resolution ledger bound to the exact source model;
- calls existing `resolveCoreNonFeaEffectiveValues()`; it defines no authority precedence itself;
- requires every effective winner to map back to one exact CORE candidate by semantic hash;
- emits a downstream CORE-shaped resolution ledger whose `selected` candidate is the effective winner;
- binds the effective resolver/row/candidate hashes into `effectiveSelection` on each row;
- projects selected non-source winners into the shared model, including replacing an existing source property when and only when the effective resolver selected that candidate;
- preserves source immutability and governed topology/geometry/support membership;
- returns the effective-value ledger, downstream resolution ledger and enriched projection as one frozen authority bundle.

### 2. Ordinary Common Input cutover

Modified:

`src/workspace/non-fea-common-input-runtime.js`

Current path:

```text
enrichmentSidecar
  -> resolveNonFeaEnrichment()
  -> candidateResolutionLedger
  -> createNonFeaEffectiveCommonInputProjection()
       -> existing #1321 effective resolver
       -> effectiveValueResolutionLedger
       -> effective-selected resolutionLedger
       -> effective-selected enrichedProjection
  -> configured-default usage from effective-selected resolutionLedger
  -> Common checker / seal / downstream Run
```

CORE still owns target matching, candidate formation, same-authority conflicts and legacy migration blockers.

### 3. Product-default identity transport correction

Modified:

`src/workspace/project-data/non-fea-effective-value-resolver.js`

Static integration audit found the CORE adapter preserved original Product-default evidence only under `coreEvidence`, while `PRODUCT_DEFAULT` candidate validation requires these fields at the candidate evidence top level:

```text
defaultId
defaultSemanticHash
productDefaultProfileSemanticHash
```

The adapter now copies exactly those three identities to the top-level effective candidate evidence while retaining the complete original evidence under `coreEvidence`.

No precedence ranking changed.

### 4. Focused falsifier

New:

`scripts/non-fea-effective-common-input-projection-check.mjs`

Uses the existing real straight-pipe shared-model fixture. Intended executable assertions:

1. legacy CORE source-first winner remains `SOURCE_EXPLICIT:10 kg/m` when `ACCEPTED_OVERRIDE:99 kg/m` is present;
2. effective bridge selects `ACCEPTED_OVERRIDE:99 kg/m`;
3. enriched Common Input model contains 99 kg/m and `sourceKind=ACCEPTED_OVERRIDE`;
4. `EXACT_APPROVED_MASTER`, `PROJECT_CONFIGURED_DEFAULT`, and `PRODUCT_DEFAULT` cannot displace explicit source;
5. Product-default semantic identity survives CORE adaptation;
6. source model remains immutable;
7. topology semantic hash is unchanged;
8. same-authority conflicts remain fail-closed;
9. legacy precedence migration blockers remain fail-closed.

Registered in `scripts/run-non-fea-checks.mjs`.

## Authority boundary

This PR does not:

- add or reorder an authority precedence table;
- change support-load force, lever, reaction or equilibrium equations;
- change mass-composition formulas or component mass resolution;
- change empirical V2/V3 statics;
- change gravity/source-axis conventions;
- change any solver, residual, reaction or contact algorithm;
- touch benchmark/oracle/tolerance authority;
- touch EMP.1/WRC/LAFEA authority;
- change workflow, release, trust or publication authority;
- authorize execution or publication by itself.

## Source-inspection validation

```text
live main grounding                         PASS_SOURCE_INSPECTION
main at source-complete audit               1377eddabc8f23e2ea6489ee8aca4cc5b26671b9
branch behind main                           0
technical authority design                  PASS_SOURCE_INSPECTION
single effective precedence owner retained  PASS_SOURCE_INSPECTION
Product-default identity transport          PASS_SOURCE_INSPECTION
protected numerical paths untouched         PASS_SOURCE_INSPECTION
```

## Executable validation truth

Faithful repository access was retried after the technical cut:

```text
git ls-remote https://github.com/reallaksh19/Advanced_Analysis.git refs/heads/agent/issue-1321-effective-projection-authority
fatal: unable to access 'https://github.com/reallaksh19/Advanced_Analysis.git/': Could not resolve host: github.com
```

Therefore:

```text
focused effective projection check                  NOT_RUN
existing effective resolver check                   NOT_RUN
Product engineering-default runtime resolution      NOT_RUN
Common checker/seal                                  NOT_RUN
current empirical mass projection                    NOT_RUN
aggregate run-non-fea-checks                         NOT_RUN
check:imports                                        NOT_RUN
advanced-shell contract                              NOT_RUN
build                                                NOT_RUN
git diff --check                                     NOT_RUN
```

This is infrastructure `NOT_RUN`, not application PASS/FAIL.

## Required execution order

```bash
node scripts/non-fea-effective-common-input-projection-check.mjs
node scripts/non-fea-effective-value-resolver-check.mjs
node scripts/non-fea-product-engineering-default-runtime-resolution-check.mjs
node scripts/non-fea-common-checker-check.mjs
node scripts/current-common-input-empirical-mass-projection-check.mjs
node scripts/run-non-fea-checks.mjs
npm run check:imports
node scripts/advanced-shell-contract-check.mjs
npm run build
git diff --check
```

First real failure controls RCA. Do not widen scope or alter precedence/tolerances to make the suite pass.

## Changed-file ledger at source-complete material head

Technical + relay delta observed from exact base:

1. `agents/agentchain.md`
2. `agents/agentchain/LOAD-CALC-1321-COMPONENT-COG-FALLBACK/EP-LC1321-COG-0007.md`
3. `agents/agentchain/LOAD-CALC-1321-EFFECTIVE-PROJECTION-AUTHORITY/EP-LC1321-EFF-0001.md`
4. `scripts/non-fea-effective-common-input-projection-check.mjs`
5. `scripts/run-non-fea-checks.mjs`
6. `src/workspace/non-fea-common-input-runtime.js`
7. `src/workspace/project-data/non-fea-effective-common-input-projection.js`
8. `src/workspace/project-data/non-fea-effective-value-resolver.js`

Recovery files/endpoints added after PR creation are governance-only and must be included in final PR reconciliation.

## Input / benchmark / common references

### Inputs

- GitHub Issue #1321.
- merged predecessor PR #1508 / main `1377eddabc8f23e2ea6489ee8aca4cc5b26671b9`.
- `src/core/non-fea-enrichment/index.js` — CORE candidate authority/custody.
- `src/workspace/non-fea-common-input-runtime.js` — ordinary Common Input composition seam.
- `src/core/non-fea-common-checker/index.js` — checker/seal consumption boundary.
- `src/workspace/project-data/non-fea-effective-value-resolver.js` — governing #1321 effective precedence.
- `src/workspace/engineering-loads/current-common-input-empirical-mass-projection.js` — downstream sealed-model consumer.

### Benchmark / qualification fixtures

- `scripts/w10.5-screening-fixtures.mjs` — existing straight-pipe shared-model fixture used by the new discriminator.
- `scripts/non-fea-effective-value-resolver-check.mjs` — existing accepted-override/source precedence discriminator.
- No benchmark expected values or engineering tolerances are changed by this PR.

### Common / process

- `reallaksh19/Common` engineering-pr-delivery-v2, inherited pinned basis `10d667ce715bb52e1f73035c6fa326db77d0f9dd`.
- `agents/agentchain.md` repository-wide v2 relay index.

## Merge disposition

```text
DRAFT
SOURCE_COMPLETE
EXECUTION_NOT_RUN
OWNER_MERGE_AUTHORITY_NOT_GRANTED
```

Do not merge until explicitly authorized by the owner and after a fresh live-main/head/diff/reviews/threads gate. If executable infrastructure remains unavailable at owner-authorized merge time, preserve `NOT_RUN` exactly; do not convert source inspection to PASS.

## Appendix A — next-agent takeover qualification

Incoming agent must answer all five before mutating this PR.

### Q1 — Authority ownership
Which module is the sole governing #1321 effective precedence owner, and why would reordering `NON_FEA_ENRICHMENT_AUTHORITIES` in CORE be the wrong repair for this PR?

### Q2 — Exact bypass
Trace the current post-PR path from `resolveNonFeaEnrichment()` through the effective projection bridge to the `enrichedModel` eventually consumed by current empirical mass projection. Identify which object is candidate custody versus effective winner custody.

### Q3 — Override safety
Why may an `ACCEPTED_OVERRIDE` replace an existing source property in the effective projection while an `EXACT_APPROVED_MASTER`, `PROJECT_CONFIGURED_DEFAULT` or `PRODUCT_DEFAULT` normally may not? Name the mechanism that enforces this without a second precedence table in the bridge.

### Q4 — Product-default transport
Which three Product-default evidence identities must survive CORE→effective adaptation, and what exact validation would fail if they remained nested only inside `coreEvidence`?

### Q5 — First execution falsifier
What is the first command to run on a faithful checkout, what exact source/override discriminator should it prove, and which protected domains must remain untouched if it fails?

Target: all five answered materially and from live repository source before write authority is assumed.

## Exact next action

1. Obtain a faithful checkout of the exact current PR head.
2. Run `node scripts/non-fea-effective-common-input-projection-check.mjs` first.
3. Stop on its first real failure and repair only the responsible authority/projection seam.
4. If it passes, run the listed regression/aggregate/import/build sequence.
5. Re-ground to live `main`, exact PR head/diff, reviews and review threads.
6. Await explicit owner merge authorization.
