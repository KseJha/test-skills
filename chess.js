// Hot-seat two-player chess. Board coordinates: r=0 is rank 8, r=7 is rank 1; f=0 is file a, f=7 is file h.

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const GLYPHS = {
  wK: '\u2654', wQ: '\u2655', wR: '\u2656', wB: '\u2657', wN: '\u2658', wP: '\u2659',
  bK: '\u265A', bQ: '\u265B', bR: '\u265C', bB: '\u265D', bN: '\u265E', bP: '\u265F',
};

function inBounds(r, f) { return r >= 0 && r < 8 && f >= 0 && f < 8; }
function sqName(r, f) { return FILES[f] + (8 - r); }

function initialBoard() {
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let f = 0; f < 8; f++) {
    b[0][f] = { type: back[f], color: 'b' };
    b[1][f] = { type: 'p', color: 'b' };
    b[6][f] = { type: 'p', color: 'w' };
    b[7][f] = { type: back[f], color: 'w' };
  }
  return b;
}

function newGame() {
  return {
    board: initialBoard(),
    sideToMove: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
    history: [],
    gameOver: null,
    winner: null,
  };
}

function cloneState(s) {
  return {
    board: s.board.map(row => row.map(p => (p ? { ...p } : null))),
    sideToMove: s.sideToMove,
    castling: { ...s.castling },
    enPassant: s.enPassant ? { ...s.enPassant } : null,
    halfmove: s.halfmove,
    fullmove: s.fullmove,
    history: s.history.slice(),
    gameOver: s.gameOver,
    winner: s.winner,
  };
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = board[r][f];
    if (p && p.type === 'k' && p.color === color) return { r, f };
  }
  return null;
}

