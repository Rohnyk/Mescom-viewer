const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files from this directory
app.use(express.static(__dirname));

// --- Seed Data: One record per account, history[] array per account ---
const SEED_ACCOUNTS = [
  {
    id: 1, account: "MNG-1000000001", name: "John Doe", address: "Kadri, Mangaluru",
    sanctionedLoad: "3 kW", tariff: "LT-2(a)", meterNo: "MPL74552", roomNo: "101",
    history: [
      { billMonth: "2026-06", units: 312, amount: 2184, dueDate: "2026-07-15", status: "unpaid" },
      { billMonth: "2026-05", units: 278, amount: 1946, dueDate: "2026-06-15", status: "paid" },
      { billMonth: "2026-04", units: 245, amount: 1715, dueDate: "2026-05-15", status: "paid" },
      { billMonth: "2026-03", units: 198, amount: 1386, dueDate: "2026-04-15", status: "paid" },
      { billMonth: "2026-02", units: 220, amount: 1540, dueDate: "2026-03-15", status: "paid" },
      { billMonth: "2026-01", units: 260, amount: 1820, dueDate: "2026-02-15", status: "paid" },
    ]
  },
  {
    id: 2, account: "MNG-1000000002", name: "Priya Sharma", address: "Bejai, Mangaluru",
    sanctionedLoad: "5 kW", tariff: "LT-2(b)", meterNo: "KE30198275", roomNo: "102",
    history: [
      { billMonth: "2026-06", units: 410, amount: 3280, dueDate: "2026-07-18", status: "unpaid" },
      { billMonth: "2026-05", units: 390, amount: 3120, dueDate: "2026-06-18", status: "paid" },
      { billMonth: "2026-04", units: 375, amount: 3000, dueDate: "2026-05-18", status: "paid" },
      { billMonth: "2026-03", units: 420, amount: 3360, dueDate: "2026-04-18", status: "paid" },
      { billMonth: "2026-02", units: 385, amount: 3080, dueDate: "2026-03-18", status: "paid" },
      { billMonth: "2026-01", units: 350, amount: 2800, dueDate: "2026-02-18", status: "paid" },
    ]
  },
  {
    id: 3, account: "MNG-1000000003", name: "Suresh Kumar", address: "Falnir, Mangaluru",
    sanctionedLoad: "3 kW", tariff: "LT-2(a)", meterNo: "ML41289073", roomNo: "201",
    history: [
      { billMonth: "2026-06", units: 185, amount: 1295, dueDate: "2026-07-12", status: "overdue" },
      { billMonth: "2026-05", units: 170, amount: 1190, dueDate: "2026-06-12", status: "paid" },
      { billMonth: "2026-04", units: 160, amount: 1120, dueDate: "2026-05-12", status: "paid" },
      { billMonth: "2026-03", units: 155, amount: 1085, dueDate: "2026-04-12", status: "paid" },
      { billMonth: "2026-02", units: 140, amount: 980,  dueDate: "2026-03-12", status: "paid" },
      { billMonth: "2026-01", units: 175, amount: 1225, dueDate: "2026-02-12", status: "paid" },
    ]
  },
  {
    id: 4, account: "MNG-1000000004", name: "Meera Pai", address: "Hampankatta, Mangaluru",
    sanctionedLoad: "4 kW", tariff: "LT-2(a)", meterNo: "HP55678321", roomNo: "202",
    history: [
      { billMonth: "2026-06", units: 290, amount: 2030, dueDate: "2026-07-20", status: "unpaid" },
      { billMonth: "2026-05", units: 310, amount: 2170, dueDate: "2026-06-20", status: "paid" },
      { billMonth: "2026-04", units: 275, amount: 1925, dueDate: "2026-05-20", status: "paid" },
      { billMonth: "2026-03", units: 260, amount: 1820, dueDate: "2026-04-20", status: "paid" },
      { billMonth: "2026-02", units: 240, amount: 1680, dueDate: "2026-03-20", status: "paid" },
      { billMonth: "2026-01", units: 255, amount: 1785, dueDate: "2026-02-20", status: "paid" },
    ]
  },
  {
    id: 5, account: "MNG-1000000005", name: "Anil Shetty", address: "Kankanady, Mangaluru",
    sanctionedLoad: "3 kW", tariff: "LT-2(a)", meterNo: "KK78901245", roomNo: "301",
    history: [
      { billMonth: "2026-06", units: 195, amount: 1365, dueDate: "2026-07-10", status: "paid" },
      { billMonth: "2026-05", units: 210, amount: 1470, dueDate: "2026-06-10", status: "paid" },
      { billMonth: "2026-04", units: 180, amount: 1260, dueDate: "2026-05-10", status: "paid" },
      { billMonth: "2026-03", units: 200, amount: 1400, dueDate: "2026-04-10", status: "paid" },
    ]
  },
  {
    id: 6, account: "MNG-1000000006", name: "Ganesh Bhat", address: "Surathkal, Mangaluru",
    sanctionedLoad: "3 kW", tariff: "LT-2(a)", meterNo: "KE60345198", roomNo: "302",
    history: [
      { billMonth: "2026-06", units: 225, amount: 1575, dueDate: "2026-07-14", status: "unpaid" },
      { billMonth: "2026-05", units: 215, amount: 1505, dueDate: "2026-06-14", status: "paid" },
      { billMonth: "2026-04", units: 200, amount: 1400, dueDate: "2026-05-14", status: "paid" },
      { billMonth: "2026-03", units: 188, amount: 1316, dueDate: "2026-04-14", status: "paid" },
      { billMonth: "2026-02", units: 175, amount: 1225, dueDate: "2026-03-14", status: "paid" },
      { billMonth: "2026-01", units: 192, amount: 1344, dueDate: "2026-02-14", status: "paid" },
    ]
  },
];

