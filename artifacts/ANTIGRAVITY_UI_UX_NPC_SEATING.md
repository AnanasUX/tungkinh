# Bàn giao Antigravity: UI/UX chỗ ngồi và NPC đi lại tự do

## 1. Mục tiêu

Tài liệu này dùng để triển khai các hành vi mới vào repo Vanilla HTML/JS `tungkinh`:

1. Người chơi có thể ngồi lên mọi loại chỗ ngồi hợp lệ:
   - Bồ đoàn trong từng chùa.
   - Ghế quanh Sân Đạo Tràng.
   - Ghế trong các đình nghỉ.
2. NPC đi xuyên toàn bộ bản đồ thay vì chỉ lặp lại trong một khu nhỏ.
3. NPC có thể tự tìm chỗ trống, đi tới, ngồi, đứng dậy và tiếp tục hành trình.
4. Người chơi và NPC không được chiếm cùng một chỗ.
5. UI phải phản ánh đúng trạng thái chỗ ngồi và luôn có cách thoát/đứng dậy rõ ràng.

Không cần backend cho tính năng này. Trạng thái ghế và NPC là trạng thái runtime trong trình
duyệt. Chỉ lưu tiến độ người chơi vào `localStorage`; không lưu việc NPC đang ngồi ở đâu.

---

## 2. Kiến trúc nên dùng trong repo Vanilla HTML/JS

Tách thành bốn lớp. Không để nút UI thao tác trực tiếp với mesh Three.js.

```text
UI (HUD + modal)
  ↓ gọi command
GameController
  ↓
SeatManager + NpcController
  ↓
Three.js Scene / Character rigs

SeatManager
  ↑ phát event trạng thái
UI render lại
```

Các module gợi ý:

```text
js/
  game-controller.js
  seat-manager.js
  npc-controller.js
  world-data.js
  ui/
    seating-panel.js
    hud.js
    toast.js
```

Nếu repo hiện tại chỉ có một file JavaScript lớn, vẫn giữ cùng ranh giới bằng object hoặc class:

```js
const SeatManager = { ... }
const NpcController = { ... }
const SeatingPanel = { ... }
const GameController = { ... }
```

---

## 3. Mô hình dữ liệu bắt buộc

### 3.1. Khu vực

```js
const SITES = [
  { id: 1, key: 'yen-phuc', name: 'Chùa Yên Phúc', kind: 'temple' },
  { id: 2, key: 'phuc-duyen', name: 'Chùa Phúc Duyên', kind: 'temple' },
  { id: 3, key: 'thien-phu', name: 'Chùa Thiên Phú', kind: 'temple' },
  { id: 4, key: 'tinh-gia', name: 'Chùa Tịnh Gia', kind: 'temple' },
  { id: 5, key: 'dao-trang', name: 'Sân Đạo Tràng Trung Tâm', kind: 'plaza' },
]
```

### 3.2. Chỗ ngồi

Mỗi chỗ phải có ID duy nhất trên toàn bản đồ. Không dùng riêng số hiển thị `1..24` làm ID.

```js
{
  id: 201,               // ID toàn bản đồ
  displayNo: 1,          // số hiển thị trong UI
  siteId: 2,
  type: 'cushion',       // cushion | bench
  x: -74.4,
  y: 0,
  z: 9,
  heading: Math.PI,
  occupantType: null,    // null | player | npc | resident
  occupantId: null,      // player hoặc ID NPC
  reservedBy: null,      // giữ chỗ khi nhân vật đang đi tới
}
```

Quy ước ID tương thích với bản hiện tại:

```text
Chùa Yên Phúc:      1..24
Chùa Phúc Duyên:    201..224
Chùa Thiên Phú:     301..324
Chùa Tịnh Gia:      401..424
Ghế quảng trường:   từ 500
Ghế đình nghỉ:      tiếp tục tăng sau nhóm ghế quảng trường
```

Hàm tạo ID cho bồ đoàn:

