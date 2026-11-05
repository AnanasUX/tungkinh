'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { submitFeedback } from './actions'
import type { CalendarItem, PracticeItem } from './types'
import PracticeBody, {
  isPracticePanel,
  practicePanelTitles,
  type PracticeContext,
  type PracticePanelId,
} from './PracticePanels'
import { SEATS } from './temple-data'

export type PanelId =
  | 'beads'
  | 'chant'
  | 'meditate'
  | 'rank'
  | 'more'
  | 'settings'
  | 'rooms'
  | 'people'
  | 'phrases'
  | 'feedback'
  | 'today'
  | 'talks'
  | 'wishes'
  | 'fortune'
  | 'wardrobe'
  | 'guide'
  | PracticePanelId

type Props = {
  panel: PanelId
  practices: PracticeItem[]
  calendar: CalendarItem[]
  playerName: string
  merit: number
  beads: number
  muted: boolean
  room: number
  theme: string
  wishes: string[]
  onClose: () => void
  onNavigate: (panel: PanelId) => void
  onMerit: (amount: number, message: string) => void
  onBeads: (count: number) => void
  onName: (name: string) => void
  onMuted: (muted: boolean) => void
  onRoom: (room: number) => void
  onTheme: (theme: string) => void
  onWish: (wish: string) => void
  onPhrase: (phrase: string) => void
  onKnock: () => void
  practice: PracticeContext
  onlineDevotees?: any[]
}

const panelTitles: Record<PanelId, string> = {
  beads: 'Niệm Phật · Tràng hạt',
  chant: 'Tụng kinh',
  meditate: 'Thiền định',
  rank: 'Bảng xếp hạng',
  more: 'Khám phá Chùa An Nhiên',
  settings: 'Cài đặt',
  rooms: 'Chọn phòng',
  people: 'Người trong chùa',
  phrases: 'Câu nói tịnh tâm',
  feedback: 'Góp ý và báo lỗi',
  today: 'Hôm nay tại Chùa An Nhiên',
  talks: 'Pháp thoại',
  wishes: 'Lời nguyện',
  fortune: 'Xin quẻ',
  wardrobe: 'Trang phục',
  guide: 'Hướng dẫn',
  ...practicePanelTitles,
}

// Category and one-line purpose shown in every popup header.
const panelMeta: Record<PanelId, [group: string, note: string]> = {
  beads: ['Niệm Phật', 'Mỗi hạt một câu niệm, 108 hạt là một vòng viên mãn.'],
  chant: ['Tụng kinh', 'Đọc theo từng câu, tiếng mõ giữ nhịp cho tâm an trú.'],
  meditate: ['Thiền định', 'Chọn thời lượng, ngồi yên và theo dõi hơi thở.'],
  rank: ['Cộng đồng', 'Công đức của bạn so với các thiện hữu trong chùa.'],
  more: ['Chánh điện', 'Tất cả pháp môn và nghi lễ của Chùa An Nhiên.'],
  settings: ['Thiết lập', 'Âm thanh, chất lượng hiển thị và tên của bạn.'],
  rooms: ['Cộng đồng', 'Chọn không gian tu tập phù hợp với bạn.'],
  people: ['Cộng đồng', 'Những thiện hữu đang hiện diện trong chùa.'],
  phrases: ['Ái ngữ', 'Gửi một lời tịnh tâm đến mọi người quanh bạn.'],
  feedback: ['Hỗ trợ', 'Chia sẻ góp ý để chùa ngày càng thanh tịnh hơn.'],
  today: ['Lịch chùa', 'Ngày âm lịch và các khóa lễ sắp diễn ra.'],
  talks: ['Pháp thoại', 'Bài giảng ngắn để chiêm nghiệm trong ngày.'],
  wishes: ['Nguyện cầu', 'Ghi lại lời nguyện và hồi hướng công đức.'],
  fortune: ['Nghi lễ', 'Mỗi ngày một quẻ, xem như lời nhắc nhở hiền lành.'],
  wardrobe: ['Thiết lập', 'Chọn màu y áo cho hình ảnh của bạn.'],
  guide: ['Hỗ trợ', 'Phím tắt và cách di chuyển trong chùa.'],
  seats: ['Chánh điện', 'Chọn một bồ đoàn trống để an tọa cùng đại chúng.'],
  breath: ['Thiền định', 'Hít vào 4 giây, giữ 2 giây, thở ra 6 giây.'],
  teaching: ['Pháp cú', 'Chọn tâm trạng hiện tại để nhận lời Phật dạy.'],
  petition: ['Nghi lễ', 'Soạn sớ cầu an cho người sống, cầu siêu cho người đã khuất.'],
  certificate: ['Công đức', 'Bằng ghi nhận chặng đường tu học, có thể tải về.'],
  profile: ['Hồ sơ', 'Tên, pháp danh và hành trình tu tập của bạn.'],
  lantern: ['Nguyện cầu', 'Viết lời chúc, thả hoa đăng bay lên trời đêm.'],
  release: ['Nghi lễ', 'Phóng sanh để nuôi lớn lòng từ bi.'],
}

