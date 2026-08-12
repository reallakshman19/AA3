# M047 Stage 2 — BM4_L friction qualification implementation

Issue: #1083

Baseline: `0855afb22b76c4b7657a81641c7fbaa890474cd7` (PR #1046 exact head)

## Scope

This change adds the governed static dry-friction path required for BM4_L while keeping the previously qualified ACCDB linear mechanics in `caesar-accdb-linear-solve.js` unchanged. Stress, EXP stress, HYD stress, lift-off, one-directional contact, and other nonlinear mechanics remain out of scope.

## Configuration authority migration

The configuration resolver, schema, and BM4_L profile now use the issue-governed low-to-high precedence:

`OVERALL_GLOBAL_DEFAULT < INDIVIDUAL_FILE_SETTING < LOAD_CASE_SETTING < MODEL_INPUT`

The model coefficient remains `COEFFICIENT_OF_FRICTION_MU = 0.3`. Load-case friction is represented separately as `FRICTION_MULTIPLIER`; the effective coefficient for a primitive case is:

`mu_effective = COEFFICIENT_OF_FRICTION_MU * FRICTION_MULTIPLIER`

Therefore L2-L6 remain zero-friction through multiplier `0`, while L13, L7, and L1 use multiplier `1`. L14 and L15 are derived combinations and do not carry an independent friction coefficient, multiplier, stiffness, or nonlinear iteration state.

`FRICT_STIF = 1.0E6 N/cm` is resolved explicitly to `1.0E8 N/m` before nonlinear assembly.

## Solver architecture

`caesar-accdb-linear-solve-governed.js` is a compatibility/governance adapter around the frozen linear solver. It permits the frozen path only when governed effective friction is exactly zero and records the actual model coefficient and case multiplier in evidence.

`caesar-accdb-friction-solve.js` reconstructs the qualified structural stiffness/load system from the frozen recovery ledger, then adds only the dry-friction terms:

- sticking support: tangential spring stiffness `k_f`;
- Coulomb cap: `mu_effective * abs(N)` for the governed bidirectional support;
- sliding support: remove tangential spring and apply capped load opposite slip;
- deterministic all-stick initialization and active-set updates;
- zero state changes, displacement/reaction update limits, cap/constitutive/direction checks, and recovered nodal equilibrium are all required for convergence;
- repeated nominal run must produce the same semantic fingerprint;
- 0.5x and 2x stiffness runs are diagnostic only; 1x remains the qualification result.

No bend, tee/B31J, reducer, rigid, Bourdon, pressure-stiffening, thermal-strain, finite-restraint, or global recovery calibration is introduced in the friction path.

## Case execution

The governed sequence is:

1. L13 = `W+P1`, nonlinear primitive, paired with L6;
2. L7 = `W+T1+P1`, nonlinear primitive, paired with L5;
3. L15 = `L7-L13`, algebraic result combination only;
4. L1 = `WW+HP`, nonlinear primitive.

L15 is formed only from the two independently converged primitive result states. It has no independent nonlinear solve and emits its own algebraic/equilibrium evidence.

For L1, the frozen mechanics are reused through an explicit hydrotest base transformation: ACCDB `HYDRO_PRESSURE` is mapped to the frozen pressure primitive, hydrotest contents are represented as 1000 kg/m3 water, insulation is excluded, and friction is removed only in the internal counterfactual base used to assemble the nonlinear state. The transformation is emitted as evidence and is not treated as a CAESAR reference result.

## ACCDB extraction engine

Stage 2 now reuses the ACCDB engine already implemented in `reallaksh19/XML_Compare_Utilities` instead of requiring Microsoft ACE/COM.

The local production harness pins:

- XML Compare Utilities commit `d83c62214b7a6486c17698225ea4e11bc3121cb6`;
- `parser/accdb-mdb.js` Git blob `2ea596b6e9fb65e386e5cbb256f4141ce7bb595b`;
- exported API `readAccdbNamedTables(arrayBuffer, tableNames, log)`;
- `mdb-reader` version `2.2.6`, matching the app's `mdb-reader@2` engine family but fixed to an exact version for reproducible local qualification.

`scripts/lfea-caesar-accdb-export-xml-compare.mjs` converts those named-table results into the existing `caesar-accdb-raw-export/v1` contract. It does not use the XML app's higher-level geometry heuristics; only the raw Access table reader is reused. The source manifest records the extractor commit, parser blob, package version, and package hash.

No GitHub Actions workflow is required or used for this qualification path.

## RCA and result families

The Stage 2 command reports the issue-required paired deltas:

- `L13-L6` — sustained friction effect;
- `L7-L5` — operating friction effect;
- `L15-L14` — friction contribution to the expansion range.

Literal component comparisons remain unchanged. Coordinate-invariant vectors, all global source-element end actions, physical equilibrium, nonlinear state residuals, repeated-run evidence, and stiffness sensitivity are retained separately rather than collapsed into one score.

## Local production custody and acceptance

Run locally from a clean checkout at the exact candidate head. If `XML_Compare_Utilities` is a sibling checkout it is discovered automatically; otherwise pass its path explicitly. The harness copies/checks out the pinned extractor commit into the artifact directory, so the user's working checkout is not modified.

```powershell
pwsh ./scripts/lfea-m047-bm4l-friction-production.ps1 `
  -ExpectedHead (git rev-parse HEAD) `
  -XmlCompareUtilitiesPath ../XML_Compare_Utilities
```

The harness fails closed unless it receives the immutable Issue #1083 custody set:

- Common commit `f4d49f2a47d970ae0abf913b537193e324556177`;
- ZIP Git blob `df119ae1b8272469b6204036ab1aff21e561dfb8`;
- ZIP SHA-256 `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`;
- `BM4_L.ACCDB` 5,136,384 bytes, SHA-256 `e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c`;
- load-case report Git blob `be62eeb08af26dddcd59146e21188c108c4600dd`;
- miscellaneous report Git blob `ef23d224925e4568185a360ecbe1ee62503f15ff`.

It emits source custody, resolved configuration, nonlinear actuals, per-iteration state evidence, qualification/RCA report, summary, and immutable receipt. It also fails if the frozen non-friction result changes from 46 literal external failures / 0 restraint failures, or if any L13/L7/L1 restraint component fails the literal qualification tolerance.

## Current verification status

The new/modified JavaScript friction implementation was syntax-checked locally while authored. The XML Compare extraction adapter was also `node --check` validated locally, and its boundary follows the app's existing `readAccdbNamedTables()` API.

The current execution container cannot retrieve/install the binary ACCDB runtime dependencies from the public internet, and it does not contain `mdb-reader` preinstalled. Therefore the authoritative BM4_L numerical receipt has not been generated in this session. This remains a draft until the local pinned run above is executed and its evidence reviewed; no GitHub Actions execution is needed or intended.