function isSquareAttacked(board, r, f, by) {
  // Pawn attacks: a pawn of color `by` attacks from `pawnDir` away.
  const pawnDir = by === 'w' ? 1 : -1;
  for (const df of [-1, 1]) {
    const pr = r + pawnDir, pf = f + df;
    if (inBounds(pr, pf)) {
      const p = board[pr][pf];
      if (p && p.color === by && p.type === 'p') return true;
    }
  }
  // Knights
  const knight = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  for (const [dr, df] of knight) {
    const nr = r + dr, nf = f + df;
    if (inBounds(nr, nf)) {
      const p = board[nr][nf];
      if (p && p.color === by && p.type === 'n') return true;
    }
  }
  // Adjacent king
  for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) {
    if (dr === 0 && df === 0) continue;
    const kr = r + dr, kf = f + df;
    if (inBounds(kr, kf)) {
      const p = board[kr][kf];
      if (p && p.color === by && p.type === 'k') return true;
    }
  }
  // Sliders
  const ortho = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const diag = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, df] of ortho) {
    let sr = r + dr, sf = f + df;
    while (inBounds(sr, sf)) {
      const p = board[sr][sf];
      if (p) {
        if (p.color === by && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      sr += dr; sf += df;
    }
  }
  for (const [dr, df] of diag) {
    let sr = r + dr, sf = f + df;
    while (inBounds(sr, sf)) {
      const p = board[sr][sf];
      if (p) {
        if (p.color === by && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      sr += dr; sf += df;
    }
  }
  return false;
}

function isInCheck(state, color) {
  const k = findKing(state.board, color);
  if (!k) return false;
  return isSquareAttacked(state.board, k.r, k.f, color === 'w' ? 'b' : 'w');
}

function pseudoMoves(state, r, f) {
  const piece = state.board[r][f];
  if (!piece) return [];
  const moves = [];
  const color = piece.color;
  const enemy = color === 'w' ? 'b' : 'w';
  const board = state.board;

  const slide = (dirs) => {
    for (const [dr, df] of dirs) {
      let nr = r + dr, nf = f + df;
      while (inBounds(nr, nf)) {
        const t = board[nr][nf];
        if (!t) moves.push({ to: { r: nr, f: nf }, flags: {} });
        else {
          if (t.color === enemy) moves.push({ to: { r: nr, f: nf }, flags: { capture: true } });
          break;
        }
        nr += dr; nf += df;
      }
    }
  };

  if (piece.type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRank = color === 'w' ? 6 : 1;
    const promoRank = color === 'w' ? 0 : 7;
    // Forward
    const fr = r + dir;
    if (inBounds(fr, f) && !board[fr][f]) {
      if (fr === promoRank) {
        for (const promo of ['q', 'r', 'b', 'n']) moves.push({ to: { r: fr, f }, flags: { promotion: promo } });
      } else {
        moves.push({ to: { r: fr, f }, flags: {} });
        if (r === startRank && !board[r + 2 * dir][f]) {
          moves.push({ to: { r: r + 2 * dir, f }, flags: { twoStep: true } });
        }
      }
    }
    // Captures
    for (const df of [-1, 1]) {
      const cr = r + dir, cf = f + df;
      if (!inBounds(cr, cf)) continue;
      const t = board[cr][cf];
      if (t && t.color === enemy) {
        if (cr === promoRank) {
          for (const promo of ['q', 'r', 'b', 'n']) moves.push({ to: { r: cr, f: cf }, flags: { capture: true, promotion: promo } });
        } else {
          moves.push({ to: { r: cr, f: cf }, flags: { capture: true } });
        }
      } else if (state.enPassant && state.enPassant.r === cr && state.enPassant.f === cf) {
        moves.push({ to: { r: cr, f: cf }, flags: { capture: true, ep: true } });
      }
    }
  } else if (piece.type === 'n') {
    const off = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dr, df] of off) {
      const nr = r + dr, nf = f + df;
      if (!inBounds(nr, nf)) continue;
      const t = board[nr][nf];
      if (!t) moves.push({ to: { r: nr, f: nf }, flags: {} });
      else if (t.color === enemy) moves.push({ to: { r: nr, f: nf }, flags: { capture: true } });
    }
  } else if (piece.type === 'b') {
    slide([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
  } else if (piece.type === 'r') {
    slide([[-1, 0], [1, 0], [0, -1], [0, 1]]);
  } else if (piece.type === 'q') {
    slide([[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
  } else if (piece.type === 'k') {
    for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) {
      if (dr === 0 && df === 0) continue;
      const nr = r + dr, nf = f + df;
      if (!inBounds(nr, nf)) continue;
      const t = board[nr][nf];
      if (!t) moves.push({ to: { r: nr, f: nf }, flags: {} });
      else if (t.color === enemy) moves.push({ to: { r: nr, f: nf }, flags: { capture: true } });
    }
    // Castling
    const homeR = color === 'w' ? 7 : 0;
    const opp = color === 'w' ? 'b' : 'w';
    if (r === homeR && f === 4) {
      const kRight = color === 'w' ? 'wK' : 'bK';
      const qRight = color === 'w' ? 'wQ' : 'bQ';
      if (state.castling[kRight] && !board[homeR][5] && !board[homeR][6] &&
          board[homeR][7] && board[homeR][7].type === 'r' && board[homeR][7].color === color) {
        if (!isSquareAttacked(board, homeR, 4, opp) && !isSquareAttacked(board, homeR, 5, opp) && !isSquareAttacked(board, homeR, 6, opp)) {
          moves.push({ to: { r: homeR, f: 6 }, flags: { castle: 'K' } });
        }
      }
      if (state.castling[qRight] && !board[homeR][1] && !board[homeR][2] && !board[homeR][3] &&
          board[homeR][0] && board[homeR][0].type === 'r' && board[homeR][0].color === color) {
        if (!isSquareAttacked(board, homeR, 4, opp) && !isSquareAttacked(board, homeR, 3, opp) && !isSquareAttacked(board, homeR, 2, opp)) {
          moves.push({ to: { r: homeR, f: 2 }, flags: { castle: 'Q' } });
        }
      }
    }
  }
  return moves;
}

function applyMove(state, from, to, flags) {
  const ns = cloneState(state);
  const piece = ns.board[from.r][from.f];
  if (flags.ep) {
    ns.board[from.r][to.f] = null;
  }
  ns.board[to.r][to.f] = piece;
  ns.board[from.r][from.f] = null;
  if (flags.promotion) {
    ns.board[to.r][to.f] = { type: flags.promotion, color: piece.color };
  }
  if (flags.castle === 'K') {
    ns.board[to.r][5] = ns.board[to.r][7];
    ns.board[to.r][7] = null;
  } else if (flags.castle === 'Q') {
    ns.board[to.r][3] = ns.board[to.r][0];
    ns.board[to.r][0] = null;
  }
  // Update castling rights on king or rook move
  if (piece.type === 'k') {
    if (piece.color === 'w') { ns.castling.wK = false; ns.castling.wQ = false; }
    else { ns.castling.bK = false; ns.castling.bQ = false; }
  }
  if (piece.type === 'r') {
    if (piece.color === 'w' && from.r === 7 && from.f === 0) ns.castling.wQ = false;
    if (piece.color === 'w' && from.r === 7 && from.f === 7) ns.castling.wK = false;
    if (piece.color === 'b' && from.r === 0 && from.f === 0) ns.castling.bQ = false;
    if (piece.color === 'b' && from.r === 0 && from.f === 7) ns.castling.bK = false;
  }
  // Rook captured on its home square clears the corresponding right
  if (to.r === 0 && to.f === 0) ns.castling.bQ = false;
  if (to.r === 0 && to.f === 7) ns.castling.bK = false;
  if (to.r === 7 && to.f === 0) ns.castling.wQ = false;
  if (to.r === 7 && to.f === 7) ns.castling.wK = false;
  // En passant target
  if (flags.twoStep) ns.enPassant = { r: (from.r + to.r) / 2, f: from.f };
  else ns.enPassant = null;
  // Clocks
  if (piece.type === 'p' || flags.capture) ns.halfmove = 0;
  else ns.halfmove++;
  if (state.sideToMove === 'b') ns.fullmove++;
  ns.sideToMove = state.sideToMove === 'w' ? 'b' : 'w';
  return ns;
}

function legalMoves(state, r, f) {
  const piece = state.board[r][f];
  if (!piece || piece.color !== state.sideToMove) return [];
  const pseudo = pseudoMoves(state, r, f);
  const legal = [];
  for (const m of pseudo) {
    const ns = applyMove(state, { r, f }, m.to, m.flags);
    if (!isInCheck(ns, piece.color)) legal.push(m);
  }
  return legal;
}

function anyLegalMove(state, color) {
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = state.board[r][f];
    if (p && p.color === color) {
      const pseudo = pseudoMoves(state, r, f);
      for (const m of pseudo) {
        const ns = applyMove(state, { r, f }, m.to, m.flags);
        if (!isInCheck(ns, color)) return true;
      }
    }
  }
  return false;
}

// SAN for a move; must be called BEFORE applying the move to state.
function toSAN(state, from, to, flags) {
  const piece = state.board[from.r][from.f];
  if (flags.castle === 'K') return 'O-O';
  if (flags.castle === 'Q') return 'O-O-O';
  const pieceLetter = piece.type === 'p' ? '' : piece.type.toUpperCase();
  let disambig = '';
  if (piece.type === 'p' && flags.capture) {
    disambig = FILES[from.f];
  } else if (piece.type !== 'p' && piece.type !== 'k') {
    const others = [];
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      if (r === from.r && f === from.f) continue;
      const p = state.board[r][f];
      if (p && p.type === piece.type && p.color === piece.color) {
        if (legalMoves(state, r, f).some(m => m.to.r === to.r && m.to.f === to.f)) {
          others.push({ r, f });
        }
      }
    }
    if (others.length) {
      const sameFile = others.some(o => o.f === from.f);
      const sameRank = others.some(o => o.r === from.r);
      if (!sameFile) disambig = FILES[from.f];
      else if (!sameRank) disambig = String(8 - from.r);
      else disambig = FILES[from.f] + (8 - from.r);
    }
  }
  const capture = flags.capture ? 'x' : '';
  const dest = sqName(to.r, to.f);
  const promo = flags.promotion ? '=' + flags.promotion.toUpperCase() : '';
  return pieceLetter + disambig + capture + dest + promo;
}

function makeMove(state, from, to, promotion) {
  const piece = state.board[from.r][from.f];
  if (!piece || piece.color !== state.sideToMove) return null;
  const legal = legalMoves(state, from.r, from.f);
  const move = legal.find(m =>
    m.to.r === to.r && m.to.f === to.f &&
    (promotion ? m.flags.promotion === promotion : !m.flags.promotion)
  );
  if (!move) return null;
  const san = toSAN(state, from, to, move.flags);
  const next = applyMove(state, from, to, move.flags);
  const opponentInCheck = isInCheck(next, next.sideToMove);
  const opponentHasMove = anyLegalMove(next, next.sideToMove);
  let suffix = '';
  if (!opponentHasMove) {
    if (opponentInCheck) {
      next.gameOver = 'checkmate';
      next.winner = piece.color;
      suffix = '#';
    } else {
      next.gameOver = 'stalemate';
    }
  } else if (opponentInCheck) {
    suffix = '+';
  }
  next.history.push(san + suffix);
  return next;
}

// ---------- UI ----------

let state = newGame();
let selected = null;
let legalForSelected = [];
let pendingPromotion = null;

function render() {
  renderBoard();
  renderStatus();
  renderHistory();
}

function renderBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  const checkColor = !state.gameOver && isInCheck(state, state.sideToMove) ? state.sideToMove : null;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = document.createElement('div');
      sq.className = 'square ' + ((r + f) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.r = r;
      sq.dataset.f = f;
      const piece = state.board[r][f];
      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece piece-' + piece.color;
        span.textContent = GLYPHS[piece.color + piece.type.toUpperCase()];
        sq.appendChild(span);
      }
      if (selected && selected.r === r && selected.f === f) sq.classList.add('selected');
      const tgt = legalForSelected.find(m => m.to.r === r && m.to.f === f);
      if (tgt) sq.classList.add(piece || tgt.flags.ep ? 'target-capture' : 'target');
      if (checkColor && piece && piece.type === 'k' && piece.color === checkColor) {
        sq.classList.add('in-check');
      }
      if (f === 0) {
        const rl = document.createElement('span');
        rl.className = 'coord rank-coord';
        rl.textContent = String(8 - r);
        sq.appendChild(rl);
      }
      if (r === 7) {
        const fl = document.createElement('span');
        fl.className = 'coord file-coord';
        fl.textContent = FILES[f];
        sq.appendChild(fl);
      }
      sq.addEventListener('click', () => onSquareClick(r, f));
      boardEl.appendChild(sq);
    }
  }
}

