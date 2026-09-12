/* -------------------------------------------------------------
   SADYA CONTROL - JAVASCRIPT APP LOGIC
   Standalone / Offline-first State Management (No Database Setup Needed)
   ------------------------------------------------------------- */

// Default Authentic Kerala Sadya Menu
const DEFAULT_SADYA_MENU = {
  "Rice / ചോറ്": 60,
  "Parippu & Ghee / പരിപ്പ്": 60,
  "Sambar / സാമ്പാർ": 60,
  "Avial / അവിയൽ": 55,
  "Thoran / തോരൻ": 55,
  "Olan / ഓലൻ": 50,
  "Kalan / കാളൻ": 50,
  "Erissery / എരിശ്ശേരി": 50,
  "Pachadi (Pineapple) / പച്ചടി": 50,
  "Kichadi (Cucumber) / കിച്ചടി": 50,
  "Inji Puli / ഇഞ്ചിപ്പുളി": 60,
  "Mango Pickle / മാങ്ങ അച്ചാർ": 60,
  "Papadum / പപ്പടം": 80,
  "Banana (Poovan) / പൂവൻ പഴം": 60,
  "Sharkara Varatti & Chips": 60,
  "Palada Payasam / പാലട": 60,
  "Parippu Payasam / പരിപ്പ് പായസം": 60,
  "Rasam / രസം": 55,
  "Moru (Spiced Buttermilk)": 60
};

// Application State
let state = {
  tables: 20,
  menu: { ...DEFAULT_SADYA_MENU },
  served: {} // served[tableNum][dishName] = true/false
};

let currentSelectedTable = 1;
let activeViewName = 'volunteer';
let pendingConfirmAction = null;

const STORAGE_KEY = 'sadya_control_standalone_v1';

/* -------------------------------------------------------------
   STATE STORAGE & CROSS-TAB SYNC
   ------------------------------------------------------------- */
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = {
        tables: Number(parsed.tables) || 20,
        menu: parsed.menu || { ...DEFAULT_SADYA_MENU },
        served: parsed.served || {}
      };
    }
  } catch (e) {
    console.error("Error loading local state:", e);
  }
}

function saveState(newState) {
  state = newState;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Error saving state:", e);
  }
  renderAll();
}

// Live cross-tab sync across browser windows without any server
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    loadState();
    renderAll();
  }
});

/* -------------------------------------------------------------
   VIEW NAVIGATION
   ------------------------------------------------------------- */
function switchView(viewName) {
  activeViewName = viewName;
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

  const targetView = document.getElementById('view-' + viewName);
  const targetTab = document.querySelector(`.nav-tab[data-view="${viewName}"]`);

  if (targetView) targetView.classList.add('active');
  if (targetTab) targetTab.classList.add('active');

  renderAll();
}

/* -------------------------------------------------------------
   CORE RENDER DISPATCHER
   ------------------------------------------------------------- */
function renderAll() {
  if (currentSelectedTable < 1) currentSelectedTable = 1;
  if (currentSelectedTable > state.tables) currentSelectedTable = state.tables;

  if (activeViewName === 'volunteer') {
    renderVolunteerView();
  } else if (activeViewName === 'dashboard') {
    renderDashboardView();
  } else if (activeViewName === 'setup') {
    renderSetupView();
  }
}

/* -------------------------------------------------------------
   1. VOLUNTEER VIEW
   ------------------------------------------------------------- */
