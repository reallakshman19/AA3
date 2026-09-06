import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const PROJECT_LOCAL_PLAYWRIGHT_ENV = Object.freeze({
  PLAYWRIGHT_BROWSERS_PATH: '0',
});

export function withProjectLocalPlaywrightEnv(env = process.env) {
  return { ...env, ...PROJECT_LOCAL_PLAYWRIGHT_ENV };
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
    return blocker('PLAYWRIGHT_CHROMIUM_PROBE_FAILED', {
      message: 'Unable to resolve the project-local Chromium executable from Playwright.',
      probeExitCode: probe.status ?? 1,
      stderr: probe.stderr?.trim() || null,
    });
  }

  let resolved;
  try {
    resolved = JSON.parse(probe.stdout.trim());
  } catch (error) {
    return blocker('PLAYWRIGHT_CHROMIUM_PROBE_INVALID_OUTPUT', {
      message: 'Project-local Chromium probe returned invalid JSON.',
      stdout: probe.stdout?.trim() || null,
      parseError: error instanceof Error ? error.message : String(error),
    });
  }

  if (!resolved?.executable || resolved.exists !== true) {
    return blocker('PLAYWRIGHT_LOCAL_CHROMIUM_MISSING', {
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

function blocker(code, detail) {
  return {
    ok: false,
    status: 'BLOCKED_ENVIRONMENT',
    code,
    browsersPath: PROJECT_LOCAL_PLAYWRIGHT_ENV.PLAYWRIGHT_BROWSERS_PATH,
    ...detail,
  };
}
