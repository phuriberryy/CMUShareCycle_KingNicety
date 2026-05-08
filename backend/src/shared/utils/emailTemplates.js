import env from '../../infrastructure/config/env.js'

const appUrl = () => env.clientOrigin || 'http://localhost:3000'
const logoUrl = () => `${appUrl()}/logo.png`

// ─── Embedded CSS ─────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  /* Reset */
  body,table,td,p,a,li,blockquote{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;display:block;outline:none;}
  body{margin:0!important;padding:0!important;}

  /* Link defaults */
  a{color:#4ade80;text-decoration:none;}
  a:hover{color:#86efac;}

  /* CTA hover — supported in Apple Mail, Outlook.com, Thunderbird */
  .cta-btn:hover{
    background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%)!important;
    box-shadow:0 0 32px rgba(34,197,94,.45)!important;
  }

  /* Dark mode — Apple Mail, Outlook.com */
  @media(prefers-color-scheme:dark){
    .outer-bg{background-color:#060C09!important;}
    .card-bg{background-color:#0E1812!important;}
    .footer-bg{background-color:#080D0A!important;}
  }

  /* Mobile */
  @media only screen and (max-width:620px){
    .email-card{width:100%!important;border-radius:0!important;}
    .body-pad{padding:28px 20px!important;}
    .header-pad{padding:22px 20px!important;}
    .footer-pad{padding:16px 20px!important;}
    h1{font-size:24px!important;line-height:1.3!important;}
    .product-img-col{display:block!important;width:100%!important;text-align:center!important;padding-bottom:16px!important;padding-right:0!important;}
    .product-detail-col{display:block!important;width:100%!important;}
    .detail-col{display:block!important;width:100%!important;padding-right:0!important;padding-bottom:12px!important;}
    .cta-btn{display:block!important;width:100%!important;text-align:center!important;box-sizing:border-box!important;}
  }
`

// ─── Shell ────────────────────────────────────────────────────────────────────

function shell({ pretext = '', badge = '', body }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
<title>CMU ShareCycle</title>
<style type="text/css">${GLOBAL_CSS}</style>
</head>
<body style="margin:0;padding:0;background-color:#060C09;font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;">

<!-- Preheader text — hidden, shows as inbox preview snippet -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#060C09;line-height:1px;">${pretext}&nbsp;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;</div>

<!-- Outer wrapper -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="outer-bg" bgcolor="#060C09" style="background-color:#060C09;">
<tr><td align="center" style="padding:32px 16px 48px;">

  <!-- Card -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-card" style="max-width:600px;width:100%;background-color:#0E1812;border-radius:20px;overflow:hidden;border:1px solid rgba(34,197,94,0.12);">

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <tr>
      <td class="header-pad" bgcolor="#0A1F16" style="background:linear-gradient(160deg,#0C2A1C 0%,#0F3B27 55%,#0A1F16 100%);padding:26px 36px 22px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <!-- Logo -->
            <td valign="middle">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" bgcolor="#ffffff" style="background-color:#ffffff;border-radius:10px;padding:4px;width:36px;height:36px;text-align:center;overflow:hidden;" width="36" height="36" align="center">
                    <img src="${logoUrl()}" width="28" height="28" alt="CMU ShareCycle" style="display:block;width:28px;height:28px;object-fit:contain;">
                  </td>
                  <td valign="middle" style="padding-left:12px;">
                    <p style="margin:0;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:17px;font-weight:700;color:#f0fdf4;letter-spacing:-0.3px;line-height:1.15;">CMU ShareCycle</p>
                    <p style="margin:3px 0 0;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#86efac;letter-spacing:0.5px;line-height:1.2;">กรีนแคมปัส &middot; มหาวิทยาลัยเชียงใหม่</p>
                  </td>
                </tr>
              </table>
            </td>
            <!-- Badge -->
            ${badge ? `<td align="right" valign="middle">
              <span style="display:inline-block;background:rgba(34,197,94,0.14);border:1px solid rgba(34,197,94,0.32);border-radius:999px;padding:5px 13px;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;color:#4ade80;letter-spacing:0.3px;white-space:nowrap;">&#x25CF;&nbsp;&nbsp;${badge}</span>
            </td>` : ''}
          </tr>
        </table>
      </td>
    </tr>
    <!-- Gradient divider -->
    <tr><td height="1" style="height:1px;font-size:0;line-height:0;background:linear-gradient(90deg,transparent 0%,rgba(34,197,94,0.35) 50%,transparent 100%);">&nbsp;</td></tr>

    <!-- ── Body ───────────────────────────────────────────────────────────── -->
    <tr>
      <td class="body-pad card-bg" style="padding:36px 36px 32px;background-color:#0E1812;">
        ${body}
      </td>
    </tr>

    <!-- ── Footer ─────────────────────────────────────────────────────────── -->
    <tr><td height="1" style="height:1px;font-size:0;line-height:0;background:rgba(255,255,255,0.06);">&nbsp;</td></tr>
    <tr>
      <td class="footer-pad footer-bg" style="padding:18px 36px 22px;background-color:rgba(0,0,0,0.25);">
        <p style="margin:0;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#374151;text-align:center;line-height:1.8;">
          คุณได้รับอีเมลนี้เนื่องจากมีความเคลื่อนไหวในบัญชี CMU ShareCycle ของคุณ<br>
          กรุณาอย่าตอบกลับอีเมลฉบับนี้ &nbsp;&middot;&nbsp;
          <a href="${appUrl()}" style="color:#4b5563;text-decoration:underline;">CMU ShareCycle</a>
          &nbsp;&middot;&nbsp;
          <a href="${appUrl()}" style="color:#4b5563;text-decoration:underline;">นโยบายความเป็นส่วนตัว</a>
        </p>
        <p style="margin:8px 0 0;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;color:#1f2937;text-align:center;">&copy; 2026 CMU ShareCycle &middot; กรีนแคมปัส &middot; มหาวิทยาลัยเชียงใหม่</p>
      </td>
    </tr>

  </table>
  <!-- END Card -->

</td></tr>
</table>
</body>
</html>`
}

// ─── Atomic UI Components ─────────────────────────────────────────────────────

function h1(text) {
  return `<h1 style="margin:0 0 18px;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:28px;font-weight:700;color:#f0fdf4;line-height:1.25;letter-spacing:-0.5px;">${text}</h1>`
}

function para(html, style = '') {
  return `<p style="margin:0 0 14px;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#9ca3af;line-height:1.7;${style}">${html}</p>`
}

function strong(text) {
  return `<strong style="color:#d1fae5;font-weight:600;">${text}</strong>`
}

function muted(text) {
  return `<span style="color:#6b7280;">${text}</span>`
}

// Product card — shows item thumbnail, title, category badge, condition, status dot
function productCard({ imageUrl, title, category, condition, statusText, statusColor = '#f59e0b' }) {
  const img = imageUrl
    ? `<img src="${imageUrl}" width="72" height="72" alt="${title}" style="display:block;width:72px;height:72px;border-radius:10px;object-fit:cover;">`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="72" height="72"><tr><td align="center" valign="middle" width="72" height="72" bgcolor="#ffffff" style="background-color:#ffffff;border-radius:10px;overflow:hidden;"><img src="${logoUrl()}" width="48" height="48" alt="" style="display:block;margin:12px auto;width:48px;height:48px;object-fit:contain;"></td></tr></table>`

  const categoryBadge = category
    ? `<span style="display:inline-block;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.22);border-radius:6px;padding:3px 9px;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;color:#4ade80;letter-spacing:0.1px;">${category}</span>&nbsp;`
    : ''

  const conditionBadge = condition
    ? `<span style="display:inline-block;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.11);border-radius:6px;padding:3px 9px;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;color:#d1d5db;letter-spacing:0.1px;">${condition}</span>`
    : ''

  const statusDot = statusText
    ? `<p style="margin:8px 0 0;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#9ca3af;line-height:1.3;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${statusColor};margin-right:6px;vertical-align:middle;"></span>${statusText}</p>`
    : ''

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(145deg,#1a2c20,#131d17);border:1px solid rgba(34,197,94,0.13);border-radius:14px;overflow:hidden;margin-bottom:22px;">
<tr><td style="padding:18px 20px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td class="product-img-col" width="88" valign="top" style="padding-right:16px;width:88px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td bgcolor="#162118" style="background:linear-gradient(145deg,#1e3328,#162118);border:1px solid rgba(34,197,94,0.18);border-radius:12px;width:72px;height:72px;overflow:hidden;" width="72" height="72">
            ${img}
          </td></tr>
        </table>
      </td>
      <td class="product-detail-col" valign="top">
        <p style="margin:0 0 8px;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;color:#f0fdf4;line-height:1.3;letter-spacing:-0.1px;">${title}</p>
        <p style="margin:0;">${categoryBadge}${conditionBadge}</p>
        ${statusDot}
      </td>
    </tr>
  </table>
</td></tr>
</table>`
}

// Left-bordered quote block
function quoteBlock(label, text) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:22px;">
<tr><td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-left:3px solid #22c55e;border-radius:0 10px 10px 0;padding:13px 16px;">
  <p style="margin:0 0 4px;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:0.7px;line-height:1.2;">${label}</p>
  <p style="margin:0;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#d1d5db;line-height:1.65;font-style:italic;">&ldquo;${text}&rdquo;</p>
</td></tr>
</table>`
}

// Meta row (Request ID / timestamp)
function metaRow(items) {
  const cells = items.map(({ label, value, mono }) =>
    `<td class="detail-col" valign="top" style="padding-right:24px;padding-bottom:4px;">
      <p style="margin:0 0 3px;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.7px;line-height:1.2;">${label}</p>
      <p style="margin:0;font-family:${mono ? "'Courier New',Courier,monospace" : "-apple-system,'Helvetica Neue',Arial,sans-serif"};font-size:12px;color:#6b7280;line-height:1.4;">${value}</p>
    </td>`
  ).join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:4px;"><tr>${cells}</tr></table>`
}

// Divider
function divider() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0;">
<tr><td height="1" style="height:1px;font-size:0;line-height:0;background:rgba(255,255,255,0.07);">&nbsp;</td></tr>
</table>`
}

// CTA button — VML fallback ensures Outlook renders correctly
function ctaButton(text, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0 24px;">
<tr><td align="center">
  <!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
    href="${url}" style="height:50px;v-text-anchor:middle;width:240px;" arcsize="24%"
    strokecolor="#16a34a" fill="true">
    <v:fill type="gradient" color="#16a34a" color2="#15803d" angle="135"/>
    <w:anchorlock/>
    <center style="color:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.1px;">${text}</center>
  </v:roundrect>
  <![endif]-->
  <!--[if !mso]><!-->
  <a href="${url}" class="cta-btn"
    style="display:inline-block;background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);color:#ffffff;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.1px;border:1px solid rgba(255,255,255,0.15);box-shadow:0 0 24px rgba(22,163,74,0.3),0 4px 14px rgba(0,0,0,0.5);transition:all .2s ease;">
    ${text}
  </a>
  <!--<![endif]-->
</td></tr>
</table>`
}

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * ส่งถึงเจ้าของสินค้าเมื่อมีคำขอแลกเปลี่ยนใหม่
 */
export function exchangeRequestEmail({
  ownerName,
  requesterName,
  requesterEmail,
  itemTitle,
  message,
  itemImageUrl,
  itemCategory,
  itemCondition,
  requestId,
  requestedAt,
}) {
  const url = `${appUrl()}/chat`

  const formattedDate = requestedAt
    ? new Date(requestedAt).toLocaleString('th-TH', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  const metaItems = [
    ...(requestId     ? [{ label: 'รหัสคำขอ', value: requestId,     mono: true  }] : []),
    ...(formattedDate ? [{ label: 'ส่งเมื่อ',  value: formattedDate, mono: false }] : []),
  ]

  const body = `
    ${h1('มีคนสนใจ<br>รายการของคุณ')}
    ${para(`สวัสดี ${strong(ownerName)},`)}
    ${para(`${strong(requesterName)} ${muted(`(${requesterEmail})`)} สนใจรายการของคุณและส่งคำขอแลกเปลี่ยนมาแล้ว ลองคุยกันดูนะ?`)}

    ${productCard({
      imageUrl: itemImageUrl || null,
      title: itemTitle,
      category: itemCategory || null,
      condition: itemCondition || null,
      statusText: 'กำลังรอการตอบกลับ',
      statusColor: '#f59e0b',
    })}

    ${message ? quoteBlock('ข้อความจากผู้ขอ', message) : ''}

    ${ctaButton('ดูคำขอและตอบกลับ &nbsp;&#8594;', url)}

    ${metaItems.length ? divider() + metaRow(metaItems) : ''}
  `

  const text = [
    `สวัสดี ${ownerName},`,
    '',
    `${requesterName} (${requesterEmail}) สนใจรายการ "${itemTitle}" ของคุณและส่งคำขอแลกเปลี่ยนมาแล้ว`,
    ...(message ? ['', `ข้อความ: ${message}`] : []),
    '',
    `ดูคำขอและตอบกลับ: ${url}`,
    ...(requestId     ? [`รหัสคำขอ: ${requestId}`]     : []),
    ...(formattedDate ? [`ส่งเมื่อ: ${formattedDate}`]  : []),
    '',
    'CMU ShareCycle — กรีนแคมปัส มหาวิทยาลัยเชียงใหม่',
  ].join('\n')

  return {
    subject: `มีคนสนใจรายการของคุณ`,
    html: shell({
      pretext: `${requesterName} ส่งคำขอแลกเปลี่ยน "${itemTitle}" — แตะเพื่อดูรายละเอียด`,
      badge: 'มีคำขอใหม่',
      body,
    }),
    text,
  }
}

/**
 * ส่งถึงผู้ขอแลกเมื่อเจ้าของสินค้ายอมรับคำขอ
 */
export function exchangeAcceptedEmail({ requesterName, ownerName, itemTitle, itemImageUrl, itemCategory }) {
  const url = `${appUrl()}/chat`

  const body = `
    ${h1('ยินดีด้วย!<br>คำขอได้รับการตอบรับ')}
    ${para(`สวัสดี ${strong(requesterName)},`)}
    ${para(`${strong(ownerName)} ตอบรับคำขอของคุณแล้ว ไปคุยกันต่อในแชทเพื่อนัดรับส่งของได้เลย`)}

    ${productCard({
      imageUrl: itemImageUrl || null,
      title: itemTitle,
      category: itemCategory || null,
      condition: null,
      statusText: 'ตอบรับแล้ว — รอนัดหมาย',
      statusColor: '#22c55e',
    })}

    ${ctaButton('ไปแชทเลย &nbsp;&#8594;', url)}

    ${para('พูดคุยรายละเอียด เวลา และสถานที่กับเจ้าของรายการได้เลย', 'font-size:13px;color:#6b7280;')}
  `

  const text = [
    `สวัสดี ${requesterName},`,
    '',
    `${ownerName} ตอบรับคำขอแลกเปลี่ยน "${itemTitle}" ของคุณแล้ว`,
    'ไปคุยกันต่อในแชทเพื่อนัดรับส่งของได้เลย',
    '',
    `ไปแชทเลย: ${url}`,
    '',
    'CMU ShareCycle — กรีนแคมปัส มหาวิทยาลัยเชียงใหม่',
  ].join('\n')

  return {
    subject: `ยอมรับคำขอแล้ว ✓`,
    html: shell({
      pretext: `${ownerName} ตอบรับคำขอแลกเปลี่ยน "${itemTitle}" ของคุณแล้ว — ไปนัดหมายกันเลย`,
      badge: 'ตอบรับแล้ว',
      body,
    }),
    text,
  }
}

/**
 * ส่งถึงอีกฝ่ายเมื่อคำขอแลกเปลี่ยนถูกปฏิเสธ
 */
export function exchangeRejectedEmail({ recipientName, rejecterName, itemTitle }) {
  const url = appUrl()

  const body = `
    ${h1('คำขอครั้งนี้<br>ยังไม่ผ่าน')}
    ${para(`สวัสดี ${strong(recipientName)},`)}
    ${para(`${strong(rejecterName)} ขอสงวนสิทธิ์ไม่ดำเนินการต่อสำหรับ <strong style="color:#d1fae5;">"${itemTitle}"</strong> ในครั้งนี้`)}
    ${para('ไม่เป็นไรนะ — ยังมีของดีอีกเยอะในแพลตฟอร์ม ลองหาตัวที่ใช่กันต่อเลย', 'font-size:13px;color:#6b7280;')}

    ${ctaButton('ดูรายการอื่นๆ &nbsp;&#8594;', url)}
  `

  const text = [
    `สวัสดี ${recipientName},`,
    '',
    `${rejecterName} ขอสงวนสิทธิ์ไม่ดำเนินการต่อสำหรับ "${itemTitle}" ในครั้งนี้`,
    'ยังมีของดีอีกเยอะในแพลตฟอร์ม ลองหาตัวที่ใช่กันต่อเลย',
    '',
    `ดูรายการอื่นๆ: ${url}`,
    '',
    'CMU ShareCycle — กรีนแคมปัส มหาวิทยาลัยเชียงใหม่',
  ].join('\n')

  return {
    subject: `มีการอัปเดตคำขอแลกเปลี่ยน`,
    html: shell({
      pretext: `"${itemTitle}" — คำขอนี้ยังไม่ผ่านครั้งนี้ ยังมีของดีอีกเยอะรออยู่`,
      badge: 'มีการอัปเดต',
      body,
    }),
    text,
  }
}

/**
 * ส่งถึงทั้งสองฝ่ายเมื่อทั้งคู่ตอบรับแล้ว — ยังไม่ได้แลกจริง แค่จับคู่สำเร็จ พร้อมนัดหมาย
 */
export function exchangeMatchedEmail({ recipientName, otherName, itemTitle, itemImageUrl, itemCategory, itemCondition }) {
  const url = `${appUrl()}/chat`

  const body = `
    ${h1('คุณทั้งคู่<br>สนใจแลกเปลี่ยนกัน')}
    ${para(`สวัสดี ${strong(recipientName)},`)}
    ${para(`${strong(otherName)} และคุณต่างสนใจแลกเปลี่ยนกัน ตอนนี้สามารถพูดคุยเพื่อนัดหมายการแลกเปลี่ยนได้แล้ว`)}

    ${productCard({
      imageUrl: itemImageUrl || null,
      title: itemTitle,
      category: itemCategory || null,
      condition: itemCondition || null,
      statusText: 'รอนัดหมายและยืนยันการส่งมอบ',
      statusColor: '#3b82f6',
    })}

    ${ctaButton('เปิดแชท &nbsp;&#8594;', url)}

    ${para('นัดหมายวัน เวลา และสถานที่ผ่านข้อความได้เลย<br>เมื่อแลกเปลี่ยนเรียบร้อยแล้ว กดยืนยันในแชทเพื่อบันทึกผลได้เลย', 'font-size:13px;color:#6b7280;')}
  `

  const text = [
    `สวัสดี ${recipientName},`,
    '',
    `${otherName} และคุณต่างสนใจแลกเปลี่ยน "${itemTitle}" กัน ตอนนี้พูดคุยเพื่อนัดหมายได้แล้ว`,
    '',
    `เปิดแชท: ${url}`,
    '',
    'นัดหมายวัน เวลา และสถานที่ผ่านข้อความได้เลย',
    'เมื่อแลกเปลี่ยนเรียบร้อยแล้ว กดยืนยันในแชทเพื่อบันทึกผลได้เลย',
    '',
    'CMU ShareCycle — กรีนแคมปัส มหาวิทยาลัยเชียงใหม่',
  ].join('\n')

  return {
    subject: `จับคู่สำเร็จแล้ว ✓`,
    html: shell({
      pretext: `คุณทั้งคู่สนใจแลกเปลี่ยน "${itemTitle}" — ไปนัดหมายกันในแชทได้เลย`,
      badge: 'จับคู่แล้ว',
      body,
    }),
    text,
  }
}

/**
 * ส่งถึงทั้งสองฝ่ายเมื่อยืนยันในแชทแล้วว่าการแลกเปลี่ยนเกิดขึ้นจริง
 */
export function exchangeCompletedEmail({ recipientName, itemTitle, co2Text }) {
  const url = `${appUrl()}/chat`

  const body = `
    ${h1('แลกเปลี่ยน<br>สำเร็จแล้ว &#10003;')}
    ${para(`สวัสดี ${strong(recipientName)},`)}
    ${para(`คุณและอีกฝ่ายยืนยันแล้วว่าการแลกเปลี่ยน <strong style="color:#d1fae5;">"${itemTitle}"</strong> เสร็จสมบูรณ์ ขอบคุณที่ช่วยกันหมุนเวียนของดีในชุมชน CMU ShareCycle`)}

    ${co2Text ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:22px;">
    <tr><td bgcolor="#0f2e1a" style="background:linear-gradient(145deg,#0f2e1a,#0a2013);border:1px solid rgba(34,197,94,0.2);border-radius:14px;padding:18px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
        <tr>
          <td valign="middle" bgcolor="#ffffff" style="background-color:#ffffff;border-radius:4px;overflow:hidden;width:18px;height:18px;" width="18" height="18">
            <img src="${logoUrl()}" width="16" height="16" alt="" style="display:block;margin:1px;width:16px;height:16px;object-fit:contain;">
          </td>
          <td valign="middle" style="padding-left:7px;"><span style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:0.7px;line-height:1.2;">ผลลัพธ์ด้านสิ่งแวดล้อม</span></td>
        </tr>
      </table>
      <p style="margin:0;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:20px;font-weight:700;color:#4ade80;line-height:1.3;">&#x2212; ${co2Text} CO&#x2082;</p>
      <p style="margin:4px 0 0;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.4;">คาร์บอนที่ประหยัดได้จากการแลกเปลี่ยนครั้งนี้</p>
    </td></tr>
    </table>` : ''}

    ${ctaButton('ดูบันทึกการแลก &nbsp;&#8594;', url)}

    ${para('ของดีที่ไม่ได้ใช้ควรหาบ้านใหม่ — ขอบคุณที่เป็นส่วนหนึ่งของ CMU ShareCycle', 'font-size:13px;color:#6b7280;')}
  `

  const text = [
    `สวัสดี ${recipientName},`,
    '',
    `การแลกเปลี่ยน "${itemTitle}" เสร็จสมบูรณ์แล้ว`,
    ...(co2Text ? [`คาร์บอนที่ประหยัดได้: ประมาณ ${co2Text} CO2`] : []),
    '',
    `ดูบันทึกการแลก: ${url}`,
    '',
    'ของดีที่ไม่ได้ใช้ควรหาบ้านใหม่ — ขอบคุณที่เป็นส่วนหนึ่งของ CMU ShareCycle',
    'CMU ShareCycle — กรีนแคมปัส มหาวิทยาลัยเชียงใหม่',
  ].join('\n')

  return {
    subject: `แลกเปลี่ยนสำเร็จแล้ว ✓`,
    html: shell({
      pretext: `"${itemTitle}" เปลี่ยนมือเรียบร้อย — ขอบคุณที่แชร์ของดีในชุมชน`,
      badge: 'สำเร็จแล้ว',
      body,
    }),
    text,
  }
}

// ─── Donation Templates ───────────────────────────────────────────────────────

export function donationRequestEmail({ ownerName, requesterName, requesterEmail, itemTitle, recipientName, recipientContact, message }) {
  const url = `${appUrl()}/chat`

  const body = `
    ${h1('มีคนต้องการ<br>ของที่คุณให้')}
    ${para(`สวัสดี ${strong(ownerName)},`)}
    ${para(`${strong(requesterName)} ${muted(`(${requesterEmail})`)} ส่งคำขอรับบริจาคมาแล้ว เขา/เธอน่าจะได้ใช้ของชิ้นนี้อย่างคุ้มค่าแน่นอน`)}

    ${productCard({ title: itemTitle, statusText: 'รอการพิจารณา', statusColor: '#f59e0b' })}

    ${quoteBlock('ชื่อผู้รับ', recipientName)}
    ${quoteBlock('ข้อมูลติดต่อ', recipientContact)}
    ${message ? quoteBlock('เหตุผล / ข้อความ', message) : ''}

    ${ctaButton('ดูคำขอและตอบรับ &nbsp;&#8594;', url)}
    ${para('ตรวจสอบข้อมูลแล้วนัดส่งของในแชทได้เลย', 'font-size:13px;color:#6b7280;')}
  `

  const text = [
    `สวัสดี ${ownerName},`,
    '',
    `${requesterName} (${requesterEmail}) ส่งคำขอรับบริจาค "${itemTitle}" มาแล้ว`,
    `ชื่อผู้รับ: ${recipientName}`,
    `ข้อมูลติดต่อ: ${recipientContact}`,
    ...(message ? [`เหตุผล / ข้อความ: ${message}`] : []),
    '',
    `ดูคำขอและตอบรับ: ${url}`,
    '',
    'CMU ShareCycle — กรีนแคมปัส มหาวิทยาลัยเชียงใหม่',
  ].join('\n')

  return {
    subject: `มีคนอยากรับของที่คุณบริจาค`,
    html: shell({ pretext: `${requesterName} ส่งคำขอรับบริจาค "${itemTitle}" — ตรวจสอบและตอบรับได้เลย`, badge: 'มีคำขอบริจาค', body }),
    text,
  }
}

export function donationAcceptedEmail({ requesterName, ownerName, itemTitle }) {
  const url = `${appUrl()}/chat`

  const body = `
    ${h1('ยินดีด้วย!<br>ได้รับการอนุมัติแล้ว')}
    ${para(`สวัสดี ${strong(requesterName)},`)}
    ${para(`${strong(ownerName)} ยินดีมอบ <strong style="color:#d1fae5;">"${itemTitle}"</strong> ให้คุณแล้ว ไปนัดรับของกันในแชทได้เลย`)}
    ${ctaButton('ไปแชทเลย &nbsp;&#8594;', url)}
  `

  const text = [
    `สวัสดี ${requesterName},`,
    '',
    `${ownerName} ยินดีมอบ "${itemTitle}" ให้คุณแล้ว`,
    'ไปนัดรับของกันในแชทได้เลย',
    '',
    `ไปแชทเลย: ${url}`,
    '',
    'CMU ShareCycle — กรีนแคมปัส มหาวิทยาลัยเชียงใหม่',
  ].join('\n')

  return {
    subject: `ได้รับการอนุมัติแล้ว ✓`,
    html: shell({ pretext: `${ownerName} ยินดีมอบ "${itemTitle}" ให้คุณแล้ว — ไปนัดรับของในแชทได้เลย`, badge: 'อนุมัติแล้ว', body }),
    text,
  }
}

export function donationRejectedEmail({ recipientName, rejecterName, itemTitle }) {
  const url = appUrl()

  const body = `
    ${h1('คำขอครั้งนี้<br>ยังไม่ผ่าน')}
    ${para(`สวัสดี ${strong(recipientName)},`)}
    ${para(`${strong(rejecterName)} ขอสงวนสิทธิ์ไม่ดำเนินการต่อสำหรับ <strong style="color:#d1fae5;">"${itemTitle}"</strong> ในครั้งนี้`)}
    ${para('ยังมีของดีอีกเยอะในชุมชน CMU ShareCycle รอคุณอยู่นะ', 'font-size:13px;color:#6b7280;')}
    ${ctaButton('ดูรายการอื่นๆ &nbsp;&#8594;', url)}
  `

  const text = [
    `สวัสดี ${recipientName},`,
    '',
    `${rejecterName} ขอสงวนสิทธิ์ไม่ดำเนินการต่อสำหรับ "${itemTitle}" ในครั้งนี้`,
    'ยังมีของดีอีกเยอะในชุมชน CMU ShareCycle รอคุณอยู่นะ',
    '',
    `ดูรายการอื่นๆ: ${url}`,
    '',
    'CMU ShareCycle — กรีนแคมปัส มหาวิทยาลัยเชียงใหม่',
  ].join('\n')

  return {
    subject: `มีการอัปเดตคำขอบริจาค`,
    html: shell({ pretext: `"${itemTitle}" — คำขอนี้ยังไม่ผ่านครั้งนี้`, badge: 'มีการอัปเดต', body }),
    text,
  }
}

export function donationCompletedEmail({ recipientName, itemTitle }) {
  const url = `${appUrl()}/chat`

  const body = `
    ${h1('ส่งมอบแล้ว<br>ขอบคุณมากๆ &#10003;')}
    ${para(`สวัสดี ${strong(recipientName)},`)}
    ${para(`การบริจาค <strong style="color:#d1fae5;">"${itemTitle}"</strong> เสร็จสมบูรณ์แล้ว ของชิ้นนี้จะได้ถูกใช้อย่างคุ้มค่าต่อไป`)}
    ${ctaButton('ดูบันทึกการบริจาค &nbsp;&#8594;', url)}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px;">
      <tr>
        <td valign="middle" bgcolor="#ffffff" style="background-color:#ffffff;border-radius:5px;overflow:hidden;width:22px;height:22px;" width="22" height="22">
          <img src="${logoUrl()}" width="18" height="18" alt="" style="display:block;margin:2px;width:18px;height:18px;object-fit:contain;">
        </td>
        <td valign="middle" style="padding-left:8px;"><p style="margin:0;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#6b7280;line-height:1.6;">การแบ่งปันเล็กๆ น้อยๆ สร้างความแตกต่างได้เสมอ — ขอบคุณที่เป็นส่วนหนึ่งของชุมชน CMU ShareCycle</p></td>
      </tr>
    </table>
  `

  const text = [
    `สวัสดี ${recipientName},`,
    '',
    `การบริจาค "${itemTitle}" เสร็จสมบูรณ์แล้ว ของชิ้นนี้จะได้ถูกใช้อย่างคุ้มค่าต่อไป`,
    '',
    `ดูบันทึกการบริจาค: ${url}`,
    '',
    'การแบ่งปันเล็กๆ น้อยๆ สร้างความแตกต่างได้เสมอ',
    'CMU ShareCycle — กรีนแคมปัส มหาวิทยาลัยเชียงใหม่',
  ].join('\n')

  return {
    subject: `บริจาคสำเร็จแล้ว ✓`,
    html: shell({ pretext: `"${itemTitle}" ส่งถึงมือผู้รับแล้ว — ขอบคุณที่แบ่งปัน`, badge: 'สำเร็จแล้ว', body }),
    text,
  }
}
