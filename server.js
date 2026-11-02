/**
 * Chùa An Nhiên — Unified Real-time Sanctuary Backend Server
 * Máy Chủ Lưu Trữ & Đồng Bộ Đạo Tràng Toàn Cầu Chung Luồng
 *
 * Tính Năng:
 * 1. Lưu Trữ Trạng Thái Bền Vững (Persistent Storage): Lưu trữ vào data/sanctuary_db.json
 * 2. Chung 1 Luồng Dữ Liệu Thời Gian Thực (Unified Stream):
 *    - REST API: /api/sanctuary/state, /api/sanctuary/join, /api/sanctuary/heartbeat, /api/sanctuary/seat
 *    - Server-Sent Events (SSE): /api/sanctuary/events (Không bao giờ bị chặn bởi 4G/tường lửa)
 *    - WebSocket Server: /ws (Đồng bộ tức thời sub-millisecond)
 * 3. Đồng Bộ Khóa Lễ Tụng Kinh (Server-Clocked Communal Chanting):
 *    - Máy chủ tự động đếm nhịp và chuyển câu kinh cho toàn phòng
 * 4. Phục Vụ Toàn Bộ Giao Diện Web (Static Server) cho PC & Điện Thoại
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

let WebSocketServer;
try {
  WebSocketServer = require('ws').Server;
} catch (e) {
  console.warn('[Server] Module "ws" not found, running with SSE & REST stream mode.');
}

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'sanctuary_db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default sanctuary seats (12 cushions)
const DEFAULT_SEATS = [
  { seatNo: 1,  id: 'seat-1',  x: 19,   y: 8,  scale: 0.86, occupied: true,  isUser: false, isDummy: true,  remoteClientId: null, name: 'Bình An',   dharma: 'Tịnh An',  age: 24, hometown: 'Huế',       type: 'female', points: 40, ip: '113.161.45.12' },
  { seatNo: 2,  id: 'seat-2',  x: 29.5, y: 8,  scale: 0.86, occupied: false, isUser: false, isDummy: false, remoteClientId: null, name: '',          dharma: '',         age: 0,  hometown: '',          type: 'monk',   points: 0,  ip: '' },
  { seatNo: 3,  id: 'seat-3',  x: 40,   y: 8,  scale: 0.86, occupied: true,  isUser: false, isDummy: true,  remoteClientId: null, name: 'Hoa Sen',   dharma: 'Liên Tâm', age: 19, hometown: 'Hà Nội',    type: 'monk',   points: 60, ip: '27.68.12.90' },
  { seatNo: 4,  id: 'seat-4',  x: 60,   y: 8,  scale: 0.86, occupied: false, isUser: false, isDummy: false, remoteClientId: null, name: '',          dharma: '',         age: 0,  hometown: '',          type: 'monk',   points: 0,  ip: '' },
  { seatNo: 5,  id: 'seat-5',  x: 70.5, y: 8,  scale: 0.86, occupied: true,  isUser: false, isDummy: true,  remoteClientId: null, name: 'Gia Hân',   dharma: 'Tuệ Hân',  age: 22, hometown: 'Đà Nẵng',   type: 'monk',   points: 35, ip: '42.112.88.34' },
  { seatNo: 6,  id: 'seat-6',  x: 81,   y: 8,  scale: 0.86, occupied: false, isUser: false, isDummy: false, remoteClientId: null, name: '',          dharma: '',         age: 0,  hometown: '',          type: 'female', points: 0,  ip: '' },
  { seatNo: 7,  id: 'seat-7',  x: 16,   y: 42, scale: 0.98, occupied: true,  isUser: false, isDummy: true,  remoteClientId: null, name: 'Ngọc Mai',  dharma: 'Diệu Mai', age: 27, hometown: 'TP.HCM',    type: 'female', points: 50, ip: '14.162.201.76' },
  { seatNo: 8,  id: 'seat-8',  x: 27.5, y: 42, scale: 0.98, occupied: true,  isUser: false, isDummy: true,  remoteClientId: null, name: 'Thiện Tâm', dharma: 'Chánh Tâm',age: 16, hometown: 'Nam Định',  type: 'monk',   points: 90, ip: '171.244.5.18' },
  { seatNo: 9,  id: 'seat-9',  x: 39,   y: 42, scale: 0.98, occupied: true,  isUser: false, isDummy: true,  remoteClientId: null, name: 'Hải Yến',   dharma: 'Tịnh Yến', age: 29, hometown: 'Hải Phòng', type: 'female', points: 45, ip: '123.24.119.55' },
  { seatNo: 10, id: 'seat-10', x: 61,   y: 42, scale: 0.98, occupied: false, isUser: false, isDummy: false, remoteClientId: null, name: '',          dharma: '',         age: 0,  hometown: '',          type: 'monk',   points: 0,  ip: '' },
  { seatNo: 11, id: 'seat-11', x: 72.5, y: 42, scale: 0.98, occupied: true,  isUser: false, isDummy: true,  remoteClientId: null, name: 'Bảo Trân',  dharma: 'Ngọc Trân',age: 23, hometown: 'Cần Thơ',   type: 'female', points: 55, ip: '116.108.92.21' },
  { seatNo: 12, id: 'seat-12', x: 84,   y: 42, scale: 0.98, occupied: false, isUser: false, isDummy: false, remoteClientId: null, name: '',          dharma: '',         age: 0,  hometown: '',          type: 'female', points: 0,  ip: '' }
];

// In-Memory state with database backing
let sanctuaryDB = {
  updatedAt: Date.now(),
  seats: JSON.parse(JSON.stringify(DEFAULT_SEATS)),
  devotees: {},
  communalChant: {
    isActive: false,
    scriptureId: 'daibi',
    scriptureTitle: 'Chú Đại Bi',
    verseIndex: 0,
    verseText: '',
    totalVerses: 0,
    leaderId: null,
    leaderName: '',
    intervalMs: 3000,
    startedAt: null
  },
  recentEvents: [],
  // Recent room messages are persisted so a new device can catch up.
  chatHistory: []
};

// Load existing DB if present
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.seats)) {
      sanctuaryDB = parsed;
      if (!Array.isArray(sanctuaryDB.chatHistory)) sanctuaryDB.chatHistory = [];
      // Reset active connections from previous process
      sanctuaryDB.devotees = {};
      sanctuaryDB.seats.forEach(s => {
        if (!s.isDummy && s.remoteClientId) {
          s.occupied = false;
          s.remoteClientId = null;
        }
      });
      console.log('[Server] Loaded persistent database from', DB_FILE);
    }
  } catch (err) {
    console.warn('[Server] Error loading DB file, using fresh state:', err);
  }
}

function saveDatabase() {
  sanctuaryDB.updatedAt = Date.now();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(sanctuaryDB, null, 2), 'utf8');
  } catch (err) {
    console.error('[Server] Failed to write sanctuary_db.json:', err);
  }
}

// Active connections for real-time broadcast
const sseClients = new Set();
const wsClients = new Set();

function broadcastEvent(eventData) {
  eventData.timestamp = eventData.timestamp || Date.now();

  if (eventData.type === 'ROOM_CHAT' && eventData.roomId && eventData.text) {
    const chatMessage = {
      messageId: eventData.messageId || `${eventData.senderId || 'guest'}-${eventData.timestamp}-${eventData.text.slice(0, 16)}`,
      type: 'ROOM_CHAT',
      roomId: String(eventData.roomId).slice(0, 64),
      channel: eventData.channel === 'dm' ? 'dm' : 'lobby',
      senderId: eventData.senderId || '',
      name: String(eventData.name || 'Đồng Tu').slice(0, 80),
      text: String(eventData.text).trim().slice(0, 500),
      timestamp: eventData.timestamp
    };
    const duplicate = sanctuaryDB.chatHistory.some(item => item.messageId === chatMessage.messageId);
    if (!duplicate) {
      sanctuaryDB.chatHistory.push(chatMessage);
      if (sanctuaryDB.chatHistory.length > 300) sanctuaryDB.chatHistory.splice(0, sanctuaryDB.chatHistory.length - 300);
      saveDatabase();
    }
  }

  // Keep last 40 events
  sanctuaryDB.recentEvents.push(eventData);
  if (sanctuaryDB.recentEvents.length > 40) {
    sanctuaryDB.recentEvents.shift();
  }

  // 1. Send to all WebSocket clients
  const wsMsg = JSON.stringify(eventData);
  wsClients.forEach(ws => {
    if (ws.readyState === 1 /* OPEN */) {
      try {
        ws.send(wsMsg);
      } catch (e) {
        // ignore
      }
    }
  });

  // 2. Send to all SSE clients
  const sseChunk = `data: ${wsMsg}\n\n`;
  sseClients.forEach(res => {
    try {
      res.write(sseChunk);
    } catch (e) {
      // ignore
    }
  });
}

