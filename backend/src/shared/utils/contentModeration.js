/**
 * Content moderation — โพสต์สินค้า (ข้อความ + ภาพ)
 *
 * ข้อความ: ภาษาไทย + อังกฤษ (จับการเลียนด้วยช่องว่าง/leetspeak) + ประเภทอาวุธ/ของผิดกฎหมายในเชิงโปรโมท
 *
 * รูปภาพ:
 *  - ตั้งค่า SIGHTENGINE_API_USER + SIGHTENGINE_API_SECRET → ใช้ Sightengine (อนาจาร + อาวุธในรูป ฯลฯ)
 *  - ไม่มี API → ใช้ nsfwjs บนเซิร์ฟเวอร์กรองอนาจารเบื้องต้น (รูปอาวุธอาจรอด — ควรเปิด Sightengine ถ้าต้องการครบ)
 *
 * ปิดระบบตรวจรูปชั่วคราว (dev): DISABLE_IMAGE_MODERATION=1
 */

import {
  moderateImageBufferSightengine,
  isSightengineConfigured,
  evaluateSightengineOutput,
} from './sightengineModeration.js'

// ─── Thai substrings ───

const THAI_BLOCKED_SUBSTRINGS = [
  'ควย',
  'หำ',
  'หี',
  'เย็ด',
  'เงี่ยน',
  'เหี้ย',
  'สัส',
  'แตด',
  'ลามก',
  'เสียว',
  'ช่วยว่าว',
  'โป๊',
  'อนาจาร',
  'หนังโป๊',
  'ความใคร่',
]

const TH_ROMAN_BLOCKED = ['kuy', 'hee', 'kuay', 'hia', 'khee', 'kuyy', 'fuckkk', 'shitt']

const THAI_WEAPON_PROMO = [
  'ขายปืน',
  'ปืนอัดแก็ส',
  'ปืนยิง',
  'ปืนกระสุน',
  'กระสุน',
  'ระเบิด',
  'ลูกระเบิด',
]

const EN_WEAPON_PROMO = [
  'sell gun',
  'buy gun',
  'ammo for sale',
  'bullet sale',
  'grenade',
  'explosives',
]

const EN_BLOCKED_WORDS = [
  'fuck',
  'fucking',
  'fucked',
  'motherfucker',
  'cock',
  'cocksucker',
  'dick',
  'dickhead',
  'pussy',
  'whore',
  'slut',
  'cum',
  'cumming',
  'cunt',
  'bitch',
  'bastard',
  'asshole',
  'shit',
  'bullshit',
  'jackass',
  'porn',
  'porno',
  'pornhub',
  'xxx',
  'nude',
  'nudes',
  'naked',
  'masturbate',
  'masturbation',
  'nipples',
  'erotic',
  'orgasm',
  'blowjob',
  'anal',
  'rape',
  'rapist',
]

const EN_HARD_SUBSTRINGS = ['nigger', 'nigga', 'faggot']

const DRUG_PROMO_TH = ['ยาบ้า', 'ไอซ์ขาย', 'เฮโรอีน']
const DRUG_PROMO_EN = ['cocaine for sale', 'heroin', 'buy meth']

const SIGHTENGINE_GET = 'https://api.sightengine.com/1.0/check.json'

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizeTextForModeration(input) {
  if (!input || typeof input !== 'string') return ''
  let s = input.normalize('NFKC').replace(/\u200b|\uFEFF/g, '')
  s = s.toLowerCase()
  s = s.replace(/[.\s*_\-:·•\\/|[\]()]+/g, '')
  return s
    .replace(/@/g, 'a')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/\$/g, 's')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/\*/g, '')
}

function containsThaiSubstring(compactNorm, substring) {
  const sub = substring.normalize('NFKC').toLowerCase().replace(/\s+/g, '')
  return compactNorm.includes(sub)
}

function englishWordBoundaryTest(lowerSpaced, word) {
  const re = new RegExp(`(^|[^a-z])${escapeRegex(word)}([^a-z]|$)`, 'i')
  return re.test(lowerSpaced)
}

