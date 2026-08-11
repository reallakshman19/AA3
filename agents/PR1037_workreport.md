# PR1037 Engineering Work Report — BM4_L T1 Interval Authority

## Mission Control

- Mission: replace the provisional BM4_L T1 expansion coefficient with the independently reconstructed CAESAR interval strain authority.
- PR: #1037 — `M047: resolve BM4_L T1 interval thermal strain`.
- Head branch: `agent/m047-bm4l-t1-interval-authority`.
- Stacked base: PR #1026 / `agent/m047-tee-rigid-thermal-growth`.
- Base SHA at branch creation: `72c89608bb11397367e413781f8cf01fa0cd3da1`.
- Predecessor authority: PR #1001 Stage 9 / Stage 10.
- Scope: BM4_L `21 C -> 120 C` T1 interval only.
- Status: **LOCAL_AUTHORITY_PASS / FULL_CURRENT_HEAD_NODE_ACE_NOT_RUN**.

## Why This Is a Separate PR

PR #1001 requires the Type 2.1 tee free-state mechanics and the BM4_L interval thermal authority to remain separate controlled changes. PR #1026 owns only the tee rigid-offset thermal free-growth mechanic. PR #1037 changes only the benchmark thermal profile and adds durable authority/check evidence.

No Stage-7 zero-boundary candidate is included.

## Pinned CAESAR Authority

Common commit:

`179c4831cf521cf797c13699cfbbd118315c9244`

Pinned reports requested by the Owner:

- `LFEA/BM4/Miscdata_BM4_L.txt`, Git blob `ef23d224925e4568185a360ecbe1ee62503f15ff`;
- `LFEA/BM4/Loadcasereport_BM4_L.txt`, Git blob `be62eeb08af26dddcd59146e21188c108c4600dd`.

CAESAR II:

`14.00.00.0910 (Build 231113)`.

The Load Case Report governs:

```text
L2  = W
L3  = T1
L4  = P1
L5  = W + T1 + P1
L6  = W + P1
L14 = L5 - L6
```

The Misc report prints the T1 expansion as:

```text
0.0012 mm/mm
```

at four decimal places.

## Independent T1 Interval Reconstruction

PR #1001 Stage 9 reconstructs the exact BM4_L T1 interval from CAESAR L3 ordinary, non-tee straight members using endpoint kinematics together with recovered axial end force.

Resolved values:

```text
installation temperature = 21 C
operating temperature    = 120 C
DeltaT                   = 99 K

epsilon_T1              = 0.00121096700947
alpha_interval           = 1.2231989994646464e-5 /K
```

The reconstruction is overdetermined:

- 54 ordinary non-tee straight spans;
- each robust span is at least `0.1 m` long;
- robust scatter is below `1e-9` strain;
- the reconstructed strain independently rounds to the pinned Misc value `0.0012 mm/mm`.

This is constitutive reconstruction from CAESAR output, not benchmark-count minimization.

### Scope boundary

The value is authoritative only for the **BM4_L 21 C -> 120 C interval**. It is not promoted as a generic A106 Grade B temperature-dependent material curve.

## Production/Profile Change

`benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json` changes exactly two semantic states:

1. `THERMAL_EXPANSION_STRAIN` is removed from `unresolvedSettings` because the BM4_L interval is now independently reconstructed;
2. `linearSolve.thermalExpansion` changes from the provisional `1.17e-5 /K` to:

```text
coefficientPerKelvin = 1.2231989994646464e-5
authorityStatus      = RESOLVED
```

No tolerance, comparison mode, zero-reference boundary, case selection, source byte, sign convention or result row is changed.

## Durable Evidence Added

### `m047-bm4l-t1-interval-authority.json`

Pins:

- the two Common reports and blob identities;
- CAESAR version;
- 21 C / 120 C / 99 K interval;
- exact reconstructed strain and interval mean alpha;
- 54-span reconstruction contract;
- exact-head qualification artifact identity;
- expected 435 -> 210 -> 150 exact-equation signatures;
- explicit non-scope.

### `lfea-m047-bm4l-t1-interval-authority-check.mjs`

Standalone Node check verifies:

