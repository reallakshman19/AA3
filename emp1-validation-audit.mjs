import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = '/tmp/emp1-validation-screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runValidationAudit() {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium'
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    console.log('=== VALIDATION AUDIT START ===\n');

    // Navigate to application
    console.log('Navigating to localhost:5174/Advanced_Analysis/...');
    await page.goto('http://localhost:5174/Advanced_Analysis/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Debug: check page content
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    // Take screenshot to see the initial state
    console.log('Taking initial screenshot for debugging...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '00-debug-initial.png') });

    // Look for any navigation items
    const navItems = await page.locator('[role="navigation"] *').allTextContents().catch(() => []);
    console.log('Navigation items found:', navItems.length);

    // Try to navigate directly using URL
    console.log('Attempting direct navigation to EMP.1...');
    await page.goto('http://localhost:5174/Advanced_Analysis/?view=EMPIRICAL&entity=EMP.1', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Take screenshot after navigation
    console.log('Taking screenshot after navigation attempt...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-after-navigation.png') });

    // Click the load complete qualification sample button
    console.log('Attempting to click "[SIMULATED] Load complete EMP.1 qualification sample"...');
    try {
      const loadButton = page.locator('button[data-mock-data="true"][data-role="emp1-load-complete-qualification-sample"]');
      await loadButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      // Check if visible
      const isVisible = await loadButton.isVisible();
      console.log(`Button visible: ${isVisible}`);

      if (isVisible) {
        await loadButton.click();
        console.log('✓ Sample load button clicked');
        await page.waitForTimeout(3000);
      } else {
        console.log('⚠ Button not visible after scroll');
        // Try clicking anyway
        await loadButton.click({ force: true });
        await page.waitForTimeout(3000);
      }
    } catch (e) {
      console.log('⚠ Click failed:', e.message);
    }

    // Take screenshot 1: desktop default
    console.log('Capturing screenshot 1: desktop default...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-desktop-default.png') });
    console.log('✓ Screenshot 1 saved');

    // Run desktop audit with seedQualificationPressure: true
    console.log('\nRunning desktop audit with seedQualificationPressure: true...');
    let desktopAuditResult;
    try {
      // First, check if the function exists and load if needed
      const functionExists = await page.evaluate(() => {
        return typeof window.runEmp1ManualBrowserAudit === 'function';
      });
      console.log(`runEmp1ManualBrowserAudit exists: ${functionExists}`);

      if (!functionExists) {
        console.log('Attempting to load audit script...');
        await page.addScriptTag({ path: '/home/user/Advanced_Analysis/scripts/emp1-manual-browser-audit.js' });
      }

      desktopAuditResult = await page.evaluate(async () => {
        return await window.runEmp1ManualBrowserAudit({ seedQualificationPressure: true });
      });
    } catch (e) {
      console.log('Desktop audit error:', e.message);
      desktopAuditResult = { error: e.message, status: 'AUDIT_ERROR' };
    }

    console.log('\n=== DESKTOP AUDIT RESULT ===');
    console.log(JSON.stringify(desktopAuditResult, null, 2));

    // Open "Readiness / review / technical custody"
    console.log('\nOpening Readiness / review / technical custody...');
    try {
      await page.getByText('Readiness').first().click().catch(() => console.log('Readiness click failed'));
      await page.waitForTimeout(500);

      await page.getByText('review').first().click().catch(() => console.log('review click failed'));
      await page.waitForTimeout(500);

      await page.getByText('technical custody').first().click().catch(() => console.log('custody click failed'));
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('Navigation error:', e.message);
    }

    // Take screenshot 2: readiness open
    console.log('Capturing screenshot 2: readiness open view...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-desktop-readiness-open.png') });
    console.log('✓ Screenshot 2 saved');

    // Resize to 720 x 900
    console.log('\nResizing viewport to 720 × 900...');
    await page.setViewportSize({ width: 720, height: 900 });
    await page.waitForTimeout(1000);

    // Navigate to EMPIRICAL → EMP.1 again
    console.log('Navigating to EMP.1 for narrow viewport...');
    await page.goto('http://localhost:5174/Advanced_Analysis/?view=EMPIRICAL&entity=EMP.1', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Click sample load button again
    try {
      const loadButton = page.locator('button[data-mock-data="true"][data-role="emp1-load-complete-qualification-sample"]');
      await loadButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await loadButton.click({ force: true });
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log('Sample load button click failed in narrow:', e.message);
    }

    // Run narrow audit
    console.log('\nRunning narrow audit (720 × 900)...');
    let narrowAuditResult;
    try {
      const functionExists = await page.evaluate(() => {
        return typeof window.runEmp1ManualBrowserAudit === 'function';
      });
      console.log(`runEmp1ManualBrowserAudit exists (narrow): ${functionExists}`);

      if (!functionExists) {
        console.log('Attempting to load audit script (narrow)...');
        await page.addScriptTag({ path: '/home/user/Advanced_Analysis/scripts/emp1-manual-browser-audit.js' });
      }

      narrowAuditResult = await page.evaluate(async () => {
        return await window.runEmp1ManualBrowserAudit();
      });
    } catch (e) {
      console.log('Narrow audit error:', e.message);
      narrowAuditResult = { error: e.message, status: 'AUDIT_ERROR' };
    }

    console.log('\n=== NARROW AUDIT RESULT ===');
    console.log(JSON.stringify(narrowAuditResult, null, 2));

    // Take screenshot 3: narrow view
    console.log('\nCapturing screenshot 3: narrow view (720 × 900)...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-narrow-view-720x900.png') });
    console.log('✓ Screenshot 3 saved');

    // Test CAUx keyboard navigation
    console.log('\nTesting CAUx keyboard navigation...');
    console.log('Looking for Evidence tab...');
    const evidenceTab = page.getByText('Evidence');
    if (await evidenceTab.first().isVisible().catch(() => false)) {
      await evidenceTab.first().click();
      await page.waitForTimeout(1000);

      const benchmarkTab = page.getByText('Benchmark Evidence');
      if (await benchmarkTab.first().isVisible().catch(() => false)) {
        await benchmarkTab.first().click();
        await page.waitForTimeout(1000);
      }
    }

    const cauxDisclosure = page.getByText('CAUx retained audit disclosure');
    if (await cauxDisclosure.first().isVisible().catch(() => false)) {
      await cauxDisclosure.first().focus();
      await page.waitForTimeout(500);

      // Press Enter to open
      console.log('Pressing Enter to open CAUx disclosure...');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      const isOpenAfterEnter = await cauxDisclosure.first().evaluate(el => {
        const disclosure = el.closest('[role="button"]') || el;
        return disclosure.getAttribute('aria-expanded') === 'true' || disclosure.classList.contains('open');
      }).catch(() => false);

      if (isOpenAfterEnter) {
        console.log('✓ Enter opened CAUx disclosure');
      } else {
        console.log('⚠ Enter did not visibly open CAUx disclosure');
      }

      // Press Space to close
      console.log('Pressing Space to close CAUx disclosure...');
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      const isClosedAfterSpace = await cauxDisclosure.first().evaluate(el => {
        const disclosure = el.closest('[role="button"]') || el;
        return disclosure.getAttribute('aria-expanded') !== 'true' && !disclosure.classList.contains('open');
      }).catch(() => false);

      if (isClosedAfterSpace) {
        console.log('✓ Space closed CAUx disclosure');
        console.log('\nkeyboard PASS');
      } else {
        console.log('⚠ Space did not visibly close CAUx disclosure');
        console.log('\nkeyboard PARTIAL');
      }
    } else {
      console.log('⚠ CAUx retained audit disclosure not found');
      console.log('\nkeyboard FAIL - CAUx disclosure not found');
    }

    console.log('\n=== VALIDATION AUDIT COMPLETE ===');
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);

    // Save results to JSON file for easier retrieval
    const results = {
      desktopAudit: desktopAuditResult,
      narrowAudit: narrowAuditResult,
      screenshotsPath: SCREENSHOTS_DIR
    };

    fs.writeFileSync('/tmp/emp1-validation-results.json', JSON.stringify(results, null, 2));
    console.log('\nResults saved to /tmp/emp1-validation-results.json');

    await page.close();
  } finally {
    await browser.close();
  }
}

runValidationAudit().catch(err => {
  console.error('Validation audit failed:', err);
  process.exit(1);
});
