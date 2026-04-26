/**
 * ============================================================
 * PHONE TRADE-IN MANAGEMENT - MAIN APP JS
 * Vanilla JS SPA — Mobile-first
 * ============================================================
 */

// ============================================================
// STATE
// ============================================================
const State = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),

  // Intake form data
  intake: {
    customerName: '',
    customerPhone: '',
    deviceType: 'iPhone',
    model: '',
    basePrice: 0,
    prices: { pin: 0, man: 0, camera: 0, vo: 0, sac: 0 },
    priceSource: null,
    conditionPct: 1.0,
    conditionTier: 'new', // new|good|scratched|broken
    conditionLabel: 'Đẹp như mới',
    defects: { man: false, pin: false, vo: false, sac: false },
    cameraDots: 0,
    notes: '',
    finalPrice: 0,
    // Trade-in support
    memberTier: 'none', // none|snew|smem|svip
    newDevicePrice: 0,
    supportTradein: 0,
    supportCategory: 0,
    supportAM: 0,
    supportPayment: 0,
  },

  // Last confirmed transaction
  lastTransaction: null,

  // History page
  historyPage: 1,
  historyFilters: {},
};

// ============================================================
// MODEL DATABASE
// ============================================================
const MODELS = {
  iPhone: [
    'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
    'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13 mini', 'iPhone 13',
    'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12 mini', 'iPhone 12',
    'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
    'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
    'iPhone SE 3', 'iPhone SE 2', 'iPhone 8 Plus', 'iPhone 8',
  ],
  Android: [
    'Samsung Galaxy S24 Ultra', 'Samsung Galaxy S24+', 'Samsung Galaxy S24',
    'Samsung Galaxy S23 Ultra', 'Samsung Galaxy S23', 'Samsung Galaxy A55',
    'Samsung Galaxy A35', 'Samsung Galaxy A15', 'Samsung Galaxy Z Fold 5',
    'Xiaomi 14 Ultra', 'Xiaomi 14', 'Xiaomi 13T Pro', 'Redmi Note 13 Pro',
    'OPPO Find X7 Ultra', 'OPPO Reno 11 Pro', 'OPPO A79',
    'Vivo X100 Pro', 'Vivo V29', 'OnePlus 12', 'Google Pixel 8 Pro',
  ],
  MacBook: [
    'MacBook Pro 16 M3 Max', 'MacBook Pro 16 M3 Pro', 'MacBook Pro 16 M3',
    'MacBook Pro 14 M3 Max', 'MacBook Pro 14 M3 Pro', 'MacBook Pro 14 M3',
    'MacBook Pro 16 M2 Max', 'MacBook Pro 16 M2 Pro',
    'MacBook Pro 14 M2 Max', 'MacBook Pro 14 M2 Pro',
    'MacBook Pro 13 M2', 'MacBook Pro 13 M1',
    'MacBook Air 15 M3', 'MacBook Air 13 M3',
    'MacBook Air 15 M2', 'MacBook Air 13 M2',
    'MacBook Air 13 M1',
  ],
  iPad: [
    'iPad Pro 13 M4', 'iPad Pro 11 M4', 'iPad Pro 13 M2', 'iPad Pro 11 M2',
    'iPad Air 13 M2', 'iPad Air 11 M2', 'iPad Air M1',
    'iPad mini 7', 'iPad mini 6', 'iPad 10', 'iPad 9',
  ],
  Watch: [
    'Apple Watch Ultra 2', 'Apple Watch Ultra',
    'Apple Watch Series 10', 'Apple Watch Series 9', 'Apple Watch Series 8',
    'Apple Watch SE 2', 'Apple Watch SE',
    'Samsung Galaxy Watch 7', 'Samsung Galaxy Watch Ultra', 'Samsung Galaxy Watch 6',
  ],
  AirPods: [
    'AirPods Pro 2', 'AirPods Pro', 'AirPods 4', 'AirPods 3', 'AirPods 2',
    'AirPods Max',
  ],
  'Mac mini': ['Mac mini M4 Pro', 'Mac mini M4', 'Mac mini M2 Pro', 'Mac mini M2', 'Mac mini M1'],
};

const DEVICE_ICONS = {
  iPhone: '<i class="bi bi-apple"></i>', 
  Android: '<i class="bi bi-android2"></i>', 
  MacBook: '<i class="bi bi-laptop"></i>',
  iPad: '<i class="bi bi-tablet"></i>', 
  Watch: '<i class="bi bi-smartwatch"></i>', 
  AirPods: '<i class="bi bi-earbuds"></i>', 
  'Mac mini': '<i class="bi bi-pc-display"></i>',
};

// ============================================================
// UTILITIES
// ============================================================
const API_BASE = '';

async function api(method, url, data = null) {
  const tsUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
  console.log(`[API Call] ${method} ${tsUrl}`);
  
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (State.token) opts.headers['Authorization'] = `Bearer ${State.token}`;
  if (data) opts.body = JSON.stringify(data);
  
  try {
    const res = await fetch(API_BASE + tsUrl, opts);
    if (res.status === 401) { logout(); return null; }
    
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return { success: false, error: `Lỗi máy chủ (${res.status}) - Không tìm thấy: ${url}` };
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, error: `Lỗi kết nối: ${url}` };
  }
}

function fmt(num) {
  if (!num && num !== 0) return '—';
  return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + 'đ';
}

function fmtShort(num) {
  if (!num && num !== 0) return '—';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'tr';
  return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + 'đ';
}

function fmtDate(dt) {
  const d = new Date(dt);
  return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function el(id) { return document.getElementById(id); }

function showToast(msg, type = 'info') {
  console.log(`[Toast] ${type}: ${msg}`);
  const icons = { 
    success: 'bi-check-circle-fill', 
    error: 'bi-exclamation-triangle-fill', 
    info: 'bi-info-circle-fill' 
  };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `
    <div class="toast-content">
      <i class="bi ${icons[type]}"></i>
      <span>${msg}</span>
    </div>
  `;
  el('toast-container').appendChild(t);
  
  // Animation
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, 3000);
}

