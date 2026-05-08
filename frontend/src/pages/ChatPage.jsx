import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_BASE, chatApi } from '../lib/api'
import ChatPageView from '../components/chat/ChatPage'

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const SOCKET_URL = (API_BASE || '').replace(/\/api$/, '')

export default function ChatPage() {
  const navigate = useNavigate()
  const { token, loading: authLoading, user } = useAuth()
  const initialChatId = null

  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(initialChatId)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [composerText, setComposerText] = useState('')
  const [pendingImage, setPendingImage] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [deletingChatId, setDeletingChatId] = useState(null)
  const [chatMeta, setChatMeta] = useState({})
  const [socketConnected, setSocketConnected] = useState(false)
  const [confirmingExchange, setConfirmingExchange] = useState(false)
  const [acceptingChat, setAcceptingChat] = useState(false)
  const [decliningChat, setDecliningChat] = useState(false)
  const fileInputRef = useRef(null)
  const socketRef = useRef(null)
  const selectedChatRef = useRef(null)
  const messagesRef = useRef([])

  useEffect(() => {
    selectedChatRef.current = selectedChat
  }, [selectedChat])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const normalizedChats = useMemo(() => (Array.isArray(chats) ? chats : []), [chats])
  const activeChat = normalizedChats.find((c) => String(c?.id) === String(selectedChat)) || null

  const normalizeMessage = (message, fallbackChatId) => ({
    ...message,
    chat_id: message?.chat_id || message?.chatId || fallbackChatId || null,
    body: message?.body || '',
    image_url: message?.image_url || null,
    sender_id: message?.sender_id || null,
    created_at: message?.created_at || new Date().toISOString(),
    _mine: String(message?.sender_id || '') === String(user?.id || '') || Boolean(message?._mine),
    pending: Boolean(message?.pending),
    client_id: message?.client_id || message?.temp_id || null,
  })

  const updateChatMeta = (chatId, messageRows) => {
    const rows = Array.isArray(messageRows) ? messageRows : []
    const last = rows[rows.length - 1] || null
    setChatMeta((prev) => ({
      ...prev,
      [chatId]: {
        ...(prev[chatId] || {}),
        lastText: last?.body || last?.image_url || prev[chatId]?.lastText || '',
        lastAt: last?.created_at || prev[chatId]?.lastAt || null,
      },
    }))
    setChats((prev) =>
      prev.map((chat) =>
        String(chat.id) === String(chatId)
          ? { ...chat, last_message: last || chat.last_message || null }
          : chat
      )
    )
  }

  const sameMessageSignature = (a, b) => {
    if (!a || !b) return false
    const createdA = new Date(a.created_at || 0).getTime()
    const createdB = new Date(b.created_at || 0).getTime()
    const nearTime = Number.isFinite(createdA) && Number.isFinite(createdB) ? Math.abs(createdA - createdB) <= 2000 : false
    return (
      String(a.sender_id || '') === String(b.sender_id || '') &&
      String(a.body || '') === String(b.body || '') &&
      String(a.image_url || '') === String(b.image_url || '') &&
      nearTime
    )
  }

  const mergeMessages = (nextMessages, fallbackChatId) => {
    const incoming = Array.isArray(nextMessages) ? nextMessages.map((m) => normalizeMessage(m, fallbackChatId)) : []
    const current = messagesRef.current.map((m) => normalizeMessage(m, fallbackChatId))
    const merged = []

    for (const existing of current) {
      const shouldDrop = incoming.some((inc) => {
        if (existing.id && inc.id && String(existing.id) === String(inc.id)) return true
        if (existing.client_id && inc.client_id && String(existing.client_id) === String(inc.client_id)) return true
        if (existing.pending && sameMessageSignature(existing, inc)) return true
        return sameMessageSignature(existing, inc)
      })
      if (!shouldDrop) merged.push(existing)
    }

    for (const inc of incoming) {
      const idx = merged.findIndex((msg) => {
        if (msg.id && inc.id && String(msg.id) === String(inc.id)) return true
        if (msg.client_id && inc.client_id && String(msg.client_id) === String(inc.client_id)) return true
        if (msg.pending && sameMessageSignature(msg, inc)) return true
        return sameMessageSignature(msg, inc)
      })
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...inc, pending: false }
      } else {
        merged.push(inc)
      }
    }

    merged.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
    messagesRef.current = merged
    setMessages(merged)
    if (selectedChatRef.current) updateChatMeta(String(selectedChatRef.current), merged)
    return merged
  }

  const loadMessages = async (chatId) => {
    const nextId = typeof chatId === 'string' ? chatId : chatId?.id ? String(chatId.id) : null
    if (!nextId || !token) return
    setMessagesLoading(true)
    try {
      const data = await chatApi.messages(token, nextId)
      const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
      const normalized = rows.map((message) => normalizeMessage(message, nextId))
      messagesRef.current = normalized
      setMessages(normalized)
      updateChatMeta(nextId, normalized)
    } finally {
      setMessagesLoading(false)
    }
  }

  useEffect(() => {
    if (!token || authLoading) return
    let alive = true
    setLoading(true)
    chatApi
      .list(token)
      .then((data) => {
        if (!alive) return
        const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
        setChats(rows)
      })
      .catch(() => {
        if (alive) setChats([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [token, authLoading])

  useEffect(() => {
    if (!token) return
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      upgrade: true,
    })
    socketRef.current = socket

    const handleConnect = () => setSocketConnected(true)
    const handleDisconnect = () => setSocketConnected(false)
    const handleChatMessage = (message) => {
      const currentChatId = selectedChatRef.current
      if (!currentChatId) return
      if (String(message?.chat_id || message?.chatId) !== String(currentChatId)) return
      mergeMessages([message], currentChatId)
    }
    // Patch chat state for real-time confirmation updates
    const handleChatUpdated     = (updatedChat) => { if (updatedChat?.id) patchChat(updatedChat) }
    const handleExchangeConfirmed = (updatedChat) => { if (updatedChat?.id) patchChat(updatedChat) }
    const handleExchangeCompleted = (updatedChat) => { if (updatedChat?.id) patchChat(updatedChat) }

    socket.off('connect', handleConnect)
    socket.off('disconnect', handleDisconnect)
    socket.off('chat:message', handleChatMessage)
    socket.off('chat:updated', handleChatUpdated)
    socket.off('exchange:confirmed', handleExchangeConfirmed)
    socket.off('exchange:completed', handleExchangeCompleted)

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('chat:message', handleChatMessage)
    socket.on('chat:updated', handleChatUpdated)
    socket.on('exchange:confirmed', handleExchangeConfirmed)
    socket.on('exchange:completed', handleExchangeCompleted)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('chat:message', handleChatMessage)
      socket.off('chat:updated', handleChatUpdated)
      socket.off('exchange:confirmed', handleExchangeConfirmed)
      socket.off('exchange:completed', handleExchangeCompleted)
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  useEffect(() => {
    const current = socketRef.current
    if (!current || !selectedChat) return
    current.emit('chat:join', { chatId: String(selectedChat) })
    setTimeout(() => loadMessages(selectedChat), 0)
  }, [selectedChat, token])

  // Patch a single chat in the list with an updated version from the server
  const patchChat = (updatedChat) => {
    if (!updatedChat?.id) return
    setChats((prev) =>
      prev.map((c) => (String(c.id) === String(updatedChat.id) ? { ...c, ...updatedChat } : c))
    )
  }

  const handleConfirmExchange = async () => {
    if (!token || !selectedChat || confirmingExchange) return
    setConfirmingExchange(true)
    try {
      const updated = await chatApi.confirmExchange(token, String(selectedChat))
      if (updated) patchChat(updated)
    } catch (err) {
      console.error('Confirm exchange error:', err)
    } finally {
      setConfirmingExchange(false)
    }
  }

  const handleAcceptChat = async () => {
    if (!token || !selectedChat || acceptingChat) return
    setAcceptingChat(true)
    try {
      const updated = await chatApi.accept(token, String(selectedChat))
      if (updated) patchChat(updated)
    } catch (err) {
      console.error('Accept chat error:', err)
    } finally {
      setAcceptingChat(false)
    }
  }

  const handleDeclineChat = async () => {
    if (!token || !selectedChat || decliningChat) return
    setDecliningChat(true)
    try {
      const updated = await chatApi.decline(token, String(selectedChat))
      if (updated) patchChat(updated)
    } catch (err) {
      console.error('Decline chat error:', err)
    } finally {
      setDecliningChat(false)
    }
  }

  const handleSetSelectedChat = (chatId) => {
    const nextId = typeof chatId === 'string' ? chatId : chatId?.id ? String(chatId.id) : null
    setSelectedChat(nextId)
  }

  const normalizeChat = (chat) => {
    if (!chat) return null
    const id = chat?.id || chat?.chat?.id || chat?.data?.id || chat?.data?.chat?.id || null
    if (!id) return null
    return {
      ...chat,
      ...chat?.chat,
      ...chat?.data,
      id,
      participant_id: chat?.participant_id || chat?.other_user?.id || chat?.recipient?.id || chat?.participant?.id || chat?.chat?.participant_id || chat?.data?.participant_id || null,
      participant_name: chat?.participant_name || chat?.other_user?.name || chat?.recipient?.name || chat?.participant?.name || chat?.chat?.participant_name || chat?.data?.participant_name || '',
      participant_email: chat?.participant_email || chat?.other_user?.email || chat?.recipient?.email || chat?.participant?.email || chat?.chat?.participant_email || chat?.data?.participant_email || '',
      participant_avatar_url: chat?.participant_avatar_url || chat?.other_user?.avatar_url || chat?.recipient?.avatar_url || chat?.participant?.avatar_url || chat?.chat?.participant_avatar_url || chat?.data?.participant_avatar_url || null,
    }
  }

  const handleNewChat = (incomingChat) => {
    const newChat = normalizeChat(incomingChat)
    if (!newChat?.id) return null
    setChats((prev) => {
      const exists = prev.some((c) => String(c.id) === String(newChat.id))
      if (exists) return prev.map((c) => (String(c.id) === String(newChat.id) ? { ...c, ...newChat } : c))
      return [newChat, ...prev]
    })
    setSelectedChat(String(newChat.id))
    return newChat
  }

  const handleStartChat = async (email) => {
    try {
      const response = await chatApi.start(token, { email })
      const candidate = response?.chat || response?.data?.chat || response?.data || response
      const newChat = normalizeChat(candidate)
      if (!newChat?.id) return null
      const selectedId = String(newChat.id)
      handleNewChat(newChat)
      setSelectedChat(selectedId)
      setTimeout(() => loadMessages(selectedId), 0)
      return newChat
    } catch (err) {
      throw err
    }
  }

  const handleSendMessage = async () => {
    if (!token || !selectedChat) return
    const body = composerText.trim()
    const imageUrl = pendingImage ? String(pendingImage) : ''
    if (!body && !imageUrl) return

    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId,
      client_id: tempId,
      chat_id: String(selectedChat),
      sender_id: user?.id || null,
      body,
      image_url: imageUrl || null,
      created_at: new Date().toISOString(),
      _mine: true,
      pending: true,
    }

    mergeMessages([optimistic], String(selectedChat))
    setComposerText('')
    setPendingImage(null)
    setSendingMessage(true)
    try {
      socketRef.current?.emit('chat:message', {
        chatId: String(selectedChat),
        body,
        imageUrl: imageUrl || null,
      })
      setTimeout(() => loadMessages(selectedChat), 0)
    } finally {
      setSendingMessage(false)
    }
  }

  const handlePickImage = () => fileInputRef.current?.click()
  const handleImageSelected = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const dataUrl = await toDataUrl(file)
    setPendingImage(String(dataUrl))
    event.target.value = ''
  }

  const handleDeleteChat = async (chatId) => {
    const nextId = typeof chatId === 'string' ? chatId : chatId?.id ? String(chatId.id) : null
    if (!nextId || !token) return
    setDeletingChatId(nextId)
    try {
      await chatApi.delete(token, nextId)
      setChats((prev) => prev.filter((chat) => String(chat.id) !== nextId))
      if (String(selectedChat) === nextId) {
        setSelectedChat(null)
        messagesRef.current = []
        setMessages([])
      }
    } finally {
      setDeletingChatId(null)
    }
  }

  const handleInboxBack = () => {
    navigate(-1)
    setTimeout(() => {
      if (window.location.pathname === '/chat') {
        navigate('/home')
      }
    }, 0)
  }

  return (
    <ChatPageView
      open
      chats={normalizedChats}
      loading={loading}
      deletingChatId={deletingChatId}
      chatMeta={chatMeta}
      formatMessageTime={(date) => new Date(date).toLocaleTimeString()}
      messages={messages}
      messagesLoading={messagesLoading}
      selectedChat={selectedChat}
      setSelectedChat={handleSetSelectedChat}
      socketConnected={socketConnected}
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
      onDeleteChat={handleDeleteChat}
      onNewChat={handleStartChat}
      isMobileInitially={false}
      onInboxBack={handleInboxBack}
      onConfirmExchange={handleConfirmExchange}
      onAcceptChat={handleAcceptChat}
      onDeclineChat={handleDeclineChat}
      confirmingExchange={confirmingExchange}
      acceptingChat={acceptingChat}
      decliningChat={decliningChat}
    />
  )
}