```js
function templeSeatId(siteId, displayNo) {
  return siteId === 1 ? displayNo : siteId * 100 + displayNo
}
```

### 3.3. Trạng thái người chơi

```js
const playerState = {
  pose: 'stand',          // stand | walking | sit
  seatedSeatId: null,
  targetSeatId: null,
}
```

### 3.4. Trạng thái NPC

```js
{
  id: 'npc-minh-tam',
  rig,
  mode: 'walking',        // walking | going-to-seat | sitting | waiting
  route: [],
  routeIndex: 0,
  speed: 1.15,
  targetSeatId: null,
  seatedSeatId: null,
  waitUntil: 0,
}
```

---

## 4. SeatManager: nguồn sự thật duy nhất

Không lưu một tập `occupiedSeats` riêng trong UI và một tập khác trong scene. Mọi kiểm tra phải
đi qua `SeatManager`.

API tối thiểu:

```js
class SeatManager extends EventTarget {
  constructor(seats) {
    super()
    this.seats = new Map(seats.map((seat) => [seat.id, seat]))
  }

  getSeat(id) {}
  getSeatsAtSite(siteId) {}
  getNearestAvailable(position, maxDistance) {}
  isAvailable(id, actorId) {}
  reserve(id, actorType, actorId) {}
  occupy(id, actorType, actorId) {}
  release(id, actorId) {}
}
```

### Quy tắc availability

Một chỗ chỉ trống khi:

```js
seat.occupantId === null && seat.reservedBy === null
```

`reserve()` phải chạy ngay khi người chơi/NPC quyết định đi đến ghế, không đợi tới lúc ngồi.
Điều này ngăn hai nhân vật cùng chọn một ghế trong cùng vài frame.

### Quy tắc chuyển trạng thái

```text
Trống
  → reserve(actor)
Đang được giữ chỗ
  → occupy(actor) khi nhân vật đến nơi
  → release(actor) nếu đường đi bị hủy
Đang có người ngồi
  → release(actor) khi đứng dậy
```

Mỗi thay đổi phải phát event:

```js
this.dispatchEvent(
  new CustomEvent('change', {
    detail: { seatId, seat: structuredClone(seat) },
  }),
)
```

UI lắng nghe event này để cập nhật đúng một ô ghế, không dựng lại toàn bộ game.

---

## 5. Ghép UI giao diện

## 5.1. HUD “Ngồi gần đây”

Đặt nút tại cụm thao tác nhanh ở cạnh dưới màn hình, cùng lớp kính mờ với các HUD chip khác.

```html
<button id="seat-quick-action" class="hud-chip glass" type="button">
  <kbd>F</kbd>
  <span data-seat-label>Ngồi gần đây</span>
</button>
```

Ba trạng thái hiển thị:

```text
Đang đứng, có chỗ gần:      F · Ngồi gần đây
Đang đứng, không có chỗ:    F · Xem chỗ ngồi
Đang ngồi bồ đoàn:          F · Đứng dậy · #12
Đang ngồi ghế:              F · Đứng dậy
```

Không disable nút khi không có ghế gần. Khi đó nút mở modal sơ đồ chỗ ngồi của khu hiện tại.
Như vậy người dùng luôn nhận được phản hồi thay vì bấm mà không có gì xảy ra.

Luồng click/phím F:

```js
function toggleSeat() {
  if (playerState.seatedSeatId !== null) {
    GameController.standUp()
    return
  }

  const seat = SeatManager.getNearestAvailable(player.position, 10)
  if (seat) {
    GameController.walkToAndSit(seat.id)
    Toast.show('Đang đi tới chỗ ngồi gần nhất…')
    return
  }

  SeatingPanel.open(currentSiteId)
}
```

Khi người dùng đang nhập trong `input`, `textarea`, `select` hoặc vùng `contenteditable`, không
bắt phím F.

## 5.2. Modal “Chỗ ngồi an tịnh”

