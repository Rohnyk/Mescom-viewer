/* =========================================================
   MESCOM Bill Dashboard — Application Logic
   ========================================================= */

let BILLS = [];

// ---------- State ----------
let filteredBills = [...BILLS];
let localSyncingBillIds = new Set();
let selectedBillIds = new Set();
let currentPage = 1;
const PAGE_SIZE = 8;
let consumptionChart = null;
let costChart = null;

// ---------- Helpers ----------
function formatMonth(ym) {
  if (!ym || ym === 'N/A') return 'N/A';
  const parts = ym.split("-");
  if (parts.length < 2) return ym;
  const [y, m] = parts;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function formatCurrency(n) {
  return "₹" + n.toLocaleString("en-IN");
}

function uniqueAccounts() {
  const map = new Map();
  BILLS.forEach(a => { if (a.account) map.set(a.account, a.name); });
  return map;
}

function getLatestBill(acc) {
  if (acc.history && acc.history.length > 0) {
    return acc.history[0];
  }
  return null;
}

// ---------- Summary ----------
function renderSummary() {
  const totalBills = filteredBills.length;
  
  const totalAmount = filteredBills.reduce((s, b) => {
    const latest = getLatestBill(b);
    return s + (latest ? latest.amount : 0);
  }, 0);
  
  let accountsWithLatestUnits = 0;
  const totalUnits = filteredBills.reduce((s, b) => {
    const latest = getLatestBill(b);
    if (latest) {
      accountsWithLatestUnits++;
      return s + latest.units;
    }
    return s;
  }, 0);
  const avgUnits = accountsWithLatestUnits ? Math.round(totalUnits / accountsWithLatestUnits) : 0;
  
  const unpaid = filteredBills.filter(b => {
    const latest = getLatestBill(b);
    return latest && latest.status !== "paid";
  }).length;

  animateValue("val-total-bills", totalBills);
  animateValue("val-total-amount", totalAmount, true);
  animateValue("val-avg-units", avgUnits, false, " kWh");
  animateValue("val-unpaid", unpaid);
}

function animateValue(id, end, isCurrency = false, suffix = "") {
  const el = document.getElementById(id);
  const duration = 600;
  const start = 0;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (end - start) * eased);
    el.textContent = isCurrency ? formatCurrency(current) : current + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---------- Table ----------
function renderTable() {
  const tbody = document.getElementById("bills-tbody");
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageBills = filteredBills.slice(startIdx, startIdx + PAGE_SIZE);

  tbody.innerHTML = pageBills.map(b => {
    const isSyncing = localSyncingBillIds.has(b.id);
    const isChecked = selectedBillIds.has(b.id);
    const latest = getLatestBill(b);
    
    const statusCell = isSyncing ?
      `<td>
         <div style="display:flex; align-items:center; gap:6px;">
           <span style="display:inline-block; width:12px; height:12px; border:2px solid var(--accent-green); border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite;"></span>
           <span style="font-size:11px; color:#10b981; font-weight:500;">Syncing...</span>
         </div>
       </td>` :
      `<td><span class="badge badge-${latest ? latest.status : 'none'}">${latest ? capitalize(latest.status) : 'No Bill'}</span></td>`;

    const actionsCell = isSyncing ?
      `<td>
         <div class="row-actions" style="opacity:0.4; pointer-events:none;">
           <button class="btn-action btn-action-view" disabled>&times;</button>
         </div>
       </td>` :
      `<td>
        <div class="row-actions">
          <button class="btn-action btn-action-view" onclick="openModal(${b.id})" title="View Details & History">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn-action btn-action-view" onclick="triggerRefetch(${b.id}, '${b.account}')" title="Refetch Live Bill" style="color: var(--accent-green);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67"/></svg>
          </button>
          <button class="btn-action btn-action-edit" onclick="openBillForm(${b.id})" title="Edit Account">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-action btn-action-delete" onclick="confirmDeleteHistory(${b.id})" title="Clear History" style="color: var(--accent-orange);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/><path d="M19 19l-4-4"/></svg>
          </button>
          <button class="btn-action btn-action-delete" onclick="confirmDeleteBill(${b.id})" title="Delete Account">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </td>`;

    return `
      <tr class="${isSyncing ? 'row-syncing' : ''}">
        <td style="text-align:center;">
          <input type="checkbox" class="bill-checkbox" data-id="${b.id}" onchange="handleBillSelect(this)" ${isChecked ? 'checked' : ''} style="cursor:pointer;" />
        </td>
        <td style="font-weight:600;color:var(--accent-blue)">${b.account}</td>
        <td>${b.name}</td>
        <td>${b.roomNo || 'N/A'}</td>
        <td style="font-family:monospace;font-weight:500;">${b.meterNo || 'N/A'}</td>
        <td style="font-weight:600">${latest ? formatCurrency(latest.amount) : '₹0'}</td>
        <td>${latest ? formatDueDate(latest.dueDate) : 'N/A'}</td>
        ${statusCell}
        ${actionsCell}
      </tr>
    `;
  }).join("");

  // Update header checkbox state
  const selectAllCheckbox = document.getElementById("select-all-bills");
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = (pageBills.length > 0 && pageBills.every(b => selectedBillIds.has(b.id)));
  }

  updateBulkDeleteButtonVisibility();

  document.getElementById("showing-count").textContent =
    `Showing ${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, filteredBills.length)} of ${filteredBills.length} accounts`;

  renderPagination();
}

function formatDueDate(d) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderPagination() {
  const totalPages = Math.ceil(filteredBills.length / PAGE_SIZE);
  const container = document.getElementById("pagination");
  container.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = i === currentPage ? "active" : "";
    btn.addEventListener("click", () => { currentPage = i; renderTable(); });
    container.appendChild(btn);
  }
}

