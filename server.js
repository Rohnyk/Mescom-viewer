const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
app.use(cors());
app.use(express.json());

// --- Structured Logger for Docker / Production Logs ---
function logInfo(tag, message, meta = null) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  console.log(`[${timestamp}] [INFO] [${tag}] ${message}${metaStr}`);
}

function logWarn(tag, message, meta = null) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  console.warn(`[${timestamp}] [WARN] [${tag}] ${message}${metaStr}`);
}

function logError(tag, message, error = null) {
  const timestamp = new Date().toISOString();
  const errDetails = error ? (error.stack || error.message || String(error)) : '';
  console.error(`[${timestamp}] [ERROR] [${tag}] ${message} ${errDetails}`);
}

// HTTP Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logInfo('HTTP', `${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

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
    logInfo('DB', `Created data directory at ${DATA_DIR}`);
  }

  if (fs.existsSync(JSON_DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(JSON_DB_FILE, 'utf8'));
      logInfo('DB', `Loaded bills database from ${JSON_DB_FILE}`, { accountCount: data.length });
      return data;
    } catch (e) {
      logError('DB', `Failed to parse JSON DB at ${JSON_DB_FILE}, falling back to seeds`, e);
    }
  }

  // If no DB exists, initialize it with seed data
  logInfo('DB', 'No existing database found, initializing with seed data', { accountCount: SEED_ACCOUNTS.length });
  saveBillsDatabase(SEED_ACCOUNTS);
  return JSON.parse(JSON.stringify(SEED_ACCOUNTS));
}

function saveBillsDatabase(accounts) {
  try {
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
    logInfo('DB', `Database saved successfully`, { accounts: accounts.length, jsonFile: JSON_DB_FILE, xlsxFile: XLSX_DB_FILE });
  } catch (err) {
    logError('DB', 'Error saving database', err);
  }
}

let scraperSessions = {}; // Store active browser/page sessions

