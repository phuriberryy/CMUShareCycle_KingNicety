import { Pool } from 'pg'
import env from '../config/env.js'

const isLocalDb = /localhost|127\.0\.0\.1/.test(env.databaseUrl)
const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: isLocalDb ? undefined : { rejectUnauthorized: false },
    // ลดการหลุดของ connection กับ Supabase (pooler ปิด idle บ่อย)
    keepAlive: true,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
    max: 5,
})

pool.on('error', (err) => {
    console.error('DB pool error:', err.message)
})

// 💡 เพิ่มฟังก์ชันตรวจสอบสถานะการเชื่อมต่อ
export async function verifyDatabaseConnection() {
    try {
        await pool.query('SELECT NOW()')
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err }
    }
}

export const query = (text, params) => pool.query(text, params)
export default pool








