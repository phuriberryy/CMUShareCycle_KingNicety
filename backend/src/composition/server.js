import http from 'http'
import { exec } from 'child_process'
import app from './app.js'
import env from '../infrastructure/config/env.js'
import { initChatServer } from '../application/services/chatService.js'
import { verifyDatabaseConnection } from '../adapters/outbound/persistence/pool.js'
import { verifyEmailConnection } from '../shared/utils/email.js'

const server = http.createServer(app)
initChatServer(server)

// 💡 ตรวจสอบการเชื่อมต่อ Database
console.log('🔍 กำลังตรวจสอบการเชื่อมต่อ Database...')
const dbCheck = await verifyDatabaseConnection()
if (!dbCheck.ok) {
    console.error('❌ Database connection failed. Shutting down server.')
    console.error('   ข้อความ:', dbCheck.error?.message || dbCheck.error)
    if (dbCheck.error?.message?.includes('password authentication failed')) {
        console.log('💡 แก้ไข: ตรวจสอบรหัสผ่านใน DATABASE_URL (Supabase → Settings → Database → Connection string)')
    } else if (dbCheck.error?.message?.includes('ECONNREFUSED') || dbCheck.error?.code === 'ECONNREFUSED') {
        console.log('💡 แก้ไข: ต่อเน็ตไม่ได้หรือ firewall บล็อก port 6543 (Supabase)')
    } else if (dbCheck.error?.message?.includes('timeout') || dbCheck.error?.code === 'ETIMEDOUT') {
        console.log('💡 แก้ไข: การเชื่อมต่อ timeout — ตรวจสอบเน็ตหรือลองใหม่')
    }
    console.log('🚨 ตรวจสอบ PostgreSQL / Supabase และค่าใน .env ให้ถูกต้อง')
    process.exit(1)
}
console.log('✅ Database connected successfully!')

// 💡 ตรวจสอบ Email Service (Mock หรือ Real)
console.log('📧 กำลังตรวจสอบ Email Service...')
await verifyEmailConnection()

// Check if port is in use and kill existing process
const checkPort = () => {
    return new Promise((resolve) => {
        exec(`lsof -ti:${env.port}`, (error) => {
            if (!error) {
                // Port is in use, kill the process
                console.log(`⚠️  Port ${env.port} is already in use. Killing existing process...`)
                exec(`lsof -ti:${env.port} | xargs kill -9 2>/dev/null`, (killError) => {
                    if (killError) {
                        console.error('❌ Failed to kill existing process.')
                    } else {
                        console.log('✅ Existing process killed. Waiting 2 seconds...')
                    }
                    setTimeout(resolve, 2000)
                })
            } else {
                resolve()
            }
        })
    })
}

// Wait for port to be available
await checkPort()

server.listen(env.port, () => {
    console.log(`Backend listening on port ${env.port}`)
    console.log('🎉 Server is fully operational.')
})

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${env.port} is still in use after cleanup.`)
        console.log(`   Please manually stop the process: lsof -ti:${env.port} | xargs kill -9`)
    } else {
        console.error('❌ Server error:', err)
    }
    process.exit(1)
})