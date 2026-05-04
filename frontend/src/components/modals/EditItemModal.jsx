import { useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import Modal from '../ui/Modal'
import { itemsApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { MAX_ITEM_GALLERY, getGalleryUrlsFromItem } from '../../utils/itemImages'

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })

export default function EditItemModal({ open, onClose, item, onSuccess }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    condition: '',
    lookingFor: '',
    availableUntil: '',
    pickupLocation: '',
    description: '',
  })
  const [imagePreviews, setImagePreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const { token } = useAuth()

  useEffect(() => {
    if (item && open) {
      setFormData({
        itemName: item.title || '',
        category: item.category || '',
        condition: item.item_condition || '',
        lookingFor: item.looking_for || '',
        availableUntil: item.available_until ? item.available_until.split('T')[0] : '',
        pickupLocation: item.pickup_location || '',
        description: item.description || '',
      })
      setImagePreviews(getGalleryUrlsFromItem(item))
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [item, open])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!files.length) return

    setImagePreviews((prev) => {
      const room = MAX_ITEM_GALLERY - prev.length
      if (room <= 0) {
        toast.warning('เพิ่มได้ไม่เกิน 3 รูป', 'เกินจำนวน')
        return prev
      }
      void (async () => {
        let next = [...prev]
        for (const file of files) {
          if (next.length >= MAX_ITEM_GALLERY) break
          if (file.size > 5 * 1024 * 1024) {
            toast.warning('ไฟล์ใหญ่เกิน 5MB', 'รูปภาพใหญ่เกินไป')
            continue
          }
          try {
            const dataUrl = await readFileAsDataUrl(file)
            next = [...next, dataUrl].slice(0, MAX_ITEM_GALLERY)
          } catch {
            toast.error('อ่านไฟล์ไม่สำเร็จ', 'เกิดข้อผิดพลาด')
          }
        }
        setImagePreviews(next)
      })()
      return prev
    })
  }

  const removeImageAt = (index) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token || !item) {
      toast.warning('กรุณาเข้าสู่ระบบก่อนแก้ไขโพสต์', 'ยังไม่ได้เข้าสู่ระบบ')
      return
    }
    if (imagePreviews.length === 0) {
      toast.warning('ต้องมีรูปสินค้าอย่างน้อย 1 รูป', 'ข้อมูลไม่ครบ')
      return
    }
    setSubmitting(true)
    try {
      await itemsApi.update(token, item.id, {
        title: formData.itemName,
        category: formData.category,
        itemCondition: formData.condition,
        lookingFor: formData.lookingFor,
        description: formData.description,
        availableUntil: formData.availableUntil,
        imageUrl: imagePreviews[0],
        imageUrls: imagePreviews,
        pickupLocation: formData.pickupLocation,
      })
      toast.success('แก้ไขโพสต์สำเร็จ!', 'สำเร็จ')
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถแก้ไขโพสต์ได้', 'เกิดข้อผิดพลาด')
    } finally {
      setSubmitting(false)
    }
  }

  const categoryOptions = [
    { value: '', label: 'เลือกหมวดหมู่' },
    { value: 'Clothes & Fashion', label: '👕 Clothes & Fashion (เสื้อผ้า, กางเกง, รองเท้า)' },
    { value: 'Dorm Essentials', label: '🏡 Dorm Essentials (หม้อหุงข้าว, ราวตากผ้า, ผ้าห่ม)' },
    { value: 'Books & Study', label: '📚 Books & Study (ตำราเรียน, สมุด, ไฟอ่านหนังสือ)' },
    { value: 'Kitchen & Appliances', label: '🍳 Kitchen & Appliances (กระทะ, เขียง, หม้อทอด)' },
    { value: 'Cleaning & Laundry', label: '🧼 Cleaning & Laundry (น้ำยาซักผ้า, ไม้ถูพื้น, ไม้กวาด)' },
    { value: 'Hobbies & Entertainment', label: '🎮 Hobbies & Entertainment (บอร์ดเกม, กีตาร์, ของสะสม)' },
    { value: 'Sports Gear', label: '🏀 Sports Gear (รองเท้ากีฬา, ลูกบอล, เสื่อโยคะ)' },
    { value: 'Others', label: '✨ Others (อื่น ๆ)' },
  ]

  const conditionOptions = [
    { value: '', label: 'เลือกสภาพ' },
    { value: 'Like New', label: 'เหมือนใหม่' },
    { value: 'Good', label: 'ดี' },
    { value: 'Fair', label: 'พอใช้' },
  ]

  if (!item) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Post"
      subtitle="Edit your posted item information"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload — up to 3 */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            รูปสินค้า <span className="text-red-500">*</span>
            <span className="ml-1 font-normal text-gray-500">(สูงสุด {MAX_ITEM_GALLERY} รูป)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
            id="image-upload-edit"
            ref={fileInputRef}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {imagePreviews.map((src, idx) => (
              <div
                key={`edit-${idx}-${String(src).slice(0, 24)}`}
                className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
              >
                <img src={src} alt="" className="aspect-[4/3] h-36 w-full object-cover sm:h-40" />
                <button
                  type="button"
                  onClick={() => removeImageAt(idx)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                  aria-label="ลบรูป"
                >
                  <X size={16} />
                </button>
                {idx === 0 ? (
                  <span className="absolute bottom-2 left-2 rounded-md bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                    ปก
                  </span>
                ) : null}
              </div>
            ))}
            {imagePreviews.length < MAX_ITEM_GALLERY ? (
              <label
                htmlFor="image-upload-edit"
                className="flex min-h-[9rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center transition hover:border-primary hover:bg-primary/5"
              >
                <ImageIcon className="mb-2 text-gray-400" size={36} />
                <p className="mb-1 text-xs font-medium text-gray-700 sm:text-sm">คลิกเพื่อเพิ่มรูป</p>
                <p className="text-[11px] text-gray-500">ไม่เกิน 5 เมกะไบต์ต่อไฟล์</p>
              </label>
            ) : null}
          </div>
        </div>

        {/* Item Name */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="itemName"
            value={formData.itemName}
            onChange={handleInputChange}
            placeholder="e.g., Calculus Textbook"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            required
          />
        </div>

        {/* Category and Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-900">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
              required
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-900">
              Condition <span className="text-red-500">*</span>
            </label>
            <select
              name="condition"
              value={formData.condition}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
              required
            >
              {conditionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Looking to Exchange For */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            ต้องการแลกกับ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="lookingFor"
            value={formData.lookingFor}
            onChange={handleInputChange}
            placeholder="e.g., Laptop stand, Kitchen utensils, Study desk"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            required
          />
        </div>

        {/* Expiration Date */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            Post Expiration Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="availableUntil"
            value={formData.availableUntil}
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0]}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            required
          />
        </div>

        {/* Pickup Location */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            Pickup Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="pickupLocation"
            value={formData.pickupLocation}
            onChange={handleInputChange}
            placeholder="e.g., Engineering Building, Library 1st floor"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            รายละเอียด <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="บอกสภาพ/ตำหนิ/รายละเอียดสำคัญ เช่น ใช้งานมา 6 เดือน มีรอยเล็กน้อย"
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 resize-none"
            required
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-dark transition disabled:opacity-60"
          >
            {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

