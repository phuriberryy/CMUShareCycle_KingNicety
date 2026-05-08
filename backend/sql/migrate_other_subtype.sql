-- Migration: other_subtype column on items
-- เพิ่มคอลัมน์ระบุประเภทย่อยสำหรับสินค้าหมวด "Others"
-- ใช้ในการคำนวณ CO₂ footprint ให้แม่นยำขึ้น เพราะของในหมวด Others มีความหลากหลายมาก
-- (เช่น โน้ตบุ๊ก ~250 kg vs ปากกา ~0.3 kg)

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS other_subtype TEXT;

-- ไม่ต้อง backfill ค่าเก่า — ปล่อยเป็น NULL จะ fallback เป็นค่าเฉลี่ยของ Others
