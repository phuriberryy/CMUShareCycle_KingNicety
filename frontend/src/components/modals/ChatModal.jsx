import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import { Link } from 'react-router-dom'
import { Send, MessageCircle, Loader2, X, Trash2, Camera, ArrowLeft, Search, Plus, Image as ImageIcon, QrCode } from 'lucide-react'
import Modal from '../ui/Modal'
import { API_BASE, chatApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const SOCKET_URL = API_BASE.replace(/\/api$/, '')
const CHAT_META_STORAGE_KEY = 'sharecycle_chat_meta_v1'

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

function getMessageText(message) {
  return (message?.body || '').trim() || (message?.image_url ? '📷 รูปภาพ' : '') || ''
}

function getMessageId(message) {
  return message?.id ?? `${message?.created_at || ''}-${message?.sender_id || ''}-${message?.body || message?.image_url || ''}`
}

export default function ChatModal({ open, onClose, initialChatId, asPage = false }) {
  const { token } = useAuth()
  const toast = useToast()
  const [chats, setChats] = useState([])
  const [chatMeta, setChatMeta] = useState({})
  const [selectedChat, setSelectedChat] = useState(initialChatId ?? null)
  const [messages, setMessages] = useState([])
  const [composerText, setComposerText] = useState('')
  const [chatSearch, setChatSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [deletingChatId, setDeletingChatId] = useState(null)
  const [showActions, setShowActions] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingImage, setPendingImage] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [composerHeight, setComposerHeight] = useState(88)
  const [isMobile, setIsMobile] = useState(false)
  const socketRef = useRef(null)
  const activeChatRef = useRef(null)
  const bottomRef = useRef(null)
  const messageScrollRef = useRef(null)
  const composerRef = useRef(null)
  const fileInputRef = useRef(null)

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
    } catch {}
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

  const getChatStatusLabel = (chat) => chat ? (chat.status === 'active' ? (chat.qrConfirmed ? 'ยืนยันแล้ว' : 'พร้อมแชท') : chat.status === 'pending' ? ((chat.ownerAccepted || chat.requesterAccepted) ? 'รออีกฝ่ายยืนยัน' : 'รอยืนยัน') : chat.status === 'declined' ? 'ถูกปฏิเสธ' : chat.status) : ''

  const isMobileChatDetail = isMobile && selectedChat !== null
  const activeChat = useMemo(() => chats.find((c) => c.id === selectedChat) || null, [chats, selectedChat])
  const isNearBottom = useCallback(() => {
    const el = messageScrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }, [])
  const scrollToBottom = useCallback((behavior = 'auto') => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior, block: 'end' }))
  }, [])
  const groupedMessages = useMemo(() => {
    const list = Array.isArray(messages) ? messages : []
    return list.map((message, index) => {
      const prev = list[index - 1]
      const next = list[index + 1]
      const mine = String(message.sender_id) === String(chatMeta?.currentUserId || '') || message.is_sent_by_me
      const prevMine = prev ? (String(prev.sender_id) === String(chatMeta?.currentUserId || '') || prev.is_sent_by_me) : null
      const nextMine = next ? (String(next.sender_id) === String(chatMeta?.currentUserId || '') || next.is_sent_by_me) : null
      const prevTime = prev?.created_at ? new Date(prev.created_at).getTime() : null
      const currTime = message.created_at ? new Date(message.created_at).getTime() : null
      const gapFromPrev = prevTime && currTime ? currTime - prevTime : null
      const showTimestamp = !next || prevMine !== mine || nextMine !== mine || (gapFromPrev !== null && gapFromPrev > 10 * 60 * 1000)
      return { ...message, _mine: mine, _showTimestamp: showTimestamp, _groupStart: prevMine !== mine, _groupEnd: nextMine !== mine }
    })
  }, [messages, chatMeta])

  useEffect(() => {
    if (open) setChatMeta(readChatMeta())
  }, [open, readChatMeta])

  useEffect(() => {
    if (!open || !token) return
    setLoading(true)
    chatApi.list(token)
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        const meta = readChatMeta()
        const sorted = [...list].sort((a, b) => ((b?.id ? meta[b.id]?.lastAt : null) || 0) - ((a?.id ? meta[a.id]?.lastAt : null) || 0))
        setChats(sorted)
        setSelectedChat((current) => current ?? initialChatId ?? (sorted[0]?.id ?? null))
      })
      .catch(() => setChats([]))
      .finally(() => setLoading(false))
  }, [open, token, initialChatId, readChatMeta])

  useEffect(() => {
    if (!token || !open) return
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      transports: ['polling', 'websocket'],
      upgrade: true,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setSocketConnected(true)
      if (activeChatRef.current) socket.emit('chat:join', { chatId: activeChatRef.current })
    })

    socket.on('disconnect', () => setSocketConnected(false))
    socket.on('chat:error', ({ message }) => toast.error(message || 'ไม่สามารถส่งข้อความได้', 'เกิดข้อผิดพลาด'))
    socket.on('chat:message', (message) => {
      const chatId = message?.chat_id
      if (!chatId) return
      const preview = getMessageText(message)
      const nowMs = Date.now()
      const atMs = message.created_at ? new Date(message.created_at).getTime() : nowMs
      updateChatMeta(chatId, { lastText: preview, lastAt: atMs, unread: activeChatRef.current === chatId ? 0 : ((chatMeta?.[chatId]?.unread || 0) + 1) })
      bumpChatToTop(chatId)
      if (activeChatRef.current === chatId) {
        setMessages((prev) => (prev.some((m) => getMessageId(m) === getMessageId(message)) ? prev : [...prev, message]))
        if (isNearBottom()) scrollToBottom('smooth')
      }
    })

    return () => socket.disconnect()
  }, [token, open, toast, chatMeta, updateChatMeta, bumpChatToTop, scrollToBottom])

  useEffect(() => {
    activeChatRef.current = selectedChat
  }, [selectedChat])

  useEffect(() => {
    if (!open || !selectedChat || !token) {
      setMessages([])
      return
    }

    let cancelled = false
    setMessagesLoading(true)
    setMessages([])
    chatApi.messages(token, selectedChat)
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : data?.messages || []
        setMessages(list)
        updateChatMeta(selectedChat, { unread: 0 })
        if (isNearBottom()) scrollToBottom('auto')
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false)
      })

    const socket = socketRef.current
    if (socket?.connected) socket.emit('chat:join', { chatId: selectedChat })

    return () => { cancelled = true }
  }, [open, selectedChat, token, updateChatMeta, scrollToBottom])

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 768)
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  useEffect(() => {
    if (!composerRef.current) return
    const updateHeight = () => {
      const el = composerRef.current
      if (!el) return
      setComposerHeight(Math.ceil(el.getBoundingClientRect().height))
    }
    updateHeight()
    const ro = new ResizeObserver(updateHeight)
    ro.observe(composerRef.current)
    window.addEventListener('resize', updateHeight)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [showActions, pendingImage, composerText])

  const filteredChats = useMemo(() => {
    const query = chatSearch.trim().toLowerCase()
    if (!query) return chats
    return chats.filter((chat) => ((chat.participant_name || '').toLowerCase().includes(query) || (chat.participant_email || '').toLowerCase().includes(query) || (chatMeta?.[chat.id]?.lastText || '').toLowerCase().includes(query)))
  }, [chats, chatSearch, chatMeta])

  const handleSelectChat = (chatId) => {
    setSelectedChat(chatId)
    setShowActions(false)
    setSheetOpen(false)
    setPendingImage(null)
    setComposerText('')
  }

  const handleBackToList = () => {
    setSelectedChat(null)
    setMessages([])
    setShowActions(false)
    setSheetOpen(false)
    setPendingImage(null)
    setSendingMessage(false)
  }

  const handleDeleteChat = async (chatId) => {
    if (!token || !chatId) return
    if (!window.confirm('ลบแชทนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) return
    setDeletingChatId(chatId)
    try {
      await chatApi.delete(token, chatId)
      setChats((prev) => prev.filter((chat) => chat.id !== chatId))
      if (selectedChat === chatId) setSelectedChat(null)
      toast.success('ลบแชทแล้ว')
    } catch (err) {
      toast.error(err.message || 'Failed to delete chat')
    } finally {
      setDeletingChatId(null)
    }
  }

  const handlePickImage = () => fileInputRef.current?.click()

  const handleImageSelected = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพ', 'ไม่รองรับไฟล์')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPendingImage(reader.result)
    reader.readAsDataURL(file)
    setShowActions(false)
  }

  const handleSendMessage = async () => {
    if (!selectedChat || uploadingImage || sendingMessage) return
    const text = composerText.trim()
    if (!text && !pendingImage) return

    const socket = socketRef.current
    if (!socket?.connected) {
      toast.error('ยังไม่เชื่อมต่อแชท', 'ส่งข้อความไม่ได้')
      return
    }

    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      chat_id: selectedChat,
      body: text,
      image_url: pendingImage || null,
      is_sent_by_me: true,
      is_read: false,
      created_at: new Date().toISOString(),
      pending: true,
    }

    setSendingMessage(true)
    const shouldStickToBottom = isNearBottom()
    setMessages((prev) => [...prev, optimisticMessage])
    setComposerText('')
    setPendingImage(null)
    setShowActions(false)
    setSheetOpen(false)
    if (shouldStickToBottom) scrollToBottom('smooth')

    let imageUrl = null
    try {
      if (pendingImage) {
        setUploadingImage(true)
        const res = await chatApi.uploadImage(token, pendingImage)
        imageUrl = res?.imageUrl || res?.url || res?.image_url || null
      }
      socket.emit('chat:message', {
        chatId: selectedChat,
        body: text,
        imageUrl,
      })
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, image_url: imageUrl || m.image_url } : m)))
      updateChatMeta(selectedChat, { lastText: text || '📷 รูปภาพ', lastAt: Date.now(), unread: 0 })
      bumpChatToTop(selectedChat)
      if (shouldStickToBottom) scrollToBottom('smooth')
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      toast.error(err.message || 'ไม่สามารถส่งข้อความได้', 'เกิดข้อผิดพลาด')
    } finally {
      setUploadingImage(false)
      setSendingMessage(false)
    }
  }

  const mobileList = (
    <div className={`flex h-full min-h-0 flex-col bg-white md:hidden ${isMobileChatDetail ? 'hidden' : 'flex'}`}>
      <div className="flex shrink-0 flex-col border-b border-gray-100 bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-gray-900">Messages</p>
            <p className="text-xs text-gray-500">Your inbox and requests</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500" aria-label="ปิด">
            <X size={18} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
          <Search size={16} className="text-gray-400" />
          <input type="text" value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search conversations" className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none" aria-label="Search conversations" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-3 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-gray-400"><span>Inbox</span><span>{filteredChats.length}</span></div>
        <div className="space-y-2 pr-1">
          {loading ? <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500"><Loader2 className="animate-spin shrink-0" size={16} /> กำลังโหลด...</div> : filteredChats.length > 0 ? filteredChats.map((chat) => {
            const isDeleting = deletingChatId === chat.id
            const lastText = chatMeta?.[chat.id]?.lastText || chat.participant_email || 'Start chatting'
            const lastTime = chatMeta?.[chat.id]?.lastAt ? formatMessageTime(new Date(chatMeta[chat.id].lastAt).toISOString()) : ''
            const unread = chatMeta?.[chat.id]?.unread || 0
            const initials = (chat.participant_name || 'CMU').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div key={chat.id} className="group flex items-stretch gap-2">
                <button type="button" className="flex flex-1 min-w-0 items-center gap-3 rounded-2xl border border-transparent bg-white px-3 py-3 text-left transition hover:border-gray-200 hover:bg-gray-50" onClick={() => handleSelectChat(chat.id)}>
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">{initials}{unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2"><p className="truncate font-semibold text-gray-900">{chat.participant_name || 'นักศึกษา CMU'}</p><span className="shrink-0 text-[10px] text-gray-400">{lastTime}</span></div>
                    <p className="truncate text-xs text-gray-500">{lastText}</p>
                    <div className="mt-1 flex items-center justify-between gap-2"><p className="text-[11px] font-semibold text-primary">{getChatStatusLabel(chat)}</p>{unread > 0 ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span> : null}</div>
                  </div>
                </button>
                <button type="button" onClick={() => handleDeleteChat(chat.id)} disabled={isDeleting} className="flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full text-red-500 transition hover:bg-red-50 disabled:opacity-50" aria-label="ลบแชท">{isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}</button>
              </div>
            )
          }) : <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm"><MessageCircle size={28} className="text-primary" /></div><p className="font-semibold text-gray-700">No conversations yet</p><p className="mt-1 text-sm text-gray-500">Start a chat by entering a CMU email above.</p></div>}
        </div>
      </div>
    </div>
  )

  const mobileDetail = (
    <div className={`flex h-full min-h-0 flex-col bg-[#FBFCFB] md:hidden ${isMobileChatDetail ? 'flex' : 'hidden'}`}>
      <div className="absolute inset-x-0 top-0 z-40 h-0" />
      <div className="sticky top-0 z-30 shrink-0 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleBackToList} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600" aria-label="กลับไปรายการแชท"><ArrowLeft size={18} /></button>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">{(activeChat?.participant_name || 'CMU').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-gray-900">{activeChat?.participant_name || 'นักศึกษา CMU'}</p>
            <p className="truncate text-xs text-gray-500">{activeChat?.participant_email || ''}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${socketConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{socketConnected ? 'Online' : 'Connecting'}</span>
        </div>
      </div>

      <div ref={messageScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4" style={{ paddingBottom: `calc(${composerHeight}px + env(safe-area-inset-bottom) + 1rem)` }}>
        {messagesLoading ? <div className="flex h-full items-center justify-center text-sm text-gray-500"><Loader2 className="mr-2 animate-spin" size={16} /> กำลังโหลดข้อความ...</div> : groupedMessages.length > 0 ? (
          <div className="space-y-1.5">
            {groupedMessages.map((message) => {
              const mine = message._mine
              return (
                <div key={getMessageId(message)} className={`flex ${mine ? 'justify-end' : 'justify-start'} ${message._groupStart ? 'mt-3' : 'mt-0.5'}`}>
                  <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm transition-opacity ${mine ? 'bg-primary text-white' : 'bg-white text-gray-800 border border-gray-200'} ${message.pending ? 'opacity-70' : 'opacity-100'}`}>
                    {message.image_url ? <img src={message.image_url} alt="attached" className="mb-2 max-h-72 w-full rounded-xl object-cover" /> : null}
                    {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                    {message.pending ? <p className={`mt-1 text-[10px] ${mine ? 'text-white/80' : 'text-gray-400'}`}>กำลังส่ง…</p> : null}
                    {message._showTimestamp ? <p className={`mt-1 text-[10px] ${mine ? 'text-white/75' : 'text-gray-400'}`}>{formatMessageTime(message.created_at)}</p> : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-gray-500">
            <div>
              <p className="font-medium text-gray-700">No messages yet</p>
              <p className="mt-1 text-sm text-gray-500">ส่งข้อความแรกได้เลย</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div ref={composerRef} className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white px-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
        <div className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${sheetOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setSheetOpen(false)} />
        <div className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${sheetOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="mx-auto max-w-2xl rounded-t-3xl border border-gray-200 bg-white p-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-200" />
            <button type="button" onClick={() => { handlePickImage(); setSheetOpen(false) }} className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-800 transition active:scale-[0.98] hover:bg-gray-50">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ImageIcon size={18} /></span>
              Upload image
            </button>
            <button type="button" onClick={() => { handlePickImage(); setSheetOpen(false) }} className="mt-2 flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-800 transition active:scale-[0.98] hover:bg-gray-50">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Camera size={18} /></span>
              Open camera
            </button>
            <button type="button" onClick={() => { setSheetOpen(false) }} className="mt-2 flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-800 transition active:scale-[0.98] hover:bg-gray-50">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><QrCode size={18} /></span>
              QR
            </button>
            <button type="button" onClick={() => setSheetOpen(false)} className="mt-2 flex min-h-12 w-full items-center justify-center rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition active:scale-[0.98]">Close</button>
          </div>
        </div>

        {pendingImage ? <div className="mb-3 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-2"><img src={pendingImage} alt="preview" className="h-12 w-12 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-800">Image ready to send</p><p className="text-xs text-gray-500">แตะส่งเพื่ออัปโหลด</p></div><button type="button" onClick={() => setPendingImage(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500"><X size={16} /></button></div> : null}

        <div className="flex items-end gap-2">
          <button type="button" onClick={() => setSheetOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition active:scale-95" aria-label="เปิดเมนูเพิ่มเติม">
            <Plus size={18} />
          </button>
          <div className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
            <input
              type="text"
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder="พิมพ์ข้อความ..."
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
          </div>
          <button type="button" onClick={handleSendMessage} disabled={!composerText.trim() && !pendingImage} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition active:scale-95 disabled:opacity-40" aria-label="ส่งข้อความ">
            {uploadingImage || sendingMessage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelected} />
      </div>
    </div>
  )

  const desktopLayout = (
    <div className="hidden md:flex h-full min-h-0 overflow-hidden bg-[#F4F7F5]">
      <aside className="flex min-h-0 w-[360px] flex-col border-r border-gray-200 bg-white">
        <div className="flex shrink-0 flex-col border-b border-gray-100 bg-white/95 px-5 py-5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-gray-900">Messages</p>
              <p className="text-xs text-gray-500">Your inbox and requests</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200" aria-label="ปิด">
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
            <Search size={16} className="text-gray-400" />
            <input type="text" value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search conversations" className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none" aria-label="Search conversations" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          <div className="mb-3 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-gray-400"><span>Inbox</span><span>{filteredChats.length}</span></div>
          <div className="space-y-2 pr-1">
            {loading ? <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500"><Loader2 className="animate-spin shrink-0" size={16} /> กำลังโหลด...</div> : filteredChats.length > 0 ? filteredChats.map((chat) => {
              const isDeleting = deletingChatId === chat.id
              const isActive = selectedChat === chat.id
              const lastText = chatMeta?.[chat.id]?.lastText || chat.participant_email || 'Start chatting'
              const lastTime = chatMeta?.[chat.id]?.lastAt ? formatMessageTime(new Date(chatMeta[chat.id].lastAt).toISOString()) : ''
              const unread = chatMeta?.[chat.id]?.unread || 0
              const initials = (chat.participant_name || 'CMU').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={chat.id} className="group flex items-stretch gap-2">
                  <button type="button" className={`flex flex-1 min-w-0 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${isActive ? 'border-primary/20 bg-primary/5 shadow-sm' : 'border-transparent bg-white hover:border-gray-200 hover:bg-gray-50'}`} onClick={() => handleSelectChat(chat.id)}>
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">{initials}{unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2"><p className="truncate font-semibold text-gray-900">{chat.participant_name || 'นักศึกษา CMU'}</p><span className="shrink-0 text-[10px] text-gray-400">{lastTime}</span></div>
                      <p className="truncate text-xs text-gray-500">{lastText}</p>
                      <div className="mt-1 flex items-center justify-between gap-2"><p className="text-[11px] font-semibold text-primary">{getChatStatusLabel(chat)}</p>{unread > 0 ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span> : null}</div>
                    </div>
                  </button>
                  <button type="button" onClick={() => handleDeleteChat(chat.id)} disabled={isDeleting} className="flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full text-red-500 transition hover:bg-red-50 disabled:opacity-50" aria-label="ลบแชท">{isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}</button>
                </div>
              )
            }) : <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm"><MessageCircle size={28} className="text-primary" /></div><p className="font-semibold text-gray-700">No conversations yet</p><p className="mt-1 text-sm text-gray-500">Start a chat by entering a CMU email above.</p></div>}
          </div>
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FBFCFB]">
        {activeChat ? (
          <>
            <div className="shrink-0 border-b border-gray-200 bg-white/95 px-5 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">{(activeChat?.participant_name || 'CMU').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><p className="truncate text-lg font-semibold text-gray-900">{activeChat?.participant_name || 'นักศึกษา CMU'}</p><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${socketConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{socketConnected ? 'Online' : 'Connecting'}</span></div>
                  <p className="truncate text-xs text-gray-500">{activeChat?.participant_email || ''}</p>
                </div>
                <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200" aria-label="ปิด"><X size={18} /></button>
              </div>
            </div>
            <div ref={messageScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5" style={{ paddingBottom: `calc(${composerHeight}px + 1rem)` }}>
              {messagesLoading ? <div className="flex h-full items-center justify-center text-sm text-gray-500"><Loader2 className="mr-2 animate-spin" size={16} /> กำลังโหลดข้อความ...</div> : (
                <div className="space-y-3">
                  {groupedMessages.map((message) => {
                    const mine = message._mine
                    return (
                      <div key={getMessageId(message)} className={`flex ${mine ? 'justify-end' : 'justify-start'} ${message._groupStart ? 'mt-3' : 'mt-0.5'}`}>
                        <div className={`max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow-sm transition-opacity ${mine ? 'bg-primary text-white' : 'bg-white text-gray-800 border border-gray-200'} ${message.pending ? 'opacity-70' : 'opacity-100'}`}>
                          {message.image_url ? <img src={message.image_url} alt="attached" className="mb-2 max-h-72 w-full rounded-xl object-cover" /> : null}
                          {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                          {message.pending ? <p className={`mt-1 text-[10px] ${mine ? 'text-white/80' : 'text-gray-400'}`}>กำลังส่ง…</p> : null}
                          {message._showTimestamp ? <p className={`mt-1 text-[10px] ${mine ? 'text-white/75' : 'text-gray-400'}`}>{formatMessageTime(message.created_at)}</p> : null}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
            <div ref={composerRef} className="shrink-0 border-t border-gray-100 bg-white px-5 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
              {pendingImage ? <div className="mb-3 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-2"><img src={pendingImage} alt="preview" className="h-12 w-12 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-800">Image ready to send</p><p className="text-xs text-gray-500">แตะส่งเพื่ออัปโหลด</p></div><button type="button" onClick={() => setPendingImage(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500"><X size={16} /></button></div> : null}
              <div className="flex items-end gap-2">
                <button type="button" onClick={() => setShowActions((v) => !v)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700" aria-label="เปิดเมนูเพิ่มเติม"><Plus size={18} className={showActions ? 'rotate-45 transition-transform' : 'transition-transform'} /></button>
                <div className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
                  <input type="text" value={composerText} onChange={(e) => setComposerText(e.target.value)} placeholder="พิมพ์ข้อความ..." className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }} />
                </div>
                <button type="button" onClick={handleSendMessage} disabled={!composerText.trim() && !pendingImage} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40" aria-label="ส่งข้อความ">{uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button>
              </div>
              {showActions ? (
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2">
                  <button type="button" onClick={handlePickImage} className="flex flex-col items-center gap-2 rounded-2xl bg-white px-3 py-4 text-xs font-medium text-gray-700 shadow-sm"><Camera size={18} />รูปภาพ</button>
                  <button type="button" onClick={() => setShowActions(false)} className="flex flex-col items-center gap-2 rounded-2xl bg-white px-3 py-4 text-xs font-medium text-gray-700 shadow-sm"><X size={18} />ปิด</button>
<<<<<<< HEAD
<<<<<<< HEAD
                  <button type="button" onClick={() => setSheetOpen(false)} className="flex flex-col items-center gap-2 rounded-2xl bg-white px-3 py-4 text-xs font-medium text-gray-700 shadow-sm">Close</button>
=======
                  <button type="button" onClick={() => setShowActions(false)} className="flex flex-col items-center gap-2 rounded-2xl bg-white px-3 py-4 text-xs font-medium text-gray-700 shadow-sm"><MessageCircle size={18} />QR</button>
>>>>>>> parent of 6b0a321 (Final Chat)
=======
                  <button type="button" onClick={() => setShowActions(false)} className="flex flex-col items-center gap-2 rounded-2xl bg-white px-3 py-4 text-xs font-medium text-gray-700 shadow-sm"><MessageCircle size={18} />QR</button>
>>>>>>> parent of 6b0a321 (Final Chat)
                </div>
              ) : null}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelected} />
            </div>
          </>
        ) : (
          <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100"><MessageCircle className="text-gray-400" size={40} /></div>
            <p className="text-base font-medium text-gray-700">เลือกแชทหรือเริ่มแชทใหม่</p>
            <p className="max-w-xs text-sm text-gray-500">เลือกจากรายการด้านซ้าย หรือกรอกอีเมล @cmu.ac.th แล้วกด เริ่มแชท</p>
          </div>
        )}
      </main>
    </div>
  )

  const chatContent = (
    <div className="h-[100vh] min-h-0 overflow-hidden bg-[#F4F7F5] md:h-[min(92dvh,920px)] md:max-h-[92dvh] md:rounded-3xl">
      {mobileList}
      {mobileDetail}
      {desktopLayout}
    </div>
  )

  if (asPage && open) {
    return (
      <div className="min-h-screen bg-[#FAFBF9]">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mb-6 flex items-center justify-between gap-4"><div className="flex items-center gap-4"><Link to="/" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50" aria-label="กลับ"><ArrowLeft size={20} /></Link><div><h1 className="text-xl font-bold text-gray-900 sm:text-2xl">แชท</h1><p className="text-sm text-gray-500">{socketConnected ? 'เชื่อมต่อแล้ว · เลือกการสนทนาหรือสแกน QR' : 'กำลังเชื่อมต่อ...'}</p></div></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${socketConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{socketConnected ? 'ออนไลน์' : 'กำลังเชื่อมต่อ...'}</span></div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">{chatContent}</div>
        </div>
      </div>
    )
  }

  return <Modal open={open} onClose={onClose} title="แชท" subtitle={socketConnected ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ...'} size="xl" bodyClassName="!overflow-hidden !p-0">{chatContent}</Modal>
}
