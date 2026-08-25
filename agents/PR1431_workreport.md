# PR1431 — Load Calc component-contained fluid mass

## Recovery header

- repository: `reallaksh19/Advanced_Analysis`
- issue: #1321
- PR: #1431 (draft)
- branch: `agent/issue-1321-component-contained-fluid`
- base / merge base: `a8631581eb440fc69e0164f0a397086bf53bbb52`
- work intent: IMPLEMENT
- criticality: ENGINEERING_CRITICAL
- merge authority: OWNER_ONLY
- coordination: SAFE_NO_LIVE_1321_CONTENT_PR_FOUND

## Mission

Add explicit case-dependent contained-fluid mass for non-PIPE components without changing dry-mass ownership or line-fluid mechanics.

```text
EMPTY = authorized dry component mass
OPE   = dry mass + optional authorized OPE component-contained fluid mass
HYD   = dry mass + optional authorized HYD component-contained fluid mass
```

All terms act at the existing qualified component application point/CoG.

## Authority boundary

Allowed:
- component-scoped OPE/HYD contained-fluid effective fields in `kg`;
- existing enrichment/configured-default/product-default/common-enriched/effective-ledger authority path;
- execution-local content maps and semantic receipts;
- exactly-once non-PIPE case composition;
- focused qualification and canonical Non-FEA aggregate ownership.

Prohibited:
- reinterpret `COMPONENT_WEIGHT` as wet/total mass;
- derive component content from line pipe OD/ID or fluid density;
- add component content to PIPE entities;
- universal content defaults;
- dry-mass policy or CoG changes;
- line fluid/fill, statics/allocation/equilibrium/tolerance/solver/workflow changes.

## Prediction / falsifier

Retained benchmark:

```text
dry = 100 kg
OPE content = 8 kg
HYD content = 10 kg
EMPTY = 100 kg
OPE = 108 kg
HYD = 110 kg
```

Content on EMPTY, any PIPE content addition, dry mass mutation, inferred content without effective authority, changed application chainage, or duplicate content application falsifies the patch.

## Validation ledger

- live grounding: PASS at `a8631581...`
- predecessor #1430: MERGED
- open overlap: PASS_NONE_FOUND
- component dry-mass/double-count boundary: PASS_SOURCE_INSPECTION
- component-contained fluid gap: PASS_SOURCE_INSPECTION
- execution: NOT_RUN

## EXACT_NEXT_ACTION

Migrate claim/status custody, remove WIP records, then implement the bounded authority chain and focused regression.
