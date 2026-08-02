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
  await new Promise(r => setTimeout(r, 6000));

  console.log("Filling invalid details to check error behaviors...");
  
  // Enter dummy account
  await page.type('input[formcontrolname="accID"]', '1234567890');
  
  // Enter dummy captcha
  await page.type('input#cpatchaInput', 'DUMMY');

  console.log("Submitting...");
  await page.click('button[type="submit"]');

  console.log("Waiting 5 seconds for response/error...");
  await new Promise(r => setTimeout(r, 5000));

  console.log("Taking screenshot of submitted state...");
  await page.screenshot({ path: 'submitted_state.png' });

  const pageContent = await page.evaluate(() => {
    // Look for error texts (red text elements)
    const redTexts = [...document.querySelectorAll('h2, div, p, span')].filter(el => {
      const style = window.getComputedStyle(el);
      return style.color === 'rgb(255, 0, 0)' || el.textContent.includes('Invalid') || el.textContent.includes('error');
    }).map(el => ({
      tagName: el.tagName,
      className: el.className,
      text: el.textContent.trim(),
      outerHTML: el.outerHTML
    }));

    return { redTexts, html: document.body.innerHTML.substring(0, 10000) };
  });

  console.log("Detected error/status messages:");
  console.log(JSON.stringify(pageContent.redTexts, null, 2));

  await browser.close();
})();