// --- Notion Integration: Room No -> Consumer Name & Meter ID Lookup ---
async function lookupNotionRoomDetails(roomNo, accountNo = null) {
  const notionKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;
  const roomField = process.env.NOTION_ROOM_FIELD || 'Room#';
  const nameField = process.env.NOTION_NAME_FIELD || 'Tenent Name';
  const meterField = process.env.NOTION_METER_FIELD || 'Electricity Meter Number';
  const accountField = process.env.NOTION_ACCOUNT_FIELD || 'Electricity Customer ID';

  if (!notionKey || !databaseId || (!roomNo && !accountNo)) {
    return { consumerName: null, meterNo: null, customerId: null, accountMatch: true };
  }

  const cleanRoom = roomNo ? roomNo.toString().trim() : '';
  const normalizedRoom = cleanRoom.toLowerCase().replace(/[^a-z0-9]/g, '');

  try {
    logInfo('NOTION', `Querying Notion database for room: ${cleanRoom || accountNo}`, { databaseId, roomField, nameField, meterField, accountField });

    // Pre-flight check database access & connection permission
    const connCheck = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: 1 })
    });

    if (!connCheck.ok) {
      const errJson = await connCheck.json().catch(() => ({}));
      let notionError = null;
      if (connCheck.status === 404 || errJson.code === 'object_not_found') {
        notionError = `Database is not shared with your Notion Integration.\n\nTo fix:\n1. Open your Notion database in browser\n2. Click the '...' menu (top right)\n3. Click 'Add connections' (or 'Connections')\n4. Search for & select your integration.`;
        logWarn('NOTION', `Notion Database ${databaseId} not shared with integration (HTTP 404 object_not_found)`);
      } else {
        notionError = `Notion API Error (${connCheck.status}): ${errJson.message || 'Access failed'}`;
        logWarn('NOTION', `Notion API error (HTTP ${connCheck.status})`, errJson);
      }
      return { consumerName: null, meterNo: null, customerId: null, accountMatch: true, notionError };
    }

    // Helper to extract plain text string from any Notion property type
    const extractPropValue = (propObj) => {
      if (!propObj) return null;
      if (propObj.type === 'title' && propObj.title && propObj.title.length > 0) {
        return propObj.title.map(t => t.plain_text).join('').trim();
      }
      if (propObj.type === 'rich_text' && propObj.rich_text && propObj.rich_text.length > 0) {
        return propObj.rich_text.map(t => t.plain_text).join('').trim();
      }
      if (propObj.type === 'select' && propObj.select) {
        return propObj.select.name.trim();
      }
      if (propObj.type === 'number' && propObj.number !== null && propObj.number !== undefined) {
        return propObj.number.toString();
      }
      if (propObj.type === 'phone_number' && propObj.phone_number) {
        return propObj.phone_number.trim();
      }
      return null;
    };

    // Strategy 1: Targeted Filter Queries
    const searchFiltered = async (filterType, operator = 'equals') => {
      try {
        const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${notionKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filter: {
              property: roomField,
              [filterType]: {
                [operator]: cleanRoom
              }
            }
          })
        });
        if (!res.ok) return null;
        return await res.json();
      } catch (e) { return null; }
    };

    let data = cleanRoom ? await searchFiltered('title', 'equals') : null;
    if (!data || !data.results || data.results.length === 0) data = cleanRoom ? await searchFiltered('title', 'contains') : null;
    if (!data || !data.results || data.results.length === 0) data = cleanRoom ? await searchFiltered('rich_text', 'equals') : null;

    let matchingPage = (data && data.results && data.results.length > 0) ? data.results[0] : null;

    // Strategy 2: Database Scan Fallback (scans all pages in Notion DB if targeted query yields 0 results)
    if (!matchingPage) {
      logInfo('NOTION', `Targeted filter produced 0 results. Running database scan...`);
      const allRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page_size: 100 })
      });

      if (allRes.ok) {
        const allData = await allRes.json();
        if (allData && allData.results) {
          logInfo('NOTION', `Fetched ${allData.results.length} pages from Notion database for scanning.`);
          for (const page of allData.results) {
            const props = page.properties;
            for (const key of Object.keys(props)) {
              const val = extractPropValue(props[key]);
              if (val) {
                const normVal = val.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (cleanRoom && (normVal === normalizedRoom || val.trim().toLowerCase() === cleanRoom.toLowerCase())) {
                  matchingPage = page;
                  logInfo('NOTION', `Database scan matched room ${cleanRoom} on property "${key}": "${val}"`);
                  break;
                }
              }
            }
            if (matchingPage) break;
          }
        }
      }
    }

    if (matchingPage) {
      const props = matchingPage.properties;
      
      // Helper to find property value flexibly by key or fallback aliases
      const findPropValue = (configuredKey, fallbackKeys) => {
        if (props[configuredKey]) return extractPropValue(props[configuredKey]);
        const propKeys = Object.keys(props);
        const ciKey = propKeys.find(k => k.toLowerCase() === configuredKey.toLowerCase());
        if (ciKey) return extractPropValue(props[ciKey]);
        for (const fb of fallbackKeys) {
          const fbKey = propKeys.find(k => k.toLowerCase().includes(fb.toLowerCase()));
          if (fbKey) return extractPropValue(props[fbKey]);
        }
        return null;
      };

      const consumerName = findPropValue(nameField, ['tenent', 'tenant', 'name', 'consumer']);
      const meterNo = findPropValue(meterField, ['meter', 'electricity', 'number']);
      const customerId = findPropValue(accountField, ['customer id', 'customer', 'account']);

      // Validate accountNo if provided
      let accountMatch = true;
      if (accountNo && customerId) {
        const cleanAcc = accountNo.toString().replace(/^MNG-/, '').trim();
        const cleanNotionAcc = customerId.toString().replace(/^MNG-/, '').trim();
        if (cleanAcc && cleanNotionAcc && cleanAcc !== cleanNotionAcc) {
          accountMatch = false;
          logWarn('NOTION', `Account mismatch for room ${cleanRoom}: Account is ${cleanAcc}, but Notion has ${cleanNotionAcc}`);
        }
      }

      logInfo('NOTION', `Found Notion details for room ${cleanRoom}`, { consumerName, meterNo, customerId, accountMatch });
      return { consumerName, meterNo, customerId, accountMatch };
    }

    logInfo('NOTION', `No Notion record found for room ${cleanRoom}`);
    return { consumerName: null, meterNo: null, customerId: null, accountMatch: true };
  } catch (err) {
    logError('NOTION', `Error querying Notion for room ${cleanRoom}`, err);
    return { consumerName: null, meterNo: null, customerId: null, accountMatch: true };
  }
}

// --- API Endpoints ---

