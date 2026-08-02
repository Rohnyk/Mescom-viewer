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

  const nearCaptcha = await page.evaluate(() => {
    const input = document.getElementById('cpatchaInput');
    if (!input) return "Captcha input not found";
    
    const parent = input.parentElement;
    const grandparent = parent ? parent.parentElement : null;
    
    const canvases = [...document.querySelectorAll('canvas')].map(c => c.outerHTML);
    const potentialImages = [...document.querySelectorAll('img, svg, canvas, [style*="background"]')].map(el => el.outerHTML);
    
    return {
      parentHTML: parent ? parent.outerHTML : null,
      grandparentHTML: grandparent ? grandparent.outerHTML : null,
      canvases,
      potentialImages: potentialImages.slice(0, 15)
    };
  });

  console.log("Grandparent HTML:");
  console.log(nearCaptcha.grandparentHTML);
  console.log("\nCanvases:", nearCaptcha.canvases);

  await browser.close();
})();
