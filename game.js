// Chinese Chess (Cờ Tướng) - Game Engine & UI Logic

const ROWS = 10;
const COLS = 9;

// Names mappings
const PIECE_NAMES = {
  traditional: {
    red:   { K: '帥', A: '仕', E: '相', H: '傌', R: '俥', C: '炮', P: '兵' },
    black: { K: '將', A: '士', E: '象', H: '馬', R: '車', C: '砲', P: '卒' }
  },
  vietnamese: {
    red:   { K: 'TƯỚNG', A: 'SĨ', E: 'TƯỢNG', H: 'MÃ', R: 'XE', C: 'PHÁO', P: 'TỐT' },
    black: { K: 'TƯỚNG', A: 'SĨ', E: 'SĨ',   H: 'MÃ', R: 'XE', C: 'PHÁO', P: 'TỐT' }
  }
};

const PIECE_VALUES = {
  K: 10000,
  R: 900,
  C: 450,
  H: 400,
  E: 200,
  A: 200,
  P: 100
};

// Initial Board Setup
function createInitialBoard() {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

  const setPiece = (r, c, type, color) => {
    board[r][c] = { type, color };
  };

  // Black pieces (Top side)
  const backRowBlack = ['R', 'H', 'E', 'A', 'K', 'A', 'E', 'H', 'R'];
  backRowBlack.forEach((type, col) => setPiece(0, col, type, 'black'));
  setPiece(2, 1, 'C', 'black');
  setPiece(2, 7, 'C', 'black');
  [0, 2, 4, 6, 8].forEach(col => setPiece(3, col, 'P', 'black'));

  // Red pieces (Bottom side)
  const backRowRed = ['R', 'H', 'E', 'A', 'K', 'A', 'E', 'H', 'R'];
  backRowRed.forEach((type, col) => setPiece(9, col, type, 'red'));
  setPiece(7, 1, 'C', 'red');
  setPiece(7, 7, 'C', 'red');
  [0, 2, 4, 6, 8].forEach(col => setPiece(6, col, 'P', 'red'));

  return board;
}

class XiangqiGame {
  constructor() {
    this.board = createInitialBoard();
    this.currentTurn = 'red'; // Red moves first
    this.selected = null;     // { r, c }
    this.validMoves = [];    // array of { r, c }
    this.history = [];        // move history for undo
    this.captured = { red: [], black: [] };
    this.isCheck = false;
    this.isGameOver = false;
    this.winner = null;
    this.gameMode = 'pve';    // 'pvp' or 'pve' (Player vs AI)
    this.aiDifficulty = 'medium'; // 'easy', 'medium'
    this.playerSide = 'red';
    this.namingStyle = 'traditional'; // 'traditional' or 'vietnamese'
    this.theme = 'classic';
  }

  reset() {
    this.board = createInitialBoard();
    this.currentTurn = 'red';
    this.selected = null;
    this.validMoves = [];
    this.history = [];
    this.captured = { red: [], black: [] };
    this.isCheck = false;
    this.isGameOver = false;
    this.winner = null;
  }

