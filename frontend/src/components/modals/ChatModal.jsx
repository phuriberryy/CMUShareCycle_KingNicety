import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Html5Qrcode } from 'html5-qrcode'
import { io } from 'socket.io-client'
import { Link } from 'react-router-dom'
import { Send, MessageCircle, Loader2, Check, X, QrCode, CheckCheck, MapPin, Trash2, ImagePlus, Camera, ArrowLeft } from 'lucide-react'
import Modal from '../ui/Modal'
import { API_BASE, chatApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const SOCKET_URL = API_BASE.replace(/\/api$/, '')

function formatMessageTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isYesterday = new Date(now.getTime() - 864e5).toDateString() === d.toDateString()
  if (isToday) return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  if (isYesterday) return 'เมื่อวาน ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatModal({ open, onClose, initialChatId, asPage = false }) {
  const { token, user } = useAuth()
  const toast = useToast()
  const [chats, setChats] = useState([])
  const [chatMeta, setChatMeta] = useState({})
  const [messages, setMessages] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [chatActionLoading, setChatActionLoading] = useState(false)
  const [confirmingQr, setConfirmingQr] = useState(false)
  const [qrMode, setQrMode] = useState('camera')
  const [qrCodeInput, setQrCodeInput] = useState('')
  const [qrError, setQrError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isQrExpanded, setIsQrExpanded] = useState(true);
  const [showChatList, setShowChatList] = useState(true) // For mobile: show chat list or chat view
  const [deletingChatId, setDeletingChatId] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showCameraCapture, setShowCameraCapture] = useState(false)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const cameraVideoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const socketRef = useRef(null)
  const bottomRef = useRef(null)
  const activeChatRef = useRef(null)
  const scanLockRef = useRef(false)
  const qrCodeScannerRef = useRef(null)
  const qrCodeReaderRef = useRef(null)
  
  const CHAT_META_STORAGE_KEY = 'sharecycle_chat_meta_v1'

  const readChatMeta = useCallback(() => {
    try {
      const raw = localStorage.getItem(CHAT_META_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : {}
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }, [])

  const writeChatMeta = useCallback((next) => {
    try {
      localStorage.setItem(CHAT_META_STORAGE_KEY, JSON.stringify(next || {}))
    } catch {
      // ignore
    }
  }, [])

  const bumpChatToTop = useCallback((chatId) => {
    if (!chatId) return
    setChats((prev) => {
      const idx = prev.findIndex((c) => c?.id === chatId)
      if (idx <= 0) return prev
      const next = [...prev]
      const [moved] = next.splice(idx, 1)
      next.unshift(moved)
      return next
    })
  }, [])

  const updateChatMeta = useCallback((chatId, patch) => {
    if (!chatId) return
    setChatMeta((prev) => {
      const next = { ...(prev || {}) }
      next[chatId] = { ...(next[chatId] || {}), ...(patch || {}) }
      writeChatMeta(next)
      return next
    })
  }, [writeChatMeta])

  useEffect(() => {
    if (!open) return
    setChatMeta(readChatMeta())
  }, [open, readChatMeta])


  const updateChatInState = (updatedChat) => {
    if (!updatedChat) return
    setChats((prev) => {
      const existingIndex = prev.findIndex((chat) => chat.id === updatedChat.id)
      if (existingIndex === -1) {
        return [updatedChat, ...prev]
      }
      const next = [...prev]
      next[existingIndex] = { ...next[existingIndex], ...updatedChat }
      return next
    })
  }

  const getChatStatusLabel = (chat) => {
    if (!chat) return ''
    switch (chat.status) {
      case 'active':
        return chat.qrConfirmed ? 'ยืนยันแล้ว' : 'พร้อมแชท'
      case 'pending':
        if (chat.ownerAccepted || chat.requesterAccepted) {
          return 'รออีกฝ่ายยืนยัน'
        }
        return 'รอยืนยัน'
      case 'declined':
        return 'ถูกปฏิเสธ'
      default:
        return chat.status
    }
  }

  useEffect(() => {
    if (!open || !token) return

    setLoading(true)
    chatApi
      .list(token)
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        const meta = readChatMeta()
        const sorted = [...list].sort((a, b) => {
          const aKey = a?.id ? meta[a.id]?.lastAt : null
          const bKey = b?.id ? meta[b.id]?.lastAt : null
          return (bKey || 0) - (aKey || 0)
        })
        setChats(sorted)
        setActiveChatId((current) => current ?? initialChatId ?? (sorted[0]?.id ? sorted[0].id : null))
      })
      .catch((err) => {
        console.error('Failed to load chats:', err)
        setChats([])
      })
      .finally(() => setLoading(false))
  }, [open, token, initialChatId, readChatMeta])

  useEffect(() => {
    if (!token || !open) return

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      timeout: 20000,
      transports: ['polling', 'websocket'], // Try polling first (more reliable), then websocket
      upgrade: true, // Allow upgrade from polling to websocket
    })
    socketRef.current = socket

    socket.on('connect_error', (err) => {
      // Only log once to reduce console spam, and only for non-transport errors
      if (!socketRef.current?.hasLoggedError && err.message !== 'websocket error') {
        console.error('Socket connection error:', err.message)
        socketRef.current.hasLoggedError = true
        // Reset after 10 seconds to allow retry logging
        setTimeout(() => {
          if (socketRef.current) {
            socketRef.current.hasLoggedError = false
          }
        }, 10000)
      }
    })

    socket.on('connect', () => {
      setSocketConnected(true)
      if (socketRef.current) {
        socketRef.current.hasLoggedError = false
      }
      if (activeChatRef.current) {
        socket.emit('chat:join', { chatId: activeChatRef.current })
        // Reload messages after reconnection
        if (token && activeChatRef.current) {
          chatApi.messages(token, activeChatRef.current)
            .then(setMessages)
            .catch((err) => {
              console.error('Failed to reload messages after reconnection:', err)
              // Don't show alert for reconnection errors
            })
        }
      }
    })
    
    socket.on('chat:error', ({ message }) => {
      toast.error(message || 'ไม่สามารถส่งข้อความได้', 'เกิดข้อผิดพลาด')
    })

    socket.on('chat:message', (message) => {
      const chatId = message?.chat_id
      if (chatId) {
        const preview =
          (message.body || '').trim() ||
          (message.image_url ? '📷 รูปภาพ' : '') ||
          ''
        const nowMs = Date.now()
        const atMs = message.created_at ? new Date(message.created_at).getTime() : nowMs
        const currentMeta = readChatMeta()
        const prevUnread = currentMeta?.[chatId]?.unread || 0
        updateChatMeta(chatId, {
          lastText: preview,
          lastAt: Number.isFinite(atMs) ? atMs : nowMs,
          unread: chatId === activeChatRef.current ? 0 : prevUnread + 1,
        })
        bumpChatToTop(chatId)
      }
      setMessages((prev) => {
        // Check if message already exists (avoid duplicates after reconnection)
        const exists = prev.some((msg) => msg.id === message.id)
        if (exists) return prev
        return message.chat_id === activeChatRef.current ? [...prev, message] : prev
      })
    })

    socket.on('chat:created', (chat) => {
      setChats((prev) => {
        if (prev.some((existing) => existing.id === chat.id)) {
          return prev
        }
        return [chat, ...prev]
      })
      setActiveChatId(chat.id)
    })

    socket.on('chat:updated', (chat) => {
      updateChatInState(chat)
      if (chat.id === activeChatRef.current) {
        setActiveChatId((current) => current ?? chat.id)
      }
    })

    socket.on('message:read', ({ messageId, readAt }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, read_at: readAt, is_read: true } : msg
        )
      )
    })

    socket.on('disconnect', () => {
      setSocketConnected(false)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setSocketConnected(false)
      setMessages([])
      setActiveChatId(null)
      activeChatRef.current = null
    }
  }, [token, open, toast, bumpChatToTop, readChatMeta, updateChatMeta])

  useEffect(() => {
    if (!open) return
    if (initialChatId) {
      setActiveChatId(initialChatId)
    }
  }, [initialChatId, open])

  useEffect(() => {
    if (!open || !activeChatId) return
    updateChatMeta(activeChatId, { unread: 0 })
  }, [open, activeChatId, updateChatMeta])

  useEffect(() => {
    setQrMode('camera')
    setQrCodeInput('')
    setQrError('')
    setActionError('')
    scanLockRef.current = false
    setIsQrExpanded(true);
  }, [activeChatId])

  // Calculate activeChat and related values before useEffect that uses them
  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeChatId), [chats, activeChatId])
  const qrConfirmed = useMemo(() => Boolean(activeChat?.qrConfirmed), [activeChat?.qrConfirmed])
  const isDonationChat = activeChat?.isDonationChat

  // Define handleConfirmQr before useEffect that uses it
  const handleConfirmQr = useCallback(async (code) => {
    if (!token || !activeChatId) return
    const trimmed = (code || '').trim()
    if (!trimmed) {
      setQrError(`Please enter the ${isDonationChat ? 'donation' : 'exchange'} code`)
      return
    }
    setQrError('')
    scanLockRef.current = true
    setConfirmingQr(true)
    try {
      const updated = await chatApi.confirmQr(token, activeChatId, { code: trimmed })
      updateChatInState(updated)
      setQrCodeInput('')
    } catch (err) {
      setQrError(err.message || 'Failed to confirm code')
      scanLockRef.current = false
    } finally {
      setConfirmingQr(false)
    }
  }, [token, activeChatId, isDonationChat])

  // Setup and cleanup html5-qrcode scanner
  useEffect(() => {
    let isMounted = true
    let timer = null
    let scannerInstance = null

    const cleanupScanner = async () => {
      if (scannerInstance) {
        try {
          // Stop scanner first, then clear
          // html5-qrcode will handle the state check internally
          await scannerInstance.stop().catch(() => {
            // Ignore if already stopped or not running
          })
          // Clear only after stop is complete
          scannerInstance.clear()
        } catch (err) {
          // Ignore errors during cleanup (scanner might already be stopped)
          console.debug('Scanner cleanup error:', err)
        }
        scannerInstance = null
      }
      if (qrCodeScannerRef.current) {
        qrCodeScannerRef.current = null
      }
    }

    if (!open || qrMode !== 'camera') {
      // Cleanup if scanner is running but conditions are not met
      cleanupScanner()
      return () => {
        isMounted = false
        if (timer) clearTimeout(timer)
        cleanupScanner()
      }
    }

    // Wait for ref to be available
    timer = setTimeout(async () => {
      // Cleanup any existing scanner before starting a new one
      if (qrCodeScannerRef.current) {
        await cleanupScanner()
      }
      
      if (!isMounted || !qrCodeReaderRef.current) return

      const qrCodeId = 'qr-reader'
      const html5QrCode = new Html5Qrcode(qrCodeId)
      scannerInstance = html5QrCode
      qrCodeScannerRef.current = html5QrCode

      const startScanning = async () => {
        if (!isMounted) return
        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              if (
                isMounted &&
                decodedText &&
                !confirmingQr &&
                !qrConfirmed &&
                !scanLockRef.current
              ) {
                handleConfirmQr(decodedText)
              }
            },
            (errorMessage) => {
              // Ignore errors during scanning (common when no QR code is detected)
            }
          )
        } catch (err) {
          if (isMounted) {
            setQrError(err?.message || 'Failed to open camera')
          }
        }
      }

      startScanning()
    }, 100)

    return () => {
      isMounted = false
      if (timer) clearTimeout(timer)
      cleanupScanner()
    }
  }, [open, qrMode, confirmingQr, qrConfirmed, handleConfirmQr])

  useEffect(() => {
    if (!token || !activeChatId || !open) return

    activeChatRef.current = activeChatId
    // Only join if socket is connected
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:join', { chatId: activeChatId })
    }
    chatApi.messages(token, activeChatId)
      .then(setMessages)
      .catch((err) => {
        console.error('Failed to load messages:', err)
        setMessages([]) // Reset messages on error
      })
  }, [activeChatId, token, open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback((body, imageUrl) => {
    if (!activeChatId || !socketRef.current?.connected) return
    socketRef.current.emit('chat:message', { chatId: activeChatId, body: body || '', imageUrl: imageUrl || undefined })
  }, [activeChatId])

  const handleSend = async () => {
    if (!newMessage.trim() || !activeChatId) return
    if (!activeChat?.canSendMessages) return

    if (!socketRef.current?.connected) {
      await new Promise(resolve => setTimeout(resolve, 500))
      if (!socketRef.current?.connected) {
        toast.warning('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณารอสักครู่', 'เชื่อมต่อไม่ได้')
        return
      }
    }

    try {
      sendMessage(newMessage.trim())
      setNewMessage('')
    } catch (err) {
      console.error('Failed to send message:', err)
      toast.error('ไม่สามารถส่งข้อความได้ กรุณาลองใหม่', 'เกิดข้อผิดพลาด')
    }
  }

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/') || !token || !activeChatId || !activeChat?.canSendMessages) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('รูปภาพต้องไม่เกิน 5 MB', 'ไฟล์ใหญ่เกินไป')
      return
    }
    if (!socketRef.current?.connected) {
      toast.warning('กำลังเชื่อมต่อ กรุณารอสักครู่', 'เชื่อมต่อไม่ได้')
      return
    }
    setUploadingImage(true)
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await handleImageFromDataUrl(dataUrl)
    } catch (err) {
      console.error('Upload image failed:', err)
      toast.error(err?.message || 'ส่งรูปไม่สำเร็จ กรุณาลองใหม่', 'เกิดข้อผิดพลาด')
    } finally {
      setUploadingImage(false)
    }
  }

  /** ส่งรูปจาก data URL (ใช้ทั้งจาก file input และจากกล้องถ่ายจริง) */
  const handleImageFromDataUrl = useCallback(async (dataUrl) => {
    if (!token || !activeChatId || !activeChat?.canSendMessages) return
    if (!socketRef.current?.connected) {
      toast.warning('กำลังเชื่อมต่อ กรุณารอสักครู่', 'เชื่อมต่อไม่ได้')
      return
    }
    setUploadingImage(true)
    try {
      const { url } = await chatApi.uploadImage(token, dataUrl)
      sendMessage('', url)
      toast.success('ส่งรูปภาพแล้ว', 'สำเร็จ')
    } catch (err) {
      console.error('Upload image failed:', err)
      toast.error(err?.message || 'ส่งรูปไม่สำเร็จ กรุณาลองใหม่', 'เกิดข้อผิดพลาด')
    } finally {
      setUploadingImage(false)
    }
  }, [token, activeChatId, activeChat?.canSendMessages, toast, sendMessage])

  /** เปิดกล้องถ่ายรูปจริง (ใช้บนเดสก์ท็อป) */
  const openCameraCapture = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click()
      return
    }
    setShowCameraCapture(true)
  }, [])

  /** ปิดกล้องและหยุด stream */
  const closeCameraCapture = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop())
      cameraStreamRef.current = null
    }
    setShowCameraCapture(false)
  }, [])

  /** ถ่ายรูปจากวิดีโอแล้วส่ง */
  const captureAndSendPhoto = useCallback(async () => {
    const video = cameraVideoRef.current
    const stream = cameraStreamRef.current
    if (!video || !stream || !token || !activeChatId) return
    setUploadingImage(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      closeCameraCapture()
      await handleImageFromDataUrl(dataUrl)
    } catch (err) {
      console.error('Capture failed:', err)
      toast.error('ถ่ายรูปไม่สำเร็จ กรุณาลองใหม่', 'เกิดข้อผิดพลาด')
    } finally {
      setUploadingImage(false)
    }
  }, [token, activeChatId, closeCameraCapture, handleImageFromDataUrl, toast])

  useEffect(() => {
    if (!open) setShowCameraCapture(false)
  }, [open])

  useEffect(() => {
    if (!showCameraCapture) return
    const id = setTimeout(() => {
      const video = cameraVideoRef.current
      if (!video) return
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          cameraStreamRef.current = s
          video.srcObject = s
          video.play().catch(() => {})
        })
        .catch(() => {
          toast.error('เปิดกล้องไม่ได้ — กรุณาอนุญาตการเข้าถึงกล้อง', 'กล้อง')
          setShowCameraCapture(false)
        })
    }, 0)
    return () => {
      clearTimeout(id)
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop())
        cameraStreamRef.current = null
      }
    }
  }, [showCameraCapture, toast])

  const normalizeChatError = (err) => {
    const msg = err?.message || ''
    if (/aborted|fetch is aborted|timeout/i.test(msg)) return 'การเชื่อมต่อช้าหรือถูกยกเลิก — กรุณาลองกดยืนยันอีกครั้ง'
    return msg || 'เกิดข้อผิดพลาด — กรุณาลองใหม่'
  }

  const handleAcceptChat = async () => {
    if (!token || !activeChatId) return
    setChatActionLoading(true)
    setActionError('')
    try {
      const updated = await chatApi.accept(token, activeChatId)
      updateChatInState(updated)
    } catch (err) {
      setActionError(normalizeChatError(err))
    } finally {
      setChatActionLoading(false)
    }
  }

  const handleDeclineChat = async () => {
    if (!token || !activeChatId) return
    if (!window.confirm('ต้องการปฏิเสธแชทนี้หรือไม่?')) return
    setChatActionLoading(true)
    setActionError('')
    try {
      const updated = await chatApi.decline(token, activeChatId)
      updateChatInState(updated)
    } catch (err) {
      setActionError(normalizeChatError(err))
    } finally {
      setChatActionLoading(false)
    }
  }

  const handleStartChat = async () => {
    if (!recipientEmail || !token) return
    const trimmedEmail = recipientEmail.trim()
    if (!trimmedEmail) {
      toast.warning('กรุณากรอกอีเมล', 'ข้อมูลไม่ครบ')
      return
    }
    if (!trimmedEmail.endsWith('@cmu.ac.th')) {
      toast.warning('ต้องใช้อีเมล @cmu.ac.th เท่านั้น', 'อีเมลไม่ถูกต้อง')
      return
    }
    try {
      const chat = await chatApi.create(token, { participantEmail: trimmedEmail })
      if (chat && chat.id) {
        if (!chats.find((c) => c.id === chat.id)) {
          setChats((prev) => [chat, ...prev])
        }
        setRecipientEmail('')
        setActiveChatId(chat.id)
        toast.success('เริ่มแชทสำเร็จ!', 'สำเร็จ')
      }
    } catch (err) {
      console.error('Failed to start chat:', err)
      toast.error(err.message || 'ไม่สามารถเริ่มแชทได้ กรุณาลองใหม่', 'เกิดข้อผิดพลาด')
    }
  }

  const chatStatus = activeChat?.status
  const isExchangeChat = activeChat?.isExchangeChat
  const isOwner = activeChat?.role === 'owner'
  const isRequester = activeChat?.role === 'requester'
  const hasAccepted =
    isOwner ? activeChat?.ownerAccepted : isRequester ? activeChat?.requesterAccepted : true
  const otherAccepted =
    isOwner ? activeChat?.requesterAccepted : isRequester ? activeChat?.ownerAccepted : true
  const chatDeclined = chatStatus === 'declined'
  // --- START: โค้ดที่แก้ไข ---
  const qrCodeExists = Boolean(activeChat?.qrCode) // 1. สร้างตัวแปรใหม่เช็คว่า QR มีหรือยัง

  // 2. แสดงปุ่ม "ยอมรับ/ปฏิเสธ" ถ้าแชทไม่ถูกปฏิเสธ และ QR Code "ยังไม่ถูกสร้าง" (รองรับทั้ง exchange และ donation)
  const showChatActions = (isExchangeChat || isDonationChat) && !chatDeclined && !qrCodeExists

  // 3. แสดงส่วน QR ของ Owner ถ้าแชท active, เป็น owner, และ QR Code "ถูกสร้างแล้ว" (รองรับทั้ง exchange และ donation)
  const showQrOwner = (isExchangeChat || isDonationChat) && chatStatus === 'active' && isOwner && qrCodeExists

  // 4. แสดงส่วน QR ของ Requester (Logic เดียวกัน) (รองรับทั้ง exchange และ donation)
  const showQrRequester = (isExchangeChat || isDonationChat) && chatStatus === 'active' && isRequester && qrCodeExists
  // --- END: โค้ดที่แก้ไข ---
  
  // หลังจากยืนยัน QR แล้วไม่สามารถส่งข้อความได้อีก
  const chatDisabled = chatDeclined || !activeChat?.canSendMessages || qrConfirmed 

  // Handle selecting a chat on mobile
  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId)
    setShowChatList(false) // Hide chat list on mobile
  }

  // Handle going back to chat list on mobile
  const handleBackToList = () => {
    setShowChatList(true)
  }

  const handleDeleteChat = async (chatId) => {
    if (!token || !chatId) return
    const confirmed = window.confirm('ลบแชทนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')
    if (!confirmed) return
    try {
      setDeletingChatId(chatId)
      await chatApi.delete(token, chatId)
      setChats((prev) => prev.filter((chat) => chat.id !== chatId))
      if (activeChatId === chatId) {
        setActiveChatId(null)
        setMessages([])
      }
      if (typeof toast?.success === 'function') {
        toast.success('ลบแชทแล้ว')
      }
    } catch (err) {
      console.error('Failed to delete chat:', err)
      if (typeof toast?.error === 'function') {
        toast.error(err.message || 'Failed to delete chat')
      }
    } finally {
      setDeletingChatId(null)
    }
  }

  const chatContent = !token ? (
    <p className="rounded-2xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">กรุณาเข้าสู่ระบบเพื่อใช้แชท</p>
  ) : (
    <div className="flex flex-col md:flex-row md:min-h-[480px]">
          {/* รายการแชท */}
          <div className={`${!showChatList && activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-80 shrink-0 flex-col border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50`}>
            <div className="shrink-0 p-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">เริ่มแชทใหม่</label>
              <div className="mt-3 flex gap-2">
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartChat()}
                  placeholder="เพื่อน@cmu.ac.th"
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  aria-label="อีเมลเพื่อเริ่มแชท"
                />
                <button
                  type="button"
                  onClick={handleStartChat}
                  className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
                >
                  เริ่มแชท
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col border-t border-gray-100 px-4 pb-4">
              <p className="mb-3 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">รายการแชท</p>
              <div className="space-y-1 overflow-y-auto overscroll-contain pr-1">
                {loading && (
                  <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                    <Loader2 className="animate-spin shrink-0" size={16} /> กำลังโหลด...
                  </div>
                )}
                {!loading && Array.isArray(chats) && chats.length > 0 ? (
                  chats.map((chat) => {
                    if (!chat || !chat.id) return null
                    const isDeleting = deletingChatId === chat.id
                    const isActive = activeChatId === chat.id
                    return (
                      <div key={chat.id} className="flex items-stretch gap-2">
                        <button
                          type="button"
                          className={`flex-1 min-w-0 rounded-xl px-3 py-3 text-left text-sm transition ${
                            isActive ? 'bg-white shadow-sm ring-1 ring-primary/20' : 'hover:bg-white/70'
                          }`}
                          onClick={() => handleSelectChat(chat.id)}
                        >
                          <p className="truncate font-semibold text-gray-900">
                            {chat.participant_name || 'นักศึกษา CMU'}
                          </p>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p className="min-w-0 flex-1 truncate text-xs text-gray-500">
                              {chatMeta?.[chat.id]?.lastText || chat.participant_email || ''}
                            </p>
                            {chatMeta?.[chat.id]?.lastAt ? (
                              <span className="shrink-0 text-[10px] text-gray-400">
                                {formatMessageTime(new Date(chatMeta[chat.id].lastAt).toISOString())}
                              </span>
                            ) : null}
                          </div>
                          {(chat.isExchangeChat || chat.isDonationChat) && (
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold text-primary">{getChatStatusLabel(chat)}</p>
                              {chatMeta?.[chat.id]?.unread ? (
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                                  {chatMeta[chat.id].unread > 99 ? '99+' : chatMeta[chat.id].unread}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChat(chat.id)}
                          disabled={isDeleting}
                          className="flex h-auto w-9 shrink-0 items-center justify-center self-center rounded-full text-red-500 hover:bg-red-50 disabled:opacity-50"
                          aria-label="ลบแชท"
                        >
                          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    )
                  })
                ) : (
                  !loading && (
                    <p className="py-8 text-center text-sm text-gray-500">ยังไม่มีแชท — กรอกอีเมลด้านบนเพื่อเริ่มแชท</p>
                  )
                )}
              </div>
            </div>
          </div>

          {/* หน้าต่างแชท */}
          <div className={`${showChatList && !activeChatId ? 'hidden md:flex' : 'flex'} flex-1 min-w-0 flex-col bg-white`}>
            {activeChat ? (
              <div className="flex min-h-[420px] flex-1 flex-col sm:min-h-[480px]">
                {/* หัวแชท + สถานะเชื่อมต่อ */}
                <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 md:hidden"
                    aria-label="กลับไปรายการแชท"
                  >
                    <X size={18} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-gray-900">{activeChat?.participant_name || 'นักศึกษา CMU'}</p>
                    <p className="truncate text-xs text-gray-500">{activeChat?.participant_email || ''}</p>
                    {activeChat?.itemTitle && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary truncate max-w-[160px]">
                          {activeChat.itemTitle}
                        </span>
                        {activeChat?.itemPickupLocation && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <MapPin size={12} />
                            {activeChat.itemPickupLocation}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${socketConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {socketConnected ? 'ออนไลน์' : 'กำลังเชื่อมต่อ...'}
                  </span>
                </div>

                {actionError && (
                  <div className="mx-4 mb-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5">
                    <span className="shrink-0">⚠️</span>
                    <div>
                      <p className="font-medium">ไม่สามารถดำเนินการได้</p>
                      <p className="mt-0.5 text-xs">{actionError}</p>
                      <p className="mt-2 text-xs text-red-600">ตรวจสอบว่า backend รันที่ port 4000 แล้วลองกดปุ่มอีกครั้ง</p>
                    </div>
                  </div>
                )}

                {(isExchangeChat || isDonationChat) && (
                  <div className="mb-3 space-y-3 px-4 sm:px-5">
                    {chatDeclined && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-inner">
                        แชทนี้ถูกปฏิเสธแล้ว — ไม่สามารถสนทนาต่อได้
                      </div>
                    )}

                    {showChatActions && !chatDeclined && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-inner">
                        <p className="font-semibold">ยืนยันเพื่อเปิดแชท</p>
                        <p className="mt-1 text-xs text-amber-800">
                          {hasAccepted && otherAccepted
                            ? `กดยืนยันเพื่อสร้าง QR Code สำหรับยืนยัน${isDonationChat ? 'การบริจาค' : 'การแลกเปลี่ยน'}`
                            : hasAccepted
                            ? 'คุณยืนยันแล้ว — กำลังรออีกฝ่ายยืนยัน'
                            : `กดยืนยันเพื่อเปิดแชทและสร้าง QR Code สำหรับ${isDonationChat ? 'การบริจาค' : 'การแลกเปลี่ยน'}`}
                        </p>
                        {(!hasAccepted || (hasAccepted && otherAccepted)) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={handleDeclineChat}
                              disabled={chatActionLoading}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                            >
                              {chatActionLoading ? <Loader2 className="animate-spin" size={16} /> : <><X size={16} /><span>ปฏิเสธ</span></>}
                            </button>
                            <button
                              type="button"
                              onClick={handleAcceptChat}
                              disabled={chatActionLoading}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:opacity-60"
                            >
                              {chatActionLoading ? <Loader2 className="animate-spin" size={16} /> : <><Check size={16} /><span>ยืนยัน</span></>}
                            </button>
                          </div>
                        )}
                        {hasAccepted && !otherAccepted && (
                          <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-amber-800">
                            กำลังรออีกฝ่ายยืนยัน...
                          </div>
                        )}
                      </div>
                    )}

                    {/* --- START: โค้ดที่แก้ไข (ฉบับสมบูรณ์ + Success Message) --- */}
                    {chatStatus === 'active' && !chatDeclined && (
                      <>
                        {qrConfirmed ? (
                          // -------------------------------
                          // 1. ถ้า QR ยืนยันแล้ว: แสดง "แลกเปลี่ยน/บริจาคสำเร็จ"
                          // -------------------------------
                          <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700 shadow-inner">
                            <p className="font-semibold text-green-900">✅ {isDonationChat ? 'Donation' : 'Exchange'} completed!</p>
                            <p className="mt-1 text-xs text-green-600">
                              The {isDonationChat ? 'donation' : 'exchange'} has been completed. Thank you for using CMU ShareCycle
                            </p>
                          </div>
                        ) : (
                          // -------------------------------
                          // 2. ถ้า QR ยังไม่ยืนยัน: แสดง UI ย่อ/ขยาย แบบเดิม
                          // -------------------------------
                          <>
                            {isQrExpanded ? (
                              // 2a. มุมมอง "ขยาย" (แบบเดิม + ปุ่มย่อ)
                              <>
                                {showQrOwner && (
                                  <div className="relative rounded-[32px] border border-primary/15 bg-[#F4FBF4] p-6 text-center shadow-soft">
                                    <button
                                      type="button"
                                      onClick={() => setIsQrExpanded(false)}
                                      className="absolute right-4 top-4 rounded-full p-1 text-gray-400 transition hover:bg-gray-900/10"
                                      title="Collapse"
                                    >
                                      <X size={18} />
                                    </button>
                                    
                                    {/* --- เนื้อหา QR Code เดิมของ Owner --- */}
                                    <div className="mb-4 flex items-center justify-center gap-3">
                                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow">
                                        <QrCode size={22} />
                                      </div>
                                      <div className="text-left">
                                        <p className="text-base font-semibold text-primary">Show QR Code</p>
                                        <p className="text-xs text-gray-500">
                                          Show QR Code or code to the other party to confirm the {isDonationChat ? 'donation' : 'exchange'}
                                        </p>
                                      </div>
                                    </div>
                                    {activeChat.qrCode ? (
                                      <>
                                        <div className="mx-auto inline-flex rounded-[24px] border border-primary/10 bg-white p-5 shadow-card">
                                          <QRCodeCanvas value={activeChat.qrCode} size={200} includeMargin />
                                        </div>
                                        <div className="mx-auto mt-6 w-full rounded-[18px] bg-white px-4 py-3 shadow-inner">
                                          <p className="text-xs font-semibold text-gray-500">{isDonationChat ? 'Donation' : 'Exchange'} Code</p>
                                          <p className="mt-1 text-2xl font-bold tracking-widest text-primary">
                                            {activeChat.qrCode}
                                          </p>
                                          <p className="mt-2 text-xs text-gray-500">
                                            Send this code or have your friend scan the QR Code to confirm the {isDonationChat ? 'donation' : 'exchange'}
                                          </p>
                                        </div>
                                      </>
                                    ) : (
                                      <p className="mt-3 text-sm text-gray-600">กำลังสร้างโค้ด...</p>
                                    )}
                                    <div className="mt-4 rounded-[18px] bg-white px-4 py-3 text-left text-xs text-gray-600 shadow-inner">
                                      <p className="font-semibold text-primary">Instructions:</p>
                                      <ol className="mt-2 list-decimal space-y-1 pl-5">
                                        <li>Show QR Code for the other party to scan</li>
                                        <li>Or tell them the code above to enter</li>
                                        <li>When the other party confirms, the {isDonationChat ? 'donation' : 'exchange'} will be completed</li>
                                      </ol>
                                    </div>
                                    {/* (เราลบ "✅ อีกฝ่ายยืนยัน..." ออกจากตรงนี้) */}
                                  </div>
                                )}

                                {showQrRequester && (
                                  <div className="relative rounded-[32px] border border-primary/15 bg-[#F4FBF4] p-6 shadow-soft">
                                    <button
                                      type="button"
                                      onClick={() => setIsQrExpanded(false)}
                                      className="absolute right-4 top-4 rounded-full p-1 text-gray-400 transition hover:bg-gray-900/10"
                                      title="Collapse"
                                    >
                                      <X size={18} />
                                    </button>
                                    
                                    {/* --- เนื้อหา QR Code เดิมของ Requester --- */}
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div>
                                        <p className="text-base font-semibold text-primary">Scan QR Code</p>
                                        <p className="text-xs text-gray-500">
                                          Scan or enter the code from the poster to confirm the {isDonationChat ? 'donation' : 'exchange'}
                                        </p>
                                      </div>
                                      <div className="flex gap-2 rounded-full bg-white p-1 text-xs font-semibold text-primary shadow-inner">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setQrMode('camera')
                                            setQrError('')
                                            scanLockRef.current = false
                                          }}
                                          className={`flex-1 rounded-full px-4 py-2 ${
                                            qrMode === 'camera'
                                              ? 'bg-primary text-white'
                                              : 'transition hover:bg-primary/10'
                                          }`}
                                        >
                                          สแกนด้วยกล้อง
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setQrMode('manual')
                                            setQrError('')
                                            scanLockRef.current = false
                                          }}
                                          className={`flex-1 rounded-full px-4 py-2 ${
                                            qrMode === 'manual'
                                              ? 'bg-primary text-white'
                                              : 'transition hover:bg-primary/10'
                                          }`}
                                        >
                                          กรอกโค้ด
                                        </button>
                                      </div>
                                    </div>

                                    {/* (เราลบ "✅ ยืนยัน..." ออกจากตรงนี้) */}
                                    {qrMode === 'camera' ? (
                                      <div className="mt-4 overflow-hidden rounded-[28px] border border-gray-900/10 bg-black">
                                        <div 
                                          id="qr-reader" 
                                          ref={qrCodeReaderRef}
                                          className="w-full"
                                        />
                                        {qrError && (
                                          <div className="bg-red-900/70 px-4 py-2 text-center text-xs text-red-200">
                                            {qrError}
                                          </div>
                                        )}
                                        <div className="bg-black/70 px-4 py-3 text-center text-xs text-white">
                                          Please allow camera access and place QR Code within the frame
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="mt-4 space-y-3 rounded-[24px] bg-white px-4 py-4 shadow-inner">
                                        <p className="text-xs font-semibold text-gray-600">
                                          Enter the code you received (format: {isDonationChat ? 'DN' : 'EX'}12345678)
                                        </p>
                                        <input
                                          type="text"
                                          value={qrCodeInput}
                                          onChange={(e) => setQrCodeInput(e.target.value.toUpperCase())}
                                          placeholder={isDonationChat ? "DNXXXXXXXX" : "EXXXXXXXXX"}
                                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-center text-sm uppercase tracking-[0.2em]"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleConfirmQr(qrCodeInput)}
                                          disabled={confirmingQr}
                                          className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:opacity-60"
                                        >
                                          {confirmingQr ? (
                                            <Loader2 className="mx-auto animate-spin" size={16} />
                                          ) : (
                                            'ยืนยันโค้ด'
                                          )}
                                        </button>
                                      </div>
                                    )}
                                    <div className="mt-4 rounded-[18px] bg-white px-4 py-3 text-left text-xs text-gray-600 shadow-inner">
                                      <p className="font-semibold text-primary">วิธีสแกน:</p>
                                      <ol className="mt-2 list-decimal space-y-1 pl-5">
                                        <li>Allow access to your camera</li>
                                        <li>Place the QR Code received from the poster within the frame</li>
                                        <li>The system will scan automatically when QR Code is detected</li>
                                      </ol>
                                    </div>
                                    {qrError && (
                                      <div className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-xs text-red-600">
                                        {qrError}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              // 2b. มุมมอง "ย่อ" (แบบใหม่)
                              <div className="flex items-center justify-between rounded-2xl bg-primary/10 px-4 py-3 text-sm shadow-inner">
                                <div className="flex items-center gap-2 font-semibold text-primary">
                                  <QrCode size={16} />
                                  <span>
                                    {/* (โค้ดนี้ยังทำงานเหมือนเดิม แต่จะถูกซ่อนเมื่อ qrConfirmed=true) */}
                                    {qrConfirmed
                                      ? `${isDonationChat ? 'Donation' : 'Exchange'} confirmed`
                                      : `Ready to confirm ${isDonationChat ? 'donation' : 'exchange'}`}
                                  </span>
                                </div>
                                <button
                                  onClick={() => setIsQrExpanded(true)}
                                  className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-card transition hover:bg-primary-dark"
                                >
                                  {qrConfirmed ? 'View' : 'Expand'}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                    {/* --- END: โค้ดที่แก้ไข (ฉบับสมบูรณ์ + Success Message) --- */}
                    
                
                  </div>
                  )}

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 px-4 py-4 sm:px-5">
                  {Array.isArray(messages) && messages.length > 0 ? (
                    messages.map((msg) => {
                      if (!msg || !msg.id) return null
                      const isSentByMe = msg.sender_id === user?.id || msg.is_sent_by_me
                      const isRead = msg.is_read || msg.read_at !== null
                      const timeStr = formatMessageTime(msg.created_at)
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-sm rounded-2xl px-4 py-2.5 ${
                              isSentByMe
                                ? 'rounded-br-md bg-primary text-white shadow-sm'
                                : 'rounded-bl-md bg-gray-100 text-gray-900'
                            }`}
                          >
                            {msg.image_url ? (
                              <a
                                href={msg.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block overflow-hidden rounded-lg"
                              >
                                <img
                                  src={msg.image_url}
                                  alt="รูปภาพในแชท"
                                  className="max-h-64 w-full object-cover"
                                  loading="lazy"
                                />
                              </a>
                            ) : null}
                            {(msg.body || '').trim() ? (
                              <div className={`whitespace-pre-wrap break-words text-sm ${msg.image_url ? 'mt-2' : ''}`}>{msg.body}</div>
                            ) : null}
                            {timeStr ? (
                              <p className={`mt-1.5 text-xs opacity-90 ${isSentByMe ? 'text-white/90' : 'text-gray-500'}`}>{timeStr}</p>
                            ) : null}
                          </div>
                          {isSentByMe && (
                            <div className="mt-1 flex items-center gap-1 px-1">
                              {isRead ? (
                                <span className="flex items-center gap-0.5 text-xs text-emerald-600"><CheckCheck size={12} /> อ่านแล้ว</span>
                              ) : (
                                <span className="flex items-center gap-0.5 text-xs text-gray-400"><Check size={12} /> ส่งแล้ว</span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-3 text-center text-sm text-gray-500">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                        <MessageCircle size={28} className="text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-600">ยังไม่มีข้อความ</p>
                      <p className="text-xs">พิมพ์ข้อความหรือส่งรูปเพื่อเริ่มแชท</p>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* แถบพิมพ์ */}
                <div className="shrink-0 border-t border-gray-100 px-4 py-3 sm:px-5">
                <div className="flex items-end gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                    aria-hidden="true"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageSelect}
                    aria-hidden="true"
                  />

                  {/* ปุ่มกล้อง + แนบรูป */}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (chatDisabled || uploadingImage) return
                        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0
                        if (isMobile) cameraInputRef.current?.click()
                        else openCameraCapture()
                      }}
                      disabled={chatDisabled || uploadingImage}
                      title="ถ่ายรูป"
                      aria-label="ถ่ายรูป"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                    </button>
                    <button
                      type="button"
                      data-testid="chat-upload-image"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={chatDisabled || uploadingImage}
                      title="แนบรูป"
                      aria-label="แนบรูป"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                    </button>
                  </div>

                  {/* ช่องพิมพ์ */}
                  <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-4 pr-3 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleSend()
                      }}
                      placeholder={chatDisabled ? 'ไม่สามารถส่งข้อความได้' : 'พิมพ์ข้อความ...'}
                      disabled={chatDisabled}
                      className="w-full bg-transparent text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0 disabled:bg-transparent"
                      aria-label="ข้อความ"
                    />
                  </div>

                  {/* ปุ่มส่ง — นอกช่องพิมพ์ */}
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={chatDisabled || !newMessage.trim()}
                    title="ส่ง"
                    aria-label="ส่งข้อความ"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </div>
                </div>

                {/* โมดัลกล้องถ่ายรูปจริง (เดสก์ท็อป) */}
                {showCameraCapture && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={closeCameraCapture}>
                    <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                      <div className="relative aspect-[4/3] bg-black">
                        <video
                          ref={cameraVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex gap-2 p-3">
                        <button
                          type="button"
                          onClick={closeCameraCapture}
                          className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={captureAndSendPhoto}
                          disabled={uploadingImage}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                        >
                          {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <><Camera size={18} /> ถ่ายรูป</>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                  <MessageCircle className="text-gray-400" size={40} />
                </div>
                <p className="text-base font-medium text-gray-700">เลือกแชทหรือเริ่มแชทใหม่</p>
                <p className="max-w-xs text-sm text-gray-500">เลือกจากรายการด้านซ้าย หรือกรอกอีเมล @cmu.ac.th แล้วกด เริ่มแชท</p>
              </div>
            )}
          </div>
        </div>
      )

  if (asPage && open) {
    return (
      <div className="min-h-screen bg-[#FAFBF9]">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Header — รูปแบบเดียวกับหน้าอื่น */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
                aria-label="กลับ"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">แชท</h1>
                <p className="text-sm text-gray-500">
                  {socketConnected ? 'เชื่อมต่อแล้ว · เลือกการสนทนาหรือสแกน QR' : 'กำลังเชื่อมต่อ...'}
                </p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${socketConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {socketConnected ? 'ออนไลน์' : 'กำลังเชื่อมต่อ...'}
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {chatContent}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="แชท" subtitle={socketConnected ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ...'} size="xl">
      {chatContent}
    </Modal>
  )
}