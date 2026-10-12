import { formatTime, dayOffset } from '../../utils/format';

/**
 * Vertical stop timeline. stops: [{ id, stop_name, arrival_at, departure_at }]
 * Highlights the boarding→dropping segment when ids are given.
 */
export default function RouteTimeline({ stops, travelDate, boardingId, droppingId, compact = false }) {
  const bIdx = stops.findIndex(s => s.id === boardingId);
  const dIdx = stops.findIndex(s => s.id === droppingId);
  return (
    <ol className={`timeline ${compact ? 'timeline-compact' : ''}`}>
      {stops.map((s, i) => {
        const time = s.departure_at || s.arrival_at;
        const inSegment = bIdx >= 0 && dIdx >= 0 && i >= bIdx && i <= dIdx;
        const plus = dayOffset(time, travelDate);
        return (
          <li key={s.id} className={`timeline-stop ${inSegment ? 'is-active' : ''} ${i === bIdx ? 'is-board' : ''} ${i === dIdx ? 'is-drop' : ''}`}>
            <span className="timeline-time">
              {formatTime(time)}
              {plus > 0 && <sup>+{plus}d</sup>}
            </span>
            <span className="timeline-dot" aria-hidden="true" />
            <span className="timeline-name">
              <strong>{s.stop_name}</strong>
              {!compact && s.arrival_at && s.departure_at && (
                <small>Arr {formatTime(s.arrival_at)} · Dep {formatTime(s.departure_at)}</small>
              )}
              {i === bIdx && <em className="timeline-tag">Boarding</em>}
              {i === dIdx && <em className="timeline-tag">Dropping</em>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