// Communal Chant Timer Management
let communalChantTimer = null;

function getScriptureVerses(id) {
  // Built-in scripture verses for server-side clock
  const versesMap = {
    daibi: [
      "Nam mô Đại Bi Hội Thượng Phật Bồ Tát (3 lần, 1 lạy)",
      "Thiên thủ thiên nhãn vô ngại đại bi tâm đà la ni.",
      "Nam mô hắc ra đát na, đa ra dạ da.",
      "Nam mô a rị da, bà lô kiết đế, thước bát ra da,",
      "Bồ Đề tát đỏa bà da, ma ha tát đỏa bà da, ma ha ca lô ni ca da.",
      "Án, tát bàn ra phạt duệ, số đát na đát tỏa.",
      "Nam mô tất kiết lật đỏa y mông a rị da, bà lô kiết đế thất Phật ra lăng đà bà.",
      "Nam mô na ra cẩn trì, hê rị ma ha bàn đa sa mế,",
      "Tát bà a tha đậu du bằng, a thệ dựng, tát bà tát đa, na ma bà già, ma phạt đạt đậu.",
      "Đát điệt tha: Án, a bà lô hê, lô ca đế, ca ra đế, di hê rị,",
      "Ma ha bồ đề tát đỏa, tát bà tát bà, ma ra ma ra, ma hê ma hê, rị đà dựng,",
      "Cu lô cu lô kiết mông, độ lô độ lô phạt xà da đế, ma ha phạt xà da đế,",
      "Đà ra đà ra, địa rị ni, thất Phật ra da, dã ra dã ra, ma ma phạt ma ra, mục đế lệ,",
      "Y hê y hê, thất na thất na, a ra sâm, Phật ra xá lợi, phạt sa phạt sâm, Phật ra xá da.",
      "Hô lô hô lô ma ra, hô lô hô lô hê rị, ta ra ta ra, tất rị tất rị, tô rô tô rô,",
      "Bồ Đề dạ, Bồ Đề dạ, bồ đà dạ, bồ đà dạ, di đế rị dạ, na ra cẩn trì,",
      "Địa rị sắc ni na, ba dạ ma na, ta bà ha.",
      "Tất đà dạ, ta bà ha. Ma ha tất đà dạ, ta bà ha.",
      "Tất đà dũ nghệ, thất bàn ra dạ, ta bà ha. Na ra cẩn trì, ta bà ha.",
      "Ma ra na ra, ta bà ha. Tất ra tăng, a mục khư da, ta bà ha.",
      "Ta bà ma ha, a tất đà dạ, ta bà ha. Giả kiết ra, a tất đà dạ, ta bà ha.",
      "Ba đà ma, yết tất đà dạ, ta bà ha. Na ra cẩn trì, bàn đà ra dạ, ta bà ha.",
      "Ma bà lị, thắng kiết ra dạ, ta bà ha.",
      "Nam mô hắc ra đát na, đa ra dạ da. Nam mô a rị da, bà lô kiết đế, thước bàn ra dạ, ta bà ha.",
      "Án, tất điện đô, mạn đa ra, bạt đà gia, ta bà ha. (3 lần)"
    ],
    batnha: [
      "Khi Bồ Tát Quán Tự Tại hành sâu Bát Nhã Ba La Mật Đa,",
      "Soi thấy năm uẩn đều Không, vượt qua hết thảy khổ ách.",
      "Này Xá Lợi Tử! Sắc chẳng khác Không, Không chẳng khác Sắc;",
      "Sắc tức là Không, Không tức là Sắc. Thọ, Tưởng, Hành, Thức cũng đều như thế.",
      "Này Xá Lợi Tử! Tướng Không của mọi pháp: Không sanh, không diệt, không nhơ, không sạch, không thêm, không bớt.",
      "Cho nên trong Chân Không không có Sắc, không có Thọ, Tưởng, Hành, Thức;",
      "Không có Mắt, Tai, Mũi, Lưỡi, Thân, Ý; Không có Sắc, Thanh, Hương, Vị, Xúc, Pháp;",
      "Không có Khổ, Tập, Diệt, Đạo; Không có Trí Huệ, cũng không có Chứng Đắc.",
      "Vì không có chỗ chứng đắc, nên Bồ Tát nương theo Bát Nhã Ba La Mật Đa, tâm không ngăn ngại,",
      "Xa lìa mộng tưởng điên đảo, cứu cánh Niết Bàn.",
      "Yết đế, Yết đế, Ba la yết đế, Ba la tăng yết đế, Bồ đề tát bà ha. (3 lần)"
    ],
    duocsu: [
      "Nam mô Dược Sư Lưu Ly Quang Vương Như Lai (3 lần)",
      "Nam mô Bạc già phạt đế, Bệ sát xã, lũ lô thích lưu ly,",
      "Bát lặc bà, hắt ra xà dã, Đát tha yết đa da, A ra ha đế, Tam miệu tam bột đà da.",
      "Đát điệt tha: Án, Bệ sát thệ, bệ sát thệ, Bệ sát xã, tam một yết đế ta ha. (7 lần)"
    ],
    samhoi: [
      "Đệ tử kính lạy Mười Phương Thường Trụ Tam Bảo,",
      "Hôm nay chí tâm thành kính sám hối:",
      "Con xưa đã tạo bao ác nghiệp, đều bởi vô thỉ tham sân si,",
      "Từ thân miệng ý phát sinh ra, tất cả con nay xin sám hối.",
      "Tội từ tâm khởi đem tâm sám, tâm được tịnh rồi tội liền tiêu;",
      "Tội tiêu tâm tịnh thảy đều Không, thế mới thật là chân sám hối.",
      "Nguyện đem công đức tu tập này, hồi hướng khắp cùng tất cả chúng sanh,",
      "Đều phát tâm Bồ Đề rộng lớn, đồng sanh cõi Cực Lạc an lành.",
      "Nam Mô A Di Đà Phật. (3 lần)"
    ]
  };
  return versesMap[id] || versesMap.daibi;
}

