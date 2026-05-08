import { Loader2, Plus, Trash2 } from 'lucide-react'
import { getChatStatusLabel } from '../../features/chat/utils/chatStatus'

export default function ChatInbox({
  loading,
  chats,
  activeChat,
  deletingChatId,
  chatMeta,
  onSelect,
  onDelete,
  searchValue,
  onSearchChange,
  startChatEmail,
  onStartChatEmailChange,
  onStartChat,
  startingChat,
  startChatError,
  formatMessageTime,
}) {
  const handleStartClick = async () => {
    const email = startChatEmail
    if (!onStartChat || !email?.trim()) return
    try {
      await onStartChat(email.trim())
    } catch (err) {
      console.error('START CHAT CLICK FAILED', err)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900">ข้อความ</p>
            <p className="text-xs text-gray-500">แชทจากคำขอแลกหรือบริจาค</p>
          </div>
        </div>
        <div className="mt-2.5 flex gap-2">
          <input
            type="email"
            value={startChatEmail}
            onChange={(e) => onStartChatEmailChange(e.target.value)}
            placeholder="เริ่มแชทด้วยอีเมล"
            className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          <button
            type="button"
            onClick={handleStartClick}
            disabled={startingChat || !startChatEmail.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {startingChat ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            เริ่มแชท
          </button>
        </div>
        {startChatError ? <p className="mt-2 text-xs text-red-600">{startChatError}</p> : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2.5">
        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            กำลังโหลด...
          </div>
        ) : chats.length > 0 ? (
          <div className="flex flex-col gap-2">
            {chats.map((chat) => {
              const isDeleting = deletingChatId === chat.id
              const unread = chatMeta?.[chat.id]?.unread || 0
              const displayName = chat.participant_name || chat.other_user_name || 'นักศึกษา CMU'
              const displayEmail = chat.participant_email || chat.other_user_email || ''
              const lastText = chatMeta?.[chat.id]?.lastText || displayEmail || 'เริ่มแชท'
              const lastTime = chatMeta?.[chat.id]?.lastAt ? formatMessageTime(new Date(chatMeta[chat.id].lastAt).toISOString()) : ''
              const initials = displayName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
              const isActive = activeChat === chat.id
              return (
                <div key={chat.id} className="group flex items-stretch gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelect(chat.id)}
                    className={`flex min-w-0 flex-1 items-start gap-3 rounded-2xl border bg-white p-3 text-left transition hover:shadow-sm ${isActive ? 'border-primary/30 ring-1 ring-primary/15' : 'border-gray-200'}`}
                  >
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-white">
                      {initials}
                      {unread > 0 ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
                        {lastTime ? <span className="shrink-0 text-[10px] text-gray-400">{lastTime}</span> : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-600">{lastText}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-primary">{getChatStatusLabel(chat)}</p>
                        {unread > 0 ? <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span> : null}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(chat.id)}
                    disabled={isDeleting}
                    className="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-xl text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                    aria-label="ลบแชท"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 text-left shadow-sm">
            <div className="min-w-0 py-0.5">
              <p className="text-sm font-semibold text-gray-900">ยังไม่มีการสนทนา</p>
              <p className="mt-0.5 text-xs leading-snug text-gray-500">พอมีคำขอแลกหรือบริจาค แชทจะขึ้นที่นี่</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