const DATA_DIR = path.join(__dirname, 'data');
const JSON_DB_FILE = path.join(DATA_DIR, 'bills.json');
const XLSX_DB_FILE = path.join(DATA_DIR, 'bills.xlsx');
const MAX_HISTORY = 12;

// --- Helper Functions to Load/Save Database ---
function loadBillsDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(JSON_DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(JSON_DB_FILE, 'utf8'));
    } catch (e) {
      console.error("Failed to parse JSON DB, falling back to seeds:", e);
    }
  }

  // If no DB exists, initialize it with seed data
  saveBillsDatabase(SEED_ACCOUNTS);
  return JSON.parse(JSON.stringify(SEED_ACCOUNTS));
}

function saveBillsDatabase(accounts) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Write JSON
  fs.writeFileSync(JSON_DB_FILE, JSON.stringify(accounts, null, 2));

  // Write Excel spreadsheet — flatten history into rows for readability
  const excelData = [];
  accounts.forEach(acc => {
    if (acc.history && acc.history.length > 0) {
      acc.history.forEach(h => {
        excelData.push({
          'ID': acc.id,
          'Account No': acc.account,
          'Consumer Name': acc.name,
          'Room No': acc.roomNo || '',
          'Address': acc.address,
          'Meter No': acc.meterNo,
          'Tariff': acc.tariff,
          'Sanctioned Load': acc.sanctionedLoad,
          'Bill Month': h.billMonth,
          'Units (kWh)': h.units,
          'Amount (Rs)': h.amount,
          'Due Date': h.dueDate,
          'Status': h.status,
        });
      });
    } else {
      excelData.push({
        'ID': acc.id,
        'Account No': acc.account,
        'Consumer Name': acc.name,
        'Room No': acc.roomNo || '',
        'Address': acc.address,
        'Meter No': acc.meterNo,
        'Tariff': acc.tariff,
        'Sanctioned Load': acc.sanctionedLoad,
        'Bill Month': '',
        'Units (kWh)': '',
        'Amount (Rs)': '',
        'Due Date': '',
        'Status': '',
      });
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MESCOM Bills');
  XLSX.writeFile(workbook, XLSX_DB_FILE);
  console.log(`Spreadsheet database synced: ${accounts.length} accounts saved to ${XLSX_DB_FILE}`);
}

let scraperSessions = {}; // Store active browser/page sessions

// --- API Endpoints ---

// 1. Get all accounts
app.get('/api/bills', (req, res) => {
  const accounts = loadBillsDatabase();
  res.json(accounts);
});

// 2. Update account-level fields (name, meterNo, address, etc.) and latest bill history if provided
app.put('/api/bills/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const updatedData = req.body;
  const accounts = loadBillsDatabase();

  const idx = accounts.findIndex(a => a.id === id);
  if (idx !== -1) {
    const { history, id: _id, ...fields } = updatedData;
    accounts[idx] = { ...accounts[idx], ...fields };

    // Also update history details if monthly fields are present
    if (updatedData.billMonth) {
      if (!accounts[idx].history) accounts[idx].history = [];
      const hIdx = accounts[idx].history.findIndex(h => h.billMonth === updatedData.billMonth);
      const histItem = {
        billMonth: updatedData.billMonth,
        units: parseInt(updatedData.units, 10) || 0,
        amount: parseInt(updatedData.amount, 10) || 0,
        dueDate: updatedData.dueDate,
        status: updatedData.status
      };
      if (hIdx !== -1) {
        accounts[idx].history[hIdx] = histItem;
      } else {
        accounts[idx].history.unshift(histItem);
        accounts[idx].history.sort((a, b) => b.billMonth.localeCompare(a.billMonth));
      }
    }

    saveBillsDatabase(accounts);
    res.json({ success: true, account: accounts[idx] });
  } else {
    res.status(404).json({ error: 'Account not found' });
  }
});

// 2b. Create a new account profile
app.post('/api/bills', (req, res) => {
  const { account, name, roomNo, meterNo, billMonth, units, amount, dueDate, status } = req.body;
  if (!account) {
    return res.status(400).json({ error: 'Account number is required' });
  }

  const accounts = loadBillsDatabase();
  const normalizedAcc = account.startsWith('MNG-') ? account : 'MNG-' + account;
  const cleanAcc = normalizedAcc.replace(/^MNG-/, '');

  // Check if account already exists
  const existing = accounts.find(a => a.account.replace(/^MNG-/, '') === cleanAcc);
  if (existing) {
    return res.status(409).json({ error: 'Account already exists', account: existing });
  }

  const newId = accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1;
  const newAccount = {
    id: newId,
    account: normalizedAcc,
    name: name || 'Consumer ' + cleanAcc,
    address: "Mangaluru",
    sanctionedLoad: "4 kW",
    tariff: "LT-2(a)",
    meterNo: meterNo || '',
    roomNo: roomNo || '',
    history: []
  };

  // If bill details are provided, add an initial history entry
  if (billMonth) {
    const resolvedStatus = (parseInt(amount, 10) <= 0) ? "paid" : (status || "unpaid");
    newAccount.history.push({
      billMonth,
      units: parseInt(units, 10) || 0,
      amount: parseInt(amount, 10) || 0,
      dueDate: dueDate || '',
      status: resolvedStatus
    });
  }

  accounts.push(newAccount);
  saveBillsDatabase(accounts);
  res.json({ success: true, account: newAccount });
});

// 3. Delete account
app.delete('/api/bills/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const accounts = loadBillsDatabase();

  const idx = accounts.findIndex(a => a.id === id);
  if (idx !== -1) {
    const deleted = accounts.splice(idx, 1);
    saveBillsDatabase(accounts);
    res.json({ success: true, deleted: deleted[0] });
  } else {
    res.status(404).json({ error: 'Account not found' });
  }
});

