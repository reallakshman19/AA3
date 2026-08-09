#!/usr/bin/env python3
"""Diagnostic-only scalar bend-flexibility falsification for issue 947.

Temporarily scales only the sealed bend component flexibilityFactor consumed by
production bend stiffness, runs exact production-descendant condensation under
pinned CAESAR L19 boundary kinematics, and compares the full 12-component action
residual. The source file is restored after every evaluation. Nothing is
committed or promoted by this script.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import subprocess
import tempfile

SOURCE = Path('src/core/linear-fea-b31-factor-calculator/records.js')
ANCHOR = 'flexibilityFactor: { value: factors.flexibility.inPlane, source },'
TARGETS = (
    ('E19_E20', ('--source-elements', '19,20')),
    ('E25', ('--source-element', '25')),
    ('E36', ('--source-element', '36')),
    ('E48', ('--source-element', '48')),
    ('E85', ('--source-element', '85')),
)
COMPONENT_GATE = 0.1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--package', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()

    original = SOURCE.read_text()
    if original.count(ANCHOR) != 1:
        raise SystemExit(f'Expected exactly one bend flexibilityFactor anchor; found {original.count(ANCHOR)}')

    # Coarse grid establishes topology of the objective and guards against a
    # local optimizer selecting a misleading basin. 0.4..1.6 spans effective
    # k roughly 1.55..6.21 for BM4_NL's baseline k ~=3.88.
    coarse_scales = [round(0.4 + 0.1 * i, 10) for i in range(13)]
    coarse = {label: [] for label, _ in TARGETS}
    cache: dict[tuple[str, float], dict] = {}

    try:
        for scale in coarse_scales:
            for label, selector in TARGETS:
                metrics = evaluate(original, args.package, label, selector, scale)
                cache[(label, scale)] = metrics
                coarse[label].append(metrics)

        optima = {}
        for label, selector in TARGETS:
            seed = min(coarse[label], key=lambda x: x['normalizedResidualL2'])['scale']
            lo = max(0.3, seed - 0.15)
            hi = min(1.8, seed + 0.15)
            optimum = golden_section(original, args.package, label, selector, lo, hi, cache)
            optima[label] = optimum

        # A common scalar is tested independently on an aggregate objective.
        # The grid is intentionally finer than the per-bend coarse scan.
        common_scales = [round(0.35 + 0.025 * i, 10) for i in range(59)]  # 0.35..1.80
        common_records = []
        for scale in common_scales:
            target_metrics = []
            for label, selector in TARGETS:
                key = (label, scale)
                metrics = cache.get(key)
                if metrics is None:
                    metrics = evaluate(original, args.package, label, selector, scale)
                    cache[key] = metrics
                target_metrics.append(metrics)
            common_records.append({
                'scale': scale,
                'aggregateL2Squared': sum(m['normalizedResidualL2'] ** 2 for m in target_metrics),
                'worstMaxAbsNormalizedResidual': max(m['maxAbsNormalizedResidual'] for m in target_metrics),
                'allComponentsPass': all(m['maxAbsNormalizedResidual'] <= COMPONENT_GATE for m in target_metrics),
                'targets': {m['target']: m for m in target_metrics},
            })
        common_best = min(common_records, key=lambda x: x['aggregateL2Squared'])
        any_common_pass = any(record['allComponentsPass'] for record in common_records)

        best_scales = [value['scale'] for value in optima.values()]
        spread = max(best_scales) - min(best_scales)
        result = {
            'schema': 'lfea-issue947-bend-scalar-flexibility-falsification/v1',
            'issue': 947,
            'caseId': 'L19',
            'sourceAccdbSha256': '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21',
            'scope': 'DIAGNOSTIC_ONLY_NO_PRODUCTION_UPDATE_NO_REFERENCE_MUTATION',
            'parameter': 'MULTIPLIER_ON_PRODUCTION_B31_BEND_FLEXIBILITY_FACTOR_K',
            'baselineScale': 1,
            'sampledRange': [0.35, 1.8],
            'componentGate': COMPONENT_GATE,
            'targets': [label for label, _ in TARGETS],
            'coarse': coarse,
            'independentOptima': optima,
            'independentOptimumScaleSpread': spread,
            'commonBest': common_best,
            'anySampledCommonScalePassesAllComponents': any_common_pass,
            'classification': (
                'SCALAR_BEND_FLEXIBILITY_FACTOR_FALSIFIED_AS_COMMON_ROOT_MECHANIC'
                if (not any_common_pass and spread > 0.05)
                else 'SCALAR_FACTOR_NOT_FALSIFIED_BY_THIS_SWEEP'
            ),
            'falsificationRule': (
                'Reject a scalar-k root mechanic when independently optimized bends require materially different '
                'multipliers and no common sampled multiplier in [0.35,1.80] brings every target under the unchanged '
                '10% component action gate. This sweep may diagnose matrix structure but cannot authorize a coefficient.'
            ),
        }
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps({
            'classification': result['classification'],
            'independentOptima': {k: {x: v[x] for x in ('scale','normalizedResidualL2','maxAbsNormalizedResidual','governingComponent')} for k,v in optima.items()},
            'commonBest': {k: common_best[k] for k in ('scale','aggregateL2Squared','worstMaxAbsNormalizedResidual','allComponentsPass')},
            'scaleSpread': spread,
        }, indent=2))
    finally:
        SOURCE.write_text(original)


def patch_source(original: str, scale: float) -> None:
    replacement = f'flexibilityFactor: {{ value: factors.flexibility.inPlane * {scale:.15g}, source }},'
    SOURCE.write_text(original.replace(ANCHOR, replacement))


def evaluate(original: str, package: str, label: str, selector: tuple[str, str], scale: float) -> dict:
    patch_source(original, scale)
    with tempfile.NamedTemporaryFile(prefix='issue947-bend-', suffix='.json', delete=False) as handle:
        out_path = Path(handle.name)
    try:
        cmd = [
            'node', 'scripts/lfea-issue947-bend-descendant-condensation-audit.mjs',
            '--package', package, selector[0], selector[1], '--out', str(out_path),
        ]
        completed = subprocess.run(cmd, check=False, text=True, capture_output=True)
        if completed.returncode != 0:
            raise RuntimeError(f'{label} scale {scale} failed:\n{completed.stdout}\n{completed.stderr}')
        data = json.loads(out_path.read_text())
        c = data['caesarInjection']
        if data['productionParity']['maxAbsResidual'] > 1e-3:
            raise RuntimeError(f'{label} scale {scale} production parity failed')
        return {
            'target': label,
            'scale': scale,
            'classification': data['classification'],
            'normalizedResidualL2': c['normalizedResidualL2'],
            'maxAbsNormalizedResidual': c['maxAbsNormalizedResidual'],
            'governingComponent': c['governingComponent'],
            'normalizedResidual': c['normalizedResidual'],
            'definitelyFailingComponents': c['rotationResolutionAssessment']['definitelyFailingComponents'],
            'productionParityMaxAbs': data['productionParity']['maxAbsResidual'],
        }
    finally:
        out_path.unlink(missing_ok=True)
        SOURCE.write_text(original)


def golden_section(original: str, package: str, label: str, selector: tuple[str, str], lo: float, hi: float,
                   cache: dict[tuple[str, float], dict]) -> dict:
    phi = (1 + math.sqrt(5)) / 2
    def get(x: float) -> dict:
        x = round(x, 12)
        key = (label, x)
        if key not in cache:
            cache[key] = evaluate(original, package, label, selector, x)
        return cache[key]
    x1 = hi - (hi - lo) / phi
    x2 = lo + (hi - lo) / phi
    f1, f2 = get(x1), get(x2)
    for _ in range(12):
        if f1['normalizedResidualL2'] < f2['normalizedResidualL2']:
            hi, x2, f2 = x2, x1, f1
            x1 = hi - (hi - lo) / phi
            f1 = get(x1)
        else:
            lo, x1, f1 = x1, x2, f2
            x2 = lo + (hi - lo) / phi
            f2 = get(x2)
    candidates = [f1, f2, get((lo + hi) / 2)]
    return min(candidates, key=lambda x: x['normalizedResidualL2'])


if __name__ == '__main__':
    main()