let confirmCallback = null;
window.showConfirm = function(title, msg, callback, type = 'danger') {
  el('confirm-modal-title').textContent = title;
  el('confirm-modal-msg').textContent = msg;
  confirmCallback = callback;
  
  const iconWrap = el('confirm-modal-icon');
  const okBtn = el('btn-confirm-ok');
  
  if (type === 'danger') {
    iconWrap.innerHTML = '<i class="bi bi-trash3-fill"></i>';
    iconWrap.style.background = 'rgba(255, 59, 48, 0.1)';
    iconWrap.style.color = '#ff3b30';
    okBtn.style.background = '#ff3b30';
    okBtn.textContent = 'Xóa Ngay';
  } else {
    iconWrap.innerHTML = '<i class="bi bi-question-circle-fill"></i>';
    iconWrap.style.background = 'var(--primary-light)';
    iconWrap.style.color = 'var(--primary)';
    okBtn.style.background = 'var(--primary)';
    okBtn.textContent = 'Đồng Ý';
  }

  const modal = el('confirm-modal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
};

window.closeConfirm = function() {
  const modal = el('confirm-modal');
  modal.classList.remove('show');
  setTimeout(() => modal.style.display = 'none', 300);
};

el('btn-confirm-cancel').addEventListener('click', closeConfirm);
el('btn-confirm-ok').addEventListener('click', () => {
  console.log('Confirm OK clicked');
  if (typeof confirmCallback === 'function') {
    confirmCallback();
  }
  closeConfirm();
});

// ============================================================
// AUTH
// ============================================================
function logout() {
  State.token = null;
  State.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showLoginScreen();
}

function showLoginScreen() {
  el('login-screen').style.display = '';
  el('app-screen').style.display = 'none';
}

function showAppScreen() {
  el('login-screen').style.display = 'none';
  el('app-screen').style.display = '';
  updateUserUI();
}

function updateUserUI() {
  const u = State.user;
  if (!u) return;
  
  // Update Bottom Sheet Profile info
  el('sheet-user-name').textContent = u.display_name;
  const sheetBadge = el('sheet-user-role');
  sheetBadge.textContent = u.role === 'admin' ? 'QUẢN TRỊ VIÊN' : 'NHÂN VIÊN';
  sheetBadge.className = `role-badge ${u.role === 'admin' ? 'admin' : ''}`;

  el('staff-display').value = u.display_name;

  // Apply admin class to body
  document.body.classList.toggle('is-admin', u.role === 'admin');
}

function toggleProfileSheet(show) {
  const overlay = el('profile-sheet-overlay');
  if (show) {
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('show'), 10);
  } else {
    overlay.classList.remove('show');
    setTimeout(() => overlay.style.display = 'none', 300);
  }
}

// Login form
el('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = el('btn-login');
  const errEl = el('login-error');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;margin:0 auto;"></div>';
  errEl.style.display = 'none';

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: el('login-username').value.trim(),
      password: el('login-password').value,
    })
  });

  const data = await res.json();

  if (data.token) {
    State.token = data.token;
    State.user = data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    showAppScreen();
    loadDashboard();
  } else {
    errEl.textContent = data.error || 'Đăng nhập thất bại';
    errEl.style.display = 'block';
  }

  btn.disabled = false;
  btn.innerHTML = '<span>Đăng Nhập</span><i class="bi bi-arrow-right-circle-fill"></i>';
});

el('btn-logout-sheet').addEventListener('click', logout);
el('nav-profile').addEventListener('click', () => toggleProfileSheet(true));
el('profile-sheet-overlay').addEventListener('click', (e) => {
  if (e.target === el('profile-sheet-overlay')) toggleProfileSheet(false);
});

// ============================================================
// NAVIGATION
// ============================================================
function switchTab(tab) {
  document.querySelectorAll('.tab-pane').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  el(`tab-${tab}`).style.display = 'block';
  el(`nav-${tab}`).classList.add('active');

  if (tab === 'history') loadHistory();
  if (tab === 'dashboard') loadDashboard();
  if (tab === 'settings') loadStaff();
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab) switchTab(tab);
  });
});

// ============================================================
// MODULE 1: INTAKE - STEP 1
// ============================================================
let currentStep = 1;

function showStep(n) {
  [1, 2, 3].forEach(i => {
    el(`step-${i}`).style.display = i === n ? 'block' : 'none';
    const sp = el(`sp${i}`);
    sp.classList.toggle('active', i === n);
    sp.classList.toggle('done', i < n);
  });
  el('new-intake-banner').style.display = 'none';
  currentStep = n;
}

// Device type selection
el('device-type-grid').querySelectorAll('.device-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    State.intake.deviceType = btn.dataset.type;
    el('model-input').value = '';
    State.intake.model = '';
    el('clear-model').style.display = 'none';
    renderQuickModels(btn.dataset.type);
    updateSacNote();
  });
});

function renderQuickModels(type) {
  const models = MODELS[type] || [];
  const chips = models.slice(0, 8).map(m =>
    `<button class="quick-chip" data-model="${m}">${m}</button>`
  ).join('');
  el('quick-models').innerHTML = chips;

  el('quick-models').querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectModel(chip.dataset.model);
    });
  });
}

function selectModel(model) {
  el('model-input').value = model;
  State.intake.model = model;
  el('clear-model').style.display = 'block';
  el('autocomplete-list').style.display = 'none';
}

// Autocomplete
el('model-input').addEventListener('input', (e) => {
  const val = e.target.value.trim();
  State.intake.model = val;
  el('clear-model').style.display = val ? 'block' : 'none';

  if (val.length < 2) {
    el('autocomplete-list').style.display = 'none';
    return;
  }

  const type = State.intake.deviceType;
  const all = MODELS[type] || [];
  const matches = all.filter(m => m.toLowerCase().includes(val.toLowerCase())).slice(0, 8);

  if (!matches.length) {
    el('autocomplete-list').style.display = 'none';
    return;
  }

  el('autocomplete-list').innerHTML = matches.map(m =>
    `<div class="ac-item" data-model="${m}"><span>${DEVICE_ICONS[type]}</span>${m}</div>`
  ).join('');
  el('autocomplete-list').style.display = 'block';

  el('autocomplete-list').querySelectorAll('.ac-item').forEach(item => {
    item.addEventListener('click', () => {
      selectModel(item.dataset.model);
    });
  });
});

