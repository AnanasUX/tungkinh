import React from 'react'
import { createRoot } from 'react-dom/client'
import ChuaSenApp from './ChuaSenApp'
import type { CalendarItem, PracticeItem } from './types'

const defaultPractices: PracticeItem[] = [
  {
    id: 'daibi',
    title: 'Chú Đại Bi (84 câu Chân Ngôn)',
    slug: 'chu-dai-bi',
    kind: 'chant',
    summary: 'Pháp môn tiêu trừ tai chướng, viên mãn tâm nguyện.',
    body: 'Nam mô Đại Bi Hội Thượng Phật Bồ Tát (3 lần, 1 lạy)\nThiên thủ thiên nhãn vô ngại đại bi tâm đà la ni...',
    durationMinutes: 15,
    featured: true
  },
  {
    id: 'batnha',
    title: 'Bát Nhã Ba La Mật Đa Tâm Kinh',
    slug: 'bat-nha-tam-kinh',
    kind: 'chant',
    summary: 'Trí tuệ thâm sâu vượt bờ mê sanh tử.',
    body: 'Khi Bồ Tát Quán Tự Tại hành sâu Bát Nhã Ba La Mật Đa, soi thấy năm uẩn đều Không...',
    durationMinutes: 10,
    featured: true
  },
  {
    id: 'duocsu',
    title: 'Dược Sư Quán Đảnh Chân Ngôn',
    slug: 'duoc-su-quan-danh',
    kind: 'recitation',
    summary: 'Cầu an lành, tiêu trừ tật bệnh thân tâm.',
    body: 'Nam mô Dược Sư Lưu Ly Quang Vương Như Lai (3 lần)...',
    durationMinutes: 12,
    featured: false
  },
  {
    id: 'samhoi',
    title: 'Kinh Sám Hối & Hồi Hướng',
    slug: 'sam-hoi-hoi-huong',
    kind: 'chant',
    summary: 'Tịnh hóa nghiệp chướng nhiều đời.',
    body: 'Đệ tử kính lạy Mười Phương Thường Trụ Tam Bảo...',
    durationMinutes: 15,
    featured: false
  }
]

const defaultCalendar: CalendarItem[] = [
  {
    id: 'cal-1',
    title: 'Rằm tháng Mười (Lễ Hạ Nguyên)',
    lunarDate: '15/10 Âm Lịch',
    eventType: 'lunar',
    time: '08:00',
    description: 'Đại lễ tạ ơn Trời Phật, cầu an gia đạo.'
  },
  {
    id: 'cal-2',
    title: 'Công Phu Chiều & Tụng Kinh Đại Bi',
    lunarDate: 'Hằng ngày',
    eventType: 'practice',
    time: '18:00',
    description: 'Khóa tụng kinh trực tuyến toàn đạo tràng.'
  },
  {
    id: 'cal-3',
    title: 'Mùng Một Đầu Tháng',
    lunarDate: '01/11 Âm Lịch',
    eventType: 'festival',
    time: '06:00',
    description: 'Khởi đầu tháng mới an lành, phát tâm dâng hương cúng dường.'
  }
]

function init() {
  const container = document.getElementById('root')
  if (!container) return
  const root = createRoot(container)
  root.render(<ChuaSenApp practices={defaultPractices} calendar={defaultCalendar} />)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
