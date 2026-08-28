# PR #1514 Work Report — Load Calc effective Common Input projection authority

## Current state

```text
PR                         #1514
branch                     agent/issue-1321-effective-projection-authority
initial exact base         1377eddabc8f23e2ea6489ee8aca4cc5b26671b9
current main               1bbfc695842a1de2eca14a51c8887f18a33e6da2
pre-reconciliation head    50ef5a6416fda670d2bb6b5b88a89fbefd043da5
source-complete material   c35c4a40e863470d02fcdc6839c7b076ece9ea8a
state                      READY_TO_MERGE_OWNER_AUTHORIZED_EXECUTION_NOT_RUN
merge authority            OWNER_GRANTED_PR1514_2026-08-28T16:26:03Z
```

Issue: #1321 — zero-blocker configurable-default architecture with unified effective-value resolution.

Relay chain: `LOAD-CALC-1321-EFFECTIVE-PROJECTION-AUTHORITY`.

Engineering delivery policy: Common `engineering-pr-delivery-v2`, pinned basis `10d667ce715bb52e1f73035c6fa326db77d0f9dd`.

## Engineering problem

The repository already has the governing #1321 effective precedence in:

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

Ordinary Common Input previously built its enriched shared model from the legacy CORE selected winner. CORE intentionally retains historical source-first ordering, so a reviewed accepted override could be present in candidate custody while the sealed model still consumed explicit source.

The defect is a projection/consumption bypass, not a missing precedence table.

## Implemented design

### Effective projection bridge

`src/workspace/project-data/non-fea-effective-common-input-projection.js`

- accepts a valid READY CORE candidate-resolution ledger bound to the source model;
- calls existing `resolveCoreNonFeaEffectiveValues()`;
- defines no second precedence table;
- maps each effective winner back to one exact CORE candidate by semantic hash;
- binds the effective resolver receipt into downstream resolution custody;
- projects the effective-selected winner into the Common Input shared model;
- permits a reviewed `ACCEPTED_OVERRIDE` to replace an existing source property only when the existing effective resolver selected it;
- preserves source immutability and topology/geometry/support membership.

### Common Input cutover

`src/workspace/non-fea-common-input-runtime.js`

Production path:

```text
resolveNonFeaEnrichment()
  -> CORE candidateResolutionLedger
  -> createNonFeaEffectiveCommonInputProjection()
       -> resolveCoreNonFeaEffectiveValues()
       -> effective winner custody
       -> effective-selected resolutionLedger
       -> effective-selected enrichedProjection
  -> Common checker / seal
  -> downstream Run / empirical mass projection
```

CORE continues to own exact target matching, candidate formation, same-authority conflicts and legacy migration blockers.

### Product-default identity transport

`src/workspace/project-data/non-fea-effective-value-resolver.js`

The CORE-to-effective adapter preserves these Product-default identities at the effective candidate evidence top level while retaining full original evidence under `coreEvidence`:

```text
defaultId
defaultSemanticHash
productDefaultProfileSemanticHash
```

No precedence ranking changed.

## Focused falsifier

`scripts/non-fea-effective-common-input-projection-check.mjs`

Required discriminator:

1. legacy CORE selects `SOURCE_EXPLICIT:10 kg/m` when reviewed `ACCEPTED_OVERRIDE:99 kg/m` is present;
2. effective bridge selects `ACCEPTED_OVERRIDE:99 kg/m`;
3. projected Common Input model contains `99 kg/m` with `sourceKind=ACCEPTED_OVERRIDE`;
4. lower `EXACT_APPROVED_MASTER`, `PROJECT_CONFIGURED_DEFAULT`, and `PRODUCT_DEFAULT` candidates do not displace explicit source;
5. Product-default semantic identities survive CORE adaptation;
6. source model remains immutable;
7. topology semantic hash remains unchanged;
8. same-authority conflicts fail closed;
9. legacy migration precedence blockers remain fail closed.

The check is registered in `scripts/run-non-fea-checks.mjs`.

## Current-main reconciliation for owner-authorized merge

Owner instruction at `2026-08-28T16:26:03Z`: `proceed next, fix and merge`.

Fresh live gate before reconciliation:

```text
live main                  1bbfc695842a1de2eca14a51c8887f18a33e6da2
PR head                    50ef5a6416fda670d2bb6b5b88a89fbefd043da5
PR state                   open / draft / unmerged
GitHub mergeable           false before reconciliation
submitted reviews          0
review threads             0
requested reviewers        none
```

Main advanced four commits from the original base. Comparing the complete current-main drift against all 12 #1514 paths found only one overlapping path:

`agents/agentchain.md`

No intervening main commit modified the substantive #1514 production/test files.

Reconciliation policy:

- build from exact current-main tree;
- preserve current EMP.1 and B02D rows/endpoints exactly;
- preserve #1514 technical blobs byte-for-byte;
- retain `EP-LC1321-COG-0007` post-#1508 execution custody;
- retain EFF endpoints 0001/0002;
- add immutable `EP-LC1321-EFF-0003` documenting current-main reconciliation and owner merge authority;
- update this workreport plus `agents/claims/PR1514.yaml` and `agents/status/PR1514.yaml`;
- do not modify any benchmark/oracle/tolerance/workflow/release/trust authority.