const moreItems: { id: PanelId | 'ritual'; label: string; note: string; action?: string }[] = [
  {
    id: 'ritual',
    label: 'Dâng hoa',
    note: 'Dâng một đóa sen lên Tam Bảo',
    action: 'Đã dâng hoa sen. Nguyện lòng luôn thanh tịnh.',
  },
  {
    id: 'ritual',
    label: 'Thỉnh chuông',
    note: 'Lắng nghe một tiếng chuông chùa',
    action: 'Tiếng chuông ngân, thân tâm an trú.',
  },
  {
    id: 'ritual',
    label: 'Thắp nến',
    note: 'Thắp ánh sáng trí tuệ',
    action: 'Ngọn nến trí tuệ đã được thắp sáng.',
  },
  { id: 'lantern', label: 'Thả hoa đăng', note: 'Gửi lời chúc trên hồ sen' },
  { id: 'beads', label: 'Tràng hạt', note: 'Niệm Phật đủ 108 hạt' },
  { id: 'seats', label: 'Bồ đoàn', note: `Sơ đồ ${SEATS.length} vị trí tọa thiền` },
  { id: 'profile', label: 'Hồ sơ tu tập', note: 'Pháp danh, cấp bậc, công đức' },
  { id: 'rank', label: 'Xếp hạng', note: 'Bảng vàng công đức' },
  { id: 'wishes', label: 'Treo nguyện', note: 'Lưu lời nguyện trên cây bồ đề' },
  { id: 'today', label: 'Hôm nay', note: 'Lịch âm và công phu chung' },
  { id: 'talks', label: 'Pháp thoại', note: 'Nghe và đọc lời pháp' },
  { id: 'wardrobe', label: 'Trang phục', note: 'Chọn màu áo trong chùa' },
  { id: 'guide', label: 'Thiền hành', note: 'Hướng dẫn bước chân tỉnh thức' },
  { id: 'fortune', label: 'Xin quẻ', note: 'Một lời gợi ý cho hôm nay' },
  { id: 'release', label: 'Phóng sanh', note: 'Nuôi dưỡng tâm từ bi' },
  {
    id: 'ritual',
    label: 'Hái lộc',
    note: 'Nhận một lời lành đầu ngày',
    action: 'Lộc lành hôm nay: Tâm an thì cảnh an.',
  },
]

const phrases = [
  'Nam mô A Di Đà Phật',
  'Chúc bạn một ngày thân tâm an lạc',
  'Mỗi bước chân là một đóa sen nở',
  'Hít vào an tịnh, thở ra mỉm cười',
  'Nguyện đem công đức này hướng về tất cả',
  'Tâm bình, thế giới bình',
]

export type OracleFortune = {
  num: string
  title: string
  poem: string
  career: string
  family: string
  health: string
  advice: string
}

