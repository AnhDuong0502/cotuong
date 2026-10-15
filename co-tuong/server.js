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

// WebSocket Server for Real-Time LAN Multiplayer & Tournament Referee
const wss = new WebSocketServer({ server });

// Rooms map: roomId -> roomObject
const rooms = new Map();

function generateRoomId() {
  let id;
  do {
    id = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(id));
  return id;
}

function getRoomSummary(room) {
  return {
    roomId: room.id,
    roomType: room.type, // 'normal' | 'tournament'
    hasPlayer1: !!(room.player1 && room.player1.readyState === 1),
    hasPlayer2: !!(room.player2 && room.player2.readyState === 1),
    hasReferee: !!(room.referee && room.referee.readyState === 1),
    gameStarted: room.gameStarted,
    paused: room.paused,
    currentTurn: room.currentTurn
  };
}

function broadcastToRoom(room, messageObj) {
  const data = JSON.stringify(messageObj);
  const clients = [room.player1, room.player2, room.referee];
  clients.forEach(client => {
    if (client && client.readyState === 1) {
      client.send(data);
    }
  });
}

function broadcastRoomState(room) {
  broadcastToRoom(room, {
    type: 'ROOM_STATE_UPDATE',
    roomState: getRoomSummary(room)
  });
}

// Start Match with Random Red / Black sides between player1 & player2
function startMatch(room) {
  if (!room.player1 || !room.player2) return;

  room.gameStarted = true;
  room.paused = false;
  room.currentTurn = 'red';
  room.history = [];

  // Randomize Red and Black (50/50)
  const isPlayer1Red = Math.random() < 0.5;
  room.redPlayer = isPlayer1Red ? room.player1 : room.player2;
  room.blackPlayer = isPlayer1Red ? room.player2 : room.player1;

  room.redPlayer.chessRole = 'red';
  room.blackPlayer.chessRole = 'black';

  const baseStart = {
    type: 'GAME_START',
    roomId: room.id,
    roomType: room.type,
    firstTurn: 'red',
    isRandomized: true,
    hasReferee: !!(room.referee && room.referee.readyState === 1)
  };

  // Notify Red Player
  if (room.redPlayer.readyState === 1) {
    room.redPlayer.send(JSON.stringify({
      ...baseStart,
      role: 'red',
      opponentRole: 'black',
      message: 'Hệ thống đã random: Bạn được chỉ định cầm quân ĐỎ (Đi trước)!'
    }));
  }

  // Notify Black Player
  if (room.blackPlayer.readyState === 1) {
    room.blackPlayer.send(JSON.stringify({
      ...baseStart,
      role: 'black',
      opponentRole: 'red',
      message: 'Hệ thống đã random: Bạn được chỉ định cầm quân ĐEN (Đi sau - Bàn cờ tự động xoay)!'
    }));
  }

  // Notify Referee if present
  if (room.referee && room.referee.readyState === 1) {
    room.referee.send(JSON.stringify({
      ...baseStart,
      role: 'referee',
      p1Assigned: isPlayer1Red ? 'red' : 'black',
      p2Assigned: isPlayer1Red ? 'black' : 'red',
      message: `Trận đấu bắt đầu! Kỳ thủ 1: ${isPlayer1Red ? 'ĐỎ' : 'ĐEN'}, Kỳ thủ 2: ${isPlayer1Red ? 'ĐEN' : 'ĐỎ'}`
    }));
  }

  broadcastRoomState(room);
}

