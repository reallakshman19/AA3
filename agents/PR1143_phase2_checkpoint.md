# PR #1143 Phase 2 Checkpoint — Governed Unit-Load Actions

- Repository: `reallaksh19/Advanced_Analysis`
- PR: `#1143`
- Base/main re-grounded at: `dad2f1dbf8f200132c9669d275467611d51d6d3b`
- Prior PR head before this phase: `91bdfc1ba40617ade17f53eb39fe3d2f850f964f`
- Criticality: `ENGINEERING_CRITICAL`
- Merge authority: not granted.

## Phase 2 mission

Remove the hand-authored internal-action authority gap in the new flexibility kernel by deriving unit-load `N`, `My`, `Mz`, and `T` fields from geometry, topology, and an explicit fixed-root boundary.

## Frozen scope before implementation

1. Add a pure rooted-tree statics generator for exactly 1 N translational unit-load cases.
2. Derive constant internal force and linearly varying moment fields by cut equilibrium and moment transport.
3. Generate a deterministic right-handed local member basis; no local section-orientation authority is claimed.
4. Add a canonical piping-topology adapter restricted to exact topology and two-port straight `PIPE` components.
5. Collapse connected ports into exact mechanical joints, convert canonical topology mm to mechanics m, and fail closed on conflicting joint coordinates.
6. Support open branches when the resulting straight-pipe mechanical graph is a connected tree; loops and disconnected graphs remain blocked.
7. Add independent analytical route checks for straight, L-shaped, out-of-plane/torsional, and branch-path cases.
8. Keep `EMPIRICAL_RESTRAINT_NETWORK_V1/V2`, all current multipliers, method registry, Load Calc dispatch/UI, and production publication unchanged.

## Authority boundary

```text
canonical exact piping topology + explicit fixed root + 1 N global direction
  -> exact straight-pipe mechanical tree
  -> cut-equilibrium unit-load action fields
  -> existing exact virtual-work flexibility kernel
  -> experimental flexibility matrix only
```

The new adapter must never accept user-entered `N/My/Mz/T` as calculation authority.

## Stop conditions

- Any need to infer a bend/tee/reducer component stiffness: stop and fail closed.
- Any topology tolerance inference: stop and fail closed.
- Any closed loop/redundant mechanical graph: stop and defer to the later compatibility/reference-structure phase.
- Any need to tune a compliance multiplier to pass an analytical route case: stop and reject the formulation.
