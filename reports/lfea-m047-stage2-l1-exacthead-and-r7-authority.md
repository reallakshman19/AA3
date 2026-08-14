# M047 Stage 2 — exact-head L1 qualification attempt and pinned R7 load-case authority

**Evidence branch:** `agent/issue-1083-l1-exacthead-r7-authority`  
**Base:** current L1 production-candidate head `80f158c6b7ece734a0c287f6fc56f4c0f81f4084`  
**Production promotion authorized:** **false**.

## 1. Exact-head L1 source qualification status

The landed HYD insulation source was re-materialized from immutable branch-source bytes through a transport-only workflow. The workflow performs no solve and contributes no benchmark result; all engineering checks described below were local.

Exact source identities verified before solving:

- L1 production head: `80f158c6b7ece734a0c287f6fc56f4c0f81f4084`.
- landed linear solver Git blob: `06e1645cfd8a957f5a5ef787c159c0d8d9094508`.
- frozen R2 friction solver Git blob: `5b3ba1ce89f6ff7509bf8be82361993a32497ad2`.
- frozen linear comparison base: `12c695a9ed9a3dedada1d45024712df911069a80`, linear blob `d28e3c5e893cea3ae44e116daf18fcdca0d22107`.
- pinned `BM4_L.ACCDB`: SHA-256 `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`, 5,136,384 bytes.
- runtime Node: `22.16.0`.

### Fresh controls

The six frozen non-friction controls were re-run locally from the exact landed source against the frozen baseline. The initial all-six batch exceeded the execution wrapper ceiling, so the same regression was split into smaller groups without changing the solve or comparison rules.

Fresh results:

- L2: PASS, zero row differences.
- L3: PASS, zero row differences.
- L4: PASS, zero row differences.
- L5: PASS, zero row differences.
- L6: PASS, zero row differences.
- L14: PASS, zero row differences.

This is consistent with the already committed production-candidate control receipt, which established matching row, execution and stiffness hashes for all six cases. No control acceptance rule was changed.

### Exact-head L1 nonlinear replay

An uninterrupted exact-head L1 solve was attempted repeatedly from the verified source bytes and pinned ACCDB. The local execution environment terminated long-running foreground processes before the solver could return a result. The termination was external to the nonlinear solver; no convergence failure, failed-gate set, final rows, or accuracy metric was produced.

The previously committed candidate measurement took approximately 108 seconds per L1 run and converged in 186 iterations. In this runtime, foreground processes are externally interrupted below that duration. Historical workflow results, partial iterates and terminated processes are not substituted for a local benchmark result.

Therefore:

- `exactHeadSourceBytesVerified = true`
- `freshFrozenControlsPass = true`
- `exactHeadL1NonlinearReplayComplete = false`
- `newExactHeadL1AccuracyClaimAuthorized = false`
- `exactHeadL1QualificationClosed = false`

The existing candidate evidence remains useful but is not relabeled as a new exact-head replay. Its prior deterministic result remains: 186 iterations on both repeats, 22/23 normals within ±10%, worst normal error 13.953465349988164%, 7/23 tangential vectors within ±10%, final rows `fnv1a64:2e80e62c024d7f81`. Its documented friction-source reconstruction caveat remains in force until an uninterrupted exact-head replay completes.

## 2. New pinned R7 authority: actual CAESAR v14 load-case report

The original R7 boundary said the ACCDB itself contains no load-case/execution-order table. That remains true. However, the same pinned Common commit also contains an explicit CAESAR II v14 **Load Case Report**, which is stronger authority for the model's load-case definitions than the ACCDB alone.

Pinned source:

- Common commit: `f4d49f2a47d970ae0abf913b537193e324556177`.
- `LFEA/BM4/Loadcasereport_BM4_L.txt`.
- Git blob: `be62eeb08af26dddcd59146e21188c108c4600dd`.
- 15,122 bytes.
- CAESAR II `14.00.00.0910`, Build `231113`.
- report timestamp: August 10, 2026 12:37.

The report establishes the basic-case list and friction multipliers:

| case | type | definition | friction mult. | special relationship |
|---|---|---|---:|---|
| L1 | HYD | `WW+HP` | 1.0 | Hydro test |
| L2 | SUS | `W` | 0.0 | |
| L3 | OPE | `T1` | 0.0 | |
| L4 | SUS | `P1` | 0.0 | |
| L5 | OPE | `W+T1+P1` | 0.0 | frictionless twin of L7 mechanics |
| L6 | SUS | `W+P1` | 0.0 | frictionless twin of L13 mechanics |
| L7 | OPE | `W+T1+P1` | 1.0 | Operating condition 1 |
| L8 | Alt-SUS | `W+P1` | 1.0 | based on operating condition 1; Alternate SUS/OCC enabled |
| L9 | OPE | `W+T2+P1` | 1.0 | Operating condition 2 |
| L10 | Alt-SUS | `W+P1` | 1.0 | based on operating condition 2; Alternate SUS/OCC enabled |
| L11 | OPE | `W+T3+P1` | 1.0 | Operating condition 3 |
| L12 | Alt-SUS | `W+P1` | 1.0 | based on operating condition 3; Alternate SUS/OCC enabled |
| L13 | SUS | `W+P1` | 1.0 | **standard sustained**, not Alternate SUS |

The same report confirms L14 and L15 are algebraic combination cases: L14=`L5-L6`, L15=`L7-L13`.

## 3. What the CAESAR documentation authorizes — and what it does not

Hexagon's Version 14 documentation states that basic/major load cases require a matrix solution and that static analysis repeats the solution for each basic load case. It also documents a specific cross-case nonlinear support mechanism for **Alternate SUS/OCC**: the alternate sustained case uses the restraint status/configuration from its corresponding operating case. The Version 14 Applications Guide example describes an alternate sustained `W+P1` case as using the restraint status from the preceding operating case to evaluate primary-load stress.

This is directly consistent with the pinned report's L7→L8, L9→L10 and L11→L12 relationships.

That mechanism is **not** a generic rule that every later basic case inherits friction slip/state from the immediately previous case. In particular:

- L13 is explicitly a standard `SUS W+P1` case, not Alt-SUS.
- The pinned report does not mark L13 as based on L11 or L12.
- `Miscdata_BM4_L.txt` contains no friction iteration, slide, or inter-case transfer declaration.
- `InputXML_BM4.xml` confirms the v14 model/friction inputs but does not contain the static load-case list or execution-history ledger.
- The entire pinned Common tree was enumerated recursively. No native `.c2`, `._J`, or static execution-log artifact is present.

Therefore the newly discovered case-list order **does not authorize** implementing a general `previous case → next case` friction-state/slip transfer for L13. Doing so would go beyond the documented Alternate SUS mechanism and fit an undocumented algorithm to the benchmark.

## 4. R7 decision after the new authority

The original broad R7 hypothesis is narrowed, not promoted:

- `pinnedCaseListAuthorityFound = true`.
- `documentedCrossCaseSupportStatusMechanismFound = true`, but only for explicitly designated Alternate SUS/OCC cases.
- `L13UsesAlternateSusMechanism = false`.
- `genericInterCaseFrictionStateCarryAuthorized = false`.
- `R7GenericStateTransferExperimentAuthorized = false`.

The actual case order may still affect proprietary solver initialization internally, and dry-friction systems can admit multiple static equilibria, but neither the pinned exports nor the public Version 14 documentation specifies such an initialization/state-reuse law for ordinary basic cases. That remains an evidentiary boundary.

A future R7 experiment requires one of the following higher authorities before changing the solver:

1. the original native CAESAR model/output execution artifact exposing nonlinear case initialization/history; or
2. a CAESAR execution trace/log showing friction state reuse between ordinary basic cases; or
3. explicit Hexagon documentation describing that reuse.

Until then, no further coefficient, cap, angle, relock, continuation-step or generic case-transfer variant should be introduced for L13/L7 parity.

## 5. Current Stage 2 boundary

- HYD insulation production source is landed and its exact bytes plus frozen controls are freshly verified.
- Exact-head L1 nonlinear replay remains incomplete only because this execution environment terminates the required foreground solve before completion. No new L1 accuracy number is claimed.
- R7 now has authoritative case definitions/order and a documented Alternate SUS mechanism, but no authority for generic L13 inter-case state inheritance.
- Tangential friction parity remains unresolved.
- Production promotion remains false.
- BM4_NL remains blocked.
