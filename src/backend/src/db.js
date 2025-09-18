import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }  // Render 需要 SSL
});

// 定义并导出 dbPing
export async function dbPing() {
    const r = await pool.query('SELECT NOW() as now');
    return r.rows[0].now;
}