// Close autocomplete on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('#model-input') && !e.target.closest('#autocomplete-list')) {
    el('autocomplete-list').style.display = 'none';
  }
});

el('clear-model').addEventListener('click', () => {
  el('model-input').value = '';
  State.intake.model = '';
  el('clear-model').style.display = 'none';
  el('autocomplete-list').style.display = 'none';
});

// Step 1 → Next
el('btn-step1-next').addEventListener('click', () => {
  const name = el('customer-name').value.trim();
  const phone = el('customer-phone').value.trim();
  const model = el('model-input').value.trim();

  if (!name) { showToast('Nhập tên khách hàng!', 'error'); el('customer-name').focus(); return; }
  if (!phone || !/^0\d{9}$/.test(phone)) { showToast('SĐT không hợp lệ (10 số, bắt đầu 0)', 'error'); el('customer-phone').focus(); return; }
  if (!model) { showToast('Chọn hoặc nhập model máy!', 'error'); el('model-input').focus(); return; }

  State.intake.customerName = name;
  State.intake.customerPhone = phone;
  State.intake.model = model;
  State.intake.deviceType = document.querySelector('.device-btn.active')?.dataset.type || 'iPhone';

  // Update step 2 header
  el('s2-device-icon').innerHTML = DEVICE_ICONS[State.intake.deviceType];
  el('s2-model-name').textContent = model;
  el('s2-device-type').textContent = State.intake.deviceType;

  showStep(2);
  fetchPrice(model);
});

// ============================================================
// MODULE 2: PRICE FETCHING
// ============================================================
let priceLoadingTimeout;

async function fetchPrice(keyword) {
  el('price-loading').style.display = 'flex';
  el('price-cards').style.display = 'none';
  el('price-error-block').style.display = 'none';

  priceLoadingTimeout = setTimeout(() => {
    el('price-loading').querySelector('span').textContent = 'Đang xử lý...';
  }, 3000);

  try {
    const data = await api('GET', `/api/get-price?keyword=${encodeURIComponent(keyword)}`);
    clearTimeout(priceLoadingTimeout);
    el('price-loading').style.display = 'none';

    if (!data) return;

    if (data.error || (!data.pin && !data.man && !data.camera && !data.vo && !data.sac)) {
      el('price-error-block').style.display = 'block';
      el('price-error-msg').textContent = data.error || 'Không tìm thấy giá cho model này';
      showManualPrices();
    } else {
      applyPrices(data);
    }
  } catch (err) {
    clearTimeout(priceLoadingTimeout);
    el('price-loading').style.display = 'none';
    el('price-error-block').style.display = 'block';
    el('price-error-msg').textContent = 'Lỗi kết nối. Nhập giá thủ công.';
    showManualPrices();
  }
}

function applyPrices(data) {
  State.intake.prices = {
    pin: data.pin || 0,
    man: data.man || 0,
    camera: data.camera || 0,
    vo: data.vo || 0,
    sac: data.sac || 0,
  };
  State.intake.priceNames = {
    pin: data.pin_name || '',
    man: data.man_name || '',
    camera: data.camera_name || '',
    vo: data.vo_name || '',
    sac: data.sac_name || '',
  };
  State.intake.priceSource = data.source;

  // Display price cards
  el('price-cards').style.display = 'block';
  if (data.model_found) {
    el('price-model-found').textContent = `· ${data.model_found}`;
  }

  const fields = ['pin', 'man', 'camera', 'vo', 'sac'];
  fields.forEach(f => {
    let val = data[f] || 0;
    const name = data[`${f}_name`] || '';
    
    // For 'sac' (charger), if device type doesn't use scraped price, hide the card entirely
    if (f === 'sac') {
      const type = State.intake.deviceType;
      // Only MacBook, Watch, Mac mini use the actual scraped charger price
      const usesScrapedSacPrice = ['MacBook', 'Watch', 'Mac mini'].includes(type);
      if (!usesScrapedSacPrice) {
        el('pc-sac').style.display = 'none';
      } else {
        el('pc-sac').style.display = 'flex'; // Restore if it was hidden
      }
    }

    el(`pv-${f}`).textContent = val ? fmt(val) : '—';
    el(`pc-${f}`).classList.toggle('has-price', val > 0);
    // Show product name below price
    const nameEl = el(`pn-${f}`);
    if (nameEl) {
      nameEl.textContent = name;
      nameEl.style.display = name ? 'block' : 'none';
    }
  });

  // Update defect deduct labels
  updateDefectLabels();
  updateSacNote();
}

function showManualPrices() {
  el('manual-prices-form').style.display = 'block';
  el('btn-toggle-manual').classList.add('open');
}

// Manual price toggle
el('btn-toggle-manual').addEventListener('click', () => {
  const form = el('manual-prices-form');
  const isOpen = form.style.display !== 'none';
  form.style.display = isOpen ? 'none' : 'block';
  el('btn-toggle-manual').classList.toggle('open', !isOpen);
});

// Format manual prices
['mp-pin', 'mp-man', 'mp-camera', 'mp-vo', 'mp-sac'].forEach(id => {
  el(id).addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (!val) {
      e.target.value = '';
      return;
    }
    e.target.value = parseInt(val, 10).toLocaleString('vi-VN');
  });
});

// Apply manual prices
el('btn-apply-manual').addEventListener('click', () => {
  const p = {
    pin: parseInt(el('mp-pin').value.replace(/\D/g, '') || '0', 10),
    man: parseInt(el('mp-man').value.replace(/\D/g, '') || '0', 10),
    camera: parseInt(el('mp-camera').value.replace(/\D/g, '') || '0', 10),
    vo: parseInt(el('mp-vo').value.replace(/\D/g, '') || '0', 10),
    sac: parseInt(el('mp-sac').value.replace(/\D/g, '') || '0', 10),
  };
  applyPrices({ ...p, source: 'Nhập thủ công', model_found: State.intake.model });
  showToast('Đã áp dụng giá thủ công', 'success');
  el('price-error-block').style.display = 'none';
});

