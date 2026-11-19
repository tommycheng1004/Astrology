import "server-only";
import { createHash } from "node:crypto";

export type CalendarSettings = {
  token?: string;
  chart?: { birth: string; variant: "main" | "alt" };
  dates: string[];
};

export const calendarPath = (uid: string) => ["users", uid, "settings", "calendar"];
export const tokenPath = (token: string) => ["calendarTokens", createHash("sha256").update(token).digest("hex")];

export function calendarDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (y < 1900 || y > 2100) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() + 1 === m && date.getUTCDate() === d ? date.toISOString().slice(0, 10) : null;
}

const escapeValue = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function fold(line: string) {
  let bytes = 0;
  let result = "";
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (bytes + size > 75) {
      result += "\r\n ";
      bytes = 1;
    }
    bytes += size;
    result += char;
  }
  return result;
}

export function icalendar(entries: { id: string; date: string; title: string; description?: string }[], now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ziwei//Calendar//ZH-TW", "CALSCALE:GREGORIAN", "X-WR-CALNAME:紫微命盤",
    ...entries.flatMap((entry) => [
      "BEGIN:VEVENT", `UID:${entry.id}`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${entry.date.replace(/-/g, "")}`, `SUMMARY:${escapeValue(entry.title)}`,
      ...(entry.description ? [`DESCRIPTION:${escapeValue(entry.description)}`] : []), "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].map(fold).join("\r\n") + "\r\n";
}
