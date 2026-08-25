# WIP — Issue #1321 component-contained fluid mass

## Recovery header

- repository: `reallaksh19/Advanced_Analysis`
- source issue: #1321
- branch: `agent/issue-1321-component-contained-fluid`
- base: `a8631581eb440fc69e0164f0a397086bf53bbb52`
- criticality: ENGINEERING_CRITICAL
- merge authority: OWNER_ONLY
- work intent: IMPLEMENT

## Mission

Add an explicit, case-dependent contained-fluid mass primitive for non-PIPE components without changing dry-mass ownership or line-fluid mechanics.

Proposed bounded rule:

```text
EMPTY component mass = authorized dry component mass
OPE component mass   = authorized dry component mass + optional authorized OPE contained-fluid mass
HYD component mass   = authorized dry component mass + optional authorized HYD contained-fluid mass
```

All three terms act at the already-qualified component application point/CoG.

## Authority boundary

Allowed:
- add component-scoped OPE/HYD contained-fluid effective fields in `kg`;
- carry them through the existing enrichment/configured-default/product-default/common-enriched/effective-ledger authority path;
- publish separate execution-local component content maps/receipts;
- compose content once in non-PIPE case mass;
- add focused qualification and canonical Non-FEA aggregate ownership.

Prohibited:
- reinterpreting `COMPONENT_WEIGHT` as wet/total mass;
- deriving component fluid volume from line pipe OD/ID or density without explicit component-content authority;
- adding content to PIPE entities;
- universal nonzero/zero component-content defaults;
- dry-mass policy changes;
- component CoG/application-point changes;
- line fluid, fill-state, statics, allocation, equilibrium, tolerance, solver, or workflow changes.

## Prediction / falsifier

For one non-PIPE component with dry mass `100 kg`, OPE content `8 kg`, HYD content `10 kg`:

```text
EMPTY = 100 kg
OPE   = 108 kg
HYD   = 110 kg
```

The support allocation fractions and component application chainage must be identical across content/no-content comparisons. Any content on EMPTY, PIPE content addition, dry-mass mutation, duplicate addition, or inferred content without effective authority falsifies the patch.

## Validation state

All executable validation is `NOT_RUN` at WIP allocation. Source grounding only.