// Format base price input with dots
el('base-price').addEventListener('input', (e) => {
  let val = e.target.value.replace(/\D/g, '');
  if (!val) {
    e.target.value = '';
    return;
  }
  e.target.value = parseInt(val, 10).toLocaleString('vi-VN');
});

// Back btn step 1
el('btn-back-step1').addEventListener('click', () => showStep(1));
el('btn-back-step1b').addEventListener('click', () => showStep(1));

// Step 2 → Next
el('btn-step2-next').addEventListener('click', () => {
  const rawBase = el('base-price').value.replace(/\D/g, '');
  State.intake.basePrice = parseInt(rawBase || '0', 10);
  if (State.intake.basePrice < 0) { showToast('Giá cơ sở không hợp lệ', 'error'); return; }

  el('pr-model').textContent = State.intake.model;
  showStep(3);
  updateDefectLabels();
  updateSacNote();
  recalcPrice();
});

// ============================================================
// MODULE 3: CONDITION + TRADE-IN SUPPORT + PRICE CALC
// ============================================================

// Condition tier labels
const TIER_LABELS = {
  'new': 'Đẹp như mới', 'good': 'Cũ đẹp', 'scratched': 'Xước cấn', 'broken': 'Xác'
};

// Membership config
const MEMBER_CONFIG = {
  none: { supportPct: 0, cap: 0, discountPct: 0 },
  snew: { supportPct: 0.05, cap: 200000, discountPct: 0 },
  smem: { supportPct: 0.05, cap: 300000, discountPct: 0.005 },
  svip: { supportPct: 0.05, cap: 500000, discountPct: 0.01 },
};

// Condition chips
el('condition-chips').querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    el('condition-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    State.intake.conditionPct = parseFloat(chip.dataset.value);
    State.intake.conditionTier = chip.dataset.tier;
    State.intake.conditionLabel = TIER_LABELS[chip.dataset.tier] || chip.dataset.tier;
    recalcPrice();
  });
});

// Camera chips
el('camera-chips').querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    el('camera-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    State.intake.cameraDots = parseInt(chip.dataset.camera);
    recalcPrice();
  });
});

// Defect checkboxes
['man', 'pin', 'vo', 'sac'].forEach(key => {
  el(`cb-${key}`).addEventListener('change', (e) => {
    State.intake.defects[key] = e.target.checked;
    recalcPrice();
  });
});

// Membership chips
el('member-chips').querySelectorAll('.member-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    el('member-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    State.intake.memberTier = chip.dataset.member;
    recalcPrice();
  });
});

// Trade-in support inputs (recalc on change)
['support-tradein', 'new-device-price', 'support-category', 'support-am', 'support-payment'].forEach(id => {
  el(id).addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (!val) {
      e.target.value = '';
    } else {
      e.target.value = parseInt(val, 10).toLocaleString('vi-VN');
    }
    
    State.intake.supportTradein = parseInt(el('support-tradein').value.replace(/\D/g, '') || '0', 10);
    State.intake.newDevicePrice = parseInt(el('new-device-price').value.replace(/\D/g, '') || '0', 10);
    State.intake.supportCategory = parseInt(el('support-category').value.replace(/\D/g, '') || '0', 10);
    State.intake.supportAM = parseInt(el('support-am').value.replace(/\D/g, '') || '0', 10);
    State.intake.supportPayment = parseInt(el('support-payment').value.replace(/\D/g, '') || '0', 10);
    recalcPrice();
  });
});

function updateSacNote() {
  const type = State.intake.deviceType;
  const noteEl = el('sac-note');
  const deductEl = el('dd-sac');
  const prices = State.intake.prices;

  if (['MacBook', 'Watch', 'Mac mini'].includes(type)) {
    const sacPrice = prices.sac || 0;
    noteEl.textContent = `(-${fmtShort(sacPrice)} sạc)`;
    if (deductEl) deductEl.textContent = sacPrice ? `-${fmt(sacPrice)}` : '-0đ';
  } else if (type === 'Android') {
    noteEl.textContent = '(-200.000đ)';
    if (deductEl) deductEl.textContent = '-200.000đ';
  } else {
    noteEl.textContent = '(Không trừ)';
    if (deductEl) deductEl.textContent = '-0đ';
  }
}

function updateDefectLabels() {
  const p = State.intake.prices;
  // Màn hình: giá cao nhất, hỗ trợ 15% → trừ 85%
  el('dd-man').textContent = p.man ? `-${fmt(Math.round(p.man * 0.85))}` : '-0đ';
  // Pin: giá rẻ nhất, hỗ trợ 30% → trừ 70%
  el('dd-pin').textContent = p.pin ? `-${fmt(Math.round(p.pin * 0.7))}` : '-0đ';
  // Vỏ: trừ 100%
  el('dd-vo').textContent = p.vo ? `-${fmt(p.vo)}` : '-0đ';
  updateSacNote();
}

/**
 * CORE PRICE CALCULATION:
 *
 * 1. giá_sau_tình_trạng = base × conditionPct
 * 2. Khấu trừ:
 *    - Màn: man_max × 85% (hỗ trợ 15%)
 *    - Pin: pin_min × 70% (hỗ trợ 30%)
 *    - Vỏ: vo × 100%
 *    - Camera: 500k / 800k / giá thay camera
 *    - Sạc: 0 (iPhone/iPad/AirPods) / giá sạc (MacBook/Watch/Mac mini) / 200k (Android)
 * 3. Giá nhập cơ bản = giá_sau_tình_trạng - tổng_khấu_trừ
 * 4. Trợ giá:
 *    - Thu cũ: NV nhập (max 30% of base)
 *    - Hạng TV: 5% of base, capped
 *    - Ngành hàng, AM, PTTT: NV nhập
 * 5. Giá trả khách = giá nhập cơ bản + tổng trợ giá
 * 6. Chiết khấu máy mới = giá máy mới × % hạng
 */
