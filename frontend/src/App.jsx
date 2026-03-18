import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import ExchangeRequestDetailPage from './pages/ExchangeRequestDetailPage'
import DonationRequestDetailPage from './pages/DonationRequestDetailPage'
import ItemDetailPage from './pages/ItemDetailPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ChatPage from './pages/ChatPage'
import NotificationsPage from './pages/NotificationsPage'
import PostItemModal from './components/modals/PostItemModal'
import ExchangeRequestModal from './components/modals/ExchangeRequestModal'
import DonationRequestModal from './components/modals/DonationRequestModal'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import AdminLayout from './components/admin/AdminLayout'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { API_BASE, notificationApi } from './lib/api'

const SOCKET_URL = API_BASE.replace(/\/api$/, '')

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const [postItemOpen, setPostItemOpen] = useState(false)
  const [exchangeRequestOpen, setExchangeRequestOpen] = useState(false)
  const [donationRequestOpen, setDonationRequestOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [itemsVersion, setItemsVersion] = useState(0)
  const { token, loading } = useAuth()

  const isLoginPage = location.pathname === '/login' || location.pathname === '/register'
  const isChatOrNotifications = location.pathname === '/chat' || location.pathname === '/notifications'
  const isAuthenticated = !!token
  const showLayout = isAuthenticated && !isLoginPage && !isChatOrNotifications

  const handlePostItem = () => {
    setPostItemOpen(true)
  }

  const handleExchangeItem = (itemId) => {
    setSelectedItem(itemId)
    setExchangeRequestOpen(true)
  }

  const handleDonationItem = (itemId) => {
    setSelectedItem(itemId)
    setDonationRequestOpen(true)
  }

  const handleNotificationsClick = () => {
    navigate('/notifications')
  }

  const handleItemCreated = () => {
    setItemsVersion((prev) => prev + 1)
  }

  useEffect(() => {
    if (!token) {
      setUnreadCount(0)
      return
    }
    notificationApi
      .list(token)
      .then((data) => {
        const unread = data.filter((n) => !n.read).length
        setUnreadCount(unread)
      })
      .catch(() => setUnreadCount(0))
  }, [token, location.pathname])

  useEffect(() => {
    if (!token) return
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      transports: ['polling', 'websocket'],
      upgrade: true,
    })
    
    socket.on('connect_error', (err) => {
      // Silently handle connection errors for notifications
      // Only log non-transport errors to reduce console spam
      if (err.message !== 'websocket error') {
        console.debug('Notification socket connection error:', err.message)
      }
    })

    socket.on('notification:new', () => {
      setUnreadCount((prev) => prev + 1)
    })
    
    return () => {
      socket.disconnect()
    }
  }, [token])

  useEffect(() => {
    const handleOpenChat = (event) => {
      const { chatId } = event.detail || {}
      if (chatId) navigate('/chat', { state: { chatId } })
    }
    window.addEventListener('openChat', handleOpenChat)
    return () => window.removeEventListener('openChat', handleOpenChat)
  }, [navigate])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFBF9] text-sm text-gray-500">
        กำลังโหลด...
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBF9]">
      {showLayout && (
        <Header
          unread={unreadCount}
          onNotificationsClick={handleNotificationsClick}
        />
      )}
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
              <HomePage 
                onExchangeItem={handleExchangeItem}
                onDonationItem={handleDonationItem}
                onPostItem={handlePostItem}
                refreshKey={itemsVersion}
              />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/items/:itemId"
            element={
              <ProtectedRoute>
                <ItemDetailPage 
                  onExchangeItem={handleExchangeItem}
                  onDonationItem={handleDonationItem}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exchange/:requestId"
            element={
              <ProtectedRoute>
                <ExchangeRequestDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donation-requests/:requestId"
            element={
              <ProtectedRoute>
                <DonationRequestDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      {showLayout && <Footer />}

      <PostItemModal
        open={postItemOpen}
        onClose={() => setPostItemOpen(false)}
        onSuccess={handleItemCreated}
      />
      <ExchangeRequestModal
        open={exchangeRequestOpen}
        onClose={() => {
          setExchangeRequestOpen(false)
          setSelectedItem(null)
        }}
        itemId={selectedItem}
      />
      <DonationRequestModal
        open={donationRequestOpen}
        onClose={() => {
          setDonationRequestOpen(false)
          setSelectedItem(null)
        }}
        itemId={selectedItem}
      />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  )
}

export default App

