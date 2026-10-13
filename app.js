// Main Application Controller with LAN Multiplayer & Boss Key

document.addEventListener('DOMContentLoaded', () => {
  const game = new window.XiangqiGame();
  const ai = new window.XiangqiAI(game);

  // Set default game mode to LAN
  game.gameMode = 'lan';

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
  function setBoardFlip(flipped) {
    isBoardFlipped = flipped;
    if (boardWrapper) {
      boardWrapper.classList.toggle('flipped', isBoardFlipped);
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
  let myLanRole = null; // 'red' or 'black'
  let isLanConnected = false;

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
            myLanRole = 'red';
            setBoardFlip(false);
            lanStatusBanner.className = 'lan-status-banner waiting';
            lanStatusBanner.innerHTML = `🏠 Mã phòng của bạn: <strong style="font-size:1.15rem; color:#f59e0b;">${lanRoomId}</strong><br>Đang chờ bạn bè cùng Wi-Fi vào phòng...`;
            break;

          case 'ROOM_JOINED':
            lanRoomId = data.roomId;
            myLanRole = 'black';
            setBoardFlip(true); // Opponent playing Black gets flipped perspective
            lanStatusBanner.className = 'lan-status-banner waiting';
            lanStatusBanner.innerHTML = `Đã vào phòng <strong>${lanRoomId}</strong>. Bạn là bên <strong>Quân Đen</strong> (Bàn cờ đã tự động xoay ngược).`;
            break;

          case 'GAME_START':
            isLanConnected = true;
            if (myLanRole === 'black') {
              setBoardFlip(true);
            } else {
              setBoardFlip(false);
            }
            lanStatusBanner.className = 'lan-status-banner connected';
            lanStatusBanner.innerHTML = `🟢 <strong>Đã kết nối 2 người chơi!</strong><br>Phòng: <strong>${lanRoomId}</strong> • Bạn: <strong>${myLanRole === 'red' ? 'ĐỎ (Đi trước)' : 'ĐEN (Đi sau - Bàn cờ xoay)'}</strong>`;
            game.reset();
            renderBoard();
            break;

          case 'OPPONENT_MOVED':
            game.makeMove(data.from, data.to);
            renderBoard();
            if (game.isGameOver) {
              showGameOverModal();
            }
            break;

          case 'UNDO_REQUESTED': {
            const accept = window.confirm('Đối thủ muốn xin đi lại nước cờ. Bạn có đồng ý không?');
            ws.send(JSON.stringify({ type: 'RESPOND_UNDO', accepted: accept }));
            if (accept) {
              game.undo();
              game.undo();
              renderBoard();
            }
            break;
          }

          case 'UNDO_RESPONSE':
            if (data.accepted) {
              game.undo();
              game.undo();
              renderBoard();
              alert('Đối thủ đã đồng ý cho bạn đi lại nước cờ!');
            } else {
              alert('Đối thủ từ chối yêu cầu đi lại nước cờ.');
            }
            break;

          case 'ROOM_GAME_RESTARTED':
            game.reset();
            modalGameOver.classList.remove('active');
            renderBoard();
            break;

          case 'OPPONENT_LEFT':
            isLanConnected = false;
            lanStatusBanner.className = 'lan-status-banner';
            lanStatusBanner.innerHTML = `⚠️ ${data.message || 'Đối thủ đã ngắt kết nối hoặc rời phòng.'}`;
            alert('Đối thủ đã rời phòng hoặc mất kết nối!');
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
      alert('Không tìm thấy phòng ' + code + '. Hãy kiểm tra lại mã phòng!');
    });
  }

  function setupPeerEvents(conn) {
    conn.on('data', (data) => {
      if (data.type === 'MAKE_MOVE') {
        game.makeMove(data.from, data.to);
        renderBoard();
        if (game.isGameOver) showGameOverModal();
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
          alert('Đối thủ từ chối yêu cầu đi lại.');
        }
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
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'CREATE_ROOM' }));
    } else if (typeof Peer !== 'undefined') {
      createPeerRoom();
    } else {
      alert('Chưa kết nối được máy chủ!');
    }
  });

  // Join room button
  btnJoinRoom.addEventListener('click', () => {
    const code = (inputRoomCode.value || '').trim();
    if (!code) {
      alert('Vui lòng nhập mã phòng (4 chữ số)!');
      return;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: code }));
    } else if (typeof Peer !== 'undefined') {
      joinPeerRoom(code);
    } else {
      alert('Chưa kết nối được máy chủ!');
    }
  });

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
          executeMove(game.selected, m);
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

    const piece = game.board[r][c];
    if (!piece) return;

    // In LAN mode
    if (game.gameMode === 'lan') {
      if (!isLanConnected) {
        alert('Vui lòng tạo phòng và chờ đối thủ cùng Wi-Fi vào phòng trước khi bắt đầu!');
        return;
      }
      if (piece.color !== myLanRole && !game.selected) {
        return; // Cannot select opponent's pieces
      }
      if (game.currentTurn !== myLanRole && !game.selected) {
        return; // Not your turn
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
        executeMove(game.selected, { r, c });
      }
    }
  }

  function executeMove(from, to) {
    if (isAiThinking) return;

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

    game.makeMove(from, to);
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
        game.makeMove(best.from, best.to);
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
    // Quick switch with Escape or 'Q'
    if (e.key === 'Escape' || e.key.toLowerCase() === 'q') {
      e.preventDefault();
      toggleView();
    } else if (e.key.toLowerCase() === 'z' && activeView === 'chess') {
      handleUndo();
    } else if (e.key.toLowerCase() === 'n' && activeView === 'chess') {
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
      renderBoard();
      return;
    }

    game.reset();
    isAiThinking = false;
    renderBoard();
  }

  btnUndo.addEventListener('click', handleUndo);
  btnNewGame.addEventListener('click', startNewGame);
  btnModalRestart.addEventListener('click', startNewGame);

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