// ---------- Charts ----------
function getActiveBills() {
  if (activeProfileId === "all") return BILLS;
  const profiles = loadProfiles();
  const p = profiles.find(pr => pr.id === activeProfileId);
  if (!p) return BILLS;
  return BILLS.filter(b => isAccInProfile(p, b.account));
}

function renderCharts() {
  populateAccountFilter();
  const filterSel = document.getElementById("consumption-filter");
  const selectedAcc = filterSel ? filterSel.value : "all";
  renderConsumptionChart(selectedAcc);
  renderCostChart();
}

function getChartColors() {
  const isDark = !document.body.classList.contains("light");
  return {
    grid: isDark ? "rgba(148,163,184,0.08)" : "rgba(15,23,42,0.06)",
    text: isDark ? "#94a3b8" : "#64748b",
  };
}

// Expanded vibrant color palette with dynamic HSL fallback for unlimited unique colors
const BASE_PALETTE = [
  { border: "#6366f1", bg: "rgba(99,102,241,0.15)" },  // Indigo
  { border: "#10b981", bg: "rgba(16,185,129,0.15)" },  // Emerald
  { border: "#f59e0b", bg: "rgba(245,158,11,0.15)" },  // Amber
  { border: "#ef4444", bg: "rgba(239,68,68,0.15)" },   // Red
  { border: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },  // Purple
  { border: "#06b6d4", bg: "rgba(6,182,212,0.15)" },   // Cyan
  { border: "#ec4899", bg: "rgba(236,72,153,0.15)" },  // Pink
  { border: "#84cc16", bg: "rgba(132,204,22,0.15)" },  // Lime
  { border: "#f97316", bg: "rgba(249,115,22,0.15)" },  // Orange
  { border: "#14b8a6", bg: "rgba(20,184,166,0.15)" },  // Teal
  { border: "#a855f7", bg: "rgba(168,85,247,0.15)" },  // Violet
  { border: "#3b82f6", bg: "rgba(59,130,246,0.15)" },  // Blue
  { border: "#eab308", bg: "rgba(234,179,8,0.15)" },   // Yellow
  { border: "#d946ef", bg: "rgba(217,70,239,0.15)" },  // Fuchsia
  { border: "#00d2ff", bg: "rgba(0,210,255,0.15)" },   // Electric Cyan
  { border: "#ff5722", bg: "rgba(255,87,34,0.15)" },   // Deep Orange
];

function getAccountColor(index) {
  if (index < BASE_PALETTE.length) {
    return BASE_PALETTE[index];
  }
  // Golden ratio hue angle offset for distinct non-repeating colors
  const hue = (index * 137.508) % 360;
  const border = `hsl(${Math.round(hue)}, 75%, 60%)`;
  const bg = `hsla(${Math.round(hue)}, 75%, 60%, 0.15)`;
  return { border, bg };
}

function renderConsumptionChart(accountFilter = "all") {
  const ctx = document.getElementById("chart-consumption").getContext("2d");
  const colors = getChartColors();
  const activeBills = getActiveBills();

  const accounts = accountFilter === "all" 
    ? activeBills 
    : activeBills.filter(a => matchAcc(a.account, accountFilter));

  // Get sorted unique months from history of active profile's accounts
  const monthSet = new Set();
  activeBills.forEach(a => {
    if (a.history) {
      a.history.forEach(h => monthSet.add(h.billMonth));
    }
  });
  const months = [...monthSet].sort();

  const datasets = accounts.map((acc, idx) => {
    const data = months.map(m => {
      const histItem = acc.history ? acc.history.find(h => h.billMonth === m) : null;
      return histItem ? histItem.units : null;
    });
    const c = getAccountColor(idx);
    return {
      label: acc.name,
      data,
      borderColor: c.border,
      backgroundColor: c.bg,
      fill: true,
      tension: 0.4,
      pointRadius: 5,
      pointHoverRadius: 7,
      borderWidth: 2.5,
    };
  });

  if (consumptionChart) consumptionChart.destroy();

  consumptionChart = new Chart(ctx, {
    type: "line",
    data: { labels: months.map(formatMonth), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: colors.text, font: { family: "'Inter'", size: 12 }, usePointStyle: true, pointStyle: "circle" } },
        tooltip: {
          backgroundColor: "rgba(15,23,42,0.92)",
          titleFont: { family: "'Inter'" },
          bodyFont: { family: "'Inter'" },
          padding: 12,
          cornerRadius: 10,
          callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} kWh` },
        },
      },
      scales: {
        x: { grid: { color: colors.grid }, ticks: { color: colors.text, font: { family: "'Inter'", size: 11 } } },
        y: { grid: { color: colors.grid }, ticks: { color: colors.text, font: { family: "'Inter'", size: 11 }, callback: v => v + " kWh" }, beginAtZero: false },
      },
    },
  });
}

function renderCostChart() {
  const ctx = document.getElementById("chart-cost").getContext("2d");
  const colors = getChartColors();
  const accounts = getActiveBills();

  const data = accounts.map(acc => {
    if (!acc.history) return 0;
    return acc.history.reduce((s, h) => s + h.amount, 0);
  });

  const bgColors = accounts.map((_, idx) => getAccountColor(idx).border);

  if (costChart) costChart.destroy();

  costChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: accounts.map(acc => acc.name),
      datasets: [{
        data,
        backgroundColor: bgColors,
        borderWidth: 0,
        hoverOffset: 12,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: colors.text, font: { family: "'Inter'", size: 12 }, usePointStyle: true, pointStyle: "circle", padding: 16 },
        },
        tooltip: {
          backgroundColor: "rgba(15,23,42,0.92)",
          titleFont: { family: "'Inter'" },
          bodyFont: { family: "'Inter'" },
          padding: 12,
          cornerRadius: 10,
          callbacks: { label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}` },
        },
      },
    },
  });
}

