# PR1487 Work Report — Issue #1321 Calculation Defaults Basic UX

## Recovery header
- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1487 — `Load Calc: add Basic Calculation Defaults UX`
- Branch: `agent/issue-1321-calculation-defaults-basic-ux`
- Reconciled base / merge base: `main@d6101bcac7ccbdab9e42d7e0afbdd7b06d897462`
- Criticality: ENGINEERING_CRITICAL
- Execution mode: AUTO
- Merge authority: OWNER_ONLY_NOT_GRANTED_FOR_NEW_SUCCESSOR
- State: SOURCE_COMPLETE_AWAITING_OWNER

## Handover in 60 seconds
Issue #1321 requires a normal **Calculation Defaults** surface with Basic and Advanced groups and visible `Value | Unit | Scope | Effective authority | Basis | Reset` semantics. Before this PR, Load Calc routed the Step-3 `project-data` tab directly to the complete Non-FEA Project Data matrix, including raw JSON configured-default policy.

PR1487 is bounded **PR-D1**. It changes only the Load Calc Step-3 content route. LFEA/other Project Data consumers remain unchanged. The existing full Non-FEA Project Data editor remains available lazily inside an Advanced authority drawer.

## Production trace
```text
Load Calc project-data tab
→ renderProjectDataView()
→ renderNonFeaCalculationDefaultsView()
→ projectDataStore.applyProductDefaults()
→ createBasicCalculationDefaultsModel()
→ 10 visible PROJECT_GLOBAL screening settings

Basic Apply
→ createBasicCalculationDefaultUpdate()
→ validate against existing Project Data/runtime bounds
→ reject higher/independent authority
→ projectDataStore.update(path, value, PROJECT_POLICY evidence, true)
→ replaceProjectDataValue()
→ project revision + semantic hash + runtime revision move
→ existing currentness/staleness consumers observe the change

Basic Reset
→ only a Basic-owned PROJECT_POLICY path
→ reject non-DEFAULT keyed-map custody
→ clear complete path
→ next Calculation Defaults render
→ existing Product-default provider re-materializes governed built-in value

Advanced authority drawer
→ unchanged renderNonFeaProjectDataViewV2()
```

## D1 Basic settings
1. Length unit — currently qualified choice `mm` only.
2. Vertical axis — currently qualified choice `Z` only.
3. Gravity acceleration — finite and `> 0`.
4. Load factor — finite and `> 0`.
5. Gravity method request — `AUTO`, `CHAINAGE_TRIBUTARY_SPAN_V2`, `CHAINAGE_TRIBUTARY_SPAN_V3_COG`.
6. Active canonical cases — non-empty subset of `EMPTY`, `OPE`, `HYD`, canonical ordering.
7. Default corrosion allowance — finite and `>= 0`.
8. Default elastic modulus + thermal expansion coefficient — one Project Data authority path; both finite and `> 0`.
9. Default restraint preload — finite, signed allowed.
10. Default friction coefficient — finite and `>= 0`.

## Authority protections added during review
Two defects were found and repaired before source completion.

### 1. Lower-authority Basic edit may not overwrite higher authority
A Basic Apply is permitted only when the path is:
- empty;
- governed `PRODUCT_DEFAULT`; or
- a prior Basic Calculation-Defaults `PROJECT_POLICY` owned by the same field ID.

Source/master/independently-authored project authority is displayed but disabled in Basic. The model and update function both enforce this, so DOM manipulation cannot bypass the rule.

### 2. Basic map reset may not erase unrelated keyed values
For map-backed defaults (`corrosionAllowancesMm`, `materialElasticProperties`, `restraintPreloadsN`, `frictionCoefficients`), Basic editing/reset is allowed only when the path contains no key other than `DEFAULT`.

If class/line/other keyed values exist, Basic is disabled and the operator is directed to Advanced authority editing. This prevents Reset from deleting unrelated data and prevents Basic from taking custody of a mixed map.

## Evidence semantics
Basic edits write:
```text
source               = Load Calc Calculation Defaults
authority            = PROJECT_POLICY
basis                = User-configured project screening default for <setting>
calculationDefaultId = <Basic field ID>
previousAuthority    = <observed effective authority>
approved             = true
```

This is intentionally not source/master evidence. Product-default rows keep their original default ID, basis, profile ID/version and semantic hashes.

