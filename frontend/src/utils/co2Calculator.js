// CO₂ Footprint Calculator (Frontend)
// คำนวณคาร์บอนฟุตพรินต์ของแต่ละ item โดยอ้างอิงจาก Life Cycle Assessment (LCA) studies
// สูตรหลัก:
//   itemCO2          = baseCO2 × conditionMultiplier
//   exchangeReduction = avg(co2A, co2B) × reductionFactor
//
// ค่า baseCO2 มี 2 ระดับ:
//   1) Subtype hint จาก keyword ใน title/description/otherSubtype (แม่นยำกว่า)
//   2) ค่าเฉลี่ยของ category (fallback)
//
// หมวด "Others" ผู้โพสต์จะกรอกชนิดสินค้าเองเป็น free-text (เช่น "โน้ตบุ๊ก Dell", "ปากกา Pilot")
// แล้วระบบจับ keyword จากข้อความนั้นเพื่อคำนวณ CO₂ ให้สมจริงขึ้น
// เช่น "MacBook" → 250 kg, "iPhone" → 80 kg, "ปากกา" → 0.3 kg
//
// ⚠️ หากปรับสูตรหลัก ต้อง sync กับ backend/src/shared/utils/co2Calculator.js

// ค่า CO₂ footprint ต่อ category (kg CO₂e ต่อ 1 item) — ค่าเฉลี่ยจาก LCA
const CO2_BY_CATEGORY = Object.freeze({
  'Clothes & Fashion': 12.0,
  'Dorm Essentials': 14.0,
  'Books & Study': 4.0,
  'Kitchen & Appliances': 18.0,
  'Cleaning & Laundry': 3.0,
  'Hobbies & Entertainment': 10.0,
  'Sports Gear': 12.0,
  Others: 8.0,
})

// Multiplier ตามสภาพสินค้า (ส่วนของ embedded carbon ที่ยังคงเหลืออยู่)
const CONDITION_MULTIPLIER = Object.freeze({
  'Like New': 0.92,
  Good: 0.72,
  Fair: 0.5,
})

// ความยาวสูงสุดของช่อง other_subtype (free-text ที่ผู้โพสต์กรอกเมื่อเลือก Others)
export const OTHER_SUBTYPE_MAX_LENGTH = 80

// Subtype hints — ใช้ keyword ในชื่อ/รายละเอียด/other_subtype เพื่อปรับ CO₂ ให้สมจริงขึ้น
// สำคัญมากกับหมวด "Others" ที่ผู้โพสต์กรอกชนิดสินค้าเอง
// เรียงจากเฉพาะเจาะจงไปยังกว้าง (รายการที่ตรงก่อนจะชนะ)
const SUBTYPE_HINTS = Object.freeze([
  // Electronics (high embedded carbon)
  { match: ['macbook', 'laptop', 'โน้ตบุ๊ก', 'โน๊ตบุ๊ค', 'โน้ตบุ้ค'], co2: 250.0 },
  { match: ['ipad', 'tablet', 'แท็บเล็ต'], co2: 130.0 },
  { match: ['iphone', 'galaxy', 'phone', 'มือถือ', 'โทรศัพท์', 'samsung'], co2: 80.0 },
  { match: ['monitor', 'จอคอม', 'หน้าจอ', 'screen'], co2: 70.0 },
  { match: ['printer', 'ปริ้นเตอร์', 'เครื่องพิมพ์'], co2: 50.0 },
  { match: ['camera', 'dslr', 'mirrorless', 'กล้อง'], co2: 60.0 },
  { match: ['headphone', 'หูฟัง', 'earbuds', 'airpods'], co2: 15.0 },
  { match: ['speaker', 'ลำโพง'], co2: 12.0 },
  { match: ['charger', 'ที่ชาร์จ', 'adapter', 'อะแดปเตอร์'], co2: 3.0 },
  { match: ['cable', 'สายชาร์จ', 'usb'], co2: 1.5 },

  // Furniture
  { match: ['mattress', 'ที่นอน'], co2: 70.0 },
  { match: ['bed', 'เตียง'], co2: 60.0 },
  { match: ['sofa', 'โซฟา'], co2: 80.0 },
  { match: ['desk', 'โต๊ะ'], co2: 35.0 },
  { match: ['chair', 'เก้าอี้'], co2: 25.0 },
  { match: ['shelf', 'ชั้นวาง', 'ตู้'], co2: 30.0 },

  // Kitchen specifics
  { match: ['microwave', 'ไมโครเวฟ'], co2: 80.0 },
  { match: ['rice cooker', 'หม้อหุงข้าว'], co2: 45.0 },
  { match: ['airfryer', 'air fryer', 'หม้อทอด'], co2: 50.0 },
  { match: ['blender', 'เครื่องปั่น'], co2: 25.0 },
  { match: ['kettle', 'กาต้มน้ำ'], co2: 12.0 },
  { match: ['pan', 'pot', 'กระทะ', 'หม้อ'], co2: 8.0 },

  // Clothing specifics
  { match: ['shoes', 'รองเท้า', 'sneaker', 'sneakers'], co2: 14.0 },
  { match: ['jacket', 'coat', 'แจ็คเก็ต', 'เสื้อโค้ท'], co2: 25.0 },
  { match: ['jeans', 'กางเกงยีน', 'ยีน'], co2: 25.0 },
  { match: ['dress', 'เดรส', 'กระโปรง'], co2: 12.0 },
  { match: ['shirt', 'tee', 't-shirt', 'เสื้อยืด'], co2: 7.0 },
  { match: ['sock', 'ถุงเท้า', 'underwear', 'ชุดชั้นใน'], co2: 2.0 },

  // Books / study
  { match: ['textbook', 'ตำรา'], co2: 3.0 },
  { match: ['book', 'หนังสือ'], co2: 2.0 },
  { match: ['notebook', 'สมุด'], co2: 0.5 },
  { match: ['pen', 'ปากกา', 'pencil', 'ดินสอ'], co2: 0.3 },

  // Bags & accessories
  { match: ['backpack', 'เป้', 'กระเป๋าเป้'], co2: 12.0 },
  { match: ['bag', 'กระเป๋า'], co2: 8.0 },
  { match: ['watch', 'นาฬิกา'], co2: 5.0 },

  // Sports specifics
  { match: ['bicycle', 'จักรยาน'], co2: 100.0 },
  { match: ['football', 'basketball', 'ลูกบอล', 'ลูกฟุตบอล'], co2: 4.0 },
  { match: ['yoga mat', 'เสื่อโยคะ'], co2: 5.0 },
  { match: ['dumbbell', 'น้ำหนัก', 'ดัมเบล'], co2: 8.0 },
])

