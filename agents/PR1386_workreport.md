# PR1386 — LFEA S4 reducer parity prerequisite

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT_EXTERNAL_EVIDENCE_BLOCKED
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: ACTIVE
SCOPE_AUTHORITY: S4_PREREQUISITE_ONLY_NO_NUMERICAL_PROMOTION
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/Advanced_Analysis
PR: 1386
PR_URL: https://github.com/reallaksh19/Advanced_Analysis/pull/1386
BRANCH: agent/lfea-piping-promotion-s4-reducer-parity-gate-20260823
MAIN_LAST_CHECKED: e985b50d81d0d241db27313562c8cc12cd7cc27d
CODE_HEAD_PRE_REPORT: 9ee64795c6a15967222ff6e9d6bd0a024d32ef7a
CURRENT_STAGE: S4 fail-closed readiness + controlled parity protocol + machine-checkable CAESAR evidence intake contract
CURRENT_BLOCKER: current-version CAESAR section sampling, gravity ownership, structural response and thermal parity observations remain absent
HIGHEST_RISK: mistaking ten-cylinder structural wording or a reviewer declaration for actual current-version CAESAR parity
EXACT_NEXT_ACTION: execute docs/lfea/S4_Reducer_Parity_Protocol_20260824.md, retain raw CAESAR artifacts/hashes, and populate an external record satisfying scripts/lfea-s4-reducer-parity-evidence-contract.mjs
```

## 60-second handover

S4 numerical reducer promotion remains **blocked**.

Current production truth:

```text
REDUCER_SEGMENT_COUNT = 10
REDUCER_SAMPLING_RULE = MIDPOINT_LINEAR_INTERPOLATION_CANDIDATE_V1
parityStatus = CANDIDATE_PENDING_SECTION_SAMPLING_VERIFICATION
reducerExactMechanics = false
productionUseAuthorized = false
```

The repository now has three layers, deliberately separated:

1. **source/readiness gate** — current v1 reducer candidate can never become READY;
2. **controlled CAESAR protocol** — defines the experiment required to establish parity;
3. **external evidence intake contract** — rejects incomplete, fitted, declaration-only or non-independent parity packages and still cannot authorize production.

No reducer stiffness/gravity/thermal formula changed in this PR.

## Governing engineering decisions

### DEC-S4-001 — ten cylinders do not identify the internal sampling station
Hexagon public help establishes ten successively changing cylinders and From/To section custody. It does not establish midpoint/start/end representative OD/wall for each cylinder.

### DEC-S4-002 — gravity authority is separate from stiffness discretization
Historical independent CAEPIPE↔CAESAR evidence reports reducer weight following the From-end OD/wall for the historical tested version. This is a current-version falsifier, not CAESAR 14 authority. Metal/fluid/insulation gravity must be qualified independently.

### DEC-S4-003 — parity evidence cannot itself flip production
Even a record accepted by `validateS4ReducerParityEvidence()` returns:

```text
status = QUALIFIED_PARITY_EVIDENCE_ONLY
productionUseAuthorized = false
reducerExactMechanicsAuthorized = false
```

A future S4 numerical promotion requires a new explicit production-authority contract revision and owner-reviewed integration.

### DEC-S4-004 — one accepted candidate must be numerically unique under a predeclared tolerance
The evidence contract requires:

- `tolerancePolicy.fittedToCaesar = false`;
- exactly one section candidate marked accepted;
- accepted candidate maximum normalized error <= the declared observation tolerance;
- every competing candidate error > that tolerance;
- the engineering decision must equal that accepted candidate.

A reviewer cannot select a rule that is outside tolerance or one of multiple rules inside tolerance.

## Source custody

### SRC-S4-01 — Hexagon reducer help

```text
publisher: Hexagon
product: CAESAR II
source: Users Guide — Reducer
topic/version observed: Version 12 / 1226707
classification: PRIMARY_VENDOR_PUBLIC_HELP
```

Establishes ten cylinders and From/To end section data only.

### SRC-S4-02 — Hexagon Version 14 auxiliary reducer export contract

```text
publisher: Hexagon
source: Users Guide — Auxiliary Element Data / #$ REDUCERS
version: 14
topic: 1471418
classification: PRIMARY_VENDOR_PUBLIC_HELP
```

Does not expose ten internal cylinder section values or sampling stations.

### SRC-S4-03 — historical independent gravity verification

```text
publisher: SST Systems
source: KP2CII / CAEPIPE-to-CAESAR II User's Manual
section: Reducer verification / Appendix E
reported CAESAR version: 4.50
classification: INDEPENDENT_THIRD_PARTY_HISTORICAL_EVIDENCE
```

Useful only as a falsifier against assuming progressive ten-cylinder gravity ownership.

## Implemented prerequisite surface

### Production readiness

`src/core/linear-fea-reducer-condensation/production-readiness.js` requires these independent blockers:

```text
REDUCER_SECTION_SAMPLING_AUTHORITY_UNQUALIFIED
REDUCER_GRAVITY_OWNERSHIP_AUTHORITY_UNQUALIFIED
REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED
```

The current candidate has no READY path.

### Controlled CAESAR protocol

`docs/lfea/S4_Reducer_Parity_Protocol_20260824.md` requires:

- LARGE_TO_SMALL and SMALL_TO_LARGE controlled models;
- axial, torsion, transverse-force and end-moment response cases;
- metal-only, fluid-only and insulation-only gravity pairs;
- resultant and first-moment/centroid evidence;
- free and fixed thermal cases;
- structural-vs-code-SIF boundary control;
- raw job/input/output hashes, report locators, observers and dates;
- no benchmark or tolerance fitting.

### Machine-checkable parity intake

`scripts/lfea-s4-reducer-parity-evidence-contract.mjs` requires exactly one run for each orientation of these families:

```text
STRUCTURAL_AXIAL
STRUCTURAL_TORSION
STRUCTURAL_TRANSVERSE_FORCE
STRUCTURAL_END_MOMENT
GRAVITY_METAL
GRAVITY_FLUID
GRAVITY_INSULATION
THERMAL_FREE
THERMAL_FIXED
```

It additionally requires one same-orientation `CODE_SIF_BASELINE` / `CODE_SIF_VARIED` pair.

Each run must retain:

- unique run identity;
- model orientation;
- 64-hex job/input/output hashes;
- units/load case/restraint description;
- non-empty reported results;
- report and raw-artifact locators;
- observer and observation date.

The package must compare all six protocol candidate section rules and prove one unique rule under the predeclared tolerance.

The decision record must separately qualify metal, fluid and insulation gravity ownership; acceptance must cover section uniqueness, axial/torsion/bending parity, gravity components and first moment, thermal response and code boundary.

Independent review is mandatory and the reviewer cannot be one of the recorded CAESAR observers.

### Contract falsifier check

`scripts/lfea-s4-reducer-parity-evidence-contract-check.mjs` is an in-memory contract fixture only. It is designed to prove rejection of:

- missing orientation/case coverage;
- tolerance fitting;
- production authorization requests;
- accepted candidates outside tolerance;
- multiple candidates within tolerance;
- failed thermal acceptance;
- non-independent review;
- non-QUALIFIED status.

It is **not CAESAR evidence** and must never be used as a production oracle.

### Workflow

`.github/workflows/lfea-s4-reducer-parity-gate.yml` now declares syntax plus B-3.23/readiness and evidence-contract checks. Hosted execution remains subject to repository Issue #54.

## Numerical authority boundary

This PR does not change or authorize:

- the midpoint candidate sampling rule;
- ten-cylinder count;
- reducer element stiffness formulation;
- static condensation;
- shear coefficient;
- gravity formulas;
- thermal formulas;
- SIF/code-stress authority;
- benchmark expected values;
- engineering tolerances;
- production reachability of `compileTenCylinderReducerAuthority()`;
- `reducerExactMechanics`.

Any reducer numerical output movement attributable to this prerequisite is a falsifier.

## Required real evidence before actual S4 promotion

1. One current-version section rule uniquely matches both orientations under a predeclared source/report-resolution tolerance.
2. Axial, torsional, transverse-force and end-moment response parity is independently established.
3. Metal gravity ownership is identified from forward/reverse cases.
4. Fluid gravity ownership is independently identified.
5. Insulation gravity ownership is independently identified.
6. Gravity resultant and first moment/centroid agree.
7. Free-extension and restrained thermal response agree.
8. Structural stiffness is shown independent of code-SIF reporting choices.
9. Raw CAESAR artifacts and hashes are retained.
10. Independent review approves the package.

Only after that may a separate production-authority revision be designed.

## Repository grounding

```text
main = e985b50d81d0d241db27313562c8cc12cd7cc27d
PR code head before this report = 9ee64795c6a15967222ff6e9d6bd0a024d32ef7a
PR state = open / draft / mergeable
```

Main-side drift remains EMP.1-only for the currently observed main; no S4 reducer overlap was identified. No rebase/merge is performed without owner instruction.

## Engineering item register

| ID | Type | Severity | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | ISS | high | OPEN_BLOCKS_S4 | Current-version section sampling unresolved. |
| ISS-002 | ISS | high | OPEN_BLOCKS_S4 | Controlled structural/thermal CAESAR parity absent. |
| ISS-003 | ISS | high | OPEN_BLOCKS_S4 | Current-version metal/fluid/insulation gravity ownership unresolved. |
| IMP-001 | IMP | high | IMPLEMENTED | Current reducer readiness is structurally fail-closed. |
| IMP-002 | IMP | high | IMPLEMENTED | Gravity authority separated from stiffness discretization. |
| IMP-003 | IMP | high | IMPLEMENTED | Controlled current-version CAESAR protocol committed. |
| IMP-004 | IMP | high | IMPLEMENTED | Machine-checkable external evidence intake contract added. |
| IMP-005 | IMP | high | IMPLEMENTED | Unique-candidate selection bound to predeclared tolerance. |
| IMP-006 | IMP | medium | DECLARED_CI_NOT_EXECUTED | Workflow includes contract check; hosted CI remains blocked by #54. |
| RISK-001 | RISK | high | MITIGATED_BY_GATE | Candidate midpoint mechanics cannot be mislabeled exact. |
| RISK-002 | RISK | high | MITIGATED_BY_GATE | Ten-cylinder structural wording cannot silently become gravity authority. |
| RISK-003 | RISK | high | MITIGATED_BY_CONTRACT | Reviewer declaration alone cannot manufacture section-rule parity. |

## Validation ledger

| Check | Status | Evidence |
|---|---|---|
| Current main grounding | PASS — GITHUB_SOURCE_INSPECTION | `e985b50d...` |
| Primary Hexagon source classification | PASS — SOURCE_INSPECTION | ten cylinders + end-section custody only |
| Historical gravity evidence classification | PASS — EVIDENCE_CLASSIFICATION | current-version falsifier only |
| Production readiness blockers | PASS — SOURCE_INSPECTION | 3 independent blockers, no READY path |
| S4 parity protocol | PASS — SOURCE_INSPECTION | controlled experiment defined |
| S4 evidence intake contract | PASS_AFTER_FIX — SOURCE_INSPECTION | coverage, hashes, tolerance uniqueness, review and non-promotion enforced |
| Contract fixture execution | NOT_RUN in repository CI | declared in S4 workflow; hosted execution unavailable |
| B-3.23 regression | NOT_RUN on current exact head | hosted execution unavailable |
| Current-version CAESAR parity | UNRESOLVED | raw controlled observations absent |
| Full LFEA regression | NOT_RUN | infrastructure blocker |

Historical hosted run `32678331110` / job `97290430252` had zero executed steps and 404 `BlobNotFound`; classify as `CI_PRE_STEP_INFRASTRUCTURE_FAILURE`, not engineering PASS/FAIL.

## Changed-file ledger — 8 files

| File | Purpose |
|---|---|
| `agents/PR1386_workreport.md` | sole living recovery authority |
| `.github/workflows/lfea-s4-reducer-parity-gate.yml` | S4 prerequisite + evidence-contract workflow |
| `docs/lfea/S4_Reducer_Parity_Protocol_20260824.md` | controlled current-version CAESAR protocol |
| `src/core/linear-fea-reducer-condensation/production-readiness.js` | fail-closed readiness blockers |
| `src/core/linear-fea-reducer-condensation/index.js` | readiness exports |
| `scripts/lfea-b3.23-reducer-condensation-check.mjs` | internal numerical self-consistency + non-reachability guard |
| `scripts/lfea-s4-reducer-parity-evidence-contract.mjs` | external CAESAR parity evidence intake contract |
| `scripts/lfea-s4-reducer-parity-evidence-contract-check.mjs` | contract-only falsifier fixture/check |

## Appendix A — expert takeover questionnaire

1. Why does “ten successively changing cylinders” fail to identify each cylinder's representative OD/wall station?
2. Why is gravity ownership a separate authority from reducer structural discretization?
3. What does the historical From-end weight result prove, and what does it not prove for CAESAR 14/current production?
4. Which orientation-paired cases are mandatory in the new evidence contract?
5. How does the contract prove a section candidate is uniquely inside a predeclared tolerance rather than selected by reviewer declaration?
6. Why are metal, fluid and insulation gravity decisions separate?
7. Why is first-moment/centroid evidence necessary in addition to total weight?
8. Why does an accepted parity record still return `productionUseAuthorized=false`?
9. What new authority revision is required before `compileTenCylinderReducerAuthority()` can become production-reachable?
10. Why are the in-memory contract fixtures not CAESAR evidence?

Takeover threshold: all ten must be answerable without guessing undocumented CAESAR behavior.

## Historical record

- Initial S4 audit found midpoint sampling candidate-only and no production reachability was allowed.
- A hypothetical string-only READY path was rejected.
- Historical independent reducer weight evidence exposed gravity as a separate authority question.
- PR1386 added explicit sampling/gravity/response blockers and a controlled CAESAR parity protocol.
- 2026-08-24 continuation added a machine-checkable external evidence contract; review found and fixed two declaration-only hazards: the engineering decision is now bound to the uniquely accepted candidate, and that candidate must be uniquely within the predeclared tolerance.
- No numerical reducer promotion has occurred.
