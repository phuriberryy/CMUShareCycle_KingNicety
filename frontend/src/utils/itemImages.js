/** จำนวนรูปสินค้าสูงสุดต่อรายการ (สอดคล้องกับ backend) */
export const MAX_ITEM_GALLERY = 3

/** รายการ URL/base64 ของแกลเลอรี (รูปแรก = ปก) */
export function getGalleryUrlsFromItem(item) {
  if (!item) return []
  const raw = item.image_urls
  if (Array.isArray(raw) && raw.length) {
    return raw.filter(Boolean).slice(0, MAX_ITEM_GALLERY)
  }
  if (item.image_url) return [item.image_url]
  return []
}

/** รูปปกสำหรับแสดงในรายการย่อ */
export function itemCoverUrl(item) {
  const urls = getGalleryUrlsFromItem(item)
  return urls[0] || null
}