function recalcPrice() {
  const { basePrice, conditionPct, conditionLabel, defects, cameraDots, deviceType, prices, memberTier } = State.intake;

  const afterCondition = Math.round(basePrice * conditionPct);
  let deducts = [];

  // === Display base info ===
  el('pb-base').textContent = fmt(basePrice);
  el('pb-condition-pct').textContent = conditionLabel;
  el('pb-condition-val').textContent = fmt(afterCondition);

  // === Defects ===
  if (defects.man && prices.man) {
    const d = Math.round(prices.man * 0.85); // hỗ trợ 15%
    deducts.push({ label: '<i class="bi bi-display"></i> Lỗi màn hình (trừ 85%)', val: d });
  }
  if (defects.pin && prices.pin) {
    const d = Math.round(prices.pin * 0.7); // hỗ trợ 30%
    deducts.push({ label: '<i class="bi bi-battery-half"></i> Pin <85% (trừ 70%)', val: d });
  }
  if (defects.vo && prices.vo) {
    deducts.push({ label: '<i class="bi bi-phone"></i> Vỏ xước (trừ 100%)', val: prices.vo });
  }

  // Camera
  if (cameraDots === 1) {
    deducts.push({ label: '<i class="bi bi-camera"></i> Camera 1 đốm', val: 500000 });
  } else if (cameraDots === 2) {
    deducts.push({ label: '<i class="bi bi-camera"></i> Camera 2 đốm', val: 800000 });
  } else if (cameraDots >= 3 && prices.camera) {
    deducts.push({ label: '<i class="bi bi-camera"></i> Camera ≥3 đốm', val: prices.camera });
    el('chip-camera-3-price').textContent = `-${fmt(prices.camera)}`;
  }

  // Sạc logic
  if (defects.sac) {
    let sacDeduct = 0;
    if (['MacBook', 'Watch', 'Mac mini'].includes(deviceType)) {
      sacDeduct = prices.sac || 0;
    } else if (deviceType === 'Android') {
      sacDeduct = 200000;
    }
    // iPhone, iPad, AirPods → không trừ
    if (sacDeduct > 0) {
      deducts.push({ label: '<i class="bi bi-plug"></i> Thiếu sạc', val: sacDeduct });
    }
  }

  // === Render deduct rows ===
  const deductEl = el('pb-deducts');
  if (deducts.length) {
    deductEl.innerHTML = deducts.map(d =>
      `<div class="pb-deduct-row">
        <span>${d.label}</span>
        <span>-${fmt(d.val)}</span>
      </div>`
    ).join('');
  } else {
    deductEl.innerHTML = '<div class="pb-deduct-row" style="color:var(--text-muted);"><span>Không có khấu trừ</span><span>-0đ</span></div>';
  }

  const totalDeduct = deducts.reduce((s, d) => s + d.val, 0);
  const baseTradeIn = Math.max(0, afterCondition - totalDeduct);

  // === TRADE-IN SUPPORTS ===
  let supports = [];

  // 1. Trợ giá thu cũ (max 30% of basePrice)
  const maxTradeinSupport = Math.round(basePrice * 0.3);
  el('support-tradein-max').textContent = `Tối đa: ${fmt(maxTradeinSupport)}`;
  let tradeinSupport = Math.min(State.intake.supportTradein || 0, maxTradeinSupport);
  if (tradeinSupport > 0) {
    supports.push({ label: '<i class="bi bi-arrow-repeat"></i> Trợ giá thu cũ', val: tradeinSupport });
  }

  // 2. Hạng thành viên (5% of basePrice, capped)
  const mc = MEMBER_CONFIG[memberTier];
  if (mc && mc.supportPct > 0) {
    let memberSupport = Math.round(basePrice * mc.supportPct);
    memberSupport = Math.min(memberSupport, mc.cap);
    if (memberSupport > 0) {
      const tierName = memberTier.charAt(0).toUpperCase() + memberTier.slice(1);
      supports.push({ label: `<i class="bi bi-person-badge-fill"></i> Hạng ${tierName} (5%)`, val: memberSupport });
    }
  }

  // 3. Trợ giá khác
  if (State.intake.supportCategory > 0) {
    supports.push({ label: '<i class="bi bi-box-seam-fill"></i> Ngành hàng', val: State.intake.supportCategory });
  }
  if (State.intake.supportAM > 0) {
    supports.push({ label: '<i class="bi bi-person-workspace"></i> Từ AM', val: State.intake.supportAM });
  }
  if (State.intake.supportPayment > 0) {
    supports.push({ label: '<i class="bi bi-credit-card-fill"></i> Phương thức TT', val: State.intake.supportPayment });
  }

  // === Render support rows ===
  const supportsEl = el('pb-supports');
  if (supports.length) {
    supportsEl.style.display = 'block';
    supportsEl.innerHTML = '<div class="pb-supports-title">✨ Trợ giá</div>' +
      supports.map(s =>
        `<div class="pb-support-row">
          <span>${s.label}</span>
          <span>+${fmt(s.val)}</span>
        </div>`
      ).join('');
  } else {
    supportsEl.style.display = 'none';
  }

  const totalSupport = supports.reduce((s, d) => s + d.val, 0);
  const finalPrice = Math.max(0, baseTradeIn + totalSupport);
  State.intake.finalPrice = finalPrice;

  el('pb-final').textContent = fmt(finalPrice);

  // === Chiết khấu máy mới ===
  const newDevicePrice = State.intake.newDevicePrice || 0;
  const newDeviceRow = el('pb-newdevice-row');
  if (newDevicePrice > 0 && mc && mc.discountPct > 0) {
    const discount = Math.round(newDevicePrice * mc.discountPct);
    newDeviceRow.style.display = 'flex';
    el('pb-newdevice-val').textContent = fmt(discount);
    const pctStr = (mc.discountPct * 100).toFixed(1) + '%';
    el('new-device-discount-info').textContent = `Chiết khấu ${pctStr}: ${fmt(discount)}`;
  } else {
    newDeviceRow.style.display = 'none';
    el('new-device-discount-info').textContent = memberTier === 'none' ? 'Chiết khấu: —' :
      memberTier === 'snew' ? 'Snew: không có CK' : `Nhập giá máy mới`;
  }

  // Update defect labels
  updateDefectLabels();

  return { afterCondition, deducts, supports, totalSupport, finalPrice, baseTradeIn };
}

