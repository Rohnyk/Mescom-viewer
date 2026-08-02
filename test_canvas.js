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

  console.log("Extracting captcha from canvas...");
  const captchaDataUrl = await page.evaluate(() => {
    const canvas = document.querySelector('canvas#captcha');
    return canvas ? canvas.toDataURL() : null;
  });

  if (captchaDataUrl) {
    console.log("SUCCESS! Captcha Data URL extracted.");
    console.log("Length:", captchaDataUrl.length);
    console.log("Starts with:", captchaDataUrl.substring(0, 50));
  } else {
    console.log("FAILED to find canvas#captcha");
  }

  await browser.close();
})();
