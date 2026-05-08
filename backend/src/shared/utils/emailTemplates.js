import env from '../../infrastructure/config/env.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const appUrl = () => env.clientOrigin || 'http://localhost:3000'

// Wraps body content in a consistent table-based shell.
// Table layout is required for Outlook 2007-2019 (Word rendering engine).
function layout(bodyRows) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CMU ShareCycle</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f3f4f6" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border:1px solid #d1d5db;">
<!-- Header -->
<tr>
  <td bgcolor="#2a6b52" style="background-color:#2a6b52;padding:24px 32px;">
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#ffffff;line-height:1.2;">CMU ShareCycle</p>
    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a7f3d0;line-height:1.2;">Green Campus — Chiang Mai University</p>
  </td>
</tr>
<!-- Body -->
<tr>
  <td style="padding:28px 32px 24px;background-color:#ffffff;">
    ${bodyRows}
  </td>
</tr>
<!-- Footer -->
<tr>
  <td bgcolor="#f9fafb" style="background-color:#f9fafb;padding:14px 32px;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9ca3af;line-height:1.4;">อีเมลนี้ส่งโดยอัตโนมัติจาก CMU ShareCycle กรุณาอย่าตอบกลับ</p>
  </td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function heading(text) {
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#111827;line-height:1.3;">${text}</p>`
}

function para(text, extraStyle = '') {
  return `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;line-height:1.6;${extraStyle}">${text}</p>`
}

// Green info card — item title highlight
function itemCard(label, value) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0;">
<tr>
  <td bgcolor="#f0fdf4" style="background-color:#f0fdf4;border:1px solid #bbf7d0;padding:14px 18px;">
    <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;line-height:1.2;">${label}</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#15803d;line-height:1.3;">${value}</p>
  </td>
</tr>
</table>`
}

// Left-bordered quote block — optional message
function quoteBlock(label, text) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0;">
<tr>
  <td style="border-left:3px solid #2a6b52;padding:10px 16px;background-color:#f9fafb;">
    <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#6b7280;line-height:1.2;">${label}</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;line-height:1.5;">${text}</p>
  </td>
</tr>
</table>`
}