function renderVolunteerView() {
  const select = document.getElementById('select-table');
  select.innerHTML = '';

  const totalDishes = Object.keys(state.menu).length;

  for (let i = 1; i <= state.tables; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    const servedCount = countDishesServedForTable(i);
    opt.textContent = `Table ${i} ${servedCount === totalDishes && totalDishes > 0 ? '✓ (Completed)' : `(${servedCount}/${totalDishes})`}`;
    if (i === currentSelectedTable) opt.selected = true;
    select.appendChild(opt);
  }

  // Prev / Next button disable states
  document.getElementById('btn-prev-table').disabled = (currentSelectedTable <= 1);
  document.getElementById('btn-next-table').disabled = (currentSelectedTable >= state.tables);

  // Table progress info
  const servedCount = countDishesServedForTable(currentSelectedTable);
  const pct = totalDishes > 0 ? Math.round((servedCount / totalDishes) * 100) : 0;

  document.getElementById('table-dishes-badge').textContent = `${servedCount} / ${totalDishes} Served (${pct}%)`;
  document.getElementById('table-progress-fill').style.width = `${pct}%`;

  // Dishes Grid
  const grid = document.getElementById('volunteer-dish-grid');
  grid.innerHTML = '';

  const dishes = Object.keys(state.menu);
  const tableServedObj = (state.served && state.served[currentSelectedTable]) || {};

  dishes.forEach(dish => {
    const isServed = !!tableServedObj[dish];
    const totalStock = Number(state.menu[dish]) || 0;
    const totalServedAcrossAllTables = countTotalServedAcrossTables(dish);
    const remaining = Math.max(0, totalStock - totalServedAcrossAllTables);

    const btn = document.createElement('button');
    btn.className = `dish-btn ${isServed ? 'served' : ''}`;
    btn.onclick = () => toggleDishServed(currentSelectedTable, dish);

    btn.innerHTML = `
      <div class="dish-btn-left">
        <div class="dish-checkbox">${isServed ? '✓' : ''}</div>
        <div class="dish-text">
          <span class="dish-title">${escapeHtml(dish)}</span>
          <span class="dish-stock-info">
            <span>Stock left: <strong>${remaining}</strong>/${totalStock}</span>
          </span>
        </div>
      </div>
    `;
    grid.appendChild(btn);
  });
}

function toggleDishServed(tableNum, dishName) {
  if (!state.served) state.served = {};
  if (!state.served[tableNum]) state.served[tableNum] = {};

  const next = !state.served[tableNum][dishName];
  state.served[tableNum][dishName] = next;

  if (navigator.vibrate) {
    navigator.vibrate(next ? 35 : 20);
  }

  saveState(state);
}

function onSelectTable(val) {
  currentSelectedTable = Number(val);
  renderVolunteerView();
}

function prevTable() {
  if (currentSelectedTable > 1) {
    currentSelectedTable--;
    renderVolunteerView();
  }
}

function nextTable() {
  if (currentSelectedTable < state.tables) {
    currentSelectedTable++;
    renderVolunteerView();
  }
}

function markCurrentTableAll(isServed) {
  if (!state.served) state.served = {};
  if (!state.served[currentSelectedTable]) state.served[currentSelectedTable] = {};

  Object.keys(state.menu).forEach(dish => {
    state.served[currentSelectedTable][dish] = isServed;
  });

  saveState(state);
  showToast(isServed ? `✓ Marked Table ${currentSelectedTable} completely served` : `Cleared Table ${currentSelectedTable}`);
}

/* -------------------------------------------------------------
   2. DASHBOARD VIEW
   ------------------------------------------------------------- */
