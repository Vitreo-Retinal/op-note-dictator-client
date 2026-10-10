// ── Practice calendar — single source of truth (Sep 2026) ───────────
// Extracted verbatim from ClinicNoteGenerator.jsx so the note generator and the
// homepage call board share ONE holiday engine. Do not fork this logic.

// Holidays the practice closes for — matches the practice manager's official
// closure schedule ("VRA CLOSED – …" all-day events on the VRA Google
// Calendar; owner correction Oct 9 2026):
// New Year's Day, MLK Day (3rd Mon Jan), Presidents' Day (3rd Mon Feb),
// Patriots' Day (3rd Mon Apr, MA), Memorial Day (last Mon May), Juneteenth
// (Jun 19), Independence Day (Jul 4), Labor Day (1st Mon Sep), Columbus Day
// (2nd Mon Oct), Thanksgiving (4th Thu Nov), Day after Thanksgiving,
// Christmas (Dec 25).
// Fixed-date holidays (New Year's, Juneteenth, July 4, Christmas) that fall on
// a weekend are observed on a weekday: Saturday → the Friday before, Sunday →
// the Monday after, labelled "(observed)". New Year's Day on a Saturday is
// observed on Fri Dec 31 of the PREVIOUS year.
// NOT closed: Good Friday, Easter, Nowruz, Christmas Eve and New Year's Eve
// (unless that day is the observed Christmas / New Year's Day), and the Day
// before Thanksgiving (usually a half day: halfDayNote() returns a small note
// for it, but it is not a closure).
// Calendar "VRA CLOSED" events from the server schedule still win for loaded
// days; this engine is the fallback for dates outside the loaded range.

// Easter via the standard Anonymous Gregorian (computus) algorithm — exact for
// any year. Not a closure; kept exported for reference/tests.
const easterMonthDay = (y) => {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const dd = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - dd - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const mm = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * mm + 114) / 31);      // 3=March, 4=April
  const dayN = ((h + l - 7 * mm + 114) % 31) + 1;
  return [month - 1, dayN]; // JS month index
};

// Fixed-date holidays: [JS month index, day, label].
const FIXED_HOLIDAYS = [
  [0, 1, "New Year's Day"],
  [5, 19, "Juneteenth"],
  [6, 4, "Independence Day"],
  [11, 25, "Christmas"],
];

// Weekday on which a fixed-date holiday of year y is observed:
// Saturday → Friday before, Sunday → Monday after, weekday → itself.
// (Jan 1 on a Saturday rolls back to Dec 31 of y-1.)
const observedDate = (y, m, day) => {
  const d = new Date(y, m, day, 12);
  const dow = d.getDay();
  if (dow === 6) d.setDate(d.getDate() - 1);
  else if (dow === 0) d.setDate(d.getDate() + 1);
  return d;
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const majorHoliday = (d) => {
  if (!d) return null;
  const y = d.getFullYear(), m = d.getMonth(), day = d.getDate(), dow = d.getDay();

  // Fixed-date holidays: the actual date, then the observed weekday. Check
  // next year's New Year's Day too (observed Dec 31 when Jan 1 is a Saturday).
  for (const [hm, hd, label] of FIXED_HOLIDAYS) {
    if (m === hm && day === hd) return label;
  }
  for (const [hm, hd, label] of FIXED_HOLIDAYS) {
    for (const hy of hm === 0 ? [y, y + 1] : [y]) {
      const obs = observedDate(hy, hm, hd);
      if (obs.getDate() !== hd || obs.getMonth() !== hm || obs.getFullYear() !== hy) {
        if (sameDay(obs, d)) return `${label} (observed)`;
      }
    }
  }

  if (m === 0 && dow === 1 && day >= 15 && day <= 21) return "MLK Day";          // third Monday of January
  if (m === 1 && dow === 1 && day >= 15 && day <= 21) return "Presidents' Day";  // third Monday of February
  if (m === 3 && dow === 1 && day >= 15 && day <= 21) return "Patriots' Day";    // third Monday of April (MA)
  if (m === 4 && dow === 1 && day >= 25) return "Memorial Day";                  // last Monday of May
  if (m === 8 && dow === 1 && day <= 7) return "Labor Day";                      // first Monday of September
  if (m === 9 && dow === 1 && day >= 8 && day <= 14) return "Columbus Day";      // second Monday of October
  if (m === 10 && dow === 4 && day >= 22 && day <= 28) return "Thanksgiving";    // fourth Thursday of November
  if (m === 10 && dow === 5 && day >= 23 && day <= 29) return "Day after Thanksgiving";
  return null;
};

// Open-but-unusual days: a short note to show next to the date, never a
// closure. Day before Thanksgiving (the Wednesday before the fourth Thursday
// of November) is usually a half day. Returns null on every other date.
const halfDayNote = (d) => {
  if (!d) return null;
  if (d.getMonth() === 10 && d.getDay() === 3 && d.getDate() >= 21 && d.getDate() <= 27) return "Half day (usually)";
  return null;
};

// 'YYYY-MM-DD' → local Date at noon. Noon (not midnight) so DST shifts and
// the UTC-parsing of bare date strings can't push us to the adjacent day.
const parseLocalNoon = (s) => {
  if (!s) return null;
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12);
};

// Injection booking blackout (per Mari, Sep 2026): the FIRST TWO WEEKS of January
// (Jan 1–14) no injections can be booked EXCEPT Avastin — new-year benefit/PA
// resets. Returns the banner text when the date falls in the window, else null.
const injectionBlackout = (d) => {
  if (!d) return null;
  if (d.getMonth() === 0 && d.getDate() <= 14) {
    return "Jan 1–14: no injections can be booked except Avastin";
  }
  return null;
};

export { easterMonthDay, majorHoliday, halfDayNote, parseLocalNoon, injectionBlackout };
