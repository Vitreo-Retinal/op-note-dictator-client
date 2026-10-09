import { useRef } from "react";
import { T } from "./theme.js";
import { dateOfYmd, addDaysYmd } from "./lib/vraSchedule.js";

// ── Day stepper (Oct 2026, owner-approved) ──────────────────────────────
// Desktop front pages (VRA Call Board, LEA Hub "Doctors" card): look at
// another day the way the phone's Schedule tab allows.
//   ‹  [Fri, Oct 9, 2026]  ›  Today
// The date text is a button that opens the native date picker (a hidden
// <input type="date"> via showPicker). ‹/› step one calendar day and stop at
// min/max — the first/last day the loaded schedule covers. "Today" is
// disabled while today is showing. Nothing is persisted: it resets on reload.

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-09" → "Fri, Oct 9, 2026" */
export function dayText(ymd) {
  const d = dateOfYmd(ymd);
  return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const H = 28;

// compact (LEA Hub "Doctors" header, a half-width column): tighter gaps and padding.
export default function DayStepper({ value, todayYmd, min, max, onChange, compact = false, style }) {
  const inputRef = useRef(null);
  const gap = compact ? 4 : 6;
  const padX = compact ? 8 : 10;
  const isToday = value === todayYmd;
  const canPrev = !!min && value > min;
  const canNext = !!max && value < max;
  const go = (ymd) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return;
    if (min && ymd < min) ymd = min;
    if (max && ymd > max) ymd = max;
    onChange(ymd);
  };
  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === "function") { el.showPicker(); return; }
    } catch { /* fall through */ }
    el.focus();
    el.click();
  };

  const box = {
    height: H, minWidth: H, boxSizing: "border-box", display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, fontFamily: T.sans, padding: 0,
  };
  const arrow = (enabled) => ({
    ...box, width: H, color: enabled ? T.accent : T.lineStrong, fontSize: 17, lineHeight: 1, cursor: enabled ? "pointer" : "default",
  });

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap, flex: "none", ...style }}>
      <button type="button" className="vra-daybtn" onClick={() => go(addDaysYmd(value, -1))} disabled={!canPrev}
        aria-label="Previous day" title="Previous day" style={arrow(canPrev)}>
        <span aria-hidden="true" style={{ marginTop: -2 }}>‹</span>
      </button>
      <span style={{ position: "relative", display: "inline-flex" }}>
        <button type="button" className="vra-daybtn" onClick={openPicker}
          aria-label={`Showing ${dayText(value)}. Pick another date`} title="Pick a date"
          style={{ ...box, minWidth: compact ? 134 : 150, padding: `0 ${padX}px`, color: T.ink, fontSize: compact ? 13 : 13.5, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", fontVariantNumeric: "tabular-nums" }}>
          {dayText(value)}
        </button>
        {/* Native picker anchor — hidden, opened by the button above. */}
        <input ref={inputRef} type="date" value={value} min={min || undefined} max={max || undefined}
          onChange={(e) => go(e.target.value)} tabIndex={-1} aria-hidden="true"
          style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: "100%", opacity: 0, pointerEvents: "none", border: 0, padding: 0, margin: 0 }} />
      </span>
      <button type="button" className="vra-daybtn" onClick={() => go(addDaysYmd(value, 1))} disabled={!canNext}
        aria-label="Next day" title="Next day" style={arrow(canNext)}>
        <span aria-hidden="true" style={{ marginTop: -2 }}>›</span>
      </button>
      <button type="button" className="vra-daybtn" onClick={() => go(todayYmd)} disabled={isToday}
        style={{ ...box, padding: `0 ${padX}px`, color: isToday ? T.muted : T.accent, fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", cursor: isToday ? "default" : "pointer" }}>
        Today
      </button>
    </span>
  );
}

/**
 * [min, max] YYYY-MM-DD range the loaded schedule covers (always includes
 * today, so the stepper never strands the user). Not loaded → [today, today].
 */
export function scheduleRange(sched, todayYmd, ok) {
  const days = ok && sched && Array.isArray(sched.days) ? sched.days.map((d) => d.date).filter(Boolean).sort() : [];
  if (!days.length) return [todayYmd, todayYmd];
  const lo = days[0] < todayYmd ? days[0] : todayYmd;
  const hi = days[days.length - 1] > todayYmd ? days[days.length - 1] : todayYmd;
  return [lo, hi];
}
