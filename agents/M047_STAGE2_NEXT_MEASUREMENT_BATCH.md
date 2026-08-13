# M047 Stage 2 — next measurement batch

Issue: #1083  
Follow-up PR: #1102  
Scope: measurement orchestration only; no production solver mechanic is changed by this batch runner.

## Purpose

`scripts/lfea-m047-stage2-next-batch.mjs` turns the current RCA sequence into one fail-closed local command while preserving the one-mechanic-per-iteration rule.

The sequence is fixed:

1. verify the exact pinned `BM4_L.ACCDB` bytes (`5,136,384` bytes, SHA-256 `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`);
2. run frozen L2–L6/L14 control regression and stop on any difference;
3. run D1 on L13 only;
4. if D1 converges, build the D1 accuracy RCA;
5. run C1 from the frozen B0 L13 artifact against the same ACCDB source;
6. write a D1 decision packet;
7. run S1 only when D1 is explicitly rejected and the operator requests the independent B0→S1 fallback.

No benchmark percentage, tolerance, convergence threshold, friction stiffness, normal basis, cap magnitude, or reference value is altered by the runner.

## Why C1 uses B0

C1 is data-only. It reads CAESAR L13/L6 reference vectors and uses the B0 restraint inventory only to bind normal and tangential DOFs. Keeping C1 on B0 makes it independent of the D1 mechanics experiment. The runner verifies that B0, controls, D1 and C1 all bind to the same pinned ACCDB hash.

## Control baseline is explicit

The runner refuses to infer a baseline for L2–L6/L14. Supply exactly one:

```bash
--control-baseline <baseline-control-actual.json>
```

or:

```bash
--baseline-root <checkout-of-the-frozen-baseline>
```

This prevents a false PASS caused by comparing the branch against itself.

## First measurement pass

Keep the D1 decision at the default `hold`:

```bash
node scripts/lfea-m047-stage2-next-batch.mjs \
  --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB \
  --baseline-root ../Advanced_Analysis-baseline
```

Default output directory:

```text
reports/m047-stage2-next-batch/
```

Expected artifacts:

- `control-regression.json`
- `friction-iteration-L13-D1.json`
- `accuracy-rca-L13-D1.json` when D1 converges
- `capacity-basis-L13-vs-L6.json`
- `d1-decision-packet.json`
- `next-batch-receipt.json`

A non-converged D1 is still preserved as an iteration artifact; the D1 RCA is omitted because the RCA contract requires a converged result. C1 can still run because it is independent and data-only.

## D1 decision boundary

The runner deliberately does **not** invent a numeric definition of “materially improves.” The decision packet records:

- B0 and D1 vectors within ±10%;
- delta in that count;
- B0 and D1 worst tangential-vector relative error;
- normal-reaction gate and worst normal error;
- D1 constitutive-state RCA when available;
- C1 current-case-normal versus L6-normal surface statistics.

Hard gates for any D1 promotion are limited to facts already governed by Stage 2: same pinned source, frozen controls PASS, D1 converged, and every D1 normal reaction within ±10%. Promotion/rejection remains an explicit engineering decision.

Record a promotion:

```bash
node scripts/lfea-m047-stage2-next-batch.mjs \
  --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB \
  --baseline-root ../Advanced_Analysis-baseline \
  --d1-decision promote
```

`promote` does **not** run S1. Once D1 is accepted, the next S1 experiment must declare accepted D1 as its baseline and change only the state-path/re-lock mechanic. Combining D1 and the existing B0-S1 harness in this command would violate the attribution boundary.

Record a D1 rejection and run the independent B0-S1 fallback:

```bash
node scripts/lfea-m047-stage2-next-batch.mjs \
  --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB \
  --baseline-root ../Advanced_Analysis-baseline \
  --d1-decision reject \
  --run-s1
```

That S1 artifact is explicitly B0→S1. It must never be presented as S1-on-D1 evidence.

## Qualification boundary

This runner is an RCA/measurement orchestrator. It does not qualify BM4_L friction by itself. Any new accuracy statement still requires the generated real-ACCDB artifacts to be reviewed and committed under `reports/`. L7 and L1 remain separate primitive-case qualification work; L15 remains algebraic only.
