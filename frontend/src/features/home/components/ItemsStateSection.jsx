import StateCard from '../../../shared/ui/StateCard'
import Button from '../../../shared/ui/Button'

export default function ItemsStateSection({ loading, loadError, onRetry, hasItems }) {
  if (loading) {
    return (
      <StateCard
        title="กำลังโหลดรายการ..."
        description="ถ้ารอนานผิดปกติ ลองกดปุ่มโหลดใหม่ด้านบน หรือรีโหลดหน้านี้"
      />
    )
  }

  if (loadError) {
    return (
      <StateCard
        title="โหลดรายการไม่สำเร็จ"
        description="เชื่อมต่อไม่สำเร็จชั่วคราว ลองกด «โหลดใหม่» หรือรีโหลดหน้า — ถ้ายังไม่ได้ รอสักครู่แล้วลองอีกครั้ง"
        action={(
          <Button type="button" onClick={onRetry}>
            ลองโหลดใหม่
          </Button>
        )}
      />
    )
  }

  if (!hasItems) {
    return <StateCard title="ยังไม่มีสินค้าในตอนนี้" description="เริ่มต้นโดยการโพสต์สินค้าชิ้นแรก" />
  }

  return null
}
