import React from 'react'
import { createRoot } from 'react-dom/client'
import ChuaSenApp from './ChuaSenApp'
import type { CalendarItem, PracticeItem } from './types'

const defaultPractices: PracticeItem[] = [
  {
    id: 'batnha',
    title: 'Bát Nhã Tâm Kinh',
    slug: 'bat-nha-tam-kinh',
    kind: 'chant',
    summary: 'Quán chiếu năm uẩn đều không, vượt qua mọi khổ ách.',
    body: `Quán Tự Tại Bồ Tát, hành thâm Bát Nhã Ba La Mật Đa thời.
Chiếu kiến ngũ uẩn giai không, độ nhất thiết khổ ách.
Xá Lợi Tử, sắc bất dị không, không bất dị sắc, sắc tức thị không, không tức thị sắc.
Thọ tưởng hành thức diệc phục như thị.
Xá Lợi Tử, thị chư pháp không tướng, bất sanh bất diệt, bất cấu bất tịnh, bất tăng bất giảm.
Cố tri Bát Nhã Ba La Mật Đa, thị đại thần chú, thị đại minh chú, thị vô thượng chú.
Yết đế yết đế, ba la yết đế, ba la tăng yết đế, bồ đề tát bà ha.`,
    durationMinutes: 8,
    featured: true
  },
  {
    id: 'daibi',
    title: 'Chú Đại Bi (84 câu Chân Ngôn)',
    slug: 'chu-dai-bi',
    kind: 'chant',
    summary: 'Pháp môn tiêu trừ tai chướng, viên mãn tâm nguyện của Bồ Tát Quán Thế Âm.',
    body: `Nam mô Đại Bi Hội Thượng Phật Bồ Tát (3 lần)
Thiên thủ thiên nhãn vô ngại đại bi tâm đà la ni
Nam mô hắc ra đát na, đa ra dạ da
Nam mô a rị da, bà lô kiết đế, thước bát ra da
Bồ Đề tát đỏa bà da, ma ha tát đỏa bà da
Ma ha ca lô ni ca da, án, tát bàn ra phạt duệ
Số đát na đát tỏa, nam mô tất kiết lật đỏa y mông a rị da
Bà lô kiết đế thất Phật ra lăng đà bà
Nam mô na ra cẩn trì, hê rị ma ha bàn đa sa mế
Tát bà a tha đậu du bằng, a thệ dựng
Tát bà tát đa, na ma bà tát đa, na ma bà già
Ma phạt đạt đậu, đát điệt tha: Án, a bà lô hê
Lô ca đế, ca ra đế, di hê rị
Ma ha bồ đề tát đỏa, tát bà tát bà
Ma ra ma ra, ma hê ma hê, rị đà dựng
Cu lô cu lô kiết mông, độ lô độ lô phạt xà da đế
Ma ha phạt xà da đế, đà ra đà ra, địa rị ni
Thất Phật ra da, giá ra giá ra, mạ mạ phạt ma ra
Mục đế lệ, y hê y hê, thất na thất na
A ra sâm Phật ra xá lợi, phạt sa phạt sâm
Phật ra xá da, hô lô hô lô ma ra
Hô lô hô lô hê rị, ta ra ta ra
Tất rị tất rị, tô rô tô rô
Bồ Đề dạ, bồ đề dạ, bồ đà dạ, bồ đà dạ
Di đế rị dạ, na ra cẩn trì
Địa rị sắc ni na, ba dạ ma na, ta bà ha
Tất đà dạ, ta bà ha. Ma ha tất đà dạ, ta bà ha
Tất đà dũ nghệ, thất bàn ra dạ, ta bà ha
Na ra cẩn trì, ta bà ha. Ma ra na ra, ta bà ha
Tất ra tăng a mục khê da, ta bà ha
Ta bà ma ha, a tất đà dạ, ta bà ha
Giả kiết ra a tất đà dạ, ta bà ha
Ba đà ma yết thất đà dạ, ta bà ha
Na ra cẩn trì bàn đà ra dạ, ta bà ha
Ma bà lợi thắng kiết lật ra dạ, ta bà ha
Nam mô hắc ra đát na, đa ra dạ da
Nam mô a rị da, bà lô kiết đế, thước bàn ra dạ, ta bà ha
Án, tất điện đô, mạn đa ra, bạt đà gia, ta bà ha`,
    durationMinutes: 15,
    featured: true
  },
  {
    id: 'batnha',
    title: 'Bát Nhã Ba La Mật Đa Tâm Kinh',
    slug: 'bat-nha-tam-kinh',
    kind: 'chant',
    summary: 'Trí tuệ thấu suốt Tánh Không, vượt thoát mọi khổ ách trần gian.',
    body: `Khi Bồ Tát Quán Tự Tại hành sâu Bát Nhã Ba La Mật Đa
Soi thấy năm uẩn đều Không, liền qua hết thảy khổ ách
Này Xá Lợi Tử! Sắc chẳng khác Không, Không chẳng khác Sắc
Sắc tức là Không, Không tức là Sắc
Thọ, tưởng, hành, thức cũng đều như thế
Này Xá Lợi Tử! Tướng Không của các pháp
Không sinh không diệt, không nhơ không sạch, không thêm không bớt
Cho nên trong Tánh Không không có sắc, không thọ, tưởng, hành, thức
Không mắt, tai, mũi, lưỡi, thân, ý; không sắc, thanh, hương, vị, xúc, pháp
Không giới hạn của mắt, cho đến không giới hạn của ý thức
Không vô minh, cũng không hết vô minh
Cho đến không già chết, cũng không hết già chết
Không khổ, tập, diệt, đạo; không trí huệ cũng không chứng đắc
Vì không có chỗ đắc, Bồ Tát nương Bát Nhã Ba La Mật Đa
Tâm không ngăn ngại, vì không ngăn ngại nên không sợ hãi
Xa lìa điên đảo mộng tưởng, đạt cứu cánh Niết Bàn
Chư Phật ba đời cũng nương Bát Nhã Ba La Mật Đa
Mà chứng đắc Vô Thượng Chánh Đẳng Chánh Giác
Nên biết Bát Nhã Ba La Mật Đa là đại thần chú, là đại minh chú
Là vô thượng chú, là vô đẳng đẳng chú
Trừ được hết thảy khổ, chân thật không hư dối
Liền thuyết chú rằng:
Yết đế yết đế, ba la yết đế, ba la tăng yết đế, bồ đề tát bà ha`,
    durationMinutes: 10,
    featured: true
  },
  {
    id: 'duocsu',
    title: 'Dược Sư Quán Đảnh Chân Ngôn',
    slug: 'duoc-su-quan-danh',
    kind: 'recitation',
    summary: 'Cầu an lành, tiêu trừ tật bệnh, thân tâm thanh tịnh khang kiện.',
    body: `Nam mô Bạc Già Phạt Đế, Bệ Sát Xã, Lũ Lô Thích Lưu Ly
Bát Lạt Bà, Hắt Ra Xà Dã, Đát Tha Yết Đa Da
A Ra Ha Đế, Tam Miệu Tam Bột Đà Da, Đát Điệt Tha
Án, Bệ Sát Thệ, Bệ Sát Thệ, Bệ Sát Xã
Tam Một Yết Đế, Tát Bà Ha (21 lần)`,
    durationMinutes: 12,
    featured: false
  },
  {
    id: 'samhoi',
    title: 'Kinh Sám Hối & Hồi Hướng',
    slug: 'sam-hoi-hoi-huong',
    kind: 'chant',
    summary: 'Tịnh hóa nghiệp chướng nhiều đời, hồi hướng công đức khắp muôn loài.',
    body: `Đệ tử kính lạy Mười Phương Thường Trụ Tam Bảo
Con nay phát nguyện sám hối mọi lỗi lầm
Từ vô thỉ kiếp do tham, sân, si
Từ thân, miệng, ý phát sinh ra
Tất cả con nay xin chí thành sám hối
Nguyện đem công đức lành này
Hồi hướng về khắp tất cả chúng sanh
Gia đình hòa thuận, phước huệ trang nghiêm
Quốc thái dân an, thế giới hòa bình
Đồng sanh Cực Lạc, viên thành Phật đạo`,
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


class SanctuaryErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[SanctuaryErrorBoundary] Caught error:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#17130e',
            color: '#fef3c7',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            zIndex: 999999,
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌸</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#f59e0b' }}>
            Không Gian Tu Học Chùa An Nhiên
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: '#d6d3d1',
              maxWidth: '420px',
              marginBottom: '20px',
              lineHeight: 1.6,
            }}
          >
            Đang tải lại giao diện Chánh Điện. Quý đạo hữu vui lòng nhấn nút bên dưới để khôi phục không gian tu học.
          </p>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('chua_an_nhien_v1')
                sessionStorage.clear()
              } catch (_) {}
              window.location.reload()
            }}
            style={{
              padding: '12px 28px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #d97706, #b45309)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(217,119,6,0.4)',
            }}
          >
            Khôi phục & Tải lại Đạo Tràng
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function init() {
  const container = document.getElementById('root')
  if (!container) return
  const root = createRoot(container)
  root.render(<SanctuaryErrorBoundary><ChuaSenApp practices={defaultPractices} calendar={defaultCalendar} /></SanctuaryErrorBoundary>)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