// Notion Lookup Endpoint
app.post('/api/notion/lookup-room', async (req, res) => {
  const { roomNo, accountNo } = req.body;
  if (!roomNo && !accountNo) {
    return res.status(400).json({ error: 'Room number or Account number is required' });
  }

  const isConfigured = !!(process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID);
  if (!isConfigured) {
    logWarn('NOTION', 'Lookup requested but NOTION_API_KEY or NOTION_DATABASE_ID is not configured');
    return res.json({
      success: false,
      configured: false,
      message: 'Notion integration is not configured. Set NOTION_API_KEY and NOTION_DATABASE_ID.',
      consumerName: null,
      meterNo: null,
      customerId: null,
      accountMatch: true
    });
  }

  const details = await lookupNotionRoomDetails(roomNo, accountNo);
  res.json({
    success: !details.notionError,
    configured: true,
    roomNo,
    consumerName: details.consumerName || null,
    meterNo: details.meterNo || null,
    customerId: details.customerId || null,
    accountMatch: details.accountMatch !== false,
    notionError: details.notionError || null
  });
});

// 1. Get all accounts
app.get('/api/bills', (req, res) => {
  const accounts = loadBillsDatabase();
  logInfo('API', `Fetched ${accounts.length} accounts from database`);
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
    logInfo('API', `Updated account ID ${id}`, { account: accounts[idx].account, name: accounts[idx].name });
    res.json({ success: true, account: accounts[idx] });
  } else {
    logWarn('API', `Failed to update: Account ID ${id} not found`);
    res.status(404).json({ error: 'Account not found' });
  }
});

// 2b. Create a new account profile
app.post('/api/bills', (req, res) => {
  const { account, name, roomNo, meterNo, billMonth, units, amount, dueDate, status } = req.body;
  if (!account) {
    logWarn('API', 'Account creation failed: Account number is required');
    return res.status(400).json({ error: 'Account number is required' });
  }

  const accounts = loadBillsDatabase();
  const normalizedAcc = account.startsWith('MNG-') ? account : 'MNG-' + account;
  const cleanAcc = normalizedAcc.replace(/^MNG-/, '');

  // Check if account already exists
  const existing = accounts.find(a => a.account.replace(/^MNG-/, '') === cleanAcc);
  if (existing) {
    logWarn('API', `Account creation skipped: Account ${normalizedAcc} already exists`);
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
  logInfo('API', `Created new account ID ${newId}`, { account: normalizedAcc, name: newAccount.name });
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
    logInfo('API', `Deleted account ID ${id}`, { account: deleted[0].account });
    res.json({ success: true, deleted: deleted[0] });
  } else {
    logWarn('API', `Delete failed: Account ID ${id} not found`);
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
    logInfo('API', `Cleared bill history for account ID ${id}`, { account: accounts[idx].account });
    res.json({ success: true, account: accounts[idx] });
  } else {
    logWarn('API', `Clear history failed: Account ID ${id} not found`);
    res.status(404).json({ error: 'Account not found' });
  }
});

// 5. Save/Insert a scraped or synced bill into an account's history
app.post('/api/bills/save-sync', async (req, res) => {
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
    logInfo('API', `Auto-created account for live sync: ${normalizedAcc}`);
  }

  const acc = accounts[accIdx];

  // Update name if provided, but only if the account doesn't already have a valid custom name
  const isPlaceholder = !acc.name || acc.name.startsWith('Consumer ') || acc.name === 'N/A';
  if (name && name !== 'N/A' && isPlaceholder) {
    acc.name = name;
  }

  // If room number is assigned, query Notion DB for Name and Meter ID
  if (acc.roomNo) {
    const notionDetails = await lookupNotionRoomDetails(acc.roomNo);
    if (notionDetails.consumerName && (isPlaceholder || acc.name === 'N/A')) {
      acc.name = notionDetails.consumerName;
      logInfo('NOTION', `Auto-applied Notion consumer name for room ${acc.roomNo}`, { consumerName: notionDetails.consumerName });
    }
    if (notionDetails.meterNo && (!acc.meterNo || acc.meterNo.startsWith('MPL') || acc.meterNo === 'N/A')) {
      acc.meterNo = notionDetails.meterNo;
      logInfo('NOTION', `Auto-applied Notion meter ID for room ${acc.roomNo}`, { meterNo: notionDetails.meterNo });
    }
  }

  const resolvedStatus = (parseInt(amount, 10) <= 0) ? "paid" : (status || "unpaid");

  // Check if this month already exists in history
  const histIdx = acc.history.findIndex(h => h.billMonth === billMonth);
  if (histIdx !== -1) {
    // Update existing month
    acc.history[histIdx] = { billMonth, units, amount, dueDate, status: resolvedStatus };
    logInfo('API', `Updated existing history entry for ${normalizedAcc} (${billMonth})`, { amount, units, status: resolvedStatus });
  } else {
    // Add new month entry
    acc.history.unshift({ billMonth, units, amount, dueDate, status: resolvedStatus });
    // Sort history by month descending
    acc.history.sort((a, b) => b.billMonth.localeCompare(a.billMonth));
    // Cap at MAX_HISTORY
    if (acc.history.length > MAX_HISTORY) {
      acc.history = acc.history.slice(0, MAX_HISTORY);
    }
    logInfo('API', `Added new history entry for ${normalizedAcc} (${billMonth})`, { amount, units, status: resolvedStatus });
  }

  saveBillsDatabase(accounts);
  res.json({ success: true, account: acc });
});