// แปลง alias/ค่าที่สะกดต่างรูปแบบให้เป็น key มาตรฐาน
const CATEGORY_ALIASES = Object.freeze({
  'Clothes and Fashion': 'Clothes & Fashion',
  Fashion: 'Clothes & Fashion',
  Dorm: 'Dorm Essentials',
  Books: 'Books & Study',
  Kitchen: 'Kitchen & Appliances',
  Cleaning: 'Cleaning & Laundry',
  Hobbies: 'Hobbies & Entertainment',
  Sports: 'Sports Gear',
  Other: 'Others',
})

const CONDITION_ALIASES = Object.freeze({
  Excellent: 'Like New',
  New: 'Like New',
  Normal: 'Good',
  Used: 'Good',
  Poor: 'Fair',
})

const DEFAULT_CATEGORY = 'Others'
const DEFAULT_CONDITION = 'Good'
const EXCHANGE_REDUCTION_FACTOR = 0.75

/**
 * ปัดทศนิยมให้คงที่ (default = 2 ตำแหน่ง)
 * @param {number} value
 * @param {number} digits
 * @returns {number}
 */
function round(value, digits = 2) {
  const safe = Number.isFinite(value) ? value : 0
  return Number(safe.toFixed(digits))
}

/**
 * แปลงค่าให้อยู่ในรูป category มาตรฐาน
 * @param {string} category
 * @returns {string}
 */
function normalizeCategory(category) {
  if (!category || typeof category !== 'string') return DEFAULT_CATEGORY
  const trimmed = category.trim()
  return CO2_BY_CATEGORY[trimmed] ? trimmed : (CATEGORY_ALIASES[trimmed] || DEFAULT_CATEGORY)
}

/**
 * แปลงค่าให้อยู่ในรูป condition มาตรฐาน
 * @param {string} condition
 * @returns {string}
 */
function normalizeCondition(condition) {
  if (!condition || typeof condition !== 'string') return DEFAULT_CONDITION
  const trimmed = condition.trim()
  return CONDITION_MULTIPLIER[trimmed] ? trimmed : (CONDITION_ALIASES[trimmed] || DEFAULT_CONDITION)
}

/**
 * แปลงค่า input เป็นตัวเลข CO2 ที่ปลอดภัย
 * @param {number|string} value
 * @returns {number}
 */
