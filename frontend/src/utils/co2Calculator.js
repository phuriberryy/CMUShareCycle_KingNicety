// CO2 Footprint Calculator (Frontend)
// คำนวณ CO2 footprint ต่อ item และผลการลด CO2 จากการแลกเปลี่ยน/บริจาค
// หมายเหตุ: หากมีการปรับสูตรหลัก ต้อง sync กับ backend/src/shared/utils/co2Calculator.js

// ค่า CO2 footprint ต่อ category (kg CO2e ต่อ 1 item)
const CO2_BY_CATEGORY = Object.freeze({
  'Clothes & Fashion': 8.0, // เสื้อผ้า, กางเกง, รองเท้า
  'Dorm Essentials': 10.0, // หม้อหุงข้าว, ราวตากผ้า, ผ้าห่ม
  'Books & Study': 20.0, // ตำราเรียน, สมุด, ไฟอ่านหนังสือ
  'Kitchen & Appliances': 15.0, // กระทะ, เขียง, หม้อทอด
  'Cleaning & Laundry': 6.0, // น้ำยาซักผ้า, ไม้ถูพื้น, ไม้กวาด
  'Hobbies & Entertainment': 10.0, // บอร์ดเกม, กีตาร์, ของสะสม
  'Sports Gear': 10.0, // รองเท้ากีฬา, ลูกบอล, เสื่อโยคะ
  Others: 5.0, // อื่น ๆ
})

// Multiplier ตามสภาพสินค้า
const CONDITION_MULTIPLIER = Object.freeze({
  'Like New': 0.9,
  Good: 0.7,
  Fair: 0.5,
})

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
 * คำนวณ CO2 footprint ของ item
 * @param {string} category - Category ของ item
 * @param {string} condition - Condition ของ item (Like New, Good, Fair)
 * @returns {number} CO2 footprint ในหน่วย kg CO2e
 */
export function calculateItemCO2(category, condition) {
  const normalizedCategory = normalizeCategory(category)
  const normalizedCondition = normalizeCondition(condition)
  const baseCO2 = CO2_BY_CATEGORY[normalizedCategory]
  const multiplier = CONDITION_MULTIPLIER[normalizedCondition]
  return round(baseCO2 * multiplier)
}

/**
 * คำนวณ CO2 ที่ลดได้จากการแลกเปลี่ยน
 * @param {number|string} co2Item1 - CO2 footprint ของ item แรก
 * @param {number|string|null} co2Item2 - CO2 footprint ของ item ที่สอง (optional)
 * @returns {number} CO2 ที่ลดได้ในหน่วย kg CO2e
 */
export function calculateExchangeCO2Reduction(co2Item1, co2Item2 = null) {
  const first = toSafeCo2Number(co2Item1)
  const second = co2Item2 === null ? null : toSafeCo2Number(co2Item2)

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
 * @returns {{
 *  category: string,
 *  condition: string,
 *  baseCO2: number,
 *  multiplier: number,
 *  totalCO2: number
 * }}
 */
export function calculateItemCO2Detailed(category, condition) {
  const normalizedCategory = normalizeCategory(category)
  const normalizedCondition = normalizeCondition(condition)
  const baseCO2 = CO2_BY_CATEGORY[normalizedCategory]
  const multiplier = CONDITION_MULTIPLIER[normalizedCondition]
  const totalCO2 = round(baseCO2 * multiplier)

  return {
    category: normalizedCategory,
    condition: normalizedCondition,
    baseCO2: round(baseCO2),
    multiplier: round(multiplier, 3),
    totalCO2,
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