wss.on('connection', (ws) => {
  let userRoomId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'CREATE_ROOM': {
          const roomId = generateRoomId();
          userRoomId = roomId;

          const roomType = data.roomType === 'tournament' ? 'tournament' : 'normal';
          const creatorRole = (roomType === 'tournament' && data.creatorRole === 'referee') ? 'referee' : 'player';

          const newRoom = {
            id: roomId,
            type: roomType,
            player1: creatorRole === 'player' ? ws : null,
            player2: null,
            referee: creatorRole === 'referee' ? ws : null,
            redPlayer: null,
            blackPlayer: null,
            currentTurn: 'red',
            paused: false,
            gameStarted: false,
            history: []
          };

          ws.roomRole = creatorRole;
          rooms.set(roomId, newRoom);

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            roomId,
            roomType,
            role: creatorRole,
            roomState: getRoomSummary(newRoom)
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

          const requestedRole = (room.type === 'tournament' && data.requestedRole === 'referee') ? 'referee' : 'player';

          if (requestedRole === 'referee') {
            if (room.type !== 'tournament') {
              ws.send(JSON.stringify({
                type: 'ERROR',
                message: 'Phòng này là phòng thường 2 người chơi (không hỗ trợ trọng tài)!'
              }));
              return;
            }
            if (room.referee && room.referee.readyState === 1 && room.referee !== ws) {
              ws.send(JSON.stringify({
                type: 'ERROR',
                message: 'Phòng này đã có Trọng tài!'
              }));
              return;
            }

            room.referee = ws;
            ws.roomRole = 'referee';
            userRoomId = roomId;

            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              roomId,
              roomType: room.type,
              role: 'referee',
              roomState: getRoomSummary(room)
            }));

            broadcastRoomState(room);

            // If players already present in tournament, notify referee
            if (room.player1 && room.player2) {
              ws.send(JSON.stringify({
                type: 'READY_TO_START',
                message: 'Đã đủ 2 kỳ thủ! Trọng tài có thể bấm Bắt đầu trận đấu.'
              }));
            }
            return;
          }

          // Joining as player
          if (room.player1 && room.player1.readyState === 1 &&
              room.player2 && room.player2.readyState === 1 &&
              room.player1 !== ws && room.player2 !== ws) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Phòng này đã đủ 2 kỳ thủ tham gia!'
            }));
            return;
          }

          userRoomId = roomId;
          ws.roomRole = 'player';

          if (!room.player1 || room.player1.readyState !== 1) {
            room.player1 = ws;
          } else if (!room.player2 || room.player2.readyState !== 1) {
            room.player2 = ws;
          } else {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Phòng này đã đủ 2 kỳ thủ tham gia!'
            }));
            return;
          }

          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            roomId,
            roomType: room.type,
            role: 'player',
            roomState: getRoomSummary(room)
          }));

          broadcastRoomState(room);

          // If normal room and both players present: auto-start match with random Red/Black!
          if (room.type === 'normal' && room.player1 && room.player2) {
            startMatch(room);
          } else if (room.type === 'tournament') {
            // In tournament mode, if both players are in, notify referee they can start
            if (room.player1 && room.player2 && room.referee && room.referee.readyState === 1) {
              room.referee.send(JSON.stringify({
                type: 'READY_TO_START',
                message: 'Đã đủ 2 kỳ thủ! Trọng tài có thể bấm Bắt đầu trận đấu.'
              }));
            }
          }
          break;
        }

        case 'START_MATCH': {
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);
          if (!room.player1 || !room.player2) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Cần đủ 2 kỳ thủ trong phòng để bắt đầu!'
            }));
            return;
          }
          startMatch(room);
          break;
        }

        case 'MAKE_MOVE': {
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);

          if (room.paused) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Trận đấu đang bị Trọng tài tạm dừng!'
            }));
            return;
          }

          const opponent = ws === room.redPlayer ? room.blackPlayer : room.redPlayer;
          const movePayload = JSON.stringify({
            type: 'OPPONENT_MOVED',
            from: data.from,
            to: data.to,
            role: ws.chessRole
          });

          // Forward to opponent
          if (opponent && opponent.readyState === 1) {
            opponent.send(movePayload);
          }

          // Forward to referee
          if (room.referee && room.referee !== ws && room.referee.readyState === 1) {
            room.referee.send(movePayload);
          }
          break;
        }

        case 'REFEREE_PAUSE': {
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);
          if (ws !== room.referee) return;

          room.paused = !room.paused;
          broadcastToRoom(room, {
            type: 'MATCH_PAUSED',
            paused: room.paused,
            by: 'Trọng tài'
          });
          break;
        }

        case 'REFEREE_JUDGE': {
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);
          if (ws !== room.referee) return;

          room.gameStarted = false;
          broadcastToRoom(room, {
            type: 'REFEREE_JUDGED',
            winner: data.winner, // 'red', 'black', 'draw'
            reason: data.reason || 'Quyết định từ Ban trọng tài'
          });
          break;
        }

        case 'TIMEOUT_FORFEIT': {
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);
          room.gameStarted = false;
          broadcastToRoom(room, {
            type: 'TIMEOUT_FORFEIT',
            color: data.color
          });
          break;
        }

        case 'REFEREE_MESSAGE': {
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);
          if (ws !== room.referee) return;

          broadcastToRoom(room, {
            type: 'REFEREE_MESSAGE',
            text: data.text || ''
          });
          break;
        }

        case 'REQUEST_UNDO': {
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);
          const opponent = ws === room.redPlayer ? room.blackPlayer : room.redPlayer;

          if (opponent && opponent.readyState === 1) {
            opponent.send(JSON.stringify({
              type: 'UNDO_REQUESTED',
              by: ws.chessRole
            }));
          }
          if (room.referee && room.referee.readyState === 1) {
            room.referee.send(JSON.stringify({
              type: 'UNDO_REQUESTED_INFO',
              by: ws.chessRole
            }));
          }
          break;
        }

        case 'RESPOND_UNDO': {
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);
          const opponent = ws === room.redPlayer ? room.blackPlayer : room.redPlayer;

          if (opponent && opponent.readyState === 1) {
            opponent.send(JSON.stringify({
              type: 'UNDO_RESPONSE',
              accepted: data.accepted
            }));
          }
          if (room.referee && room.referee.readyState === 1) {
            room.referee.send(JSON.stringify({
              type: 'UNDO_RESPONSE_INFO',
              accepted: data.accepted
            }));
          }
          break;
        }

        case 'RESTART_ROOM_GAME': {
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);
          // Restart and re-randomize sides!
          startMatch(room);
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

      if (ws === room.player1) room.player1 = null;
      if (ws === room.player2) room.player2 = null;
      if (ws === room.referee) room.referee = null;

      // If room is completely empty, delete it
      if (!room.player1 && !room.player2 && !room.referee) {
        rooms.delete(userRoomId);
      } else {
        broadcastToRoom(room, {
          type: 'USER_LEFT',
          role: ws.roomRole,
          message: ws.roomRole === 'referee' ? 'Trọng tài đã rời phòng!' : 'Một kỳ thủ đã rời phòng!'
        });
        broadcastRoomState(room);
      }
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
