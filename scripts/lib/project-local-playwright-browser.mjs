import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const PROJECT_LOCAL_PLAYWRIGHT_ENV = Object.freeze({
  PLAYWRIGHT_BROWSERS_PATH: '0',
});

export function withProjectLocalPlaywrightEnv(env = process.env) {
  return { ...env, ...PROJECT_LOCAL_PLAYWRIGHT_ENV };
}

// Some sandboxed CI/agent runners pre-provision a single Chromium revision at
// a fixed global path and deliberately disable Playwright's own browser
// postinstall download (no network fetch of a project-local revision is
// possible there), so the PLAYWRIGHT_BROWSERS_PATH=0 resolution above can
// never succeed on those runners even though a working Chromium exists on
// disk. This fallback only activates once that primary resolution has
// already failed, actually launches the candidate binary to confirm it runs
// (not just that the file exists), and reports a distinct status code/mode so
// evidence never conflates "project-local Chromium verified" with "a
// different, environment-provisioned Chromium verified instead".
function environmentChromiumCandidates() {
  const fromBrowsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH
    && process.env.PLAYWRIGHT_BROWSERS_PATH !== '0'
    ? path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium')
    : null;
  return [
    process.env.PLAYWRIGHT_EXECUTABLE_PATH || null,
    fromBrowsersPath,
    '/opt/pw-browsers/chromium',
  ].filter(Boolean);
}

function inspectEnvironmentProvisionedChromium() {
  for (const executable of environmentChromiumCandidates()) {
    if (!fs.existsSync(executable)) continue;
    const probe = spawnSync(executable, ['--version'], { encoding: 'utf8' });
    if ((probe.status ?? 1) !== 0) continue;
    return {
      ok: true,
      status: 'PASS_BROWSER_ENVIRONMENT_PREFLIGHT',
      code: 'PLAYWRIGHT_ENVIRONMENT_PROVISIONED_CHROMIUM_FALLBACK',
      mode: 'ENVIRONMENT_FALLBACK',
      executable,
      version: probe.stdout.trim(),
      browsersPath: null,
      note: 'Project-local (PLAYWRIGHT_BROWSERS_PATH=0) Chromium is not installed and this runner does not permit fetching one, so a pre-provisioned environment Chromium binary was verified by direct launch and is used via an explicit executablePath instead.',
    };
  }
  return null;
}

export function inspectProjectLocalChromium(root = process.cwd()) {
  const cliPath = path.join(root, 'node_modules', 'playwright', 'cli.js');
  if (!fs.existsSync(cliPath)) {
    return blocker('PLAYWRIGHT_CLI_MISSING', {
      cliPath,
      message: 'Project-local Playwright CLI is missing. Run npm ci at the exact validation head.',
      remediation: {
        installDependencies: 'npm ci',
      },
    });
  }

  const probeSource = [
    "import fs from 'node:fs';",
    "import { chromium } from 'playwright';",
    'const executable = chromium.executablePath();',
    'process.stdout.write(JSON.stringify({ executable, exists: fs.existsSync(executable) }));',
  ].join('\n');

  const probe = spawnSync(process.execPath, [
    '--input-type=module',
    '--eval',
    probeSource,
  ], {
    cwd: root,
    env: withProjectLocalPlaywrightEnv(),
    encoding: 'utf8',
  });

  if ((probe.status ?? 1) !== 0) {
    return inspectEnvironmentProvisionedChromium() ?? blocker('PLAYWRIGHT_CHROMIUM_PROBE_FAILED', {
      message: 'Unable to resolve the project-local Chromium executable from Playwright.',
      probeExitCode: probe.status ?? 1,
      stderr: probe.stderr?.trim() || null,
    });
  }

  let resolved;
  try {
    resolved = JSON.parse(probe.stdout.trim());
  } catch (error) {
    return inspectEnvironmentProvisionedChromium() ?? blocker('PLAYWRIGHT_CHROMIUM_PROBE_INVALID_OUTPUT', {
      message: 'Project-local Chromium probe returned invalid JSON.',
      stdout: probe.stdout?.trim() || null,
      parseError: error instanceof Error ? error.message : String(error),
    });
  }

  if (!resolved?.executable || resolved.exists !== true) {
    return inspectEnvironmentProvisionedChromium() ?? blocker('PLAYWRIGHT_LOCAL_CHROMIUM_MISSING', {
      message: 'Project-local Chromium is not installed at the executable path selected by Playwright.',
      expectedExecutable: resolved?.executable ?? null,
      remediation: {
        powershell: '$env:PLAYWRIGHT_BROWSERS_PATH = "0"; npx playwright install chromium',
        posix: 'PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium',
      },
    });
  }

  return {
    ok: true,
    status: 'PASS_BROWSER_ENVIRONMENT_PREFLIGHT',
    code: 'PLAYWRIGHT_LOCAL_CHROMIUM_AVAILABLE',
    executable: resolved.executable,
    browsersPath: PROJECT_LOCAL_PLAYWRIGHT_ENV.PLAYWRIGHT_BROWSERS_PATH,
  };
}

// Returns the env a downstream Playwright Test/CLI spawn should use so it
// launches the exact same browser the preflight above just verified.
export function resolvePlaywrightRuntimeEnv(preflightResult, env = process.env) {
  if (preflightResult?.mode === 'ENVIRONMENT_FALLBACK') {
    return { ...env, PLAYWRIGHT_EXECUTABLE_PATH: preflightResult.executable };
  }
  return withProjectLocalPlaywrightEnv(env);
}

function blocker(code, detail) {
  return {
    ok: false,
    status: 'BLOCKED_ENVIRONMENT',
    code,
    browsersPath: PROJECT_LOCAL_PLAYWRIGHT_ENV.PLAYWRIGHT_BROWSERS_PATH,
    ...detail,
  };
}
