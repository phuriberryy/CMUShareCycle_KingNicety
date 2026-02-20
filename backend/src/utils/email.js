import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import env from '../config/env.js'

// ทางเลือกที่ 1: Resend (แนะนำ - ใช้ API key จาก resend.com ไม่ต้องตั้ง SMTP)
const useResend = Boolean(env.resendApiKey)

// ทางเลือกที่ 2: SMTP (Outlook @cmu.ac.th, Gmail ฯลฯ)
const hasSmtpConfig = env.emailHost && env.emailUser && env.emailPass && env.emailFrom

// ใช้ mock mode เฉพาะเมื่อไม่มีทั้ง Resend และ SMTP หรือบังคับ USE_MOCK_EMAIL=true
const USE_MOCK_EMAIL = process.env.USE_MOCK_EMAIL === 'true' || (!useResend && !hasSmtpConfig)

// Resend client (เมื่อมี RESEND_API_KEY)
const resendClient = useResend ? new Resend(env.resendApiKey) : null

// Nodemailer transporter (เมื่อมี SMTP config – ใช้ก่อน Resend)
const transporter = !USE_MOCK_EMAIL && hasSmtpConfig ? nodemailer.createTransport({
  host: env.emailHost,
  port: env.emailPort,
  secure: env.emailPort === 465,
  auth: {
    user: env.emailUser,
    pass: env.emailPass,
  },
  requireTLS: env.emailHost === 'smtp.gmail.com' || env.emailHost === 'smtp.office365.com',
  tls: { rejectUnauthorized: false },
  debug: false,
  logger: false,
}) : null

// Mock email function - แค่ log อีเมลออกมาใน console
const mockSendEmail = ({ to, subject, html }) => {
  console.log('\n📧 ========== MOCK EMAIL (ไม่ส่งจริง) ==========')
  console.log('To:', to)
  console.log('Subject:', subject)
  console.log('From: CMU ShareCycle <noreply@cmusharecycle.local>')
  console.log('---')
  console.log('HTML Content:')
  // แสดง HTML แบบง่ายๆ (ลบ tags)
  const textContent = html
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  console.log(textContent.substring(0, 200) + (textContent.length > 200 ? '...' : ''))
  console.log('==========================================\n')
  
  return {
    messageId: `mock-${Date.now()}@cmusharecycle.local`,
    accepted: [to],
    rejected: [],
    pending: [],
    response: '250 Mock email logged successfully'
  }
}

// ตรวจสอบการเชื่อมต่ออีเมล
export const verifyEmailConnection = async () => {
  if (USE_MOCK_EMAIL) {
    console.log('📧 Email Service: MOCK MODE (ไม่ส่งอีเมลจริง แค่ log ใน console)')
    return true
  }

  if (!hasSmtpConfig) {
    if (useResend) {
      console.log('✅ Email Service: Resend (ส่งอีเมลจริง)')
      return true
    }
    console.error('❌ Email configuration not found')
    console.log('   ตั้งค่า Gmail: npm run email:gmail หรือใส่ EMAIL_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_FROM ใน .env')
    return false
  }

  if (!transporter) {
    console.error('❌ Email transporter not initialized')
    return false
  }

  try {
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email verification timeout (5s)')), 5000)
      )
    ])
    console.log('✅ Email Service: SMTP (Gmail → ส่งไป @cmu.ac.th ได้)')
    const maskUser = env.emailUser ? env.emailUser.replace(/(.{2}).*(@.*)/, '$1***$2') : '?'
    console.log(`   Host: ${env.emailHost} Port: ${env.emailPort} User: ${maskUser}`)
    return true
  } catch (err) {
    console.error('❌ Email server connection failed:', err.message)
    if (err.code === 'EAUTH') {
      console.error('   → ใช้ Gmail App Password (16 ตัว) ไม่ใช่รหัสผ่านบัญชี: https://myaccount.google.com/apppasswords')
    }
    if (err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT') {
      console.error('   → ตรวจสอบ EMAIL_HOST (smtp.gmail.com) และเครือข่าย')
    }
    return false
  }
}

