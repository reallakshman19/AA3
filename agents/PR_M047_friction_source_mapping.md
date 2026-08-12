# M047 BM4_L friction source mapping — F1.3

## Mission

Convert the pinned BM4_L InputXML restraint source into a solver-neutral friction/contact site contract without assigning any undocumented nonlinear mechanics.

## Stack

- Base PR: #1048 — BM4_L friction differential reference surface (F1.2).
- Base branch: `agent/m047-bm4l-friction-reference-differential`.
- Exact base SHA: `db67b6c0c62b731cccdbebce750ffc2b3ab20f93`.
- Head branch: `agent/m047-bm4l-friction-source-mapping`.

## Pinned source

Common commit `179c4831cf521cf797c13699cfbbd118315c9244`:

- `LFEA/BM4/InputXML_BM4.xml`
- Git blob `3423d220374a17f67addd3c8c0c44300ffa46251`

The connected GitHub source resource was exhaustively inspected for active friction restraint locations and companion positive gaps.

## Complete BM4_L friction inventory

The source map pins **26 friction sites** across 30 active restraint nodes. Every friction source row is:

- restraint Type `17`;
- coefficient of friction `0.3`;
- normal direction `[0, +1, 0]`.

Friction nodes:

```text
20030 20090 20170 20250 20350 20390 20440 20520 20550 20580
20710 21470 21480 21610 21740 21800 21860 21930 22020 22070
22120 22140 22220 22260 22310 22370
```

This mapping is source authority only. It does not infer which sites stick, slide, lift off, or contact in any load case.

## Friction sites with positive-gap companions

Four friction sites have positive-gap companion restraints, five gap rows total:

```text
node 20030  restraint 2  Type 7   gap 25 mm  direction [ 0, 0,-1]
node 20390  restraint 3  Type 10  gap  5 mm  direction [-1, 0, 0]
node 21480  restraint 2  Type 7   gap 25 mm  direction [ 0, 0,+1]
node 21480  restraint 3  Type 10  gap 10 mm  direction [+1, 0, 0]
node 22310  restraint 2  Type 10  gap 10 mm  direction [ 0, 0,-1]
```

Therefore BM4_L production friction cannot be represented as a post-solve `mu*N` correction; contact/gap ownership must remain in the outer nonlinear solution.

## Generic source mapper

`buildInputXmlFrictionSiteMap(xmlText)` parses CAESAR restraint rows and emits:

- active restraint nodes;
- positive-friction source rows;
- source type, normal and coefficient;
- all companion restraints at the same node;
- positive-gap companions as a distinct subset.

The mapper handles the CAESAR `-1.0101` unset sentinel and requires a valid unit direction for every positive-friction source.

Critically, the mapper does **not** assign:

- Friction Slide Multiplier;
- STICK/SLIDING state;
- contact active/open state;
- normal force;
- friction force;
- convergence controls.

Those belong to later qualified layers.

## Validation boundary

Local Node 22.16.0:

```text
node --check src/core/nonlinear-restraint-friction/inputxml-friction-site-map.js
PASS

node --check scripts/lfea-m047-bm4l-friction-source-map-check.mjs
PASS

node scripts/lfea-m047-bm4l-friction-source-map-check.mjs
PASS
```

The focused fixture proves source parsing, sentinel handling, site grouping, companion-gap ownership, and the no-mechanics boundary.

The exact Common InputXML is accessible through the connected GitHub source resource but is not mounted into this Linux filesystem, so the checker's optional `--inputxml` exact-byte replay is **NOT_RUN_LOCAL**. The pinned 26-site/5-gap snapshot itself was exhaustively checked against that connected source resource.

## Files

Relative to #1048:

```text
src/core/nonlinear-restraint-friction/inputxml-friction-site-map.js
src/core/nonlinear-restraint-friction/index.js                         export-only update
benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-source-map-snapshot.json
scripts/lfea-m047-bm4l-friction-source-map-check.mjs
agents/PR_M047_friction_source_mapping.md
```

## Decision

**F1.3 SOURCE MAPPING COMPLETE — NO NEW MECHANICS.**

The friction source/topology side is no longer a blocker. The remaining production blockers are the numeric CAESAR Friction Slide Multiplier and exact state-history/control semantics required to reproduce L13/L7 without fitting responses.

Next safe batch is a production-integration readiness contract that proves L6/L5 zero-friction identity and refuses L13/L7 until all nonlinear authority fields are present.

## Non-scope

No PR #1001 modification, no Issue #991 change, no L13/L7 solve, no guessed Slide Multiplier, no response fitting, no comparator/tolerance/profile edit, no merge, and no ready-for-review transition.