## Advanced D1 behavior
- Product-default profile identity/version/hash is visible.
- Full built-in Product-default catalog is read-only and shows ID/path/value/unit/basis/hash.
- Existing configured-default policy count/state is visible.
- The complete existing Non-FEA Project Data/configured-default authority editor remains available in a nested Advanced drawer.
- Dedicated engineer-friendly scope authoring remains **D2**; this PR does not falsely claim the scope editor is complete.

## Exact final changed-file ledger — 7 files
1. `agents/PR1487_workreport.md`
2. `agents/claims/PR1487.yaml`
3. `agents/status/PR1487.yaml`
4. `scripts/non-fea-calculation-defaults-basic-ux-check.mjs`
5. `src/workspace/project-data/non-fea-calculation-defaults-model.js`
6. `src/workspace/project-data/non-fea-calculation-defaults-view.js`
7. `src/workspace/project-data/project-data-view.js`

Temporary WIP claim is absent from the final net tree. `scripts/run-non-fea-checks.mjs` is intentionally untouched because open PR #1486 owns that aggregate file.

## Protected paths unchanged
- `src/workspace/project-data/non-fea-project-data-view-v2.js`
- `src/workspace/project-data/non-fea-product-default-profile.js`
- `src/workspace/project-data/non-fea-configured-default-provider.js`
- `src/workspace/project-data/non-fea-field-registry.js`
- `src/workspace/non-fea-common-input-runtime.js`
- `src/core/non-fea-common-checker/**`
- `src/workspace/engineering-loads/**`
- `scripts/run-non-fea-checks.mjs`
- `.github/workflows/**`

## Source-level falsifiers
The standalone qualification definition pins:
- exactly 10 Product-default Basic rows from an empty effective profile;
- all rows `PROJECT_GLOBAL`;
- Product-default provenance and project-policy transition;
- source-owned value cannot be edited or reset from Basic;
- non-`DEFAULT` keyed map cannot be edited/reset from Basic;
- complete-path E+alpha reset only for Basic-owned custody;
- blank numeric input cannot coerce to zero;
- unsupported `Y` axis / `m` unit fail before write;
- zero/negative values follow the existing Project Data positive/non-negative contracts;
- invalid method/case tokens fail before write;
- normal Load Calc Project Data router now selects Calculation Defaults;
- Advanced full authority editor remains reachable;
- existing configured-default ledger remains intact;
- D2 scope editor remains explicitly deferred.

## Validation truth
Source/repository validation:
- live main grounding: PASS
- concurrent main movement audit: PASS_NONE (intervening #1457 is EMP.1-only)
- merge base equals live main: PASS
- Issue #1321 D1 requirement trace: PASS
- ProjectDataStore revision/hash/currentness trace: PASS_SOURCE_INSPECTION
- production Project Data validity alignment: PASS_SOURCE_INSPECTION
- higher-authority overwrite protection: PASS_SOURCE_INSPECTION
- keyed-map destructive-reset protection: PASS_SOURCE_INSPECTION
- Product-default catalog/provider unchanged: PASS
- configured-default scope/provider unchanged: PASS
- advanced authority editor preserved: PASS
- open #1486 exact-file overlap: PASS_NONE
- temporary WIP removed: PASS
- exact seven-file intended scope: PASS — final compare observed 7 exact files, behind main 0, merge base equals `d6101bcac7ccbdab9e42d7e0afbdd7b06d897462`
- PR review submissions: 0
- PR review threads: 0

Executable validation:
- standalone focused Node check: NOT_RUN
- Non-FEA aggregate: NOT_RUN
- `npm run check:imports`: NOT_RUN
- `npm run build`: NOT_RUN
- `git diff --check`: NOT_RUN

Faithful local checkout attempt failed before materialization with:
`Could not resolve host: github.com`

No NOT_RUN item is represented as PASS.

## Appendix A — takeover qualification
- A1 Production trace: 20/20
- A2 Failure isolation: 20/20
- A3 Authority invariant: 20/20
- A4 Independent validation design: 18/20
- A5 Minimal patch: 20/20

**Score: 98/100; minimum 18/20.**

## EXACT_NEXT_ACTION
Owner review of #1487. Do not merge without explicit owner authority. After D1 is merged/reconciled, continue Issue #1321 PR-D2 with the engineer-friendly scoped-default editor backed by the existing `non-fea-configured-default-policy/v1` and its established scope precedence; do not create a second default mechanism.
