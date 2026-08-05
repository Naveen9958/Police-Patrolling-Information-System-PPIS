import { useEffect, useState } from "react";
import axios from "axios";

const COLORS = {
  bg: "#0d1013",
  panel: "#171b21",
  panelAlt: "#12151a",
  border: "rgba(255,255,255,0.07)",
  amber: "#f2a93b",
  amberDim: "rgba(242,169,59,0.14)",
  red: "#e2434b",
  green: "#4fae7c",
  greenDim: "rgba(79,174,124,0.14)",
  steel: "#6c86a1",
  text: "#eef1f4",
  textMuted: "#8792a1",
  textFaint: "#4d5561",
};

function formatResetTime(resetsAt) {
  if (!resetsAt) return null;
  return new Date(resetsAt).toLocaleString("en-US", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OfficerPortal({ user, onLogout }) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchCheckpoints = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/officers/${user.id}/checkpoints`
      );
      setCheckpoints(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckpoints();
    // Poll so newly-assigned checkpoints from the admin side show up without a refresh.
    const t = setInterval(fetchCheckpoints, 15000);
    return () => clearInterval(t);
  }, []);

  const completeCheckpoint = async (id) => {
    setErrorMsg("");
    setCompletingId(id);
    try {
      await axios.post(`http://localhost:5000/checkpoints/${id}/complete`, {
        officer_id: user.id,
      });
      fetchCheckpoints();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Could not complete checkpoint");
    } finally {
      setCompletingId(null);
    }
  };

  const pending = checkpoints.filter((c) => c.status === "pending");
  const completed = checkpoints.filter((c) => c.status === "completed");

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .ppis-complete-btn:hover:not(:disabled) { background: #ffb955 !important; }
        .ppis-complete-btn:disabled { opacity: 0.6; cursor: default; }
        .ppis-logout:hover { background: rgba(226,67,75,0.1); }
      `}</style>

      <div style={styles.topBar}>
        <div style={styles.brandRow}>
          <span style={styles.badge}>🚔</span>
          <div>
            <div style={styles.brandTitle}>PPIS</div>
            <div style={styles.brandSub}>Officer Portal</div>
          </div>
        </div>

        <div style={styles.topBarRight}>
          <div>
            <div style={styles.officerName}>{user.full_name}</div>
            <div style={styles.officerRank}>Officer</div>
          </div>
          <div className="ppis-logout" style={styles.logoutBtn} onClick={onLogout}>
            ⏻ End Shift
          </div>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>My Checkpoints</h1>
          <p style={styles.pageSub}>
            Checkpoints assigned to you. Completing one clears it for 24 hours,
            then it reopens automatically.
          </p>
        </div>

        {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}

        {!loading && checkpoints.length === 0 && (
          <div style={styles.emptyNote}>
            No checkpoints assigned to you yet. Check back once your admin
            assigns one.
          </div>
        )}

        {pending.length > 0 && (
          <>
            <div style={styles.sectionLabel}>Pending ({pending.length})</div>
            <div style={styles.cardGrid}>
              {pending.map((cp) => (
                <div key={cp.id} style={styles.card}>
                  <div style={styles.cardTop}>
                    <span style={styles.cardName}>{cp.checkpoint_name}</span>
                    <span style={{ ...styles.statusPill, ...styles.pillPending }}>
                      Pending
                    </span>
                  </div>
                  <div style={styles.cardLocation}>{cp.location}</div>
                  <button
                    className="ppis-complete-btn"
                    style={styles.completeButton}
                    disabled={completingId === cp.id}
                    onClick={() => completeCheckpoint(cp.id)}
                  >
                    {completingId === cp.id ? "Completing…" : "✓ Mark Complete"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {completed.length > 0 && (
          <>
            <div style={{ ...styles.sectionLabel, marginTop: "26px" }}>
              Completed ({completed.length})
            </div>
            <div style={styles.cardGrid}>
              {completed.map((cp) => (
                <div key={cp.id} style={{ ...styles.card, ...styles.cardDone }}>
                  <div style={styles.cardTop}>
                    <span style={styles.cardName}>{cp.checkpoint_name}</span>
                    <span style={{ ...styles.statusPill, ...styles.pillDone }}>
                      Completed
                    </span>
                  </div>
                  <div style={styles.cardLocation}>{cp.location}</div>
                  <div style={styles.resetNote}>
                    Reopens {formatResetTime(cp.resets_at)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: COLORS.bg,
    color: COLORS.text,
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 30px",
    borderBottom: `1px solid ${COLORS.border}`,
    background: COLORS.panelAlt,
  },
  brandRow: { display: "flex", alignItems: "center", gap: "12px" },
  badge: { fontSize: "26px" },
  brandTitle: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: "18px",
    fontWeight: 700,
    letterSpacing: "2px",
  },
  brandSub: {
    fontSize: "10px",
    letterSpacing: "1.5px",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    marginTop: "2px",
  },
  topBarRight: { display: "flex", alignItems: "center", gap: "18px" },
  officerName: { fontSize: "13px", fontWeight: 600, textAlign: "right" },
  officerRank: { fontSize: "10.5px", color: COLORS.textMuted, textAlign: "right" },
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
  content: { padding: "30px", maxWidth: "900px", margin: "0 auto" },
  pageHeader: { marginBottom: "22px" },
  pageTitle: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: "24px",
    fontWeight: 600,
    margin: 0,
  },
  pageSub: { color: COLORS.textMuted, fontSize: "13px", marginTop: "6px" },
  errorBanner: {
    background: "rgba(226,67,75,0.12)",
    border: `1px solid ${COLORS.red}`,
    color: COLORS.red,
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "18px",
  },
  emptyNote: {
    color: COLORS.textFaint,
    fontSize: "13px",
    textAlign: "center",
    padding: "40px 0",
  },
  sectionLabel: {
    fontSize: "11px",
    letterSpacing: "1.2px",
    textTransform: "uppercase",
    color: COLORS.textMuted,
    fontWeight: 600,
    marginBottom: "12px",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: "16px",
  },
  card: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "10px",
    padding: "18px",
  },
  cardDone: { opacity: 0.75 },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
    marginBottom: "8px",
  },
  cardName: { fontSize: "14.5px", fontWeight: 600 },
  cardLocation: { fontSize: "12.5px", color: COLORS.textMuted, marginBottom: "16px" },
  statusPill: {
    fontSize: "10.5px",
    fontWeight: 600,
    padding: "3px 9px",
    borderRadius: "5px",
    letterSpacing: "0.4px",
    whiteSpace: "nowrap",
  },
  pillPending: { color: COLORS.amber, background: COLORS.amberDim },
  pillDone: { color: COLORS.green, background: COLORS.greenDim },
  completeButton: {
    width: "100%",
    background: COLORS.amber,
    color: "#12151a",
    border: "none",
    padding: "10px",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "12.5px",
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  resetNote: {
    fontSize: "11.5px",
    color: COLORS.textFaint,
    fontFamily: "'IBM Plex Mono', monospace",
  },
};

export default OfficerPortal;
