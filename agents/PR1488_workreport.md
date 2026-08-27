# PR1488 Work Report — Issue #1321 Calculation Defaults Scoped UX

## Recovery header
- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1488 — `Load Calc: add scoped Calculation Defaults authoring`
- Branch: `agent/issue-1321-calculation-defaults-scoped-ux`
- Stacked base / merge base: PR #1487 head `49fdf224390cfa4993781e8e24776f4e8aaf55f3`
- Production main observed: `d6101bcac7ccbdab9e42d7e0afbdd7b06d897462`
- Stacked behind-base count: 0
- Criticality: ENGINEERING_CRITICAL
- Execution mode: AUTO
- Merge authority: OWNER_ONLY_NOT_GRANTED_FOR_NEW_SUCCESSOR
- State: SOURCE_COMPLETE_AWAITING_OWNER

## Mission
Close Issue #1321 PR-D2 by replacing raw-JSON-only configured-default authoring with an engineer-facing scoped editor inside the D1 Calculation Defaults Advanced surface.

## Existing authority path retained unchanged
```text
qualificationPolicy.configuredDefaults
  value.schema = non-fea-configured-default-policy/v1
  value.defaults[]
    defaultId / fieldId / value / unit / basis / allowedMethods[] / scope?
→ validateConfiguredDefaultsPolicy()
→ createNonFeaConfiguredDefaultProvider()
→ exact target matching + ISSUE_1321_SCOPE_PRECEDENCE_V1
→ PROJECT_CONFIGURED_DEFAULT candidates
→ common field-resolution ledger
```

D2 creates no second policy, resolver, precedence rule, fuzzy selector, or engineering evidence source.

## Canonical precedence
The existing provider remains authoritative:

`ENTITY > POS > LINE > BRANCH > PIPING_CLASS_NB > COMPONENT_TYPE_NB > PIPING_CLASS > COMPONENT_TYPE > SUPPORT_KIND > NOMINAL_BORE > SYSTEM > ZONE > GLOBAL`

Equal effective-priority rows with unequal values remain fail-closed as `CONFIGURED_DEFAULT_SCOPE_CONFLICT`; identical equal-priority rows canonicalize by the existing provider rule.

## D2 authoring boundary
The structured editor offers only fields that satisfy all three conditions:
1. field registry marks the field default-eligible;
2. authority path permits `PROJECT_CONFIGURED_DEFAULT`;
3. the existing configured-default provider can materialize the field to a runtime target.

Current authorable set is 17 numeric component-target fields:
- pipe OD / wall;
- material density / unit pipe weight;
- operating and hydro fluid density / weight;
- insulation thickness / density / weight;
- component dry / operating-fluid / hydro-fluid mass;
- elastic modulus;
- cladding and tracing mass per length.

Project-level defaults such as corrosion allowance or thermal expansion remain D1/path-level authority unless/until the configured-default provider has a real target-level materialization path.

## Provider-native units
The provider does not convert units when constructing enrichment records. D2 therefore fixes the editor to current runtime-property units, including OD/wall in `mm`, elastic modulus in `MPa`, densities in `kg/m³`, distributed mass in `kg/m`, and component mass in `kg`.

Rows using unexpected units are displayed but protected and must be handled in Advanced authority; D2 does not silently reinterpret them.

## Canonical scope authoring
The underlying precedence catalog contains global, entity, POS, line, branch, piping-class+NB, component-type+NB, piping class, component type, support kind, nominal bore, system and zone scopes.

The form exposes only scope kinds that can match at least one currently authorable target. It generates deterministic sorted exact-ID arrays and positive finite NB arrays. Custom multi-key policies remain preserved/read-only in D2 and editable through the existing raw Advanced authority editor.

### Current support-kind capability gap
`SUPPORT_KIND` exists in the generic provider precedence, but the current support-target enrichment fields (`SUPPORT_VERTICAL_STATE`, `RESTRAINT_TYPE`) do not permit `PROJECT_CONFIGURED_DEFAULT`. Therefore there is no support-target configured-default field D2 can truthfully author today.

D2 records `SUPPORT_KIND` as unavailable and excludes it from the structured scope dropdown. A later backend-authority slice is required if Issue #1321 is to support support-kind defaults; the UX must not fabricate that authority.

