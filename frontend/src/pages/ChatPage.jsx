import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import ChatPageView from '../components/chat/ChatPage'

export default function ChatPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialChatId = location.state?.chatId ?? null

  return (
    <div className="flex h-[100dvh] flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"
        >
          <Home size={16} />
          Home
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <ChatPageView open initialChatId={initialChatId} />
      </div>
    </div>
  )
}