function startServerChant(scriptureId, intervalMs, leaderId, leaderName) {
  clearInterval(communalChantTimer);
  const verses = getScriptureVerses(scriptureId);
  const titles = {
    daibi: 'Chú Đại Bi (84 câu Chân Ngôn)',
    batnha: 'Bát Nhã Ba La Mật Đa Tâm Kinh',
    duocsu: 'Dược Sư Quán Đảnh Chân Ngôn',
    samhoi: 'Kinh Sám Hối & Hồi Hướng'
  };

  sanctuaryDB.communalChant = {
    isActive: true,
    scriptureId: scriptureId,
    scriptureTitle: titles[scriptureId] || 'Chú Đại Bi',
    verseIndex: 0,
    verseText: verses[0],
    totalVerses: verses.length,
    leaderId: leaderId || 'he_thong',
    leaderName: leaderName || 'Chủ Lễ Đạo Tràng',
    intervalMs: intervalMs || 3000,
    startedAt: Date.now()
  };

  saveDatabase();

  broadcastEvent({
    type: 'COMMUNAL_CHANT_START',
    senderId: leaderId,
    leaderId: leaderId,
    leaderName: leaderName,
    scriptureId: scriptureId,
    scriptureTitle: sanctuaryDB.communalChant.scriptureTitle,
    verseIndex: 0,
    verseText: verses[0],
    totalVerses: verses.length,
    intervalMs: intervalMs
  });

  let curIdx = 0;
  communalChantTimer = setInterval(() => {
    curIdx++;
    if (curIdx >= verses.length) {
      finishServerChant();
      return;
    }

    sanctuaryDB.communalChant.verseIndex = curIdx;
    sanctuaryDB.communalChant.verseText = verses[curIdx];

    broadcastEvent({
      type: 'COMMUNAL_CHANT_VERSE',
      senderId: leaderId,
      leaderId: leaderId,
      scriptureId: scriptureId,
      verseIndex: curIdx,
      verseText: verses[curIdx],
      totalVerses: verses.length
    });
  }, intervalMs || 3000);
}

