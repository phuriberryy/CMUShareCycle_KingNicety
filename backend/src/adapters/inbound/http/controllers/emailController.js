import { body, validationResult } from 'express-validator'
import { sendEmail, getEmailConfig } from '../../../../shared/utils/email.js'
import {
  exchangeRequestEmail,
  exchangeAcceptedEmail,
  exchangeCompletedEmail,
} from '../../../../shared/utils/emailTemplates.js'

// ตรวจสอบสถานะ email service (GET /api/email/status)
export const emailStatus = (_req, res) => {
  const config = getEmailConfig()
  return res.json({ ok: true, ...config })
}

// ทดสอบการส่งอีเมล
export const testEmail = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { to, subject, html } = req.body
  const config = getEmailConfig()

  try {
    const result = await sendEmail({
      to,
      subject: subject || 'SMTP Test — CMU ShareCycle',
      html: html || `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#2D7D3F;">Email delivery test</h2>
          <p>If you received this, the <strong>${config.mode.toUpperCase()}</strong> transport is working correctly.</p>
          <p style="color:#666;font-size:12px;">CMU ShareCycle — sent at ${new Date().toISOString()}</p>
        </div>
      `,
    })

    const delivered = result.accepted?.length > 0 && result.rejected?.length === 0
    return res.json({
      success: true,
      delivered,
      mode: config.mode,
      messageId: result.messageId || null,
      accepted: result.accepted || [],
      rejected: result.rejected || [],
      mock: config.mock,
      to,
    })
  } catch (err) {
    console.error('Test email error:', err)
    return res.status(500).json({
      success: false,
      mode: config.mode,
      error: err.message,
      code: err.code || null,
      to,
    })
  }
}

// ทดสอบการส่งอีเมลแจ้งเตือนคำขอแลกเปลี่ยน
export const testExchangeRequestEmail = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  const { to } = req.body
  try {
    const tpl = exchangeRequestEmail({
      ownerName: 'ผู้รับทดสอบ',
      requesterName: 'John Doe',
      requesterEmail: 'john.doe@cmu.ac.th',
      itemTitle: 'Business Strategy Book',
      message: 'ต้องการสำหรับวิชา Marketing ครับ หนังสือผมอยู่ในสภาพดีมาก',
    })
    const result = await sendEmail({ to, ...tpl })
    return res.json({ success: true, to, subject: tpl.subject, delivered: result.accepted?.length > 0 })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ทดสอบการส่งอีเมลแจ้งเตือนการยอมรับคำขอแลกเปลี่ยน
export const testExchangeAcceptedEmail = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  const { to } = req.body
  try {
    const tpl = exchangeAcceptedEmail({
      requesterName: 'ผู้รับทดสอบ',
      ownerName: 'Jane Smith',
      itemTitle: 'Business Strategy Book',
    })
    const result = await sendEmail({ to, ...tpl })
    return res.json({ success: true, to, subject: tpl.subject, delivered: result.accepted?.length > 0 })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ทดสอบการส่งอีเมลแจ้งเตือนการแลกเปลี่ยนสำเร็จ
export const testExchangeCompletedEmail = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  const { to } = req.body
  try {
    const tpl = exchangeCompletedEmail({
      recipientName: 'ผู้รับทดสอบ',
      itemTitle: 'Business Strategy Book',
      co2Text: '30.38 kg',
    })
    const result = await sendEmail({ to, ...tpl })
    return res.json({ success: true, to, subject: tpl.subject, delivered: result.accepted?.length > 0 })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}











