# M047 — traceable BM4_NL L19/L20 qualification

This directory defines the controlled iteration chain for issue #947. An iteration is not accepted because a benchmark count improves; it is accepted only when its declared mechanics hypothesis is independently justified and the locked-source, bend-coverage, equilibrium, recovery, and regression invariants remain valid.

## Locked source

- Benchmark: `BM4_NL`
- ACCDB: `D:\Code3\LFEA\BM4\BM4_NL\BM4_NL.ACCDB`
- SHA-256: `85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21`
- Cases: L19 `W+P1`, then L20 `W+T1+P1`
- Boundary: bilateral linear restraints; no friction or lift-off
- Declared bends: 12

Every real-data run verifies the ACCDB SHA-256 before solving.

## Iteration chain

| Iteration | Purpose | Production mechanics | Initial verdict |
|---|---|---|---|
| `M047-I000` | Freeze retained real-data baseline | none | `BASELINE` |
| `M047-I001` | Add deterministic iteration evidence | none | `INSTRUMENTATION` |
| `M047-I002` | Verify MEC-21 Eq. (2.25), units and signs | none | `INCONCLUSIVE` |
| `M047-I003` | Test bend-subdivision compatibility | none | `INCONCLUSIVE` |
| `M047-I004` | Candidate compatible cumulative MEC-21 bend field | yes | `INCONCLUSIVE` until locked ACCDB rerun |

Each `M047-I###.request.json` binds the hypothesis, predicted signature, exact base/candidate commit, changed paths, mechanics delta, and verdict to the iteration.

## Platform-independent gate

Run:

```text
node scripts/lfea-m047-check.mjs
```

The gate:

- materializes `I000` through `I003` from the retained BM4_NL benchmark report;
- verifies the exact retained baseline failure counts;
- proves `I001` has zero benchmark delta and zero introduced/resolved failure identities;
- verifies the MEC-21 scalar equation independently;
- reproduces the old subdivision-dependent translation defect;
- verifies the cumulative I004 field is continuous and endpoint-invariant for 1, 2, 4, 8, 18 and 36 bend subdivisions;
- verifies retained target-node equilibrium and the L19 node-20090 E4/E5 decomposition;
- applies the M047 Bourdon source guard; and
- reruns the existing B3.2 component, B3.3 solver and B3.4 recovery qualification checks.

The pull-request exact-head workflow also runs this command on Node.js 22.

## Materialize the retained baseline chain

Run once before a fresh I004 comparison:

```text
node scripts/lfea-m047-materialize-baseline-chain.mjs
```

This produces `reports/m047/M047-I000` through `reports/m047/M047-I003`. The I003 `iteration.json` is the required parent for I004.

The materializer rejects a retained baseline that does not reproduce:

| Case | Restraint fails | Displacement/rotation fails | Source end-action fails |
|---|---:|---:|---:|
| L19 | 1 component / 1 node | 72 components / 50 nodes | 20 components / 13 elements |
| L20 | 5 components / 5 nodes | 71 components / 45 nodes | 137 components / 46 elements |

## Run I004 on the locked real ACCDB

On the Windows CAESAR/ACE workstation, from the repository checkout containing the M047 evidence tooling:

```text
node scripts/lfea-m047-real-data-iteration.mjs --accdb "D:\Code3\LFEA\BM4\BM4_NL\BM4_NL.ACCDB" --iteration M047-I004 --parent reports/m047/M047-I003/iteration.json --out-dir reports/m047/M047-I004
```

The runner fails closed unless:

- the ACCDB hash is the locked hash above;
- I004 names the immediately preceding I003 evidence;
- evidence-critical files match the recorded evidence-tool HEAD;
- the exact mechanics candidate commit can be checked out;
- the detached candidate worktree is clean before and after qualification;
- focused/legacy regressions pass;
- unrelated dirty-worktree changes remain unchanged; and
- the iteration verdict passes the decision guard.

The mechanics solver is executed from a temporary detached Git worktree at the exact `candidateCommitSha` declared by `M047-I004.request.json`; it is not executed from an arbitrary current HEAD.

## I004 outputs

A successful real-data run writes:

- `benchmark.json` — governed CAESAR-vs-LFEA comparison;
- `actual.json` — exact candidate actual results and mechanics evidence;
- `benchmark-summary.md` — human-readable failure/incident-action report;
- `target-nodes.json` — retained evidence for L19 node 20090 plus all five current L20 restraint targets, whether each passes or fails;
- `iteration.json` — fixed metrics, exact failure identities, parent deltas, invariants and verdict;
- `iteration-summary.md` — human-readable scorecard and introduced/resolved failures; and
- `run.json` — executed candidate SHA, evidence-tool SHA, commands, source hashes, worktree custody, output identities and evidence hashes.

`target-nodes.json` deliberately does not disappear when a target passes. For L19 node 20090 it retains the incident analysis-element decomposition, including source E4/E5 ownership, algebraic action sum, reported incident action, support reaction and equilibrium residual.

## Promotion rule

`M047-I004` remains `INCONCLUSIVE` until the locked real-data run is inspected. Promote a mechanics iteration to `ACCEPT` only when:

1. its predicted physical signature is observed;
2. all source/hash, 12-bend coverage, execution-hash and six-DOF nodal-equilibrium invariants pass;
3. L19 reaction/displacement/source-end-action changes are mechanically explainable;
4. no tolerance or scale floor is weakened;
5. no benchmark result is embedded into solver mechanics; and
6. introduced failures, if any, are explicitly recorded and physically justified rather than hidden by a lower aggregate count.

Do not begin the L20 thermal-property/modulus investigation until the L19 Bourdon iteration has been measured and dispositioned.