function renderDashboardView() {
  const dishes = Object.keys(state.menu);
  const totalDishesCount = dishes.length;
  const totalPossibleServings = state.tables * totalDishesCount;

  // Calculate totals
  let totalServingsGiven = 0;
  let tablesFullyServed = 0;

  for (let t = 1; t <= state.tables; t++) {
    const tableServed = (state.served && state.served[t]) || {};
    let tableServedCount = 0;
    dishes.forEach(d => {
      if (tableServed[d]) {
        totalServingsGiven++;
        tableServedCount++;
      }
    });
    if (tableServedCount === totalDishesCount && totalDishesCount > 0) {
      tablesFullyServed++;
    }
  }

  const overallPercent = totalPossibleServings > 0 ? Math.round((totalServingsGiven / totalPossibleServings) * 100) : 0;
  const tablePercent = state.tables > 0 ? Math.round((tablesFullyServed / state.tables) * 100) : 0;

  // 3 Key Stats
  document.getElementById('dash-total-servings').textContent = totalServingsGiven.toLocaleString();
  document.getElementById('dash-total-capacity').textContent = `Out of ${totalPossibleServings} total required`;

  document.getElementById('dash-tables-completed').textContent = `${tablesFullyServed} / ${state.tables}`;
  document.getElementById('dash-tables-percent').textContent = `${tablePercent}% of all ${state.tables} tables`;

  document.getElementById('dash-overall-progress').textContent = `${overallPercent}%`;
  document.getElementById('dash-dishes-status').textContent = `${totalServingsGiven} dishes served`;

  // Dish Stock Grid
  const stockGrid = document.getElementById('dashboard-stock-grid');
  stockGrid.innerHTML = '';

  dishes.forEach(dish => {
    const totalPrepared = Number(state.menu[dish]) || 0;
    const servedCount = countTotalServedAcrossTables(dish);
    const remaining = Math.max(0, totalPrepared - servedCount);
    const pctRemaining = totalPrepared > 0 ? (remaining / totalPrepared) * 100 : 0;
    const isLowStock = pctRemaining <= 15 || remaining <= 3;

    const card = document.createElement('div');
    card.className = `stock-card ${isLowStock ? 'low-stock' : ''}`;

    card.innerHTML = `
      <div class="stock-header">
        <span class="stock-dish-name">${escapeHtml(dish)}</span>
        <span class="stock-badge">${isLowStock ? '⚠️ LOW: ' : ''}${remaining} Left</span>
      </div>
      <div class="stock-bar-container">
        <div class="stock-bar-fill" style="width: ${Math.min(100, pctRemaining)}%;"></div>
      </div>
      <div class="stock-meta">
        <span>Served: <strong>${servedCount}</strong> / Prepared: <strong>${totalPrepared}</strong></span>
        <span>${Math.round(pctRemaining)}% remaining</span>
      </div>
    `;
    stockGrid.appendChild(card);
  });

  // Full Matrix Grid Table
  const thead = document.getElementById('matrix-thead');
  const tbody = document.getElementById('matrix-tbody');

  let headHtml = '<tr><th class="th-table-num">Table</th>';
  dishes.forEach(d => {
    headHtml += `<th title="${escapeHtml(d)}">${escapeHtml(d)}</th>`;
  });
  headHtml += '<th>Status</th></tr>';
  thead.innerHTML = headHtml;

  let bodyHtml = '';
  for (let t = 1; t <= state.tables; t++) {
    const tableServed = (state.served && state.served[t]) || {};
    let servedCountThisTable = 0;

    bodyHtml += `<tr><td class="td-table-num">Table ${t}</td>`;

    dishes.forEach(d => {
      const isServed = !!tableServed[d];
      if (isServed) servedCountThisTable++;
      bodyHtml += `
        <td class="matrix-cell ${isServed ? 'served' : 'unserved'}" 
            onclick="toggleDishServed(${t}, '${escapeQuotes(d)}')" 
            title="Table ${t} - ${escapeHtml(d)}: ${isServed ? 'Served' : 'Not Served'}">
          ${isServed ? '✓' : '—'}
        </td>
      `;
    });

    const isFull = (servedCountThisTable === totalDishesCount && totalDishesCount > 0);
    bodyHtml += `
      <td style="font-weight: 700; color: ${isFull ? 'var(--leaf-dark)' : 'var(--text-muted)'}; background: ${isFull ? 'var(--leaf-soft)' : 'transparent'}">
        ${isFull ? '✓ Complete' : `${servedCountThisTable}/${totalDishesCount}`}
      </td>
    </tr>`;
  }
  tbody.innerHTML = bodyHtml;
}

/* -------------------------------------------------------------
   3. SETUP VIEW
   ------------------------------------------------------------- */
function renderSetupView() {
  document.getElementById('input-table-count').value = state.tables || 20;

  const editList = document.getElementById('menu-edit-list');
  editList.innerHTML = '';

  Object.entries(state.menu).forEach(([dish, qty]) => {
    const row = document.createElement('div');
    row.className = 'menu-edit-row';
    row.innerHTML = `
      <input type="text" class="edit-dish-name" value="${escapeHtml(dish)}" placeholder="Dish name">
      <input type="number" class="edit-dish-qty" min="1" max="10000" value="${qty}" title="Total prepared servings">
      <button class="btn-remove-dish" onclick="removeDishRow(this)" title="Remove dish">&times;</button>
    `;
    editList.appendChild(row);
  });
}

