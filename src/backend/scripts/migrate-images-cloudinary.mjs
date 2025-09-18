import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import { v2 as cloudinary } from 'cloudinary';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

function getFileName(u='') {
    try { return path.basename(new URL(u).pathname); }
    catch { return path.basename(u || ''); }
}

async function run() {
    const { rows } = await pool.query(`
        SELECT id, image
        FROM news
        WHERE image ~ '^https?://localhost(:\\d+)?/uploads/' OR image LIKE '/uploads/%'
        ORDER BY "timestamp" ASC
    `);

    console.log('Need migrate:', rows.length);

    for (const r of rows) {
        const name = getFileName(r.image);
        const localPath = path.join(__dirname, '..', 'uploads', name); // ← 确认你的本地存放路径
        if (!fs.existsSync(localPath)) {
            console.warn('Skip (not found):', localPath);
            continue;
        }
        try {
            const up = await cloudinary.uploader.upload(localPath, {
                folder: 'scamsafe/news',
                public_id: name.replace(/\.[^.]+$/, ''),
                overwrite: true,
                resource_type: 'image'
            });
            const url = up.secure_url; // https
            await pool.query('UPDATE news SET image = $1 WHERE id = $2', [url, r.id]);
            console.log('OK:', r.id, '→', url);
        } catch (e) {
            console.error('Upload failed:', r.id, name, e?.message || e);
        }
    }

    const { rows: left } = await pool.query(`
    SELECT COUNT(*)::int AS cnt
    FROM news
    WHERE image ~ '^https?://localhost(:\\d+)?/uploads/' OR image LIKE '/uploads/%'
  `);
    console.log('Left localhost:', left[0].cnt);
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });