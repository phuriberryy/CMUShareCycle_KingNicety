import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  MessageCircle,
  Clock,
  ArrowLeft,
  Package,
  MapPin,
} from 'lucide-react'
import { exchangeApi, chatApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { calculateItemCO2, calculateExchangeCO2Reduction } from '../utils/co2Calculator'

export default function ExchangeRequestDetailPage() {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const toast = useToast()
  const [exchangeRequest, setExchangeRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [imageErrors, setImageErrors] = useState({ owner: false, requester: false })

  useEffect(() => {
    const fetchExchangeRequest = async () => {
      if (!token || !requestId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await exchangeApi.getById(token, requestId)
        setExchangeRequest(data)
        setError(null)
        // Reset image errors when new data is loaded
        setImageErrors({ owner: false, requester: false })
      } catch (err) {
        console.error('Failed to fetch exchange request:', err)
        setError(err.message || 'Exchange request not found')
      } finally {
        setLoading(false)
      }
    }

    fetchExchangeRequest()
  }, [token, requestId])

  const handleAccept = async () => {
    if (!token || processing || !exchangeRequest) return

    try {
      setProcessing(true)
      
      // Check if user is owner or requester based on the data
      const isOwner = exchangeRequest.user_role === 'owner'
      
      let response
      if (isOwner) {
        response = await exchangeApi.acceptByOwner(token, requestId)
      } else {
        // Check if owner has accepted before allowing requester to accept
        if (!exchangeRequest.owner_accepted) {
          toast.warning('กรุณารอให้เจ้าของโพสต์ยอมรับคำขอแลกเปลี่ยนก่อน', 'รอการยืนยัน')
          setProcessing(false)
          return
        }
        response = await exchangeApi.acceptByRequester(token, requestId)
      }
      
      // Use data from response directly (if available) or refresh
      let updatedData = response?.exchangeRequest || response
      
      if (!updatedData || !updatedData.id) {
      // Refresh data
        updatedData = await exchangeApi.getById(token, requestId)
      }
      
      // Update state
      setExchangeRequest(updatedData)
      
      // Don't show alert or redirect - let user click "Start Chat" button
    } catch (err) {
      console.error('Failed to accept exchange:', err)
      // If error but status may have been updated, refresh data again
      try {
        const data = await exchangeApi.getById(token, requestId)
        const bothAccepted = data.owner_accepted && data.requester_accepted
        const isChatting = data.status === 'chatting'
        
        if (isChatting || bothAccepted) {
          setExchangeRequest(data)
          toast.success('ยอมรับคำขอแลกเปลี่ยนสำเร็จ!', 'สำเร็จ')
        } else {
          toast.error('ไม่สามารถยอมรับคำขอแลกเปลี่ยนได้: ' + (err.message || 'เกิดข้อผิดพลาด'), 'เกิดข้อผิดพลาด')
        }
      } catch (refreshErr) {
        toast.error('ไม่สามารถยอมรับคำขอแลกเปลี่ยนได้: ' + (err.message || 'เกิดข้อผิดพลาด'), 'เกิดข้อผิดพลาด')
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!token || processing || !exchangeRequest) return

    if (!window.confirm('Are you sure you want to reject this exchange request?')) {
      return
    }

    try {
      setProcessing(true)
      await exchangeApi.reject(token, requestId)
      toast.success('ปฏิเสธคำขอแลกเปลี่ยนสำเร็จ', 'สำเร็จ')
      navigate('/profile')
    } catch (err) {
      console.error('Failed to reject exchange:', err)
      toast.error('ไม่สามารถปฏิเสธคำขอแลกเปลี่ยนได้: ' + (err.message || 'เกิดข้อผิดพลาด'), 'เกิดข้อผิดพลาด')
    } finally {
      setProcessing(false)
    }
  }

  const handleStartChat = async () => {
    if (!token || !exchangeRequest) return

    try {
      const chats = await chatApi.list(token)
      const chat = chats.find((c) =>
        String(c.exchange_request_id || c.exchangeRequestId || '') === String(requestId) ||
        (c.creator_id === exchangeRequest.owner_id && c.participant_id === exchangeRequest.requester_id) ||
        (c.creator_id === exchangeRequest.requester_id && c.participant_id === exchangeRequest.owner_id)
      )

      const chatId = chat?.id
      if (chatId) {
        navigate('/chat', { state: { chatId: String(chatId) } })
      } else {
        toast.error('ไม่พบห้องแชทที่เกี่ยวข้อง', 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      console.error('Failed to start chat:', err)
      toast.error('ไม่สามารถเริ่มแชทได้: ' + (err.message || 'เกิดข้อผิดพลาด'), 'เกิดข้อผิดพลาด')
    }
  }

  const formatTimeAgo = (date) => {
    if (!date) return 'ไม่ทราบเวลา'
    const now = new Date()
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return 'ไม่ทราบเวลา'
    const diff = now - dateObj
    if (isNaN(diff)) return 'ไม่ทราบเวลา'
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'เมื่อสักครู่'
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
    return `${days} วันที่แล้ว`
  }

  const getStatusLabel = () => {
    if (!exchangeRequest) return 'Waiting for response'
    if (exchangeRequest.status === 'completed') return 'เสร็จสิ้น'
    if (exchangeRequest.status === 'in_progress') return 'กำลังดำเนินการ'
    if (exchangeRequest.status === 'chatting') return 'พร้อมแชท'
    if (exchangeRequest.status === 'rejected') return 'ถูกปฏิเสธ'
    if (exchangeRequest.owner_accepted && exchangeRequest.requester_accepted) return 'พร้อมแชท'
    if (exchangeRequest.owner_accepted || exchangeRequest.requester_accepted) return 'รอการตอบรับ'
    return 'รอการตอบรับ'
  }

  const getStatusColor = () => {
    if (!exchangeRequest) return 'bg-yellow-100 text-yellow-800'
    if (exchangeRequest.status === 'completed') return 'bg-primary/10 text-primary-dark'
    if (exchangeRequest.status === 'in_progress') return 'bg-blue-100 text-blue-800'
    if (exchangeRequest.status === 'chatting') return 'bg-primary/10 text-primary-dark'
    if (exchangeRequest.status === 'rejected') return 'bg-red-100 text-red-800'
    if (exchangeRequest.owner_accepted && exchangeRequest.requester_accepted) return 'bg-primary/10 text-primary-dark'
    return 'bg-yellow-100 text-yellow-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="rounded-2xl border border-gray-200 bg-white p-12 shadow-sm">
            <p className="text-lg text-gray-600">กำลังโหลด...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !exchangeRequest) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="rounded-2xl border border-gray-200 bg-white p-12 shadow-sm">
            <p className="text-lg text-red-600">{error || 'ไม่พบคำขอแลกเปลี่ยน'}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 rounded-full bg-primary px-6 py-3 text-white"
            >
              กลับหน้าแรก
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isOwner = exchangeRequest.user_role === 'owner'
  const otherUserName = isOwner ? exchangeRequest.requester_name : exchangeRequest.owner_name
  const otherUser = otherUserName || (isOwner ? 'Requester' : 'Post Owner')
  const otherUserFaculty = isOwner ? exchangeRequest.requester_faculty : exchangeRequest.owner_faculty
  const otherUserAvatar = isOwner ? exchangeRequest.requester_avatar_url : exchangeRequest.owner_avatar_url
  const bothAccepted = exchangeRequest.owner_accepted && exchangeRequest.requester_accepted
  const currentUserAccepted = isOwner ? exchangeRequest.owner_accepted : exchangeRequest.requester_accepted
  const otherUserAccepted = isOwner ? exchangeRequest.requester_accepted : exchangeRequest.owner_accepted
  const showChatButton = exchangeRequest.status === 'chatting' || bothAccepted
  // Show "Waiting for the other party to accept" message only when current user has accepted but the other hasn't
  const showWaitingMessage = currentUserAccepted && !otherUserAccepted
  // Show accept/reject buttons only when user hasn't accepted yet and status is still pending or chatting
  const canAccept = !currentUserAccepted && (exchangeRequest.status === 'pending' || exchangeRequest.status === 'chatting')
  const canReject = !currentUserAccepted && (exchangeRequest.status === 'pending' || exchangeRequest.status === 'chatting')

  // Calculate CO₂ footprint and CO₂ reduced
  const calculateCO2 = () => {
    if (!exchangeRequest.item_category || !exchangeRequest.item_condition) return null
    
    const co2Footprint = calculateItemCO2(exchangeRequest.item_category, exchangeRequest.item_condition)
    const co2Reduced = calculateExchangeCO2Reduction(co2Footprint)
    
    return {
      footprint: parseFloat(co2Footprint.toFixed(2)),
      reduced: parseFloat(co2Reduced.toFixed(2)),
    }
  }

  const co2Data = calculateCO2()

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 overflow-x-hidden">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      {/* Header Section */}
      <div className="mb-6 flex flex-col sm:flex-row items-start gap-4">
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary text-xl sm:text-2xl font-bold text-white flex-shrink-0">
          {otherUserAvatar ? (
            <img src={otherUserAvatar} alt={otherUser} className="h-full w-full rounded-full object-cover" />
          ) : (
            <span>{(otherUser && otherUser.charAt(0)) || 'U'}</span>
          )}
        </div>
        <div className="flex-1 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{otherUser}</h1>
            {otherUserFaculty && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {otherUserFaculty}
              </span>
            )}
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor()}`}>
              {getStatusLabel()}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{formatTimeAgo(exchangeRequest.created_at)}</p>
        </div>
      </div>

      {/* Exchange Request Card */}
      <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={20} className="text-primary" />
            <span className="text-lg font-semibold text-gray-900">คำขอแลกเปลี่ยน</span>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-700">
            ID: {exchangeRequest.id ? exchangeRequest.id.slice(0, 8) : 'N/A'}
          </span>
        </div>

        {/* Items Display */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Owner's Item (Left side - Post owner's item) */}
          <div className="flex-1 rounded-[16px] bg-white p-4 shadow-sm">
            <div className="mb-3 aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
              {exchangeRequest.item_image_url && !imageErrors.owner ? (
                <img
                  key={`owner-${exchangeRequest.id}-${exchangeRequest.item_image_url?.substring(0, 50)}`}
                  src={
                    exchangeRequest.item_image_url?.startsWith('data:') 
                      ? exchangeRequest.item_image_url 
                      : `${exchangeRequest.item_image_url}?t=${Date.now()}`
                  }
                  alt={exchangeRequest.item_title || 'Owner item image'}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    console.error('[OWNER ITEM] Failed to load image:', {
                      url: exchangeRequest.item_image_url?.substring(0, 100),
                      title: exchangeRequest.item_title,
                      itemId: exchangeRequest.item_id,
                      urlType: exchangeRequest.item_image_url?.startsWith('data:') ? 'base64' : 'url'
                    })
                    setImageErrors(prev => ({ ...prev, owner: true }))
                  }}
                  onLoad={() => {
                    // Image loaded successfully
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                  <div className="text-center">
                    <Package size={48} className="mx-auto mb-2" />
                    <p className="text-xs">
                      {exchangeRequest.item_image_url ? 'โหลดรูปไม่สำเร็จ' : 'ไม่มีรูป'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="mb-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">
                  {exchangeRequest.item_title || 'ไม่มีชื่อสินค้า'}
                </h3>
                {exchangeRequest.item_pickup_location && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                    <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                    <span>{exchangeRequest.item_pickup_location}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {exchangeRequest.item_category && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-gray-700">
                {exchangeRequest.item_category}
              </span>
              )}
              {exchangeRequest.item_condition && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-gray-700">
                {exchangeRequest.item_condition}
              </span>
              )}
            </div>
            {exchangeRequest.item_description && (
              <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                {exchangeRequest.item_description}
              </p>
            )}
          </div>

          {/* Exchange Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white flex-shrink-0 mx-auto sm:mx-0">
            <RefreshCw size={24} />
          </div>

          {/* Requester's Item (Right side - Requester's item) */}
          <div className="flex-1 rounded-[16px] bg-white p-4 shadow-sm">
            <div className="mb-3 aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
              {exchangeRequest.requester_item_image_url && !imageErrors.requester ? (
                <img
                  key={`requester-${exchangeRequest.id}-${exchangeRequest.requester_item_image_url?.substring(0, 50)}`}
                  src={
                    exchangeRequest.requester_item_image_url?.startsWith('data:') 
                      ? exchangeRequest.requester_item_image_url 
                      : `${exchangeRequest.requester_item_image_url}?t=${Date.now()}`
                  }
                  alt={exchangeRequest.requester_item_name || 'สินค้าของผู้ขอ'}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    console.error('[REQUESTER ITEM] Failed to load image:', {
                      url: exchangeRequest.requester_item_image_url?.substring(0, 100),
                      name: exchangeRequest.requester_item_name,
                      category: exchangeRequest.requester_item_category,
                      urlType: exchangeRequest.requester_item_image_url?.startsWith('data:') ? 'base64' : 'url'
                    })
                    setImageErrors(prev => ({ ...prev, requester: true }))
                  }}
                  onLoad={() => {
                    // Image loaded successfully
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                  <div className="text-center">
                    <Package size={48} className="mx-auto mb-2" />
                    <p className="text-xs">
                      {exchangeRequest.requester_item_image_url ? 'โหลดรูปไม่สำเร็จ' : 'ไม่มีรูป'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <h3 className="mb-2 font-semibold text-gray-900">
              {exchangeRequest.requester_item_name || 'สินค้าของคุณ'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {exchangeRequest.requester_item_category && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-gray-700">
                  {exchangeRequest.requester_item_category}
                </span>
              )}
              {exchangeRequest.requester_item_condition && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-gray-700">
                  {exchangeRequest.requester_item_condition}
                </span>
              )}
              {!exchangeRequest.requester_item_category && !exchangeRequest.requester_item_condition && (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Your Item
              </span>
              )}
            </div>
            {exchangeRequest.requester_item_description && (
              <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                {exchangeRequest.requester_item_description}
              </p>
            )}
            {exchangeRequest.requester_pickup_location && (
              <p className="mt-1 text-xs text-gray-500">
                📍 {exchangeRequest.requester_pickup_location}
              </p>
            )}
          </div>
        </div>

        {/* Requester's Message */}
        {exchangeRequest.message && (
          <div className="rounded-[16px] bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-700 italic">&quot;{exchangeRequest.message}&quot;</p>
          </div>
        )}

        {/* CO₂ Information */}
        {co2Data && (
          <div className="mt-4 rounded-[16px] bg-primary/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">CO₂ Footprint</p>
                <p className="text-xs text-gray-600">of this item</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">
                  {co2Data.footprint} kg
                </p>
                <p className="text-xs text-gray-600">CO₂e</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status and Action Section */}
      {showChatButton ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle size={24} className="text-primary" />
            <p className="text-lg font-semibold text-gray-900">
              Both parties accepted – Ready to chat!
            </p>
          </div>
          {/* CO₂ Reduction Info */}
          {co2Data && (
            <div className="mb-4 rounded-[16px] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">CO₂ Reduced</p>
                  <p className="text-xs text-gray-600">From this exchange</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {co2Data.reduced} kg
                  </p>
                  <p className="text-xs text-gray-600">CO₂e</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleStartChat}
            className="w-full rounded-full bg-primary px-6 py-4 text-lg font-semibold text-white shadow-card transition hover:bg-primary-dark"
          >
            <div className="flex items-center justify-center gap-2">
              <MessageCircle size={24} />
              <span>Start Chat</span>
            </div>
          </button>
        </div>
      ) : showWaitingMessage ? (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Clock size={24} className="text-yellow-600" />
            <p className="text-lg font-semibold text-gray-900">
              Waiting for the other party to accept
            </p>
          </div>
          <div className="rounded-[16px] bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-700">
              {isOwner
                ? 'You have accepted. Waiting for the requester to accept'
                : 'You have accepted. Waiting for the post owner to accept'}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Clock size={24} className="text-yellow-600" />
            <p className="text-lg font-semibold text-gray-900">
              {isOwner
                ? `${otherUser} wants to exchange with you`
                : `You want to exchange with ${otherUser}`}
            </p>
          </div>
          {(canAccept || canReject) && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={handleAccept}
                disabled={processing}
                className="w-full sm:flex-1 rounded-full bg-primary px-6 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:opacity-50"
              >
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle size={20} className="sm:w-6 sm:h-6" />
                  <span>Accept</span>
                </div>
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="w-full sm:flex-1 rounded-full bg-[#DC2626] px-6 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white shadow-card transition hover:bg-[#B91C1C] disabled:opacity-50"
              >
                <div className="flex items-center justify-center gap-2">
                  <XCircle size={20} className="sm:w-6 sm:h-6" />
                  <span>Reject</span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