Giữ ngôn ngữ hình ảnh sơn mài vàng đồng của các popup hiện có:

- Nền nâu đỏ tối, có gradient nhẹ.
- Viền vàng đồng mảnh.
- Tiêu đề màu vàng sáng.
- Ô chỗ ngồi bo tròn.
- Không thêm phong cách dashboard trắng hoặc màu neon.

Cấu trúc:

```html
<section
  id="seating-dialog"
  class="system-panel"
  role="dialog"
  aria-modal="true"
  aria-labelledby="seating-title"
  hidden
>
  <header class="system-panel__header">
    <div>
      <small>AN TRÚ</small>
      <h2 id="seating-title">Chỗ ngồi an tịnh</h2>
    </div>
    <button type="button" data-close aria-label="Đóng">...</button>
  </header>

  <div data-seat-summary></div>
  <div data-seat-grid></div>
  <p data-seat-availability aria-live="polite"></p>
  <button type="button" data-stand hidden>Đứng dậy</button>
</section>
```

### Với khu chùa

- Header phụ: `Chùa Yên Phúc · Chánh Điện`.
- Chia hai dãy: `Dãy tả` và `Dãy hữu`.
- Giữ lối đi giữa bằng khoảng trống hoặc vạch trang trí.
- Mỗi ô gồm:
  - Số bồ đoàn.
  - Hình elip mô phỏng bồ đoàn.
  - Nhãn trạng thái.

### Với Sân Đạo Tràng

- Header phụ: `Sân Đạo Tràng Trung Tâm`.
- Grid 3 cột trên mobile, 4 cột trên màn hình rộng.
- Mỗi ô ghi `Ghế 1`, `Ghế 2`...
- Hình chữ nhật nhỏ thay cho hình elip bồ đoàn.

### Với đình nghỉ

Không cần modal riêng nếu người chơi đến gần. Dùng nút “Ngồi gần đây” là đủ. Nếu muốn hiển thị
trong modal, nhóm theo tên đình và chỉ liệt kê 4 ghế tại đình gần nhất.

## 5.3. Màu và nội dung theo trạng thái

```text
available:
  nhãn “Trống”
  nền vàng đồng rất nhạt
  hover sáng hơn

reserved:
  nhãn “Đang đến”
  giảm độ tương phản
  không cho click

occupied by NPC/resident:
  nhãn tên rút gọn hoặc “Có người”
  nền nâu xám
  không cho click

occupied by player:
  nhãn “Bạn”
  viền vàng sáng
  nền vàng trong suốt
  không cho click lại
```

Không chỉ dựa vào màu. Luôn có text và `aria-label`:

```text
Bồ đoàn số 12, hàng 2, còn trống
Bồ đoàn số 7, Thích Từ Bế đang ngồi
Ghế số 4, một thiện hữu đang đi tới
Ghế số 8, bạn đang ngồi
```

---

## 6. Xử lý UX người chơi

## 6.1. Đi tới và ngồi

1. Người dùng chọn một chỗ.
2. `SeatManager.reserve()` chỗ đó ngay lập tức.
3. Modal đóng.
4. Toast: `Đang đi tới bồ đoàn #12 tại Yên Phúc…`.
5. Nhân vật đi theo waypoint, không xuyên bàn thờ, tường hoặc hàng ghế.
6. Khi tới nơi:
   - Đặt đúng tọa độ ghế.
   - Xoay theo `heading`.
   - Đổi pose sang `sit`.
   - `SeatManager.occupy()`.
   - Toast: `Đã an tọa bồ đoàn #12. Nam mô A Di Đà Phật`.

Nếu đường đi bị hủy bởi WASD/cần điều khiển:

```js
SeatManager.release(playerState.targetSeatId, PLAYER_ID)
playerState.targetSeatId = null
playerState.pose = 'stand'
```

## 6.2. Đứng dậy

Có ba cách:

- Nhấn F.
- Bấm chip `Đứng dậy`.
- Di chuyển bằng WASD/cần điều khiển.

Khi đứng dậy:

1. Release ghế.
2. Đặt pose `stand`.
3. Dịch nhân vật khoảng `0.7–0.9` world unit ra trước ghế để tránh va chạm lại.
4. Đổi HUD về `Ngồi gần đây`.
5. Phát event để modal cập nhật `Trống`.

## 6.3. Tranh chấp ghế

Nếu ghế vừa bị NPC giữ trước khi người chơi click:

- Không im lặng.
- Hiện toast: `Chỗ này vừa có người chọn. Mời bạn chọn chỗ khác.`
- Cập nhật ô ghế thành `Đang đến`.
- Giữ modal mở để chọn lại.

Nếu ghế bị mất trong lúc auto-walk vì lỗi trạng thái:

- Hủy route.
- Release reservation cũ.
- Tìm ghế gần nhất khác trong bán kính nhỏ.
- Nếu không có, cho nhân vật đứng và hiện toast rõ ràng.

---

## 7. NPC đi lại tự do

## 7.1. Waypoint toàn bản đồ

Không chọn tọa độ ngẫu nhiên hoàn toàn vì NPC có thể xuyên tường hoặc rơi vào hồ. Tạo mạng
waypoint trên các đường đi bộ:

```js
const WORLD_TOUR = [
  [0, 14],
  [-30, 14],
  [-62, 14], // Phúc Duyên
  [-42, 14],
  [-20, 14],
  [0, 14],
  [30, 14],
  [62, 14], // Thiên Phú
  [42, 14],
  [20, 14],
  [0, 28],
  [-34, 35], // đình tây nam
  [0, 36],   // Đạo Tràng
  [34, 35],  // đình đông nam
  [0, 48],
  [-34, 68], // đình tây bắc
  [0, 70],   // Tịnh Gia
  [34, 68],  // đình đông bắc
  [0, 84],
  [0, 70],
  [0, 48],
  [0, 36],
]
```

Một nửa NPC đi xuôi, một nửa đi ngược. Mỗi NPC có:

- Điểm bắt đầu lệch nhau.
- Tốc độ ngẫu nhiên nhẹ, ví dụ `0.9–1.55`.
- Khoảng dừng ngắn `0.4–2.2 giây`.

Như vậy bản đồ sinh động nhưng NPC không tụ thành một hàng.

## 7.2. State machine NPC

```text
WALKING
  → đến waypoint
  → có xác suất tìm ghế gần
      → reserve ghế
      → GOING_TO_SEAT
  → không chọn ghế
      → WAITING
      → WALKING

GOING_TO_SEAT
  → đến ghế
  → occupy ghế
  → SITTING

SITTING
  → hết 7–20 giây
  → release ghế
  → WALKING
```

Pseudocode:

```js
function updateNpc(npc, delta, now) {
  if (npc.mode === 'sitting') {
    if (now >= npc.waitUntil) {
      SeatManager.release(npc.seatedSeatId, npc.id)
      npc.seatedSeatId = null
      npc.rig.setPose('stand')
      npc.mode = 'walking'
      npc.routeIndex = (npc.routeIndex + 1) % npc.route.length
    }
    return
  }

  const target = npc.mode === 'going-to-seat'
    ? SeatManager.getSeat(npc.targetSeatId).position
    : npc.route[npc.routeIndex]

  moveRigToward(npc.rig, target, npc.speed, delta)

  if (!hasArrived(npc.rig, target)) return

  if (npc.mode === 'going-to-seat') {
    const seat = SeatManager.getSeat(npc.targetSeatId)
    SeatManager.occupy(seat.id, 'npc', npc.id)
    snapRigToSeat(npc.rig, seat)
    npc.rig.setPose('sit')
    npc.seatedSeatId = seat.id
    npc.targetSeatId = null
    npc.waitUntil = now + randomBetween(7000, 20000)
    npc.mode = 'sitting'
    return
  }

  npc.routeIndex = (npc.routeIndex + 1) % npc.route.length
  const nearby = SeatManager.getAvailableWithin(npc.rig.position, 16)
  if (nearby.length && Math.random() < 0.42) {
    const seat = randomItem(nearby)
    if (SeatManager.reserve(seat.id, 'npc', npc.id)) {
      npc.targetSeatId = seat.id
      npc.mode = 'going-to-seat'
    }
  }
}
```

