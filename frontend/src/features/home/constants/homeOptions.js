import { Handshake, PiggyBank, Recycle, Users } from 'lucide-react'

export const HOME_CATEGORY_OPTIONS = [
  { value: 'All Categories', label: 'ทุกหมวดหมู่' },
  { value: 'Clothes & Fashion', label: '👕 เสื้อผ้า แฟชั่น' },
  { value: 'Dorm Essentials', label: '🏡 ของใช้ในหอ' },
  { value: 'Books & Study', label: '📚 หนังสือ การเรียน' },
  { value: 'Kitchen & Appliances', label: '🍳 ครัว เครื่องใช้' },
  { value: 'Cleaning & Laundry', label: '🧼 ทำความสะอาด ซักผ้า' },
  { value: 'Hobbies & Entertainment', label: '🎮 งานอดิเรก ความบันเทิง' },
  { value: 'Sports Gear', label: '🏀 กีฬา' },
  { value: 'Others', label: '✨ อื่นๆ' }
]

export const HOME_CONDITION_OPTIONS = [
  { value: 'All Conditions', label: 'ทุกสภาพ' },
  { value: 'Like New', label: 'เหมือนใหม่' },
  { value: 'Good', label: 'ดี' },
  { value: 'Fair', label: 'พอใช้' }
]

export const HOME_BENEFIT_CARDS = [
  { title: 'แลกอย่างยุติธรรม', description: 'แลกของให้คุ้มค่า', icon: Handshake, tone: 'blue' },
  { title: 'ลดขยะ', description: 'ใช้ซ้ำให้คุ้ม', icon: Recycle, tone: 'sage' },
  { title: 'ชุมชน มช.', description: 'พบเพื่อนต่างคณะ', icon: Users, tone: 'purple' },
  { title: 'ประหยัด', description: 'ไม่ต้องซื้อใหม่', icon: PiggyBank, tone: 'amber' }
]

export const HOME_BENEFIT_TONE_CLASSES = {
  blue: 'border-blue-100/80 bg-gradient-to-br from-blue-50/60 to-white text-blue-600 [&_.benefit-desc]:text-gray-500',
  sage: 'border-primary/10 bg-gradient-to-br from-primary-light/35 to-white text-primary [&_.benefit-desc]:text-gray-600',
  purple: 'border-purple-100/80 bg-gradient-to-br from-purple-50/50 to-white text-purple-600 [&_.benefit-desc]:text-gray-500',
  amber: 'border-amber-100/80 bg-gradient-to-br from-amber-50/50 to-white text-amber-600 [&_.benefit-desc]:text-gray-500'
}
