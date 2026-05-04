import { useEffect, useMemo, useRef, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import Modal from '../ui/Modal'
import { itemsApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function PostItemModal({ open, onClose, onSuccess }) {
  const toast = useToast()
  const fileInputRef = useRef(null)

  const getTodayIso = () => new Date().toISOString().split('T')[0]
  const addDaysIso = (days) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    condition: '',
    lookingFor: '',
    availableUntil: addDaysIso(14),
    pickupLocation: '',
    description: '',
    listingType: 'exchange', // 'exchange' or 'donation'
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { token } = useAuth()

  useEffect(() => {
    if (!open) return
    // Reset each time opened to avoid stale data
    setFormData({
      itemName: '',
      category: '',
      condition: '',
      lookingFor: '',
      availableUntil: addDaysIso(14),
      pickupLocation: '',
      description: '',
      listingType: 'exchange',
    })
    setImagePreview(null)
    setSubmitting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [open])

  useEffect(() => {
    // ถ้าเป็นบริจาค ไม่ต้องกรอก lookingFor
    if (formData.listingType !== 'donation') return
    if (!formData.lookingFor) return
    setFormData((prev) => ({ ...prev, lookingFor: '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.listingType])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.warning('ไฟล์ใหญ่เกิน 5MB กรุณาเลือกไฟล์ใหม่', 'รูปภาพใหญ่เกินไป')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const normalized = useMemo(() => {
    const itemName = (formData.itemName || '').trim()
    const description = (formData.description || '').trim()
    const pickupLocation = (formData.pickupLocation || '').trim()
    const lookingFor = (formData.lookingFor || '').trim()
    const availableUntil = formData.availableUntil || ''
    return { itemName, description, pickupLocation, lookingFor, availableUntil }
  }, [formData])

  const canSubmit = useMemo(() => {
    if (submitting) return false
    if (!token) return false
    if (!imagePreview) return false
    if (normalized.itemName.length < 3) return false
    if (!formData.category) return false
    if (!formData.condition) return false
    if (!normalized.description) return false
    if (!normalized.pickupLocation) return false
    if (!normalized.availableUntil) return false
    if (formData.listingType === 'exchange' && !normalized.lookingFor) return false
    return true
  }, [submitting, token, imagePreview, normalized, formData.category, formData.condition, formData.listingType])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      toast.warning('กรุณาเข้าสู่ระบบก่อนโพสต์สินค้า', 'ยังไม่ได้เข้าสู่ระบบ')
      return
    }
    // Validate required fields
    if (!imagePreview) {
      toast.warning('กรุณาอัปโหลดรูปภาพ', 'ข้อมูลไม่ครบ')
      return
    }
    if (!normalized.itemName || !formData.category || !formData.condition) {
      toast.warning('กรุณากรอกข้อมูลที่จำเป็นให้ครบ', 'ข้อมูลไม่ครบ')
      return
    }
    if (normalized.itemName.length < 3) {
      toast.warning('ชื่อสินค้าต้องมีอย่างน้อย 3 ตัวอักษร', 'ข้อมูลไม่ถูกต้อง')
      return
    }
    // Validate lookingFor only for exchange type
    if (formData.listingType === 'exchange' && !normalized.lookingFor) {
      toast.warning('กรุณาระบุสิ่งที่ต้องการแลกเปลี่ยน', 'ข้อมูลไม่ครบ')
      return
    }
    setSubmitting(true)
    try {
      await itemsApi.create(token, {
        // Send both camelCase + snake_case for backend compatibility
        title: normalized.itemName,
        category: formData.category,
        itemCondition: formData.condition,
        item_condition: formData.condition,
        lookingFor: formData.listingType === 'exchange' ? normalized.lookingFor : '',
        looking_for: formData.listingType === 'exchange' ? normalized.lookingFor : '',
        description: normalized.description,
        availableUntil: normalized.availableUntil,
        available_until: normalized.availableUntil,
        imageUrl: imagePreview,
        image_url: imagePreview,
        pickupLocation: normalized.pickupLocation,
        pickup_location: normalized.pickupLocation,
        listingType: formData.listingType,
        listing_type: formData.listingType,
      })
      onSuccess?.()
      onClose()
      toast.success('โพสต์สินค้าสำเร็จ!', 'สำเร็จ')
    } catch (err) {
      const msg = err.errors?.[0]?.msg || err.message || 'ไม่สามารถโพสต์ได้'
      toast.error(msg, 'เกิดข้อผิดพลาด')
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

  const pickupSuggestions = [
    'CMU Library (Main Library)',
    'Engineering Building',
    'CMU Dorm / หอพัก',
    'Faculty Building',
    'Student Union',
    'Nimman (นิมมาน) / นัดใกล้มหาวิทยาลัย',
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formData.listingType === 'donation' ? 'โพสต์เพื่อบริจาค' : 'โพสต์เพื่อแลกเปลี่ยน'}
      subtitle=""
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Listing Type Selection */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900 sm:text-sm">
            ประเภทโพสต์ <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, listingType: 'exchange' }))}
              className={`rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition ${
                formData.listingType === 'exchange'
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              🔄 Exchange
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, listingType: 'donation' }))}
              className={`rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition ${
                formData.listingType === 'donation'
                  ? 'border-red-500 bg-red-500 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              ❤️ Donation
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {formData.listingType === 'donation'
              ? 'บริจาค: ไม่ต้องระบุ “ต้องการแลกอะไร”'
              : 'แลกเปลี่ยน: กรุณาระบุสิ่งที่ต้องการแลก'}
          </p>
        </div>
        {/* Image Upload */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            รูปสินค้า <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="image-upload"
            name="image"
            ref={fileInputRef}
          />
          <label
            htmlFor="image-upload"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center transition hover:border-primary hover:bg-primary/5 sm:p-12"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="h-32 w-full rounded-lg object-cover sm:h-48"
              />
            ) : (
              <>
                <ImageIcon className="mb-2 text-gray-400" size={40} />
                <p className="mb-1 text-xs font-medium text-gray-700 sm:text-sm">
                  คลิกเพื่ออัปโหลดรูป
                </p>
                <p className="text-[11px] text-gray-500 sm:text-xs">PNG/JPG ขนาดไม่เกิน 5MB</p>
              </>
            )}
          </label>
        </div>

        {/* Item Name */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900 sm:text-sm">
            ชื่อสินค้า <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="itemName"
            value={formData.itemName}
            onChange={handleInputChange}
            placeholder="เช่น ตำรา Calculus, หม้อหุงข้าว, ราวตากผ้า"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 sm:py-3 sm:text-base"
            required
          />
          <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">แนะนำให้ใส่ชื่อที่คนค้นหาเจอง่าย (อย่างน้อย 3 ตัวอักษร)</p>
        </div>

        {/* Category and Condition */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-900 sm:text-sm">
              หมวดหมู่ <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 sm:py-3 sm:text-base"
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
            <label className="mb-2 block text-sm font-bold text-gray-900 sm:text-sm">
              สภาพสินค้า <span className="text-red-500">*</span>
            </label>
            <select
              name="condition"
              value={formData.condition}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 sm:py-3 sm:text-base"
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

        {/* Looking to Exchange For - Only show for exchange type */}
        {formData.listingType === 'exchange' && (
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-900 sm:text-sm">
              ต้องการแลกกับอะไร <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="lookingFor"
              value={formData.lookingFor}
              onChange={handleInputChange}
              placeholder="เช่น ชั้นวางโน้ตบุ๊ก, อุปกรณ์ครัว, โคมไฟอ่านหนังสือ"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 sm:py-3 sm:text-base"
              required
            />
            <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
              ระบุให้ชัด จะช่วยให้แมตช์ได้เร็วขึ้น
            </p>
          </div>
        )}

        {/* Expiration Date */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900 sm:text-sm">
            หมดอายุโพสต์ <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="date"
              name="availableUntil"
              value={formData.availableUntil}
              onChange={handleInputChange}
              min={getTodayIso()}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 sm:py-3 sm:text-base"
              required
            />
            <div className="grid grid-cols-3 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, availableUntil: addDaysIso(7) }))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
              >
                +7d
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, availableUntil: addDaysIso(14) }))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
              >
                +14d
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, availableUntil: addDaysIso(30) }))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
              >
                +30d
              </button>
            </div>
          </div>
          <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
            ตั้งวันหมดอายุเพื่อให้รายการไม่ค้างนานเกินไป
          </p>
        </div>

        {/* Pickup Location */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900 sm:text-sm">
            จุดนัดรับ/แลก <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="pickupLocation"
            value={formData.pickupLocation}
            onChange={handleInputChange}
            placeholder="เช่น หอสมุดกลาง, คณะวิศวะ, หน้าโรงอาหาร"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 sm:py-3 sm:text-base"
            required
            list="pickup-suggestions"
          />
          <datalist id="pickup-suggestions">
            {pickupSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-gray-500">
            ระบุให้ชัดเจน (ในมหาวิทยาลัย หรือใกล้มหาวิทยาลัย)
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900 sm:text-sm">
            รายละเอียด <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="บอกสภาพ/ตำหนิ/วิธีนัดรับ เช่น ใช้งานมา 6 เดือน มีรอยเล็กน้อย นัดรับที่หอสมุดช่วงเย็น"
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 resize-none sm:py-3 sm:text-base"
            required
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col justify-end gap-3 border-t border-gray-200 pt-3 sm:flex-row sm:pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full sm:w-auto rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-dark transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'กำลังบันทึก...' : 'โพสต์'}
          </button>
        </div>
      </form>
    </Modal>
  )
}