function stopServerChant() {
  clearInterval(communalChantTimer);
  communalChantTimer = null;
  sanctuaryDB.communalChant.isActive = false;
  saveDatabase();

  broadcastEvent({
    type: 'COMMUNAL_CHANT_STOP',
    scriptureTitle: sanctuaryDB.communalChant.scriptureTitle
  });
}

function finishServerChant() {
  clearInterval(communalChantTimer);
  communalChantTimer = null;
  const title = sanctuaryDB.communalChant.scriptureTitle;
  sanctuaryDB.communalChant.isActive = false;
  saveDatabase();

  broadcastEvent({
    type: 'COMMUNAL_CHANT_FINISH',
    scriptureTitle: title
  });
}

// Seat management helpers
function allocateBestSeat(clientId, requestedSeatNo, profile) {
  // 1. If client already has a seat, preserve
  const existing = sanctuaryDB.seats.find(s => s.remoteClientId === clientId);
  if (existing && (!requestedSeatNo || existing.seatNo === requestedSeatNo)) {
    return existing;
  }

  // 2. Try requested seat if unoccupied or dummy
  if (requestedSeatNo) {
    const candidate = sanctuaryDB.seats.find(s => s.seatNo === requestedSeatNo);
    if (candidate && (!candidate.occupied || candidate.remoteClientId === clientId || candidate.isDummy)) {
      return candidate;
    }
  }

  // 3. Find first empty seat
  const empty = sanctuaryDB.seats.find(s => !s.occupied && !s.remoteClientId);
  if (empty) return empty;

  // 4. Find first dummy seat
  const dummy = sanctuaryDB.seats.find(s => s.isDummy && !s.remoteClientId);
  if (dummy) return dummy;

  return sanctuaryDB.seats[9]; // Seat 10 fallback
}

