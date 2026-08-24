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
MAIN_HEAD_LAST_CHECKED: e985b50d81d0d241db27313562c8cc12cd7cc27d
MERGE_BASE: a5aa16af7b4298427ea6b4aac0ced05ff801ed1c
APPENDIX_A_STATUS: PASS 96/100
CURRENT_STAGE: independent shell B4-1/B4-2/B4-3 production validation
CURRENT_BLOCKER: hosted visible-workbench jobs fail before checkout with steps=null
HIGHEST_RISK: first exact production execution may expose a real DKT/source-sign or local-frame discrepancy; frozen source values must not move to clear it
EXACT_NEXT_ACTION: execute the three retained shell benchmark/product commands on an exact PR head; if one fails, isolate the first mechanics boundary without changing frozen values or tolerances.
```

## Mission

Freeze independent LAFEA.4 benchmark authority before production observation, then require the current `CST_DKT_TRI3_THIN_SHELL_V1` production kernel to be compared against those frozen values. This PR is validation-only and grants no release authority.

Issue: #1371.

## Current route trace

```text
B4 frozen JSON definitions
→ scripts/lafea-shell-independent-benchmark-freeze-check.mjs
  (Node built-ins only; no production FEM imports)
→ scripts/lafea4-shell-independent-benchmark-check.mjs
  (reads frozen targets and executes current production kernel)
