# PR1352 work report — EMP1-22 nonzero-Δp pressure-thrust source/accounting authority

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `ISSUE: #1350`
- `PR: #1352`
- `BASE: main@135d4edf3c36ead3bb49f2b0e0f907a33c169de4`
- `BRANCH: agent/emp1-22-pressure-thrust-source-accounting`
- `MERGE_AUTHORITY: OWNER_GRANTED_IN_CHAT_2026-08-23`
- `PRODUCTION_CODE_CHANGED: false`
- `WORKFLOW_FILES_CHANGED: false`
- `NONZERO_DP_PRODUCER_IMPLEMENTATION_AUTHORIZED: false`
- `GAMMA5_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORITY: false`
- `RELEASE_QUALIFIED: false`

## Objective

Resolve as much of the nonzero differential-pressure / pressure-thrust accounting question as the currently retained controlled evidence supports, without promoting a supplemental example into universal WRC authority and without changing production mechanics.

## Repository grounding and drift

Initial work began from `main@9d2f66320b3355d9b1e3b00caff0570ded50302b`.

Before PR opening, main advanced one commit to `135d4edf3c36ead3bb49f2b0e0f907a33c169de4` through unrelated LAFEA.5 source-mesh/profile work. Mandatory drift comparison showed only LAFEA.5 workspace/e2e/check/workreport paths and no EMP.1, WRC, pressure, load-custody, oracle or route overlap.

The branch was therefore rebuilt from exact current main and the four bounded EMP1-22 files were restored.

## Existing production seams

### Zero-Δp WRC producer

`src/core/emp1/emp1-a-wrc-zero-dp-load-producer.js`

Historical qualification:

`47a9157ba88a5646021fabd41cd803028e1880c8d6f712095afda429f2c2622b`

The producer rejects nonzero differential pressure, sets `pressureThrust=0`, and uses `SOURCE_LOAD_EXCLUDES_THRUST_NOT_REQUIRED`. This PR does not mutate that producer or qualification identity.

### WRC load-custody contract

`src/core/emp1/emp1-wrc537-load-custody.js` already distinguishes:

1. `SOURCE_LOAD_ALREADY_INCLUDES_THRUST`;
2. `SOURCE_LOAD_EXCLUDES_THRUST_NOT_REQUIRED`;
3. `SOURCE_LOAD_EXCLUDES_THRUST_ADDED_UPSTREAM`.

It requires a qualified double-count guard and verified upstream addition for the third mode. These are necessary software controls, but do not select an engineering mode for a real case.

### Pipe-wall pressure engine

`src/core/local-stress/pressure.js` separately calculates Lamé pipe-wall pressure stress and supports `CLOSED_END`, `OPEN_END`, and `EXPLICIT_AXIAL_RESULTANT` semantics. It is not automatically WRC attachment-load authority.

## Controlled supplemental evidence

Retained qualification:

`validation/emp1/caux2017-wrc01f/hexagon-wrc107-independent-precheck-qualification-v1.json`

Classification: `SUPPLEMENTAL_REFERENCE_NOT_CAUX_BENCHMARK`.

Verdict: `QUALIFIED_FOR_BOUNDED_SANITY_CHECK_ONLY`.

The controlled example reports:

```text
pressure                  275 psi
nozzle OD                 12.75 in
nozzle t                  0.375 in
nozzle ID                 12.0 in
restraint axial force     -26 lbf
WRC radial load P         -31128 lbf
construction              P = -26 - 275*pi*12^2/4
```

Retained independent arithmetic reproduces:

```text
inside area               113.09733552923256 in^2
pressure thrust           31101.76727053895 lbf
unrounded total P        -31127.76727053895 lbf
rounded source P         -31128 lbf
```

The controlled source also states that axial pressure thrust uses pressure times inside area and that some or all may need to be added depending on restraint configuration.

## Engineering interpretation

Qualified only for that cited example:

- pressure thrust is material;
- inside area is used;
- thrust contributes to reported WRC radial load `P`;
- source sign/arithmetic is independently reproduced.

Not qualified universally:

- effective pressure area;
- WRC `P` sign/axis mapping;
- application/reference point;
- eccentric moment translation;
- end-condition policy;
- evidence proving source load already includes or excludes thrust;
- relationship of the pipe-wall axial pressure result to WRC load custody.

The retained Hexagon qualification itself prohibits using the example to authorize EMP.1.C production.

## Pinned WRC primary source

```text
path           docs/emp1/WRC537_2013.pdf
Git blob       ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA-256    698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

The connected repository interface exposes the binary identity but not directly readable PDF page bytes. No missing primary-source rule is guessed from the supplemental reference.

## Changed-file ledger

1. `validation/emp1/wrc537-2013/nonzero-dp-pressure-thrust-source-qualification-v1.json`
2. `docs/emp1/WRC537_2013_Pressure_Thrust_Authority.md`
3. `scripts/emp1-wrc537-pressure-thrust-source-check.mjs`
4. `agents/PR1352_workreport.md`

No production, oracle, tolerance, registry, UI, package or workflow file is changed.

## Validation ledger

### VAL-PT-01 — current-main grounding

- status: `PASS`
- basis: `REMOTE_REPOSITORY_INSPECTION`
- current base: `135d4edf3c36ead3bb49f2b0e0f907a33c169de4`

### VAL-PT-02 — main drift

- status: `PASS_NO_EMP1_OVERLAP`
- basis: commit comparison `9d2f6632... -> 135d4edf...`
- movement is LAFEA.5-only.

### VAL-PT-03 — controlled Hexagon reference

- status: `PASS_BOUNDED_REFERENCE_ONLY`
- qualification ID: `HEXAGON_WRC107_PRESSURE_THRUST_PRECHECK_Q1`
- universal EMP.1/WRC authority: false

### VAL-PT-04 — double-count software contract

- status: `PASS_SOURCE_INSPECTION`
- all three pressure modes present;
- double-count guard required;
- added-upstream verification required.

### VAL-PT-05 — zero-dp production preservation

- status: `PASS_SOURCE_INSPECTION`
- historical producer hash unchanged;
- nonzero dp remains rejected;
- no production patch in PR.

### VAL-PT-06 — primary WRC pressure-thrust arbitration

- status: `NOT_RUN_PRIMARY_PAGE_ACCESS`
- no supplemental datum promoted to primary authority.

### VAL-PT-07 — focused Node checker

- status: `NOT_RUN_EXECUTION_ENVIRONMENT`
- checker authored to assert retained source bounds, current custody modes, historical zero-dp hash, unresolved universal items and zero production expansion.
- no runtime PASS claimed.

## Current disposition

`BLOCKED_UNIVERSAL_NONZERO_DP_PRESSURE_THRUST_CUSTODY_UNRESOLVED`

The source/accounting phase proves that nonzero-dp support cannot safely be reduced to blind `F=Δp×area` addition.

## Next gate

Directly arbitrate controlled primary WRC/source evidence for:

1. exact effective area;
2. exact sign/axis mapping;
3. end-condition rule;
4. application point and moment translation;
5. source-load inclusion/exclusion evidence contract.

Only after that should independent nonzero-dp hand calculations be frozen and a separate producer implementation proposed.

## Appendix A — takeover questions

1. Why is the Hexagon example useful but insufficient for universal production authority?
2. What effective area does the cited example use?
3. How is example WRC P constructed numerically?
4. What limits its sign/reference authority?
5. Which three pressure modes exist in WRC load custody?
6. Why do those modes not qualify a real nonzero-dp case?
7. What does zero-dp producer do when Pi differs from Pe?
8. What is its qualification SHA?
9. Why is Lamé axial pressure stress not automatically WRC pressure-thrust authority?
10. What evidence is required before choosing SOURCE_LOAD_ALREADY_INCLUDES_THRUST?
11. What evidence is required before choosing SOURCE_LOAD_EXCLUDES_THRUST_ADDED_UPSTREAM?
12. Which universal decisions remain unresolved?
13. Does this increment change production code or route authority?
14. What primary evidence is required before nonzero-dp implementation?

Target takeover score: >=92/100 total and every question >=17/20 before production semantic widening.
