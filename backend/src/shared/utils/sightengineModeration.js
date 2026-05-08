/**
 * Optional Sightengine image moderation (requires SIGHTENGINE_API_USER + SIGHTENGINE_API_SECRET).
 * Covers nudity, weapons, gore, offensive gestures, OCR text policies.
 */

import FormData from 'form-data'

const API_URL = 'https://api.sightengine.com/1.0/check.json'

/** Max nested probability to treat as weapon / gore signal */
function maxNumericLeaf(obj, depth = 0) {
  if (depth > 8) return 0
  if (typeof obj === 'number' && Number.isFinite(obj)) return obj
  if (!obj || typeof obj !== 'object') return 0
  let m = 0
  for (const v of Object.values(obj)) {
    if (typeof v === 'number' && Number.isFinite(v)) m = Math.max(m, v)
    else if (typeof v === 'object') m = Math.max(m, maxNumericLeaf(v, depth + 1))
  }
  return m
}

/** Nudity-2.x style flat scores */
function maxNudityRisk(nudity) {
  if (!nudity || typeof nudity !== 'object') return 0
  const keys = ['sexual_activity', 'sexual_display', 'erotica', 'very_suggestive', 'suggestive']
  let m = 0
  for (const k of keys) {
    const v = nudity[k]
    if (typeof v === 'number' && Number.isFinite(v)) m = Math.max(m, v)
  }
  return m
}

/**
 * Interpret Sightengine JSON. Thresholds are conservative defaults.
 */
export function evaluateSightengineOutput(data) {
  if (!data || typeof data !== 'object') {
    return { allowed: false, reasonTh: 'บริการตรวจสอบรูปภาพไม่ได้คำตอบที่ถูกต้อง กรุณาลองใหม่', code: 'SIGHTENGINE_FAIL' }
  }
  if (data.status === 'failure') {
    return { allowed: false, reasonTh: 'บริการตรวจสอบรูปภาพรายงานข้อผิดพลาด กรุณาตรวจสอบ API key หรือลองใหม่', code: 'SIGHTENGINE_FAIL' }
  }

  const nudityRisk = maxNudityRisk(data.nudity)
  if (nudityRisk >= 0.42) {
    return { allowed: false, reasonTh: 'พบภาพที่มีลักษณะอนาจารหรือไม่เหมาะสม ไม่สามารถโพสต์ได้', code: 'IMAGE_ADULT' }
  }

  const weaponRisk = maxNumericLeaf(data.weapon)
  if (weaponRisk >= 0.42) {
    return { allowed: false, reasonTh: 'พบภาพที่มีอาวุธหรือสิ่งที่เกี่ยวข้อง ไม่สามารถโพสต์ได้', code: 'IMAGE_WEAPON' }
  }

  const goreRisk = maxNumericLeaf(data.gore)
  if (goreRisk >= 0.52) {
    return { allowed: false, reasonTh: 'พบภาพความรุนแรงหรือฉากน่ารังเกียจ ไม่สามารถโพสต์ได้', code: 'IMAGE_GORE' }
  }

  const offensiveRisk = maxNumericLeaf(data.offensive)
  if (offensiveRisk >= 0.55) {
    return { allowed: false, reasonTh: 'พบภาพที่มีความเกลียดชังหรือท่าทางไม่เหมาะสม ไม่สามารถโพสต์ได้', code: 'IMAGE_OFFENSIVE' }
  }

  const textProf =
    typeof data?.text_profanity?.profanity === 'number'
      ? data.text_profanity.profanity
      : typeof data?.['text-content']?.profanity === 'number'
        ? data['text-content'].profanity
        : maxNumericLeaf(data.text_profanity ?? data['text-content'])
  if (textProf >= 0.5) {
    return { allowed: false, reasonTh: 'พบข้อความในรูปที่ไม่เหมาะสม ไม่สามารถโพสต์ได้', code: 'IMAGE_TEXT' }
  }

  return { allowed: true }
}

export function isSightengineConfigured() {
  return Boolean(process.env.SIGHTENGINE_API_USER && process.env.SIGHTENGINE_API_SECRET)
}

/**
 * @param {Buffer} buffer
 * @param {string} [mimeHint] e.g. image/jpeg
 */
export async function moderateImageBufferSightengine(buffer, mimeHint = 'image/jpeg') {
  if (!isSightengineConfigured()) {
    return { skipped: true }
  }
  const user = process.env.SIGHTENGINE_API_USER
  const secret = process.env.SIGHTENGINE_API_SECRET
  const models =
    process.env.SIGHTENGINE_MODELS ||
    'nudity-2.1,weapon,gore-2.0,offensive,text-content'

  const form = new FormData()
  let ext = 'jpg'
  if (mimeHint.includes('png')) ext = 'png'
  else if (mimeHint.includes('webp')) ext = 'webp'
  else if (mimeHint.includes('gif')) ext = 'gif'

  form.append('media', buffer, { filename: `upload.${ext}`, contentType: mimeHint })
  form.append('models', models)
  form.append('api_user', user)
  form.append('api_secret', secret)

  const res = await fetch(API_URL, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
    signal: AbortSignal.timeout(28_000),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { allowed: false, reasonTh: 'ไม่สามารถเชื่อมต่อบริการตรวจสอบรูปภาพได้', code: 'SIGHTENGINE_HTTP' }
  }
  return evaluateSightengineOutput(data)
}
