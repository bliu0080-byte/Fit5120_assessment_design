// server.js
// src/index.js 或 app.js 顶部
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import healthRouter from './src/routes/health.js';
import newsRouter from './src/models/News.js';
import adminRoutes from './src/routes/adminRoutes.js';
import storiesRouter from './src/routes/stories.js';
import admin from './src/routes/admin.js';
import assistantRouter from './src/routes/assistant.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api', healthRouter);   // GET /api/health/db
app.use('/api', newsRouter);     // GET /api/news   → { items: [...] }
app.use('/api', adminRoutes);    // /api/admin/news (GET/POST/DELETE)
app.use('/api', storiesRouter);
app.use('/api/admin', admin);
app.use('/api', assistantRouter);

/* --- Trust proxy (Render 需要，才能拿到正确的 https) --- */
app.set('trust proxy', 1);

/* --- CORS --- */
const allowedOrigins = [
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'https://bliu0080-byte.github.io',
    'https://bliu0080-byte.github.io/Fit5120_assessment_design',
    'https://scamsafe.onrender.com'
];
app.use(
    cors({
        origin(origin, cb) {
            if (!origin) return cb(null, true); // 允许无 Origin 的请求（如 curl/健康检查）
            return cb(null, allowedOrigins.includes(origin));
        }
    })
);
app.options('*', cors());

/* --- Body Parsing --- */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

/* --- Path Helpers --- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* --- 生成“当前请求对应的绝对 URL” (支持 Render 的 forwarded 头) --- */
function absUrl(req, urlPath) {
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
        .split(',')[0]
        .trim();
    const host = String(req.headers['x-forwarded-host'] || req.get('host')).trim();
    return `${proto}://${host}${urlPath}`;
}

/* --- 统一修正图片 URL --- */
function fixImageURL(img, req) {
    if (!img) return img;
    let s = String(img).trim();

    // /uploads/xxx → 绝对 https
    if (s.startsWith('/uploads/')) return absUrl(req, s);

    // http://localhost:xxx 或 127.0.0.1 → 当前域名 https
    s = s.replace(
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
        `https://${req.headers['x-forwarded-host'] || req.get('host')}`
    );

    // 强制 https，避免 mixed content
    if (s.startsWith('http://')) s = s.replace(/^http:/i, 'https:');

    return s;
}

/* --- 静态托管 uploads (可直接外网访问图片) --- */
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', etag: true }));

/* --- Multer 上传 --- */
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
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

// 上传接口：返回“绝对 https URL” + 相对 path
app.post('/api/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('[UPLOAD ERROR]', err);
            return res.status(400).json({ error: err.message || 'Upload failed' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file received. Use field name "file".' });
        }
        const urlPath = `/uploads/${req.file.filename}`;
        return res.json({ url: absUrl(req, urlPath), path: urlPath });
    });
});

// 上传错误处理
app.use((err, _req, res, _next) => {
    console.error('[UPLOAD ERROR]', err);
    if (err instanceof multer.MulterError || /image files/i.test(err.message || '')) {
        return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Server error' });
});

/* ------------------------------------------------------------------
 * 关键补丁：拦截 GET /api/news 的 res.json，在发出响应前修正 image
 * 这一步不会改你的 adminRoutes，只是包了一层“响应美化器”
 * ------------------------------------------------------------------ */
app.use((req, res, next) => {
    if (req.method === 'GET' && req.path === '/api/news') {
        const _json = res.json.bind(res);
        res.json = (payload) => {
            try {
                if (payload && Array.isArray(payload.items)) {
                    payload.items = payload.items.map((it) => ({
                        ...it,
                        image: fixImageURL(it.image, req)
                    }));
                }
            } catch (e) {
                console.warn('news image normalize failed:', e?.message);
            }
            return _json(payload);
        };
    }
    next();
});




// app.get('/api/news', (req, res) => { res.json({ items: [] }); });

/* --- Health --- */
app.get('/health', (_req, res) => res.send('ok'));

/* --- 前端静态托管（可选） --- */
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(publicDir, 'index.html'));
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