export function moderateText(text) {
  if (text === undefined || text === null) return { allowed: true }
  const raw = typeof text === 'string' ? text.trim() : String(text).trim()
  if (!raw) return { allowed: true }

  const compact = normalizeTextForModeration(raw)
  const lowerSpaced = raw.normalize('NFKC').replace(/\u200b|\uFEFF/g, '').toLowerCase()

  for (const word of THAI_BLOCKED_SUBSTRINGS) {
    if (containsThaiSubstring(compact, word)) {
      return {
        allowed: false,
        code: 'TEXT_PROFANITY',
        reasonTh: 'ข้อความมีคำหยาบ ลามก หรือไม่เหมาะสม โปรดแก้ไขก่อนโพสต์',
      }
    }
  }

  for (const w of TH_ROMAN_BLOCKED) {
    if (compact.includes(w)) {
      return {
        allowed: false,
        code: 'TEXT_PROFANITY',
        reasonTh: 'ข้อความมีคำหยาบ ลามก หรือไม่เหมาะสม โปรดแก้ไขก่อนโพสต์',
      }
    }
  }

  for (const phrase of [...THAI_WEAPON_PROMO, ...DRUG_PROMO_TH]) {
    const p = phrase.replace(/\s+/g, '')
    if (compact.includes(p)) {
      return {
        allowed: false,
        code: 'TEXT_WEAPON_DRUG',
        reasonTh: 'ข้อความมีเนื้อหาเกี่ยวกับอาวุธหรือของผิดกฎหมาย ไม่สามารถโพสต์ได้',
      }
    }
  }

  for (const phrase of [...EN_WEAPON_PROMO, ...DRUG_PROMO_EN]) {
    if (lowerSpaced.includes(phrase)) {
      return {
        allowed: false,
        code: 'TEXT_WEAPON_DRUG',
        reasonTh: 'ข้อความมีเนื้อหาเกี่ยวกับอาวุธหรือของผิดกฎหมาย ไม่สามารถโพสต์ได้',
      }
    }
  }

  for (const hate of EN_HARD_SUBSTRINGS) {
    if (compact.includes(hate)) {
      return {
        allowed: false,
        code: 'TEXT_HATE',
        reasonTh: 'ข้อความมีถ้อยคำเหยียดหยามหรือรุนแรง โปรดแก้ไขก่อนโพสต์',
      }
    }
  }

  for (const word of EN_BLOCKED_WORDS) {
    if (englishWordBoundaryTest(lowerSpaced, word)) {
      return {
        allowed: false,
        code: 'TEXT_PROFANITY',
        reasonTh: 'ข้อความมีคำหยาบ ลามก หรือไม่เหมาะสม โปรดแก้ไขก่อนโพสต์',
      }
    }
  }

  if (raw.length > 10 && /(.)\1{5,}/.test(raw)) {
    return {
      allowed: false,
      code: 'TEXT_SPAM',
      reasonTh: 'ข้อความมีการพิมพ์ซ้ำตัวอักษรมากเกินไป โปรดแก้ไขก่อนโพสต์',
    }
  }

  if (raw.length > 20) {
    const specialChars = raw.match(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/g) || []
    if (specialChars.length / raw.length > 0.2) {
      return {
        allowed: false,
        code: 'TEXT_SPAM',
        reasonTh: 'ข้อความมีสัญลักษณ์พิเศษมากเกินไป โปรดแก้ไขก่อนโพสต์',
      }
    }
  }

  return { allowed: true }
}

export function moderateCombinedItemText(payload) {
  const pairs = [
    payload.title,
    payload.description,
    payload.lookingFor,
    payload.pickupLocation,
    payload.otherSubtype,
  ]
  for (const value of pairs) {
    if (value === undefined || value === null || value === '') continue
    const r = moderateText(String(value))
    if (!r.allowed) return r
  }
  return { allowed: true }
}

/** เข้ากันได้กับโค้ดเดิม */
export function detectSpam(text) {
  const r = moderateText(text || '')
  return {
    isSpam: !r.allowed,
    reason: r.reasonTh || null,
    reasonTh: r.reasonTh,
    code: r.code,
  }
}

export function validateImage(imageUrl) {
  if (!imageUrl) return { isValid: true }
  if (imageUrl.startsWith('data:image/')) {
    const base64Data = imageUrl.split(',')[1]
    if (!base64Data) return { isValid: false, reason: 'Invalid base64 image format' }
    const sizeInBytes = (base64Data.length * 3) / 4
    const maxSize = 5 * 1024 * 1024
    if (sizeInBytes > maxSize) return { isValid: false, reason: 'รูปมีขนาดเกิน 5 เมกะไบต์' }
    const imageType = imageUrl.match(/data:image\/(\w+);base64/)?.[1]
    const allowedTypes = ['jpeg', 'jpg', 'png', 'webp', 'gif']
    if (!imageType || !allowedTypes.includes(imageType.toLowerCase())) {
      return { isValid: false, reason: 'ชนิดไฟล์รูปไม่รองรับ (ใช้ได้ JPEG, PNG, WebP, GIF เท่านั้น)' }
    }
    return { isValid: true }
  }
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    try {
      new URL(imageUrl)
    } catch {
      return { isValid: false, reason: 'ลิงก์รูปไม่ถูกต้อง' }
    }
    return { isValid: true }
  }
  return { isValid: false, reason: 'รูปภาพไม่ถูกต้อง' }
}

