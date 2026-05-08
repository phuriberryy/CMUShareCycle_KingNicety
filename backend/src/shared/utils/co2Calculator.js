// CO₂ Footprint Calculator (Backend)
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
// ⚠️ หากปรับสูตรหลัก ต้อง sync กับ frontend/src/utils/co2Calculator.js

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

const CONDITION_MULTIPLIER = Object.freeze({
  'Like New': 0.92,
  Good: 0.72,
  Fair: 0.5,
})

// ความยาวสูงสุดของช่อง other_subtype (free-text ที่ผู้โพสต์กรอกเมื่อเลือก Others)
export const OTHER_SUBTYPE_MAX_LENGTH = 80

// Subtype hints — ใช้ keyword ในชื่อ/รายละเอียด/other_subtype เพื่อปรับ CO₂ ให้สมจริงขึ้น
// (เรียงจากเฉพาะเจาะจงไปยังกว้าง — รายการที่ตรงก่อนจะชนะ)
const SUBTYPE_HINTS = Object.freeze([
  // Electronics
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

const EXCHANGE_REDUCTION_FACTOR = 0.75
const DEFAULT_CATEGORY = 'Others'
const DEFAULT_CONDITION = 'Good'

function round(value, digits = 2) {
  const safe = Number.isFinite(value) ? value : 0
  return Number(safe.toFixed(digits))
}

function normalizeCategory(category) {
  if (!category || typeof category !== 'string') return DEFAULT_CATEGORY
  const trimmed = category.trim()
  return CO2_BY_CATEGORY[trimmed] ? trimmed : DEFAULT_CATEGORY
}

function normalizeCondition(condition) {
  if (!condition || typeof condition !== 'string') return DEFAULT_CONDITION
  const trimmed = condition.trim()
  return CONDITION_MULTIPLIER[trimmed] ? trimmed : DEFAULT_CONDITION
}

function toSafeCo2Number(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function matchSubtype(hints) {
  if (!hints || typeof hints !== 'object') return null
  // รวม title + description + otherSubtype (ที่ผู้โพสต์กรอกเองเมื่อเลือก Others)
  // ให้ otherSubtype มาก่อน เพราะมีความเฉพาะเจาะจงสูง
  const text = `${hints.otherSubtype || ''} ${hints.title || ''} ${hints.description || ''}`
    .toLowerCase()
    .trim()
  if (!text) return null
  for (const hint of SUBTYPE_HINTS) {
    const matchedKeyword = hint.match.find((kw) => text.includes(kw.toLowerCase()))
    if (matchedKeyword) {
      return { co2: hint.co2, keyword: matchedKeyword }
    }
  }
  return null
}

/**
 * คำนวณ CO₂ footprint ของ item
 * ลำดับการเลือก baseCO2: keyword detection (รวม otherSubtype) → category average
 * @param {string} category
 * @param {string} condition
 * @param {{ title?: string, description?: string, otherSubtype?: string }} [hints]
 * @returns {number} CO₂ footprint ในหน่วย kg CO₂e
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
 * คำนวณ CO₂ ที่ลดได้จากการแลกเปลี่ยน
 * @param {number} co2Item1
 * @param {number} [co2Item2]
 * @returns {number} CO₂ ที่ลดได้ในหน่วย kg CO₂e
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
 * คำนวณ CO₂ ของ item คู่หนึ่งและ CO₂ ที่ลดได้จากการแลกเปลี่ยน
 * @param {{ category: string, item_condition: string, title?: string, description?: string }} item1
 * @param {{ category: string, item_condition: string, title?: string, description?: string }} item2
 * @returns {{ co2Item1: number, co2Item2: number, co2Reduced: number }}
 */
export function calculateExchangeCO2(item1, item2) {
  const co2Item1 = calculateItemCO2(item1?.category, item1?.item_condition, {
    title: item1?.title,
    description: item1?.description,
    otherSubtype: item1?.other_subtype,
  })
  const co2Item2 = calculateItemCO2(item2?.category, item2?.item_condition, {
    title: item2?.title,
    description: item2?.description,
    otherSubtype: item2?.other_subtype,
  })
  const co2Reduced = calculateExchangeCO2Reduction(co2Item1, co2Item2)

  return {
    co2Item1: round(co2Item1),
    co2Item2: round(co2Item2),
    co2Reduced: round(co2Reduced),
  }
}

/**
 * ดึงค่า CO₂ footprint ตาม category (สำหรับ baseline)
 */
export function getCO2ByCategory(category) {
  const normalizedCategory = normalizeCategory(category)
  return round(CO2_BY_CATEGORY[normalizedCategory])
}

/**
 * ดึงค่า CO₂ footprint ทั้งหมด
 */
export function getAllCO2Footprints() {
  return { ...CO2_BY_CATEGORY }
}
