import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../ui/Modal'
import { donationRequestApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function DonationRequestModal({ open, onClose, itemId }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [recipientName, setRecipientName] = useState('')
  const [recipientContact, setRecipientContact] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { token } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      toast.warning('กรุณาเข้าสู่ระบบก่อนส่งคำขอรับบริจาค', 'ยังไม่ได้เข้าสู่ระบบ')
      return
    }
    if (!itemId) {
      toast.error('ไม่พบสินค้า กรุณาลองใหม่', 'เกิดข้อผิดพลาด')
      return
    }

    if (!recipientName.trim()) {
      toast.warning('กรุณากรอกชื่อผู้รับ', 'ข้อมูลไม่ครบ')
      return
    }
    if (!recipientContact.trim()) {
      toast.warning('กรุณากรอกข้อมูลติดต่อ', 'ข้อมูลไม่ครบ')
      return
    }

    setSubmitting(true)
    try {
      const response = await donationRequestApi.request(token, {
        itemId,
        recipientName: recipientName.trim(),
        recipientContact: recipientContact.trim(),
        message: message.trim() || undefined,
      })
      
      // Navigate to donation request detail page
      navigate(`/donation-requests/${response.id}`)
      onClose()
      setRecipientName('')
      setRecipientContact('')
      setMessage('')
    toast.success('ส่งคำขอรับบริจาคสำเร็จ!', 'สำเร็จ')
    } catch (err) {
      console.error('Donation request error:', err)
      let errorMsg = err.message || 'ไม่สามารถส่งคำขอได้'
      
      if (err.existingRequestId) {
        // If request already exists, navigate to that request
        toast.info('คุณมีคำขอรับบริจาคสำหรับสินค้านี้อยู่แล้ว', 'มีคำขออยู่แล้ว')
        navigate(`/donation-requests/${err.existingRequestId}`)
        onClose()
        return
      }
      
      toast.error(errorMsg, 'เกิดข้อผิดพลาด')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request Donation"
      subtitle="Enter recipient details to send a request to the post owner"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipient Name */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            Recipient Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Enter recipient name"
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
          />
        </div>

        {/* Recipient Contact */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            Recipient Contact <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={recipientContact}
            onChange={(e) => setRecipientContact(e.target.value)}
            placeholder="Phone number, email, or other contact information"
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
          />
        </div>

        {/* Message */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            Additional Message <span className="text-gray-500">(Optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell the owner why you want to receive this donation..."
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-red-600 transition disabled:opacity-60"
          >
            {submitting ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