## 7.3. Tối ưu hiệu năng

- Không query DOM trong vòng `requestAnimationFrame`.
- Không tạo `Vector2/Vector3` mới mỗi frame; tái sử dụng object tạm.
- Chỉ render lại ô ghế khi nhận event `SeatManager.change`.
- NPC ở rất xa camera vẫn cập nhật logic ở tần suất thấp hơn, ví dụ 5–10 lần/giây.
- Giữ số NPC phù hợp với thiết bị mobile; có thể giảm theo cấu hình chất lượng.

---

## 8. Đồng bộ UI với scene

Các event cần có:

```text
seat:reserved
seat:occupied
seat:released
player:pose-changed
player:seat-target-changed
site:changed
```

Ví dụ:

```js
SeatManager.addEventListener('change', ({ detail }) => {
  SeatingPanel.updateSeat(detail.seat)
  SeatingPanel.updateAvailableCount()
})

GameController.addEventListener('player:pose-changed', ({ detail }) => {
  Hud.renderSeatAction(detail)
  SeatingPanel.renderStandButton(detail)
})
```

Nếu người chơi đi bộ sang chùa khác, `currentSiteId` phải được tính từ vùng gần nhất hoặc trigger
volume, không chỉ cập nhật khi dùng nút dịch chuyển nhanh. Điều này giúp:

- Tên khu trên HUD đúng.
- Modal mở đúng sơ đồ.
- Toast ghi đúng tên chùa.
- Hành động dâng hương/chuông dùng đúng cơ sở gần nhất.

Không tự teleport khi chỉ cập nhật `currentSiteId`.

---

## 9. Responsive và accessibility

### Desktop

- HUD chip ở cạnh dưới, không che action dock.
- Modal rộng vừa đủ để thấy hai dãy bồ đoàn.
- Có hỗ trợ F và Escape.

### Mobile

- Nút nhanh luôn đủ cao tối thiểu 44px.
- Grid ghế 3 cột; bồ đoàn có thể 4 cột mỗi dãy hoặc chuyển thành một grid cuộn.
- Modal giới hạn chiều cao và cuộn phần body, header/close luôn nhìn thấy.
- Khi cần điều khiển đang active, không để modal nhận sự kiện kéo của joystick.

### Accessibility

- Modal có `role="dialog"` và `aria-modal="true"`.
- Khi mở, focus vào tiêu đề hoặc chỗ trống đầu tiên.
- Tab bị giữ trong modal.
- Escape đóng modal.
- Khi đóng, trả focus về nút đã mở modal.
- Số chỗ còn trống dùng `aria-live="polite"`.
- Mỗi chỗ có `aria-label` đầy đủ, không chỉ nhãn `#12`.

---

## 10. Nội dung UX thống nhất

Nên dùng đúng các chuỗi sau:

```text
Tên panel: Chỗ ngồi an tịnh
CTA đứng: Đứng dậy
CTA mặc định: Ngồi gần đây
Ghế trống: Trống
Ghế của người chơi: Bạn
NPC đang đi tới: Đang đến
NPC/resident đang ngồi: Có người

Đang đi tới bồ đoàn #12 tại Yên Phúc…
Đang đi tới ghế số 4 tại Đạo Tràng…
Đã an tọa bồ đoàn #12. Nam mô A Di Đà Phật
Đã ngồi nghỉ. Thân thư thái, tâm thảnh thơi.
Chỗ này vừa có người chọn. Mời bạn chọn chỗ khác.
Không có chỗ trống gần đây.
```

