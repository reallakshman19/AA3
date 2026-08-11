# Certified valve catalogue selection work report

## Scope

This slice removes the Engineering Table M06 free-text catalogue JSON path and replaces it with exact record selection from the already-certified specification catalogue owned by Professional Operations.

The governed valve replacement semantics are intentionally unchanged. The Table still stages the existing `VALVE_REPLACEMENT` intent, which compiles to the existing certified inline replacement and face-to-face geometry operations.

## Root cause

The Table previously rendered a textarea for an operator to paste an arbitrary `catalogueBinding` JSON object. The runtime parsed that object directly and passed it into the governed intent. Downstream normalization checked the binding shape and compatibility, but the Table itself did not prove that the submitted record/hash actually existed in the current immutable specification catalogue.

That made the UI capable of supplying catalogue-looking free text instead of selecting from catalogue authority.

## Architecture decision

The Table now reuses `controller.professionalRuntime.catalogue`, the same validated `TopologyEditSpecificationCatalogue.v3` already used by Professional Operations and empty-model Table authoring.

There is no second catalogue loader, cache, hash, or selector authority.

The flow is:

`exact Table VALVE row -> compatible immutable BALL record IDs -> explicit recordId selection -> exact current catalogue record/hash -> catalogue binding projection -> VALVE_REPLACEMENT intent -> operation plan -> candidate/Preview -> validation -> certified transaction -> canonical topology`

Preview and validation remain non-mutating. Apply remains the only canonical mutation boundary, and journal undo/redo remains the only applied history.

## Implementation

- Added a pure catalogue binding authority module so catalogue-to-command projection is owned by the catalogue layer rather than by one operation planner.
- Kept the existing `topologyEditInlineCatalogueBinding` export as a compatibility re-export for existing authoring callers.
- Added Table valve catalogue authority that:
  - requires an exact canonical VALVE edge row;
  - exposes only BALL records from the current certified catalogue;
  - constrains candidates by known target nominal size, piping class, pressure class, and end connections;
  - requires an explicit `recordId` selection;
  - exact-resolves that ID inside the compatible candidate set;
  - reconstructs the binding from immutable catalogue/record content;
  - fails closed for unknown, incompatible, missing, or tampered authority.
- Replaced the M06 textarea with a controlled `<select>` showing record ID, DN, piping class, pressure class, and face-to-face length.
- Removed the Table JSON parser completely.
- Updated compound-cell focus to target the certified record selector.
- Added one DN80 BALL record to the repository demonstration specification catalogue so the existing Q3 DN80 M06 qualification can exercise the same production catalogue authority instead of injecting a synthetic binding.

## Qualification fixture custody

The 20-object production demo intentionally does not contain a strict compatible BALL replacement for its loaded GATE valve: the canonical V-001 evidence is DN100 / `DEMO-150`, while the existing DN100 specification records are `DEMO-600`. That mismatch is retained because repository coverage uses it to prove there is no nearest-size/class substitution.

M06 selector reachability therefore uses the existing Q3 exact-authority fixture. Q3 contains the certified DN80 / `PCL-80` target and its exact BALL catalogue record, and the same fixture already exercises the combined M04/M06/M10 transaction. Qualification must not manufacture a looser DEMO-150 replacement record or relax the Table compatibility predicate merely to make the generic demo selectable.

The Component HUD remains a separate evidence projection. In its explicit synthetic source-evidence unit case, V-001 can resolve the exact GATE record from valve type and face-to-face evidence. The real 20-object browser fixture remains `INCOMPATIBLE`, with no recommended catalogue record, because its available source/class evidence does not exact-resolve one catalogue record. Adding the DN80 BALL record increases that incompatible valve-family inventory by one but does not change the fail-closed disposition. Neither HUD case implies a Table-compatible BALL replacement.

## Validation coverage

Focused tests cover:

- compatible BALL-only candidate filtering;
- exact catalogue/record hash custody in the reconstructed binding;
- rejection of unknown or incompatible record IDs;
- rejection of tampered catalogue authority;
- no textarea/free-text catalogue editor in M06 rendering;
- staged selector persistence by exact record ID;
- compound-cell selection/focus only;
- production M06 selector options matching the certified catalogue;
- staging through the selector without canonical or journal mutation;
- Q3 M04/M06/M10 combined transaction using a certified catalogue record rather than synthetic JSON;
- retained Preview/Validate/Apply and exact journal undo/redo authority through existing Table suites.

## Deferred by design

- broader valve type replacement beyond the existing GATE -> BALL M06 contract;
- arbitrary fitting/catalogue scalar editing;
- catalogue authoring or source ingestion;
- support editing;
- multi-cell paste/fill/range editing.

Those remain separate governed slices and are not inferred from catalogue selection UI.
