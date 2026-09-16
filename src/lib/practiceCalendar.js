// ── Practice calendar — single source of truth (Sep 2026) ───────────
// Extracted verbatim from ClinicNoteGenerator.jsx so the note generator and the
// homepage call board share ONE holiday engine. Do not fork this logic.

// Holidays the practice closes for (per Mari, Sep 2026): New Year's Day, MLK Day,
// Nowruz (Mar 20–21 equinox window), Good Friday, Easter, Memorial Day, Juneteenth,
// July 4th, Labor Day, Indigenous Peoples Day, Thanksgiving + Black Friday,
// Christmas Eve, Christmas.
// Easter via the standard Anonymous Gregorian (computus) algorithm — exact for any year.
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

// Nowruz = the day of the vernal equinox in US Eastern time (Saal Tahvil moment
// as experienced in Massachusetts). No Mar 21 equinox occurs in US ET this
// century; it's Mar 20 except the years below. Fallback Mar 20 beyond the table.
const NOWRUZ_DAY = { 2026: 20, 2027: 20, 2028: 19, 2029: 20, 2030: 20, 2031: 20, 2032: 19, 2033: 19, 2034: 20, 2035: 20 };

const majorHoliday = (d) => {
  const m = d.getMonth(), day = d.getDate(), dow = d.getDay();
  const [em, ed] = easterMonthDay(d.getFullYear());
  const easter = new Date(d.getFullYear(), em, ed, 12);
  const goodFriday = new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000);
  if (m === easter.getMonth() && day === easter.getDate()) return "Easter";
  if (m === goodFriday.getMonth() && day === goodFriday.getDate()) return "Good Friday";
  if (m === 2 && day === (NOWRUZ_DAY[d.getFullYear()] || 20)) return "Nowruz";
  if (m === 0 && day === 1) return "New Year's Day";
  if (m === 0 && dow === 1 && day >= 15 && day <= 21) return "MLK Day";        // third Monday of January
  if (m === 4 && dow === 1 && day >= 25) return "Memorial Day";                // last Monday of May
  if (m === 5 && day === 19) return "Juneteenth";
  if (m === 6 && day === 4) return "July 4th";
  if (m === 3 && dow === 1 && day >= 15 && day <= 21) return "Patriots' Day";  // third Monday of April (MA)
  if (m === 8 && dow === 1 && day <= 7) return "Labor Day";                    // first Monday of September
  if (m === 9 && dow === 1 && day >= 8 && day <= 14) return "Indigenous Peoples Day"; // second Monday of October
  if (m === 10 && dow === 4 && day >= 22 && day <= 28) return "Thanksgiving";  // fourth Thursday of November
  if (m === 10 && dow === 5 && day >= 23 && day <= 29) return "Black Friday";  // Friday after Thanksgiving
  if (m === 11 && day === 24) return "Christmas Eve";
  if (m === 11 && day === 25) return "Christmas Day";
  if (m === 11 && day === 31) return "New Year's Eve";
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

export { easterMonthDay, NOWRUZ_DAY, majorHoliday, parseLocalNoon, injectionBlackout };
