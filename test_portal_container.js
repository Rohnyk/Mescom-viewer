const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching Chromium inside container...");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
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

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    const type = req.resourceType();
    
    // Block fonts, trackers, recaptcha, and payment gateway (paynimo)
    if (['font', 'media'].includes(type) || url.includes('analytics') || url.includes('recaptcha') || url.includes('paynimo') || url.includes('fontawesome')) {
      console.log(`[ABORT] -> ${url}`);
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
    console.log("Navigation finished successfully.");
  } catch (e) {
    console.log("Navigation timed out or failed:", e.message);
  }

  console.log("Waiting 6 seconds for Angular bootstrap...");
  await new Promise(r => setTimeout(r, 6000));

  const canvasExists = await page.evaluate(() => !!document.querySelector('canvas#captcha'));
  console.log("Does canvas exist:", canvasExists);

  if (canvasExists) {
    const captchaVal = await page.evaluate(() => window.code || (typeof code !== 'undefined' ? code : null));
    console.log("Leaked CAPTCHA code:", captchaVal);
  }

  await browser.close();
})();
