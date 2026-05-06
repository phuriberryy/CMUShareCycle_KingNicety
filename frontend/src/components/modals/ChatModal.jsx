import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import { Link } from 'react-router-dom'
import { MessageCircle, X, ArrowLeft, Search } from 'lucide-react'
import Modal from '../ui/Modal'
import { API_BASE, chatApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import ChatInboxList from '../../features/chat/components/ChatInboxList'
import DesktopChatPanel from '../../features/chat/components/DesktopChatPanel'
import MobileChatPanel from '../../features/chat/components/MobileChatPanel'

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
  const messagesEndRef = useRef(null)
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

  const isMobileChatDetail = isMobile && selectedChat !== null
  const activeChat = useMemo(() => chats.find((c) => c.id === selectedChat) || null, [chats, selectedChat])
  const isNearBottom = useCallback(() => {
    const el = messageScrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }, [])
  const scrollToBottom = useCallback((behavior = 'auto') => {
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' }))
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
  }, [token, open, toast, chatMeta, updateChatMeta, bumpChatToTop, scrollToBottom, isNearBottom])

  useEffect(() => {
    activeChatRef.current = selectedChat
  }, [selectedChat])

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(messagesLoading ? 'auto' : 'smooth')
    }
  }, [messages, scrollToBottom, messagesLoading])

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
  }, [open, selectedChat, token, updateChatMeta, scrollToBottom, isNearBottom])

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 768)
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  useEffect(() => {
    if (open && isMobile) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
  }, [open, isMobile])

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

  useEffect(() => {
    if (!showActions) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setShowActions(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showActions])

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
      toast.error(err.message || 'ลบแชทไม่สำเร็จ')
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

  const chatListEmpty = (
    <div className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 text-left shadow-sm sm:p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 sm:h-11 sm:w-11">
        <MessageCircle size={20} className="text-primary" strokeWidth={2} />
      </div>
      <div className="min-w-0 py-0.5">
        <p className="text-sm font-semibold text-gray-900">ยังไม่มีการสนทนา</p>
        <p className="mt-0.5 text-xs leading-snug text-gray-500">พอมีคำขอแลกหรือบริจาค แชทจะขึ้นที่นี่</p>
      </div>
    </div>
  )

  const mobileList = (
    <div className={`flex h-full min-h-0 flex-col bg-white md:hidden ${isMobileChatDetail ? 'hidden' : 'flex'}`}>
      <div className="flex shrink-0 flex-col border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900">ข้อความ</p>
            <p className="text-xs text-gray-500">แชทจากคำขอแลกหรือบริจาค</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
            aria-label="ปิด"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
          <Search size={15} className="shrink-0 text-gray-400" />
          <input type="text" value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="ค้นหาชื่อหรืออีเมล" className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none" aria-label="ค้นหาชื่อหรืออีเมล" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-2.5">
        <div className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          <span>กล่องขาเข้า</span>
        </div>
        <ChatInboxList
          loading={loading}
          filteredChats={filteredChats}
          selectedChat={selectedChat}
          deletingChatId={deletingChatId}
          chatMeta={chatMeta}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          chatListEmpty={chatListEmpty}
          formatMessageTime={formatMessageTime}
        />
      </div>
    </div>
  )

  const mobileDetail = (
    <MobileChatPanel
      isOpen={isMobileChatDetail}
      activeChat={activeChat}
      socketConnected={socketConnected}
      handleBackToList={handleBackToList}
      messageScrollRef={messageScrollRef}
      composerHeight={composerHeight}
      messagesLoading={messagesLoading}
      groupedMessages={groupedMessages}
      getMessageId={getMessageId}
      formatMessageTime={formatMessageTime}
      bottomRef={messagesEndRef}
      composerRef={composerRef}
      sheetOpen={sheetOpen}
      setSheetOpen={setSheetOpen}
      handlePickImage={handlePickImage}
      pendingImage={pendingImage}
      setPendingImage={setPendingImage}
      composerText={composerText}
      setComposerText={setComposerText}
      handleSendMessage={handleSendMessage}
      uploadingImage={uploadingImage}
      sendingMessage={sendingMessage}
      fileInputRef={fileInputRef}
      handleImageSelected={handleImageSelected}
    />
  )

  const desktopLayout = (
    <div className="hidden md:flex h-full min-h-0 overflow-hidden bg-[#F4F7F5]">
      <aside className="flex min-h-0 w-[300px] shrink-0 flex-col border-r border-gray-200 bg-white lg:w-[320px]">
        <div className="flex shrink-0 flex-col border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-900">ข้อความ</p>
              <p className="text-xs text-gray-500">แชทจากคำขอแลกหรือบริจาค</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
              aria-label="ปิด"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
            <Search size={15} className="shrink-0 text-gray-400" />
            <input type="text" value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="ค้นหาชื่อหรืออีเมล" className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none" aria-label="ค้นหาชื่อหรืออีเมล" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-2.5">
          <div className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <span>กล่องขาเข้า</span>
          </div>
          <ChatInboxList
            loading={loading}
            filteredChats={filteredChats}
            selectedChat={selectedChat}
            deletingChatId={deletingChatId}
            chatMeta={chatMeta}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
            chatListEmpty={chatListEmpty}
            formatMessageTime={formatMessageTime}
          />
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FBFCFB]">
        <DesktopChatPanel
          activeChat={activeChat}
          socketConnected={socketConnected}
          handleBackToList={handleBackToList}
          messageScrollRef={messageScrollRef}
          composerHeight={composerHeight}
          messagesLoading={messagesLoading}
          groupedMessages={groupedMessages}
          getMessageId={getMessageId}
          formatMessageTime={formatMessageTime}
          bottomRef={bottomRef}
          composerRef={composerRef}
          pendingImage={pendingImage}
          setPendingImage={setPendingImage}
          setShowActions={setShowActions}
          showActions={showActions}
          handlePickImage={handlePickImage}
          composerText={composerText}
          setComposerText={setComposerText}
          handleSendMessage={handleSendMessage}
          uploadingImage={uploadingImage}
          pendingImageUploading={sendingMessage}
          fileInputRef={fileInputRef}
          handleImageSelected={handleImageSelected}
        />
      </main>
    </div>
  )

  const chatContent = (
    <div className="h-[100dvh] min-h-0 w-full overflow-hidden bg-[#F4F7F5] md:h-[min(92dvh,920px)] md:max-h-[92dvh] md:rounded-3xl">
      {mobileList}
      {mobileDetail}
      {desktopLayout}
    </div>
  )

  if (asPage && open) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mb-6 flex items-center justify-between gap-4"><div className="flex items-center gap-4"><Link to="/" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50" aria-label="กลับ"><ArrowLeft size={20} /></Link><div><h1 className="text-xl font-bold text-gray-900 sm:text-2xl">แชท</h1><p className="text-sm text-gray-500">{socketConnected ? 'เลือกการสนทนาจากรายการด้านซ้าย' : 'รอสักครู่ แล้วเลือกการสนทนา'}</p></div></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${socketConnected ? 'bg-primary/10 text-primary-dark' : 'bg-amber-50 text-amber-700'}`}>{socketConnected ? 'พร้อมแชท' : 'รอเชื่อมต่อ'}</span></div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">{chatContent}</div>
        </div>
      </div>
    )
  }

  return <Modal open={open} onClose={onClose} title="แชท" subtitle={socketConnected ? 'พร้อมแชท' : 'รอเชื่อมต่อ'} size="xl" bodyClassName="!overflow-hidden !p-0">{chatContent}</Modal>
}