// ============================================================
// CONFIRM TRANSACTION
// ============================================================
el('btn-confirm').addEventListener('click', async () => {
  const s = State.intake;
  if (!s.finalPrice && s.finalPrice !== 0) {
    showToast('Cần tính giá trước!', 'error');
    return;
  }

  const calc = recalcPrice();
  const detailData = {
    basePrice: s.basePrice,
    conditionPct: s.conditionPct,
    conditionLabel: s.conditionLabel,
    afterCondition: calc.afterCondition,
    deducts: calc.deducts,
    supports: calc.supports,
    totalSupport: calc.totalSupport,
    baseTradeIn: calc.baseTradeIn,
    prices: s.prices,
    priceSource: s.priceSource,
    cameraDots: s.cameraDots,
    defects: s.defects,
    memberTier: s.memberTier,
    newDevicePrice: s.newDevicePrice,
  };

  const btn = el('btn-confirm');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;"></div>';

  const res = await api('POST', '/api/save', {
    customer_name: s.customerName,
    customer_phone: s.customerPhone,
    device_type: s.deviceType,
    model: s.model,
    base_price: s.basePrice,
    final_price: s.finalPrice,
    condition_percent: s.conditionPct,
    detail: detailData,
    notes: el('notes-input').value.trim(),
  });

  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> CHỐT KHÁCH';

  if (!res || !res.success) {
    showToast('Lỗi lưu giao dịch!', 'error');
    return;
  }

  State.lastTransaction = res.transaction;
  showToast('Đã lưu giao dịch thành công!', 'success');

  // Show success state
  [1, 2, 3].forEach(i => el(`step-${i}`).style.display = 'none');
  el('new-intake-banner').style.display = 'block';
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active', 'done'));
});

// New intake button
el('btn-new-intake').addEventListener('click', () => {
  resetIntake();
  showStep(1);
});

// View bill after confirm
el('btn-view-bill-after').addEventListener('click', () => {
  if (State.lastTransaction) showBill(State.lastTransaction);
});

function resetIntake() {
  State.intake = {
    customerName: '', customerPhone: '',
    deviceType: document.querySelector('.device-btn.active')?.dataset.type || 'iPhone',
    model: '', basePrice: 0,
    prices: { pin: 0, man: 0, camera: 0, vo: 0, sac: 0 },
    priceSource: null, conditionPct: 1.0,
    conditionTier: 'new', conditionLabel: 'Đẹp như mới',
    defects: { man: false, pin: false, vo: false, sac: false },
    cameraDots: 0, notes: '', finalPrice: 0,
    memberTier: 'none', newDevicePrice: 0,
    supportTradein: 0, supportCategory: 0, supportAM: 0, supportPayment: 0,
  };
  sessionStorage.removeItem('draftCustomerName');
  sessionStorage.removeItem('draftCustomerPhone');
  el('customer-name').value = '';
  el('customer-phone').value = '';
  el('model-input').value = '';
  el('base-price').value = '';
  el('notes-input').value = '';
  el('clear-model').style.display = 'none';
  el('price-cards').style.display = 'none';
  el('price-error-block').style.display = 'none';
  el('manual-prices-form').style.display = 'none';
  el('autocomplete-list').style.display = 'none';

  // Reset chips
  el('condition-chips').querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  el('camera-chips').querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  el('member-chips').querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  ['man', 'pin', 'vo', 'sac'].forEach(k => { el(`cb-${k}`).checked = false; });

  // Reset support inputs
  el('support-tradein').value = '';
  el('new-device-price').value = '';
  el('support-category').value = '';
  el('support-am').value = '';
  el('support-payment').value = '';

  el('pb-final').textContent = '0đ';
  el('pb-base').textContent = '0đ';
  el('pb-condition-pct').textContent = 'Đẹp như mới';
  el('pb-condition-val').textContent = '0đ';
  el('pb-deducts').innerHTML = '';
  el('pb-supports').style.display = 'none';
  el('pb-newdevice-row').style.display = 'none';
}

// Step 3 back
el('btn-back-step2').addEventListener('click', () => showStep(2));

// ============================================================
// BILL MODAL
// ============================================================
function showBill(t) {
  const detail = typeof t.detail === 'string' ? JSON.parse(t.detail) : t.detail;

  el('bill-id').textContent = `#${String(t.id).padStart(4, '0')}`;
  el('bill-date').textContent = fmtDate(t.created_at);
  el('bill-staff').textContent = t.staff_name;
  el('bill-customer-name').textContent = t.customer_name;
  el('bill-customer-phone').textContent = t.customer_phone;
  el('bill-device-type').innerHTML = `${DEVICE_ICONS[t.device_type] || ''} ${t.device_type}`;
  el('bill-model').textContent = t.model;
  el('bill-condition').textContent = `${Math.round((detail.conditionPct || 1) * 100)}%`;
  el('bill-final-price').textContent = fmt(t.final_price);

  // Deduct rows
  let deductHtml = `<div class="bill-deduct-row bill-base-row">
    <span>Giá cơ sở</span>
    <span>${fmt(detail.basePrice || 0)}</span>
  </div>`;

  if (detail.conditionPct < 1) {
    const tierLabel = detail.conditionLabel || `${Math.round(detail.conditionPct * 100)}%`;
    deductHtml += `<div class="bill-deduct-row bill-base-row">
      <span>Tình trạng (${tierLabel})</span>
      <span>${fmt(detail.afterCondition || 0)}</span>
    </div>`;
  }

  if (detail.deducts && detail.deducts.length) {
    detail.deducts.forEach(d => {
      deductHtml += `<div class="bill-deduct-row">
        <span>${d.label}</span>
        <span>-${fmt(d.val)}</span>
      </div>`;
    });
  }

  // Supports
  if (detail.supports && detail.supports.length) {
    deductHtml += `<div class="bill-deduct-row bill-base-row" style="border-top:2px solid var(--border);margin-top:8px;padding-top:8px;">
      <span style="color:var(--success);font-weight:700;"><i class="bi bi-tags-fill"></i> Trợ giá</span><span></span>
    </div>`;
    detail.supports.forEach(s => {
      deductHtml += `<div class="bill-deduct-row" style="color:var(--success);">
        <span>${s.label}</span>
        <span>+${fmt(s.val)}</span>
      </div>`;
    });
  }

  el('bill-deduct-list').innerHTML = deductHtml;

  // Notes
  if (t.notes) {
    el('bill-notes-wrap').style.display = 'block';
    el('bill-notes-text').textContent = t.notes;
  } else {
    el('bill-notes-wrap').style.display = 'none';
  }

  el('bill-modal').style.display = 'flex';
}

