// server.js
import dotenv from 'dotenv';
dotenv.config(); // Load .env first

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { fileURLToPath } from 'url';

import adminRoutes from './src/routes/adminRoutes.js';

const app = express();

/* -------------------------------------------
 * 0) Trust proxy (important on Render)
 * ----------------------------------------- */
app.set('trust proxy', 1);

/* -------------------------------------------
 * 1) CORS
 * ----------------------------------------- */
const ALLOWED_ORIGINS = [
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'https://bliu0080-byte.github.io',
    'https://bliu0080-byte.github.io/Fit5120_assessment_design',
    'https://scamsafe.onrender.com'
];

// Use a function so same-origin/no-origin (e.g., curl) also works
app.use(
    cors({
        origin(origin, cb) {
            if (!origin) return cb(null, true);
            return cb(null, ALLOWED_ORIGINS.includes(origin));
        },
        credentials: false
    })
);
app.options('*', cors());

/* -------------------------------------------
 * 2) Body parsing
 * ----------------------------------------- */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

/* -------------------------------------------
 * 3) Paths & helpers
 * ----------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR   = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const DATA_DIR   = path.join(ROOT_DIR, 'data');
const NEWS_JSON  = path.join(DATA_DIR, 'news.json');

for (const dir of [UPLOAD_DIR, DATA_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Simple JSON helpers as a fallback storage
function readJSON(file, fallback = { items: [] }) {
    try {
        if (!fs.existsSync(file)) return fallback;
        const raw = fs.readFileSync(file, 'utf8');
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}
function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
if (!fs.existsSync(NEWS_JSON)) writeJSON(NEWS_JSON, { items: [] });

// Build absolute https URL using forwarded headers
function absUrl(req, urlPath) {
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
        .split(',')[0]
        .trim();
    const host = String(req.headers['x-forwarded-host'] || req.get('host')).trim();
    return `${proto}://${host}${urlPath}`;
}

// Normalize legacy/local image URL for clients
function fixImageForClient(img, req) {
    if (!img) return img;
    let s = String(img).trim();

    // /uploads/xxx → absolute https
    if (s.startsWith('/uploads/')) return absUrl(req, s);

    // http://localhost:3001/... or http://127.0.0.1/... → current https host
    s = s.replace(
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
        `https://${req.headers['x-forwarded-host'] || req.get('host')}`
    );

    // Force https to avoid Mixed Content
    if (s.startsWith('http://')) s = s.replace(/^http:/i, 'https:');

    return s;
}

/* -------------------------------------------
 * 4) Static: uploads & (optional) public
 * ----------------------------------------- */
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', etag: true }));

if (fs.existsSync(PUBLIC_DIR)) {
    app.use(express.static(PUBLIC_DIR));
}

/* -------------------------------------------
 * 5) Multer upload (keep extension)
 * ----------------------------------------- */
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext  = (path.extname(file.originalname || '') || '.jpg').toLowerCase();
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        cb(null, name);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const ok = /image\/(png|jpe?g|gif|webp|svg\+xml)/i.test(file.mimetype);
        ok ? cb(null, true) : cb(new Error('Only image files allowed'));
    }
});

// Upload endpoint → returns absolute https url + relative path
app.post('/api/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
        if (!req.file) return res.status(400).json({ error: 'No file received. Use field name "file".' });

        const urlPath  = `/uploads/${req.file.filename}`;
        const absolute = absUrl(req, urlPath);
        res.json({ url: absolute, path: urlPath });
    });
});

// Upload error handler
app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError || /image files/i.test(err?.message || '')) {
        return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Server error' });
});

/* -------------------------------------------
 * 6) News API (this powers your front-end)
 *    Data source: data/news.json (fallback)
 *    You can replace with DB later.
 * ----------------------------------------- */
// GET /api/news — list news with fixed image URLs
app.get('/api/news', (req, res) => {
    const data  = readJSON(NEWS_JSON, { items: [] });
    const items = Array.isArray(data.items) ? data.items : [];

    const fixed = items.map((n) => ({
        ...n,
        image: fixImageForClient(n.image, req)
    }));

    res.json({ items: fixed });
});

// POST /api/news — create a news item (simple editor use)
app.post('/api/news', (req, res) => {
    const { title, description, image, timestamp, category, type, url } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const data  = readJSON(NEWS_JSON, { items: [] });
    const items = Array.isArray(data.items) ? data.items : [];

    const item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        description: description || '',
        image: image || '',
        timestamp: timestamp || Date.now(),
        category: category || type || 'general',
        url: url || ''
    };

    items.unshift(item);
    writeJSON(NEWS_JSON, { items });
    res.status(201).json({ item });
});

// Single item (optional)
app.get('/api/news/:id', (req, res) => {
    const data  = readJSON(NEWS_JSON, { items: [] });
    const items = Array.isArray(data.items) ? data.items : [];
    const found = items.find((n) => n.id === req.params.id);
    if (!found) return res.status(404).json({ error: 'Not found' });
    res.json({ item: found });
});

/* -------------------------------------------
 * 7) Other business routes (admin)
 * ----------------------------------------- */
// Keep your existing admin routes under /api
app.use('/api', adminRoutes);

/* -------------------------------------------
 * 8) Health
 * ----------------------------------------- */
app.get('/health', (_req, res) => res.send('ok'));

/* -------------------------------------------
 * 9) SPA fallback (serve index.html for non-API)
 * ----------------------------------------- */
if (fs.existsSync(PUBLIC_DIR)) {
    app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
    });
}

/* -------------------------------------------
 * 10) Start server
 * ----------------------------------------- */
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend running at http://localhost:${PORT}`);
});