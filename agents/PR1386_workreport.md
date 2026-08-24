# PR1386 — LFEA S4 reducer parity prerequisite

## CURRENT RECOVERY STATE — READ FIRST

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
ENGINEERING_CODE_HEAD: 1764d0306da90f55f9b27fa8f532b6b36b97f360
CURRENT_STAGE: fail-closed reducer readiness + controlled CAESAR protocol + machine-checkable parity intake + raw-artifact SHA256 verification
CURRENT_BLOCKER: current-version CAESAR reducer observations do not yet exist
HIGHEST_RISK: accepting self-declared hashes/reviewer assertions as parity or inferring midpoint/gravity behavior from ten-cylinder wording
EXACT_NEXT_ACTION: execute docs/lfea/S4_Reducer_Parity_Protocol_20260824.md, retain raw files under one package root, populate evidence.json, run scripts/lfea-s4-reducer-parity-evidence-file-check.mjs
```

## 60-second handover

S4 numerical promotion remains **BLOCKED**.

Current production truth:

```text
REDUCER_SEGMENT_COUNT = 10
REDUCER_SAMPLING_RULE = MIDPOINT_LINEAR_INTERPOLATION_CANDIDATE_V1
parityStatus = CANDIDATE_PENDING_SECTION_SAMPLING_VERIFICATION
reducerExactMechanics = false
productionUseAuthorized = false
```

Hexagon public help establishes ten successively changing cylinders and From/To end section custody. It does not establish the representative OD/wall station inside each cylinder, nor gravity ownership. Historical CAEPIPE↔CAESAR evidence indicating From-end reducer weight is a falsifier only; it is not current-version CAESAR authority.

The prerequisite now has four independent layers:

1. production readiness that has no READY path for the current candidate;
2. controlled current-version CAESAR experiment protocol;
3. machine-checkable engineering parity contract;
4. file-level raw-artifact verifier that recomputes SHA-256 against retained CAESAR job/input/output bytes.

Even accepted evidence remains `QUALIFIED_PARITY_EVIDENCE_ONLY` and cannot enable production.

## Governing engineering decisions

### DEC-S4-001 — ten cylinders do not establish section sampling
Do not infer midpoint/start/end station from Hexagon's ten-cylinder statement.

### DEC-S4-002 — gravity authority is separate from structural discretization
Metal, fluid and insulation gravity ownership/resultant/centroid must be independently qualified.

### DEC-S4-003 — orientation is the discriminator, not a second uncontrolled variable
For each forward/reverse pair the validator requires the same material, units and restraints. Structural pairs additionally retain identical applied loads, gravity pairs identical isolated gravity source state, and thermal pairs identical thermal source state.

### DEC-S4-004 — candidate selection is quantitative
All six credible section candidates must be compared. Exactly one must be inside the predeclared observation tolerance; all competitors must be outside. The engineering decision must match that candidate.

### DEC-S4-005 — acceptance booleans are insufficient
The intake requires quantitative normalized residuals for structural response, each gravity component, first moment, thermal response and code-boundary invariance, all inside the same predeclared non-fitted tolerance.

### DEC-S4-006 — claimed hashes are not evidence custody
Each run now carries safe relative paths in `rawArtifacts`. The file intake rejects absolute/traversal paths, missing files, symlinks and files resolving outside the evidence package, and recomputes SHA-256 before acceptance.

### DEC-S4-007 — parity evidence cannot authorize production
Accepted intake returns:

```text
status = QUALIFIED_PARITY_EVIDENCE_ONLY
rawArtifactHashesVerified = true
productionUseAuthorized = false
reducerExactMechanicsAuthorized = false
```

A future S4 numerical promotion still requires a new production-authority contract and integration PR.

## Required real CAESAR evidence

Both `LARGE_TO_SMALL` and `SMALL_TO_LARGE` are required for:

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

A same-orientation `CODE_SIF_BASELINE` / `CODE_SIF_VARIED` pair is also required.

Each run retains:

- CAESAR version/build;
- orientation and exact physical From/To sections;
- material state and controlled source state;
- family-specific reported results;
- job/input/output SHA-256 values;
- `rawArtifacts.jobFile`, `rawArtifacts.inputSource`, `rawArtifacts.outputFile` relative paths;
- report/artifact locators;
- observer/date.

Independent review is mandatory and the reviewer may not be any recorded CAESAR observer.

## Operator package

Documentation:

- `docs/lfea/S4_Reducer_Parity_Protocol_20260824.md`
- `docs/lfea/S4_Reducer_Parity_Evidence_Package_20260824.md`

Validation command:

```text
node scripts/lfea-s4-reducer-parity-evidence-file-check.mjs /path/to/package/evidence.json
```

Raw files must remain under the evidence JSON directory tree. Extracted JSON values are derivative evidence; the referenced raw bytes and recomputed hashes remain source custody.

## Production readiness blockers

`src/core/linear-fea-reducer-condensation/production-readiness.js` keeps these independent blockers active:

```text
REDUCER_SECTION_SAMPLING_AUTHORITY_UNQUALIFIED
REDUCER_GRAVITY_OWNERSHIP_AUTHORITY_UNQUALIFIED
REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED
```

The current reducer authority cannot become READY by changing a status string.

## Validation ledger

| Check | Status | Evidence |
|---|---|---|
| Current repository grounding | PASS — SOURCE_INSPECTION | `main=e985b50d...` |
| S4 source classification | PASS — SOURCE_INSPECTION | ten cylinders/end custody only; internal sampling unresolved |
| Fail-closed production readiness | PASS — SOURCE_INSPECTION | 3 blocker families, no current READY path |
| Controlled protocol | PASS — SOURCE_INSPECTION | current-version discriminating experiment defined |
| Engineering evidence contract | PASS_AFTER_HARDENING — SOURCE_INSPECTION | run-level physical custody, controlled pairs, quantitative residuals, unique candidate, independent review |
| Raw-artifact binding | PASS_AFTER_HARDENING — SOURCE_INSPECTION | relative paths + SHA-256 recomputation designed; symlink/path escape rejected |
| Exact code-head S4 workflow | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | run `32693654723`, job `97331702642`, `steps=null` |
| Current-version CAESAR reducer parity | UNRESOLVED | controlled raw observations absent |
| Full LFEA regression | NOT_RUN | repository-wide #54 runner blocker |

No checkout or assertion executed in run `32693654723`; its GitHub conclusion `failure` is not an engineering FAIL and not a PASS.

No benchmark was re-baselined, no engineering tolerance widened, no expected value fitted to CAESAR, and no guard disabled.

## Changed-file ledger — 10 files

| File | Purpose |
|---|---|
| `.github/workflows/lfea-s4-reducer-parity-gate.yml` | S4 prerequisite/evidence workflow |
| `agents/PR1386_workreport.md` | sole living recovery authority |
| `docs/lfea/S4_Reducer_Parity_Protocol_20260824.md` | controlled current-version CAESAR experiment |
| `docs/lfea/S4_Reducer_Parity_Evidence_Package_20260824.md` | operator package layout/raw custody |
| `src/core/linear-fea-reducer-condensation/production-readiness.js` | fail-closed production blockers |
| `src/core/linear-fea-reducer-condensation/index.js` | readiness exports |
| `scripts/lfea-b3.23-reducer-condensation-check.mjs` | internal numerical self-consistency/non-reachability guard |
| `scripts/lfea-s4-reducer-parity-evidence-contract.mjs` | external parity evidence schema/validator |
| `scripts/lfea-s4-reducer-parity-evidence-contract-check.mjs` | contract falsifier fixture |
| `scripts/lfea-s4-reducer-parity-evidence-file-check.mjs` | real evidence JSON + raw-byte/hash verifier |

## Engineering item register

| ID | Type | Severity | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | ISS | high | OPEN_BLOCKS_S4 | Current-version section-sampling rule absent. |
| ISS-002 | ISS | high | OPEN_BLOCKS_S4 | Current-version metal/fluid/insulation gravity authority absent. |
| ISS-003 | ISS | high | OPEN_BLOCKS_S4 | Controlled structural/thermal CAESAR response parity absent. |
| IMP-001 | IMP | high | IMPLEMENTED | Candidate production readiness is fail-closed. |
| IMP-002 | IMP | high | IMPLEMENTED | Controlled parity protocol committed. |
| IMP-003 | IMP | high | IMPLEMENTED | Engineering evidence intake requires quantitative, controlled, independent parity. |
| IMP-004 | IMP | high | IMPLEMENTED | Raw CAESAR files are path-bound and SHA-256 verified at intake. |
| IMP-005 | IMP | medium | DECLARED_CI_NOT_EXECUTED | Workflow covers contract and file intake CLI, but runner fails pre-step. |
| RISK-001 | RISK | high | MITIGATED_BY_GATE | Midpoint candidate cannot be mislabeled exact. |
| RISK-002 | RISK | high | MITIGATED_BY_GATE | Structural ten-cylinder wording cannot become gravity authority. |
| RISK-003 | RISK | high | MITIGATED_BY_CONTRACT | Reviewer declaration cannot manufacture parity. |
| RISK-004 | RISK | high | MITIGATED_BY_FILE_INTAKE | Invented 64-hex strings cannot substitute for retained raw CAESAR bytes. |

## Appendix A — expert takeover questionnaire

1. What does Hexagon's ten-cylinder statement establish, and what does it leave unresolved?
2. Why is gravity authority independent of structural reducer discretization?
3. How do reversed orientations discriminate From-end weight from progressive physical weight?
4. Which non-orientation fields must remain identical in each paired case family?
5. Why are total weight and first moment both necessary?
6. How is a section candidate proven uniquely acceptable under a predeclared tolerance?
7. Which quantitative residuals must be within tolerance before a parity package can be accepted?
8. How are raw CAESAR job/input/output bytes cryptographically bound to each run record?
9. Why does accepted parity evidence still return `reducerExactMechanicsAuthorized=false`?
10. What separate authority/integration step is required after real parity exists?

Takeover threshold: all ten answers must be source- and contract-grounded without guessing undocumented CAESAR behavior.

## Historical record

- Initial audit found the midpoint interpolation rule candidate-only.
- A hypothetical string-only READY path was removed.
- Historical reducer weight evidence exposed gravity as a separate authority problem.
- A controlled CAESAR 14.x protocol and fail-closed readiness gate were added.
- The evidence contract was hardened from declaration-only acceptance to controlled run-level custody, unique in-tolerance candidate selection and quantitative residuals.
- 2026-08-24 continuation added byte-level raw-artifact binding and SHA-256 recomputation plus operator package documentation.
- Hosted Actions continues to fail before step 1 under repository Issue #54.
- No reducer numerical promotion has occurred.
