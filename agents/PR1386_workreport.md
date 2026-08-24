# PR1386 — LFEA S4 reducer parity prerequisite

## Current recovery state

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: ACTIVE
SCOPE_AUTHORITY: S4_PREREQUISITE_ONLY_NO_NUMERICAL_PROMOTION
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/Advanced_Analysis
PR: 1386
PR_URL: https://github.com/reallaksh19/Advanced_Analysis/pull/1386
BRANCH: agent/lfea-piping-promotion-s4-reducer-parity-gate-20260823
MERGE_BASE: a5aa16af7b4298427ea6b4aac0ced05ff801ed1c
MAIN_LAST_CHECKED: e985b50d81d0d241db27313562c8cc12cd7cc27d
EXACT_HEAD_PRE_REPORT: e1c4f6313b3b3697aa4f7191ca2dd09a5febeb59
CURRENT_STAGE: S4 readiness hardened; controlled current-version reducer parity protocol committed
CURRENT_BLOCKER: current-version CAESAR section sampling, gravity ownership, structural response and thermal parity remain unresolved
HIGHEST_RISK: mistaking the public ten-cylinder structural description for proof of midpoint sampling or ten-cylinder gravity ownership
EXACT_NEXT_ACTION: execute docs/lfea/S4_Reducer_Parity_Protocol_20260824.md in CAESAR 14.x and retain raw source outputs/hashes
```

## 60-second handover

The S4 production target is still **not authorized**.

Current candidate state:

```text
REDUCER_SEGMENT_COUNT = 10
REDUCER_SAMPLING_RULE = MIDPOINT_LINEAR_INTERPOLATION_CANDIDATE_V1
parityStatus = CANDIDATE_PENDING_SECTION_SAMPLING_VERIFICATION
reducerExactMechanics = false
productionUseAuthorized = false
```

Primary Hexagon help confirms a reducer is constructed from ten successively changing cylinders, but does not state where each cylinder samples OD/wall. The Version 14 reducer export contract exposes end/control data, not ten internal section stations.

A separate gravity issue is now explicit: independent historical CAEPIPE↔CAESAR verification reports CAESAR reducer **weight based on the From-end OD/wall**, not a progressive ten-cylinder weight distribution. That evidence is historical and third-party, so it is a falsifier—not current-version authority.

S4 therefore has three independent blockers:

1. section-sampling authority;
2. gravity ownership/resultant/centroid authority;
3. controlled current-version structural/thermal response parity.

## Source/evidence custody

### SRC-S4-01 — Hexagon reducer help

```text
publisher: Hexagon
product: CAESAR II
source: Users Guide — Reducer
observed topic: Version 12 / 1226707
classification: PRIMARY_VENDOR_PUBLIC_HELP
```

Establishes:

- ten successively changing cylinders;
- From-end section from current element;
- Diameter 2 / Thickness 2 at the To end.

Does not establish:

- midpoint/start/end/other internal section sampling;
- gravity ownership;
- exact condensed response parity.

### SRC-S4-02 — Hexagon Version 14 reducer export contract

```text
publisher: Hexagon
source: Users Guide — Auxiliary Element Data / #$ REDUCERS
version: 14
observed topic: 1471418
classification: PRIMARY_VENDOR_PUBLIC_HELP
```

The record exposes Diameter 2, Thickness 2, Alpha, transition radii and L2. It does not expose ten internal cylinder section values or a representative station rule.

### SRC-S4-03 — historical independent gravity verification

```text
publisher: SST Systems
source: KP2CII / CAEPIPE-to-CAESAR II User's Manual
section: Reducer verification / Appendix E
reported CAESAR version: 4.50
classification: INDEPENDENT_THIRD_PARTY_HISTORICAL_EVIDENCE
```

Forward/reverse test results report reducer weight matching the From-end OD/wall. Because this is historical, it must **not** be promoted into CAESAR 14 truth. It proves only that gravity cannot be inferred from the ten-cylinder structural statement.

## Implemented in PR1386

### Fail-closed readiness

`src/core/linear-fea-reducer-condensation/production-readiness.js` now requires all three blocker families to remain explicit:

```text
REDUCER_SECTION_SAMPLING_AUTHORITY_UNQUALIFIED
REDUCER_GRAVITY_OWNERSHIP_AUTHORITY_UNQUALIFIED
REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED
```

The current v1 candidate can never return READY. A future exact reducer authority requires a versioned contract revision carrying qualified source/parity evidence. Renaming a status or sampling token cannot unlock production.

### Controlled CAESAR qualification protocol

`docs/lfea/S4_Reducer_Parity_Protocol_20260824.md` defines the actual experiment needed to unlock S4.

It requires:

- LARGE→SMALL and SMALL→LARGE orientation pairs;
- axial, torsional and bending response discrimination;
- metal-only gravity;
- fluid-only gravity;
- insulation-only gravity;
- total resultant and first-moment/centroid evidence;
- thermal free-extension and restrained-reaction cases;
- raw CAESAR source/output hashes and report locators;
- candidate comparison without fitting tolerances or expected values to CAESAR.

The selected geometry is deliberately strongly tapered so plausible section rules separate numerically.

### B-3.23 guard

`scripts/lfea-b3.23-reducer-condensation-check.mjs` retains its existing numerical self-consistency checks. It iterates `REDUCER_PRODUCTION_BLOCKER_CODES`, so the gravity blocker is required automatically. It also requires zero production-consumer reachability to `compileTenCylinderReducerAuthority` while readiness is BLOCK.

### Workflow

`.github/workflows/lfea-s4-reducer-parity-gate.yml` now scopes the parity protocol document in addition to the reducer guard/check files.

## Authority boundary

This prerequisite changes **no reducer numerical mechanics**.

Not authorized or changed:

- midpoint vs endpoint sampling;
- ten-cylinder count;
- stiffness formulation;
- static condensation equations;
- shear coefficient;
- candidate gravity calculation;
- candidate thermal calculation;
- reducer SIF/code-stress treatment;
- benchmark expected values;
- numerical tolerances;
- `reducerExactMechanics`;
- bend/tee/pressure capabilities.

Any numerical result movement attributable to PR1386 is a falsifier.

## Required evidence before actual S4 promotion

A new qualified reducer-parity authority must resolve all of the following:

1. **Section sampling** — one current-version rule uniquely matches independent observations.
2. **Axial/torsional/bending response** — displacements/reactions agree without implementation self-comparison.
3. **Metal gravity** — forward/reverse cases distinguish From-end, To-end, average and progressive rules.
4. **Fluid gravity** — independently qualified.
5. **Insulation gravity** — independently qualified.
6. **Gravity first moment** — resultant and moment/centroid agree.
7. **Thermal response** — free and restrained cases agree.
8. **Code boundary** — structural reducer mechanics remain separate from SIF/code-stress authority.

Only then may `compileTenCylinderReducerAuthority()` become production-reachable and `reducerExactMechanics=true` be considered.

## Repository grounding

Current main:

```text
e985b50d81d0d241db27313562c8cc12cd7cc27d
```

PR branch vs current main before this report update:

```text
status: diverged
ahead: 13
behind: 4
merge-base: a5aa16af7b4298427ea6b4aac0ced05ff801ed1c
```

The four main-side commits since merge-base are EMP.1 authority/release changes only. Their changed files do not overlap the S4 reducer package, B-3.23, S4 workflow or parity protocol. No rebase/merge was performed because no owner merge instruction was given and there is no reducer overlap.

## Engineering item register

| ID | Type | Severity | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | ISS | high | OPEN_BLOCKS_S4 | Current-version section sampling is unresolved. |
| ISS-002 | ISS | high | OPEN_BLOCKS_S4 | Current-version structural/thermal parity is absent. |
| ISS-003 | ISS | high | OPEN_BLOCKS_S4 | Current-version reducer gravity ownership is unresolved. |
| IMP-001 | IMP | high | IMPLEMENTED | Candidate readiness is fail-closed. |
| IMP-002 | IMP | high | IMPLEMENTED | Gravity authority separated from structural ten-cylinder authority. |
| IMP-003 | IMP | high | IMPLEMENTED | Controlled CAESAR 14 parity protocol committed. |
| IMP-004 | IMP | medium | IMPLEMENTED_CI_NOT_EXECUTING | Narrow workflow updated; hosted runner still fails before step 1. |
| DEC-001 | DEC | high | CLOSED | Do not infer midpoint sampling from ten-cylinder wording. |
| DEC-002 | DEC | high | CLOSED | Do not infer gravity ownership from structural discretization. |
| RISK-001 | RISK | high | MITIGATED_BY_GATE | Candidate midpoint mechanics cannot be mislabeled exact. |
| RISK-002 | RISK | high | MITIGATED_BY_GATE | Candidate ten-cylinder gravity cannot be mislabeled CAESAR parity. |

## Validation ledger

### VAL-001 — current repository grounding

```text
STATUS: PASS
OBSERVATION: GITHUB_SOURCE_INSPECTION
MAIN: e985b50d81d0d241db27313562c8cc12cd7cc27d
MAIN_DRIFT_OVERLAP_WITH_S4: none
```

### VAL-002 — primary Hexagon reducer source

```text
STATUS: PASS_SOURCE_INSPECTION
ESTABLISHED: ten cylinders + From/To end section custody
UNRESOLVED: representative internal section station + gravity rule
```

### VAL-003 — historical gravity falsifier

```text
STATUS: PASS_EVIDENCE_CLASSIFICATION
OBSERVED: historical independent CAESAR reducer weight follows From-end section in forward/reverse tests
LIMITATION: CAESAR 4.50 historical evidence; not current-version authority
DISPOSITION: current-version gravity experiment required
```

### VAL-004 — readiness hardening

```text
STATUS: PASS_SOURCE_INSPECTION
BLOCKER_COUNT: 3
productionUseAuthorized: false
CURRENT_V1_READY_PATH: none
```

### VAL-005 — exact-head S4 workflow

```text
STATUS: NOT_RUN
EXACT_HEAD: e1c4f6313b3b3697aa4f7191ca2dd09a5febeb59
WORKFLOW_RUN: 32678331110
JOB: 97290430252
GITHUB_CONCLUSION: failure
EXECUTED_STEPS: 0
JOB_LOG: 404 BlobNotFound
CLASSIFICATION: CI_PRE_STEP_INFRASTRUCTURE_FAILURE
ENGINEERING_ASSERTION_FAILURE_OBSERVED: no
```

No syntax check, B-3.23 assertion or anti-reachability assertion executed. Do not classify this hosted result as software PASS or engineering FAIL.

### VAL-006 — full LFEA regression

```text
STATUS: NOT_RUN
```

### VAL-007 — current-version CAESAR reducer parity

```text
STATUS: UNRESOLVED
PROTOCOL: docs/lfea/S4_Reducer_Parity_Protocol_20260824.md
MISSING: raw controlled CAESAR 14.x observations
```

## Changed-file ledger

| File | Purpose | Validation |
|---|---|---|
| `agents/PR1386_workreport.md` | sole living recovery authority | current |
| `.github/workflows/lfea-s4-reducer-parity-gate.yml` | focused hosted guard | source inspected; hosted NOT_RUN |
| `docs/lfea/S4_Reducer_Parity_Protocol_20260824.md` | controlled current-version parity design | source inspected |
| `src/core/linear-fea-reducer-condensation/production-readiness.js` | three-part fail-closed readiness | source inspected; runtime NOT_RUN |
| `src/core/linear-fea-reducer-condensation/index.js` | readiness exports | source inspected; runtime NOT_RUN |
| `scripts/lfea-b3.23-reducer-condensation-check.mjs` | numerical self-consistency + non-reachability guard | exact-head NOT_RUN |

Effective prerequisite diff: **6 files**.

## Appendix A — expert takeover questionnaire

1. Why does the Hexagon statement “ten successively changing cylinders” fail to identify the representative OD/wall station for each cylinder?
2. Why is reducer gravity a separate authority from reducer stiffness, and what does the historical forward/reverse CAESAR weight evidence prove—and not prove?
3. Why are B-3.23 gravity and thermal assertions internal mathematics rather than an independent CAESAR oracle?
4. How do the reversed-orientation protocol cases discriminate From-end weight from progressive physical weight?
5. How do axial and torsional cases discriminate midpoint/start/end section sampling without tuning to CAESAR?
6. What evidence must be retained from each CAESAR run before it can enter a qualified parity record?
7. Why must a future READY state use a new explicit authority-contract revision rather than a renamed parity string?
8. What remains separate between structural reducer mechanics and reducer SIF/code-stress authority?

Takeover threshold: expert must be able to answer all eight without guessing.

## Historical record

- Initial S4 audit found the midpoint rule was candidate-only and production reachability had to remain blocked.
- A hypothetical string-only READY path was rejected and removed.
- Hosted S4 runs repeatedly fail before checkout because of the repository-wide runner/BlobNotFound condition.
- 2026-08-24 follow-on review found current public Hexagon help still does not define internal section sampling.
- The same review found independent historical evidence that reducer gravity may not follow the ten-cylinder structural discretization.
- PR1386 was hardened with `REDUCER_GRAVITY_OWNERSHIP_AUTHORITY_UNQUALIFIED` and a controlled current-version CAESAR parity protocol.