---

## 11. Trình tự triển khai khuyến nghị cho Antigravity

1. Chuẩn hóa danh sách `sites` và `seats`; bảo đảm ID toàn bản đồ không trùng.
2. Tạo `SeatManager`; thay mọi phép kiểm tra ghế cũ bằng API của manager.
3. Nối thao tác người chơi `sit`, `sitNearest`, `stand`.
4. Nối việc hủy reservation khi người chơi dùng WASD/joystick.
5. Tạo HUD chip và phím F.
6. Tạo modal sơ đồ theo `site.kind`.
7. Cho UI lắng nghe event ghế để cập nhật realtime.
8. Chuyển NPC từ route cục bộ sang waypoint toàn bản đồ.
9. Thêm state machine NPC đi/ngồi/đứng.
10. Kiểm tra va chạm và đường đi tại từng chùa, đình nghỉ, quảng trường.
11. Kiểm tra desktop, mobile và keyboard accessibility.

---

## 12. Acceptance checklist

### Người chơi

- [ ] Nhấn F gần bồ đoàn trống sẽ đi tới và ngồi.
- [ ] Nhấn F gần ghế quảng trường sẽ đi tới và ngồi.
- [ ] Nhấn F gần ghế đình nghỉ sẽ đi tới và ngồi.
- [ ] Không thể chọn chỗ có resident, NPC hoặc người khác đang giữ.
- [ ] Di chuyển khi đang ngồi sẽ đứng dậy và trả chỗ.
- [ ] Hủy auto-walk sẽ trả reservation.
- [ ] Modal hiển thị đúng chùa hiện tại dù người chơi tự đi bộ sang khu khác.

### NPC

- [ ] NPC đi qua cả năm khu vực, không chỉ lặp trong một sân.
- [ ] Các NPC không đi cùng tốc độ và cùng pha.
- [ ] NPC có thể ngồi bồ đoàn, ghế quảng trường và ghế đình nghỉ.
- [ ] NPC giữ ghế ngay khi bắt đầu đi tới.
- [ ] NPC trả ghế sau khi đứng dậy.
- [ ] Hai NPC không thể chọn cùng một ghế.
- [ ] NPC không chọn ghế người chơi đang đi tới hoặc đang ngồi.

### UI/UX

- [ ] HUD luôn phản ánh đúng pose người chơi.
- [ ] Số chỗ trống cập nhật ngay khi NPC ngồi/đứng.
- [ ] Ghế có trạng thái text, không chỉ có màu.
- [ ] Toast giải thích mọi trường hợp thành công, hủy và tranh chấp.
- [ ] Modal dùng được bằng bàn phím và màn hình nhỏ.
- [ ] Không có click im lặng.

---

## 13. Đối chiếu với bản Next.js hiện tại

Các điểm tham chiếu trong app Chùa An Nhiên:

```text
src/app/(frontend)/TempleScene.tsx
  - SceneApi: sit, sitNearest, stand
  - worldSeats
  - npcOccupiedSeats
  - worldTourPoints
  - vòng update wanderers

src/app/(frontend)/PracticePanels.tsx
  - PracticeContext
  - SeatsView
  - sơ đồ bồ đoàn và ghế quảng trường

src/app/(frontend)/ChuaSenApp.tsx
  - toggleSeat
  - phím F
  - HUD chip
  - toast và onSeatChange

src/app/(frontend)/temple-data.ts
  - SEATS
  - SEAT_OCCUPANTS

src/app/(frontend)/temple-world.ts
  - TEMPLE_SITES
```

Bản Vanilla nên giữ hành vi tương đương nhưng nâng cấp `SeatManager` thành nguồn sự thật duy
nhất để UI nhìn thấy cả trạng thái NPC động. Đây là điểm quan trọng nhất khi ghép sang
Antigravity.
