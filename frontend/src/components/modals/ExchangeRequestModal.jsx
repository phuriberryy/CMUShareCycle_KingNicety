import { useState } from 'react'
import { CheckCircle, Image as ImageIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Modal from '../ui/Modal'
import { exchangeApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { compressImageFile } from '../../utils/imageCompression'

export default function ExchangeRequestModal({ open, onClose, itemId }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    condition: '',
    description: '',
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [includeMessage, setIncludeMessage] = useState(true)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { token } = useAuth()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressImageFile(file)
      setImagePreview(dataUrl)
    } catch {
      // fallback: read as-is
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      toast.warning('กรุณาเข้าสู่ระบบก่อนส่งคำขอแลกเปลี่ยน', 'ยังไม่ได้เข้าสู่ระบบ')
      return
    }
    if (!itemId) {
      toast.error('ไม่พบสินค้า กรุณาลองใหม่', 'เกิดข้อผิดพลาด')
      return
    }

    // Validate form fields
    if (!formData.itemName.trim()) {
      toast.warning('กรุณากรอกชื่อสินค้าของคุณ', 'ข้อมูลไม่ครบ')
      return
    }
    if (!formData.category) {
      toast.warning('กรุณาเลือกหมวดหมู่', 'ข้อมูลไม่ครบ')
      return
    }
    if (!formData.condition) {
      toast.warning('กรุณาเลือกสภาพสินค้า', 'ข้อมูลไม่ครบ')
      return
    }
    if (!formData.description.trim()) {
      toast.warning('กรุณากรอกรายละเอียดสินค้า', 'ข้อมูลไม่ครบ')
      return
    }

    setSubmitting(true)
    try {
      // Convert image to base64 if exists
      let imageUrl = null
      if (imagePreview) {
        imageUrl = imagePreview // imagePreview is already base64 from FileReader
      }

      const payload = {
        itemId,
        message: message || undefined,
        requesterItemName: formData.itemName || undefined,
        requesterItemCategory: formData.category || undefined,
        requesterItemCondition: formData.condition || undefined,
        requesterItemDescription: formData.description || undefined,
        requesterItemImageUrl: imageUrl || undefined,
      }

      await exchangeApi.request(token, payload)
      toast.success('ส่งคำขอแลกเปลี่ยนสำเร็จ!', 'สำเร็จ')
      onClose()
      setFormData({
        itemName: '',
        category: '',
        condition: '',
        description: '',
      })
      setMessage('')
      setImagePreview(null)
    } catch (err) {
      console.error('Exchange request error:', err)
      let errorMsg = err.message || (err.errors && JSON.stringify(err.errors)) || 'ส่งคำขอไม่สำเร็จ'

      if (errorMsg.includes('Invalid token') || errorMsg.includes('Unauthorized')) {
        errorMsg = 'เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่'
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else if (errorMsg.includes('You cannot exchange your own item')) {
        errorMsg = 'ไม่สามารถขอแลกเปลี่ยนกับสินค้าของตัวเองได้'
      } else if (errorMsg.includes('already exists') || errorMsg.includes('already sent')) {
        errorMsg = 'คุณส่งคำขอแลกเปลี่ยนสำหรับสินค้าชิ้นนี้ไปแล้ว'
      }
      
      // ถ้ามี existingRequestId แสดงข้อความและนำไปยังคำขอที่มีอยู่
      if (err.existingRequestId) {
        toast.info(errorMsg, 'มีคำขอแลกเปลี่ยนอยู่แล้ว')
        onClose()
        navigate(`/exchange/${err.existingRequestId}`)
      } else {
        toast.error(errorMsg, 'ไม่สามารถส่งคำขอได้')
      }
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ขอแลกเปลี่ยน"
      subtitle=""
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            รูปสินค้าของคุณ <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center transition hover:border-primary hover:bg-primary/5"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="ตัวอย่างรูป"
                className="h-48 w-full rounded-lg object-cover"
              />
            ) : (
              <>
                <ImageIcon className="mb-3 text-gray-400" size={48} />
                <p className="mb-1 text-sm font-medium text-gray-700">
                  คลิกเพื่ออัปโหลดรูป
                </p>
                <p className="text-xs text-gray-500">PNG/JPG ขนาดไม่เกิน 5MB</p>
              </>
            )}
          </label>
        </div>

        {/* Item Name */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            ชื่อสินค้าของคุณ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="itemName"
            value={formData.itemName}
            onChange={handleInputChange}
            placeholder="เช่น โต๊ะอ่านหนังสือ"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            required
          />
        </div>

        {/* Category and Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-900">
              หมวดหมู่ <span className="text-red-500">*</span>
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
              สภาพสินค้า <span className="text-red-500">*</span>
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

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            รายละเอียด <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="บอกสภาพ/ตำหนิ/รายละเอียดสำคัญ เช่น ใช้งานมา 3 เดือน มีรอยเล็กน้อย"
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 resize-none"
            required
          />
        </div>

        {/* Message */}
        <div>
          <label className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
            <input
              type="checkbox"
              checked={includeMessage}
              onChange={(e) => setIncludeMessage(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>ส่งข้อความถึงเจ้าของโพสต์</span>
          </label>
          {includeMessage && (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="เขียนสั้นๆ เพื่อให้เจ้าของโพสต์เข้าใจ เช่น สะดวกนัดรับช่วงไหน"
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 resize-none"
            />
          )}
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
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-dark transition disabled:opacity-60"
          >
            <CheckCircle size={18} />
            {submitting ? 'กำลังส่ง...' : 'ส่งคำขอ'}
          </button>
        </div>
      </form>
    </Modal>
  )
}