## Structured editor behavior
- create/update by deterministic `defaultId`;
- fixed provider-native unit;
- engineering basis required;
- allowed methods constrained to the selected field's existing method inventory; blank selection means all applicable methods;
- exact canonical scope construction;
- full policy revalidated through existing `validateConfiguredDefaultsPolicy()` before write;
- policy write remains `qualificationPolicy.configuredDefaults` with `PROJECT_POLICY` evidence;
- evidence records previous policy hash/source and new policy hash;
- canonical rows can be edited/deleted;
- invalid/custom/non-materialized/wrong-unit/target-incompatible rows are protected.

## Provider-backed falsifier definition
`scripts/non-fea-calculation-defaults-scoped-ux-check.mjs` pins:
- 17 current authorable fields and provider-native units;
- non-materialized registry fields excluded;
- canonical scope normalization;
- support-kind unavailable for current authorable target set;
- global E default materializes to current provider records;
- line scope beats system scope using the unchanged provider;
- equal-priority unequal values fail closed;
- unmatched POS fails closed;
- unsupported field/scope/method/value fails before Project Data write;
- explicit zero component mass remains authorable and downstream enrichment accepts finite zero;
- custom scopes, unsupported fields and unexpected units remain protected;
- delete preserves unrelated defaults and prior policy-hash custody;
- raw Advanced authority editor remains reachable.

## Exact final changed-file ledger — 6 files
1. `agents/PR1488_workreport.md`
2. `agents/claims/PR1488.yaml`
3. `agents/status/PR1488.yaml`
4. `scripts/non-fea-calculation-defaults-scoped-ux-check.mjs`
5. `src/workspace/project-data/non-fea-scoped-calculation-defaults-model.js`
6. `src/workspace/project-data/non-fea-calculation-defaults-view.js`

Temporary WIP claim is absent. Aggregate registration remains deferred while #1486/#1487 own overlapping aggregate/UX stack state.

## Protected production paths unchanged
- `src/workspace/project-data/non-fea-configured-default-provider.js`
- `src/workspace/project-data/non-fea-field-registry.js`
- `src/workspace/project-data/non-fea-product-default-profile.js`
- `src/workspace/non-fea-common-input-runtime.js`
- `src/core/non-fea-common-checker/**`
- `src/workspace/engineering-loads/**`
- `scripts/run-non-fea-checks.mjs`
- `.github/workflows/**`

## Final reconciliation
- compare base: `agent/issue-1321-calculation-defaults-basic-ux@49fdf224390cfa4993781e8e24776f4e8aaf55f3`
- merge base: exact same SHA
- behind base: 0
- net files: exactly 6 listed above
- WIP marker: absent
- review submissions: 0
- review threads: 0

## Validation truth
Source/repository validation:
- live main read: PASS
- #1487 source-complete/ready stacked base: PASS
- stacked merge base exactness: PASS
- configured-default schema trace: PASS_SOURCE_INSPECTION
- provider precedence/conflict trace: PASS_SOURCE_INSPECTION
- source/master-over-configured-default precedence: PASS_SOURCE_INSPECTION
- materializable-field intersection: PASS_SOURCE_INSPECTION
- provider-native unit trace: PASS_SOURCE_INSPECTION
- target-kind trace: PASS_SOURCE_INSPECTION
- support-kind capability gap: PASS_SOURCE_INSPECTION
- D2 model/view source review: PASS
- exact six-file intended scope: PASS
- temporary WIP removed: PASS
- review surface clean: PASS

Executable validation:
- standalone D2 Node check: NOT_RUN
- Non-FEA aggregate: NOT_RUN
- `npm run check:imports`: NOT_RUN
- `npm run build`: NOT_RUN
- `git diff --check`: NOT_RUN

Faithful local checkout failed before materialization with:
`Could not resolve host: github.com`

No NOT_RUN item is represented as PASS.

## Appendix A — takeover qualification
A1 Production trace 20/20 · A2 Failure isolation 20/20 · A3 Authority invariant 20/20 · A4 Independent validation 18/20 · A5 Minimal patch 20/20

**Score: 98/100; minimum 18/20.**

## EXACT_NEXT_ACTION
Owner review of #1488. After #1487 merges, deterministically re-ground #1488 to the new `main` before any merge. Continue Issue #1321 gap audit separately; do not widen this PR into support-authority or workflow mechanics.
