// server.js — ScamSafe backend (Express)
// Notes: English-only comments, production-safe for Render.com

import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import multer from 'multer';

// -------------------------------
// 0) Basic paths & helpers
// -------------------------------
const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const NEWS_JSON = path.join(DATA_DIR, 'news.json');

// Ensure folders exist
for (const dir of [PUBLIC_DIR, UPLOAD_DIR, DATA_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Small JSON helpers (file-based storage; replace with DB if you have one)
function readJSON(file, fallback = null) {
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
if (!readJSON(NEWS_JSON)) writeJSON(NEWS_JSON, { items: [] });

// Build an absolute URL based on forwarded headers (important on Render)
function absUrl(req, urlPath) {
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
        .split(',')[0]
        .trim();
    const host = String(req.headers['x-forwarded-host'] || req.get('host')).trim();
    return `${proto}://${host}${urlPath}`;
}

// Fix an image URL from legacy/local values to a production-safe https URL
function fixImageForClient(img, req) {
    if (!img) return img;
    let s = String(img).trim();

    // /uploads/xxx → absolute https
    if (s.startsWith('/uploads/')) return absUrl(req, s);

    // http://localhost:3001/... or http://127.0.0.1:3001/... → current host
    s = s.replace(
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
        `https://${req.headers['x-forwarded-host'] || req.get('host')}`
    );

    // Force https to avoid Mixed Content
    if (s.startsWith('http://')) s = s.replace(/^http:/i, 'https:');

    return s;
}

// -------------------------------
// 1) Express app
// -------------------------------
const app = express();

// In Render (or behind a proxy), trust proxies so req.protocol becomes "https"
app.set('trust proxy', 1);

// CORS: add your front-end origins here
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // GitHub Pages (user/project)
    'https://bliu0080-byte.github.io',
    // Render same-origin front-end
    // (when front-end and back-end are on the same render service, fetch('/api') is same-origin)
    // You usually don't need to list onrender.com here for same-origin requests,
    // but it doesn't hurt to allow it explicitly if you call from another domain:
    'https://scamsafe.onrender.com'
];

app.use(
    cors({
        origin(origin, cb) {
            // Allow requests with no origin (like curl or same-origin)
            if (!origin) return cb(null, true);
            return cb(null, ALLOWED_ORIGINS.includes(origin));
        },
        credentials: false
    })
);
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (optional; if you have a front-end build placed in /public)
app.use(express.static(PUBLIC_DIR));

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', etag: true }));

// -------------------------------
// 2) Multer upload (enforce file extensions)
// -------------------------------
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        // Ensure there is a file extension; default to .jpg if unknown
        const ext = (path.extname(file.originalname || '') || '.jpg').toLowerCase();
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        cb(null, name);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Upload endpoint — returns both absolute https URL and the relative path
app.post('/api/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
        if (!req.file) return res.status(400).json({ error: 'No file received (field name must be "file")' });

        const urlPath = `/uploads/${req.file.filename}`;
        const absolute = absUrl(req, urlPath);
        return res.json({ url: absolute, path: urlPath });
    });
});

// -------------------------------
// 3) News APIs (file-based example)
//    Replace with your DB model if needed
// -------------------------------

// GET /api/news — list news; image URL is normalized for clients
app.get('/api/news', (req, res) => {
    const data = readJSON(NEWS_JSON, { items: [] });
    const items = Array.isArray(data.items) ? data.items : [];

    const fixed = items.map((n) => ({
        ...n,
        image: fixImageForClient(n.image, req)
    }));

    res.json({ items: fixed });
});

// POST /api/news — create a news item (simple example)
app.post('/api/news', (req, res) => {
    const { title, description, image, timestamp, category, type, url } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    const data = readJSON(NEWS_JSON, { items: [] });
    const items = Array.isArray(data.items) ? data.items : [];

    const item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        description: description || '',
        image: image || '', // can be absolute https or /uploads/xxx.jpg
        timestamp: timestamp || Date.now(),
        category: category || type || 'general',
        url: url || ''
    };

    items.unshift(item);
    writeJSON(NEWS_JSON, { items });
    res.status(201).json({ item });
});

// GET /api/news/:id — single item
app.get('/api/news/:id', (req, res) => {
    const { id } = req.params;
    const data = readJSON(NEWS_JSON, { items: [] });
    const items = Array.isArray(data.items) ? data.items : [];
    const found = items.find((n) => n.id === id);
    if (!found) return res.status(404).json({ error: 'Not found' });
    res.json({ item: found });
});

// (Optional) Health check
app.get('/health', (_req, res) => res.send('ok'));

// -------------------------------
// 4) Start server
// -------------------------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ ScamSafe API listening on http://localhost:${PORT}`);
});