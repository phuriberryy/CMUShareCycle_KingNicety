import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import ChatInbox from './ChatInbox'
import ChatRoom from './ChatRoom'

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
  fileInputRef,
  handleImageSelected,
  uploadingImage,
  sendingMessage,
  setShowActions,
  showActions,
  onDeleteChat,
  onNewChat,
  isMobileInitially = false,
}) {
  const { user } = useAuth()
  const [isMobile, setIsMobile] = useState(isMobileInitially)
  const [chatSearch, setChatSearch] = useState('')
  const [startChatEmail, setStartChatEmail] = useState('')
  const [startingChat, setStartingChat] = useState(false)
  const [startChatError, setStartChatError] = useState('')
  const conversations = Array.isArray(chats) ? chats : []
  const activeChat = conversations.find((c) => String(c?.id) === String(selectedChat)) || null
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

  const handleStartChat = async () => {
    const email = startChatEmail.trim()
    if (!email || !startingChat) {
      if (!email) return
    }
    if (!email || startingChat) return
    setStartChatError('')
    setStartingChat(true)
    try {
      const newChat = await onNewChat?.(await Promise.resolve())
      if (typeof onNewChat === 'function') {
        const created = await onNewChat({ email })
        if (created?.id) setSelectedChat(String(created.id))
      }
      setStartChatEmail('')
    } catch (err) {
      setStartChatError(err?.message || 'ไม่สามารถเริ่มแชทได้')
    } finally {
      setStartingChat(false)
    }
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
    <div className="chat-root flex h-[100dvh] w-screen flex-col bg-white md:h-auto md:w-full md:flex-row md:overflow-hidden">
      <div className={`${isMobile && activeChat ? 'hidden' : 'flex'} h-full min-h-0 w-full flex-col md:w-[320px] md:flex-none md:border-r md:border-gray-200`}>
        <ChatInbox
          loading={loading}
          chats={filteredChats}
          activeChat={selectedChat}
          deletingChatId={deletingChatId}
          chatMeta={chatMeta}
          onSelect={setSelectedChat}
          onDelete={onDeleteChat}
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

      <div className={`${isMobile ? (activeChat ? 'flex' : 'hidden') : 'flex'} h-full min-h-0 flex-1 flex-col`}>
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
          fileInputRef={fileInputRef}
          handleImageSelected={handleImageSelected}
          uploadingImage={uploadingImage}
          sendingMessage={sendingMessage}
          setShowActions={setShowActions}
          showActions={showActions}
        />
      </div>
    </div>
  )
}
