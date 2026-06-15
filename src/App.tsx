import { useEffect, useState } from "react";
import { ALL_IDS, B, BAYS, G, SC, SVCS, TECHS, TOTAL, inp, qr } from "./lib/constants";
import { daysSince, fmtDate, today, unitStatus } from "./lib/utils";
import { useUnitsData } from "./hooks/useUnitsData";
import { notificationsSupported, requestNotificationPermission, useOverdueNotifications } from "./hooks/useNotifications";
import QRScanner from "./components/QRScanner";
import CalendarView from "./components/CalendarView";
import type { UnitData } from "./lib/types";

type Tab = "report" | "log" | "units" | "add" | "unit" | "qr" | "scan" | "cal";

const EMPTY_UNIT: UnitData = { bay: "-", records: [] };

export default function App() {
  const { data, saveUnit } = useUnitsData();
  const [tab, setTab] = useState<Tab>("report");
  const [uid_, setUid] = useState<string | null>(null);
  const [base, setBase] = useState("");
  const [toast, setToast] = useState("");
  const [pFrom, setPFrom] = useState(1);
  const [pTo, setPTo] = useState(12);
  const [search, setSearch] = useState("");
  const [filterSt, setFilterSt] = useState("all");
  const [notifEnabled, setNotifEnabled] = useState(
    () => notificationsSupported() && Notification.permission === "granted"
  );

  const [form, setForm] = useState({ date: today(), tech: "", bay: "-", services: [] as string[], notes: "" });

  useOverdueNotifications(data, notifEnabled);

  useEffect(() => {
    setBase(window.location.href.split("#")[0]);
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  function checkHash() {
    const h = window.location.hash;
    if (h.startsWith("#unit-")) {
      setUid(h.replace("#unit-", ""));
      setTab("unit");
    }
  }

  function toast_(m: string) {
    setToast(m);
    setTimeout(() => setToast(""), 3000);
  }

  function getU(id: string): UnitData {
    return data[id] || EMPTY_UNIT;
  }

  function openUnit(id: string) {
    setUid(id);
    setTab("unit");
    window.location.hash = "unit-" + id;
  }

  function openAdd(id?: string | null) {
    const targetId = id || uid_;
    if (!targetId) return;
    const u = getU(targetId);
    setForm((f) => ({ ...f, bay: u.bay || "-" }));
    setUid(targetId);
    setTab("add");
  }

  async function saveRecord() {
    if (!uid_) return;
    if (!form.tech || form.services.length === 0) {
      toast_("⚠️ Select tech + service");
      return;
    }
    const u = getU(uid_);
    const rec = {
      id: Date.now(),
      date: form.date,
      tech: form.tech,
      bay: form.bay,
      services: [...form.services],
      notes: form.notes.trim(),
      ts: new Date().toLocaleString("en-US"),
    };
    const recs = [...u.records, rec];
    await saveUnit(uid_, { bay: form.bay !== "-" ? form.bay : u.bay || "-", records: recs });
    setForm({ date: today(), tech: "", bay: "-", services: [], notes: "" });
    setTab("unit");
    toast_(`✅ Unit ${uid_} — service logged`);
  }

  function toggleSvc(s: string) {
    setForm((f) => ({ ...f, services: f.services.includes(s) ? f.services.filter((x) => x !== s) : [...f.services, s] }));
  }

  async function enableNotifications() {
    const perm = await requestNotificationPermission();
    if (perm === "granted") {
      setNotifEnabled(true);
      toast_("🔔 Notifications enabled");
    } else {
      toast_("⚠️ Notification permission denied");
    }
  }

  // ── DERIVED DATA ──────────────────────────────────────────────────
  const allRecords = ALL_IDS.flatMap((id) => (getU(id).records || []).map((r) => ({ ...r, unitId: id })));
  const thisWeek = allRecords.filter((r) => daysSince(r.date) <= 7);
  const thisMonth = allRecords.filter((r) => daysSince(r.date) <= 30);

  const counts = { good: 0, due: 0, overdue: 0, never: 0 };
  ALL_IDS.forEach((id) => counts[unitStatus(getU(id).records)]++);

  const techCounts: Record<string, number> = {};
  allRecords.forEach((r) => {
    techCounts[r.tech] = (techCounts[r.tech] || 0) + 1;
  });

  const svcCounts: Record<string, number> = {};
  allRecords.forEach((r) => r.services.forEach((s) => {
    svcCounts[s] = (svcCounts[s] || 0) + 1;
  }));

  const filteredUnits = ALL_IDS.filter((id) => {
    const st = unitStatus(getU(id).records);
    const matchSt = filterSt === "all" || filterSt === st;
    const matchQ = !search || id.includes(search) || getU(id).bay.toLowerCase().includes(search.toLowerCase());
    return matchSt && matchQ;
  });

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", minHeight: "100vh", background: "#f0f4f8", maxWidth: 540, margin: "0 auto", paddingBottom: 70 }}>

      {toast && (
        <div style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", background: B, color: "#fff", padding: "10px 22px", borderRadius: 30, zIndex: 9999, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,.25)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* ───── REPORT ───── */}
      {tab === "report" && (
        <div>
          {/* Header */}
          <div style={{ background: `linear-gradient(135deg,${B},#1d4ed8)`, color: "#fff", padding: "24px 18px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, color: "#93c5fd", letterSpacing: 2, marginBottom: 2 }}>ALLEY POND GOLF CENTER</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 1 }}>Auto Tee Service Report</div>
              <div style={{ fontSize: 11, color: "#93c5fd" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
            </div>
            <button onClick={() => setTab("qr")} title="Print QR codes" style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>
              🖨️
            </button>
          </div>

          {/* Status strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, padding: "14px 14px 0" }}>
            {Object.entries({ good: "✅", due: "⚠️", overdue: "🔴", never: "⬜" }).map(([k, ic]) => (
              <div key={k} onClick={() => { setFilterSt(k); setTab("units"); }} style={{ background: SC[k as keyof typeof SC].bg, borderRadius: 10, padding: "12px 6px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: 18 }}>{ic}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: SC[k as keyof typeof SC].color, lineHeight: 1 }}>{counts[k as keyof typeof counts]}</div>
                <div style={{ fontSize: 9, color: SC[k as keyof typeof SC].color, fontWeight: 600, marginTop: 2 }}>{SC[k as keyof typeof SC].label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ margin: "12px 14px 0", background: "#fff", borderRadius: 12, padding: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Overall Service Status</span>
              <span style={{ fontSize: 12, color: G, fontWeight: 700 }}>{Math.round((counts.good / TOTAL) * 100)}% Good</span>
            </div>
            <div style={{ height: 10, background: "#e5e7eb", borderRadius: 5, overflow: "hidden", display: "flex" }}>
              <div style={{ height: "100%", width: `${(counts.good / TOTAL) * 100}%`, background: "#22c55e" }} />
              <div style={{ height: "100%", width: `${(counts.due / TOTAL) * 100}%`, background: "#eab308" }} />
              <div style={{ height: "100%", width: `${(counts.overdue / TOTAL) * 100}%`, background: "#ef4444" }} />
              <div style={{ height: "100%", width: `${(counts.never / TOTAL) * 100}%`, background: "#e5e7eb" }} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
              {[["#22c55e", "Good"], ["#eab308", "Due Soon"], ["#ef4444", "Overdue"], ["#94a3b8", "Never"]].map(([c, l]) => (
                <span key={l} style={{ fontSize: 10, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
                  {l}
                </span>
              ))}
            </div>
          </div>

          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "10px 14px 0" }}>
            {[
              { label: "Total Records", val: allRecords.length, sub: "all time", color: B },
              { label: "This Week", val: thisWeek.length, sub: "7 days", color: "#0891b2" },
              { label: "This Month", val: thisMonth.length, sub: "30 days", color: "#7c3aed" },
              { label: "Units Serviced", val: Object.keys(data).length, sub: "of 76", color: G },
            ].map((s) => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginTop: 4 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Needs attention */}
          <div style={{ margin: "10px 14px 0", background: "#fff", borderRadius: 12, padding: "14px" }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#dc2626", marginBottom: 10 }}>🔴 Needs Attention ({counts.overdue + counts.never})</div>
            {counts.overdue === 0 && counts.never === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: 13 }}>All units are up to date! ✅</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ALL_IDS.filter((id) => ["overdue", "never"].includes(unitStatus(getU(id).records))).map((id) => {
                  const st = unitStatus(getU(id).records);
                  const sc = SC[st];
                  return (
                    <div key={id} onClick={() => openUnit(id)} style={{ background: sc.bg, color: sc.color, padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {id}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tech performance */}
          {Object.keys(techCounts).length > 0 && (
            <div style={{ margin: "10px 14px 0", background: "#fff", borderRadius: 12, padding: "14px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 10 }}>👤 Technician Activity</div>
              {Object.entries(techCounts).sort((a, b) => b[1] - a[1]).map(([t, c]) => (
                <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: 13, color: "#374151" }}>{t}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 80, height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(c / allRecords.length) * 100}%`, background: B, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: B, minWidth: 24, textAlign: "right" }}>{c}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top services */}
          {Object.keys(svcCounts).length > 0 && (
            <div style={{ margin: "10px 14px 0", background: "#fff", borderRadius: 12, padding: "14px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 10 }}>🔧 Most Common Services</div>
              {Object.entries(svcCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s, c]) => (
                <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: 12, color: "#475569", flex: 1, marginRight: 8 }}>{s}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 60, height: 5, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(c / allRecords.length) * 100}%`, background: G, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: G, minWidth: 18, textAlign: "right" }}>{c}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent entries */}
          <div style={{ margin: "10px 14px 0", background: "#fff", borderRadius: 12, padding: "14px" }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 2 }}>📋 Recent Service Log</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 10 }}>Alley Pond Golf Center — Auto Tee Maintenance Log</div>
            <div style={{ display: "grid", gridTemplateColumns: "44px 80px 90px 1fr", background: B, borderRadius: 6, marginBottom: 4 }}>
              {["Unit", "Date", "Technician", "Service Performed"].map((h) => (
                <div key={h} style={{ padding: "6px 8px", fontSize: 10, fontWeight: 700, color: "#fff" }}>{h}</div>
              ))}
            </div>
            {allRecords.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: 12, padding: "12px 0" }}>No records yet.</div>
            ) : (
              [...allRecords].sort((a, b) => b.id - a.id).slice(0, 10).map((r, i) => (
                <div key={r.id} onClick={() => openUnit(r.unitId)} style={{ display: "grid", gridTemplateColumns: "44px 80px 90px 1fr", background: i % 2 === 0 ? "#f8fafc" : "#fff", borderRadius: 4, cursor: "pointer", marginBottom: 2 }}>
                  <div style={{ padding: "7px 8px", fontWeight: 700, color: B, fontSize: 13 }}>{r.unitId}</div>
                  <div style={{ padding: "7px 8px", fontSize: 11, color: "#374151" }}>{fmtDate(r.date)}</div>
                  <div style={{ padding: "7px 8px", fontSize: 11, color: "#374151" }}>{r.tech}</div>
                  <div style={{ padding: "7px 8px", fontSize: 10, color: "#475569", lineHeight: 1.4 }}>
                    {r.services.slice(0, 2).join(", ")}{r.services.length > 2 ? ` +${r.services.length - 2}` : ""}
                    {r.bay && r.bay !== "-" && <span style={{ color: "#94a3b8" }}> · {r.bay}</span>}
                  </div>
                </div>
              ))
            )}
            {allRecords.length > 10 && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, textAlign: "right" }}>{allRecords.length - 10} more records — view in Units tab</div>}
          </div>
        </div>
      )}

      {/* ───── UNITS LIST ───── */}
      {tab === "units" && (
        <div>
          <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <button onClick={() => setTab("report")} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 600 }}>‹</button>
              <div style={{ fontWeight: 700, fontSize: 15 }}>All Units</div>
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search unit # or bay..." style={inp} />
            <div style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto", paddingBottom: 2 }}>
              {["all", "good", "due", "overdue", "never"].map((k) => (
                <button key={k} onClick={() => setFilterSt(k)}
                  style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, flexShrink: 0, background: filterSt === k ? (k === "all" ? B : SC[k as keyof typeof SC].color) : "#e5e7eb", color: filterSt === k ? "#fff" : "#64748b" }}>
                  {k === "all" ? "All" : SC[k as keyof typeof SC].label} {k !== "all" ? `(${counts[k as keyof typeof counts]})` : ""}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: "10px 14px" }}>
            {filteredUnits.map((id) => {
              const u = getU(id);
              const st = unitStatus(u.records);
              const sc = SC[st];
              const last = u.records.length > 0 ? u.records[u.records.length - 1] : null;
              const ds = last ? daysSince(last.date) : null;
              return (
                <div key={id} onClick={() => openUnit(id)}
                  style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,.05)", borderLeft: `3px solid ${sc.dot}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: sc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: sc.color, flexShrink: 0 }}>{id}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>Unit {id}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {u.bay && u.bay !== "-" ? `📍 ${u.bay}` : "📍 -"}
                      {last && ` · ${ds === 0 ? "Today" : `${ds}d ago`} · ${last.tech}`}
                      {!last && " · Never serviced"}
                    </div>
                    {u.records.length > 0 && <div style={{ fontSize: 10, color: "#94a3b8" }}>{u.records.length} record{u.records.length !== 1 ? "s" : ""}</div>}
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 18 }}>›</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───── UNIT DETAIL ───── */}
      {tab === "unit" && uid_ && (() => {
        const u = getU(uid_);
        const st = unitStatus(u.records);
        const sc = SC[st];
        const last = u.records.length > 0 ? u.records[u.records.length - 1] : null;
        const ds = last ? daysSince(last.date) : null;
        return (
          <div>
            <div style={{ background: `linear-gradient(135deg,${B},#1d4ed8)`, color: "#fff", padding: "18px 16px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <button onClick={() => { setTab("units"); window.location.hash = ""; }} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 13 }}>‹</button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#93c5fd", letterSpacing: 1 }}>AUTO TEE UNIT</div>
                  <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>#{uid_}</div>
                  {u.bay && u.bay !== "-" && <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 4 }}>📍 {u.bay}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ background: sc.bg, color: sc.color, padding: "4px 12px", borderRadius: 20, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{sc.label}</div>
                  <div style={{ fontSize: 11, color: "#93c5fd" }}>{ds === null ? "Never serviced" : ds === 0 ? "Today" : `${ds}d ago`}</div>
                  <div style={{ fontSize: 11, color: "#93c5fd" }}>{u.records.length} records total</div>
                </div>
              </div>
            </div>

            {/* QR + Add */}
            <div style={{ margin: "12px 14px 0", display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, background: "#fff", borderRadius: 12, padding: "12px" }}>
              <img src={qr(uid_, base)} alt="QR" style={{ width: 70, height: 70, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>Scan to open this unit page</div>
                <button onClick={() => openAdd(uid_)} style={{ padding: "9px 0", borderRadius: 9, border: "none", background: G, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>＋ Log Service</button>
              </div>
            </div>

            {/* History */}
            <div style={{ padding: "10px 14px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", marginBottom: 8 }}>Service History</div>
              {u.records.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 10, padding: "24px", textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>📋</div>
                  <div style={{ fontSize: 13 }}>No records yet</div>
                </div>
              ) : (
                [...u.records].reverse().map((r) => (
                  <div key={r.id} style={{ background: "#fff", borderRadius: 10, padding: "13px", marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontWeight: 700, color: B, fontSize: 13 }}>{fmtDate(r.date)}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>👤 {r.tech}</span>
                    </div>
                    {r.bay && r.bay !== "-" && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>📍 {r.bay}</div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: r.notes ? 6 : 0 }}>
                      {r.services.map((s) => <span key={s} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "#dbeafe", color: "#1e40af" }}>{s}</span>)}
                    </div>
                    {r.notes && <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>📝 {r.notes}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })()}

      {/* ───── ADD SERVICE ───── */}
      {tab === "add" && uid_ && (
        <div>
          <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setTab("unit")} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 600 }}>‹</button>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Log Service — Unit {uid_}</div>
          </div>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: "14px", marginBottom: 10 }}>
              <Lbl>Date</Lbl>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={{ ...inp, marginBottom: 10 }} />
              <Lbl>Technician *</Lbl>
              <select value={form.tech} onChange={(e) => setForm((f) => ({ ...f, tech: e.target.value }))} style={{ ...inp, marginBottom: 10 }}>
                <option value="">Select</option>
                {TECHS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <Lbl>Bay Location</Lbl>
              <select value={form.bay} onChange={(e) => setForm((f) => ({ ...f, bay: e.target.value }))} style={inp}>
                {BAYS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: "14px", marginBottom: 10 }}>
              <Lbl>Service Performed *</Lbl>
              {SVCS.map((s) => {
                const on = form.services.includes(s);
                return (
                  <div key={s} onClick={() => toggleSvc(s)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, cursor: "pointer", background: on ? "#dbeafe" : "#f8fafc", border: `1px solid ${on ? "#93c5fd" : "#e2e8f0"}`, marginBottom: 5 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${on ? "#1e40af" : "#d1d5db"}`, background: on ? "#1e40af" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {on && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 12, color: on ? "#1e40af" : "#374151" }}>{s}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: "14px", marginBottom: 12 }}>
              <Lbl>Notes</Lbl>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Any observations..." style={{ ...inp, resize: "vertical" }} />
            </div>
            <button onClick={saveRecord}
              style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: form.tech && form.services.length > 0 ? G : "#e5e7eb", color: form.tech && form.services.length > 0 ? "#fff" : "#9ca3af", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}>
              {form.tech && form.services.length > 0 ? "✓ Save Service Record" : "Fill technician + service"}
            </button>
          </div>
        </div>
      )}

      {/* ───── QR PRINT ───── */}
      {tab === "qr" && (
        <div>
          <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setTab("report")} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 600 }}>‹</button>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Generate QR Codes</div>
          </div>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: "14px", marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                <div><Lbl>From Unit</Lbl><select value={pFrom} onChange={(e) => setPFrom(Number(e.target.value))} style={inp}>{Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></div>
                <div><Lbl>To Unit</Lbl><select value={pTo} onChange={(e) => setPTo(Number(e.target.value))} style={inp}>{Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></div>
              </div>
              <div style={{ fontSize: 11, color: "#64748b", background: "#f0f9ff", borderRadius: 8, padding: "10px" }}>
                📱 Print & stick QR on each unit. Scanning opens service history instantly.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {Array.from({ length: Math.min(pTo, TOTAL) - pFrom + 1 }, (_, i) => {
                const id = String(pFrom + i).padStart(2, "0");
                const u = getU(id);
                const st = unitStatus(u.records);
                const sc = SC[st];
                return (
                  <div key={id} onClick={() => openUnit(id)}
                    style={{ background: "#fff", borderRadius: 12, padding: "12px", textAlign: "center", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,.08)", border: `2px solid ${sc.bg}` }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: B, marginBottom: 4 }}>UNIT {id}</div>
                    <img src={qr(id, base)} alt={id} style={{ width: "100%", maxWidth: 120, height: "auto", borderRadius: 6, marginBottom: 5 }} />
                    <div style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 600, display: "inline-block" }}>{sc.label}</div>
                    {u.bay && u.bay !== "-" && <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>📍 {u.bay}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ───── QR SCAN ───── */}
      {tab === "scan" && (
        <div>
          <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setTab("report")} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 600 }}>‹</button>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Scan Unit QR Code</div>
          </div>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
              카메라로 QR을 스캔하거나, 사진 앱에서 QR이 찍힌 이미지를 선택하면 해당 Unit 페이지로 이동합니다.
            </div>
            <QRScanner onResult={(id) => { toast_(`📷 Unit ${id} found`); openUnit(id); }} />
          </div>
        </div>
      )}

      {/* ───── CALENDAR ───── */}
      {tab === "cal" && (
        <CalendarView
          data={data}
          onOpenUnit={openUnit}
          notifEnabled={notifEnabled}
          notifSupported={notificationsSupported()}
          onEnableNotif={enableNotifications}
        />
      )}

      {/* ───── BOTTOM NAV ───── */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 540, background: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", zIndex: 100 }}>
        {([["report", "📊", "Report"], ["units", "📋", "Units"], ["add", "➕", "Add"], ["scan", "📷", "Scan"], ["cal", "📅", "Calendar"]] as const).map(([v, ic, lb]) => (
          <button key={v} onClick={() => {
            if (v === "add") {
              const id = uid_ || "01";
              if (!uid_) setUid("01");
              const u = getU(id);
              setForm((f) => ({ ...f, bay: u.bay || "-" }));
            }
            setTab(v);
          }}
            style={{ flex: 1, padding: "10px 0", border: "none", background: "transparent", cursor: "pointer", color: tab === v ? B : "#94a3b8", fontWeight: tab === v ? 700 : 400, fontSize: 10 }}>
            <div style={{ fontSize: 20 }}>{ic}</div>{lb}
          </button>
        ))}
      </div>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{children}</div>;
}