→ createCanonicalLocalShellModel(...)
→ calculateLocalShell(...)
→ retained LOCAL_SHELL_RESULT fields
→ frozen tolerance comparison
→ scripts/lafea-shell-response-acceptance-check.mjs
→ existing visible-workbench shell qualification
```

The oracle and production-comparison modules remain separate. B4-3 source/sign/tolerance authority was frozen from the primary publication before the production comparator was made to execute that case. No production B4-3 result has been observed in this PR because hosted jobs still fail before checkout.

## Source authority / benchmark authority

### B4-1 — membrane patch

Frozen analytical definition:

- rectangle `120 × 70 mm`, two triangles E1/E2;
- `E = 210000 MPa`, `ν = 0.27`, `t = 3.2 mm`;
- `εx = 0.0008`, `εy = -0.00015`, `γxy = 0.00035`;
- expected `σx = 172.0364577715457 MPa`, `σy = 14.949843598317337 MPa`, `τxy = 28.937007874015745 MPa`;
- expected bending resultant and applied force/moment resultant = zero.

### B4-2 — pure bending patch

Frozen analytical definition:

- same geometry/material;
- `κx = 8e-5 1/mm`, `κy = κxy = 0`;
- `Mx = 49.48247222521844 N`, `My = 13.360267500808979 N`, `Mxy = 0`;
- top `σx = 28.993636069463925 MPa`, `σy = 7.82828173875526 MPa`; bottom opposite;
- membrane strain expected zero.

Expected global analytical tensors are transformed into each retained canonical element local frame before comparison.

### B4-3 — primary published DKT reference

Source blocker is resolved by a primary formulation-reference publication:

```text
authors = Jean-Louis Batoz; Klaus-Jurgen Bathe; Lee-Wing Ho
title   = A study of three-node triangular plate bending elements
journal = International Journal for Numerical Methods in Engineering
volume  = 15(12), 1771–1812 (1980)
doi     = 10.1002/nme.1620151205
source  = publisher DOI + MIT author-hosted paper copy
```

Exact source locations retained in the benchmark definition:

- Figure 2, printed page 1777 — positive `z,w`, rotation directions and DKT curvature convention;
- §4.2.2, printed page 1793 — twisting-square problem and exact thin-plate solution;
- Figure 16, printed page 1797 — geometry/material/load, four-triangle DKT mesh (b), DKT table and exact values.

Frozen source facts in canonical units:

```text
plate              = 203.2 × 203.2 × 25.4 mm
E                  = 68.94757293168361 MPa
nu                 = 0.3
published supports = UZ(A)=UZ(B)=UZ(D)=0
corner C load      = FZ = -22.2411080763025 N
mesh               = Figure-16 mesh (b), 4 DKT triangles around center O
UZ(O)              = -1.58496 mm
UZ(C)              = -6.33984 mm
Mx = My            = 0
Mxy                = +11.12055403815125 N everywhere
```

The source figure gives positive deflection magnitudes for a downward load while Figure 2 defines positive `w` upward. The frozen production mapping therefore uses negative `FZ/UZ`; the paper's positive twisting resultant remains positive. `src/core/local-shell/dkt.js` uses the same curvature vector convention `[thetaY,x, -thetaX,y, thetaY,y - thetaX,x]`.

The current shell has five DOFs while the published DKT plate is bending-only. Three explicitly non-physical constraints `A/UX`, `A/UY`, `B/UX` remove only the unloaded flat membrane rigid-body nullspace. They grant no support authority and the comparator requires near-zero membrane strain and in-plane displacement.

Frozen tolerances are source-precision-derived, not production-fit:

```text
UZ probe absolute tolerance = 0.000127 mm
moment absolute tolerance   = 0.0000222411080763025 N
```

These are one-half of the last displayed source digit after exact unit conversion.

### Independent diagnostic reconstruction

A separate mathematical reconstruction of the four-triangle DKT equations using the published inputs and the repository-documented curvature convention reproduced, to floating-point roundoff:

```text
UZ(C)  = -6.339840000000004 mm
UZ(O)  = -1.584960000000001 mm
Mx, My ≈ 0
Mxy    = 11.1205540 N at every integration point
```

Classification: `PASS_SOURCE_ORACLE_SANITY`, not production PASS. It does not replace execution of the repository Node comparator.

## Independent oracle classification

| Asset | Oracle class | Production FEM imported by oracle? | State |
|---|---|---:|---|
| B4-1 JSON + freeze checker | FROZEN_ANALYTICAL | no | frozen |
| B4-2 JSON + freeze checker | FROZEN_ANALYTICAL | no | frozen |
| B4-3 JSON + freeze checker | FROZEN_PRIMARY_PUBLISHED_REFERENCE | no | frozen / source-qualified |
| `lafea4-shell-independent-benchmark-check.mjs` | PRODUCTION_COMPARATOR consuming frozen oracles | yes, intentionally | encoded / NOT_RUN |
| shell product regressions | IMPLEMENTATION_COUPLED / PRODUCT_REGRESSION | yes | separate authority |

## Changed-file ledger

- `validation/lafea-shell/B4-1-membrane-patch-v1.json` — frozen analytical membrane oracle;
- `validation/lafea-shell/B4-2-pure-bending-patch-v1.json` — frozen analytical bending oracle;
- `validation/lafea-shell/B4-3-reference-problem-v1.json` — frozen primary published DKT twisting-plate reference;
- `validation/lafea-shell/frozen-definition-manifest-v1.json` — freeze/source/anti-circularity custody;
- `scripts/lafea-shell-independent-benchmark-freeze-check.mjs` — production-independent source/oracle validation;
- `scripts/lafea4-shell-independent-benchmark-check.mjs` — production-vs-frozen B4-1/B4-2/B4-3 comparator;
- `scripts/lafea-shell-response-acceptance-check.mjs` — fail-closed ordering: freeze → production comparison → product response;
- this work report.

Protected unchanged: `src/core/local-shell/**`, shell formulation/stiffness/recovery, mesh thresholds, continuum oracles, browser specs, workflow YAML, registry authority and release authority.

## Validation matrix

| Check | Status | Observation | Oracle |
|---|---|---|---|
| B4-1/B4-2 freeze/source inspection | PASS | definitions remain frozen; no production-derived targets | FROZEN_ANALYTICAL |
| B4-3 primary-source qualification | PASS_SOURCE_INSPECTION | DOI + exact Figure 2 / §4.2.2 / Figure 16 source locations and values retained | PRIMARY_PUBLISHED_REFERENCE |
| B4-3 independent DKT source sanity reconstruction | PASS_SOURCE_ORACLE_SANITY | exact published displacement/resultant reproduced independently | PRIMARY_PUBLISHED_REFERENCE |
| `node scripts/lafea-shell-independent-benchmark-freeze-check.mjs` | NOT_RUN | hosted job never reached checkout | FROZEN_ANALYTICAL + PRIMARY_PUBLISHED_REFERENCE |
| `node scripts/lafea4-shell-independent-benchmark-check.mjs` | NOT_RUN | encoded/chained; hosted job never reached checkout | frozen targets + production comparator |
| `node scripts/lafea-shell-response-acceptance-check.mjs` | NOT_RUN | hosted job never reached checkout | PRODUCT_REGRESSION after benchmark gate |
| Chromium/product suite | NOT_RUN | exact-head run `32683891488`, job `97305296145`, `steps=null` | PRODUCT_REGRESSION |

No encoded-but-unexecuted check is represented as PASS.

## Main-drift audit

Live main = `e985b50d81d0d241db27313562c8cc12cd7cc27d`. Before this B4-3 source update PR1388 was four commits behind current main, all unrelated EMP.1 history; compare inspection found no LAFEA numerical/file authority overlap and GitHub reported the PR mergeable. Re-check AD-01 before merge; do not rebase solely to absorb unrelated history.

## ISS / RISK / DEC / QST

- `ISS-1371A-01` RESOLVED_BY_IMPLEMENTATION_PENDING_EXECUTION — B4-1/B4-2 analytical definitions and comparator exist.
- `ISS-1371A-02` RESOLVED_BY_IMPLEMENTATION_PENDING_EXECUTION — production-vs-frozen B4 gate is fail-closed before product response acceptance.
- `QST-1371A-01` RESOLVED_SOURCE_AUTHORITY_PENDING_EXECUTION — B4-3 now has a primary published DKT reference; no synthetic value remains.
- `DEC-1371A-01` — global analytical/reference tensors are transformed into retained element local frames before comparison.
- `DEC-1371A-02` — B4-3 source table deflections are magnitudes; signed production mapping follows Figure-2 positive-w and Figure-16 downward-load conventions.
- `DEC-1371A-03` — auxiliary in-plane constraints stabilize only the five-DOF shell's uncoupled membrane rigid-body nullspace and are not physical benchmark supports.
- `RISK-1371A-01` ACTIVE — first real production comparison may expose a sign/local-frame/recovery discrepancy; do not alter the frozen oracle to clear it.
- `RISK-1371A-02` CONTROLLED — source/oracle checker imports only Node built-ins and remains separate from production comparator.

## Failure isolation if B4 comparison fails

```text
SOURCE / UNITS / SIGN
GEOMETRY / TOPOLOGY
ELEMENT LOCAL FRAME
PRESCRIBED / SUPPORT DOF MAPPING
MEMBRANE STABILIZATION LEAKAGE
DKT CURVATURE / BENDING FORMULATION
RECOVERY / RESULTANT SIGN
EQUILIBRIUM / REACTION
BENCHMARK / ORACLE
```

Do not mutate multiple mechanics, frozen targets or tolerances in one fix.

## EXACT_NEXT_ACTION

Run on the exact PR head:

```bash
node scripts/lafea-shell-independent-benchmark-freeze-check.mjs
node scripts/lafea4-shell-independent-benchmark-check.mjs
node scripts/lafea-shell-response-acceptance-check.mjs
```

Then record actual outputs. Do not update registry wording or mark shell independent numerical qualification PASS until exact-head production execution succeeds.

# Appendix A — takeover qualification

`PASS 96/100`; A1–A5 remain above the issue minimum. The new B4-3 authority is primary published-source validation and does not widen production/release authority.
