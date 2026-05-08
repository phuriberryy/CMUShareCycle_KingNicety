import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ChatInbox from './ChatInbox'
import ChatRoom from './ChatRoom'
import ConfirmDialog from '../ui/ConfirmDialog'

export default function ChatPage({
  open,
  chats = [],
  loading,
  deletingChatId,
  chatMeta,
  formatMessageTime,
  messages,
  messagesLoading,
  selectedChat,
  setSelectedChat,
  socketConnected,
  composerText,
  setComposerText,
  handleSendMessage,
  pendingImage,
  setPendingImage,
  handlePickImage,
  handleTakePhoto,
  uploadingImage,
  sendingMessage,
  setShowActions,
  showActions,
  onDeleteChat,
  onNewChat,
  isMobileInitially = false,
  onInboxBack,
  // Exchange confirmation
  onConfirmExchange,
  onAcceptChat,
  onDeclineChat,
  confirmingExchange  = false,
  acceptingChat       = false,
  decliningChat       = false,
  // Donation confirmation
  onConfirmDonation,
  confirmingDonation  = false,
}) {
  useAuth()
  const [isMobile, setIsMobile] = useState(isMobileInitially)
  const [chatSearch, setChatSearch] = useState('')
  const [startChatEmail, setStartChatEmail] = useState('')
  const [startingChat, setStartingChat] = useState(false)
  const [startChatError, setStartChatError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState(null)
  const conversations = Array.isArray(chats) ? chats : []
  const activeChat = conversations.find((c) => String(c?.id) === String(selectedChat)) || null
  // On mobile, show chat room if a chat is selected (even while the list is still loading)
  const hasChatSelected = Boolean(activeChat) || Boolean(selectedChat)
  const displayUser = (chat) => ({
    id: chat?.participant_id ?? chat?.creator_id ?? null,
    name: chat?.participant_name ?? chat?.other_user_name ?? 'นักศึกษา CMU',
    email: chat?.participant_email ?? chat?.other_user_email ?? '',
    avatar_url: chat?.participant_avatar_url ?? chat?.other_user_avatar_url ?? null,
  })
  const filteredChats = (() => {
    const query = chatSearch.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter((chat) => {
      const other = displayUser(chat)
      return (
        (other?.name || '').toLowerCase().includes(query) ||
        (other?.email || '').toLowerCase().includes(query) ||
        (chatMeta?.[chat.id]?.lastText || chat?.last_message?.body || '').toLowerCase().includes(query)
      )
    })
  })()

  const handleStartChat = async (email) => {
    const nextEmail = typeof email === 'string' ? email.trim() : startChatEmail.trim()
    if (!nextEmail || startingChat) return
    if (typeof onNewChat !== 'function') {
      setStartChatError('ไม่สามารถเริ่มแชทได้')
      return
    }
    setStartChatError('')
    setStartingChat(true)
    try {
      const created = await onNewChat(nextEmail)
      if (created?.id) setSelectedChat(String(created.id))
      setStartChatEmail('')
    } catch (err) {
      setStartChatError(err?.message || 'ไม่สามารถเริ่มแชทได้')
    } finally {
      setStartingChat(false)
    }
  }

  const openDeleteModal = (chatId) => {
    setPendingDeleteChatId(chatId)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setPendingDeleteChatId(null)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteChatId) return
    await onDeleteChat?.(pendingDeleteChatId)
    closeDeleteModal()
  }

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 768)
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  useEffect(() => {
    if (open && isMobile) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [open, isMobile])

  if (!open) return null

  return (
    <div className="chat-root fixed inset-0 flex flex-col bg-white md:flex-row overflow-hidden">
      <div className={`${isMobile && hasChatSelected ? 'hidden' : 'flex'} h-full min-h-0 w-full flex-col md:w-[320px] md:flex-none md:border-r md:border-gray-200`}>
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
          <button
            type="button"
            onClick={onInboxBack || (() => window.history.back())}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
            aria-label="กลับ"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        <ChatInbox
          loading={loading}
          chats={filteredChats}
          activeChat={selectedChat}
          deletingChatId={deletingChatId}
          chatMeta={chatMeta}
          onSelect={setSelectedChat}
          onDelete={openDeleteModal}
          onNewChat={onNewChat}
          searchValue={chatSearch}
          onSearchChange={setChatSearch}
          startChatEmail={startChatEmail}
          onStartChatEmailChange={setStartChatEmail}
          onStartChat={handleStartChat}
          startingChat={startingChat}
          startChatError={startChatError}
          formatMessageTime={formatMessageTime}
        />
      </div>

      <div className={`${isMobile ? (hasChatSelected ? 'flex' : 'hidden') : 'flex'} h-full min-h-0 flex-1 flex-col`}>
        <ChatRoom
          chat={activeChat}
          socketConnected={socketConnected}
          onBack={isMobile ? () => setSelectedChat(null) : null}
          messages={messages}
          messagesLoading={messagesLoading}
          formatMessageTime={formatMessageTime}
          getMessageId={(m) => m?.id ?? `${m?.created_at || ''}-${m?.sender_id || ''}`}
          composerText={composerText}
          setComposerText={setComposerText}
          handleSendMessage={handleSendMessage}
          pendingImage={pendingImage}
          setPendingImage={setPendingImage}
          handlePickImage={handlePickImage}
          handleTakePhoto={handleTakePhoto}
          uploadingImage={uploadingImage}
          sendingMessage={sendingMessage}
          setShowActions={setShowActions}
          showActions={showActions}
          onConfirmExchange={onConfirmExchange}
          onAcceptChat={onAcceptChat}
          onDeclineChat={onDeclineChat}
          confirmingExchange={confirmingExchange}
          acceptingChat={acceptingChat}
          decliningChat={decliningChat}
          onConfirmDonation={onConfirmDonation}
          confirmingDonation={confirmingDonation}
        />
      </div>

      <ConfirmDialog
        open={showDeleteModal}
        variant="danger"
        title="ลบห้องแชท?"
        description={
          <span>
            คุณแน่ใจหรือไม่ว่าต้องการลบห้องแชทนี้?
            <br />
            <span className="text-gray-500">การลบไม่สามารถย้อนกลับได้</span>
          </span>
        }
        confirmLabel="ลบห้องแชท"
        cancelLabel="ยกเลิก"
        loading={Boolean(deletingChatId)}
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
      />
    </div>
  )
}
