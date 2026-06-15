import type { CSSProperties } from "react";
import type { UnitStatus } from "./types";

export const TOTAL = 76;

export const TECHS = ["Jong H.", "Danny C.", "Alan Q.", "Elizabeth K.", "Other"];

export const BAYS = [
  "-",
  ...Array.from({ length: 71 }, (_, i) => `Bay ${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `LH ${i + 1}`),
];

export const SVCS = [
  "Full cleaning & lubrication",
  "Sensor lens cleaning",
  "Rotating wheel cleaning",
  "Ball delivery tube cleaning",
  "Link arm lubrication",
  "Guide shaft lubrication",
  "Chain lubrication",
  "Motor inspection",
  "Electrical connector check",
  "Brush seal cleaning",
  "Air gun dust removal",
  "Vacuum interior",
  "Error code reset",
  "Function test (UP/DOWN/dispense)",
  "Bay subgrade box cleaned",
  "Unit reinstalled to bay",
  "Other",
];

export const uid = (i: number) => String(i + 1).padStart(2, "0");
export const ALL_IDS = Array.from({ length: TOTAL }, (_, i) => uid(i));

export const SC: Record<UnitStatus, { color: string; bg: string; dot: string; label: string }> = {
  good: { color: "#15803d", bg: "#dcfce7", dot: "#22c55e", label: "Good" },
  due: { color: "#b45309", bg: "#fef9c3", dot: "#eab308", label: "Due Soon" },
  overdue: { color: "#dc2626", bg: "#fee2e2", dot: "#ef4444", label: "Overdue" },
  never: { color: "#475569", bg: "#f1f5f9", dot: "#94a3b8", label: "Never" },
};

export const B = "#1e3a5f";
export const G = "#15803d";

export const inp: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
};

export function qr(id: string, base: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&ecc=M&data=${encodeURIComponent(
    base + "#unit-" + id
  )}`;
}
