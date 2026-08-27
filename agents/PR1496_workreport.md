# PR1496 Work Report — Issue #1321 Hand-Calculation Mass / Support Parity

## Recovery header
- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1496
- Branch: `agent/issue-1321-handcalc-mass-support-parity`
- Exact repair base: `4ec93a2985d78d4e067dd40351cb899af2caed8a`
- Technical re-ground commit: `4ed8a74e85ccffeca15476c0a41e333ee2a2d5ac`
- State: SOURCE_COMPLETE_MERGE_AUTHORIZED_EXECUTION_NOT_RUN
- Merge authority: OWNER_GRANTED_BY_2026_08_27_USER_COMMAND

## Mission and independent benchmark
Close Issue #1321's explicit hand-calculation qualification requirement without changing production mechanics.

Declared inputs: `L=2.000 m`, pipe `10 kg/m`, insulation `1 kg/m`, OPE fluid `2 kg/m`, HYD fluid `3 kg/m`, `g=9.80665 m/s²`, load factor `1`, end REST supports at `0/2000 mm`.

Hand equations: `m=LΣm'`; `W=m*g*LF`; with `x_bar=1000 mm`, `R_A=W(L-x_bar)/L`, `R_B=W*x_bar/L`.

Expected values:
- EMPTY: `22 kg`, `215.7463 N`, `107.87315 N` each support.
- OPE: `26 kg`, `254.9729 N`, `127.48645 N` each support.
- HYD: `28 kg`, `274.5862 N`, `137.29310 N` each support.

The focused check compares these independently derived values to `createCurrentCommonInputEmpiricalMassProjection()` and `calculateSupportLoadDistributionFromQualifiedCaseMasses()`, verifies force/first-moment closure, and includes a sensitivity falsifier (`+0.5 kg/m` over `2 m` => `+1 kg` and `+9.80665 N`).

## Main-drift reconciliation
The repair was first grounded on `e6c76ac...`; `main` then advanced through LAFEA PR #1490 to `4ec93a29...`. That intervening eight-file LAFEA/.gitignore delta has zero overlap with this PR. The two technical blobs were re-parented unchanged onto `4ec93a29...`.

## Exact changed-file ledger — 5
1. `agents/PR1496_workreport.md`
2. `agents/claims/PR1496.yaml`
3. `agents/status/PR1496.yaml`
4. `scripts/current-common-input-handcalc-mass-support-parity-check.mjs`
5. `scripts/run-non-fea-checks.mjs`

## Protected boundary
No `src/**`, workflows, numerical formulas, resolver/default authority, source-axis/CoG policy, support allocation/equilibrium logic or tolerances changed.

## Validation truth
Source/current-main reconciliation and source inspection: PASS_SOURCE_INSPECTION / PASS_SOURCE_RECONCILIATION. Faithful checkout remains blocked by `Could not resolve host: github.com`; focused execution, aggregate suite, imports, build and `git diff --check` are **NOT_RUN**. No NOT_RUN is represented as PASS.

## Five-question takeover gate
1. Derive OPE mass, force and reactions from the declared inputs.
2. Name the two production calculation boundaries compared with the hand solution.
3. Explain the sensitivity falsifier and why it prevents a frozen golden oracle.
4. Name the exact five changed files and protected production surfaces.
5. State which executable checks remain NOT_RUN and why.

## EXACT_NEXT_ACTION
Re-read live main; require 0-behind, exact five-file scope, clean reviews/threads and mergeability. If clean, owner-authorized squash merge preserving `EXECUTION_NOT_RUN`.
