import { CheckCircle, Clock, Loader2, PackageCheck, X } from 'lucide-react'

/**
 * Persistent exchange-status banner pinned at the top of a chat room.
 *
 * Props
 * ─────
 * chat              – full chat object from mapChatRow
 * onConfirm         – async fn; called when the current user confirms the exchange
 * onAccept          – async fn; called when the current user accepts a pending exchange
 * onDecline         – async fn; called when the current user declines
 * confirming        – bool; show spinner on Confirm button
 * accepting         – bool; show spinner on Accept button
 * declining         – bool; show spinner on Decline button
 */
export default function ExchangeBanner({
  chat,
  onConfirm,
  onAccept,
  onDecline,
  confirming = false,
  accepting  = false,
  declining  = false,
}) {
  if (!chat?.isExchangeChat) return null

  const role           = chat.role   // 'owner' | 'requester'
  const isOwner        = role === 'owner'
  const myConfirmed    = isOwner ? Boolean(chat.ownerConfirmed)     : Boolean(chat.requesterConfirmed)
  const otherConfirmed = isOwner ? Boolean(chat.requesterConfirmed) : Boolean(chat.ownerConfirmed)
  const bothConfirmed  = Boolean(chat.confirmedAt) || (Boolean(chat.ownerConfirmed) && Boolean(chat.requesterConfirmed))

  // ─── Completed state ─────────────────────────────────────────────────────────
  if (bothConfirmed) {
    return (
      <div className="sticky top-0 z-20 mx-3 mt-3 mb-1 overflow-hidden rounded-2xl border border-green-200 bg-green-50 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <CheckCircle size={18} className="text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-green-800">แลกเปลี่ยนสำเร็จแล้ว!</p>
            {chat.itemTitle ? (
              <p className="truncate text-[11px] text-green-600">"{chat.itemTitle}" — ทั้งสองฝ่ายยืนยันแล้ว</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ConfirmDot done />
            <ConfirmDot done />
          </div>
        </div>
      </div>
    )
  }

  // ─── Active state – waiting for confirmations ─────────────────────────────────
  if (chat.status === 'active') {
    const statusText = (() => {
      if (myConfirmed && !otherConfirmed) return 'คุณยืนยันแล้ว — รออีกฝ่ายยืนยัน'
      if (!myConfirmed && otherConfirmed) return 'อีกฝ่ายยืนยันแล้ว — กรุณายืนยันด้วย'
      return 'กรุณายืนยันว่าคุณได้แลกเปลี่ยนของในชีวิตจริงแล้ว'
    })()

    return (
      <div className="sticky top-0 z-20 mx-3 mt-3 mb-1 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/90 shadow-sm backdrop-blur-sm">
        {/* Header row */}
        <div className="flex items-center gap-3 border-b border-amber-100 px-4 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <PackageCheck size={16} className="text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-amber-900">ยืนยันการแลกเปลี่ยน</p>
            {chat.itemTitle ? (
              <p className="truncate text-[11px] text-amber-700">"{chat.itemTitle}"</p>
            ) : null}
          </div>
          {/* Progress pills */}
          <div className="flex shrink-0 items-center gap-1.5">
            <ProgressPill label={isOwner ? 'คุณ' : 'เจ้าของ'} done={isOwner ? myConfirmed : otherConfirmed} />
            <ProgressPill label={isOwner ? 'อีกฝ่าย' : 'คุณ'}  done={isOwner ? otherConfirmed : myConfirmed} />
          </div>
        </div>

        {/* Status + action */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-amber-800">{statusText}</p>
          {!myConfirmed ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-[12px] font-bold text-white shadow-sm transition hover:bg-amber-600 active:scale-95 disabled:opacity-60"
            >
              {confirming ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <CheckCircle size={13} />
              )}
              ยืนยันการแลกเปลี่ยน
            </button>
          ) : (
            <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-green-100 px-3 text-[12px] font-semibold text-green-700">
              <CheckCircle size={13} />
              ยืนยันแล้ว
            </span>
          )}
        </div>
      </div>
    )
  }

  // ─── Pending state – waiting for exchange request to be mutually accepted ──────
  if (chat.status === 'pending') {
    const myAccepted    = isOwner ? Boolean(chat.ownerAccepted)     : Boolean(chat.requesterAccepted)
    const otherAccepted = isOwner ? Boolean(chat.requesterAccepted) : Boolean(chat.ownerAccepted)

    if (myAccepted && otherAccepted) return null // completeExchange hasn't run yet but both accepted — rare transient state

    return (
      <div className="sticky top-0 z-20 mx-3 mt-3 mb-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100">
            <Clock size={16} className="text-gray-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-gray-800">คำขอแลกเปลี่ยน</p>
            {chat.itemTitle ? (
              <p className="truncate text-[11px] text-gray-500">"{chat.itemTitle}"</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ProgressPill label={isOwner ? 'คุณ' : 'เจ้าของ'} done={isOwner ? myAccepted : otherAccepted} />
            <ProgressPill label={isOwner ? 'อีกฝ่าย' : 'คุณ'}  done={isOwner ? otherAccepted : myAccepted} />
          </div>
        </div>

        {!myAccepted ? (
          <div className="flex items-center gap-2 px-4 py-2.5">
            <p className="min-w-0 flex-1 text-[11px] text-gray-600">
              {otherAccepted ? 'อีกฝ่ายตกลงแล้ว — คุณต้องการยืนยันการแลกเปลี่ยนนี้ไหม?' : 'รอการยืนยันจากทั้งสองฝ่าย'}
            </p>
            <button
              type="button"
              onClick={onDecline}
              disabled={declining}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
            >
              {declining ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
              ปฏิเสธ
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={accepting}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-[12px] font-bold text-white shadow-sm transition hover:bg-primary-dark active:scale-95 disabled:opacity-60"
            >
              {accepting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              ยอมรับ
            </button>
          </div>
        ) : (
          <div className="px-4 py-2.5">
            <p className="text-[11px] text-gray-500">คุณยอมรับแล้ว — รออีกฝ่ายยืนยัน</p>
          </div>
        )}
      </div>
    )
  }

  return null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressPill({ label, done }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
        done
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-400'
      }`}
    >
      {done ? <CheckCircle size={9} /> : <Clock size={9} />}
      {label}
    </span>
  )
}

function ConfirmDot({ done }) {
  return (
    <span
      className={`h-2 w-2 rounded-full transition-colors ${
        done ? 'bg-green-500' : 'bg-gray-300'
      }`}
    />
  )
}
