-- แกลเลอรีรูปสินค้า (สูงสุด 3 รูป) — เก็บ JSON array ของ URL/base64; image_url = รูปแรกเพื่อความเข้ากันกับโค้ดเดิม
ALTER TABLE items ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE items
SET image_urls = to_jsonb(ARRAY[image_url]::text[])
WHERE image_url IS NOT NULL
  AND TRIM(image_url) <> ''
  AND image_urls = '[]'::jsonb;
