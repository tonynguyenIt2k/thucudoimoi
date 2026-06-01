/**
 * ============================================================
 * PHONE TRADE-IN MANAGEMENT SYSTEM - SERVER
 * Node.js + Express + SQLite + Scraping
 * ============================================================
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'phone_trade_secret_2024';

// ============================================================
// DATABASE SETUP
// ============================================================
const db = new Database(path.join(__dirname, 'database.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT DEFAULT 'staff', -- 'admin' | 'staff'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    staff_id INTEGER NOT NULL,
    staff_name TEXT NOT NULL,
    device_type TEXT NOT NULL,
    model TEXT NOT NULL,
    base_price INTEGER DEFAULT 0,
    final_price INTEGER NOT NULL,
    condition_percent REAL DEFAULT 1.0,
    detail JSON NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS price_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT UNIQUE NOT NULL,
    model_name TEXT NOT NULL,
    device_type TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default users if not exist
function seedUsers() {
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    const nv1Hash = bcrypt.hashSync('123456', 10);
    const nv2Hash = bcrypt.hashSync('123456', 10);

    db.prepare('INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)').run('admin', adminHash, 'Quản Trị Viên', 'admin');
    db.prepare('INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)').run('nv1', nv1Hash, 'Nhân Viên 1', 'staff');
    db.prepare('INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)').run('nv2', nv2Hash, 'Nhân Viên 2', 'staff');

    console.log('✅ Default users seeded: admin/admin123, nv1/123456, nv2/123456');
  }
}
seedUsers();

// ============================================================
// PRICE CACHE - In-memory, 10 minutes TTL
// ============================================================
const priceCache = new Map(); // keyword -> { data, timestamp }
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached(keyword) {
  const entry = priceCache.get(keyword.toLowerCase());
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    priceCache.delete(keyword.toLowerCase());
    return null;
  }
  return entry.data;
}

function setCache(keyword, data) {
  priceCache.set(keyword.toLowerCase(), { data, timestamp: Date.now() });
}

// ============================================================
// SCRAPING - Điện Thoại Vui (Direct Service Page Approach)
// ============================================================

/**
 * Convert model keyword to URL slug
 * "iPhone 15 Pro Max" → "iphone-15-pro-max"
 * "Samsung Galaxy S24 Ultra" → "samsung-galaxy-s24-ultra"
 */
function toSlug(keyword) {
  return keyword
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove Vietnamese diacritics
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Extract all prices from HTML text matching pattern like "1.690.000₫"
 * Only matches ₫ (Unicode dong sign U+20AB) — NOT đ (d-stroke)
 * because đ appears in editorial text with unrelated prices (phone retail, etc.)
 * Returns array of numbers sorted ascending
 * Filters out promo discount amounts (under 500k)
 */
function extractAllPrices(html) {
  if (!html) return [];
  // Only match ₫ (U+20AB) — the official dong sign used on DTV product cards
  // Use negative lookbehind to avoid matching numbers combined with specs (e.g. Size 6.85.800.000₫ -> skips 85.800.000)
  const priceRegex = /(?<![\d.])(\d{1,3}(?:\.\d{3})+)₫/g;
  const prices = [];
  let match;
  while ((match = priceRegex.exec(html)) !== null) {
    const num = parseInt(match[1].replace(/\./g, ''), 10);
    // Service prices (thay pin, màn hình, camera, vỏ) are always 500k+
    // Skip promo amounts like "Smember giảm 85.000₫"
    if (num >= 500000 && num <= 100000000) {
      prices.push(num);
    }
  }
  return prices.sort((a, b) => a - b);
}

/**
 * Fetch a single DTV service page and extract product names + prices using cheerio
 * @param {string} url - Full URL to fetch
 * @param {string} slug - Model slug for matching product links
 * @returns {{ min: number, max: number, minName: string, maxName: string }}
 */
async function fetchServicePrice(url, slug) {
  try {
    const resp = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9',
      },
      validateStatus: (status) => status < 500,
    });

    if (resp.status === 404 || resp.status === 301 || resp.status === 302) {
      return { min: 0, max: 0, minName: '', maxName: '' };
    }

    const html = resp.data;
    const $ = cheerio.load(html);
    const products = [];

    // Extract product names + prices from anchor links
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href') || '';
      const htmlInside = $(el).html() || '';
      // Match against htmlInside to preserve tag separation (e.g. 6.8</span><span class="price">5.800.000₫)
      const priceMatches = htmlInside.match(/(?<![\d.])(\d{1,3}(?:\.\d{3})+)₫/g);

      // Match links that point to specific product pages (contain the service slug)
      if (priceMatches && (href.includes(`/${slug}`) || href.includes('/thay-'))) {
        const firstPrice = priceMatches[0];
        const price = parseInt(firstPrice.replace(/[.₫]/g, ''), 10);
        if (price >= 500000 && price <= 100000000) {
          const text = $(el).text().trim();
          // Extract clean name: text before the first price, cleaned up
          let name = text.split(firstPrice)[0]
            .replace(/Giảm \d+%\s*/g, '')
            .replace(/\d+\s*-?\s*\d*\s*[Pp]hút/g, '')
            .replace(/\d+\s*tháng/g, '')
            .replace(/\d+\s*giờ/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          // Shorten: remove "Thay xxx iPhone 15 Pro Max" prefix, keep brand info
          const brandMatch = name.match(/chính hãng\s+(.+)/i);
          if (brandMatch) {
            name = brandMatch[1].trim();
          }
          products.push({ name, price });
        }
      }
    });

    // If no products found from links, fallback to regex on full HTML
    if (products.length === 0) {
      const fallbackPrices = extractAllPrices(html);
      if (fallbackPrices.length > 0) {
        products.push({ name: '', price: fallbackPrices[0] });
        if (fallbackPrices.length > 1) {
          products.push({ name: '', price: fallbackPrices[fallbackPrices.length - 1] });
        }
      }
    }

    if (products.length === 0) {
      return { min: 0, max: 0, minName: '', maxName: '' };
    }

    // Sort by price
    products.sort((a, b) => a.price - b.price);
    const minP = products[0];
    const maxP = products[products.length - 1];

    return {
      min: minP.price,
      max: maxP.price,
      minName: minP.name,
      maxName: maxP.name,
    };
  } catch (err) {
    console.log(`  [Skip] ${url}: ${err.message}`);
    return { min: 0, max: 0, minName: '', maxName: '' };
  }
}

