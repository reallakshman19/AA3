# WIP — LoadCalc Binding Currentness / Semantic-Hash Performance

- Branch: `agent/loadcalc-performance-binding-currentness-main8fba`
- Exact base: `8fba59cd1ea3e2c712e62419bf43fd639d70db06`
- Criticality: ENGINEERING_CRITICAL
- Merge: OWNER ONLY
- Status: SUPERSEDED BY `agents/PR1232_workreport.md`

## Mission
Remove repeated semantic hashing and empirical-binding reconstruction without weakening provenance.

Rule: `SHA-256 / semantic hash = engineering identity`; `runtime revision = cache currentness only`.

## Final design
- cache Project Data semantic hash once per installed immutable profile instance;
- maintain a separate monotonic Project Data runtime revision;
- cache full-object shared-model and support/route binding hashes by immutable object identity;
- maintain EngineeringModelStore model runtime revision;
- cache empirical bindings by model revision + Project Data runtime revision + dataset ID/version + dataset/line-list/piping-class/component-weight source SHA values;
- exclude material map because it is not part of the empirical runtime binding contract.

## Superseded idea
The earlier plan to thread master row/mapping revisions through the authorized consumer was rejected before integration. The binding already contains the relevant master source SHA identities; revision plumbing would add coupling and invalidation without changing binding identity.

The authoritative implementation and handover record is `agents/PR1232_workreport.md`.

Executable repository/browser qualification remains NOT_RUN until actually run.
