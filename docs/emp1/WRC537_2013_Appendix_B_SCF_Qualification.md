# WRC 537 Appendix-B stress-concentration qualification — EMP1-21

## Disposition

`NOT_READY_FOR_IMPLEMENTATION`

General non-unity `Kn/Kb` authority remains blocked. This increment does not implement Appendix-B equations and does not change production SCF authority.

## Primary source custody

```text
document   docs/emp1/WRC537_2013.pdf
Git blob   ce861233928154145a9257efbbf8dbef3f5a17d1
SHA-256    698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

The file exists in GitHub, but the connected repository interface returns its identity without readable PDF binary content. The pinned Appendix-B pages therefore were not rendered or independently inspected in this execution environment.

## Secondary-extraction correction

`docs/01_WRC537_METHOD_DEFINITION.md` is already marked `NOT_READY_FOR_IMPLEMENTATION` and records that its Appendix-B content was not extracted from the licensed primary PDF.

A separately accessible WRC reproduction indicates the retained compact candidate formulas are not implementation-safe as written: coefficient/exponent placement differs materially from the reproduced Appendix-B equation layout. Therefore the old candidate formula strings are explicitly classified:

`REJECTED_FOR_IMPLEMENTATION_PENDING_PRIMARY_PAGE_VERIFICATION`

The public reproduction is corroboration only; it is not substituted for the pinned primary source.

## Non-authoritative structure observed

The reproduction indicates:

- `Kn` applies to the membrane portion of external-nozzle-load stress;
- `Kb` applies to the bending portion;
- shell/fillet Point A uses Figure B-2 tension/bending curves;
- the shell selection uses `rA/T`;
- the infinite-plate basis uses `h=2T` for the shell and `h=dn` for the nozzle;
- an alternate bending relation is presented as closer to Peterson data and somewhat conservative relative to Heywood;
- factors at Point A apply to stress components perpendicular to the section change;
- Point B nozzle/pipe and Point C attachment treatments are distinct.

Candidate normalized relations inferred only for reconciliation are retained in the JSON ledger and are explicitly barred from production, hand-calculation expected values, or tolerance setting until the pinned pages are verified.

## Unresolved primary-source gate

Before implementation the pinned Appendix-B pages must directly resolve:

1. exact page and equation-number custody;
2. exact coefficient/exponent typography for B.3/B.4/B.5;
3. exact variable and ratio definitions;
4. exact applicability limits;
5. the authoritative bending-relation selection rule;
6. Point-A, Point-B and Point-C scope boundaries;
7. any rigid/thick versus thin/flexible nozzle limitations;
8. any fatigue/design-use qualifications and external-reference dependencies.

Any unresolved item keeps:

```text
generalAppendixBAuthority = false
nonUnityAuthorized        = false
```

## Authority boundary

No production source, route registry, oracle, tolerance, dataset, UI, package manifest, workflow, gamma/beta scope, pressure scope, global EMP.1.C authority, code authority, or release authority changes in this increment.
