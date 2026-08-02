const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log("Launching optimized Chromium...");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Enable request interception to log URLs loaded
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    const url = req.url();
    if (['font', 'media'].includes(type) || url.includes('analytics')) {
      req.abort();
    } else {
      req.continue();
    }
  });

  console.log("Navigating to MESCOM portal...");
  try {
    await page.goto('https://mescom.org.in/mescom/main/quick-payment', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    console.log("Navigation finished.");
  } catch (e) {
    console.log("Navigation failed/timed out:", e.message);
  }

  await new Promise(r => setTimeout(r, 8000));

  const title = await page.title();
  const text = await page.evaluate(() => document.body.innerText.slice(0, 500));
  const canvasExists = await page.evaluate(() => !!document.querySelector('canvas#captcha'));

  console.log("Page Title:", title);
  console.log("Page text snippet:", text);
  console.log("Does canvas exist:", canvasExists);

  console.log("Taking screenshot...");
  await page.screenshot({ path: path.join(__dirname, 'portal_screenshot.png') });
  console.log("Screenshot saved to:", path.join(__dirname, 'portal_screenshot.png'));

  await browser.close();
})();