function toSafeCo2Number(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

/**
 * จับคู่ subtype จากชื่อ/รายละเอียดสินค้าเพื่อปรับ baseCO2
 * @param {{ title?: string, description?: string }|null|undefined} hints
 * @returns {{ co2: number, matched: string[] }|null}
 */
function matchSubtype(hints) {
  if (!hints || typeof hints !== 'object') return null
  // รวม otherSubtype + title + description (otherSubtype มาก่อนเพราะเฉพาะเจาะจงสูง)
  const text = `${hints.otherSubtype || ''} ${hints.title || ''} ${hints.description || ''}`
    .toLowerCase()
    .trim()
  if (!text) return null
  for (const hint of SUBTYPE_HINTS) {
    const matchedKeyword = hint.match.find((kw) => text.includes(kw.toLowerCase()))
    if (matchedKeyword) {
      return { co2: hint.co2, matched: hint.match.slice(), keyword: matchedKeyword }
    }
  }
  return null
}

/**
 * คำนวณ CO2 footprint ของ item
 * ลำดับการเลือก baseCO2 (จากแม่นยำสุด → fallback):
 *   1) keyword detection จาก otherSubtype + title + description
 *   2) ค่าเฉลี่ยของหมวด (CO2_BY_CATEGORY)
 * @param {string} category
 * @param {string} condition
 * @param {{ title?: string, description?: string, otherSubtype?: string }} [hints]
 * @returns {number} CO2 footprint ในหน่วย kg CO2e
 */
export function calculateItemCO2(category, condition, hints) {
  const normalizedCategory = normalizeCategory(category)
  const normalizedCondition = normalizeCondition(condition)
  const subtypeMatch = matchSubtype(hints)
  const baseCO2 = subtypeMatch ? subtypeMatch.co2 : CO2_BY_CATEGORY[normalizedCategory]
  const multiplier = CONDITION_MULTIPLIER[normalizedCondition]
  return round(baseCO2 * multiplier)
}

/**
 * คำนวณ CO2 ที่ลดได้จากการแลกเปลี่ยน
 * @param {number|string} co2Item1 - CO2 footprint ของ item แรก
 * @param {number|string|null} [co2Item2] - CO2 footprint ของ item ที่สอง (optional)
 * @returns {number} CO2 ที่ลดได้ในหน่วย kg CO2e
 */
export function calculateExchangeCO2Reduction(co2Item1, co2Item2 = null) {
  const first = toSafeCo2Number(co2Item1)
  const second = co2Item2 === null || co2Item2 === undefined ? null : toSafeCo2Number(co2Item2)

  if (second === null) {
    return round(first * EXCHANGE_REDUCTION_FACTOR)
  }

  const averageCO2 = (first + second) / 2
  return round(averageCO2 * EXCHANGE_REDUCTION_FACTOR)
}

/**
 * เวอร์ชันละเอียดสำหรับแสดง breakdown ใน UI/Analytics
 * @param {string} category
 * @param {string} condition
 * @param {{ title?: string, description?: string }} [hints]
 * @returns {{
 *   category: string,
 *   condition: string,
 *   baseCO2: number,
 *   multiplier: number,
 *   totalCO2: number,
 *   subtypeKeyword: string|null,
 *   methodology: string
 * }}
 */
export function calculateItemCO2Detailed(category, condition, hints) {
  const normalizedCategory = normalizeCategory(category)
  const normalizedCondition = normalizeCondition(condition)
  const subtypeMatch = matchSubtype(hints)
  const baseCO2 = subtypeMatch ? subtypeMatch.co2 : CO2_BY_CATEGORY[normalizedCategory]
  const multiplier = CONDITION_MULTIPLIER[normalizedCondition]
  const totalCO2 = round(baseCO2 * multiplier)

  const methodology = subtypeMatch
    ? `ใช้ keyword "${subtypeMatch.keyword}" จากชื่อ/รายละเอียด/ประเภทย่อย`
    : `ใช้ค่าเฉลี่ยของหมวด "${normalizedCategory}"`

  return {
    category: normalizedCategory,
    condition: normalizedCondition,
    baseCO2: round(baseCO2),
    multiplier: round(multiplier, 3),
    totalCO2,
    subtypeKeyword: subtypeMatch?.keyword || null,
    otherSubtype: hints?.otherSubtype || null,
    methodology,
  }
}

/**
 * ดึงค่า CO2 footprint ตาม category
 * @param {string} category - Category ของ item
 * @returns {number} CO2 footprint ในหน่วย kg CO2e
 */
export function getCO2ByCategory(category) {
  const normalizedCategory = normalizeCategory(category)
  return round(CO2_BY_CATEGORY[normalizedCategory])
}

/**
 * ดึงค่า multiplier ตาม condition
 * @param {string} condition
 * @returns {number}
 */
export function getConditionMultiplier(condition) {
  const normalizedCondition = normalizeCondition(condition)
  return round(CONDITION_MULTIPLIER[normalizedCondition], 3)
}

/**
 * ดึงค่า CO2 footprint ทั้งหมด (copy เพื่อกันการแก้ไขภายนอก)
 * @returns {Record<string, number>}
 */
export function getAllCO2Footprints() {
  return { ...CO2_BY_CATEGORY }
}

/**
 * ดึงรายการ condition multiplier ทั้งหมด
 * @returns {Record<string, number>}
 */
export function getAllConditionMultipliers() {
  return { ...CONDITION_MULTIPLIER }
}
