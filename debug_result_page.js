const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  console.log("Navigating to MESCOM payment page...");
  try {
    await page.goto('https://mescom.org.in/mescom/main/quick-payment', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
  } catch (e) {
    console.log("Navigation warning:", e.message);
  }
  await new Promise(r => setTimeout(r, 6000));

  // Extract CAPTCHA
  const captchaDataUrl = await page.evaluate(() => {
    const canvas = document.querySelector('canvas#captcha');
    return canvas ? canvas.toDataURL() : null;
  });

  if (!captchaDataUrl) {
    console.error("Failed to load CAPTCHA canvas.");
    await browser.close();
    process.exit(1);
  }

  // Save captcha to a file
  const base64Data = captchaDataUrl.replace(/^data:image\/png;base64,/, "");
  fs.writeFileSync('captcha.png', base64Data, 'base64');
  console.log("Saved CAPTCHA image to captcha.png.");

  // Open the captcha image on macOS so we can view it
  console.log("Opening captcha.png...");
  const exec = require('child_process').exec;
  exec('open captcha.png');

  rl.question('Please look at the opened captcha.png and enter the CAPTCHA code: ', async (captchaCode) => {
    try {
      console.log(`Submitting with Account No: 1234567890 and CAPTCHA: ${captchaCode}`);
      
      await page.type('input[formcontrolname="accID"]', '1234567890');
      await page.type('input#cpatchaInput', captchaCode.trim());

      await page.click('button[type="submit"]');

      console.log("Waiting 6 seconds for response page to load...");
      await new Promise(r => setTimeout(r, 6000));

      console.log("Taking screenshot of result page...");
      await page.screenshot({ path: 'result_page.png' });
      console.log("Screenshot saved as result_page.png. Opening...");
      exec('open result_page.png');

      // Extract all DOM texts, inputs, and structure
      const dump = await page.evaluate(() => {
        // Log all inputs
        const inputs = [...document.querySelectorAll('input')].map(el => {
          // Find associated labels or preceding label text
          let labelText = '';
          // Try to look for a label or a parent wrapper sibling
          const parent = el.parentElement;
          if (parent) {
            const label = parent.querySelector('label') || parent.previousElementSibling?.querySelector('label') || parent.previousElementSibling;
            if (label) labelText = label.textContent.trim();
          }
          return {
            id: el.id,
            className: el.className,
            value: el.value,
            placeholder: el.placeholder,
            type: el.type,
            labelText,
            outerHTML: el.outerHTML
          };
        });

        // Log divs with name or account
        const divs = [...document.querySelectorAll('div, h1, h2, h3, p, span')]
          .filter(el => el.textContent.includes('1234567890'))
          .map(el => ({
            tagName: el.tagName,
            className: el.className,
            text: el.textContent.trim(),
            outerHTML: el.outerHTML
          }));

        // Log any elements inside the blue card
        const mainCard = document.querySelector('.card, [style*="gradient"], [class*="banner"]');
        
        return {
          inputs,
          divs,
          mainCardHTML: mainCard ? mainCard.outerHTML : null,
          allTexts: [...document.querySelectorAll('div, p, span, td, th')].map(el => el.textContent.trim()).filter(t => t.length > 0 && t.length < 300).slice(0, 150)
        };
      });

      fs.writeFileSync('result_dump.json', JSON.stringify(dump, null, 2));
      console.log("Successfully saved page dump to result_dump.json");

    } catch (e) {
      console.error("Error during submission:", e);
    } finally {
      await browser.close();
      rl.close();
    }
  });

})();
