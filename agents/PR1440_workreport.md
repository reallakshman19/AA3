# PR1440 — Load Calc governed gravity-method request authority

## Current recovery state
- repository: `reallaksh19/Advanced_Analysis`
- issue: #1321
- PR: #1440 (draft)
- branch: `agent/issue-1321-gravity-method-request-authority`
- stacked base PR: #1431
- stacked base branch: `agent/issue-1321-component-contained-fluid`
- stacked base / merge base: `306f6d764cb0780e360d5b9bc8b08183c94b98fd`
- live `main` last checked: `29c688db4a021db900d1f8c67f56f777f73f4ddc`
- criticality: ENGINEERING_CRITICAL
- execution mode: AUTO
- merge authority: OWNER_ONLY / NOT_GRANTED
- workflow policy: owner instructed workflow gating be skipped as a continuation blocker; unexecuted checks remain NOT_RUN
- state: SOURCE_COMPLETE / EXECUTION_VALIDATION_NOT_RUN

## Mission
Add a governed `loadCalculation.gravityMethod` request, Product-default it to `AUTO`, retain effective authority/default provenance, and bridge it into the existing conservative `empirical-gravity-method-selection/v1` mechanics without changing selector fallback policy or execution authorization.

## Coordination / stack resolution
Initial implementation exposed an exact-path conflict with open PR #1431:

```text
src/workspace/project-data/project-data-fields.js
scripts/run-non-fea-checks.mjs
```

Sequential last-writer behavior was rejected. PR #1440 was converted into a two-parent stacked successor on exact #1431 head `306f6d76...` and retargeted to #1431's branch. The resulting shared files retain #1431's component-content additions and add only the gravity-method field / qualification entry.

Current stacked compare:

```text
base       = 306f6d764cb0780e360d5b9bc8b08183c94b98fd
merge base = 306f6d764cb0780e360d5b9bc8b08183c94b98fd
status     = ahead
behind     = 0
changed    = exactly 10 successor paths
```

No #1431 production path is reverted.

## Production trace
```text
raw Project Data
-> upgradeProjectDataProfile()
-> loadCalculation.gravityMethod Phase-2 evidence slot
-> createNonFeaProductDefaultProvider()
-> PD-GRAVITY-METHOD = AUTO only when slot is empty
-> effective Project Data profile + Product-default provenance
-> createNonFeaGravityMethodAuthority(effectiveProfile)
-> hash-bound AUTO / V2 / V3 request authority
-> component CoG authority audit for same effective profile
-> createGovernedEmpiricalGravityMethodSelection()
-> existing createEmpiricalGravityMethodSelection()
-> selected V3 / safe V2 fallback / exception-policy-required
```

This slice stops before runtime-package sealing and before calculation authorization.

## Implemented engineering scope

### Project Data / Product default
- registered Phase-2 `loadCalculation.gravityMethod`;
- did **not** add it to legacy `loads` / `authorizedGravityLoads` required lists, avoiding a new raw-profile routine blocker;
- bumped `LOAD_CALC_STANDARD_DEFAULTS_V1` from version 4 to 5;
- added versioned `PD-GRAVITY-METHOD = AUTO` with method-request basis and normal Product-default hash provenance;
- explicit project value shadows Product AUTO; invalid explicit value is not silently repaired.

### Gravity-method authority
New `non-fea-gravity-method-authority/v1` accepts only:

```text
AUTO
CHAINAGE_TRIBUTARY_SPAN_V2
CHAINAGE_TRIBUTARY_SPAN_V3_COG
```

READY custody retains:
- request method;
- effective authority and source;
- basis/default ID/default hash;
- Product profile ID/version/hash when applicable;
- exact effective Project Data semantic hash.

Product evidence claiming `PRODUCT_DEFAULT` is fail-closed unless it binds exact `PD-GRAVITY-METHOD` plus basis/default/profile provenance.

### Governed selector bridge
The existing `empirical-gravity-method-selection/v1` result and fallback rules remain unchanged. A new wrapper:

`empirical-governed-gravity-method-selection/v1`

retains the method-authority receipt, the existing selection result, and the component-audit Project Data hash. Creation and rehydration reject profile mismatches.

Existing policy remains:
- complete qualified CoG -> V3;
- missing CoG only -> deterministic V2 fallback;
- known off-route / ambiguous / invalid CoG or explicit moment -> no unsafe V2 fallback;
- selection is not execution authorization.