// 4. Clear history for an account
app.delete('/api/bills/:id/history', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const accounts = loadBillsDatabase();

  const idx = accounts.findIndex(a => a.id === id);
  if (idx !== -1) {
    accounts[idx].history = [];
    saveBillsDatabase(accounts);
    res.json({ success: true, account: accounts[idx] });
  } else {
    res.status(404).json({ error: 'Account not found' });
  }
});

// 5. Save/Insert a scraped or synced bill into an account's history
app.post('/api/bills/save-sync', (req, res) => {
  const { account, name, billMonth, units, amount, dueDate, status } = req.body;
  const accounts = loadBillsDatabase();

  const normalizedAcc = account.startsWith('MNG-') ? account : 'MNG-' + account;
  const cleanAcc = normalizedAcc.replace(/^MNG-/, '');

  // Find existing account
  let accIdx = accounts.findIndex(a => a.account.replace(/^MNG-/, '') === cleanAcc);

  if (accIdx === -1) {
    // Create new account
    const newId = accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1;
    accounts.push({
      id: newId,
      account: normalizedAcc,
      name: name || ('Consumer ' + cleanAcc),
      address: "Mangaluru",
      sanctionedLoad: "4 kW",
      tariff: "LT-2(a)",
      meterNo: "MPL" + Math.floor(10000 + Math.random() * 90000),
      roomNo: "",
      history: []
    });
    accIdx = accounts.length - 1;
  }

  const acc = accounts[accIdx];

  // Update name if provided, but only if the account doesn't already have a valid custom name
  const isPlaceholder = !acc.name || acc.name.startsWith('Consumer ') || acc.name === 'N/A';
  if (name && name !== 'N/A' && isPlaceholder) {
    acc.name = name;
  }

  const resolvedStatus = (parseInt(amount, 10) <= 0) ? "paid" : (status || "unpaid");

  // Check if this month already exists in history
  const histIdx = acc.history.findIndex(h => h.billMonth === billMonth);
  if (histIdx !== -1) {
    // Update existing month
    acc.history[histIdx] = { billMonth, units, amount, dueDate, status: resolvedStatus };
  } else {
    // Add new month entry
    acc.history.unshift({ billMonth, units, amount, dueDate, status: resolvedStatus });
    // Sort history by month descending
    acc.history.sort((a, b) => b.billMonth.localeCompare(a.billMonth));
    // Cap at MAX_HISTORY
    if (acc.history.length > MAX_HISTORY) {
      acc.history = acc.history.slice(0, MAX_HISTORY);
    }
  }

  saveBillsDatabase(accounts);
  res.json({ success: true, account: acc });
});