// ---------- Filters ----------
function applyFilters() {
  const search = document.getElementById("search-input").value.toLowerCase().trim();
  const statusFilter = document.getElementById("status-filter").value;
  const sortFilter = document.getElementById("sort-filter").value;

  const profileAccounts = getProfileAccounts(activeProfileId);

  filteredBills = BILLS.filter(b => {
    const matchProfile = !profileAccounts || profileAccounts.includes(b.account);
    const matchSearch = !search || b.account.toLowerCase().includes(search) || b.name.toLowerCase().includes(search);
    
    const latest = getLatestBill(b);
    const latestStatus = latest ? latest.status : 'none';
    const matchStatus = statusFilter === "all" || latestStatus === statusFilter;
    
    return matchProfile && matchSearch && matchStatus;
  });

  // Sort by latest month criteria
  filteredBills.sort((a, b) => {
    const latestA = getLatestBill(a);
    const latestB = getLatestBill(b);
    
    const amountA = latestA ? latestA.amount : 0;
    const amountB = latestB ? latestB.amount : 0;
    
    const monthA = latestA ? latestA.billMonth : '';
    const monthB = latestB ? latestB.billMonth : '';

    switch (sortFilter) {
      case "date-asc":    return monthA.localeCompare(monthB);
      case "date-desc":   return monthB.localeCompare(monthA);
      case "amount-asc":  return amountA - amountB;
      case "amount-desc": return amountB - amountA;
      default:            return monthB.localeCompare(monthA);
    }
  });

  currentPage = 1;
  renderSummary();
  renderTable();
}

function filterByStatus(status) {
  document.getElementById("status-filter").value = status;
  const pills = document.querySelectorAll(".status-pill");
  pills.forEach(p => p.classList.toggle("active", p.dataset.status === status));
  applyFilters();
}

// ---------- Account filter for chart ----------
function populateAccountFilter() {
  const sel = document.getElementById("consumption-filter");
  if (!sel) return;
  const activeBills = getActiveBills();
  sel.innerHTML = '<option value="all">All Profile Accounts</option>';
  activeBills.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.account;
    opt.textContent = `${b.name} (${b.account})`;
    sel.appendChild(opt);
  });
}

// ---------- Profiles (Grouping) ----------
let activeProfileId = "all";

const DEFAULT_PROFILES = [
  { id: "p1", name: "My Home",            icon: "🏠", accounts: ["MNG-1000000001"] },
  { id: "p2", name: "Rental Properties",  icon: "🏢", accounts: ["MNG-1000000002", "MNG-1000000006"] },
  { id: "p3", name: "Family",             icon: "👨‍👩‍👧", accounts: ["MNG-1000000003", "MNG-1000000004"] },
];

function matchAcc(a, b) {
  if (!a || !b) return false;
  return a.toString().replace(/^MNG-/, '') === b.toString().replace(/^MNG-/, '');
}

function isAccInProfile(p, accountNo) {
  if (!p || !p.accounts) return false;
  return p.accounts.some(a => matchAcc(a, accountNo));
}

function loadProfiles() {
  const saved = localStorage.getItem("mescom-profiles");
  if (saved) {
    try { return JSON.parse(saved); } catch(e) { /* fall through */ }
  }
  saveProfiles(DEFAULT_PROFILES);
  return [...DEFAULT_PROFILES];
}

function saveProfiles(profiles) {
  localStorage.setItem("mescom-profiles", JSON.stringify(profiles));
}

function getProfileAccounts(profileId) {
  if (profileId === "all") return null;
  const profiles = loadProfiles();
  const p = profiles.find(pr => pr.id === profileId);
  return p ? p.accounts : null;
}

function renderProfileTabs() {
  const container = document.getElementById("profiles-tabs");
  const profiles = loadProfiles();

  let html = `<button class="profile-tab${activeProfileId === 'all' ? ' active' : ''}" onclick="switchProfile('all')">
    <span class="tab-icon">📋</span> All Bills
    <span class="tab-count">${BILLS.length}</span>
  </button>`;

  profiles.forEach(p => {
    const billCount = BILLS.filter(b => isAccInProfile(p, b.account)).length;
    html += `<button class="profile-tab${activeProfileId === p.id ? ' active' : ''}" onclick="switchProfile('${p.id}')">
      <span class="tab-icon">${p.icon}</span> ${p.name}
      <span class="tab-count">${billCount}</span>
    </button>`;
  });

  container.innerHTML = html;
}

function renderProfileBanner() {
  const banner = document.getElementById("profile-banner");

  if (activeProfileId === "all") {
    banner.style.display = "none";
    return;
  }

  const profiles = loadProfiles();
  const p = profiles.find(pr => pr.id === activeProfileId);
  if (!p) { banner.style.display = "none"; return; }

  const profileAccounts = BILLS.filter(b => isAccInProfile(p, b.account));

  let totalAmount = 0;
  let totalUnits = 0;
  let unpaid = 0;

  profileAccounts.forEach(b => {
    const latest = getLatestBill(b);
    if (latest) {
      totalAmount += latest.amount || 0;
      totalUnits += latest.units || 0;
      if (latest.status !== "paid") unpaid++;
    }
  });

  document.getElementById("banner-icon").textContent = p.icon;
  document.getElementById("banner-title").textContent = p.name;
  document.getElementById("banner-subtitle").textContent = `${profileAccounts.length} account${profileAccounts.length !== 1 ? 's' : ''}`;

  document.getElementById("banner-accounts").innerHTML = profileAccounts.map(b => `
    <div class="account-chip">
      <span class="chip-name">${b.name}</span>
      <span class="chip-acc">${b.account}${b.roomNo ? ' · Rm ' + b.roomNo : ''}</span>
    </div>
  `).join("");

  document.getElementById("banner-stats").innerHTML = `
    <div class="banner-stat">
      <div class="banner-stat-label">Total Amount</div>
      <div class="banner-stat-value">${formatCurrency(totalAmount)}</div>
    </div>
    <div class="banner-stat">
      <div class="banner-stat-label">Units Consumed</div>
      <div class="banner-stat-value">${totalUnits.toLocaleString()} kWh</div>
    </div>
    <div class="banner-stat">
      <div class="banner-stat-label">Unpaid Accounts</div>
      <div class="banner-stat-value" style="color:${unpaid > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}">${unpaid}</div>
    </div>
  `;

  banner.style.display = "flex";
}

