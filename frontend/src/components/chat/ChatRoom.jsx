import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Camera, Image as ImageIcon, Loader2, MessageCircle, Plus, Send, X } from 'lucide-react'

export default function ChatRoom({
  chat,
  socketConnected,
  onBack,
  messages,
  messagesLoading,
  formatMessageTime,
  getMessageId,
  composerText,
  setComposerText,
  handleSendMessage,
  pendingImage,
  setPendingImage,
  handlePickImage,
  fileInputRef,
  handleImageSelected,
  uploadingImage,
  sendingMessage,
  setShowActions,
  showActions,
}) {
  const bottomRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const composerRef = useRef(null)
  const [composerHeight, setComposerHeight] = useState(88)

  const safeMessages = Array.isArray(messages) ? messages : []
  const groupedMessages = safeMessages

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages])

  useEffect(() => {
    if (!composerRef.current) return
    const updateHeight = () => setComposerHeight(Math.ceil(composerRef.current.getBoundingClientRect().height))
    updateHeight()
    const ro = new ResizeObserver(updateHeight)
    ro.observe(composerRef.current)
    window.addEventListener('resize', updateHeight)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [showActions, pendingImage, composerText])

  if (!chat) {
    return (
      <div className="grid h-full min-h-0 w-full place-content-center bg-[#FBFCFB] px-6 py-8">
        <div className="flex max-w-sm gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
            <MessageCircle className="text-primary/80" size={20} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Select a chat</p>
            <p className="mt-0.5 text-xs leading-snug text-gray-500">Choose a conversation from the inbox.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-room flex h-[100dvh] w-full flex-col bg-white">
      <header className="chat-header sticky top-0 z-20 flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-2.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600"
            aria-label="กลับไปรายการแชท"
          >
            <ArrowLeft size={18} />
          </button>
        ) : null}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-sm">
          {(chat?.participant_name || 'CMU').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-gray-900">{chat?.participant_name || 'นักศึกษา CMU'}</p>
          <p className="truncate text-xs text-gray-500">{chat?.participant_email || ''}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${socketConnected ? 'bg-primary/10 text-primary-dark' : 'bg-amber-50 text-amber-700'}`}>
          {socketConnected ? 'ออนไลน์' : 'รอเชื่อมต่อ'}
        </span>
      </header>

      <div ref={messagesContainerRef} className="chat-messages min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2" style={{ paddingBottom: `calc(${composerHeight}px + env(safe-area-inset-bottom) + 0.5rem)` }}>
        {!chat ? null : messagesLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            <Loader2 className="mr-2 animate-spin" size={16} /> กำลังโหลดข้อความ...
          </div>
        ) : groupedMessages.length > 0 ? (
          <div className="space-y-1.5">
            {groupedMessages.map((message) => {
              const mine = message._mine
              return (
                <div key={getMessageId(message)} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-gray-800'} ${message.pending ? 'opacity-70' : 'opacity-100'}`}>
                    {message.image_url ? <img src={message.image_url} alt="รูปที่แนบ" className="mb-2 max-h-72 w-full rounded-xl object-cover" /> : null}
                    {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                    {message.pending ? <p className={`mt-1 text-[10px] ${mine ? 'text-white/80' : 'text-gray-400'}`}>กำลังส่ง…</p> : null}
                    {message._showTimestamp ? <p className={`mt-1 text-[10px] ${mine ? 'text-white/75' : 'text-gray-400'}`}>{formatMessageTime(message.created_at)}</p> : null}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-gray-500">
            <div>
              <p className="font-medium text-gray-700">ยังไม่มีข้อความ</p>
              <p className="mt-1 text-sm text-gray-500">ส่งข้อความแรกได้เลย</p>
            </div>
          </div>
        )}
      </div>

      <div ref={composerRef} className="chat-composer sticky bottom-0 z-10 shrink-0 border-t border-gray-100 bg-white px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {pendingImage ? (
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-2">
            <img src={pendingImage} alt="ตัวอย่างรูป" className="h-12 w-12 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800">พร้อมส่งรูป</p>
              <p className="text-xs text-gray-500">กดส่งเพื่ออัปโหลดรูป</p>
            </div>
            <button type="button" onClick={() => setPendingImage(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500">
              <X size={16} />
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <button type="button" onClick={() => setShowActions((v) => !v)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700" aria-label="เปิดเมนูเพิ่มเติม">
            <Plus size={18} className={showActions ? 'rotate-45 transition-transform' : 'transition-transform'} />
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
          <button type="button" onClick={handleSendMessage} disabled={!composerText.trim() && !pendingImage} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40" aria-label="ส่งข้อความ">
            {uploadingImage || sendingMessage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        {showActions ? (
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowActions(false)} />
        ) : null}
        {showActions ? (
          <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
            <div className="w-full max-w-[400px] rounded-t-3xl border border-gray-200 bg-white p-4 shadow-2xl">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-200" />
              <button type="button" onClick={() => { handlePickImage(); setShowActions(false) }} className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ImageIcon size={18} /></span>
                อัปโหลดรูป
              </button>
              <button type="button" onClick={() => { handlePickImage(); setShowActions(false) }} className="mt-2 flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Camera size={18} /></span>
                เปิดกล้อง
              </button>
            </div>
          </div>
        ) : null}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelected} />
      </div>
    </div>
  )
}