// Endpoint 6: Initialize session, navigate, and return CAPTCHA image
app.post('/api/scraper/init', async (req, res) => {
  const sessionId = 'session_' + Date.now();
  logInfo('SCRAPER', `Initializing new scraper session`, { sessionId });

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
      logInfo('SCRAPER', `[${sessionId}] Navigation to MESCOM quick-payment completed`);
    } catch (e) {
      logWarn('SCRAPER', `[${sessionId}] Navigation load event warning (proceeding): ${e.message}`);
    }

    // Wait for Angular to bootstrap and render the canvas
    try {
      await page.waitForSelector('canvas#captcha', { timeout: 20000 });
      logInfo('SCRAPER', `[${sessionId}] CAPTCHA canvas element rendered in DOM`);
    } catch (e) {
      logWarn('SCRAPER', `[${sessionId}] CAPTCHA canvas selector timeout: ${e.message}`);
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
      logError('SCRAPER', `[${sessionId}] Failed to extract CAPTCHA canvas data URL`);
      return res.status(500).json({ error: 'Failed to extract CAPTCHA from page canvas. The portal might be slow. Please try again.' });
    }

    // Extract leaked CAPTCHA text directly from global scope window.code
    const leakedCode = await page.evaluate(() => {
      return window.code || (typeof code !== 'undefined' ? code : null);
    });

    logInfo('SCRAPER', `[${sessionId}] Session ready`, { autoSolvedCode: leakedCode ? leakedCode : 'None (manual entry required)' });

    scraperSessions[sessionId] = { browser, page, leakedCode, createdAt: Date.now() };

    res.json({
      sessionId,
      captchaUrl: captchaDataUrl,
      autoSolvedCode: leakedCode
    });

  } catch (err) {
    logError('SCRAPER', `[${sessionId}] Session initialization error`, err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint 7: Submit Account No + Captcha Text and parse result
app.post('/api/scraper/submit', async (req, res) => {
  const { sessionId, accountNo, captchaCode } = req.body;
  logInfo('SCRAPER', `Form submission requested`, { sessionId, accountNo });

  const session = scraperSessions[sessionId];
  if (!session) {
    logWarn('SCRAPER', `Session expired or not found`, { sessionId });
    return res.status(400).json({ error: 'Scraper session expired or not found. Please refresh.' });
  }

  const { browser, page } = session;

  try {
    const targetCode = captchaCode === 'AUTO' && session.leakedCode ? session.leakedCode : captchaCode;
    logInfo('SCRAPER', `Filling account and CAPTCHA code`, { sessionId, accountNo, captchaUsed: targetCode });

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
      logWarn('SCRAPER', `[${sessionId}] CAPTCHA verification error reported by portal`, { captchaError });
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

    logInfo('SCRAPER', `[${sessionId}] Bill scrape completed successfully`, {
      accountNo,
      consumerName: result.consumerName,
      amount: result.billAmount,
      units: result.unitsConsumed,
      month: result.billingMonth
    });

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    logError('SCRAPER', `[${sessionId}] Form submission processing error`, err);
    res.status(500).json({ error: err.message });
  }
});

// Periodic session cleanup (older than 10 mins)
setInterval(() => {
  const now = Date.now();
  Object.keys(scraperSessions).forEach(async (id) => {
    if (now - scraperSessions[id].createdAt > 10 * 60 * 1000) {
      logInfo('SCRAPER', `Cleaning up expired session: ${id}`);
      try {
        await scraperSessions[id].browser.close();
      } catch (e) {
        logError('SCRAPER', `Error closing browser for expired session ${id}`, e);
      }
      delete scraperSessions[id];
    }
  });
}, 5 * 60 * 1000);

const PORT = 35000;
app.listen(PORT, () => {
  logInfo('SERVER', `MESCOM Dashboard Server listening on port ${PORT}`, {
    env: process.env.NODE_ENV || 'development',
    puppeteerPath: process.env.PUPPETEER_EXECUTABLE_PATH || 'system default'
  });
});
