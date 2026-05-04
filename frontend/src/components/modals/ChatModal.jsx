import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import { Link } from 'react-router-dom'
import { Send, MessageCircle, Loader2, X, Trash2, Camera, ArrowLeft, Search } from 'lucide-react'
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
  const { token } = useAuth()
  const toast = useToast()
  const [chats, setChats] = useState([])
  const [chatMeta, setChatMeta] = useState({})
  const [activeChatId, setActiveChatId] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [chatSearch, setChatSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [deletingChatId, setDeletingChatId] = useState(null)
  const [showChatList, setShowChatList] = useState(true)
  const socketRef = useRef(null)
  const activeChatRef = useRef(null)
  const bottomRef = useRef(null)
  const CHAT_META_STORAGE_KEY = 'sharecycle_chat_meta_v1'

  const readChatMeta = useCallback(() => {
    try { const raw = localStorage.getItem(CHAT_META_STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : {}; return parsed && typeof parsed === 'object' ? parsed : {} } catch { return {} }
  }, [])
  const writeChatMeta = useCallback((next) => { try { localStorage.setItem(CHAT_META_STORAGE_KEY, JSON.stringify(next || {})) } catch {} }, [])
  const updateChatMeta = useCallback((chatId, patch) => { if (!chatId) return; setChatMeta((prev) => { const next = { ...(prev || {}) }; next[chatId] = { ...(next[chatId] || {}), ...(patch || {}) }; writeChatMeta(next); return next }) }, [writeChatMeta])
  const bumpChatToTop = useCallback((chatId) => { if (!chatId) return; setChats((prev) => { const idx = prev.findIndex((c) => c?.id === chatId); if (idx <= 0) return prev; const next = [...prev]; const [moved] = next.splice(idx, 1); next.unshift(moved); return next }) }, [])
  const getChatStatusLabel = (chat) => chat ? (chat.status === 'active' ? (chat.qrConfirmed ? 'ยืนยันแล้ว' : 'พร้อมแชท') : chat.status === 'pending' ? ((chat.ownerAccepted || chat.requesterAccepted) ? 'รออีกฝ่ายยืนยัน' : 'รอยืนยัน') : chat.status === 'declined' ? 'ถูกปฏิเสธ' : chat.status) : ''

  useEffect(() => { if (open) setChatMeta(readChatMeta()) }, [open, readChatMeta])
  useEffect(() => { if (!open || !token) return; setLoading(true); chatApi.list(token).then((data) => { const list = Array.isArray(data) ? data : []; const meta = readChatMeta(); const sorted = [...list].sort((a, b) => ((b?.id ? meta[b.id]?.lastAt : null) || 0) - ((a?.id ? meta[a.id]?.lastAt : null) || 0)); setChats(sorted); setActiveChatId((c) => c ?? initialChatId ?? (sorted[0]?.id ?? null)) }).catch(() => setChats([])).finally(() => setLoading(false)) }, [open, token, initialChatId, readChatMeta])
  useEffect(() => { if (!token || !open) return; const socket = io(SOCKET_URL, { auth: { token }, reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 5000, reconnectionAttempts: Infinity, timeout: 20000, transports: ['polling', 'websocket'], upgrade: true }); socketRef.current = socket; socket.on('connect', () => { setSocketConnected(true); if (activeChatRef.current) socket.emit('chat:join', { chatId: activeChatRef.current }) }); socket.on('chat:error', ({ message }) => toast.error(message || 'ไม่สามารถส่งข้อความได้', 'เกิดข้อผิดพลาด')); socket.on('chat:message', (message) => { const chatId = message?.chat_id; if (!chatId) return; const preview = (message.body || '').trim() || (message.image_url ? '📷 รูปภาพ' : '') || ''; const nowMs = Date.now(); const atMs = message.created_at ? new Date(message.created_at).getTime() : nowMs; updateChatMeta(chatId, { lastText: preview, lastAt: atMs, unread: activeChatRef.current === chatId ? 0 : ((chatMeta?.[chatId]?.unread || 0) + 1) }); bumpChatToTop(chatId) }); return () => socket.disconnect() }, [token, open, toast, chatMeta, updateChatMeta, bumpChatToTop])

  const filteredChats = useMemo(() => { const query = chatSearch.trim().toLowerCase(); if (!query) return chats; return chats.filter((chat) => ((chat.participant_name || '').toLowerCase().includes(query) || (chat.participant_email || '').toLowerCase().includes(query) || (chatMeta?.[chat.id]?.lastText || '').toLowerCase().includes(query))) }, [chats, chatSearch, chatMeta])
  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId) || null, [chats, activeChatId])

  const handleSelectChat = (chatId) => { setActiveChatId(chatId); setShowChatList(false) }
  const handleBackToList = () => setShowChatList(true)
  const handleDeleteChat = async (chatId) => { if (!token || !chatId) return; if (!window.confirm('ลบแชทนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) return; setDeletingChatId(chatId); try { await chatApi.delete(token, chatId); setChats((prev) => prev.filter((chat) => chat.id !== chatId)); if (activeChatId === chatId) { setActiveChatId(null) } toast.success('ลบแชทแล้ว') } catch (err) { toast.error(err.message || 'Failed to delete chat') } finally { setDeletingChatId(null) } }

  const chatContent = (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#F4F7F5] md:h-[min(92vh,920px)] md:max-h-[92vh] md:rounded-3xl">
      <div className="flex min-h-0 flex-1 overflow-hidden md:rounded-3xl md:border md:border-gray-200 md:bg-white md:shadow-2xl">
        <aside className={`flex min-h-0 w-full flex-col border-gray-200 bg-white md:w-[360px] md:border-r ${showChatList && !activeChatId ? 'flex' : 'hidden md:flex'}`}>
          <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur-sm md:px-5 md:py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-gray-900">Messages</p>
                <p className="text-xs text-gray-500">Your inbox and requests</p>
              </div>
              <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 md:hidden" aria-label="ปิด">
                <X size={18} />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
              <Search size={16} className="text-gray-400" />
              <input type="text" value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search conversations" className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none" aria-label="Search conversations" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 md:px-4">
            <div className="mb-3 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-gray-400"><span>Inbox</span><span>{filteredChats.length}</span></div>
            <div className="space-y-2 pr-1">
              {loading ? <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500"><Loader2 className="animate-spin shrink-0" size={16} /> กำลังโหลด...</div> : filteredChats.length > 0 ? filteredChats.map((chat) => {
                const isDeleting = deletingChatId === chat.id
                const isActive = activeChatId === chat.id
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

        <main className={`${showChatList && !activeChatId ? 'hidden md:flex' : 'flex'} min-h-0 flex-1 flex-col bg-[#FBFCFB]`}>
          {activeChat ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-5 sm:py-4">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={handleBackToList} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 md:hidden" aria-label="กลับไปรายการแชท"><ArrowLeft size={18} /></button>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">{(activeChat?.participant_name || 'CMU').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><p className="truncate text-base font-semibold text-gray-900 sm:text-lg">{activeChat?.participant_name || 'นักศึกษา CMU'}</p><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${socketConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{socketConnected ? 'Online' : 'Connecting'}</span></div>
                    <p className="truncate text-xs text-gray-500">{activeChat?.participant_email || ''}</p>
                  </div>
                  <button type="button" onClick={onClose} className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 md:flex" aria-label="ปิด"><X size={18} /></button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex h-full items-center justify-center text-gray-400">Chat area</div>
                <div ref={bottomRef} />
              </div>
              <div className="sticky bottom-0 z-10 shrink-0 border-t border-gray-100 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] sm:px-5">
                <div className="flex items-end gap-2 sm:gap-3">
                  <button type="button" className="h-10 w-10 rounded-xl bg-gray-100" aria-label="ถ่ายรูป"><Camera size={18} /></button>
                  <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 py-2 pl-4 pr-3"><input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="พิมพ์ข้อความ..." className="w-full bg-transparent text-sm focus:outline-none" /></div>
                  <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white"><Send size={20} /></button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100"><MessageCircle className="text-gray-400" size={40} /></div>
              <p className="text-base font-medium text-gray-700">เลือกแชทหรือเริ่มแชทใหม่</p>
              <p className="max-w-xs text-sm text-gray-500">เลือกจากรายการด้านซ้าย หรือกรอกอีเมล @cmu.ac.th แล้วกด เริ่มแชท</p>
            </div>
          )}
        </main>
      </div>
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

  return <Modal open={open} onClose={onClose} title="แชท" subtitle={socketConnected ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ...'} size="xl">{chatContent}</Modal>
}
