// server.js  —
import dotenv from 'dotenv';
dotenv.config(); // Load env first

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';

import adminRoutes from './src/routes/adminRoutes.js';

const app = express();

// 1) Open CORS first.
app.use(cors({
    origin: ['http://127.0.0.1:3000', 'http://localhost:3000'],
}));
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2) Static directory uploads
const UPLOAD_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
app.use('/uploads', express.static(UPLOAD_DIR));

// 3) multer deployment
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const ok = /image\/(png|jpe?g|gif|webp|svg\+xml)/i.test(file.mimetype);
        ok ? cb(null, true) : cb(new Error('Only image files allowed'));
    },
});

// 4) Upload interface (returns an absolute URL)
app.post('/api/upload', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            // multer 的错误（大小/类型等）
            console.error('[UPLOAD ERROR]', err);
            return res.status(400).json({ error: err.message || 'Upload failed' });
        }
        if (!req.file) {
            console.error('[UPLOAD ERROR] no file received', req.headers['content-type']);
            return res.status(400).json({ error: 'No file received. Field name must be "file" and use multipart/form-data.' });
        }

        const urlPath = `/uploads/${req.file.filename}`;
        const absolute = `${req.protocol}://${req.get('host')}${urlPath}`;
        return res.json({ url: absolute, path: urlPath });
    });
});

// 5) multer/other error handling (to avoid a straight 500 with no indication)
app.use((err, _req, res, _next) => {
    console.error('[UPLOAD ERROR]', err); // 在后端控制台打印具体原因
    if (err instanceof multer.MulterError || /image files/i.test(err.message)) {
        return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Server error' });
});

// 6) Other business routing
app.use('/api', adminRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});