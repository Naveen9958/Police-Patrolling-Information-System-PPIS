import { useState, useEffect } from "react";
import axios from "axios";
import 'leaflet/dist/leaflet.css';

import Login from "./Login";
import Officers from "./Officers";
import Checkpoints from "./Checkpoints";
import PatrolLogs from "./PatrolLogs";
import LiveMap from "./LiveMap";
import OfficerPortal from "./OfficerPortal";

// ---- Design tokens -------------------------------------------------------
const COLORS = {
  bg: "#0d1013",
  panel: "#171b21",
  panelAlt: "#12151a",
  border: "rgba(255,255,255,0.07)",
  amber: "#f2a93b",
  amberDim: "rgba(242,169,59,0.14)",
  red: "#e2434b",
  green: "#4fae7c",
  steel: "#6c86a1",
  text: "#eef1f4",
  textMuted: "#8792a1",
  textFaint: "#4d5561",
};

const NAV_ITEMS = [
  { key: "dashboard", ch: "01", label: "Dashboard", icon: "◈" },
  { key: "liveMap", ch: "02", label: "Officer Locations", icon: "◎" },
  { key: "officers", ch: "03", label: "Officers", icon: "▣" },
  { key: "checkpoints", ch: "04", label: "Checkpoints", icon: "▲" },
  { key: "patrolLogs", ch: "05", label: "Patrol Logs", icon: "▤" },
];