const sacredOracles: OracleFortune[] = [
  {
    num: "Quẻ Số 01 · Thượng Thượng Cát",
    title: "Hoa Sen Nở Rộ Giữa Hồ Thu",
    poem: "Tâm thành một nén hương trầm tỏa,\nPhúc lộc mười phương tự tìm về.\nGia đạo bình an thêm hưng thịnh,\nCông thành danh toại rạng tiền đồ.",
    career: "Rất hanh thông, công việc làm ăn phát đạt, có quý nhân lớn nâng đỡ.",
    family: "Gia đạo hòa thuận, con cháu hiếu thảo, đón hỷ sự bất ngờ.",
    health: "Thân tâm khang kiện, bệnh cũ thuyên giảm, tinh thần thư thái.",
    advice: "Mọi việc mong cầu đều đại cát. Giữ tâm khiêm hạ, năng làm việc thiện thì phúc trạch bền lâu muôn đời."
  },
  {
    num: "Quẻ Số 02 · Đại Cát Khánh",
    title: "Vầng Trăng Tròn Chiếu Đỉnh Non",
    poem: "Trời thu gió mát trăng vằng vặc,\nChiếu rọi trần gian sáng diệu kỳ.\nĐường xa vạn dặm không ngăn ngại,\nCát tường như ý chẳng nghĩ suy.",
    career: "Mọi dự định sắp tới đều đạt thành quả như ý, thi cử đỗ đạt cao.",
    family: "Trong nhà thêm người thêm của, sum vầy ấm cúng.",
    health: "Tràn đầy sinh lực, giấc ngủ an lành.",
    advice: "Thời cơ chín muồi, hãy tự tin thực hiện các kế hoạch thiện lành đã ấp ủ."
  },
  {
    num: "Quẻ Số 03 · Trung Cát",
    title: "Nước Suối Trong Chảy Qua Khe Đá",
    poem: "Dòng suối quanh co qua ghềnh đá,\nVẫn giữ lòng trong chảy về khơi.\nKiên trì bền chí ắt nên nghiệp,\nThanh nhàn vui thú chốn thảnh thơi.",
    career: "Ban đầu hơi chậm, cần kiên nhẫn tích lũy kinh nghiệm, về sau đại phát.",
    family: "Cần lắng nghe thấu hiểu nhau hơn, tránh nóng vội lời nói.",
    health: "Chú ý dưỡng sinh, chớ thức khuya làm việc quá sức.",
    advice: "Vạn sự khởi đầu nan, kiên tâm trì chí như nước chảy đá mòn ắt thành công."
  },
  {
    num: "Quẻ Số 04 · Thượng Cát",
    title: "Mầm Xanh Đón Nắng Sớm Mai",
    poem: "Hạt giống lành gieo nơi đất tốt,\nGặp mưa xuân sớm trổ hoa tươi.\nTương lai xán lạn muôn điều hứa,\nPhúc đức tràn đầy khắp mọi nơi.",
    career: "Công việc có hướng đi mới đầy triển vọng, gặp đối tác chân thành.",
    family: "Có tin vui về con cái hoặc người thân phương xa trở về.",
    health: "Bình an, năng vận động hít thở khí trời.",
    advice: "Gieo nhân nào gặt quả nấy. Tiếp tục gieo duyên lành ắt bội thu quả ngọt."
  },
  {
    num: "Quẻ Số 05 · Bình An Cát",
    title: "Thuyền Nan Cập Bến An Nhiên",
    poem: "Sóng gió qua rồi biển lặng yên,\nThuyền về bến đậu cảnh thanh nhàn.\nThân tâm buông xả muôn phiền lụy,\nMột thoáng an vui giữa thế gian.",
    career: "Duy trì ổn định hiện tại, không nên đầu tư mạo hiểm quy mô lớn.",
    family: "Êm ấm, các thành viên chia sẻ thấu hiểu nhau.",
    health: "Huyết áp và tiêu hóa ổn định, duy trì ăn chay niệm Phật.",
    advice: "Biết đủ là giàu, biết an là vui. Hãy trân quý những gì đang có."
  },
  {
    num: "Quẻ Số 06 · Thượng Cát",
    title: "Cây Tùng Đứng Vững Giữa Mùa Đông",
    poem: "Gió sương tuy lạnh tùng xanh ngắt,\nBão táp không lay chí trượng phu.\nĐức hạnh sáng ngời xua bóng tối,\nTâm lành rạng rỡ ánh từ bi.",
    career: "Vượt qua thử thách một cách vẻ vang, uy tín được khẳng định.",
    family: "Chỗ dựa vững chắc cho gia đình và người thân.",
    health: "Đề kháng tốt, thân thể dẻo dai.",
    advice: "Chí kiên tâm vững thì mọi chướng ngại đều trở thành nấc thang bước lên đỉnh cao."
  },
  {
    num: "Quẻ Số 07 · Tiểu Cát Hóa Đại",
    title: "Mây Mù Tan Dần Thấy Ánh Dương",
    poem: "U ám mây mờ rồi sẽ tan,\nTrời quang mây tạnh khắp non ngàn.\nGian nan vất vả qua rồi đó,\nĐón ánh bình minh phúc ngập tràn.",
    career: "Những khúc mắc tồn đọng sắp được tháo gỡ hoàn toàn.",
    family: "Hóa giải hiểu lầm cũ, không khí gia đình rộn rã trở lại.",
    health: "Bệnh duyên tiêu trừ nhờ tâm an tịnh và thuốc thang đúng thầy.",
    advice: "Không có đêm đen nào kéo dài mãi. Luôn giữ niềm tin và lòng hướng thiện."
  },
  {
    num: "Quẻ Số 08 · Đại An Cát Khánh",
    title: "Trăng Sáng Soi Đường Vạn Dặm Xa",
    poem: "Mây tan trăng sáng chiếu muôn nơi,\nSức khỏe dồi dào nở nụ cười.\nSự nghiệp vững vàng như tùng bách,\nBình an hạnh phúc trọn niềm vui.",
    career: "Có quý nhân phương xa chỉ dẫn, cơ hội mở rộng tầm nhìn và phát triển.",
    family: "Gia môn hưng thịnh, trong ấm ngoài êm.",
    health: "Tráng kiện, sắc diện hồng hào thanh thoát.",
    advice: "Sống có trước có sau, nhớ ơn người giúp đỡ thì phúc phận càng dồi dào."
  },
  {
    num: "Quẻ Số 09 · Cát Tường",
    title: "Tiếng Chuông Chùa Ngân Lúc Hoàng Hôn",
    poem: "Chuông chùa ngân vọng giữa thinh không,\nRũ sạch trần ai nhẹ cõi lòng.\nBát ngát từ bi soi lối bước,\nAn vui tự tại giữa muôn trùng.",
    career: "Phù hợp các công việc nghiên cứu, sáng tạo, giáo dục và thiện nguyện.",
    family: "Bình yên, có xu hướng hướng Phật cùng tu tập.",
    health: "Giấc ngủ sâu, tinh thần thư thái nhẹ nhõm.",
    advice: "Năng về chùa lễ Phật, nghe pháp thoại để trí tuệ khai mở."
  },
  {
    num: "Quẻ Số 10 · Thượng Cát",
    title: "Đóa Sen Hồng Trong Ánh Ban Mai",
    poem: "Nhụy vàng cánh thắm ngát hương thơm,\nBùn lắng sen lên đẹp lạ thường.\nGiữ trọn lòng thanh trong cõi tục,\nTrời ban phúc lộc rạng quê hương.",
    career: "Danh thơm tiếng tốt, được đồng nghiệp và cấp trên tin cậy yêu quý.",
    family: "Thuận hòa, con cái đạt thành tích học tập vẻ vang.",
    health: "Thân tâm an lạc, khí sắc rạng ngời.",
    advice: "Gần bùn mà chẳng hôi tanh. Giữ vững phẩm hạnh cao đẹp giữa đời."
  },
  {
    num: "Quẻ Số 11 · Đại Cát",
    title: "Rồng Vẫy Đuôi Về Biển Lớn",
    poem: "Vùng vẫy bao năm chốn bến bờ,\nHôm nay vươn tới cõi bao la.\nMênh mông sóng nước thỏa lòng ước,\nCông to nghiệp lớn rạng muôn nhà.",
    career: "Mở rộng kinh doanh thành công, thi cử đỗ thủ khoa, chuyển đổi vị trí như ý.",
    family: "Có sự kiện trọng đại vui vẻ (cưới hỏi, thăng chức, mua nhà).",
    health: "Dồi dào năng lượng tích cực.",
    advice: "Khi ở đỉnh cao càng cần khiêm nhường và giúp đỡ người yếm thế."
  },
  {
    num: "Quẻ Số 12 · Viên Mãn Cát",
    title: "Ngọc Quý Sáng Trong Lòng Núi",
    poem: "Ngọc ẩn trong non trải tháng ngày,\nNay nhờ thợ khéo dũa mài hay.\nÁnh quang rạng rỡ soi mười hướng,\nPhúc báu tròn đầy tay nắm tay.",
    career: "Tài năng được công nhận, gặt hái thành quả xứng đáng sau bao nỗ lực.",
    family: "Viên mãn, phúc thọ song toàn, cháu con hiếu nghĩa.",
    health: "Khang kiện trường thọ.",
    advice: "Tâm chân thật quý hơn vàng ngọc. Hãy đem tâm ấy cống hiến cho đời."
  }
]