/**
 * Scrape giá từ Điện Thoại Vui by fetching individual service pages in parallel
 * pin = cheapest option, man = most expensive (best quality), others = cheapest
 * @param {string} keyword - model name (e.g., "iPhone 15 Pro Max")
 * @returns {object} { pin, man, camera, vo, sac, source, model_found }
 */
async function scrapeDTVPrice(keyword) {
  const slug = toSlug(keyword);
  const BASE = 'https://dienthoaivui.com.vn';

  const serviceUrls = {
    pin: [`${BASE}/thay-pin-${slug}`],
    man: [`${BASE}/thay-man-hinh-${slug}`],
    camera: [
      `${BASE}/thay-camera-sau-${slug}`,
      `${BASE}/thay-camera-${slug}`,
    ],
    vo: [
      `${BASE}/thay-vo-${slug}`,
      `${BASE}/thay-vo-may-${slug}`,
    ],
    sac: [
      `${BASE}/thay-chan-sac-${slug}`,
      `${BASE}/thay-sac-${slug}`,
    ],
  };

  // Which services should use max price (best quality)
  const useMax = { man: true }; // Screen = best/most expensive

  console.log(`[DTV] Fetching prices for "${keyword}" (slug: ${slug})`);

  try {
    const result = { pin: 0, man: 0, camera: 0, vo: 0, sac: 0 };
    const names = { pin: '', man: '', camera: '', vo: '', sac: '' };
    const fetchTasks = [];

    for (const [service, urls] of Object.entries(serviceUrls)) {
      for (const url of urls) {
        fetchTasks.push(
          fetchServicePrice(url, slug).then(({ min, max, minName, maxName }) => {
            const price = useMax[service] ? max : min;
            const name = useMax[service] ? maxName : minName;
            if (price > 0 && (result[service] === 0 || (useMax[service] ? price > result[service] : price < result[service]))) {
              result[service] = price;
              names[service] = name || '';
              console.log(`  ✅ ${service}: ${price.toLocaleString()}đ [${useMax[service] ? 'MAX' : 'MIN'}] "${name}" (${url})`);
            }
          })
        );
      }
    }

    await Promise.all(fetchTasks);

    const hasAnyPrice = Object.values(result).some(v => v > 0);

    return {
      ...result,
      pin_name: names.pin,
      man_name: names.man,
      camera_name: names.camera,
      vo_name: names.vo,
      sac_name: names.sac,
      source: hasAnyPrice ? 'Điện Thoại Vui' : null,
      model_found: keyword,
      url: `${BASE}/thay-pin-${slug}`,
    };
  } catch (err) {
    console.error(`[Scrape Error] ${keyword}:`, err.message);
    return null;
  }
}

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for PWA
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// GLOBAL REQUEST LOGGER
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// ============================================================
// AUTH MIDDLEWARE
// ============================================================
function authMiddleware(req, res, next) {
  // Bypass auth
  req.user = { id: 1, username: 'admin', display_name: 'Quản Trị Viên', role: 'admin' };
  next();
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

// ============================================================
// API ROUTES
// ============================================================

/**
 * POST /api/login
 * Body: { username, password }
 */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Thiếu thông tin đăng nhập' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, display_name: user.display_name, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role }
  });
});

