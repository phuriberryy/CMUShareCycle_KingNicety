-- =============================================
-- Migration: Gamification System
-- แต้มสะสม (Points) + Leaderboard
-- =============================================

-- เพิ่ม recipient_id ใน donation_history (ถ้ายังไม่มี)
ALTER TABLE donation_history ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES users(id);

-- เพิ่มฟิลด์แต้มสะสมใน users
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_exchanges INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_donations INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_co2_reduced DECIMAL(10,2) DEFAULT 0;

-- ตาราง user_points: บันทึกประวัติการได้/เสียแต้มทุกครั้ง
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_created ON user_points(created_at DESC);

-- Backfill: คำนวณแต้มจากข้อมูลเดิมที่มีอยู่แล้ว
-- ให้แต้มจาก exchange_history ที่มีอยู่ (15 แต้มต่อครั้ง ต่อคน)
INSERT INTO user_points (user_id, points, reason, reference_type, reference_id, created_at)
SELECT owner_id, 15, 'exchange_completed', 'exchange_history', id, exchanged_at
FROM exchange_history
WHERE NOT EXISTS (
  SELECT 1 FROM user_points up 
  WHERE up.reference_id = exchange_history.id 
  AND up.user_id = exchange_history.owner_id
  AND up.reason = 'exchange_completed'
);

INSERT INTO user_points (user_id, points, reason, reference_type, reference_id, created_at)
SELECT requester_id, 15, 'exchange_completed', 'exchange_history', id, exchanged_at
FROM exchange_history
WHERE NOT EXISTS (
  SELECT 1 FROM user_points up 
  WHERE up.reference_id = exchange_history.id 
  AND up.user_id = exchange_history.requester_id
  AND up.reason = 'exchange_completed'
);

-- ให้แต้มจาก donation_history ที่มีอยู่ (20 แต้ม ผู้ให้ / 5 แต้ม ผู้รับ)
INSERT INTO user_points (user_id, points, reason, reference_type, reference_id, created_at)
SELECT donor_id, 20, 'donation_completed_donor', 'donation_history', id, donated_at
FROM donation_history
WHERE donor_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM user_points up 
  WHERE up.reference_id = donation_history.id 
  AND up.user_id = donation_history.donor_id
  AND up.reason = 'donation_completed_donor'
);

INSERT INTO user_points (user_id, points, reason, reference_type, reference_id, created_at)
SELECT recipient_id, 5, 'donation_completed_recipient', 'donation_history', id, donated_at
FROM donation_history
WHERE recipient_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM user_points up 
  WHERE up.reference_id = donation_history.id 
  AND up.user_id = donation_history.recipient_id
  AND up.reason = 'donation_completed_recipient'
);

-- อัพเดต total_points, total_exchanges, total_donations, total_co2_reduced ใน users
UPDATE users SET total_points = COALESCE((
  SELECT SUM(points) FROM user_points WHERE user_points.user_id = users.id
), 0);

UPDATE users SET total_exchanges = COALESCE((
  SELECT COUNT(*) FROM exchange_history 
  WHERE exchange_history.owner_id = users.id OR exchange_history.requester_id = users.id
), 0);

UPDATE users SET total_donations = COALESCE((
  SELECT COUNT(*) FROM donation_history 
  WHERE donation_history.donor_id = users.id OR donation_history.recipient_id = users.id
), 0);

UPDATE users SET total_co2_reduced = COALESCE((
  SELECT SUM(co2_reduced) FROM exchange_history 
  WHERE exchange_history.owner_id = users.id OR exchange_history.requester_id = users.id
), 0) + COALESCE((
  SELECT SUM(co2_reduced) FROM donation_history 
  WHERE donation_history.donor_id = users.id OR donation_history.recipient_id = users.id
), 0);
