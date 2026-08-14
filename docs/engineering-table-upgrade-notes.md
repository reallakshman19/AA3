# Engineering Table upgrade batches

This branch upgrades the Engineering Table without changing canonical mutation authority.

## Batch A

- Repair field/editor contract mismatches.
- Add a field-coverage audit.
- Preserve intent -> batch -> plan -> candidate -> validation -> Apply authority.

## Batch B

- Add grouped Geometry, Specification, Support, Connectivity, and Authority column profiles.
- Surface endpoint coordinate and relationship fields from existing canonical authority.

## Batch C

- Generalize direct-cell presentation over existing certified intents only.
- Keep catalogue-backed and compound engineering operations governed by their existing planners.
