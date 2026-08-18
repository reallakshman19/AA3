# PR1249 — TECH-13 H/I/J Stacked Qualification on Bundle Prerequisite

# CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY_WITH_INHERITED_ENGINEERING_BLOCKERS
REPOSITORY: reallaksh19/Advanced_Analysis
PR: #1249 (draft, open, unmerged)
BRANCH: agent/lafea4-tech13-hij-after-bundle-prereq-20260818
STACK_BASE_PR: #1248
STACK_BASE_SHA: eb2d78240610cff7ec37e37e99e2974386710a92
SOURCE_TECH13_PR: #1246
SOURCE_TECH13_SHA: 371d1d02e2700898d9ed26b498fe883ed741c9d5
CURRENT_HEAD_BEFORE_THIS_WORKREPORT_UPDATE: a18c0c22409eb7732e6e59aecd414f1ec95aa709
CURRENT_CODE_TREE_EQUIVALENT_TO: be80ae309db0f23b43e4995ce297d274bea37644
EXECUTION_MODE: MANUAL
MUTATION_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY
CURRENT_STAGE: INHERITED_B01_B02_BLOCKER_CUSTODY_AND_TECH13_QUALIFICATION
TRUST_ROOT: NULL
PRODUCT_RETENTION_AUTHORIZED_NOW: false
UI_BINDING_AUTHORIZED_NOW: false
RELEASE_QUALIFIED: false
PRODUCTION_BUNDLE_CEILING: 1179648 B
BUNDLE_BUILD_STATE: PASS on retained code-equivalent head be80ae30...
BROWSER_STATE: PASS on retained code-equivalent head be80ae30...
B01_STATE: FAIL — T6/L3/NU=0.4999/REGULAR misses frozen internal PCG target
B02D_STATE: FAIL-CLOSED V1 — frozen T3 coarse mesh violates hard quality gate
TECH13_H_DEDICATED_EXACT_HEAD: NOT_OBSERVED on retained final code tree
TECH13_I_DEDICATED_EXACT_HEAD: NOT_OBSERVED on retained final code tree
TECH13_J_DEDICATED_EXACT_HEAD: NOT_OBSERVED on retained final code tree
EXACT_NEXT_ACTION: do not weaken B01 solver policy or mutate frozen B02D V1. Keep PR1249 draft. Treat B01 numerical repair and any B02D V2 redesign as separate prerequisite engineering work. On the final PR1249 code tree, run the existing TECH-13 H/I/J + canonical exact-head qualification surfaces and record inherited blockers separately from TECH-13 semantic results. No merge without owner authorization.
```

## Handover in 60 Seconds

PR #1249 is the stacked TECH-13 H/I/J qualification carrier above #1248. The earlier bundle-size blocker is no longer the governing issue: production and standalone builds, shell custody, and real Chromium execution have been observed PASS on exact head `be80ae309db0f23b43e4995ce297d274bea37644`.

The current blocker is inherited engineering qualification, not TECH-13 authority logic:

1. **B01 near-incompressible sparse PCG** still fails the qualified `/10` internal convergence target for T6/L3/ν=0.4999/REGULAR at the frozen 42,560-iteration cap. Arithmetic-only repairs reduced the exact residual from about `1.97906e-8` to `4.627509042620659e-9`, but the frozen target is `2.102108772439442e-9`. Do not loosen the target, increase the cap, change Jacobi identity, or alter the reliable-update policy inside PR1249.
2. **B02D V1 T3 coarse polar mesh** is frozen before observation and hard-blocks mesh quality (`min angle ≈ 9.736093°`, `SJ ≈ 0.169110`, `AR ≈ 5.911`; hard SJ floor = 0.2). `T3=CONTROL` does not authorize bypassing a hard mesh-quality gate. A geometry redesign must be prospectively frozen as a separate V2, not patched into V1 after observation.
3. **TECH-13 H/I/J** remains dormant: trust root NULL, product retention/UI binding/release false. Dedicated H/I/J exact-head execution still needs to be observed on the retained final code tree independently of the inherited B01/B02 gate.

Current branch head `a18c0c22...` is two commits ahead of `be80ae30...` but has **no file differences** versus it: `749289cc...` tested compensated PCG `Ap` and worsened the residual; `a18c0c22...` forward-reverted that experiment by restoring the `be80ae30...` tree.

## Mission / Scope

Qualify the actual combined tree of:

```text
PR #1248 bundle prerequisite
  + TECH-13H retained refinement authority
  + TECH-13I promotion-bound replay custody
  + TECH-13J implementation-currentness fingerprint
