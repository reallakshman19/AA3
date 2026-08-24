# PR1388 — Issue #1371 PR-A independent shell benchmark freeze

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: BLOCKED_BY_HOSTED_RUNNER_INFRASTRUCTURE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: Issue #1371
PR_OR_WIP: PR1388
BRANCH: agent/issue-1371-pr-a-shell-freeze-20260823
PR_HEAD_OBSERVED: 4eeb1d2699ace0caf1166b31e3eed26a04c0cbbe
MAIN_HEAD_LAST_CHECKED: 1176f66eb94686f99d4f302930d46f17ff876083
MERGE_BASE: a5aa16af7b4298427ea6b4aac0ced05ff801ed1c
APPENDIX_A_STATUS: PASS 96/100
CURRENT_STAGE: independent shell benchmark execution validation
CURRENT_BLOCKER: hosted visible-workbench job fails before checkout with steps=null
HIGHEST_RISK: production B4 comparison may reveal a sign/local-frame/recovery discrepancy once a runner actually executes
EXACT_NEXT_ACTION: execute node scripts/lafea4-shell-independent-benchmark-check.mjs on an exact PR head; if it fails, isolate the first mechanics boundary without changing frozen definitions or tolerances.
```

## Mission

Freeze independent LAFEA.4 analytical benchmark authority before production observation, then require the current CST+DKT production kernel to be compared against those frozen values. This PR is validation-only and grants no release authority.

Issue: #1371.

## Current route trace

The independent authority chain is intentionally split:

```text
B4 frozen JSON definitions
→ scripts/lafea-shell-independent-benchmark-freeze-check.mjs
  (Node built-ins only; no production FEM imports)
→ scripts/lafea4-shell-independent-benchmark-check.mjs
  (reads frozen targets, builds prescribed patch source, executes current production kernel)
