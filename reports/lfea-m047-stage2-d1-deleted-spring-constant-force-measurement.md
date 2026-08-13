# M047 Stage 2 — D1 deleted-spring / constant-force measurement

Issue: #1083  
PR: #1102  
Status: **REAL PINNED-ACCDB MEASUREMENT — deleted-spring/state-stable hypothesis rejected; D1 retained.**

## Experiment boundary

This experiment is sequential on accepted D1. The **only mechanics change** is the nonlinear solution formulation:

- `STICK`: retain the governed tangential spring;
- after breakaway: delete that tangential spring and, on the next nonlinear iterate, apply a constant force of magnitude `mu|N|`;
- the constant-force direction remains accepted D1: opposite the current total relative tangential displacement;
- once broken away, the spring remains deleted for this primitive static case.

Frozen: `k_f`, coefficient/multiplier, own-restraint current-case normal basis, resultant `mu|N|` cap, D1 direction law, initial breakaway boundary, 400-iteration budget, all qualification gates, +/-10% comparison goal, and qualified linear mechanics.

The first iterate with zero active-set changes is recorded as the **CAESAR state-stable stopping proxy**, but the solve continues through the unchanged project qualification gates. A state-stable proxy is diagnostic only.

## Custody

- ACCDB SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`
- measured case: L13 (`W+P1`)
- experimental profile: `CAESAR-ACCDB-FRICTION-SOLVER-R1-D1-DELETED-SPRING-CONSTANT-FORCE`
- production friction solver modified: **false**

## State-stable proxy result

The first state-stable iterate is **iteration 2**. It does **not** satisfy the qualification gates.

| metric | accepted D1 | deleted-spring state-stable proxy |
|---|---:|---:|
| tangential vectors within +/-10% | **13/23** | **3/23** |
| normal reactions within +/-10% | **23/23** | **20/23** |
| normalized constitutive matches | **19/23** | **12/23** |
| worst vector error | 721.91% | 510.29% |
| above provisional R1 floor: vector passes | 13/22 | **3/22** |
| above provisional R1 floor: worst vector error | 176.22% | **136.82%** |

The three state-stable vector passes are 20710, 20580, and 21860. Local improvement at individual restraints is not a global qualification result.

Normal-force behavior also degrades sharply at the state-stable proxy: 21610 is +97.53%, 20170 is -14.40%, and 20090 is -15.24% relative to the CAESAR normal reaction.

## R2 partial-mobilisation hypothesis

The hypothesis was that deleting the spring and stopping when the active set stabilizes would reproduce CAESAR's characteristic sub-cap utilisation cluster near 0.91-0.96.

| node | CAESAR utilisation | D1 utilisation | deleted-spring state-stable utilisation |
|---|---:|---:|---:|
| 20520 | 0.9615 | 0.9740 | **1.0008** |
| 22260 | 0.9326 | 0.9956 | **0.9999** |
| 22070 | 0.9362 | 0.9151 | **1.1448** |
| 21800 | 0.9395 | 0.9916 | **1.0159** |

The state-stable proxy therefore **does not reproduce** the proposed partial-mobilisation mechanism. At three of the four named rows it is effectively on or above the current cap; at 22070 it substantially exceeds it.

## Full qualification run

The same deleted-spring strategy was allowed to continue through the full **400 governed iterations**. It never converged.

Final failed gates:

- `DISPLACEMENT_UPDATE_NORM`
- `REACTION_UPDATE_NORM`
- `COULOMB_CAP_COMPLEMENTARITY`
- `SLIDE_CAPACITY_RESIDUAL`
- `SLIP_UPDATE_NORM` (force-update equivalent divided by `k_f`)
- `FRICTION_OPPOSES_SLIP`

The last 12 reaction-update norms remain essentially fixed at about **2067.48 N**, and the constant-force update norm remains about **3570.86 N**. This is a persistent nonzero update cycle/plateau, not a converging fixed point. No exact execution-hash period is claimed because the iteration evidence does not repeat byte-identically.

The final iteration is also not a usable accuracy state: 5/23 vectors pass, 21/23 normals pass, and the worst vector error is about 4782%.

## Decision

**Reject the deleted-spring / constant-force state-stable strategy as the missing CAESAR parity mechanism for BM4_L L13.**

It fails both decisive tests:

1. the first state-stable proxy is far less accurate than accepted D1 and degrades normal reactions;
2. continuing the same formulation never satisfies the existing physical/fixed-point gates.

The measured 0.91-0.96 CAESAR utilisation cluster therefore has another cause; it must not be explained by weakening the stop criterion or promoting a state-stable-but-non-equilibrated iterate.

**D1 remains the experimental baseline: 13/23 vectors, 23/23 normals.** No production solver change is justified by this experiment.

## Evidence

- compact committed evidence: `reports/lfea-m047-stage2-d1-deleted-spring-constant-force-evidence.json`
- full local run SHA-256: `4160259a8b092448c0a1f73b4c5665cfc53246624fb4505e172213ed6e133a93`
- ephemeral solver SHA-256: `7e9f2563df9cd22ed3c7fef9c70db3417512ffbd7dee60fb21b590dc24b8703a`
