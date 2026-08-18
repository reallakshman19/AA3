#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = 4179;
const ORIGIN = `http://${HOST}:${PORT}`;
const URL = `${ORIGIN}/Advanced_Analysis/`;
const CHROMIUM_EXECUTABLE_PATH = process.env.CHROMIUM_EXECUTABLE_PATH;

if (!CHROMIUM_EXECUTABLE_PATH) {
  throw new Error('BUNDLE_BROWSER_CHROMIUM_EXECUTABLE_PATH_REQUIRED');
}
if (!fs.existsSync(CHROMIUM_EXECUTABLE_PATH)) {
  throw new Error(`BUNDLE_BROWSER_CHROMIUM_EXECUTABLE_MISSING:${CHROMIUM_EXECUTABLE_PATH}`);
}

const preview = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js',
  'preview',
  '--host', HOST,
  '--port', String(PORT),
  '--strictPort',
], {
  cwd: process.cwd(),
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let previewLog = '';
preview.stdout.on('data', (chunk) => { previewLog += String(chunk); });
preview.stderr.on('data', (chunk) => { previewLog += String(chunk); });

try {
  await waitForServer(`${ORIGIN}/Advanced_Analysis/`);
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM_EXECUTABLE_PATH,
  });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    const response = await page.goto(URL, { waitUntil: 'networkidle', timeout: 30_000 });
    if (!response || !response.ok()) {
      throw new Error(`BUNDLE_BROWSER_BOOT_HTTP_${response?.status() ?? 'NO_RESPONSE'}`);
    }
    await page.waitForTimeout(500);

    const bodyTextLength = await page.locator('body').innerText().then((value) => value.trim().length);
    if (bodyTextLength === 0) throw new Error('BUNDLE_BROWSER_BOOT_EMPTY_BODY');

    const resourceNames = await page.evaluate(() => performance.getEntriesByType('resource')
      .map((entry) => entry.name));
    const loadCalcViewResources = resourceNames.filter((name) => /load-calc-consumer-view-[^/]+\.js(?:$|\?)/u.test(name));
    if (loadCalcViewResources.length !== 1) {
      throw new Error(`BUNDLE_BROWSER_LOAD_CALC_VIEW_CHUNK_COUNT_${loadCalcViewResources.length}`);
    }
    const discretizationResources = resourceNames.filter(
      (name) => /lafea-discretization-generation-[^/]+\.js(?:$|\?)/u.test(name),
    );
    if (discretizationResources.length !== 1) {
      throw new Error(`BUNDLE_BROWSER_DISCRETIZATION_GENERATION_CHUNK_COUNT_${discretizationResources.length}`);
    }
    if (pageErrors.length) {
      throw new Error(`BUNDLE_BROWSER_PAGE_ERROR:${pageErrors.join(' | ')}`);
    }
    if (consoleErrors.length) {
      throw new Error(`BUNDLE_BROWSER_CONSOLE_ERROR:${consoleErrors.join(' | ')}`);
    }

    process.stdout.write(`${JSON.stringify({
      check: 'lafea-bundle-production-browser-boot',
      status: 'PASS',
      url: URL,
      chromiumExecutablePath: CHROMIUM_EXECUTABLE_PATH,
      bodyTextLength,
      loadCalcViewChunk: loadCalcViewResources[0],
      lafeaDiscretizationGenerationChunk: discretizationResources[0],
      pageErrorCount: pageErrors.length,
      consoleErrorCount: consoleErrors.length,
    }, null, 2)}\n`);
  } finally {
    await browser.close();
  }
} finally {
  preview.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => preview.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
}

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  let lastError = null;
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) {
      throw new Error(`BUNDLE_BROWSER_PREVIEW_EXIT_${preview.exitCode}:${previewLog.slice(-4000)}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP_${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`BUNDLE_BROWSER_PREVIEW_NOT_READY:${lastError?.message || 'UNKNOWN'}:${previewLog.slice(-4000)}`);
}