```

This PR is **not** authority to redesign the B01 solver, change B02 frozen benchmark geometry, activate the TECH-13 trust root, or broaden release scope.

### Scope correction recorded 2026-08-18

During stacked qualification, inherited B01/B02 failures surfaced before TECH-13 could be treated as merge-ready. B01 arithmetic experiments were performed on this branch only to isolate whether the inherited failure was a bounded finite-precision defect. The retained B01 arithmetic changes are prerequisite engineering work, not TECH-13 H/I/J semantics. They must be split/adopted through a dedicated qualified prerequisite path before PR1249 can receive a merge-ready disposition.

## Protected Invariants

- trust root remains `null`;
- `productRetentionAuthorized=false`;
- `uiBindingAuthorized=false`;
- `releaseQualified=false`;
- no CST/DKT formulation change;
- no element constitutive/B-bar formulation change;
- no solver tolerance change;
- PCG internal target remains `freeDofResidualTolerance / 10`;
- PCG iteration cap remains `min(50000, max(1000, 16*N))`;
- Jacobi preconditioner identity unchanged;
- exact residual check cadence remains every 100 iterations plus recursive-target checks;
- reliable recurrence restart remains governed by the existing policy;
- adjacent size ratio max 1.5 unchanged;
- AR warning/block 5/10 unchanged;
- SJ warning/block 0.5/0.2 unchanged;
- parent-normal mathematics unchanged;
- TECH-13E frozen oracle/stress criteria unchanged;
- production hard ceiling remains exactly 1,179,648 B;
- B02D V1 frozen definition is not rewritten after observation;
- no merge without explicit owner authorization.

## Current Implementation Ground Truth

### TECH-13 stack

The branch contains the H/I/J stack above #1248, including retained-refinement authority, promotion-bound replay custody, implementation-currentness fingerprinting, and the corrected canonical TECH-13 plan that includes H/I/J/currentness checks. Trust-root activation remains absent.

### Retained B01 numerical changes on the current code tree

The retained code-equivalent tree `be80ae30...` contains bounded finite-precision repairs:

- compensated PCG scalar products already present before this repair sequence;
- compensated accumulation of the PCG solution vector `x += alpha*p`;
- compensated accumulation of the recursive residual `r -= alpha*Ap`, with compensation reset when the existing reliable-update policy replaces the residual with an exact residual;
- compensated CSR row summation used by PCG's authoritative `exactResidual()` evaluation;
- PCG recurrence `Ap` remains on the original raw CSR matrix-vector product after the compensated-`Ap` experiment worsened the governing residual;
- sparse stiffness assembly remains original after its compensation experiment worsened the governing residual.

No tolerance, cap, preconditioner, formulation, matrix entries, or benchmark expected values were changed.

## B01 Numerical Repair Ledger

Frozen governing case throughout:

```text
elementType: T6
levelId: L3
poissonRatio: 0.4999
distortionId: REGULAR
free-system size: 2660 DOF (42560 / 16)
iterationLimit: 42560
public free-DOF acceptance gate: 2.102108772439442e-8
qualified internal PCG target:   2.102108772439442e-9
preconditioner: JACOBI
```

| Candidate | Exact head | Governing exact residual | Disposition |
|---|---|---:|---|
| scalar-compensated PCG baseline | `b7fb7c7d...` | `1.97906e-8` | baseline / retained predecessor |
| compensated CSR `Ap` + exact matvec globally | `fba6f634...` | `2.29338e-8` | REJECTED / reverted |
| compensated sparse stiffness assembly | `4c71d1bc...` | `2.6775524020195007e-8` | REJECTED / reverted |
| compensate solution accumulation `x` | `a4347472...` | `1.0710209608078003e-8` | RETAINED |
| compensate recursive residual `r` | `ff5135de...` | `5.587935447692871e-9` | RETAINED |
| compensated two-term direction update | `30a5bca5...` | `5.587935447692871e-9` | NEUTRAL / removed |
| compensated authoritative exact-residual CSR rows | `be80ae30...` | `4.627509042620659e-9` | RETAINED provisionally |
| compensated recurrence `Ap` | `749289cc...` | `7.821654435247183e-9` | REJECTED |
| forward revert to best tree | `a18c0c22...` | code tree = `be80ae30...` | CURRENT CODE TREE |

The arithmetic-only programme improved the governing exact residual by about 76.6% versus the `1.97906e-8` baseline, but B01 still FAILs because `4.627509042620659e-9 > 2.102108772439442e-9`.

### B01 stopping rule

Do **not** continue by casually adding symmetric scaling/equilibration, iterative refinement after PCG, a different preconditioner, a higher cap, or a relaxed target inside PR1249. Those are larger solver-algorithm changes and require a separately declared/qualified engineering boundary with independent evidence.

## B02D Frozen-V1 RCA / Disposition

The registered B02D production route uses `B02D_PROBE_STABLE_POLAR_POLICY_V1`. The frozen definition was established before production observation and binds:

- circumferential `backgroundBaseDivisions = 16`;
- radial `backgroundBaseDivisions = 6`;
- T3/T6 topology = two CCW triangles per polar cell;
- Q8 topology = one serendipity quad per cell;
- method applicability: T3 `CONTROL`, T6 `REQUIRED`, Q8 `REQUIRED`.

Observed coarse T3 geometry under the frozen V1 definition is approximately:

```text
minimum angle      9.736093 deg
scaled Jacobian    0.169110
maximum AR         5.911
hard SJ block      0.2
asin(0.2)          11.536959 deg
```

A 16→20 circumferential redesign was quantitatively capable of clearing the hard floor in a reconstruction, but it is **inadmissible as a V1 repair** because it changes a frozen-before-observation definition. Do not mutate V1 or reinterpret `CONTROL` as permission to hard-fail quality. Any redesign must be a prospectively frozen B02D V2 in a separate engineering PR.

## Validation Ledger

Validation entries distinguish engineering result from infrastructure state.

### VAL-1249-STACK-01 — PASS
- Observation: SOURCE_INSPECTION + GIT_GRAPH_INSPECTION
- Oracle: NONE
- #1249 remains stacked on #1248 and contains the H/I/J layer above the bundle prerequisite.

### VAL-1249-BUNDLE-01 — PASS
- Observation: REMOTE_EXECUTION
- Oracle: IMPLEMENTATION_COUPLED
- Exact retained code head: `be80ae309db0f23b43e4995ce297d274bea37644`
- Standalone build PASS.
- Production Pages bundle build PASS under unchanged 1,179,648 B ceiling.
- Earlier 1,192,803 B / +13,155 B bundle failure is superseded by later exact-head PASS evidence.

### VAL-1249-BROWSER-01 — PASS
- Observation: REMOTE_EXECUTION
- Oracle: IMPLEMENTATION_COUPLED + REAL_BROWSER_OBSERVATION
- Exact retained code head: `be80ae30...`
- Visible-workbench run: `32116365934`, job `95646662061`.
- Real Stage-17 Chromium execution PASS.
- Production-shell Chromium execution PASS.
- Workflow remained red only because the pre-browser engineering B01/B02 gate was intentionally preserved after browser observation.

### VAL-1249-B01-METAMORPHIC-01 — PASS
- Observation: REMOTE_EXECUTION
- Oracle: INDEPENDENT_REPRODUCTION / FROZEN MATRIX
- Exact retained code head: `be80ae30...`
- Run `32116366235`.
- Registered 54-case base matrix reconfirmed PASS before the 270-case metamorphic matrix.
- 270-case metamorphic matrix PASS.

### VAL-1249-B01-FAILCLOSED-01 — PASS
- Observation: REMOTE_EXECUTION
- Oracle: FROZEN GOVERNED NEGATIVE MATRIX
- Exact retained code head: `be80ae30...`
- Run `32116366025`.
- Registered base + metamorphic controls reconfirmed before negative matrix.
- 16-case fail-closed matrix PASS.

### VAL-1249-B01-EXACT-01 — FAIL
- Observation: REMOTE_EXECUTION
- Oracle: ANALYTICAL + AUTHORITATIVE_REFERENCE + FROZEN PRODUCTION MATRIX
- Exact head: `be80ae309db0f23b43e4995ce297d274bea37644`
- Run `32116366000`, job `95646662299`.
- Exact-head/clean-tree check PASS.
- ν=0.3 four-level Lamé diagnostic PASS.
- Integrated B01 driver FAIL.
- Governing first failure: T6/L3/ν=0.4999/REGULAR.
- Exact residual `4.627509042620659e-9` > internal target `2.102108772439442e-9` after 42,560 iterations.
- Public acceptance gate remains `2.102108772439442e-8`; it was not weakened.

### VAL-1249-B01-AP-EXPERIMENT-01 — FAIL / REJECTED CANDIDATE
- Observation: REMOTE_EXECUTION
- Exact head: `749289ccffa4877aaf8274f93de99ed681777deb`
- Exact-head run `32117229397`, job `95649379855`, retained artifact ID `9317360454`.
- Metamorphic run `32117229394`: PASS.
- Fail-closed run `32117229411`: PASS.
- Governing residual worsened to `7.821654435247183e-9`.
- Candidate forward-reverted by `a18c0c22409eb7732e6e59aecd414f1ec95aa709`.

### VAL-1249-B02D-01 — FAIL-CLOSED / INHERITED QUALIFICATION DEBT
- Observation: SOURCE_INSPECTION + REMOTE_GATE_OBSERVATION
- Oracle: FROZEN BENCHMARK DEFINITION + HARD MESH-QUALITY POLICY
- Frozen V1 T3 coarse polar mesh violates hard quality gate.
- No threshold relaxation or post-observation V1 geometry mutation authorized.
- Separate V2 qualification programme required.

### VAL-1249-H-01 — NOT_RUN / NOT_OBSERVED
Dedicated `lafea-tech13h-retained-refinement-authority-check.mjs` has not yet been directly observed on the final retained code tree after the inherited prerequisite repair sequence.

### VAL-1249-I-01 — NOT_RUN / NOT_OBSERVED
Dedicated `lafea-tech13i-promoted-refinement-roundtrip-check.mjs` has not yet been directly observed on the final retained code tree after the inherited prerequisite repair sequence.

### VAL-1249-J-01 — NOT_RUN / NOT_OBSERVED
Dedicated `lafea-tech13j-implementation-currentness-check.mjs` has not yet been directly observed on the final retained code tree after the inherited prerequisite repair sequence.

### VAL-1249-TECH13-EXACT-HEAD-01 — NOT_RUN / NOT_OBSERVED
Canonical TECH-13 exact-head runner/verifier has not yet been directly observed on the final retained code tree after the inherited prerequisite repair sequence.

## Active Engineering Items

### ISS-1249-01 — B01 near-incompressible sparse-PCG convergence
- Status: OPEN / inherited blocker.
- Falsifier: frozen T6/L3/ν=0.4999/REGULAR production case.
- Current best exact residual: `4.627509042620659e-9`.
- Required target: `2.102108772439442e-9`.
- Larger solver changes require a separate qualified prerequisite PR.

### ISS-1249-02 — B02D V1 T3 hard mesh-quality block
- Status: OPEN / inherited blocker.
- Frozen V1 must remain fail-closed.
- Any redesign requires prospectively frozen V2.

### ISS-1249-03 — TECH-13 H/I/J exact-head execution evidence
- Status: OPEN.
- H/I/J/currentness checks must be observed on final retained code tree using existing qualification surfaces.
- Inherited B01/B02 failures must not be conflated with TECH-13 semantic failure.

### RISK-1249-01 — Scope entanglement
B01 prerequisite numerical repairs are currently present on this branch. They are not TECH-13 semantics. Before merge-ready disposition, split/adopt them through a separately qualified prerequisite path, then rebase/reconstruct #1249 on the qualified prerequisite and rerun exact-head TECH-13 qualification.

### RISK-1249-02 — False PASS by benchmark/tolerance mutation
Prohibited mitigations include raising PCG cap, weakening `/10`, changing expected Lamé values, loosening mesh-quality floors, changing B02D V1 frozen geometry, or classifying an unexecuted check as PASS.

## Changed-File / Custody Note

Relative to #1248, PR1249 contains the intended TECH-13 H/I/J code/scripts/validation plus the qualification-era B01 prerequisite arithmetic changes in `src/core/local-continuum/solver.js` and `src/core/local-continuum/sparse-matrix.js`. The B01 files require prerequisite split/adoption before merge-ready status. Rejected numerical experiments remain in history with explicit forward reverts so evidence is auditable.

## Exact Continuation State

1. Re-ground PR #1249 head after this workreport commit.
2. Do not make more B01 arithmetic changes in this PR.
3. Observe the stock workflows on the workreport-bearing head and preserve exact-head PASS/FAIL honestly.
4. Run/observe existing TECH-13 H/I/J/currentness/canonical exact-head qualification surfaces on the final code tree; do not create or weaken workflows merely to obtain PASS.
5. Record B01 as inherited FAIL and B02D V1 as inherited fail-closed unless separately qualified prerequisite PRs supersede them.
6. Prepare a separate B01 prerequisite repair programme for any larger solver algorithm change; prepare B02D V2 separately if pursued.
7. Before any merge-ready disposition, remove scope entanglement by adopting qualified prerequisites and reconstructing/rebasing the TECH-13 stack.
8. No merge without explicit owner authorization.

## Appendix A — Engineering Takeover / Recovery Check

1. **Production trace** — authority path: frozen B01/B02 definitions → production mesh/solver → exact residual/equilibrium → qualification receipts; TECH-13 authority path remains separate and dormant.
2. **Failure isolation** — current B01 first failure is T6/L3/ν=0.4999/REGULAR sparse PCG termination; B02D first hard-quality failure is frozen T3 coarse polar mesh.
3. **Authority / invariants** — `/10` target, 16N cap, Jacobi identity, hard mesh thresholds, frozen B02D V1, trust-root NULL, and release=false are protected.
4. **Independent validation** — 54 base, 270 metamorphic, 16 fail-closed, analytical Lamé, build/browser, and frozen benchmark custody are kept distinct; failed exact-head B01 is not relabeled PASS.
5. **Next minimal patch** — none inside PR1249 for B01/B02. Next PR1249 action is evidence/handoff completion and TECH-13 dedicated exact-head observation. Larger solver or B02 geometry work moves to separate qualified prerequisites.
