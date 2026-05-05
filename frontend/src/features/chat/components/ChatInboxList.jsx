import { Loader2, Trash2 } from 'lucide-react'
import { getChatStatusLabel } from '../utils/chatStatus'

export default function ChatInboxList({
  loading,
  filteredChats,
  selectedChat,
  deletingChatId,
  chatMeta,
  onSelectChat,
  onDeleteChat,
  chatListEmpty,
  formatMessageTime,
}) {
  return (
    <div className="flex flex-col gap-2">
      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          กำลังโหลด...
        </div>
      ) : filteredChats.length > 0 ? (
        filteredChats.map((chat) => {
          const isDeleting = deletingChatId === chat.id
          const isActive = selectedChat === chat.id
          const lastText = chatMeta?.[chat.id]?.lastText || chat.participant_email || 'เริ่มแชท'
          const lastTime = chatMeta?.[chat.id]?.lastAt
            ? formatMessageTime(new Date(chatMeta[chat.id].lastAt).toISOString())
            : ''
          const unread = chatMeta?.[chat.id]?.unread || 0
          const initials = (chat.participant_name || 'CMU')
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()

          return (
            <div key={chat.id} className="group flex items-stretch gap-1.5">
              <button
                type="button"
                className={`flex min-w-0 flex-1 items-start gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm transition hover:shadow-md ${
                  isActive ? 'border-primary/30 ring-1 ring-primary/15' : 'border-gray-200'
                } ${!isActive && unread > 0 ? 'border-l-[3px] border-l-primary' : ''}`}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-white shadow-sm">
                  {initials}
                  {unread > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {chat.participant_name || 'นักศึกษา CMU'}
                    </p>
                    {lastTime ? <span className="shrink-0 text-[10px] text-gray-400">{lastTime}</span> : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-600">{lastText}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-primary">{getChatStatusLabel(chat)}</p>
                    {unread > 0 ? (
                      <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onDeleteChat(chat.id)}
                disabled={isDeleting}
                className="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-xl text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                aria-label="ลบแชท"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          )
        })
      ) : (
        chatListEmpty
      )}
    </div>
  )
}
