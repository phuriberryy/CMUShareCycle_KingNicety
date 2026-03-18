import { useNavigate, useLocation } from 'react-router-dom'
import ChatModal from '../components/modals/ChatModal'

export default function ChatPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialChatId = location.state?.chatId ?? null

  return (
    <ChatModal
      open={true}
      asPage
      onClose={() => navigate('/')}
      initialChatId={initialChatId}
    />
  )
}
