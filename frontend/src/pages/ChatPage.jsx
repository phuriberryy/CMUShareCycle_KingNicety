import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { io } from 'socket.io-client'
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
  const location = useLocation()
  const { token, loading: authLoading, user } = useAuth()
  const initialChatId = location.state?.chatId ?? null

  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(initialChatId ? String(initialChatId) : null)
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
  const fileInputRef = useRef(null)
  const socketRef = useRef(null)
  const selectedChatRef = useRef(selectedChat)
  const messagesRef = useRef([])

  useEffect(() => {
    selectedChatRef.current = selectedChat
  }, [selectedChat])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const normalizedChats = useMemo(() => (Array.isArray(chats) ? chats : []), [chats])
  const activeChat = normalizedChats.find((c) => String(c?.id) === String(selectedChat)) || null

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

  const normalizeMessage = (message, fallbackChatId) => ({
    ...message,
    id: message?.id ?? message?.client_id ?? `temp-${Date.now()}`,
    chat_id: message?.chat_id || message?.chatId || fallbackChatId || selectedChatRef.current || null,
    image_url: message?.image_url || null,
    body: message?.body || '',
    sender_id: message?.sender_id || null,
    created_at: message?.created_at || new Date().toISOString(),
    pending: Boolean(message?.pending),
    _mine: message?.sender_id ? String(message.sender_id) === String(user?.id) : Boolean(message?._mine),
  })

  const mergeMessages = (nextMessages, fallbackChatId) => {
    const incoming = Array.isArray(nextMessages) ? nextMessages.map((m) => normalizeMessage(m, fallbackChatId)) : []
    const current = messagesRef.current.map((m) => normalizeMessage(m, fallbackChatId))
    const replaced = []

    for (const existing of current) {
      const shouldDrop = incoming.some((inc) => {
        if (existing.id && inc.id && String(existing.id) === String(inc.id)) return true
        if (existing.pending && (inc.id || inc.client_id)) {
          if (sameMessageSignature(existing, inc)) return true
        }
        return sameMessageSignature(existing, inc)
      })
      if (!shouldDrop) replaced.push(existing)
    }

    const merged = [...replaced]
    for (const inc of incoming) {
      const exists = merged.some((msg) => {
        if (msg.id && inc.id && String(msg.id) === String(inc.id)) return true
        if (msg.pending || inc.pending) return sameMessageSignature(msg, inc)
        return sameMessageSignature(msg, inc)
      })
      if (!exists) merged.push(inc)
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
        if (!selectedChat && rows[0]?.id) setSelectedChat(String(rows[0].id))
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

    socket.off('connect', handleConnect)
    socket.off('disconnect', handleDisconnect)
    socket.off('chat:message', handleChatMessage)
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('chat:message', handleChatMessage)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('chat:message', handleChatMessage)
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  useEffect(() => {
    const current = socketRef.current
    if (!current || !selectedChat) return
    current.emit('chat:join', { chatId: String(selectedChat) })
    loadMessages(selectedChat)
  }, [selectedChat, token])

  const handleSetSelectedChat = (chatId) => {
    const nextId = typeof chatId === 'string' ? chatId : chatId?.id ? String(chatId.id) : null
    if (!nextId) return
    setSelectedChat(nextId)
  }

  const handleNewChat = (newChat) => {
    if (!newChat?.id) return
    setChats((prev) => [newChat, ...prev.filter((chat) => String(chat.id) !== String(newChat.id))])
    setSelectedChat(String(newChat.id))
  }

  const handleStartChat = async (email) => {
    const response = await chatApi.start(token, { email })
    const newChat = response?.chat || response?.data || response
    handleNewChat(newChat)
    return newChat
  }

  const handleSendMessage = async () => {
    if (!token || !selectedChat) return
    const body = composerText.trim()
    const imageUrl = pendingImage ? String(pendingImage) : ''
    if (!body && !imageUrl) return

    const optimistic = {
      id: `temp-${Date.now()}`,
      client_id: `temp-${Date.now()}`,
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
        const remaining = chats.filter((chat) => String(chat.id) !== nextId)
        setSelectedChat(remaining[0]?.id ? String(remaining[0].id) : null)
        messagesRef.current = []
        setMessages([])
      }
    } finally {
      setDeletingChatId(null)
    }
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
      onNewChat={handleNewChat}
      isMobileInitially={false}
    />
  )
}
