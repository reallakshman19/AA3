import { chromium } from 'playwright';

async function run() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('Navigating to http://localhost:5174/Advanced_Analysis/');
    await page.goto('http://localhost:5174/Advanced_Analysis/', { waitUntil: 'networkidle' });
    
    console.log('Page loaded. Checking for Load Calc tab...');
    // Look for tabs that contain the text "Load Calc" or "Empirical Load Calculation"
    const tabs = await page.$$eval('button[role="tab"]', els => els.map(el => ({ text: el.textContent, id: el.id, class: el.className })));
    console.log('Found tabs:', tabs);

    let foundTab = false;
    for (const t of tabs) {
        if (t.text.includes('Load Calc') || t.text.includes('Empirical')) {
            console.log('Clicking tab:', t.text);
            const els = await page.$$('button[role="tab"]');
            for (const el of els) {
                const text = await el.textContent();
                if (text === t.text) {
                    await el.click();
                    foundTab = true;
                    await page.waitForTimeout(1000);
                    break;
                }
            }
            break;
        }
    }

    if (!foundTab) {
        console.log('Could not find Load Calc tab explicitly, looking for any Empirical tab...');
        const empiricalTab = await page.$('text="Empirical"');
        if (empiricalTab) {
            await empiricalTab.click();
            await page.waitForTimeout(1000);
        }
    }

    console.log('Looking for file input to upload the JSON file...');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
        console.log('Uploading file D:\\Code3\\3D_Converters\\Benchmarks\\1885Sjson\\Sjson.json...');
        await fileInput.setInputFiles('D:\\Code3\\3D_Converters\\Benchmarks\\1885Sjson\\Sjson.json');
        await page.waitForTimeout(3000);
    } else {
        console.log('No file input found directly. Attempting to click an Import button...');
        const importBtn = await page.$('text="Import"');
        if (importBtn) {
            await importBtn.click();
            await page.waitForTimeout(1000);
            const fileInputAfter = await page.$('input[type="file"]');
            if (fileInputAfter) {
                 await fileInputAfter.setInputFiles('D:\\Code3\\3D_Converters\\Benchmarks\\1885Sjson\\Sjson.json');
                 await page.waitForTimeout(3000);
            }
        } else {
            console.log('No file input or import button found.');
        }
    }

    // Capture screenshot
    await page.screenshot({ path: 'C:\\Users\\reall\\AppData\\Local\\Temp\\load_calc_screenshot.png', fullPage: true });
    console.log('Screenshot saved to C:\\Users\\reall\\AppData\\Local\\Temp\\load_calc_screenshot.png');

    console.log('Page content after upload:');
    const content = await page.content();
    console.log(content.substring(0, 1000));

  } catch (error) {
    console.error('Error running automation:', error);
  } finally {
    if (browser) await browser.close();
  }
}

run();