- `alpha * DeltaT = epsilon_T1`;
- four-decimal rounding reproduces the pinned Misc `0.0012`;
- 54-span reconstruction metadata and scatter boundary;
- profile coefficient/status/source;
- thermal expansion is no longer listed unresolved;
- displacement/rotation/force/moment zero gates are unchanged;
- all governed case IDs remain selected;
- the expected resolved exact-equation signature is retained.

Local execution result:

```text
PASS
meanAlphaPerK = 0.000012231989994646464
epsilonT1     = 0.00121096700947
signature     = 31/22/40/13/22/22 = 150
```

## Local 322-Element Exact-Equation Replay

A successful exact-head M047 qualification artifact was downloaded and replayed locally:

- governed implementation commit: `7488ba76126f8240bb61c80fad243cf096c5fe08`;
- workflow run: `31457644192`;
- artifact: `9088676941`;
- artifact digest: `sha256:8819dbbbf21aff8e314fe6cae85db0c3407afc12ca71dde3b459442242d3e934`.

The artifact contains all 322 production element global stiffness matrices, recovery ledgers, joint displacement states and benchmark comparison rows.

The local replay:

1. reassembled the 322 element matrices;
2. restored the governed 51 finite-restraint DOFs;
3. reproduced the two qualified Type 2.1 tee carriers `ACCDB.E12` and `ACCDB.E36.STRAIGHT`;
4. applied only the qualified tee inhomogeneous thermal free-state term;
5. calibrated exactly to the provisional-strain tee result;
6. scaled the pure T1 state to the independently reconstructed interval strain;
7. recomposed the governed linear combinations and re-ran literal comparison.

Results:

| Case | baseline | tee + provisional strain | tee + resolved interval |
|---|---:|---:|---:|
| L2 | 31 | 31 | **31** |
| L3 | 121 | 37 | **22** |
| L4 | 40 | 40 | **40** |
| L5 | 100 | 43 | **13** |
| L6 | 22 | 22 | **22** |
| L14 | 121 | 37 | **22** |
| **Total** | **435** | **210** | **150** |

The tee perturbation solve maximum residual is approximately `2.93e-7` in assembled equation units, matching the predecessor Stage-9 evidence.

## Invariant Checks

- **PASS** — common K unchanged.
- **PASS** — W/P-only L2/L4/L6 unchanged.
- **PASS** — `L14 = L3` under the effective linear T1 state.
- **PASS** — `L5 = L6 + L3` to numerical roundoff.
- **PASS** — no comparator tolerance or zero boundary changed.
- **PASS** — resolved strain independently rounds to pinned CAESAR Misc output.
- **PASS** — profile change is interval authority only.

## Validation Boundary

- **PASS_LOCAL_AUTHORITY** — focused standalone authority check executed locally.
- **PASS_LOCAL_EXACT_EQUATION** — 322-element artifact replay reproduces 435 -> 210 -> 150 with the expected per-case signature.
- **PASS_SEPARATION** — tee mechanics remain in PR #1026; alpha authority remains in PR #1037.
- **NOT_RUN_FULL_CURRENT_HEAD_NODE_ACE** — this session still cannot materialize an independent complete repository checkout with Microsoft ACE and run the full ACCDB production entry point from PR #1037 head.

The last item is recorded explicitly rather than replaced with workflow-only evidence.

## Changed-File Ledger

Before this work-report commit, the stacked PR changes exactly:

```text
benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json
benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-t1-interval-authority.json
scripts/lfea-m047-bm4l-t1-interval-authority-check.mjs
```

This report is documentation only.

## Deliberate Non-Scope

- Stage-7 `0.0001 deg` rotation zero-boundary candidate;
- generic material-curve promotion;
- K or Kb changes;
- Type 2.6 structural mechanics;
- reducer sampling;
- bend stiffness/loads;
- restraint semantics;
- gravity or pressure mechanics;
- benchmark tolerance/reference/sign/row changes;
- Issue #991.

## Dependency / Handover

PR #1037 is intentionally stacked on PR #1026. Review and merge the tee mechanics independently first. After the dependency is integrated, PR #1037 can be rebased/retargeted onto the integrated branch/main and the full Windows/ACE M047 production qualification can serve as the final integration signal.

Until then, the engineering claim is limited to the independently reconstructed interval authority plus the passing local exact-equation replay above.
