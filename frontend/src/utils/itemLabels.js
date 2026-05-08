// แปลงค่า category / condition จากค่าใน DB (อังกฤษ) เป็นข้อความภาษาไทยสำหรับ UI
// other_subtype เป็น free-text ที่ผู้โพสต์กรอกเอง — แสดงตามที่กรอกได้เลย

const CATEGORY_LABEL_TH = Object.freeze({
  'Clothes & Fashion': 'เสื้อผ้า แฟชั่น',
  'Dorm Essentials': 'ของใช้ในหอ',
  'Books & Study': 'หนังสือ การเรียน',
  'Kitchen & Appliances': 'ครัว เครื่องใช้',
  'Cleaning & Laundry': 'ทำความสะอาด ซักผ้า',
  'Hobbies & Entertainment': 'งานอดิเรก ความบันเทิง',
  'Sports Gear': 'กีฬา',
  Others: 'อื่นๆ',
})

const CONDITION_LABEL_TH = Object.freeze({
  'Like New': 'เหมือนใหม่',
  Good: 'ดี',
  Fair: 'พอใช้',
})

// ความยาวสูงสุดที่จะแสดง other_subtype บน chip/badge (ป้องกันยาวเกิน UI)
const OTHER_SUBTYPE_DISPLAY_MAX = 24

function truncateSubtype(text) {
  if (!text) return ''
  const trimmed = String(text).trim()
  if (trimmed.length <= OTHER_SUBTYPE_DISPLAY_MAX) return trimmed
  return `${trimmed.slice(0, OTHER_SUBTYPE_DISPLAY_MAX - 1)}…`
}

/**
 * แปลง category เป็นภาษาไทย ถ้าเป็นหมวด Others และมี otherSubtype (free-text)
 * จะแสดง subtype นั้นแทน เพราะ informative กว่า "อื่นๆ" เฉยๆ
 * @param {string} category
 * @param {string} [otherSubtype] - ข้อความที่ผู้โพสต์กรอกเอง
 * @returns {string}
 */
export function getCategoryLabel(category, otherSubtype) {
  if (!category) return ''
  if (category === 'Others' && otherSubtype && String(otherSubtype).trim()) {
    return truncateSubtype(otherSubtype)
  }
  return CATEGORY_LABEL_TH[category] || category
}

/**
 * แปลง condition เป็นภาษาไทย
 * @param {string} condition
 * @returns {string}
 */
export function getConditionLabel(condition) {
  if (!condition) return ''
  return CONDITION_LABEL_TH[condition] || condition
}

/**
 * คืนค่า other_subtype แบบสั้น (truncate ถ้ายาวเกิน) สำหรับ chip/badge
 * @param {string} subtype
 * @returns {string}
 */
export function getOtherSubtypeShortLabel(subtype) {
  return truncateSubtype(subtype)
}
