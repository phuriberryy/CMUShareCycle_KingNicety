import { useState } from 'react'
import { Heart, X } from 'lucide-react'
import Modal from '../ui/Modal'
import { donationApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function DonateModal({ open, onClose, item, onSuccess }) {
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientContact: '',
    donationLocation: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { token } = useAuth()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await donationApi.create(token, {
        itemId: item.id,
        recipientName: formData.recipientName || null,
        recipientContact: formData.recipientContact || null,
        donationLocation: formData.donationLocation || null,
        message: formData.message || null,
      })

      if (onSuccess) {
        onSuccess()
      }
      onClose()
      // Reset form
      setFormData({
        recipientName: '',
        recipientContact: '',
        donationLocation: '',
        message: '',
      })
    } catch (err) {
      setError(err.message || 'Failed to donate item')
    } finally {
      setSubmitting(false)
    }
  }

  if (!item) return null

  return (
    <Modal open={open} onClose={onClose}>
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-8 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Heart size={24} className="text-red-500" />
            <h2 className="text-2xl font-bold text-gray-900">ยืนยันการบริจาค</h2>
          </div>
          <p className="text-sm text-gray-600">
            คุณกำลังจะบริจาค <strong>{item.title}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Recipient Name (Optional) */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              ชื่อผู้รับ <span className="text-gray-400">(ไม่บังคับ)</span>
            </label>
            <input
              type="text"
              name="recipientName"
              value={formData.recipientName}
              onChange={handleInputChange}
              placeholder="กรอกชื่อผู้รับ (ถ้ามี)"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            />
          </div>

          {/* Recipient Contact (Optional) */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              ช่องทางติดต่อ <span className="text-gray-400">(ไม่บังคับ)</span>
            </label>
            <input
              type="text"
              name="recipientContact"
              value={formData.recipientContact}
              onChange={handleInputChange}
              placeholder="เบอร์โทร / Line ID / อีเมล"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            />
          </div>

          {/* สถานที่รับของ (ไม่บังคับ) */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              จุดนัดส่งมอบ <span className="text-gray-400">(ไม่บังคับ)</span>
            </label>
            <input
              type="text"
              name="donationLocation"
              value={formData.donationLocation}
              onChange={handleInputChange}
              placeholder="เช่น หอสมุดกลาง / คณะ / หน้าโรงอาหาร"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            />
          </div>

          {/* Message (Optional) */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              ข้อความเพิ่มเติม <span className="text-gray-400">(ไม่บังคับ)</span>
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={4}
              placeholder="เขียนสั้นๆ เช่น สะดวกนัดรับวันไหน/ช่วงเวลา"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {submitting ? 'กำลังบันทึก...' : 'ยืนยันบริจาค'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

