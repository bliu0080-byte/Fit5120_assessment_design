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

/* ---------------- CORS ---------------- */
const allowedOrigins = [
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'https://bliu0080-byte.github.io',
    'https://bliu0080-byte.github.io/Fit5120_assessment_design',
    'https://scamsafe.onrender.com'
];
app.use(cors({
    origin: allowedOrigins,
    credentials: false
}));
app.options('*', cors());

/* ---------------- Body Parsing ---------------- */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

/* ---------------- Uploads ---------------- */
const UPLOAD_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const ok = /image\/(png|jpe?g|gif|webp|svg\+xml)/i.test(file.mimetype);
        ok ? cb(null, true) : cb(new Error('Only image files allowed'));
    },
});

// 上传接口
app.post('/api/upload', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('[UPLOAD ERROR]', err);
            return res.status(400).json({ error: err.message || 'Upload failed' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file received. Use field name "file".' });
        }
        const urlPath = `/uploads/${req.file.filename}`;
        const absolute = `${req.protocol}://${req.get('host')}${urlPath}`;
        return res.json({ url: absolute, path: urlPath });
    });
});

// 上传错误处理
app.use((err, _req, res, _next) => {
    console.error('[UPLOAD ERROR]', err);
    if (err instanceof multer.MulterError || /image files/i.test(err.message)) {
        return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Server error' });
});

/* ---------------- API ---------------- */
app.use('/api', adminRoutes);

// 示例 API
app.get('/api/news', (req, res) => {
    res.json({ items: [] });
});

// 健康检查
app.get('/health', (req, res) => res.send('ok'));

/* ---------------- 前端静态文件托管 ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

// 托管 public 目录里的前端
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    // SPA 兜底：非 API 路径返回 index.html
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(publicDir, 'index.html'));
    });
}

/* ---------------- 启动服务 ---------------- */
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend running at http://localhost:${PORT}`);
});