function addDishRow(name = '', qty = 60) {
  const editList = document.getElementById('menu-edit-list');
  const row = document.createElement('div');
  row.className = 'menu-edit-row';
  row.innerHTML = `
    <input type="text" class="edit-dish-name" value="${escapeHtml(name)}" placeholder="e.g. Parippu Payasam">
    <input type="number" class="edit-dish-qty" min="1" max="10000" value="${qty}" title="Total prepared servings">
    <button class="btn-remove-dish" onclick="removeDishRow(this)" title="Remove dish">&times;</button>
  `;
  editList.appendChild(row);
  row.querySelector('input[type="text"]').focus();
}

function removeDishRow(btn) {
  const row = btn.closest('.menu-edit-row');
  if (row) row.remove();
}

function setTablePreset(num) {
  document.getElementById('input-table-count').value = num;
}

function saveTableConfig() {
  const val = parseInt(document.getElementById('input-table-count').value, 10);
  if (isNaN(val) || val < 1) {
    showToast("⚠️ Please enter a valid number of tables (min 1)");
    return;
  }
  state.tables = Math.min(150, val);
  saveState(state);
  showToast(`✓ Saved table count: ${state.tables} tables`);
}

function saveMenuConfig() {
  const rows = document.querySelectorAll('.menu-edit-row');
  const newMenu = {};

  rows.forEach(row => {
    const name = row.querySelector('.edit-dish-name').value.trim();
    const qty = parseInt(row.querySelector('.edit-dish-qty').value, 10) || 50;
    if (name) {
      newMenu[name] = qty;
    }
  });

  if (Object.keys(newMenu).length === 0) {
    showToast("⚠️ Menu must contain at least 1 dish");
    return;
  }

  state.menu = newMenu;
  saveState(state);
  showToast(`✓ Menu updated with ${Object.keys(newMenu).length} dishes`);
}

function loadSadyaPresets() {
  state.menu = { ...DEFAULT_SADYA_MENU };
  renderSetupView();
  showToast("✓ Loaded Kerala Sadya default menu (19 dishes)");
}

/* -------------------------------------------------------------
   RESET CONTROLS & CONFIRMATION
   ------------------------------------------------------------- */
function confirmResetServed() {
  openConfirmModal(
    "Clear All Served Data?",
    "This will reset all tables to unserved (0 dishes served), but will keep your current table count and menu configuration.",
    () => {
      state.served = {};
      saveState(state);
      showToast("🧹 All served data has been reset");
    }
  );
}

function confirmFactoryReset() {
  openConfirmModal(
    "Full Factory Reset?",
    "This will restore all default settings (20 tables, standard Sadya menu) and wipe all served tracking data.",
    () => {
      state = {
        tables: 20,
        menu: { ...DEFAULT_SADYA_MENU },
        served: {}
      };
      saveState(state);
      showToast("↺ Factory reset complete");
    }
  );
}

function openConfirmModal(title, message, onConfirm) {
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-body').textContent = message;
  pendingConfirmAction = onConfirm;
  document.getElementById('confirm-modal').classList.add('active');
}

function closeConfirmModal() {
  pendingConfirmAction = null;
  document.getElementById('confirm-modal').classList.remove('active');
}

function executeConfirmedAction() {
  if (typeof pendingConfirmAction === 'function') {
    pendingConfirmAction();
  }
  closeConfirmModal();
}

/* -------------------------------------------------------------
   HELPERS & UTILITIES
   ------------------------------------------------------------- */
function countDishesServedForTable(tableNum) {
  if (!state.served || !state.served[tableNum]) return 0;
  const dishes = Object.keys(state.menu);
  let count = 0;
  dishes.forEach(d => {
    if (state.served[tableNum][d]) count++;
  });
  return count;
}

function countTotalServedAcrossTables(dishName) {
  if (!state.served) return 0;
  let count = 0;
  for (let t = 1; t <= state.tables; t++) {
    if (state.served[t] && state.served[t][dishName]) {
      count++;
    }
  }
  return count;
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeQuotes(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'");
}

/* -------------------------------------------------------------
   INITIALIZATION
   ------------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderAll();
});