function PanelHeader({ panel, onClose }: { panel: PanelId; onClose: () => void }) {
  const [group, note] = panelMeta[panel]
  return (
    <header className="system-panel__header">
      <svg className="system-panel__emblem" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="22.5" />
        <path d="M24 12c3.6 4 5 8 5 11.5S27 31 24 34c-3-3-5-6.8-5-10.5S20.4 16 24 12Z" />
        <path d="M19.4 21.6C15.6 20.4 12.6 21 10.5 22.4c1.6 5.6 6.3 9.8 13.5 11.6" />
        <path d="M28.6 21.6c3.8-1.2 6.8-.6 8.9.8-1.6 5.6-6.3 9.8-13.5 11.6" />
        <path d="M13 36h22" />
      </svg>
      <div className="system-panel__titles">
        <span className="system-panel__eyebrow">
          Chùa An Nhiên <i aria-hidden="true" /> {group}
        </span>
        <h2>{panelTitles[panel]}</h2>
        <p>{note}</p>
      </div>
      <button type="button" aria-label="Đóng bảng" onClick={onClose}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7 7 10 10M17 7 7 17" />
        </svg>
      </button>
    </header>
  )
}

export default function SystemPanel(props: Props) {
  const {
    panel,
    practices,
    calendar,
    playerName,
    merit,
    beads,
    muted,
    room,
    theme,
    wishes,
    onClose,
    onNavigate,
    onMerit,
    onBeads,
    onName,
    onMuted,
    onRoom,
    onTheme,
    onWish,
    onPhrase,
    onKnock,
    practice: practiceContext,
  } = props
  const [selectedPractice, setSelectedPractice] = useState(
    practices.find((item) => item.kind === 'chant')?.slug ?? '',
  )
  const [chanting, setChanting] = useState(false)
  const [chantLine, setChantLine] = useState(0)
  const [chantTempo, setChantTempo] = useState(3.8)
  const [meditationMinutes, setMeditationMinutes] = useState(5)
  const [secondsLeft, setSecondsLeft] = useState(5 * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [wishText, setWishText] = useState('')
  const [fortune, setFortune] = useState<OracleFortune | null>(null)
  const [shaking, setShaking] = useState(false)
  const [feedbackResult, setFeedbackResult] = useState('')
  const [isPending, startTransition] = useTransition()

  const practice =
    practices.find((item) => item.slug === selectedPractice) ??
    practices.find((item) => item.kind === 'chant')
  const chantLines = useMemo(() => practice?.body.split('\n').filter(Boolean) ?? [], [practice])
  const talks = practices.filter((item) => item.kind === 'talk')

  useEffect(() => {
    if (!chanting || !chantLines.length) return
    // Each verse advances on a wooden-fish knock at the chosen tempo.
    onKnock()
    const timer = window.setInterval(() => {
      onKnock()
      setChantLine((line) => (line + 1) % chantLines.length)
    }, chantTempo * 1000)
    return () => window.clearInterval(timer)
  }, [chanting, chantLines.length, chantTempo, onKnock])

  useEffect(() => {
    if (!timerRunning) return
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          setTimerRunning(false)
          onMerit(30, 'Thời thiền đã viên mãn. +30 tịnh tâm')
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [timerRunning, onMerit])

  useEffect(() => {
    if (panel !== 'meditate') setTimerRunning(false)
    if (panel !== 'chant') setChanting(false)
  }, [panel])

  const chooseMeditation = (minutes: number) => {
    setMeditationMinutes(minutes)
    setSecondsLeft(minutes * 60)
    setTimerRunning(false)
  }

  const addBead = () => {
    const next = beads >= 108 ? 1 : beads + 1
    onBeads(next)
    if (next === 108) onMerit(50, 'Đã viên mãn một vòng 108 hạt. +50 tịnh tâm')
    else if (next % 27 === 0) onMerit(15, `Đã niệm ${next} hạt. +15 tịnh tâm`)
  }

  const issueFortune = () => {
    if (shaking) return
    setShaking(true)
    onKnock()
    const t1 = setTimeout(() => onKnock(), 300)
    const t2 = setTimeout(() => onKnock(), 600)
    setTimeout(() => {
      setShaking(false)
      const dayKey = new Date().toISOString().slice(0, 10)
      const index = Math.floor(Math.random() * sacredOracles.length)
      const pick = sacredOracles[index]
      setFortune(pick)
      window.localStorage.setItem('chua-sen-fortune', JSON.stringify({ day: dayKey, index }))
      onMerit(15, `Đã xin ${pick.num}. +15 công đức`)
    }, 900)
  }

  return (
    <div
      className="system-panel-wrap"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="system-panel"
        role="dialog"
        aria-modal="true"
        aria-label={panelTitles[panel]}
      >
        <PanelHeader panel={panel} onClose={onClose} />
        <div className="system-panel__body">
          {isPracticePanel(panel) && <PracticeBody panel={panel} ctx={practiceContext} />}
          {panel === 'beads' && (
            <div className="beads-view">
              <p className="panel-intro">
                Mỗi lần nhấn là một câu niệm. Hít thở nhẹ, giữ tâm nơi danh hiệu Phật.
              </p>
              <button
                className="bead-ring"
                type="button"
                onClick={addBead}
                aria-label="Niệm một hạt"
              >
                {Array.from({ length: 36 }).map((_, index) => (
                  <i
                    key={index}
                    className={index < Math.ceil(beads / 3) ? 'lit' : ''}
                    style={{ transform: `rotate(${index * 10}deg) translateY(-108px)` }}
                  />
                ))}
                <span>
                  <strong>{beads}</strong>
                  <small>/ 108 hạt</small>
                </span>
              </button>
              <button className="primary-panel-button" type="button" onClick={addBead}>
                Nam mô A Di Đà Phật
              </button>
              <p className="panel-footnote">Mốc công phu: 27 · 54 · 81 · 108 hạt</p>
            </div>
          )}

          {panel === 'chant' && (
            <div className="chant-view">
              {practices.filter((item) => item.kind === 'chant').length ? (
                <>
                  <label className="field-label">Chọn bài kinh</label>
                  <select
                    value={practice?.slug ?? ''}
                    onChange={(event) => {
                      setSelectedPractice(event.target.value)
                      setChantLine(0)
                      setChanting(false)
                    }}
                  >
                    {practices
                      .filter((item) => item.kind === 'chant')
                      .map((item) => (
                        <option key={item.id} value={item.slug}>
                          {item.title} · {item.durationMinutes ?? 10} phút
                        </option>
                      ))}
                  </select>
                  <div className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-black/25 p-1">
                    {(
                      [
                        [3.8, 'Trang nghiêm'],
                        [3, 'Tiêu chuẩn'],
                        [2.2, 'Tinh tấn'],
                      ] as const
                    ).map(([tempo, label]) => (
                      <button
                        key={tempo}
                        type="button"
                        onClick={() => setChantTempo(tempo)}
                        className={`h-8 rounded-full text-[13px] font-semibold transition ${
                          chantTempo === tempo
                            ? 'bg-[#f2c766] text-[#2a1b0c]'
                            : 'text-white/75 hover:bg-white/5'
                        }`}
                      >
                        {label} · {tempo}s
                      </button>
                    ))}
                  </div>
                  <div className="chant-reader">
                    <span>{practice?.summary}</span>
                    <p>{chantLines[chantLine] ?? 'Chọn một bài kinh để bắt đầu.'}</p>
                    <div className="chant-progress">
                      <i
                        style={{
                          width: `${chantLines.length ? ((chantLine + 1) / chantLines.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <small>
                      Đoạn {chantLines.length ? chantLine + 1 : 0}/{chantLines.length}
                    </small>
                  </div>
                  <div className="panel-actions">
                    <button
                      type="button"
                      onClick={() => setChantLine((line) => Math.max(0, line - 1))}
                    >
                      Đoạn trước
                    </button>
                    <button
                      className="primary"
                      type="button"
                      onClick={() => setChanting(!chanting)}
                    >
                      {chanting ? 'Tạm dừng' : 'Bắt đầu tụng'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setChantLine((line) => Math.min(chantLines.length - 1, line + 1))
                      }
                    >
                      Đoạn sau
                    </button>
                  </div>
                </>
              ) : (
                <EmptyContent message="Chưa có bài kinh. Quản trị viên có thể thêm trong Payload Admin." />
              )}
            </div>
          )}

          {panel === 'meditate' && (
            <div className="meditate-view">
              <p className="panel-intro">
                Ngồi vững chãi, thả lỏng vai và trở về với hơi thở tự nhiên.
              </p>
              <div className="timer-presets">
                {[5, 10, 15, 30].map((minutes) => (
                  <button
                    className={meditationMinutes === minutes ? 'active' : ''}
                    type="button"
                    key={minutes}
                    onClick={() => chooseMeditation(minutes)}
                  >
                    {minutes} phút
                  </button>
                ))}
              </div>
              <div className={`timer-circle ${timerRunning ? 'running' : ''}`}>
                <span>
                  {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
                  {String(secondsLeft % 60).padStart(2, '0')}
                </span>
                <small>
                  {timerRunning ? 'Đang an trú' : secondsLeft === 0 ? 'Đã viên mãn' : 'Sẵn sàng'}
                </small>
              </div>
              <div className="panel-actions centered">
                <button type="button" onClick={() => chooseMeditation(meditationMinutes)}>
                  Đặt lại
                </button>
                <button
                  className="primary"
                  type="button"
                  onClick={() => setTimerRunning(!timerRunning)}
                  disabled={secondsLeft === 0}
                >
                  {timerRunning ? 'Tạm dừng' : 'Bắt đầu'}
                </button>
              </div>
            </div>
          )}

          {panel === 'rank' && (
            <div className="rank-view">
              <div className="rank-tabs">
                <button className="active">Tuần này</button>
                <button>Tất cả</button>
              </div>
              {[
                ['Diệu Minh', 2860],
                ['Phúc An Nhiên', 2410],
                ['Thiện Đức', 1950],
                [playerName, merit],
                ['Tâm An', 630],
              ]
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .map((entry, index) => (
                  <article className={entry[0] === playerName ? 'me' : ''} key={String(entry[0])}>
                    <b>{index + 1}</b>
                    <span className="avatar">{String(entry[0]).slice(0, 1)}</span>
                    <div>
                      <strong>{entry[0]}</strong>
                      <small>
                        {entry[0] === playerName
                          ? 'Bạn'
                          : `Cấp ${Math.max(1, Math.floor(Number(entry[1]) / 300))}`}
                      </small>
                    </div>
                    <em>{Number(entry[1]).toLocaleString('vi-VN')} tịnh tâm</em>
                  </article>
                ))}
              <p className="panel-footnote">
                Bảng cá nhân được tính từ công phu đã lưu trên thiết bị này.
              </p>
            </div>
          )}

          {panel === 'more' && (
            <div className="more-grid">
              {moreItems.map((item, index) => (
                <button
                  type="button"
                  key={`${item.label}-${index}`}
                  onClick={() => {
                    if (item.id === 'ritual')
                      onMerit(item.label === 'Phóng sinh' ? 20 : 10, item.action ?? item.label)
                    else onNavigate(item.id)
                  }}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.note}</small>
                  </div>
                </button>
              ))}
            </div>
          )}

          {panel === 'settings' && (
            <div className="settings-view">
              <label className="field-label" htmlFor="player-name">
                Tên hiển thị
              </label>
              <input
                id="player-name"
                value={playerName}
                maxLength={24}
                onChange={(event) => onName(event.target.value)}
              />
              <div className="setting-row">
                <div>
                  <strong>Âm thanh không gian</strong>
                  <small>Chuông, mõ và nhạc nền</small>
                </div>
                <button
                  className={`switch ${!muted ? 'on' : ''}`}
                  type="button"
                  onClick={() => onMuted(!muted)}
                >
                  <i />
                </button>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Chất lượng 3D</strong>
                  <small>Tự động theo thiết bị</small>
                </div>
                <span className="quality-badge">Cao</span>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Tiến độ hiện tại</strong>
                  <small>
                    {merit} tịnh tâm · {beads}/108 hạt
                  </small>
                </div>
                <span className="quality-badge">Đã lưu</span>
              </div>
              <p className="privacy-note">
                Tiến độ và lời nguyện riêng tư chỉ được lưu trên thiết bị này. Nội dung không được
                tự động gửi đi.
              </p>
            </div>
          )}

          {panel === 'rooms' && (
            <div className="rooms-view">
              <p className="panel-intro">
                Mỗi phòng là một không gian công phu. Tiến độ của bạn được giữ nguyên khi đổi phòng.
              </p>
              {[31, 24, 18, 11, 7, 3].map((count, index) => (
                <button
                  className={room === index + 1 ? 'active' : ''}
                  type="button"
                  key={index}
                  onClick={() => {
                    onRoom(index + 1)
                    onClose()
                  }}
                >
                  <span className="room-lotus">◇</span>
                  <div>
                    <strong>Phòng {index + 1}</strong>
                    <small>{index === 0 ? 'Không gian chính điện' : 'Sân chùa thanh tịnh'}</small>
                  </div>
                  <em>{count}/100 người</em>
                </button>
              ))}
            </div>
          )}

          {panel === 'people' && (
            <div className="people-view">
              <div className="people-summary">
                <strong>{onlineDevotees && onlineDevotees.length > 0 ? onlineDevotees.length : 1}</strong>
                <span>người thật đang trực tuyến trong Chánh Điện</span>
              </div>
              <article className="me">
                <span className="avatar">{playerName.slice(0, 1)}</span>
                <div>
                  <strong>{playerName} (Bạn)</strong>
                  <small>
                    Pháp danh: {practice.dharmaName || 'Tịnh Tâm'} · Bồ đoàn #{practice.seat ?? 'Đang thiền hành'}
                  </small>
                  <p style={{ fontSize: '11px', color: '#f2c766', marginTop: '2px' }}>
                    📍 {typeof window !== 'undefined' && (window as any).currentUserProfile?.hometown ? (window as any).currentUserProfile.hometown : 'Việt Nam'} · {merit} công đức
                  </p>
                </div>
                <em>Đang an tọa</em>
              </article>
              {onlineDevotees && onlineDevotees.length > 0 ? (
                onlineDevotees
                  .filter((dev: any) => dev.fullName !== playerName)
                  .map((dev: any, i: number) => (
                    <article key={dev.clientId || dev.client_id || i}>
                      <span className="avatar">{(dev.fullName || 'Đạo Hữu').slice(0, 1)}</span>
                      <div>
                        <strong>{dev.fullName || 'Đạo Hữu Đồng Tu'}</strong>
                        <small>
                          Pháp danh: {dev.dharmaName || 'Tịnh Tâm'} · Bồ đoàn #{dev.seatNo || (i + 1)}
                        </small>
                        <p style={{ fontSize: '11px', color: '#e2bd6e', marginTop: '2px' }}>
                          📍 {dev.hometown || dev.clientIp || 'Việt Nam'} · {dev.meritScore || 50} công đức
                        </p>
                      </div>
                      <em>Đang tu tập</em>
                    </article>
                  ))
              ) : (
                <p className="panel-intro" style={{ textAlign: 'center', marginTop: '10px' }}>
                  Đang đồng bộ danh sách thiện hữu trực tuyến từ Supabase Realtime...
                </p>
              )}
            </div>
          )}

          {panel === 'phrases' && (
            <div className="phrases-view">
              <p className="panel-intro">Chọn một câu để gửi tới những người đang ở gần bạn.</p>
              {phrases.map((phrase) => (
                <button
                  type="button"
                  key={phrase}
                  onClick={() => {
                    onPhrase(phrase)
                    onClose()
                  }}
                >
                  {phrase}
                </button>
              ))}
            </div>
          )}

          {panel === 'feedback' && (
            <form
              className="feedback-view"
              action={(formData) => {
                setFeedbackResult('')
                startTransition(async () => {
                  const result = await submitFeedback({
                    category: String(formData.get('category') ?? ''),
                    message: String(formData.get('message') ?? ''),
                    contact: String(formData.get('contact') ?? ''),
                  })
                  setFeedbackResult(result.message)
                  if (result.ok)
                    (document.getElementById('feedback-form') as HTMLFormElement | null)?.reset()
                })
              }}
              id="feedback-form"
            >
              <label className="field-label" htmlFor="feedback-category">
                Loại phản hồi
              </label>
              <select id="feedback-category" name="category" defaultValue="suggestion">
                <option value="suggestion">Góp ý cải thiện</option>
                <option value="bug">Báo lỗi</option>
                <option value="content">Góp ý nội dung</option>
              </select>
              <label className="field-label" htmlFor="feedback-message">
                Nội dung
              </label>
              <textarea
                id="feedback-message"
                name="message"
                minLength={10}
                maxLength={2000}
                required
                placeholder="Hãy mô tả chi tiết để chúng tôi có thể hỗ trợ tốt hơn…"
              />
              <label className="field-label" htmlFor="feedback-contact">
                Liên hệ (không bắt buộc)
              </label>
              <input
                id="feedback-contact"
                name="contact"
                maxLength={160}
                placeholder="Email hoặc cách liên hệ khác"
              />
              {feedbackResult && (
                <p className="form-result" role="status">
                  {feedbackResult}
                </p>
              )}
              <button className="primary-panel-button" type="submit" disabled={isPending}>
                {isPending ? 'Đang gửi…' : 'Gửi phản hồi'}
              </button>
            </form>
          )}

          {panel === 'today' && (
            <div className="today-view">
              <div className="today-date">
                <strong>
                  {new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long' }).format(
                    new Date(),
                  )}
                </strong>
                <span>Lịch công phu Chùa An Nhiên</span>
              </div>
              {calendar.length ? (
                calendar.map((event) => (
                  <article key={event.id}>
                    <span>{event.time || 'Cả ngày'}</span>
                    <div>
                      <strong>{event.title}</strong>
                      <small>
                        {event.lunarDate} · {event.description}
                      </small>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyContent message="Chưa có lịch Phật sự. Quản trị viên có thể thêm trong Payload Admin." />
              )}
            </div>
          )}

          {panel === 'talks' && (
            <div className="talks-view">
              {talks.length ? (
                talks.map((talk) => (
                  <details key={talk.id}>
                    <summary>
                      <span>PHÁP</span>
                      <div>
                        <strong>{talk.title}</strong>
                        <small>
                          {talk.teacher || 'Chùa An Nhiên'} · {talk.durationMinutes ?? 10} phút
                        </small>
                      </div>
                    </summary>
                    <p>{talk.body}</p>
                  </details>
                ))
              ) : (
                <EmptyContent message="Chưa có pháp thoại. Quản trị viên có thể thêm trong Payload Admin." />
              )}
            </div>
          )}

          {panel === 'wishes' && (
            <div className="wishes-view">
              <p className="panel-intro">
                Lời nguyện chỉ lưu trên thiết bị này. Hãy viết điều bạn muốn nhắc mình nuôi dưỡng.
              </p>
              <textarea
                value={wishText}
                maxLength={240}
                onChange={(event) => setWishText(event.target.value)}
                placeholder="Nguyện cho…"
              />
              <button
                className="primary-panel-button"
                type="button"
                disabled={wishText.trim().length < 3}
                onClick={() => {
                  onWish(wishText.trim())
                  setWishText('')
                  onMerit(10, 'Một ngọn hoa đăng đã được thả trên hồ sen. +10 tịnh tâm')
                }}
              >
                Thả đèn hoa đăng
              </button>
              <div className="wish-list">
                {wishes.length ? (
                  wishes
                    .slice()
                    .reverse()
                    .map((wish, index) => <p key={`${wish}-${index}`}>{wish}</p>)
                ) : (
                  <small>Chưa có lời nguyện nào trên thiết bị này.</small>
                )}
              </div>
            </div>
          )}

          {panel === 'fortune' && (
            <div className="fortune-view">
              <div className={`fortune-sticks ${shaking ? 'is-shaking animate-pulse' : ''}`} aria-hidden="true">
                {Array.from({ length: 9 }).map((_, index) => (
                  <i key={index} style={shaking ? { transform: `translateY(${Math.sin(index) * 12}px) rotate(${Math.cos(index) * 8}deg)` } : undefined} />
                ))}
              </div>
              {fortune ? (
                <div className="fortune-card" style={{ maxWidth: '420px', textAlign: 'left', padding: '16px 20px' }}>
                  <span style={{ color: '#f2c766', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {fortune.num}
                  </span>
                  <strong style={{ fontSize: '18px', display: 'block', margin: '4px 0 8px', color: '#fff' }}>
                    {fortune.title}
                  </strong>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '10px', fontStyle: 'italic', fontSize: '13px', lineHeight: 1.6, color: '#fdf6e9', whiteSpace: 'pre-line', border: '1px solid rgba(242,199,102,0.2)' }}>
                    {fortune.poem}
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '12px', lineHeight: 1.5, color: '#e2bd6e', display: 'grid', gap: '4px' }}>
                    <p>💼 <b>Sự nghiệp:</b> {fortune.career}</p>
                    <p>❤️ <b>Gia đạo:</b> {fortune.family}</p>
                    <p>🌿 <b>Sức khỏe:</b> {fortune.health}</p>
                    <p style={{ color: '#fff', marginTop: '4px' }}>✨ <b>Lời khuyên:</b> {fortune.advice}</p>
                  </div>
                </div>
              ) : (
                <p className="panel-intro">
                  Tĩnh tâm trong ba hơi thở, chí thành hướng về Đức Quán Thế Âm, rồi bấm lắc ống xăm để nhận lời chỉ dẫn cho ngày hôm nay.
                </p>
              )}
              <button
                className="primary-panel-button"
                type="button"
                disabled={shaking}
                onClick={issueFortune}
              >
                {shaking ? '🎋 Đang lắc ống xăm…' : fortune ? '🎋 Lắc ống xin quẻ mới' : '🎋 Lắc ống xin quẻ'}
              </button>
            </div>
          )}

          {panel === 'wardrobe' && (
            <div className="wardrobe-view">
              <div className={`robe-preview robe-${theme}`}>
                <span />
                <i />
              </div>
              <div className="theme-options">
                {[
                  ['xanh', 'Lam xanh'],
                  ['nau', 'Nâu thiền'],
                  ['vang', 'Vàng đất'],
                  ['xam', 'Lam xám'],
                  ['do', 'Đỏ trầm'],
                ].map(([value, label]) => (
                  <button
                    className={theme === value ? 'active' : ''}
                    type="button"
                    key={value}
                    onClick={() => onTheme(value)}
                  >
                    <i className={`swatch-${value}`} />
                    {label}
                  </button>
                ))}
              </div>
              <p className="panel-footnote">Trang phục được lưu tự động trên thiết bị.</p>
            </div>
          )}

          {panel === 'guide' && (
            <div className="guide-view">
              <article>
                <b>01</b>
                <div>
                  <strong>Di chuyển trong sân chùa</strong>
                  <p>
                    Dùng W A S D hoặc phím mũi tên. Kéo chuột để nhìn quanh và cuộn để đổi độ cao
                    góc nhìn.
                  </p>
                </div>
              </article>
              <article>
                <b>02</b>
                <div>
                  <strong>Công phu mỗi ngày</strong>
                  <p>
                    Hoàn thành ba việc trong bảng bên trái để nhận tịnh tâm và nuôi lớn bảy đóa sen.
                  </p>
                </div>
              </article>
              <article>
                <b>03</b>
                <div>
                  <strong>Thiền hành</strong>
                  <p>
                    Đi chậm, nhận biết bàn chân chạm đất. Không cần đạt đến đâu, mỗi bước đã là trở
                    về.
                  </p>
                </div>
              </article>
              <article>
                <b>04</b>
                <div>
                  <strong>Riêng tư</strong>
                  <p>
                    Bạn có thể sử dụng Chùa An Nhiên không cần đăng ký. Lời nguyện và tiến độ cá
                    nhân lưu trên thiết bị.
                  </p>
                </div>
              </article>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function EmptyContent({ message }: { message: string }) {
  return (
    <div className="empty-content">
      <span>◇</span>
      <p>{message}</p>
    </div>
  )
}
