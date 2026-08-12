# M047 BM4_L exact-head local production harness

## Mission

Close the remaining delivery/tooling gap in canonical PR #1001: provide a fail-closed Windows/ACE local runner that executes the same production BM4_L qualification boundary as `.github/workflows/m047-bm4l-qualification.yml` without requiring GitHub Actions.

This change is tooling/evidence only. It does not modify the solver, profile, reference rows, tolerances, mechanics, load cases, or workflow.

## Exact-head contract

The harness requires an explicit 40-hex `-ExpectedHead`, verifies `git rev-parse HEAD` equals it, and refuses a dirty worktree including untracked files before generating artifacts.

It also requires Windows, PowerShell 7+, Node 22, git and npm. This prevents an accidental "local qualification" against a different source tree or runtime family.

## Source/provider custody

The runner carries the same pinned authority as the M047 workflow:

- Common commit `45d51ea18624f5775805f399110c1738301c0d90`;
- BM4_L.zip SHA-256 `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`;
- authorized ACCDB member SHA-256 `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`;
- ACCDB size `5136384`;
- authenticated Microsoft ACE installer SHA-256 `04e96c9f1a1f7d251a88aececf1dc10ff65950392787427c00814a43308003de`.

The installer is downloaded and authenticated. If ACE is not registered, it is installed; if it is already registered, the existing provider is retained but its Microsoft Authenticode signature and binary hash/version are recorded.

The pristine ACCDB hash is checked before and after a read-only ACE open. Any byte change fails the run.

## Production execution

The harness runs the same governed six-case command:

```text
node scripts/lfea-caesar-accdb-benchmark.mjs
  --profile benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json
  --solve-linear true
  --solve-cases L2,L3,L4,L5,L6,L14
```

It then runs source-binding verification, root-cause diagnostics, recovery proof, numeric-operator proof, bend effective-stiffness proof, and the same reusable B3/core-FEA regression set used by the M047 workflow.

## Result boundary

The harness deliberately contains no expected failure count and no comparator/tolerance override. It records the exact current stack result into:

`artifacts/bm4l-local/bm4l-local-production-receipt.json`

The receipt contains exact git head, runtime/provider identity, source hashes, per-case failure counts, qualification totals and qualification semantic hash.

This separates **execution custody** from **engineering interpretation**.

## Contract check

`scripts/lfea-m047-bm4l-local-production-harness-check.mjs` compares the harness against the workflow for:

- pinned source/provider constants;
- Windows/workflow-dispatch boundary;
- exact governed cases;
- diagnostics/recovery/operator commands;
- reusable regression suite;
- exact-head/clean-worktree controls;
- absence of result-count or tolerance coupling.

The contract check is platform-independent.

## Validation

- PASS — Node contract checker syntax and contract logic executed locally against a mirror of the exact-head workflow contract inspected from commit `5813eb8061588f37633736d91bbafafd7a39e874`.
- NOT_RUN — PowerShell parser/runtime check in this Linux environment because `pwsh` is unavailable.
- NOT_RUN — full Windows/ACE production solve on the current stacked head; this harness exists to make that execution deterministic when a Windows checkout or authorized workflow dispatch is available.

## Non-scope

No solver/profile/workflow modification, no result fitting, no reducer sampling promotion, no Type 2.6 mechanics, and no Issue #991 change.