const SECTION_LABEL = {
  dashboard: "Overview",
  liveMap: "Officer Locations",
  officers: "Officer Roster",
  checkpoints: "Checkpoint Network",
  patrolLogs: "Patrol Logs",
};

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [clock, setClock] = useState(new Date());

  const [stats, setStats] = useState({
    officers: 0,
    checkpoints: 0,
    patrolLogs: 0,
  });

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  // Cosmetic duty clock in the top bar — purely visual, no new functionality.
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadStats = async () => {
    try {
      const res = await axios.get("http://localhost:5000/dashboard-stats");
      setStats(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (user.role === "Officer") {
    return <OfficerPortal user={user} onLogout={() => setUser(null)} />;
  }

  const timeStr = clock.toLocaleTimeString("en-US", { hour12: false });
  const dateStr = clock.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
  });

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(79,174,124,0.5); }
          50% { opacity: 0.55; box-shadow: 0 0 0 6px rgba(79,174,124,0); }
        }
        .ppis-nav-item:hover { background: rgba(255,255,255,0.04) !important; }
        .ppis-card:hover { transform: translateY(-2px); border-color: rgba(242,169,59,0.35) !important; }
        .ppis-logout:hover { background: rgba(226,67,75,0.1); }
      `}</style>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.brandRow}>
          <ShieldMark />
          <div>
            <div style={styles.brandTitle}>PPIS</div>
            <div style={styles.brandSub}>Command Console</div>
          </div>
        </div>

        <div style={styles.navDivider} />

        <div style={{ marginTop: 6 }}>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.key}
              className="ppis-nav-item"
              onClick={() => setPage(item.key)}
              style={{
                ...styles.navItem,
                ...(page === item.key ? styles.navItemActive : {}),
              }}
            >
              {page === item.key && <span style={styles.navActiveBar} />}
              <span style={styles.navChannel}>CH {item.ch}</span>
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={styles.sidebarFooter}>
          <div style={styles.dutyBadge}>
            <span style={styles.dutyDot} />
            ON DUTY
          </div>
          <div className="ppis-logout" style={styles.logoutBtn} onClick={() => setUser(null)}>
            ⏻ End Shift
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={styles.main}>
        {/* Top duty bar */}
        <div style={styles.topBar}>
          <div style={styles.breadcrumb}>
            <span style={styles.breadcrumbRoot}>PPIS</span>
            <span style={styles.breadcrumbSep}>//</span>
            <span style={styles.breadcrumbLeaf}>{SECTION_LABEL[page]}</span>
          </div>

          <div style={styles.topBarRight}>
            <div style={styles.officerChip}>
              <div style={styles.officerAvatar}>
                {user.full_name?.[0]?.toUpperCase() || "O"}
              </div>
              <div>
                <div style={styles.officerName}>{user.full_name}</div>
                <div style={styles.officerRank}>Administrator</div>
              </div>
            </div>
            <div style={styles.clockBlock}>
              <div style={styles.clockTime}>{timeStr}</div>
              <div style={styles.clockDate}>{dateStr}</div>
            </div>
          </div>
        </div>

        <div style={styles.content}>
          {page === "dashboard" && (
            <>
              <div style={styles.pageHeader}>
                <h1 style={styles.pageTitle}>Smart Patrol Dashboard</h1>
                <p style={styles.pageSub}>
                  Welcome back, {user.full_name}. Sector status is nominal.
                </p>
              </div>

              <div style={styles.cardRow}>
                <StatCard label="Active Officers" value={stats.officers} unit="units" accent={COLORS.amber} />
                <StatCard label="Checkpoints" value={stats.checkpoints} unit="deployed" accent={COLORS.steel} />
                <StatCard label="Patrol Logs" value={stats.patrolLogs} unit="filed" accent={COLORS.green} />
              </div>
            </>
          )}

          {page === "officers" && <Officers />}
          {page === "checkpoints" && <Checkpoints />}
          {page === "patrolLogs" && <PatrolLogs />}
          {page === "liveMap" && <LiveMap />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, accent }) {
  return (
    <div className="ppis-card" style={styles.card}>
      <span style={{ ...styles.cardCorner, ...styles.cornerTL, borderColor: accent }} />
      <span style={{ ...styles.cardCorner, ...styles.cornerBR, borderColor: accent }} />
      <div style={styles.cardLabel}>{label}</div>
      <div style={{ ...styles.cardValue, color: accent }}>{value}</div>
      <div style={styles.cardUnit}>{unit}</div>
    </div>
  );
}

function ShieldMark() {
  return (
    <svg width="34" height="38" viewBox="0 0 34 38" fill="none">
      <path
        d="M17 1 L32 6 V17 C32 27 25.5 33.5 17 37 C8.5 33.5 2 27 2 17 V6 Z"
        fill="rgba(242,169,59,0.12)"
        stroke={COLORS.amber}
        strokeWidth="1.4"
      />
      <path d="M17 9 L17 22 M11 15 L23 15" stroke={COLORS.amber} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    background: COLORS.bg,
    color: COLORS.text,
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  sidebar: {
    width: "250px",
    background: COLORS.panelAlt,
    borderRight: `1px solid ${COLORS.border}`,
    display: "flex",
    flexDirection: "column",
    padding: "22px 16px",
  },
  brandRow: { display: "flex", alignItems: "center", gap: "12px", padding: "4px 8px" },
  brandTitle: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: "20px",
    fontWeight: 700,
    letterSpacing: "2px",
    color: COLORS.text,
  },
  brandSub: {
    fontSize: "10px",
    letterSpacing: "1.5px",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    marginTop: "2px",
  },
  navDivider: { height: "1px", background: COLORS.border, margin: "18px 0 8px" },
  navItem: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "11px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "4px",
    transition: "background 0.15s ease",
  },
  navItemActive: { background: COLORS.amberDim },
  navActiveBar: {
    position: "absolute",
    left: "-16px",
    top: "8px",
    bottom: "8px",
    width: "3px",
    background: COLORS.amber,
    borderRadius: "2px",
  },
  navChannel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "10px",
    color: COLORS.textFaint,
    width: "34px",
  },
  navIcon: { fontSize: "13px", color: COLORS.textMuted, width: "16px" },
  navLabel: { fontSize: "13.5px", fontWeight: 500, color: COLORS.text },
  sidebarFooter: { marginTop: "auto", paddingTop: "18px", borderTop: `1px solid ${COLORS.border}` },
  dutyBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11px",
    letterSpacing: "1px",
    color: COLORS.green,
    padding: "8px 10px",
    marginBottom: "10px",
  },
  dutyDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: COLORS.green,
    display: "inline-block",
    animation: "pulseDot 2s infinite",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: COLORS.red,
    padding: "10px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 500,
    transition: "background 0.15s ease",
  },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 30px",
    borderBottom: `1px solid ${COLORS.border}`,
    background: COLORS.panelAlt,
  },
  breadcrumb: { fontFamily: "'Oswald', sans-serif", fontSize: "14px", letterSpacing: "1px" },
  breadcrumbRoot: { color: COLORS.textMuted },
  breadcrumbSep: { color: COLORS.textFaint, margin: "0 8px" },
  breadcrumbLeaf: { color: COLORS.amber, textTransform: "uppercase" },
  topBarRight: { display: "flex", alignItems: "center", gap: "22px" },
  officerChip: { display: "flex", alignItems: "center", gap: "10px" },
  officerAvatar: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    background: COLORS.amberDim,
    border: `1px solid ${COLORS.amber}`,
    color: COLORS.amber,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontFamily: "'Oswald', sans-serif",
  },
  officerName: { fontSize: "13px", fontWeight: 600 },
  officerRank: { fontSize: "10.5px", color: COLORS.textMuted },
  clockBlock: { textAlign: "right", borderLeft: `1px solid ${COLORS.border}`, paddingLeft: "20px" },
  clockTime: { fontFamily: "'IBM Plex Mono', monospace", fontSize: "16px", color: COLORS.amber, letterSpacing: "1px" },
  clockDate: { fontSize: "10.5px", color: COLORS.textMuted, marginTop: "2px" },
  content: { padding: "30px", overflowY: "auto" },
  pageHeader: { marginBottom: "26px" },
  pageTitle: { fontFamily: "'Oswald', sans-serif", fontSize: "26px", fontWeight: 600, margin: 0, letterSpacing: "0.5px" },
  pageSub: { color: COLORS.textMuted, fontSize: "13.5px", marginTop: "6px" },
  cardRow: { display: "flex", gap: "20px", flexWrap: "wrap" },
  card: {
    position: "relative",
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "10px",
    padding: "22px 24px",
    width: "230px",
    transition: "transform 0.2s ease, border-color 0.2s ease",
  },
  cardCorner: { position: "absolute", width: "14px", height: "14px" },
  cornerTL: { top: "-1px", left: "-1px", borderTop: "2px solid", borderLeft: "2px solid" },
  cornerBR: { bottom: "-1px", right: "-1px", borderBottom: "2px solid", borderRight: "2px solid" },
  cardLabel: {
    fontSize: "11px",
    letterSpacing: "1.2px",
    textTransform: "uppercase",
    color: COLORS.textMuted,
    fontWeight: 600,
  },
  cardValue: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "34px",
    fontWeight: 600,
    marginTop: "10px",
  },
  cardUnit: { fontSize: "11px", color: COLORS.textFaint, marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" },
};

export default App;