// Table-based CTA button — renders correctly in all Outlook versions
function ctaButton(text, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 8px;">
<tr>
  <td bgcolor="#2a6b52" style="background-color:#2a6b52;">
    <a href="${url}" style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;padding:12px 24px;line-height:1;">${text}</a>
  </td>
</tr>
</table>`
}

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * Sent to the item owner when a new exchange request is submitted.
 */
export function exchangeRequestEmail({ ownerName, requesterName, requesterEmail, itemTitle, message }) {
  const url = `${appUrl()}/chat`

  const html = layout(`
    ${heading('คำขอแลกเปลี่ยนใหม่')}
    ${para(`สวัสดีคุณ <strong>${ownerName}</strong>,`)}
    ${para(`<strong>${requesterName}</strong> (${requesterEmail}) ส่งคำขอแลกเปลี่ยนสำหรับสินค้าของคุณ`)}
    ${itemCard('สินค้าของคุณ', itemTitle)}
    ${message ? quoteBlock('ข้อความจากผู้ขอ', message) : ''}
    ${ctaButton('เปิดกล่องข้อความ', url)}
    ${para('ไปที่ <strong>กล่องข้อความ</strong> เพื่อพิจารณาและตอบรับคำขอ', 'font-size:13px;color:#6b7280;')}
  `)

  const text = [
    `สวัสดีคุณ ${ownerName},`,
    '',
    `${requesterName} (${requesterEmail}) ส่งคำขอแลกเปลี่ยนสำหรับสินค้า "${itemTitle}"`,
    ...(message ? ['', `ข้อความจากผู้ขอ: ${message}`] : []),
    '',
    `เปิดกล่องข้อความ: ${url}`,
    '',
    'CMU ShareCycle — Green Campus, Chiang Mai University',
  ].join('\n')

  return {
    subject: `คำขอแลกเปลี่ยนใหม่สำหรับ "${itemTitle}"`,
    html,
    text,
  }
}

/**
 * Sent to the requester when the item owner accepts their request.
 */
export function exchangeAcceptedEmail({ requesterName, ownerName, itemTitle }) {
  const url = `${appUrl()}/chat`

  const html = layout(`
    ${heading('คำขอแลกเปลี่ยนได้รับการยอมรับ')}
    ${para(`สวัสดีคุณ <strong>${requesterName}</strong>,`)}
    ${para(`<strong>${ownerName}</strong> ยอมรับคำขอแลกเปลี่ยนของคุณสำหรับสินค้า`)}
    ${itemCard('สินค้า', itemTitle)}
    ${para('ทั้งสองฝ่ายต้องยืนยันผ่านแชทเพื่อให้การแลกเปลี่ยนสมบูรณ์')}
    ${ctaButton('เปิดกล่องข้อความ', url)}
  `)

  const text = [
    `สวัสดีคุณ ${requesterName},`,
    '',
    `${ownerName} ยอมรับคำขอแลกเปลี่ยนสำหรับสินค้า "${itemTitle}"`,
    '',
    `เปิดกล่องข้อความ: ${url}`,
    '',
    'CMU ShareCycle — Green Campus, Chiang Mai University',
  ].join('\n')

  return {
    subject: `คำขอแลกเปลี่ยนได้รับการยอมรับ — "${itemTitle}"`,
    html,
    text,
  }
}

/**
 * Sent to the other party when an exchange request is rejected.
 */
export function exchangeRejectedEmail({ recipientName, rejecterName, itemTitle }) {
  const url = appUrl()

  const html = layout(`
    ${heading('แจ้งผลคำขอแลกเปลี่ยน')}
    ${para(`สวัสดีคุณ <strong>${recipientName}</strong>,`)}
    ${para(`<strong>${rejecterName}</strong> ตัดสินใจไม่ดำเนินการแลกเปลี่ยนต่อสำหรับสินค้า`)}
    ${itemCard('สินค้า', itemTitle)}
    ${para('คุณสามารถค้นหาสินค้าอื่น ๆ ได้บน CMU ShareCycle', 'font-size:13px;color:#6b7280;')}
    ${ctaButton('ดูสินค้าอื่น', url)}
  `)

  const text = [
    `สวัสดีคุณ ${recipientName},`,
    '',
    `${rejecterName} ตัดสินใจไม่ดำเนินการแลกเปลี่ยนต่อสำหรับสินค้า "${itemTitle}"`,
    '',
    `ดูสินค้าอื่น: ${url}`,
    '',
    'CMU ShareCycle — Green Campus, Chiang Mai University',
  ].join('\n')

  return {
    subject: `แจ้งผลคำขอแลกเปลี่ยน — "${itemTitle}"`,
    html,
    text,
  }
}

// ─── Donation Templates ───────────────────────────────────────────────────────

/**
 * Sent to the item owner when a new donation request is submitted.
 */
export function donationRequestEmail({ ownerName, requesterName, requesterEmail, itemTitle, recipientName, recipientContact, message }) {
  const url = `${appUrl()}/chat`

  const html = layout(`
    ${heading('คำขอรับบริจาคใหม่')}
    ${para(`สวัสดีคุณ <strong>${ownerName}</strong>,`)}
    ${para(`<strong>${requesterName}</strong> (${requesterEmail}) ส่งคำขอรับบริจาคสำหรับสินค้าของคุณ`)}
    ${itemCard('สินค้าของคุณ', itemTitle)}
    ${quoteBlock('ชื่อผู้รับบริจาค', recipientName)}
    ${quoteBlock('ข้อมูลติดต่อ', recipientContact)}
    ${message ? quoteBlock('ข้อความเพิ่มเติม', message) : ''}
    ${ctaButton('เปิดกล่องข้อความ', url)}
    ${para('ไปที่ <strong>กล่องข้อความ</strong> เพื่อพิจารณาและตอบรับคำขอ', 'font-size:13px;color:#6b7280;')}
  `)

  const text = [
    `สวัสดีคุณ ${ownerName},`,
    '',
    `${requesterName} (${requesterEmail}) ส่งคำขอรับบริจาคสำหรับสินค้า "${itemTitle}"`,
    `ชื่อผู้รับบริจาค: ${recipientName}`,
    `ข้อมูลติดต่อ: ${recipientContact}`,
    ...(message ? [`ข้อความ: ${message}`] : []),
    '',
    `เปิดกล่องข้อความ: ${url}`,
    '',
    'CMU ShareCycle — Green Campus, Chiang Mai University',
  ].join('\n')

  return {
    subject: `คำขอรับบริจาคใหม่สำหรับ "${itemTitle}"`,
    html,
    text,
  }
}

/**
 * Sent to the requester when the item owner accepts their donation request.
 */
export function donationAcceptedEmail({ requesterName, ownerName, itemTitle }) {
  const url = `${appUrl()}/chat`

  const html = layout(`
    ${heading('คำขอรับบริจาคได้รับการยอมรับ')}
    ${para(`สวัสดีคุณ <strong>${requesterName}</strong>,`)}
    ${para(`<strong>${ownerName}</strong> ยอมรับคำขอรับบริจาคของคุณสำหรับสินค้า`)}
    ${itemCard('สินค้า', itemTitle)}
    ${para('ทั้งสองฝ่ายต้องยืนยันผ่านแชทเพื่อให้การบริจาคสมบูรณ์')}
    ${ctaButton('เปิดกล่องข้อความ', url)}
  `)

  const text = [
    `สวัสดีคุณ ${requesterName},`,
    '',
    `${ownerName} ยอมรับคำขอรับบริจาคสำหรับสินค้า "${itemTitle}"`,
    '',
    `เปิดกล่องข้อความ: ${url}`,
    '',
    'CMU ShareCycle — Green Campus, Chiang Mai University',
  ].join('\n')

  return {
    subject: `คำขอรับบริจาคได้รับการยอมรับ — "${itemTitle}"`,
    html,
    text,
  }
}

/**
 * Sent to the other party when a donation request is rejected.
 */
export function donationRejectedEmail({ recipientName, rejecterName, itemTitle }) {
  const url = appUrl()

  const html = layout(`
    ${heading('แจ้งผลคำขอรับบริจาค')}
    ${para(`สวัสดีคุณ <strong>${recipientName}</strong>,`)}
    ${para(`<strong>${rejecterName}</strong> ตัดสินใจไม่ดำเนินการบริจาคต่อสำหรับสินค้า`)}
    ${itemCard('สินค้า', itemTitle)}
    ${para('คุณสามารถค้นหาสินค้าอื่น ๆ ได้บน CMU ShareCycle', 'font-size:13px;color:#6b7280;')}
    ${ctaButton('ดูสินค้าอื่น', url)}
  `)

  const text = [
    `สวัสดีคุณ ${recipientName},`,
    '',
    `${rejecterName} ตัดสินใจไม่ดำเนินการบริจาคต่อสำหรับสินค้า "${itemTitle}"`,
    '',
    `ดูสินค้าอื่น: ${url}`,
    '',
    'CMU ShareCycle — Green Campus, Chiang Mai University',
  ].join('\n')

  return {
    subject: `แจ้งผลคำขอรับบริจาค — "${itemTitle}"`,
    html,
    text,
  }
}

/**
 * Sent to both parties when a donation is fully completed.
 */
export function donationCompletedEmail({ recipientName, itemTitle }) {
  const url = `${appUrl()}/chat`

  const html = layout(`
    ${heading('การบริจาคเสร็จสมบูรณ์')}
    ${para(`สวัสดีคุณ <strong>${recipientName}</strong>,`)}
    ${para('การบริจาคสินค้าเสร็จสมบูรณ์แล้ว')}
    ${itemCard('สินค้า', itemTitle)}
    ${ctaButton('เปิดกล่องข้อความ', url)}
    ${para('ขอบคุณที่ร่วมโครงการ Green Campus ของ CMU ShareCycle', 'font-size:13px;color:#6b7280;')}
  `)

  const text = [
    `สวัสดีคุณ ${recipientName},`,
    '',
    `การบริจาคสินค้า "${itemTitle}" เสร็จสมบูรณ์แล้ว`,
    '',
    `เปิดกล่องข้อความ: ${url}`,
    '',
    'ขอบคุณที่ร่วมโครงการ Green Campus',
    'CMU ShareCycle — Green Campus, Chiang Mai University',
  ].join('\n')

  return {
    subject: `การบริจาคเสร็จสมบูรณ์ — "${itemTitle}"`,
    html,
    text,
  }
}

// ─── Exchange Completed ────────────────────────────────────────────────────────

/**
 * Sent to both parties when an exchange is fully completed.
 */
export function exchangeCompletedEmail({ recipientName, itemTitle, co2Text }) {
  const url = `${appUrl()}/chat`

  const html = layout(`
    ${heading('การแลกเปลี่ยนเสร็จสมบูรณ์')}
    ${para(`สวัสดีคุณ <strong>${recipientName}</strong>,`)}
    ${para('การแลกเปลี่ยนสินค้าเสร็จสมบูรณ์แล้ว')}
    ${itemCard('สินค้า', itemTitle)}
    ${co2Text ? para(`ผลลัพธ์ด้านสิ่งแวดล้อม: ลด CO\u2082 ได้ประมาณ <strong>${co2Text}</strong>`, 'color:#15803d;') : ''}
    ${ctaButton('เปิดกล่องข้อความ', url)}
    ${para('ขอบคุณที่ร่วมโครงการ Green Campus ของ CMU ShareCycle', 'font-size:13px;color:#6b7280;')}
  `)

  const text = [
    `สวัสดีคุณ ${recipientName},`,
    '',
    `การแลกเปลี่ยนสินค้า "${itemTitle}" เสร็จสมบูรณ์แล้ว`,
    ...(co2Text ? [`ลด CO2 ได้ประมาณ ${co2Text}`] : []),
    '',
    `เปิดกล่องข้อความ: ${url}`,
    '',
    'ขอบคุณที่ร่วมโครงการ Green Campus',
    'CMU ShareCycle — Green Campus, Chiang Mai University',
  ].join('\n')

  return {
    subject: `การแลกเปลี่ยนเสร็จสมบูรณ์ — "${itemTitle}"`,
    html,
    text,
  }
}