/**
 * GET /api/get-price?keyword=iPhone+15+Pro+Max
 * Scrape price from Điện Thoại Vui with 10-min cache
 */
app.get('/api/get-price', authMiddleware, async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || keyword.trim().length < 2) {
    return res.status(400).json({ error: 'Thiếu keyword' });
  }

  const kw = keyword.trim();

  // Check cache first
  const cached = getCached(kw);
  if (cached) {
    console.log(`[Cache HIT] ${kw}`);
    return res.json({ ...cached, cached: true });
  }

  console.log(`[Scraping] ${kw}...`);
  const data = await scrapeDTVPrice(kw);

  if (!data) {
    return res.json({
      pin: 0, man: 0, camera: 0, vo: 0, sac: 0,
      source: null, model_found: kw, error: 'Không lấy được giá tự động'
    });
  }

  setCache(kw, data);
  console.log(`[Scraped] ${kw}:`, data);
  res.json({ ...data, cached: false });
});

/**
 * POST /api/save
 * Body: transaction object
 */
app.post('/api/save', authMiddleware, (req, res) => {
  const { customer_name = 'Khách vãng lai', customer_phone = '0000000000', device_type, model, base_price, final_price, condition_percent, detail, notes } = req.body;

  if (!device_type || !model || final_price === undefined) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  }

  const stmt = db.prepare(`
    INSERT INTO transactions (customer_name, customer_phone, staff_id, staff_name, device_type, model, base_price, final_price, condition_percent, detail, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    customer_name.trim(),
    customer_phone.trim(),
    req.user.id,
    req.user.display_name,
    device_type,
    model.trim(),
    base_price || 0,
    final_price,
    condition_percent || 1.0,
    JSON.stringify(detail || {}),
    notes || null
  );

  const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, transaction });
});

/**
 * GET /api/history?phone=&model=&date=&page=1&limit=20
 */
app.get('/api/history', authMiddleware, (req, res) => {
  const { phone, model, date, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = [];
  let params = [];

  // Staff can only see their own transactions
  if (req.user.role !== 'admin') {
    where.push('staff_id = ?');
    params.push(req.user.id);
  }

  if (phone) {
    where.push('customer_phone LIKE ?');
    params.push(`%${phone}%`);
  }
  if (model) {
    where.push('model LIKE ?');
    params.push(`%${model}%`);
  }
  if (date) {
    where.push("DATE(created_at) = ?");
    params.push(date);
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  
  const transactions = db.prepare(`
    SELECT * FROM transactions ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM transactions ${whereClause}`).get(...params);

  res.json({
    transactions: transactions.map(t => ({ ...t, detail: JSON.parse(t.detail) })),
    total: total.count,
    page: parseInt(page),
    pages: Math.ceil(total.count / parseInt(limit))
  });
});

/**
 * GET /api/transaction/:id
 */
app.get('/api/transaction/:id', authMiddleware, (req, res) => {
  const t = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Không tìm thấy giao dịch' });

  // Staff can only see their own
  if (req.user.role !== 'admin' && t.staff_id !== req.user.id) {
    return res.status(403).json({ error: 'Không có quyền xem' });
  }

  res.json({ ...t, detail: JSON.parse(t.detail) });
});


/**
 * DELETE /api/transaction/:id (admin only)
 */
app.delete('/api/transaction/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Catch-all for unknown /api routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API Route không tồn tại: ${req.method} ${req.url}` });
});

// Serve SPA for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`\n🚀 [v5.5] Phone Trade-in Management System`);
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🗄️  Database: ${path.join(__dirname, 'database.db')}`);
  console.log(`\n🔐 Default accounts:`);
  console.log(`   Admin: admin / admin123`);
  console.log(`   Staff: nv1 / 123456`);
  console.log(`   Staff: nv2 / 123456\n`);
});