// แปลง HTML เป็น plain text ที่ดีขึ้น
const htmlToText = (html) => {
  let text = html
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi, '$2 ($1)')
    .replace(/<strong[^>]*>([^<]+)<\/strong>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  
  return text
}

// สร้าง Message-ID ที่ถูกต้อง
const generateMessageId = () => {
  const domain = env.emailUser?.split('@')[1] || 'cmusharecycle.local'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `<${timestamp}.${random}@${domain}>`
}

// ส่งอีเมล (รองรับ Resend หรือ SMTP)
export const sendEmail = async ({ to, subject, html }) => {
  if (USE_MOCK_EMAIL) {
    return mockSendEmail({ to, subject, html })
  }

  // --- ทางเลือกที่ 1: SMTP (Gmail ส่งไป @cmu.ac.th ได้) ---
  if (hasSmtpConfig && transporter) {
    try {
      const fromEmail = env.emailFrom.includes('@') ? env.emailFrom : env.emailUser
      const dateHeader = new Date().toUTCString()
      const info = await transporter.sendMail({
        from: `"CMU ShareCycle" <${fromEmail}>`,
        to,
        subject,
        html,
        text: htmlToText(html),
        replyTo: fromEmail,
        headers: {
          'Date': dateHeader,
          'Message-ID': generateMessageId(),
          'Precedence': 'normal',
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'normal',
          'X-Mailer': 'CMU ShareCycle Platform',
          'Organization': 'Chiang Mai University',
        },
        envelope: { from: fromEmail, to: [to] },
      })
      console.log('✅ Email sent via SMTP:', info.messageId, 'To:', to)
      return info
    } catch (err) {
      console.error('❌ SMTP send failed:', err.message)
      return { messageId: null, accepted: [], rejected: [to], error: err.message }
    }
  }

  // --- ทางเลือกที่ 2: Resend (เมื่อไม่มี SMTP) ---
  if (useResend && resendClient) {
    const fromAddress = env.emailFrom && env.emailFrom.includes('@')
      ? env.emailFrom
      : 'onboarding@resend.dev' // Resend อนุญาตใช้สำหรับทดสอบ ถ้าไม่ตั้ง EMAIL_FROM
    const fromDisplay = env.emailFrom && env.emailFrom.includes('@')
      ? `"CMU ShareCycle" <${env.emailFrom}>`
      : 'CMU ShareCycle <onboarding@resend.dev>'

    try {
      const { data, error } = await resendClient.emails.send({
        from: fromDisplay,
        to: [to],
        subject,
        html,
      })
      if (error) {
        console.error('❌ Resend send failed:', error.message)
        return { messageId: null, accepted: [], rejected: [to], error: error.message }
      }
      console.log('✅ Email sent via Resend:', data?.id, 'To:', to)
      return { messageId: data?.id, accepted: [to], rejected: [] }
    } catch (err) {
      console.error('❌ Resend error:', err.message)
      return { messageId: null, accepted: [], rejected: [to], error: err.message }
    }
  }

  return mockSendEmail({ to, subject, html })
}

// ส่งอีเมลทดสอบ
export const sendTestEmail = async (to) => {
  return sendEmail({
    to,
    subject: 'ทดสอบการส่งอีเมลจาก CMU ShareCycle',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2D7D3F;">ทดสอบการส่งอีเมล</h2>
        <p>สวัสดีครับ/ค่ะ,</p>
        <p>นี่คืออีเมลทดสอบจาก <strong>CMU ShareCycle</strong></p>
        <p>หากคุณได้รับอีเมลนี้ แสดงว่าระบบส่งอีเมลทำงานได้ปกติ</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          CMU ShareCycle - Green Campus<br>
          <a href="http://localhost:3000" style="color: #2D7D3F;">เข้าสู่ระบบ</a>
        </p>
      </div>
    `,
  })
}
