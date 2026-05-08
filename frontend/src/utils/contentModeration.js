/**
 * กรองข้อความโพสต์ (ฝั่ง client) — logic ควรสอดคล้องกับ backend/src/shared/utils/contentModeration.js
 */

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

const EN_WEAPON_PROMO = ['sell gun', 'buy gun', 'ammo for sale', 'bullet sale', 'grenade', 'explosives']

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

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizeTextForModeration(input) {
  if (!input || typeof input !== 'string') return ''
  let s = input.normalize('NFKC').replace(/\u200b|\uFEFF/g, '')
  s = s.toLowerCase()
  s = s.replace(/[.\s*_\-:·•\\/|[\]()]+/g, '')
  return s.replace(/@/g, 'a').replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/\$/g, 's').replace(/5/g, 's').replace(/7/g, 't').replace(/\*/g, '')
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
    if (compact.includes(phrase.replace(/\s+/g, ''))) {
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