el('btn-bill-close').addEventListener('click', () => el('bill-modal').style.display = 'none');
el('bill-modal').addEventListener('click', (e) => {
  if (e.target === el('bill-modal')) el('bill-modal').style.display = 'none';
});

el('btn-bill-print').addEventListener('click', () => window.print());

el('btn-bill-pdf').addEventListener('click', () => {
  // Simple approach: open print dialog with PDF option
  const originalTitle = document.title;
  document.title = `Bill_${el('bill-id').textContent}_${el('bill-model').textContent}`;
  window.print();
  document.title = originalTitle;
});

el('btn-bill-edit').addEventListener('click', () => {
  el('bill-modal').style.display = 'none';
  el('new-intake-banner').style.display = 'none';
  showStep(3);
  showToast('Điều chỉnh rồi bấm CHỐT KHÁCH lại', 'info');
});

// ============================================================
// MODULE 4: HISTORY
// ============================================================
async function loadHistory(page = 1) {
  el('history-list').innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Đang tải...</span></div>';
  State.historyPage = page;

  const f = State.historyFilters;
  const params = new URLSearchParams({
    page,
    limit: 15,
    ...(f.phone ? { phone: f.phone } : {}),
    ...(f.model ? { model: f.model } : {}),
    ...(f.date ? { date: f.date } : {}),
  });

  const data = await api('GET', `/api/history?${params}`);
  if (!data) return;

  if (!data.transactions.length) {
    el('history-list').innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="bi bi-inbox"></i></div><p>Chưa có giao dịch nào</p></div>';
    el('history-pagination').style.display = 'none';
    return;
  }

  el('history-list').innerHTML = data.transactions.map(t => `
    <div class="history-item" data-id="${t.id}">
      <div class="history-device-icon">${DEVICE_ICONS[t.device_type] || '<i class="bi bi-phone"></i>'}</div>
      <div class="history-info">
        <div class="history-model">${t.model}</div>
        <div class="history-customer"><i class="bi bi-person-fill"></i> ${t.customer_name} · <i class="bi bi-telephone-fill"></i> ${t.customer_phone}</div>
        <div class="history-meta">
          <span><i class="bi bi-person-badge-fill"></i> ${t.staff_name}</span>
        </div>
      </div>
      <div class="history-price">
        <div class="history-price-val">${fmt(t.final_price)}</div>
        <div class="history-price-time">${fmtDate(t.created_at)}</div>
      </div>
    </div>
  `).join('');

  el('history-list').querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', async () => {
      const t = data.transactions.find(x => x.id == item.dataset.id);
      if (t) showBill(t);
    });
  });

  // Pagination
  if (data.pages > 1) {
    el('history-pagination').style.display = 'flex';
    el('page-info').textContent = `Trang ${data.page} / ${data.pages}`;
    el('btn-prev-page').disabled = data.page <= 1;
    el('btn-next-page').disabled = data.page >= data.pages;
  } else {
    el('history-pagination').style.display = 'none';
  }
}

el('btn-history-search').addEventListener('click', () => {
  State.historyFilters = {
    phone: el('filter-phone').value.trim(),
    model: el('filter-model').value.trim(),
    date: el('filter-date').value,
  };
  loadHistory(1);
});

el('btn-history-clear').addEventListener('click', () => {
  el('filter-phone').value = '';
  el('filter-model').value = '';
  el('filter-date').value = '';
  State.historyFilters = {};
  loadHistory(1);
});

el('btn-prev-page').addEventListener('click', () => loadHistory(State.historyPage - 1));
el('btn-next-page').addEventListener('click', () => loadHistory(State.historyPage + 1));

// ============================================================
// MODULE 5: DASHBOARD
// ============================================================
el('dash-date').value = today();

el('dash-date').addEventListener('change', loadDashboard);

async function loadDashboard() {
  const date = el('dash-date').value || today();
  el('stat-count').textContent = '...';
  el('stat-total').textContent = '...';
  el('stat-avg').textContent = '...';

  const data = await api('GET', `/api/stats?date=${date}`);
  if (!data) return;

  el('stat-count').textContent = data.today.total_count;
  el('stat-total').textContent = fmtShort(data.today.total_amount);
  el('stat-avg').textContent = fmtShort(data.today.avg_price);

  // Top staff (admin)
  if (State.user?.role === 'admin' && data.top_staff.length) {
    el('top-staff-list').innerHTML = data.top_staff.map((s, i) => {
      const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other';
      const rankIcon = i === 0 ? '<i class="bi bi-trophy-fill" style="color:#FFD700"></i>' : i === 1 ? '<i class="bi bi-trophy-fill" style="color:#C0C0C0"></i>' : i === 2 ? '<i class="bi bi-trophy-fill" style="color:#CD7F32"></i>' : `<span style="font-size:0.8rem;opacity:0.5">#${i + 1}</span>`;
      return `<div class="top-staff-item">
        <div class="staff-rank ${rankClass}">${rankIcon}</div>
        <div class="staff-item-info">
          <div class="staff-item-name">${s.staff_name}</div>
          <div class="staff-item-sub">${s.count} máy</div>
        </div>
        <div class="staff-item-total">${fmtShort(s.total)}</div>
      </div>`;
    }).join('');
  } else if (State.user?.role === 'admin') {
    el('top-staff-list').innerHTML = '<div class="empty-state"><p>Chưa có dữ liệu hôm nay</p></div>';
  }

  // Device breakdown
  if (data.device_breakdown.length) {
    const maxCount = Math.max(...data.device_breakdown.map(d => d.count));
    el('device-breakdown').innerHTML = data.device_breakdown.map(d => `
      <div class="device-breakdown-item">
        <span class="db-icon">${DEVICE_ICONS[d.device_type] || '<i class="bi bi-phone"></i>'}</span>
        <span class="db-type">${d.device_type}</span>
        <div class="db-bar-wrap"><div class="db-bar" style="width:${Math.round(d.count / maxCount * 100)}%"></div></div>
        <span class="db-count">${d.count}</span>
      </div>
    `).join('');
  } else {
    el('device-breakdown').innerHTML = '<div class="empty-state"><p>Chưa có dữ liệu</p></div>';
  }

  // Recent transactions
  if (data.recent.length) {
    el('dash-recent').innerHTML = data.recent.map(t => `
      <div class="history-item">
        <div class="history-device-icon">${DEVICE_ICONS[t.device_type] || '<i class="bi bi-phone"></i>'}</div>
        <div class="history-info">
          <div class="history-model">${t.model}</div>
          <div class="history-customer"><i class="bi bi-person-fill"></i> ${t.customer_name}</div>
        </div>
        <div class="history-price">
          <div class="history-price-val">${fmt(t.final_price)}</div>
          <div class="history-price-time">${fmtDate(t.created_at)}</div>
        </div>
      </div>
    `).join('');
  } else {
    el('dash-recent').innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="bi bi-bar-chart-fill"></i></div><p>Chưa có giao dịch hôm nay</p></div>';
  }
}

