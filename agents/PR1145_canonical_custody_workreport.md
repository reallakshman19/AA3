# PR #1145 — Canonical Thermal ROM Custody Phase

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- PR: `#1145`
- WORK_INTENT: `IMPLEMENT`
- CRITICALITY: `ENGINEERING_CRITICAL`
- Baseline main: `c35ae6eb04cf819a2ed4f839f45b3e05fdeccff6`
- Phase start head: `ccdeeabdf1d19f73deaf5bd3d8db9115324f7a45`
- Working branch: `agent/empirical-rom-compatibility-20260815`
- Merge authority: not granted.
- Coordination: `SAFE` — active LAFEA work is disjoint from empirical piping ROM paths.

## Mission

Close the next authority seam in the analytical piping ROM without changing to an FEA solver route:

1. source `T_reference` and `T_operating` from sealed StagedJSON process authority;
2. source `E`, `G`, approved mean CTE, and circular section properties from sealed material/section authority and reproducible material-state receipts;
3. source restraint identity, host attachment, axis, gap/friction state, and explicit stiffness from current normalized support/restraint authority;
4. source support/ground translation from an existing qualified source-backed movement authority;
5. partition straight PIPE geometry at governed support attachment stations and execute only the existing unit-load/virtual-work + thermal-reference + force-method compatibility ROM.

## Frozen authority rules

- No raw SJSON is consumed.
- No ambient/reference temperature is defaulted.
- No CTE is guessed.
- No missing movement authority becomes `0 m`.
- No finite gap or friction is linearized.
- No restraint in the selected connected region may be silently omitted.
- No tolerance-inferred topology is consumed.
- The root support is an explicitly selected governed rigid anchor; the selection is reference-structure bookkeeping, not a new engineering property.
- Current mean-CTE bridge is valid only when the governed reference temperature equals the material catalog baseline `293.15 K` and operating temperature matches the sealed OPERATING material-state evaluation temperature.
- Support-station splitting creates analytical ROM spans, not finite elements.

## ROM / FEA boundary

Allowed cross-domain reuse:

- qualified material-property resolution;
- qualified circular pipe-section resolution.

Prohibited:

- finite-element solver execution;
- global nodal stiffness assembly;
- `K u = f` solution route;
- FE result recovery as runtime authority;
- empirical response multipliers.

## Validation plan

Independent/focused checks:

- exact source-guard: required canonical authority imports present and FEA solver/old empirical multiplier imports absent;
- root/support movement is relative and source-bound;
- selected restraint coverage is exact;
- gap/friction/missing axis/missing spring stiffness fail closed;
- process/material temperature mismatch fails closed;
- non-baseline reference temperature fails closed for the present mean-CTE formulation;
- support attachment points split the straight analytical route without changing the physical centerline;
- full repository integration and exact-head CI remain explicitly `NOT_RUN` until observed.

## Current phase state

- source grounding: `PASS / SOURCE_INSPECTION`;
- implementation: `IN_PROGRESS`;
- focused local source guard: `PASS / LOCAL_EXECUTION`;
- full repository integration: `NOT_RUN`;
- exact-head GitHub CI: `NOT_RUN` for the not-yet-final phase head;
- production registration/publication: `NOT_REQUESTED / NOT_GRANTED`.
