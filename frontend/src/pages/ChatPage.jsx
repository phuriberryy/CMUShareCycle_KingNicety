import { useLocation } from 'react-router-dom'
import ChatPageView from '../components/chat/ChatPage'

export default function ChatPage() {
  const location = useLocation()
  const initialChatId = location.state?.chatId ?? null

  return <ChatPageView open initialChatId={initialChatId} />
}
