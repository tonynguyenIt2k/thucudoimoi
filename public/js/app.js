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
  token: 'dummy',
  user: { id: 1, username: 'admin', display_name: 'Quản Trị Viên', role: 'admin' },

  // Intake form data
  intake: {
    deviceType: 'iPhone',
    model: '',
    basePrice: 0,
    prices: { pin: 0, man: 0, camera: 0, vo: 0, sac: 0 },
    priceSource: null,
    conditionPct: 1.0,
    conditionTier: 'vn_newseal', // vn_newseal|vn_fullbox_90d|good|scratched|dented|bad_but_working
    conditionLabel: 'VN newseal',
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
    if (res.status === 401) { return null; }
    
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
// AUTH (Bypassed)
// ============================================================
function initApp() {
  document.body.classList.add('is-admin');

}

// ============================================================
function switchTab(tab) {
  document.querySelectorAll('.tab-pane').forEach(t => t.style.display = 'none');
  
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
  });

  const pane = el(`tab-${tab}`);
  if (pane) pane.style.display = 'block';
  
  const navBtn = el(`nav-${tab}`);
  if (navBtn) {
    navBtn.classList.add('active');
  }

  const rightSidebar = el('right-bill-sidebar');
  const mainContent = el('main-content-area');
  const isMobile = window.innerWidth < 1024;

  if (tab === 'history') {
    if (rightSidebar) {
      rightSidebar.classList.add('lg:hidden');
      rightSidebar.classList.remove('lg:flex');
    }
    if (mainContent) {
      mainContent.classList.remove('lg:mr-[380px]');
    }
    loadHistory();
  } else {
    if (rightSidebar) {
      rightSidebar.classList.remove('lg:hidden');
      rightSidebar.classList.add('lg:flex');
    }
    if (mainContent) {
      mainContent.classList.add('lg:mr-[380px]');
    }
  }
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
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
    const stepEl = el(`step-${i}`);
    if (stepEl) stepEl.style.display = 'block';
    const sp = el(`sp${i}`);
    if (sp) {
      sp.classList.toggle('active', i === n);
      sp.classList.toggle('done', i < n);
    }
  });
  const banner = el('new-intake-banner');
  if (banner) banner.style.display = 'none';
  const mainForm = el('intake-main-form');
  if (mainForm) mainForm.style.display = 'block';
  currentStep = n;
}

// Device type selection
el('device-type-grid').querySelectorAll('.device-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    el('device-type-grid').querySelectorAll('.device-btn').forEach(b => {
      b.classList.remove('active', 'bg-primary/10', 'text-primary', 'border-primary', 'shadow-[0_0_15px_rgba(77,142,255,0.15)]');
    });
    btn.classList.add('active', 'bg-primary/10', 'text-primary', 'border-primary', 'shadow-[0_0_15px_rgba(77,142,255,0.15)]');
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
    `<button class="chip py-2 px-3 rounded-xl text-xs font-semibold" data-model="${m}">${m}</button>`
  ).join('');
  el('quick-models').innerHTML = chips;

  el('quick-models').querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectModel(chip.dataset.model);
    });
  });
}

