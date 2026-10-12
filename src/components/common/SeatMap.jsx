import { useMemo } from 'react';

/**
 * Seat layout renderer used by the customer booking flow and the admin.
 * seats: [{ id, seat_number, deck, row_no, col_no, seat_type, status, mine }]
 * status: AVAILABLE | LOCKED | BOOKED | BLOCKED (from the backend; never computed here)
 */
export default function SeatMap({ layout, seats, selected = [], onToggle, mode = 'customer', renderTitle }) {
  const decks = useMemo(() => {
    const byDeck = {};
    seats.forEach(s => { (byDeck[s.deck] ||= []).push(s); });
    return Object.entries(byDeck).sort(([a], [b]) => (a === 'lower' ? -1 : b === 'lower' ? 1 : 0));
  }, [seats]);

  const cols = layout?.cols_count || Math.max(...seats.map(s => s.col_no), 1);
  const aisleAfter = layout?.aisle_after_col || Math.floor(cols / 2);
  const sleeper = layout?.seat_type === 'sleeper';

  const stateOf = (s) => {
    if (selected.includes(s.id)) return 'selected';
    if (s.status === 'LOCKED' && s.mine) return 'selected';
    if (s.status === 'AVAILABLE') return 'available';
    if (s.status === 'BLOCKED') return 'blocked';
    if (s.status === 'LOCKED') return 'held';
    return 'booked';
  };

  const clickable = (s) => (mode === 'admin' ? true : ['available', 'selected'].includes(stateOf(s)));

  return (
    <div className="seatmap">
      <div className="seatmap-decks">
        {decks.map(([deck, list]) => {
          const rows = Math.max(...list.map(s => s.row_no));
          return (
            <div key={deck} className={`seatmap-deck ${sleeper ? 'is-sleeper' : ''}`}>
              <div className="seatmap-deck-head">
                <span>{decks.length > 1 ? `${deck === 'lower' ? 'Lower' : 'Upper'} deck` : 'Front'}</span>
                {deck === 'lower' && <span className="seatmap-driver" aria-label="Driver">DRIVER</span>}
              </div>
              <div className="seatmap-grid" style={{ gridTemplateColumns: `repeat(${aisleAfter}, var(--seat-w)) var(--aisle-w) repeat(${cols - aisleAfter}, var(--seat-w))` }}>
                {[...Array(rows)].flatMap((_, r) => {
                  const cells = [];
                  for (let c = 1; c <= cols; c++) {
                    if (c === aisleAfter + 1) cells.push(<span key={`a-${r}`} className="seatmap-aisle" />);
                    const s = list.find(x => x.row_no === r + 1 && x.col_no === c);
                    if (!s) { cells.push(<span key={`e-${r}-${c}`} />); continue; }
                    const st = stateOf(s);
                    cells.push(
                      <button
                        key={s.id}
                        type="button"
                        className={`seat seat-${st}`}
                        disabled={!clickable(s)}
                        aria-pressed={st === 'selected'}
                        aria-label={`Seat ${s.seat_number}, ${st}`}
                        title={renderTitle ? renderTitle(s) : `Seat ${s.seat_number}`}
                        onClick={() => onToggle?.(s)}
                      >
                        {s.seat_number}
                      </button>
                    );
                  }
                  return cells;
                })}
              </div>
              {deck === 'lower' && <div className="seatmap-back">BACK</div>}
            </div>
          );
        })}
      </div>
      <div className="seatmap-legend">
        <span><i className="seat seat-available" /> Available</span>
        <span><i className="seat seat-selected" /> Selected</span>
        <span><i className="seat seat-booked" /> Booked</span>
        <span><i className="seat seat-held" /> On hold</span>
        <span><i className="seat seat-blocked" /> Blocked</span>
      </div>
    </div>
  );
}
