const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser with stealth settings...");
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ]
  });
  
  const page = await browser.newPage();
  
  // Set window size
  await page.setViewport({ width: 1280, height: 800 });

  console.log("Navigating to MESCOM payment page...");
  try {
    await page.goto('https://mescom.org.in/mescom/main/quick-payment', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    console.log("Page domcontentloaded fired!");
  } catch (err) {
    console.error("Navigation error:", err.message);
  }
  
  console.log("Waiting 8 seconds for Angular app-root to render...");
  await new Promise(r => setTimeout(r, 8000));

  console.log("Taking screenshot of initial state...");
  await page.screenshot({ path: 'initial_state.png' });
  console.log("Screenshot saved as initial_state.png");

  console.log("Extracting DOM details...");
  const details = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')].map(el => ({
      id: el.id,
      className: el.className,
      placeholder: el.placeholder,
      name: el.name,
      type: el.type,
      outerHTML: el.outerHTML
    }));

    const imgs = [...document.querySelectorAll('img')].map(el => ({
      src: el.src,
      id: el.id,
      className: el.className,
      outerHTML: el.outerHTML
    }));

    const buttons = [...document.querySelectorAll('button')].map(el => ({
      id: el.id,
      className: el.className,
      textContent: el.textContent.trim(),
      outerHTML: el.outerHTML
    }));

    const matLabels = [...document.querySelectorAll('mat-label, label')].map(el => ({
      textContent: el.textContent.trim(),
      outerHTML: el.outerHTML
    }));

    return { inputs, imgs, buttons, matLabels, html: document.body.innerHTML.substring(0, 5000) };
  });

  console.log("\n--- INPUTS ---");
  console.log(JSON.stringify(details.inputs, null, 2));

  console.log("\n--- IMAGES ---");
  console.log(JSON.stringify(details.imgs, null, 2));

  console.log("\n--- BUTTONS ---");
  console.log(JSON.stringify(details.buttons, null, 2));

  console.log("\n--- LABELS ---");
  console.log(JSON.stringify(details.matLabels, null, 2));

  await browser.close();
})();
