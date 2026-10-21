import dayjs from "dayjs";

/** Format a Date as YYYY-MM-DD in the *local* timezone.
 *
 * Do not use `date.toISOString().split("T")[0]`: the picker returns local
 * midnight, so for UTC+ offsets (e.g. IST, +05:30) toISOString() moves the
 * date to the previous day and the stored pass lands on the wrong date.
 */
export function toLocalDateString(date) {
  return dayjs(date).format("YYYY-MM-DD");
}

/** Parse a stored YYYY-MM-DD date as local midnight (not UTC). */
export function parsePassDate(value) {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

/** Last moment (end of day) of the pass's return/departure date. */
export function passEndTime(pass) {
  const end = parsePassDate(pass?.comingDate || pass?.date);
  return end ? end.endOf("day") : null;
}

export function isPast(value, now = dayjs()) {
  const date = parsePassDate(value);
  return date ? date.endOf("day").isBefore(now) : false;
}

const LIVE_STATUSES = new Set(["approved", "active"]);

/**
 * Status as the user should see it: an approved/active pass is expired once
 * its return date (or departure date, when there is no return date) has
 * passed, whichever the backend still says.
 */
export function getPassDisplayStatus(pass, now = dayjs()) {
  if (!pass) return null;
  if (pass.status === "expired") return "expired";

  if (LIVE_STATUSES.has(pass.status)) {
    const end = passEndTime(pass);
    if (end && end.isBefore(now)) return "expired";
  }

  return pass.status;
}

/** "HH:mm AM/PM" for display; stored times are already 12-hour strings. */
export function formatTime(value) {
  return value ? String(value).trim().replace(/\s+/g, " ") : "";
}

export function formatDate(value) {
  const date = parsePassDate(value);
  return date ? date.format("DD MMM YYYY") : "-";
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD MMM YYYY, hh:mm A") : "-";
}

export function daysBetween(start, end) {
  const from = parsePassDate(start);
  const to = parsePassDate(end);
  if (!from || !to) return null;
  return Math.max(to.startOf("day").diff(from.startOf("day"), "day"), 0);
}

/** Turn a stored "9:05 AM" time back into a Date for the native picker. */
export function timeStringToDate(value) {
  const now = dayjs();
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(value ?? "").trim());
  if (!match) return now.toDate();

  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hours += 12;

  return now
    .hour(hours)
    .minute(Number(match[2]))
    .second(0)
    .millisecond(0)
    .toDate();
}