## Authority boundary

This PR does not:

- add or reorder an authority precedence table;
- change support-load force, lever, reaction or equilibrium equations;
- change mass-composition formulas or component mass resolution;
- change empirical V2/V3 statics;
- change gravity/source-axis conventions;
- change any solver, residual, reaction or contact algorithm;
- touch benchmark/oracle/tolerance authority;
- touch EMP.1/WRC/LAFEA engineering authority;
- change workflow, release, trust or publication authority;
- authorize execution or publication by itself.

## Executable validation truth

Faithful repository checkout remains unavailable in this agent environment. Previous direct repository access failed with:

```text
git ls-remote https://github.com/reallaksh19/Advanced_Analysis.git refs/heads/agent/issue-1321-effective-projection-authority
fatal: unable to access 'https://github.com/reallaksh19/Advanced_Analysis.git/': Could not resolve host: github.com
```

Repository Actions continue to show pre-step allocation failures on current workstreams, so no known recovery signal justifies reclassifying #1514 validation.

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

## Required execution order after merge when faithful execution exists

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

## Changed-file ledger for the reconciled merge candidate

1. `agents/PR1514_workreport.md`
2. `agents/agentchain.md`
3. `agents/agentchain/LOAD-CALC-1321-COMPONENT-COG-FALLBACK/EP-LC1321-COG-0007.md`
4. `agents/agentchain/LOAD-CALC-1321-EFFECTIVE-PROJECTION-AUTHORITY/EP-LC1321-EFF-0001.md`
5. `agents/agentchain/LOAD-CALC-1321-EFFECTIVE-PROJECTION-AUTHORITY/EP-LC1321-EFF-0002.md`
6. `agents/agentchain/LOAD-CALC-1321-EFFECTIVE-PROJECTION-AUTHORITY/EP-LC1321-EFF-0003.md`
7. `agents/claims/PR1514.yaml`
8. `agents/status/PR1514.yaml`
9. `scripts/non-fea-effective-common-input-projection-check.mjs`
10. `scripts/run-non-fea-checks.mjs`
11. `src/workspace/non-fea-common-input-runtime.js`
12. `src/workspace/project-data/non-fea-effective-common-input-projection.js`
13. `src/workspace/project-data/non-fea-effective-value-resolver.js`

## Inputs

- Issue #1321.
- merged predecessor PR #1508 / `1377eddabc8f23e2ea6489ee8aca4cc5b26671b9`.
- current main `1bbfc695842a1de2eca14a51c8887f18a33e6da2`.
- `src/core/non-fea-enrichment/index.js` — CORE candidate authority/custody.
- `src/workspace/non-fea-common-input-runtime.js` — ordinary Common Input composition seam.
- `src/core/non-fea-common-checker/index.js` — checker/seal consumption boundary.
- `src/workspace/project-data/non-fea-effective-value-resolver.js` — governing #1321 effective precedence.
- `src/workspace/engineering-loads/current-common-input-empirical-mass-projection.js` — downstream sealed-model consumer.

## Benchmarks / qualification fixtures

- `scripts/w10.5-screening-fixtures.mjs` — straight-pipe shared-model fixture used by the new discriminator.
- `scripts/non-fea-effective-value-resolver-check.mjs` — accepted-override/source precedence discriminator.
- No benchmark expected values or engineering tolerances are changed.

## Common / governing documents

- `Advanced_Analysis/AGENTS.md` on current main.
- Common `engineering-pr-delivery-v2` pinned at `10d667ce715bb52e1f73035c6fa326db77d0f9dd` and same-commit references.
- `agents/agentchain.md`.

## Merge disposition

```text
READY_TO_MERGE_OWNER_AUTHORIZED
SOURCE_COMPLETE
EXECUTION_NOT_RUN
```

Owner authorization applies to PR #1514 only and is consumed by this merge. It does not authorize any successor PR.

## Appendix A — next-agent takeover qualification

### Q1 — Authority ownership
Which module is the sole governing #1321 effective precedence owner, and why would reordering CORE candidate precedence be the wrong repair?

### Q2 — Production trace
Trace `resolveNonFeaEnrichment()` through the effective projection bridge to the sealed `enrichedModel` consumed by current empirical mass projection. Identify candidate custody versus effective winner custody.

### Q3 — Override safety
Why may an `ACCEPTED_OVERRIDE` replace an existing source property while `EXACT_APPROVED_MASTER`, `PROJECT_CONFIGURED_DEFAULT` and `PRODUCT_DEFAULT` normally may not? Name the existing mechanism enforcing this without a second precedence table.

### Q4 — Product-default transport
Which three Product-default evidence identities must survive CORE-to-effective adaptation, and what semantic validation do they protect?

### Q5 — First execution falsifier
What is the first command to run on a faithful checkout, what exact 10-vs-99 kg/m discriminator must it prove, and which protected domains remain untouched if it fails?

Target: all five materially answered from live repository source before future engineering mutation.

## Exact next action

Re-read live main and exact reconciled PR head. If `behind=0`, the effective diff is exactly the bounded 13-file ledger above, reviews/threads remain clear, and GitHub reports mergeable, mark PR #1514 ready and squash-merge the exact expected head. Preserve executable validation as `NOT_RUN`.
