const STATUS_LABELS = {
  declined: 'ถูกปฏิเสธ',
  closed: 'ปิดแล้ว',
  chatting: 'กำลังสนทนา'
}

export function getChatStatusLabel(chat) {
  if (!chat) return ''

  // Exchange confirmation states (takes priority over generic active label)
  if (chat.isExchangeChat && chat.status === 'active') {
    if (chat.confirmedAt || (chat.ownerConfirmed && chat.requesterConfirmed)) {
      return 'แลกเปลี่ยนสำเร็จ ✓'
    }
    if (chat.ownerConfirmed || chat.requesterConfirmed) {
      return 'รออีกฝ่ายยืนยัน'
    }
    return 'รอยืนยันการแลก'
  }

  if (chat.status === 'active') return chat.qrConfirmed ? 'ยืนยันแล้ว' : 'พร้อมแชท'
  if (chat.status === 'pending') return chat.ownerAccepted || chat.requesterAccepted ? 'รออีกฝ่ายยืนยัน' : 'รอยืนยัน'
  return STATUS_LABELS[chat.status] || (typeof chat.status === 'string' ? chat.status : '')
}

