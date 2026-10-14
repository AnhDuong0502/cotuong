// Main Application Controller with LAN Multiplayer & Boss Key

document.addEventListener('DOMContentLoaded', () => {
  const game = new window.XiangqiGame();
  const ai = new window.XiangqiAI(game);

  // Set default game mode to PvE (Player vs AI) for instant playability
  game.gameMode = 'pve';

  // DOM Elements
  const boardInteractive = document.getElementById('board-interactive');
  const playerIndicator = document.getElementById('player-indicator');
  const playerTurnText = document.getElementById('player-turn-text');
  const turnBadge = document.getElementById('turn-badge');
  const checkAlert = document.getElementById('check-alert');
  const capturedRedList = document.getElementById('captured-by-red');
  const capturedBlackList = document.getElementById('captured-by-black');
  const historyBox = document.getElementById('history-box');

  const selectMode = document.getElementById('select-mode');
  const selectAiDiff = document.getElementById('select-ai-diff');
  const aiDiffGroup = document.getElementById('ai-diff-group');
  const selectNames = document.getElementById('select-names');
  const selectTheme = document.getElementById('select-theme');

  const btnStartGame = document.getElementById('btn-start-game');
  const btnQuickStart = document.getElementById('btn-quick-start');
  const btnNewGame = document.getElementById('btn-new-game');
  const btnFlipBoard = document.getElementById('btn-flip-board');
  const btnUndo = document.getElementById('btn-undo');
  const btnSound = document.getElementById('btn-sound');
  const boardWrapper = document.getElementById('board-wrapper');
  const modalGameOver = document.getElementById('modal-gameover');
  const modalWinnerTitle = document.getElementById('modal-winner-title');
  const modalWinnerDesc = document.getElementById('modal-winner-desc');
  const btnModalRestart = document.getElementById('btn-modal-restart');

  // Board Flip State
  let isBoardFlipped = false;
  const boardContainer = document.getElementById('board-container');
  function setBoardFlip(flipped) {
    isBoardFlipped = flipped;
    if (boardWrapper) {
      boardWrapper.classList.toggle('flipped', isBoardFlipped);
    }
    if (boardContainer) {
      boardContainer.classList.toggle('flipped', isBoardFlipped);
    }
  }
  function toggleBoardFlip() {
    setBoardFlip(!isBoardFlipped);
  }
  if (btnFlipBoard) {
    btnFlipBoard.addEventListener('click', toggleBoardFlip);
  }

  // LAN Elements
  const lanPanel = document.getElementById('lan-panel');
  const lanUrlDisplay = document.getElementById('lan-url-display');
  const btnCopyLanLink = document.getElementById('btn-copy-lan-link');
  const btnCreateRoom = document.getElementById('btn-create-room');
  const inputRoomCode = document.getElementById('input-room-code');
  const btnJoinRoom = document.getElementById('btn-join-room');
  const lanStatusBanner = document.getElementById('lan-status-banner');

  // LAN Tournament & Referee Elements
  const lanSetupSection = document.getElementById('lan-setup-section');
  const lanActiveRoom = document.getElementById('lan-active-room');
  const tabRoomTournament = document.getElementById('tab-room-tournament');
  const tabRoomNormal = document.getElementById('tab-room-normal');
  const creatorRoleGroup = document.getElementById('creator-role-group');
  const joinRoleWrapper = document.getElementById('join-role-wrapper');
  const roomTypeBadge = document.getElementById('room-type-badge');
  const displayRoomId = document.getElementById('display-room-id');
  const btnLeaveRoom = document.getElementById('btn-leave-room');
  const statusPlayer1 = document.getElementById('status-player1');
  const statusPlayer2 = document.getElementById('status-player2');
  const statusReferee = document.getElementById('status-referee');
  const slotPlayer1 = document.getElementById('slot-player1');
  const slotPlayer2 = document.getElementById('slot-player2');
  const slotReferee = document.getElementById('slot-referee');
  const refereeStartBox = document.getElementById('referee-start-box');
  const btnRefereeStart = document.getElementById('btn-referee-start');
  const btnLanStartMatch = document.getElementById('btn-lan-start-match');
  const refereeControlPanel = document.getElementById('referee-control-panel');
  const btnRefPause = document.getElementById('btn-ref-pause');
  const btnRefWinRed = document.getElementById('btn-ref-win-red');
  const btnRefWinBlack = document.getElementById('btn-ref-win-black');
  const btnRefDraw = document.getElementById('btn-ref-draw');
  const inputRefereeMsg = document.getElementById('input-referee-msg');
  const btnSendRefMsg = document.getElementById('btn-send-ref-msg');
  const boardPauseOverlay = document.getElementById('board-pause-overlay');
  const gameToast = document.getElementById('game-toast');

  // Toast notification helper
  let toastTimer = null;
  function showToast(msg, type = 'gold', duration = 3800) {
    if (!gameToast) return;
    clearTimeout(toastTimer);
    gameToast.textContent = msg;
    gameToast.className = `game-toast show ${type}`;
    toastTimer = setTimeout(() => {
      gameToast.className = 'game-toast';
    }, duration);
  }

  // Quick switch views (Boss Key)
  const viewChess = document.getElementById('view-chess');
  const viewAlternate = document.getElementById('view-alternate');
  const btnQuickSwitch = document.getElementById('btn-quick-switch');
  const floatingQuickSwitch = document.getElementById('floating-quick-switch');
  const floatingBtnIcon = document.getElementById('floating-btn-icon');
  const floatingBtnText = document.getElementById('floating-btn-text');

  let activeView = 'chess';
  let isAiThinking = false;

  // LAN Multiplayer State
  let ws = null;
  let lanRoomId = null;
  let myLanRole = null; // 'red', 'black', or 'referee'
  let isLanConnected = false;
  let isMatchPaused = false;
  let selectedRoomType = 'tournament'; // 'tournament' or 'normal'

  // Room type selection tabs
  if (tabRoomTournament && tabRoomNormal) {
    tabRoomTournament.addEventListener('click', () => {
      selectedRoomType = 'tournament';
      tabRoomTournament.classList.add('active');
      tabRoomNormal.classList.remove('active');
      if (creatorRoleGroup) creatorRoleGroup.style.display = 'flex';
      if (joinRoleWrapper) joinRoleWrapper.style.display = 'flex';
    });

    tabRoomNormal.addEventListener('click', () => {
      selectedRoomType = 'normal';
      tabRoomNormal.classList.add('active');
      tabRoomTournament.classList.remove('active');
      if (creatorRoleGroup) creatorRoleGroup.style.display = 'none';
      if (joinRoleWrapper) joinRoleWrapper.style.display = 'none';
    });
  }

  // Update room lobby status
  function updateRoomLobbyUI(state) {
    if (!state) return;
    if (lanSetupSection) lanSetupSection.style.display = 'none';
    if (lanActiveRoom) lanActiveRoom.style.display = 'flex';

    if (displayRoomId) displayRoomId.textContent = state.roomId;
    if (roomTypeBadge) {
      roomTypeBadge.textContent = state.roomType === 'tournament' ? '🏆 THI ĐẤU' : '⚔️ PHÒNG THƯỜNG';
    }

    // Slots status
    if (statusPlayer1 && slotPlayer1) {
      statusPlayer1.textContent = state.hasPlayer1 ? '🟢 Đã vào sẵn sàng' : '⏳ Đang chờ...';
      slotPlayer1.classList.toggle('filled', state.hasPlayer1);
    }
    if (statusPlayer2 && slotPlayer2) {
      statusPlayer2.textContent = state.hasPlayer2 ? '🟢 Đã vào sẵn sàng' : '⏳ Đang chờ...';
      slotPlayer2.classList.toggle('filled', state.hasPlayer2);
    }
    if (slotReferee && statusReferee) {
      if (state.roomType === 'tournament') {
        slotReferee.style.display = 'flex';
        statusReferee.textContent = state.hasReferee ? '🟢 Đã có mặt' : '⏳ Đang chờ...';
        slotReferee.classList.toggle('filled', state.hasReferee);
      } else {
        slotReferee.style.display = 'none';
      }
    }

    // Referee Start button
    if (myLanRole === 'referee' && state.hasPlayer1 && state.hasPlayer2 && !state.gameStarted) {
      if (refereeStartBox) refereeStartBox.style.display = 'block';
    } else {
      if (refereeStartBox) refereeStartBox.style.display = 'none';
    }
  }

  // Leave room button
  if (btnLeaveRoom) {
    btnLeaveRoom.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn rời phòng?')) {
        window.location.reload();
      }
    });
  }

  // Fetch host LAN info to display
  function fetchLanInfo() {
    fetch('/api/lan-info')
      .then(res => res.json())
      .then(data => {
        if (data && data.ip) {
          const url = `http://${data.ip}:${data.port}`;
          lanUrlDisplay.textContent = url;
          btnCopyLanLink.onclick = () => {
            navigator.clipboard.writeText(url).then(() => {
              const oldText = btnCopyLanLink.textContent;
              btnCopyLanLink.textContent = '✅ Đã sao chép link!';
              setTimeout(() => { btnCopyLanLink.textContent = oldText; }, 2000);
            }).catch(() => {
              prompt('Sao chép link sau để gửi bạn bè:', url);
            });
          };
        }
      })
      .catch(() => {
        lanUrlDisplay.textContent = window.location.origin;
      });
  }
  fetchLanInfo();

  // Initialize WebSocket for LAN multiplayer
  function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
      console.log('Connected to LAN Game WebSocket server');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'ROOM_CREATED':
            lanRoomId = data.roomId;
            myLanRole = data.role;
            updateRoomLobbyUI(data.roomState);
            lanStatusBanner.className = 'lan-status-banner waiting';
            lanStatusBanner.innerHTML = `🏠 Mã phòng: <strong style="font-size:1.15rem; color:#f59e0b;">${lanRoomId}</strong><br>Bạn là: <strong>${data.role === 'referee' ? '⚖️ Trọng Tài' : '🥊 Kỳ Thủ 1'}</strong>. Đang chờ người chơi...`;
            showToast(`🏠 Đã tạo phòng ${lanRoomId}!`, 'gold');
            break;

          case 'ROOM_JOINED':
            lanRoomId = data.roomId;
            myLanRole = data.role;
            updateRoomLobbyUI(data.roomState);
            lanStatusBanner.className = 'lan-status-banner waiting';
            lanStatusBanner.innerHTML = `Đã vào phòng <strong>${lanRoomId}</strong> với vai trò: <strong>${data.role === 'referee' ? '⚖️ Trọng Tài' : '🥊 Kỳ Thủ'}</strong>.`;
            showToast(`Đã vào phòng ${lanRoomId}!`, 'gold');
            break;

          case 'ROOM_STATE_UPDATE':
            updateRoomLobbyUI(data.roomState);
            break;

          case 'READY_TO_START':
            showToast(data.message || 'Đã đủ 2 kỳ thủ! Trọng tài có thể bấm Bắt đầu.', 'green', 5000);
            if (refereeStartBox && myLanRole === 'referee') {
              refereeStartBox.style.display = 'block';
            }
            break;

          case 'GAME_START':
            isLanConnected = true;
            myLanRole = data.role; // 'red', 'black', or 'referee'

            if (myLanRole === 'black') {
              setBoardFlip(true);
              lanStatusBanner.className = 'lan-status-banner connected';
              lanStatusBanner.innerHTML = `🟢 <strong>Trận đấu bắt đầu!</strong><br>🎲 Bạn: <strong>ĐEN (Đi sau - Bàn cờ tự động xoay)</strong>`;
              showToast('🎲 ĐÃ RANDOM PHE: BẠN CẦM QUÂN ĐEN (ĐI SAU)!', 'gold', 4500);
            } else if (myLanRole === 'red') {
              setBoardFlip(false);
              lanStatusBanner.className = 'lan-status-banner connected';
              lanStatusBanner.innerHTML = `🟢 <strong>Trận đấu bắt đầu!</strong><br>🎲 Bạn: <strong>ĐỎ (Đi trước)</strong>`;
              showToast('🎲 ĐÃ RANDOM PHE: BẠN CẦM QUÂN ĐỎ (ĐI TRƯỚC)!', 'red', 4500);
            } else if (myLanRole === 'referee') {
              setBoardFlip(false);
              if (refereeControlPanel) refereeControlPanel.style.display = 'flex';
              if (refereeStartBox) refereeStartBox.style.display = 'none';
              lanStatusBanner.className = 'lan-status-banner connected';
              lanStatusBanner.innerHTML = `⚖️ <strong>Đang điều hành trận đấu</strong><br>Kỳ thủ 1: <strong>${data.p1Assigned === 'red' ? 'Đỏ' : 'Đen'}</strong> • Kỳ thủ 2: <strong>${data.p2Assigned === 'red' ? 'Đỏ' : 'Đen'}</strong>`;
              showToast('🎲 TRỌNG TÀI: ĐÃ RANDOM PHE VÀ BẮT ĐẦU TRẬN ĐẤU!', 'gold', 4500);
            }

            if (boardPauseOverlay) boardPauseOverlay.classList.remove('active');
            isMatchPaused = false;
            game.reset();
            renderBoard();
            break;

          case 'MATCH_PAUSED':
            isMatchPaused = data.paused;
            timerPaused = data.paused;
            if (boardPauseOverlay) {
              boardPauseOverlay.classList.toggle('active', data.paused);
            }
            if (btnRefPause) {
              btnRefPause.textContent = data.paused ? '▶️ Tiếp Tục' : '⏸️ Tạm Dừng';
            }
            if (typeof updateClockUI === 'function') updateClockUI();
            showToast(data.paused ? '⏸️ Trận đấu đang tạm dừng theo lệnh của Trọng tài!' : '▶️ Trọng tài cho phép trận đấu tiếp tục!', 'gold', 3500);
            break;

          case 'TIMEOUT_FORFEIT': {
            const loser = data.color;
            const winner = loser === 'red' ? 'black' : 'red';
            game.isGameOver = true;
            game.winner = winner;
            window.xiangqiAudio.playTimeout();
            const loserName = loser === 'red' ? 'Bên ĐỎ (帥)' : 'Bên ĐEN (將)';
            const winnerName = winner === 'red' ? 'Bên ĐỎ (帥)' : 'Bên ĐEN (將)';
            modalWinnerTitle.textContent = `⏰ HẾT THỜI GIAN THI ĐẤU!`;
            modalWinnerDesc.textContent = `${loserName} đã hết thời gian thi đấu! ${winnerName} GIÀNH CHIẾN THẮNG!`;
            modalGameOver.classList.add('active');
            showToast(`⏰ ${loserName} hết giờ! ${winnerName} CHIẾN THẮNG!`, 'gold', 5000);
            if (typeof updateClockUI === 'function') updateClockUI();
            break;
          }

          case 'REFEREE_JUDGED':
            let winnerTitle = '';
            if (data.winner === 'red') {
              winnerTitle = '🏆 BÊN ĐỎ CHIẾN THẮNG!';
            } else if (data.winner === 'black') {
              winnerTitle = '🏆 BÊN ĐEN CHIẾN THẮNG!';
            } else {
              winnerTitle = '🤝 VÁN CỜ HÒA!';
            }
            modalWinnerTitle.textContent = winnerTitle;
            modalWinnerDesc.textContent = `⚖️ Phán quyết trọng tài: ${data.reason}`;
            modalGameOver.classList.add('active');
            showToast(winnerTitle, 'gold', 5000);
            break;

          case 'REFEREE_MESSAGE':
            showToast(`⚖️ Trọng tài nhắc nhở: ${data.text}`, 'gold', 5500);
            break;

          case 'OPPONENT_MOVED': {
            const prevTurn = game.currentTurn;
            game.makeMove(data.from, data.to);
            if (typeof onMoveMade === 'function') onMoveMade(prevTurn);
            renderBoard();
            if (game.isGameOver) {
              showGameOverModal();
            }
            break;
          }

          case 'UNDO_REQUESTED': {
            if (myLanRole === 'referee') break;
            const accept = window.confirm('Đối thủ muốn xin đi lại nước cờ. Bạn có đồng ý không?');
            ws.send(JSON.stringify({ type: 'RESPOND_UNDO', accepted: accept }));
            if (accept) {
              game.undo();
              game.undo();
              renderBoard();
            }
            break;
          }

          case 'UNDO_REQUESTED_INFO':
            showToast('ℹ️ Một bên đang xin đi lại nước cờ...', 'gold', 2500);
            break;

          case 'UNDO_RESPONSE':
            if (data.accepted) {
              game.undo();
              game.undo();
              renderBoard();
              showToast('✅ Đối thủ đã đồng ý cho bạn đi lại!', 'green');
            } else {
              showToast('❌ Đối thủ từ chối yêu cầu đi lại nước cờ.', 'red');
            }
            break;

          case 'ROOM_GAME_RESTARTED':
            game.reset();
            modalGameOver.classList.remove('active');
            if (boardPauseOverlay) boardPauseOverlay.classList.remove('active');
            isMatchPaused = false;
            renderBoard();
            break;

          case 'USER_LEFT':
            showToast(`⚠️ ${data.message || 'Một thành viên đã rời phòng!'}`, 'red', 4000);
            break;

          case 'ERROR':
            alert(data.message || 'Có lỗi xảy ra!');
            break;
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      isLanConnected = false;
      setTimeout(initWebSocket, 3000);
    };
  }
  initWebSocket();

  // PeerJS WebRTC P2P Support (For Vercel deployment where WebSocket is unavailable)
  let peer = null;
  let peerConn = null;

  function createPeerRoom() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const fullId = 'cotuong-p2p-' + code;

    if (peer) peer.destroy();
    peer = new Peer(fullId);

    peer.on('open', () => {
      lanRoomId = code;
      myLanRole = 'red';
      setBoardFlip(false);
      lanStatusBanner.className = 'lan-status-banner waiting';
      lanStatusBanner.innerHTML = `🏠 Mã phòng (Vercel P2P): <strong style="font-size:1.15rem; color:#f59e0b;">${code}</strong><br>Đang chờ đối thủ vào phòng...`;
    });

    peer.on('connection', (conn) => {
      peerConn = conn;
      setupPeerEvents(conn);
      isLanConnected = true;
      lanStatusBanner.className = 'lan-status-banner connected';
      lanStatusBanner.innerHTML = `🟢 <strong>Đã kết nối đối thủ!</strong><br>Phòng: <strong>${code}</strong> • Bạn: <strong>ĐỎ (Đi trước)</strong>`;
      game.reset();
      renderBoard();
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        createPeerRoom();
      } else {
        console.warn('PeerJS note:', err);
      }
    });
  }

  function joinPeerRoom(code) {
    const fullId = 'cotuong-p2p-' + code;
    if (peer) peer.destroy();
    peer = new Peer();

    peer.on('open', () => {
      const conn = peer.connect(fullId);
      peerConn = conn;
      setupPeerEvents(conn);

      conn.on('open', () => {
        lanRoomId = code;
        myLanRole = 'black';
        setBoardFlip(true);
        isLanConnected = true;
        lanStatusBanner.className = 'lan-status-banner connected';
        lanStatusBanner.innerHTML = `🟢 <strong>Đã kết nối vào phòng!</strong><br>Phòng: <strong>${code}</strong> • Bạn: <strong>ĐEN (Đi sau - Bàn cờ xoay)</strong>`;
        game.reset();
        renderBoard();
      });
    });

    peer.on('error', (err) => {
      showToast('⚠️ Không tìm thấy phòng ' + code + '. Hãy kiểm tra lại mã phòng!', 'red', 4500);
    });
  }

  function setupPeerEvents(conn) {
    conn.on('data', (data) => {
      if (data.type === 'MAKE_MOVE') {
        const prevTurn = game.currentTurn;
        game.makeMove(data.from, data.to);
        if (typeof onMoveMade === 'function') onMoveMade(prevTurn);
        renderBoard();
        if (game.isGameOver) showGameOverModal();
      } else if (data.type === 'TIMEOUT_FORFEIT') {
        const loser = data.color;
        const winner = loser === 'red' ? 'black' : 'red';
        game.isGameOver = true;
        game.winner = winner;
        window.xiangqiAudio.playTimeout();
        const loserName = loser === 'red' ? 'Bên ĐỎ (帥)' : 'Bên ĐEN (將)';
        const winnerName = winner === 'red' ? 'Bên ĐỎ (帥)' : 'Bên ĐEN (將)';
        modalWinnerTitle.textContent = `⏰ HẾT THỜI GIAN THI ĐẤU!`;
        modalWinnerDesc.textContent = `${loserName} đã hết thời gian thi đấu! ${winnerName} GIÀNH CHIẾN THẮNG!`;
        modalGameOver.classList.add('active');
        showToast(`⏰ ${loserName} hết giờ! ${winnerName} CHIẾN THẮNG!`, 'gold', 5000);
        if (typeof updateClockUI === 'function') updateClockUI();
      } else if (data.type === 'REQUEST_UNDO') {
        const accept = window.confirm('Đối thủ muốn xin đi lại nước cờ. Bạn có đồng ý không?');
        conn.send({ type: 'RESPOND_UNDO', accepted: accept });
        if (accept) {
          game.undo();
          game.undo();
          renderBoard();
        }
      } else if (data.type === 'RESPOND_UNDO') {
        if (data.accepted) {
          game.undo();
          game.undo();
          renderBoard();
          alert('Đối thủ đã đồng ý cho bạn đi lại!');
        } else {
          showToast('Đối thủ từ chối yêu cầu đi lại.', 'red', 3500);
        }
      } else if (data.type === 'START_MATCH') {
        isLanConnected = true;
        game.reset();
        if (typeof resetTimer === 'function') resetTimer();
        timerStarted = true;
        renderBoard();
        showToast('🟢 Đối thủ đã bấm Bắt đầu trận đấu! Lượt quân ĐỎ đi trước.', 'green', 4500);
      } else if (data.type === 'RESTART_ROOM_GAME') {
        game.reset();
        modalGameOver.classList.remove('active');
        renderBoard();
      }
    });

    conn.on('close', () => {
      isLanConnected = false;
      lanStatusBanner.className = 'lan-status-banner';
      lanStatusBanner.innerHTML = '⚠️ Đối thủ đã rời phòng hoặc mất kết nối.';
    });
  }

  // Create room button
  btnCreateRoom.addEventListener('click', () => {
    let creatorRole = 'player';
    if (selectedRoomType === 'tournament') {
      const checkedRole = document.querySelector('input[name="creator-role"]:checked');
      if (checkedRole) creatorRole = checkedRole.value;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'CREATE_ROOM',
        roomType: selectedRoomType,
        creatorRole: creatorRole
      }));
    } else if (typeof Peer !== 'undefined') {
      createPeerRoom();
    } else {
      showToast('⚠️ Chưa kết nối được máy chủ!', 'red', 4000);
    }
  });

  // Join room button
  btnJoinRoom.addEventListener('click', () => {
    const code = (inputRoomCode.value || '').trim();
    if (!code) {
      showToast('⚠️ Vui lòng nhập mã phòng (4 chữ số)!', 'gold', 3500);
      return;
    }

    let joinRole = 'player';
    const checkedJoinRole = document.querySelector('input[name="join-role"]:checked');
    if (checkedJoinRole) joinRole = checkedJoinRole.value;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomId: code,
        requestedRole: joinRole
      }));
    } else if (typeof Peer !== 'undefined') {
      joinPeerRoom(code);
    } else {
      showToast('⚠️ Chưa kết nối được máy chủ!', 'red', 4000);
    }
  });

  // Referee Match Controls
  if (btnRefereeStart) {
    btnRefereeStart.addEventListener('click', () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'START_MATCH' }));
      }
    });
  }

  if (btnRefPause) {
    btnRefPause.addEventListener('click', () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'REFEREE_PAUSE' }));
      }
    });
  }

  if (btnRefWinRed) {
    btnRefWinRed.addEventListener('click', () => {
      const reason = prompt('Nhập lý do xử ĐỎ Thắng (hoặc để trống):', 'Trọng tài xử Thắng cho bên Đỏ');
      if (reason !== null && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'REFEREE_JUDGE', winner: 'red', reason }));
      }
    });
  }

  if (btnRefWinBlack) {
    btnRefWinBlack.addEventListener('click', () => {
      const reason = prompt('Nhập lý do xử ĐEN Thắng (hoặc để trống):', 'Trọng tài xử Thắng cho bên Đen');
      if (reason !== null && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'REFEREE_JUDGE', winner: 'black', reason }));
      }
    });
  }

  if (btnRefDraw) {
    btnRefDraw.addEventListener('click', () => {
      const reason = prompt('Nhập lý do xử HÒA (hoặc để trống):', 'Trọng tài công bố kết quả Hòa');
      if (reason !== null && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'REFEREE_JUDGE', winner: 'draw', reason }));
      }
    });
  }

  function sendRefereeCustomMsg(text) {
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'REFEREE_MESSAGE', text }));
  }

  if (btnSendRefMsg && inputRefereeMsg) {
    btnSendRefMsg.addEventListener('click', () => {
      const text = inputRefereeMsg.value.trim();
      if (text) {
        sendRefereeCustomMsg(text);
        inputRefereeMsg.value = '';
      }
    });
    inputRefereeMsg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = inputRefereeMsg.value.trim();
        if (text) {
          sendRefereeCustomMsg(text);
          inputRefereeMsg.value = '';
        }
      }
    });
  }

  document.querySelectorAll('.quick-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const msg = pill.getAttribute('data-msg');
      if (msg) sendRefereeCustomMsg(msg);
    });
  });

  // ================= CHESS CLOCK & TIMER LOGIC =================
  const clockBarBlack = document.getElementById('clock-bar-black');
  const clockBarRed = document.getElementById('clock-bar-red');
  const timeDisplayBlack = document.getElementById('time-black');
  const timeDisplayRed = document.getElementById('time-red');
  const turnTimeValBlack = document.getElementById('turntime-val-black');
  const turnTimeValRed = document.getElementById('turntime-val-red');
  const statusTagBlack = document.getElementById('status-tag-black');
  const statusTagRed = document.getElementById('status-tag-red');
  const nameDisplayBlack = document.getElementById('name-black');
  const nameDisplayRed = document.getElementById('name-red');

  const selectTimerPreset = document.getElementById('select-timer-preset');
  const customTimerInputs = document.getElementById('custom-timer-inputs');
  const inputCustomMin = document.getElementById('input-custom-min');
  const inputCustomSec = document.getElementById('input-custom-sec');
  const btnApplyCustomTimer = document.getElementById('btn-apply-custom-timer');
  const btnTimerTogglePause = document.getElementById('btn-timer-toggle-pause');
  const btnTimerReset = document.getElementById('btn-timer-reset');
  const timerPauseIcon = document.getElementById('timer-pause-icon');
  const timerPauseText = document.getElementById('timer-pause-text');
  const timerStatusBadge = document.getElementById('timer-status-badge');

  let timerTotalSeconds = 600; // 10 minutes default
  let timerMoveSeconds = 60;   // 60 seconds per move default
  let timerEnabled = true;
  let timerPaused = false;
  let timerStarted = false;

  let timeLeft = {
    red: 600,
    black: 600
  };
  let turnTimeLeft = {
    red: 60,
    black: 60
  };

  let clockInterval = null;

  function formatTime(sec) {
    if (sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function updateClockUI() {
    if (!clockBarBlack || !clockBarRed) return;

    if (!timerEnabled) {
      clockBarBlack.style.display = 'none';
      clockBarRed.style.display = 'none';
      if (timerStatusBadge) {
        timerStatusBadge.className = 'timer-status-badge disabled';
        timerStatusBadge.textContent = 'Đã tắt';
      }
      return;
    }

    clockBarBlack.style.display = 'flex';
    clockBarRed.style.display = 'flex';

    if (timeDisplayRed) timeDisplayRed.textContent = formatTime(timeLeft.red);
    if (timeDisplayBlack) timeDisplayBlack.textContent = formatTime(timeLeft.black);

    if (turnTimeValRed) turnTimeValRed.textContent = `${turnTimeLeft.red}s`;
    if (turnTimeValBlack) turnTimeValBlack.textContent = `${turnTimeLeft.black}s`;

    const isRedTurn = game.currentTurn === 'red';

    // Active state classes
    clockBarRed.classList.toggle('active-turn', isRedTurn && !game.isGameOver);
    clockBarBlack.classList.toggle('active-turn', !isRedTurn && !game.isGameOver);

    // Paused state class
    clockBarRed.classList.toggle('is-paused', timerPaused);
    clockBarBlack.classList.toggle('is-paused', timerPaused);

    // Low time warning (< 30s total or < 10s per move)
    clockBarRed.classList.toggle('low-time', (timeLeft.red <= 30 || turnTimeLeft.red <= 10) && isRedTurn && timerStarted);
    clockBarBlack.classList.toggle('low-time', (timeLeft.black <= 30 || turnTimeLeft.black <= 10) && !isRedTurn && timerStarted);

    const turnTimeRedEl = document.getElementById('turntime-red');
    const turnTimeBlackEl = document.getElementById('turntime-black');
    if (turnTimeRedEl) turnTimeRedEl.classList.toggle('warning', turnTimeLeft.red <= 10 && isRedTurn && timerStarted);
    if (turnTimeBlackEl) turnTimeBlackEl.classList.toggle('warning', turnTimeLeft.black <= 10 && !isRedTurn && timerStarted);

    // Status badges
    if (game.isGameOver) {
      if (statusTagRed) statusTagRed.textContent = 'Kết thúc';
      if (statusTagBlack) statusTagBlack.textContent = 'Kết thúc';
    } else if (timerPaused) {
      if (statusTagRed) statusTagRed.textContent = 'Tạm dừng ⏸️';
      if (statusTagBlack) statusTagBlack.textContent = 'Tạm dừng ⏸️';
    } else {
      if (statusTagRed) statusTagRed.textContent = isRedTurn ? 'Đang đi...' : 'Chờ lượt';
      if (statusTagBlack) statusTagBlack.textContent = !isRedTurn ? 'Đang đi...' : 'Chờ lượt';
    }

    // Player names based on game mode
    if (game.gameMode === 'pve') {
      if (nameDisplayRed) nameDisplayRed.textContent = '👤 Bạn (Đỏ)';
      if (nameDisplayBlack) nameDisplayBlack.textContent = `🤖 Máy AI (${game.aiDifficulty === 'easy' ? 'Dễ' : 'Tiêu Chuẩn'})`;
    } else if (game.gameMode === 'pvp') {
      if (nameDisplayRed) nameDisplayRed.textContent = '🔴 Kỳ Thủ Đỏ';
      if (nameDisplayBlack) nameDisplayBlack.textContent = '⚫ Kỳ Thủ Đen';
    } else if (game.gameMode === 'lan') {
      if (myLanRole === 'red') {
        if (nameDisplayRed) nameDisplayRed.textContent = '👤 Bạn (Đỏ)';
        if (nameDisplayBlack) nameDisplayBlack.textContent = '🥊 Đối Thủ (Đen)';
      } else if (myLanRole === 'black') {
        if (nameDisplayBlack) nameDisplayBlack.textContent = '👤 Bạn (Đen)';
        if (nameDisplayRed) nameDisplayRed.textContent = '🥊 Đối Thủ (Đỏ)';
      } else {
        if (nameDisplayRed) nameDisplayRed.textContent = '🔴 Kỳ Thủ 1';
        if (nameDisplayBlack) nameDisplayBlack.textContent = '⚫ Kỳ Thủ 2';
      }
    }

    // Timer controls header badge
    if (timerStatusBadge) {
      if (timerPaused) {
        timerStatusBadge.className = 'timer-status-badge paused';
        timerStatusBadge.textContent = 'Tạm dừng ⏸️';
      } else if (timerStarted) {
        timerStatusBadge.className = 'timer-status-badge running';
        timerStatusBadge.textContent = 'Đang chạy ⏱️';
      } else {
        timerStatusBadge.className = 'timer-status-badge running';
        timerStatusBadge.textContent = 'Chờ bắt đầu';
      }
    }
  }

  function handleClockTick() {
    if (!timerEnabled || timerPaused || !timerStarted || game.isGameOver) return;

    const activeColor = game.currentTurn;

    timeLeft[activeColor]--;
    turnTimeLeft[activeColor]--;

    // Sound alert when low on time
    if (turnTimeLeft[activeColor] <= 5 || timeLeft[activeColor] <= 10) {
      window.xiangqiAudio.playTimeWarning();
    } else if (turnTimeLeft[activeColor] <= 10 || timeLeft[activeColor] <= 20) {
      window.xiangqiAudio.playTick();
    }

    // Check timeout / flag fall
    if (timeLeft[activeColor] <= 0 || turnTimeLeft[activeColor] <= 0) {
      timeLeft[activeColor] = Math.max(0, timeLeft[activeColor]);
      turnTimeLeft[activeColor] = Math.max(0, turnTimeLeft[activeColor]);
      handleTimeoutForfeit(activeColor);
    }

    updateClockUI();
  }

  function handleTimeoutForfeit(loserColor) {
    if (game.isGameOver) return;

    game.isGameOver = true;
    const winnerColor = loserColor === 'red' ? 'black' : 'red';
    game.winner = winnerColor;

    window.xiangqiAudio.playTimeout();

    const loserLabel = loserColor === 'red' ? 'Bên ĐỎ (帥)' : 'Bên ĐEN (將)';
    const winnerLabel = winnerColor === 'red' ? 'Bên ĐỎ (帥)' : 'Bên ĐEN (將)';

    modalWinnerTitle.textContent = `⏰ HẾT THỜI GIAN THI ĐẤU!`;
    modalWinnerDesc.textContent = `${loserLabel} đã hết thời gian quy định! ${winnerLabel} GIÀNH CHIẾN THẮNG!`;
    modalGameOver.classList.add('active');

    showToast(`⏰ HẾT GIỜ! ${winnerLabel} CHIẾN THẮNG!`, 'red', 5000);

    // Notify online / LAN / PeerJS opponents if active
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'TIMEOUT_FORFEIT',
        color: loserColor
      }));
    } else if (peerConn && peerConn.open) {
      peerConn.send({
        type: 'TIMEOUT_FORFEIT',
        color: loserColor
      });
    }

    updateClockUI();
  }

  function onMoveMade(prevTurn) {
    if (!timerEnabled || game.isGameOver) return;

    if (!timerStarted) {
      timerStarted = true;
    }

    // Reset move timer for the player who just moved
    turnTimeLeft[prevTurn] = timerMoveSeconds;

    updateClockUI();
  }

  function resetTimer() {
    timeLeft.red = timerTotalSeconds;
    timeLeft.black = timerTotalSeconds;
    turnTimeLeft.red = timerMoveSeconds;
    turnTimeLeft.black = timerMoveSeconds;
    timerStarted = false;
    timerPaused = false;

    if (btnTimerTogglePause) {
      if (timerPauseIcon) timerPauseIcon.textContent = '⏸️';
      if (timerPauseText) timerPauseText.textContent = 'Tạm Dừng Giờ';
      btnTimerTogglePause.classList.remove('paused');
    }

    updateClockUI();
  }

  function setTimerPreset(presetValue) {
    if (presetValue === 'none') {
      timerEnabled = false;
      if (customTimerInputs) customTimerInputs.style.display = 'none';
    } else if (presetValue === 'custom') {
      timerEnabled = true;
      if (customTimerInputs) customTimerInputs.style.display = 'block';
    } else {
      timerEnabled = true;
      if (customTimerInputs) customTimerInputs.style.display = 'none';
      const [totalSec, moveSec] = presetValue.split('-').map(Number);
      timerTotalSeconds = totalSec;
      timerMoveSeconds = moveSec;
      resetTimer();
    }
    updateClockUI();
  }

  if (selectTimerPreset) {
    selectTimerPreset.addEventListener('change', (e) => {
      setTimerPreset(e.target.value);
    });
  }

  if (btnApplyCustomTimer) {
    btnApplyCustomTimer.addEventListener('click', () => {
      const mins = Math.max(1, parseInt(inputCustomMin.value, 10) || 10);
      const secs = Math.max(5, parseInt(inputCustomSec.value, 10) || 60);
      timerTotalSeconds = mins * 60;
      timerMoveSeconds = secs;
      resetTimer();
      showToast(`⏱️ Đã áp dụng: ${mins} phút / ${secs}s mỗi nước`, 'green', 2500);
    });
  }

  if (btnTimerTogglePause) {
    btnTimerTogglePause.addEventListener('click', () => {
      if (!timerEnabled || game.isGameOver) return;
      timerPaused = !timerPaused;
      if (timerPaused) {
        if (timerPauseIcon) timerPauseIcon.textContent = '▶️';
        if (timerPauseText) timerPauseText.textContent = 'Tiếp Tục Giờ';
        btnTimerTogglePause.classList.add('paused');
        showToast('⏸️ Đồng hồ bấm giờ đã tạm dừng', 'gold', 2000);
      } else {
        if (timerPauseIcon) timerPauseIcon.textContent = '⏸️';
        if (timerPauseText) timerPauseText.textContent = 'Tạm Dừng Giờ';
        btnTimerTogglePause.classList.remove('paused');
        showToast('▶️ Đồng hồ bấm giờ tiếp tục chạy', 'green', 2000);
      }
      updateClockUI();
    });
  }

  if (btnTimerReset) {
    btnTimerReset.addEventListener('click', () => {
      resetTimer();
      showToast('🔄 Đã đặt lại thời gian ban đầu', 'gold', 2000);
    });
  }

  // Start 1-second interval loop
  clockInterval = setInterval(handleClockTick, 1000);

  // ================= SPACEBAR MOVE CONFIRMATION LOGIC =================
  let pendingMove = null;
  const moveConfirmBanner = document.getElementById('move-confirm-banner');
  const btnConfirmMove = document.getElementById('btn-confirm-move');
  const btnCancelMove = document.getElementById('btn-cancel-move');

  function stagePendingMove(from, to) {
    if (isAiThinking || isMatchPaused || game.isGameOver) return;

    if (pendingMove) {
      cancelPendingMove(false);
    }

    const piece = game.board[from.r][from.c];
    if (!piece) return;
    const target = game.board[to.r][to.c];

    pendingMove = {
      from: { r: from.r, c: from.c },
      to: { r: to.r, c: to.c },
      piece: piece,
      target: target
    };

    // Temporarily place on board to preview the move
    game.board[to.r][to.c] = piece;
    game.board[from.r][from.c] = null;
    game.selected = null;
    game.validMoves = [];

    if (moveConfirmBanner) {
      moveConfirmBanner.classList.add('show');
    }

    renderBoard();
  }

  function confirmPendingMove() {
    if (!pendingMove) return;

    const { from, to, piece, target } = pendingMove;
    game.board[from.r][from.c] = piece;
    game.board[to.r][to.c] = target;
    pendingMove = null;

    if (moveConfirmBanner) {
      moveConfirmBanner.classList.remove('show');
    }

    executeMove(from, to);
  }

  function cancelPendingMove(rerender = true) {
    if (!pendingMove) return;

    const { from, to, piece, target } = pendingMove;
    game.board[from.r][from.c] = piece;
    game.board[to.r][to.c] = target;
    pendingMove = null;

    if (moveConfirmBanner) {
      moveConfirmBanner.classList.remove('show');
    }

    if (rerender) {
      renderBoard();
    }
  }

  if (btnConfirmMove) {
    btnConfirmMove.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmPendingMove();
    });
  }

  if (btnCancelMove) {
    btnCancelMove.addEventListener('click', (e) => {
      e.stopPropagation();
      cancelPendingMove();
    });
  }

  // Render board pieces and markers
  function renderBoard() {
    boardInteractive.innerHTML = '';

    // Render pieces
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = game.board[r][c];
        if (!piece) continue;

        const pieceEl = document.createElement('div');
        pieceEl.className = `piece ${piece.color} ${game.namingStyle}`;
        if (game.selected && game.selected.r === r && game.selected.c === c) {
          pieceEl.classList.add('selected');
        }
        if (pendingMove && pendingMove.to.r === r && pendingMove.to.c === c) {
          pieceEl.classList.add('pending-move-piece');
        }

        pieceEl.style.left = `${(c / 8) * 100}%`;
        pieceEl.style.top = `${(r / 9) * 100}%`;

        const innerEl = document.createElement('div');
        innerEl.className = 'piece-inner';
        const nameMap = window.PIECE_NAMES[game.namingStyle][piece.color];
        innerEl.textContent = nameMap[piece.type] || piece.type;

        pieceEl.appendChild(innerEl);

        // Click handler on piece
        pieceEl.addEventListener('click', (e) => {
          e.stopPropagation();
          handlePieceClick(r, c);
        });

        boardInteractive.appendChild(pieceEl);
      }
    }

    // Render valid move markers if a piece is selected
    if (game.selected && game.validMoves.length > 0) {
      game.validMoves.forEach(m => {
        const marker = document.createElement('div');
        marker.className = 'valid-marker';
        const target = game.board[m.r][m.c];
        if (target) {
          marker.classList.add('capture');
        }

        marker.style.left = `${(m.c / 8) * 100}%`;
        marker.style.top = `${(m.r / 9) * 100}%`;

        marker.addEventListener('click', (e) => {
          e.stopPropagation();
          stagePendingMove(game.selected, m);
        });

        boardInteractive.appendChild(marker);
      });
    }

    // Render last move highlight
    if (game.history.length > 0) {
      const last = game.history[game.history.length - 1];
      const fromMarker = document.createElement('div');
      fromMarker.className = 'last-move-marker';
      fromMarker.style.left = `${(last.from.c / 8) * 100}%`;
      fromMarker.style.top = `${(last.from.r / 9) * 100}%`;

      const toMarker = document.createElement('div');
      toMarker.className = 'last-move-marker';
      toMarker.style.left = `${(last.to.c / 8) * 100}%`;
      toMarker.style.top = `${(last.to.r / 9) * 100}%`;

      boardInteractive.appendChild(fromMarker);
      boardInteractive.appendChild(toMarker);
    }

    updateUIState();
  }

  function handlePieceClick(r, c) {
    if (game.isGameOver || isAiThinking) return;

    if (isMatchPaused) {
      showToast('⏸️ Trận đấu đang bị Trọng tài tạm dừng!', 'red', 2000);
      return;
    }

    if (myLanRole === 'referee') {
      showToast('⚖️ Bạn là Trọng tài (chỉ theo dõi và điều hành)', 'gold', 2000);
      return;
    }

    // If there is an active pending move and user clicks the pending piece, confirm it!
    if (pendingMove) {
      if (pendingMove.to.r === r && pendingMove.to.c === c) {
        confirmPendingMove();
        return;
      } else {
        cancelPendingMove(false);
      }
    }

    const piece = game.board[r][c];
    if (!piece) return;

    // In LAN mode
    if (game.gameMode === 'lan') {
      if (!isLanConnected) {
        // Instead of blocking with an alert, automatically start instant play!
        game.gameMode = 'pve';
        if (selectMode) selectMode.value = 'pve';
        if (lanPanel) lanPanel.style.display = 'none';
        if (aiDiffGroup) aiDiffGroup.style.display = 'flex';
        timerStarted = true;
        showToast('🟢 Đã bắt đầu ván đấu với Máy AI! Lượt Đỏ đi trước.', 'green', 3500);
      } else {
        if (piece.color !== myLanRole && !game.selected) {
          return; // Cannot select opponent's pieces
        }
        if (game.currentTurn !== myLanRole && !game.selected) {
          return; // Not your turn
        }
      }
    }

    // In PvE AI mode
    if (game.gameMode === 'pve' && game.currentTurn === 'black') {
      return; // AI's turn
    }

    if (piece.color === game.currentTurn) {
      if (game.selected && game.selected.r === r && game.selected.c === c) {
        // Deselect
        game.selected = null;
        game.validMoves = [];
      } else {
        // Select piece and calculate legal moves
        game.selected = { r, c };
        game.validMoves = game.getLegalMoves(game.board, r, c);
      }
      renderBoard();
    } else if (game.selected) {
      // Possible capture target clicked directly
      const isTarget = game.validMoves.some(m => m.r === r && m.c === c);
      if (isTarget) {
        stagePendingMove(game.selected, { r, c });
      }
    }
  }

  function executeMove(from, to) {
    if (isAiThinking || isMatchPaused) return;

    // LAN mode: send move over WebSocket or WebRTC P2P
    if (game.gameMode === 'lan') {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'MAKE_MOVE',
          from,
          to
        }));
      } else if (peerConn && peerConn.open) {
        peerConn.send({
          type: 'MAKE_MOVE',
          from,
          to
        });
      }
    }

    const prevTurn = game.currentTurn;
    game.makeMove(from, to);
    if (typeof onMoveMade === 'function') onMoveMade(prevTurn);
    renderBoard();

    // Check game over
    if (game.isGameOver) {
      showGameOverModal();
      return;
    }

    // Trigger AI move if in PvE mode and it's Black's turn
    if (game.gameMode === 'pve' && game.currentTurn === 'black' && !game.isGameOver) {
      triggerAiMove();
    }
  }

  function triggerAiMove() {
    isAiThinking = true;
    turnBadge.textContent = 'Máy đang suy nghĩ...';
    turnBadge.style.color = '#38bdf8';

    const depth = game.aiDifficulty === 'easy' ? 1 : 2;

    setTimeout(() => {
      const best = ai.getBestMove(depth);
      isAiThinking = false;

      if (best) {
        const prevTurn = game.currentTurn;
        game.makeMove(best.from, best.to);
        if (typeof onMoveMade === 'function') onMoveMade(prevTurn);
        renderBoard();

        if (game.isGameOver) {
          showGameOverModal();
        }
      }
    }, 350);
  }

  function updateUIState() {
    // Current turn UI
    if (game.currentTurn === 'red') {
      playerIndicator.className = 'player-dot red';
      playerTurnText.textContent = 'Lượt Đỏ (Đi trước)';
    } else {
      playerIndicator.className = 'player-dot black';
      playerTurnText.textContent = 'Lượt Đen';
    }

    if (game.gameMode === 'lan') {
      if (!isLanConnected) {
        turnBadge.textContent = 'Chờ kết nối phòng';
        turnBadge.style.color = '#f59e0b';
      } else if (myLanRole === 'referee') {
        turnBadge.textContent = '⚖️ Trọng Tài Điều Hành';
        turnBadge.style.color = '#f59e0b';
      } else if (game.currentTurn === myLanRole) {
        turnBadge.textContent = '⚡ ĐẾN LƯỢT BẠN!';
        turnBadge.style.color = '#10b981';
      } else {
        turnBadge.textContent = 'Chờ đối thủ đi...';
        turnBadge.style.color = '#94a3b8';
      }
    } else if (game.gameMode === 'pve') {
      turnBadge.textContent = (game.currentTurn === 'red') ? 'Đến lượt bạn' : 'Máy đang tính...';
      turnBadge.style.color = (game.currentTurn === 'red') ? '#ef4444' : '#38bdf8';
    } else {
      turnBadge.textContent = (game.currentTurn === 'red') ? 'Lượt Quân Đỏ' : 'Lượt Quân Đen';
      turnBadge.style.color = (game.currentTurn === 'red') ? '#ef4444' : '#38bdf8';
    }

    // Check alert
    if (game.isCheck && !game.isGameOver) {
      checkAlert.classList.add('visible');
    } else {
      checkAlert.classList.remove('visible');
    }

    // Captured pieces trays
    capturedRedList.innerHTML = '';
    game.captured.red.forEach(p => {
      const el = document.createElement('div');
      el.className = 'captured-item red';
      const nameMap = window.PIECE_NAMES[game.namingStyle].red;
      el.textContent = nameMap[p.type] || p.type;
      capturedRedList.appendChild(el);
    });

    capturedBlackList.innerHTML = '';
    game.captured.black.forEach(p => {
      const el = document.createElement('div');
      el.className = 'captured-item black';
      const nameMap = window.PIECE_NAMES[game.namingStyle].black;
      el.textContent = nameMap[p.type] || p.type;
      capturedBlackList.appendChild(el);
    });

    // Move history
    if (game.history.length === 0) {
      historyBox.innerHTML = '<div class="history-item" style="color: var(--text-muted); justify-content: center;">Chưa có nước đi nào</div>';
    } else {
      historyBox.innerHTML = '';
      game.history.forEach((h, idx) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        const colorName = h.piece.color === 'red' ? 'Đỏ' : 'Đen';
        const pieceName = window.PIECE_NAMES[game.namingStyle][h.piece.color][h.piece.type];
        const notation = `${idx + 1}. [${colorName}] ${pieceName}: (${h.from.c},${h.from.r}) ➔ (${h.to.c},${h.to.r})`;
        item.textContent = notation;
        historyBox.appendChild(item);
      });
      historyBox.scrollTop = historyBox.scrollHeight;
    }

    if (typeof updateClockUI === 'function') {
      updateClockUI();
    }
  }

  function showGameOverModal() {
    let winnerName = game.winner === 'red' ? 'BÊN ĐỎ (RED)' : 'BÊN ĐEN (BLACK)';
    if (game.gameMode === 'lan') {
      if (game.winner === myLanRole) {
        modalWinnerTitle.textContent = `🎉 BẠN ĐÃ CHIẾN THẮNG!`;
      } else {
        modalWinnerTitle.textContent = `ĐỐI THỦ ĐÃ CHIẾN THẮNG!`;
      }
    } else {
      modalWinnerTitle.textContent = `${winnerName} CHIẾN THẮNG!`;
    }
    modalWinnerDesc.textContent = `Ván cờ kết thúc sau ${game.history.length} nước đi. Chiếu bí hoàn toàn!`;
    modalGameOver.classList.add('active');
  }

  // Quick Switch Feature (Panic Button / Boss Key Camouflage)
  function toggleView() {
    if (activeView === 'chess') {
      activeView = 'alternate';
      viewChess.classList.remove('active');
      viewAlternate.classList.add('active');
      // Hide the floating button completely for 100% camouflage!
      floatingQuickSwitch.style.display = 'none';
      btnQuickSwitch.innerHTML = '<span class="icon">♟️</span><span class="btn-text">Quay Lại Bàn Cờ</span><span class="hotkey-badge">Esc / Q</span>';
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      activeView = 'chess';
      viewAlternate.classList.remove('active');
      viewChess.classList.add('active');
      floatingQuickSwitch.style.display = 'flex';
      floatingBtnIcon.textContent = '⚡';
      floatingBtnText.textContent = 'Chuyển Giao Diện (Esc)';
      btnQuickSwitch.innerHTML = '<span class="icon">⚡</span><span class="btn-text">Chuyển Giao Diện</span><span class="hotkey-badge">Esc / Q</span>';
      renderBoard();
    }
  }

  // Event Listeners for switching views
  btnQuickSwitch.addEventListener('click', toggleView);
  floatingQuickSwitch.addEventListener('click', toggleView);

  // Stealth return triggers: click anywhere on the image/screen to return to chess
  const altImgContainer = document.getElementById('alternate-image-container');
  if (altImgContainer) {
    altImgContainer.addEventListener('click', toggleView);
  }

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Space key to confirm pending move
    if (e.code === 'Space' || e.key === ' ') {
      if (pendingMove) {
        e.preventDefault();
        confirmPendingMove();
        return;
      }
    }

    // Quick switch with Escape or 'Q', or cancel pending move
    if (e.key === 'Escape' || e.key.toLowerCase() === 'q') {
      if (pendingMove) {
        e.preventDefault();
        cancelPendingMove();
        return;
      }
      e.preventDefault();
      toggleView();
    } else if (e.key.toLowerCase() === 's' && activeView === 'chess') {
      if (pendingMove) cancelPendingMove();
      startGame();
    } else if (e.key.toLowerCase() === 'z' && activeView === 'chess') {
      if (pendingMove) cancelPendingMove();
      handleUndo();
    } else if (e.key.toLowerCase() === 'n' && activeView === 'chess') {
      if (pendingMove) cancelPendingMove();
      startNewGame();
    } else if (e.key.toLowerCase() === 'f' && activeView === 'chess') {
      toggleBoardFlip();
    }
  });

  function handleUndo() {
    if (isAiThinking) return;

    if (game.gameMode === 'lan') {
      if (!isLanConnected) return;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'REQUEST_UNDO' }));
        alert('Đã gửi yêu cầu xin đi lại tới đối thủ. Đang chờ phản hồi...');
      } else if (peerConn && peerConn.open) {
        peerConn.send({ type: 'REQUEST_UNDO' });
        alert('Đã gửi yêu cầu xin đi lại tới đối thủ. Đang chờ phản hồi...');
      }
      return;
    }

    if (game.gameMode === 'pve') {
      game.undo();
      game.undo();
    } else {
      game.undo();
    }
    modalGameOver.classList.remove('active');
    renderBoard();
  }

  function startGame() {
    modalGameOver.classList.remove('active');

    if (game.gameMode === 'lan') {
      if (isLanConnected) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'START_MATCH' }));
        } else if (peerConn && peerConn.open) {
          peerConn.send({ type: 'START_MATCH' });
        }
        game.reset();
        if (typeof resetTimer === 'function') resetTimer();
        timerStarted = true;
        renderBoard();
        showToast('🟢 Trận đấu online đã bắt đầu! Đỏ đi trước.', 'green', 4000);
        return;
      } else {
        // Not connected in LAN room yet -> switch to PvE so user can play immediately without alert!
        game.gameMode = 'pve';
        if (selectMode) selectMode.value = 'pve';
        if (lanPanel) lanPanel.style.display = 'none';
        if (aiDiffGroup) aiDiffGroup.style.display = 'flex';
        showToast('🟢 Đã bắt đầu ván đấu với Máy AI! Bạn cầm quân ĐỎ (Đi trước).', 'green', 4000);
      }
    } else if (game.gameMode === 'pvp') {
      const p1IsRed = Math.random() < 0.5;
      showToast(p1IsRed ? '🎲 Bốc thăm: Người chơi 1 cầm ĐỎ (Đi trước)!' : '🎲 Bốc thăm: Người chơi 2 cầm ĐỎ (Đi trước)!', 'gold', 3500);
    } else {
      showToast('🟢 Ván đấu đã bắt đầu! Bạn cầm quân ĐỎ (Đi trước). Chúc bạn chơi vui vẻ!', 'green', 4000);
    }

    game.reset();
    if (typeof resetTimer === 'function') resetTimer();
    timerStarted = true;
    isAiThinking = false;
    if (window.xiangqiAudio && typeof window.xiangqiAudio.playMove === 'function') {
      window.xiangqiAudio.playMove();
    }
    renderBoard();
  }

  function startNewGame() {
    modalGameOver.classList.remove('active');

    if (game.gameMode === 'lan') {
      if (isLanConnected) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'RESTART_ROOM_GAME' }));
        } else if (peerConn && peerConn.open) {
          peerConn.send({ type: 'RESTART_ROOM_GAME' });
        }
      }
      game.reset();
      if (typeof resetTimer === 'function') resetTimer();
      renderBoard();
      return;
    }

    if (game.gameMode === 'pvp') {
      const p1IsRed = Math.random() < 0.5;
      showToast(p1IsRed ? '🎲 Bốc thăm: Người chơi 1 cầm ĐỎ (Đi trước)!' : '🎲 Bốc thăm: Người chơi 2 cầm ĐỎ (Đi trước)!', 'gold', 3500);
    }

    game.reset();
    if (typeof resetTimer === 'function') resetTimer();
    isAiThinking = false;
    renderBoard();
  }

  if (btnStartGame) btnStartGame.addEventListener('click', startGame);
  if (btnQuickStart) btnQuickStart.addEventListener('click', startGame);
  if (btnLanStartMatch) btnLanStartMatch.addEventListener('click', startGame);
  if (btnRefereeStart) btnRefereeStart.addEventListener('click', startGame);
  btnUndo.addEventListener('click', handleUndo);
  btnNewGame.addEventListener('click', startNewGame);
  btnModalRestart.addEventListener('click', startGame);

  // Sound toggle
  btnSound.addEventListener('click', () => {
    window.xiangqiAudio.enabled = !window.xiangqiAudio.enabled;
    btnSound.textContent = window.xiangqiAudio.enabled ? '🔊 Âm Thanh: Bật' : '🔇 Âm Thanh: Tắt';
  });

  // Settings
  selectMode.addEventListener('change', (e) => {
    game.gameMode = e.target.value;
    lanPanel.style.display = game.gameMode === 'lan' ? 'flex' : 'none';
    aiDiffGroup.style.display = game.gameMode === 'pve' ? 'flex' : 'none';
    startNewGame();
  });

  selectAiDiff.addEventListener('change', (e) => {
    game.aiDifficulty = e.target.value;
  });

  selectNames.addEventListener('change', (e) => {
    game.namingStyle = e.target.value;
    renderBoard();
  });

  selectTheme.addEventListener('change', (e) => {
    document.body.className = '';
    if (e.target.value !== 'classic') {
      document.body.classList.add(`theme-${e.target.value}`);
    }
  });

  // Close modal when clicking outside
  modalGameOver.addEventListener('click', (e) => {
    if (e.target === modalGameOver) {
      modalGameOver.classList.remove('active');
    }
  });

  // Initial render
  renderBoard();
});