// Endpoint 6: Initialize session, navigate, and return CAPTCHA image
app.post('/api/scraper/init', async (req, res) => {
  const sessionId = 'session_' + Date.now();
  console.log(`Initializing scraper session: ${sessionId}`);

  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Block heavy/unnecessary resources that hang and prevent Angular bootstrap
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      const url = req.url();
      if (['font', 'media'].includes(type) ||
          url.includes('analytics') ||
          url.includes('paynimo') ||
          url.includes('fontawesome') ||
          url.includes('recaptcha')) {
        req.abort();
      } else {
        req.continue();
      }
    });

    try {
      await page.goto('https://mescom.org.in/mescom/main/quick-payment', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      console.log(`[${sessionId}] Navigation completed.`);
    } catch (e) {
      console.log(`[${sessionId}] Page navigation handled: ${e.message}`);
    }

    // Wait for Angular to bootstrap and render the canvas
    try {
      await page.waitForSelector('canvas#captcha', { timeout: 20000 });
      console.log(`[${sessionId}] Canvas found.`);
    } catch (e) {
      console.log(`[${sessionId}] Canvas selector timed out: ${e.message}`);
    }

    // Brief safety wait for canvas to fully render
    await new Promise(r => setTimeout(r, 1500));

    // Extract CAPTCHA as base64 image data url from canvas
    const captchaDataUrl = await page.evaluate(() => {
      const canvas = document.querySelector('canvas#captcha');
      return canvas ? canvas.toDataURL() : null;
    });

    if (!captchaDataUrl) {
      await browser.close();
      return res.status(500).json({ error: 'Failed to extract CAPTCHA from page canvas. The portal might be slow. Please try again.' });
    }

    // Extract leaked CAPTCHA text directly from global scope window.code
    const leakedCode = await page.evaluate(() => {
      return window.code || (typeof code !== 'undefined' ? code : null);
    });

    scraperSessions[sessionId] = { browser, page, leakedCode, createdAt: Date.now() };

    res.json({
      sessionId,
      captchaUrl: captchaDataUrl,
      autoSolvedCode: leakedCode
    });

  } catch (err) {
    console.error('Session initialization error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint 7: Submit Account No + Captcha Text and parse result
app.post('/api/scraper/submit', async (req, res) => {
  const { sessionId, accountNo, captchaCode } = req.body;
  console.log(`Submitting form for session: ${sessionId}, account: ${accountNo}`);

  const session = scraperSessions[sessionId];
  if (!session) {
    return res.status(400).json({ error: 'Scraper session expired or not found. Please refresh.' });
  }

  const { browser, page } = session;

  try {
    const targetCode = captchaCode === 'AUTO' && session.leakedCode ? session.leakedCode : captchaCode;

    // Fill form
    await page.evaluate(() => {
      const accInput = document.querySelector('input[formcontrolname="accID"]');
      const captchaInput = document.querySelector('input#cpatchaInput');
      if (accInput) accInput.value = '';
      if (captchaInput) captchaInput.value = '';
    });

    await page.type('input[formcontrolname="accID"]', accountNo.toString());
    await page.type('input#cpatchaInput', targetCode.toString());

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for response
    await new Promise(r => setTimeout(r, 6000));

    // Check if CAPTCHA error is shown
    const captchaError = await page.evaluate(() => {
      const errorHeader = [...document.querySelectorAll('h2')].find(el =>
        el.textContent.includes('Please enter the correct verification code') ||
        el.textContent.includes('verification code')
      );
      return errorHeader ? errorHeader.textContent.trim() : null;
    });

    if (captchaError) {
      const newCaptcha = await page.evaluate(async () => {
        const loopBtn = [...document.querySelectorAll('a')].find(el => el.onclick && el.onclick.toString().includes('createCaptcha'));
        if (loopBtn) {
          loopBtn.click();
          await new Promise(r => setTimeout(r, 2000));
        }
        const canvas = document.querySelector('canvas#captcha');
        return canvas ? canvas.toDataURL() : null;
      });

      return res.status(422).json({
        error: captchaError,
        captchaUrl: newCaptcha
      });
    }

    // Scrape Bill details
    const result = await page.evaluate(() => {
      const getInputValueByLabel = (labelPattern) => {
        const inputs = [...document.querySelectorAll('input')];
        for (const input of inputs) {
          const container = input.closest('div');
          if (container && container.textContent.toLowerCase().includes(labelPattern.toLowerCase())) {
            if (input.name === 'search' || input.placeholder.includes('Search')) continue;
            if (input.value) return input.value.trim();
          }
        }
        const label = [...document.querySelectorAll('label')].find(l =>
          l.textContent.toLowerCase().includes(labelPattern.toLowerCase())
        );
        if (!label) return null;
        const htmlFor = label.getAttribute('for');
        if (htmlFor) {
          const input = document.getElementById(htmlFor);
          if (input) return input.value ? input.value.trim() : null;
        }
        const parent = label.parentElement;
        if (parent) {
          const parentInput = parent.querySelector('input');
          if (parentInput) return parentInput.value ? parentInput.value.trim() : null;
          const nextInput = parent.nextElementSibling?.querySelector('input') || parent.nextElementSibling;
          if (nextInput && nextInput.tagName === 'INPUT') return nextInput.value ? nextInput.value.trim() : null;
        }
        return null;
      };

      const divs = [...document.querySelectorAll('div, table, tr, td, span, label, h1, h2, h3, h4, p')];
      const texts = divs.map(d => d.textContent.trim()).filter(t => t.length > 0 && t.length < 250);

      const getValueOfLabel = (labelPattern) => {
        const index = texts.findIndex(t => t.toLowerCase() === labelPattern.toLowerCase() || t.toLowerCase().includes(labelPattern.toLowerCase()));
        if (index !== -1 && index + 1 < texts.length) {
          return texts[index + 1];
        }
        return null;
      };

      let consumerName = 'N/A';
      const nameText = texts.find(t => t.includes('SRI ') || t.includes('SHRI ') || t.includes('MRS.') || t.includes('MR.'));
      if (nameText) {
        const match = nameText.match(/Name\s+([A-Za-z\s\.]+?)(?=Permise Add\.|\n|$)/i);
        if (match) {
          consumerName = match[1].trim();
        } else {
          consumerName = nameText.replace(/Account ID.*Name/i, '').replace(/Permise Add.*/i, '').trim();
        }
      } else {
        consumerName = getValueOfLabel('Consumer Name') || getValueOfLabel('Name') || 'N/A';
      }

      const billAmount = getInputValueByLabel('Current Balance') ||
                         getInputValueByLabel('Enter Amount') ||
                         getInputValueByLabel('Bill Amount') ||
                         getValueOfLabel('Current Balance') ||
                         getValueOfLabel('Bill Amount') ||
                         '0';

      const dueDate = getInputValueByLabel('Due Date') ||
                      getValueOfLabel('Due Date') ||
                      'N/A';

      const unitsConsumed = getInputValueByLabel('Units Consumed') ||
                            getValueOfLabel('Units Consumed') ||
                            '0';

      const billingMonth = getValueOfLabel('Bill Month') ||
                           getValueOfLabel('Month') ||
                           'N/A';

      return {
        consumerName,
        billAmount,
        unitsConsumed,
        dueDate,
        billingMonth,
        rawTexts: texts.slice(0, 150)
      };
    });

    // Clean up session
    await browser.close();
    delete scraperSessions[sessionId];

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error('Submission processing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Periodic session cleanup (older than 10 mins)
setInterval(() => {
  const now = Date.now();
  Object.keys(scraperSessions).forEach(async (id) => {
    if (now - scraperSessions[id].createdAt > 10 * 60 * 1000) {
      console.log(`Cleaning up expired session: ${id}`);
      try {
        await scraperSessions[id].browser.close();
      } catch (e) {}
      delete scraperSessions[id];
    }
  });
}, 5 * 60 * 1000);

const PORT = 35000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