// Periodic prune of dead clients (no ping for 14 seconds)
setInterval(() => {
  const now = Date.now();
  let changed = false;

  for (const cId in sanctuaryDB.devotees) {
    const dev = sanctuaryDB.devotees[cId];
    if (now - dev.lastSeen > 14000) {
      delete sanctuaryDB.devotees[cId];
      changed = true;

      // Free their seat
      sanctuaryDB.seats.forEach(s => {
        if (s.remoteClientId === cId) {
          s.occupied = false;
          s.remoteClientId = null;
          s.name = '';
          s.dharma = '';
        }
      });

      broadcastEvent({
        type: 'LEAVE',
        senderId: cId
      });
    }
  }

  if (changed) {
    saveDatabase();
  }
}, 4000);

// MIME Types for Static Server
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2'
};

// HTTP Server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS for all domains (allows GitHub Pages to connect directly)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // -------------------------------------------------------------
  // REST API ROUTES
  // -------------------------------------------------------------
  if (pathname === '/api/sanctuary/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      serverTime: Date.now(),
      onlineCount: Object.keys(sanctuaryDB.devotees).length,
      seats: sanctuaryDB.seats,
      devotees: sanctuaryDB.devotees,
      communalChant: sanctuaryDB.communalChant,
      recentEvents: sanctuaryDB.recentEvents.slice(-10),
      chatHistory: sanctuaryDB.chatHistory.slice(-120)
    }));
    return;
  }

  if (pathname === '/api/sanctuary/events') {
    // Server-Sent Events (SSE) Stream
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', serverTime: Date.now() })}\n\n`);

    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (req.method === 'POST' && pathname === '/api/sanctuary/join') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const cId = payload.clientId || ('user_' + Math.random().toString(36).substring(2, 8));
        const prof = payload.profile || {};

        // Find or allocate seat
        const seat = allocateBestSeat(cId, prof.assignedSeatNo, prof);
        if (seat) {
          // Free any previous seat
          sanctuaryDB.seats.forEach(s => {
            if (s.remoteClientId === cId && s.seatNo !== seat.seatNo) {
              s.occupied = false;
              s.remoteClientId = null;
            }
          });

          seat.occupied = true;
          seat.isUser = false;
          seat.isDummy = false;
          seat.remoteClientId = cId;
          seat.name = prof.fullName || 'Đồng Tu Mới';
          seat.dharma = prof.dharmaName || 'Tịnh Tâm';
          seat.age = prof.age || 26;
          seat.hometown = prof.hometown || 'Chùa An Nhiên';
          seat.ip = prof.clientIp || req.socket.remoteAddress || '113.161.x.x';
          seat.points = prof.meritScore || 20;
          seat.type = prof.avatarType || prof.gender || 'monk';
          seat.wish = prof.wish || '';
        }

        sanctuaryDB.devotees[cId] = {
          clientId: cId,
          seatNo: seat ? seat.seatNo : 10,
          name: prof.fullName || 'Đồng Tu Mới',
          dharma: prof.dharmaName || 'Tịnh Tâm',
          ip: prof.clientIp || req.socket.remoteAddress,
          points: prof.meritScore || 20,
          gender: prof.avatarType || 'monk',
          lastSeen: Date.now()
        };

        saveDatabase();

        const joinEvent = {
          type: 'HELLO_SYNC',
          senderId: cId,
          data: Object.assign({}, prof, { seatNo: seat ? seat.seatNo : 10 })
        };
        broadcastEvent(joinEvent);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          assignedSeatNo: seat ? seat.seatNo : 10,
          state: sanctuaryDB
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/sanctuary/heartbeat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const cId = payload.clientId;
        if (cId && sanctuaryDB.devotees[cId]) {
          sanctuaryDB.devotees[cId].lastSeen = Date.now();
          if (payload.profile) {
            sanctuaryDB.devotees[cId].points = payload.profile.meritScore || sanctuaryDB.devotees[cId].points;
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          onlineCount: Object.keys(sanctuaryDB.devotees).length,
          communalChant: sanctuaryDB.communalChant
        }));
      } catch (e) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/sanctuary/event') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        broadcastEvent(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/sanctuary/chant/start') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        startServerChant(payload.scriptureId, payload.intervalMs, payload.leaderId, payload.leaderName);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, communalChant: sanctuaryDB.communalChant }));
      } catch (e) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/sanctuary/chant/stop') {
    stopServerChant();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // -------------------------------------------------------------
  // STATIC FILE SERVING
  // -------------------------------------------------------------
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback: serve index.html
      filePath = path.join(__dirname, 'index.html');
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('500 Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

// WebSocket Server Integration
if (WebSocketServer) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    wsClients.add(ws);
    console.log('[Server WebSocket] New client connected. Total clients:', wsClients.size);

    // Send initial snapshot state
    ws.send(JSON.stringify({
      type: 'INIT_STATE',
      data: sanctuaryDB
    }));

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message);
        if (msg.type === 'HEARTBEAT' && msg.senderId) {
          if (sanctuaryDB.devotees[msg.senderId]) {
            sanctuaryDB.devotees[msg.senderId].lastSeen = Date.now();
          }
        } else if (msg.type === 'COMMUNAL_CHANT_START') {
          startServerChant(msg.scriptureId, msg.intervalMs, msg.leaderId, msg.leaderName);
        } else if (msg.type === 'COMMUNAL_CHANT_STOP') {
          stopServerChant();
        } else {
          broadcastEvent(msg);
        }
      } catch (e) {
        console.error('[Server WebSocket] Message parse error:', e);
      }
    });

    ws.on('close', () => {
      wsClients.delete(ws);
      console.log('[Server WebSocket] Client disconnected. Total clients:', wsClients.size);
    });
  });
}

// Start Server
server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`✦ CHÙA AN NHIÊN — MÁY CHỦ LƯU TRỮ ĐẠO TRÀNG TOÀN CẦU ✦`);
  console.log(`• HTTP & REST API: http://localhost:${PORT}`);
  console.log(`• WebSocket Stream: ws://localhost:${PORT}`);
  console.log(`• SSE Event Stream: http://localhost:${PORT}/api/sanctuary/events`);
  console.log(`• Database File:   ${DB_FILE}`);
  console.log(`================================================================`);
});
