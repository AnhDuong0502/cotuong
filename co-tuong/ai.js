// Simple & Fast Xiangqi Minimax AI Engine

// Position bonus weights for pieces
const PAWN_PST_BLACK = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [10, 0, 15, 0, 20, 0, 15, 0, 10], // Row 3 start
  [20, 20, 30, 40, 40, 40, 30, 20, 20],
  [30, 40, 50, 60, 70, 60, 50, 40, 30], // Across river
  [40, 60, 70, 80, 90, 80, 70, 60, 40],
  [50, 70, 80, 90, 95, 90, 80, 70, 50],
  [60, 80, 90, 90, 90, 90, 90, 80, 60],
  [10, 20, 30, 30, 30, 30, 30, 20, 10]
];

function evaluateBoard(board) {
  let score = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      let val = window.PIECE_VALUES[piece.type] || 0;

      // Positional heuristic
      if (piece.type === 'P') {
        if (piece.color === 'black') {
          val += PAWN_PST_BLACK[r][c];
        } else {
          val += PAWN_PST_BLACK[9 - r][c];
        }
      } else if (piece.type === 'H') {
        // Horse prefers center
        val += (4 - Math.abs(4 - c)) * 8 + (4.5 - Math.abs(4.5 - r)) * 4;
      } else if (piece.type === 'R') {
        // Rook is dominant everywhere, slightly higher if open
        val += 20;
      }

      if (piece.color === 'black') {
        score += val;
      } else {
        score -= val;
      }
    }
  }
  return score;
}

class XiangqiAI {
  constructor(game) {
    this.game = game;
  }

  getBestMove(depth = 2) {
    const color = this.game.currentTurn;
    const moves = this.game.getAllLegalMoves(this.game.board, color);
    if (moves.length === 0) return null;

    // Shuffle moves slightly for variety
    moves.sort(() => Math.random() - 0.5);

    let bestMove = moves[0];
    let bestVal = color === 'black' ? -Infinity : Infinity;

    // Prioritize captures for faster pruning
    moves.sort((a, b) => {
      const targetA = this.game.board[a.to.r][a.to.c];
      const targetB = this.game.board[b.to.r][b.to.c];
      const valA = targetA ? window.PIECE_VALUES[targetA.type] : 0;
      const valB = targetB ? window.PIECE_VALUES[targetB.type] : 0;
      return valB - valA;
    });

    for (const move of moves) {
      const piece = this.game.board[move.from.r][move.from.c];
      const target = this.game.board[move.to.r][move.to.c];

      // Make temporary move
      this.game.board[move.to.r][move.to.c] = piece;
      this.game.board[move.from.r][move.from.c] = null;

      const score = this.minimax(
        depth - 1,
        -Infinity,
        Infinity,
        color === 'black' ? false : true
      );

      // Undo temporary move
      this.game.board[move.from.r][move.from.c] = piece;
      this.game.board[move.to.r][move.to.c] = target;

      if (color === 'black') {
        if (score > bestVal) {
          bestVal = score;
          bestMove = move;
        }
      } else {
        if (score < bestVal) {
          bestVal = score;
          bestMove = move;
        }
      }
    }

    return bestMove;
  }

  minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0) {
      return evaluateBoard(this.game.board);
    }

    const color = isMaximizing ? 'black' : 'red';
    const moves = this.game.getAllLegalMoves(this.game.board, color);

    if (moves.length === 0) {
      // Stalemate or checkmate
      return isMaximizing ? -99999 : 99999;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const piece = this.game.board[move.from.r][move.from.c];
        const target = this.game.board[move.to.r][move.to.c];

        this.game.board[move.to.r][move.to.c] = piece;
        this.game.board[move.from.r][move.from.c] = null;

        const evalScore = this.minimax(depth - 1, alpha, beta, false);

        this.game.board[move.from.r][move.from.c] = piece;
        this.game.board[move.to.r][move.to.c] = target;

        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const piece = this.game.board[move.from.r][move.from.c];
        const target = this.game.board[move.to.r][move.to.c];

        this.game.board[move.to.r][move.to.c] = piece;
        this.game.board[move.from.r][move.from.c] = null;

        const evalScore = this.minimax(depth - 1, alpha, beta, true);

        this.game.board[move.from.r][move.from.c] = piece;
        this.game.board[move.to.r][move.to.c] = target;

        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}

window.XiangqiAI = XiangqiAI;
