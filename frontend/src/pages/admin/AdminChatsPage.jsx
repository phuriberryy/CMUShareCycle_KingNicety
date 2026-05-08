import { useEffect, useState } from 'react'
import { MessageCircle, Trash2 } from 'lucide-react'
import { adminApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import ConfirmDialog from '../../components/admin/ConfirmDialog'

export default function AdminChatsPage() {
  const { token } = useAuth()
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [confirmState, setConfirmState] = useState(null)

  const fetchChats = () => {
    if (!token) return
    setLoading(true)
    setError('')
    adminApi
      .listChats(token, { page, pageSize })
      .then((res) => {
        setChats(res.data || [])
        setTotal(res.pagination?.total || 0)
      })
      .catch((err) => {
        console.error('Failed to load chats:', err)
        setError(err.message || 'Failed to load chats')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchChats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

  const fetchMessages = (chat) => {
    if (!token || !chat) return
    setLoadingMessages(true)
    adminApi
      .getChatMessages(token, chat.id)
      .then((rows) => setMessages(rows || []))
      .catch((err) => {
        console.error('Failed to load chat messages:', err)
        setMessages([])
      })
      .finally(() => setLoadingMessages(false))
  }

  const handleSelectChat = (chat) => {
    setSelectedChat(chat)
    fetchMessages(chat)
  }

  const openConfirm = (message) => {
    setConfirmState({ message, loading: false })
  }
  const closeConfirm = () => setConfirmState(null)

  const handleConfirm = async () => {
    if (!confirmState || !token || !selectedChat) return
    const { message } = confirmState
    setConfirmState((prev) => ({ ...prev, loading: true }))
    try {
      await adminApi.deleteMessage(token, selectedChat.id, message.id)
      closeConfirm()
      fetchMessages(selectedChat)
    } catch (err) {
      console.error('Admin delete message failed:', err)
      setConfirmState((prev) => ({ ...prev, loading: false }))
    }
  }

  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">แชท</h1>
        <p className="mt-1 text-sm text-gray-600">
          ตรวจสอบบทสนทนาและลบข้อความที่ละเมิดกฎของชุมชน
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading && <div className="p-4 text-sm text-gray-500">กำลังโหลดแชท...</div>}
          {error && !loading && <div className="p-4 text-sm text-red-600">{error}</div>}
          {!loading && !error && (
            <>
              <div className="space-y-2 p-3 md:hidden">
                {chats.map((chat) => (
                  <button key={chat.id} type="button" onClick={() => handleSelectChat(chat)} className={`w-full rounded-2xl border px-4 py-3 text-left shadow-sm ${selectedChat?.id === chat.id ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}>
                    <p className="truncate text-sm font-semibold text-gray-900">{chat.creator_email} ↔ {chat.participant_email}</p>
                    <p className="mt-1 text-xs text-gray-500">สถานะ: {chat.status || 'pending'} · {new Date(chat.created_at).toLocaleString()}</p>
                  </button>
                ))}
                {chats.length === 0 && <p className="p-3 text-sm text-gray-500">ไม่พบห้องแชท</p>}
              </div>
              <div className="hidden max-h-[480px] space-y-1 overflow-y-auto p-3 md:block">
                {chats.map((chat) => (<button key={chat.id} type="button" onClick={() => handleSelectChat(chat)} className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left text-sm hover:bg-gray-50 ${selectedChat?.id === chat.id ? 'bg-gray-50' : ''}`}><span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><MessageCircle size={16} /></span><div className="flex-1"><p className="font-semibold text-gray-900">{chat.creator_email} ↔ {chat.participant_email}</p><p className="mt-0.5 text-xs text-gray-500">สถานะ: {chat.status || 'pending'}</p><p className="mt-0.5 text-[11px] text-gray-400">สร้าง {new Date(chat.created_at).toLocaleString()}</p></div></button>))}
                {chats.length === 0 && <p className="p-3 text-sm text-gray-500">ไม่พบห้องแชท</p>}
              </div>
            </>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2 text-xs text-gray-500"><span>หน้า {page} จาก {totalPages}</span><div className="flex gap-2"><button type="button" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-700 disabled:opacity-50">ก่อนหน้า</button><button type="button" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-700 disabled:opacity-50">ถัดไป</button></div></div>
          )}
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">{selectedChat ? (<div className="flex flex-col"><span className="text-sm font-semibold text-gray-900">{selectedChat.creator_email} ↔ {selectedChat.participant_email}</span><span className="text-xs text-gray-500">รหัสแชท: {selectedChat.id}</span></div>) : (<p className="text-sm text-gray-500">เลือกห้องแชทเพื่อดูข้อความ</p>)}</div>
          <div className="flex-1 overflow-y-auto px-4 py-3">{selectedChat && loadingMessages && (<p className="text-sm text-gray-500">กำลังโหลดข้อความ...</p>)}{selectedChat && !loadingMessages && messages.length === 0 && (<p className="text-sm text-gray-500">ยังไม่มีข้อความ</p>)}{selectedChat && !loadingMessages && messages.map((message) => (<div key={message.id} className="mb-3 flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-800"><div className="flex-1"><p className="font-semibold text-gray-900">{message.sender_email || message.sender_name || 'ไม่ทราบผู้ส่ง'}</p><p className="mt-1 text-gray-700">{message.body}</p><p className="mt-1 text-[10px] text-gray-400">{new Date(message.created_at).toLocaleString()}</p></div><button type="button" onClick={() => openConfirm(message)} className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"><Trash2 size={12} /></button></div>))}</div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title="ลบข้อความ"
        description={
          confirmState?.message
            ? 'ยืนยันการลบข้อความนี้? (ข้อความจะถูกซ่อนจากการสนทนา)'
            : ''
        }
        confirmLabel="ลบ"
        loading={confirmState?.loading}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </div>
  )
}

