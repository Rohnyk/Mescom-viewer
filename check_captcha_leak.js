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

  console.log("Inspecting cookies...");
  const cookies = await page.cookies();
  console.log(JSON.stringify(cookies, null, 2));

  console.log("Inspecting window variables...");
  const windowVars = await page.evaluate(() => {
    // Return keys of the window object that are custom or related to captcha
    const customKeys = Object.keys(window).filter(k => 
      k.toLowerCase().includes('captcha') || 
      k.toLowerCase().includes('code') || 
      k.toLowerCase().includes('val')
    );
    
    // Check localStorage & sessionStorage
    const local = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      local[key] = localStorage.getItem(key);
    }
    
    const session = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      session[key] = sessionStorage.getItem(key);
    }

    // Check if the createCaptcha function puts the code in a global variable or in the DOM
    const createCaptchaStr = window.createCaptcha ? window.createCaptcha.toString() : 'not found';

    // Check if there are any hidden inputs with the captcha code
    const hiddenInputs = [...document.querySelectorAll('input[type="hidden"]')].map(el => el.outerHTML);

    return { customKeys, local, session, createCaptchaStr, hiddenInputs };
  });

  console.log("Window custom keys:", windowVars.customKeys);
  console.log("localStorage:", windowVars.local);
  console.log("sessionStorage:", windowVars.session);
  console.log("createCaptcha function source:");
  console.log(windowVars.createCaptchaStr);
  console.log("Hidden inputs:", windowVars.hiddenInputs);

  await browser.close();
})();
