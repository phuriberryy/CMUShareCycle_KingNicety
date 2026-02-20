import fs from 'fs'
import path from 'path'
import url from 'url'
import readline from 'readline'
import dotenv from 'dotenv'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.resolve(__dirname, '..', '.env')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function main() {
  console.log('📧 Resend Email Setup (ส่งอีเมลจริงไปยัง Outlook @cmu.ac.th)\n')
  console.log('Resend ใช้ API key ไม่ต้องตั้ง SMTP หรือ App Password')
  console.log('เหมาะกับ Supabase / Render / Vercel\n')
  console.log('📖 วิธีได้ API Key:')
  console.log('   1. ไปที่ https://resend.com และสมัคร (ฟรี 3,000 ฉบับ/เดือน)')
  console.log('   2. Dashboard → API Keys → Create API Key')
  console.log('   3. คัดลอก key ที่ขึ้นต้นด้วย re_...\n')
  console.log('   (ถ้าใช้ Supabase: ใส่ API key นี้ใน Environment Variables ของ Render/backend)\n')

  let envContent = ''
  const keysToRemove = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM', 'USE_MOCK_EMAIL']

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8')
    console.log('✅ พบไฟล์ .env แล้ว\n')
  }

  const apiKey = await question('Resend API Key (re_...): ').then(s => s?.trim()) || ''

  if (!apiKey) {
    console.error('\n❌ ต้องระบุ Resend API Key')
    rl.close()
    process.exit(1)
  }

  if (!apiKey.startsWith('re_')) {
    console.log('⚠️  API Key มักขึ้นต้นด้วย re_ ตรวจสอบจาก Resend Dashboard')
  }

  // ลบ SMTP config เก่า (ถ้าใช้ Resend ไม่ต้องใช้ SMTP)
  const lines = envContent ? envContent.split('\n') : []
  const filtered = lines.filter(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return true
    for (const key of keysToRemove) {
      if (trimmed.startsWith(key + '=')) return false
    }
    return true
  })

  const newBlock = `
# ----- Resend (ส่งอีเมลจริงไปยัง @cmu.ac.th) -----
RESEND_API_KEY=${apiKey}
# ตัวเลือก: ตั้ง EMAIL_FROM เป็น domain ที่ verify ใน Resend แล้ว (เช่น noreply@yourdomain.com)
# ถ้าไม่ตั้ง จะใช้ onboarding@resend.dev สำหรับทดสอบ
# EMAIL_FROM=noreply@yourdomain.com
`

  const newContent = filtered.join('\n').trim() + newBlock + '\n'
  fs.writeFileSync(envPath, newContent, 'utf-8')

  console.log('\n✅ ตั้งค่า Resend เรียบร้อย')
  console.log('   ไฟล์: backend/.env')
  console.log('   RESEND_API_KEY =', apiKey.substring(0, 10) + '...')
  console.log('\n📌 ทดสอบส่งอีเมล:')
  console.log('   npm run test:email your_email@cmu.ac.th')
  console.log('\n   จากนั้นรีสตาร์ท backend แล้วแจ้งเตือนจะส่งไป Outlook @cmu จริง')
  rl.close()
}

main().catch(err => {
  console.error(err)
  rl.close()
  process.exit(1)
})