## Independent falsifiers encoded
The focused regression pins:
1. raw empty profile remains method-authority BLOCKED;
2. Product-composed profile gives READY `AUTO` with `PD-GRAVITY-METHOD` provenance;
3. explicit project V2/V3 shadows Product AUTO;
4. explicit `BOGUS` remains BLOCKED with Product default shadowed;
5. malformed Product evidence blocks;
6. governed AUTO + complete CoG selects V3;
7. governed AUTO + missing CoG falls to V2 only;
8. known off-route evidence produces no selected method;
9. authority/audit effective-profile mismatch blocks;
10. a rehydrated governed wrapper with changed audit-profile binding blocks.

## Qualification ownership
Changed qualification paths:
- `scripts/non-fea-gravity-method-authority-check.mjs`
- `scripts/non-fea-product-default-profile-check.mjs`
- `scripts/run-non-fea-checks.mjs`

The Product-default check now pins profile version 5, AUTO evidence, hash binding, and legacy Phase-2 upgrade. The canonical Non-FEA aggregate includes the governed gravity-method authority check while preserving #1431's contained-fluid checks.

## Protected invariants / non-scope
No change to:
- `authorized-empirical-runtime-package-v2.js`;
- `configured-empirical-method-controller-v2.js`;
- `empirical-load-calc-scenario-store.js`;
- `support-load-distribution-v3.js` mechanics;
- AUTO fallback policy;
- support statics / equilibrium / tolerances;
- solver or benchmark values;
- scenario or calculation authorization semantics;
- `.github/workflows/**`.

## Validation ledger
| Check | Status | Basis |
|---|---|---|
| live main grounding | PASS | `29c688db...` still current |
| initial exact-path overlap | FAIL / RESOLVED | #1431 owned two shared files |
| two-parent stack preservation | PASS | stacked compare against exact #1431 head |
| exact stacked diff | PASS | 10 paths, behind 0 |
| Product AUTO authority | PASS_SOURCE_INSPECTION | field/default/provenance trace |
| governed selector profile binding | PASS_SOURCE_INSPECTION | creation + rehydration guards |
| AUTO fallback policy unchanged | PASS_SOURCE_INSPECTION | existing policy body retained |
| protected execution paths | PASS_SOURCE_INSPECTION | absent from diff |
| Product profile version-consumer scan | PASS_SOURCE_INSPECTION | no additional Load Calc profile-version literal requiring update found |
| local clone | FAIL_ENVIRONMENT | `Could not resolve host: github.com` |
| focused gravity authority check | NOT_RUN | faithful checkout unavailable |
| Product-default profile check | NOT_RUN | faithful checkout unavailable |
| existing gravity selector check | NOT_RUN | faithful checkout unavailable |
| canonical Non-FEA suite | NOT_RUN | faithful checkout unavailable |

No `NOT_RUN` is represented as PASS.

## Appendix A
- A1 production trace: 20/20
- A2 failure isolation / overlap resolution: 20/20
- A3 authority/invariant protection: 20/20
- A4 independent execution validation: **FAIL / NOT_RUN**
- A5 minimality/falsifier quality: 20/20

`APPENDIX_A_QUALIFIED = false` because A4 execution evidence is unavailable.

## Changed-file ledger — stacked successor only
1. `agents/PR1440_workreport.md`
2. `agents/claims/PR1440.yaml`
3. `agents/status/PR1440.yaml`
4. `scripts/non-fea-gravity-method-authority-check.mjs`
5. `scripts/non-fea-product-default-profile-check.mjs`
6. `scripts/run-non-fea-checks.mjs`
7. `src/workspace/engineering-loads/empirical-gravity-method-selection.js`
8. `src/workspace/project-data/non-fea-gravity-method-authority.js`
9. `src/workspace/project-data/non-fea-product-default-profile.js`
10. `src/workspace/project-data/project-data-fields.js`

## Appendix B — next-agent expert questionnaire
1. Can you prove the runtime package consumes the selected exact V2/V3 method rather than the raw AUTO request?
2. Where is the selected-method receipt bound into stale/current authorization identity?
3. Can a later profile/default change alter AUTO selection without invalidating authorization? Show the semantic-hash chain.
4. How do you prevent AUTO from becoming a catch-and-retry fallback after a numerical method fails?
5. Which module should own conversion from governed selection to exact method-bound runtime package, and why must the numerical selector itself remain unchanged?

## Exact next action
A successor slice may consume the governed selection and seal the exact selected V2/V3 method into the existing V2 runtime-package/controller path while preserving explicit current authorization. Re-ground #1431/#1440 first. If #1431 moves or merges, this stacked branch must be re-grounded before further promotion.
