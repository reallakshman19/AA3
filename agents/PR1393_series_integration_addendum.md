# PR1393 series-integration addendum — Issue #1371

## Purpose

This addendum is durable engineering evidence for the merge-order condition discovered after PR-A/PR-B/PR-C/PR-D were implemented as independent branches from `main`.

It supplements `agents/PR1393_workreport.md`; it does not replace that report.

## Required series order

```text
PR-A #1388 independent shell freeze/comparator
→ PR-B #1390 LAFEA.3 source-faithful product closure
→ PR-C #1392 LAFEA.4 pressure/output closure
→ PR-D #1393 cross-stage anti-drift / viewport identity / registry gate
```

PR-D standalone execution against pre-PR-B/pre-PR-C `main` is not sufficient final evidence for #1371.

## Series-level custody risk found

PR-D's E-edit anti-drift scenario intentionally changes only:

```text
LAFEA.3 MAT.elasticModulus: 200000 → 210000 MPa
```

PR-B introduces `src/workspace/lafea3-simulated-domain-provider.js`, whose source-faithful API accepts the current source document and derives:

- the governed boundary geometry;
- N01/N02/N03/N04 restraints and all other source restraints;
- CASE-A and CASE-B concentrated-load attachments;
- physical-case identities;
- sourceHash-parented domain and geometry evidence.

A final combined-series validation must prove parent regeneration uses the edited source document itself. Merely reloading the default Sample and attaching the edited sourceHash would be a weaker custody proof even though elastic modulus does not change the domain geometry.

## Implemented fail-closed guard

PR-D adds:

```text
scripts/lafea1371-pr-b-merge-order-guard.mjs
```

and binds it before the existing PR-D anti-drift gate in:

```text
scripts/lafea-stage17-browser-run.mjs
```

Behavior:

### PR-D standalone / PR-B absent

```text
STATUS = NOT_APPLICABLE
REASON = PR_B_SOURCE_FAITHFUL_PROVIDER_NOT_PRESENT_ON_THIS_BRANCH
```

This is not PASS.

### Intended A→B→C→D combined head

When `lafea3-simulated-domain-provider.js` exists, the guard must:

1. normalize the LAFEA.3 Sample source;
2. make the real E edit `200000 → 210000 MPa`;
3. issue new canonical source authority for that edited document;
4. call `createLafea3SimulatedDomainAndGeometryEvidence(editedSourceHash, editedSource)`;
5. require the edited sourceHash on both domain and geometry evidence;
6. require the geometry evidence to parent the exact rebuilt domain hash;
7. require N02 and N03 to remain explicit physical boundary features;
8. require every source restraint attachment exactly once;
9. require every CASE-A/CASE-B nodal force attachment exactly once;
10. require exact physical-case mapping.

Any mismatch exits nonzero and blocks the existing Stage-17 carrier before Chromium.

## Independent shell benchmark carrier check

The final hosted lane also already executes:

```text
node scripts/lafea-shell-response-acceptance-check.mjs
```

PR-A changes that script so its order is:

```text
independent frozen-definition validation
→ production-vs-frozen B4-1/B4-2 comparison
→ existing shell response regression
```

Therefore no workflow-YAML change is required to execute the PR-A independent shell comparator on the combined head.

## Current execution truth

Current PR-D head after the merge-order guard/status updates:

```text
eb088a6116778e56fdffcad7c8de25ff9d64c8b8
```

Observed hosted run:

```text
workflow: LAFEA visible workbench qualification
run:      32678259933
job:      97290230181
result:   failure
steps:    null
```

Classification:

```text
merge-order guard       NOT_RUN / INFRASTRUCTURE
cross-stage anti-drift  NOT_RUN / INFRASTRUCTURE
Chromium product route  NOT_RUN / INFRASTRUCTURE
engineering assertion failure observed: NO
```

No encoded-but-unexecuted check is represented as PASS.

## Registry gate

The LAFEA.3 registry limitation remains unchanged until an A→B→C→D combined exact head executes and passes:

- PR-B merge-order source-faithful guard;
- PR-D cross-stage anti-drift;
- LAFEA.3 Chromium journey;
- LAFEA.4 Chromium journey;
- frozen continuum programme;
- PR-A B4 production-vs-frozen shell comparison.

## EXACT_NEXT_ACTION

After owner-authorized sequential integration reaches the A→B→C→D combined head, execute the existing `LAFEA visible workbench qualification` lane. Treat `NOT_APPLICABLE` from the PR-B merge-order guard on that combined head as a failure of the intended series composition. Only executed PASS evidence may unlock registry wording cleanup.
