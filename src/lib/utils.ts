import type { ServiceRecord, UnitStatus } from "./types";

export function toDate(ds: string) {
  return new Date(ds + "T12:00:00");
}

export function today() {
  return new Date().toISOString().split("T")[0];
}

export function daysSince(ds: string) {
  return Math.floor((Date.now() - toDate(ds).getTime()) / 86400000);
}

export function fmtDate(ds: string) {
  return toDate(ds).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function unitStatus(records: ServiceRecord[] | undefined): UnitStatus {
  if (!records || records.length === 0) return "never";
  const d = daysSince(records[records.length - 1].date);
  if (d <= 7) return "good";
  if (d <= 21) return "due";
  return "overdue";
}