export async function checkDuplicateContent(dbQuery, userId, title, description) {
  try {
    const result = await dbQuery(
      `SELECT id, title, created_at
       FROM items
       WHERE user_id = $1
         AND LOWER(title) = LOWER($2)
         AND created_at > NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [userId, title]
    )
    if (result.rowCount > 0) {
      return { isDuplicate: true, reason: 'คุณเพิ่งโพสต์รายการที่ชื่อเหมือนกันเมื่อเร็ว ๆ นี้' }
    }

    if (description && description.length > 20) {
      const similarResult = await dbQuery(
        `SELECT id FROM items WHERE user_id = $1
           AND description IS NOT NULL AND LENGTH(description) > 20
           AND created_at > NOW() - INTERVAL '1 hour' AND description = $2 LIMIT 1`,
        [userId, description]
      )
      if (similarResult.rowCount > 0) {
        return { isDuplicate: true, reason: 'คุณเพิ่งโพสต์คำอธิบายที่เหมือนกันเมื่อเร็ว ๆ นี้' }
      }
    }
    return { isDuplicate: false }
  } catch (err) {
    console.error('Duplicate check:', err)
    return { isDuplicate: false }
  }
}

function dataUrlToBuffer(dataUrl) {
  const m = /^data:image\/(\w+);base64,(.+)$/i.exec(dataUrl.trim())
  if (!m) return null
  const type = (m[1] || '').toLowerCase()
  try {
    return { buffer: Buffer.from(m[2], 'base64'), mime: type === 'jpg' ? 'image/jpeg' : `image/${type}` }
  } catch {
    return null
  }
}

async function moderateOneImageBuffer(buffer, mimeHint) {
  const se = await moderateImageBufferSightengine(buffer, mimeHint)
  if (!se.skipped) {
    if (se.allowed === false) {
      return { allowed: false, reasonTh: se.reasonTh, code: se.code }
    }
    return { allowed: true }
  }

  if (process.env.DISABLE_IMAGE_MODERATION === '1' || process.env.DISABLE_IMAGE_MODERATION === 'true') {
    return { allowed: true }
  }

  try {
    const tf = await import('@tensorflow/tfjs-node')
    const nsfwjs = await import('nsfwjs')
    let imageTensor = null
    try {
      imageTensor = tf.node.decodeImage(buffer, 3)
      const model = await nsfwjs.load()
      const predictions = await model.classify(imageTensor)
      const byName = Object.fromEntries(predictions.map((p) => [p.className, p.probability]))
      const porn = byName.Porn ?? 0
      const hentai = byName.Hentai ?? 0
      const sexy = byName.Sexy ?? 0
      if (porn >= 0.35 || hentai >= 0.35 || sexy >= 0.92) {
        return {
          allowed: false,
          reasonTh:
            'รูปภาพไม่เหมาะสม (เข้าข่ายอนาจาร/โป้) — เปลี่ยนรูปหรือตั้ง Sightengine เพื่อกรองอาวุธในรูปให้เข้มงวดขึ้น',
          code: 'IMAGE_NSFW',
        }
      }
    } finally {
      if (imageTensor) imageTensor.dispose()
    }
    return { allowed: true }
  } catch (err) {
    console.error('[moderation] image nsfw:', err?.message || err)
    return {
      allowed: false,
      reasonTh:
        'ระบบตรวจสอบรูปภาพไม่พร้อม กรุณาลองใหม่ภายหลัง หรือติดตั้ง/ตั้งค่า Sightengine API (ในขณะพัฒนาใช้ DISABLE_IMAGE_MODERATION=1 ได้ถ้าจำเป็น)',
      code: 'IMAGE_MODERATION_UNAVAILABLE',
    }
  }
}

export async function moderateItemImageUrls(urls) {
  const list = Array.isArray(urls) ? urls : []
  const models =
    process.env.SIGHTENGINE_MODELS ||
    'nudity-2.1,weapon,gore-2.0,offensive,text-content'

  for (const url of list) {
    const shape = validateImage(url)
    if (!shape.isValid) return { allowed: false, reasonTh: shape.reason, code: 'IMAGE_INVALID' }

    if (typeof url === 'string' && url.startsWith('data:image/')) {
      const decoded = dataUrlToBuffer(url)
      if (!decoded?.buffer?.length) return { allowed: false, reasonTh: 'อ่านรูปจากข้อมูลไม่สำเร็จ', code: 'IMAGE_DECODE' }
      const r = await moderateOneImageBuffer(decoded.buffer, decoded.mime)
      if (!r.allowed) return r
      continue
    }

    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      if (!isSightengineConfigured()) continue
      try {
        const params = new URLSearchParams({
          url,
          models,
          api_user: process.env.SIGHTENGINE_API_USER,
          api_secret: process.env.SIGHTENGINE_API_SECRET,
        }).toString()
        const res = await fetch(`${SIGHTENGINE_GET}?${params}`, { signal: AbortSignal.timeout(28000) })
        const data = await res.json().catch(() => ({}))
        const out = evaluateSightengineOutput(data)
        if (!out.allowed) return out
      } catch {
        return { allowed: false, reasonTh: 'ตรวจสอบรูปจากลิงก์ไม่สำเร็จ', code: 'SIGHTENGINE_URL' }
      }
    }
  }

  return { allowed: true }
}
