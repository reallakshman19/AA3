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
MAIN_LAST_CHECKED: 0f85cac384532b5cc35bc24ecedd729275027eb6
ENGINEERING_CODE_HEAD: 7e540e6617decd23e3aec432bb08b81ebbd60a5a
REPORT_BASIS_HEAD: 7e540e6617decd23e3aec432bb08b81ebbd60a5a
CURRENT_STAGE: fail-closed reducer readiness + controlled CAESAR protocol + parity intake + raw SHA256 custody + fail-closed package scaffold
CURRENT_BLOCKER: current-version CAESAR reducer observations do not exist; external execution tracked by Issue #1402
HIGHEST_RISK: inferring section sampling or gravity ownership from the ten-cylinder description, or accepting derivative/self-declared evidence as current-version CAESAR parity
EXACT_NEXT_ACTION: generate an S4 package, run the controlled current-version CAESAR protocol, retain raw files, complete evidence.json, run the file-level checker, obtain independent review
```

## 60-second handover

S4 remains **BLOCKED**.

```text
REDUCER_SEGMENT_COUNT = 10
REDUCER_SAMPLING_RULE = MIDPOINT_LINEAR_INTERPOLATION_CANDIDATE_V1
parityStatus = CANDIDATE_PENDING_SECTION_SAMPLING_VERIFICATION
reducerExactMechanics = false
productionUseAuthorized = false
```

Hexagon establishes ten successively changing cylinders and From/To end-section custody. It does **not** establish the representative station inside each cylinder or reducer gravity ownership. Historical CAEPIPE↔CAESAR evidence suggesting From-end weight is a falsifier only, not current-version authority.

## Governing decisions

### DEC-S4-001 — ten cylinders do not establish section sampling
Do not infer midpoint/start/end/average sampling from the vendor wording.

### DEC-S4-002 — gravity authority is independent of structural discretization
Metal, fluid and insulation ownership/resultant/centroid must each be qualified.

### DEC-S4-003 — orientation is the discriminator
Both `LARGE_TO_SMALL` and `SMALL_TO_LARGE` must preserve all non-orientation state. Structural pairs keep the same load, gravity pairs the same isolated gravity source, and thermal pairs the same thermal state.

### DEC-S4-004 — section-rule selection is quantitative
All six predeclared candidates are compared without fitting. Exactly one must lie inside the predeclared tolerance and all competitors outside it.

### DEC-S4-005 — acceptance requires quantitative residuals
Structural, metal/fluid/insulation gravity, first moment, thermal and code-boundary residuals must all satisfy the predeclared tolerance.

### DEC-S4-006 — raw bytes are source custody
Each run retains safe relative paths to job/input/output files. File intake rejects traversal/symlinks/package escape and recomputes SHA-256.

### DEC-S4-007 — accepted parity evidence cannot authorize production
Successful intake still returns:

```text
status = QUALIFIED_PARITY_EVIDENCE_ONLY
rawArtifactHashesVerified = true
productionUseAuthorized = false
reducerExactMechanicsAuthorized = false
```

### DEC-S4-008 — scaffold is deliberately non-evidence
`scripts/lfea-s4-reducer-parity-evidence-template.mjs` creates the full run inventory but emits `DRAFT_NOT_QUALIFIED`, unresolved hashes/results/decisions/review and refuses overwrite.

### DEC-S4-009 — source audit confirms experiment discrimination
The current protocol's strong taper plus forward/reverse runs remains suitable to distinguish From-end, To-end and progressive gravity rules. A progressive physical integration is orientation-invariant in total mass; pure From/To ownership is deliberately orientation-dependent. First moment is retained as an independent resultant-location discriminator. No production or contract change was justified by this audit.

## Required CAESAR evidence

Both orientations are required for:

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

Also retain a same-orientation `CODE_SIF_BASELINE / CODE_SIF_VARIED` control pair.

Candidate section rules:

```text
MIDPOINT_LINEAR_INTERPOLATION
START_STATION_LINEAR_INTERPOLATION
END_STATION_LINEAR_INTERPOLATION
NODE_AVERAGE_OR_TRAPEZOIDAL_EQUIVALENT
FROM_SECTION_ALL_TEN
TO_SECTION_ALL_TEN
```

## Operator package

External execution tracker: Issue #1402.

```text
node scripts/lfea-s4-reducer-parity-evidence-template.mjs /path/to/new-package
node scripts/lfea-s4-reducer-parity-evidence-file-check.mjs /path/to/new-package/evidence.json
```

The first command generates a draft scaffold only. Controlled CAESAR observations, raw source bytes, predeclared tolerance and independent review remain mandatory.

## Production readiness blockers

```text
REDUCER_SECTION_SAMPLING_AUTHORITY_UNQUALIFIED
REDUCER_GRAVITY_OWNERSHIP_AUTHORITY_UNQUALIFIED
REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED
```

The current v1 reducer authority cannot become READY by changing a status string.

## Validation ledger

| Check | Status | Evidence |
|---|---|---|
| Current main | PASS — SOURCE_INSPECTION | `0f85cac3...`; PR #1403 is EMP.1 presentation/e2e only, no identified S4 overlap |
| S4 source classification | PASS — SOURCE_INSPECTION | ten cylinders/end custody only; sampling/gravity unresolved |
| Fail-closed readiness | PASS — SOURCE_INSPECTION | three independent blockers; no current READY path |
| Controlled protocol | PASS — SOURCE_INSPECTION | strong taper + forward/reverse discrimination |
| S4 discriminator audit | PASS — SOURCE_INSPECTION | no non-discriminating state identified; first moment retained independently |
| Evidence contract | PASS_AFTER_HARDENING — SOURCE_INSPECTION | controlled pairs, unique candidate, quantitative residuals, review |
| Raw artifact binding | PASS_AFTER_HARDENING — SOURCE_INSPECTION | safe relative paths + SHA-256 recomputation |
| Fail-closed scaffold | PASS — SOURCE_INSPECTION | complete inventory, `DRAFT_NOT_QUALIFIED`, no overwrite |
| Hosted S4 engineering check | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | engineering head `7e540e66...`; runner remains pre-step blocked under #54 |
| Current-version CAESAR reducer parity | UNRESOLVED | Issue #1402 |
| Production S4 promotion | BLOCKED | `reducerExactMechanics=false` |

No benchmark was re-baselined, no tolerance fitted/widened, no expected value changed to match CAESAR, and no guard was weakened.

## Changed-file ledger — 11 files

| File | Purpose |
|---|---|
| `.github/workflows/lfea-s4-reducer-parity-gate.yml` | S4 prerequisite/evidence/scaffold workflow |
| `agents/PR1386_workreport.md` | sole living recovery authority |
| `docs/lfea/S4_Reducer_Parity_Protocol_20260824.md` | controlled current-version experiment |
| `docs/lfea/S4_Reducer_Parity_Evidence_Package_20260824.md` | operator package/raw custody |
| `src/core/linear-fea-reducer-condensation/production-readiness.js` | fail-closed production blockers |
| `src/core/linear-fea-reducer-condensation/index.js` | readiness exports |
| `scripts/lfea-b3.23-reducer-condensation-check.mjs` | numerical self-consistency/non-reachability guard |
| `scripts/lfea-s4-reducer-parity-evidence-contract.mjs` | external parity validator |
| `scripts/lfea-s4-reducer-parity-evidence-contract-check.mjs` | contract falsifier fixture |
| `scripts/lfea-s4-reducer-parity-evidence-file-check.mjs` | real evidence/raw-byte verifier |
| `scripts/lfea-s4-reducer-parity-evidence-template.mjs` | fail-closed package scaffold |

## Engineering item register

| ID | Type | Severity | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | ISS | high | OPEN_BLOCKS_S4 | Current-version section-sampling rule absent. |
| ISS-002 | ISS | high | OPEN_BLOCKS_S4 | Current-version metal/fluid/insulation gravity ownership absent. |
| ISS-003 | ISS | high | OPEN_BLOCKS_S4 | Controlled structural/thermal CAESAR parity absent. |
| IMP-001 | IMP | high | IMPLEMENTED | Candidate production readiness fail-closed. |
| IMP-002 | IMP | high | IMPLEMENTED | Controlled protocol + evidence contract + raw-byte intake. |
| IMP-003 | IMP | medium | IMPLEMENTED | Fail-closed scaffold generation. |
| RISK-001 | RISK | high | MITIGATED_BY_GATE | Midpoint candidate cannot be mislabeled exact. |
| RISK-002 | RISK | high | MITIGATED_BY_GATE | Ten-cylinder structural wording cannot become gravity authority. |
| RISK-003 | RISK | high | MITIGATED_BY_CONTRACT | Self-declared reviewer/derivative data cannot alone authorize production. |

## Appendix A — expert takeover questionnaire

1. What exactly does Hexagon's ten-cylinder statement establish and omit?
2. Why is reducer gravity authority separate from structural discretization?
3. How do reversed orientations discriminate From/To ownership from progressive physical integration?
4. Why must total weight and first moment both be retained?
5. Which non-orientation fields must remain controlled in structural/gravity/thermal pairs?
6. How is a section rule uniquely accepted without fitting?
7. Which residual families must pass the predeclared tolerance?
8. How are raw CAESAR bytes bound to derivative evidence?
9. Why does accepted parity evidence still leave `reducerExactMechanics=false`?
10. What separate authority/integration action is required after real parity exists?

Takeover threshold: answers must be source/contract grounded without guessing undocumented CAESAR behavior.

## Historical summary

- Midpoint section sampling remains candidate-only.
- Historical reducer-weight evidence exposed gravity as a separate authority problem.
- Controlled current-version CAESAR protocol, quantitative intake, SHA-256 raw custody and fail-closed scaffolds were added.
- 2026-08-24 source audit found no equivalent Q5-style discriminator defect in S4; forward/reverse + first-moment design remains appropriate.
- Main re-grounded at `0f85cac3...`; unrelated PR #1403 does not alter S4 authority.
- Issue #1402 owns external CAESAR execution; Issue #54 blocks hosted runtime execution.
- No reducer numerical promotion has occurred.