  isInside(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  isInPalace(r, c, color) {
    if (c < 3 || c > 5) return false;
    if (color === 'red') return r >= 7 && r <= 9;
    return r >= 0 && r <= 2;
  }

  findKing(board, color) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'K' && piece.color === color) {
          return { r, c };
        }
      }
    }
    return null;
  }

  // Flying General Rule: Kings cannot face each other on the same col without pieces
  isFlyingGeneral(board) {
    const redKing = this.findKing(board, 'red');
    const blackKing = this.findKing(board, 'black');
    if (!redKing || !blackKing) return false;
    if (redKing.c !== blackKing.c) return false;

    const col = redKing.c;
    const minR = Math.min(redKing.r, blackKing.r);
    const maxR = Math.max(redKing.r, blackKing.r);

    for (let r = minR + 1; r < maxR; r++) {
      if (board[r][col] !== null) return false;
    }
    return true;
  }

  getPseudoLegalMoves(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];
    const color = piece.color;
    const enemyColor = color === 'red' ? 'black' : 'red';

    const addMove = (nr, nc) => {
      if (!this.isInside(nr, nc)) return;
      const target = board[nr][nc];
      if (!target || target.color === enemyColor) {
        moves.push({ r: nr, c: nc });
      }
    };

    switch (piece.type) {
      case 'K': {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (this.isInPalace(nr, nc, color)) {
            addMove(nr, nc);
          }
        }
        break;
      }
      case 'A': {
        const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (this.isInPalace(nr, nc, color)) {
            addMove(nr, nc);
          }
        }
        break;
      }
      case 'E': {
        const dirs = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          // Check river boundary
          if (color === 'red' && nr < 5) continue;
          if (color === 'black' && nr > 4) continue;
          // Check elephant eye
          const eyeR = r + dr / 2;
          const eyeC = c + dc / 2;
          if (this.isInside(eyeR, eyeC) && board[eyeR][eyeC] === null) {
            addMove(nr, nc);
          }
        }
        break;
      }
      case 'H': {
        const steps = [
          { dr: -2, dc: -1, eyeR: -1, eyeC: 0 },
          { dr: -2, dc: 1,  eyeR: -1, eyeC: 0 },
          { dr: 2,  dc: -1, eyeR: 1,  eyeC: 0 },
          { dr: 2,  dc: 1,  eyeR: 1,  eyeC: 0 },
          { dr: -1, dc: -2, eyeR: 0,  eyeC: -1 },
          { dr: 1,  dc: -2, eyeR: 0,  eyeC: -1 },
          { dr: -1, dc: 2,  eyeR: 0,  eyeC: 1 },
          { dr: 1,  dc: 2,  eyeR: 0,  eyeC: 1 }
        ];
        for (const s of steps) {
          const nr = r + s.dr;
          const nc = c + s.dc;
          const er = r + s.eyeR;
          const ec = c + s.eyeC;
          if (this.isInside(er, ec) && board[er][ec] === null) {
            addMove(nr, nc);
          }
        }
        break;
      }
      case 'R': {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
          let step = 1;
          while (true) {
            const nr = r + dr * step;
            const nc = c + dc * step;
            if (!this.isInside(nr, nc)) break;
            const target = board[nr][nc];
            if (!target) {
              moves.push({ r: nr, c: nc });
            } else {
              if (target.color === enemyColor) {
                moves.push({ r: nr, c: nc });
              }
              break;
            }
            step++;
          }
        }
        break;
      }
      case 'C': {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
          let step = 1;
          let screenFound = false;
          while (true) {
            const nr = r + dr * step;
            const nc = c + dc * step;
            if (!this.isInside(nr, nc)) break;
            const target = board[nr][nc];
            if (!screenFound) {
              if (!target) {
                moves.push({ r: nr, c: nc });
              } else {
                screenFound = true;
              }
            } else {
              if (target) {
                if (target.color === enemyColor) {
                  moves.push({ r: nr, c: nc });
                }
                break;
              }
            }
            step++;
          }
        }
        break;
      }
      case 'P': {
        const isCrossed = color === 'red' ? (r <= 4) : (r >= 5);
        const forward = color === 'red' ? -1 : 1;
        // Forward move
        addMove(r + forward, c);
        // Sideway moves after crossing river
        if (isCrossed) {
          addMove(r, c - 1);
          addMove(r, c + 1);
        }
        break;
      }
    }

    return moves;
  }

  isCheckBy(board, attackedColor) {
    const kingPos = this.findKing(board, attackedColor);
    if (!kingPos) return true; // King missing = checked/lost
    const enemyColor = attackedColor === 'red' ? 'black' : 'red';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const piece = board[r][c];
        if (piece && piece.color === enemyColor) {
          const pseudoMoves = this.getPseudoLegalMoves(board, r, c);
          for (const m of pseudoMoves) {
            if (m.r === kingPos.r && m.c === kingPos.c) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  getLegalMoves(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const pseudoMoves = this.getPseudoLegalMoves(board, r, c);
    const legalMoves = [];

    for (const m of pseudoMoves) {
      // Simulate move
      const targetPiece = board[m.r][m.c];
      board[m.r][m.c] = piece;
      board[r][c] = null;

      const checked = this.isCheckBy(board, piece.color);
      const flying = this.isFlyingGeneral(board);

      // Restore board
      board[r][c] = piece;
      board[m.r][m.c] = targetPiece;

      if (!checked && !flying) {
        legalMoves.push(m);
      }
    }

    return legalMoves;
  }

  getAllLegalMoves(board, color) {
    const all = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const piece = board[r][c];
        if (piece && piece.color === color) {
          const moves = this.getLegalMoves(board, r, c);
          for (const m of moves) {
            all.push({ from: { r, c }, to: m });
          }
        }
      }
    }
    return all;
  }

  makeMove(from, to) {
    const piece = this.board[from.r][from.c];
    const target = this.board[to.r][to.c];

    // Record history
    this.history.push({
      from,
      to,
      piece: { ...piece },
      captured: target ? { ...target } : null,
      wasCheck: this.isCheck
    });

    if (target) {
      this.captured[target.color].push(target);
      window.xiangqiAudio.playCapture();
    } else {
      window.xiangqiAudio.playMove();
    }

    // Apply move
    this.board[to.r][to.c] = piece;
    this.board[from.r][from.c] = null;

    // Switch turn
    const nextTurn = this.currentTurn === 'red' ? 'black' : 'red';
    this.currentTurn = nextTurn;

    // Check status
    this.isCheck = this.isCheckBy(this.board, nextTurn);
    if (this.isCheck) {
      window.xiangqiAudio.playCheck();
    }

    // Check game over
    const nextLegalMoves = this.getAllLegalMoves(this.board, nextTurn);
    if (nextLegalMoves.length === 0) {
      this.isGameOver = true;
      this.winner = piece.color;
      window.xiangqiAudio.playVictory();
    }

    this.selected = null;
    this.validMoves = [];
  }

  undo() {
    if (this.history.length === 0 || this.isGameOver) return false;
    const last = this.history.pop();
    this.board[last.from.r][last.from.c] = last.piece;
    this.board[last.to.r][last.to.c] = last.captured;

    if (last.captured) {
      const idx = this.captured[last.captured.color].lastIndexOf(last.captured);
      if (idx !== -1) {
        this.captured[last.captured.color].splice(idx, 1);
      }
    }

    this.currentTurn = last.piece.color;
    this.isCheck = last.wasCheck;
    this.isGameOver = false;
    this.winner = null;
    this.selected = null;
    this.validMoves = [];
    return true;
  }
}

window.XiangqiGame = XiangqiGame;
window.PIECE_NAMES = PIECE_NAMES;
window.PIECE_VALUES = PIECE_VALUES;
