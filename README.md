# Chess

A hot-seat two-player chess game that runs entirely in the browser. No build step, no dependencies.

## Play

Open `index.html` in any modern browser.

- Click one of your pieces, then click a highlighted square to move.
- Green dot = empty legal square. Red ring = legal capture.
- The king square is highlighted red when in check.
- Pawn promotion opens a picker dialog (default choice: queen).
- `New game` resets the board.

## Rules implemented

Full standard chess: all piece movement, castling (both sides, blocked when the king is in, through, or into check), en passant, pawn promotion, check, checkmate, and stalemate. Illegal moves (including moves that leave your own king in check) are prevented.

## Files

- `index.html` — markup
- `styles.css` — board and sidebar styling
- `chess.js` — rule engine and UI logic
