import { useState, useEffect } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import Modal from '../ui/Modal'
import { itemsApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function EditItemModal({ open, onClose, item, onSuccess }) {
  const toast = useToast()
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    condition: '',
    lookingFor: '',
    availableUntil: '',
    pickupLocation: '',
    description: '',
  })
  const [imagePreview, setImagePreview] = useState(null)
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
      setImagePreview(item.image_url || null)
    }
  }, [item, open])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token || !item) {
      toast.warning('กรุณาเข้าสู่ระบบก่อนแก้ไขโพสต์', 'ยังไม่ได้เข้าสู่ระบบ')
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
        imageUrl: imagePreview,
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
        {/* Image Upload */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            Upload Image <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="image-upload-edit"
          />
          <label
            htmlFor="image-upload-edit"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center transition hover:border-primary hover:bg-primary/5"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="h-48 w-full rounded-lg object-cover"
              />
            ) : (
              <>
                <ImageIcon className="mb-3 text-gray-400" size={48} />
                <p className="mb-1 text-sm font-medium text-gray-700">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
              </>
            )}
          </label>
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

