const STATUS_LABELS = {
  declined: 'ถูกปฏิเสธ',
  closed: 'ปิดแล้ว',
  chatting: 'กำลังสนทนา'
}

export function getChatStatusLabel(chat) {
  if (!chat) return ''
  if (chat.status === 'active') return chat.qrConfirmed ? 'ยืนยันแล้ว' : 'พร้อมแชท'
  if (chat.status === 'pending') return chat.ownerAccepted || chat.requesterAccepted ? 'รออีกฝ่ายยืนยัน' : 'รอยืนยัน'
  return STATUS_LABELS[chat.status] || (typeof chat.status === 'string' ? chat.status : '')
}