// ============================================================
// MODULE 6: STAFF MANAGEMENT (Admin)
// ============================================================
let editingStaffId = null;

async function loadStaff() {
  el('staff-list').innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
  const data = await api('GET', '/api/staff');
  if (!data) return;

  el('staff-list').innerHTML = data.map(s => {
    const initials = s.display_name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
    return `<div class="staff-item">
      <div class="staff-avatar">${initials}</div>
      <div class="staff-item-info">
        <div class="staff-item-name">${s.display_name}</div>
        <div class="staff-item-username">@${s.username}</div>
      </div>
      <div class="staff-item-actions">
        <span class="staff-role-badge ${s.role === 'admin' ? 'staff-role-admin' : 'staff-role-staff'}">
          ${s.role === 'admin' ? 'ADMIN' : 'NV'}
        </span>
        <button class="btn-staff-action btn-edit" onclick="editStaff(${s.id})"><i class="bi bi-pencil"></i></button>
        <button class="btn-staff-action btn-delete" onclick="deleteStaff(${s.id})"><i class="bi bi-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

window.editStaff = async function(id) {
  editingStaffId = id;
  const data = await api('GET', '/api/staff');
  const s = data.find(u => u.id == id);
  if (!s) return;

  el('add-staff-modal').style.display = 'flex';
  el('modal-staff-title').innerHTML = '<i class="bi bi-pencil-fill"></i> Sửa Nhân Viên';
  el('btn-save-staff-text').textContent = 'Lưu Thay Đổi';
  
  el('new-staff-name').value = s.display_name;
  el('new-staff-username').value = s.username;
  el('new-staff-password').value = '';
  el('new-staff-role').value = s.role;
};

window.deleteStaff = function(id) {
  if (id === State.user.id) {
    showToast('Không thể tự xóa chính mình', 'error');
    return;
  }
  
  showConfirm('Xóa nhân viên?', 'Bạn có chắc chắn muốn xóa nhân viên này? Hành động này không thể hoàn tác.', async () => {
    const res = await api('DELETE', `/api/staff/${id}`);
    if (res && res.success) {
      showToast('Đã xóa nhân viên thành công', 'success');
      loadStaff();
    } else {
      showToast(res?.error || 'Lỗi khi xóa nhân viên', 'error');
    }
  });
};

el('btn-add-staff').addEventListener('click', () => {
  editingStaffId = null;
  el('add-staff-modal').style.display = 'flex';
  el('modal-staff-title').innerHTML = '<i class="bi bi-person-plus-fill"></i> Thêm Nhân Viên';
  el('btn-save-staff-text').textContent = 'Thêm Nhân Viên';
  el('add-staff-form').reset();
  el('add-staff-error').style.display = 'none';
});

el('btn-add-staff-close').addEventListener('click', () => {
  el('add-staff-modal').style.display = 'none';
});

el('add-staff-modal').addEventListener('click', (e) => {
  if (e.target === el('add-staff-modal')) el('add-staff-modal').style.display = 'none';
});

el('add-staff-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = el('add-staff-error');
  errEl.style.display = 'none';

  const payload = {
    display_name: el('new-staff-name').value.trim(),
    username: el('new-staff-username').value.trim(),
    role: el('new-staff-role').value,
  };
  
  const password = el('new-staff-password').value;
  if (password) payload.password = password;

  const method = editingStaffId ? 'PUT' : 'POST';
  const url = editingStaffId ? `/api/staff/${editingStaffId}` : '/api/staff';

  const res = await api(method, url, payload);

  if (!res || !res.success) {
    errEl.textContent = (res && res.error) || 'Lỗi xử lý nhân viên';
    errEl.style.display = 'block';
  } else {
    el('add-staff-modal').style.display = 'none';
    el('add-staff-form').reset();
    showToast(editingStaffId ? 'Đã cập nhật nhân viên thành công' : 'Đã thêm nhân viên thành công', 'success');
    loadStaff();
  }
});

// ============================================================
// INIT
// ============================================================
function init() {
  // Restore draft customer info
  const draftName = sessionStorage.getItem('draftCustomerName');
  const draftPhone = sessionStorage.getItem('draftCustomerPhone');
  if (draftName) el('customer-name').value = draftName;
  if (draftPhone) el('customer-phone').value = draftPhone;

  // Save drafts on input
  el('customer-name').addEventListener('input', (e) => sessionStorage.setItem('draftCustomerName', e.target.value));
  el('customer-phone').addEventListener('input', (e) => sessionStorage.setItem('draftCustomerPhone', e.target.value));

  // Theme init
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  el('btn-theme-toggle')?.addEventListener('click', () => {
    let currentTheme = document.documentElement.getAttribute('data-theme');
    if (!currentTheme) {
      // If none set, check system preference
      const isSystemLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      currentTheme = isSystemLight ? 'light' : 'dark';
    }
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });

  if (State.token && State.user) {
    showAppScreen();
    loadDashboard();
  } else {
    showLoginScreen();
  }

  // Init quick models for default device
  renderQuickModels('iPhone');

  // Set today's date
  el('dash-date').value = today();
}

init();