→ createCanonicalLocalShellModel(...)
→ calculateLocalShell(...)
→ retained LOCAL_SHELL_RESULT fields
→ frozen tolerance comparison
→ scripts/lafea-shell-response-acceptance-check.mjs
→ existing visible-workbench shell qualification
```

The production-comparison step was added after the definitions were already frozen. No frozen JSON expected value or tolerance was changed while adding that comparison.

## Source authority / benchmark authority

### B4-1 — membrane patch

Frozen analytical definition:

- rectangle 120 × 70 mm, two triangles E1/E2;
- E = 210000 MPa, ν = 0.27, t = 3.2 mm;
- affine strain: εx = 0.0008, εy = -0.00015, γxy = 0.00035;
- expected stress: σx = 172.0364577715457 MPa, σy = 14.949843598317337 MPa, τxy = 28.937007874015745 MPa;
- expected bending resultant = zero;
- expected applied force/moment resultant = zero.

The production comparison checks retained nodal kinematics, element-local membrane strain/stress after analytical tensor rotation, spurious bending moments, and force/moment equilibrium against the frozen tolerances.

### B4-2 — pure bending patch

Frozen analytical definition:

- same geometry/material;
- κx = 8e-5 1/mm, κy = κxy = 0;
- Mx = 49.48247222521844 N, My = 13.360267500808979 N, Mxy = 0;
- top surface σx = 28.993636069463925 MPa, σy = 7.82828173875526 MPa;
- bottom surface has opposite sign;
- membrane strain expected zero.

The production comparison checks retained nodal kinematics, IP curvature, bending resultants, TOP/BOTTOM bending stress, membrane contamination, and force/moment equilibrium. Expected global analytical tensors are transformed into each canonical element's local frame before comparison; solver canonicalization therefore cannot create a false discrepancy merely by rotating the element axes.

### B4-3 — reference problem

`BLOCKED_SOURCE_REQUIRED`. `expected=null`, `acceptance=null`, and `executionEligible=false`. No published value has been invented or fitted to current production output.

## Independent oracle classification

| Asset | Oracle class | Production FEM imported by oracle? | State |
|---|---|---:|---|
| B4-1 JSON + freeze checker | FROZEN_ANALYTICAL | no | frozen |
| B4-2 JSON + freeze checker | FROZEN_ANALYTICAL | no | frozen |
| B4-3 | PUBLISHED/CONTROLLED SOURCE REQUIRED | no | blocked source |
| `lafea4-shell-independent-benchmark-check.mjs` | PRODUCTION_COMPARATOR consuming frozen oracle | yes, intentionally | encoded / NOT_RUN |
| shell product regressions | IMPLEMENTATION_COUPLED / PRODUCT_REGRESSION | yes | separate authority |

## Changed-file ledger

Current PR intent:

- `validation/lafea-shell/B4-1-membrane-patch-v1.json` — frozen analytical membrane oracle;
- `validation/lafea-shell/B4-2-pure-bending-patch-v1.json` — frozen analytical bending oracle;
- `validation/lafea-shell/B4-3-reference-problem-v1.json` — fail-closed external-source blocker;
- `validation/lafea-shell/frozen-definition-manifest-v1.json` — freeze/anti-circularity custody;
- `scripts/lafea-shell-independent-benchmark-freeze-check.mjs` — source-independent analytical reconstruction;
- `scripts/lafea4-shell-independent-benchmark-check.mjs` — production-vs-frozen comparator;
- `scripts/lafea-shell-response-acceptance-check.mjs` — fail-closed ordering: freeze → production comparison → product response;
- this work report.

Protected unchanged:

- `src/core/local-shell/**`;
- shell stiffness/formulation/recovery/sign conventions;
- mesh-quality thresholds;
- LAFEA.3 B01/B02 oracles;
- TECH-13 shell refinement authority;
- browser specs and workflow YAML;
- registry authority and release authority.

## Validation matrix

```text
STATUS      = PASS | FAIL | NOT_RUN | NOT_APPLICABLE
OBSERVATION = exact command/evidence
ORACLE      = FROZEN_ANALYTICAL | PRODUCT_REGRESSION | IMPLEMENTATION_COUPLED
HEAD_SHA    = exact tested head
```

| Check | Status | Observation | Oracle | Head |
|---|---|---|---|---|
| freeze-definition source inspection / anti-circularity | PASS | repository source inspection; independent checker imports Node built-ins only | FROZEN_ANALYTICAL | 4eeb1d2699ace0caf1166b31e3eed26a04c0cbbe |
| `node scripts/lafea-shell-independent-benchmark-freeze-check.mjs` | NOT_RUN | hosted job never reached checkout | FROZEN_ANALYTICAL | 4eeb1d2699ace0caf1166b31e3eed26a04c0cbbe |
| `node scripts/lafea4-shell-independent-benchmark-check.mjs` | NOT_RUN | encoded and chained; hosted job never reached checkout | FROZEN_ANALYTICAL targets + production comparator | 4eeb1d2699ace0caf1166b31e3eed26a04c0cbbe |
| `node scripts/lafea-shell-response-acceptance-check.mjs` | NOT_RUN | hosted job never reached checkout | PRODUCT_REGRESSION after frozen benchmark gate | 4eeb1d2699ace0caf1166b31e3eed26a04c0cbbe |
| Chromium/product suite | NOT_RUN | run 32676640903 / job 97285890422 concluded failure with `steps=null` | PRODUCT_REGRESSION | 4eeb1d2699ace0caf1166b31e3eed26a04c0cbbe |

No encoded-but-unexecuted check is represented as PASS.

## Main-drift audit

Live main remains `1176f66eb94686f99d4f302930d46f17ff876083`. PR1388 is three unrelated EMP.1 source-boundary commits behind its merge base. Compare inspection found no exact-file, shell formulation, benchmark-oracle, or LAFEA numerical-authority overlap. GitHub reports the PR mergeable. Do not rebase merely to absorb unrelated EMP.1 drift without another overlap audit.

## ISS / RISK / DEC / QST

- `ISS-1371A-01` RESOLVED_BY_IMPLEMENTATION_PENDING_EXECUTION — frozen B4-1/B4-2 independent definitions now exist.
- `ISS-1371A-02` RESOLVED_BY_IMPLEMENTATION_PENDING_EXECUTION — production-vs-frozen B4 comparison is now separately executable and fail-closed before product response acceptance.
- `RISK-1371A-01` ACTIVE — first actual production comparison may expose element sign/local-frame/recovery disagreement; do not alter oracle to clear it.
- `RISK-1371A-02` CONTROLLED — oracle and production comparator are separate modules and expected values are not generated by production.
- `QST-1371A-01` OPEN / HARD SOURCE GATE — B4-3 needs a source-qualified published or controlled reference problem.
- `DEC-1371A-01` — analytical tensors are frozen in global patch axes; comparator transforms expected tensors into each retained canonical element local frame before field-by-field comparison.

## Failure isolation if B4 comparison fails

Classify the first wrong boundary only:

```text
SOURCE / UNITS
GEOMETRY / TOPOLOGY
ELEMENT LOCAL FRAME / SIGN
PRESCRIBED DOF MAPPING
MEMBRANE FORMULATION
DKT CURVATURE / BENDING FORMULATION
RECOVERY / SURFACE SIGN
EQUILIBRIUM / REACTION
BENCHMARK / ORACLE
```

Do not change multiple mechanics, the frozen target, or tolerance in one fix. A mismatch in only the diagonal triangle should first falsify/confirm the local-frame transform, not the shell formulation generally.

## Highest remaining risk

The production comparator has not executed because hosted runners are failing before checkout. Its first real execution is a hard engineering observation point. If it contradicts the frozen analytical values, stop and isolate the first wrong field before any production mutation.

## EXACT_NEXT_ACTION

Run on the exact PR head:

```bash
node scripts/lafea-shell-independent-benchmark-freeze-check.mjs
node scripts/lafea4-shell-independent-benchmark-check.mjs
node scripts/lafea-shell-response-acceptance-check.mjs
```

Then record actual outputs. Do not update registry wording or mark shell independent numerical qualification PASS until this executes successfully.

# Appendix A — takeover qualification

`PASS 96/100`; all A1–A5 remained above the issue minimum. The implementation trace, authority model, independent-oracle distinction, and minimal validation-only patch remain unchanged by this follow-up. No production mechanics or oracle values were mutated.