function switchProfile(profileId) {
  activeProfileId = profileId;
  renderProfileTabs();
  renderProfileBanner();
  applyFilters();

  populateAccountFilter();
  const filterSel = document.getElementById("consumption-filter");
  if (filterSel) filterSel.value = "all";
  renderCharts();
}

// --- Manage Profiles Modal ---
function openProfilesModal() {
  resetProfileForm();
  renderExistingProfilesList();
  document.getElementById("profiles-modal-overlay").classList.add("open");
}

function closeProfilesModal() {
  resetProfileForm();
  document.getElementById("profiles-modal-overlay").classList.remove("open");
}

// Default icon choices for the picker
const DEFAULT_ICON_OPTIONS = [
  { icon: "🏠", label: "Home" },
  { icon: "🏢", label: "Rental Prop" },
  { icon: "🔑", label: "Rental Unit" },
  { icon: "👨‍👩‍👧", label: "Family" },
  { icon: "🏪", label: "Commercial" },
  { icon: "🏖️", label: "Villa" },
  { icon: "⚡", label: "Utility" },
  { icon: "📍", label: "Other" },
];

function renderIconPicker(selectedIcon) {
  const grid = document.getElementById("icon-picker-grid");
  if (!grid) return;

  // Merge defaults with icons from existing profiles
  const profiles = loadProfiles();
  const iconMap = new Map();
  DEFAULT_ICON_OPTIONS.forEach(opt => iconMap.set(opt.icon, opt.label));
  profiles.forEach(p => {
    if (p.icon && !iconMap.has(p.icon)) {
      iconMap.set(p.icon, p.name);
    }
  });

  const currentIcon = selectedIcon || "🏠";
  const iconInput = document.getElementById("new-profile-icon");
  if (iconInput) iconInput.value = currentIcon;

  grid.innerHTML = [...iconMap.entries()].map(([icon, label]) => {
    const isSelected = icon === currentIcon;
    return `<button type="button" class="icon-btn${isSelected ? ' selected' : ''}" data-icon="${icon}" onclick="selectProfileIcon('${icon}')">${icon} ${label}</button>`;
  }).join("");
}

function selectProfileIcon(icon) {
  const iconInput = document.getElementById("new-profile-icon");
  if (iconInput) iconInput.value = icon;
  const btns = document.querySelectorAll("#icon-picker-grid .icon-btn");
  btns.forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.icon === icon);
  });
}

function resetProfileForm() {
  const titleEl = document.getElementById("profile-form-title");
  const editIdEl = document.getElementById("editing-profile-id");
  const nameInput = document.getElementById("new-profile-name");
  const btnSubmit = document.getElementById("btn-create-profile");
  const btnCancel = document.getElementById("btn-cancel-profile-edit");

  if (titleEl) titleEl.textContent = "Create New Profile";
  if (editIdEl) editIdEl.value = "";
  if (nameInput) nameInput.value = "";
  renderIconPicker("🏠");
  if (btnSubmit) btnSubmit.textContent = "Create Profile";
  if (btnCancel) btnCancel.style.display = "none";
}

function createProfile() {
  const nameInput = document.getElementById("new-profile-name");
  const iconInput = document.getElementById("new-profile-icon");
  const editingIdEl = document.getElementById("editing-profile-id");
  const editingId = editingIdEl ? editingIdEl.value : "";
  const name = nameInput.value.trim();
  const icon = iconInput ? iconInput.value : "🏠";

  if (!name) { 
    nameInput.focus(); 
    return; 
  }

  const profiles = loadProfiles();

  if (editingId) {
    // Update existing profile (preserve accounts)
    const pIdx = profiles.findIndex(p => p.id === editingId);
    if (pIdx !== -1) {
      profiles[pIdx].name = name;
      profiles[pIdx].icon = icon;
    }
  } else {
    // Create new profile (empty accounts — assign via Edit Account)
    const newProfile = {
      id: "p" + Date.now(),
      name: name,
      icon: icon,
      accounts: [],
    };
    profiles.push(newProfile);
  }

  saveProfiles(profiles);
  resetProfileForm();
  renderProfileTabs();
  renderExistingProfilesList();
  if (activeProfileId !== 'all') {
    renderProfileBanner();
    applyFilters();
  }
}

function editProfile(id) {
  const profiles = loadProfiles();
  const target = profiles.find(p => p.id === id);
  if (!target) return;

  document.getElementById("profile-form-title").textContent = "Edit Profile";
  document.getElementById("editing-profile-id").value = target.id;
  document.getElementById("new-profile-name").value = target.name;
  renderIconPicker(target.icon || "🏠");
  document.getElementById("btn-create-profile").textContent = "Update Profile";
  document.getElementById("btn-cancel-profile-edit").style.display = "inline-block";

  // Scroll to top of modal
  const modalBody = document.getElementById("profiles-modal-body");
  if (modalBody) modalBody.scrollTop = 0;
}

function deleteProfile(id) {
  let profiles = loadProfiles();
  profiles = profiles.filter(p => p.id !== id);
  saveProfiles(profiles);

  if (activeProfileId === id) {
    switchProfile("all");
  }

  const currentEditingId = document.getElementById("editing-profile-id") ? document.getElementById("editing-profile-id").value : "";
  if (currentEditingId === id) {
    resetProfileForm();
  }

  renderProfileTabs();
  renderExistingProfilesList();
  renderAccountCheckboxes([]);
}

