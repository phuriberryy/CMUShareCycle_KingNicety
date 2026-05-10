import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import PostItemModal from './components/modals/PostItemModal'
import ExchangeRequestModal from './components/modals/ExchangeRequestModal'
import DonationRequestModal from './components/modals/DonationRequestModal'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import { API_BASE, notificationApi } from './lib/api'
import AppLoading from './components/system/AppLoading'
import { APP_ROUTES } from './shared/constants/routes'

const LoginPage = lazy(() => import(/* webpackChunkName: "login" */ './pages/LoginPage'))
const HomePage = lazy(() => import(/* webpackChunkName: "home" */ './pages/HomePage'))
const ProfilePage = lazy(() => import(/* webpackChunkName: "profile" */ './pages/ProfilePage'))
const RegisterPage = lazy(() => import(/* webpackChunkName: "register" */ './pages/RegisterPage'))
const ExchangeRequestDetailPage = lazy(() => import(/* webpackChunkName: "exchange-detail" */ './pages/ExchangeRequestDetailPage'))
const DonationRequestDetailPage = lazy(() => import(/* webpackChunkName: "donation-detail" */ './pages/DonationRequestDetailPage'))
const ItemDetailPage = lazy(() => import(/* webpackChunkName: "item-detail" */ './pages/ItemDetailPage'))
const LeaderboardPage = lazy(() => import(/* webpackChunkName: "leaderboard" */ './pages/LeaderboardPage'))
const ChatPage = lazy(() => import(/* webpackChunkName: "chat" */ './pages/ChatPage'))
const NotificationsPage = lazy(() => import(/* webpackChunkName: "notifications" */ './pages/NotificationsPage'))
const AdminLayout = lazy(() => import(/* webpackChunkName: "admin" */ './components/admin/AdminLayout'))

const SOCKET_URL = (API_BASE || '').replace(/\/api$/, '')

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

  const isLoginPage =
    location.pathname === APP_ROUTES.login || location.pathname === APP_ROUTES.register
  const isChatOrNotifications =
    location.pathname === APP_ROUTES.chat || location.pathname === APP_ROUTES.notifications
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
    navigate(APP_ROUTES.notifications)
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

  useEffect(() => {
    const handleMarkAllRead = () => setUnreadCount(0)
    window.addEventListener('sharecycle:markAllRead', handleMarkAllRead)
    return () => window.removeEventListener('sharecycle:markAllRead', handleMarkAllRead)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen w-full min-w-0 items-center justify-center bg-surface font-sans text-sm text-gray-500 antialiased">
        กำลังโหลด...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen min-w-0 w-full max-w-[100%] flex-col bg-surface font-sans antialiased">
      {showLayout && (
        <Header
          unread={unreadCount}
          onNotificationsClick={handleNotificationsClick}
        />
      )}
      <main className="min-w-0 flex-1 w-full">
        <Suspense fallback={<AppLoading />}>
          <Routes>
          <Route path={APP_ROUTES.login} element={<LoginPage />} />
          <Route path={APP_ROUTES.register} element={<RegisterPage />} />
          <Route path={APP_ROUTES.chat} element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route
            path={APP_ROUTES.notifications}
            element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>}
          />
          <Route
            path={APP_ROUTES.home}
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
            path={APP_ROUTES.profile}
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.leaderboard}
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.itemDetail}
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
            path={APP_ROUTES.exchangeDetail}
            element={
              <ProtectedRoute>
                <ExchangeRequestDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.donationRequestDetail}
            element={
              <ProtectedRoute>
                <DonationRequestDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.admin}
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          {/* Catch-all: redirect unknown paths to home instead of blank screen */}
          <Route path="*" element={<CatchAllRedirect />} />
          </Routes>
        </Suspense>
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

function CatchAllRedirect() {
  return <Navigate to={APP_ROUTES.home} replace />
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