function selectModel(model) {
  el('model-input').value = model;
  State.intake.model = model;
  el('pr-model').textContent = model;
  el('clear-model').style.display = 'block';
  el('autocomplete-list').style.display = 'none';
  
  State.intake.deviceType = document.querySelector('.device-btn.active')?.dataset.type || 'iPhone';
  fetchPrice(model);
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

// Trigger select on Enter
el('model-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = e.target.value.trim();
    if (val) {
      selectModel(val);
    }
  }
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
el('btn-step1-next')?.addEventListener('click', () => {
  const model = el('model-input').value.trim();

  if (!model) { showToast('Chọn hoặc nhập model máy!', 'error'); el('model-input').focus(); return; }

  State.intake.model = model;
  State.intake.deviceType = document.querySelector('.device-btn.active')?.dataset.type || 'iPhone';

  // Update step 2 header
  const s2Icon = el('s2-device-icon');
  if (s2Icon) s2Icon.innerHTML = DEVICE_ICONS[State.intake.deviceType];
  const s2Name = el('s2-model-name');
  if (s2Name) s2Name.textContent = model;
  const s2Type = el('s2-device-type');
  if (s2Type) s2Type.textContent = State.intake.deviceType;

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

// Format base price input with dots & live recalc
el('base-price').addEventListener('input', (e) => {
  let val = e.target.value.replace(/\D/g, '');
  if (!val) {
    e.target.value = '';
    State.intake.basePrice = 0;
    recalcPrice();
    return;
  }
  const parsed = parseInt(val, 10);
  e.target.value = parsed.toLocaleString('vi-VN');
  State.intake.basePrice = parsed;
  recalcPrice();
});

// Back btn step 1 (Safe checks)
el('btn-back-step1')?.addEventListener('click', () => showStep(1));
el('btn-back-step1b')?.addEventListener('click', () => showStep(1));

// Step 2 → Next (Safe checks)
el('btn-step2-next')?.addEventListener('click', () => {
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
  'vn_newseal': 'VN newseal', 
  'vn_fullbox_90d': 'VN fullbox kích hoạt không quá 90 ngày', 
  'good': 'Giá nhập cũ đẹp', 
  'scratched': 'Ngoại hình trầy xước',
  'dented': 'Ngoại hình xước cấn',
  'bad_but_working': 'Máy hoạt động bình thường, ngoại hình xấu nhưng màn còn hiển thị và cảm ứng được'
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
['new-device-price', 'support-category', 'support-am', 'support-payment'].forEach(id => {
  el(id).addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (!val) {
      e.target.value = '';
    } else {
      e.target.value = parseInt(val, 10).toLocaleString('vi-VN');
    }
    
    State.intake.newDevicePrice = parseInt(el('new-device-price').value.replace(/\D/g, '') || '0', 10);
    State.intake.supportCategory = parseInt(el('support-category').value.replace(/\D/g, '') || '0', 10);
    State.intake.supportAM = parseInt(el('support-am').value.replace(/\D/g, '') || '0', 10);
    State.intake.supportPayment = parseInt(el('support-payment').value.replace(/\D/g, '') || '0', 10);
    recalcPrice();
  });
});

el('support-tradein-pct').addEventListener('input', (e) => {
  let val = parseInt(e.target.value.replace(/\D/g, '') || '0', 10);
  if (val > 100) val = 100;
  e.target.value = val || '';
  State.intake.supportTradeinPct = val;
  recalcPrice();
});

el('support-tradein-max-input').addEventListener('input', (e) => {
  let val = e.target.value.replace(/\D/g, '');
  if (!val) {
    e.target.value = '';
  } else {
    e.target.value = parseInt(val, 10).toLocaleString('vi-VN');
  }
  recalcPrice();
});

document.querySelectorAll('.max-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const val = parseInt(chip.dataset.val, 10);
    el('support-tradein-max-input').value = val.toLocaleString('vi-VN');
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

  // 1. Trợ giá thu cũ (tính % trên giá thu cũ cuối cùng, giới hạn bởi mức tối đa)
  const maxTradeinSupport = parseInt(el('support-tradein-max-input').value.replace(/\D/g, '') || '0', 10);
  const pct = State.intake.supportTradeinPct || 0;
  let calculatedSupport = Math.round(baseTradeIn * (pct / 100));
  let tradeinSupport = Math.min(calculatedSupport, maxTradeinSupport);
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
// COPY BILL TO CLIPBOARD
// ============================================================
el('btn-copy-bill').addEventListener('click', async () => {
  const s = State.intake;
  if (!s.finalPrice && s.finalPrice !== 0) {
    showToast('Cần tính giá trước!', 'error');
    return;
  }

  const calc = recalcPrice();
  
  // Format requested: XC (giá máy) - thaypin(giá thay)-1 đốm cam(500) = Tổng thu
  const toNumStr = val => (val / 1000).toString();
  
  let parts = [];
  
  // 1. Condition & Base Price
  let conditionLabel = s.conditionLabel || 'N/A';
  let basePriceStr = s.basePrice ? toNumStr(s.basePrice) : '0';
  parts.push(`${conditionLabel} (${basePriceStr})`);
  
  // 2. Deducts
  if (calc.deducts && calc.deducts.length > 0) {
    calc.deducts.forEach(d => {
      let label = d.label.replace(/<[^>]*>/g, '').trim(); // Remove HTML like <i> tags
      parts.push(`- ${label}(${toNumStr(d.val)})`);
    });
  }
  
  // 3. Final
  let finalStr = s.finalPrice ? toNumStr(s.finalPrice) : '0';
  let copyStr = parts.join(' ') + ` = ${finalStr}`;
  
  try {
    await navigator.clipboard.writeText(copyStr);
    showToast('Đã sao chép: ' + copyStr, 'success');
  } catch(e) {
    showToast('Lỗi khi sao chép!', 'error');
  }
});

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

  const data = {
    device_type: s.deviceType,
    model: s.model,
    base_price: s.basePrice,
    final_price: s.finalPrice,
    condition_percent: s.conditionPct,
    detail: detailData,
    notes: el('notes-input').value.trim(),
  };

  const res = await api('POST', '/api/save', data);

  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> CHỐT KHÁCH';

  if (!res || !res.success) {
    showToast('Lỗi lưu giao dịch!', 'error');
    return;
  }

  State.lastTransaction = res.transaction;
  showToast('Đã lưu giao dịch thành công!', 'success');

  // Show success state
  const mainForm = el('intake-main-form');
  if (mainForm) mainForm.style.display = 'none';
  const banner = el('new-intake-banner');
  if (banner) banner.style.display = 'flex';
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
    deviceType: document.querySelector('.device-btn.active')?.dataset.type || 'iPhone',
    model: '', basePrice: 0,
    prices: { pin: 0, man: 0, camera: 0, vo: 0, sac: 0 },
    priceSource: null, conditionPct: 1.0,
    conditionTier: 'vn_newseal', conditionLabel: 'VN newseal',
    defects: { man: false, pin: false, vo: false, sac: false },
    cameraDots: 0, notes: '', finalPrice: 0,
    memberTier: 'none', newDevicePrice: 0,
    supportTradein: 0, supportCategory: 0, supportAM: 0, supportPayment: 0,
  };
  // reset ui
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
  const tradeinPct = el('support-tradein-pct');
  if (tradeinPct) tradeinPct.value = '';
  el('new-device-price').value = '';
  el('support-category').value = '';
  el('support-am').value = '';
  el('support-payment').value = '';

  el('pb-final').textContent = '0đ';
  el('pb-base').textContent = '0đ';
  el('pb-condition-pct').textContent = 'VN newseal';
  el('pb-condition-val').textContent = '0đ';
  el('pb-deducts').innerHTML = '';
  el('pb-supports').style.display = 'none';
  el('pb-newdevice-row').style.display = 'none';
}

// Step 3 back (Safe checks)
el('btn-back-step2')?.addEventListener('click', () => showStep(2));

// ============================================================
// BILL MODAL
// ============================================================
function showBill(t) {
  const detail = typeof t.detail === 'string' ? JSON.parse(t.detail) : t.detail;

  el('bill-id').textContent = '#' + t.id.toString().padStart(4, '0');
  el('bill-date').textContent = fmtDate(t.created_at);
  el('bill-staff').textContent = t.staff_name;
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

  const modal = el('bill-modal');
  const modalContent = el('bill-modal-content');
  modal.classList.remove('opacity-0', 'pointer-events-none');
  if (modalContent) {
    modalContent.classList.remove('scale-95');
    modalContent.classList.add('scale-100');
  }
}

function closeBillModal() {
  const modal = el('bill-modal');
  const modalContent = el('bill-modal-content');
  modal.classList.add('opacity-0', 'pointer-events-none');
  if (modalContent) {
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-95');
  }
}

el('btn-bill-close')?.addEventListener('click', closeBillModal);
el('bill-modal')?.addEventListener('click', (e) => {
  if (e.target === el('bill-modal') || e.target === el('bill-modal-backdrop')) closeBillModal();
});

el('btn-bill-print')?.addEventListener('click', () => window.print());

el('btn-bill-pdf')?.addEventListener('click', () => {
  const originalTitle = document.title;
  document.title = `Bill_${el('bill-id').textContent}_${el('bill-model').textContent}`;
  window.print();
  document.title = originalTitle;
});

el('btn-bill-edit')?.addEventListener('click', () => {
  closeBillModal();
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

  el('history-list').innerHTML = data.transactions.map(t => {
    let detail = {};
    try { detail = typeof t.detail === 'string' ? JSON.parse(t.detail) : t.detail; } catch(e){}
    const condLabel = detail?.conditionLabel || 'Bình thường';
    const pct = detail?.conditionPct || 1;
    
    let statusClass = 'bg-primary/10 border-primary/20 text-primary';
    let dotClass = 'bg-primary shadow-[0_0_8px_rgba(173,198,255,0.8)]';
    let statusText = 'Khá / Tốt';
    
    if (pct >= 0.98) {
      statusClass = 'bg-tertiary/10 border-tertiary/20 text-tertiary';
      dotClass = 'bg-tertiary shadow-[0_0_8px_rgba(78,222,163,0.8)]';
      statusText = 'Hoàn Hảo';
    } else if (pct <= 0.95) {
      statusClass = 'bg-[#ffb4ab]/10 border-[#ffb4ab]/20 text-[#ffb4ab]';
      dotClass = 'bg-[#ffb4ab] shadow-[0_0_8px_rgba(255,180,171,0.8)]';
      statusText = 'Hư Hỏng Nhẹ';
    }

    return `
    <div class="glass-card rounded-xl p-6 flex flex-col gap-5 hover:border-white/20 hover:shadow-[0_0_30px_rgba(173,198,255,0.05)] transition-all cursor-pointer group history-item" data-id="${t.id}">
      <div class="flex justify-between items-start">
        <div>
          <div class="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">TRX-${t.id.toString().padStart(4, '0')}</div>
          <div class="text-body-md font-body-md text-outline">${fmtDate(t.created_at)}</div>
        </div>
        <div class="px-3 py-1 rounded-full ${statusClass} border flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full ${dotClass}"></span>
          <span class="text-[10px] font-label-sm uppercase tracking-wide">${statusText}</span>
        </div>
      </div>
      <div>
        <h3 class="text-lg font-headline-md font-semibold text-on-surface mb-1">${t.model}</h3>
        <p class="text-xs font-body-md text-on-surface-variant">${t.device_type} • ${condLabel}</p>
      </div>
      <div class="mt-auto pt-4 border-t border-white/5 flex items-end justify-between">
        <div>
          <div class="text-[10px] font-label-sm text-outline mb-1 uppercase tracking-wider">Giá Trị Cuối</div>
          <div class="text-xl font-headline-md font-bold text-primary">${fmt(t.final_price)}</div>
        </div>
        <button class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
          <span class="material-symbols-outlined text-base">receipt_long</span>
        </button>
      </div>
    </div>
    `;
  }).join('');

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
// INIT
// ============================================================
function init() {
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

  initApp();

  // Init quick models for default device
  renderQuickModels('iPhone');

  // Set today's date
  const dashDate = el('dash-date');
  if (dashDate) dashDate.value = today();
}

init();