function renderExistingProfilesList() {
  const container = document.getElementById("existing-profiles-list");
  const profiles = loadProfiles();

  if (profiles.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No profiles created yet.</p>';
    return;
  }

  container.innerHTML = '<h3>Existing Profiles</h3>' + profiles.map(p => {
    const accList = p.accounts || [];
    const names = accList.map(acc => {
      const bill = BILLS.find(b => b.account === acc);
      return bill ? bill.name : acc;
    });
    return `
      <div class="existing-profile-item">
        <div class="ep-left">
          <span class="ep-icon">${p.icon}</span>
          <div>
            <div class="ep-name">${p.name}</div>
            <div class="ep-detail">${names.length > 0 ? names.join(", ") : 'No accounts'} · ${accList.length} account${accList.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn-action btn-action-edit" onclick="editProfile('${p.id}')" title="Edit profile" style="padding:6px; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:var(--radius-sm); cursor:pointer; color:var(--text-main);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-delete-profile" onclick="deleteProfile('${p.id}')" title="Delete profile">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// ---------- Modal ----------
function openModal(id) {
  const acc = BILLS.find(b => b.id === id);
  if (!acc) return;

  const latest = getLatestBill(acc);
  const statusStr = latest ? latest.status : 'none';

  document.getElementById("modal-status").className = `badge badge-${statusStr}`;
  document.getElementById("modal-status").textContent = latest ? capitalize(latest.status) : 'No Bill';

  let historyRowsHtml = '';
  if (acc.history && acc.history.length > 0) {
    historyRowsHtml = acc.history.map(h => `
      <tr>
        <td style="padding: 8px 12px; font-weight: 500;">${formatMonth(h.billMonth)}</td>
        <td style="padding: 8px 12px;">${h.units.toLocaleString()}</td>
        <td style="padding: 8px 12px; font-weight: 600;">${formatCurrency(h.amount)}</td>
        <td style="padding: 8px 12px;">${formatDueDate(h.dueDate)}</td>
        <td style="padding: 8px 12px;"><span class="badge badge-${h.status}" style="font-size: 11px; padding: 2px 8px;">${capitalize(h.status)}</span></td>
      </tr>
    `).join('');
  } else {
    historyRowsHtml = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">No billing history available.</td>
      </tr>
    `;
  }

  document.getElementById("modal-body").innerHTML = `
    <div style="grid-column: span 2; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
      <div class="detail-item"><span class="detail-label">Account No.</span><span class="detail-value" style="font-weight:600; color:var(--accent-blue)">${acc.account}</span></div>
      <div class="detail-item"><span class="detail-label">Consumer Name</span><span class="detail-value">${acc.name}</span></div>
      <div class="detail-item"><span class="detail-label">Room No.</span><span class="detail-value" style="font-weight:600;">${acc.roomNo || 'N/A'}</span></div>
      <div class="detail-item"><span class="detail-label">Meter No.</span><span class="detail-value" style="font-family:monospace;">${acc.meterNo}</span></div>
      <div class="detail-item"><span class="detail-label">Address</span><span class="detail-value">${acc.address}</span></div>
      <div class="detail-item"><span class="detail-label">Tariff Category</span><span class="detail-value">${acc.tariff}</span></div>
      <div class="detail-item"><span class="detail-label">Sanctioned Load</span><span class="detail-value">${acc.sanctionedLoad}</span></div>
    </div>
    <div style="grid-column: span 2;">
      <h3 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Billing History (Last 12 Months)
      </h3>
      <div style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.82rem;">
          <thead style="background: var(--bg-secondary); position: sticky; top: 0; z-index: 1;">
            <tr>
              <th style="padding: 10px 12px; color: var(--text-muted); font-weight: 600;">Month</th>
              <th style="padding: 10px 12px; color: var(--text-muted); font-weight: 600;">Units</th>
              <th style="padding: 10px 12px; color: var(--text-muted); font-weight: 600;">Amount</th>
              <th style="padding: 10px 12px; color: var(--text-muted); font-weight: 600;">Due Date</th>
              <th style="padding: 10px 12px; color: var(--text-muted); font-weight: 600;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${historyRowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("modal-overlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
}

function openBillForm(editId) {
  if (!editId) return;
  const form = document.getElementById("bill-form");
  form.reset();

  const acc = BILLS.find(b => b.id === editId);
  if (!acc) return;
  const latest = getLatestBill(acc);

  document.getElementById("bill-form-title").textContent = "Edit Account Profile";
  document.getElementById("bf-submit").textContent = "Save Changes";
  document.getElementById("bf-id").value = acc.id;
  document.getElementById("bf-account").value = acc.account;
  document.getElementById("bf-account").readOnly = true;
  document.getElementById("bf-account").style.opacity = "0.6";
  document.getElementById("bf-name").value = acc.name || '';
  document.getElementById("bf-month").value = latest ? latest.billMonth : '';
  document.getElementById("bf-units").value = latest ? latest.units : '';
  document.getElementById("bf-amount").value = latest ? latest.amount : '';
  document.getElementById("bf-due").value = latest ? latest.dueDate : '';
  document.getElementById("bf-status").value = latest ? latest.status : 'unpaid';
  document.getElementById("bf-meter").value = acc.meterNo || '';
  document.getElementById("bf-room").value = acc.roomNo || '';

  // Populate profile dropdown and pre-select current profile
  const profileSelect = document.getElementById("bf-profile");
  const profiles = loadProfiles();
  const currentProfile = profiles.find(p => isAccInProfile(p, acc.account));

  profileSelect.innerHTML = '<option value="">— No Profile —</option>';
  profiles.forEach(p => {
    const selected = (currentProfile && currentProfile.id === p.id) ? 'selected' : '';
    profileSelect.innerHTML += `<option value="${p.id}" ${selected}>${p.icon} ${p.name}</option>`;
  });

  document.getElementById("bill-form-overlay").classList.add("open");
}

function closeBillForm() {
  document.getElementById("bill-form-overlay").classList.remove("open");
}

async function saveBill(e) {
  e.preventDefault();

  const editId = document.getElementById("bf-id").value;
  if (!editId) return;

  const account = document.getElementById("bf-account").value.trim();
  const name = document.getElementById("bf-name").value.trim();
  const billMonth = document.getElementById("bf-month").value;
  const units = parseInt(document.getElementById("bf-units").value, 10) || 0;
  const amount = parseInt(document.getElementById("bf-amount").value, 10) || 0;
  const dueDate = document.getElementById("bf-due").value;
  const status = document.getElementById("bf-status").value;
  const meterNo = document.getElementById("bf-meter").value.trim();
  const roomNo = document.getElementById("bf-room").value.trim();
  const selectedProfileId = document.getElementById("bf-profile").value;

  try {
    const res = await fetch(`/api/bills/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, name, billMonth, units, amount, dueDate, status, meterNo, roomNo })
    });
    if (res.ok) {
      // Update profile assignment in localStorage
      const profiles = loadProfiles();
      profiles.forEach(p => {
        // Remove this account from all profiles first
        p.accounts = (p.accounts || []).filter(a => !matchAcc(a, account));
      });
      // Add to selected profile
      if (selectedProfileId) {
        const target = profiles.find(p => p.id === selectedProfileId);
        if (target) {
          if (!target.accounts) target.accounts = [];
          if (!target.accounts.some(a => matchAcc(a, account))) {
            target.accounts.push(account);
          }
        }
      }
      saveProfiles(profiles);

      closeBillForm();
      await loadBillsFromServer();
      renderProfileTabs();
      if (activeProfileId !== 'all') {
        renderProfileBanner();
      }
      applyFilters();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to update account.");
    }
  } catch (err) {
    console.error("Failed to update account:", err);
  }
}

