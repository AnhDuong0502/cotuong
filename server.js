const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

const PORT = 8080;
const PUBLIC_DIR = __dirname;

// Helper: Get local LAN IPv4 address
function getLocalLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// HTTP Server for static assets and API
const server = http.createServer((req, res) => {
  // API to get local LAN IP
  if (req.url === '/api/lan-info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ip: getLocalLanIp(), port: PORT }));
    return;
  }

  // Sanitize path
  let safePath = path.normalize(req.url.split('?')[0]);
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  // Security check: ensure path stays within public dir
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

// WebSocket Server for Real-Time LAN Multiplayer
const wss = new WebSocketServer({ server });

// Rooms map: roomId -> { id, red: ws, black: ws, currentTurn: 'red', boardHistory: [] }
const rooms = new Map();

function generateRoomId() {
  let id;
  do {
    id = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(id));
  return id;
}

wss.on('connection', (ws) => {
  let userRoomId = null;
  let userRole = null; // 'red' or 'black'

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'CREATE_ROOM': {
          const roomId = generateRoomId();
          userRoomId = roomId;
          userRole = 'red';
          ws.role = 'red';

          rooms.set(roomId, {
            id: roomId,
            red: ws,
            black: null,
            currentTurn: 'red'
          });

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            roomId,
            role: 'red'
          }));
          break;
        }

        case 'JOIN_ROOM': {
          const roomId = (data.roomId || '').trim();
          const room = rooms.get(roomId);

          if (!room) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Phòng không tồn tại hoặc đã kết thúc!'
            }));
            return;
          }

          if (room.black) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Phòng này đã đủ 2 người chơi!'
            }));
            return;
          }

          userRoomId = roomId;
          userRole = 'black';
          ws.role = 'black';
          room.black = ws;

          // Notify Black
          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            roomId,
            role: 'black'
          }));

          // Notify Red & Black game can start!
          const startMsg = JSON.stringify({
            type: 'GAME_START',
            roomId,
            firstTurn: 'red'
          });

          room.red.send(startMsg);
          room.black.send(startMsg);
          break;
        }

        case 'MAKE_MOVE': {
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);

          const opponent = userRole === 'red' ? room.black : room.red;
          if (opponent && opponent.readyState === ws.OPEN) {
            opponent.send(JSON.stringify({
              type: 'OPPONENT_MOVED',
              from: data.from,
              to: data.to,
              role: userRole
            }));
          }
          break;
        }

        case 'REQUEST_UNDO': {
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);
          const opponent = userRole === 'red' ? room.black : room.red;
          if (opponent && opponent.readyState === ws.OPEN) {
            opponent.send(JSON.stringify({
              type: 'UNDO_REQUESTED',
              by: userRole
            }));
          }
          break;
        }

        case 'RESPOND_UNDO': {
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);
          const opponent = userRole === 'red' ? room.black : room.red;
          if (opponent && opponent.readyState === ws.OPEN) {
            opponent.send(JSON.stringify({
              type: 'UNDO_RESPONSE',
              accepted: data.accepted
            }));
          }
          break;
        }

        case 'RESTART_ROOM_GAME': {
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);
          const restartMsg = JSON.stringify({ type: 'ROOM_GAME_RESTARTED' });
          if (room.red && room.red.readyState === ws.OPEN) room.red.send(restartMsg);
          if (room.black && room.black.readyState === ws.OPEN) room.black.send(restartMsg);
          break;
        }
      }
    } catch (e) {
      console.error('WS Error:', e.message);
    }
  });

  ws.on('close', () => {
    if (userRoomId && rooms.has(userRoomId)) {
      const room = rooms.get(userRoomId);
      const opponent = userRole === 'red' ? room.black : room.red;

      if (opponent && opponent.readyState === ws.OPEN) {
        opponent.send(JSON.stringify({
          type: 'OPPONENT_LEFT',
          message: 'Đối thủ đã ngắt kết nối hoặc rời phòng!'
        }));
      }

      rooms.delete(userRoomId);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const lanIp = getLocalLanIp();
  console.log(`\n==============================================`);
  console.log(`🚀 CỜ TƯỚNG LAN MULTIPLAYER SERVER ĐANG CHẠY:`);
  console.log(`• Truy cập trên máy này: http://localhost:${PORT}`);
  console.log(`• Truy cập qua mạng LAN / Wi-Fi: http://${lanIp}:${PORT}`);
  console.log(`==============================================\n`);
});
