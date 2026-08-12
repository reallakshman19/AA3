# M047 BM4_L — Fix 1: source-domain-correct friction-site consumption

## Mission

Implement the first bounded correction after F2.6: make the existing InputXML friction-site mapper carry **corrected InputXML restraint semantics** instead of leaving downstream consumers with only raw exported `TYPE` codes.

This PR is stacked directly on PR #1074 head:

```text
d60fd3d34be4f94968818daa653b02f5b6476d26
```

It is deliberately **not** the F2.7 nonlinear active-boundary implementation. Gap OPEN/CLOSED/REOPENED ordering and proprietary friction state-history ordering remain blocked on exact-build CAESAR evidence.

## Root cause

The older `buildInputXmlFrictionSiteMap()` correctly located friction rows from positive `FRIC_COEF`, but it exposed only the raw InputXML `TYPE` as `sourceTypeCode`.

After the F2.5/F2.6 source-domain correction, raw InputXML numeric `TYPE` is not mechanics semantics. For BM4_L the governed correction is:

```text
+Y   17 -> 14
LIM   7 -> 8
GUI  10 -> 9
X     1 -> 2
Y     2 -> 3
Z     3 -> 5
     18 -> 15
```

The ACCDB path remains separate and unmutated.

Therefore a friction-site consumer that sees raw `17`, `7`, or `10` must not classify those numbers directly as CAESAR restraint mechanics.

## Fix 1 implementation

`src/core/nonlinear-restraint-friction/inputxml-friction-site-map.js` now supports two explicit modes.

### Source-only compatibility mode

```js
buildInputXmlFrictionSiteMap(xmlText)
```

This retains historical source extraction but marks the result:

```text
SOURCE_ONLY_RAW_TYPE_NOT_CLASSIFIED
rawTypeUsedAsMechanicsSemantics = false
```

Raw `sourceTypeCode` remains evidence only. No corrected type/class is invented.

### Governed semantic mode

```js
buildInputXmlFrictionSiteMap(xmlText, {
  restraintTypeMutationConfig: bm4lMutation,
})
```

The mapper then:

1. retains raw InputXML `TYPE` as source evidence;
2. applies the supplied mutation exactly once through the existing governed mutation utility;
3. decodes only the corrected type;
4. carries `correctedTypeCode`, abbreviation, family, mutation flag and mutation rule into the site/companion contract;
5. fails closed if a positive-friction BM4_L row does not classify as corrected `+Y`.

For the representative BM4_L semantics:

```text
friction source: raw 17 -> corrected 14 -> +Y
LIM companion:   raw  7 -> corrected  8 -> LIM
GUI companion:   raw 10 -> corrected  9 -> GUI
```

The existing source-only API remains callable, so this patch does not silently reinterpret historical evidence consumers.

## F2.6 custody retained

The pinned F2.6 reconciliation remains authoritative:

```text
26 positive-friction +Y rows
29 total +Y rows
5 friction-coupled positive-gap rows
6 total positive-gap rows
additional non-friction GUI gap: node 21640
ACCDB GAP: unset sentinel on all 46 rows
positive gap magnitude authority: corrected InputXML
```

No ACCDB `RES_TYPEID` is passed through the InputXML mutation table.

## Accuracy — present vs Fix 1

The user requested the revised result side by side with the present L13 diagnostic.

| Metric | Present | Fix 1 revised | Delta |
|---|---:|---:|---:|
| Passed | 1,719 | 1,719 | 0 |
| Failed | 195 | 195 | 0 |
| Governed rows | 1,914 | 1,914 | 0 |
| Accuracy | **89.8119122257%** | **89.8119122257%** | **0.0000 pp** |

Quantity breakdown is also unchanged:

| Quantity | Present pass/fail | Fix 1 pass/fail |
|---|---:|---:|
| Displacement | 279 / 12 | 279 / 12 |
| Rotation | 264 / 27 | 264 / 27 |
| Restraint force | 77 / 13 | 77 / 13 |
| Restraint moment | 90 / 0 | 90 / 0 |
| Source-end force FROM | 256 / 32 | 256 / 32 |
| Source-end force TO | 255 / 33 | 255 / 33 |
| Source-end moment FROM | 249 / 39 | 249 / 39 |
| Source-end moment TO | 249 / 39 | 249 / 39 |

### Why accuracy does not move

This is the correct numerical result for Fix 1.

F2.6 proved that the corrected source-domain view preserves the exact same:

- 26 friction-node set;
- global `+Y` friction normals;
- `mu = 0.3` values;
- five friction-coupled positive-gap companions.

Fix 1 changes **semantic custody**, not the assembled nonlinear equations. It does not change:

- contact state;
- friction state history;
- friction stiffness;
- Slide Multiplier;
- normal-force update rule;
- angle update rule;
- comparator;
- tolerance;
- CAESAR reference values.

Therefore claiming a higher L13 percentage from this patch would be an unsupported score-driven mechanics change.

## Numerical cross-check performed for this PR

The retained exact Windows/ACE artifact `9110308571` was unpacked locally. Its 322 element stiffness/load ledgers and 51 recovered finite restraint DOFs reconstruct the 1,938-DOF L6 operator.

A local independent Coulomb fixed-point replay reproduced the historical L13 diagnostic exactly:

```text
iterations: 82
final states: 7 STICK / 19 SLIDING
passed: 1719
failed: 195
total: 1914
accuracy: 89.81191222570533%
```

This establishes the present numerical value independently before the source-domain-only patch. Since Fix 1 does not alter the operator, source-node inventory, friction vectors or active-state policy, the revised numerical value is identical.

## Validation

Executed in this agent environment:

```text
node --check src/core/nonlinear-restraint-friction/inputxml-friction-site-map.js     PASS (materialized candidate)
node --check scripts/lfea-m047-bm4l-fix1-friction-source-domain-consumption-check.mjs PASS (materialized candidate)
exact artifact Coulomb replay 1719/1914                                              PASS
```

Full repository exact-head execution is not claimed: the local container has no `gh` checkout/publish path, so the branch is written through the connected GitHub app. No retired workflow is restored or manually rerun.

## Files

This PR changes exactly four files relative to PR #1074:

```text
agents/PR_M047_bm4l_fix1_friction_source_domain_consumption.md
benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-fix1-friction-source-domain-consumption.json
scripts/lfea-m047-bm4l-fix1-friction-source-domain-consumption-check.mjs
src/core/nonlinear-restraint-friction/inputxml-friction-site-map.js
```

## Remaining F2.7 boundary

Fix 1 closes the remaining raw-InputXML semantic-consumption risk in the friction-site map. It does **not** close either numerical blocker:

```text
GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
```

The next legitimate accuracy-changing batch requires exact-build Active Boundary Conditions / nonlinear iteration evidence sufficient to establish contact OPEN/CLOSED/REOPENED and friction state commit/update ordering without selecting mechanics from the BM4_L score.

## Decision

**FIX 1 IMPLEMENTED — SOURCE-DOMAIN SEMANTICS CORRECTED; L13 REMAINS 1719/1914 = 89.8119122257%. NO NUMERICAL ACCURACY CHANGE IS AUTHORIZED BY THIS SEMANTIC FIX. F2.7 REMAINS THE NEXT ACCURACY-CHANGING GATE.**