let pendingDeleteId = null;

function confirmDeleteBill(id) {
  const acc = BILLS.find(b => b.id === id);
  if (!acc) return;
  pendingDeleteId = id;
  document.getElementById("delete-msg").textContent =
    `Delete account for ${acc.name} (${acc.account})? This will completely remove it and all history from the database.`;
  document.getElementById("delete-overlay").classList.add("open");
}

function closeDeleteDialog() {
  pendingDeleteId = null;
  document.getElementById("delete-overlay").classList.remove("open");
}

async function deleteBill() {
  if (pendingDeleteId === null) return;
  try {
    const res = await fetch(`/api/bills/${pendingDeleteId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      closeDeleteDialog();
      await loadBillsFromServer();
    }
  } catch (err) {
    console.error("Failed to delete bill:", err);
  }
}

async function confirmDeleteHistory(id) {
  const acc = BILLS.find(b => b.id === id);
  if (!acc) return;
  if (!confirm(`Are you sure you want to clear all billing history for ${acc.name} (${acc.account})? This will keep the account but remove all monthly records from the database and Excel file.`)) {
    return;
  }
  try {
    const res = await fetch(`/api/bills/${id}/history`, { method: 'DELETE' });
    if (res.ok) {
      await loadBillsFromServer();
    }
  } catch (err) {
    console.error("Failed to clear account history:", err);
  }
}

function refreshDashboard() {
  applyFilters();
  renderCharts();
  renderProfileTabs();
  renderProfileBanner();
}

// ---------- Theme ----------
function initTheme() {
  const saved = localStorage.getItem("mescom-theme");
  if (saved === "light") document.body.classList.add("light");
  updateThemeIcon();
}

function toggleTheme() {
  document.body.classList.toggle("light");
  localStorage.setItem("mescom-theme", document.body.classList.contains("light") ? "light" : "dark");
  updateThemeIcon();
  renderCharts();
}

function updateThemeIcon() {
  const isLight = document.body.classList.contains("light");
  document.getElementById("icon-moon").style.display = isLight ? "none" : "block";
  document.getElementById("icon-sun").style.display  = isLight ? "block" : "none";
}

// --- Scraper / Live Fetching ---
let currentScraperSessionId = null;

async function triggerRefetch(billId, accountNo) {
  const cleanAcc = accountNo.replace(/^MNG-/, '');
  localSyncingBillIds.add(billId);
  renderTable();

  try {
    const initRes = await fetch('/api/scraper/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountNo: cleanAcc })
    });
    if (!initRes.ok) throw new Error("Init session failed");
    const initData = await initRes.json();
    
    const submitRes = await fetch('/api/scraper/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: initData.sessionId,
        accountNo: cleanAcc,
        captchaCode: 'AUTO'
      })
    });
    if (!submitRes.ok) throw new Error("Verification failed");
    const submitData = await submitRes.json();

    await importScrapedBill(cleanAcc, submitData.data, billId);
  } catch (err) {
    console.error("Inline refetch error:", err);
    alert(`Failed to sync account ${accountNo}: ${err.message}`);
  } finally {
    localSyncingBillIds.delete(billId);
    renderTable();
  }
}

function openFetchBillModal() {
  showFetchStep(1);
  document.getElementById("fetch-bill-close").style.display = "block";
  document.getElementById("fetch-account-id").value = "";
  document.getElementById("fetch-captcha-code").value = "";
  document.getElementById("fetch-error-msg").style.display = "none";
  document.getElementById("fetch-bill-overlay").classList.add("open");
}

async function refetchAllAccounts() {
  const accounts = [...uniqueAccounts().keys()];
  if (accounts.length === 0) {
    alert("No accounts available to refetch.");
    return;
  }

  // Open modal and prep UI
  openFetchBillModal();
  document.getElementById("fetch-bill-close").style.display = "none";
  showFetchStep("loading");

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    const cleanAcc = acc.replace(/^MNG-/, '');
    
    document.getElementById("fetch-loading-text").textContent = `Syncing account ${i + 1} of ${accounts.length} (${acc})...`;

    try {
      const initRes = await fetch('/api/scraper/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNo: cleanAcc })
      });
      if (!initRes.ok) throw new Error("Init session failed");
      const initData = await initRes.json();
      
      const submitRes = await fetch('/api/scraper/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: initData.sessionId,
          accountNo: cleanAcc,
          captchaCode: 'AUTO'
        })
      });
      if (!submitRes.ok) throw new Error("Submit verification failed");
      const submitData = await submitRes.json();

      await importScrapedBill(cleanAcc, submitData.data);
      successCount++;
    } catch (e) {
      console.error(`Failed to refetch account ${acc}:`, e);
      failCount++;
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  document.getElementById("fetch-loading-text").textContent = `Sync Complete! Succeeded: ${successCount}, Failed: ${failCount}`;
  document.getElementById("fetch-bill-close").style.display = "block";
  await loadBillsFromServer();

  setTimeout(() => {
    closeFetchBillModal();
  }, 2500);
}

function closeFetchBillModal() {
  document.getElementById("fetch-bill-overlay").classList.remove("open");
  currentScraperSessionId = null;
}

function showFetchStep(step) {
  document.getElementById("fetch-step-1").style.display = step === 1 ? "block" : "none";
  document.getElementById("fetch-step-2").style.display = step === 2 ? "block" : "none";
  document.getElementById("fetch-loading").style.display = step === "loading" ? "flex" : "none";
}

async function initializeScraperSession() {
  const accountIdInput = document.getElementById("fetch-account-id");
  const accountNo = accountIdInput.value.trim();

  if (!accountNo) {
    accountIdInput.focus();
    return;
  }

  showFetchStep("loading");
  document.getElementById("fetch-loading-text").textContent = "Connecting to MESCOM portal & generating CAPTCHA...";
  document.getElementById("fetch-error-msg").style.display = "none";
  document.getElementById("fetch-captcha-code").value = "";

  try {
    const res = await fetch('/api/scraper/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountNo })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to initialize session.');
    }

    currentScraperSessionId = data.sessionId;
    document.getElementById("captcha-img").src = data.captchaUrl;
    
    // Auto-solve CAPTCHA if returned by the backend
    if (data.autoSolvedCode) {
      console.log("Auto-solved CAPTCHA detected:", data.autoSolvedCode);
      document.getElementById("fetch-captcha-code").value = data.autoSolvedCode;
      
      // Auto-submit after 1s delay to show the animation nicely
      document.getElementById("fetch-loading-text").textContent = "CAPTCHA Auto-solved! Verifying bill...";
      setTimeout(() => {
        submitScraperForm();
      }, 1000);
    } else {
      showFetchStep(2);
    }

  } catch (err) {
    console.error(err);
    showFetchStep(1);
    alert("Error: " + err.message);
  }
}

async function submitScraperForm() {
  const captchaCodeInput = document.getElementById("fetch-captcha-code");
  const captchaCode = captchaCodeInput.value.trim();
  const accountNo = document.getElementById("fetch-account-id").value.trim();

  if (!captchaCode) {
    captchaCodeInput.focus();
    return;
  }

  showFetchStep("loading");
  document.getElementById("fetch-loading-text").textContent = "Submitting code and fetching bill details...";

  try {
    const isAutoSolved = document.getElementById("fetch-captcha-code").value.trim() !== "";
    const res = await fetch('/api/scraper/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: currentScraperSessionId,
        accountNo,
        captchaCode: isAutoSolved ? 'AUTO' : captchaCode
      })
    });

    const data = await res.json();

    if (!res.ok) {
      // If captcha was wrong, backend returns new captcha
      if (res.status === 422 && data.captchaUrl) {
        document.getElementById("captcha-img").src = data.captchaUrl;
        document.getElementById("fetch-error-msg").textContent = data.error || "Incorrect CAPTCHA. Try again.";
        document.getElementById("fetch-error-msg").style.display = "block";
        showFetchStep(2);
        return;
      }
      throw new Error(data.error || 'Failed to fetch bill.');
    }

    // Success! Import bill data
    console.log("Scraped bill data successfully:", data.data);
    importScrapedBill(accountNo, data.data);

    closeFetchBillModal();

  } catch (err) {
    console.error(err);
    showFetchStep(2);
    document.getElementById("fetch-error-msg").textContent = err.message;
    document.getElementById("fetch-error-msg").style.display = "block";
  }
}

async function importScrapedBill(accountNo, scraped, targetBillId = null) {
  // Convert scraped amount and units
  const amount = parseInt(scraped.billAmount.replace(/[^0-9]/g, ''), 10) || 0;
  
  // Estimate units if not returned (common in payment-only screens)
  let units = parseInt(scraped.unitsConsumed.replace(/[^0-9]/g, ''), 10) || 0;
  if (units === 0 && amount > 0) {
    units = Math.round(amount / 7); // Estimate at ₹7 per unit
  }
  
  let billMonth = "2026-06";
  let dueDate = "2026-07-25";

  // Parse Indian Date format DD/MM/YYYY
  if (scraped.dueDate && scraped.dueDate !== 'N/A') {
    const parts = scraped.dueDate.trim().split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      dueDate = `${y}-${m}-${d}`;

      // Calculate billing month (typically the previous calendar month)
      let mNum = parseInt(m, 10);
      let yNum = parseInt(y, 10);
      mNum -= 1;
      if (mNum === 0) {
        mNum = 12;
        yNum -= 1;
      }
      billMonth = `${yNum}-${String(mNum).padStart(2, '0')}`;
    } else {
      const ymdParts = scraped.dueDate.trim().split('-');
      if (ymdParts.length === 3) {
        dueDate = scraped.dueDate.trim();
        let mNum = parseInt(ymdParts[1], 10) - 1;
        let yNum = parseInt(ymdParts[0], 10);
        if (mNum === 0) {
          mNum = 12;
          yNum -= 1;
        }
        billMonth = `${yNum}-${String(mNum).padStart(2, '0')}`;
      }
    }
  }

  // Strip any existing prefix (e.g. MNG-) to keep naming consistent
  const cleanAccountNo = accountNo.replace(/^MNG-/, '');
  const normalizedAcc = "MNG-" + cleanAccountNo;

  // Retrieve current existing name to preserve it if it exists (ignoring updated customer name from scraper if different)
  const existingBill = BILLS.find(b => b.account.replace(/^MNG-/, '') === cleanAccountNo);
  const consumerName = existingBill ? existingBill.name : (scraped.consumerName !== 'N/A' ? scraped.consumerName : "Consumer " + cleanAccountNo);

  try {
    const res = await fetch('/api/bills/save-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account: normalizedAcc,
        name: consumerName,
        billMonth,
        units,
        amount,
        dueDate,
        status: amount <= 0 ? "paid" : "unpaid"
      })
    });

    if (res.ok) {
      await loadBillsFromServer();
    }
  } catch (err) {
    console.error("Failed to save scraped bill:", err);
  }
}

// ---------- Event Listeners ----------
document.getElementById("search-input").addEventListener("input", debounce(applyFilters, 250));
document.getElementById("sort-filter").addEventListener("change", applyFilters);
document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-overlay").addEventListener("click", e => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById("consumption-filter").addEventListener("change", e => {
  renderConsumptionChart(e.target.value);
});
document.getElementById("btn-manage-profiles").addEventListener("click", openProfilesModal);
document.getElementById("profiles-modal-close").addEventListener("click", closeProfilesModal);
document.getElementById("profiles-modal-overlay").addEventListener("click", e => {
  if (e.target === e.currentTarget) closeProfilesModal();
});
document.getElementById("btn-create-profile").addEventListener("click", createProfile);
document.getElementById("bill-form-close").addEventListener("click", closeBillForm);
document.getElementById("bill-form-overlay").addEventListener("click", e => {
  if (e.target === e.currentTarget) closeBillForm();
});
document.getElementById("delete-overlay").addEventListener("click", e => {
  if (e.target === e.currentTarget) closeDeleteDialog();
});
document.getElementById("fetch-bill-close").addEventListener("click", closeFetchBillModal);
document.getElementById("fetch-bill-overlay").addEventListener("click", e => {
  if (e.target === e.currentTarget) closeFetchBillModal();
});

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

async function loadBillsFromServer() {
  try {
    const res = await fetch('/api/bills');
    BILLS = await res.json();
    populateAccountFilter();
    applyFilters();
    renderCharts();
    renderProfileTabs();
    renderProfileBanner();
  } catch (e) {
    console.error("Failed to load bills from backend database:", e);
  }
}

// ---------- Init ----------
function init() {
  initTheme();
  loadBillsFromServer();
}

document.addEventListener("DOMContentLoaded", init);

// ---------- Checkbox / Bulk Selection ----------
function toggleSelectAll(el) {
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageBills = filteredBills.slice(startIdx, startIdx + PAGE_SIZE);

  if (el.checked) {
    pageBills.forEach(b => selectedBillIds.add(b.id));
  } else {
    pageBills.forEach(b => selectedBillIds.delete(b.id));
  }

  // Sync checkboxes in DOM
  const checkboxes = document.querySelectorAll(".bill-checkbox");
  checkboxes.forEach(cb => {
    const id = parseInt(cb.getAttribute("data-id"), 10);
    cb.checked = selectedBillIds.has(id);
  });

  updateBulkDeleteButtonVisibility();
}

function handleBillSelect(el) {
  const id = parseInt(el.getAttribute("data-id"), 10);
  if (el.checked) {
    selectedBillIds.add(id);
  } else {
    selectedBillIds.delete(id);
  }

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageBills = filteredBills.slice(startIdx, startIdx + PAGE_SIZE);
  const selectAll = document.getElementById("select-all-bills");
  if (selectAll) {
    selectAll.checked = pageBills.every(b => selectedBillIds.has(b.id));
  }

  updateBulkDeleteButtonVisibility();
}

function updateBulkDeleteButtonVisibility() {
  const btn = document.getElementById("btn-delete-selected");
  if (btn) {
    if (selectedBillIds.size > 0) {
      btn.style.display = "inline-flex";
    } else {
      btn.style.display = "none";
    }
  }
}

async function confirmDeleteSelected() {
  if (selectedBillIds.size === 0) return;
  
  const count = selectedBillIds.size;
  if (!confirm(`Are you sure you want to delete the ${count} selected account(s)? This will also remove them from the Excel sheet.`)) {
    return;
  }

  openFetchBillModal();
  document.getElementById("fetch-bill-close").style.display = "none";
  showFetchStep("loading");
  document.getElementById("fetch-loading-text").textContent = `Deleting ${count} selected accounts...`;

  const idsToDelete = [...selectedBillIds];
  let deletedCount = 0;

  for (const id of idsToDelete) {
    try {
      const res = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
      if (res.ok) {
        selectedBillIds.delete(id);
        deletedCount++;
      }
    } catch (e) {
      console.error(`Failed to delete record ID ${id}:`, e);
    }
  }

  document.getElementById("fetch-loading-text").textContent = `Successfully deleted ${deletedCount} accounts!`;
  document.getElementById("fetch-bill-close").style.display = "block";
  
  await loadBillsFromServer();

  setTimeout(() => {
    closeFetchBillModal();
  }, 1500);
}


