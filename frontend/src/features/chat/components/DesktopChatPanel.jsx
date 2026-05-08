import { ArrowLeft, Camera, Image as ImageIcon, Loader2, MessageCircle, Plus, Send, X } from 'lucide-react'

export default function DesktopChatPanel({
  activeChat,
  socketConnected,
  handleBackToList,
  messageScrollRef,
  composerHeight,
  messagesLoading,
  groupedMessages,
  getMessageId,
  formatMessageTime,
  bottomRef,
  composerRef,
  pendingImage,
  setPendingImage,
  setShowActions,
  showActions,
  handlePickImage,
  handleTakePhoto,
  composerText,
  setComposerText,
  handleSendMessage,
  uploadingImage,
  pendingImageUploading,
}) {
  if (!activeChat) {
    return (
      <div className="grid min-h-0 w-full flex-1 place-content-center px-4 py-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-md gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 sm:h-11 sm:w-11">
            <MessageCircle className="text-primary/80" size={20} strokeWidth={2} />
          </div>
          <div className="min-w-0 py-0.5">
            <p className="text-sm font-semibold text-gray-900">เลือกการสนทนา</p>
            <p className="mt-0.5 text-xs leading-snug text-gray-500">
              แตะรายการซ้าย หรือเริ่มแชทด้วยอีเมล @cmu.ac.th
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="shrink-0 border-b border-gray-200 bg-white/95 px-5 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackToList}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
            aria-label="กลับไปรายการแชท"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">
            {(activeChat?.participant_name || activeChat?.other_user_name || 'CMU')
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-semibold text-gray-900">
                {activeChat?.participant_name || activeChat?.other_user_name || 'นักศึกษา CMU'}
              </p>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  socketConnected ? 'bg-primary/10 text-primary-dark' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {socketConnected ? 'ออนไลน์' : 'รอเชื่อมต่อ'}
              </span>
            </div>
            <p className="truncate text-xs text-gray-500">{activeChat?.participant_email || activeChat?.other_user_email || ''}</p>
          </div>
        </div>
      </div>
      <div
        ref={messageScrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5"
        style={{ paddingBottom: `calc(${composerHeight}px + 1rem)` }}
      >
        {messagesLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            <Loader2 className="mr-2 animate-spin" size={16} /> กำลังโหลดข้อความ...
          </div>
        ) : (
          <div className="space-y-3">
            {groupedMessages.map((message) => {
              const mine = message._mine
              return (
                <div
                  key={getMessageId(message)}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'} ${
                    message._groupStart ? 'mt-3' : 'mt-0.5'
                  }`}
                >
                  <div
                    className={`max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow-sm transition-opacity ${
                      mine
                        ? 'bg-primary text-white'
                        : 'border border-gray-200 bg-white text-gray-800'
                    } ${message.pending ? 'opacity-70' : 'opacity-100'}`}
                  >
                    {message.image_url ? (
                      <img
                        src={message.image_url}
                        alt="รูปที่แนบ"
                        className="mb-2 max-h-72 w-full rounded-xl object-cover"
                      />
                    ) : null}
                    {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                    {message.pending ? (
                      <p className={`mt-1 text-[10px] ${mine ? 'text-white/80' : 'text-gray-400'}`}>
                        กำลังส่ง…
                      </p>
                    ) : null}
                    {message._showTimestamp ? (
                      <p className={`mt-1 text-[10px] ${mine ? 'text-white/75' : 'text-gray-400'}`}>
                        {formatMessageTime(message.created_at)}
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <div
        ref={composerRef}
        className="relative shrink-0 border-t border-gray-100 bg-white px-5 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.04)]"
      >
        {pendingImage ? (
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-2">
            <img src={pendingImage?.previewUrl} alt="ตัวอย่างรูป" className="h-12 w-12 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800">พร้อมส่งรูป</p>
              <p className="text-xs text-gray-500">กดส่งเพื่ออัปโหลดรูป</p>
            </div>
            <button
              type="button"
              onClick={() => setPendingImage(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setShowActions((v) => !v)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700"
            aria-label="เปิดเมนูเพิ่มเติม"
          >
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
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={(!composerText.trim() && !pendingImage) || uploadingImage}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
            aria-label="ส่งข้อความ"
          >
            {uploadingImage || pendingImageUploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        {showActions ? (
          <>
            <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowActions(false)} />
            <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="w-full max-w-[400px] translate-y-0 transform rounded-t-3xl border border-gray-200 bg-white p-4 shadow-2xl transition-all duration-300 ease-out sm:rounded-3xl">
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-200" />
                <button
                  type="button"
                  onClick={() => {
                    handlePickImage()
                    setShowActions(false)
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-800 transition active:scale-[0.98] hover:bg-gray-50"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ImageIcon size={18} />
                  </span>
                  อัปโหลดรูป
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleTakePhoto()
                    setShowActions(false)
                  }}
                  className="mt-2 flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-800 transition active:scale-[0.98] hover:bg-gray-50"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Camera size={18} />
                  </span>
                  เปิดกล้อง
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}
