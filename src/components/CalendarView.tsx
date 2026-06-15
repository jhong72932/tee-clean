import { useMemo, useState } from "react";
import { ALL_IDS, B, SC } from "../lib/constants";
import { fmtDate, unitStatus } from "../lib/utils";
import type { ServiceRecord, UnitsData } from "../lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarView({
  data,
  onOpenUnit,
  notifEnabled,
  notifSupported,
  onEnableNotif,
}: {
  data: UnitsData;
  onOpenUnit: (id: string) => void;
  notifEnabled: boolean;
  notifSupported: boolean;
  onEnableNotif: () => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(ymd(new Date()));

  const recordsByDate = useMemo(() => {
    const map = new Map<string, (ServiceRecord & { unitId: string })[]>();
    ALL_IDS.forEach((id) => {
      (data[id]?.records || []).forEach((r) => {
        const arr = map.get(r.date) || [];
        arr.push({ ...r, unitId: id });
        map.set(r.date, arr);
      });
    });
    return map;
  }, [data]);

  const overdueUnits = useMemo(
    () => ALL_IDS.filter((id) => ["overdue", "never"].includes(unitStatus(data[id]?.records))),
    [data]
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = ymd(new Date());

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);

  const selectedRecords = recordsByDate.get(selected) || [];

  return (
    <div>
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 14px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Maintenance Calendar</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#475569" }}
          >
            ‹
          </button>
          <div style={{ fontWeight: 700, fontSize: 14, color: B }}>
            {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#475569" }}
          >
            ›
          </button>
        </div>
      </div>

      {!notifSupported ? null : !notifEnabled ? (
        <div style={{ margin: "10px 14px 0", background: "#fef9c3", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#92400e" }}>관리가 안 된 unit이 있으면 알림을 받아보세요.</div>
          <button onClick={onEnableNotif} style={{ background: "#b45309", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            알림 켜기
          </button>
        </div>
      ) : (
        <div style={{ margin: "10px 14px 0", background: "#dcfce7", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#15803d", fontWeight: 600 }}>
          ✓ 알림이 켜져 있습니다 — 관리가 안 된 unit이 있으면 알려드려요.
        </div>
      )}

      <div style={{ margin: "10px 14px 0", background: "#fff", borderRadius: 12, padding: "12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
          {WEEKDAYS.map((w) => (
            <div key={w} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#94a3b8", padding: "4px 0" }}>
              {w}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const recs = recordsByDate.get(date) || [];
            const isToday = date === todayStr;
            const isSelected = date === selected;
            const dayNum = Number(date.split("-")[2]);
            return (
              <div
                key={date}
                onClick={() => setSelected(date)}
                style={{
                  borderRadius: 8,
                  padding: "6px 2px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: isSelected ? B : isToday ? "#dbeafe" : "#f8fafc",
                  border: isToday && !isSelected ? `1px solid ${B}` : "1px solid transparent",
                  minHeight: 40,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: isToday || isSelected ? 800 : 500, color: isSelected ? "#fff" : isToday ? B : "#374151" }}>{dayNum}</div>
                {recs.length > 0 && (
                  <div style={{ marginTop: 2, fontSize: 9, fontWeight: 700, color: isSelected ? "#bfdbfe" : "#15803d" }}>
                    {recs.length} ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ margin: "10px 14px 0", background: "#fff", borderRadius: 12, padding: "14px" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 8 }}>
          {fmtDate(selected)} — {selectedRecords.length} record{selectedRecords.length !== 1 ? "s" : ""}
        </div>
        {selectedRecords.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 12 }}>이 날짜에 등록된 관리 기록이 없습니다.</div>
        ) : (
          selectedRecords.map((r) => (
            <div
              key={r.id}
              onClick={() => onOpenUnit(r.unitId)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
            >
              <div style={{ fontWeight: 800, fontSize: 13, color: B, minWidth: 30 }}>{r.unitId}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "#374151" }}>{r.services.slice(0, 2).join(", ")}{r.services.length > 2 ? ` +${r.services.length - 2}` : ""}</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{r.tech}{r.bay && r.bay !== "-" ? ` · ${r.bay}` : ""}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ margin: "10px 14px 0", background: "#fff", borderRadius: 12, padding: "14px" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#dc2626", marginBottom: 10 }}>관리가 필요한 Unit ({overdueUnits.length})</div>
        {overdueUnits.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 13 }}>모든 unit이 최신 상태입니다 ✅</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {overdueUnits.map((id) => {
              const st = unitStatus(data[id]?.records);
              const sc = SC[st];
              return (
                <div key={id} onClick={() => onOpenUnit(id)} style={{ background: sc.bg, color: sc.color, padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {id} · {sc.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
