import { useNavigate, useLocation } from 'react-router-dom'
import ChatModal from '../components/modals/ChatModal'
import { APP_ROUTES } from '../shared/constants/routes'

export default function ChatPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialChatId = location.state?.chatId ?? null

  return (
    <ChatModal
      open={true}
      asPage
      onClose={() => navigate(APP_ROUTES.home)}
      initialChatId={initialChatId}
    />
  )
}