function renderStatus() {
  const statusEl = document.getElementById('status');
  if (state.gameOver === 'checkmate') {
    statusEl.textContent = `Checkmate — ${state.winner === 'w' ? 'White' : 'Black'} wins.`;
  } else if (state.gameOver === 'stalemate') {
    statusEl.textContent = 'Stalemate — draw.';
  } else {
    const turn = state.sideToMove === 'w' ? 'White' : 'Black';
    const check = isInCheck(state, state.sideToMove) ? ' — check!' : '';
    statusEl.textContent = `${turn} to move${check}`;
  }
}

function renderHistory() {
  const histEl = document.getElementById('history');
  histEl.innerHTML = '';
  for (let i = 0; i < state.history.length; i += 2) {
    const li = document.createElement('li');
    const num = (i / 2) + 1;
    const white = state.history[i] || '';
    const black = state.history[i + 1] || '';
    li.textContent = `${num}. ${white}${black ? '  ' + black : ''}`;
    histEl.appendChild(li);
  }
  histEl.scrollTop = histEl.scrollHeight;
}

function onSquareClick(r, f) {
  if (state.gameOver || pendingPromotion) return;
  const piece = state.board[r][f];
  if (selected) {
    if (selected.r === r && selected.f === f) {
      selected = null;
      legalForSelected = [];
      render();
      return;
    }
    const move = legalForSelected.find(m => m.to.r === r && m.to.f === f);
    if (move) {
      if (move.flags.promotion) {
        pendingPromotion = { from: selected, to: { r, f } };
        showPromotionDialog(state.sideToMove);
        return;
      }
      const next = makeMove(state, selected, { r, f });
      if (next) {
        state = next;
        selected = null;
        legalForSelected = [];
        render();
      }
      return;
    }
    if (piece && piece.color === state.sideToMove) {
      selected = { r, f };
      legalForSelected = legalMoves(state, r, f);
      render();
      return;
    }
    selected = null;
    legalForSelected = [];
    render();
    return;
  }
  if (piece && piece.color === state.sideToMove) {
    selected = { r, f };
    legalForSelected = legalMoves(state, r, f);
    render();
  }
}

function showPromotionDialog(color) {
  const modal = document.getElementById('promotion-modal');
  modal.querySelectorAll('.promo-option').forEach(opt => {
    opt.textContent = GLYPHS[color + opt.dataset.type.toUpperCase()];
  });
  modal.classList.remove('hidden');
}

function hidePromotionDialog() {
  document.getElementById('promotion-modal').classList.add('hidden');
}

function setupPromotion() {
  document.querySelectorAll('.promo-option').forEach(opt => {
    opt.addEventListener('click', () => {
      if (!pendingPromotion) return;
      const type = opt.dataset.type;
      const next = makeMove(state, pendingPromotion.from, pendingPromotion.to, type);
      if (next) state = next;
      pendingPromotion = null;
      selected = null;
      legalForSelected = [];
      hidePromotionDialog();
      render();
    });
  });
}

function reset() {
  state = newGame();
  selected = null;
  legalForSelected = [];
  pendingPromotion = null;
  hidePromotionDialog();
  render();
}

function init() {
  document.getElementById('reset-btn').addEventListener('click', reset);
  setupPromotion();
  render();
}

document.addEventListener('DOMContentLoaded', init);
